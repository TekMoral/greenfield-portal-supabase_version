import { supabase } from '../../lib/supabaseClient';

/**
 * Get detailed student information by ID
 */
export const getStudentDetails = async (studentId) => {
  try {
    // Get student profile data
    const { data: studentData, error: studentError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', studentId)
      .eq('role', 'student')
      .single();

    if (studentError) {
      console.error('Supabase error fetching student:', studentError);
      return { success: false, error: 'Student not found' };
    }
    
    // Get class information if student has a class
    let classInfo = null;
    if (studentData.classId) {
      const { data: classData, error: classError } = await supabase
        .from('classes')
        .select('*')
        .eq('id', studentData.classId)
        .single();

      if (!classError && classData) {
        classInfo = {
          id: classData.id,
          name: classData.name,
          level: classData.level,
          category: classData.category,
          subjects: classData.subjects || []
        };
      }
    }
    
    const enrichedStudent = {
      ...studentData,
      classInfo
    };
    
    return { success: true, data: enrichedStudent };
  } catch (error) {
    console.error('Error fetching student details:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Update student information
 */
export const updateStudentInfo = async (studentId, updateData) => {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .update({
        ...updateData,
        updated_at: new Date().toISOString()
      })
      .eq('id', studentId)
      .eq('role', 'student')
      .select()
      .single();

    if (error) {
      console.error('Supabase error updating student:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Error updating student:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get student's assignment submissions for a specific subject
 */
export const getStudentAssignments = async (studentId, subjectName) => {
  try {
    // Get assignments for the subject
    const { data: assignments, error: assignmentsError } = await supabase
      .from('assignments')
      .select('*')
      .eq('subjectName', subjectName);

    if (assignmentsError) {
      console.error('Supabase error fetching assignments:', assignmentsError);
      return { success: false, error: assignmentsError.message };
    }
    
    // Process assignments to include student submission status
    const processedAssignments = assignments.map(assignment => {
      // Find student's submission
      const submission = assignment.submissions?.find(
        sub => sub.studentId === studentId
      );
      
      return {
        ...assignment,
        studentSubmission: submission || null,
        submissionStatus: submission ? submission.status : 'not_submitted'
      };
    });
    
    return { success: true, data: processedAssignments };
  } catch (error) {
    console.error('Error fetching student assignments:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get student's grades for a specific subject
 */
export const getStudentGrades = async (studentId, subjectName) => {
  try {
    // Get grades for the student and subject
    const { data: grades, error: gradesError } = await supabase
      .from('grades')
      .select('*')
      .eq('studentId', studentId)
      .eq('subjectName', subjectName)
      .order('createdAt', { ascending: false });

    if (gradesError) {
      console.error('Supabase error fetching grades:', gradesError);
      return { success: false, error: gradesError.message };
    }
    
    // Process grades data
    const processedGrades = grades.map(grade => ({
      assignmentId: grade.assignmentId,
      assignmentTitle: grade.assignmentId ? `Assignment ${grade.assignmentId}` : 'Manual Grade',
      maxPoints: grade.maxPoints,
      grade: grade.grade,
      percentage: grade.percentage,
      gradedAt: grade.createdAt,
      feedback: grade.feedback,
      gradeType: grade.gradeType
    }));
    
    // Calculate overall grade
    if (processedGrades.length > 0) {
      const totalPoints = processedGrades.reduce((sum, grade) => sum + grade.grade, 0);
      const totalMaxPoints = processedGrades.reduce((sum, grade) => sum + grade.maxPoints, 0);
      const overallPercentage = Math.round((totalPoints / totalMaxPoints) * 100);
      
      return {
        success: true,
        data: {
          grades: processedGrades,
          summary: {
            totalAssignments: processedGrades.length,
            totalPoints,
            totalMaxPoints,
            overallPercentage,
            letterGrade: getLetterGrade(overallPercentage)
          }
        }
      };
    }
    
    return { 
      success: true, 
      data: { 
        grades: [], 
        summary: null 
      } 
    };
  } catch (error) {
    console.error('Error fetching student grades:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Convert percentage to letter grade
 */
const getLetterGrade = (percentage) => {
  if (percentage >= 90) return 'A';
  if (percentage >= 80) return 'B';
  if (percentage >= 70) return 'C';
  if (percentage >= 60) return 'D';
  return 'F';
};

/**
 * Get class statistics for a teacher's subject
 */
export const getClassStatistics = async (teacherId, subjectName, classId) => {
  try {
    // Get all students in the class taking this subject
    const { data: students, error: studentsError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('role', 'student')
      .eq('classId', classId);

    if (studentsError) {
      console.error('Supabase error fetching students:', studentsError);
      return { success: false, error: studentsError.message };
    }
    
    // Get assignments for this subject and teacher
    const { data: assignments, error: assignmentsError } = await supabase
      .from('assignments')
      .select('*')
      .eq('teacherId', teacherId)
      .eq('subjectName', subjectName)
      .contains('targetClasses', [classId]);

    if (assignmentsError) {
      console.error('Supabase error fetching assignments:', assignmentsError);
      return { success: false, error: assignmentsError.message };
    }
    
    // Calculate statistics
    const stats = {
      totalStudents: students.length,
      totalAssignments: assignments.length,
      submissionStats: {
        submitted: 0,
        pending: 0,
        graded: 0
      },
      gradeDistribution: {
        A: 0, B: 0, C: 0, D: 0, F: 0
      }
    };
    
    // Calculate submission and grade statistics
    assignments.forEach(assignment => {
      assignment.submissions?.forEach(submission => {
        if (students.some(student => student.id === submission.studentId)) {
          stats.submissionStats.submitted++;
          
          if (submission.status === 'graded') {
            stats.submissionStats.graded++;
            
            if (submission.grade !== undefined) {
              const percentage = Math.round((submission.grade / assignment.maxPoints) * 100);
              const letterGrade = getLetterGrade(percentage);
              stats.gradeDistribution[letterGrade]++;
            }
          }
        }
      });
    });
    
    stats.submissionStats.pending = (stats.totalAssignments * stats.totalStudents) - stats.submissionStats.submitted;
    
    return { success: true, data: stats };
  } catch (error) {
    console.error('Error fetching class statistics:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get student performance summary
 */
export const getStudentPerformanceSummary = async (studentId) => {
  try {
    // Get student details
    const studentResult = await getStudentDetails(studentId);
    if (!studentResult.success) {
      return studentResult;
    }
    
    const student = studentResult.data;
    
    // Get all grades for the student
    const { data: grades, error: gradesError } = await supabase
      .from('grades')
      .select('*')
      .eq('studentId', studentId)
      .order('createdAt', { ascending: false });

    if (gradesError) {
      console.error('Supabase error fetching student grades:', gradesError);
      return { success: false, error: gradesError.message };
    }
    
    // Get all assignments for the student
    const assignmentsResult = await getStudentAssignments(studentId, null); // Get all subjects
    
    // Calculate performance metrics
    const subjectPerformance = {};
    const overallStats = {
      totalGrades: grades.length,
      averagePercentage: 0,
      totalAssignments: 0,
      submittedAssignments: 0,
      gradedAssignments: 0
    };
    
    // Group grades by subject
    grades.forEach(grade => {
      if (!subjectPerformance[grade.subjectName]) {
        subjectPerformance[grade.subjectName] = {
          grades: [],
          totalPoints: 0,
          maxPoints: 0,
          averagePercentage: 0
        };
      }
      
      subjectPerformance[grade.subjectName].grades.push(grade);
      subjectPerformance[grade.subjectName].totalPoints += grade.grade;
      subjectPerformance[grade.subjectName].maxPoints += grade.maxPoints;
    });
    
    // Calculate averages for each subject
    Object.keys(subjectPerformance).forEach(subject => {
      const subjectData = subjectPerformance[subject];
      subjectData.averagePercentage = Math.round(
        (subjectData.totalPoints / subjectData.maxPoints) * 100
      );
    });
    
    // Calculate overall average
    if (grades.length > 0) {
      const totalPoints = grades.reduce((sum, grade) => sum + grade.grade, 0);
      const totalMaxPoints = grades.reduce((sum, grade) => sum + grade.maxPoints, 0);
      overallStats.averagePercentage = Math.round((totalPoints / totalMaxPoints) * 100);
    }
    
    return {
      success: true,
      data: {
        student,
        overallStats,
        subjectPerformance,
        recentGrades: grades.slice(0, 10), // Last 10 grades
        letterGrade: getLetterGrade(overallStats.averagePercentage)
      }
    };
  } catch (error) {
    console.error('Error fetching student performance summary:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get student attendance summary
 */
export const getStudentAttendanceSummary = async (studentId, startDate = null, endDate = null) => {
  try {
    let query = supabase
      .from('attendance')
      .select('*')
      .eq('studentId', studentId);
    
    if (startDate) {
      query = query.gte('date', startDate);
    }
    
    if (endDate) {
      query = query.lte('date', endDate);
    }
    
    const { data: attendanceRecords, error } = await query.order('date', { ascending: false });

    if (error) {
      console.error('Supabase error fetching attendance:', error);
      return { success: false, error: error.message };
    }
    
    const summary = {
      totalDays: attendanceRecords.length,
      presentDays: attendanceRecords.filter(record => record.status === 'present').length,
      absentDays: attendanceRecords.filter(record => record.status === 'absent').length,
      attendancePercentage: 0,
      recentAttendance: attendanceRecords.slice(0, 10)
    };
    
    if (summary.totalDays > 0) {
      summary.attendancePercentage = Math.round(
        (summary.presentDays / summary.totalDays) * 100
      );
    }
    
    return { success: true, data: summary };
  } catch (error) {
    console.error('Error fetching student attendance summary:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Send message/notification to student
 */
export const sendMessageToStudent = async (studentId, message, type = 'general', senderId = null) => {
  try {
    // Create a notification/message record
    const messageData = {
      recipient_id: studentId,
      sender_id: senderId,
      message: message,
      type: type,
      status: 'unread',
      created_at: new Date().toISOString()
    };
    
    const { data, error } = await supabase
      .from('notifications')
      .insert(messageData)
      .select()
      .single();

    if (error) {
      console.error('Supabase error sending message:', error);
      return { success: false, error: error.message };
    }
    
    // TODO: In a real implementation, this might also:
    // 1. Send an email notification
    // 2. Send a push notification
    // 3. Create an in-app notification
    
    return { 
      success: true, 
      data,
      message: 'Message sent successfully' 
    };
  } catch (error) {
    console.error('Error sending message to student:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get student messages/notifications
 */
export const getStudentMessages = async (studentId, limit = 20) => {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('recipient_id', studentId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Supabase error fetching messages:', error);
      return { success: false, error: error.message };
    }
    
    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Error fetching student messages:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Mark message as read
 */
export const markMessageAsRead = async (messageId) => {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .update({ 
        status: 'read',
        read_at: new Date().toISOString()
      })
      .eq('id', messageId)
      .select()
      .single();

    if (error) {
      console.error('Supabase error marking message as read:', error);
      return { success: false, error: error.message };
    }
    
    return { success: true, data };
  } catch (error) {
    console.error('Error marking message as read:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get students by multiple filters
 */
export const getStudentsByFilters = async (filters = {}) => {
  try {
    let query = supabase
      .from('user_profiles')
      .select('*')
      .eq('role', 'student');
    
    // Apply filters
    if (filters.classId) {
      query = query.eq('classId', filters.classId);
    }
    
    if (filters.level) {
      // This would require joining with classes table
      const { data: classes, error: classError } = await supabase
        .from('classes')
        .select('id')
        .eq('level', filters.level);
      
      if (!classError && classes.length > 0) {
        const classIds = classes.map(cls => cls.id);
        query = query.in('classId', classIds);
      }
    }
    
    if (filters.category) {
      // This would require joining with classes table
      const { data: classes, error: classError } = await supabase
        .from('classes')
        .select('id')
        .eq('category', filters.category);
      
      if (!classError && classes.length > 0) {
        const classIds = classes.map(cls => cls.id);
        query = query.in('classId', classIds);
      }
    }
    
    if (filters.search) {
      query = query.or(`full_name.ilike.%${filters.search}%,email.ilike.%${filters.search}%,admission_number.ilike.%${filters.search}%`);
    }
    
    // Apply ordering
    if (filters.orderBy) {
      const ascending = filters.order === 'asc';
      query = query.order(filters.orderBy, { ascending });
    } else {
      query = query.order('created_at', { ascending: false });
    }
    
    // Apply limit
    if (filters.limit) {
      query = query.limit(filters.limit);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Supabase error fetching filtered students:', error);
      return { success: false, error: error.message };
    }
    
    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Error fetching filtered students:', error);
    return { success: false, error: error.message };
  }
};

// Export as service object for easier usage
export const studentManagementService = {
  getStudentDetails,
  updateStudentInfo,
  getStudentAssignments,
  getStudentGrades,
  getClassStatistics,
  getStudentPerformanceSummary,
  getStudentAttendanceSummary,
  sendMessageToStudent,
  getStudentMessages,
  markMessageAsRead,
  getStudentsByFilters
};