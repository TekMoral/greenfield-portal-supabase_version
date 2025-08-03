-- =============================================
-- SECURE ROW LEVEL SECURITY POLICIES - FINAL VERSION
-- PROPER SCHOOL MANAGEMENT ACCESS CONTROL
-- Updated: News is public, Super admin can do anything except self-deletion and log deletion
-- =============================================

-- Drop all existing policies first (comprehensive cleanup)
DROP POLICY IF EXISTS "Users can view their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON user_profiles;
DROP POLICY IF EXISTS "Students view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Teachers view profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins view profiles" ON user_profiles;
DROP POLICY IF EXISTS "Super admins view all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Profile updates" ON user_profiles;
DROP POLICY IF EXISTS "Super admin full access" ON user_profiles;
DROP POLICY IF EXISTS "Only super admins update profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins update teacher profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins create students only" ON user_profiles;
DROP POLICY IF EXISTS "Super admins create any user" ON user_profiles;
DROP POLICY IF EXISTS "Super admins delete users" ON user_profiles;

DROP POLICY IF EXISTS "Authenticated access" ON classes;
DROP POLICY IF EXISTS "View classes" ON classes;
DROP POLICY IF EXISTS "Admins manage classes" ON classes;
DROP POLICY IF EXISTS "Super admin manage classes" ON classes;

DROP POLICY IF EXISTS "Authenticated access" ON subjects;
DROP POLICY IF EXISTS "View subjects" ON subjects;
DROP POLICY IF EXISTS "Admins manage subjects" ON subjects;
DROP POLICY IF EXISTS "Super admin manage subjects" ON subjects;

DROP POLICY IF EXISTS "Authenticated access" ON teacher_assignments;
DROP POLICY IF EXISTS "View teacher assignments" ON teacher_assignments;
DROP POLICY IF EXISTS "Admins manage teacher assignments" ON teacher_assignments;
DROP POLICY IF EXISTS "Super admin manage teacher assignments" ON teacher_assignments;

DROP POLICY IF EXISTS "Authenticated access" ON exams;
DROP POLICY IF EXISTS "Students view exams" ON exams;
DROP POLICY IF EXISTS "Teachers view exams" ON exams;
DROP POLICY IF EXISTS "Admins view exams" ON exams;
DROP POLICY IF EXISTS "Teachers create exams" ON exams;
DROP POLICY IF EXISTS "Teachers update own exams" ON exams;
DROP POLICY IF EXISTS "Super admins delete exams" ON exams;
DROP POLICY IF EXISTS "Super admin manage exams" ON exams;

DROP POLICY IF EXISTS "Authenticated access" ON exam_results;
DROP POLICY IF EXISTS "Students view own results" ON exam_results;
DROP POLICY IF EXISTS "Teachers view exam results" ON exam_results;
DROP POLICY IF EXISTS "Admins view all results" ON exam_results;
DROP POLICY IF EXISTS "Manage exam results" ON exam_results;
DROP POLICY IF EXISTS "Teachers manage results" ON exam_results;
DROP POLICY IF EXISTS "Admins manage all results" ON exam_results;
DROP POLICY IF EXISTS "Admins publish results" ON exam_results;
DROP POLICY IF EXISTS "Super admin manage exam results" ON exam_results;

DROP POLICY IF EXISTS "Authenticated access" ON assignments;
DROP POLICY IF EXISTS "Students view assignments" ON assignments;
DROP POLICY IF EXISTS "Teachers view assignments" ON assignments;
DROP POLICY IF EXISTS "Admins view assignments" ON assignments;
DROP POLICY IF EXISTS "Teachers create assignments" ON assignments;
DROP POLICY IF EXISTS "Teachers update own assignments" ON assignments;
DROP POLICY IF EXISTS "Super admins delete assignments" ON assignments;
DROP POLICY IF EXISTS "Super admin manage assignments" ON assignments;

