import React from 'react';
import 'katex/dist/katex.min.css';
import renderMathInElement from 'katex/contrib/auto-render/auto-render.js';

/********************* KaTeX Preview *********************/
const MathPreview = ({ text }) => {
  const ref = React.useRef(null);
  React.useEffect(() => {
    const el = ref.current; if (!el) return;
    el.textContent = text || '';
    try {
      renderMathInElement(el, {
        delimiters: [
          { left: '$$', right: '$$', display: true },
          { left: '\\[', right: '\\]', display: true },
          { left: '$', right: '$', display: false },
          { left: '\\(', right: '\\)', display: false },
        ],
        throwOnError: false,
      });
    } catch (_) {}
  }, [text]);
  return <div ref={ref} className="whitespace-pre-wrap" />;
};

/********************* Editor Manager (Context) *********************/
const EditorContext = React.createContext(null);
const useEditorManager = () => {
  const ctx = React.useContext(EditorContext);
  if (!ctx) throw new Error('useEditorManager must be used within <EditorProvider>');
  return ctx;
};

const EditorProvider = ({ children }) => {
  const registryRef = React.useRef(new Map()); // id -> handler
  const [activeEditorId, setActiveEditorId] = React.useState(null);
  const valuesRef = React.useRef(new Map()); // id -> current text value

  const registerEditor = React.useCallback((id, handler) => {
    registryRef.current.set(id, handler);
    return () => registryRef.current.delete(id);
  }, []);

  const setEditorValue = React.useCallback((id, val) => {
    valuesRef.current.set(id, String(val ?? ''));
  }, []);

  const getEditorValue = React.useCallback((id) => {
    if (!id) return '';
    return valuesRef.current.get(id) || '';
  }, []);

  const dispatch = React.useCallback((command, payload) => {
    const handler = registryRef.current.get(activeEditorId);
    if (typeof handler === 'function') handler(command, payload);
  }, [activeEditorId]);

  const value = React.useMemo(() => ({ activeEditorId, setActiveEditorId, registerEditor, dispatch, setEditorValue, getEditorValue }), [activeEditorId, registerEditor, dispatch, setEditorValue, getEditorValue]);
  return <EditorContext.Provider value={value}>{children}</EditorContext.Provider>;
};

/********************* Global Toolbar *********************/
const GlobalToolbar = () => {
  const { dispatch, activeEditorId } = useEditorManager();
  const prevent = (e) => { e.preventDefault(); e.stopPropagation(); };
  const insert = (s) => dispatch('insertSnippet', s);
  const wrap = (mode) => dispatch('convertSelection', { mode });

  // Template catalogs
  const templates1 = [
    { label: '×', code: ' × ' },{ label: '÷', code: ' ÷ ' },{ label: '±', code: ' ± ' },{ label: '√', code: ' √ ' },{ label: 'π', code: ' π ' },{ label: 'θ', code: ' θ ' },{ label: '≤', code: ' ≤ ' },{ label: '≥', code: ' ≥ ' },{ label: '≈', code: ' ≈ ' },{ label: '→', code: ' → ' },{ label: '°', code: ' ° ' },
  ];
  const templates2 = [
    { label: 'Fraction', code: ' $\\frac{a}{b}$ ' },
    { label: 'Root', code: ' $\\sqrt{x}$ ' },
    { label: '×10^n', code: ' $a \\times 10^{n}$ ' },
    { label: 'Power x^n', code: ' $x^{n}$ ' },
    { label: 'Subscript x_n', code: ' $x_{n}$ ' },
    { label: 'dy/dx', code: ' $\\frac{dy}{dx}$ ' },
    { label: '∫ f(x) dx', code: ' $\\int f(x) \, dx$ ' },
    { label: '∑', code: ' $\\sum_{i=1}^{n}$ ' },
    { label: 'lim', code: ' $\\lim_{x \\to 0}$ ' },
    { label: '→v', code: ' $\\vec{v}$ ' },
    { label: 'log_a(x)', code: ' $\\log_{a}(x)$ ' },
  ];

  return (
    <div className="p-2 bg-slate-50 border rounded text-xs flex flex-wrap gap-2 items-center"
         onMouseDown={prevent} onPointerDown={prevent}>
      <span className="text-slate-600">Toolbar</span>
      <span className="text-slate-400">•</span>
      <span className="text-slate-500">Active:</span>
      <span className="font-medium">{activeEditorId || '—'}</span>
      <span className="ml-2 text-slate-500">Quick:</span>
      {templates1.map(t => (
        <button key={t.label} type="button" className="px-2 py-1 border rounded" onClick={() => insert(t.code)}>{t.label}</button>
      ))}
      <span className="ml-2 text-slate-500">Sup/Sub:</span>
      <button type="button" className="px-2 py-1 border rounded" onClick={() => wrap('sup')}>xⁿ</button>
      <button type="button" className="px-2 py-1 border rounded" onClick={() => wrap('sub')}>xₙ</button>
      <span className="ml-2 text-slate-500">Templates:</span>
      {templates2.map(t => (
        <button key={t.label} type="button" className="px-2 py-1 border rounded" onClick={() => insert(t.code)}>{t.label}</button>
      ))}
    </div>
  );
};

