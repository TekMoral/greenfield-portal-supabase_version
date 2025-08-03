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
    const coreSubjectsResult = await getSubjectsByDepartment('core');
    const coreSubjects = coreSubjectsResult.success ? coreSubjectsResult.data : [];
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
      .in('classId', classIds);

    if (studentsError) {
      console.error('Supabase error fetching students:', studentsError);
      return { success: false, error: studentsError.message };
    }

    // Enrich student data with class information
    const enrichedStudents = students.map(student => {
      const studentClass = relevantClasses.find(cls => cls.id === student.classId);
      return {
        ...student,
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
          .eq('classId', classData.id);

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
      .select('classId')
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
    const coreSubjectsResult = await getSubjectsByDepartment('core');
    const coreSubjects = coreSubjectsResult.success ? coreSubjectsResult.data : [];
    
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
      const juniorSubjectsResult = await getSubjectsByDepartment('junior');
      const juniorSubjects = juniorSubjectsResult.success ? juniorSubjectsResult.data : [];
      
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
      const categorySubjectsResult = await getSubjectsByDepartment(categoryKey);
      const categorySubjects = categorySubjectsResult.success ? categorySubjectsResult.data : [];
      
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
 * Examples: "SSS1 Science" -> "SSS1", "Grade 10A Science" -> "Grade 10A", "SSS 1 Science" -> "SSS 1"
 */
const extractBaseClassName = (fullClassName) => {
  if (!fullClassName) return '';
  
  const categoryPattern = /\s+(Science|Art|Commercial)$/i;
  const baseName = fullClassName.replace(categoryPattern, '').trim();
  
  return baseName;
};

/**
 * Get all classes and subjects taught by a teacher - IMPROVED VERSION
 * Groups classes by base class name for core subjects, shows individual classes for category subjects
 */
export const getTeacherClassesAndSubjects = async (teacherId) => {
  try {
    const { data: classes, error: classesError } = await supabase
      .from('classes')
      .select('*');

    if (classesError) {
      console.error('Supabase error fetching classes:', classesError);
      return { success: false, error: classesError.message };
    }
    
    // Get core subjects to identify them
    const coreSubjectsResult = await getSubjectsByDepartment('core');
    const coreSubjects = coreSubjectsResult.success ? coreSubjectsResult.data : [];
    
    const teacherClasses = [];
    const levelGroups = new Map(); // For grouping core subject classes by base class name
    
    for (const classData of classes) {
      // Find subjects taught by this teacher in this class
      const teacherSubjects = classData.subjects?.filter(
        subject => subject.teacherId === teacherId
      ) || [];
      
      if (teacherSubjects.length > 0) {
        // Get student count
        const { count: studentCount, error: countError } = await supabase
          .from('user_profiles')
          .select('*', { count: 'exact', head: true })
          .eq('role', 'student')
          .eq('classId', classData.id);

        if (countError) {
          console.error('Error counting students:', countError);
          continue;
        }
        
        // Check if this class has core subjects
        const coreSubjectsInClass = teacherSubjects.filter(subject => 
          coreSubjects.includes(subject.subjectName)
        );
        
        const categorySubjectsInClass = teacherSubjects.filter(subject => 
          !coreSubjects.includes(subject.subjectName)
        );
        
        // Handle core subjects - group by base class name (e.g., SSS1, SSS2)
        if (coreSubjectsInClass.length > 0) {
          const baseClassName = extractBaseClassName(classData.name);
          const groupKey = baseClassName;
          
          if (!levelGroups.has(groupKey)) {
            levelGroups.set(groupKey, {
              id: `${baseClassName.toLowerCase().replace(/\s+/g, '_')}_grouped`,
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
          
          levelGroup.studentCount += studentCount || 0;
          levelGroup.individualClasses.push({
            id: classData.id,
            name: classData.name,
            category: classData.category,
            studentCount: studentCount || 0
          });
        }
        
        // Handle category subjects - show individual classes
        if (categorySubjectsInClass.length > 0) {
          teacherClasses.push({
            ...classData,
            subjectsTaught: categorySubjectsInClass,
            studentCount: studentCount || 0,
            isGrouped: false
          });
        }
      }
    }
    
    // Add grouped level classes to the result
    levelGroups.forEach(levelGroup => {
      teacherClasses.push(levelGroup);
    });
    
    // Sort classes: grouped classes first, then individual classes
    teacherClasses.sort((a, b) => {
      if (a.isGrouped && !b.isGrouped) return -1;
      if (!a.isGrouped && b.isGrouped) return 1;
      return a.name.localeCompare(b.name);
    });
    
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
    // First, check if this is a core subject
    const coreSubjectsResult = await getSubjectsByDepartment('core');
    const coreSubjects = coreSubjectsResult.success ? coreSubjectsResult.data : [];
    const isCoreSubject = coreSubjects.includes(subjectName);
    
    // Get all classes where this teacher teaches this subject AND class is in the filter list
    const { data: classes, error: classesError } = await supabase
      .from('classes')
      .select('*')
      .in('id', classIds);

    if (classesError) {
      console.error('Supabase error fetching classes:', classesError);
      return { success: false, error: classesError.message };
    }

    const relevantClasses = classes.filter(classData => {
      // Check if this teacher teaches the subject in this class
      return classData.subjects?.some(
        subject => subject.teacherId === teacherId && subject.subjectName === subjectName
      );
    });

    if (relevantClasses.length === 0) {
      return { success: true, data: [] };
    }

    // Get all students from these filtered classes
    const relevantClassIds = relevantClasses.map(cls => cls.id);
    
    const { data: students, error: studentsError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('role', 'student')
      .in('classId', relevantClassIds);

    if (studentsError) {
      console.error('Supabase error fetching students:', studentsError);
      return { success: false, error: studentsError.message };
    }

    // Enrich student data with class information
    const enrichedStudents = students.map(student => {
      const studentClass = relevantClasses.find(cls => cls.id === student.classId);
      return {
        ...student,
        className: studentClass?.name || 'Unknown',
        classLevel: studentClass?.level || 'Unknown',
        classCategory: studentClass?.category || 'Unknown',
        subjectType: isCoreSubject ? 'core' : studentClass?.category || studentClass?.level
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
          .eq('classId', classData.id);

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
    const coreSubjectsResult = await getSubjectsByDepartment('core');
    const coreSubjects = coreSubjectsResult.success ? coreSubjectsResult.data : [];
    
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

// Export as service object for easier usage
export const teacherStudentService = {
  getStudentsByTeacherSubject,
  getTeacherSubjectsWithStudents,
  getStudentSubjects,
  getTeacherClassesAndSubjects,
  getStudentsByTeacherSubjectAndClasses,
  doesTeacherTeachSubject,
  getTeacherClassesAndSubjectsSimple,
  getTeacherStatistics
};