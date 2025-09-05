import { useEffect, useMemo, useState } from 'react';
import { getTeacherClassesAndSubjects } from '../../../../../services/supabase/teacherStudentService';
import { getAssignmentsByTeacher } from '../../../../../services/supabase/assignmentService';

// Assignments are already normalized by the service facade

export const useAssignmentsData = (userId) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState('all');

  useEffect(() => {
    let mounted = true;
    const fetchData = async () => {
      if (!userId) {
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        // Load teacher classes + subjects (like MyClasses) and assignments
        const [classesRes, assignmentsRes] = await Promise.all([
          getTeacherClassesAndSubjects(userId),
          getAssignmentsByTeacher(userId),
        ]);

        const classes = classesRes?.success ? (classesRes.data || []) : (Array.isArray(classesRes) ? classesRes : []);
        const assignmentsData = assignmentsRes?.success ? (assignmentsRes.data || []) : (Array.isArray(assignmentsRes) ? assignmentsRes : []);

        // Build subjects array: subjectName + subjectId + classes taught for that subject
        const subjectMap = new Map();
        (classes || []).forEach((cls) => {
          (cls.subjectsTaught || []).forEach((s) => {
            const key = s.subjectName;
            if (!subjectMap.has(key)) {
              subjectMap.set(key, {
                subjectName: s.subjectName,
                subjectId: s.subjectId, // may be undefined if not available, but we keep it when present
                classes: [],
              });
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

        if (!mounted) return;
        setSubjects(Array.from(subjectMap.values()));
        setAssignments(assignmentsData || []);
      } catch (e) {
        if (!mounted) return;
        setError(e);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetchData();
    return () => {
      mounted = false;
    };
  }, [userId]);

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

  return {
    loading,
    error,
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