/********************* Editor Field (per-field) *********************/
const SUPERS = { '0':'⁰','1':'¹','2':'²','3':'³','4':'⁴','5':'⁵','6':'⁶','7':'⁷','8':'⁸','9':'⁹' };
const SUBS   = { '0':'₀','1':'₁','2':'₂','3':'₃','4':'₄','5':'₅','6':'₆','7':'₇','8':'₈','9':'₉' };
const mapDigits = (s, map) => s.replace(/[0-9]/g, d => map[d] || d);

const EditorField = ({ id, label, value, onChange, multiline = false, placeholder = '' }) => {
  const { registerEditor, setActiveEditorId, setEditorValue } = useEditorManager();
  const inputRef = React.useRef(null);
  const selRef = React.useRef({ start: null, end: null });

  React.useEffect(() => {
    // keep provider value map in sync
    try { setEditorValue(id, value); } catch(_) {}
  }, [id, value, setEditorValue]);

  React.useEffect(() => {
    const handler = (command, payload) => {
      const el = inputRef.current;
      const v = String((el?.value ?? value) || '');
      const start = (el?.selectionStart ?? selRef.current.start ?? v.length);
      const end = (el?.selectionEnd ?? selRef.current.end ?? start);

      if (command === 'insertSnippet') {
        const snippet = typeof payload === 'string' ? payload : '';
        const next = v.slice(0, start) + snippet + v.slice(end);
        onChange(next);
        requestAnimationFrame(() => { try { el?.focus(); el.selectionStart = el.selectionEnd = start + snippet.length; } catch(_) {} });
      }
      if (command === 'convertSelection') {
        const mode = payload?.mode === 'sub' ? 'sub' : 'sup';
        if (start === end) return;
        const converted = mapDigits(v.slice(start, end), mode === 'sup' ? SUPERS : SUBS);
        const next = v.slice(0, start) + converted + v.slice(end);
        onChange(next);
        requestAnimationFrame(() => { try { el?.focus(); el.selectionStart = start; el.selectionEnd = start + converted.length; } catch(_) {} });
      }
    };
    return registerEditor(id, handler);
  }, [id, onChange, registerEditor]);

  const onSelect = (e) => { selRef.current = { start: e.target.selectionStart, end: e.target.selectionEnd }; };
  const Comp = multiline ? 'textarea' : 'input';

  return (
    <div className="space-y-1">
      {label ? (<div className="text-xs text-slate-600">{label}</div>) : null}
      <Comp
        ref={inputRef}
        onFocus={() => setActiveEditorId(id)}
        onSelect={onSelect}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={"w-full border rounded px-3 py-2 text-sm " + (multiline ? "min-h-[72px]" : "")}
      />
    </div>
  );
};

