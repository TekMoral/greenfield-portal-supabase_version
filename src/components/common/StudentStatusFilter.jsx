import React, { useEffect, useMemo, useState } from 'react'

/**
 * Centralized hook to manage student status filtering (active-only vs include graduated).
 * - Avoids duplicating toggle logic across pages
 * - Optionally syncs with the URL query string for shareable links and persistence
 */
export function useStudentStatusFilter({
  defaultIncludeGraduated = false,
  syncToQuery = true,
  queryKey = 'includeGraduated'
} = {}) {
  const getInitialFromQuery = () => {
    try {
      if (!syncToQuery || typeof window === 'undefined') return defaultIncludeGraduated
      const sp = new URLSearchParams(window.location.search)
      const raw = sp.get(queryKey)
      if (raw == null) return defaultIncludeGraduated
      return raw === '1' || raw === 'true'
    } catch (_) {
      return defaultIncludeGraduated
    }
  }

  const [includeGraduated, setIncludeGraduated] = useState(getInitialFromQuery)

  // Keep URL in sync (replaceState to avoid history pollution)
  useEffect(() => {
    if (!syncToQuery || typeof window === 'undefined') return
    try {
      const url = new URL(window.location.href)
      if (includeGraduated) {
        url.searchParams.set(queryKey, '1')
      } else {
        url.searchParams.delete(queryKey)
      }
      window.history.replaceState({}, '', url.toString())
    } catch (_) {
      /* noop */
    }
  }, [includeGraduated, queryKey, syncToQuery])

  const options = useMemo(() => ({ includeGraduated }), [includeGraduated])
  const toggle = () => setIncludeGraduated(v => !v)

  return { includeGraduated, setIncludeGraduated, toggle, options }
}

/**
 * Simple, reusable UI control for the status filter.
 * Controlled by default (value + onChange). If not provided, it manages its own state.
 */
export function StudentStatusFilter({
  value,
  onChange,
  label = 'Include Graduated',
  helperText = 'Show alumni in results',
  className = '',
  defaultIncludeGraduated = false,
  syncToQuery = true,
  queryKey = 'includeGraduated'
}) {
  const controlled = typeof value === 'boolean' && typeof onChange === 'function'
  const hook = useStudentStatusFilter({ defaultIncludeGraduated, syncToQuery, queryKey })
  const current = controlled ? value : hook.includeGraduated
  const setValue = controlled ? onChange : hook.setIncludeGraduated

  return (
    <div className={`flex items-start space-x-3 ${className}`}>
      <button
        type="button"
        onClick={() => setValue(!current)}
        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-green-500 ${
          current ? 'bg-green-600' : 'bg-slate-300'
        }`}
        aria-pressed={current}
        aria-label={label}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
            current ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
      <div className="select-none">
        <div
          className="text-sm font-medium text-slate-800 cursor-pointer"
          onClick={() => setValue(!current)}
        >
          {label}
        </div>
        {helperText ? (
          <div className="text-xs text-slate-500">{helperText}</div>
        ) : null}
      </div>
    </div>
  )
}

export default StudentStatusFilter
