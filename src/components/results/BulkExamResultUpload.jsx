import React, { useState } from 'react';

const BulkExamResultUpload = ({ students, subject, onSubmit, submitting }) => {
  const [uploadMethod, setUploadMethod] = useState('manual');
  const [bulkResults, setBulkResults] = useState([]);
  const [csvFile, setCsvFile] = useState(null);
  const [errors, setErrors] = useState({});
  const [examType, setExamType] = useState('midterm');
  const [session, setSession] = useState(new Date().getFullYear().toString());
  const [term, setTerm] = useState('First Term');

  const examTypes = [
    { value: 'midterm', label: 'Mid-term Exam' },
    { value: 'final', label: 'Final Exam' },
    { value: 'quiz', label: 'Quiz' },
    { value: 'test', label: 'Class Test' },
    { value: 'monthly', label: 'Monthly Test' }
  ];

  const terms = ['First Term', 'Second Term', 'Third Term'];

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
      studentId: student.id,
      studentName: getStudentName(student),
      admissionNumber: student.admissionNumber,
      examScore: '',
      testScore: '',
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
      // Validate exam score
      if (!result.examScore) {
        newErrors[`examScore_${index}`] = 'Exam score is required';
        hasErrors = true;
      } else {
        const score = parseFloat(result.examScore);
        if (isNaN(score) || score < 0 || score > 50) {
          newErrors[`examScore_${index}`] = 'Exam score must be between 0 and 50';
          hasErrors = true;
        }
      }

      // Validate test score
      if (!result.testScore) {
        newErrors[`testScore_${index}`] = 'Test score is required';
        hasErrors = true;
      } else {
        const score = parseFloat(result.testScore);
        if (isNaN(score) || score < 0 || score > 30) {
          newErrors[`testScore_${index}`] = 'Test score must be between 0 and 30';
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
      .filter(result => result.examScore && result.testScore)
      .map(result => ({
        ...result,
        examScore: parseFloat(result.examScore),
        testScore: parseFloat(result.testScore),
        totalTeacherScore: parseFloat(result.examScore) + parseFloat(result.testScore),
        maxExamScore: 50,
        maxTestScore: 30,
        maxTeacherScore: 80
      }));

    onSubmit(validResults);
  };

  const handleCsvUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setCsvFile(file);
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const csv = e.target.result;
        const lines = csv.split('\n');
        const headers = lines[0].split(',').map(h => h.trim());
        
        // Expected headers: Admission Number, Exam Score, Test Score
        const results = [];
        
        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(',').map(v => v.trim());
          if (values.length < 3) continue;
          
          const admissionNumber = values[0];
          const examScore = values[1];
          const testScore = values[2];
          
          const student = students.find(s => s.admissionNumber === admissionNumber);
          if (student && examScore && testScore) {
            results.push({
              studentId: student.id,
              studentName: getStudentName(student),
              admissionNumber: student.admissionNumber,
              examScore: examScore,
              testScore: testScore,
              examType: examType,
              session: session,
              term: term
            });
          }
        }
        
        setBulkResults(results);
        setUploadMethod('csv');
      } catch (error) {
        console.error('Error parsing CSV:', error);
        alert('Error parsing CSV file. Please check the format.');
      }
    };
    
    reader.readAsText(file);
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
    return (parseFloat(examScore) || 0) + (parseFloat(testScore) || 0);
  };

  const getPercentage = (examScore, testScore) => {
    const total = getTotalScore(examScore, testScore);
    return Math.round((total / 80) * 100);
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
            <select
              value={examType}
              onChange={(e) => setExamType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {examTypes.map(type => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Session</label>
            <input
              type="text"
              value={session}
              onChange={(e) => setSession(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., 2023/2024"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Term</label>
            <select
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {terms.map(termOption => (
                <option key={termOption} value={termOption}>{termOption}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Upload Method Selection */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="font-medium text-gray-900 mb-3">Choose Upload Method</h4>
        <div className="flex space-x-4">
          <label className="flex items-center">
            <input
              type="radio"
              name="uploadMethod"
              value="manual"
              checked={uploadMethod === 'manual'}
              onChange={(e) => setUploadMethod(e.target.value)}
              className="mr-2"
            />
            <span className="text-sm text-gray-700">Manual Entry</span>
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              name="uploadMethod"
              value="csv"
              checked={uploadMethod === 'csv'}
              onChange={(e) => setUploadMethod(e.target.value)}
              className="mr-2"
            />
            <span className="text-sm text-gray-700">CSV Upload</span>
          </label>
        </div>
      </div>

      {uploadMethod === 'csv' && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Upload CSV File
            </label>
            <input
              type="file"
              accept=".csv"
              onChange={handleCsvUpload}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-sm text-gray-500 mt-1">
              CSV format: Admission Number, Exam Score (0-50), Test Score (0-30)
            </p>
          </div>
        </div>
      )}

      {uploadMethod === 'manual' && (
        <div className="space-y-4">
          <button
            onClick={initializeBulkResults}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm transition-colors"
          >
            Initialize Manual Entry
          </button>
        </div>
      )}

      {/* Results Table */}
      {bulkResults.length > 0 && (
        <div className="space-y-4">
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Student
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Admission No.
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Exam Score (0-50)
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Test Score (0-30)
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total (80)
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Percentage
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {bulkResults.map((result, index) => (
                    <tr key={result.studentId}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {result.studentName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {result.admissionNumber}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="number"
                          min="0"
                          max="50"
                          step="0.5"
                          value={result.examScore}
                          onChange={(e) => handleScoreChange(index, 'examScore', e.target.value)}
                          className={`w-20 px-2 py-1 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                            errors[`examScore_${index}`] ? 'border-red-500' : 'border-gray-300'
                          }`}
                          placeholder="0"
                        />
                        {errors[`examScore_${index}`] && (
                          <p className="text-red-500 text-xs mt-1">{errors[`examScore_${index}`]}</p>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="number"
                          min="0"
                          max="30"
                          step="0.5"
                          value={result.testScore}
                          onChange={(e) => handleScoreChange(index, 'testScore', e.target.value)}
                          className={`w-20 px-2 py-1 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                            errors[`testScore_${index}`] ? 'border-red-500' : 'border-gray-300'
                          }`}
                          placeholder="0"
                        />
                        {errors[`testScore_${index}`] && (
                          <p className="text-red-500 text-xs mt-1">{errors[`testScore_${index}`]}</p>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {getTotalScore(result.examScore, result.testScore)}/80
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {getPercentage(result.examScore, result.testScore)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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
                  {bulkResults.filter(r => r.examScore && r.testScore).length}
                </span>
              </div>
              <div>
                <span className="text-blue-700">Average Score:</span>
                <span className="font-medium ml-2">
                  {bulkResults.filter(r => r.examScore && r.testScore).length > 0 ? 
                    Math.round(bulkResults
                      .filter(r => r.examScore && r.testScore)
                      .reduce((sum, r) => sum + getTotalScore(r.examScore, r.testScore), 0) / 
                      bulkResults.filter(r => r.examScore && r.testScore).length
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
          </div>

          {/* Submit Button */}
          <div className="flex justify-end">
            <button
              onClick={handleBulkSubmit}
              disabled={submitting || bulkResults.filter(r => r.examScore && r.testScore).length === 0}
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Submitting...' : `Submit ${bulkResults.filter(r => r.examScore && r.testScore).length} Results for Review`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default BulkExamResultUpload;