/********************* Question Row *********************/
const QuestionRow = ({ q, idx, onChange, onRemove, disabled = false, onlyShortAnswer = false }) => {
  const setQuestion = (text) => onChange({ text });
  const setOption = (i, val) => { const next = [...(q.options || [])]; next[i] = val; onChange({ options: next }); };

  return (
    <div className="border rounded-lg p-3 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">#{idx + 1}</span>
          {onlyShortAnswer ? (
            <span className="text-xs font-medium text-slate-700">Short Answer (Theory)</span>
          ) : (
            <select value={q.type} onChange={(e) => onChange({ type: e.target.value })} className="text-sm border rounded px-2 py-1" disabled={disabled}>
              <option value="mcq">Multiple Choice</option>
            </select>
          )}
        </div>
        {!disabled && (<button onClick={onRemove} className="text-red-600 text-xs border border-red-300 rounded px-2 py-1 hover:bg-red-50">Remove</button>)}
      </div>

      
      {/* Question field + preview */}
      <EditorField id={`q-${idx}`} label="Question" multiline value={q.text || ''} onChange={setQuestion} placeholder="Type question..." />
      <div className="text-xs text-slate-500">Preview:</div>
      <div className="p-2 bg-white border rounded text-sm"><MathPreview text={q.text || ''} /></div>

      {q.type === 'mcq' && (
        <div className="space-y-3">
          <div className="text-xs text-slate-600">Options</div>
          {(q.options || []).map((opt, i) => (
            <div key={i} className="space-y-1">
              <div className="flex items-center gap-2">
                <input type="radio" name={`correct-${idx}`} checked={q.correct_answer === i} onChange={() => onChange({ correct_answer: i })} disabled={disabled} />
                <EditorField id={`q-${idx}-opt-${i}`} label={`Option ${String.fromCharCode(65 + i)}`} value={opt || ''} onChange={(v) => setOption(i, v)} placeholder={`Type option ${String.fromCharCode(65 + i)}...`} />
              </div>
              <div className="pl-7 text-xs text-slate-500">Preview:</div>
              <div className="pl-7 p-2 bg-white border rounded text-sm"><MathPreview text={String(opt || '')} /></div>
            </div>
          ))}
          {!disabled && (
            <button type="button" onClick={() => onChange({ options: [...(q.options || []), ''] })} className="text-xs text-blue-700 border border-blue-300 rounded px-2 py-1 hover:bg-blue-50">+ Add option</button>
          )}
        </div>
      )}

      <div className="flex items-center gap-3">
        <label className="text-sm text-slate-700">Points</label>
        <input type="number" min={1} className="w-24 border rounded px-2 py-1 text-sm" value={q.points ?? 1} onChange={(e) => onChange({ points: Number(e.target.value || 1) })} disabled={disabled} />
      </div>
    </div>
  );
};

/********************* Active Field Indicator *********************/
const ActiveFieldIndicator = () => {
  const { activeEditorId } = useEditorManager();
  return <span className="font-medium">{activeEditorId || '—'}</span>;
};

/********************* Active Preview Bar *********************/
const ActivePreviewBar = () => {
  const { activeEditorId, getEditorValue } = useEditorManager();
  const text = activeEditorId ? (getEditorValue?.(activeEditorId) || '') : '';
  return (
    <div className="mt-2 border rounded p-2 bg-white">
      <div className="text-xs text-slate-500 mb-1">Live Preview (active field)</div>
      <MathPreview text={text} />
    </div>
  );
};

