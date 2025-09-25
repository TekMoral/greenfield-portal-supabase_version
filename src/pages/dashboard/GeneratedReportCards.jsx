import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { getAllClasses } from '../../services/supabase/classService';
import { getAllStudents } from '../../services/supabase/studentService';
import { useAuth } from '../../hooks/useAuth';
import toast from 'react-hot-toast';
import { finalizeReport, callFunction } from '../../services/supabase/edgeFunctions';

const GeneratedReportCards = () => {
  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);

  // Filters
  const [filterGroupKey, setFilterGroupKey] = useState(''); // class group key
  const [filterTerm, setFilterTerm] = useState('');
  const [filterYear, setFilterYear] = useState('');
  const [filterQuery, setFilterQuery] = useState(''); // search by name/admission
  const [statusFilter, setStatusFilter] = useState('generated'); // generated | published | all

  // Pagination
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);

  // Data
  const [rows, setRows] = useState([]);
  const [listLoading, setListLoading] = useState(false);
  const { user } = useAuth();
  const [publishingMap, setPublishingMap] = useState({}); // { [id]: boolean }
  const anyPublishing = Object.values(publishingMap).some(Boolean);

  // Build grouped classes (e.g., SSS3 Science/Arts -> SSS3)
  const classGroups = useMemo(() => {
    const baseNormalize = (name) => {
      if (!name) return { key: '', label: '' };
      let n = String(name).trim();
      n = n.replace(/\s+(Science|Sciences|Arts|Commercial|Commerce|Humanities|Technical|Tech|Business|Social|Management|Option\s*[A-Z])$/i, '');
      n = n.replace(/([A-Za-z]+)\s*([0-9]+)/g, '$1 $2');
      const label = n.replace(/\s+/g, ' ').trim();
      const key = label.toLowerCase();
      return { key, label };
    };
    const groupsMap = new Map();
    for (const c of (classes || [])) {
      const { key, label } = baseNormalize(c.name);
      const entry = groupsMap.get(key) || { key, label, classIds: [] };
      entry.classIds.push(c.id);
      groupsMap.set(key, entry);
    }
    return Array.from(groupsMap.values()).sort((a, b) => a.label.localeCompare(b.label));
  }, [classes]);

  // Initial reference data (classes, students)
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const [clsRes, stdRes] = await Promise.all([getAllClasses(), getAllStudents()]);
        const clsData = Array.isArray(clsRes?.data) ? clsRes.data : (Array.isArray(clsRes) ? clsRes : []);
        const stdData = Array.isArray(stdRes?.data) ? stdRes.data : (Array.isArray(stdRes) ? stdRes : []);
        if (!alive) return;
        setClasses(clsData);
        setStudents(stdData);
      } catch {
        if (!alive) return;
        setClasses([]);
        setStudents([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false };
  }, []);

  // Derived student IDs from class group filter
  const filteredStudentIdsByGroup = useMemo(() => {
    if (!filterGroupKey) return null; // no group filter
    const group = classGroups.find(g => g.key === filterGroupKey);
    const classIds = group ? new Set(group.classIds) : new Set();
    const ids = (students || []).filter(s => s.class_id && classIds.has(s.class_id)).map(s => s.id);
    return ids.length ? ids : [];
  }, [filterGroupKey, classGroups, students]);

  // Load generated report cards
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setListLoading(true);
        let query = supabase
          .from('student_documents')
          .select('id, student_id, file_name, file_url, file_path, storage_path, bucket_name, term, academic_year, uploaded_at, updated_at, mime_type, is_verified, verified_by, verified_at, status', { count: 'exact' })
          .eq('document_type', 'report_card');

        if (statusFilter === 'generated') {
          query = query.or('status.eq.generated,status.is.null');
        } else if (statusFilter === 'published') {
          query = query.eq('status', 'published');
        } else {
          query = query.or('status.eq.generated,status.is.null,status.eq.published');
        }

        if (filterTerm !== '' && filterTerm !== null) query = query.eq('term', Number(filterTerm));
        if (filterYear) query = query.eq('academic_year', String(filterYear));

        if (Array.isArray(filteredStudentIdsByGroup)) {
          if (filteredStudentIdsByGroup.length === 0) {
            if (alive) { setRows([]); setTotal(0); }
            return;
          }
          query = query.in('student_id', filteredStudentIdsByGroup.slice(0, 1000));
        }

        if (filterQuery && filterQuery.trim().length >= 2) {
          const q = filterQuery.toLowerCase().trim();
          const matchedIds = (students || [])
            .filter((s) => {
              const name = (s.full_name || '').toLowerCase();
              const adm = (s.admission_number || '').toLowerCase();
              return name.includes(q) || adm.includes(q);
            })
            .map((s) => s.id);
          if (matchedIds.length === 0) {
            if (alive) { setRows([]); setTotal(0); }
            return;
          }
          query = query.in('student_id', matchedIds.slice(0, 1000));
        }

        const start = page * pageSize;
        const end = start + pageSize - 1;
        query = query.order('uploaded_at', { ascending: false }).range(start, end);

        const { data, error, count } = await query;
        if (error) throw error;
        if (!alive) return;
        setRows(Array.isArray(data) ? data : []);
        setTotal(Number.isFinite(count) ? count : 0);
      } catch {
        if (!alive) return;
        setRows([]);
        setTotal(0);
      } finally {
        if (alive) setListLoading(false);
      }
    })();
    return () => { alive = false };
  }, [filterTerm, filterYear, filteredStudentIdsByGroup, filterQuery, page, pageSize, students, statusFilter]);

  const findStudent = (id) => (students || []).find(s => s.id === id || s.uid === id);
  const getClassName = (student) => {
    const cls = (classes || []).find(c => c.id === student?.class_id);
    return cls?.name || '—';
  };

  // Fallback parser: derive academic year and term from storage path like "2025/term-1/generated/..."
  const extractYearTermFromPath = (path) => {
    try {
      if (!path) return {};
      const m = String(path).match(/(\d{4})\/term-(\d+)/i);
      if (m) return { year: m[1], term: Number(m[2]) };
      return {};
    } catch {
      return {};
    }
  };

  const copyLink = async (href) => {
    try {
      await navigator.clipboard.writeText(href);
      toast.success('Link copied');
    } catch {
      toast.error('Failed to copy link');
    }
  };

  const toggleVerified = async (card, checked) => {
    const nowIso = new Date().toISOString();
    const prev = {
      is_verified: card.is_verified ?? null,
      verified_by: card.verified_by ?? null,
      verified_at: card.verified_at ?? null,
      updated_at: card.updated_at ?? null,
    };
    const payload = {
      is_verified: !!checked,
      verified_by: !!checked ? (user?.id || null) : null,
      verified_at: !!checked ? nowIso : null,
      updated_at: nowIso,
    };
    // optimistic update
    setRows((cur) => cur.map((r) => (r.id === card.id ? { ...r, ...payload } : r)));
    const { error } = await supabase
      .from('student_documents')
      .update(payload)
      .eq('id', card.id);
    if (error) {
      console.error('Failed to persist verified flag:', error.message || error);
      // rollback
      setRows((cur) => cur.map((r) => (r.id === card.id ? { ...r, ...prev } : r)));
    }
  };

  const publishOne = async (card) => {
    if (!card) return false;
    if (!card.is_verified) {
      const proceed = window.confirm('This report is not verified. Publish anyway?');
      if (!proceed) return false;
    }
    setPublishingMap((m) => ({ ...m, [card.id]: true }));
    const toastId = toast.loading('Publishing report card...');
    try {
      const payload = {
        document_id: card.id,
        verified_by: user?.id,
        bucket: card.bucket_name || 'report-cards',
        debug: true,
      };
      const result = await finalizeReport(payload);
      if (result?.debug) {
        // Diagnostics from finalize-report
        console.log('Finalize-report debug:', result.debug);
      }
      if (!result || !result.success) {
        toast.error('Failed to finalize report', { id: toastId });
        return false;
      }
      // Remove from list immediately (it no longer matches status='generated')
      setRows((cur) => cur.filter((r) => r.id !== card.id));
      toast.success('Report card published', { id: toastId });
      return true;
    } catch (e) {
      const msg = e?.userMessage || e?.message || 'Failed to publish';
      toast.error(msg, { id: toastId });
      return false;
    } finally {
      setPublishingMap((m) => ({ ...m, [card.id]: false }));
    }
  };

  const publishAllFiltered = async () => {
    const candidates = rows.filter((r) => r.is_verified);
    if (candidates.length === 0) {
      toast('No verified report cards in the current list. Verify drafts first.', { icon: 'ℹ️' });
      return;
    }
    const toastId = toast.loading(`Publishing 0/${candidates.length}...`);
    let ok = 0;
    let fail = 0;
    for (let i = 0; i < candidates.length; i++) {
      const card = candidates[i];
      setPublishingMap((m) => ({ ...m, [card.id]: true }));
      try {
        const payload = {
          document_id: card.id,
          verified_by: user?.id,
          bucket: card.bucket_name || 'report-cards',
          debug: true,
        };
        const res = await finalizeReport(payload);
        if (res?.debug) {
          // Diagnostics from finalize-report
          console.log('Finalize-report debug:', res.debug);
        }
        if (!res || !res.success) { fail++; }
        else {
          ok++;
          setRows((cur) => cur.filter((r) => r.id !== card.id));
        }
      } catch {
        fail++;
      } finally {
        setPublishingMap((m) => ({ ...m, [card.id]: false }));
        toast.loading(`Publishing ${i + 1}/${candidates.length}...`, { id: toastId });
      }
    }
    toast.success(`Done. Published ${ok} of ${candidates.length}${fail ? `, ${fail} failed` : ''}.`, { id: toastId });
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-slate-200 rounded w-1/3"></div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-10 bg-slate-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-slate-800">Generated Report Cards</h1>
          <p className="text-slate-600 mt-1">Review draft report cards and publish individually or in bulk</p>
        </div>
        <Link to="/dashboard/report-cards" className="text-blue-600 hover:text-blue-800">Back to Report Cards</Link>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-md p-6 border border-slate-200">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Class Group</label>
            <select
              value={filterGroupKey}
              onChange={(e) => { setPage(0); setFilterGroupKey(e.target.value); }}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All</option>
              {classGroups.map(g => (
                <option key={g.key} value={g.key}>{g.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Term</label>
            <select
              value={filterTerm}
              onChange={(e) => { setPage(0); setFilterTerm(e.target.value); }}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All</option>
              <option value={1}>1st Term</option>
              <option value={2}>2nd Term</option>
              <option value={3}>3rd Term</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Academic Year</label>
            <input
              type="number"
              value={filterYear}
              onChange={(e) => { setPage(0); setFilterYear(e.target.value); }}
              placeholder="e.g., 2025"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Stage</label>
            <select
              value={statusFilter}
              onChange={(e) => { setPage(0); setStatusFilter(e.target.value); }}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="generated">Generated (Drafts)</option>
              <option value="published">Published</option>
              <option value="all">All</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-2">Search (Name or Admission)</label>
            <input
              type="text"
              value={filterQuery}
              onChange={(e) => { setPage(0); setFilterQuery(e.target.value); }}
              placeholder="Start typing to filter by student name or admission no"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 mt-4">
          <button
            onClick={() => setPage(0)}
            className="px-4 py-2 rounded-lg font-medium text-white bg-blue-600 hover:bg-blue-700"
          >Refresh</button>
          {rows.length > 0 && statusFilter === 'generated' && (
            <button
              onClick={publishAllFiltered}
              disabled={rows.length === 0 || anyPublishing}
              className={`px-4 py-2 rounded-lg font-medium text-white ${rows.length === 0 || anyPublishing ? 'bg-green-600 opacity-50 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'}`}
            >Publish All Verified (Filtered)</button>
          )}
        </div>
      </div>

      {/* Results */}
      <div className="bg-white rounded-lg shadow-md p-6 border border-slate-200">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-2 text-left font-medium text-slate-500">Date</th>
                <th className="px-4 py-2 text-left font-medium text-slate-500">Student</th>
                <th className="px-4 py-2 text-left font-medium text-slate-500">Admission</th>
                <th className="px-4 py-2 text-left font-medium text-slate-500">Class</th>
                <th className="px-4 py-2 text-left font-medium text-slate-500">Term</th>
                <th className="px-4 py-2 text-left font-medium text-slate-500">Year</th>
                <th className="px-4 py-2 text-left font-medium text-slate-500">Link</th>
                <th className="px-4 py-2 text-left font-medium text-slate-500">Verified</th>
                <th className="px-4 py-2 text-left font-medium text-slate-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {listLoading ? (
                <tr><td className="px-4 py-6 text-slate-500" colSpan={9}>Loading…</td></tr>
              ) : rows.length === 0 ? (
                <tr><td className="px-4 py-6 text-slate-500" colSpan={9}>No report cards found</td></tr>
              ) : (
                rows.map((card) => {
                  const s = findStudent(card.student_id);
                  const name = s?.full_name || 'Unknown';
                  const adm = s?.admission_number || '—';
                  const cls = getClassName(s);
                  const path = card.file_path || card.storage_path || '';
                  const { year: pathYear, term: pathTerm } = extractYearTermFromPath(path);
                  const termNum = card.term != null ? Number(card.term) : (pathTerm ?? undefined);
                  const termLabel = termNum === 1 ? '1st' : termNum === 2 ? '2nd' : termNum === 3 ? '3rd' : (termNum ?? '—');
                  const yearLabel = card.academic_year || pathYear || '—';
                  const dateStr = new Date(card.uploaded_at || card.updated_at || Date.now()).toLocaleDateString();
                  const href = null; // no public links for private storage
                  const verified = !!card.is_verified;
                  return (
                    <tr key={card.id} className="hover:bg-slate-50">
                      <td className="px-4 py-2 whitespace-nowrap">{dateStr}</td>
                      <td className="px-4 py-2 whitespace-nowrap">{name}</td>
                      <td className="px-4 py-2 whitespace-nowrap">{adm}</td>
                      <td className="px-4 py-2 whitespace-nowrap">{cls}</td>
                      <td className="px-4 py-2 whitespace-nowrap">{termLabel}</td>
                      <td className="px-4 py-2 whitespace-nowrap">{yearLabel}</td>
                      <td className="px-4 py-2 whitespace-nowrap">
                        {statusFilter === 'published' ? (
                          <button
                            onClick={async () => {
                              try {
                                const res = await callFunction('get-report-url', { document_id: card.id, expires_in: 600 });
                                if (res?.success && res?.url) {
                                  window.open(res.url, '_blank', 'noopener');
                                } else {
                                  toast.error('Failed to get link');
                                }
                              } catch (e) {
                                toast.error(e?.userMessage || e?.message || 'Failed to get link');
                              }
                            }}
                            className="text-purple-600 hover:text-purple-800 underline"
                          >
                            Open PDF
                          </button>
                        ) : (
                          <button
                            onClick={async () => {
                              try {
                                const res = await callFunction('get-report-url', { document_id: card.id, expires_in: 600 });
                                if (res?.success && res?.url) {
                                  window.open(res.url, '_blank', 'noopener');
                                } else {
                                  toast.error('Failed to get preview');
                                }
                              } catch (e) {
                                toast.error(e?.userMessage || e?.message || 'Failed to get preview');
                              }
                            }}
                            className="text-slate-600 hover:text-slate-800 underline"
                          >
                            Preview
                          </button>
                        )}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={!!verified}
                          onChange={(e) => { toggleVerified(card, e.target.checked); }}
                          disabled={statusFilter === 'published'}
                          className="h-4 w-4 accent-blue-600"
                          title="Mark as verified"
                        />
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap">
                        {statusFilter === 'generated' ? (
                          <button
                            onClick={async () => { await publishOne(card); }}
                            disabled={!!publishingMap[card.id]}
                            aria-busy={!!publishingMap[card.id]}
                            className={`px-3 py-1 rounded text-white text-xs ${publishingMap[card.id] ? 'bg-green-600 opacity-50 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'}`}
                          >{publishingMap[card.id] ? 'Publishing…' : 'Publish'}</button>
                        ) : (
                          (
                            <button
                              onClick={async () => {
                                try {
                                  const res = await callFunction('get-report-url', { document_id: card.id, expires_in: 600 });
                                  if (res?.success && res?.url) {
                                    await copyLink(res.url);
                                  } else {
                                    toast.error('Failed to get link');
                                  }
                                } catch (e) {
                                  toast.error(e?.userMessage || e?.message || 'Failed to get link');
                                }
                              }}
                              className="px-3 py-1 rounded border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs"
                            >Copy Link</button>
                          )
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between mt-3 text-sm text-slate-600">
          <div>
            {total > 0 ? (
              <span>
                Showing {Math.min(total, page * pageSize + 1)}–{Math.min(total, (page + 1) * pageSize)} of {total}
              </span>
            ) : (
              <span>No results</span>
            )}
          </div>
          <div className="space-x-2">
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              className={`px-3 py-1 rounded border ${page === 0 ? 'text-slate-400 border-slate-200' : 'text-slate-700 border-slate-300 hover:bg-slate-50'}`}
            >Prev</button>
            <button
              onClick={() => { const maxPage = Math.max(0, Math.ceil(total / pageSize) - 1); setPage(p => Math.min(maxPage, p + 1)); }}
              disabled={(page + 1) * pageSize >= total}
              className={`px-3 py-1 rounded border ${((page + 1) * pageSize >= total) ? 'text-slate-400 border-slate-200' : 'text-slate-700 border-slate-300 hover:bg-slate-50'}`}
            >Next</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GeneratedReportCards;
