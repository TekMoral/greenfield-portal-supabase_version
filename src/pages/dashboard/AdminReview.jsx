import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import {
  getSubmittedResults,
  gradeResultByAdmin,
  publishResult,
  calculateGrade
} from '../../services/supabase/studentResultService';
import { getAllExams } from '../../services/supabase/examService';
import { getAllClasses } from '../../services/supabase/classService';
import { getSubjects } from '../../services/supabase/subjectService';
import { getAllStudents } from '../../services/supabase/studentService';
import AdminReviewModal from '../../components/examResults/AdminReviewModal';

const AdminReview = () => {
  const { user } = useAuth();
  const [pendingResults, setPendingResults] = useState([]);
  const [reviewedResults, setReviewedResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending'); // pending, reviewed, published
  const [selectedResults, setSelectedResults] = useState([]);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedResult, setSelectedResult] = useState(null);

  // Reference data
  const [exams, setExams] = useState([]);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [students, setStudents] = useState([]);

  // Filter states
  const [filters, setFilters] = useState({
    examId: '',
    subjectId: '',
    classId: ''
  });

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    fetchResults();
  }, [activeTab, filters]);

  const fetchInitialData = async () => {
    try {
      const [examsData, classesData, subjectsData, studentsData] = await Promise.all([
        getAllExams(),
        getAllClasses(),
        getSubjects(),
        getAllStudents()
      ]);

      console.log('Fetched students:', studentsData); // Debug log
      setExams(examsData);
      setClasses(classesData);
      setSubjects(subjectsData);
      setStudents(studentsData);
    } catch (error) {
      console.error('Error fetching initial data:', error);
    }
  };

  const fetchResults = async () => {
    setLoading(true);
    try {
      let results = [];

      if (activeTab === 'pending') {
        results = await getSubmittedResults(filters);
        console.log('Fetched pending results:', results); // Debug log
        setPendingResults(results);
      } else {
        if (activeTab === 'reviewed') {
          results = await getSubmittedResults({
            ...filters,
            status: 'graded'
          });
          // Filter for non-published graded results
          results = results.filter(r => !r.published);
        } else { // published
          results = await getSubmittedResults({
            ...filters,
            status: 'graded'
          });
          // Filter for published graded results
          results = results.filter(r => r.published);
        }
        setReviewedResults(results);
      }
    } catch (error) {
      console.error('Error fetching results:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (filterName, value) => {
    setFilters(prev => ({
      ...prev,
      [filterName]: value
    }));
  };

  const clearFilters = () => {
    setFilters({
      examId: '',
      subjectId: '',
      classId: ''
    });
  };

  const handleSelectResult = (resultId) => {
    setSelectedResults(prev => {
      if (prev.includes(resultId)) {
        return prev.filter(id => id !== resultId);
      } else {
        return [...prev, resultId];
      }
    });
  };

  const handleSelectAll = () => {
    const currentResults = activeTab === 'pending' ? pendingResults : reviewedResults;
    if (selectedResults.length === currentResults.length) {
      setSelectedResults([]);
    } else {
      setSelectedResults(currentResults.map(result => result.id));
    }
  };

  const handleReviewResult = (result) => {
    setSelectedResult(result);
    setShowReviewModal(true);
  };

  const handleSubmitReview = async (reviewData) => {
    try {
      await gradeResultByAdmin({
        studentId: selectedResult.studentId,
        subjectId: selectedResult.subjectId,
        term: selectedResult.term,
        year: selectedResult.year,
        adminScore: reviewData.adminScore
      });
      setShowReviewModal(false);
      setSelectedResult(null);
      await fetchResults();
      alert('Review submitted successfully!');
    } catch (error) {
      console.error('Error submitting review:', error);
      alert('Error submitting review. Please try again.');
    }
  };

  const handleBulkPublish = async () => {
    if (selectedResults.length === 0) {
      alert('Please select results to publish');
      return;
    }

    if (!window.confirm(`Are you sure you want to publish ${selectedResults.length} result(s)? Students will be able to see them.`)) {
      return;
    }

    try {
      for (const resultId of selectedResults) {
        const result = currentResults.find(r => r.id === resultId);
        if (result) {
          await publishResult({
            studentId: result.studentId,
            subjectId: result.subjectId,
            term: result.term,
            year: result.year
          });
        }
      }
      setSelectedResults([]);
      await fetchResults();
      alert(`${selectedResults.length} result(s) published successfully!`);
    } catch (error) {
      console.error('Error publishing results:', error);
      alert('Error publishing results. Please try again.');
    }
  };

  const getStudentName = (studentId) => {
    const student = students.find(s => s.uid === studentId);
    if (student) {
      if (student.firstName && student.surname) {
        return `${student.firstName} ${student.surname}`;
      }
      if (student.name) {
        return student.name;
      }
    }
    return 'Unknown Student';
  };

  const getExamName = (examId) => {
    const exam = exams.find(e => e.id === examId);
    return exam ? exam.examName : 'Unknown Exam';
  };

  const getSubjectName = (subjectId) => {
    // First try to find by ID
    const subject = subjects.find(s => s.id === subjectId);
    if (subject) return subject.name;

    // If not found by ID, try to find by name (in case subjectId is actually the name)
    const subjectByName = subjects.find(s => s.name === subjectId);
    if (subjectByName) return subjectByName.name;

    // If still not found, return the subjectId itself (might be the subject name)
    return subjectId || 'Unknown Subject';
  };

  const getClassName = (classId) => {
    const classData = classes.find(c => c.id === classId);
    return classData ? classData.name : 'Unknown Class';
  };

  const getStudentAdmissionNumber = (studentId) => {
    const student = students.find(s => s.uid === studentId);
    return student ? (student.admissionNumber || student.uid) : studentId;
  };

  const getStatusColor = (status, published = false) => {
    if (status === 'graded' && published) return 'bg-green-100 text-green-800';
    if (status === 'graded') return 'bg-blue-100 text-blue-800';
    if (status === 'submitted') return 'bg-yellow-100 text-yellow-800';
    return 'bg-gray-100 text-gray-800';
  };

  const getStatusText = (status, published = false) => {
    if (status === 'graded' && published) return 'Published';
    if (status === 'graded') return 'Graded';
    if (status === 'submitted') return 'Pending Review';
    return 'Draft';
  };

  const currentResults = activeTab === 'pending' ? pendingResults : reviewedResults;

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-slate-200 rounded w-1/3"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
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
          <h1 className="text-2xl lg:text-3xl font-bold text-slate-800">Admin Review & Assessment</h1>
          <p className="text-slate-600 mt-1">Review exam results and add admin assessment before publishing</p>
        </div>
        {selectedResults.length > 0 && activeTab === 'reviewed' && (
          <button
            onClick={handleBulkPublish}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors font-medium"
          >
            Publish Selected ({selectedResults.length})
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('pending')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'pending'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Pending Review ({pendingResults.length})
          </button>
          <button
            onClick={() => setActiveTab('reviewed')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'reviewed'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Reviewed ({reviewedResults.filter(r => r.status === 'graded' && !r.published).length})
          </button>
          <button
            onClick={() => setActiveTab('published')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'published'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Published ({reviewedResults.filter(r => r.status === 'graded' && r.published).length})
          </button>
        </nav>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-md p-6 border border-slate-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-800">Filters</h2>
          <button
            onClick={clearFilters}
            className="text-sm text-slate-600 hover:text-slate-800 underline"
          >
            Clear All
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Class</label>
            <select
              value={filters.classId}
              onChange={(e) => handleFilterChange('classId', e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Classes</option>
              {classes.map(classData => (
                <option key={classData.id} value={classData.id}>{classData.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Results Table */}
      <div className="bg-white rounded-lg shadow-md border border-slate-200">
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-800">
              {activeTab === 'pending' ? 'Pending Review' : activeTab === 'reviewed' ? 'Reviewed Results' : 'Published Results'} ({currentResults.length})
            </h3>
            {currentResults.length > 0 && (
              <div className="flex items-center space-x-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={selectedResults.length === currentResults.length}
                    onChange={handleSelectAll}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Select All</span>
                </label>
                {selectedResults.length > 0 && (
                  <span className="text-sm text-gray-600">
                    {selectedResults.length} selected
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Select
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Student
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Exam
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Subject
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Current Score
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Admin Score
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {currentResults.map((result) => {
                console.log('Rendering result:', result); // Debug log
                const originalScore = (result.testScore || 0) + (result.examScore || 0);
                const originalMaxScore = 80; // 30 (test) + 50 (exam)
                const totalScore = result.totalScore || originalScore;
                const gradeInfo = calculateGrade(totalScore, 100);

                return (
                  <tr key={result.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedResults.includes(result.id)}
                        onChange={() => handleSelectResult(result.id)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-slate-900">
                        {getStudentName(result.studentId)}
                      </div>
                      <div className="text-sm text-slate-500">
                        ID: {getStudentAdmissionNumber(result.studentId)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-slate-900">
                        {result.examId ? getExamName(result.examId) : `${result.term || 'Term'} ${result.year || new Date().getFullYear()}`}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-slate-900">
                        {getSubjectName(result.subjectId)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-slate-900">
                        {originalScore}/{originalMaxScore}
                      </div>
                      <div className="text-sm text-slate-500">
                        {((originalScore / originalMaxScore) * 100).toFixed(1)}%
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {result.adminScore !== undefined ? (
                        <div>
                          <div className="text-sm text-slate-900">
                            {result.adminScore}/20
                          </div>
                          <div className="text-sm text-green-600">
                            Final: {totalScore}/100 ({gradeInfo.grade})
                          </div>
                        </div>
                      ) : (
                        <div className="text-sm text-slate-500">Not reviewed</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(result.status, result.published)}`}>
                        {getStatusText(result.status, result.published)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      {activeTab === 'pending' && (
                        <button
                          onClick={() => handleReviewResult(result)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          Review
                        </button>
                      )}
                      {activeTab === 'reviewed' && result.status === 'graded' && (
                        <button
                          onClick={() => handleReviewResult(result)}
                          className="text-green-600 hover:text-green-900"
                        >
                          Edit Review
                        </button>
                      )}
                      {(activeTab === 'reviewed' || activeTab === 'published') && (
                        <button
                          onClick={() => handleReviewResult(result)}
                          className="text-gray-600 hover:text-gray-900"
                        >
                          View
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Empty State */}
        {currentResults.length === 0 && (
          <div className="text-center py-12">
            <svg className="w-16 h-16 mx-auto text-slate-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="text-lg font-medium text-slate-800 mb-2">No Results Found</h3>
            <p className="text-slate-600">
              {activeTab === 'pending'
                ? "No results are pending admin review."
                : activeTab === 'reviewed'
                ? "No results have been reviewed yet."
                : "No results have been published yet."}
            </p>
          </div>
        )}
      </div>

      {/* Admin Review Modal */}
      <AdminReviewModal
        isOpen={showReviewModal}
        onClose={() => {
          setShowReviewModal(false);
          setSelectedResult(null);
        }}
        result={selectedResult}
        onSubmit={handleSubmitReview}
        exams={exams}
        classes={classes}
        subjects={subjects}
        students={students}
        isReadOnly={activeTab === 'published'}
      />
    </div>
  );
};

export default AdminReview;
