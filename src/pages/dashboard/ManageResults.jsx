import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getExamById } from '../../services/examService';
import { getResultsByExam, createOrUpdateResult, calculateClassPositions } from '../../services/resultService';
import { getStudentsByClassId } from '../../services/classService';
import useToast from '../../hooks/useToast';
import ResultEntryForm from '../../components/results/ResultEntryForm';
import ResultsTable from '../../components/results/ResultsTable';

const ManageResults = () => {
  const { examId } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  
  const [exam, setExam] = useState(null);
  const [students, setStudents] = useState([]);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('entry');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showEntryForm, setShowEntryForm] = useState(false);

  useEffect(() => {
    fetchData();
  }, [examId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const examData = await getExamById(examId);
      setExam(examData);

      const [studentsData, resultsData] = await Promise.all([
        getStudentsByClassId(examData.classId),
        getResultsByExam(examId)
      ]);

      setStudents(studentsData);
      setResults(resultsData);
    } catch (error) {
      console.error('Error fetching data:', error);
      showToast('Failed to load exam data', 'error');
      navigate('/dashboard/exams');
    } finally {
      setLoading(false);
    }
  };

  const handleResultSubmit = async (resultData) => {
    try {
      const newResult = await createOrUpdateResult({
        ...resultData,
        examId: exam.id,
        classId: exam.classId,
        examTitle: exam.title,
        subject: exam.subject,
        totalMarks: exam.totalMarks,
        passingMarks: exam.passingMarks
      });

      // Update results list
      const existingIndex = results.findIndex(r => r.studentId === resultData.studentId);
      if (existingIndex >= 0) {
        const updatedResults = [...results];
        updatedResults[existingIndex] = newResult;
        setResults(updatedResults);
      } else {
        setResults([...results, newResult]);
      }

      setShowEntryForm(false);
      setSelectedStudent(null);
      showToast('Result saved successfully', 'success');
    } catch (error) {
      console.error('Error saving result:', error);
      showToast('Failed to save result', 'error');
    }
  };

  const handleCalculatePositions = async () => {
    try {
      const updatedResults = await calculateClassPositions(
        exam.classId,
        exam.session || new Date().getFullYear().toString(),
        exam.term || 'First Term'
      );
      setResults(updatedResults);
      showToast('Positions calculated successfully', 'success');
    } catch (error) {
      console.error('Error calculating positions:', error);
      showToast('Failed to calculate positions', 'error');
    }
  };

  const getStudentResult = (studentId) => {
    return results.find(result => result.studentId === studentId);
  };

  const getResultsStats = () => {
    if (results.length === 0) return { total: 0, passed: 0, failed: 0, average: 0 };

    const total = results.length;
    const passed = results.filter(r => r.totalScore >= exam.passingMarks).length;
    const failed = total - passed;
    const average = results.reduce((sum, r) => sum + r.totalScore, 0) / total;

    return { total, passed, failed, average: Math.round(average * 100) / 100 };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
      </div>
    );
  }

  if (!exam) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-gray-900 mb-2">Exam not found</h3>
        <button
          onClick={() => navigate('/dashboard/exams')}
          className="text-blue-600 hover:text-blue-700"
        >
          Back to Exams
        </button>
      </div>
    );
  }

  const stats = getResultsStats();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center space-x-2 mb-2">
            <button
              onClick={() => navigate('/dashboard/exams')}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h2 className="text-3xl font-bold text-gray-900">Manage Results</h2>
          </div>
          <div className="text-gray-600">
            <p className="text-lg font-medium">{exam.title}</p>
            <p className="text-sm">{exam.subject} • Total Marks: {exam.totalMarks} • Pass: {exam.passingMarks}</p>
          </div>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={handleCalculatePositions}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Calculate Positions
          </button>
          <button
            onClick={() => setShowEntryForm(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Add Result
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Students</p>
              <p className="text-2xl font-bold text-gray-900">{students.length}</p>
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

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            <button
              onClick={() => setActiveTab('entry')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'entry'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Result Entry
            </button>
            <button
              onClick={() => setActiveTab('results')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'results'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Results Overview
            </button>
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'entry' && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900">Students List</h3>
              <div className="grid gap-4">
                {students.map(student => {
                  const result = getStudentResult(student.id);
                  return (
                    <div
                      key={student.id}
                      className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                    >
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                          <span className="text-sm font-medium text-gray-600">
                            {student.name?.charAt(0)?.toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{student.name}</p>
                          <p className="text-sm text-gray-600">{student.admissionNumber}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        {result ? (
                          <div className="text-right">
                            <p className="font-medium text-gray-900">{result.totalScore}/{exam.totalMarks}</p>
                            <p className={`text-sm ${result.totalScore >= exam.passingMarks ? 'text-green-600' : 'text-red-600'}`}>
                              {result.totalScore >= exam.passingMarks ? 'Passed' : 'Failed'}
                            </p>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-500">No result</span>
                        )}
                        <button
                          onClick={() => {
                            setSelectedStudent(student);
                            setShowEntryForm(true);
                          }}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm transition-colors"
                        >
                          {result ? 'Edit' : 'Add'} Result
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'results' && (
            <ResultsTable
              results={results}
              students={students}
              exam={exam}
              onEditResult={(student) => {
                setSelectedStudent(student);
                setShowEntryForm(true);
              }}
            />
          )}
        </div>
      </div>

      {/* Result Entry Modal */}
      {showEntryForm && (
        <ResultEntryForm
          student={selectedStudent}
          exam={exam}
          existingResult={selectedStudent ? getStudentResult(selectedStudent.id) : null}
          onSubmit={handleResultSubmit}
          onClose={() => {
            setShowEntryForm(false);
            setSelectedStudent(null);
          }}
        />
      )}
    </div>
  );
};

export default ManageResults;