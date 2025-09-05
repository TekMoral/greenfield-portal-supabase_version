import React from 'react';

const QuestionRow = ({ q, idx, onChange, onRemove, disabled = false, onlyShortAnswer = false }) => {
  return (
    <div className="border rounded-lg p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">#{idx + 1}</span>
          {onlyShortAnswer ? (
            <span className="text-xs font-medium text-slate-700">Short Answer (Theory)</span>
          ) : (
            <select
              value={q.type}
              onChange={(e) => onChange({ type: e.target.value })}
              className="text-sm border rounded px-2 py-1"
              disabled={disabled}
            >
              <option value="mcq">Multiple Choice</option>
              <option value="short_answer">Short Answer</option>
              <option value="true_false">True/False</option>
            </select>
          )}
        </div>
        {!disabled && (
          <button onClick={onRemove} className="text-red-600 text-xs border border-red-300 rounded px-2 py-1 hover:bg-red-50">Remove</button>
        )}
      </div>
      <textarea
        className="w-full border rounded px-3 py-2 text-sm"
        placeholder="Enter question text..."
        value={q.text}
        onChange={(e) => onChange({ text: e.target.value })}
        readOnly={disabled}
      />

      {q.type === 'mcq' && (
        <div className="space-y-2">
          <div className="text-xs text-slate-600">Options</div>
          {(q.options || []).map((opt, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                type="radio"
                name={`correct-${idx}`}
                checked={q.correct_answer === i}
                onChange={() => onChange({ correct_answer: i })}
                disabled={disabled}
              />
              <input
                type="text"
                className="flex-1 border rounded px-2 py-1 text-sm"
                placeholder={`Option ${i + 1}`}
                value={opt}
                onChange={(e) => {
                  const next = [...(q.options || [])];
                  next[i] = e.target.value;
                  onChange({ options: next });
                }}
                readOnly={disabled}
                disabled={disabled}
              />
            </div>
          ))}
          {!disabled && (
            <button
              type="button"
              onClick={() => onChange({ options: [...(q.options || []), ''] })}
              className="text-xs text-blue-700 border border-blue-300 rounded px-2 py-1 hover:bg-blue-50"
            >
              + Add option
            </button>
          )}
        </div>
      )}

      {q.type === 'true_false' && (
        <div className="flex items-center gap-3 text-sm">
          <label className="flex items-center gap-1">
            <input type="radio" name={`tf-${idx}`} checked={q.correct_answer === true} onChange={() => onChange({ correct_answer: true })} disabled={disabled} /> True
          </label>
          <label className="flex items-center gap-1">
            <input type="radio" name={`tf-${idx}`} checked={q.correct_answer === false} onChange={() => onChange({ correct_answer: false })} disabled={disabled} /> False
          </label>
        </div>
      )}

      <div className="flex items-center gap-3">
        <label className="text-sm text-slate-700">Points</label>
        <input
          type="number"
          min={1}
          className="w-24 border rounded px-2 py-1 text-sm"
          value={q.points ?? 1}
          onChange={(e) => onChange({ points: Number(e.target.value || 1) })}
          disabled={disabled}
        />
      </div>
    </div>
  );
};

const QuestionsEditorModal = ({ open, assignment, state, onAdd, onUpdate, onRemove, onSave, onClose, readOnly = false }) => {
  if (!open || !assignment) return null;
  const subject = assignment?.subjectName || assignment?.subjects?.name || assignment?.subject?.name || assignment?.subject;
  const className = assignment?.className || assignment?.classes?.name;
  const isObjective = String(assignment?.type).toLowerCase() === 'objective';
  const onlyShortAnswer = !isObjective;

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
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-4 sm:p-6 overflow-y-auto max-h-[calc(90vh-120px)] space-y-4">
          <div className="text-sm text-slate-600">{isObjective ? (
            <>Total Points: <span className="font-semibold text-slate-800">{state.totalPoints}</span></>
          ) : (
            <>Theory Mode: Create Short Answer prompts that students will answer in free text and you will grade manually.</>
          )}</div>
          {readOnly && (
            <div className="mt-2 bg-yellow-50 border border-yellow-200 text-yellow-800 text-sm rounded p-3">
              This assignment is published. Questions are locked for editing. You can view questions but cannot modify them.
            </div>
          )}

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

          {state.loading && (
            <div className="text-center py-6 text-slate-500 text-sm">Loading questions...</div>
          )}

          {!readOnly && (
            isObjective ? (
              <div className="flex flex-wrap gap-2 pt-2">
                <button onClick={() => onAdd('mcq')} className="bg-slate-800 text-white px-3 py-2 rounded text-sm hover:bg-slate-700">+ Add MCQ</button>
                <button onClick={() => onAdd('short_answer')} className="bg-slate-800 text-white px-3 py-2 rounded text-sm hover:bg-slate-700">+ Add Short Answer</button>
                <button onClick={() => onAdd('true_false')} className="bg-slate-800 text-white px-3 py-2 rounded text-sm hover:bg-slate-700">+ Add True/False</button>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2 pt-2">
                <button onClick={() => onAdd('short_answer')} className="bg-slate-800 text-white px-3 py-2 rounded text-sm hover:bg-slate-700">+ Add Short Answer</button>
              </div>
            )
          )}
        </div>

        <div className="bg-slate-50 px-4 sm:px-6 py-3 sm:py-4 border-t border-slate-200">
          <div className="flex justify-end gap-2">
            <button onClick={onClose} className="border border-slate-300 text-slate-700 px-4 py-2 rounded-lg hover:bg-slate-50 transition-colors font-medium text-sm">Close</button>
            {!readOnly && (
              <button onClick={onSave} disabled={state.saving} className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed">
                {state.saving ? 'Saving...' : 'Save Questions'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuestionsEditorModal;
