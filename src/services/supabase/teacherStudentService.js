import { supabase } from '../../lib/supabaseClient';
import { getSubjectsByDepartment } from './subjectService';

/**
 * Get all students taking a specific subject taught by a teacher
 * This works by finding all classes where the teacher teaches the subject,
 * then getting all students in those classes with the matching category
 */
export const getStudentsByTeacherSubject = async (teacherId, subjectName) => {
  try {
    // First, check if this is a core subject
    let coreSubjects = [];
    try {
      coreSubjects = await getSubjectsByDepartment('core');
    } catch (error) {
      console.error('Error fetching core subjects:', error);
      coreSubjects = [];
    }
    const isCoreSubject = coreSubjects.includes(subjectName);
    
    // Get all classes where this teacher teaches this subject
    const { data: classes, error: classesError } = await supabase
      .from('classes')
      .select(`
        id,
        name,
        level,
        category,
        subjects
      `);

    if (classesError) {
      console.error('Supabase error fetching classes:', classesError);
      return { success: false, error: classesError.message };
    }

    // Filter classes where teacher teaches the subject
    const relevantClasses = classes.filter(classData => {
      return classData.subjects?.some(
        subject => subject.teacherId === teacherId && subject.subjectName === subjectName
      );
    });

    if (relevantClasses.length === 0) {
      return { success: true, data: [] };
    }

    // Get all students from these classes
    const classIds = relevantClasses.map(cls => cls.id);
    
    const { data: students, error: studentsError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('role', 'student')
      .in('class_id', classIds);

    if (studentsError) {
      console.error('Supabase error fetching students:', studentsError);
      return { success: false, error: studentsError.message };
    }

    // Enrich student data with class information
    const enrichedStudents = students.map(student => {
      const studentClass = relevantClasses.find(cls => cls.id === (student.class_id ?? student.classId));
      // Derive name fields consistently
      const fullName = student.full_name || student.name || [student.first_name, student.surname].filter(Boolean).join(' ');
      const first = student.first_name || (fullName ? fullName.split(' ')[0] : '');
      const rest = student.surname || (fullName ? fullName.split(' ').slice(1).join(' ') : '');
      return {
        ...student,
        id: student.id || student.uid,
        classId: student.class_id ?? student.classId,
        name: fullName || 'Student',
        firstName: first,
        surname: rest,
        lastName: rest,
        admissionNumber: student.admission_number ?? student.admissionNumber,
        profileImageUrl: student.profile_image ?? student.profileImageUrl,
        className: studentClass?.name || 'Unknown',
        classLevel: studentClass?.level || 'Unknown',
        classCategory: studentClass?.category || 'Unknown',
        subjectType: isCoreSubject ? 'core' : studentClass?.category || studentClass?.level
      };
    });

    return { success: true, data: enrichedStudents };
  } catch (error) {
    console.error('Error fetching students by teacher subject:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get all subjects taught by a teacher with student counts
 */
export const getTeacherSubjectsWithStudents = async (teacherId) => {
  try {
    // Get all classes where this teacher teaches
    const { data: classes, error: classesError } = await supabase
      .from('classes')
      .select(`
        id,
        name,
        level,
        category,
        subjects
      `);

    if (classesError) {
      console.error('Supabase error fetching classes:', classesError);
      return { success: false, error: classesError.message };
    }

    const teacherSubjects = new Map();
    
    for (const classData of classes) {
      // Find subjects taught by this teacher in this class
      const teacherSubjectsInClass = classData.subjects?.filter(
        subject => subject.teacherId === teacherId
      ) || [];
      
      for (const subject of teacherSubjectsInClass) {
        const key = subject.subjectName;
        
        if (!teacherSubjects.has(key)) {
          teacherSubjects.set(key, {
            subjectName: subject.subjectName,
            classes: [],
            totalStudents: 0
          });
        }
        
        // Get student count for this class
        const { count: studentCount, error: countError } = await supabase
          .from('user_profiles')
          .select('*', { count: 'exact', head: true })
          .eq('role', 'student')
          .eq('class_id', classData.id);

        if (countError) {
          console.error('Error counting students:', countError);
          continue;
        }
        
        const subjectData = teacherSubjects.get(key);
        subjectData.classes.push({
          classId: classData.id,
          className: classData.name,
          level: classData.level,
          category: classData.category,
          studentCount: studentCount || 0
        });
        subjectData.totalStudents += studentCount || 0;
      }
    }
    
    return { success: true, data: Array.from(teacherSubjects.values()) };
  } catch (error) {
    console.error('Error fetching teacher subjects with students:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get all subjects available to a student based on their class category
 */
export const getStudentSubjects = async (studentId) => {
  try {
    // Get student data
    const { data: studentData, error: studentError } = await supabase
      .from('user_profiles')
      .select('class_id')
      .eq('user_id', studentId)
      .eq('role', 'student')
      .single();

    if (studentError) {
      console.error('Supabase error fetching student:', studentError);
      return { success: false, error: 'Student not found' };
    }
    
    // Get class data
    const { data: classData, error: classError } = await supabase
      .from('classes')
      .select('*')
      .eq('id', studentData.classId)
      .single();

    if (classError) {
      console.error('Supabase error fetching class:', classError);
      return { success: false, error: 'Class not found' };
    }
    
    // Always get core subjects (taken by ALL students)
    let coreSubjects = [];
    try {
      coreSubjects = await getSubjectsByDepartment('core');
    } catch (error) {
      console.error('Error fetching core subjects:', error);
      coreSubjects = [];
    }
    
    let allSubjects = coreSubjects.map(subjectName => {
      const subjectInfo = classData.subjects?.find(s => s.subjectName === subjectName);
      return {
        subjectName,
        teacherId: subjectInfo?.teacherId || null,
        teacherName: subjectInfo?.teacherName || 'Not Assigned',
        category: 'core'
      };
    });
    
    // For Junior level, add junior-specific subjects
    if (classData.level === 'Junior') {
      let juniorSubjects = [];
      try {
        juniorSubjects = await getSubjectsByDepartment('junior');
      } catch (error) {
        console.error('Error fetching junior subjects:', error);
        juniorSubjects = [];
      }
      
      const juniorSubjectList = juniorSubjects.map(subjectName => {
        const subjectInfo = classData.subjects?.find(s => s.subjectName === subjectName);
        return {
          subjectName,
          teacherId: subjectInfo?.teacherId || null,
          teacherName: subjectInfo?.teacherName || 'Not Assigned',
          category: 'junior'
        };
      });
      allSubjects = [...allSubjects, ...juniorSubjectList];
    }
    
    // For Senior level, add category-specific subjects
    if (classData.level === 'Senior' && classData.category) {
      const categoryKey = classData.category.toLowerCase();
      let categorySubjects = [];
      try {
        categorySubjects = await getSubjectsByDepartment(categoryKey);
      } catch (error) {
        console.error(`Error fetching ${categoryKey} subjects:`, error);
        categorySubjects = [];
      }
      
      const categorySubjectList = categorySubjects.map(subjectName => {
        const subjectInfo = classData.subjects?.find(s => s.subjectName === subjectName);
        return {
          subjectName,
          teacherId: subjectInfo?.teacherId || null,
          teacherName: subjectInfo?.teacherName || 'Not Assigned',
          category: classData.category
        };
      });
      allSubjects = [...allSubjects, ...categorySubjectList];
    }
    
    return { success: true, data: allSubjects };
  } catch (error) {
    console.error('Error fetching student subjects:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Extract base class name from full class name
 * Uses the same normalization as the assignment modal for consistency
 * Examples: "SSS1 Science" -> "SSS 1", "SSS 1 Science" -> "SSS 1", "JSS2 Art" -> "JSS 2"
 */
const extractBaseClassName = (fullClassName) => {
  if (!fullClassName) return '';
  const rawName = String(fullClassName).toUpperCase().trim().replace(/\s+/g, ' ');
  // Strip trailing category labels
  const stripped = rawName.replace(/\s+(SCIENCE|ARTS?|COMMERCIAL)$/, '');
  // Match common senior/junior patterns and normalize to standard format
  let m = stripped.match(/^(JSS|JS|JUNIOR( SECONDARY)?)\s*(\d+)/i);
  if (m) return `JSS ${m[3]}`;
  m = stripped.match(/^(SSS|SS|SENIOR( SECONDARY)?)\s*(\d+)/i);
  if (m) return `SSS ${m[3]}`;
  // Fallback: try to extract the first number and infer level by presence of SSS/JSS
  const num = (stripped.match(/\b(\d)\b/) || [])[1];
  if (/JSS|JUNIOR/.test(stripped) && num) return `JSS ${num}`;
  if (/SSS|SENIOR/.test(stripped) && num) return `SSS ${num}`;
  return stripped; // final fallback
};

/**
 * Get all classes and subjects taught by a teacher - CORRECTED VERSION
 * Uses teacher_assignments table to get the actual teacher-subject-class relationships
 */
export const getTeacherClassesAndSubjects = async (teacherId) => {
  try {
    console.log('🔍 Fetching classes and subjects for teacher:', teacherId);
    
    // Get teacher assignments from the correct table
    const { data: assignments, error: assignmentsError } = await supabase
      .from('teacher_assignments')
      .select(`
        *,
        subjects!inner (id, name, code, department),
        classes!inner (id, name, level, category, description)
      `)
      .eq('teacher_id', teacherId)
      .eq('is_active', true);

    if (assignmentsError) {
      console.error('Supabase error fetching teacher assignments:', assignmentsError);
      return { success: false, error: assignmentsError.message };
    }
    
    console.log('📚 Found teacher assignments:', assignments?.length || 0);
    
    if (!assignments || assignments.length === 0) {
      console.log('❌ No assignments found for teacher');
      return { success: true, data: [] };
    }
    
    // Get core subjects to identify them
    let coreSubjects = [];
    try {
      coreSubjects = await getSubjectsByDepartment('core');
      console.log('🎯 Core subjects:', coreSubjects?.length || 0);
    } catch (error) {
      console.error('Error fetching core subjects:', error);
      coreSubjects = [];
    }
    
    // Group assignments by class
    const classMap = new Map();
    
    for (const assignment of assignments) {
      const classData = assignment.classes;
      const subjectData = assignment.subjects;
      
      console.log('📝 Processing assignment:', classData.name, '-', subjectData.name);
      
      if (!classMap.has(classData.id)) {
        // Skip student count due to database permission issues
        // Teachers don't have direct access to count students in user_profiles table
        console.log('👥 Setting student count to "N/A" for', classData.name, '(DB permission issue)');
        
        classMap.set(classData.id, {
          ...classData,
          subjectsTaught: [],
          studentCount: 0,
          isGrouped: false
        });
      }
      
      // Add subject to class
      const classEntry = classMap.get(classData.id);
      classEntry.subjectsTaught.push({
        subjectName: subjectData.name,
        subjectId: subjectData.id,
        teacherId: teacherId,
        teacherName: 'Current Teacher', // Could be enhanced to get actual teacher name
        department: subjectData.department
      });
    }
    
    const teacherClasses = [];

    // Compute student counts per class (RLS-compliant)
    let countsByClass = {};
    try {
      const classIdsForCount = Array.from(classMap.keys());
      if (classIdsForCount.length) {
        const { data: studentRows } = await supabase
          .from('user_profiles')
          .select('class_id')
          .eq('role', 'student')
          .in('class_id', classIdsForCount);
        (studentRows || []).forEach(r => {
          const cid = r.class_id || r.classId;
          countsByClass[cid] = (countsByClass[cid] || 0) + 1;
        });
      }
    } catch (e) {
      console.warn('Could not compute student counts, defaulting to 0', e);
    }

    const levelGroups = new Map(); // For grouping core subject classes by base class name
    
    // Process each class and group core subjects
    for (const classData of classMap.values()) {
      console.log('🔍 Processing class:', classData.name, 'with', classData.subjectsTaught.length, 'subjects');
      
      // Check if this class has core subjects
      const coreSubjectsInClass = classData.subjectsTaught.filter(subject => 
        coreSubjects.includes(subject.subjectName)
      );
      
      const categorySubjectsInClass = classData.subjectsTaught.filter(subject => 
        !coreSubjects.includes(subject.subjectName)
      );
      
      console.log('🎯 Core subjects in class:', coreSubjectsInClass.length);
      console.log('📚 Category subjects in class:', categorySubjectsInClass.length);
      
      // Handle core subjects - group by base class name (e.g., SSS1, SSS2)
      if (coreSubjectsInClass.length > 0) {
        const baseClassName = extractBaseClassName(classData.name);
        const groupKey = baseClassName; // Use normalized base as key (already handles SSS1 vs SSS 1)
        
        console.log('🏷️ Grouping core subjects under:', baseClassName);
        
        if (!levelGroups.has(groupKey)) {
          levelGroups.set(groupKey, {
            id: `${baseClassName.replace(/\s+/g, '_')}_grouped`,
            name: baseClassName,
            level: classData.level,
            category: 'All Categories', // Indicates this is a grouped class
            isGrouped: true,
            subjectsTaught: [],
            studentCount: 0,
            individualClasses: []
          });
        }
        
        const levelGroup = levelGroups.get(groupKey);
        
        // Add core subjects to the level group
        coreSubjectsInClass.forEach(subject => {
          if (!levelGroup.subjectsTaught.some(s => s.subjectName === subject.subjectName)) {
            levelGroup.subjectsTaught.push(subject);
          }
        });
        
        const classCount = countsByClass[classData.id] || 0;
        levelGroup.studentCount += classCount;
        // Deduplicate individualClasses by id
        const icId = String(classData.id);
        if (!levelGroup.individualClasses.some(ic => String(ic.id) === icId)) {
          levelGroup.individualClasses.push({
            id: classData.id,
            name: classData.name,
            category: classData.category,
            studentCount: classCount
          });
        }
      }
      
      // Handle category subjects - show individual classes
      if (categorySubjectsInClass.length > 0) {
        console.log('➕ Adding individual class:', classData.name);
        const classCount = countsByClass[classData.id] || 0;
        teacherClasses.push({
          ...classData,
          studentCount: classCount,
          subjectsTaught: categorySubjectsInClass,
          isGrouped: false
        });
      }
    }
    
    // Add grouped level classes to the result
    console.log('📊 Level groups created:', levelGroups.size);
    levelGroups.forEach((levelGroup, key) => {
      console.log('🏷️ Adding level group:', key, 'with', levelGroup.studentCount, 'students');
      teacherClasses.push(levelGroup);
    });
    
    // Sort classes: grouped classes first, then individual classes
    teacherClasses.sort((a, b) => {
      if (a.isGrouped && !b.isGrouped) return -1;
      if (!a.isGrouped && b.isGrouped) return 1;
      return a.name.localeCompare(b.name);
    });
    
    console.log('✅ Final teacher classes count:', teacherClasses.length);
    console.log('📋 Classes to return:', teacherClasses.map(c => ({ name: c.name, isGrouped: c.isGrouped, subjects: c.subjectsTaught?.length })));
    
    return { success: true, data: teacherClasses };
  } catch (error) {
    console.error('Error fetching teacher classes and subjects:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get students by teacher subject filtered by specific class IDs
 */
export const getStudentsByTeacherSubjectAndClasses = async (teacherId, subjectName, classIds) => {
  try {
    // Determine if subject is core (optional enrichment)
    let coreSubjects = [];
    try {
      coreSubjects = await getSubjectsByDepartment('core');
    } catch (error) {
      console.error('Error fetching core subjects:', error);
      coreSubjects = [];
    }
    const isCoreSubject = coreSubjects.includes(subjectName);

    // Use teacher_assignments to identify classes where this teacher teaches the given subject
    const { data: assignments, error: assignmentsError } = await supabase
      .from('teacher_assignments')
      .select(`
        class_id,
        subjects!inner (id, name),
        classes!inner (id, name, level, category)
      `)
      .eq('teacher_id', teacherId)
      .eq('is_active', true)
      .in('class_id', classIds);

    if (assignmentsError) {
      console.error('Supabase error fetching teacher assignments:', assignmentsError);
      return { success: false, error: assignmentsError.message };
    }

    // Filter to only the assignments matching the subject name
    const relevantAssignments = (assignments || []).filter(a => a.subjects?.name === subjectName);
    if (relevantAssignments.length === 0) {
      return { success: true, data: [] };
    }

    const relevantClassIds = [...new Set(relevantAssignments.map(a => a.class_id))];

    // Fetch students in those classes
    const { data: students, error: studentsError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('role', 'student')
      .in('class_id', relevantClassIds);

    if (studentsError) {
      console.error('Supabase error fetching students:', studentsError);
      return { success: false, error: studentsError.message };
    }

    // Enrich student data with class information from the assignments' joined classes
    const classById = new Map(
      relevantAssignments.map(a => [a.classes.id, a.classes])
    );

    const enrichedStudents = (students || []).map(student => {
      const studentClass = classById.get(student.class_id) || classById.get(student.classId);
      const fullName = student.full_name || student.name || [student.first_name, student.surname].filter(Boolean).join(' ');
      const first = student.first_name || (fullName ? fullName.split(' ')[0] : '');
      const rest = student.surname || (fullName ? fullName.split(' ').slice(1).join(' ') : '');
      return {
        ...student,
        id: student.id || student.uid,
        classId: student.class_id ?? student.classId,
        name: fullName || 'Student',
        firstName: first,
        surname: rest,
        lastName: rest,
        admissionNumber: student.admission_number ?? student.admissionNumber,
        profileImageUrl: student.profile_image ?? student.profileImageUrl,
        className: studentClass?.name || 'Unknown',
        classLevel: studentClass?.level || 'Unknown',
        classCategory: studentClass?.category || 'Unknown',
        subjectType: isCoreSubject ? 'core' : (studentClass?.category || studentClass?.level)
      };
    });

    return { success: true, data: enrichedStudents };
  } catch (error) {
    console.error('Error fetching students by teacher subject and classes:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Check if a teacher teaches a specific subject
 */
export const doesTeacherTeachSubject = async (teacherId, subjectName) => {
  try {
    const { data: classes, error } = await supabase
      .from('classes')
      .select('subjects');

    if (error) {
      console.error('Supabase error checking teacher subject:', error);
      return { success: false, error: error.message };
    }
    
    for (const classData of classes) {
      const teachesSubject = classData.subjects?.some(
        subject => subject.teacherId === teacherId && subject.subjectName === subjectName
      );
      
      if (teachesSubject) {
        return { success: true, data: true };
      }
    }
    
    return { success: true, data: false };
  } catch (error) {
    console.error('Error checking if teacher teaches subject:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get teacher classes and subjects in simplified format for ExamResults component
 */
export const getTeacherClassesAndSubjectsSimple = async (teacherId) => {
  try {
    const { data: classes, error: classesError } = await supabase
      .from('classes')
      .select('*');

    if (classesError) {
      console.error('Supabase error fetching classes:', classesError);
      return { success: false, error: classesError.message };
    }
    
    const teacherClasses = [];
    const teacherSubjects = new Set();
    
    for (const classData of classes) {
      // Find subjects taught by this teacher in this class
      const subjectsInClass = classData.subjects?.filter(
        subject => subject.teacherId === teacherId
      ) || [];
      
      if (subjectsInClass.length > 0) {
        // Get student count
        const { count: studentCount, error: countError } = await supabase
          .from('user_profiles')
          .select('*', { count: 'exact', head: true })
          .eq('role', 'student')
          .eq('class_id', classData.id);

        if (countError) {
          console.error('Error counting students:', countError);
          continue;
        }
        
        // Add class to teacher's classes
        teacherClasses.push({
          id: classData.id,
          name: classData.name,
          level: classData.level,
          category: classData.category,
          studentCount: studentCount || 0,
          subjectsTaught: subjectsInClass
        });
        
        // Add subjects to the set
        subjectsInClass.forEach(subject => {
          teacherSubjects.add(subject.subjectName);
        });
      }
    }
    
    // Convert subjects set to array of objects
    const subjectsArray = Array.from(teacherSubjects).map(subjectName => ({
      name: subjectName
    }));
    
    return {
      success: true,
      data: {
        classes: teacherClasses,
        subjects: subjectsArray
      }
    };
  } catch (error) {
    console.error('Error fetching teacher classes and subjects:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get teacher statistics
 */
export const getTeacherStatistics = async (teacherId) => {
  try {
    const classesResult = await getTeacherClassesAndSubjects(teacherId);
    
    if (!classesResult.success) {
      return classesResult;
    }
    
    const classes = classesResult.data;
    
    const stats = {
      totalClasses: classes.length,
      totalStudents: classes.reduce((sum, cls) => sum + (cls.studentCount || 0), 0),
      totalSubjects: [...new Set(classes.flatMap(cls => 
        cls.subjectsTaught?.map(s => s.subjectName) || []
      ))].length,
      coreSubjects: 0,
      categorySubjects: 0,
      classesByLevel: {},
      subjectsByCategory: {}
    };
    
    // Get core subjects for categorization
    let coreSubjects = [];
    try {
      coreSubjects = await getSubjectsByDepartment('core');
    } catch (error) {
      console.error('Error fetching core subjects for stats:', error);
      coreSubjects = [];
    }
    
    classes.forEach(cls => {
      // Count by level
      if (!stats.classesByLevel[cls.level]) {
        stats.classesByLevel[cls.level] = 0;
      }
      stats.classesByLevel[cls.level]++;
      
      // Count subjects by type
      cls.subjectsTaught?.forEach(subject => {
        if (coreSubjects.includes(subject.subjectName)) {
          stats.coreSubjects++;
        } else {
          stats.categorySubjects++;
        }
        
        const category = coreSubjects.includes(subject.subjectName) ? 'core' : cls.category || 'other';
        if (!stats.subjectsByCategory[category]) {
          stats.subjectsByCategory[category] = 0;
        }
        stats.subjectsByCategory[category]++;
      });
    });
    
    return { success: true, data: stats };
  } catch (error) {
    console.error('Error fetching teacher statistics:', error);
    return { success: false, error: error.message };
  }
};

// Get all students assigned to a teacher's classes via teacher_assignments
export const getTeacherStudentList = async (teacherId) => {
  try {
    // Get all active assignments for this teacher
    const { data: assignments, error: assignmentsError } = await supabase
      .from('teacher_assignments')
      .select('class_id')
      .eq('teacher_id', teacherId)
      .eq('is_active', true);

    if (assignmentsError) {
      console.error('Supabase error fetching assignments:', assignmentsError);
      return { success: false, error: assignmentsError.message };
    }
    const classIds = (assignments || []).map(a => a.class_id);

    if (classIds.length === 0) return { success: true, data: [] };
    // Fetch all students in these classes
    const { data: students, error: studentsError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('role', 'student')
      .in('class_id', classIds);
    if (studentsError) {
      console.error('Supabase error fetching students:', studentsError);
      return { success: false, error: studentsError.message };
    }
    // Optionally: Enrich/adapt as needed for UI
    const enriched = students.map(st => {
      const fullName = st.full_name || st.name || [st.first_name, st.surname].filter(Boolean).join(' ');
      const first = st.first_name || (fullName ? fullName.split(' ')[0] : '');
      const rest = st.surname || (fullName ? fullName.split(' ').slice(1).join(' ') : '');
      return {
        ...st,
        id: st.id || st.uid,
        classId: st.class_id,
        admissionNumber: st.admission_number,
        profileImageUrl: st.profile_image,
        name: fullName || 'Student',
        firstName: first,
        surname: rest,
        lastName: rest,
      };
    });
    return { success: true, data: enriched };
  } catch (error) {
    console.error('Error in getTeacherStudentList:', error);
    return { success: false, error: error.message };
  }
};

// Export as service object for easier usage
export const teacherStudentService = {
  getStudentsByTeacherSubject,
  getTeacherSubjectsWithStudents,
  getStudentSubjects,
  getTeacherClassesAndSubjects,
  getStudentsByTeacherSubjectAndClasses,
  doesTeacherTeachSubject,
  getTeacherClassesAndSubjectsSimple,
  getTeacherStatistics,
  getTeacherStudentList
};