/********************* Modal *********************/
const QuestionsEditorModal = ({ open, assignment, state, onAdd, onUpdate, onRemove, onSave, onClose, readOnly = false }) => {
  if (!open || !assignment) return null;
  const subject = assignment?.subjectName || assignment?.subjects?.name || assignment?.subject?.name || assignment?.subject;
  const className = assignment?.className || assignment?.classes?.name;
  const isObjective = String(assignment?.type).toLowerCase() === 'objective';
  const onlyShortAnswer = !isObjective;

  // Show toolbar only when teacher wants it; default hidden. Gate by science subjects.
  const [showToolbar, setShowToolbar] = React.useState(false);
  const subjLc = String(subject || '').toLowerCase();
  const SCIENCE_SUBJECTS = ['math', 'mathematics', 'further mathematics', 'physics', 'chemistry', 'biology', 'computer', 'basic science', 'science', 'technical drawing'];
  const isScience = SCIENCE_SUBJECTS.some((s) => subjLc.includes(s));

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[70] p-4">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <div className="bg-emerald-600 text-white p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg sm:text-xl font-bold">Set Questions</h3>
              <p className="text-emerald-100 text-sm sm:text-base">{assignment.title} • {subject} • {className}</p>
            </div>
            <button onClick={onClose} className="text-white hover:text-emerald-200 transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        </div>

        <EditorProvider>
          <div className="p-4 sm:p-6 overflow-y-auto max-h-[calc(90vh-120px)] space-y-4">
            {/* Toolbar toggle for Science teachers */}
            {isScience && !readOnly && (
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setShowToolbar((v) => !v)}
                  className="text-xs sm:text-sm border border-slate-300 rounded px-3 py-1.5 hover:bg-slate-50"
                >
                  {showToolbar ? 'Hide Math Toolbar' : 'Show Math Toolbar'}
                </button>
                <span className="text-xs text-slate-500">Active field: <ActiveFieldIndicator /></span>
              </div>
            )}

            {showToolbar && !readOnly && (
              <GlobalToolbar />
            )}

            {/* Always show a live preview bar for the active field */}
            <ActivePreviewBar />

            <div className="text-sm text-slate-600">{isObjective ? (
              <>Total Points: <span className="font-semibold text-slate-800">{state.totalPoints}</span></>
            ) : (
              <>Theory Mode: Create Short Answer prompts that students will answer in free text and you will grade manually.</>
            )}</div>

            {(state.questions || []).map((q, idx) => (
              <QuestionRow
                key={q.id ?? `new-${idx}`}
                q={q}
                idx={idx}
                onChange={(patch) => {
                  const enforced = onlyShortAnswer ? { ...patch, type: 'short_answer', options: [], correct_answer: null } : patch;
                  onUpdate(idx, enforced);
                }}
                onRemove={() => onRemove(idx)}
                disabled={readOnly}
                onlyShortAnswer={onlyShortAnswer}
              />
            ))}

            {state.loading && (<div className="text-center py-6 text-slate-500 text-sm">Loading questions...</div>)}

            {!readOnly && (
              isObjective ? (
                <div className="flex flex-wrap gap-2 pt-2"><button onClick={() => onAdd('mcq')} className="bg-slate-800 text-white px-3 py-2 rounded text-sm hover:bg-slate-700">+ Add MCQ</button></div>
              ) : (
                <div className="flex flex-wrap gap-2 pt-2"><button onClick={() => onAdd('short_answer')} className="bg-slate-800 text-white px-3 py-2 rounded text-sm hover:bg-slate-700">+ Add Short Answer</button></div>
              )
            )}
          </div>
        </EditorProvider>

        <div className="bg-slate-50 px-4 sm:px-6 py-3 sm:py-4 border-t border-slate-200">
          <div className="flex justify-end gap-2">
            <button onClick={onClose} className="border border-slate-300 text-slate-700 px-4 py-2 rounded-lg hover:bg-slate-50 transition-colors font-medium text-sm">Close</button>
            {!readOnly && (<button onClick={onSave} disabled={state.saving} className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed">{state.saving ? 'Saving...' : 'Save Questions'}</button>)}
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuestionsEditorModal;
