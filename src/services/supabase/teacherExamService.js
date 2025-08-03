import { supabase } from '../../lib/supabaseClient';

/**
 * Get teacher classes and subjects in simplified format for ExamResults component
 */
export const getTeacherClassesAndSubjectsSimple = async (teacherId) => {
  try {
    // Get all classes with their subjects and student counts
    const { data: classesData, error: classesError } = await supabase
      .from('classes')
      .select(`
        id,
        name,
        level,
        category,
        subjects (
          id,
          name,
          teacher_id
        ),
        students (
          id
        )
      `);

    if (classesError) {
      console.error('Error fetching classes:', classesError);
      throw classesError;
    }

    const teacherClasses = [];
    const teacherSubjects = new Set();
    
    for (const classData of classesData) {
      // Find subjects taught by this teacher in this class
      const subjectsInClass = classData.subjects?.filter(
        subject => subject.teacher_id === teacherId
      ) || [];
      
      if (subjectsInClass.length > 0) {
        // Get student count for this class
        const studentCount = classData.students?.length || 0;
        
        // Add class to teacher's classes
        teacherClasses.push({
          id: classData.id,
          name: classData.name,
          level: classData.level,
          category: classData.category,
          studentCount,
          subjectsTaught: subjectsInClass.map(subject => ({
            subjectName: subject.name,
            teacherId: subject.teacher_id
          }))
        });
        
        // Add subjects to the set
        subjectsInClass.forEach(subject => {
          teacherSubjects.add(subject.name);
        });
      }
    }
    
    // Convert subjects set to array of objects
    const subjectsArray = Array.from(teacherSubjects).map(subjectName => ({
      name: subjectName
    }));
    
    return {
      classes: teacherClasses,
      subjects: subjectsArray
    };
  } catch (error) {
    console.error('Error fetching teacher classes and subjects:', error);
    throw error;
  }
};

/**
 * Alternative implementation using separate queries if the above doesn't work with your schema
 */
export const getTeacherClassesAndSubjectsAlternative = async (teacherId) => {
  try {
    // First, get all subjects taught by this teacher
    const { data: teacherSubjects, error: subjectsError } = await supabase
      .from('subjects')
      .select('id, name, class_id')
      .eq('teacher_id', teacherId);

    if (subjectsError) {
      console.error('Error fetching teacher subjects:', subjectsError);
      throw subjectsError;
    }

    if (!teacherSubjects || teacherSubjects.length === 0) {
      return { classes: [], subjects: [] };
    }

    // Get unique class IDs
    const classIds = [...new Set(teacherSubjects.map(subject => subject.class_id))];

    // Get class details
    const { data: classesData, error: classesError } = await supabase
      .from('classes')
      .select('id, name, level, category')
      .in('id', classIds);

    if (classesError) {
      console.error('Error fetching classes:', classesError);
      throw classesError;
    }

    // Get student counts for each class
    const teacherClasses = [];
    const subjectsSet = new Set();

    for (const classData of classesData) {
      // Get student count for this class
      const { count: studentCount, error: countError } = await supabase
        .from('students')
        .select('id', { count: 'exact' })
        .eq('class_id', classData.id);

      if (countError) {
        console.error('Error counting students:', countError);
      }

      // Get subjects taught by this teacher in this class
      const subjectsInClass = teacherSubjects.filter(
        subject => subject.class_id === classData.id
      );

      teacherClasses.push({
        id: classData.id,
        name: classData.name,
        level: classData.level,
        category: classData.category,
        studentCount: studentCount || 0,
        subjectsTaught: subjectsInClass.map(subject => ({
          subjectName: subject.name,
          teacherId: teacherId
        }))
      });

      // Add subjects to the set
      subjectsInClass.forEach(subject => {
        subjectsSet.add(subject.name);
      });
    }

    // Convert subjects set to array of objects
    const subjectsArray = Array.from(subjectsSet).map(subjectName => ({
      name: subjectName
    }));

    return {
      classes: teacherClasses,
      subjects: subjectsArray
    };
  } catch (error) {
    console.error('Error fetching teacher classes and subjects (alternative):', error);
    throw error;
  }
};