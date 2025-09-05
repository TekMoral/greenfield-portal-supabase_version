import React, { useEffect, useState } from "react";
import { useAuth } from "../../hooks/useAuth";
import { getStudentExamResults, calculateGrade } from "../../services/supabase/studentResultService";
import { getActiveExamsForStudent, getAllExams } from "../../services/supabase/examService";
import { getAllSubjects } from "../../services/supabase/subjectService";
import ResultCard from "../../components/student/ResultCard";

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
        const [resultsData, examsData, subjectsResult, allExamsData] = await Promise.all([
          getStudentExamResults(user.uid),
          getActiveExamsForStudent(user.uid),
          getAllSubjects(),
          getAllExams()
        ]);

        const subjectsData = subjectsResult.success ? subjectsResult.data : [];

        // Helper functions to resolve names
        const getSubjectName = (subjectId) => {
          const subject = subjectsData.find(s => s.id === subjectId || s.name === subjectId);
          return subject ? subject.name : subjectId;
        };

        const getExamName = (examId) => {
          const exam = allExamsData.find(e => e.id === examId);
          return exam ? exam.examName || exam.title || 'Exam' : 'Exam';
        };

        // Transform the data to match ResultCard expectations
        const transformedResults = resultsData.map(result => {
          const maxScore = 100; // Default max score
          const percentage = Math.round((result.totalScore / maxScore) * 100);
          const gradeInfo = calculateGrade(result.totalScore, maxScore);
          const subjectName = getSubjectName(result.subjectId);
          const examName = result.examId ? getExamName(result.examId) : `Term ${result.term || ''} ${result.year || ''} Exam`.trim();
          
          return {
            ...result,
            totalMarks: maxScore,
            percentage: percentage,
            grade: gradeInfo.grade,
            status: percentage >= 50 ? 'passed' : 'failed', // Assuming 50% is passing
            examTitle: examName,
            subject: subjectName,
            session: result.year || new Date().getFullYear().toString(),
            term: result.term ? `Term ${result.term}` : 'Unknown Term',
            passingMarks: 50,
            remarks: result.teacherComments || result.adminComments,
            // Additional details for better display
            testScore: result.testScore || 0,
            examScore: result.examScore || 0,
            adminScore: result.adminScore || 0,
            createdAt: result.createdAt || new Date(),
            // Score breakdown for display
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
        setExams(allExamsData);
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

  const getAvailableSessions = () => {
    const sessions = [...new Set(results.map(result => result.session))];
    return sessions.sort().reverse();
  };

  const getAvailableSubjects = () => {
    const subjects = [...new Set(results.map(result => result.subject))];
    return subjects.sort();
  };

  const getAvailableTerms = () => {
    const terms = [...new Set(results.map(result => result.term))];
    return terms.sort();
  };

  const filteredResults = results.filter(result => {
    if (selectedSession && result.session !== selectedSession) return false;
    if (selectedSubject && result.subject !== selectedSubject) return false;
    if (selectedTerm && result.term !== selectedTerm) return false;
    if (filter === 'passed') return result.status === 'passed';
    if (filter === 'failed') return result.status === 'failed';
    return true;
  });

  const getOverallStats = () => {
    if (filteredResults.length === 0) return { average: 0, passed: 0, failed: 0 };

    const totalScore = filteredResults.reduce((sum, result) => sum + result.totalScore, 0);
    const totalPossible = filteredResults.reduce((sum, result) => sum + (result.totalMarks || 100), 0);
    const average = Math.round((totalScore / totalPossible) * 100);
    const passed = filteredResults.filter(r => r.status === 'passed').length;
    const failed = filteredResults.length - passed;

    return { average, passed, failed };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
      </div>
    );
  }

  const stats = getOverallStats();
  const sessions = getAvailableSessions();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">📊 My Results</h1>
          <p className="text-gray-600 mt-1">View your academic performance and exam results</p>
        </div>
      </div>

      {/* Active Exams Alert */}
      {activeExams.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h3 className="text-sm font-medium text-blue-800">Active Exams</h3>
              <p className="text-sm text-blue-700">
                You have {activeExams.length} active exam(s). Results will appear here once published.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      {results.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Exams</p>
                <p className="text-2xl font-bold text-gray-900">{filteredResults.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Passed</p>
                <p className="text-2xl font-bold text-gray-900">{stats.passed}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-red-100 rounded-lg">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Failed</p>
                <p className="text-2xl font-bold text-gray-900">{stats.failed}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 00-2 2v6a2 2 0 00-2 2zm6-10V5a2 2 0 00-2-2h-2a2 2 0 00-2 2v4h6z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Average</p>
                <p className="text-2xl font-bold text-gray-900">{stats.average}%</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      {results.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Filter Results</h3>
          
          {/* Status Filter Buttons */}
          <div className="flex flex-wrap gap-2 mb-4">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === 'all'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              All Results
            </button>
            <button
              onClick={() => setFilter('passed')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === 'passed'
                  ? 'bg-green-100 text-green-700'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Passed
            </button>
            <button
              onClick={() => setFilter('failed')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === 'failed'
                  ? 'bg-red-100 text-red-700'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Failed
            </button>
          </div>

          {/* Dropdown Filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {sessions.length > 1 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Session</label>
                <select
                  value={selectedSession}
                  onChange={(e) => setSelectedSession(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Sessions</option>
                  {sessions.map(session => (
                    <option key={session} value={session}>{session}</option>
                  ))}
                </select>
              </div>
            )}

            {getAvailableSubjects().length > 1 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Subject</label>
                <select
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Subjects</option>
                  {getAvailableSubjects().map(subject => (
                    <option key={subject} value={subject}>{subject}</option>
                  ))}
                </select>
              </div>
            )}

            {getAvailableTerms().length > 1 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Term</label>
                <select
                  value={selectedTerm}
                  onChange={(e) => setSelectedTerm(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Terms</option>
                  {getAvailableTerms().map(term => (
                    <option key={term} value={term}>{term}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Clear Filters Button */}
          {(selectedSession || selectedSubject || selectedTerm || filter !== 'all') && (
            <div className="mt-4">
              <button
                onClick={() => {
                  setFilter('all');
                  setSelectedSession('');
                  setSelectedSubject('');
                  setSelectedTerm('');
                }}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 underline"
              >
                Clear All Filters
              </button>
            </div>
          )}
        </div>
      )}

      {/* Results */}
      {filteredResults.length > 0 ? (
        <div className="grid gap-6">
          {filteredResults.map((result) => (
            <ResultCard key={result.id} result={result} />
          ))}
        </div>
      ) : results.length > 0 ? (
        <div className="text-center py-12">
          <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No results found</h3>
          <p className="text-gray-600">No results match your current filters.</p>
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
