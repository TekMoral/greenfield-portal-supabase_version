import { supabase } from '../../lib/supabaseClient';

/**
 * Teacher submits result (80% of the workflow)
 */
export const submitResult = async ({ studentId, subjectId, term, year, testScore, examScore }) => {
  try {
    const test = parseFloat(testScore) || 0;
    const exam = parseFloat(examScore) || 0;
    const totalScore = test + exam; // Teacher subtotal out of 80

    // Try RPC first. If it fails due to outdated implementation (e.g., referencing removed `score` column),
    // fall back to direct insert with the new schema.
    const rpcRes = await supabase.rpc('submit_result', {
      p_student_id: studentId,
      p_subject_id: subjectId,
      p_term: term,
      p_year: year,
      // Some RPC versions may accept component scores; include when available
      p_test_score: test,
      p_exam_score: exam,
      // Legacy RPCs may accept a consolidated score and max
      p_score: totalScore
    });

    if (!rpcRes.error) {
      return { success: true, data: rpcRes.data };
    }

    console.warn('RPC submit_result failed, applying direct insert fallback:', rpcRes.error?.message);

    const { data: insertData, error: insertErr } = await supabase
      .from('exam_results')
      .insert({
        student_id: studentId,
        subject_id: subjectId,
        term,
        year,
        test_score: test,
        exam_score: exam,
        total_score: totalScore,
        status: 'submitted',
        is_published: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (insertErr) {
      const msg = insertErr.message || 'Insert failed';
      if (msg.toLowerCase().includes('duplicate') || msg.includes('23505')) {
        return { success: false, error: 'Result already submitted for this student and subject for this term/year' };
      }
      console.error('Direct insert fallback failed:', insertErr);
      return { success: false, error: msg };
    }

    return { success: true, data: insertData };
  } catch (error) {
    console.error('Error submitting result via service:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Admin grades result (adds adminScore, totalScore, sets status: graded, published: false)
 */
export const gradeResultByAdmin = async ({ studentId, subjectId, term, year, adminScore, teacherScore }) => {
  try {
    let baseTeacherScore = Number(teacherScore);
    if (!Number.isFinite(baseTeacherScore)) {
      // Fetch current teacher subtotal from DB if not provided
      const { data: existing, error: fetchErr } = await supabase
        .from('exam_results')
        .select('test_score, exam_score')
        .eq('student_id', studentId)
        .eq('subject_id', subjectId)
        .eq('term', term)
        .eq('year', year)
        .single();
      if (fetchErr) {
        console.warn('Could not fetch existing teacher score, defaulting to 0:', fetchErr?.message);
      }
      baseTeacherScore = Number(((existing?.test_score || 0) + (existing?.exam_score || 0)) ?? 0) || 0;
    }

    const admin = parseFloat(adminScore) || 0;
    const combinedTotal = baseTeacherScore + admin;
    
    // Try RPC first (RPC-first approach). Some deployments only update admin_score.
    const { data, error } = await supabase.rpc('grade_result', {
    p_student_id: studentId,
    p_subject_id: subjectId,
    p_term: term,
    p_year: year,
    // Prefer explicit params if RPC supports them; otherwise ignore
    p_admin_score: admin,
    p_total_score: combinedTotal
    });
    
    if (error) {
    console.error('Supabase RPC error grade_result:', error);
    return { success: false, error: error.message };
    }
    
    // Ensure total_score and status are correct even if RPC only saved admin_score.
    // This may be skipped by RLS; it's a best-effort consistency pass.
    const { error: updErr } = await supabase
    .from('exam_results')
    .update({
    admin_score: admin,
    total_score: combinedTotal,
    status: 'graded',
    updated_at: new Date().toISOString()
    })
    .eq('student_id', studentId)
    .eq('subject_id', subjectId)
    .eq('term', term)
    .eq('year', year);
    
    if (updErr) {
    // Not fatal if RLS blocks direct updates; RPC may have already applied changes.
    console.warn('Post-RPC total update skipped (likely RLS):', updErr.message);
    }
    
    return { success: true, data };
  } catch (error) {
    console.error('Error grading result via RPC:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Admin publishes result (sets published: true)
 */
export const publishResult = async ({ studentId, subjectId, term, year }) => {
  try {
    const { data, error } = await supabase.rpc('publish_result', {
      p_student_id: studentId,
      p_subject_id: subjectId,
      p_term: term,
      p_year: year
    });

    if (error) {
      console.error('Supabase RPC error publish_result:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Error publishing result via RPC:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Fetch published results for a student
 */
export const getPublishedResultsByStudent = async (studentId) => {
  try {
    const { data, error } = await supabase
      .from('exam_results')
      .select('*')
      .eq('student_id', studentId)
      .eq('is_published', true)
      .order('year', { ascending: false })
      .order('term', { ascending: false });

    if (error) {
      console.error('Supabase error fetching published results:', error);
      return { success: false, error: error.message };
    }

    const mapped = (data || []).map((r) => ({
      ...r,
      id: r.id,
      studentId: r.student_id ?? r.studentId,
      subjectId: r.subject_id ?? r.subjectId,
      term: r.term,
      year: r.year,
      published: (r.is_published ?? r.published),
      createdAt: r.created_at ?? r.createdAt,
      totalScore: r.total_score ?? r.totalScore ?? ((r.test_score || 0) + (r.exam_score || 0)),
      maxScore: 100,
      testScore: r.test_score ?? r.testScore ?? null,
      examScore: r.exam_score ?? r.examScore ?? null,
      adminScore: r.admin_score ?? r.adminScore ?? null,
    }));

    return { success: true, data: mapped };
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
    let query = supabase.from('exam_results').select('*');
    
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
      // DB uses snake_case column names
      query = query.eq('subject_id', filters.subjectId);
    }

    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;

    if (error) {
      console.error('Supabase error fetching submitted results:', error);
      return { success: false, error: error.message };
    }

    // Normalize snake_case -> camelCase for UI and provide score fallbacks
    const mapped = (data || []).map((r) => {
      const teacherSubtotal = (r.test_score || 0) + (r.exam_score || 0);
      // Before admin grading, total_score stores teacher subtotal (out of 80). After grading, it's final (out of 100).
      const total = r.total_score ?? r.totalScore ?? teacherSubtotal;
      const hasAdmin = (r.admin_score ?? r.adminScore) != null;
      const max = hasAdmin ? 100 : 80;
      return {
        ...r,
        id: r.id,
        studentId: r.student_id ?? r.studentId,
        subjectId: r.subject_id ?? r.subjectId,
        term: r.term,
        year: r.year,
        status: r.status,
        createdAt: r.created_at ?? r.createdAt,
        totalScore: total,
        maxScore: max,
        testScore: r.test_score ?? r.testScore ?? null,
        examScore: r.exam_score ?? r.examScore ?? null,
        adminScore: r.admin_score ?? r.adminScore ?? null
      };
    });

    return { success: true, data: mapped };
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
      .from('exam_results')
      .select('*')
      .eq('student_id', studentId)
      .eq('is_published', true)
      .order('year', { ascending: false })
      .order('term', { ascending: false });

    if (error) {
      console.error('Supabase error fetching student exam results:', error);
      return { success: false, error: error.message };
    }

    // Normalize snake_case -> camelCase and enrich with grades
    const mapped = (data || []).map((r) => {
      const total = r.total_score ?? r.totalScore ?? ((r.test_score || 0) + (r.exam_score || 0));
      const hasAdmin = (r.admin_score ?? r.adminScore) != null;
      const max = hasAdmin ? 100 : 80;
      const gradeInfo = calculateGrade(total, max);
      return {
        ...r,
        id: r.id,
        studentId: r.student_id ?? r.studentId,
        subjectId: r.subject_id ?? r.subjectId,
        term: r.term,
        year: r.year,
        published: (r.is_published ?? r.published),
        createdAt: r.created_at ?? r.createdAt,
        totalScore: total,
        maxScore: max,
        testScore: r.test_score ?? r.testScore ?? null,
        examScore: r.exam_score ?? r.examScore ?? null,
        adminScore: r.admin_score ?? r.adminScore ?? null,
        ...gradeInfo,
      };
    });

    return { success: true, data: mapped };
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
      .from('exam_results')
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
    const normalizedTotal = Math.max(
      Number(data.total_score ?? 0),
      Number(((data.test_score || 0) + (data.exam_score || 0))) + Number(data.admin_score ?? 0)
    );
    const gradeInfo = calculateGrade(normalizedTotal, 100);
    const enrichedResult = {
      ...data,
      totalScore: normalizedTotal,
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
      .from('exam_results')
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
      .from('exam_results')
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
    let query = supabase.from('exam_results').select('status, total_score, is_published');

    if (filters.term) {
      query = query.eq('term', filters.term);
    }

    if (filters.year) {
      query = query.eq('year', filters.year);
    }

    if (filters.subjectId) {
      query = query.eq('subject_id', filters.subjectId);
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
      published: data.filter(r => (r.is_published === true || r.published === true)).length,
      averageScore: 0,
      gradeDistribution: { A: 0, B: 0, C: 0, D: 0, F: 0 }
    };

    // Calculate average score and grade distribution for graded results
    const gradedResults = data.filter(r => r.status === 'graded' && (r.total_score != null));
    
    if (gradedResults.length > 0) {
      const totalScoreSum = gradedResults.reduce((sum, r) => sum + (r.total_score ?? 0), 0);
      const avg = totalScoreSum / gradedResults.length;
      stats.averageScore = Math.round(avg * 100) / 100;

      gradedResults.forEach(result => {
        const normalizedTotal = result.total_score ?? 0;
        const gradeInfo = calculateGrade(normalizedTotal);
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

// New bulk insert via RPC for teacher exam results
export const insertExamResultsBulk = async ({ results, subjectId, term, year, teacherId, status = 'submitted' }) => {
  try {
    const payload = (results || []).map(r => {
      const item = {
        student_id: r.studentId,
        subject_id: subjectId,
        term: r.term ?? term,
        year: parseInt(r.session ?? year, 10),
        teacher_id: teacherId,
        status: status,
        total_score: (parseFloat(r.examScore) || 0) + (parseFloat(r.testScore) || 0),
        test_score: parseFloat(r.testScore) || 0,
        exam_score: parseFloat(r.examScore) || 0,
        admin_score: parseFloat(r.adminScore ?? 0) || 0
      };
      return item;
    });

    const { error } = await supabase.rpc('insert_exam_results_bulk', { p_results: payload });
    if (error) {
      console.error('Supabase RPC error insert_exam_results_bulk:', error);
      return { success: false, error: error.message };
    }
    return { success: true, data: { inserted: payload.length } };
  } catch (err) {
    console.error('Error bulk inserting exam results:', err);
    return { success: false, error: err.message };
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
  bulkPublishResults,
  insertExamResultsBulk
};