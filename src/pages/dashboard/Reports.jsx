import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import {
  getSubmittedResults,
  getResultsStatistics,
  calculateGrade
} from "../../services/supabase/studentResultService";
import { getAllSubjects } from "../../services/supabase/subjectService";
import useToast from '../../hooks/useToast';

const ExamResults = () => {
  const { showToast } = useToast();
  // Filters specific to exam results
  const [filters, setFilters] = useState({
    year: "",
    term: "",
    subjectId: "",
    status: "submitted", // default to submitted for review
  });

  // Data
  const [subjects, setSubjects] = useState([]);
  const [subjectsMap, setSubjectsMap] = useState({});
  const [results, setResults] = useState([]); // raw exam_results rows (normalized)
  const [profilesMap, setProfilesMap] = useState({}); // user_profiles by id
  const [classesMap, setClassesMap] = useState({}); // classes by id
  const [stats, setStats] = useState({ total: 0, submitted: 0, graded: 0, published: 0, averageScore: 0 });
  const [expanded, setExpanded] = useState({});
  const toggleExpand = (id) => setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  // Loading states
  const [initialLoading, setInitialLoading] = useState(true);
  const [resultsLoading, setResultsLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);
  const [lookupsLoading, setLookupsLoading] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => {
    // Initial data
    const init = async () => {
      setInitialLoading(true);
      try {
        const subjectsRes = await getAllSubjects();
        const subs = Array.isArray(subjectsRes) ? subjectsRes : (subjectsRes?.data || []);
        setSubjects(subs);
        const subMap = subs.reduce((acc, s) => { acc[s.id] = s; return acc; }, {});
        setSubjectsMap(subMap);
      } catch (e) {
        console.error("Error loading subjects:", e);
      } finally {
        setInitialLoading(false);
      }
    };
    init();
  }, []);

  useEffect(() => {
    const fetchResults = async () => {
      setResultsLoading(true);
      try {
        const { status, term, year, subjectId } = filters;

        // Special handling for published filter: published may be stored as is_published = true with status remaining 'graded'
        if (status === 'published') {
          let query = supabase.from('exam_results').select('*').eq('is_published', true);
          if (term) query = query.eq('term', term);
          if (year) query = query.eq('year', year);
          if (subjectId) query = query.eq('subject_id', subjectId);
          query = query.order('created_at', { ascending: false });

          const { data, error } = await query;
          if (error) {
            console.error('Error fetching published exam results:', error);
            setResults([]);
            await buildLookups([]);
            return;
          }
          const normalized = (data || []).map((r) => {
            const teacherSubtotal = (r.test_score || 0) + (r.exam_score || 0);
            const total = r.total_score ?? teacherSubtotal;
            const hasAdmin = (r.admin_score ?? null) != null;
            const max = hasAdmin ? 100 : 80;
            return {
              ...r,
              id: r.id,
              studentId: r.student_id ?? r.studentId,
              subjectId: r.subject_id ?? r.subjectId,
              term: r.term,
              year: r.year,
              status: r.status,
              createdAt: r.created_at ?? r.createdAt,
              totalScore: total,
              maxScore: max,
              testScore: r.test_score ?? null,
              examScore: r.exam_score ?? null,
              adminScore: r.admin_score ?? null,
              published: true,
            };
          });
          setResults(normalized);
          await buildLookups(normalized);
          return;
        }

        // Default path for submitted/graded
        const res = await getSubmittedResults({ status, term: term || undefined, year: year || undefined, subjectId: subjectId || undefined });
        const list = res?.success ? (res.data || []) : [];
        setResults(list);
        await buildLookups(list);
      } catch (e) {
        console.error("Error fetching exam results:", e);
        setResults([]);
      } finally {
        setResultsLoading(false);
      }
    };

    const fetchStats = async () => {
      setStatsLoading(true);
      try {
        const { term, year, subjectId } = filters;
        const res = await getResultsStatistics({ term: term || undefined, year: year || undefined, subjectId: subjectId || undefined });
        setStats(res?.success ? (res.data || { total: 0, submitted: 0, graded: 0, published: 0, averageScore: 0 }) : { total: 0, submitted: 0, graded: 0, published: 0, averageScore: 0 });
      } catch (e) {
        console.error("Error fetching results statistics:", e);
        setStats({ total: 0, submitted: 0, graded: 0, published: 0, averageScore: 0 });
      } finally {
        setStatsLoading(false);
      }
    };

    fetchResults();
    fetchStats();
  }, [filters]);

  const buildLookups = async (list) => {
    try {
      setLookupsLoading(true);
      // Collect IDs
      const studentIds = Array.from(new Set(list.map((r) => r.studentId).filter(Boolean)));
      const userIds = Array.from(new Set([...studentIds]));

      let profiles = [];
      if (userIds.length > 0) {
        const { data: profs, error: profErr } = await supabase
          .from("user_profiles")
          .select("id, full_name, class_id, admission_number")
          .in("id", userIds);
        if (profErr) {
          console.error("Error fetching user profiles:", profErr);
        } else {
          profiles = profs || [];
        }
      }
      const profMap = profiles.reduce((acc, p) => { acc[p.id] = p; return acc; }, {});
      setProfilesMap(profMap);

      // Classes
      const classIds = Array.from(new Set(profiles.map((p) => (p.class_id ?? p.classId)).filter(Boolean)));
      let classes = [];
      if (classIds.length > 0) {
        const { data: classesData, error: classErr } = await supabase
          .from("classes")
          .select("id, name, category")
          .in("id", classIds);
        if (classErr) {
          console.error("Error fetching classes:", classErr);
        } else {
          classes = classesData || [];
        }
      }
      const clsMap = classes.reduce((acc, c) => { acc[c.id] = c; return acc; }, {});
      setClassesMap(clsMap);
    } catch (e) {
      console.error("Error building lookups:", e);
      setProfilesMap({});
      setClassesMap({});
    } finally {
      setLookupsLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({ year: "", term: "", subjectId: "", status: "submitted" });
  };

  const years = useMemo(() => {
    const current = new Date().getFullYear();
    return [current, current - 1, current - 2, current - 3, current - 4];
  }, []);

  const displayRows = useMemo(() => {
    return results.map((r) => {
      const student = profilesMap[r.studentId];
      const classId = student ? (student.class_id ?? student.classId) : undefined;
      const classInfo = classId ? classesMap[classId] : undefined;
      const subject = subjectsMap[r.subjectId];
      const total = r.totalScore ?? ((r.testScore || 0) + (r.examScore || 0));
      const max = r.maxScore ?? 80;
      const gradeInfo = calculateGrade(total, max);

      return {
        id: r.id,
        studentId: r.studentId,
        studentName: student?.full_name || r.studentId,
        className: classInfo?.name || "-",
        admissionNumber: (student?.admission_number ?? student?.admissionNumber) ?? '-',
        category: (classInfo?.category ?? classInfo?.level) ?? '-',
        subjectName: subject?.name || r.subjectId,
        term: r.term,
        year: r.year,
        testScore: r.testScore ?? null,
        examScore: r.examScore ?? null,
        totalScore: total,
        maxScore: max,
        percentage: Math.round((gradeInfo.percentage ?? 0) * 100) / 100,
        grade: gradeInfo.grade,
        status: r.status,
        published: r.published === true,
        createdAt: r.created_at || r.createdAt || null,
        updated_at: r.updated_at || r.updated_at || null,
      };
    });
  }, [results, profilesMap, classesMap, subjectsMap]);

  
  const exportCSV = () => {
    const headers = [
      "Student Name",
      "Admission Number",
      "Class",
      "Category",
      "Subject",
      "Term",
      "Year",
      "Score",
      "Percentage",
      "Grade",
      "Status",
      "Published",
      "Created At",
      "Updated At",
    ];

    const rows = displayRows.map((r) => [
      r.studentName || "",
      r.admissionNumber || "",
      r.className || "",
      r.category || "",
      r.subjectName || "",
      r.term || "",
      r.year || "",
      `${r.totalScore ?? 0}/${r.maxScore ?? 80}`,
      (Number(r.percentage) || 0).toFixed(2),
      r.grade || "",
      r.status || "",
      r.published ? "Yes" : "No",
      r.createdAt ? new Date(r.createdAt).toISOString() : "",
      r.updated_at ? new Date(r.updated_at).toISOString() : "",
    ]);

    const csv = [headers.join(","), ...rows.map((row) => row.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `exam_results_${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  if (initialLoading) {
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
          <h1 className="text-2xl lg:text-3xl font-bold text-slate-800">Exam Results</h1>
          <p className="text-slate-600 mt-1">Review and manage teacher-submitted exam results</p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportCSV} className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors font-medium">Export CSV</button>
          <Link to="/dashboard/admin-review" className="bg-blue-600 text-white px-3 sm:px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium">Open Admin Review</Link>
        </div>
      </div>

      {/* Stats Overview (single container, mobile-friendly) */}
      <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 text-white rounded-lg shadow-md p-4 sm:p-6 border border-emerald-500/30">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          <div className="rounded-lg bg-white/10 p-3">
            <div className="text-[11px] uppercase tracking-wide text-emerald-100">Total</div>
            <div className="text-2xl font-bold">{statsLoading ? "…" : stats.total}</div>
          </div>
          <div className="rounded-lg bg-white/10 p-3">
            <div className="text-[11px] uppercase tracking-wide text-emerald-100">Pending</div>
            <div className="text-2xl font-bold">{statsLoading ? "…" : stats.submitted}</div>
          </div>
          <div className="rounded-lg bg-white/10 p-3">
            <div className="text-[11px] uppercase tracking-wide text-emerald-100">Graded</div>
            <div className="text-2xl font-bold">{statsLoading ? "…" : stats.graded}</div>
          </div>
          <div className="rounded-lg bg-white/10 p-3">
            <div className="text-[11px] uppercase tracking-wide text-emerald-100">Published</div>
            <div className="text-2xl font-bold">{statsLoading ? "…" : stats.published}</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-md p-3 sm:p-4 md:p-6 border border-slate-200">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-base md:text-lg font-semibold text-slate-800">Filters</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setFiltersOpen((o) => !o)}
              className="md:hidden text-xs px-2 py-1 rounded border border-slate-300 text-slate-700 hover:bg-slate-50"
            >
              {filtersOpen ? 'Hide' : 'Show'}
            </button>
            <button onClick={clearFilters} className="text-xs md:text-sm text-slate-600 hover:text-slate-800 underline">Clear All</button>
          </div>
        </div>

        <div className={`${filtersOpen ? 'grid' : 'hidden'} md:grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-2 md:gap-4`}>
          <div>
            <label className="block text-xs md:text-sm font-medium text-slate-700 mb-1 md:mb-2">Year</label>
            <select
              value={filters.year}
              onChange={(e) => handleFilterChange("year", e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Years</option>
              {years.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs md:text-sm font-medium text-slate-700 mb-1 md:mb-2">Term</label>
            <select
              value={filters.term}
              onChange={(e) => handleFilterChange("term", e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Terms</option>
              <option value="1">1st Term</option>
              <option value="2">2nd Term</option>
              <option value="3">3rd Term</option>
            </select>
          </div>

          <div>
            <label className="block text-xs md:text-sm font-medium text-slate-700 mb-1 md:mb-2">Subject</label>
            <select
              value={filters.subjectId}
              onChange={(e) => handleFilterChange("subjectId", e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Subjects</option>
              {subjects.map((subject) => (
                <option key={subject.id} value={subject.id}>{subject.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs md:text-sm font-medium text-slate-700 mb-1 md:mb-2">Status</label>
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange("status", e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="submitted">Submitted</option>
              <option value="graded">Graded</option>
              <option value="published">Published</option>
            </select>
          </div>
        </div>
      </div>

      {/* Results Table */}
      <div className="bg-white rounded-lg shadow-md border border-slate-200">
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-800">
              Exam Results ({displayRows.length})
            </h3>
            <div className="text-sm text-slate-600">
              {resultsLoading || lookupsLoading ? "Loading…" : `Ready`}
            </div>
          </div>
        
        </div>
        <div className="p-3 sm:p-6">
          {resultsLoading ? (
            <div className="text-slate-600">Loading exam results...</div>
          ) : displayRows.length === 0 ? (
            <div className="text-slate-500">No exam results found for the selected filters.</div>
          ) : (
            <>
              {/* Mobile list view */}
              <div className="block md:hidden">
                {displayRows.map((row) => (
                  <div key={row.id} className="px-2 py-3 border-b last:border-b-0">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-slate-900 break-words">{row.studentName}</div>
                        <div className="text-xs text-slate-500 break-words">Adm No: {row.admissionNumber}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => toggleExpand(row.id)}
                        className="inline-flex items-center text-xs px-2 py-1 rounded border border-emerald-300 text-emerald-700 hover:bg-emerald-100"
                      >
                        {expanded[row.id] ? 'Close' : 'Open'}
                      </button>
                    </div>

                    {expanded[row.id] && (
                      <div className="mt-3 w-full max-w-full overflow-hidden">
                        <div className="w-full p-3 rounded-lg border border-emerald-200 bg-emerald-50 text-sm shadow-sm">
                          <div className="grid grid-cols-[auto,1fr] gap-x-2 gap-y-1 items-center">
                            <span className="text-slate-600">Class:</span>
                            <span className="font-medium text-slate-900 break-words">{row.className} — {row.category}</span>

                            <span className="text-slate-600">Subject:</span>
                            <span className="font-medium text-slate-900 break-words">{row.subjectName}</span>

                            <span className="text-slate-600">Term/Year:</span>
                            <span className="font-medium text-slate-900">{row.term} / {row.year}</span>

                            <span className="text-slate-600">Score:</span>
                            <span className="font-medium text-slate-900">{row.totalScore} / {row.maxScore}</span>

                            <span className="text-slate-600">Percentage:</span>
                            <span className="font-medium text-slate-900">{Number(row.percentage || 0).toFixed(2)}%</span>

                            <span className="text-slate-600">Grade:</span>
                            <span className="font-semibold text-slate-900">{row.grade}</span>

                            <div className="col-span-2 flex items-center justify-between gap-2 mt-1">
                              <div className="flex items-center gap-2">
                                <span className="text-slate-600">Status:</span>
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                                  row.status === 'published' ? 'bg-green-100 text-green-800' : row.status === 'graded' ? 'bg-purple-100 text-purple-800' : 'bg-yellow-100 text-yellow-800'
                                }`}>
                                  {row.status}
                                </span>
                              </div>
                              <div className="text-xs text-slate-700">
                                Published: <span className={row.published ? 'text-green-700' : 'text-slate-700'}>{row.published ? 'Yes' : 'No'}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Desktop table view */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Student name</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Class</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Category</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Subject name</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Term / Year</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Score</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Percentage</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Grade</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Is Published</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Created / Updated</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-200">
                    {displayRows.map((row) => (
                      <tr key={row.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-900">
                          <div className="text-sm text-slate-900">{row.studentName}</div>
                          <div className="text-xs text-slate-500">ADM: {row.admissionNumber}</div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-900">{row.className}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-900">{row.category}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-900">{row.subjectName}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-900">{row.term} / {row.year}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-900">{row.totalScore} / {row.maxScore}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-900">{row.percentage?.toFixed?.(2)}%</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-slate-900">{row.grade}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm">
                          {row.status === "submitted" && (
                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">submitted</span>
                          )}
                          {row.status === "graded" && (
                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">graded</span>
                          )}
                          {row.status === "published" && (
                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">published</span>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${row.published ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-800'}`}>
                        {row.published ? 'Yes' : 'No'}
                        </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-xs text-slate-700">
                          <div>Created: {row.createdAt ? new Date(row.createdAt).toLocaleString() : '-'}</div>
                          <div>Updated: {row.updated_at ? new Date(row.updated_at).toLocaleString() : '-'}</div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExamResults;
