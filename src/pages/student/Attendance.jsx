import React, { useState, useMemo, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../../hooks/useAuth'
import { adminAttendanceService } from '../../services/supabase/adminAttendanceService'
import { supabase } from '../../lib/supabaseClient'
import { formatDMY } from '../../utils/dateUtils'
import { useSettings } from '../../contexts/SettingsContext'
import { formatSessionBadge } from '../../utils/sessionUtils'

const fmt = (d) => (d ? new Date(d).toISOString().slice(0, 10) : '')
const todayISO = fmt(new Date())

// Attendance visibility TTL (2 weeks) - extended for backend cron testing
const ATTENDANCE_TTL_MS = 14 * 24 * 60 * 60 * 1000
const isExpired = (n) => {
  try {
    const created = new Date(n.created_at).getTime()
    if (!Number.isFinite(created)) return false
    return Date.now() - created > ATTENDANCE_TTL_MS
  } catch {
    return false
  }
}

export default function StudentAttendance() {
  const { user } = useAuth()
  const { academicYear: settingsYear, currentTerm } = useSettings()

  // Fetch term reports from notifications
  const { data: termReports = [], isLoading: loadingTermReports, refetch: refetchTermReports } = useQuery({
    queryKey: ['student-term-reports', user?.id],
    queryFn: async () => {
      if (!user?.id) return []
      
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('recipient_id', user.id)
        .in('type', ['term_attendance', 'mid_term_attendance'])
        .neq('status', 'archived')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching term reports:', error)
        return []
      }

      return data || []
    },
    enabled: !!user?.id
  })

  // Fetch custom range attendance reports
  const { data: rangeReports = [], isLoading: loadingRangeReports, refetch: refetchRangeReports } = useQuery({
    queryKey: ['student-range-reports', user?.id],
    queryFn: async () => {
      if (!user?.id) return []

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('recipient_id', user.id)
        .eq('type', 'attendance_range')
        .neq('status', 'archived')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching range reports:', error)
        return []
      }

      return data || []
    },
    enabled: !!user?.id
  })

  
  // Parse term report message to extract statistics
  const parseTermReport = (message) => {
    const lines = message.split('\n')
    const stats = {
      term: '',
      academicYear: '',
      totalDays: 0,
      present: 0,
      excused: 0,
      absent: 0,
      attendanceRate: 0,
      performance: ''
    }

    // Extract term and year from first line
    const termMatch = message.match(/(\w+)\s+(?:Mid-)?Term Attendance Report \((\d{4})\/(\d{4})\)/)
    if (termMatch) {
      stats.term = termMatch[1]
      stats.academicYear = `${termMatch[2]}/${termMatch[3]}`
    }
    const isMidTerm = /Mid-?Term Attendance Report/i.test(message)
    stats.kind = isMidTerm ? 'mid_term' : 'termly'

    // Extract statistics
    lines.forEach(line => {
      if (line.includes('Total School Days:')) {
        stats.totalDays = parseInt(line.match(/\d+/)?.[0] || '0')
      } else if (line.includes('Present:') && line.includes('days')) {
        stats.present = parseInt(line.match(/\d+/)?.[0] || '0')
      } else if (line.includes('Excused:') && line.includes('days')) {
        stats.excused = parseInt(line.match(/\d+/)?.[0] || '0')
      } else if (line.includes('Absent:') && line.includes('days')) {
        stats.absent = parseInt(line.match(/\d+/)?.[0] || '0')
      } else if (line.includes('Attendance Rate:')) {
        stats.attendanceRate = parseInt(line.match(/\d+/)?.[0] || '0')
      }
    })

    // Fallback: compute attendance rate if missing from message
    if ((!stats.attendanceRate || Number.isNaN(stats.attendanceRate)) && stats.totalDays > 0) {
      const attended = (stats.present || 0) + (stats.excused || 0)
      stats.attendanceRate = Math.round((attended / stats.totalDays) * 100)
    }

    // Derive performance: prioritize computed rate; fall back to markers only if rate is unavailable
    if (Number.isFinite(stats.attendanceRate) && stats.totalDays > 0) {
      if (stats.attendanceRate >= 95) {
        stats.performance = 'Excellent'
      } else if (stats.attendanceRate >= 90) {
        stats.performance = 'Good'
      } else if (stats.attendanceRate >= 75) {
        stats.performance = 'Fair'
      } else {
        stats.performance = 'Poor'
      }
    } else {
      if (message.includes('🌟 Excellent')) {
        stats.performance = 'Excellent'
      } else if (message.includes('✅ Good')) {
        stats.performance = 'Good'
      } else if (message.includes('⚠️ Fair')) {
        stats.performance = 'Fair'
      } else if (message.includes('🚨 Poor')) {
        stats.performance = 'Poor'
      } else {
        stats.performance = ''
      }
    }

    return stats
  }

  
  // Parse custom range report message
  const parseRangeReport = (message) => {
    const lines = message.split('\n')
    const stats = {
      totalDays: 0,
      present: 0,
      excused: 0,
      late: 0,
      absent: 0,
      attendanceRate: 0,
      performance: '',
      periodStart: '',
      periodEnd: ''
    }

    // Extract period
    const periodMatch = message.match(/📅\s*Period:\s*([^\n]+)\s*-\s*([^\n]+)/)
    if (periodMatch) {
      stats.periodStart = periodMatch[1].trim()
      stats.periodEnd = periodMatch[2].trim()
    }

    // Extract statistics
    lines.forEach(line => {
      if (line.includes('Total School Days:')) {
        stats.totalDays = parseInt(line.match(/\d+/)?.[0] || '0')
      } else if (line.includes('Present:') && line.includes('days')) {
        stats.present = parseInt(line.match(/\d+/)?.[0] || '0')
      } else if (line.includes('Excused:') && line.includes('days')) {
        stats.excused = parseInt(line.match(/\d+/)?.[0] || '0')
      } else if (line.includes('Late:') && line.includes('days')) {
        stats.late = parseInt(line.match(/\d+/)?.[0] || '0')
      } else if (line.includes('Absent:') && line.includes('days')) {
        stats.absent = parseInt(line.match(/\d+/)?.[0] || '0')
      } else if (line.includes('Attendance Rate:')) {
        stats.attendanceRate = parseInt(line.match(/\d+/)?.[0] || '0')
      }
    })

    // Fallback rate computation
    if ((!stats.attendanceRate || Number.isNaN(stats.attendanceRate)) && stats.totalDays > 0) {
      const attended = (stats.present || 0) + (stats.excused || 0) + (stats.late || 0)
      stats.attendanceRate = Math.round((attended / stats.totalDays) * 100)
    }

    // Derive performance
    if (Number.isFinite(stats.attendanceRate) && stats.totalDays > 0) {
      if (stats.attendanceRate >= 95) {
        stats.performance = 'Excellent'
      } else if (stats.attendanceRate >= 90) {
        stats.performance = 'Good'
      } else if (stats.attendanceRate >= 75) {
        stats.performance = 'Fair'
      } else {
        stats.performance = 'Poor'
      }
    }

    return stats
  }
  
  // Derived active lists (hide expired locally)
  const activeTermReports = useMemo(() => (termReports || []).filter((n) => !isExpired(n)), [termReports])
  const activeRangeReports = useMemo(() => (rangeReports || []).filter((n) => !isExpired(n)), [rangeReports])

  // Background archive of expired notifications
  useEffect(() => {
    const expiredIds = [
      ...new Set([
        ...termReports.filter(isExpired).map((n) => n.id),
        ...rangeReports.filter(isExpired).map((n) => n.id),
      ]),
    ]
    if (expiredIds.length === 0) return
    ;(async () => {
      try {
        await supabase.from('notifications').update({ status: 'archived' }).in('id', expiredIds)
        // Refetch to reflect archiving
        refetchTermReports()
        refetchRangeReports()
      } catch (_) {
        // ignore failures; UI is already hiding expired items
      }
    })()
  }, [termReports, rangeReports])

  // Get attendance rate color
  const getRateColor = (rate) => {
    if (rate >= 90) return 'text-green-600'
    if (rate >= 75) return 'text-yellow-600'
    return 'text-red-600'
  }

  if (!user) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-500 text-lg">Please log in to view your attendance</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">My Attendance</h1>
            <p className="text-slate-600 text-sm mt-1">View your term attendance reports from school administration</p>
            <div className="text-sm text-slate-500 mt-1">{formatSessionBadge(settingsYear, currentTerm)}</div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => { refetchTermReports(); refetchRangeReports(); }}
              className="px-4 py-2 bg-slate-800 text-white rounded hover:bg-slate-700 text-sm"
            >
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Overall empty state when no reports available */}
      {(!loadingTermReports && !loadingRangeReports && activeTermReports.length === 0 && activeRangeReports.length === 0) && (
        <div className="bg-white rounded-lg shadow-sm border border-slate-200">
          <div className="p-6 text-center">
            <div className="text-slate-400 text-4xl mb-3">📭</div>
            <div className="text-slate-600 font-medium">No attendance reports available</div>
            <div className="text-sm text-slate-500 mt-1">
              No attendance sent by your school administrator
            </div>
          </div>
        </div>
      )}

      {/* Term Reports */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200">
        <div className="px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-800">Term Attendance Reports</h2>
          <p className="text-sm text-slate-600">Official attendance reports sent by your school administration</p>
        </div>

        <div className="p-6">
          {loadingTermReports ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-800 mx-auto"></div>
              <div className="text-slate-600 mt-2">Loading term reports...</div>
            </div>
          ) : activeTermReports.length === 0 ? null : (
            <div className="space-y-4">
              {activeTermReports.map((report, idx) => {
                const stats = parseTermReport(report.message)
                const reportDate = formatDMY(report.created_at)
                
                return (
                  <div key={report.id || idx} className="border rounded-lg p-6 bg-slate-50">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-semibold text-slate-800">
                            {stats.term} Term Report {stats.academicYear}
                          </h3>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${stats.kind === 'mid_term' ? 'bg-yellow-100 text-yellow-800' : 'bg-emerald-100 text-emerald-800'}`}>
                            {stats.kind === 'mid_term' ? 'Mid-Term' : 'Termly'}
                          </span>
                        </div>
                        <p className="text-sm text-slate-600">Received on {reportDate}</p>
                      </div>
                      <div className="text-right">
                        <div className={`text-2xl font-bold ${getRateColor(stats.attendanceRate)}`}>
                          {stats.attendanceRate}%
                        </div>
                        <div className="text-xs text-slate-600">
                          {stats.performance && (
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              stats.performance === 'Excellent' ? 'bg-green-100 text-green-800' :
                              stats.performance === 'Good' ? 'bg-blue-100 text-blue-800' :
                              stats.performance === 'Fair' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {stats.performance}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div className="text-center">
                        <div className="text-lg font-bold text-slate-800">{stats.totalDays}</div>
                        <div className="text-xs text-slate-600">Total Days</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-green-600">{stats.present}</div>
                        <div className="text-xs text-slate-600">Present</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-blue-600">{stats.excused}</div>
                        <div className="text-xs text-slate-600">Excused</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-red-600">{stats.absent}</div>
                        <div className="text-xs text-slate-600">Absent</div>
                      </div>
                    </div>

                    <details className="mt-4">
                      <summary className="cursor-pointer text-sm text-slate-600 hover:text-slate-800">
                        View full report message
                      </summary>
                      <div className="mt-3 p-4 bg-white rounded border text-sm whitespace-pre-line">
                        {report.message}
                      </div>
                    </details>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Custom Range Reports */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200">
        <div className="px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-800">Custom Range Attendance Reports</h2>
          <p className="text-sm text-slate-600">Reports for specific periods sent by your school administration</p>
        </div>
        <div className="p-6">
          {loadingRangeReports ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-800 mx-auto"></div>
              <div className="text-slate-600 mt-2">Loading range reports...</div>
            </div>
          ) : activeRangeReports.length === 0 ? null : (
            <div className="space-y-4">
              {activeRangeReports.map((report, idx) => {
                const stats = parseRangeReport(report.message)
                const reportDate = formatDMY(report.created_at)
                return (
                  <div key={report.id || idx} className="border rounded-lg p-6 bg-slate-50">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-slate-800">
                          Custom Range Report
                        </h3>
                        <p className="text-sm text-slate-600">Received on {reportDate}</p>
                        {stats.periodStart && stats.periodEnd && (
                          <p className="text-xs text-slate-500">
                            Period: {stats.periodStart} - {stats.periodEnd}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <div className={`text-2xl font-bold ${getRateColor(stats.attendanceRate)}`}>
                          {stats.attendanceRate}%
                        </div>
                        <div className="text-xs text-slate-600">
                          {stats.performance && (
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              stats.performance === 'Excellent' ? 'bg-green-100 text-green-800' :
                              stats.performance === 'Good' ? 'bg-blue-100 text-blue-800' :
                              stats.performance === 'Fair' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {stats.performance}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div className="text-center">
                        <div className="text-lg font-bold text-slate-800">{stats.totalDays}</div>
                        <div className="text-xs text-slate-600">Total Days</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-green-600">{stats.present}</div>
                        <div className="text-xs text-slate-600">Present</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-blue-600">{stats.excused}</div>
                        <div className="text-xs text-slate-600">Excused</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-red-600">{stats.absent}</div>
                        <div className="text-xs text-slate-600">Absent</div>
                      </div>
                    </div>

                    <details className="mt-4">
                      <summary className="cursor-pointer text-sm text-slate-600 hover:text-slate-800">
                        View full report message
                      </summary>
                      <div className="mt-3 p-4 bg-white rounded border text-sm whitespace-pre-line">
                        {report.message}
                      </div>
                    </details>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}