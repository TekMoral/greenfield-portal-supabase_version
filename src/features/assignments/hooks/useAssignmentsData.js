import { useMemo, useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getTeacherClassesAndSubjects } from '@services/supabase/teacherStudentService';
import { getAssignmentsByTeacher } from '@features/assignments/api/crud';
import { mapAssignmentRowToUI } from '@features/assignments/api/normalize';

export const useAssignmentsData = (userId) => {
  const queryClient = useQueryClient();
  const [selectedSubject, setSelectedSubject] = useState('all');

  // Query: Teacher's classes and subjects
  const {
    data: teacherClasses = [],
    isLoading: loadingClasses,
    error: errorClasses,
  } = useQuery({
    queryKey: ['teacher', 'classes-subjects', userId],
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const res = await getTeacherClassesAndSubjects(userId);
      if (res?.success) return res.data || [];
      if (Array.isArray(res)) return res;
      if (res?.error) throw new Error(res.error);
      return [];
    },
  });

  // Query: Assignments by teacher, normalized to UI shape
  const {
    data: assignments = [],
    isLoading: loadingAssignments,
    error: errorAssignments,
  } = useQuery({
    queryKey: ['teacher', 'assignments', userId],
    enabled: !!userId,
    staleTime: 60 * 1000,
    queryFn: async () => {
      const res = await getAssignmentsByTeacher(userId);
      if (res?.success) return (res.data || []).map(mapAssignmentRowToUI);
      if (Array.isArray(res)) return res.map(mapAssignmentRowToUI);
      if (res?.error) throw new Error(res.error);
      return [];
    },
  });

  // Build subjects list from teacher classes
  const subjects = useMemo(() => {
    const subjectMap = new Map();
    (teacherClasses || []).forEach((cls) => {
      (cls.subjectsTaught || []).forEach((s) => {
        const key = s.subjectName;
        if (!subjectMap.has(key)) {
          subjectMap.set(key, {
            subjectName: s.subjectName,
            subjectId: s.subjectId,
            isCore: String(s.department || '').toLowerCase() === 'core',
            classes: [],
          });
        } else {
          // Preserve isCore = true if any occurrence marks it core
          const prev = subjectMap.get(key);
          if (String(s.department || '').toLowerCase() === 'core') prev.isCore = true;
        }
        const entry = subjectMap.get(key);
        if (cls.isGrouped) {
          (cls.individualClasses || []).forEach((ic) => {
            entry.classes.push({
              classId: ic.id,
              className: ic.name,
              level: cls.level,
              category: ic.category,
              studentCount: ic.studentCount,
            });
          });
        } else {
          entry.classes.push({
            classId: cls.id,
            className: cls.name,
            level: cls.level,
            category: cls.category,
            studentCount: cls.studentCount,
          });
        }
      });
    });
    return Array.from(subjectMap.values());
  }, [teacherClasses]);

  const filteredAssignments = useMemo(() => {
    if (!Array.isArray(assignments)) return [];
    if (selectedSubject === 'all') return assignments;
    return assignments.filter((a) => a.subjectName === selectedSubject);
  }, [assignments, selectedSubject]);

  const classOptions = useMemo(() => {
    if (!Array.isArray(subjects)) return [];
    if (selectedSubject && selectedSubject !== 'all') {
      const subj = subjects.find((s) => s.subjectName === selectedSubject);
      return subj ? (subj.classes || []) : [];
    }
    const all = subjects.flatMap((s) => s.classes || []);
    const map = new Map();
    all.forEach((c) => map.set(c.classId || c.id, c));
    return Array.from(map.values());
  }, [subjects, selectedSubject]);

  // Maintain compatibility: expose setAssignments but wire it to React Query cache
  const setAssignments = useCallback(
    (updater) => {
      queryClient.setQueryData(['teacher', 'assignments', userId], (prev) => {
        const prevArr = Array.isArray(prev) ? prev : [];
        return typeof updater === 'function' ? updater(prevArr) : updater;
      });
    },
    [queryClient, userId]
  );

  return {
    loading: loadingClasses || loadingAssignments || !userId,
    error: errorClasses || errorAssignments || null,
    subjects,
    assignments,
    setAssignments,
    filteredAssignments,
    selectedSubject,
    setSelectedSubject,
    classOptions,
  };
};

export default useAssignmentsData;
