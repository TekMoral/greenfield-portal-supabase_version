import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../../../hooks/useAuth';
import { getTeacherClassesAndSubjects, getTeacherStudentList } from '../../../../services/supabase/teacherStudentService';
import { nameMatchesSearch } from '../../../../utils/nameUtils';
import { supabase } from '../../../../lib/supabaseClient';

const useStudentsData = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();

  // UI state
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClass, setSelectedClass] = useState('all');

  const urlClassIds = searchParams.get('classIds');

  // Fetch teacher classes and build subjects map
  const {
    data: subjectsData,
    isLoading: loadingSubjects,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['teacher', 'subjects-only', user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error('No user logged in');
      const classesRes = await getTeacherClassesAndSubjects(user.id);
      const classes = classesRes?.success ? (classesRes.data || []) : (Array.isArray(classesRes) ? classesRes : []);

      const subjectMap = new Map();
      classes.forEach((classItem) => {
        classItem.subjectsTaught?.forEach((subject) => {
          if (!subjectMap.has(subject.subjectName)) {
            subjectMap.set(subject.subjectName, {
              subjectName: subject.subjectName,
              classes: [],
              totalStudents: 0,
            });
          }
          const subjectData = subjectMap.get(subject.subjectName);
          if (classItem.isGrouped) {
            classItem.individualClasses?.forEach((individualClass) => {
              subjectData.classes.push({
                classId: individualClass.id,
                className: individualClass.name,
                level: classItem.level,
                category: individualClass.category,
                studentCount: individualClass.studentCount,
              });
            });
          } else {
            subjectData.classes.push({
              classId: classItem.id,
              className: classItem.name,
              level: classItem.level,
              category: classItem.category,
              studentCount: classItem.studentCount,
            });
          }
          const add = typeof classItem.studentCount === 'number' ? classItem.studentCount : 0;
          subjectData.totalStudents += add;
        });
      });

      const subjectsArray = Array.from(subjectMap.values());
      return { subjects: subjectsArray, classes };
    },
    enabled: !!user?.id,
  });

  // Auto-select the first subject when loaded
  useEffect(() => {
    if (subjectsData?.subjects?.length > 0 && !selectedSubject) {
      setSelectedSubject(subjectsData.subjects[0].subjectName);
    }
  }, [subjectsData?.subjects, selectedSubject]);

  // Fetch students for selected subject
  const { data: students = [], isLoading: loadingStudents } = useQuery({
    queryKey: ['teacher', 'students', user?.id, selectedSubject, urlClassIds],
    queryFn: async () => {
      if (!selectedSubject || !user?.id || !subjectsData?.classes) return [];
      const res = await getTeacherStudentList(user.id);
      const allStudents = res?.success ? (res.data || []) : (Array.isArray(res) ? res : []);
      if (!allStudents || allStudents.length === 0) return [];

      // Determine relevant class IDs for the selected subject
      let classIds = [];
      if (urlClassIds) {
        classIds = urlClassIds.split(',').map((id) => id.trim()).filter(Boolean);
      } else {
        for (const cls of subjectsData.classes) {
          const hasSubject = (cls.subjectsTaught || []).some((s) => s.subjectName === selectedSubject);
          if (cls.isGrouped && hasSubject && Array.isArray(cls.individualClasses)) {
            classIds.push(...cls.individualClasses.map((ic) => ic.id));
          } else if (hasSubject) {
            classIds.push(cls.id);
          }
        }
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
              return {
                ...st,
                className: cl?.name || st.className || 'Unknown',
                classLevel: cl?.level || st.classLevel || 'Unknown',
                classCategory: cl?.category || st.classCategory || 'Unknown',
              };
            });
          }
        }
      } catch (_) {
        // ignore enrichment errors
      }

      return filtered;
    },
    enabled: !!selectedSubject && !!user?.id && !!subjectsData?.classes,
  });

  const subjects = subjectsData?.subjects || [];

  // Class options derived from selected subject
  const classOptions = useMemo(() => {
    if (!selectedSubject) return [];
    const subj = (subjects || []).find((s) => s.subjectName === selectedSubject);
    return subj?.classes || [];
  }, [subjects, selectedSubject]);

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
