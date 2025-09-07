import { supabase } from '../../lib/supabaseClient';

// Exam Service using Supabase
export const examService = {
  // Create a new exam
  async createExam(examData) {
    try {
      const { data, error } = await supabase
        .from('exams')
        .insert({
          title: examData.title,
          description: examData.description,
          subject_id: examData.subject_id,
          class_id: examData.class_id,
          teacher_id: examData.teacher_id,
          exam_date: examData.exam_date,
          duration_minutes: examData.duration_minutes,
          total_marks: examData.total_marks || 100,
          exam_type: examData.exam_type || 'test',
          status: examData.status || 'scheduled'
        })
        .select(`
          *,
          subjects (
            id,
            name,
            code,
            department
          ),
          classes (
            id,
            name,
            description
          ),
          teachers (
            id,
            employee_id,
            user_profiles (
              id,
              full_name,
              email
            )
          )
        `)
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error creating exam:', error);
      return { success: false, error: error.message };
    }
  },

  // Get all exams
  async getAllExams() {
    try {
      const { data, error } = await supabase
        .from('exams')
        .select(`
          *,
          subjects (
            id,
            name,
            code,
            department
          ),
          classes (
            id,
            name,
            description
          ),
          teachers (
            id,
            employee_id,
            user_profiles (
              id,
              full_name,
              email
            )
          )
        `)
        .order('exam_date', { ascending: false });

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error fetching exams:', error);
      return { success: false, error: error.message };
    }
  },

  // Get exam by ID
  async getExamById(examId) {
    try {
      const { data, error } = await supabase
        .from('exams')
        .select(`
          *,
          subjects (
            id,
            name,
            code,
            department
          ),
          classes (
            id,
            name,
            description
          ),
          teachers (
            id,
            employee_id,
            user_profiles (
              id,
              full_name,
              email
            )
          )
        `)
        .eq('id', examId)
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error fetching exam:', error);
      return { success: false, error: error.message };
    }
  },

  // Get exams by teacher
  async getExamsByTeacher(teacherId) {
    try {
      const { data, error } = await supabase
        .from('exams')
        .select(`
          *,
          subjects (
            id,
            name,
            code,
            department
          ),
          classes (
            id,
            name,
            description
          )
        `)
        .eq('teacher_id', teacherId)
        .order('exam_date', { ascending: false });

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error fetching exams by teacher:', error);
      return { success: false, error: error.message };
    }
  },

  // Get exams by class
  async getExamsByClass(classId) {
    try {
      const { data, error } = await supabase
        .from('exams')
        .select(`
          *,
          subjects (
            id,
            name,
            code,
            department
          ),
          teachers (
            id,
            employee_id,
            user_profiles (
              id,
              full_name,
              email
            )
          )
        `)
        .eq('class_id', classId)
        .order('exam_date', { ascending: false });

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error fetching exams by class:', error);
      return { success: false, error: error.message };
    }
  },

  // Get exams by subject
  async getExamsBySubject(subjectId) {
    try {
      const { data, error } = await supabase
        .from('exams')
        .select(`
          *,
          classes (
            id,
            name,
            description
          ),
          teachers (
            id,
            employee_id,
            user_profiles (
              id,
              full_name,
              email
            )
          )
        `)
        .eq('subject_id', subjectId)
        .order('exam_date', { ascending: false });

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error fetching exams by subject:', error);
      return { success: false, error: error.message };
    }
  },

  // Update exam
  async updateExam(examId, updateData) {
    try {
      const { data, error } = await supabase
        .from('exams')
        .update({
          ...updateData,
          updated_at: new Date().toISOString()
        })
        .eq('id', examId)
        .select(`
          *,
          subjects (
            id,
            name,
            code,
            department
          ),
          classes (
            id,
            name,
            description
          ),
          teachers (
            id,
            employee_id,
            user_profiles (
              id,
              full_name,
              email
            )
          )
        `)
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error updating exam:', error);
      return { success: false, error: error.message };
    }
  },

  // Delete exam
  async deleteExam(examId) {
    try {
      const { data, error } = await supabase
        .from('exams')
        .delete()
        .eq('id', examId)
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error deleting exam:', error);
      return { success: false, error: error.message };
    }
  },

  // Get upcoming exams
  async getUpcomingExams(limit = 10) {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('exams')
        .select(`
          *,
          subjects (
            id,
            name,
            code
          ),
          classes (
            id,
            name
          ),
          teachers (
            id,
            user_profiles (
              full_name
            )
          )
        `)
        .gte('exam_date', today)
        .eq('status', 'scheduled')
        .order('exam_date', { ascending: true })
        .limit(limit);

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error fetching upcoming exams:', error);
      return { success: false, error: error.message };
    }
  },

  // Get recent exams
  async getRecentExams(limit = 10) {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('exams')
        .select(`
          *,
          subjects (
            id,
            name,
            code
          ),
          classes (
            id,
            name
          ),
          teachers (
            id,
            user_profiles (
              full_name
            )
          )
        `)
        .lt('exam_date', today)
        .order('exam_date', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error fetching recent exams:', error);
      return { success: false, error: error.message };
    }
  },

  // Get exam statistics
  async getExamStats(examId) {
    try {
      // Get total students who should take the exam
      const exam = await this.getExamById(examId);
      if (!exam.success) throw new Error('Exam not found');

      const { count: totalStudents } = await supabase
        .from('students')
        .select('*', { count: 'exact', head: true })
        .eq('class_id', exam.data.class_id)
        .eq('status', 'active');

      // Get students who have taken the exam
      const { count: completedCount } = await supabase
        .from('exam_results')
        .select('*', { count: 'exact', head: true })
        .eq('id', examId);

      // Get average score
      const { data: results } = await supabase
        .from('exam_results')
        .select('total_score, max_score')
        .eq('id', examId);

      const averageScore = results?.length > 0 
        ? results.reduce((sum, result) => sum + ((result.total_score || 0) / (result.max_score || 100) * 100), 0) / results.length 
        : 0;

      return {
        success: true,
        data: {
          totalStudents: totalStudents || 0,
          completedCount: completedCount || 0,
          pendingCount: (totalStudents || 0) - (completedCount || 0),
          averageScore: Math.round(averageScore * 100) / 100,
          completionRate: totalStudents > 0 ? Math.round((completedCount / totalStudents) * 100) : 0
        }
      };
    } catch (error) {
      console.error('Error fetching exam stats:', error);
      return { success: false, error: error.message };
    }
  },

  // Search exams
  async searchExams(searchTerm) {
    try {
      const { data, error } = await supabase
        .from('exams')
        .select(`
          *,
          subjects (
            id,
            name,
            code
          ),
          classes (
            id,
            name
          ),
          teachers (
            id,
            user_profiles (
              full_name
            )
          )
        `)
        .or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`)
        .order('exam_date', { ascending: false });

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error searching exams:', error);
      return { success: false, error: error.message };
    }
  },

  // Get active exams for a student (upcoming or ongoing for the student's class)
  async getActiveExamsForStudent(studentId) {
    try {
      // Determine student's class_id (try user_profiles, then students table)
      let classId = null;
      try {
        const { data: profile, error: profileErr } = await supabase
          .from('user_profiles')
          .select('class_id')
          .eq('id', studentId)
          .single();
        if (!profileErr && profile?.class_id) classId = profile.class_id;
      } catch (_) {}

      if (!classId) {
        try {
          const { data: student, error: studentErr } = await supabase
            .from('students')
            .select('class_id')
            .eq('id', studentId)
            .single();
          if (!studentErr && student?.class_id) classId = student.class_id;
        } catch (_) {}
      }

      const today = new Date().toISOString().split('T')[0];

      let query = supabase
        .from('exams')
        .select(`
          *,
          subjects ( id, name, code ),
          classes ( id, name )
        `)
        .gte('exam_date', today)
        .in('status', ['scheduled', 'ongoing'])
        .order('exam_date', { ascending: true });

      if (classId) {
        query = query.eq('class_id', classId);
      }

      const { data, error } = await query;
      if (error) throw error;
      // Return plain array to match existing callers
      return data || [];
    } catch (error) {
      console.error('Error fetching active exams for student:', error);
      return [];
    }
  }
};

// Export individual functions for backward compatibility
export const {
  createExam,
  getAllExams,
  getExamById,
  getExamsByTeacher,
  getExamsByClass,
  getExamsBySubject,
  updateExam,
  deleteExam,
  getUpcomingExams,
  getRecentExams,
  getExamStats,
  searchExams,
  getActiveExamsForStudent
} = examService;

// Legacy function names for compatibility
export const addExam = createExam;
export const getExam = getExamById;