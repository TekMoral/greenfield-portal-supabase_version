import { supabase } from '../../lib/supabaseClient';

/**
 * Teacher submits result (80% of the workflow)
 */
export const submitResult = async ({ studentId, subjectId, term, year, testScore, examScore }) => {
  try {
    // Get current user (teacher)
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Compose deterministic doc ID to prevent duplicates
    const resultId = `${studentId}_${subjectId}_${term}_${year}`;
    
    // Check if result already exists
    const { data: existing, error: checkError } = await supabase
      .from('student_results')
      .select('id')
      .eq('id', resultId)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Error checking existing result:', checkError);
      return { success: false, error: checkError.message };
    }

    if (existing) {
      return { success: false, error: 'Result already submitted for this student/subject/term/year' };
    }

    // Create initial result
    const resultData = {
      id: resultId,
      studentId,
      subjectId,
      term,
      year,
      testScore: parseFloat(testScore),
      examScore: parseFloat(examScore),
      status: 'submitted',
      teacherId: user.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('student_results')
      .insert(resultData)
      .select()
      .single();

    if (error) {
      console.error('Supabase error submitting result:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data: { id: resultId } };
  } catch (error) {
    console.error('Error submitting result:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Admin grades result (adds adminScore, totalScore, sets status: graded, published: false)
 */
export const gradeResultByAdmin = async ({ studentId, subjectId, term, year, adminScore }) => {
  try {
    // Get current user (admin)
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: 'Not authenticated' };
    }

    const resultId = `${studentId}_${subjectId}_${term}_${year}`;
    
    // Get existing result
    const { data: existingResult, error: fetchError } = await supabase
      .from('student_results')
      .select('*')
      .eq('id', resultId)
      .single();

    if (fetchError) {
      console.error('Error fetching result:', fetchError);
      return { success: false, error: 'Result not found' };
    }

    if (existingResult.status !== 'submitted' && existingResult.status !== 'graded') {
      return { success: false, error: 'Result is not in submitted state' };
    }

    // Calculate total score
    const totalScore = existingResult.testScore + existingResult.examScore + parseFloat(adminScore);

    // Update result with admin score
    const { data, error } = await supabase
      .from('student_results')
      .update({
        adminScore: parseFloat(adminScore),
        totalScore,
        status: 'graded',
        published: false,
        gradedBy: user.id,
        gradedAt: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', resultId)
      .select()
      .single();

    if (error) {
      console.error('Supabase error grading result:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data: { id: resultId } };
  } catch (error) {
    console.error('Error grading result:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Admin publishes result (sets published: true)
 */
export const publishResult = async ({ studentId, subjectId, term, year }) => {
  try {
    // Get current user (admin)
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: 'Not authenticated' };
    }

    const resultId = `${studentId}_${subjectId}_${term}_${year}`;
    
    // Get existing result
    const { data: existingResult, error: fetchError } = await supabase
      .from('student_results')
      .select('status')
      .eq('id', resultId)
      .single();

    if (fetchError) {
      console.error('Error fetching result:', fetchError);
      return { success: false, error: 'Result not found' };
    }

    if (existingResult.status !== 'graded') {
      return { success: false, error: 'Result must be graded before publishing' };
    }

    // Publish result
    const { data, error } = await supabase
      .from('student_results')
      .update({
        published: true,
        publishedBy: user.id,
        publishedAt: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', resultId)
      .select()
      .single();

    if (error) {
      console.error('Supabase error publishing result:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data: { id: resultId } };
  } catch (error) {
    console.error('Error publishing result:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Fetch published results for a student
 */
export const getPublishedResultsByStudent = async (studentId) => {
  try {
    const { data, error } = await supabase
      .from('student_results')
      .select('*')
      .eq('studentId', studentId)
      .eq('published', true)
      .order('year', { ascending: false })
      .order('term', { ascending: false });

    if (error) {
      console.error('Supabase error fetching published results:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Error fetching published results:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Fetch submitted results for admin review
 */
export const getSubmittedResults = async (filters = {}) => {
  try {
    let query = supabase.from('student_results').select('*');
    
    if (filters.status) {
      query = query.eq('status', filters.status);
    } else {
      // Default to submitted results for admin review
      query = query.eq('status', 'submitted');
    }

    if (filters.term) {
      query = query.eq('term', filters.term);
    }

    if (filters.year) {
      query = query.eq('year', filters.year);
    }

    if (filters.subjectId) {
      query = query.eq('subjectId', filters.subjectId);
    }

    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;

    if (error) {
      console.error('Supabase error fetching submitted results:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Error fetching submitted results:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Calculate grade based on total score
 */
export const calculateGrade = (totalScore, maxScore = 100) => {
  const percentage = (totalScore / maxScore) * 100;
  
  if (percentage >= 90) return { grade: 'A+', gpa: 4.0, percentage };
  if (percentage >= 80) return { grade: 'A', gpa: 3.7, percentage };
  if (percentage >= 70) return { grade: 'B', gpa: 3.0, percentage };
  if (percentage >= 60) return { grade: 'C', gpa: 2.0, percentage };
  if (percentage >= 50) return { grade: 'D', gpa: 1.0, percentage };
  return { grade: 'F', gpa: 0.0, percentage };
};

/**
 * Get published results for a student (for student portal)
 */
export const getStudentExamResults = async (studentId) => {
  try {
    const { data, error } = await supabase
      .from('student_results')
      .select('*')
      .eq('studentId', studentId)
      .eq('published', true)
      .order('year', { ascending: false })
      .order('term', { ascending: false });

    if (error) {
      console.error('Supabase error fetching student exam results:', error);
      return { success: false, error: error.message };
    }

    // Enrich results with calculated grades
    const enrichedResults = data.map(result => {
      const gradeInfo = calculateGrade(result.totalScore);
      return {
        ...result,
        ...gradeInfo
      };
    });

    return { success: true, data: enrichedResults };
  } catch (error) {
    console.error('Error fetching student exam results:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get result by ID
 */
export const getResultById = async (resultId) => {
  try {
    const { data, error } = await supabase
      .from('student_results')
      .select('*')
      .eq('id', resultId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return { success: false, error: 'Result not found' };
      }
      console.error('Supabase error fetching result:', error);
      return { success: false, error: error.message };
    }

    // Add calculated grade information
    const gradeInfo = calculateGrade(data.totalScore);
    const enrichedResult = {
      ...data,
      ...gradeInfo
    };

    return { success: true, data: enrichedResult };
  } catch (error) {
    console.error('Error fetching result:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Update result
 */
export const updateResult = async (resultId, updateData) => {
  try {
    const { data, error } = await supabase
      .from('student_results')
      .update({
        ...updateData,
        updated_at: new Date().toISOString()
      })
      .eq('id', resultId)
      .select()
      .single();

    if (error) {
      console.error('Supabase error updating result:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Error updating result:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Delete result
 */
export const deleteResult = async (resultId) => {
  try {
    const { error } = await supabase
      .from('student_results')
      .delete()
      .eq('id', resultId);

    if (error) {
      console.error('Supabase error deleting result:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Error deleting result:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get results statistics
 */
export const getResultsStatistics = async (filters = {}) => {
  try {
    let query = supabase.from('student_results').select('status, totalScore, published');

    if (filters.term) {
      query = query.eq('term', filters.term);
    }

    if (filters.year) {
      query = query.eq('year', filters.year);
    }

    if (filters.subjectId) {
      query = query.eq('subjectId', filters.subjectId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Supabase error fetching results statistics:', error);
      return { success: false, error: error.message };
    }

    const stats = {
      total: data.length,
      submitted: data.filter(r => r.status === 'submitted').length,
      graded: data.filter(r => r.status === 'graded').length,
      published: data.filter(r => r.published === true).length,
      averageScore: 0,
      gradeDistribution: { A: 0, B: 0, C: 0, D: 0, F: 0 }
    };

    // Calculate average score and grade distribution for graded results
    const gradedResults = data.filter(r => r.status === 'graded' && r.totalScore !== null);
    
    if (gradedResults.length > 0) {
      const totalScore = gradedResults.reduce((sum, r) => sum + r.totalScore, 0);
      stats.averageScore = Math.round((totalScore / gradedResults.length) * 100) / 100;

      gradedResults.forEach(result => {
        const gradeInfo = calculateGrade(result.totalScore);
        const letterGrade = gradeInfo.grade.charAt(0); // Get first letter (A, B, C, D, F)
        if (stats.gradeDistribution[letterGrade] !== undefined) {
          stats.gradeDistribution[letterGrade]++;
        }
      });
    }

    return { success: true, data: stats };
  } catch (error) {
    console.error('Error fetching results statistics:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Bulk submit results
 */
export const bulkSubmitResults = async (resultsData) => {
  try {
    const results = [];
    
    for (const resultData of resultsData) {
      const result = await submitResult(resultData);
      results.push({
        success: result.success,
        data: result.data,
        error: result.error,
        studentId: resultData.studentId
      });
    }

    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);

    return {
      success: true,
      data: {
        successful: successful.length,
        failed: failed.length,
        results
      }
    };
  } catch (error) {
    console.error('Error bulk submitting results:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Bulk grade results
 */
export const bulkGradeResults = async (gradesData) => {
  try {
    const results = [];
    
    for (const gradeData of gradesData) {
      const result = await gradeResultByAdmin(gradeData);
      results.push({
        success: result.success,
        data: result.data,
        error: result.error,
        studentId: gradeData.studentId
      });
    }

    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);

    return {
      success: true,
      data: {
        successful: successful.length,
        failed: failed.length,
        results
      }
    };
  } catch (error) {
    console.error('Error bulk grading results:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Bulk publish results
 */
export const bulkPublishResults = async (publishData) => {
  try {
    const results = [];
    
    for (const data of publishData) {
      const result = await publishResult(data);
      results.push({
        success: result.success,
        data: result.data,
        error: result.error,
        studentId: data.studentId
      });
    }

    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);

    return {
      success: true,
      data: {
        successful: successful.length,
        failed: failed.length,
        results
      }
    };
  } catch (error) {
    console.error('Error bulk publishing results:', error);
    return { success: false, error: error.message };
  }
};

// Export as service object for easier usage
export const studentResultService = {
  submitResult,
  gradeResultByAdmin,
  publishResult,
  getPublishedResultsByStudent,
  getSubmittedResults,
  calculateGrade,
  getStudentExamResults,
  getResultById,
  updateResult,
  deleteResult,
  getResultsStatistics,
  bulkSubmitResults,
  bulkGradeResults,
  bulkPublishResults
};