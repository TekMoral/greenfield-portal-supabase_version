// src/services/supabase/adminAttendanceService.js
// Admin-only attendance service (RPC-first, RLS-aware via SECURITY DEFINER)
// Returns { success, data, error } consistently

import { supabase } from '../../lib/supabaseClient'

// Normalize filter payload and keep compatibility across snake/camel case
function buildFilterPayload(filters = {}) {
  const { from, to, classId, subjectId, studentId } = filters || {}
  const compact = (obj) => Object.fromEntries(Object.entries(obj).filter(([_, v]) => v !== undefined && v !== null && v !== ''))

  const base = compact({ from, to, classId, subjectId, studentId })

  // Also include snake_case aliases to maximize RPC compatibility
  const snake = compact({
    from_date: from,
    to_date: to,
    class_id: classId,
    subject_id: subjectId,
    student_id: studentId,
  })

  return { ...snake, ...base }
}

// Validate that rows is a non-empty array
function validateRows(rows) {
  if (!Array.isArray(rows) || rows.length === 0) {
    return { ok: false, error: 'rows must be a non-empty array' }
  }
  return { ok: true }
}

export async function upsertBulk(rows, options = {}) {
  try {
    const valid = validateRows(rows)
    if (!valid.ok) return { success: false, error: valid.error }

    const finalize = options.finalize !== undefined ? Boolean(options.finalize) : true

    const { data, error } = await supabase.rpc('rpc_admin_upsert_attendance', {
      rows,
      finalize,
    })

    if (error) {
      console.error('[adminAttendanceService.upsertBulk] RPC error:', error)
      return { success: false, error: error.message }
    }

    return { success: true, data: data || [] }
  } catch (err) {
    console.error('[adminAttendanceService.upsertBulk] Error:', err)
    return { success: false, error: err.message }
  }
}

export async function listRange(filters = {}) {
  try {
    const payload = buildFilterPayload(filters)

    const { data, error } = await supabase.rpc('rpc_admin_list_attendance', {
      filters: payload,
    })

    if (error) {
      console.error('[adminAttendanceService.listRange] RPC error:', error)
      return { success: false, error: error.message }
    }

    return { success: true, data: Array.isArray(data) ? data : [] }
  } catch (err) {
    console.error('[adminAttendanceService.listRange] Error:', err)
    return { success: false, error: err.message }
  }
}

// Optional helper: summarize by class
export async function summaryByClass(filters = {}) {
  const res = await listRange(filters)
  if (!res.success) return res

  const rows = res.data || []
  const byClass = {}

  for (const r of rows) {
    const classId = r.class_id ?? r.classId
    const className = r.classes?.name ?? r.class_name ?? r.className ?? 'Unknown'
    if (!byClass[classId]) {
      byClass[classId] = { classId, className, total: 0, present: 0, absent: 0, excused: 0 }
    }
    const status = String(r.status || '').toLowerCase()
    byClass[classId].total += 1
    if (status === 'present') byClass[classId].present += 1
    else if (status === 'absent') byClass[classId].absent += 1
    else if (status === 'excused') byClass[classId].excused += 1
  }

  const summary = Object.values(byClass).map((s) => ({
    ...s,
    attendanceRate: s.total > 0 ? Math.round((s.present / s.total) * 100) : 0,
  }))

  return { success: true, data: summary }
}

// Optional helper: summarize by date across a range
export async function summaryByDateRange(filters = {}) {
  const res = await listRange(filters)
  if (!res.success) return res

  const rows = res.data || []
  const byDate = {}

  for (const r of rows) {
    const date = r.date
    if (!byDate[date]) {
      byDate[date] = { date, total: 0, present: 0, absent: 0, excused: 0 }
    }
    const status = String(r.status || '').toLowerCase()
    byDate[date].total += 1
    if (status === 'present') byDate[date].present += 1
    else if (status === 'absent') byDate[date].absent += 1
    else if (status === 'excused') byDate[date].excused += 1
  }

  const summary = Object.values(byDate).map((s) => ({
    ...s,
    attendanceRate: s.total > 0 ? Math.round((s.present / s.total) * 100) : 0,
  }))

  return { success: true, data: summary }
}

// Default export as service object
export const adminAttendanceService = {
  upsertBulk,
  listRange,
  summaryByClass,
  summaryByDateRange,
}

export default adminAttendanceService