DROP POLICY IF EXISTS "Authenticated access" ON assignment_submissions;
DROP POLICY IF EXISTS "Students view own submissions" ON assignment_submissions;
DROP POLICY IF EXISTS "Teachers view submissions" ON assignment_submissions;
DROP POLICY IF EXISTS "Admins view submissions" ON assignment_submissions;
DROP POLICY IF EXISTS "Students submit assignments" ON assignment_submissions;
DROP POLICY IF EXISTS "Students update ungraded submissions" ON assignment_submissions;
DROP POLICY IF EXISTS "Teachers grade submissions" ON assignment_submissions;
DROP POLICY IF EXISTS "Super admin manage assignment submissions" ON assignment_submissions;

DROP POLICY IF EXISTS "Authenticated access" ON grades;
DROP POLICY IF EXISTS "Students view own grades" ON grades;
DROP POLICY IF EXISTS "Teachers view grades" ON grades;
DROP POLICY IF EXISTS "Admins view all grades" ON grades;
DROP POLICY IF EXISTS "Teachers manage grades" ON grades;
DROP POLICY IF EXISTS "Admins publish grades" ON grades;
DROP POLICY IF EXISTS "Super admin manage grades" ON grades;

DROP POLICY IF EXISTS "Authenticated access" ON attendance;
DROP POLICY IF EXISTS "Students view own attendance" ON attendance;
DROP POLICY IF EXISTS "Teachers manage attendance" ON attendance;
DROP POLICY IF EXISTS "Admins view attendance" ON attendance;
DROP POLICY IF EXISTS "Super admin manage attendance" ON attendance;

DROP POLICY IF EXISTS "Authenticated access" ON timetables;
DROP POLICY IF EXISTS "View timetables" ON timetables;
DROP POLICY IF EXISTS "Admins manage timetables" ON timetables;
DROP POLICY IF EXISTS "Super admin manage timetables" ON timetables;

DROP POLICY IF EXISTS "Authenticated access" ON student_reports;
DROP POLICY IF EXISTS "Students view own reports" ON student_reports;
DROP POLICY IF EXISTS "Teachers view student reports" ON student_reports;
DROP POLICY IF EXISTS "Admins manage reports" ON student_reports;
DROP POLICY IF EXISTS "Super admin manage student reports" ON student_reports;

DROP POLICY IF EXISTS "Public can view published news" ON news_events;
DROP POLICY IF EXISTS "Authenticated can manage news" ON news_events;
DROP POLICY IF EXISTS "Public view published news" ON news_events;
DROP POLICY IF EXISTS "Authenticated view news" ON news_events;
DROP POLICY IF EXISTS "Authenticated view all news" ON news_events;
DROP POLICY IF EXISTS "Admins manage news" ON news_events;
DROP POLICY IF EXISTS "Super admin manage news" ON news_events;

DROP POLICY IF EXISTS "Authenticated access" ON carousel_images;
DROP POLICY IF EXISTS "Public view carousel" ON carousel_images;
DROP POLICY IF EXISTS "Admins manage carousel" ON carousel_images;
DROP POLICY IF EXISTS "Super admin manage carousel" ON carousel_images;

DROP POLICY IF EXISTS "Authenticated access" ON notifications;
DROP POLICY IF EXISTS "View own notifications" ON notifications;
DROP POLICY IF EXISTS "Update own notifications" ON notifications;
DROP POLICY IF EXISTS "Send notifications" ON notifications;
DROP POLICY IF EXISTS "Super admins delete notifications" ON notifications;
DROP POLICY IF EXISTS "Super admin manage notifications" ON notifications;

DROP POLICY IF EXISTS "Authenticated access" ON student_documents;
DROP POLICY IF EXISTS "Students view own documents" ON student_documents;
DROP POLICY IF EXISTS "Teachers view student documents" ON student_documents;
DROP POLICY IF EXISTS "Admins view student documents" ON student_documents;
DROP POLICY IF EXISTS "Admins manage student documents" ON student_documents;
DROP POLICY IF EXISTS "Super admin manage student documents" ON student_documents;

DROP POLICY IF EXISTS "Authenticated access" ON audit_logs;
DROP POLICY IF EXISTS "Authenticated insert" ON audit_logs;
DROP POLICY IF EXISTS "Super admins view audit logs" ON audit_logs;
DROP POLICY IF EXISTS "System insert audit logs" ON audit_logs;

