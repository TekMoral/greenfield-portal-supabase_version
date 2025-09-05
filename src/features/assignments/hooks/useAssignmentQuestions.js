import { useEffect, useMemo, useState } from 'react';
import { getAssignmentQuestions, upsertAssignmentQuestions, deleteAssignmentQuestion } from '@features/assignments/api/questions';

const emptyQuestion = () => ({ id: undefined, type: 'mcq', text: '', options: ['', '', '', ''], correct_answer: 0, points: 1 });

const useAssignmentQuestions = (assignment) => {
  const assignmentId = assignment?.id;
  const isObjective = String(assignment?.type).toLowerCase() === 'objective';
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
        const coerced = !isObjective
          ? normalized.map((q) => ({ ...q, type: 'short_answer', options: [], correct_answer: null }))
          : normalized;
        setQuestions(coerced);
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
    if (!isObjective) {
      base.type = 'short_answer';
      base.options = [];
      base.correct_answer = null;
    } else {
      base.type = type;
      if (type !== 'mcq') {
        base.options = [];
        base.correct_answer = null;
      }
    }
    setQuestions((prev) => [...prev, base]);
  };

  const updateQuestion = (index, patch) => {
    setQuestions((prev) => prev.map((q, i) => {
      if (i !== index) return q;
      const safePatch = !isObjective ? { ...patch, type: 'short_answer', options: [], correct_answer: null } : patch;
      return { ...q, ...safePatch };
    }));
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
      let withOrder = (questions || []).map((q, idx) => ({ ...q, order_index: idx }));
      if (!isObjective) {
        withOrder = withOrder.map((q) => ({ ...q, type: 'short_answer', options: [], correct_answer: null }));
      }
      const res = await upsertAssignmentQuestions(withOrder, assignmentId);
      if (res?.success) {
        // refresh
        const saved = res.data.map((q) => ({
          ...q,
          options: Array.isArray(q.options) ? q.options : (typeof q.options === 'string' ? JSON.parse(q.options || '[]') : []),
        }));
        const coercedSaved = !isObjective
          ? saved.map((q) => ({ ...q, type: 'short_answer', options: [], correct_answer: null }))
          : saved;
        setQuestions(coercedSaved);
        console.log('Questions saved successfully:', saved.length, 'questions');
        // You can add a toast notification here if you have a toast system
        //toast.success(`${saved.length} questions saved successfully`);
      } else {
        console.error('Failed to save questions:', res?.error);
        alert(`Failed to save questions: ${res?.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error saving questions:', error);
      alert(`Error saving questions: ${error.message || 'Unknown error'}`);
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