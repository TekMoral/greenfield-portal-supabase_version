import { supabase } from '../../lib/supabaseClient';

// Assignment Service using Supabase
export const assignmentService = {
  // Create a new assignment
  async createAssignment(assignmentData) {
    try {
      const { data, error } = await supabase
        .from('assignments')
        .insert({
          title: assignmentData.title,
          description: assignmentData.description,
          subject_id: assignmentData.subject_id,
          class_id: assignmentData.class_id,
          teacher_id: assignmentData.teacher_id,
          due_date: assignmentData.due_date,
          total_marks: assignmentData.total_marks || 100,
          instructions: assignmentData.instructions,
          attachment_url: assignmentData.attachment_url
        })
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
              full_name,
              email
            )
          )
        `)
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error creating assignment:', error);
      return { success: false, error: error.message };
    }
  },

  // Get all assignments
  async getAllAssignments() {
    try {
      const { data, error } = await supabase
        .from('assignments')
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
              full_name,
              email
            )
          )
        `)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error fetching assignments:', error);
      return { success: false, error: error.message };
    }
  },

  // Get assignments by teacher
  async getAssignmentsByTeacher(teacherId) {
    try {
      const { data, error } = await supabase
        .from('assignments')
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
          )
        `)
        .eq('teacher_id', teacherId)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error fetching assignments by teacher:', error);
      return { success: false, error: error.message };
    }
  },

  // Get assignments by class
  async getAssignmentsByClass(classId) {
    try {
      const { data, error } = await supabase
        .from('assignments')
        .select(`
          *,
          subjects (
            id,
            name,
            code
          ),
          teachers (
            id,
            user_profiles (
              full_name,
              email
            )
          )
        `)
        .eq('class_id', classId)
        .eq('status', 'active')
        .order('due_date', { ascending: true });

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error fetching assignments by class:', error);
      return { success: false, error: error.message };
    }
  },

  // Submit assignment
  async submitAssignment(submissionData) {
    try {
      const { data, error } = await supabase
        .from('assignment_submissions')
        .upsert({
          assignment_id: submissionData.assignment_id,
          student_id: submissionData.student_id,
          submission_text: submissionData.submission_text,
          attachment_url: submissionData.attachment_url,
          status: 'submitted'
        })
        .select(`
          *,
          assignments (
            title,
            due_date,
            total_marks
          ),
          students (
            admission_number,
            user_profiles (
              full_name,
              email
            )
          )
        `)
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error submitting assignment:', error);
      return { success: false, error: error.message };
    }
  },

  // Grade assignment submission
  async gradeAssignment(submissionId, score, feedback) {
    try {
      const { data, error } = await supabase
        .from('assignment_submissions')
        .update({
          score: score,
          feedback: feedback,
          graded_at: new Date().toISOString(),
          status: 'graded'
        })
        .eq('id', submissionId)
        .select(`
          *,
          assignments (
            title,
            total_marks
          ),
          students (
            admission_number,
            user_profiles (
              full_name,
              email
            )
          )
        `)
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error grading assignment:', error);
      return { success: false, error: error.message };
    }
  },

  // Get assignment submissions
  async getAssignmentSubmissions(assignmentId) {
    try {
      const { data, error } = await supabase
        .from('assignment_submissions')
        .select(`
          *,
          students (
            admission_number,
            user_profiles (
              full_name,
              email
            )
          )
        `)
        .eq('assignment_id', assignmentId)
        .order('submitted_at', { ascending: false });

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error fetching assignment submissions:', error);
      return { success: false, error: error.message };
    }
  },

  // Get student submissions
  async getStudentSubmissions(studentId) {
    try {
      const { data, error } = await supabase
        .from('assignment_submissions')
        .select(`
          *,
          assignments (
            title,
            due_date,
            total_marks,
            subjects (
              name,
              code
            ),
            classes (
              name
            )
          )
        `)
        .eq('student_id', studentId)
        .order('submitted_at', { ascending: false });

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error fetching student submissions:', error);
      return { success: false, error: error.message };
    }
  },

  // Get assignment statistics
  async getAssignmentStats(assignmentId) {
    try {
      // Get total submissions
      const { count: totalSubmissions } = await supabase
        .from('assignment_submissions')
        .select('*', { count: 'exact', head: true })
        .eq('assignment_id', assignmentId);

      // Get graded submissions
      const { count: gradedSubmissions } = await supabase
        .from('assignment_submissions')
        .select('*', { count: 'exact', head: true })
        .eq('assignment_id', assignmentId)
        .eq('status', 'graded');

      // Get average score
      const { data: scores } = await supabase
        .from('assignment_submissions')
        .select('score')
        .eq('assignment_id', assignmentId)
        .not('score', 'is', null);

      const averageScore = scores?.length > 0
        ? scores.reduce((sum, submission) => sum + submission.score, 0) / scores.length
        : 0;

      return {
        success: true,
        data: {
          totalSubmissions: totalSubmissions || 0,
          gradedSubmissions: gradedSubmissions || 0,
          pendingGrading: (totalSubmissions || 0) - (gradedSubmissions || 0),
          averageScore: Math.round(averageScore * 100) / 100
        }
      };
    } catch (error) {
      console.error('Error fetching assignment stats:', error);
      return { success: false, error: error.message };
    }
  },

  // Update assignment
  async updateAssignment(assignmentId, updateData) {
    try {
      const { data, error } = await supabase
        .from('assignments')
        .update({
          ...updateData,
          updated_at: new Date().toISOString()
        })
        .eq('id', assignmentId)
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
              full_name,
              email
            )
          )
        `)
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error updating assignment:', error);
      return { success: false, error: error.message };
    }
  },

  // Delete assignment
  async deleteAssignment(assignmentId) {
    try {
      const { data, error } = await supabase
        .from('assignments')
        .update({
          status: 'inactive',
          updated_at: new Date().toISOString()
        })
        .eq('id', assignmentId)
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error deleting assignment:', error);
      return { success: false, error: error.message };
    }
  }
};

