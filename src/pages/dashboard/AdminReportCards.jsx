import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { publishReportsForClass } from '../../services/reportCardPublisher';
import { getAllClasses, getStudentsInClass } from '../../services/supabase/classService';
import { getAllStudents } from '../../services/supabase/studentService';
import { supabase } from '../../lib/supabaseClient';
import { useSettings } from '../../contexts/SettingsContext';

const AdminReportCards = () => {
  // Reference data
  const [classes, setClasses] = useState([]);
  const { academicYear, currentTerm } = useSettings();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [classGroups, setClassGroups] = useState([]);

  // Bulk report cards state
  const [bulkClassId, setBulkClassId] = useState('');
  const [bulkTerm, setBulkTerm] = useState(1);
  const [bulkYear, setBulkYear] = useState(new Date().getFullYear());
  const [isBulkGenerating, setIsBulkGenerating] = useState(false);
  const [bulkOutcomes, setBulkOutcomes] = useState([]); // [{ studentId, success, url?, error? }]
  const [groupRoster, setGroupRoster] = useState([]);
  const [rosterLoading, setRosterLoading] = useState(false);
  const [rosterQuery, setRosterQuery] = useState('');
  const [resultsCounts, setResultsCounts] = useState({}); // { studentId: count }
  const [loadingCounts, setLoadingCounts] = useState(false);

  // Preview & publish workflow state (removed preview queue)

  // Published report cards listing state
  const [listTerm, setListTerm] = useState(''); // optional filter
  const [listYear, setListYear] = useState(''); // optional filter
  const [listSearch, setListSearch] = useState('');
  const [listPage, setListPage] = useState(0);
  const [listPageSize, setListPageSize] = useState(20);
  const [listTotal, setListTotal] = useState(0);
  const [listLoading, setListLoading] = useState(false);
  const [publishedCards, setPublishedCards] = useState([]);

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setLoading(true);
        const [classesRes, studentsRes] = await Promise.all([
          getAllClasses(),
          getAllStudents(),
        ]);
        const classesData = Array.isArray(classesRes?.data) ? classesRes.data : (Array.isArray(classesRes) ? classesRes : []);
        const studentsData = Array.isArray(studentsRes?.data) ? studentsRes.data : (Array.isArray(studentsRes) ? studentsRes : []);
        setClasses(classesData);
        setStudents(studentsData);
        // Build grouped classes by base label (strip category suffixes like Science/Arts/etc.)
        const baseNormalize = (name) => {
          if (!name) return { key: '', label: '' }
          let n = String(name).trim()
          n = n.replace(/\s+(Science|Sciences|Arts|Commercial|Commerce|Management|Option\s*[A-Z])$/i, '')
          n = n.replace(/([A-Za-z]+)\s*([0-9]+)/g, '$1 $2')
          const label = n.replace(/\s+/g, ' ').trim()
          const key = label.toLowerCase()
          return { key, label }
        }
        const groupsMap = new Map()
        for (const c of classesData) {
          const { key, label } = baseNormalize(c.name)
          const entry = groupsMap.get(key) || { key, label, classIds: [] }
          entry.classIds.push(c.id)
          groupsMap.set(key, entry)
        }
        const groups = Array.from(groupsMap.values()).sort((a, b) => a.label.localeCompare(b.label))
        setClassGroups(groups)
      } catch (e) {
        console.error('Error loading reference data:', e);
        setClasses([]);
        setStudents([]);
      } finally {
        setLoading(false);
      }
    };
    fetchInitialData();
  }, []);

  // Sync defaults from global settings
  useEffect(() => {
    const s = String(currentTerm || '1st Term').toLowerCase();
    setBulkTerm(s.includes('2') ? 2 : s.includes('3') ? 3 : 1);
    const yearHead = (() => {
      const ys = String(academicYear || '');
      if (ys.includes('/')) {
        const head = parseInt(ys.split('/')[0], 10);
        return Number.isFinite(head) ? head : new Date().getFullYear();
      }
      const n = parseInt(ys, 10);
      return Number.isFinite(n) ? n : new Date().getFullYear();
    })();
    setBulkYear(yearHead);
  }, [academicYear, currentTerm]);

  // Load students for selected grouped class
  useEffect(() => {
    let alive = true;
    (async () => {
      setGroupRoster([]);
      if (!bulkClassId) return;
      const group = classGroups.find(g => g.key === bulkClassId);
      const ids = group ? group.classIds : [];
      if (!ids.length) return;
      setRosterLoading(true);
      try {
        const results = await Promise.all(ids.map(id => getStudentsInClass(id)));
        const merged = [];
        const seen = new Set();
        for (const res of results) {
          const list = res?.success ? (res.data || []) : (Array.isArray(res) ? res : []);
          for (const s of list) {
            if (!seen.has(s.id)) { seen.add(s.id); merged.push(s); }
          }
        }
        merged.sort((a,b) => (a.full_name || '').localeCompare(b.full_name || ''));
        if (alive) setGroupRoster(merged);
      } catch (e) {
        console.error('Failed loading group roster:', e);
        if (alive) setGroupRoster([]);
      } finally {
        if (alive) setRosterLoading(false);
      }
    })();
    return () => { alive = false };
  }, [bulkClassId, classGroups]);

  // Load exam results counts per student for selected term & year
  useEffect(() => {
    let alive = true;
    (async () => {
      setResultsCounts({});
      if (!groupRoster || groupRoster.length === 0) return;
      if (!bulkTerm || !bulkYear) return;
      setLoadingCounts(true);
      try {
        const ids = groupRoster.map((s) => s.id);
        const chunkSize = 200;
        const counts = {};
        for (let i = 0; i < ids.length; i += chunkSize) {
          const chunk = ids.slice(i, i + chunkSize);
          const { data, error } = await supabase
            .from('exam_results')
            .select('student_id')
            .in('student_id', chunk)
            .eq('term', Number(bulkTerm))
            .eq('year', Number(bulkYear))
            .eq('status', 'graded');
          if (error) {
            console.warn('Failed to fetch exam result counts chunk:', error.message);
            continue;
          }
          (data || []).forEach((row) => {
            const sid = row.student_id;
            counts[sid] = (counts[sid] || 0) + 1;
          });
        }
        if (alive) setResultsCounts(counts);
      } catch (e) {
        console.error('Error loading exam results counts:', e);
        if (alive) setResultsCounts({});
      } finally {
        if (alive) setLoadingCounts(false);
      }
    })();
    return () => { alive = false };
  }, [groupRoster, bulkTerm, bulkYear]);

  const handleBulkGenerateReports = async () => {
    try {
      if (!bulkClassId || !bulkTerm || !bulkYear) {
        alert('Select Class, Term, and Academic Year');
        return;
      }
      const classStudents = groupRoster;
      if (!classStudents || classStudents.length === 0) {
        alert('No students found in selected class');
        return;
      }
      if (!window.confirm(`Generate report cards for ${classStudents.length} students?`)) return;

      setIsBulkGenerating(true);
      setBulkOutcomes([]);

      const studentIds = classStudents.map(s => s.id);
      const results = await publishReportsForClass({
        studentIds,
        term: Number(bulkTerm),
        academicYear: String(bulkYear),
      }, { persist: true, status: 'generated', bucket: 'report-cards' });

      setBulkOutcomes(results || []);

      const successCount = (results || []).filter(r => r.success).length;
      const failCount = (results || []).length - successCount;
      alert(`Bulk generation complete.\nSuccessful: ${successCount}\nFailed: ${failCount}`);
    } catch (e) {
      console.error('Bulk report generation failed:', e);
      alert(e?.userMessage || e?.message || 'Bulk generation failed');
    } finally {
      setIsBulkGenerating(false);
    }
  };

  // Load published report cards with filters + pagination
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setListLoading(true);
        // Build base query
        let query = supabase
          .from('student_documents')
          .select('id, student_id, file_name, file_url, file_path, storage_path, bucket_name, term, academic_year, uploaded_at, mime_type, description', { count: 'exact' })
          .eq('document_type', 'report_card');

        if (listTerm !== '' && listTerm !== null) {
          query = query.eq('term', Number(listTerm));
        }
        if (listYear) {
          query = query.eq('academic_year', String(listYear));
        }

        // Server-side filter by student search (name or admission) if provided
        if (listSearch && listSearch.trim().length >= 2) {
          const q = listSearch.toLowerCase().trim();
          const matchedIds = (students || [])
            .filter((s) => {
              const name = (s.full_name || '').toLowerCase();
              const adm = (s.admission_number || '').toLowerCase();
              return name.includes(q) || adm.includes(q);
            })
            .map((s) => s.id);
          if (matchedIds.length === 0) {
            if (alive) {
              setPublishedCards([]);
              setListTotal(0);
            }
            return;
          }
          // Avoid extremely large IN lists
          const limitIds = matchedIds.slice(0, 1000);
          query = query.in('student_id', limitIds);
        }

        // Pagination window
        const start = listPage * listPageSize;
        const end = start + listPageSize - 1;
        query = query.order('uploaded_at', { ascending: false }).range(start, end);

        const { data, error, count } = await query;
        if (error) throw error;

        if (alive) {
          setPublishedCards(Array.isArray(data) ? data : []);
          setListTotal(Number.isFinite(count) ? count : 0);
        }
      } catch (e) {
        console.error('Failed to load published report cards:', e);
        if (alive) {
          setPublishedCards([]);
          setListTotal(0);
        }
      } finally {
        if (alive) setListLoading(false);
      }
    })();
    return () => { alive = false };
  }, [listTerm, listYear, listSearch, listPage, listPageSize, students]);

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-slate-200 rounded w-1/3"></div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-10 bg-slate-200 rounded"></div>
          ))}
        </div>
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-slate-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-slate-800">Report Cards (Admin)</h1>
          <p className="text-slate-600 mt-1">Generate and publish official term report card PDFs in bulk</p>
        </div>
      </div>

      {/* Bulk Generate Report Cards */}
      <div className="bg-white rounded-lg shadow-md p-6 border border-slate-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-800">Bulk Generate Report Cards</h2>
          <span className="text-xs text-slate-500 bg-purple-50 px-2 py-1 rounded">PDF</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Class Group</label>
            <select
              value={bulkClassId}
              onChange={(e) => setBulkClassId(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select Class</option>
              {classGroups.map(g => (
                <option key={g.key} value={g.key}>{g.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Term</label>
            <select
              value={bulkTerm}
              onChange={(e) => setBulkTerm(Number(e.target.value))}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value={1}>1st Term</option>
              <option value={2}>2nd Term</option>
              <option value={3}>3rd Term</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Academic Year</label>
            <input
              type="number"
              value={bulkYear}
              onChange={(e) => setBulkYear(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={handleBulkGenerateReports}
              disabled={!bulkClassId || isBulkGenerating}
              className={`w-full px-4 py-2 rounded-lg font-medium text-white ${(!bulkClassId || isBulkGenerating) ? 'bg-purple-600 opacity-50 cursor-not-allowed' : 'bg-purple-600 hover:bg-purple-700'}`}
            >
              {isBulkGenerating ? 'Generating...' : 'Generate for Class'}
            </button>
          </div>
        </div>

        {/* Roster preview */}
        {bulkClassId && (
          <div className="mt-4 text-sm text-slate-600">
            {rosterLoading ? (
              <div>Loading students...</div>
            ) : (
              <div>{groupRoster.length} student(s) in selected class group.</div>
            )}
          </div>
        )}

        {/* Affected students list */}
        {bulkClassId && !rosterLoading && groupRoster.length > 0 && (
          <div className="mt-3 bg-white rounded-lg border border-slate-200 shadow-sm">
            <div className="px-4 py-3 border-b flex items-center justify-between">
              <div className="font-medium text-slate-800">Affected Students</div>
              <input
                type="text"
                value={rosterQuery}
                onChange={(e) => setRosterQuery(e.target.value)}
                placeholder="Search name or admission"
                className="border rounded px-2 py-1 text-sm w-56"
              />
            </div>
            <div className="max-h-64 overflow-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="text-left px-3 py-2">Name</th>
                    <th className="text-left px-3 py-2">Admission No</th>
                    <th className="text-left px-3 py-2">Class</th>
                    <th className="text-left px-3 py-2">Exam Results (Term {bulkTerm}, {bulkYear}) {loadingCounts ? '• loading' : ''}</th>
                  </tr>
                </thead>
                <tbody>
                  {groupRoster
                    .filter((s) => {
                      const q = (rosterQuery || '').toLowerCase().trim();
                      if (!q) return true;
                      const name = (s.full_name || '').toLowerCase();
                      const adm = (s.admission_number || '').toLowerCase();
                      return name.includes(q) || adm.includes(q);
                    })
                    .map((s) => {
                      const cls = classes.find((c) => c.id === s.class_id);
                      const className = cls?.name || '—';
                      const count = resultsCounts[s.id] || 0;
                      return (
                        <tr key={s.id} className="border-t">
                          <td className="px-3 py-2 whitespace-nowrap">{s.full_name || '—'}</td>
                          <td className="px-3 py-2 whitespace-nowrap">{s.admission_number || '—'}</td>
                          <td className="px-3 py-2 whitespace-nowrap">{className}</td>
                          <td className="px-3 py-2 whitespace-nowrap">
                            <span className={count > 0 ? 'text-slate-800' : 'text-red-600'}>{count}</span>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {bulkOutcomes.length > 0 && (
          <div className="mt-4">
            <div className="text-sm text-slate-600 mb-2">Results</div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium text-slate-500">Student</th>
                    <th className="px-4 py-2 text-left font-medium text-slate-500">Admission</th>
                    <th className="px-4 py-2 text-left font-medium text-slate-500">Status</th>
                    <th className="px-4 py-2 text-left font-medium text-slate-500">Link</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {bulkOutcomes.map(r => {
                    const student = students.find(s => s.id === r.studentId || s.uid === r.studentId);
                    const name = student?.full_name || 'Unknown';
                    const adm = student?.admission_number || 'N/A';
                    return (
                      <tr key={r.studentId} className="hover:bg-slate-50">
                        <td className="px-4 py-2">{name}</td>
                        <td className="px-4 py-2">{adm}</td>
                        <td className="px-4 py-2">
                          {r.success ? (
                            <span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">Success</span>
                          ) : (
                            <span className="px-2 py-1 rounded-full text-xs bg-red-100 text-red-800" title={r.error || ''}>Failed</span>
                          )}
                        </td>
                        <td className="px-4 py-2">
                          {r.success && r.url ? (
                            <a href={r.url} target="_blank" rel="noopener noreferrer" className="text-purple-600 hover:text-purple-800">Open PDF</a>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

              </div>

      {/* Generated Report Cards link */}
      <div className="flex justify-end">
        <Link to="/dashboard/generated-report-cards" className="inline-flex items-center px-4 py-2 rounded-lg font-medium text-white bg-blue-600 hover:bg-blue-700">
          View Generated Report Cards
        </Link>
      </div>
    </div>
  );
};

export default AdminReportCards;
