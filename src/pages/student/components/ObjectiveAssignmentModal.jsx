import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@lib/supabaseClient';
import useToast from '../../../hooks/useToast';

// Lightweight MathJax v3 loader and renderer (inline + display TeX)
let __mathjaxLoading = null;
const loadMathJax = () => {
  if (typeof window === 'undefined') return Promise.resolve(null);
  if (window.MathJax) return Promise.resolve(window.MathJax);
  if (__mathjaxLoading) return __mathjaxLoading;

  // Configure before injecting script so $...$ is recognized
  window.MathJax = window.MathJax || {
    tex: {
      inlineMath: [['$', '$'], ['\\(', '\\)']],
      displayMath: [['$$', '$$'], ['\\[', '\\]']],
      processEscapes: true,
    },
    options: {
      skipHtmlTags: ['script', 'noscript', 'style', 'textarea', 'code', 'pre'],
    },
  };

  __mathjaxLoading = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js';
    script.async = true;
    script.onload = () => resolve(window.MathJax);
    script.onerror = reject;
    document.head.appendChild(script);
  });
  return __mathjaxLoading;
};

// Renders text that may contain TeX delimiters using MathJax
const MathText = ({ text = '', as = 'span', className = '' }) => {
  const ref = React.useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Use textContent to avoid XSS; MathJax will parse TeX delimiters from text nodes
    el.textContent = text || '';
    let canceled = false;
    loadMathJax().then((MJ) => {
      if (canceled) return;
      if (MJ && typeof MJ.typesetPromise === 'function') {
        MJ.typesetPromise([el]).catch(() => {});
      }
    });
    return () => { canceled = true; };
  }, [text]);

  const Comp = as;
  return <Comp ref={ref} className={className} />;
};

const Option = ({ letter, label, checked, onChange }) => (
  <label className="flex items-start gap-3 text-sm p-2 rounded border border-slate-200 hover:bg-slate-50 cursor-pointer w-full">
    <input type="radio" checked={checked} onChange={onChange} className="accent-emerald-600 mt-1" />
    {typeof letter === 'string' && letter.length > 0 && (
      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold">
        {letter}
      </span>
    )}
    <MathText text={String(label ?? '')} className="text-slate-800 flex-1 min-w-0 break-words whitespace-pre-wrap" />
  </label>
);

