import { supabase } from '../../lib/supabaseClient';
import { getUserRole } from './userService';

// Helpers
const REQUIRED_FIELDS = ['student_id', 'class_id', 'subject_id', 'date', 'status'];

function normalizeRecord(input) {
  // Accept subjectId in addition to subject_id for convenience
  const subject_id = input.subject_id ?? input.subjectId;
  return {
    ...input,
    subject_id,
  };
}

function validateRecord(record, { requireSubjectId = true } = {}) {
  const required = requireSubjectId ? REQUIRED_FIELDS : REQUIRED_FIELDS.filter(k => k !== 'subject_id');
  const missing = required.filter((k) => {
    if (k === 'subject_id') return record.subject_id == null;
    return record[k] == null || record[k] === '';
  });
  if (missing.length > 0) {
    return { ok: false, error: `Missing required field(s): ${missing.join(', ')}` };
  }
  return { ok: true };
}

async function isFinalizedRow({ student_id, class_id, subject_id, date }) {
  try {
    let query = supabase
      .from('attendance')
      .select('finalized_by_admin')
      .eq('student_id', student_id)
      .eq('class_id', class_id)
      .eq('date', date);

    if (subject_id == null) {
      query = query.is('subject_id', null);
    } else {
      query = query.eq('subject_id', subject_id);
    }

    const { data, error } = await query.single();
    if (error) {
      // If no row found, not finalized; propagate other errors
      if (String(error.code) === 'PGRST116') return false;
      throw error;
    }
    return Boolean(data?.finalized_by_admin);
  } catch (err) {
    // Fail safe: if we cannot determine, do not block (treat as not finalized)
    return false;
  }
}

