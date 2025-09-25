import React, { useEffect, useMemo, useState, useCallback } from "react";
import { supabase } from "../../lib/supabaseClient";
import { getAllClasses } from "../../services/supabase/classService";
import { subjectService } from "../../services/supabase/subjectService";
import { useSettings } from "../../contexts/SettingsContext";
import { formatFullClassName, formatClassWithLevel } from "../../utils/classNameFormatter";

// Helper: map day (1-7) <-> label
const DAY_LABELS = {
  1: "Monday",
  2: "Tuesday",
  3: "Wednesday",
  4: "Thursday",
  5: "Friday",
};
const DAY_VALUES = Object.keys(DAY_LABELS).map((k) => ({ value: Number(k), label: DAY_LABELS[k] }));

// Terms: 1 = First, 2 = Second, 3 = Third (align with DB)
const TERM_LABELS = { 1: "First", 2: "Second", 3: "Third" };
const TERM_VALUES = [1, 2, 3].map((t) => ({ value: t, label: TERM_LABELS[t] }));

// Normalize academic year from settings (e.g., '2024/2025' -> '2024-2025')
const normalizeAcademicYear = (val) => {
  if (!val) {
    const y = new Date().getFullYear();
    return `${y}-${y + 1}`;
  }
  const s = String(val).trim();
  if (s.includes('/')) {
    const [a, b] = s.split('/');
    if (a && b) return `${a}-${b}`;
  }
  if (s.includes('-')) return s;
  const n = parseInt(s, 10);
  if (Number.isFinite(n)) return `${n}-${n + 1}`;
  return s;
};

// Map settings currentTerm (e.g., '1st Term', 'Second', '3') to numeric 1/2/3
const parseTermToNumber = (val) => {
  if (val == null) return 1;
  const s = String(val).trim();
  const digit = s.match(/[1-3]/);
  if (digit) return parseInt(digit[0], 10);
  const lower = s.toLowerCase();
  if (lower.includes('first')) return 1;
  if (lower.includes('second')) return 2;
  if (lower.includes('third')) return 3;
  return 1;
};

// Normalize a row from DB to UI shape
const normalizeRow = (row) => ({
  id: row.id,
  class_id: row.class_id || row.classId || null,
  subject_id: row.subject_id || row.subjectId || null,
  teacher_id: row.teacher_id || row.teacherId || null,
  day_of_week: typeof row.day_of_week === "number" ? row.day_of_week : row.day || null,
  start_time: row.start_time || row.startTime || null,
  end_time: row.end_time || row.endTime || null,
  room_number: row.room_number || row.roomNumber || "",
  academic_year: row.academic_year || row.academicYear || "",
  term: typeof row.term === "number" ? row.term : (row.termNumber || null),
});

