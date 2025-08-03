import { supabase } from '../../lib/supabaseClient';

// Exam Result Service using Supabase
export const examResultService = {
  // Create or update exam result
  async createOrUpdateResult(resultData) {
    try {
      const { data, error } = await supabase
        .from('exam_results')
        .upsert({
          exam_id: resultData.exam_id,
          student_id: resultData.student_id,
          score: resultData.score,
          max_score: resultData.max_score || 100,
          grade: resultData.grade,
          remarks: resultData.remarks,
          submitted_at: resultData.submitted_at || new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select(`
          *,
          exams (
            id,
            title,
            exam_date,
            total_marks,
            subjects (
              id,
              name,
              code
            ),
            classes (
              id,
              name
            )
          ),
          students (
            id,
            admission_number,
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
      console.error('Error creating/updating exam result:', error);
      return { success: false, error: error.message };
    }
  },

  // Get all exam results
  async getAllResults() {
    try {
      const { data, error } = await supabase
        .from('exam_results')
        .select(`
          *,
          exams (
            id,
            title,
            exam_date,
            total_marks,
            subjects (
              id,
              name,
              code
            ),
            classes (
              id,
              name
            )
          ),
          students (
            id,
            admission_number,
            user_profiles (
              id,
              full_name,
              email
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error fetching exam results:', error);
      return { success: false, error: error.message };
    }
  },

  // Get results by exam
  async getResultsByExam(examId) {
    try {
      const { data, error } = await supabase
        .from('exam_results')
        .select(`
          *,
          students (
            id,
            admission_number,
            user_profiles (
              id,
              full_name,
              email
            )
          )
        `)
        .eq('exam_id', examId)
        .order('score', { ascending: false });

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error fetching results by exam:', error);
      return { success: false, error: error.message };
    }
  },

  // Get results by student
  async getResultsByStudent(studentId) {
    try {
      const { data, error } = await supabase
        .from('exam_results')
        .select(`
          *,
          exams (
            id,
            title,
            exam_date,
            total_marks,
            exam_type,
            subjects (
              id,
              name,
              code
            ),
            classes (
              id,
              name
            )
          )
        `)
        .eq('student_id', studentId)
        .order('exams(exam_date)', { ascending: false });

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error fetching results by student:', error);
      return { success: false, error: error.message };
    }
  },

  // Get results by class
  async getResultsByClass(classId) {
    try {
      const { data, error } = await supabase
        .from('exam_results')
        .select(`
          *,
          exams!inner (
            id,
            title,
            exam_date,
            total_marks,
            subjects (
              id,
              name,
              code
            )
          ),
          students (
            id,
            admission_number,
            user_profiles (
              id,
              full_name,
              email
            )
          )
        `)
        .eq('exams.class_id', classId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error fetching results by class:', error);
      return { success: false, error: error.message };
    }
  },

  // Get results by subject
  async getResultsBySubject(subjectId) {
    try {
      const { data, error } = await supabase
        .from('exam_results')
        .select(`
          *,
          exams!inner (
            id,
            title,
            exam_date,
            total_marks,
            classes (
              id,
              name
            )
          ),
          students (
            id,
            admission_number,
            user_profiles (
              id,
              full_name,
              email
            )
          )
        `)
        .eq('exams.subject_id', subjectId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error fetching results by subject:', error);
      return { success: false, error: error.message };
    }
  },

  // Get specific result
  async getResult(examId, studentId) {
    try {
      const { data, error } = await supabase
        .from('exam_results')
        .select(`
          *,
          exams (
            id,
            title,
            exam_date,
            total_marks,
            subjects (
              id,
              name,
              code
            ),
            classes (
              id,
              name
            )
          ),
          students (
            id,
            admission_number,
            user_profiles (
              id,
              full_name,
              email
            )
          )
        `)
        .eq('exam_id', examId)
        .eq('student_id', studentId)
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error fetching specific result:', error);
      return { success: false, error: error.message };
    }
  },

  // Update result
  async updateResult(resultId, updateData) {
    try {
      const { data, error } = await supabase
        .from('exam_results')
        .update({
          ...updateData,
          updated_at: new Date().toISOString()
        })
        .eq('id', resultId)
        .select(`
          *,
          exams (
            id,
            title,
            exam_date,
            total_marks,
            subjects (
              id,
              name,
              code
            ),
            classes (
              id,
              name
            )
          ),
          students (
            id,
            admission_number,
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
      console.error('Error updating result:', error);
      return { success: false, error: error.message };
    }
  },

  // Delete result
  async deleteResult(resultId) {
    try {
      const { data, error } = await supabase
        .from('exam_results')
        .delete()
        .eq('id', resultId)
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error deleting result:', error);
      return { success: false, error: error.message };
    }
  },

  // Calculate class positions for an exam
  async calculateClassPositions(examId) {
    try {
      const { data: results, error } = await supabase
        .from('exam_results')
        .select('id, student_id, score')
        .eq('exam_id', examId)
        .order('score', { ascending: false });

      if (error) throw error;

      // Calculate positions
      const updates = results.map((result, index) => ({
        id: result.id,
        position: index + 1
      }));

      // Update positions (if you add a position column to exam_results)
      // For now, we'll return the calculated positions
      return { success: true, data: updates };
    } catch (error) {
      console.error('Error calculating class positions:', error);
      return { success: false, error: error.message };
    }
  },

  // Get student performance analytics
  async getStudentPerformance(studentId, subjectId = null) {
    try {
      let query = supabase
        .from('exam_results')
        .select(`
          score,
          max_score,
          exams (
            exam_date,
            exam_type,
            subjects (
              id,
              name
            )
          )
        `)
        .eq('student_id', studentId)
        .order('exams(exam_date)', { ascending: true });

      if (subjectId) {
        query = query.eq('exams.subject_id', subjectId);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Calculate performance metrics
      const scores = data.map(result => (result.score / result.max_score) * 100);
      const averageScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
      const highestScore = scores.length > 0 ? Math.max(...scores) : 0;
      const lowestScore = scores.length > 0 ? Math.min(...scores) : 0;

      return {
        success: true,
        data: {
          results: data,
          analytics: {
            totalExams: data.length,
            averageScore: Math.round(averageScore * 100) / 100,
            highestScore: Math.round(highestScore * 100) / 100,
            lowestScore: Math.round(lowestScore * 100) / 100,
            trend: scores.length > 1 ? (scores[scores.length - 1] > scores[0] ? 'improving' : 'declining') : 'stable'
          }
        }
      };
    } catch (error) {
      console.error('Error fetching student performance:', error);
      return { success: false, error: error.message };
    }
  },

  // Get class performance summary
  async getClassPerformanceSummary(classId, subjectId = null) {
    try {
      let query = supabase
        .from('exam_results')
        .select(`
          score,
          max_score,
          exams!inner (
            id,
            title,
            exam_date,
            subjects (
              id,
              name
            )
          )
        `)
        .eq('exams.class_id', classId);

      if (subjectId) {
        query = query.eq('exams.subject_id', subjectId);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Calculate class performance metrics
      const percentageScores = data.map(result => (result.score / result.max_score) * 100);
      const classAverage = percentageScores.length > 0 ? percentageScores.reduce((a, b) => a + b, 0) / percentageScores.length : 0;
      const highestScore = percentageScores.length > 0 ? Math.max(...percentageScores) : 0;
      const lowestScore = percentageScores.length > 0 ? Math.min(...percentageScores) : 0;

      // Grade distribution
      const gradeDistribution = {
        A: percentageScores.filter(score => score >= 80).length,
        B: percentageScores.filter(score => score >= 70 && score < 80).length,
        C: percentageScores.filter(score => score >= 60 && score < 70).length,
        D: percentageScores.filter(score => score >= 50 && score < 60).length,
        F: percentageScores.filter(score => score < 50).length
      };

      return {
        success: true,
        data: {
          totalResults: data.length,
          classAverage: Math.round(classAverage * 100) / 100,
          highestScore: Math.round(highestScore * 100) / 100,
          lowestScore: Math.round(lowestScore * 100) / 100,
          gradeDistribution
        }
      };
    } catch (error) {
      console.error('Error fetching class performance summary:', error);
      return { success: false, error: error.message };
    }
  }
};

// Export individual functions for backward compatibility
export const {
  createOrUpdateResult,
  getAllResults,
  getResultsByExam,
  getResultsByStudent,
  getResultsByClass,
  getResultsBySubject,
  getResult,
  updateResult,
  deleteResult,
  calculateClassPositions,
  getStudentPerformance,
  getClassPerformanceSummary
} = examResultService;

// Legacy function names for compatibility
export const submitResult = createOrUpdateResult;
export const getResults = getAllResults;