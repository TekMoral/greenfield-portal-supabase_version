import React, { useState } from 'react';

const BulkResultUpload = ({ exam, students, onSubmit, submitting }) => {
  const [uploadMethod, setUploadMethod] = useState('manual');
  const [bulkResults, setBulkResults] = useState([]);
  const [csvFile, setCsvFile] = useState(null);
  const [errors, setErrors] = useState({});

  const calculateGrade = (score, totalMarks) => {
    const percentage = (score / totalMarks) * 100;
    if (percentage >= 90) return 'A+';
    if (percentage >= 80) return 'A';
    if (percentage >= 70) return 'B';
    if (percentage >= 60) return 'C';
    if (percentage >= 50) return 'D';
    return 'F';
  };

  const initializeBulkResults = () => {
    const results = students.map(student => ({
      studentId: student.id,
      studentName: student.name,
      admissionNumber: student.admissionNumber,
      totalScore: '',
      grade: '',
      remarks: '',
      session: exam.session || new Date().getFullYear().toString(),
      term: exam.term || 'First Term'
    }));
    setBulkResults(results);
  };

  const handleScoreChange = (index, score) => {
    const updatedResults = [...bulkResults];
    updatedResults[index].totalScore = score;
    
    if (score && !isNaN(parseFloat(score))) {
      updatedResults[index].grade = calculateGrade(parseFloat(score), exam.totalMarks);
    } else {
      updatedResults[index].grade = '';
    }
    
    setBulkResults(updatedResults);
  };

  const handleRemarksChange = (index, remarks) => {
    const updatedResults = [...bulkResults];
    updatedResults[index].remarks = remarks;
    setBulkResults(updatedResults);
  };

  const validateBulkResults = () => {
    const newErrors = {};
    let hasErrors = false;

    bulkResults.forEach((result, index) => {
      if (!result.totalScore) {
        newErrors[`score_${index}`] = 'Score is required';
        hasErrors = true;
      } else {
        const score = parseFloat(result.totalScore);
        if (isNaN(score) || score < 0 || score > exam.totalMarks) {
          newErrors[`score_${index}`] = `Score must be between 0 and ${exam.totalMarks}`;
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
      .filter(result => result.totalScore)
      .map(result => ({
        ...result,
        totalScore: parseFloat(result.totalScore),
        percentage: Math.round((parseFloat(result.totalScore) / exam.totalMarks) * 100),
        status: parseFloat(result.totalScore) >= exam.passingMarks ? 'passed' : 'failed'
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
        
        // Expected headers: Admission Number, Score, Remarks
        const results = [];
        
        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(',').map(v => v.trim());
          if (values.length < 2) continue;
          
          const admissionNumber = values[0];
          const score = values[1];
          const remarks = values[2] || '';
          
          const student = students.find(s => s.admissionNumber === admissionNumber);
          if (student && score) {
            results.push({
              studentId: student.id,
              studentName: student.name,
              admissionNumber: student.admissionNumber,
              totalScore: score,
              grade: calculateGrade(parseFloat(score), exam.totalMarks),
              remarks: remarks,
              session: exam.session || new Date().getFullYear().toString(),
              term: exam.term || 'First Term'
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
    const headers = ['Admission Number', 'Score', 'Remarks'];
    const csvContent = [
      headers.join(','),
      ...students.map(student => `${student.admissionNumber},,`)
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${exam.title}_results_template.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900">Bulk Result Upload</h3>
        <div className="flex space-x-3">
          <button
            onClick={downloadTemplate}
            className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm transition-colors"
          >
            Download Template
          </button>
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
              CSV format: Admission Number, Score, Remarks (optional)
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
                      Score (/{exam.totalMarks})
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Grade
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Remarks
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
                          max={exam.totalMarks}
                          step="0.5"
                          value={result.totalScore}
                          onChange={(e) => handleScoreChange(index, e.target.value)}
                          className={`w-20 px-2 py-1 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                            errors[`score_${index}`] ? 'border-red-500' : 'border-gray-300'
                          }`}
                          placeholder="0"
                        />
                        {errors[`score_${index}`] && (
                          <p className="text-red-500 text-xs mt-1">{errors[`score_${index}`]}</p>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          result.grade === 'A+' || result.grade === 'A' ? 'bg-green-100 text-green-800' :
                          result.grade === 'B' ? 'bg-blue-100 text-blue-800' :
                          result.grade === 'C' ? 'bg-yellow-100 text-yellow-800' :
                          result.grade === 'D' ? 'bg-orange-100 text-orange-800' :
                          result.grade === 'F' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {result.grade || '-'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="text"
                          value={result.remarks}
                          onChange={(e) => handleRemarksChange(index, e.target.value)}
                          className="w-32 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Optional"
                        />
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
                  {bulkResults.filter(r => r.totalScore).length}
                </span>
              </div>
              <div>
                <span className="text-blue-700">Passing:</span>
                <span className="font-medium ml-2">
                  {bulkResults.filter(r => r.totalScore && parseFloat(r.totalScore) >= exam.passingMarks).length}
                </span>
              </div>
              <div>
                <span className="text-blue-700">Failing:</span>
                <span className="font-medium ml-2">
                  {bulkResults.filter(r => r.totalScore && parseFloat(r.totalScore) < exam.passingMarks).length}
                </span>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end">
            <button
              onClick={handleBulkSubmit}
              disabled={submitting || bulkResults.filter(r => r.totalScore).length === 0}
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Submitting...' : `Submit ${bulkResults.filter(r => r.totalScore).length} Results for Approval`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default BulkResultUpload;