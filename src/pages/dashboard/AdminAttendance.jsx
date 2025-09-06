import React, { useEffect, useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { adminAttendanceService } from '../../services/supabase/adminAttendanceService'
import { classService } from '../../services/supabase/classService'
import { sendMessageToStudent } from '../../services/supabase/studentManagementService'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabaseClient'

const fmt = (d) => (d ? new Date(d).toISOString().slice(0, 10) : '')
const todayISO = fmt(new Date())
const oneWeekAgoISO = fmt(new Date(Date.now() - 6 * 24 * 60 * 60 * 1000))

export default function AdminAttendance() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  // UI state
  const [activeTab, setActiveTab] = useState('mark') // 'mark' | 'records'
  const [finalize, setFinalize] = useState(true)

  // Reference data
  const [classes, setClasses] = useState([])
  const [classGroups, setClassGroups] = useState([]) // [{ key, label, classIds }]

  // MARKING state
  const [mark, setMark] = useState({
    classId: '',
    date: todayISO,
    search: '',
  })
  const [studentsForMark, setStudentsForMark] = useState([])
  const [statuses, setStatuses] = useState({}) // { [studentId]: { status } }
  const [existingForDate, setExistingForDate] = useState({}) // { 'studentId:classId': attendanceRow }
  const [saving, setSaving] = useState(false)
  const [refreshTick, setRefreshTick] = useState(0)

  // RECORDS state - simplified UX per request
  const [filters, setFilters] = useState({
    from: todayISO,
    to: todayISO,
    classId: '', // holds a class group key
  })
  const [recordsSearch, setRecordsSearch] = useState('')

  // Roster/records for Records tab
  const [recordsRoster, setRecordsRoster] = useState([])
  const [recordsLoadingRoster, setRecordsLoadingRoster] = useState(false)
  const [selectedStudent, setSelectedStudent] = useState(null)
  const [studentRecords, setStudentRecords] = useState([])
  const [loadingStudentRecords, setLoadingStudentRecords] = useState(false)
  const [classDayDate, setClassDayDate] = useState(todayISO)
  const [classDayRecords, setClassDayRecords] = useState([])
  const [loadingClassDay, setLoadingClassDay] = useState(false)
  const [sendingMessage, setSendingMessage] = useState({}) // { [recordId]: boolean }
  const [sendingBulk, setSendingBulk] = useState(false)
  
  // Term-based bulk send
  const [termSendConfig, setTermSendConfig] = useState({
    term: 'first', // 'first', 'second', 'third'
    academicYear: new Date().getFullYear(),
    classId: ''
  })
  const [termRecords, setTermRecords] = useState([])
  const [loadingTermRecords, setLoadingTermRecords] = useState(false)
  const [showTermSendModal, setShowTermSendModal] = useState(false)

  // Legacy bulk send (for backward compatibility)
  const [bulkSendRange, setBulkSendRange] = useState({
    startDate: todayISO,
    endDate: todayISO,
    classId: ''
  })
  const [bulkRecords, setBulkRecords] = useState([])
  const [loadingBulkRecords, setLoadingBulkRecords] = useState(false)
  const [showBulkSendModal, setShowBulkSendModal] = useState(false)

  // Fetch classes once
  useEffect(() => {
    let alive = true
    ;(async () => {
      const res = await classService.getClasses()
      const list = res?.success ? (res.data || []) : (Array.isArray(res) ? res : [])
      if (alive) {
        setClasses(list)
        // Build grouped classes by base label (strip category like Science/Arts/etc.)
        const baseNormalize = (name) => {
          if (!name) return { key: '', label: '' }
          let n = String(name).trim()
          // Remove common category suffixes at the end
          n = n.replace(/\s+(Science|Sciences|Arts|Commercial|Commerce|Humanities|Technical|Tech|Business|Social|Management|Option\s*[A-Z])$/i, '')
          // Ensure space between letter-run and digits (e.g., "SSS2" -> "SSS 2")
          n = n.replace(/([A-Za-z]+)\s*([0-9]+)/g, '$1 $2')
          // Normalize internal spacing
          const label = n.replace(/\s+/g, ' ').trim()
          // Canonical grouping key: lowercase with single spaces
          const key = label.toLowerCase()
          return { key, label }
        }
        const groupsMap = new Map()
        for (const c of list) {
          const { key, label } = baseNormalize(c.name)
          const entry = groupsMap.get(key) || { key, label, classIds: [] }
          entry.classIds.push(c.id)
          groupsMap.set(key, entry)
        }
        const groups = Array.from(groupsMap.values()).sort((a, b) => a.label.localeCompare(b.label))
        setClassGroups(groups)
      }
    })()
    return () => { alive = false }
  }, [])

  // Fetch roster for selected class group (MARK tab)
  useEffect(() => {
    let alive = true
    ;(async () => {
      if (!mark.classId) { setStudentsForMark([]); return }
      // mark.classId now holds a group key; find classIds in this group
      const group = classGroups.find(g => g.key === mark.classId)
      const ids = group ? group.classIds : []
      if (ids.length === 0) { setStudentsForMark([]); return }
      // Fetch students for all class IDs and merge
      const results = await Promise.all(ids.map(id => classService.getStudentsInClass(id)))
      const merged = []
      const seen = new Set()
      for (const res of results) {
        const list = res?.success ? (res.data || []) : (Array.isArray(res) ? res : [])
        for (const s of list) {
          if (!seen.has(s.id)) {
            seen.add(s.id)
            merged.push(s)
          }
        }
      }
      if (alive) setStudentsForMark(merged)
    })()
    return () => { alive = false }
  }, [mark.classId, classGroups, refreshTick])

  // Fetch existing attendance for selected date across the group for disable/fill
  useEffect(() => {
    let alive = true
    ;(async () => {
      if (!mark.classId || !mark.date) { if (alive) setExistingForDate({}); return }
      const group = classGroups.find(g => g.key === mark.classId)
      const ids = group ? group.classIds : []
      if (!ids.length) { if (alive) setExistingForDate({}); return }
      const all = []
      for (const id of ids) {
        const res = await adminAttendanceService.listRange({ from: mark.date, to: mark.date, classId: id })
        if (res?.success && Array.isArray(res.data)) all.push(...res.data)
      }
      const map = {}
      for (const r of all) {
        const k = `${r.student_id}:${r.class_id}`
        map[k] = r
      }
      if (alive) setExistingForDate(map)
    })()
    return () => { alive = false }
  }, [mark.classId, mark.date, classGroups, refreshTick])

  // Prefill statuses from existing records so admins can finalize without re-selecting
  useEffect(() => {
    if (!studentsForMark || studentsForMark.length === 0) return
    setStatuses((prev) => {
      let changed = false
      const next = { ...prev }
      for (const s of studentsForMark) {
        const k = `${s.id}:${s.class_id}`
        const ex = existingForDate[k]
        const exStatus = (ex?.status || '').toLowerCase()
        if (exStatus && (!next[s.id] || !next[s.id].status)) {
          next[s.id] = { ...(next[s.id] || {}), status: exStatus }
          changed = true
        }
      }
      return changed ? next : prev
    })
  }, [existingForDate, studentsForMark])

  // Helper maps
  const studentMap = useMemo(() => new Map(studentsForMark.map(s => [s.id, s])), [studentsForMark])

  // Records query (kept for refresh + realtime invalidation though not rendered directly)
  const qKey = useMemo(() => ['admin','attendance', filters, refreshTick], [filters, refreshTick])
  const { refetch } = useQuery({
    queryKey: qKey,
    queryFn: async () => {
      // Still fetch today's range (or selected class group range) to keep cache fresh
      if (filters.classId) {
        const group = classGroups.find(g => g.key === filters.classId)
        if (group && Array.isArray(group.classIds) && group.classIds.length > 0) {
          const all = []
          for (const id of group.classIds) {
            const res = await adminAttendanceService.listRange({ ...filters, classId: id })
            if (res.success && Array.isArray(res.data)) all.push(...res.data)
          }
          return all
        }
      }
      const res = await adminAttendanceService.listRange(filters)
      if (!res.success) throw new Error(res.error || 'Failed to load attendance')
      return res.data
    },
  })

  // Realtime invalidation
  useEffect(() => {
    const channel = supabase
      .channel('admin-attendance-dashboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance' }, () => {
        queryClient.invalidateQueries({ queryKey: ['admin','attendance'] })
      })
      .subscribe()

    return () => { try { supabase.removeChannel(channel) } catch (_) {} }
  }, [queryClient])

  // MARK tab: derive filtered roster by name/admission
  const filteredStudentsForMark = useMemo(() => {
    const q = (mark.search || '').toLowerCase().trim()
    if (!q) return studentsForMark
    return studentsForMark.filter((s) => {
      const name = (s.full_name || '').toLowerCase()
      const adm = (s.admission_number || '').toLowerCase()
      return name.includes(q) || adm.includes(q)
    })
  }, [studentsForMark, mark.search])

  // MARK tab: actions
  const setStatusForStudent = (studentId, status) => {
    setStatuses((prev) => ({ ...prev, [studentId]: { ...(prev[studentId] || {}), status } }))
  }
  const clearStatuses = () => setStatuses({})
  const markAllFiltered = (status) => {
    const next = { ...statuses }
    for (const s of filteredStudentsForMark) {
      const k = `${s.id}:${s.class_id}`
      if (existingForDate[k]?.finalized_by_admin) continue
      next[s.id] = { ...(next[s.id] || {}), status }
    }
    setStatuses(next)
  }
  const selectedCount = useMemo(() => {
    let count = 0
    for (const [sid, v] of Object.entries(statuses)) {
      if (!v || !v.status) continue
      const clsId = studentMap.get(sid)?.class_id
      const k = `${sid}:${clsId}`
      if (existingForDate[k]?.finalized_by_admin) continue
      count++
    }
    return count
  }, [statuses, existingForDate, studentMap])

  const saveMarkedAttendance = async () => {
    try {
      if (!mark.classId || !mark.date) {
        alert('Select Class and Date to save attendance')
        return
      }
      const entries = Object.entries(statuses).filter(([_, v]) => v && v.status)
      if (entries.length === 0) {
        alert('No statuses selected. Set at least one student status before saving.')
        return
      }
      const payload = []
      for (const [studentId, v] of entries) {
        const student = studentMap.get(studentId)
        const classId = student?.class_id ?? null
        if (!classId) continue
        const k = `${studentId}:${classId}`
        if (existingForDate[k]?.finalized_by_admin) continue
        payload.push({ student_id: studentId, class_id: classId, date: mark.date, status: v.status })
      }
      if (payload.length === 0) {
        alert('All selected entries are finalized and cannot be changed.')
        return
      }
      setSaving(true)
      const res = await adminAttendanceService.upsertBulk(payload, { finalize })
      if (!res.success) { setSaving(false); throw new Error(res.error) }
      await queryClient.invalidateQueries({ queryKey: ['admin','attendance'] })
      setSaving(false)
      alert(`Saved ${payload.length} record(s).`)
      // Optionally retain selections for another save; comment out next line to keep
      // setStatuses({})
    } catch (err) {
      console.error('Save attendance failed:', err)
      setSaving(false)
      alert(err.message || 'Failed to save')
    }
  }

  // RECORDS tab helpers
  const statusStyles = {
    present: 'bg-green-100 text-green-700',
    absent: 'bg-red-100 text-red-700',
    late: 'bg-yellow-100 text-yellow-800',
    excused: 'bg-blue-100 text-blue-700',
  }

  // Student attendance summary calculation
  const studentSummary = useMemo(() => {
    const s = { total: studentRecords.length, present: 0, absent: 0, late: 0, excused: 0, attended: 0, rate: 0 }
    for (const r of studentRecords) {
      const st = String(r.status || '').toLowerCase()
      if (st === 'present') s.present++
      else if (st === 'absent') s.absent++
      else if (st === 'late') s.late++
      else if (st === 'excused') s.excused++
    }
    s.attended = s.present + s.late
    s.rate = s.total > 0 ? Math.round((s.attended / s.total) * 100) : 0
    return s
  }, [studentRecords])

  // Status icons
  const getStatusIcon = (status) => {
    const st = String(status || '').toLowerCase()
    switch (st) {
      case 'present': return '✓'
      case 'absent': return '✗'
      case 'late': return '⏰'
      case 'excused': return 'ℹ️'
      default: return '—'
    }
  }

  // Send attendance notification to student
  const sendAttendanceToStudent = async (record, studentName) => {
    const recordKey = `${record.student_id}-${record.date}`
    setSendingMessage(prev => ({ ...prev, [recordKey]: true }))
    
    try {
      const status = String(record.status || '').toLowerCase()
      const statusText = status.charAt(0).toUpperCase() + status.slice(1)
      const date = new Date(record.date).toLocaleDateString()
      
      const message = `Attendance Update: You were marked as ${statusText} on ${date}.`
      
      const result = await sendMessageToStudent(
        record.student_id,
        message,
        'attendance',
        user?.id
      )
      
      if (result.success) {
        alert(`Attendance notification sent to ${studentName}`)
      } else {
        alert(`Failed to send notification: ${result.error}`)
      }
    } catch (error) {
      console.error('Error sending attendance notification:', error)
      alert('Failed to send notification')
    } finally {
      setSendingMessage(prev => ({ ...prev, [recordKey]: false }))
    }
  }

  // Send bulk attendance notifications to all students in class for a specific date
  const sendBulkAttendanceNotifications = async () => {
    if (classDayRecords.length === 0) {
      alert('No attendance records to send')
      return
    }

    const confirmMessage = `Send attendance notifications to all ${classDayRecords.length} students for ${new Date(classDayDate).toLocaleDateString()}?`
    if (!confirm(confirmMessage)) return

    setSendingBulk(true)
    let successCount = 0
    let failCount = 0
    let duplicateCount = 0

    try {
      // Check for existing notifications to prevent duplicates
      const existingNotifications = await checkExistingNotifications(classDayRecords)
      
      // Filter out records that already have notifications
      const recordsToSend = classDayRecords.filter(record => {
        const key = `${record.student_id || record.studentId}-${record.date}`
        return !existingNotifications.has(key)
      })
      
      duplicateCount = classDayRecords.length - recordsToSend.length

      if (recordsToSend.length === 0) {
        alert('All students have already been notified for this date.')
        setSendingBulk(false)
        return
      }

      // Send notifications in parallel but with some delay to avoid overwhelming the system
      const promises = recordsToSend.map(async (record, index) => {
        // Add small delay between requests to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, index * 100))
        
        try {
          const status = String(record.status || '').toLowerCase()
          const statusText = status.charAt(0).toUpperCase() + status.slice(1)
          const date = new Date(record.date).toLocaleDateString()
          const studentName = record.students?.user_profiles?.full_name || record.full_name || record.student_name || 'Student'
          
          const message = `Attendance Update: You were marked as ${statusText} on ${date}.`
          
          const result = await sendMessageToStudent(
            record.student_id || record.studentId,
            message,
            'attendance',
            user?.id
          )
          
          if (result.success) {
            successCount++
          } else {
            failCount++
            console.error(`Failed to send to ${studentName}:`, result.error)
          }
        } catch (error) {
          failCount++
          console.error(`Error sending to student:`, error)
        }
      })

      await Promise.all(promises)
      
      let message = ''
      if (successCount > 0 && failCount === 0 && duplicateCount === 0) {
        message = `✅ Successfully sent attendance notifications to all ${successCount} students!`
      } else if (successCount > 0) {
        message = `📊 Results: ${successCount} sent successfully`
        if (failCount > 0) message += `, ${failCount} failed`
        if (duplicateCount > 0) message += `, ${duplicateCount} already notified`
      } else {
        message = `❌ Failed to send notifications. Please try again.`
      }
      
      alert(message)
    } catch (error) {
      console.error('Error in bulk send:', error)
      alert('Failed to send bulk notifications')
    } finally {
      setSendingBulk(false)
    }
  }

  // Check for existing notifications to prevent duplicates
  const checkExistingNotifications = async (records) => {
    try {
      const existingSet = new Set()
      
      // Get all student IDs and dates from records
      const studentIds = [...new Set(records.map(r => r.student_id || r.studentId))]
      const dates = [...new Set(records.map(r => r.date))]
      
      if (studentIds.length === 0 || dates.length === 0) return existingSet
      
      // Query existing notifications for these students and dates
      const { data: existingNotifications, error } = await supabase
        .from('notifications')
        .select('recipient_id, created_at, message')
        .in('recipient_id', studentIds)
        .eq('type', 'attendance')
        .gte('created_at', new Date(Math.min(...dates.map(d => new Date(d)))).toISOString())
        .lte('created_at', new Date(Math.max(...dates.map(d => new Date(d))) + 24 * 60 * 60 * 1000).toISOString())

      if (error) {
        console.error('Error checking existing notifications:', error)
        return existingSet
      }

      // Create set of existing notification keys
      existingNotifications?.forEach(notification => {
        // Extract date from message if possible
        const dateMatch = notification.message.match(/on (\d{1,2}\/\d{1,2}\/\d{4})/)
        if (dateMatch) {
          const messageDate = new Date(dateMatch[1]).toISOString().slice(0, 10)
          const key = `${notification.recipient_id}-${messageDate}`
          existingSet.add(key)
        }
      })

      return existingSet
    } catch (error) {
      console.error('Error checking existing notifications:', error)
      return new Set()
    }
  }

  // Get term date ranges
  const getTermDateRange = (term, academicYear) => {
    const year = parseInt(academicYear)
    
    switch (term) {
      case 'first':
        return {
          startDate: `${year}-09-01`, // September 1st
          endDate: `${year}-12-15`    // December 15th
        }
      case 'second':
        return {
          startDate: `${year + 1}-01-08`, // January 8th (next year)
          endDate: `${year + 1}-04-15`    // April 15th (next year)
        }
      case 'third':
        return {
          startDate: `${year + 1}-04-16`, // April 16th (next year)
          endDate: `${year + 1}-07-31`    // July 31st (next year)
        }
      default:
        return {
          startDate: `${year}-09-01`,
          endDate: `${year}-12-15`
        }
    }
  }

  // Calculate term attendance statistics for a student
  const calculateTermStats = (records) => {
    const stats = {
      totalDays: records.length,
      present: 0,
      absent: 0,
      late: 0,
      excused: 0,
      attendanceRate: 0
    }

    records.forEach(record => {
      const status = String(record.status || '').toLowerCase()
      if (status === 'present') stats.present++
      else if (status === 'absent') stats.absent++
      else if (status === 'late') stats.late++
      else if (status === 'excused') stats.excused++
    })

    const attended = stats.present + stats.late
    stats.attendanceRate = stats.totalDays > 0 ? Math.round((attended / stats.totalDays) * 100) : 0

    return stats
  }

  // Generate term attendance message
  const generateTermAttendanceMessage = (studentName, term, academicYear, stats, records) => {
    const termName = term.charAt(0).toUpperCase() + term.slice(1)
    const { startDate, endDate } = getTermDateRange(term, academicYear)
    
    let message = `📊 ${termName} Term Attendance Report (${academicYear}/${parseInt(academicYear) + 1})\n\n`
    message += `Dear ${studentName},\n\n`
    message += `Here is your attendance summary for the ${termName} Term:\n\n`
    message += `📅 Period: ${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}\n\n`
    message += `📈 ATTENDANCE SUMMARY:\n`
    message += `• Total School Days: ${stats.totalDays}\n`
    message += `• Present: ${stats.present} days\n`
    message += `• Late: ${stats.late} days\n`
    message += `• Excused: ${stats.excused} days\n`
    message += `• Absent: ${stats.absent} days\n`
    message += `• Attendance Rate: ${stats.attendanceRate}%\n\n`
    
    // Add performance indicator
    if (stats.attendanceRate >= 95) {
      message += `🌟 Excellent attendance! Keep up the great work!\n\n`
    } else if (stats.attendanceRate >= 90) {
      message += `✅ Good attendance. Well done!\n\n`
    } else if (stats.attendanceRate >= 80) {
      message += `⚠️ Fair attendance. Please try to improve next term.\n\n`
    } else {
      message += `🚨 Poor attendance. Please speak with your class teacher.\n\n`
    }
    
    message += `For any questions about your attendance, please contact your class teacher.\n\n`
    message += `Best regards,\nSchool Administration`
    
    return message
  }

  // Check for existing term notifications to prevent duplicates
  const checkExistingTermNotifications = async (studentIds, term, academicYear) => {
    try {
      const existingSet = new Set()
      
      if (studentIds.length === 0) return existingSet
      
      // Query existing term attendance notifications
      const { data: existingNotifications, error } = await supabase
        .from('notifications')
        .select('recipient_id, message')
        .in('recipient_id', studentIds)
        .eq('type', 'term_attendance')
        .ilike('message', `%${term}%term%${academicYear}%`)

      if (error) {
        console.error('Error checking existing term notifications:', error)
        return existingSet
      }

      // Create set of existing notification keys
      existingNotifications?.forEach(notification => {
        const key = `${notification.recipient_id}-${term}-${academicYear}`
        existingSet.add(key)
      })

      return existingSet
    } catch (error) {
      console.error('Error checking existing term notifications:', error)
      return new Set()
    }
  }

  // Load term records for all students in class
  const loadTermRecords = async () => {
    if (!termSendConfig.classId || !termSendConfig.term || !termSendConfig.academicYear) {
      alert('Please select class, term, and academic year')
      return
    }

    setLoadingTermRecords(true)
    try {
      const group = classGroups.find((g) => g.key === termSendConfig.classId)
      const ids = group ? group.classIds : []
      const { startDate, endDate } = getTermDateRange(termSendConfig.term, termSendConfig.academicYear)
      
      const all = []
      
      for (const id of ids) {
        const res = await adminAttendanceService.listRange({ 
          from: startDate, 
          to: endDate, 
          classId: id 
        })
        if (res?.success && Array.isArray(res.data)) all.push(...res.data)
      }
      
      // Group by student and calculate stats
      const studentGroups = {}
      all.forEach(record => {
        const studentId = record.student_id || record.studentId
        const studentName = record.students?.user_profiles?.full_name || record.full_name || record.student_name || 'Unknown Student'
        
        if (!studentGroups[studentId]) {
          studentGroups[studentId] = {
            studentId,
            studentName,
            records: []
          }
        }
        
        studentGroups[studentId].records.push(record)
      })
      
      // Calculate stats for each student
      const termData = Object.values(studentGroups).map(group => ({
        ...group,
        stats: calculateTermStats(group.records)
      })).sort((a, b) => a.studentName.localeCompare(b.studentName))
      
      setTermRecords(termData)
      setShowTermSendModal(true)
    } catch (error) {
      console.error('Error loading term records:', error)
      alert('Failed to load term attendance records')
    } finally {
      setLoadingTermRecords(false)
    }
  }

  // Send term attendance reports to all students
  const sendTermAttendanceReports = async () => {
    if (termRecords.length === 0) {
      alert('No term attendance records to send')
      return
    }

    const termName = termSendConfig.term.charAt(0).toUpperCase() + termSendConfig.term.slice(1)
    const confirmMessage = `Send ${termName} Term attendance reports to all ${termRecords.length} students?\n\nThis will send comprehensive term attendance summaries to each student.`
    if (!confirm(confirmMessage)) return

    setSendingBulk(true)
    let successCount = 0
    let failCount = 0
    let duplicateCount = 0

    try {
      // Check for existing term notifications
      const studentIds = termRecords.map(record => record.studentId)
      const existingNotifications = await checkExistingTermNotifications(
        studentIds, 
        termSendConfig.term, 
        termSendConfig.academicYear
      )
      
      // Filter out students who already received term reports
      const studentsToSend = termRecords.filter(record => {
        const key = `${record.studentId}-${termSendConfig.term}-${termSendConfig.academicYear}`
        return !existingNotifications.has(key)
      })
      
      duplicateCount = termRecords.length - studentsToSend.length

      if (studentsToSend.length === 0) {
        alert(`All students have already received their ${termName} Term attendance reports.`)
        setSendingBulk(false)
        return
      }

      // Send term reports in parallel with delays
      const promises = studentsToSend.map(async (studentData, index) => {
        await new Promise(resolve => setTimeout(resolve, index * 100))
        
        try {
          const message = generateTermAttendanceMessage(
            studentData.studentName,
            termSendConfig.term,
            termSendConfig.academicYear,
            studentData.stats,
            studentData.records
          )
          
          const result = await sendMessageToStudent(
            studentData.studentId,
            message,
            'term_attendance',
            user?.id
          )
          
          if (result.success) {
            successCount++
          } else {
            failCount++
            console.error(`Failed to send to ${studentData.studentName}:`, result.error)
          }
        } catch (error) {
          failCount++
          console.error(`Error sending to student:`, error)
        }
      })

      await Promise.all(promises)
      
      let message = ''
      if (successCount > 0 && failCount === 0 && duplicateCount === 0) {
        message = `✅ Successfully sent ${termName} Term attendance reports to all ${successCount} students!`
      } else if (successCount > 0) {
        message = `📊 Term Report Results:\n• ${successCount} reports sent successfully`
        if (failCount > 0) message += `\n• ${failCount} failed`
        if (duplicateCount > 0) message += `\n• ${duplicateCount} already sent (skipped)`
      } else {
        message = `❌ Failed to send term reports. Please try again.`
      }
      
      alert(message)
      setShowTermSendModal(false)
    } catch (error) {
      console.error('Error in term report send:', error)
      alert('Failed to send term attendance reports')
    } finally {
      setSendingBulk(false)
    }
  }

  // Load bulk records for date range (legacy function)
  const loadBulkRecords = async () => {
    if (!bulkSendRange.classId || !bulkSendRange.startDate || !bulkSendRange.endDate) {
      alert('Please select class and date range')
      return
    }

    setLoadingBulkRecords(true)
    try {
      const group = classGroups.find((g) => g.key === bulkSendRange.classId)
      const ids = group ? group.classIds : []
      const all = []
      
      for (const id of ids) {
        const res = await adminAttendanceService.listRange({ 
          from: bulkSendRange.startDate, 
          to: bulkSendRange.endDate, 
          classId: id 
        })
        if (res?.success && Array.isArray(res.data)) all.push(...res.data)
      }
      
      // Sort by date then by student name
      all.sort((a, b) => {
        const dateCompare = new Date(b.date) - new Date(a.date)
        if (dateCompare !== 0) return dateCompare
        
        const an = (a.students?.user_profiles?.full_name || a.full_name || a.student_name || '').toLowerCase()
        const bn = (b.students?.user_profiles?.full_name || b.full_name || b.student_name || '').toLowerCase()
        return an.localeCompare(bn)
      })
      
      setBulkRecords(all)
      setShowBulkSendModal(true)
    } catch (error) {
      console.error('Error loading bulk records:', error)
      alert('Failed to load attendance records')
    } finally {
      setLoadingBulkRecords(false)
    }
  }

  // Send bulk notifications for date range
  const sendBulkRangeNotifications = async () => {
    if (bulkRecords.length === 0) {
      alert('No attendance records to send')
      return
    }

    const dateRange = bulkSendRange.startDate === bulkSendRange.endDate 
      ? new Date(bulkSendRange.startDate).toLocaleDateString()
      : `${new Date(bulkSendRange.startDate).toLocaleDateString()} - ${new Date(bulkSendRange.endDate).toLocaleDateString()}`

    const confirmMessage = `Send attendance notifications for ${dateRange}?\n\nThis will send ${bulkRecords.length} notifications to students (each student gets only their own attendance records).`
    if (!confirm(confirmMessage)) return

    setSendingBulk(true)
    let successCount = 0
    let failCount = 0
    let duplicateCount = 0

    try {
      // Check for existing notifications to prevent duplicates
      const existingNotifications = await checkExistingNotifications(bulkRecords)
      
      // Filter out records that already have notifications
      const recordsToSend = bulkRecords.filter(record => {
        const key = `${record.student_id || record.studentId}-${record.date}`
        return !existingNotifications.has(key)
      })
      
      duplicateCount = bulkRecords.length - recordsToSend.length

      if (recordsToSend.length === 0) {
        alert('All students have already been notified for the selected date range.')
        setSendingBulk(false)
        return
      }

      // Send notifications in parallel but with some delay
      const promises = recordsToSend.map(async (record, index) => {
        await new Promise(resolve => setTimeout(resolve, index * 50)) // Faster for bulk
        
        try {
          const status = String(record.status || '').toLowerCase()
          const statusText = status.charAt(0).toUpperCase() + status.slice(1)
          const date = new Date(record.date).toLocaleDateString()
          const studentName = record.students?.user_profiles?.full_name || record.full_name || record.student_name || 'Student'
          
          const message = `Attendance Update: You were marked as ${statusText} on ${date}.`
          
          const result = await sendMessageToStudent(
            record.student_id || record.studentId,
            message,
            'attendance',
            user?.id
          )
          
          if (result.success) {
            successCount++
          } else {
            failCount++
            console.error(`Failed to send to ${studentName}:`, result.error)
          }
        } catch (error) {
          failCount++
          console.error(`Error sending to student:`, error)
        }
      })

      await Promise.all(promises)
      
      let message = ''
      if (successCount > 0 && failCount === 0 && duplicateCount === 0) {
        message = `✅ Successfully sent ${successCount} attendance notifications!`
      } else if (successCount > 0) {
        message = `📊 Bulk Send Results:\n• ${successCount} sent successfully`
        if (failCount > 0) message += `\n• ${failCount} failed`
        if (duplicateCount > 0) message += `\n• ${duplicateCount} already notified (skipped)`
      } else {
        message = `❌ Failed to send notifications. Please try again.`
      }
      
      alert(message)
      setShowBulkSendModal(false)
    } catch (error) {
      console.error('Error in bulk range send:', error)
      alert('Failed to send bulk notifications')
    } finally {
      setSendingBulk(false)
    }
  }

  // Load roster for Records tab when class selection changes
  useEffect(() => {
    let alive = true
    ;(async () => {
      setSelectedStudent(null)
      setStudentRecords([])
      setClassDayRecords([])
      if (!filters.classId) { setRecordsRoster([]); return }
      const group = classGroups.find((g) => g.key === filters.classId)
      const ids = group ? group.classIds : []
      if (ids.length === 0) { setRecordsRoster([]); return }
      setRecordsLoadingRoster(true)
      try {
        const results = await Promise.all(ids.map((id) => classService.getStudentsInClass(id)))
        const merged = []
        const seen = new Set()
        for (const res of results) {
          const list = res?.success ? (res.data || []) : (Array.isArray(res) ? res : [])
          for (const s of list) {
            if (!seen.has(s.id)) { seen.add(s.id); merged.push(s) }
          }
        }
        merged.sort((a, b) => (a.full_name || '').localeCompare(b.full_name || ''))
        if (alive) setRecordsRoster(merged)
      } finally {
        if (alive) setRecordsLoadingRoster(false)
      }
    })()
    return () => { alive = false }
  }, [filters.classId, classGroups])

  // Filtered roster search
  const filteredRoster = useMemo(() => {
    const q = (recordsSearch || '').toLowerCase().trim()
    if (!q) return recordsRoster
    return (recordsRoster || []).filter((s) => {
      const name = (s.full_name || '').toLowerCase()
      const adm = (s.admission_number || '').toLowerCase()
      return name.includes(q) || adm.includes(q)
    })
  }, [recordsRoster, recordsSearch])

  // Load a single student's full attendance (all dates, desc by date)
  const loadStudentRecords = async (student) => {
    setSelectedStudent(student)
    setClassDayRecords([]) // hide class-day view when focusing student
    setLoadingStudentRecords(true)
    try {
      const res = await adminAttendanceService.listRange({ studentId: student.id })
      if (res.success) {
        const list = Array.isArray(res.data) ? res.data : []
        list.sort((a, b) => new Date(b.date) - new Date(a.date)) // latest first
        setStudentRecords(list)
      } else {
        setStudentRecords([])
      }
    } catch (_) {
      setStudentRecords([])
    } finally {
      setLoadingStudentRecords(false)
    }
  }

  // Load attendance for selected class on a day
  const loadClassDayRecords = async () => {
    if (!filters.classId || !classDayDate) return
    setSelectedStudent(null)
    setLoadingClassDay(true)
    try {
      const group = classGroups.find((g) => g.key === filters.classId)
      const ids = group ? group.classIds : []
      const all = []
      for (const id of ids) {
        const res = await adminAttendanceService.listRange({ from: classDayDate, to: classDayDate, classId: id })
        if (res?.success && Array.isArray(res.data)) all.push(...res.data)
      }
      // Alphabetical by student name
      all.sort((a, b) => {
        const an = (a.students?.user_profiles?.full_name || a.full_name || a.student_name || '').toLowerCase()
        const bn = (b.students?.user_profiles?.full_name || b.full_name || b.student_name || '').toLowerCase()
        return an.localeCompare(bn)
      })
      setClassDayRecords(all)
    } finally {
      setLoadingClassDay(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Admin Attendance</h1>
          <p className="text-slate-600 text-sm">Mark attendance by class and manage historical records</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={finalize} onChange={(e) => setFinalize(e.target.checked)} />
            <span>Finalize updates</span>
          </label>
          <button onClick={() => { setRefreshTick(t => t + 1); refetch(); }} className="px-3 py-2 rounded bg-slate-800 text-white text-sm">Refresh</button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <nav className="-mb-px flex gap-6">
          <button
            className={`py-2 px-1 border-b-2 text-sm ${activeTab === 'mark' ? 'border-green-600 text-green-700' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}
            onClick={() => setActiveTab('mark')}
          >
            Take Attendance
          </button>
          <button
            className={`py-2 px-1 border-b-2 text-sm ${activeTab === 'records' ? 'border-green-600 text-green-700' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}
            onClick={() => setActiveTab('records')}
          >
            Records
          </button>
        </nav>
      </div>

      {activeTab === 'mark' && (
        <section className="space-y-4">
          {/* Filters card */}
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs text-slate-600 mb-1">Class</label>
                <select
                  value={mark.classId}
                  onChange={(e) => { setMark((m) => ({ ...m, classId: e.target.value })); setStatuses({}); }}
                  className="w-full border rounded px-2 py-2"
                >
                  <option value="">Select Class</option>
                  {classGroups.map((g) => (
                    <option key={g.key} value={g.key}>{g.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-600 mb-1">Date</label>
                <input type="date" value={mark.date} onChange={(e) => setMark((m) => ({ ...m, date: e.target.value }))} className="w-full border rounded px-2 py-2" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs text-slate-600 mb-1">Search student</label>
                <input
                  type="text"
                  value={mark.search}
                  onChange={(e) => setMark((m) => ({ ...m, search: e.target.value }))}
                  className="w-full border rounded px-2 py-2"
                  placeholder="Type a name or admission number"
                />
              </div>
            </div>
          </div>

          {/* Actions row */}
          <div className="flex flex-wrap items-center gap-2">
            <button disabled={!mark.classId} onClick={() => markAllFiltered('present')} className="px-3 py-2 rounded bg-green-600 text-white text-sm disabled:opacity-50">Set filtered Present</button>
            <button disabled={!mark.classId} onClick={() => markAllFiltered('absent')} className="px-3 py-2 rounded bg-red-600 text-white text-sm disabled:opacity-50">Set filtered Absent</button>
            <button disabled={!mark.classId} onClick={() => markAllFiltered('late')} className="px-3 py-2 rounded bg-yellow-500 text-white text-sm disabled:opacity-50">Set filtered Late</button>
            <button disabled={!mark.classId} onClick={() => markAllFiltered('excused')} className="px-3 py-2 rounded bg-blue-600 text-white text-sm disabled:opacity-50">Set filtered Excused</button>
            <button disabled={!mark.classId} onClick={clearStatuses} className="px-3 py-2 rounded border text-slate-700 text-sm disabled:opacity-50">Clear selections</button>
            <div className="text-sm text-slate-600 ml-auto">Selected: <span className="font-semibold">{selectedCount}</span></div>
          </div>

          {/* Roster table */}
          <div className="bg-white rounded-lg shadow-sm border border-slate-200">
            <div className="px-4 py-3 border-b flex items-center justify-between">
              <div className="text-sm text-slate-600">{mark.classId ? `${filteredStudentsForMark.length} student(s) in view` : 'Select a class to view roster'}</div>
            </div>
            <div className="overflow-x-auto max-h-[60vh]">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="text-left px-3 py-2">Student</th>
                    <th className="text-left px-3 py-2">Admission No</th>
                    <th className="text-left px-3 py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(!mark.classId) && (
                    <tr><td colSpan={4} className="px-3 py-8 text-center text-slate-500">Choose a class to begin marking attendance.</td></tr>
                  )}
                  {(mark.classId && filteredStudentsForMark.length === 0) && (
                    <tr><td colSpan={4} className="px-3 py-8 text-center text-slate-500">No students match the current search.</td></tr>
                  )}
                  {filteredStudentsForMark.map((s) => {
                    const k = `${s.id}:${s.class_id}`
                    const existing = existingForDate[k]
                    const existingStatus = (existing?.status || '').toLowerCase()
                    const isFinal = Boolean(existing?.finalized_by_admin)
                    const st = (statuses[s.id]?.status ?? existingStatus ?? '')
                    return (
                      <tr key={s.id} className="border-t">
                        <td className="px-3 py-2 whitespace-nowrap">{s.full_name}</td>
                        <td className="px-3 py-2 whitespace-nowrap">{s.admission_number || '—'}</td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2">
                            <select value={st} onChange={(e) => setStatusForStudent(s.id, e.target.value)} className="border rounded px-2 py-1 disabled:opacity-60" disabled={isFinal}>
                              <option value="">—</option>
                              <option value="present">present</option>
                              <option value="absent">absent</option>
                              <option value="late">late</option>
                              <option value="excused">excused</option>
                            </select>
                            {isFinal && (
                              <span className="text-xs px-2 py-1 rounded bg-green-100 text-green-700">Finalized</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-3 border-t flex items-center justify-end gap-3 bg-slate-50">
              <div className="text-sm text-slate-600">Finalize updates is <span className="font-semibold">{finalize ? 'ON' : 'OFF'}</span></div>
              <button disabled={!mark.classId || saving} onClick={saveMarkedAttendance} className="px-4 py-2 rounded bg-green-600 text-white text-sm disabled:opacity-50">{saving ? 'Saving...' : 'Save Attendance'}</button>
            </div>
          </div>
        </section>
      )}

      {activeTab === 'records' && (
        <section className="space-y-4">
          {/* Filters: Class selection + class day view */}
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
              <div>
                <label className="block text-xs text-slate-600 mb-1">Class</label>
                <select
                  value={filters.classId}
                  onChange={(e) => {
                    const val = e.target.value
                    setFilters((f) => ({ ...f, classId: val }))
                    setTermSendConfig((r) => ({ ...r, classId: val }))
                    setSelectedStudent(null)
                    setStudentRecords([])
                    setClassDayRecords([])
                  }}
                  className="w-full border rounded px-2 py-2"
                >
                  <option value="">Select Class</option>
                  {classGroups.map((g) => (
                    <option key={g.key} value={g.key}>{g.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-600 mb-1">Class date</label>
                <input type="date" value={classDayDate} onChange={(e) => setClassDayDate(e.target.value)} className="w-full border rounded px-2 py-2" />
              </div>
              <div className="flex items-center gap-2">
                <button onClick={loadClassDayRecords} disabled={!filters.classId} className="px-3 py-2 rounded bg-slate-800 text-white text-sm disabled:opacity-50">View Day</button>
              </div>
            </div>
            
            {/* Term-Based Attendance Reports */}
            <div className="mt-4 pt-4 border-t border-slate-200">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-slate-800">Send Term Attendance Reports</h3>
                <span className="text-xs text-slate-500 bg-blue-50 px-2 py-1 rounded">End of Term</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                <div>
                  <label className="block text-xs text-slate-600 mb-1">Academic Year</label>
                  <select 
                    value={termSendConfig.academicYear} 
                    onChange={(e) => setTermSendConfig(r => ({ ...r, academicYear: e.target.value }))} 
                    className="w-full border rounded px-2 py-2"
                  >
                    <option value={new Date().getFullYear() - 1}>{new Date().getFullYear() - 1}/{new Date().getFullYear()}</option>
                    <option value={new Date().getFullYear()}>{new Date().getFullYear()}/{new Date().getFullYear() + 1}</option>
                    <option value={new Date().getFullYear() + 1}>{new Date().getFullYear() + 1}/{new Date().getFullYear() + 2}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-600 mb-1">Term</label>
                  <select 
                    value={termSendConfig.term} 
                    onChange={(e) => setTermSendConfig(r => ({ ...r, term: e.target.value }))} 
                    className="w-full border rounded px-2 py-2"
                  >
                    <option value="first">1st</option>
                    <option value="second">2nd</option>
                    <option value="third">Third Term</option>
                  </select>
                </div>
                <div className="md:col-span-2 flex gap-2">
                  <button 
                    onClick={loadTermRecords} 
                    disabled={!termSendConfig.classId || loadingTermRecords} 
                    className="px-3 py-2 rounded bg-green-600 text-white text-sm disabled:opacity-50 flex-1"
                  >
                    {loadingTermRecords ? 'Loading...' : 'Generate Term Reports'}
                  </button>
                </div>
              </div>
              <div className="mt-2 text-xs text-slate-500">
                <p>📊 Sends comprehensive attendance summaries for the entire term to each student</p>
              </div>
            </div>
          </div>

          {/* Main layout: roster list -> details */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Roster */}
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="font-semibold text-slate-800">Students</div>
                <div className="text-xs text-slate-500">{filters.classId ? `${recordsRoster.length} student(s)` : ''}</div>
              </div>
              {!filters.classId ? (
                <div className="text-slate-500 text-sm">Select a class to view its students.</div>
              ) : (
                <>
                  <input
                    type="text"
                    value={recordsSearch}
                    onChange={(e) => setRecordsSearch(e.target.value)}
                    placeholder="Search student (name or admission)"
                    className="w-full border rounded px-2 py-2 mb-3"
                  />
                  {recordsLoadingRoster ? (
                    <div className="py-8 text-center text-slate-500 text-sm">Loading roster...</div>
                  ) : (
                    <div className="divide-y max-h-[60vh] overflow-auto">
                      {filteredRoster.length === 0 ? (
                        <div className="text-slate-500 text-sm py-8 text-center">No students found.</div>
                      ) : (
                        filteredRoster.map((s) => (
                          <button
                            key={s.id}
                            onClick={() => loadStudentRecords(s)}
                            className="w-full text-left px-2 py-2 hover:bg-slate-50 flex items-center justify-between"
                          >
                            <span className="truncate">{s.full_name}</span>
                            <span className="text-xs text-slate-500">{s.admission_number || '—'}</span>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Details */}
            <div className="lg:col-span-2 space-y-4">
              {selectedStudent && (
                <div className="bg-white rounded-lg shadow-sm border border-slate-200">
                  <div className="px-4 py-3 border-b flex items-center justify-between">
                    <div className="font-semibold text-slate-800">{selectedStudent.full_name} - Attendance Records</div>
                    <div className="text-xs text-slate-500">All-time</div>
                  </div>
                  <div className="p-4">
                    {/* Summary chips */}
                    {!loadingStudentRecords && studentRecords.length > 0 && (
                      <div className="mb-4 flex flex-wrap gap-2 text-xs">
                        <span className="px-2 py-1 rounded bg-slate-100 text-slate-700">Total: {studentSummary.total}</span>
                        <span className="px-2 py-1 rounded bg-green-100 text-green-700">Present: {studentSummary.present}</span>
                        <span className="px-2 py-1 rounded bg-yellow-100 text-yellow-800">Late: {studentSummary.late}</span>
                        <span className="px-2 py-1 rounded bg-blue-100 text-blue-700">Excused: {studentSummary.excused}</span>
                        <span className="px-2 py-1 rounded bg-red-100 text-red-700">Absent: {studentSummary.absent}</span>
                        <span className="ml-auto px-2 py-1 rounded bg-slate-200 text-slate-800 font-medium">Rate: {studentSummary.rate}%</span>
                      </div>
                    )}
                    {loadingStudentRecords ? (
                      <div className="py-8 text-center text-slate-500 text-sm">Loading records...</div>
                    ) : studentRecords.length === 0 ? (
                      <div className="py-8 text-center text-slate-500 text-sm">No attendance records found for this student.</div>
                    ) : (
                      <div className="space-y-2">
                        {studentRecords.map((r, idx) => {
                          const finalized = !!r.finalized_by_admin
                          const st = String(r.status || '').toLowerCase()
                          const statusCls = statusStyles[st] || 'bg-slate-100 text-slate-700'
                          const recordKey = `${r.student_id}-${r.date}`
                          const isSending = sendingMessage[recordKey]
                          return (
                            <div key={r.id || `${r.student_id}-${r.date}-${idx}`} className={`flex items-center justify-between border rounded px-3 py-2 ${finalized ? 'bg-slate-50' : ''}`}>
                              <div className="flex items-center gap-3">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${statusCls}`}>{st || '—'}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="flex items-center gap-1 text-xs text-slate-500">
                                  <span>{getStatusIcon(r.status)}</span>
                                  <span>{r.date}</span>
                                </div>
                                <button
                                  onClick={() => sendAttendanceToStudent(r, selectedStudent.full_name)}
                                  disabled={isSending}
                                  className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                  title="Send attendance notification to student"
                                >
                                  {isSending ? '...' : '📤'}
                                </button>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {!selectedStudent && (
                <div className="bg-white rounded-lg shadow-sm border border-slate-200">
                  <div className="px-4 py-3 border-b flex items-center justify-between">
                    <div className="font-semibold text-slate-800">Class Attendance on {classDayDate}</div>
                    {classDayRecords.length > 0 && (
                      <button
                        onClick={sendBulkAttendanceNotifications}
                        disabled={sendingBulk}
                        className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                        title="Send attendance notifications to all students in this class"
                      >
                        {sendingBulk ? (
                          <>
                            <span className="animate-spin">⏳</span>
                            Sending...
                          </>
                        ) : (
                          <>
                            📤 Send to All ({classDayRecords.length})
                          </>
                        )}
                      </button>
                    )}
                  </div>
                  <div className="p-4">
                    {loadingClassDay ? (
                      <div className="py-8 text-center text-slate-500 text-sm">Loading class attendance...</div>
                    ) : classDayRecords.length === 0 ? (
                      <div className="py-8 text-center text-slate-500 text-sm">No data. Pick a date and click "View class attendance".</div>
                    ) : (
                      <div className="space-y-2">
                        {classDayRecords.map((r, idx) => {
                          const studentName = r.students?.user_profiles?.full_name || r.full_name || r.student_name || r.studentId || r.student_id
                          const finalized = !!r.finalized_by_admin
                          const st = String(r.status || '').toLowerCase()
                          const statusCls = statusStyles[st] || 'bg-slate-100 text-slate-700'
                          const recordKey = `${r.student_id || r.studentId}-${r.date}`
                          const isSending = sendingMessage[recordKey]
                          return (
                            <div key={r.id || `${r.student_id || r.studentId}-${r.date}-${idx}`} className={`flex items-center justify-between border rounded px-3 py-2 ${finalized ? 'bg-slate-50' : ''}`}>
                              <div className="flex items-center gap-3">
                                <div className="font-medium text-slate-800">{studentName}</div>
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${statusCls}`}>{st || '—'}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="flex items-center gap-1 text-xs text-slate-500">
                                  <span>{getStatusIcon(r.status)}</span>
                                  <span>{r.date}</span>
                                </div>
                                <button
                                  onClick={() => sendAttendanceToStudent(r, studentName)}
                                  disabled={isSending}
                                  className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                  title="Send attendance notification to student"
                                >
                                  {isSending ? '...' : '📤'}
                                </button>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Bulk Send Modal */}
      {showBulkSendModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[80vh] overflow-hidden">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-800">
                Bulk Send Preview - {bulkRecords.length} Records
              </h2>
              <button 
                onClick={() => setShowBulkSendModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Date Range:</strong> {new Date(bulkSendRange.startDate).toLocaleDateString()} - {new Date(bulkSendRange.endDate).toLocaleDateString()}
                </p>
                <p className="text-sm text-blue-800 mt-1">
                  Each student will receive individual notifications for their attendance on each date.
                  Duplicate notifications are automatically prevented.
                </p>
              </div>
              
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {bulkRecords.map((record, idx) => {
                  const studentName = record.students?.user_profiles?.full_name || record.full_name || record.student_name || 'Unknown Student'
                  const status = String(record.status || '').toLowerCase()
                  const statusCls = statusStyles[status] || 'bg-slate-100 text-slate-700'
                  
                  return (
                    <div key={`${record.student_id}-${record.date}-${idx}`} className="flex items-center justify-between border rounded px-3 py-2 text-sm">
                      <div className="flex items-center gap-3">
                        <span className="font-medium text-slate-800">{studentName}</span>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${statusCls}`}>
                          {status || '—'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <span>{getStatusIcon(record.status)}</span>
                        <span>{record.date}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
            
            <div className="px-6 py-4 border-t bg-slate-50 flex items-center justify-end gap-3">
              <button 
                onClick={() => setShowBulkSendModal(false)}
                className="px-4 py-2 text-slate-600 hover:text-slate-800"
              >
                Cancel
              </button>
              <button 
                onClick={sendBulkRangeNotifications}
                disabled={sendingBulk}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {sendingBulk ? (
                  <>
                    <span className="animate-spin">⏳</span>
                    Sending...
                  </>
                ) : (
                  <>
                    📤 Send All Notifications
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Term Reports Modal */}
      {showTermSendModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full mx-4 max-h-[80vh] overflow-hidden">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-800">
                {termSendConfig.term.charAt(0).toUpperCase() + termSendConfig.term.slice(1)} Term Attendance Reports - {termRecords.length} Students
              </h2>
              <button 
                onClick={() => setShowTermSendModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              <div className="mb-4 p-3 bg-green-50 rounded-lg">
                <p className="text-sm text-green-800">
                  <strong>Term:</strong> {termSendConfig.term.charAt(0).toUpperCase() + termSendConfig.term.slice(1)} Term {termSendConfig.academicYear}/{parseInt(termSendConfig.academicYear) + 1}
                </p>
                <p className="text-sm text-green-800 mt-1">
                  Each student will receive a comprehensive attendance report for the entire term including statistics and performance feedback.
                </p>
              </div>
              
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {termRecords.map((studentData, idx) => {
                  const stats = studentData.stats
                  const rateColor = stats.attendanceRate >= 90 ? 'text-green-600' : 
                                   stats.attendanceRate >= 80 ? 'text-yellow-600' : 'text-red-600'
                  
                  return (
                    <div key={`${studentData.studentId}-${idx}`} className="border rounded-lg p-4 bg-slate-50">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-slate-800">{studentData.studentName}</h4>
                        <span className={`text-lg font-bold ${rateColor}`}>
                          {stats.attendanceRate}%
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-5 gap-2 text-xs">
                        <div className="text-center">
                          <div className="font-medium text-slate-600">Total</div>
                          <div className="text-slate-800">{stats.totalDays}</div>
                        </div>
                        <div className="text-center">
                          <div className="font-medium text-green-600">Present</div>
                          <div className="text-slate-800">{stats.present}</div>
                        </div>
                        <div className="text-center">
                          <div className="font-medium text-yellow-600">Late</div>
                          <div className="text-slate-800">{stats.late}</div>
                        </div>
                        <div className="text-center">
                          <div className="font-medium text-blue-600">Excused</div>
                          <div className="text-slate-800">{stats.excused}</div>
                        </div>
                        <div className="text-center">
                          <div className="font-medium text-red-600">Absent</div>
                          <div className="text-slate-800">{stats.absent}</div>
                        </div>
                      </div>
                      
                      <div className="mt-2 text-xs text-slate-500">
                        {stats.attendanceRate >= 95 ? '🌟 Excellent' : 
                         stats.attendanceRate >= 90 ? '✅ Good' : 
                         stats.attendanceRate >= 80 ? '⚠️ Fair' : '🚨 Poor'} attendance
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
            
            <div className="px-6 py-4 border-t bg-slate-50 flex items-center justify-end gap-3">
              <button 
                onClick={() => setShowTermSendModal(false)}
                className="px-4 py-2 text-slate-600 hover:text-slate-800"
              >
                Cancel
              </button>
              <button 
                onClick={sendTermAttendanceReports}
                disabled={sendingBulk}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {sendingBulk ? (
                  <>
                    <span className="animate-spin">⏳</span>
                    Sending Reports...
                  </>
                ) : (
                  <>
                    📊 Send Term Reports
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
