import { supabase } from '../../lib/supabaseClient';

// Dashboard Service using Supabase with unified user_profiles table
export const dashboardService = {
  // Get admin dashboard statistics
  async getAdminDashboardStats() {
    try {
      console.log('🔄 Fetching admin dashboard stats...');
      
      // Get basic counts from existing tables
      const [
        { count: totalStudents },
        { count: totalTeachers },
        { count: totalClasses }
      ] = await Promise.all([
        supabase.from('user_profiles').select('*', { count: 'exact', head: true })
          .eq('role', 'student').eq('is_active', true),
        supabase.from('user_profiles').select('*', { count: 'exact', head: true })
          .eq('role', 'teacher').eq('is_active', true),
        supabase.from('classes').select('*', { count: 'exact', head: true })
      ]);

      // Try to get optional counts (these tables might not exist yet)
      let totalSubjects = 0;
      let totalExams = 0;
      
      try {
        const { count: subjectCount } = await supabase
          .from('subjects')
          .select('*', { count: 'exact', head: true });
        totalSubjects = subjectCount || 0;
      } catch (error) {
        console.log('ℹ️ Subjects table not found, skipping...');
      }

      try {
        const { count: examCount } = await supabase
          .from('exams')
          .select('*', { count: 'exact', head: true });
        totalExams = examCount || 0;
      } catch (error) {
        console.log('ℹ️ Exams table not found, skipping...');
      }

      // Get monthly stats (new students/teachers this month)
      const currentMonth = new Date();
      const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
      
      const [
        { count: newStudentsThisMonth },
        { count: newTeachersThisMonth }
      ] = await Promise.all([
        supabase.from('user_profiles').select('*', { count: 'exact', head: true })
          .eq('role', 'student').eq('is_active', true)
          .gte('created_at', firstDayOfMonth.toISOString()),
        supabase.from('user_profiles').select('*', { count: 'exact', head: true })
          .eq('role', 'teacher').eq('is_active', true)
          .gte('created_at', firstDayOfMonth.toISOString())
      ]);

      // Try to get exams ending this week (optional)
      let examsEndingThisWeek = 0;
      try {
        const today = new Date();
        const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
        
        const { count } = await supabase
          .from('exams')
          .select('*', { count: 'exact', head: true })
          .gte('exam_date', today.toISOString().split('T')[0])
          .lte('exam_date', nextWeek.toISOString().split('T')[0]);
        
        examsEndingThisWeek = count || 0;
      } catch (error) {
        console.log('ℹ️ Could not fetch upcoming exams, table might not exist');
      }

      // Try to get recent activities (optional)
      let recentActivities = [];
      let upcomingExams = [];

      try {
        const { data } = await supabase
          .from('exams')
          .select(`
            id,
            title,
            exam_date,
            created_at
          `)
          .order('created_at', { ascending: false })
          .limit(5);
        
        recentActivities = data || [];
      } catch (error) {
        console.log('ℹ️ Could not fetch recent activities');
      }

      try {
        const { data } = await supabase
          .from('exams')
          .select(`
            id,
            title,
            exam_date
          `)
          .gte('exam_date', new Date().toISOString().split('T')[0])
          .order('exam_date', { ascending: true })
          .limit(5);
        
        upcomingExams = data || [];
      } catch (error) {
        console.log('ℹ️ Could not fetch upcoming exams');
      }

      console.log('✅ Admin dashboard stats fetched successfully');

      return {
        success: true,
        data: {
          overview: {
            totalStudents: totalStudents || 0,
            totalTeachers: totalTeachers || 0,
            totalClasses: totalClasses || 0,
            totalSubjects: totalSubjects,
            totalExams: totalExams,
            newStudentsThisMonth: newStudentsThisMonth || 0,
            newTeachersThisMonth: newTeachersThisMonth || 0,
            examsEndingThisWeek: examsEndingThisWeek
          },
          recentActivities: recentActivities,
          upcomingExams: upcomingExams
        }
      };
    } catch (error) {
      console.error('❌ Error fetching admin dashboard stats:', error);
      return { success: false, error: error.message };
    }
  },

  // Get teacher dashboard statistics
  async getTeacherDashboardStats(teacherId) {
    try {
      console.log('🔄 Fetching teacher dashboard stats for:', teacherId);
      
      // Get teacher info
      const { data: teacher } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', teacherId)
        .eq('role', 'teacher')
        .single();

      if (!teacher) {
        throw new Error('Teacher not found');
      }

      // Try to get teacher assignments (optional table)
      let teacherAssignments = [];
      let uniqueClasses = [];
      let uniqueSubjects = [];
      let totalStudents = 0;

      try {
        const { data } = await supabase
          .from('teacher_assignments')
          .select(`
            class_id,
            subject_id
          `)
          .eq('teacher_id', teacherId)
          .eq('is_active', true);

        teacherAssignments = data || [];
        uniqueClasses = [...new Set(teacherAssignments.map(ta => ta.class_id))];
        uniqueSubjects = [...new Set(teacherAssignments.map(ta => ta.subject_id))];

        // Get total students across all classes
        if (uniqueClasses.length > 0) {
          const { count } = await supabase
            .from('user_profiles')
            .select('*', { count: 'exact', head: true })
            .in('class_id', uniqueClasses)
            .eq('role', 'student')
            .eq('is_active', true);
          totalStudents = count || 0;
        }
      } catch (error) {
        console.log('ℹ️ Teacher assignments table not found, using basic stats');
      }

      // Try to get teacher's exams (optional)
      let totalExams = 0;
      let upcomingExams = [];

      try {
        const { count } = await supabase
          .from('exams')
          .select('*', { count: 'exact', head: true })
          .eq('teacher_id', teacherId);
        totalExams = count || 0;

        const { data } = await supabase
          .from('exams')
          .select(`
            id,
            title,
            exam_date
          `)
          .eq('teacher_id', teacherId)
          .gte('exam_date', new Date().toISOString().split('T')[0])
          .order('exam_date', { ascending: true })
          .limit(5);
        
        upcomingExams = data || [];
      } catch (error) {
        console.log('ℹ️ Exams table not found for teacher stats');
      }

      console.log('✅ Teacher dashboard stats fetched successfully');

      return {
        success: true,
        data: {
          teacher,
          overview: {
            totalClasses: uniqueClasses.length,
            totalSubjects: uniqueSubjects.length,
            totalStudents,
            totalExams
          },
          upcomingExams,
          teacherAssignments
        }
      };
    } catch (error) {
      console.error('❌ Error fetching teacher dashboard stats:', error);
      return { success: false, error: error.message };
    }
  },

  // Get student dashboard statistics
  async getStudentDashboardStats(studentId) {
    try {
      console.log('🔄 Fetching student dashboard stats for:', studentId);
      
      // Get student info from user_profiles
      const { data: student } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', studentId)
        .eq('role', 'student')
        .single();

      if (!student) {
        throw new Error('Student not found');
      }

      // Get class info if student has class_id
      let studentClass = null;
      if (student.class_id) {
        const { data: classData } = await supabase
          .from('classes')
          .select('*')
          .eq('id', student.class_id)
          .single();
        studentClass = classData;
      }

      // Try to get subjects for student's class (optional)
      let classSubjects = [];
      try {
        if (student.class_id) {
          const { data } = await supabase
            .from('teacher_assignments')
            .select(`
              subjects (
                id,
                name,
                code
              )
            `)
            .eq('class_id', student.class_id)
            .eq('is_active', true);
          
          classSubjects = data || [];
        }
      } catch (error) {
        console.log('ℹ️ Could not fetch class subjects');
      }

      // Try to get student's exam results (optional)
      let examResults = [];
      let averageScore = 0;
      try {
        const { data } = await supabase
          .from('exam_results')
          .select(`
            score,
            max_score,
            grade,
            exams (
              title,
              exam_date,
              exam_type
            )
          `)
          .eq('student_id', studentId)
          .order('created_at', { ascending: false })
          .limit(5);

        examResults = data || [];

        // Calculate average score
        const scores = examResults.map(result => (result.score / result.max_score) * 100);
        averageScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
      } catch (error) {
        console.log('ℹ️ Could not fetch exam results');
      }

      // Try to get upcoming exams for student's class (optional)
      let upcomingExams = [];
      try {
        if (student.class_id) {
          const { data } = await supabase
            .from('exams')
            .select(`
              id,
              title,
              exam_date,
              exam_type
            `)
            .eq('class_id', student.class_id)
            .gte('exam_date', new Date().toISOString().split('T')[0])
            .order('exam_date', { ascending: true })
            .limit(5);
          
          upcomingExams = data || [];
        }
      } catch (error) {
        console.log('ℹ️ Could not fetch upcoming exams for student');
      }

      console.log('✅ Student dashboard stats fetched successfully');

      return {
        success: true,
        data: {
          student: {
            ...student,
            classes: studentClass
          },
          overview: {
            totalSubjects: classSubjects.length,
            totalExams: examResults.length,
            averageScore: Math.round(averageScore * 100) / 100,
            upcomingExams: upcomingExams.length
          },
          recentResults: examResults,
          upcomingExams,
          subjects: classSubjects
        }
      };
    } catch (error) {
      console.error('❌ Error fetching student dashboard stats:', error);
      return { success: false, error: error.message };
    }
  },

  // Get basic system health check
  async getSystemHealth() {
    try {
      console.log('🔄 Checking system health...');
      
      // Test basic table access
      const tests = [];
      
      // Test user_profiles table
      try {
        await supabase.from('user_profiles').select('id').limit(1);
        tests.push({ table: 'user_profiles', status: 'healthy' });
      } catch (error) {
        tests.push({ table: 'user_profiles', status: 'error', error: error.message });
      }

      // Test classes table
      try {
        await supabase.from('classes').select('id').limit(1);
        tests.push({ table: 'classes', status: 'healthy' });
      } catch (error) {
        tests.push({ table: 'classes', status: 'error', error: error.message });
      }

      // Test optional tables
      const optionalTables = ['subjects', 'exams', 'teacher_assignments', 'exam_results'];
      
      for (const table of optionalTables) {
        try {
          await supabase.from(table).select('id').limit(1);
          tests.push({ table, status: 'healthy' });
        } catch (error) {
          tests.push({ table, status: 'not_found', error: 'Table does not exist' });
        }
      }

      console.log('✅ System health check completed');
      
      return {
        success: true,
        data: {
          overall: tests.filter(t => t.status === 'error').length === 0 ? 'healthy' : 'degraded',
          tests
        }
      };
    } catch (error) {
      console.error('❌ Error checking system health:', error);
      return { success: false, error: error.message };
    }
  }
};

// Export individual functions for backward compatibility
export const {
  getAdminDashboardStats,
  getTeacherDashboardStats,
  getStudentDashboardStats,
  getSystemHealth
} = dashboardService;

// Legacy function names for compatibility
export const getDashboardStats = getAdminDashboardStats;