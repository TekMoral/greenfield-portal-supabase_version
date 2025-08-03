// src/components/debug/Step5SecuritySetup.jsx
import React, { useState } from 'react'
import { supabase } from '../../lib/supabaseClient'

const Step5SecuritySetup = () => {
  const [result, setResult] = useState('')
  const [loading, setLoading] = useState(false)
  const [selectedMode, setSelectedMode] = useState('development')

  const securityModes = {
    development: {
      name: 'Development Mode',
      description: 'Permissive policies for testing and development',
      color: 'orange',
      sql: `-- DEVELOPMENT SECURITY POLICIES
-- Permissive policies for testing - DO NOT USE IN PRODUCTION

-- Disable RLS on main tables for development
ALTER TABLE public.user_profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.exams DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_results DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.grades DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.news_events DISABLE ROW LEVEL SECURITY;

-- Keep storage working
-- (Storage policies already configured in Step 4)

-- Verify RLS is disabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('user_profiles', 'classes', 'subjects', 'exams')
ORDER BY tablename;`
    },
    production: {
      name: 'Production Mode',
      description: 'Secure role-based policies for live deployment',
      color: 'green',
      sql: `-- PRODUCTION SECURITY POLICIES
-- Secure role-based access control

-- Enable RLS on all tables
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.news_events ENABLE ROW LEVEL SECURITY;

-- Helper function for role checking
CREATE OR REPLACE FUNCTION user_has_role(required_role TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid()
    AND role = required_role
    AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function for admin check
CREATE OR REPLACE FUNCTION user_is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'super_admin')
    AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- USER PROFILES POLICIES
CREATE POLICY "Users can view own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" ON user_profiles
  FOR SELECT USING (user_is_admin());

CREATE POLICY "Admins can manage profiles" ON user_profiles
  FOR ALL USING (user_is_admin());

-- CLASSES POLICIES
CREATE POLICY "Everyone can view classes" ON classes
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage classes" ON classes
  FOR ALL USING (user_is_admin());

-- SUBJECTS POLICIES
CREATE POLICY "Everyone can view subjects" ON subjects
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage subjects" ON subjects
  FOR ALL USING (user_is_admin());

-- EXAMS POLICIES
CREATE POLICY "Students can view own exams" ON exams
  FOR SELECT USING (
    user_has_role('student') AND class_id IN (
      SELECT class_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Teachers can manage own exams" ON exams
  FOR ALL USING (
    user_has_role('teacher') AND teacher_id = auth.uid()
  );

CREATE POLICY "Admins can manage all exams" ON exams
  FOR ALL USING (user_is_admin());

-- NEWS POLICIES
CREATE POLICY "Public can view published news" ON news_events
  FOR SELECT USING (status = 'published');

CREATE POLICY "Admins can manage news" ON news_events
  FOR ALL USING (user_is_admin());

-- Verify policies were created
SELECT schemaname, tablename, policyname, cmd 
FROM pg_policies 
WHERE schemaname = 'public' 
ORDER BY tablename, policyname;`
    },
    hybrid: {
      name: 'Hybrid Mode',
      description: 'Secure for critical data, permissive for development features',
      color: 'blue',
      sql: `-- HYBRID SECURITY POLICIES
-- Secure for user data, permissive for development

-- Enable RLS on critical tables only
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grades ENABLE ROW LEVEL SECURITY;

-- Keep development tables permissive
ALTER TABLE public.classes DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.exams DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.news_events DISABLE ROW LEVEL SECURITY;

-- Helper functions
CREATE OR REPLACE FUNCTION user_is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'super_admin')
    AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Secure policies for critical tables
CREATE POLICY "Users can view own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = id OR user_is_admin());

CREATE POLICY "Admins can manage profiles" ON user_profiles
  FOR ALL USING (user_is_admin());

CREATE POLICY "Students can view own results" ON exam_results
  FOR SELECT USING (
    student_id = auth.uid() AND is_published = true
  );

CREATE POLICY "Admins can manage results" ON exam_results
  FOR ALL USING (user_is_admin());

-- Verify hybrid setup
SELECT 
  tablename,
  rowsecurity,
  COUNT(policyname) as policy_count
FROM pg_tables t
LEFT JOIN pg_policies p ON t.tablename = p.tablename AND t.schemaname = p.schemaname
WHERE t.schemaname = 'public' 
AND t.tablename IN ('user_profiles', 'classes', 'subjects', 'exams', 'exam_results')
GROUP BY tablename, rowsecurity
ORDER BY tablename;`
    }
  }

  const testCurrentPolicies = async () => {
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
      
      // Test 4: Can read news
      const { data: news, error: newsError } = await supabase
        .from('news_events')
        .select('*')
        .limit(1)
      
      tests.push({
        test: 'Read news_events',
        success: !newsError,
        error: newsError?.message
      })
      
      const results = tests.map(test => 
        `${test.success ? '✅' : '❌'} ${test.test}: ${test.success ? 'PASS' : test.error}`
      ).join('\n')
      
      const passCount = tests.filter(t => t.success).length
      const totalCount = tests.length
      
      setResult(`Security Policy Tests (${passCount}/${totalCount} passed):

${results}

${passCount === totalCount ? '🎉 All tests passed!' : '⚠️ Some tests failed - may need policy adjustments'}`)
      
    } catch (error) {
      setResult(`❌ Test failed: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const showSelectedSQL = () => {
    const mode = securityModes[selectedMode]
    setResult(`${mode.name}
${mode.description}

${mode.sql}`)
  }

  const getColorClasses = (mode) => {
    const colors = {
      orange: 'border-orange-500 bg-orange-50 text-orange-800',
      green: 'border-green-500 bg-green-50 text-green-800',
      blue: 'border-blue-500 bg-blue-50 text-blue-800'
    }
    return colors[securityModes[mode].color] || colors.blue
  }

  return (
    <div className="p-6 bg-white rounded-lg shadow-md max-w-6xl mx-auto mt-8">
      <h2 className="text-2xl font-bold mb-6 text-center">🔒 Step 5: Security Policies Setup</h2>
      <p className="text-center text-gray-600 mb-8">Configure Row Level Security (RLS) for your application</p>

      {/* Security Mode Selection */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold mb-4">Choose Security Mode:</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Object.entries(securityModes).map(([key, mode]) => (
            <div
              key={key}
              className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                selectedMode === key 
                  ? getColorClasses(key)
                  : 'border-gray-200 bg-gray-50 hover:border-gray-300'
              }`}
              onClick={() => setSelectedMode(key)}
            >
              <div className="font-semibold">{mode.name}</div>
              <div className="text-sm mt-1 opacity-80">{mode.description}</div>
              {selectedMode === key && (
                <div className="mt-2 text-xs font-medium">✓ Selected</div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-4 mb-6 justify-center">
        <button
          onClick={showSelectedSQL}
          className={`px-6 py-2 rounded font-medium text-white ${
            selectedMode === 'development' ? 'bg-orange-600 hover:bg-orange-700' :
            selectedMode === 'production' ? 'bg-green-600 hover:bg-green-700' :
            'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          Show {securityModes[selectedMode].name} SQL
        </button>
        
        <button
          onClick={testCurrentPolicies}
          disabled={loading}
          className="bg-purple-600 text-white px-6 py-2 rounded hover:bg-purple-700 disabled:opacity-50"
        >
          {loading ? 'Testing...' : 'Test Current Policies'}
        </button>
      </div>

      {/* Results */}
      {result && (
        <div className="p-4 bg-gray-50 rounded-lg border">
          <h3 className="font-semibold mb-2">Result:</h3>
          <pre className="text-sm whitespace-pre-wrap overflow-auto max-h-96 bg-gray-900 text-green-400 p-4 rounded">
            {result}
          </pre>
        </div>
      )}

      {/* Recommendations */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
          <h4 className="font-semibold text-orange-800 mb-2">🧪 Development Mode</h4>
          <div className="text-orange-700 text-sm space-y-1">
            <div>• <strong>Best for:</strong> Testing, development</div>
            <div>• <strong>Security:</strong> Minimal (permissive)</div>
            <div>• <strong>Access:</strong> All data accessible</div>
            <div>• <strong>Use when:</strong> Building features</div>
          </div>
        </div>

        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h4 className="font-semibold text-blue-800 mb-2">⚖️ Hybrid Mode</h4>
          <div className="text-blue-700 text-sm space-y-1">
            <div>• <strong>Best for:</strong> Staging, pre-production</div>
            <div>• <strong>Security:</strong> Balanced</div>
            <div>• <strong>Access:</strong> Secure user data, open features</div>
            <div>• <strong>Use when:</strong> Testing with real data</div>
          </div>
        </div>

        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <h4 className="font-semibold text-green-800 mb-2">🔒 Production Mode</h4>
          <div className="text-green-700 text-sm space-y-1">
            <div>• <strong>Best for:</strong> Live deployment</div>
            <div>• <strong>Security:</strong> Maximum (role-based)</div>
            <div>• <strong>Access:</strong> Strict role enforcement</div>
            <div>• <strong>Use when:</strong> Going live</div>
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="font-semibold text-blue-800 mb-2">📋 Setup Instructions:</h3>
        <ol className="text-blue-700 text-sm space-y-1">
          <li>1. <strong>Choose Mode:</strong> Select security level above</li>
          <li>2. <strong>Get SQL:</strong> Click "Show [Mode] SQL" to see the policies</li>
          <li>3. <strong>Run SQL:</strong> Copy and execute in Supabase Dashboard → SQL Editor</li>
          <li>4. <strong>Test:</strong> Click "Test Current Policies" to verify</li>
          <li>5. <strong>Proceed:</strong> Move to Step 6 (Final Testing)</li>
        </ol>
      </div>

      {/* Current Recommendation */}
      <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <h3 className="font-semibold text-yellow-800 mb-2">💡 Recommendation:</h3>
        <div className="text-yellow-700 text-sm">
          <strong>Start with Development Mode</strong> to ensure everything works, then upgrade to Production Mode when ready to go live. 
          You can always change security modes later by running different SQL scripts.
        </div>
      </div>
    </div>
  )
}

export default Step5SecuritySetup