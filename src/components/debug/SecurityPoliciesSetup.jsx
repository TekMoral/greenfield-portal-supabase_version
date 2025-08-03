// src/components/debug/SecurityPoliciesSetup.jsx
import React, { useState } from 'react'
import { supabase } from '../../lib/supabaseClient'

const SecurityPoliciesSetup = () => {
  const [result, setResult] = useState('')
  const [loading, setLoading] = useState(false)
  const [selectedPolicySet, setSelectedPolicySet] = useState('production')

  const policyTemplates = {
    development: {
      name: 'Development (Permissive)',
      description: 'Relaxed policies for development and testing',
      sql: `
-- DEVELOPMENT POLICIES (Permissive for testing)
-- ⚠️ DO NOT USE IN PRODUCTION

-- Disable RLS temporarily for development
ALTER TABLE public.user_profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.exams DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_results DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.grades DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance DISABLE ROW LEVEL SECURITY;

-- Or use very permissive policies
-- ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "dev_allow_all" ON user_profiles FOR ALL USING (true);
`
    },
    production: {
      name: 'Production (Secure)',
      description: 'Secure policies for production use',
      sql: `
-- PRODUCTION SECURITY POLICIES
-- 🔒 Secure policies based on user roles

-- Enable RLS on all tables
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignment_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timetables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.news_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.carousel_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Helper functions for role checking
CREATE OR REPLACE FUNCTION auth.user_role() RETURNS TEXT AS $$
  SELECT role FROM public.user_profiles WHERE id = auth.uid()
$$ LANGUAGE SQL SECURITY DEFINER;

CREATE OR REPLACE FUNCTION auth.user_is_active() RETURNS BOOLEAN AS $$
  SELECT is_active FROM public.user_profiles WHERE id = auth.uid()
$$ LANGUAGE SQL SECURITY DEFINER;

-- USER PROFILES POLICIES
CREATE POLICY "Users can view own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" ON user_profiles
  FOR SELECT USING (auth.user_role() IN ('admin', 'super_admin'));

CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can create profiles" ON user_profiles
  FOR INSERT WITH CHECK (auth.user_role() IN ('admin', 'super_admin'));

-- CLASSES POLICIES
CREATE POLICY "Everyone can view classes" ON classes
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage classes" ON classes
  FOR ALL USING (auth.user_role() IN ('admin', 'super_admin'));

-- SUBJECTS POLICIES  
CREATE POLICY "Everyone can view subjects" ON subjects
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage subjects" ON subjects
  FOR ALL USING (auth.user_role() IN ('admin', 'super_admin'));

-- EXAMS POLICIES
CREATE POLICY "Students can view own exams" ON exams
  FOR SELECT USING (
    auth.user_role() = 'student' AND 
    class_id IN (SELECT class_id FROM user_profiles WHERE id = auth.uid())
  );

CREATE POLICY "Teachers can view assigned exams" ON exams
  FOR SELECT USING (
    auth.user_role() = 'teacher' AND 
    teacher_id = auth.uid()
  );

CREATE POLICY "Admins can view all exams" ON exams
  FOR SELECT USING (auth.user_role() IN ('admin', 'super_admin'));

CREATE POLICY "Teachers can manage own exams" ON exams
  FOR ALL USING (
    auth.user_role() = 'teacher' AND 
    teacher_id = auth.uid()
  );

-- EXAM RESULTS POLICIES
CREATE POLICY "Students can view own results" ON exam_results
  FOR SELECT USING (
    auth.user_role() = 'student' AND 
    student_id = auth.uid() AND
    is_published = true
  );

CREATE POLICY "Teachers can manage results for their exams" ON exam_results
  FOR ALL USING (
    auth.user_role() = 'teacher' AND 
    exam_id IN (SELECT id FROM exams WHERE teacher_id = auth.uid())
  );

CREATE POLICY "Admins can view all results" ON exam_results
  FOR SELECT USING (auth.user_role() IN ('admin', 'super_admin'));

-- ASSIGNMENTS POLICIES
CREATE POLICY "Students can view class assignments" ON assignments
  FOR SELECT USING (
    auth.user_role() = 'student' AND 
    class_id IN (SELECT class_id FROM user_profiles WHERE id = auth.uid())
  );

CREATE POLICY "Teachers can manage own assignments" ON assignments
  FOR ALL USING (
    auth.user_role() = 'teacher' AND 
    teacher_id = auth.uid()
  );

-- GRADES POLICIES
CREATE POLICY "Students can view own grades" ON grades
  FOR SELECT USING (
    auth.user_role() = 'student' AND 
    student_id = auth.uid() AND
    is_published = true
  );

CREATE POLICY "Teachers can manage grades for their subjects" ON grades
  FOR ALL USING (
    auth.user_role() = 'teacher' AND 
    teacher_id = auth.uid()
  );

-- ATTENDANCE POLICIES
CREATE POLICY "Students can view own attendance" ON attendance
  FOR SELECT USING (
    auth.user_role() = 'student' AND 
    student_id = auth.uid()
  );

CREATE POLICY "Teachers can manage attendance for their classes" ON attendance
  FOR ALL USING (
    auth.user_role() = 'teacher' AND 
    teacher_id = auth.uid()
  );

-- NEWS & EVENTS POLICIES
CREATE POLICY "Public can view published news" ON news_events
  FOR SELECT USING (status = 'published');

CREATE POLICY "Admins can manage news" ON news_events
  FOR ALL USING (auth.user_role() IN ('admin', 'super_admin'));

-- NOTIFICATIONS POLICIES
CREATE POLICY "Users can view own notifications" ON notifications
  FOR SELECT USING (recipient_id = auth.uid());

CREATE POLICY "Admins can send notifications" ON notifications
  FOR INSERT WITH CHECK (auth.user_role() IN ('admin', 'super_admin', 'teacher'));

-- AUDIT LOGS POLICIES
CREATE POLICY "Admins can view audit logs" ON audit_logs
  FOR SELECT USING (auth.user_role() IN ('admin', 'super_admin'));

CREATE POLICY "System can insert audit logs" ON audit_logs
  FOR INSERT WITH CHECK (true);
`
    },
    custom: {
      name: 'Custom Policies',
      description: 'Customize policies for your specific needs',
      sql: `
-- CUSTOM SECURITY POLICIES
-- Modify these policies according to your specific requirements

-- Example: More restrictive student access
CREATE POLICY "Students limited access" ON user_profiles
  FOR SELECT USING (
    auth.uid() = id OR 
    (auth.user_role() = 'student' AND role = 'teacher' AND class_id IN (
      SELECT class_id FROM user_profiles WHERE id = auth.uid()
    ))
  );

-- Example: Department-based teacher access
CREATE POLICY "Teachers by department" ON subjects
  FOR SELECT USING (
    auth.user_role() = 'teacher' AND 
    department IN (
      SELECT department FROM user_profiles WHERE id = auth.uid()
    )
  );

-- Add your custom policies here...
`
    }
  }

  const testPolicies = async () => {
    setLoading(true)
    setResult('Testing current security policies...')
    
    try {
      const tests = []
      
      // Test 1: Can read own profile
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', '8c53c275-a082-4e19-8736-2ad085c07141')
        .single()
      
      tests.push({
        test: 'Read own profile',
        success: !profileError,
        error: profileError?.message
      })
      
      // Test 2: Can read classes
      const { data: classes, error: classError } = await supabase
        .from('classes')
        .select('*')
        .limit(1)
      
      tests.push({
        test: 'Read classes',
        success: !classError,
        error: classError?.message
      })
      
      // Test 3: Can read subjects
      const { data: subjects, error: subjectError } = await supabase
        .from('subjects')
        .select('*')
        .limit(1)
      
      tests.push({
        test: 'Read subjects',
        success: !subjectError,
        error: subjectError?.message
      })
      
      const results = tests.map(test => 
        `${test.success ? '✅' : '❌'} ${test.test}: ${test.success ? 'PASS' : test.error}`
      ).join('\n')
      
      setResult(`Security Policy Tests:\n\n${results}`)
    } catch (error) {
      setResult(`❌ Test failed: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const showPolicySQL = () => {
    const template = policyTemplates[selectedPolicySet]
    setResult(`${template.name}\n${template.description}\n\n${template.sql}`)
  }

  return (
    <div className="p-6 bg-white rounded-lg shadow-md max-w-4xl mx-auto mt-8">
      <h2 className="text-2xl font-bold mb-6 text-center">🔒 Security Policies Setup</h2>
      <p className="text-center text-gray-600 mb-8">Step 5: Configure Row Level Security (RLS) policies</p>

      {/* Policy Template Selection */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-3">Choose Policy Template</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Object.entries(policyTemplates).map(([key, template]) => (
            <div 
              key={key}
              className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                selectedPolicySet === key 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => setSelectedPolicySet(key)}
            >
              <div className="font-medium">{template.name}</div>
              <div className="text-sm text-gray-600 mt-1">{template.description}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-4 mb-6 justify-center">
        <button
          onClick={showPolicySQL}
          className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
        >
          Show {policyTemplates[selectedPolicySet].name} SQL
        </button>
        
        <button
          onClick={testPolicies}
          disabled={loading}
          className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700 disabled:opacity-50"
        >
          {loading ? 'Testing...' : 'Test Current Policies'}
        </button>
      </div>

      {/* Results */}
      {result && (
        <div className="p-4 bg-gray-50 rounded-lg border">
          <h3 className="font-semibold mb-2">Result:</h3>
          <pre className="text-sm whitespace-pre-wrap overflow-auto max-h-96">
            {result}
          </pre>
        </div>
      )}

      {/* Instructions */}
      <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <h3 className="font-semibold text-yellow-800 mb-2">Security Setup Instructions:</h3>
        <ol className="text-yellow-700 text-sm space-y-1">
          <li>1. <strong>Choose Template</strong> - Select development or production policies</li>
          <li>2. <strong>Copy SQL</strong> - Click "Show SQL" and copy the policies</li>
          <li>3. <strong>Run in Supabase</strong> - Paste and execute in SQL Editor</li>
          <li>4. <strong>Test Policies</strong> - Verify policies work correctly</li>
        </ol>
        <div className="mt-3 text-yellow-700 text-sm">
          <strong>Recommendation:</strong> Start with Development policies for testing, then switch to Production for live use.
        </div>
      </div>
    </div>
  )
}

export default SecurityPoliciesSetup