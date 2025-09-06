import { useMemo } from 'react';
import { aggregateSubjects, getClassesForSubject } from '../utils/teacherClassSubjectUtils';

/**
 * Custom hook to handle teacher class filtering and grouping logic
 * @param {Array} allClasses - All teacher classes from the backend
 * @param {string} selectedSubject - Currently selected subject filter
 * @param {Array} coreSubjectNames - List of core subject names
 * @returns {Object} - Filtered classes and available subjects
 */
export const useTeacherClasses = (allClasses = [], selectedSubject = '', coreSubjectNames = []) => {
  // Get available subjects for the dropdown
  const availableSubjects = useMemo(() => {
    return aggregateSubjects(allClasses);
  }, [allClasses]);

  // Filter classes based on selected subject using centralized utility
  const filteredClasses = useMemo(() => {
    if (selectedSubject) {
      return getClassesForSubject(allClasses, { 
        subjectName: selectedSubject, 
        coreSubjects: coreSubjectNames 
      });
    }

    // For "All Subjects" view, we need to show all classes with proper core subject grouping
    // We'll aggregate all subjects and then get classes for each, merging the results
    const classesMap = new Map();
    
    // Process each subject to get its classes (with proper grouping)
    availableSubjects.forEach(subject => {
      const subjectClasses = getClassesForSubject(allClasses, {
        subjectName: subject.subjectName,
        coreSubjects: coreSubjectNames
      });
      
      // Add classes to map, avoiding duplicates
      subjectClasses.forEach(cls => {
        if (!classesMap.has(cls.id)) {
          classesMap.set(cls.id, cls);
        } else {
          // Merge subjects if class already exists
          const existing = classesMap.get(cls.id);
          (cls.subjectsTaught || []).forEach(subject => {
            if (!existing.subjectsTaught.some(s => s.subjectName === subject.subjectName)) {
              existing.subjectsTaught.push(subject);
            }
          });
        }
      });
    });
    
    return Array.from(classesMap.values()).sort((a, b) => {
      if (a.isGrouped && !b.isGrouped) return -1;
      if (!a.isGrouped && b.isGrouped) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [allClasses, selectedSubject, coreSubjectNames, availableSubjects]);

  return {
    classes: filteredClasses,
    availableSubjects,
    totalClasses: filteredClasses.length,
    totalStudents: filteredClasses.reduce((total, cls) => {
      const count = typeof cls.studentCount === 'number' ? cls.studentCount : 0;
      return total + count;
    }, 0)
  };
};

export default useTeacherClasses;