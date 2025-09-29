import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../hooks/useAuth";
import { getStudentExamResults, calculateGrade } from "../../services/supabase/studentResultService";
import { getActiveExamsForStudent, getAllExams } from "../../services/supabase/examService";
import { getAllSubjects } from "../../services/supabase/subjectService";
import ResultCard from "../../components/student/ResultCard";
import { Download, Printer, Filter, TrendingUp, BarChart3, CheckCircle2, XCircle, Percent } from "lucide-react";

// Small inline sparkline component (no external deps)
function Sparkline({ data = [], height = 36, width = 140, stroke = "#10b981" }) {
  const path = useMemo(() => {
    if (!data || data.length < 2) return '';
    const max = 100;
    const min = 0;
    const dx = width / (data.length - 1);
    const scaleY = (v) => {
      // Flip Y so higher values are visually higher
      const pct = (v - min) / (max - min);
      return height - pct * height;
    };
    return data
      .map((v, i) => `${i === 0 ? 'M' : 'L'} ${i * dx} ${scaleY(Math.max(min, Math.min(max, v)))}`)
      .join(' ');
  }, [data, height, width]);

  const last = data?.[data.length - 1] ?? 0;
  const color = last >= 70 ? '#10b981' : last >= 50 ? '#f59e0b' : '#ef4444';

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-[36px]">
      <path d={path} fill="none" stroke={color} strokeWidth="2" />
    </svg>
  );
}

