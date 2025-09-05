import { useEffect, useMemo, useState } from 'react';
import { getAssignmentQuestions, upsertAssignmentQuestions, deleteAssignmentQuestion } from '../../../../../services/supabase/assignmentQuestionsService';

const emptyQuestion = () => ({ id: undefined, type: 'mcq', text: '', options: ['', '', '', ''], correct_answer: 0, points: 1 });

const useAssignmentQuestions = (assignment) => {
  const assignmentId = assignment?.id;
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    const fetch = async () => {
      if (!assignmentId) return;
      setLoading(true);
      setError(null);
      try {
        const res = await getAssignmentQuestions(assignmentId);
        const rows = res?.success ? res.data : [];
        if (!mounted) return;
        // normalize MCQ options to array
        const normalized = (rows || []).map((q) => ({
          ...q,
          options: Array.isArray(q.options)
            ? q.options
            : (typeof q.options === 'string' ? JSON.parse(q.options || '[]') : []),
        }));
        setQuestions(normalized);
      } catch (e) {
        if (mounted) setError(e);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetch();
    return () => { mounted = false; };
  }, [assignmentId]);

  const addQuestion = (type = 'mcq') => {
    const base = emptyQuestion();
    base.type = type;
    if (type !== 'mcq') {
      base.options = [];
      base.correct_answer = null;
    }
    setQuestions((prev) => [...prev, base]);
  };

  const updateQuestion = (index, patch) => {
    setQuestions((prev) => prev.map((q, i) => (i === index ? { ...q, ...patch } : q)));
  };

  const removeQuestion = async (index) => {
    const q = questions[index];
    setQuestions((prev) => prev.filter((_, i) => i !== index));
    if (q?.id) {
      try {
        await deleteAssignmentQuestion(q.id);
      } catch (_) {
        // ignore
      }
    }
  };

  const totalPoints = useMemo(() => (questions || []).reduce((sum, q) => sum + (q.points || 0), 0), [questions]);

  const save = async () => {
    if (!assignmentId) return;
    setSaving(true);
    try {
      // attach order_index
      const withOrder = (questions || []).map((q, idx) => ({ ...q, order_index: idx }));
      const res = await upsertAssignmentQuestions(withOrder, assignmentId);
      if (res?.success) {
        // refresh
        const saved = res.data.map((q) => ({
          ...q,
          options: Array.isArray(q.options) ? q.options : (typeof q.options === 'string' ? JSON.parse(q.options || '[]') : []),
        }));
        setQuestions(saved);
      }
    } finally {
      setSaving(false);
    }
  };

  return {
    loading,
    saving,
    error,
    questions,
    setQuestions,
    addQuestion,
    updateQuestion,
    removeQuestion,
    save,
    totalPoints,
  };
};

export default useAssignmentQuestions;
