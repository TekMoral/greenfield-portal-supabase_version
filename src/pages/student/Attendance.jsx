import React, { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../../hooks/useAuth'
import { adminAttendanceService } from '../../services/supabase/adminAttendanceService'
import { supabase } from '../../lib/supabaseClient'

const fmt = (d) => (d ? new Date(d).toISOString().slice(0, 10) : '')
const todayISO = fmt(new Date())

export default function StudentAttendance() {
  const { user } = useAuth()

  // Fetch term reports from notifications
  const { data: termReports = [], isLoading: loadingTermReports, refetch: refetchTermReports } = useQuery({
    queryKey: ['student-term-reports', user?.id],
    queryFn: async () => {
      if (!user?.id) return []
      
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('recipient_id', user.id)
        .eq('type', 'term_attendance')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching term reports:', error)
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
      late: 0,
      excused: 0,
      absent: 0,
      attendanceRate: 0,
      performance: ''
    }

    // Extract term and year from first line
    const termMatch = message.match(/(\w+) Term Attendance Report \((\d{4})\/(\d{4})\)/)
    if (termMatch) {
      stats.term = termMatch[1]
      stats.academicYear = `${termMatch[2]}/${termMatch[3]}`
    }

    // Extract statistics
    lines.forEach(line => {
      if (line.includes('Total School Days:')) {
        stats.totalDays = parseInt(line.match(/\d+/)?.[0] || '0')
      } else if (line.includes('Present:') && line.includes('days')) {
        stats.present = parseInt(line.match(/\d+/)?.[0] || '0')
      } else if (line.includes('Late:') && line.includes('days')) {
        stats.late = parseInt(line.match(/\d+/)?.[0] || '0')
      } else if (line.includes('Excused:') && line.includes('days')) {
        stats.excused = parseInt(line.match(/\d+/)?.[0] || '0')
      } else if (line.includes('Absent:') && line.includes('days')) {
        stats.absent = parseInt(line.match(/\d+/)?.[0] || '0')
      } else if (line.includes('Attendance Rate:')) {
        stats.attendanceRate = parseInt(line.match(/\d+/)?.[0] || '0')
      }
    })

    // Extract performance indicator
    if (message.includes('🌟 Excellent')) {
      stats.performance = 'Excellent'
    } else if (message.includes('✅ Good')) {
      stats.performance = 'Good'
    } else if (message.includes('⚠️ Fair')) {
      stats.performance = 'Fair'
    } else if (message.includes('🚨 Poor')) {
      stats.performance = 'Poor'
    }

    return stats
  }

  
  // Get attendance rate color
  const getRateColor = (rate) => {
    if (rate >= 90) return 'text-green-600'
    if (rate >= 80) return 'text-yellow-600'
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
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">My Attendance</h1>
            <p className="text-slate-600 text-sm mt-1">View your term attendance reports from school administration</p>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => refetchTermReports()}
              className="px-4 py-2 bg-slate-800 text-white rounded hover:bg-slate-700 text-sm"
            >
              Refresh
            </button>
          </div>
        </div>
      </div>

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
          ) : termReports.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-slate-400 text-4xl mb-3">📊</div>
              <div className="text-slate-600 font-medium">No term reports available</div>
              <div className="text-sm text-slate-500 mt-1">
                Term reports will appear here when sent by your school administration
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {termReports.map((report, idx) => {
                const stats = parseTermReport(report.message)
                const reportDate = new Date(report.created_at).toLocaleDateString()
                
                return (
                  <div key={report.id || idx} className="border rounded-lg p-6 bg-slate-50">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-slate-800">
                          {stats.term} Term Report {stats.academicYear}
                        </h3>
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

                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
                      <div className="text-center">
                        <div className="text-lg font-bold text-slate-800">{stats.totalDays}</div>
                        <div className="text-xs text-slate-600">Total Days</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-green-600">{stats.present}</div>
                        <div className="text-xs text-slate-600">Present</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-yellow-600">{stats.late}</div>
                        <div className="text-xs text-slate-600">Late</div>
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