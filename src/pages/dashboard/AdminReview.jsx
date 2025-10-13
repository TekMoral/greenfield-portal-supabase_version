import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../hooks/useAuth';
import {
  getSubmittedResults,
  gradeResultByAdmin,
  publishResult,
  calculateGrade,
  rejectResult
} from '../../services/supabase/studentResultService';
import { getAllExams } from '../../services/supabase/examService';
import { getAllClasses } from '../../services/supabase/classService';
import { getSubjects } from '../../services/supabase/subjectService';
import { getAllStudents } from '../../services/supabase/studentService';
import AdminReviewInline from '../../components/examResults/AdminReviewInline';
import MobileAdminScoreForm from '../../components/examResults/MobileAdminScoreForm';
import useToast from '../../hooks/useToast';

const AdminReview = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [pendingResults, setPendingResults] = useState([]);
  const [reviewedResults, setReviewedResults] = useState([]);
  const [publishedResults, setPublishedResults] = useState([]);
  const [rejectedResults, setRejectedResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending'); // pending, reviewed, published
  const [selectedResults, setSelectedResults] = useState([]);
  const [selectedResult, setSelectedResult] = useState(null);
  const [expanded, setExpanded] = useState({});
  const [draftAdminScores, setDraftAdminScores] = useState({});
  const inlineRef = useRef(null);
  const toggleExpand = (id) => {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
  };

  
  // Reference data
  const [exams, setExams] = useState([]);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [students, setStudents] = useState([]);
  const [classGroups, setClassGroups] = useState([]);
  const [classGroupKey, setClassGroupKey] = useState('');

  // Filter states
  const [filters, setFilters] = useState({
    examId: '',
    subjectId: ''
  });

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    fetchResults();
  }, [activeTab, filters, classGroupKey]);

  const fetchInitialData = async () => {
    try {
      const [examsRes, classesRes, subjectsRes, studentsRes] = await Promise.all([
        getAllExams(),
        getAllClasses(),
        getSubjects(),
        getAllStudents()
      ]);

      const examsData = Array.isArray(examsRes?.data) ? examsRes.data : (Array.isArray(examsRes) ? examsRes : []);
      const classesData = Array.isArray(classesRes?.data) ? classesRes.data : (Array.isArray(classesRes) ? classesRes : []);
      const subjectsData = Array.isArray(subjectsRes?.data) ? subjectsRes.data : (Array.isArray(subjectsRes) ? subjectsRes : []);
      const studentsData = Array.isArray(studentsRes?.data) ? studentsRes.data : (Array.isArray(studentsRes) ? studentsRes : []);

      console.log('Fetched students:', studentsData?.length || 0); // Debug log
      setExams(examsData);
      setClasses(classesData);
      setSubjects(subjectsData);
      setStudents(studentsData);
      // Build grouped classes with categories (Science/Arts/etc.)
      try {
        const baseNormalize = (name) => {
          if (!name) return { key: '', label: '', category: '' };
          let n = String(name).trim();
          const catMatch = n.match(/\s+(Science|Sciences|Arts|Commercial|Commerce|Management|Technical|Tech|Business|Social|Humanities|Option\s*[A-Z])$/i);
          const category = catMatch ? catMatch[1] : '';
          n = n.replace(/\s+(Science|Sciences|Arts|Commercial|Commerce|Management|Technical|Tech|Business|Humanities|Option\s*[A-Z])$/i, '');
          n = n.replace(/([A-Za-z]+)\s*([0-9]+)/g, '$1 $2');
          const label = n.replace(/\s+/g, ' ').trim();
          const key = label.toLowerCase();
          return { key, label, category };
        };
        const groupsMap = new Map();
        for (const c of (classesData || [])) {
          const { key, label, category } = baseNormalize(c.name);
          const entry = groupsMap.get(key) || { key, label, classIds: [], categories: new Set() };
          entry.classIds.push(c.id);
          if (category) entry.categories.add(category);
          groupsMap.set(key, entry);
        }
        const groups = Array.from(groupsMap.values()).map(g => ({ ...g, categories: Array.from(g.categories) })).sort((a,b)=>a.label.localeCompare(b.label));
        setClassGroups(groups);
      } catch (_) { setClassGroups([]); }
    } catch (error) {
      console.error('Error fetching initial data:', error);
    }
  };

  const fetchResults = async () => {
    setLoading(true);
    try {
      const [pendingRes, gradedRes, rejectedRes] = await Promise.all([
        getSubmittedResults({ ...filters, status: 'submitted' }),
        getSubmittedResults({ ...filters, status: 'graded' }),
        getSubmittedResults({ ...filters, status: 'rejected' })
      ]);

      let pending = pendingRes?.success ? (pendingRes.data || []) : [];
      let graded = gradedRes?.success ? (gradedRes.data || []) : [];
      let rejected = rejectedRes?.success ? (rejectedRes.data || []) : [];

      pending = applyClassFilters(pending);
      graded = applyClassFilters(graded);
      rejected = applyClassFilters(rejected);

      const published = graded.filter(r => r.published === true || r.is_published === true);
      const reviewed = graded.filter(r => !(r.published === true || r.is_published === true));

      setPendingResults(pending);
      setReviewedResults(reviewed);
      setPublishedResults(published);
      setRejectedResults(rejected);
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
      subjectId: ''
    });
    setClassGroupKey('');
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
    const list = activeTab === 'pending' ? pendingResults : activeTab === 'reviewed' ? reviewedResults : publishedResults;
    const eligibleIds = list.filter(isEligibleForPublish).map(r => r.id);
    if (selectedResults.length === eligibleIds.length) {
      setSelectedResults([]);
    } else {
      setSelectedResults(eligibleIds);
    }
  };

  const handleReviewResult = (result) => {
    setSelectedResult(result);
  };

  // Mobile only: scroll inline review into view when opened
  useEffect(() => {
    if (selectedResult && inlineRef.current) {
      if (typeof window !== 'undefined' && window.innerWidth < 768) {
        inlineRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  }, [selectedResult]);

  // Lock body scroll when desktop modal is open
  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    const isDesktop = window.innerWidth >= 768;
    if (selectedResult && isDesktop) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prev || '';
      };
    }
    return undefined;
  }, [selectedResult]);

  const handleSubmitReview = async (reviewData) => {
    try {
      // For mobile form, we need to determine which result to update
      const targetResult = selectedResult || reviewData.result;
      if (!targetResult) {
        throw new Error('No result selected for review');
      }

      const res = await gradeResultByAdmin({
        studentId: targetResult.studentId,
        subjectId: targetResult.subjectId,
        term: targetResult.term,
        year: targetResult.year,
        adminScore: reviewData.adminScore,
        teacherScore: reviewData.teacherScore
      });
      if (!res?.success) throw new Error(res?.error || 'Failed to submit review');
      
      // Clear selected result if it was set
      if (selectedResult) {
        setSelectedResult(null);
      }
      
      await fetchResults();
      showToast('Result approved successfully!', 'success');
    } catch (error) {
      console.error('Error submitting review:', error);
      showToast('Error approving result. Please try again.', 'error');
    }
  };

  // Compact mobile inline admin save handler
  const handleInlineAdminSave = async (e, resObj) => {
    e.preventDefault();
    const input = e.target.elements[`adminScore_${resObj.id}`];
    const value = parseFloat(input?.value);
    const max = 20;
    if (Number.isNaN(value) || value < 0 || value > max) {
      showToast(`Enter a valid admin score between 0 and ${max}`, 'error');
      return;
    }
    const teacherSubtotal = Number((resObj.testScore || 0) + (resObj.examScore || 0)) || Number(resObj.score ?? 0) || 0;
    await handleSubmitReview({ adminScore: value, teacherScore: teacherSubtotal, result: resObj });
    // Clear draft value for this row after successful save
    setDraftAdminScores((prev) => {
      const next = { ...prev };
      delete next[resObj.id];
      return next;
    });
  };

  const handleBulkPublish = async () => {
    if (selectedResults.length === 0) {
      showToast('Please select results to publish', 'error');
      return;
    }

    const selectedObjs = currentResults.filter(r => selectedResults.includes(r.id));
    const ineligible = selectedObjs.filter(r => !isEligibleForPublish(r));
    if (ineligible.length > 0) {
      showToast(`${ineligible.length} selected result(s) must be approved before publishing.`, 'error');
      return;
    }

    if (!window.confirm(`Are you sure you want to publish ${selectedResults.length} result(s)? Students will be able to see them.`)) {
      return;
    }

    try {
      for (const resultId of selectedResults) {
        const result = currentResults.find(r => r.id === resultId);
        if (result) {
          const res = await publishResult({
            studentId: result.studentId,
            subjectId: result.subjectId,
            term: result.term,
            year: result.year
          });
          if (!res?.success) throw new Error(res?.error || 'Failed to publish result');
        }
      }
      setSelectedResults([]);
      await fetchResults();
      showToast(`${selectedResults.length} result(s) published successfully!`, 'success');
    } catch (error) {
      console.error('Error publishing results:', error);
      showToast('Error publishing results. Please try again.', 'error');
    }
  };

  const handleReject = async (resObj) => {
    try {
      const reason = window.prompt('Enter reason for rejection (visible to teacher):');
      if (reason == null) return; // cancelled
      const trimmed = String(reason).trim();
      if (!trimmed) {
        showToast('Please provide a reason for rejection.', 'error');
        return;
      }
      const resp = await rejectResult({
        studentId: resObj.studentId,
        subjectId: resObj.subjectId,
        term: resObj.term,
        year: resObj.year,
        reason: trimmed
      });
      if (!resp?.success) throw new Error(resp?.error || 'Failed to reject');
      if (selectedResult) setSelectedResult(null);
      await fetchResults();
      showToast('Result rejected and sent back for correction.', 'success');
    } catch (err) {
      console.error('Reject error:', err);
      showToast(err?.message || 'Error rejecting result.', 'error');
    }
  };

  const getStudentName = (studentId) => {
    const student = students.find(s => s.id === studentId || s.uid === studentId);
    if (!student) return 'Unknown Student';
    if (student.full_name) return student.full_name;
    if (student.firstName && student.surname) return `${student.firstName} ${student.surname}`;
    if (student.name) return student.name;
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
    const student = students.find(s => s.id === studentId || s.uid === studentId);
    return student ? (student.admission_number || student.admissionNumber || student.id) : studentId;
  };

  const getStatusColor = (status, published = false) => {
    if (status === 'graded' && published) return 'bg-green-100 text-green-800';
    if (status === 'graded') return 'bg-blue-100 text-blue-800';
    if (status === 'rejected') return 'bg-red-100 text-red-800';
    if (status === 'submitted') return 'bg-yellow-100 text-yellow-800';
    return 'bg-gray-100 text-gray-800';
  };

  const getStatusText = (status, published = false) => {
    if (status === 'graded' && published) return 'Published';
    if (status === 'graded') return 'Graded';
    if (status === 'rejected') return 'Rejected';
    if (status === 'submitted') return 'Pending Review';
    return 'Draft';
  };

  const isEligibleForPublish = (r) => r?.status === 'graded';

  
  // Filter results by class or class group using students -> class_id
  const applyClassFilters = (rows) => {
    let out = Array.isArray(rows) ? rows.slice() : [];
    const byId = new Map((students || []).map(s => [String(s.id), s]));
    if (classGroupKey) {
      const grp = (classGroups || []).find(g => g.key === classGroupKey);
      const ids = grp ? new Set(grp.classIds) : null;
      if (ids && ids.size) {
        out = out.filter(r => {
          const st = byId.get(String(r.studentId));
          return st && ids.has(st.class_id);
        });
      }
    }
    return out;
  };

  const currentResults = activeTab === 'pending'
    ? pendingResults
    : activeTab === 'reviewed'
      ? reviewedResults
      : activeTab === 'rejected'
        ? rejectedResults
        : publishedResults;

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
          <h1 className="text-2xl lg:text-3xl font-bold text-indigo-900">Admin Review & Approval</h1>
          <p className="text-slate-600 mt-1">Review and approve exam results before publishing</p>
        </div>
        {selectedResults.length > 0 && activeTab === 'reviewed' && (
          <button
            onClick={handleBulkPublish}
            disabled={!currentResults.filter(r => selectedResults.includes(r.id)).every(isEligibleForPublish)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors text-white ${
              currentResults.filter(r => selectedResults.includes(r.id)).every(isEligibleForPublish)
                ? 'bg-green-600 hover:bg-green-700'
                : 'bg-green-600 opacity-50 cursor-not-allowed'
            }`}
            title={!currentResults.filter(r => selectedResults.includes(r.id)).every(isEligibleForPublish)
              ? 'Select only results that have been approved'
              : 'Publish Selected'}
          >
            Publish Selected ({selectedResults.length})
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        {/* Mobile: 2x2 Grid */}
        <nav className="grid grid-cols-2 gap-2 sm:hidden pb-2">
          <button
            onClick={() => setActiveTab('pending')}
            className={`py-2 px-3 rounded-t-lg font-medium text-xs text-center ${
              activeTab === 'pending'
                ? 'bg-yellow-500 text-white'
                : 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100'
            }`}
          >
            Pending
            <span className="block text-[10px] mt-0.5">({pendingResults.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('reviewed')}
            className={`py-2 px-3 rounded-t-lg font-medium text-xs text-center ${
              activeTab === 'reviewed'
                ? 'bg-blue-500 text-white'
                : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
            }`}
          >
            Reviewed
            <span className="block text-[10px] mt-0.5">({reviewedResults.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('rejected')}
            className={`py-2 px-3 rounded-t-lg font-medium text-xs text-center ${
              activeTab === 'rejected'
                ? 'bg-red-500 text-white'
                : 'bg-red-50 text-red-700 hover:bg-red-100'
            }`}
          >
            Rejected
            <span className="block text-[10px] mt-0.5">({rejectedResults.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('published')}
            className={`py-2 px-3 rounded-t-lg font-medium text-xs text-center ${
              activeTab === 'published'
                ? 'bg-green-500 text-white'
                : 'bg-green-50 text-green-700 hover:bg-green-100'
            }`}
          >
            Published
            <span className="block text-[10px] mt-0.5">({publishedResults.length})</span>
          </button>
        </nav>

        {/* Desktop: Horizontal Tabs */}
        <nav className="hidden sm:flex -mb-px space-x-8">
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
            Reviewed ({reviewedResults.length})
          </button>
          <button
            onClick={() => setActiveTab('rejected')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'rejected'
                ? 'border-red-500 text-red-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Rejected ({rejectedResults.length})
          </button>
          <button
            onClick={() => setActiveTab('published')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'published'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Published ({publishedResults.length})
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

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
            <label className="block text-sm font-medium text-slate-700 mb-2">Class Group</label>
            <select
            value={classGroupKey}
            onChange={(e) => { setClassGroupKey(e.target.value); }}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Groups</option>
              {classGroups.map(g => (
                <option key={g.key} value={g.key}>
                  {g.label}{g.categories && g.categories.length ? ` — ${g.categories.join('/')}` : ''}
                </option>
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
                  Student
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider hidden md:table-cell">
                  Exam
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider hidden md:table-cell">
                  Subject
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider hidden md:table-cell">
                  Current Score
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider hidden md:table-cell">
                  Final (Score/Grade)
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider hidden md:table-cell">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider hidden md:table-cell">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {currentResults.map((result) => {
                const isPublished = result.published === true || result.is_published === true;
                console.log('Rendering result:', result); // Debug log
                const teacherScore = Number((result.testScore || 0) + (result.examScore || 0)) || Number(result.score ?? 0) || 0;
                const originalScore = teacherScore; // out of 100
                const originalMaxScore = 100;
                const totalScore = teacherScore; // out of 100
                const gradeInfo = calculateGrade(totalScore, 100);

                return (
                  <tr key={result.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 whitespace-normal break-words md:whitespace-nowrap">
                      <div className="flex items-center gap-2 w-full">
                        {/* Checkbox beside name for all screen sizes */}
                        <label className="inline-flex items-center">
                          <input
                            type="checkbox"
                            checked={selectedResults.includes(result.id)}
                            onChange={() => handleSelectResult(result.id)}
                            disabled={!isEligibleForPublish(result)}
                            title={!isEligibleForPublish(result) ? 'Approve before publishing' : 'Select for publish'}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                          />
                        </label>
                        <div className="text-sm font-medium text-slate-900 break-words">
                          {getStudentName(result.studentId)}
                        </div>
                        {/* Mobile Open/Close toggle */}
                        <button
                          type="button"
                          onClick={() => toggleExpand(result.id)}
                          className="md:hidden ml-auto inline-flex items-center text-xs px-2 py-1 rounded border border-emerald-300 text-emerald-700 hover:bg-emerald-100"
                        >
                          {expanded[result.id] ? 'Close' : 'Open'}
                        </button>
                      </div>
                      <div className="text-sm text-slate-500 break-words">
                        Adm No: {getStudentAdmissionNumber(result.studentId)}
                      </div>

                      {/* Mobile details panel compact container */}
                      {expanded[result.id] && (
                        <div className="md:hidden mt-3 w-full max-w-full overflow-hidden">
                          <div className="w-full p-3 rounded-lg border border-emerald-200 bg-emerald-50 text-sm shadow-sm">
                            <div className="grid grid-cols-[auto,1fr] gap-x-2 gap-y-1 items-center">
                              <span className="text-slate-600">Exam:</span>
                              <span className="font-medium text-slate-900 break-words">{result.examId ? getExamName(result.examId) : `${result.term || 'Term'} ${result.year || new Date().getFullYear()}`}</span>

                              <span className="text-slate-600">Subject:</span>
                              <span className="font-medium text-slate-900 break-words">{getSubjectName(result.subjectId)}</span>

                              <div className="col-span-2 flex items-center gap-2 flex-wrap">
                                <span className="text-slate-600">Status:</span>
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${getStatusColor(result.status, isPublished)}`}>{getStatusText(result.status, isPublished)}</span>
                              </div>

                              {result.testScore != null && (
                                <>
                                  <span className="text-slate-600">CA score:</span>
                                  <span className="font-medium text-slate-900">{result.testScore}/30</span>
                                </>
                              )}

                              {result.examScore != null && (
                                <>
                                  <span className="text-slate-600">Exam score:</span>
                                  <span className="font-medium text-slate-900">{result.examScore}/70</span>
                                </>
                              )}

                              {String(result.status || '').toLowerCase() === 'rejected' && (
                                <>
                                  <span className="text-slate-600">Rejection reason:</span>
                                  <span className="font-medium text-slate-900">{result.admin_comments || result.adminComments || '—'}</span>
                                </>
                              )}

                              {/* Approval row: approve on pending/reviewed, show approved on published */}
                              <span className="text-slate-600">Approval:</span>
                              {activeTab === 'published' ? (
                                <span className="font-medium text-slate-900">Approved</span>
                              ) : (
                                <button
                                  onClick={() => handleSubmitReview({ result })}
                                  className="px-2 py-1 bg-emerald-600 text-white text-xs rounded hover:bg-emerald-700 shrink-0"
                                >
                                  Approve
                                </button>
                              )}

                              <span className="text-slate-600">Total score:</span>
                              <span className="font-semibold text-slate-900">{(Number((result.testScore || 0) + (result.examScore || 0)) || Number(result.score ?? 0) || 0)}/100</span>
                            </div>

                            {/* Mobile action buttons */}
                            {(activeTab === 'pending' || activeTab === 'reviewed') && !isPublished && (
                              <div className="col-span-2 mt-2 pt-2 border-t border-emerald-300 flex gap-2">
                                <button
                                  onClick={() => handleReject(result)}
                                  className="flex-1 px-3 py-1.5 bg-red-600 text-white text-xs rounded hover:bg-red-700"
                                >
                                  Reject
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap hidden md:table-cell">
                      <div className="text-sm font-medium text-slate-900">
                        {result.examId ? getExamName(result.examId) : `${result.term || 'Term'} ${result.year || new Date().getFullYear()}`}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap hidden md:table-cell">
                      <div className="text-sm text-slate-900">
                        {getSubjectName(result.subjectId)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap hidden md:table-cell">
                      <div className="text-sm text-slate-900">
                        {originalScore}/{originalMaxScore}
                      </div>
                      <div className="text-sm text-slate-500">
                        {((originalScore / originalMaxScore) * 100).toFixed(1)}%
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap hidden md:table-cell">
                      <div>
                        <div className="text-sm text-slate-900">
                          {totalScore}/100
                        </div>
                        <div className="text-sm text-green-600">
                          Grade: {gradeInfo.grade}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap hidden md:table-cell">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(result.status, isPublished)}`}>
                        {getStatusText(result.status, isPublished)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2 hidden md:table-cell">
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
                      {(activeTab === 'pending' || activeTab === 'reviewed') && !isPublished && (
                        <button
                          onClick={() => handleReject(result)}
                          className="text-red-600 hover:text-red-800 ml-2"
                        >
                          Reject
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

      {/* Desktop Modal for Review */}
      {selectedResult && (
        <div className="fixed inset-0 z-50 hidden md:flex items-center justify-center" aria-modal="true" role="dialog">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSelectedResult(null)} />
          <div className="relative bg-white w-full max-w-4xl max-h-[90vh] rounded-lg shadow-xl overflow-auto" onClick={(e) => e.stopPropagation()}>
            <AdminReviewInline
              result={selectedResult}
              onClose={() => {
                setSelectedResult(null);
              }}
              onSubmit={handleSubmitReview}
              onReject={handleReject}
              exams={exams}
              classes={classes}
              subjects={subjects}
              students={students}
              isReadOnly={activeTab === 'published'}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminReview;