const ObjectiveAssignmentModal = ({ open, assignment, studentId, onClose, onSubmitted, submitFn }) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState([]);
  const [error, setError] = useState(null);
  const { showToast } = useToast();

  // Normalize options to an array of strings for MCQ rendering
  const normalizeOptions = (opts) => {
    if (!opts) return [];
    if (Array.isArray(opts)) {
      // If array of objects, try to extract a label
      if (opts.length > 0 && typeof opts[0] === 'object' && opts[0] !== null) {
        return opts.map((o) => o?.label ?? o?.text ?? o?.value ?? JSON.stringify(o));
      }
      return opts;
    }
    // If stored as JSON string
    if (typeof opts === 'string') {
      try {
        const parsed = JSON.parse(opts);
        return normalizeOptions(parsed);
      } catch (_) {
        return [opts];
      }
    }
    // Fallback: stringify unknown shapes
    return [String(opts)];
  };

  useEffect(() => {
    let mounted = true;
    const fetch = async () => {
      if (!open || !assignment?.id) return;
      setLoading(true);
      setError(null);
      try {
        // Primary: SECURITY DEFINER RPC
        let qs = [];
        try {
          const { data, error } = await supabase.rpc('rpc_list_questions_for_current_student', { assignment_id: assignment.id });
          if (error) throw error;
          qs = Array.isArray(data) ? data : [];
        } catch (rpcErr) {
          // Fallback: direct table read (requires appropriate RLS)
          const { data: direct, error: dirErr } = await supabase
            .from('assignment_questions')
            .select('id, assignment_id, type, text, options, points, order_index')
            .eq('assignment_id', assignment.id)
            .order('order_index', { ascending: true });
          if (dirErr) throw rpcErr; // surface original RPC error if direct fails
          qs = Array.isArray(direct) ? direct : [];
        }

        // Normalize options for MCQ
        const normalized = qs.map((q) => ({
          ...q,
          options: normalizeOptions(q.options),
        }));

        if (!mounted) return;
        setQuestions(normalized);
        setAnswers(new Array(normalized.length).fill(null));
      } catch (e) {
        if (mounted) setError(e);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetch();
    return () => { mounted = false; };
  }, [open, assignment?.id]);

  const totalPoints = useMemo(() => (questions || []).reduce((sum, q) => sum + (q.points || 0), 0), [questions]);

  const handleChange = (idx, value) => {
    setAnswers((prev) => prev.map((v, i) => (i === idx ? value : v)));
  };

  const submit = async () => {
    if (!assignment?.id || !studentId) return;
    // Simple validation: ensure no null answers
    if ((answers || []).some((a) => a === null || a === undefined)) {
      showToast('Please answer all questions before submitting.', 'error');
      return;
    }
    setSaving(true);
    try {
      const resp = await submitFn({ assignment_id: assignment.id, student_id: studentId, answers });
      if (resp?.success) {
        const { auto_score, total_score } = resp.data || {};
        onSubmitted?.({ auto_score, total_score });
        onClose?.();
      } else {
        showToast(resp?.error || 'Failed to submit.', 'error');
      }
    } catch (e) {
      console.error(e);
      showToast('Failed to submit.', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (!open || !assignment) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-lg w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="bg-emerald-600 text-white p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg sm:text-xl font-bold break-words">{assignment.title}</h3>
              <p className="text-emerald-100 text-sm sm:text-base">Objective • {assignment.subjectName}</p>
            </div>
            <button onClick={onClose} className="text-white hover:text-emerald-200 transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-4 sm:p-6 flex-1 overflow-y-auto overflow-x-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <div className="text-red-500 mb-2">Failed to load questions.</div>
              <div className="text-slate-600 text-sm">{String(error)}</div>
            </div>
          ) : (questions || []).length === 0 ? (
            <div className="text-center py-12">
              <div className="text-slate-400 text-4xl mb-3">📝</div>
              <h3 className="text-lg font-medium text-slate-800 mb-2">No Questions Found</h3>
              <p className="text-slate-600">Please contact your teacher.</p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="text-sm text-slate-600">Total Points: <span className="font-semibold text-slate-800">{totalPoints}</span></div>
              {(questions || []).map((q, idx) => (
                <div key={q.id || idx} className="border rounded-lg p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="text-sm sm:text-base font-medium text-slate-800 flex-1 min-w-0 break-words whitespace-pre-wrap">
                      <MathText text={`${idx + 1}. ${q.text || ''}`} />
                    </div>
                    <div className="text-xs text-slate-500 shrink-0">{q.points} pts</div>
                  </div>
                  <div className="mt-3 space-y-2">
                    {String(q.type) === 'mcq' && Array.isArray(q.options) && q.options.slice(0, 4).map((opt, i) => (
                      <Option key={i} letter={'ABCD'[i]} label={opt} checked={answers[idx] === i} onChange={() => handleChange(idx, i)} />
                    ))}
                    {String(q.type) === 'true_false' && (
                      <div className="flex flex-col sm:flex-row gap-2 sm:gap-6 w-full">
                        <Option label="True" checked={answers[idx] === true} onChange={() => handleChange(idx, true)} />
                        <Option label="False" checked={answers[idx] === false} onChange={() => handleChange(idx, false)} />
                      </div>
                    )}
                    {String(q.type) === 'short_answer' && (
                      <input
                        type="text"
                        value={answers[idx] ?? ''}
                        onChange={(e) => handleChange(idx, e.target.value)}
                        className="w-full border rounded px-3 py-2 text-sm"
                        placeholder="Your answer"
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-slate-50 px-4 sm:px-6 py-3 sm:py-4 border-t border-slate-200">
          <div className="flex justify-end gap-2">
            <button onClick={onClose} className="border border-slate-300 text-slate-700 px-4 py-2 rounded-lg hover:bg-slate-50 transition-colors font-medium text-sm">Cancel</button>
            <button onClick={submit} disabled={saving || loading || (questions || []).length === 0} className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed">
              {saving ? 'Submitting...' : 'Submit Answers'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ObjectiveAssignmentModal;
