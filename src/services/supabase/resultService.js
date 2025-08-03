import { supabase } from '../../lib/supabaseClient';

/**
 * Create or update a student result
 */
export const createOrUpdateResult = async (resultData) => {
  try {
    // Create a unique ID based on student, exam, and session
    const resultId = `${resultData.studentId}_${resultData.examId}_${resultData.session}_${resultData.term}`;
    
    const resultDoc = {
      id: resultId,
      ...resultData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('results')
      .upsert(resultDoc, { onConflict: 'id' })
      .select()
      .single();

    if (error) {
      console.error('Supabase error creating/updating result:', error);
      return { success: false, error: error.message };
    }
    
    return { success: true, data };
  } catch (error) {
    console.error('Error creating/updating result:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get results for a specific student
 */
export const getResultsByStudent = async (studentId) => {
  try {
    const { data, error } = await supabase
      .from('results')
      .select('*')
      .eq('studentId', studentId)
      .order('createdAt', { ascending: false });

    if (error) {
      console.error('Supabase error fetching student results:', error);
      return { success: false, error: error.message };
    }
    
    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Error fetching student results:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get results for a specific exam
 */
export const getResultsByExam = async (examId) => {
  try {
    const { data, error } = await supabase
      .from('results')
      .select('*')
      .eq('examId', examId)
      .order('totalScore', { ascending: false });

    if (error) {
      console.error('Supabase error fetching exam results:', error);
      return { success: false, error: error.message };
    }
    
    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Error fetching exam results:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get results for a specific class
 */
export const getResultsByClass = async (classId, session = null, term = null) => {
  try {
    let query = supabase
      .from('results')
      .select('*')
      .eq('classId', classId);

    if (session) {
      query = query.eq('session', session);
    }

    if (term) {
      query = query.eq('term', term);
    }

    query = query.order('totalScore', { ascending: false });

    const { data, error } = await query;

    if (error) {
      console.error('Supabase error fetching class results:', error);
      return { success: false, error: error.message };
    }
    
    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Error fetching class results:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get result by ID
 */
export const getResultById = async (resultId) => {
  try {
    const { data, error } = await supabase
      .from('results')
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
    
    return { success: true, data };
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
      .from('results')
      .update({
        ...updateData,
        updatedAt: new Date().toISOString()
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
      .from('results')
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
 * Calculate class positions for results
 */
export const calculateClassPositions = async (classId, session, term) => {
  try {
    const resultsResponse = await getResultsByClass(classId, session, term);
    
    if (!resultsResponse.success) {
      return resultsResponse;
    }
    
    const results = resultsResponse.data;
    
    // Sort by total score in descending order
    results.sort((a, b) => b.totalScore - a.totalScore);
    
    // Update positions
    const updatePromises = results.map((result, index) => {
      const position = index + 1;
      return updateResult(result.id, { position });
    });
    
    const updateResults = await Promise.all(updatePromises);
    
    // Check if any updates failed
    const failedUpdates = updateResults.filter(result => !result.success);
    if (failedUpdates.length > 0) {
      console.error('Some position updates failed:', failedUpdates);
    }
    
    return {
      success: true,
      data: results.map((result, index) => ({
        ...result,
        position: index + 1
      }))
    };
  } catch (error) {
    console.error('Error calculating class positions:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Bulk create results for multiple students
 */
export const bulkCreateResults = async (resultsData) => {
  try {
    const results = [];
    
    for (const resultData of resultsData) {
      const result = await createOrUpdateResult(resultData);
      if (result.success) {
        results.push({ success: true, result: result.data, studentId: resultData.studentId });
      } else {
        results.push({ 
          success: false, 
          error: result.error, 
          studentId: resultData.studentId 
        });
      }
    }
    
    return { success: true, data: results };
  } catch (error) {
    console.error('Error bulk creating results:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get result statistics for a class
 */
export const getResultStatistics = async (classId, session, term) => {
  try {
    const resultsResponse = await getResultsByClass(classId, session, term);
    
    if (!resultsResponse.success) {
      return resultsResponse;
    }
    
    const results = resultsResponse.data;
    
    if (results.length === 0) {
      return {
        success: true,
        data: {
          totalStudents: 0,
          averageScore: 0,
          highestScore: 0,
          lowestScore: 0,
          passRate: 0
        }
      };
    }
    
    const totalStudents = results.length;
    const totalScores = results.reduce((sum, result) => sum + result.totalScore, 0);
    const averageScore = totalScores / totalStudents;
    const highestScore = Math.max(...results.map(r => r.totalScore));
    const lowestScore = Math.min(...results.map(r => r.totalScore));
    const passedStudents = results.filter(r => r.totalScore >= 50).length; // Assuming 50 is pass mark
    const passRate = (passedStudents / totalStudents) * 100;
    
    return {
      success: true,
      data: {
        totalStudents,
        averageScore: Math.round(averageScore * 100) / 100,
        highestScore,
        lowestScore,
        passRate: Math.round(passRate * 100) / 100
      }
    };
  } catch (error) {
    console.error('Error calculating result statistics:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get results by multiple filters
 */
export const getResultsByFilters = async (filters = {}) => {
  try {
    let query = supabase.from('results').select('*');
    
    // Apply filters
    if (filters.studentId) {
      query = query.eq('studentId', filters.studentId);
    }
    
    if (filters.classId) {
      query = query.eq('classId', filters.classId);
    }
    
    if (filters.examId) {
      query = query.eq('examId', filters.examId);
    }
    
    if (filters.session) {
      query = query.eq('session', filters.session);
    }
    
    if (filters.term) {
      query = query.eq('term', filters.term);
    }
    
    if (filters.subject) {
      query = query.eq('subject', filters.subject);
    }
    
    // Apply ordering
    if (filters.orderBy) {
      const ascending = filters.order === 'asc';
      query = query.order(filters.orderBy, { ascending });
    } else {
      query = query.order('createdAt', { ascending: false });
    }
    
    // Apply limit
    if (filters.limit) {
      query = query.limit(filters.limit);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Supabase error fetching filtered results:', error);
      return { success: false, error: error.message };
    }
    
    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Error fetching filtered results:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get student performance trends
 */
export const getStudentPerformanceTrends = async (studentId, subject = null) => {
  try {
    let query = supabase
      .from('results')
      .select('*')
      .eq('studentId', studentId)
      .order('createdAt', { ascending: true });
    
    if (subject) {
      query = query.eq('subject', subject);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Supabase error fetching performance trends:', error);
      return { success: false, error: error.message };
    }
    
    // Calculate trends
    const trends = data.map((result, index) => {
      let trend = 'stable';
      if (index > 0) {
        const previousScore = data[index - 1].totalScore;
        const currentScore = result.totalScore;
        const difference = currentScore - previousScore;
        
        if (difference > 5) trend = 'improving';
        else if (difference < -5) trend = 'declining';
      }
      
      return {
        ...result,
        trend,
        improvement: index > 0 ? result.totalScore - data[index - 1].totalScore : 0
      };
    });
    
    return { success: true, data: trends };
  } catch (error) {
    console.error('Error fetching performance trends:', error);
    return { success: false, error: error.message };
  }
};

// Export as service object for easier usage
export const resultService = {
  createOrUpdateResult,
  getResultsByStudent,
  getResultsByExam,
  getResultsByClass,
  getResultById,
  updateResult,
  deleteResult,
  calculateClassPositions,
  bulkCreateResults,
  getResultStatistics,
  getResultsByFilters,
  getStudentPerformanceTrends
};