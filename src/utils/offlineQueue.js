// src/utils/offlineQueue.js
// Lightweight offline outbox for attendance batches
// - Stores pending attendance upserts locally when offline or network fails
// - Attempts sync on demand or when the browser comes online
//
// Storage strategy: localStorage with in-memory fallback
// Note: We avoid using this for auth/session per project guidelines; this is domain data with explicit UI controls.

import { adminAttendanceService } from '../services/supabase/adminAttendanceService'

const STORAGE_KEY = 'attendance_outbox_v1'

const memory = { outbox: [] }
const listeners = new Set()

function safeParse(json) {
  try {
    return JSON.parse(json)
  } catch (_) {
    return null
  }
}

function loadOutbox() {
  // Prefer cached in memory to avoid repeated JSON parse
  if (Array.isArray(memory.outbox) && memory.outbox.length > 0) return memory.outbox
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const parsed = safeParse(raw)
    if (Array.isArray(parsed)) {
      memory.outbox = parsed
      return memory.outbox
    }
  } catch (_) {}
  // Default empty array
  memory.outbox = Array.isArray(memory.outbox) ? memory.outbox : []
  return memory.outbox
}

function saveOutbox(items) {
  memory.outbox = Array.isArray(items) ? items : []
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(memory.outbox))
  } catch (_) {
    // Ignore quota or access errors; memory fallback remains
  }
  notify()
}

function notify() {
  const count = memory.outbox.length
  for (const cb of listeners) {
    try { cb(count) } catch (_) {}
  }
}

export function getAttendanceOutboxCount() {
  return loadOutbox().length
}

export function subscribeAttendanceOutbox(callback) {
  if (typeof callback !== 'function') return () => {}
  listeners.add(callback)
  // Fire once with current value
  try { callback(getAttendanceOutboxCount()) } catch (_) {}
  return () => listeners.delete(callback)
}

export function clearAttendanceOutbox() {
  saveOutbox([])
}

export function enqueueAttendanceBatch(rows, { finalize = true, meta = {} } = {}) {
  if (!Array.isArray(rows) || rows.length === 0) return null
  const batch = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    kind: 'attendance',
    createdAt: new Date().toISOString(),
    finalize: Boolean(finalize),
    meta: meta && typeof meta === 'object' ? meta : {},
    rows,
  }
  const out = loadOutbox().slice()
  out.push(batch)
  saveOutbox(out)
  return batch.id
}

export function removeAttendanceBatch(id) {
  const out = loadOutbox().filter((b) => b.id !== id)
  saveOutbox(out)
}

function isLikelyNetworkError(err) {
  const msg = String(err?.message || err || '').toLowerCase()
  return (
    !navigator?.onLine ||
    msg.includes('failed to fetch') ||
    msg.includes('network') ||
    msg.includes('timeout') ||
    msg.includes('typeerror')
  )
}

export async function trySyncAttendanceOutbox(progressCallback) {
  const initial = loadOutbox().slice()
  if (initial.length === 0) {
    return { synced: 0, failed: 0, remaining: 0 }
  }
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return { synced: 0, failed: initial.length, remaining: initial.length }
  }

  let synced = 0
  const total = initial.length

  for (const batch of initial) {
    if (batch.kind !== 'attendance') continue
    try {
      const res = await adminAttendanceService.upsertBulk(batch.rows, { finalize: batch.finalize })
      if (res?.success) {
        removeAttendanceBatch(batch.id)
        synced += 1
        if (typeof progressCallback === 'function') {
          try { progressCallback({ synced, total, remaining: getAttendanceOutboxCount(), lastId: batch.id }) } catch (_) {}
        }
      } else {
        // If not success and it's not a network error, keep in outbox for later
        if (typeof progressCallback === 'function') {
          try { progressCallback({ synced, total, remaining: getAttendanceOutboxCount(), lastError: res?.error, lastId: batch.id }) } catch (_) {}
        }
      }
    } catch (err) {
      // Leave in outbox on any error; likely offline or server issue
      if (isLikelyNetworkError(err)) {
        // Break early if we went offline mid-sync
        break
      }
      if (typeof progressCallback === 'function') {
        try { progressCallback({ synced, total, remaining: getAttendanceOutboxCount(), lastError: err?.message, lastId: batch.id }) } catch (_) {}
      }
    }
  }

  return { synced, failed: getAttendanceOutboxCount(), remaining: getAttendanceOutboxCount() }
}
