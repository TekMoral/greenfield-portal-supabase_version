import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../../../hooks/useAuth';
import { getTeacherClassesAndSubjects, getTeacherStudentList } from '../../../../services/supabase/teacherStudentService';
import { nameMatchesSearch } from '../../../../utils/nameUtils';
import { supabase } from '../../../../lib/supabaseClient';
import { aggregateSubjects, expandClassEntryToIds, getClassesForSubject } from '../../../../utils/teacherClassSubjectUtils';
import { getSubjectsByDepartment } from '../../../../services/supabase/subjectService';

const useStudentsData = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();

  // UI state
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClass, setSelectedClass] = useState('all');

  const urlClassIds = searchParams.get('classIds');

  // Fetch teacher classes and build subjects using centralized utilities
  const {
    data: teacherData,
    isLoading: loadingSubjects,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['teacher', 'classes-subjects', user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error('No user logged in');
      
      const classesRes = await getTeacherClassesAndSubjects(user.id);
      const classes = classesRes?.success ? (classesRes.data || []) : (Array.isArray(classesRes) ? classesRes : []);

      // Load core subject names for proper grouping
      let coreSubjectNames = [];
      try {
        const coreRes = await getSubjectsByDepartment('core');
        coreSubjectNames = Array.isArray(coreRes) ? coreRes.map(s => s.name || s.subjectName || s) : [];
      } catch (_) {
        coreSubjectNames = [];
      }

      // Use centralized utility to aggregate subjects
      const subjects = aggregateSubjects(classes);

      // Build subject metadata with class information
      const subjectsWithClasses = subjects.map(subject => {
        const classesForSubject = getClassesForSubject(classes, {
          subjectName: subject.subjectName,
          coreSubjects: coreSubjectNames
        });

        const totalStudents = classesForSubject.reduce((sum, cls) => {
          return sum + (typeof cls.studentCount === 'number' ? cls.studentCount : 0);
        }, 0);

        return {
          subjectName: subject.subjectName,
          subjectId: subject.subjectId,
          classes: classesForSubject.map(cls => ({
            classId: cls.id,
            className: cls.name,
            level: cls.level,
            category: cls.category,
            studentCount: cls.studentCount,
            isGrouped: cls.isGrouped,
            individualClasses: cls.individualClasses
          })),
          totalStudents
        };
      });

      return { 
        subjects: subjectsWithClasses, 
        classes, 
        coreSubjectNames 
      };
    },
    enabled: !!user?.id,
  });

  // Auto-select the first subject when loaded
  useEffect(() => {
    if (teacherData?.subjects?.length > 0 && !selectedSubject) {
      setSelectedSubject(teacherData.subjects[0].subjectName);
    }
  }, [teacherData?.subjects, selectedSubject]);

  // Fetch students for selected subject using centralized utilities
  const { data: students = [], isLoading: loadingStudents } = useQuery({
    queryKey: ['teacher', 'students', user?.id, selectedSubject, urlClassIds],
    queryFn: async () => {
      if (!selectedSubject || !user?.id || !teacherData?.classes) return [];
      
      const res = await getTeacherStudentList(user.id);
      const allStudents = res?.success ? (res.data || []) : (Array.isArray(res) ? res : []);
      if (!allStudents || allStudents.length === 0) return [];

      // Determine relevant class IDs for the selected subject using centralized utilities
      let classIds = [];
      if (urlClassIds) {
        classIds = urlClassIds.split(',').map((id) => id.trim()).filter(Boolean);
      } else {
        // Use centralized utility to expand class IDs
        teacherData.classes.forEach(cls => {
          const hasSubject = (cls.subjectsTaught || []).some((s) => s.subjectName === selectedSubject);
          if (hasSubject) {
            const ids = expandClassEntryToIds(cls);
            classIds.push(...ids);
          }
        });
        classIds = [...new Set(classIds)];
      }

      const filtered = classIds.length ? allStudents.filter((st) => classIds.includes(st.classId)) : allStudents;

      // Enrich with class details (best effort)
      try {
        if (classIds.length) {
          const { data: classDetails } = await supabase
            .from('classes')
            .select('*')
            .in('id', classIds);
          if (Array.isArray(classDetails)) {
            return filtered.map((st) => {
              const cl = classDetails.find((c) => String(c.id) === String(st.classId));
              // Determine subject type based on core subjects
              const isCoreSubject = teacherData.coreSubjectNames?.includes(selectedSubject);
              return {
                ...st,
                className: cl?.name || st.className || 'Unknown',
                classLevel: cl?.level || st.classLevel || 'Unknown',
                classCategory: cl?.category || st.classCategory || 'Unknown',
                subjectType: isCoreSubject ? 'core' : (cl?.category || cl?.level || 'Unknown')
              };
            });
          }
        }
      } catch (_) {
        // ignore enrichment errors
      }

      return filtered;
    },
    enabled: !!selectedSubject && !!user?.id && !!teacherData?.classes,
  });

  const subjects = teacherData?.subjects || [];

  // Class options derived from selected subject using centralized utilities
  const classOptions = useMemo(() => {
    if (!selectedSubject || !teacherData?.classes) return [];
    
    const classesForSubject = getClassesForSubject(teacherData.classes, {
      subjectName: selectedSubject,
      coreSubjects: teacherData.coreSubjectNames || []
    });

    return classesForSubject.map(cls => ({
      classId: cls.id,
      className: cls.name,
      level: cls.level,
      category: cls.category,
      studentCount: cls.studentCount,
      isGrouped: cls.isGrouped,
      individualClasses: cls.individualClasses
    }));
  }, [teacherData, selectedSubject]);

  // Filtered students
  const filteredStudents = useMemo(() => {
    return (students || []).filter((student) => {
      const matchesSearch =
        searchTerm === '' ||
        nameMatchesSearch(student, searchTerm) ||
        student.admissionNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.email?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesClass = selectedClass === 'all' || student.classId === selectedClass;
      return matchesSearch && matchesClass;
    });
  }, [students, searchTerm, selectedClass]);

  const loading = loadingSubjects || (selectedSubject && loadingStudents);

  return {
    loading,
    error: isError ? error : null,
    subjects,
    students,
    filteredStudents,
    selectedSubject,
    setSelectedSubject,
    selectedClass,
    setSelectedClass,
    searchTerm,
    setSearchTerm,
    classOptions,
    refetch,
  };
};

export default useStudentsData;