const AdminTimetable = () => {
  const { academicYear: globalAcademicYear, currentTerm } = useSettings();

  // Filters
  const [academicYear, setAcademicYear] = useState(() => normalizeAcademicYear(globalAcademicYear));
  const [term, setTerm] = useState(() => parseTermToNumber(currentTerm));
  const [classId, setClassId] = useState("");
  const [dayOfWeek, setDayOfWeek] = useState(0); // 0 = All, 1..7

  // Keep term/year in sync with Super Admin settings when it changes
  useEffect(() => {
    setTerm(parseTermToNumber(currentTerm));
  }, [currentTerm]);
  useEffect(() => {
    setAcademicYear(normalizeAcademicYear(globalAcademicYear));
  }, [globalAcademicYear]);

  // Data
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Modal state
  const [showAdd, setShowAdd] = useState(false);
  const [creating, setCreating] = useState(false);

  // New entry state
  const [draft, setDraft] = useState({
    class_id: "",
    subject_id: "",
    teacher_id: "",
    day_of_week: 1,
    start_time: "08:00",
    end_time: "08:40",
    room_number: "",
  });

  // Load reference data
  useEffect(() => {
    (async () => {
      try {
        const classesRes = await getAllClasses();
        const cls = Array.isArray(classesRes) ? classesRes : (classesRes?.data || []);
        setClasses(cls);
      } catch (e) {
        console.error("Failed to load classes", e);
      }
      try {
        const subsRes = await subjectService.getAllSubjects();
        const subs = Array.isArray(subsRes) ? subsRes : (subsRes?.data || []);
        setSubjects(subs);
      } catch (e) {
        console.error("Failed to load subjects", e);
      }
      try {
        // Prefer classService.getTeachers for a simple teacher list
        const { getTeachers } = await import("../../services/supabase/classService");
        const teachRes = await getTeachers();
        const t = Array.isArray(teachRes) ? teachRes : (teachRes?.data || []);
        setTeachers(t);
      } catch (e) {
        console.error("Failed to load teachers", e);
      }
    })();
  }, []);

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Admin can read directly from timetables
      let query = supabase.from("timetables").select("*").eq("is_active", true);
      if (academicYear) query = query.eq("academic_year", academicYear);
      if (term) query = query.eq("term", term);
      if (classId) query = query.eq("class_id", classId);
      if (dayOfWeek && dayOfWeek >= 1 && dayOfWeek <= 7) query = query.eq("day_of_week", dayOfWeek);

      const { data, error } = await query.order("day_of_week", { ascending: true }).order("start_time", { ascending: true });
      if (error) throw error;
      setEntries((data || []).map(normalizeRow));
    } catch (e) {
      console.error("Failed to load timetable entries", e);
      setError(e.message || "Failed to load timetable entries");
    } finally {
      setLoading(false);
    }
  }, [academicYear, term, classId, dayOfWeek]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  const classMap = useMemo(() => {
    const m = new Map();
    (classes || []).forEach((c) => m.set(c.id, c));
    return m;
  }, [classes]);

  const subjectMap = useMemo(() => {
    const m = new Map();
    (subjects || []).forEach((s) => m.set(s.id, s));
    return m;
  }, [subjects]);

  const teacherMap = useMemo(() => {
    const m = new Map();
    (teachers || []).forEach((t) => m.set(t.id || t.user_id || t.uid, t));
    return m;
  }, [teachers]);

  // Collapse duplicate core subject rows by base class level (JSS/SSS N) for same day/time/subject
  const groupedRows = useMemo(() => {
    const items = new Map();
    const normName = (name) => String(name || '').toUpperCase().trim().replace(/\s+/g, ' ');
    const baseKeyFromName = (name) => {
      const raw = normName(name);
      const stripped = raw.replace(/\s+(SCIENCE|ARTS?|COMMERCIAL)$/,'');
      let m = stripped.match(/^(JSS|JS|JUNIOR( SECONDARY)?)\s*(\d+)/i);
      if (m) return `JSS ${m[3]}`;
      m = stripped.match(/^(SSS|SS|SENIOR( SECONDARY)?)\s*(\d+)/i);
      if (m) return `SSS ${m[3]}`;
      const num = (stripped.match(/\b(\d)\b/) || [])[1];
      if (/JSS|JUNIOR/.test(stripped) && num) return `JSS ${num}`;
      if (/SSS|SENIOR/.test(stripped) && num) return `SSS ${num}`;
      return stripped;
    };

    for (const e of entries) {
      const sub = subjectMap.get(e.subject_id);
      const cls = classMap.get(e.class_id);
      const isCore = String(sub?.department || '').toLowerCase() === 'core';
      const base = cls ? baseKeyFromName(cls.name) : String(e.class_id);
      const classLabel = cls
        ? (isCore ? formatClassWithLevel(cls.name, cls.level) : formatFullClassName(cls.name, cls.level, cls.category))
        : String(e.class_id);
      const classKey = isCore ? base : String(e.class_id);
      const key = `${e.academic_year}|${e.term}|${e.day_of_week}|${e.start_time}|${e.end_time}|${e.subject_id}|${classKey}`;
      if (!items.has(key)) {
        items.set(key, {
          id: e.id,
          academic_year: e.academic_year,
          term: e.term,
          day_of_week: e.day_of_week,
          start_time: e.start_time,
          end_time: e.end_time,
          subject_id: e.subject_id,
          teacher_id: e.teacher_id,
          room_number: e.room_number,
          classLabel,
          sub,
        });
      }
    }
    return Array.from(items.values());
  }, [entries, subjectMap, classMap]);

  const resetDraft = () => {
    setDraft({ class_id: classId || "", subject_id: "", teacher_id: "", day_of_week: 1, start_time: "08:00", end_time: "08:40", room_number: "" });
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      const payload = {
        class_id: draft.class_id,
        subject_id: draft.subject_id,
        teacher_id: draft.teacher_id,
        day_of_week: Number(draft.day_of_week),
        start_time: draft.start_time,
        end_time: draft.end_time,
        room_number: draft.room_number || null,
        academic_year: academicYear,
        term: term,
        is_active: true,
      };

      // Try RPC first if available; fallback to direct insert
      let rpcErr = null;
      try {
        const { data: rpcData, error: rpcError } = await supabase.rpc("admin_upsert_timetables", { entries: [payload] });
        if (rpcError) rpcErr = rpcError;
        else if (rpcData) {
          // success
        }
      } catch (ex) {
        rpcErr = ex;
      }

      if (rpcErr) {
        const { error: insErr } = await supabase.from("timetables").insert(payload).select("*");
        if (insErr) throw insErr;
      }

      setShowAdd(false);
      resetDraft();
      await fetchEntries();
    } catch (e2) {
      alert(e2.message || "Failed to create timetable entry");
      console.error(e2);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id) => {
    if (!id) return;
    if (!window.confirm("Delete this timetable entry?")) return;
    try {
      // Try RPC delete first
      let rpcErr = null;
      try {
        const { error: rpcError } = await supabase.rpc("admin_delete_timetable_entry", { id });
        if (rpcError) rpcErr = rpcError;
      } catch (ex) {
        rpcErr = ex;
      }
      if (rpcErr) {
        const { error } = await supabase.from("timetables").delete().eq("id", id);
        if (error) throw error;
      }
      await fetchEntries();
    } catch (e) {
      alert(e.message || "Failed to delete entry");
      console.error(e);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-800">Timetable (Admin)</h1>
            <p className="text-slate-600 mt-1">Centralized schedule management (academic year, term, class)</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            <div className="px-3 py-2 bg-slate-100 rounded-lg text-sm text-slate-700">
              Year: {academicYear}
            </div>
            <div className="px-3 py-2 bg-slate-100 rounded-lg text-sm text-slate-700">
              Term: {TERM_LABELS[term]} Term
            </div>
            <select
              value={classId}
              onChange={(e) => setClassId(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white text-sm"
            >
              <option value="">All Classes</option>
              {(classes || []).map((c) => (
                <option key={c.id} value={c.id}>{formatFullClassName(c.name, c.level, c.category)}</option>
              ))}
            </select>
            <select
              value={dayOfWeek}
              onChange={(e) => setDayOfWeek(Number(e.target.value))}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white text-sm"
            >
              <option value={0}>All Days</option>
              {DAY_VALUES.map((d) => (
                <option key={d.value} value={d.value}>{d.label}</option>
              ))}
            </select>
            <button
              onClick={() => setShowAdd(true)}
              className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium"
            >
              Add Entry
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-slate-200">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-800">Entries</h2>
            <button onClick={fetchEntries} className="text-sm px-3 py-1.5 rounded bg-slate-100 hover:bg-slate-200">Refresh</button>
          </div>
          {loading ? (
            <div className="p-6 text-slate-500">Loading...</div>
          ) : error ? (
            <div className="p-6 text-red-600">{error}</div>
          ) : entries.length === 0 ? (
            <div className="p-6 text-slate-500">No entries found for selected filters.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-left px-4 py-2 border-b">Class</th>
                    <th className="text-left px-4 py-2 border-b">Day</th>
                    <th className="text-left px-4 py-2 border-b">Time</th>
                    <th className="text-left px-4 py-2 border-b">Subject</th>
                    <th className="text-left px-4 py-2 border-b">Teacher</th>
                    <th className="text-left px-4 py-2 border-b">Room</th>
                    <th className="text-left px-4 py-2 border-b">Term</th>
                    <th className="text-left px-4 py-2 border-b">Year</th>
                    <th className="text-left px-4 py-2 border-b">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {groupedRows.map((row) => {
                    const tch = teacherMap.get(row.teacher_id);
                    return (
                      <tr key={`${row.academic_year}-${row.term}-${row.day_of_week}-${row.start_time}-${row.end_time}-${row.subject_id}-${row.classLabel}`} className="odd:bg-white even:bg-slate-50/50">
                        <td className="px-4 py-2 border-b">{row.classLabel}</td>
                        <td className="px-4 py-2 border-b">{DAY_LABELS[row.day_of_week] || row.day_of_week}</td>
                        <td className="px-4 py-2 border-b">{row.start_time?.slice(0,5)} - {row.end_time?.slice(0,5)}</td>
                        <td className="px-4 py-2 border-b">{row.sub?.name || row.subject_id}</td>
                        <td className="px-4 py-2 border-b">{tch?.full_name || tch?.name || row.teacher_id}</td>
                        <td className="px-4 py-2 border-b">{row.room_number || '-'}</td>
                        <td className="px-4 py-2 border-b">{TERM_LABELS[row.term] || row.term}</td>
                        <td className="px-4 py-2 border-b">{row.academic_year}</td>
                        <td className="px-4 py-2 border-b">
                          <button
                            onClick={() => handleDelete(row.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {showAdd && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl">
              <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-800">Add Timetable Entry</h3>
                <button onClick={() => { setShowAdd(false); resetDraft(); }} className="text-slate-500 hover:text-slate-700">✕</button>
              </div>
              <form onSubmit={handleCreate} className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Class</label>
                  <select
                    required
                    value={draft.class_id}
                    onChange={(e) => setDraft((d) => ({ ...d, class_id: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white text-sm"
                  >
                    <option value="" disabled>Select class</option>
                    {(classes || []).map((c) => (
                      <option key={c.id} value={c.id}>{formatFullClassName(c.name, c.level, c.category)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Subject</label>
                  <select
                    required
                    value={draft.subject_id}
                    onChange={(e) => setDraft((d) => ({ ...d, subject_id: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white text-sm"
                  >
                    <option value="" disabled>Select subject</option>
                    {(subjects || []).map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Teacher</label>
                  <select
                    required
                    value={draft.teacher_id}
                    onChange={(e) => setDraft((d) => ({ ...d, teacher_id: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white text-sm"
                  >
                    <option value="" disabled>Select teacher</option>
                    {(teachers || []).map((t) => (
                      <option key={t.id || t.user_id || t.uid} value={t.id || t.user_id || t.uid}>
                        {t.full_name || t.name || t.email || (t.id || t.user_id || t.uid)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Day of Week</label>
                  <select
                    required
                    value={draft.day_of_week}
                    onChange={(e) => setDraft((d) => ({ ...d, day_of_week: Number(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white text-sm"
                  >
                    {DAY_VALUES.map((d) => (
                      <option key={d.value} value={d.value}>{d.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Start Time</label>
                  <input
                    type="time"
                    required
                    value={draft.start_time}
                    onChange={(e) => setDraft((d) => ({ ...d, start_time: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">End Time</label>
                  <input
                    type="time"
                    required
                    value={draft.end_time}
                    onChange={(e) => setDraft((d) => ({ ...d, end_time: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Room</label>
                  <input
                    type="text"
                    value={draft.room_number}
                    onChange={(e) => setDraft((d) => ({ ...d, room_number: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white text-sm"
                    placeholder="e.g., Room 101"
                  />
                </div>
                <div className="sm:col-span-2 flex items-center justify-end gap-3 mt-2">
                  <button type="button" onClick={() => { setShowAdd(false); resetDraft(); }} className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800">Cancel</button>
                  <button type="submit" disabled={creating} className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white">
                    {creating ? "Saving..." : "Save Entry"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminTimetable;
