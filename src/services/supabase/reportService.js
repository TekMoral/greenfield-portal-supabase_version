import { supabase } from '../../lib/supabaseClient';

/**
 * Submit a report from teacher to admin
 */
export const submitReport = async (reportData) => {
  try {
    const report = {
      ...reportData,
      submittedAt: new Date().toISOString(),
      status: 'submitted',
      academicYear: reportData.academicYear || new Date().getFullYear(),
      term: reportData.term || 1, // 1, 2, or 3
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('student_reports')
      .insert(report)
      .select()
      .single();

    if (error) {
      console.error('Supabase error submitting report:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Error submitting report:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Submit multiple reports in bulk
 */
export const submitBulkReports = async (reportsData) => {
  try {
    const results = [];
    const errors = [];

    // Process reports in batches to avoid overwhelming Supabase
    const batchSize = 10;
    for (let i = 0; i < reportsData.length; i += batchSize) {
      const batch = reportsData.slice(i, i + batchSize);

      const batchPromises = batch.map(async (reportData) => {
        try {
          // Check if report already exists
          const reportCheck = await checkReportExists(
            reportData.studentId,
            reportData.subjectName,
            reportData.term,
            reportData.academicYear,
            reportData.teacherId
          );

          if (reportCheck.success && reportCheck.data.exists && !reportCheck.data.canResubmit) {
            return {
              success: false,
              studentName: reportData.studentName,
              error: 'Report already exists for this student, subject, term, and academic year'
            };
          }

          const report = {
            ...reportData,
            submittedAt: new Date().toISOString(),
            status: 'submitted',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };

          const { data, error } = await supabase
            .from('student_reports')
            .insert(report)
            .select()
            .single();

          if (error) {
            return {
              success: false,
              studentName: reportData.studentName,
              error: error.message
            };
          }

          return {
            success: true,
            studentName: reportData.studentName,
            reportId: data.id
          };
        } catch (error) {
          return {
            success: false,
            studentName: reportData.studentName,
            error: error.message
          };
        }
      });

      const batchResults = await Promise.all(batchPromises);

      batchResults.forEach(result => {
        if (result.success) {
          results.push(result);
        } else {
          errors.push(result);
        }
      });
    }

    return {
      success: true,
      data: {
        successful: results,
        failed: errors,
        totalSubmitted: results.length,
        totalFailed: errors.length
      }
    };
  } catch (error) {
    console.error('Error submitting bulk reports:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get all reports for admin view
 */
export const getAllReports = async (filters = {}) => {
  try {
    let query = supabase
      .from('student_reports')
      .select('*')
      .order('submittedAt', { ascending: false });

    // Apply filters
    if (filters.academicYear) {
      query = query.eq('academicYear', filters.academicYear);
    }
    if (filters.term) {
      query = query.eq('term', filters.term);
    }
    if (filters.subjectName) {
      query = query.eq('subjectName', filters.subjectName);
    }
    if (filters.className) {
      query = query.eq('className', filters.className);
    }
    if (filters.teacherId) {
      query = query.eq('teacherId', filters.teacherId);
    }
    if (filters.status) {
      query = query.eq('status', filters.status);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Supabase error fetching reports:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Error fetching reports:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get reports for a specific student
 */
export const getStudentReports = async (studentId, filters = {}) => {
  try {
    let query = supabase
      .from('student_reports')
      .select('*')
      .eq('studentId', studentId)
      .order('academicYear', { ascending: false })
      .order('term', { ascending: false });

    // Apply additional filters
    if (filters.academicYear) {
      query = query.eq('academicYear', filters.academicYear);
    }
    if (filters.term) {
      query = query.eq('term', filters.term);
    }
    if (filters.subjectName) {
      query = query.eq('subjectName', filters.subjectName);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Supabase error fetching student reports:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Error fetching student reports:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get reports by subject
 */
export const getReportsBySubject = async (subjectName, filters = {}) => {
  try {
    let query = supabase
      .from('student_reports')
      .select('*')
      .eq('subjectName', subjectName)
      .order('submittedAt', { ascending: false });

    // Apply additional filters
    if (filters.academicYear) {
      query = query.eq('academicYear', filters.academicYear);
    }
    if (filters.term) {
      query = query.eq('term', filters.term);
    }
    if (filters.className) {
      query = query.eq('className', filters.className);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Supabase error fetching reports by subject:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Error fetching reports by subject:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get reports by teacher
 */
export const getReportsByTeacher = async (teacherId, filters = {}) => {
  try {
    let query = supabase
      .from('student_reports')
      .select('*')
      .eq('teacherId', teacherId)
      .order('submittedAt', { ascending: false });

    // Apply additional filters
    if (filters.academicYear) {
      query = query.eq('academicYear', filters.academicYear);
    }
    if (filters.term) {
      query = query.eq('term', filters.term);
    }
    if (filters.subjectName) {
      query = query.eq('subjectName', filters.subjectName);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Supabase error fetching reports by teacher:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Error fetching reports by teacher:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Update report status (for admin actions)
 */
export const updateReportStatus = async (reportId, status, adminNotes = '') => {
  try {
    const { data, error } = await supabase
      .from('student_reports')
      .update({
        status,
        adminNotes,
        reviewedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })
      .eq('id', reportId)
      .select()
      .single();

    if (error) {
      console.error('Supabase error updating report status:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Error updating report status:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Delete a report
 */
export const deleteReport = async (reportId) => {
  try {
    const { error } = await supabase
      .from('student_reports')
      .delete()
      .eq('id', reportId);

    if (error) {
      console.error('Supabase error deleting report:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Error deleting report:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get unique academic years from reports
 */
export const getAcademicYears = async () => {
  try {
    const { data, error } = await supabase
      .from('student_reports')
      .select('academicYear')
      .not('academicYear', 'is', null);

    if (error) {
      console.error('Supabase error fetching academic years:', error);
      return { success: false, error: error.message };
    }

    const years = [...new Set(data.map(item => item.academicYear))];
    years.sort((a, b) => b - a); // Sort descending

    return { success: true, data: years.length > 0 ? years : [new Date().getFullYear()] };
  } catch (error) {
    console.error('Error fetching academic years:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Update remarks for a rejected report
 */
export const updateReportRemarks = async (reportId, remarks) => {
  try {
    const { data, error } = await supabase
      .from('student_reports')
      .update({
        remarks,
        status: 'resubmitted',
        submittedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })
      .eq('id', reportId)
      .select()
      .single();

    if (error) {
      console.error('Supabase error updating report remarks:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Error updating report remarks:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Resubmit a rejected report (legacy - use updateReportRemarks instead)
 */
export const resubmitReport = async (reportId, updatedData) => {
  try {
    const { data, error } = await supabase
      .from('student_reports')
      .update({
        remarks: updatedData.remarks || '',
        status: 'resubmitted',
        submittedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })
      .eq('id', reportId)
      .select()
      .single();

    if (error) {
      console.error('Supabase error resubmitting report:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Error resubmitting report:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get unique subjects from reports
 */
export const getReportSubjects = async () => {
  try {
    const { data, error } = await supabase
      .from('student_reports')
      .select('subjectName')
      .not('subjectName', 'is', null);

    if (error) {
      console.error('Supabase error fetching report subjects:', error);
      return { success: false, error: error.message };
    }

    const subjects = [...new Set(data.map(item => item.subjectName))];
    subjects.sort();

    return { success: true, data: subjects };
  } catch (error) {
    console.error('Error fetching report subjects:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get unique classes from reports
 */
export const getReportClasses = async () => {
  try {
    const { data, error } = await supabase
      .from('student_reports')
      .select('className')
      .not('className', 'is', null);

    if (error) {
      console.error('Supabase error fetching report classes:', error);
      return { success: false, error: error.message };
    }

    const classes = [...new Set(data.map(item => item.className))];
    classes.sort();

    return { success: true, data: classes };
  } catch (error) {
    console.error('Error fetching report classes:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Check if report already exists for student, subject, term, and year
 */
export const checkReportExists = async (studentId, subjectName, term, academicYear, teacherId) => {
  try {
    const { data, error } = await supabase
      .from('student_reports')
      .select('*')
      .eq('studentId', studentId)
      .eq('subjectName', subjectName)
      .eq('term', term)
      .eq('academicYear', academicYear)
      .eq('teacherId', teacherId)
      .limit(1);

    if (error) {
      console.error('Supabase error checking report existence:', error);
      if (error.code === 'PGRST301') { // Permission denied
        console.warn('Permission denied when checking report existence - proceeding with submission');
        return { success: true, data: { exists: false } };
      }
      return { success: false, error: error.message };
    }

    if (!data || data.length === 0) {
      return { success: true, data: { exists: false } };
    }

    const existingReport = data[0];

    // If report exists and is rejected, allow resubmission
    if (existingReport.status === 'rejected') {
      return {
        success: true,
        data: {
          exists: true,
          canResubmit: true,
          reportId: existingReport.id,
          reportData: existingReport
        }
      };
    }

    // Report exists and is not rejected - block submission
    return {
      success: true,
      data: {
        exists: true,
        canResubmit: false,
        reportId: existingReport.id,
        reportData: existingReport
      }
    };
  } catch (error) {
    console.error('Error checking report existence:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get report statistics
 */
export const getReportStatistics = async (filters = {}) => {
  try {
    let query = supabase.from('student_reports').select('status, academicYear, term');

    // Apply filters
    if (filters.academicYear) {
      query = query.eq('academicYear', filters.academicYear);
    }
    if (filters.term) {
      query = query.eq('term', filters.term);
    }
    if (filters.teacherId) {
      query = query.eq('teacherId', filters.teacherId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Supabase error fetching report statistics:', error);
      return { success: false, error: error.message };
    }

    const stats = {
      total: data.length,
      submitted: data.filter(r => r.status === 'submitted').length,
      approved: data.filter(r => r.status === 'approved').length,
      rejected: data.filter(r => r.status === 'rejected').length,
      resubmitted: data.filter(r => r.status === 'resubmitted').length,
      byTerm: {},
      byYear: {}
    };

    // Group by term
    data.forEach(report => {
      if (!stats.byTerm[report.term]) {
        stats.byTerm[report.term] = 0;
      }
      stats.byTerm[report.term]++;
    });

    // Group by year
    data.forEach(report => {
      if (!stats.byYear[report.academicYear]) {
        stats.byYear[report.academicYear] = 0;
      }
      stats.byYear[report.academicYear]++;
    });

    return { success: true, data: stats };
  } catch (error) {
    console.error('Error fetching report statistics:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Real-time subscription for teacher reports
 */
export const subscribeToTeacherReports = (teacherId, callback) => {
  const subscription = supabase
    .channel('teacher_reports')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'student_reports',
        filter: `teacherId=eq.${teacherId}`
      },
      (payload) => {
        callback(payload);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(subscription);
  };
};

// Export as service object for easier usage
export const reportService = {
  submitReport,
  submitBulkReports,
  getAllReports,
  getStudentReports,
  getReportsBySubject,
  getReportsByTeacher,
  updateReportStatus,
  deleteReport,
  getAcademicYears,
  updateReportRemarks,
  resubmitReport,
  getReportSubjects,
  getReportClasses,
  checkReportExists,
  getReportStatistics,
  subscribeToTeacherReports
};