-- =============================================
-- HELPER FUNCTIONS FOR ROLE CHECKING
-- =============================================

-- Function to check if user has specific role
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

-- Function to check if user is admin or super_admin
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

-- Function to check if user is super_admin
CREATE OR REPLACE FUNCTION user_is_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid()
    AND (role = 'super_admin' OR is_super_admin = true)
    AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if teacher teaches specific subject/class
CREATE OR REPLACE FUNCTION teacher_teaches_subject_class(subject_uuid UUID, class_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM teacher_assignments
    WHERE teacher_id = auth.uid()
    AND subject_id = subject_uuid
    AND class_id = class_uuid
    AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- USER PROFILES POLICIES
-- =============================================

-- Students can only view their own profile
CREATE POLICY "Students view own profile" ON user_profiles
  FOR SELECT USING (
    auth.uid() = id AND user_has_role('student')
  );

-- Teachers can view their own profile and their students' profiles
CREATE POLICY "Teachers view profiles" ON user_profiles
  FOR SELECT USING (
    auth.uid() = id OR
    (user_has_role('teacher') AND role = 'student' AND class_id IN (
      SELECT DISTINCT class_id FROM teacher_assignments WHERE teacher_id = auth.uid()
    ))
  );

-- Admins can view all profiles except super_admin profiles
CREATE POLICY "Admins view profiles" ON user_profiles
  FOR SELECT USING (
    user_has_role('admin') AND role != 'super_admin'
  );

-- Super admins can view all profiles
CREATE POLICY "Super admins view all profiles" ON user_profiles
  FOR SELECT USING (user_is_super_admin());

-- Super admins can do anything except delete themselves
CREATE POLICY "Super admin full access" ON user_profiles
  FOR ALL USING (
    user_is_super_admin() AND
    (auth.uid() != id OR current_setting('request.method', true) != 'DELETE')
  );

-- Admins can update teacher profiles (for deactivation) but not admin/super_admin profiles
CREATE POLICY "Admins update teacher profiles" ON user_profiles
  FOR UPDATE USING (
    user_has_role('admin') AND
    role = 'teacher' AND
    auth.uid() != id
  );

-- Admins can only create students (not teachers or admins)
CREATE POLICY "Admins create students only" ON user_profiles
  FOR INSERT WITH CHECK (
    user_has_role('admin') AND
    role = 'student' AND
    auth.uid() != id
  );

-- =============================================
-- CLASSES POLICIES
-- =============================================

-- Everyone can view classes
CREATE POLICY "View classes" ON classes
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Admins can manage classes
CREATE POLICY "Admins manage classes" ON classes
  FOR ALL USING (user_has_role('admin'));

-- Super admins can do anything with classes
CREATE POLICY "Super admin manage classes" ON classes
  FOR ALL USING (user_is_super_admin());

-- =============================================
-- SUBJECTS POLICIES
-- =============================================

-- Everyone can view subjects
CREATE POLICY "View subjects" ON subjects
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Admins can manage subjects
CREATE POLICY "Admins manage subjects" ON subjects
  FOR ALL USING (user_has_role('admin'));

-- Super admins can do anything with subjects
CREATE POLICY "Super admin manage subjects" ON subjects
  FOR ALL USING (user_is_super_admin());

-- =============================================
-- TEACHER ASSIGNMENTS POLICIES
-- =============================================

-- Teachers can view their own assignments, admins can view all
CREATE POLICY "View teacher assignments" ON teacher_assignments
  FOR SELECT USING (
    teacher_id = auth.uid() OR user_is_admin()
  );

-- Admins can manage teacher assignments
CREATE POLICY "Admins manage teacher assignments" ON teacher_assignments
  FOR ALL USING (user_has_role('admin'));

-- Super admins can do anything with teacher assignments
CREATE POLICY "Super admin manage teacher assignments" ON teacher_assignments
  FOR ALL USING (user_is_super_admin());

-- =============================================
-- EXAMS POLICIES
-- =============================================

-- Students can view exams for their classes
CREATE POLICY "Students view exams" ON exams
  FOR SELECT USING (
    user_has_role('student') AND class_id IN (
      SELECT class_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- Teachers can view exams for subjects/classes they teach
CREATE POLICY "Teachers view exams" ON exams
  FOR SELECT USING (
    user_has_role('teacher') AND (
      teacher_id = auth.uid() OR
      teacher_teaches_subject_class(subject_id, class_id)
    )
  );

-- Admins can view all exams
CREATE POLICY "Admins view exams" ON exams
  FOR SELECT USING (user_has_role('admin'));

-- Teachers can create exams for subjects they teach
CREATE POLICY "Teachers create exams" ON exams
  FOR INSERT WITH CHECK (
    user_has_role('teacher') AND
    teacher_teaches_subject_class(subject_id, class_id)
  );

-- Teachers can update their own exams
CREATE POLICY "Teachers update own exams" ON exams
  FOR UPDATE USING (
    user_has_role('teacher') AND teacher_id = auth.uid()
  );

-- Super admins can do anything with exams
CREATE POLICY "Super admin manage exams" ON exams
  FOR ALL USING (user_is_super_admin());

-- =============================================
-- EXAM RESULTS POLICIES
-- =============================================

-- Students can view their own published results
CREATE POLICY "Students view own results" ON exam_results
  FOR SELECT USING (
    user_has_role('student') AND
    student_id = auth.uid() AND
    is_published = true
  );

-- Teachers can view results for exams they created
CREATE POLICY "Teachers view exam results" ON exam_results
  FOR SELECT USING (
    user_has_role('teacher') AND exam_id IN (
      SELECT id FROM exams WHERE teacher_id = auth.uid()
    )
  );

-- Admins can view all results
CREATE POLICY "Admins view all results" ON exam_results
  FOR SELECT USING (user_has_role('admin'));

-- Teachers can manage results for their exams
CREATE POLICY "Teachers manage results" ON exam_results
  FOR ALL USING (
    user_has_role('teacher') AND exam_id IN (
      SELECT id FROM exams WHERE teacher_id = auth.uid()
    )
  );

-- Admins can manage all exam results
CREATE POLICY "Admins manage all results" ON exam_results
  FOR ALL USING (user_has_role('admin'));

-- Super admins can do anything with exam results
CREATE POLICY "Super admin manage exam results" ON exam_results
  FOR ALL USING (user_is_super_admin());

-- =============================================
-- ASSIGNMENTS POLICIES
-- =============================================

-- Students can view assignments for their classes
CREATE POLICY "Students view assignments" ON assignments
  FOR SELECT USING (
    user_has_role('student') AND class_id IN (
      SELECT class_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- Teachers can view assignments for subjects/classes they teach
CREATE POLICY "Teachers view assignments" ON assignments
  FOR SELECT USING (
    user_has_role('teacher') AND (
      teacher_id = auth.uid() OR
      teacher_teaches_subject_class(subject_id, class_id)
    )
  );

-- Admins can view all assignments
CREATE POLICY "Admins view assignments" ON assignments
  FOR SELECT USING (user_has_role('admin'));

-- Teachers can create assignments for subjects they teach
CREATE POLICY "Teachers create assignments" ON assignments
  FOR INSERT WITH CHECK (
    user_has_role('teacher') AND
    teacher_teaches_subject_class(subject_id, class_id)
  );

-- Teachers can update their own assignments
CREATE POLICY "Teachers update own assignments" ON assignments
  FOR UPDATE USING (
    user_has_role('teacher') AND teacher_id = auth.uid()
  );

-- Super admins can do anything with assignments
CREATE POLICY "Super admin manage assignments" ON assignments
  FOR ALL USING (user_is_super_admin());

-- =============================================
-- ASSIGNMENT SUBMISSIONS POLICIES
-- =============================================

-- Students can view their own submissions
CREATE POLICY "Students view own submissions" ON assignment_submissions
  FOR SELECT USING (
    user_has_role('student') AND student_id = auth.uid()
  );

-- Teachers can view submissions for their assignments
CREATE POLICY "Teachers view submissions" ON assignment_submissions
  FOR SELECT USING (
    user_has_role('teacher') AND assignment_id IN (
      SELECT id FROM assignments WHERE teacher_id = auth.uid()
    )
  );

-- Admins can view all submissions
CREATE POLICY "Admins view submissions" ON assignment_submissions
  FOR SELECT USING (user_has_role('admin'));

-- Students can submit assignments
CREATE POLICY "Students submit assignments" ON assignment_submissions
  FOR INSERT WITH CHECK (
    user_has_role('student') AND
    student_id = auth.uid() AND
    assignment_id IN (
      SELECT id FROM assignments WHERE class_id IN (
        SELECT class_id FROM user_profiles WHERE id = auth.uid()
      )
    )
  );

-- Teachers can grade submissions for their assignments
CREATE POLICY "Teachers grade submissions" ON assignment_submissions
  FOR UPDATE USING (
    user_has_role('teacher') AND assignment_id IN (
      SELECT id FROM assignments WHERE teacher_id = auth.uid()
    )
  );

-- Super admins can do anything with assignment submissions
CREATE POLICY "Super admin manage assignment submissions" ON assignment_submissions
  FOR ALL USING (user_is_super_admin());

-- =============================================
-- GRADES POLICIES
-- =============================================

-- Students can view their own published grades
CREATE POLICY "Students view own grades" ON grades
  FOR SELECT USING (
    user_has_role('student') AND
    student_id = auth.uid() AND
    is_published = true
  );

-- Teachers can view grades for subjects they teach
CREATE POLICY "Teachers view grades" ON grades
  FOR SELECT USING (
    user_has_role('teacher') AND
    teacher_teaches_subject_class(subject_id, class_id)
  );

-- Admins can view all grades
CREATE POLICY "Admins view all grades" ON grades
  FOR SELECT USING (user_has_role('admin'));

-- Teachers can manage grades for subjects they teach
CREATE POLICY "Teachers manage grades" ON grades
  FOR ALL USING (
    user_has_role('teacher') AND
    teacher_teaches_subject_class(subject_id, class_id)
  );

-- Admins can manage grades
CREATE POLICY "Admins manage grades" ON grades
  FOR ALL USING (user_has_role('admin'));

-- Super admins can do anything with grades
CREATE POLICY "Super admin manage grades" ON grades
  FOR ALL USING (user_is_super_admin());

-- =============================================
-- ATTENDANCE POLICIES
-- =============================================

-- Students can view their own attendance
CREATE POLICY "Students view own attendance" ON attendance
  FOR SELECT USING (
    user_has_role('student') AND student_id = auth.uid()
  );

-- Teachers can manage attendance for their classes
CREATE POLICY "Teachers manage attendance" ON attendance
  FOR ALL USING (
    user_has_role('teacher') AND
    teacher_teaches_subject_class(subject_id, class_id)
  );

-- Admins can view all attendance
CREATE POLICY "Admins view attendance" ON attendance
  FOR SELECT USING (user_has_role('admin'));

-- Super admins can do anything with attendance
CREATE POLICY "Super admin manage attendance" ON attendance
  FOR ALL USING (user_is_super_admin());

-- =============================================
-- TIMETABLES POLICIES
-- =============================================

-- Everyone can view timetables
CREATE POLICY "View timetables" ON timetables
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Admins can manage timetables
CREATE POLICY "Admins manage timetables" ON timetables
  FOR ALL USING (user_has_role('admin'));

-- Super admins can do anything with timetables
CREATE POLICY "Super admin manage timetables" ON timetables
  FOR ALL USING (user_is_super_admin());

-- =============================================
-- STUDENT REPORTS POLICIES
-- =============================================

-- Teachers can view reports for their students
CREATE POLICY "Teachers view student reports" ON student_reports
  FOR SELECT USING (
    user_has_role('teacher') AND class_id IN (
      SELECT DISTINCT class_id FROM teacher_assignments WHERE teacher_id = auth.uid()
    )
  );

-- Admins can manage all reports
CREATE POLICY "Admins manage reports" ON student_reports
  FOR ALL USING (user_has_role('admin'));

-- Super admins can do anything with student reports
CREATE POLICY "Super admin manage student reports" ON student_reports
  FOR ALL USING (user_is_super_admin());

-- =============================================
-- NEWS AND EVENTS POLICIES (PUBLIC ACCESS)
-- =============================================

-- EVERYONE (including unauthenticated users) can view published news/events
CREATE POLICY "Public view published news" ON news_events
  FOR SELECT USING (status = 'published');

-- Authenticated users can view all news (including drafts)
CREATE POLICY "Authenticated view all news" ON news_events
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Admins can manage news/events
CREATE POLICY "Admins manage news" ON news_events
  FOR ALL USING (user_has_role('admin'));

-- Super admins can do anything with news
CREATE POLICY "Super admin manage news" ON news_events
  FOR ALL USING (user_is_super_admin());

-- =============================================
-- CAROUSEL IMAGES POLICIES (PUBLIC ACCESS)
-- =============================================

-- Everyone can view active carousel images
CREATE POLICY "Public view carousel" ON carousel_images
  FOR SELECT USING (is_active = true);

-- Admins can manage carousel images
CREATE POLICY "Admins manage carousel" ON carousel_images
  FOR ALL USING (user_has_role('admin'));

-- Super admins can do anything with carousel images
CREATE POLICY "Super admin manage carousel" ON carousel_images
  FOR ALL USING (user_is_super_admin());

-- =============================================
-- NOTIFICATIONS POLICIES
-- =============================================

-- Users can view their own notifications
CREATE POLICY "View own notifications" ON notifications
  FOR SELECT USING (recipient_id = auth.uid());

-- Users can update their own notifications (mark as read)
CREATE POLICY "Update own notifications" ON notifications
  FOR UPDATE USING (recipient_id = auth.uid());

-- Admins and teachers can send notifications (with restrictions for teachers)
CREATE POLICY "Send notifications" ON notifications
  FOR INSERT WITH CHECK (
    sender_id = auth.uid() AND
    (
      -- Admins and super admins can send to anyone
      user_has_role('admin') OR user_has_role('super_admin') OR
      -- Teachers can only send to their students and admins
      (
        user_has_role('teacher') AND
        recipient_id IN (
          -- Their students
          SELECT id FROM user_profiles
          WHERE role = 'student'
          AND class_id IN (
            SELECT DISTINCT class_id FROM teacher_assignments
            WHERE teacher_id = auth.uid() AND is_active = true
          )
          UNION
          -- Any admin or super admin
          SELECT id FROM user_profiles
          WHERE role IN ('admin') AND is_active = true
        )
      )
    )
  );

-- Super admins can do anything with notifications
CREATE POLICY "Super admin manage notifications" ON notifications
  FOR ALL USING (user_is_super_admin());

-- =============================================
-- STUDENT DOCUMENTS POLICIES
-- =============================================

-- Students can view their own documents
CREATE POLICY "Students view own documents" ON student_documents
  FOR SELECT USING (
    user_has_role('student') AND student_id = auth.uid()
  );

-- Teachers can view documents of their students
CREATE POLICY "Teachers view student documents" ON student_documents
  FOR SELECT USING (
    user_has_role('teacher') AND student_id IN (
      SELECT id FROM user_profiles
      WHERE role = 'student'
      AND class_id IN (
        SELECT DISTINCT class_id FROM teacher_assignments WHERE teacher_id = auth.uid()
      )
    )
  );

-- Admins can view all student documents
CREATE POLICY "Admins view student documents" ON student_documents
  FOR SELECT USING (user_has_role('admin'));

-- Admins can manage student documents
CREATE POLICY "Admins manage student documents" ON student_documents
  FOR ALL USING (user_has_role('admin'));

-- Super admins can do anything with student documents
CREATE POLICY "Super admin manage student documents" ON student_documents
  FOR ALL USING (user_is_super_admin());

-- =============================================
-- AUDIT LOGS POLICIES (RESTRICTED)
-- =============================================

-- ONLY super admins can view audit logs
CREATE POLICY "Super admins view audit logs" ON audit_logs
  FOR SELECT USING (user_is_super_admin());

-- System can insert audit logs (for triggers)
CREATE POLICY "System insert audit logs" ON audit_logs
  FOR INSERT WITH CHECK (true);

-- NO ONE can delete audit logs (not even super admins)
-- This ensures audit trail integrity
