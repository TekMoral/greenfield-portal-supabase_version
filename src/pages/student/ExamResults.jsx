import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { calculateGrade, getStudentExamResults } from '../../services/supabase/studentResultService';
import { getTermName } from '../../utils/reportUtils';
import { getAllExams } from '../../services/supabase/examService';
import { getAllSubjects } from '../../services/supabase/subjectService';
import { getStudentById } from '../../services/supabase/studentService';
import { useSettings } from '../../contexts/SettingsContext';
import { normalizeAcademicYear, getNormalizedSession, formatSessionBadge } from '../../utils/sessionUtils';

const StudentExamResults = () => {
  const { user } = useAuth();
  const { academicYear: settingsYear, currentTerm } = useSettings();
  const { term } = useMemo(() => getNormalizedSession({ academicYear: settingsYear, currentTerm }), [settingsYear, currentTerm]);
  const [student, setStudent] = useState(null);
  const [results, setResults] = useState([]);
  const [filteredResults, setFilteredResults] = useState([]);
  const [exams, setExams] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedResult, setSelectedResult] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Filter states
  const [filters, setFilters] = useState({
    academicYear: '',
    term: '',
    examId: '',
    subjectId: ''
  });

  useEffect(() => {
    if (user?.uid) {
      fetchStudentData();
    }
  }, [user?.uid]);

  // Default filters to settings (retain user overrides)
  useEffect(() => {
    setFilters(prev => {
      const next = { ...prev };
      const hasYear = !!prev.academicYear;
      const hasTerm = !!prev.term;
      // Academic year: store as the first 4-digit year so parseInt comparison works.
      if (!hasYear && settingsYear) {
        const norm = normalizeAcademicYear(settingsYear);
        const firstYear = (norm.match(/\d{4}/) || [null])[0];
        if (firstYear) next.academicYear = String(firstYear);
      }
      if (!hasTerm && term) next.term = String(term);
      return next;
    });
  }, [settingsYear, currentTerm, term]);

  useEffect(() => {
    applyFilters();
  }, [results, filters]);

  const fetchStudentData = async () => {
    setLoading(true);
    try {
      // Get student profile
      const studentData = (await getStudentById(user.uid))?.data || null;
      setStudent(studentData);

      if (studentData) {
        // Fetch student's exam results
        const [resultsData, examsData, subjectsResult] = await Promise.all([
          getStudentExamResults(studentData.id),
          getAllExams(),
          getAllSubjects()
        ]);

        const subjectsData = subjectsResult.success ? subjectsResult.data : [];

        setResults(resultsData);
        setExams(examsData);
        setSubjects(subjectsData);
      }
    } catch (error) {
      console.error('Error fetching student data:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...results];

    if (filters.academicYear) {
      filtered = filtered.filter(result => result.academicYear === parseInt(filters.academicYear));
    }
    if (filters.term) {
      filtered = filtered.filter(result => result.term === parseInt(filters.term));
    }
    if (filters.examId) {
      filtered = filtered.filter(result => result.examId === filters.examId);
    }
    if (filters.subjectId) {
      filtered = filtered.filter(result => result.subjectId === filters.subjectId);
    }

    setFilteredResults(filtered);
  };

  const handleFilterChange = (filterName, value) => {
    setFilters(prev => ({
      ...prev,
      [filterName]: value
    }));
  };

  const clearFilters = () => {
    setFilters({
      academicYear: '',
      term: '',
      examId: '',
      subjectId: ''
    });
  };

  const getExamName = (examId) => {
    const exam = exams.find(e => e.id === examId);
    return exam ? exam.examName : 'Unknown Exam';
  };

  const getSubjectName = (subjectId) => {
    const subject = subjects.find(s => s.id === subjectId);
    return subject ? subject.name : 'Unknown Subject';
  };

  // getTermName centralized in utils/reportUtils

  const getGradeColor = (grade) => {
    switch (grade) {
      case 'A+':
      case 'A':
        return 'bg-green-100 text-green-800';
      case 'A-':
      case 'B+':
        return 'bg-blue-100 text-blue-800';
      case 'B':
      case 'B-':
        return 'bg-yellow-100 text-yellow-800';
      case 'C+':
      case 'C':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-red-100 text-red-800';
    }
  };

  const calculateOverallGPA = () => {
    if (filteredResults.length === 0) return 0;
    
    const totalGPA = filteredResults.reduce((sum, result) => {
      const gradeInfo = calculateGrade(result.totalScore, result.maxScore);
      return sum + gradeInfo.gpa;
    }, 0);
    
    return Math.round(totalGPA / filteredResults.length);
  };

  const getUniqueAcademicYears = () => {
    const years = [...new Set(results.map(r => r.academicYear))];
    return years.sort((a, b) => b - a);
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-slate-200 rounded w-1/3"></div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-20 bg-slate-200 rounded"></div>
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

  if (!student) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 text-4xl mb-4">⚠️</div>
        <h2 className="text-xl font-semibold text-slate-800 mb-2">Student Profile Not Found</h2>
        <p className="text-slate-600">Unable to load your student profile. Please contact support.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 rounded-lg">
        <h1 className="text-2xl lg:text-3xl font-bold mb-2">My Exam Results</h1>
        <p className="text-blue-100">
          Welcome {student.firstName} {student.lastName} - View your academic performance
        </p>
        <div className="text-blue-100 text-sm mt-1">{formatSessionBadge(settingsYear, currentTerm)}</div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-md p-6 border border-slate-200">
          <div className="text-sm text-slate-600">Total Results</div>
          <div className="text-2xl font-bold text-slate-800">{filteredResults.length}</div>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6 border border-slate-200">
          <div className="text-sm text-slate-600">Overall GPA</div>
          <div className="text-2xl font-bold text-blue-600">{calculateOverallGPA()}</div>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6 border border-slate-200">
          <div className="text-sm text-slate-600">Average Score</div>
          <div className="text-2xl font-bold text-green-600">
            {filteredResults.length > 0 
              ? Math.round(filteredResults.reduce((sum, r) => sum + ((r.totalScore / r.maxScore) * 100), 0) / filteredResults.length)
              : 0}%
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6 border border-slate-200">
          <div className="text-sm text-slate-600">Subjects</div>
          <div className="text-2xl font-bold text-purple-600">
            {[...new Set(filteredResults.map(r => r.subjectId))].length}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-md p-6 border border-slate-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-800">Filter Results</h2>
          <button
            onClick={clearFilters}
            className="text-sm text-slate-600 hover:text-slate-800 underline"
          >
            Clear All
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Academic Year</label>
            <select
              value={filters.academicYear}
              onChange={(e) => handleFilterChange('academicYear', e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Years</option>
              {getUniqueAcademicYears().map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Term</label>
            <select
              value={filters.term}
              onChange={(e) => handleFilterChange('term', e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Terms</option>
              <option value="1">1st Term</option>
              <option value="2">2nd Term</option>
              <option value="3">3rd Term</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Exam</label>
            <select
              value={filters.examId}
              onChange={(e) => handleFilterChange('examId', e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Exams</option>
              {exams.map(exam => (
                <option key={exam.id} value={exam.id}>{exam.examName}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Subject</label>
            <select
              value={filters.subjectId}
              onChange={(e) => handleFilterChange('subjectId', e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Subjects</option>
              {subjects.map(subject => (
                <option key={subject.id} value={subject.id}>{subject.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Results Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredResults.map((result) => {
          const gradeInfo = calculateGrade(result.totalScore, result.maxScore);
          const percentage = Math.round((result.totalScore / result.maxScore) * 100);
          
          return (
            <div key={result.id} className="bg-white rounded-lg shadow-md border border-slate-200 overflow-hidden hover:shadow-lg transition-shadow">
              <div className="bg-gradient-to-r from-slate-50 to-slate-100 p-4 border-b">
                <h3 className="font-semibold text-slate-800">{getSubjectName(result.subjectId)}</h3>
                <p className="text-sm text-slate-600">{getExamName(result.examId)}</p>
                <p className="text-xs text-slate-500">{getTermName(result.term)} {result.academicYear}</p>
              </div>
              
              <div className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-slate-800">{Math.round(Number(result.totalScore || 0))}</div>
                    <div className="text-sm text-slate-600">out of {Math.round(Number(result.maxScore || 0))}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{Math.round(Number(percentage || 0))}%</div>
                    <div className="text-sm text-slate-600">Percentage</div>
                  </div>
                  <div className="text-center">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getGradeColor(gradeInfo.grade)}`}>
                      {gradeInfo.grade}
                    </span>
                    <div className="text-sm text-slate-600 mt-1">GPA: {gradeInfo.gpa}</div>
                  </div>
                </div>

                {/* Score Breakdown */}
                <div className="space-y-2 mb-4">
                  {result.testScore !== undefined && (
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">Test Score:</span>
                      <span className="font-medium">{Math.round(Number(result.testScore || 0))}/{Math.round(Number(result.testMaxScore || 100))}</span>
                    </div>
                  )}
                  {result.examScore !== undefined && (
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">Exam Score:</span>
                      <span className="font-medium">{Math.round(Number(result.examScore || 0))}/{Math.round(Number(result.examMaxScore || 100))}</span>
                    </div>
                  )}
                  {result.assignmentScore !== undefined && (
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">Assignment Score:</span>
                      <span className="font-medium">{Math.round(Number(result.assignmentScore || 0))}/{Math.round(Number(result.assignmentMaxScore || 100))}</span>
                    </div>
                  )}
                  {result.attendanceScore !== undefined && (
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">Attendance Score:</span>
                      <span className="font-medium">{Math.round(Number(result.attendanceScore || 0))}/{Math.round(Number(result.attendanceMaxScore || 100))}</span>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => {
                    setSelectedResult(result);
                    setShowDetailModal(true);
                  }}
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                >
                  View Details
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {filteredResults.length === 0 && (
        <div className="text-center py-12">
          <svg className="w-16 h-16 mx-auto text-slate-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="text-lg font-medium text-slate-800 mb-2">No Results Found</h3>
          <p className="text-slate-600">
            {results.length === 0 
              ? "You don't have any exam results yet." 
              : "No results match your current filters."}
          </p>
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedResult && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-hidden">
            <div className="bg-blue-600 text-white p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold">
                    {getSubjectName(selectedResult.subjectId)} - {getExamName(selectedResult.examId)}
                  </h3>
                  <p className="text-blue-100">
                    {getTermName(selectedResult.term)} {selectedResult.academicYear}
                  </p>
                </div>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="text-white hover:text-blue-200 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              {/* Overall Score */}
              <div className="mb-6">
                <h4 className="text-lg font-semibold text-slate-800 mb-3">Overall Performance</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-slate-50 rounded-lg">
                    <div className="text-2xl font-bold text-slate-800">{Math.round(Number(selectedResult.totalScore || 0))}</div>
                    <div className="text-sm text-slate-600">Total Score</div>
                    <div className="text-xs text-slate-500">out of {Math.round(Number(selectedResult.maxScore || 0))}</div>
                  </div>
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">
                      {Math.round((selectedResult.totalScore / selectedResult.maxScore) * 100)}%
                    </div>
                    <div className="text-sm text-slate-600">Percentage</div>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      {calculateGrade(selectedResult.totalScore, selectedResult.maxScore).grade}
                    </div>
                    <div className="text-sm text-slate-600">Grade</div>
                    <div className="text-xs text-slate-500">
                      GPA: {calculateGrade(selectedResult.totalScore, selectedResult.maxScore).gpa}
                    </div>
                  </div>
                </div>
              </div>

              {/* Score Breakdown */}
              <div className="mb-6">
                <h4 className="text-lg font-semibold text-slate-800 mb-3">Score Breakdown</h4>
                <div className="space-y-3">
                  {selectedResult.testScore !== undefined && (
                    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <div>
                        <div className="font-medium text-slate-800">Test Score</div>
                        <div className="text-sm text-slate-600">Class tests and quizzes</div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-slate-800">
                          {Math.round(Number(selectedResult.testScore || 0))}/{Math.round(Number(selectedResult.testMaxScore || 100))}
                        </div>
                        <div className="text-sm text-slate-600">
                          {Math.round((selectedResult.testScore / (selectedResult.testMaxScore || 100)) * 100)}%
                        </div>
                      </div>
                    </div>
                  )}

                  {selectedResult.examScore !== undefined && (
                    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <div>
                        <div className="font-medium text-slate-800">Exam Score</div>
                        <div className="text-sm text-slate-600">Main examination</div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-slate-800">
                          {Math.round(Number(selectedResult.examScore || 0))}/{Math.round(Number(selectedResult.examMaxScore || 100))}
                        </div>
                        <div className="text-sm text-slate-600">
                          {Math.round((selectedResult.examScore / (selectedResult.examMaxScore || 100)) * 100)}%
                        </div>
                      </div>
                    </div>
                  )}

                  {selectedResult.assignmentScore !== undefined && (
                    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <div>
                        <div className="font-medium text-slate-800">Assignment Score</div>
                        <div className="text-sm text-slate-600">Homework and projects</div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-slate-800">
                          {Math.round(Number(selectedResult.assignmentScore || 0))}/{Math.round(Number(selectedResult.assignmentMaxScore || 100))}
                        </div>
                        <div className="text-sm text-slate-600">
                          {Math.round((selectedResult.assignmentScore / (selectedResult.assignmentMaxScore || 100)) * 100)}%
                        </div>
                      </div>
                    </div>
                  )}

                  {selectedResult.attendanceScore !== undefined && (
                    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <div>
                        <div className="font-medium text-slate-800">Attendance Score</div>
                        <div className="text-sm text-slate-600">Class attendance</div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-slate-800">
                          {Math.round(Number(selectedResult.attendanceScore || 0))}/{Math.round(Number(selectedResult.attendanceMaxScore || 100))}
                        </div>
                        <div className="text-sm text-slate-600">
                          {Math.round((selectedResult.attendanceScore / (selectedResult.attendanceMaxScore || 100)) * 100)}%
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Teacher Comments */}
              {selectedResult.teacherComments && (
                <div className="mb-6">
                  <h4 className="text-lg font-semibold text-slate-800 mb-3">Teacher Comments</h4>
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-slate-700">{selectedResult.teacherComments}</p>
                  </div>
                </div>
              )}

              {/* Additional Details */}
              <div>
                <h4 className="text-lg font-semibold text-slate-800 mb-3">Additional Information</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-slate-600">Created:</span>
                    <span className="ml-2 font-medium">{selectedResult.createdAt?.toLocaleDateString()}</span>
                  </div>
                  <div>
                    <span className="text-slate-600">Status:</span>
                    <span className="ml-2 font-medium capitalize">{selectedResult.status}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentExamResults;