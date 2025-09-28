// src/services/reportCardPublisher.js
// High-level publisher: fetch RPC data and call Edge Function to generate PDF

import { supabase } from '../lib/supabaseClient';
import { generateReport } from './supabase/edgeFunctions';
import { adminAttendanceService } from './supabase/adminAttendanceService';

/**
 * Fetch term report card data via RPC and publish a PDF report card.
 * @param {Object} params
 * @param {string} params.studentId
 * @param {number} params.term
 * @param {string|number} params.academicYear
 * @param {Object} [options]
 * @param {boolean} [options.persist=true] - Insert a record in student_documents
 * @param {string} [options.bucket='report-cards']
 * @returns {Promise<{ success: boolean, url?: string, error?: string }>} 
 */
export async function publishStudentTermReport({ studentId, term, academicYear }, options = {}) {
  try {
    if (!studentId || term == null || !academicYear) {
      return { success: false, error: 'Missing studentId, term, or academicYear' };
    }

    // 1) Resolve student's class and admission number
    const { data: studentProfile, error: spError } = await supabase
      .from('user_profiles')
      .select('id, class_id, admission_number, full_name')
      .eq('id', studentId)
      .single();

    if (spError || !studentProfile?.class_id) {
      console.error('Unable to resolve student class for report:', spError);
      return { success: false, error: 'Student class not found for this student' };
    }

    // 2) Fetch consolidated report data from RPC (class-scoped), then filter by student
    const { data: rpcData, error: rpcError } = await supabase.rpc('rpc_get_term_report_card', {
      p_academic_year: String(academicYear),
      p_class_id: studentProfile.class_id,
      p_term: String(term),
    });

    if (rpcError) {
      console.error('rpc_get_term_report_card failed:', rpcError);
      return { success: false, error: rpcError.message };
    }

    const studentRows = Array.isArray(rpcData) ? rpcData.filter(r => r.student_id === studentId) : [];

    if (!studentRows.length) {
      return { success: false, error: 'No report data found for this student/term/year' };
    }

    // Map RPC rows to the Edge Function's expected TermReportCardData shape
    const subjects = studentRows.map((r) => {
      const test = r.test_score ?? r.testScore ?? null;
      const exam = r.exam_score ?? r.examScore ?? null;
      const admin = (r.admin_score ?? r.adminScore);
      const total = r.total_score ?? r.totalScore ?? ((Number(test) || 0) + (Number(exam) || 0) + (admin != null ? (Number(admin) || 0) : 0));
      return {
        subject_id: r.subject_id ?? r.subjectId ?? null,
        subject_name: r.subject_name ?? r.subjectName ?? r.subject ?? 'Subject',
        test_score: test != null ? Number(test) : undefined,
        exam_score: exam != null ? Number(exam) : undefined,
        admin_score: admin != null ? Number(admin) : undefined,
        total_score: Number(total),
        remark: r.teacher_remark ?? r.remark ?? r.remarks ?? null,
      };
    });

    const perRowMax = studentRows.map((r) => ((r.admin_score ?? r.adminScore) != null ? 100 : 80));
    const totalScore = subjects.reduce((sum, s) => sum + (Number(s.total_score) || 0), 0);
    const maxTotal = perRowMax.reduce((sum, m) => sum + m, 0) || (subjects.length * 100);
    const average_percentage = subjects.length ? Math.round((totalScore / maxTotal) * 100) : undefined;

    // Attendance summary for the term/year
    let attendanceSummary;
    try {
      const yr = parseInt(String(academicYear), 10);
      const t = Number(term);
      const getRange = (t, yr) => {
        if (t === 1) return { from: `${yr}-09-01`, to: `${yr}-12-15` };
        if (t === 2) return { from: `${yr + 1}-01-08`, to: `${yr + 1}-04-15` };
        return { from: `${yr + 1}-04-16`, to: `${yr + 1}-07-31` };
      };
      const { from, to } = getRange(t, yr);
      const att = await adminAttendanceService.listRange({ studentId, from, to });
      if (att?.success && Array.isArray(att.data)) {
        const rows = att.data;
        const total = rows.length;
        let present = 0, late = 0, absent = 0;
        for (const r of rows) {
          const st = String(r.status || '').toLowerCase();
          if (st === 'present') present++;
          else if (st === 'late') late++;
          else if (st === 'absent') absent++;
        }
        const percentage = total > 0 ? Math.round(((present + late) / total) * 100) : undefined;
        attendanceSummary = {
          total_days: total,
          present_days: present,
          late_days: late,
          absent_days: absent,
          percentage,
        };
      }
    } catch (_) {
      // Ignore attendance errors; proceed without attendance block
    }

    const structuredData = {
      student: {
        id: studentId,
        name: studentProfile?.full_name || studentRows[0]?.student_name || studentRows[0]?.student || '',
        admission_number: studentProfile?.admission_number || studentRows[0]?.admission_number || null,
        class_name: studentRows[0]?.class_name || null,
      },
      term: Number(term),
      academic_year: String(academicYear),
      subjects,
      attendance: attendanceSummary,
      overall: {
        total_score: totalScore,
        average_percentage,
      },
    };

    const payload = {
      type: 'term_report_card',
      data: structuredData,
      options: {
        filename: `${(studentProfile?.admission_number || studentId)}_${academicYear}_T${term}.pdf`,
        persist: options.persist !== false,
        bucket: options.bucket || 'report-cards',
        pathPrefix: `${String(academicYear)}/term-${Number(term)}`,
      },
    };

    // 3) Generate and store PDF via Edge Function
    const result = await generateReport(payload);
    if (!result || !result.url) {
      return { success: false, error: 'Report generation failed' };
    }

    return { success: true, url: result.url };
  } catch (err) {
    console.error('publishStudentTermReport error:', err);
    return { success: false, error: err?.message || String(err) };
  }
}

/**
 * Bulk publish by class: iterate studentIds and call publishStudentTermReport with small delay.
 */
export async function publishReportsForClass({ studentIds, term, academicYear }, options = {}) {
  const results = [];
  for (let i = 0; i < studentIds.length; i++) {
    const id = studentIds[i];
    try {
      // Throttle a bit to avoid rate limiting
      /* eslint-disable no-await-in-loop */
      const res = await publishStudentTermReport({ studentId: id, term, academicYear }, options);
      results.push({ studentId: id, ...res });
      // Optional progress callback without breaking existing callers
      try {
        if (options && typeof options.onProgress === 'function') {
          options.onProgress({ completed: i + 1, total: studentIds.length, result: res, index: i });
        }
      } catch (_) { /* noop */ }
      await new Promise(r => setTimeout(r, 150));
      /* eslint-enable no-await-in-loop */
    } catch (e) {
      results.push({ studentId: id, success: false, error: e?.message || String(e) });
      try {
        if (options && typeof options.onProgress === 'function') {
          options.onProgress({ completed: i + 1, total: studentIds.length, result: { success: false, error: e?.message || String(e) }, index: i });
        }
      } catch (_) { /* noop */ }
    }
  }
  return results;
}