const Results = () => {
  const { user } = useAuth();
  const [results, setResults] = useState([]);
  const [activeExams, setActiveExams] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [selectedSession, setSelectedSession] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedTerm, setSelectedTerm] = useState('');

  useEffect(() => {
    const fetchResults = async () => {
      if (!user?.uid) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const [resultsResp, examsData, subjectsResult, allExamsData] = await Promise.all([
          getStudentExamResults(user.uid),
          getActiveExamsForStudent(user.uid),
          getAllSubjects(),
          getAllExams()
        ]);

        const subjectsData = subjectsResult?.success ? (subjectsResult.data || []) : (Array.isArray(subjectsResult) ? subjectsResult : []);
        const resultsArray = resultsResp?.success ? (resultsResp.data || []) : (Array.isArray(resultsResp) ? resultsResp : []);
        const allExamsArray = allExamsData?.success ? (allExamsData.data || []) : (Array.isArray(allExamsData) ? allExamsData : []);

        // Helper functions to resolve names
        const getSubjectName = (subjectId) => {
          const sid = subjectId == null ? '' : String(subjectId);
          if (!sid) return 'Unknown Subject';
          const subject = subjectsData.find(s => String(s.id) === sid || String(s.name) === sid);
          return subject ? subject.name : sid;
        };

        const getExamName = (examId) => {
          const eid = examId == null ? '' : String(examId);
          if (!eid) return 'Exam';
          const exam = allExamsArray.find(e => String(e.id) === eid);
          return exam ? (exam.examName || exam.title || 'Exam') : 'Exam';
        };

        // Transform the data to match ResultCard expectations and for richer UI
        const transformedResults = resultsArray.map((result, idx) => {
          const maxScore = 100; // Default max score
          const totalScore = Number(result.totalScore) || 0;
          const percentage = Math.round((totalScore / maxScore) * 100);
          const gradeInfo = calculateGrade(totalScore, maxScore) || { grade: '-' };
          const rawSubjectId = result.subjectId ?? result.subject_id;
          const subjectName = result.subjectName || result.subject_name || getSubjectName(rawSubjectId);
          const examName = result.examId ? getExamName(result.examId) : `Term ${result.term || ''} ${result.year || ''} Exam`.trim();
          const createdAt = result.createdAt ? new Date(result.createdAt) : new Date();

          return {
            ...result,
            totalMarks: maxScore,
            percentage,
            grade: gradeInfo.grade,
            status: percentage >= 50 ? 'passed' : 'failed',
            examTitle: examName,
            subject: subjectName,
            session: result.year || new Date().getFullYear().toString(),
            term: result.term ? `Term ${result.term}` : 'Unknown Term',
            passingMarks: 50,
            remarks: result.teacherComments || result.adminComments,
            testScore: result.testScore || 0,
            examScore: result.examScore || 0,
            adminScore: result.adminScore || 0,
            createdAt,
            scoreBreakdown: {
              test: { score: result.testScore || 0, maxScore: 30 },
              exam: { score: result.examScore || 0, maxScore: 50 },
              admin: { score: result.adminScore || 0, maxScore: 20 }
            }
          };
        });

        setResults(transformedResults);
        setActiveExams(examsData);
        setSubjects(subjectsData);
        setExams(allExamsArray);
      } catch (error) {
        console.error("Error fetching results:", error);
        setResults([]);
        setActiveExams([]);
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [user]);

  // Helpers
  const getAvailableSessions = useMemo(() => {
    const sessions = [...new Set(results.map(result => result.session))];
    return sessions.sort().reverse();
  }, [results]);

  const getAvailableSubjects = useMemo(() => {
    const subs = [...new Set(results.map(result => result.subject))];
    return subs.sort();
  }, [results]);

  const getAvailableTerms = useMemo(() => {
    const terms = [...new Set(results.map(result => result.term))];
    return terms.sort();
  }, [results]);

  const filteredResults = useMemo(() => {
    return results.filter(result => {
      if (selectedSession && result.session !== selectedSession) return false;
      if (selectedSubject && result.subject !== selectedSubject) return false;
      if (selectedTerm && result.term !== selectedTerm) return false;
      if (filter === 'passed') return result.status === 'passed';
      if (filter === 'failed') return result.status === 'failed';
      return true;
    });
  }, [results, selectedSession, selectedSubject, selectedTerm, filter]);

  const getOverallStats = useMemo(() => {
    if (filteredResults.length === 0) return { average: 0, passed: 0, failed: 0, passRate: 0, trend: [] };
    const totalScore = filteredResults.reduce((sum, r) => sum + (Number(r.totalScore) || 0), 0);
    const totalPossible = filteredResults.reduce((sum, r) => sum + (r.totalMarks || 100), 0);
    const average = Math.round((totalScore / totalPossible) * 100);
    const passed = filteredResults.filter(r => r.status === 'passed').length;
    const failed = filteredResults.length - passed;
    const passRate = Math.round((passed / filteredResults.length) * 100);
    // build trend by createdAt
    const trend = [...filteredResults]
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
      .map(r => r.percentage ?? Math.round(((Number(r.totalScore) || 0) / (r.totalMarks || 100)) * 100));
    return { average, passed, failed, passRate, trend };
  }, [filteredResults]);

  const gradeDistribution = useMemo(() => {
    const buckets = { A: 0, B: 0, C: 0, D: 0, E: 0, F: 0 };
    filteredResults.forEach(r => {
      const g = r.grade || calculateGrade(Number(r.totalScore) || 0, r.totalMarks || 100)?.grade || '-';
      if (buckets[g] != null) buckets[g] += 1; else buckets['F'] += 1;
    });
    const total = filteredResults.length || 1;
    const toPct = (n) => Math.round((n / total) * 100);
    return {
      buckets,
      percentages: Object.fromEntries(Object.entries(buckets).map(([k, v]) => [k, toPct(v)])),
    };
  }, [filteredResults]);

  // Group results by session + term for clarity
  const grouped = useMemo(() => {
    const map = new Map();
    filteredResults.forEach(r => {
      const key = `${r.session} | ${r.term}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(r);
    });
    // sort groups by session desc then term asc (Term 1,2,3)
    const parseTermNum = (t) => {
      const m = /Term\s*(\d+)/i.exec(t || '');
      return m ? Number(m[1]) : 0;
    };
    return [...map.entries()].sort((a, b) => {
      const [as, at] = a[0].split(' | ');
      const [bs, bt] = b[0].split(' | ');
      if (as !== bs) return String(bs).localeCompare(String(as));
      return parseTermNum(at) - parseTermNum(bt);
    });
  }, [filteredResults]);

  const exportCSV = () => {
    if (!filteredResults.length) return;
    const headers = [
      'Subject', 'Exam Title', 'Term', 'Session', 'Score', 'Total Marks', 'Percentage', 'Grade', 'Status',
      'Test Score', 'Exam Score', 'Admin Score', 'Remarks', 'Date'
    ];
    const rows = filteredResults.map(r => [
      r.subject,
      r.examTitle,
      r.term,
      r.session,
      Number(r.totalScore) || 0,
      r.totalMarks || 100,
      r.percentage ?? Math.round(((Number(r.totalScore) || 0) / (r.totalMarks || 100)) * 100),
      r.grade,
      r.status,
      r.testScore ?? 0,
      r.examScore ?? 0,
      r.adminScore ?? 0,
      (r.remarks || '').toString().replace(/\n/g, ' '),
      r.createdAt ? new Date(r.createdAt).toLocaleDateString() : ''
    ]);

    const escapeCSV = (val) => {
      const s = String(val ?? '');
      if (s.includes(',') || s.includes('"') || s.includes('\n')) {
        return '"' + s.replace(/"/g, '""') + '"';
      }
      return s;
    };

    const csv = [headers, ...rows].map(r => r.map(escapeCSV).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'results.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const onPrint = () => window.print();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500" />
      </div>
    );
  }

  const stats = getOverallStats;
  const sessions = getAvailableSessions;

  
  return (
    <div className="space-y-4">
      {/* Header + Actions */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div className="ml-0 sm:ml-0">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 ml-10">My Results</h1>
          <p className="text-gray-600">Track your academic performance across sessions and terms</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={exportCSV} className="inline-flex items-center gap-2 bg-white text-gray-700 hover:bg-gray-50 border border-gray-200 px-3 py-2 rounded-md shadow-sm">
            <Download className="w-4 h-4" /> Export CSV
          </button>
          <button onClick={onPrint} className="inline-flex items-center gap-2 bg-emerald-600 text-white hover:bg-emerald-700 px-3 py-2 rounded-md shadow">
            <Printer className="w-4 h-4" /> Print
          </button>
        </div>
      </div>

      {/* Active Exams Alert */}
      {activeExams.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h3 className="text-sm font-medium text-blue-800">Active Exams</h3>
              <p className="text-sm text-blue-700">You have {activeExams.length} active exam(s). Results will appear here once published.</p>
            </div>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      {results.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-white rounded-lg shadow p-3 sm:p-4 border-l-4 border-blue-500">
            <div className="flex items-center gap-2 text-blue-600"><BarChart3 className="w-4 h-4" /><span className="text-xs font-medium">Exams</span></div>
            <div className="mt-1 text-2xl font-bold">{filteredResults.length}</div>
            <div className="text-xs text-gray-500">Filtered</div>
          </div>
          <div className="bg-white rounded-lg shadow p-3 sm:p-4 border-l-4 border-emerald-500">
            <div className="flex items-center gap-2 text-emerald-600"><CheckCircle2 className="w-4 h-4" /><span className="text-xs font-medium">Passed</span></div>
            <div className="mt-1 text-2xl font-bold">{stats.passed}</div>
            <div className="text-xs text-gray-500">Across selected filters</div>
          </div>
          <div className="bg-white rounded-lg shadow p-3 sm:p-4 border-l-4 border-rose-500">
            <div className="flex items-center gap-2 text-rose-600"><XCircle className="w-4 h-4" /><span className="text-xs font-medium">Failed</span></div>
            <div className="mt-1 text-2xl font-bold">{stats.failed}</div>
            <div className="text-xs text-gray-500">Across selected filters</div>
          </div>
          <div className="bg-white rounded-lg shadow p-3 sm:p-4 border-l-4 border-amber-500">
            <div className="flex items-center gap-2 text-amber-600"><Percent className="w-4 h-4" /><span className="text-xs font-medium">Average</span></div>
            <div className="mt-1 text-2xl font-bold">{stats.average}%</div>
            <div className="text-xs text-gray-500">Pass rate: {stats.passRate}%</div>
          </div>
        </div>
      )}

      {/* Insights Row: Trend + Grade distribution */}
      {filteredResults.length > 1 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <div className="bg-white rounded-lg shadow p-4 lg:col-span-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-gray-700"><TrendingUp className="w-4 h-4" /><span className="font-semibold">Performance Trend</span></div>
              <div className="text-sm text-gray-500">Recent {Math.min(stats.trend.length, 12)} results</div>
            </div>
            <div className="mt-2">
              <Sparkline data={stats.trend.slice(-12)} />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center gap-2 text-gray-700"><Filter className="w-4 h-4" /><span className="font-semibold">Grade Distribution</span></div>
            <div className="mt-3 space-y-2">
              {Object.entries(gradeDistribution.buckets).map(([grade, count]) => (
                <div key={grade} className="grid grid-cols-5 items-center gap-2">
                  <div className="col-span-1 text-sm text-gray-600 font-medium">{grade}</div>
                  <div className="col-span-4 flex items-center gap-2">
                    <div className="flex-1 h-2 bg-gray-100 rounded">
                      <div
                        className={`h-2 rounded ${grade === 'A' ? 'bg-emerald-500' : grade === 'B' ? 'bg-emerald-400' : grade === 'C' ? 'bg-amber-400' : grade === 'D' ? 'bg-orange-400' : grade === 'E' ? 'bg-rose-400' : 'bg-rose-500'}`}
                        style={{ width: `${gradeDistribution.percentages[grade]}%` }}
                      />
                    </div>
                    <div className="w-12 text-right text-xs text-gray-600">{count}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Sticky Filters */}
      {results.length > 0 && (
        <div className="sticky top-2 z-10">
          <div className="bg-white/90 backdrop-blur rounded-lg shadow p-3 sm:p-4 border border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-gray-700">
                <Filter className="w-4 h-4" />
                <h3 className="font-semibold">Filters</h3>
              </div>
              {(selectedSession || selectedSubject || selectedTerm || filter !== 'all') && (
                <button
                  onClick={() => { setFilter('all'); setSelectedSession(''); setSelectedSubject(''); setSelectedTerm(''); }}
                  className="text-xs text-gray-600 hover:text-gray-900 underline"
                >
                  Clear all
                </button>
              )}
            </div>

            {/* Status Filter Buttons */}
            <div className="flex flex-wrap gap-2 mb-3">
              <button
                onClick={() => setFilter('all')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  filter === 'all' ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilter('passed')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  filter === 'passed' ? 'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Passed
              </button>
              <button
                onClick={() => setFilter('failed')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  filter === 'failed' ? 'bg-rose-100 text-rose-800 ring-1 ring-rose-200' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Failed
              </button>
            </div>

            {/* Dropdown Filters */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {getAvailableSessions.length > 1 && (
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">Session</label>
                  <select
                    value={selectedSession}
                    onChange={(e) => setSelectedSession(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">All Sessions</option>
                    {getAvailableSessions.map(session => (
                      <option key={session} value={session}>{session}</option>
                    ))}
                  </select>
                </div>
              )}

              {getAvailableSubjects.length > 1 && (
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">Subject</label>
                  <select
                    value={selectedSubject}
                    onChange={(e) => setSelectedSubject(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">All Subjects</option>
                    {getAvailableSubjects.map(subject => (
                      <option key={subject} value={subject}>{subject}</option>
                    ))}
                  </select>
                </div>
              )}

              {getAvailableTerms.length > 1 && (
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">Term</label>
                  <select
                    value={selectedTerm}
                    onChange={(e) => setSelectedTerm(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">All Terms</option>
                    {getAvailableTerms.map(term => (
                      <option key={term} value={term}>{term}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Results */}
      {filteredResults.length > 0 ? (
        <div className="space-y-6">
          {grouped.map(([groupKey, items]) => (
            <section key={groupKey} className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-base sm:text-lg font-semibold text-gray-800">{groupKey}</h3>
                <div className="text-xs text-gray-500">{items.length} subject{items.length > 1 ? 's' : ''}</div>
              </div>
              <div className="grid gap-4">
                {items.map((result, idx) => (
                  <ResultCard key={result.id || `${result.subject}-${result.examTitle}-${idx}`} result={result} />
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : results.length > 0 ? (
        <div className="text-center py-12">
          <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No results found</h3>
          <p className="text-gray-600 mb-4">No results match your current filters.</p>
          <button
            onClick={() => { setFilter('all'); setSelectedSession(''); setSelectedSubject(''); setSelectedTerm(''); }}
            className="inline-flex items-center gap-2 text-sm text-emerald-700 hover:text-emerald-900"
          >
            <Filter className="w-4 h-4" /> Clear filters
          </button>
        </div>
      ) : (
        <div className="text-center py-12">
          <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No results available</h3>
          <p className="text-gray-600">Your exam results will appear here once they are published by your teachers.</p>
        </div>
      )}
    </div>
  );
};

export default Results;