// Attendance Service using Supabase
export const attendanceService = {
  // Mark attendance for a single student (admin or teacher)
  async markAttendance(attendanceData, options = {}) {
    try {
      // Auth + role context
      const userData = await getUserRole();
      if (!userData?.uid) return { success: false, error: 'Not authenticated' };

      const role = (userData.role === 'super_admin') ? 'admin' : userData.role;
      const uid = userData.uid;

      // Normalize and validate
      const record = normalizeRecord(attendanceData || {});
      const valid = validateRecord(record, { requireSubjectId: role !== 'admin' });
      if (!valid.ok) return { success: false, error: valid.error };

      // Teacher cannot update finalized rows
      if (role !== 'admin') {
        const finalized = await isFinalizedRow({
          student_id: record.student_id,
          class_id: record.class_id,
          subject_id: record.subject_id,
          date: record.date,
        });
        if (finalized) {
          return { success: false, error: 'Attendance for this student/class/subject/date has been finalized by an admin.' };
        }
      }

      // Build upsert payload
      const payload = {
        student_id: record.student_id,
        class_id: record.class_id,
        subject_id: record.subject_id,
        teacher_id: record.teacher_id ?? (role === 'teacher' ? uid : record.teacher_id ?? null),
        date: record.date,
        status: record.status,
        remarks: record.remarks ?? null,
        taken_by_id: uid,
        taken_by_role: role,
        last_updated_at: new Date().toISOString(),
      };

      // Admins may optionally finalize; never un-finalize here
      const wantsFinalize = Boolean(options.finalize || record.finalize || record.finalized_by_admin);
      if (role === 'admin' && wantsFinalize) {
        payload.finalized_by_admin = true;
      }

      const conflictTarget = payload.subject_id == null ? 'student_id,class_id,date' : 'student_id,class_id,subject_id,date';
      const { data, error } = await supabase
        .from('attendance')
        .upsert(payload, { onConflict: conflictTarget })
        .select('*')
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error marking attendance:', error);
      return { success: false, error: error.message };
    }
  },

  // Bulk mark attendance for multiple students (admin or teacher)
  async bulkMarkAttendance(attendanceList = [], options = {}) {
    try {
      const userData = await getUserRole();
      if (!userData?.uid) return { success: false, error: 'Not authenticated' };

      const role = (userData.role === 'super_admin') ? 'admin' : userData.role;
      const uid = userData.uid;

      // Normalize and validate items
      const normalized = (attendanceList || []).map(normalizeRecord);

      const invalid = [];
      for (let i = 0; i < normalized.length; i++) {
        const v = validateRecord(normalized[i]);
        if (!v.ok) invalid.push({ index: i, error: v.error, record: normalized[i] });
      }

      const candidates = normalized.filter((_, idx) => !invalid.some((iv) => iv.index === idx));

      // If teacher, block finalized rows
      const blocked = [];
      const allowed = [];
      if (role !== 'admin') {
        for (const rec of candidates) {
          // eslint-disable-next-line no-await-in-loop
          const finalized = await isFinalizedRow({
            student_id: rec.student_id,
            class_id: rec.class_id,
            subject_id: rec.subject_id,
            date: rec.date,
          });
          if (finalized) {
            blocked.push({ record: rec, reason: 'finalized' });
          } else {
            allowed.push(rec);
          }
        }
      } else {
        allowed.push(...candidates);
      }

      if (allowed.length === 0) {
        return {
          success: true,
          data: [],
          skipped: blocked,
          invalid,
        };
      }

      const wantsFinalize = Boolean(options.finalize);

      const rows = allowed.map((rec) => {
        const row = {
          student_id: rec.student_id,
          class_id: rec.class_id,
          subject_id: rec.subject_id,
          teacher_id: rec.teacher_id ?? (role === 'teacher' ? uid : rec.teacher_id ?? null),
          date: rec.date,
          status: rec.status,
          remarks: rec.remarks ?? null,
          taken_by_id: uid,
          taken_by_role: role,
          last_updated_at: new Date().toISOString(),
        };
        if (role === 'admin' && (wantsFinalize || rec.finalize === true || rec.finalized_by_admin === true)) {
          row.finalized_by_admin = true;
        }
        return row;
      });

      // Split rows by presence of subject_id to satisfy different conflict targets
      const withSubject = rows.filter(r => r.subject_id != null);
      const withoutSubject = rows.filter(r => r.subject_id == null);

      let combined = [];
      if (withSubject.length > 0) {
        const { data: d1, error: e1 } = await supabase
          .from('attendance')
          .upsert(withSubject, { onConflict: 'student_id,class_id,subject_id,date' })
          .select('*');
        if (e1) throw e1;
        combined = combined.concat(d1 || []);
      }
      if (withoutSubject.length > 0) {
        const { data: d2, error: e2 } = await supabase
          .from('attendance')
          .upsert(withoutSubject, { onConflict: 'student_id,class_id,date' })
          .select('*');
        if (e2) throw e2;
        combined = combined.concat(d2 || []);
      }

      return {
        success: true,
        data: combined,
        skipped: blocked,
        invalid,
      };
    } catch (error) {
      console.error('Error bulk marking attendance:', error);
      return { success: false, error: error.message };
    }
  },

  // Get attendance by date and class
  async getAttendanceByDate(date, classId, subjectId = null) {
    try {
      let query = supabase
        .from('attendance')
        .select(`
          *,
          students (
            admission_number,
            user_profiles (
              full_name,
              email
            )
          ),
          subjects (
            name,
            code
          )
        `)
        .eq('date', date)
        .eq('class_id', classId);

      if (subjectId) {
        query = query.eq('subject_id', subjectId);
      }

      const { data, error } = await query
        .order('full_name', { ascending: true, foreignTable: 'students.user_profiles' });

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error fetching attendance by date:', error);
      return { success: false, error: error.message };
    }
  },

  // Get student attendance history
  async getStudentAttendance(studentId, startDate = null, endDate = null) {
    try {
      let query = supabase
        .from('attendance')
        .select(`
          *,
          classes (
            name
          ),
          subjects (
            name,
            code
          )
        `)
        .eq('student_id', studentId);

      if (startDate) {
        query = query.gte('date', startDate);
      }

      if (endDate) {
        query = query.lte('date', endDate);
      }

      const { data, error } = await query.order('date', { ascending: false });

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error fetching student attendance:', error);
      return { success: false, error: error.message };
    }
  },

  // Get attendance statistics for a student
  async getStudentAttendanceStats(studentId, startDate = null, endDate = null) {
    try {
      let query = supabase
        .from('attendance')
        .select('status')
        .eq('student_id', studentId);

      if (startDate) {
        query = query.gte('date', startDate);
      }

      if (endDate) {
        query = query.lte('date', endDate);
      }

      const { data, error } = await query;

      if (error) throw error;

      const stats = {
        total: data.length,
        present: data.filter(a => a.status === 'present').length,
        absent: data.filter(a => a.status === 'absent').length,
        excused: data.filter(a => a.status === 'excused').length
      };

      stats.attendanceRate = stats.total > 0 ? Math.round((stats.present / stats.total) * 100) : 0;

      return { success: true, data: stats };
    } catch (error) {
      console.error('Error fetching student attendance stats:', error);
      return { success: false, error: error.message };
    }
  },

  // Get class attendance summary
  async getClassAttendanceSummary(classId, date) {
    try {
      const { data, error } = await supabase
        .from('attendance')
        .select('status')
        .eq('class_id', classId)
        .eq('date', date);

      if (error) throw error;

      const summary = {
        total: data.length,
        present: data.filter(a => a.status === 'present').length,
        absent: data.filter(a => a.status === 'absent').length,
        excused: data.filter(a => a.status === 'excused').length
      };

      summary.attendanceRate = summary.total > 0 ? Math.round((summary.present / summary.total) * 100) : 0;

      return { success: true, data: summary };
    } catch (error) {
      console.error('Error fetching class attendance summary:', error);
      return { success: false, error: error.message };
    }
  }
};

// Export individual functions for backward compatibility
export const {
  markAttendance,
  bulkMarkAttendance,
  getAttendanceByDate,
  getStudentAttendance,
  getStudentAttendanceStats,
  getClassAttendanceSummary
} = attendanceService;