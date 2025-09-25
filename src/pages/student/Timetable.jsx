import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../hooks/useAuth";
import { useSettings } from "../../contexts/SettingsContext";
import { subjectService } from "../../services/supabase/subjectService";

// Day mapping
const DAY_LABELS = {
  1: "Monday",
  2: "Tuesday",
  3: "Wednesday",
  4: "Thursday",
  5: "Friday",
  6: "Saturday",
  7: "Sunday",
};
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 7];

// Normalize academic year e.g., '2024/2025' -> '2024-2025'
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

// Parse settings currentTerm (e.g., '1st Term', 'Second', '3') -> 1/2/3
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

// Format HH:MM[:SS] -> HH:MM
const formatTime = (t) => {
  if (!t) return t;
  return String(t).slice(0, 5);
};

const StudentTimetable = () => {
  const { user } = useAuth();
  const { academicYear: settingsYear, currentTerm } = useSettings();

  const academicYear = useMemo(() => normalizeAcademicYear(settingsYear), [settingsYear]);
  const term = useMemo(() => parseTermToNumber(currentTerm), [currentTerm]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [entries, setEntries] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [teacherMap, setTeacherMap] = useState(new Map());

  // Load subjects (for name lookup)
  useEffect(() => {
    (async () => {
      try {
        const res = await subjectService.getAllSubjects();
        const list = Array.isArray(res) ? res : (res?.data || []);
        setSubjects(list);
      } catch (e) {
        // Soft fail
        console.warn('Failed to load subjects for timetable:', e);
      }
    })();
  }, []);

  // Load timetable for student's class using centralized table
  useEffect(() => {
    const load = async () => {
      const userId = user?.id || user?.uid;
      if (!userId) return;
      setLoading(true);
      setError(null);
      try {
        // Get student's class_id
        let profile;
        let profileErr;
        const prof1 = await supabase
          .from('user_profiles')
          .select('class_id')
          .eq('id', userId)
          .maybeSingle();
        profile = prof1.data; profileErr = prof1.error;
        if (profileErr || !profile) {
          const prof2 = await supabase
            .from('user_profiles')
            .select('class_id')
            .eq('uid', userId)
            .maybeSingle();
          profile = prof2.data; profileErr = prof2.error;
        }
        if (profileErr) throw profileErr;
        const classId = profile?.class_id;
        if (!classId) {
          setEntries([]);
          setLoading(false);
          return;
        }

        // Attempt server RPC first (RLS-safe)
        let list = [];
        try {
          const { data: rpcData, error: rpcErr } = await supabase
            .rpc('list_timetable_for_current_student', { p_academic_year: academicYear, p_term: term });
          if (!rpcErr && Array.isArray(rpcData) && rpcData.length) {
            list = rpcData;
          }
        } catch (rpcEx) {
          console.warn('RPC list_timetable_for_current_student failed or unavailable:', rpcEx);
        }

        // Build academic year variants to tolerate legacy formats
        const raw = settingsYear;
        const norm = academicYear;
        const alt = raw ? (String(raw).includes('/') ? String(raw).replace('/', '-') : String(raw).replace('-', '/')) : null;
        const yearCandidates = Array.from(new Set([norm, String(raw || ''), alt].filter(Boolean)));

        // Query timetables by class/year/term (try variants) if RPC returned nothing
        if ((!list || list.length === 0) && yearCandidates.length > 0) {
          const q = supabase
            .from('timetables')
            .select('*')
            .eq('is_active', true)
            .eq('class_id', classId)
            .in('academic_year', yearCandidates)
            .eq('term', term)
            .order('day_of_week', { ascending: true })
            .order('start_time', { ascending: true });
          const { data, error } = await q;
          if (error) throw error;
          list = data || [];
        }

        // Fallback: if still empty, load latest for class regardless of year/term
        if (!list || list.length === 0) {
          const { data: anyYear, error: anyErr } = await supabase
            .from('timetables')
            .select('*')
            .eq('is_active', true)
            .eq('class_id', classId)
            .order('day_of_week', { ascending: true })
            .order('start_time', { ascending: true });
          if (!anyErr && anyYear) list = anyYear;
        }

        setEntries(list);

        // Build teacher id set and fetch names once
        const teacherIds = Array.from(new Set((list || []).map(e => e.teacher_id).filter(Boolean)));
        if (teacherIds.length > 0) {
          const { data: teachers, error: tErr } = await supabase
            .from('user_profiles')
            .select('id, full_name, email')
            .in('id', teacherIds);
          if (!tErr && teachers) {
            const map = new Map();
            teachers.forEach(t => map.set(t.id, t));
            setTeacherMap(map);
          } else {
            setTeacherMap(new Map());
          }
        } else {
          setTeacherMap(new Map());
        }
      } catch (e) {
        console.error('Failed to load student timetable:', e);
        setError('Could not load timetable.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user?.id, user?.uid, academicYear, term, settingsYear]);

  const subjectNameById = useMemo(() => {
    const m = new Map();
    (subjects || []).forEach(s => m.set(s.id, s.name));
    return m;
  }, [subjects]);

  // Group entries by day
  const grouped = useMemo(() => {
    const m = new Map();
    (entries || []).forEach(e => {
      const day = e.day_of_week;
      if (!m.has(day)) m.set(day, []);
      m.get(day).push(e);
    });
    // Ensure order by start_time already applied; just return in day order
    return DAY_ORDER.filter(d => m.has(d)).map(d => ({ day: d, items: m.get(d) }));
  }, [entries]);

  if (loading) return <div className="p-6">Loading timetable...</div>;
  if (error) return <div className="p-6 text-red-500">{error}</div>;
  if (!entries || entries.length === 0) return <div className="p-6 text-gray-500">No timetable found.</div>;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">📅 Weekly Timetable</h1>
        <div className="text-sm text-slate-600">{academicYear} • Term {term}</div>
      </div>

      {grouped.map(({ day, items }) => (
        <div key={day} className="mb-6">
          <h2 className="text-xl font-semibold mb-2 text-emerald-700">{DAY_LABELS[day]}</h2>
          <div className="border rounded-lg overflow-hidden">
            {items.map((e) => {
              const subj = subjectNameById.get(e.subject_id) || e.subject_id || '—';
              const teacher = teacherMap.get(e.teacher_id);
              const teacherName = teacher?.full_name || teacher?.email || '—';
              return (
                <div key={`${e.id}`} className="flex justify-between items-center px-4 py-2 border-b text-sm bg-white hover:bg-gray-50">
                  <div className="font-medium w-1/3">{formatTime(e.start_time)} - {formatTime(e.end_time)}</div>
                  <div className="w-1/3">{subj}</div>
                  <div className="text-gray-500 text-sm w-1/3 text-right">{teacherName}</div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};

export default StudentTimetable;
