import { supabase } from '../../lib/supabaseClient';

/**
 * Create or update a grade for a student
 */
export const createOrUpdateGrade = async (gradeData) => {
  try {
    const {
      studentId,
      teacherId,
      subjectName,
      assignmentId,
      classId,
      grade,
      maxPoints,
      feedback,
      gradeType = 'assignment' // assignment, test, exam, quiz
    } = gradeData;

    // Create a unique ID for the grade based on student, assignment, and subject
    const gradeId = `${studentId}_${assignmentId || 'manual'}_${subjectName.replace(/\s+/g, '_')}`;
    
    const gradeDoc = {
      id: gradeId,
      studentId,
      teacherId,
      subjectName,
      assignmentId: assignmentId || null,
      classId,
      grade: parseFloat(grade),
      maxPoints: parseFloat(maxPoints),
      percentage: Math.round((parseFloat(grade) / parseFloat(maxPoints)) * 100),
      feedback: feedback || null,
      gradeType,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Use upsert to create or update the grade
    const { data, error } = await supabase
      .from('grades')
      .upsert(gradeDoc, { onConflict: 'id' })
      .select()
      .single();

    if (error) {
      console.error('Supabase error creating/updating grade:', error);
      return { success: false, error: error.message };
    }
    
    return { success: true, data };
  } catch (error) {
    console.error('Error creating/updating grade:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get all grades for a specific student
 */
export const getGradesByStudent = async (studentId) => {
  try {
    const { data, error } = await supabase
      .from('grades')
      .select('*')
      .eq('studentId', studentId)
      .order('createdAt', { ascending: false });

    if (error) {
      console.error('Supabase error fetching student grades:', error);
      return { success: false, error: error.message };
    }
    
    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Error fetching student grades:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get all grades for a specific assignment
 */
export const getGradesByAssignment = async (assignmentId) => {
  try {
    const { data, error } = await supabase
      .from('grades')
      .select('*')
      .eq('assignmentId', assignmentId);

    if (error) {
      console.error('Supabase error fetching assignment grades:', error);
      return { success: false, error: error.message };
    }
    
    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Error fetching assignment grades:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get all grades for students in a specific class and subject
 */
export const getGradesByClassAndSubject = async (classId, subjectName) => {
  try {
    const { data, error } = await supabase
      .from('grades')
      .select('*')
      .eq('classId', classId)
      .eq('subjectName', subjectName)
      .order('createdAt', { ascending: false });

    if (error) {
      console.error('Supabase error fetching class subject grades:', error);
      return { success: false, error: error.message };
    }
    
    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Error fetching class subject grades:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get all grades created by a teacher
 */
export const getGradesByTeacher = async (teacherId) => {
  try {
    const { data, error } = await supabase
      .from('grades')
      .select('*')
      .eq('teacherId', teacherId)
      .order('createdAt', { ascending: false });

    if (error) {
      console.error('Supabase error fetching teacher grades:', error);
      return { success: false, error: error.message };
    }
    
    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Error fetching teacher grades:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get grade statistics for a student in a subject
 */
export const getStudentSubjectStats = async (studentId, subjectName) => {
  try {
    const { data: grades, error } = await supabase
      .from('grades')
      .select('*')
      .eq('studentId', studentId)
      .eq('subjectName', subjectName);

    if (error) {
      console.error('Supabase error fetching student subject stats:', error);
      return { success: false, error: error.message };
    }
    
    if (!grades || grades.length === 0) {
      return {
        success: true,
        data: {
          totalGrades: 0,
          averagePercentage: 0,
          totalPoints: 0,
          maxPossiblePoints: 0,
          gradesByType: {}
        }
      };
    }
    
    const totalPoints = grades.reduce((sum, grade) => sum + grade.grade, 0);
    const maxPossiblePoints = grades.reduce((sum, grade) => sum + grade.maxPoints, 0);
    const averagePercentage = Math.round((totalPoints / maxPossiblePoints) * 100);
    
    // Group by grade type
    const gradesByType = grades.reduce((acc, grade) => {
      const type = grade.gradeType || 'assignment';
      if (!acc[type]) {
        acc[type] = [];
      }
      acc[type].push(grade);
      return acc;
    }, {});
    
    return {
      success: true,
      data: {
        totalGrades: grades.length,
        averagePercentage,
        totalPoints,
        maxPossiblePoints,
        gradesByType
      }
    };
  } catch (error) {
    console.error('Error fetching student subject stats:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get class statistics for a subject
 */
export const getClassSubjectStats = async (classId, subjectName) => {
  try {
    const gradesResult = await getGradesByClassAndSubject(classId, subjectName);
    
    if (!gradesResult.success) {
      return gradesResult;
    }
    
    const grades = gradesResult.data;
    
    if (grades.length === 0) {
      return {
        success: true,
        data: {
          totalStudents: 0,
          averageClassPercentage: 0,
          gradeDistribution: {},
          topPerformers: [],
          needsAttention: []
        }
      };
    }
    
    // Group grades by student
    const studentGrades = grades.reduce((acc, grade) => {
      if (!acc[grade.studentId]) {
        acc[grade.studentId] = [];
      }
      acc[grade.studentId].push(grade);
      return acc;
    }, {});
    
    // Calculate average for each student
    const studentAverages = Object.entries(studentGrades).map(([studentId, grades]) => {
      const totalPoints = grades.reduce((sum, grade) => sum + grade.grade, 0);
      const maxPossiblePoints = grades.reduce((sum, grade) => sum + grade.maxPoints, 0);
      const percentage = Math.round((totalPoints / maxPossiblePoints) * 100);
      
      return {
        studentId,
        percentage,
        totalGrades: grades.length
      };
    });
    
    // Calculate class average
    const classAverage = Math.round(
      studentAverages.reduce((sum, student) => sum + student.percentage, 0) / studentAverages.length
    );
    
    // Grade distribution
    const gradeDistribution = studentAverages.reduce((acc, student) => {
      let gradeRange;
      if (student.percentage >= 90) gradeRange = 'A (90-100%)';
      else if (student.percentage >= 80) gradeRange = 'B (80-89%)';
      else if (student.percentage >= 70) gradeRange = 'C (70-79%)';
      else if (student.percentage >= 60) gradeRange = 'D (60-69%)';
      else gradeRange = 'F (Below 60%)';
      
      acc[gradeRange] = (acc[gradeRange] || 0) + 1;
      return acc;
    }, {});
    
    // Top performers (>= 80%)
    const topPerformers = studentAverages
      .filter(student => student.percentage >= 80)
      .sort((a, b) => b.percentage - a.percentage)
      .slice(0, 5);
    
    // Students needing attention (< 60%)
    const needsAttention = studentAverages
      .filter(student => student.percentage < 60)
      .sort((a, b) => a.percentage - b.percentage);
    
    return {
      success: true,
      data: {
        totalStudents: studentAverages.length,
        averageClassPercentage: classAverage,
        gradeDistribution,
        topPerformers,
        needsAttention
      }
    };
  } catch (error) {
    console.error('Error fetching class subject stats:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Delete a grade
 */
export const deleteGrade = async (gradeId) => {
  try {
    const { error } = await supabase
      .from('grades')
      .delete()
      .eq('id', gradeId);

    if (error) {
      console.error('Supabase error deleting grade:', error);
      return { success: false, error: error.message };
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error deleting grade:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Bulk create/update grades for multiple students
 */
export const bulkCreateGrades = async (gradesData) => {
  try {
    const results = [];
    
    for (const gradeData of gradesData) {
      const result = await createOrUpdateGrade(gradeData);
      if (result.success) {
        results.push({ success: true, gradeId: result.data.id, studentId: gradeData.studentId });
      } else {
        results.push({ success: false, error: result.error, studentId: gradeData.studentId });
      }
    }
    
    return { success: true, data: results };
  } catch (error) {
    console.error('Error bulk creating grades:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get grade summary for a teacher's dashboard
 */
export const getTeacherGradeSummary = async (teacherId) => {
  try {
    const gradesResult = await getGradesByTeacher(teacherId);
    
    if (!gradesResult.success) {
      return gradesResult;
    }
    
    const grades = gradesResult.data;
    
    const summary = {
      totalGradesGiven: grades.length,
      subjectsGraded: [...new Set(grades.map(g => g.subjectName))].length,
      studentsGraded: [...new Set(grades.map(g => g.studentId))].length,
      averageGradeGiven: 0,
      recentGrades: []
    };
    
    if (grades.length > 0) {
      const totalPercentage = grades.reduce((sum, grade) => sum + grade.percentage, 0);
      summary.averageGradeGiven = Math.round(totalPercentage / grades.length);
      
      // Get 5 most recent grades
      summary.recentGrades = grades.slice(0, 5);
    }
    
    return { success: true, data: summary };
  } catch (error) {
    console.error('Error fetching teacher grade summary:', error);
    return { success: false, error: error.message };
  }
};

// Export as service object for easier usage
export const gradeService = {
  createOrUpdateGrade,
  getGradesByStudent,
  getGradesByAssignment,
  getGradesByClassAndSubject,
  getGradesByTeacher,
  getStudentSubjectStats,
  getClassSubjectStats,
  deleteGrade,
  bulkCreateGrades,
  getTeacherGradeSummary
};