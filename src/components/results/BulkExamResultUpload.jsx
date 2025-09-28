import React, { useState, useEffect } from 'react';
import { useSettings } from '../../contexts/SettingsContext';

const BulkExamResultUpload = ({ students, subject, onSubmit, submitting }) => {
    const [bulkResults, setBulkResults] = useState([]);
    const [errors, setErrors] = useState({});
  const examType = 'final';
  const [session, setSession] = useState(new Date().getFullYear().toString());
  const [term, setTerm] = useState('1st Term');
  // Mobile quick-entry state
  const [openStudentId, setOpenStudentId] = useState(null);
  const [showIncompleteOnly, setShowIncompleteOnly] = useState(false);

  const { academicYear, currentTerm } = useSettings();
  const normalizeTermLabel = (t) => {
    if (t === 1 || t === '1' || String(t).toLowerCase().includes('1')) return '1st Term';
    if (t === 2 || t === '2' || String(t).toLowerCase().includes('2')) return '2nd Term';
    if (t === 3 || t === '3' || String(t).toLowerCase().includes('3')) return '3rd Term';
    const s = String(t || '').toLowerCase();
    if (s.includes('first')) return '1st Term';
    if (s.includes('second')) return '2nd Term';
    if (s.includes('third')) return '3rd Term';
    return '1st Term';
  };
  useEffect(() => {
    setSession(String(academicYear || new Date().getFullYear()));
    setTerm(normalizeTermLabel(currentTerm || term));
  }, [academicYear, currentTerm]);

  
  
  // Helper function to get student full name (consistent with Assignment component)
  const getStudentName = (student) => {
    if (!student) return 'Unknown Student';
    
    // Try firstName + lastName first (most common)
    if (student.firstName && student.lastName) {
      return `${student.firstName} ${student.lastName}`;
    }
    
    // Try firstName + surname
    if (student.firstName && student.surname) {
      return `${student.firstName} ${student.surname}`;
    }
    
    // Try name field
    if (student.name) {
      return student.name;
    }
    
    // Try just firstName
    if (student.firstName) {
      return student.firstName;
    }
    
    return 'Unknown Student';
  };

  const initializeBulkResults = () => {
    const results = students.map(student => ({
      student_id: student.id,
      studentName: getStudentName(student),
      admissionNumber: student.admissionNumber,
      exam_score: '',
      test_score: '',
            examType: examType,
      session: session,
      term: term
    }));
    setBulkResults(results);
  };

  const handleScoreChange = (index, field, value) => {
    const updatedResults = [...bulkResults];
    updatedResults[index][field] = value;
    setBulkResults(updatedResults);
  };

  const validateBulkResults = () => {
    const newErrors = {};
    let hasErrors = false;

    bulkResults.forEach((result, index) => {
      // Validate exam score (whole number)
      if (!result.exam_score && result.exam_score !== 0) {
        newErrors[`exam_score_${index}`] = 'Exam score is required';
        hasErrors = true;
      } else {
        const num = Number(result.exam_score);
        if (!Number.isInteger(num) || num < 0 || num > 50) {
          newErrors[`exam_score_${index}`] = 'Exam score must be a whole number between 0 and 50';
          hasErrors = true;
        }
      }

      // Validate test score (whole number)
      if (!result.test_score && result.test_score !== 0) {
        newErrors[`test_score_${index}`] = 'Test score is required';
        hasErrors = true;
      } else {
        const num = Number(result.test_score);
        if (!Number.isInteger(num) || num < 0 || num > 30) {
          newErrors[`test_score_${index}`] = 'Test score must be a whole number between 0 and 30';
          hasErrors = true;
        }
      }
    });

    setErrors(newErrors);
    return !hasErrors;
  };

  const handleBulkSubmit = () => {
    if (!validateBulkResults()) {
      return;
    }

    const validResults = bulkResults
      .filter(result => result.exam_score !== '' && result.test_score !== '' && Number.isInteger(Number(result.exam_score)) && Number.isInteger(Number(result.test_score)))
      .map(result => ({
        ...result,
        exam_score: parseInt(result.exam_score, 10),
        test_score: parseInt(result.test_score, 10),
        totalTeacherScore: parseInt(result.exam_score, 10) + parseInt(result.test_score, 10),
        maxExamScore: 50,
        maxTestScore: 30,
        maxTeacherScore: 80
      }));

    onSubmit(validResults);
  };

  
  const downloadTemplate = () => {
    const headers = ['Admission Number', 'Exam Score (0-50)', 'Test Score (0-30)'];
    const csvContent = [
      headers.join(','),
      ...students.map(student => `${student.admissionNumber},,`)
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${subject}_exam_results_template.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const getTotalScore = (examScore, testScore) => {
    return (parseInt(examScore, 10) || 0) + (parseInt(testScore, 10) || 0);
  };

  const getPercentage = (examScore, testScore) => {
    const total = getTotalScore(examScore, testScore);
    return Math.round((total / 80) * 100);
  };

  // Completion helpers
  const isComplete = (r) => {
    const e = parseFloat(r.exam_score);
    const t = parseFloat(r.test_score);
    const eOk = Number.isFinite(e) && e >= 0 && e <= 50;
    const tOk = Number.isFinite(t) && t >= 0 && t <= 30;
    return eOk && tOk;
  };
  const incompleteCount = bulkResults.filter((r) => !isComplete(r)).length;
  const nextIncompleteIndex = (from = 0) => {
    for (let i = Math.max(0, from); i < bulkResults.length; i++) {
      if (!isComplete(bulkResults[i])) return i;
    }
    return -1;
  };

  const validateRow = (idx) => {
    const r = bulkResults[idx];
    const newErrors = { ...errors };
    let ok = true;
    const e = Number(r.exam_score);
    if (!Number.isInteger(e) || e < 0 || e > 50) {
      newErrors[`exam_score_${idx}`] = 'Exam score must be a whole number between 0 and 50';
      ok = false;
    } else {
      delete newErrors[`exam_score_${idx}`];
    }
    const t = Number(r.test_score);
    if (!Number.isInteger(t) || t < 0 || t > 30) {
      newErrors[`test_score_${idx}`] = 'Test score must be a whole number between 0 and 30';
      ok = false;
    } else {
      delete newErrors[`test_score_${idx}`];
    }
    setErrors(newErrors);
    return ok;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900">Bulk Exam Result Upload</h3>
        <div className="flex space-x-3">
          <button
            onClick={downloadTemplate}
            className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm transition-colors"
          >
            Download Template
          </button>
        </div>
      </div>

      {/* Exam Details */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="font-medium text-gray-900 mb-3">Exam Details</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Exam Type</label>
            <div className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-100 text-gray-700">
              Final Exam
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Session</label>
            <div className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-100 text-gray-700">
              {session}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Term</label>
            <div className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-100 text-gray-700">
              {term}
            </div>
          </div>
        </div>
      </div>

      
      
      <div className="space-y-4">
        <button
          onClick={initializeBulkResults}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm transition-colors"
        >
          Initialize Manual Entry
        </button>
      </div>

      {/* Results Table */}
      {bulkResults.length > 0 && (
        <div className="space-y-4">
          {/* Desktop/Tablet table */}
          <div className="hidden md:block bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="max-h-[60vh] overflow-auto">
              <table className="min-w-full table-fixed divide-y divide-gray-200">
                <thead className="bg-gray-50 sticky top-0 z-20">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 z-30 bg-gray-50 w-64">
                      Student
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Admission No.
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Exam Score (0-50)
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Test Score (0-30)
                    </th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total (80)
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Percentage
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {bulkResults.map((result, index) => (
                    <tr key={result.student_id}>
                      <td className="px-4 py-4 text-sm font-medium text-gray-900 sticky left-0 z-20 bg-white w-64">
                        {result.studentName}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-500">
                        {result.admissionNumber}
                      </td>
                      <td className="px-4 py-4">
                        <input
                          type="number"
                          min="0"
                          max="50"
                          step="0.5"
                          value={result.exam_score}
                          onChange={(e) => handleScoreChange(index, 'exam_score', e.target.value)}
                          className={`w-20 px-2 py-1 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                            errors[`exam_score_${index}`] ? 'border-red-500' : 'border-gray-300'
                          }`}
                          placeholder="0"
                        />
                        {errors[`exam_score_${index}`] && (
                          <p className="text-red-500 text-xs mt-1">{errors[`exam_score_${index}`]}</p>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <input
                          type="number"
                          min="0"
                          max="30"
                          step="0.5"
                          value={result.test_score}
                          onChange={(e) => handleScoreChange(index, 'test_score', e.target.value)}
                          className={`w-20 px-2 py-1 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                            errors[`test_score_${index}`] ? 'border-red-500' : 'border-gray-300'
                          }`}
                          placeholder="0"
                        />
                        {errors[`test_score_${index}`] && (
                          <p className="text-red-500 text-xs mt-1">{errors[`test_score_${index}`]}</p>
                        )}
                      </td>
                                            <td className="px-4 py-4 text-sm font-medium text-gray-900">
                        {getTotalScore(result.exam_score, result.test_score)}/80
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-900">
                        {getPercentage(result.exam_score, result.test_score)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile quick entry cards */}
          <div className="md:hidden space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-700">Remaining: <span className="font-medium">{incompleteCount}</span> / {bulkResults.length}</div>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" checked={showIncompleteOnly} onChange={(e)=>setShowIncompleteOnly(e.target.checked)} />
                Show incomplete only
              </label>
            </div>
            {(showIncompleteOnly ? bulkResults.map((r, i)=>({r,i})).filter(x=>!isComplete(x.r)) : bulkResults.map((r,i)=>({r,i}))).map(({r,i}) => {
              const open = openStudentId === r.student_id;
              const complete = isComplete(r);
              return (
                <div key={r.student_id} className={`border rounded-lg ${complete ? 'border-green-200 bg-green-50' : 'border-yellow-200 bg-yellow-50'}`}>
                  <div className="p-4 flex items-center justify-between">
                    <div>
                      <div className="font-medium text-gray-900">{r.studentName}</div>
                      <div className="text-xs text-gray-600">{r.admissionNumber}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-xs px-2 py-1 rounded ${complete ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{complete ? 'Complete' : 'Incomplete'}</span>
                      <button
                        className="text-blue-600 text-sm"
                        onClick={() => setOpenStudentId(open ? null : r.student_id)}
                      >
                        {open ? 'Close' : 'Enter Scores'}
                      </button>
                    </div>
                  </div>
                  {open && (
                    <div className="px-4 pb-4 space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs text-gray-700 mb-1">Exam (0-50)</label>
                          <input
                            type="number"
                            min="0"
                            max="50"
                            step="0.5"
                            value={r.exam_score}
                            onChange={(e)=>handleScoreChange(i,'exam_score', e.target.value)}
                            className={`w-full px-3 py-2 border rounded text-sm ${errors[`exam_score_${i}`] ? 'border-red-500' : 'border-gray-300'}`}
                            placeholder="0"
                          />
                          {errors[`exam_score_${i}`] && <p className="text-xs text-red-500 mt-1">{errors[`exam_score_${i}`]}</p>}
                        </div>
                        <div>
                          <label className="block text-xs text-gray-700 mb-1">Test (0-30)</label>
                          <input
                            type="number"
                            min="0"
                            max="30"
                            step="0.5"
                            value={r.test_score}
                            onChange={(e)=>handleScoreChange(i,'test_score', e.target.value)}
                            className={`w-full px-3 py-2 border rounded text-sm ${errors[`test_score_${i}`] ? 'border-red-500' : 'border-gray-300'}`}
                            placeholder="0"
                          />
                          {errors[`test_score_${i}`] && <p className="text-xs text-red-500 mt-1">{errors[`test_score_${i}`]}</p>}
                        </div>
                      </div>
                                            <div className="flex items-center justify-between">
                        <div className="text-sm text-gray-700">Total: <span className="font-medium">{getTotalScore(r.exam_score, r.test_score)}</span>/80 • {getPercentage(r.exam_score, r.test_score)}%</div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              if (validateRow(i)) setOpenStudentId(null);
                            }}
                            className="px-3 py-2 bg-gray-100 text-gray-800 rounded text-sm"
                          >Save</button>
                          <button
                            onClick={() => {
                              if (!validateRow(i)) return;
                              const nextIdx = nextIncompleteIndex(i + 1);
                              if (nextIdx === -1) { setOpenStudentId(null); return; }
                              setOpenStudentId(bulkResults[nextIdx].student_id);
                            }}
                            className="px-3 py-2 bg-blue-600 text-white rounded text-sm"
                          >Save & Next</button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Summary */}
          <div className="bg-blue-50 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">Submission Summary</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-blue-700">Total Students:</span>
                <span className="font-medium ml-2">{students.length}</span>
              </div>
              <div>
                <span className="text-blue-700">Results Ready:</span>
                <span className="font-medium ml-2">
                  {bulkResults.filter(r => r.exam_score && r.test_score).length}
                </span>
              </div>
              <div>
                <span className="text-blue-700">Average Score:</span>
                <span className="font-medium ml-2">
                  {bulkResults.filter(r => r.exam_score && r.test_score).length > 0 ? 
                    Math.round(bulkResults
                      .filter(r => r.exam_score && r.test_score)
                      .reduce((sum, r) => sum + getTotalScore(r.exam_score, r.test_score), 0) / 
                      bulkResults.filter(r => r.exam_score && r.test_score).length
                    ) : 0}/80
                </span>
              </div>
              <div>
                <span className="text-blue-700">Subject:</span>
                <span className="font-medium ml-2">{subject}</span>
              </div>
            </div>
            <div className="mt-3 p-2 bg-yellow-100 rounded text-xs text-yellow-800">
              <strong>Note:</strong> These scores represent 80% of the total grade. Admin will add Assignment (15%) + Attendance (5%) scores.
            </div>
            <div className="mt-3">
              {incompleteCount > 0 ? (
                <details className="text-sm text-blue-900">
                  <summary className="cursor-pointer select-none">View {incompleteCount} incomplete student(s)</summary>
                  <ul className="mt-2 list-disc pl-6">
                    {bulkResults.map((r)=>!isComplete(r) && (
                      <li key={r.student_id} className="py-0.5">
                        <button
                          className="text-blue-700 underline"
                          onClick={() => setOpenStudentId(r.student_id)}
                        >
                          {r.studentName} ({r.admissionNumber})
                        </button>
                      </li>
                    ))}
                  </ul>
                </details>
              ) : (
                <div className="text-green-700">All students have valid scores.</div>
              )}
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end">
            <button
              onClick={handleBulkSubmit}
              disabled={submitting || bulkResults.filter(r => r.exam_score && r.test_score).length === 0}
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Submitting...' : `Submit ${bulkResults.filter(r => r.exam_score && r.test_score).length} Results for Review`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default BulkExamResultUpload;