// Export individual functions for backward compatibility
export const {
  createAssignment,
  getAllAssignments,
  getAssignmentsByTeacher,
  getAssignmentsByClass,
  submitAssignment,
  gradeAssignment,
  getAssignmentSubmissions,
  getStudentSubmissions,
  getAssignmentStats,
  updateAssignment,
  deleteAssignment
} = assignmentService;

// Get assignments for student (standalone function)
export const getAssignmentsForStudent = async (studentId) => {
  try {
    // First get the student's class
    const { data: studentData, error: studentError } = await supabase
      .from('user_profiles')
      .select('class_id')
      .eq('id', studentId)
      .eq('role', 'student')
      .single();

    if (studentError) throw studentError;
    
    if (!studentData) {
      return [];
    }

    // Get assignments for the student's class
    const { data: assignments, error: assignmentsError } = await supabase
      .from('assignments')
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
        assignment_submissions (
          id,
          student_id,
          submission_text,
          attachment_url,
          score,
          feedback,
          status,
          submitted_at,
          graded_at
        )
      `)
      .eq('class_id', studentData.class_id)
      .eq('status', 'active')
      .order('due_date', { ascending: true });

    if (assignmentsError) throw assignmentsError;

    // Filter and format assignments with submission data for this student
    const formattedAssignments = (assignments || []).map(assignment => {
      const studentSubmission = assignment.assignment_submissions?.find(
        sub => sub.student_id === studentId
      );

      return {
        ...assignment,
        submissions: studentSubmission ? [studentSubmission] : [],
        subject_name: assignment.subjects?.name,
        class_name: assignment.classes?.name
      };
    });

    return formattedAssignments;
  } catch (error) {
    console.error('Error fetching assignments for student:', error);
    return [];
  }
};
