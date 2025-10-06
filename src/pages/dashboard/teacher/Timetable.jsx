import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../lib/supabaseClient";
import { useAuth } from "../../../hooks/useAuth";
import { useSettings } from "../../../contexts/SettingsContext";
import { subjectService } from "../../../services/supabase/subjectService";
import { formatFullClassName, formatClassWithLevel } from "../../../utils/classNameFormatter";
import { getNormalizedSession, buildAcademicYearVariants, toRpcParams, formatSessionBadge } from "../../../utils/sessionUtils";

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



// Format HH:MM[:SS] -> HH:MM
const formatTime = (t) => {
  if (!t) return t;
  return String(t).slice(0, 5);
};

const TeacherTimetable = () => {
  const { user } = useAuth();
  const { academicYear: settingsYear, currentTerm } = useSettings();

  const { academicYear, term } = useMemo(
    () => getNormalizedSession({ academicYear: settingsYear, currentTerm }),
    [settingsYear, currentTerm]
  );

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [entries, setEntries] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [classMap, setClassMap] = useState(new Map());

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

  // Load teacher timetable using centralized table (admin-defined)
  useEffect(() => {
    const load = async () => {
      const userId = user?.id || user?.uid;
      if (!userId) return;
      setLoading(true);
      setError(null);
      try {
        // Attempt server RPC first (RLS-safe)
        let list = [];
        try {
          const { data: rpcData, error: rpcErr } = await supabase
            .rpc('list_timetable_for_current_teacher', toRpcParams(settingsYear, currentTerm));
          if (!rpcErr && Array.isArray(rpcData) && rpcData.length) {
            list = rpcData;
          }
        } catch (rpcEx) {
          console.warn('RPC list_timetable_for_current_teacher failed or unavailable:', rpcEx);
        }

        // Build academic year variants to tolerate legacy formats
        const yearCandidates = buildAcademicYearVariants(settingsYear);

        // Query timetables by teacher/year/term (try variants) if RPC returned nothing
        if ((!list || list.length === 0) && yearCandidates.length > 0) {
          const q = supabase
            .from('timetables')
            .select('*')
            .eq('is_active', true)
            .eq('teacher_id', userId)
            .in('academic_year', yearCandidates)
            .eq('term', term)
            .order('day_of_week', { ascending: true })
            .order('start_time', { ascending: true });
          const { data, error } = await q;
          if (error) throw error;
          list = data || [];
        }

        // Fallback: if still empty, load latest for teacher regardless of year/term
        if (!list || list.length === 0) {
          const { data: anyYear, error: anyErr } = await supabase
            .from('timetables')
            .select('*')
            .eq('is_active', true)
            .eq('teacher_id', userId)
            .order('day_of_week', { ascending: true })
            .order('start_time', { ascending: true });
          if (!anyErr && anyYear) list = anyYear;
        }

        setEntries(list);

        // Fetch class names for display
        const classIds = Array.from(new Set((list || []).map(e => e.class_id).filter(Boolean)));
        if (classIds.length > 0) {
          const { data: classes, error: cErr } = await supabase
            .from('classes')
            .select('id, name, level, category')
            .in('id', classIds);
          if (!cErr && classes) {
            const map = new Map();
            classes.forEach(c => map.set(c.id, c));
            setClassMap(map);
          } else {
            setClassMap(new Map());
          }
        } else {
          setClassMap(new Map());
        }
      } catch (e) {
        console.error('Failed to load teacher timetable:', e);
        setError('Could not load timetable.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user?.id, user?.uid, academicYear, term, settingsYear]);

  const subjectById = useMemo(() => {
    const m = new Map();
    (subjects || []).forEach(s => m.set(s.id, s));
    return m;
  }, [subjects]);

  // Group entries by day and collapse duplicate rows for core subjects at the same base class level
  const grouped = useMemo(() => {
    const byDay = new Map();
    (entries || []).forEach(e => {
      const day = e.day_of_week;
      if (!byDay.has(day)) byDay.set(day, []);
      byDay.get(day).push(e);
    });

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

    return DAY_ORDER.filter(d => byDay.has(d)).map(d => {
      const list = byDay.get(d) || [];
      const itemsMap = new Map();
      for (const e of list) {
        const subj = subjectById.get(e.subject_id);
        const isCore = String(subj?.department || '').toLowerCase() === 'core';
        const cl = classMap.get(e.class_id);
        const base = cl ? baseKeyFromName(cl.name) : String(e.class_id);
        const classLabel = cl
          ? (isCore ? formatClassWithLevel(cl.name, cl.level) : formatFullClassName(cl.name, cl.level, cl.category))
          : '—';
        const classKey = isCore ? base : String(e.class_id);
        const key = `${formatTime(e.start_time)}|${formatTime(e.end_time)}|${e.subject_id}|${classKey}`;
        if (!itemsMap.has(key)) {
          itemsMap.set(key, {
            ...e,
            subjectName: subj?.name || e.subject_id,
            classLabel,
          });
        }
      }
      return { day: d, items: Array.from(itemsMap.values()) };
    });
  }, [entries, classMap, subjectById]);

  if (loading) return <div className="p-6">Loading timetable...</div>;
  if (error) return <div className="p-6 text-red-500">{error}</div>;
  if (!entries || entries.length === 0) return <div className="p-6 text-gray-500">No timetable found.</div>;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">📅 My Weekly Timetable</h1>
        <div className="text-sm text-slate-600">{formatSessionBadge(settingsYear, currentTerm)}</div>
      </div>

      {grouped.map(({ day, items }) => (
        <div key={day} className="mb-6">
          <h2 className="text-xl font-semibold mb-2 text-emerald-700">{DAY_LABELS[day]}</h2>
          <div className="border rounded-lg overflow-hidden">
            {items.map((e) => (
              <div key={`${e.day_of_week}-${e.start_time}-${e.end_time}-${e.subject_id}-${e.classLabel}`} className="flex justify-between items-center px-4 py-2 border-b text-sm bg-white hover:bg-gray-50">
                <div className="font-medium w-1/3">{formatTime(e.start_time)} - {formatTime(e.end_time)}</div>
                <div className="w-1/3">{e.subjectName}</div>
                <div className="text-gray-500 text-sm w-1/3 text-right">{e.classLabel}</div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default TeacherTimetable;
