-- =============================================
-- CONSOLIDATED CLEAN SUPABASE SCHEMA FOR SCHOOL PORTAL
-- NO HARDCODED DATA - COMPLETELY CUSTOMIZABLE
-- =============================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================
-- UTILITY FUNCTIONS
-- =============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- CORE TABLES
-- =============================================

-- Drop existing tables if they exist (for clean start)
DROP TABLE IF EXISTS public.assignment_submissions CASCADE;
DROP TABLE IF EXISTS public.assignments CASCADE;
DROP TABLE IF EXISTS public.attendance CASCADE;
DROP TABLE IF EXISTS public.timetables CASCADE;
DROP TABLE IF EXISTS public.grades CASCADE;
DROP TABLE IF EXISTS public.student_reports CASCADE;
DROP TABLE IF EXISTS public.student_results CASCADE;
DROP TABLE IF EXISTS public.student_documents CASCADE;
DROP TABLE IF EXISTS public.news_events CASCADE;
DROP TABLE IF EXISTS public.carousel_images CASCADE;
DROP TABLE IF EXISTS public.exam_results CASCADE;
DROP TABLE IF EXISTS public.exams CASCADE;
DROP TABLE IF EXISTS public.teacher_subjects CASCADE;
DROP TABLE IF EXISTS public.teacher_class_assignments CASCADE;
DROP TABLE IF EXISTS public.notifications CASCADE;
DROP TABLE IF EXISTS public.student_performance_cache CASCADE;
DROP TABLE IF EXISTS public.teachers CASCADE;
DROP TABLE IF EXISTS public.students CASCADE;
DROP TABLE IF EXISTS public.subjects CASCADE;
DROP TABLE IF EXISTS public.classes CASCADE;
DROP TABLE IF EXISTS public.user_profiles CASCADE;
DROP TABLE IF EXISTS public.audit_logs CASCADE;

-- User profiles table (main user data)
CREATE TABLE public.user_profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  role TEXT CHECK (role IN ('admin', 'teacher', 'student', 'super_admin')) DEFAULT 'student',

  -- Profile information
  phone_number TEXT,
  address TEXT,
  date_of_birth DATE,
  gender TEXT CHECK (gender IN ('male', 'female', 'other')),
  profile_image TEXT,
  profile_image_public_id TEXT,

  -- Student-specific fields
  admission_number TEXT UNIQUE,
  class_id UUID,
  admission_date DATE,
  guardian_name TEXT,
  guardian_phone TEXT,
  guardian_email TEXT,

  -- Teacher-specific fields
  employee_id TEXT UNIQUE,
  department TEXT,
  qualification TEXT,
  specialization TEXT,
  hire_date DATE,

  -- Status and permissions
  is_super_admin BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  status TEXT DEFAULT 'active',

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Classes table
CREATE TABLE public.classes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  level TEXT, -- e.g., "Primary", "Secondary", "Grade 1", etc.
  category TEXT, -- e.g., "Science", "Arts", etc.
  class_teacher_id UUID REFERENCES public.user_profiles(id),
  academic_year TEXT, -- Configurable, no default
  capacity INTEGER DEFAULT 30,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Subjects table
CREATE TABLE public.subjects (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT UNIQUE,
  description TEXT,
  department TEXT,
  credit_hours INTEGER DEFAULT 1,
  is_core BOOLEAN DEFAULT FALSE,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Teacher-Subject-Class assignments (many-to-many relationship)
CREATE TABLE public.teacher_assignments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  teacher_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE,
  class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE,
  academic_year TEXT,
  term INTEGER,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(teacher_id, subject_id, class_id, academic_year, term)
);

-- Exams table
CREATE TABLE public.exams (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  subject_id UUID REFERENCES public.subjects(id),
  class_id UUID REFERENCES public.classes(id),
  teacher_id UUID REFERENCES public.user_profiles(id),
  exam_date DATE,
  start_time TIME,
  duration_minutes INTEGER,
  total_marks DECIMAL(8,2) DEFAULT 100,
  exam_type TEXT, -- Configurable: test, midterm, final, quiz, etc.
  instructions TEXT,
  status TEXT DEFAULT 'scheduled',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Exam results table
CREATE TABLE public.exam_results (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  exam_id UUID REFERENCES public.exams(id) ON DELETE CASCADE,
  student_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  score DECIMAL(8,2),
  max_score DECIMAL(8,2),
  percentage DECIMAL(5,2),
  grade TEXT,
  remarks TEXT,
  is_published BOOLEAN DEFAULT FALSE,
  submitted_at TIMESTAMP WITH TIME ZONE,
  graded_at TIMESTAMP WITH TIME ZONE,
  graded_by UUID REFERENCES public.user_profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(exam_id, student_id)
);

-- Assignments table
CREATE TABLE public.assignments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  subject_id UUID REFERENCES public.subjects(id),
  class_id UUID REFERENCES public.classes(id),
  teacher_id UUID REFERENCES public.user_profiles(id),
  due_date TIMESTAMP WITH TIME ZONE,
  total_marks DECIMAL(8,2) DEFAULT 100,
  instructions TEXT,
  attachment_url TEXT,
  attachment_public_id TEXT,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Assignment submissions table
CREATE TABLE public.assignment_submissions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  assignment_id UUID REFERENCES public.assignments(id) ON DELETE CASCADE,
  student_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  submission_text TEXT,
  attachment_url TEXT,
  attachment_public_id TEXT,
  score DECIMAL(8,2),
  max_score DECIMAL(8,2),
  percentage DECIMAL(5,2),
  grade TEXT,
  feedback TEXT,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  graded_at TIMESTAMP WITH TIME ZONE,
  graded_by UUID REFERENCES public.user_profiles(id),
  status TEXT DEFAULT 'submitted',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(assignment_id, student_id)
);

-- Grades table (for overall subject grades)
CREATE TABLE public.grades (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  student_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES public.subjects(id),
  class_id UUID REFERENCES public.classes(id),
  teacher_id UUID REFERENCES public.user_profiles(id),
  academic_year TEXT,
  term INTEGER,

  -- Grade components (configurable weights)
  assignment_score DECIMAL(8,2) DEFAULT 0,
  assignment_weight DECIMAL(5,2) DEFAULT 30, -- percentage
  test_score DECIMAL(8,2) DEFAULT 0,
  test_weight DECIMAL(5,2) DEFAULT 30, -- percentage
  exam_score DECIMAL(8,2) DEFAULT 0,
  exam_weight DECIMAL(5,2) DEFAULT 40, -- percentage

  -- Calculated totals
  total_score DECIMAL(8,2),
  max_score DECIMAL(8,2) DEFAULT 100,
  percentage DECIMAL(5,2),
  letter_grade TEXT,
  gpa DECIMAL(3,2),

  -- Additional info
  remarks TEXT,
  is_published BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(student_id, subject_id, academic_year, term)
);

-- Attendance table
CREATE TABLE public.attendance (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  student_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  class_id UUID REFERENCES public.classes(id),
  subject_id UUID REFERENCES public.subjects(id),
  teacher_id UUID REFERENCES public.user_profiles(id),
  date DATE NOT NULL,
  period INTEGER, -- Class period number
  status TEXT CHECK (status IN ('present', 'absent', 'late', 'excused')) DEFAULT 'present',
  remarks TEXT,
  marked_by UUID REFERENCES public.user_profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(student_id, class_id, subject_id, date, period)
);

-- Timetables table
CREATE TABLE public.timetables (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  class_id UUID REFERENCES public.classes(id),
  subject_id UUID REFERENCES public.subjects(id),
  teacher_id UUID REFERENCES public.user_profiles(id),
  day_of_week INTEGER CHECK (day_of_week BETWEEN 1 AND 7), -- 1=Monday, 7=Sunday
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  room_number TEXT,
  academic_year TEXT,
  term INTEGER,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(class_id, day_of_week, start_time, academic_year, term)
);

-- Student reports table (for comprehensive reports)
CREATE TABLE public.student_reports (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  student_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  class_id UUID REFERENCES public.classes(id),
  academic_year TEXT,
  term INTEGER,

  -- Academic performance
  total_subjects INTEGER DEFAULT 0,
  subjects_passed INTEGER DEFAULT 0,
  overall_percentage DECIMAL(5,2),
  overall_grade TEXT,
  overall_gpa DECIMAL(3,2),
  class_rank INTEGER,
  total_students INTEGER,

  -- Attendance summary
  total_school_days INTEGER DEFAULT 0,
  days_present INTEGER DEFAULT 0,
  days_absent INTEGER DEFAULT 0,
  attendance_percentage DECIMAL(5,2),

  -- Comments and remarks
  teacher_comments TEXT,
  principal_comments TEXT,
  next_term_begins DATE,

  -- Status
  status TEXT DEFAULT 'draft', -- draft, submitted, approved, published
  generated_by UUID REFERENCES public.user_profiles(id),
  approved_by UUID REFERENCES public.user_profiles(id),

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(student_id, academic_year, term)
);

-- News and events table (using Supabase Storage)
CREATE TABLE public.news_events (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT,
  excerpt TEXT,
  type TEXT CHECK (type IN ('news', 'event', 'announcement', 'notice')) DEFAULT 'news',
  featured BOOLEAN DEFAULT FALSE,
  image_path TEXT, -- Supabase Storage path
  bucket_name TEXT DEFAULT 'news-images',
  author_id UUID REFERENCES public.user_profiles(id),
  event_date TIMESTAMP WITH TIME ZONE,
  event_location TEXT,
  registration_required BOOLEAN DEFAULT FALSE,
  registration_deadline TIMESTAMP WITH TIME ZONE,
  max_participants INTEGER,
  status TEXT DEFAULT 'published',
  views_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Carousel images table (using Supabase Storage)
CREATE TABLE public.carousel_images (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title TEXT,
  description TEXT,
  image_path TEXT NOT NULL, -- Supabase Storage path
  bucket_name TEXT DEFAULT 'carousel-images',
  link_url TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  display_order INTEGER DEFAULT 0,
  created_by UUID REFERENCES public.user_profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Notifications table
CREATE TABLE public.notifications (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  recipient_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES public.user_profiles(id),
  title TEXT,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'general',
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  status TEXT DEFAULT 'unread' CHECK (status IN ('unread', 'read', 'archived')),
  action_url TEXT,
  metadata JSONB DEFAULT '{}',
  read_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Student documents table (using Supabase Storage)
CREATE TABLE public.student_documents (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  student_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL, -- Supabase Storage path
  bucket_name TEXT DEFAULT 'student-documents',
  file_size BIGINT,
  mime_type TEXT,
  description TEXT,
  is_verified BOOLEAN DEFAULT FALSE,
  verified_by UUID REFERENCES public.user_profiles(id),
  verified_at TIMESTAMP WITH TIME ZONE,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Audit logs table
CREATE TABLE public.audit_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.user_profiles(id),
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  old_values JSONB,
  new_values JSONB,
  metadata JSONB DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  session_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

-- User profiles indexes
CREATE INDEX idx_user_profiles_role ON user_profiles(role);
CREATE INDEX idx_user_profiles_class_id ON user_profiles(class_id);
CREATE INDEX idx_user_profiles_admission_number ON user_profiles(admission_number);
CREATE INDEX idx_user_profiles_employee_id ON user_profiles(employee_id);
CREATE INDEX idx_user_profiles_email ON user_profiles(email);
CREATE INDEX idx_user_profiles_active ON user_profiles(is_active);

-- Classes indexes
CREATE INDEX idx_classes_teacher ON classes(class_teacher_id);
CREATE INDEX idx_classes_academic_year ON classes(academic_year);
CREATE INDEX idx_classes_status ON classes(status);

-- Teacher assignments indexes
CREATE INDEX idx_teacher_assignments_teacher ON teacher_assignments(teacher_id);
CREATE INDEX idx_teacher_assignments_subject ON teacher_assignments(subject_id);
CREATE INDEX idx_teacher_assignments_class ON teacher_assignments(class_id);
CREATE INDEX idx_teacher_assignments_active ON teacher_assignments(is_active);
CREATE INDEX idx_teacher_assignments_year_term ON teacher_assignments(academic_year, term);

-- Exam results indexes
CREATE INDEX idx_exam_results_student ON exam_results(student_id);
CREATE INDEX idx_exam_results_exam ON exam_results(exam_id);
CREATE INDEX idx_exam_results_published ON exam_results(is_published);

-- Grades indexes
CREATE INDEX idx_grades_student ON grades(student_id);
CREATE INDEX idx_grades_subject ON grades(subject_id);
CREATE INDEX idx_grades_class ON grades(class_id);
CREATE INDEX idx_grades_year_term ON grades(academic_year, term);
CREATE INDEX idx_grades_published ON grades(is_published);

-- Attendance indexes
CREATE INDEX idx_attendance_student ON attendance(student_id);
CREATE INDEX idx_attendance_class ON attendance(class_id);
CREATE INDEX idx_attendance_date ON attendance(date);
CREATE INDEX idx_attendance_student_date ON attendance(student_id, date);

-- Notifications indexes
CREATE INDEX idx_notifications_recipient ON notifications(recipient_id);
CREATE INDEX idx_notifications_status ON notifications(status);
CREATE INDEX idx_notifications_type ON notifications(type);
CREATE INDEX idx_notifications_created_at ON notifications(created_at);

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================

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

-- Basic RLS policies (can be customized based on specific needs)

-- User profiles policies
CREATE POLICY "Users can view their own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Authenticated users can view profiles" ON user_profiles
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- General authenticated access policies for other tables
CREATE POLICY "Authenticated access" ON classes FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated access" ON subjects FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated access" ON teacher_assignments FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated access" ON exams FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated access" ON exam_results FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated access" ON assignments FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated access" ON assignment_submissions FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated access" ON grades FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated access" ON attendance FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated access" ON timetables FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated access" ON student_reports FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated access" ON carousel_images FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated access" ON notifications FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated access" ON student_documents FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated access" ON audit_logs FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated insert" ON audit_logs FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Public access for published news/events
CREATE POLICY "Public can view published news" ON news_events
  FOR SELECT USING (status = 'published' OR auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can manage news" ON news_events
  FOR ALL USING (auth.uid() IS NOT NULL);

-- =============================================
-- TRIGGERS
-- =============================================

-- Add updated_at triggers for all tables
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_classes_updated_at BEFORE UPDATE ON classes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_subjects_updated_at BEFORE UPDATE ON subjects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_teacher_assignments_updated_at BEFORE UPDATE ON teacher_assignments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_exams_updated_at BEFORE UPDATE ON exams FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_exam_results_updated_at BEFORE UPDATE ON exam_results FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_assignments_updated_at BEFORE UPDATE ON assignments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_assignment_submissions_updated_at BEFORE UPDATE ON assignment_submissions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_grades_updated_at BEFORE UPDATE ON grades FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_attendance_updated_at BEFORE UPDATE ON attendance FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_timetables_updated_at BEFORE UPDATE ON timetables FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_student_reports_updated_at BEFORE UPDATE ON student_reports FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_news_events_updated_at BEFORE UPDATE ON news_events FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_carousel_images_updated_at BEFORE UPDATE ON carousel_images FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_student_documents_updated_at BEFORE UPDATE ON student_documents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- UTILITY FUNCTIONS
-- =============================================

-- Function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user registration
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to calculate grade from percentage (configurable)
CREATE OR REPLACE FUNCTION calculate_grade(percentage DECIMAL)
RETURNS TEXT AS $$
BEGIN
  CASE
    WHEN percentage >= 90 THEN RETURN 'A+';
    WHEN percentage >= 85 THEN RETURN 'A';
    WHEN percentage >= 80 THEN RETURN 'A-';
    WHEN percentage >= 75 THEN RETURN 'B+';
    WHEN percentage >= 70 THEN RETURN 'B';
    WHEN percentage >= 65 THEN RETURN 'B-';
    WHEN percentage >= 60 THEN RETURN 'C+';
    WHEN percentage >= 55 THEN RETURN 'C';
    WHEN percentage >= 50 THEN RETURN 'C-';
    WHEN percentage >= 45 THEN RETURN 'D+';
    WHEN percentage >= 40 THEN RETURN 'D';
    ELSE RETURN 'F';
  END CASE;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate GPA from percentage (configurable)
CREATE OR REPLACE FUNCTION calculate_gpa(percentage DECIMAL)
RETURNS DECIMAL AS $$
BEGIN
  CASE
    WHEN percentage >= 90 THEN RETURN 4.0;
    WHEN percentage >= 85 THEN RETURN 3.7;
    WHEN percentage >= 80 THEN RETURN 3.3;
    WHEN percentage >= 75 THEN RETURN 3.0;
    WHEN percentage >= 70 THEN RETURN 2.7;
    WHEN percentage >= 65 THEN RETURN 2.3;
    WHEN percentage >= 60 THEN RETURN 2.0;
    WHEN percentage >= 55 THEN RETURN 1.7;
    WHEN percentage >= 50 THEN RETURN 1.3;
    WHEN percentage >= 45 THEN RETURN 1.0;
    WHEN percentage >= 40 THEN RETURN 0.7;
    ELSE RETURN 0.0;
  END CASE;
END;
$$ LANGUAGE plpgsql;

-- Function to create admin user (for initial setup)
CREATE OR REPLACE FUNCTION create_admin_user(
  admin_email TEXT,
  admin_password TEXT,
  admin_name TEXT,
  is_super_admin BOOLEAN DEFAULT FALSE
)
RETURNS TABLE(
  success BOOLEAN,
  user_id UUID,
  message TEXT
) AS $$
DECLARE
  new_user_id UUID;
BEGIN
  -- Create user in auth.users (requires admin privileges)
  -- Note: This function should be called by a service role or admin

  -- For now, return instructions for manual creation
  RETURN QUERY SELECT
    FALSE as success,
    NULL::UUID as user_id,
    'Please create admin user manually through Supabase Auth dashboard or use supabase.auth.admin.createUser() in your application' as message;

EXCEPTION
  WHEN OTHERS THEN
    RETURN QUERY SELECT
      FALSE as success,
      NULL::UUID as user_id,
      SQLERRM as message;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to promote existing user to admin
CREATE OR REPLACE FUNCTION promote_user_to_admin(
  user_email TEXT,
  is_super_admin BOOLEAN DEFAULT FALSE
)
RETURNS TABLE(
  success BOOLEAN,
  message TEXT
) AS $$
DECLARE
  user_record RECORD;
BEGIN
  -- Find user by email
  SELECT * INTO user_record FROM user_profiles WHERE email = user_email;

  IF NOT FOUND THEN
    RETURN QUERY SELECT
      FALSE as success,
      'User not found with email: ' || user_email as message;
    RETURN;
  END IF;

  -- Update user role to admin
  UPDATE user_profiles
  SET
    role = CASE WHEN is_super_admin THEN 'super_admin' ELSE 'admin' END,
    is_super_admin = promote_user_to_admin.is_super_admin,
    updated_at = NOW()
  WHERE email = user_email;

  RETURN QUERY SELECT
    TRUE as success,
    'User ' || user_email || ' promoted to ' ||
    CASE WHEN is_super_admin THEN 'super admin' ELSE 'admin' END as message;

EXCEPTION
  WHEN OTHERS THEN
    RETURN QUERY SELECT
      FALSE as success,
      'Error promoting user: ' || SQLERRM as message;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get admin statistics
CREATE OR REPLACE FUNCTION get_admin_statistics()
RETURNS TABLE(
  total_admins BIGINT,
  super_admins BIGINT,
  regular_admins BIGINT,
  active_admins BIGINT,
  inactive_admins BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(CASE WHEN role IN ('admin', 'super_admin') THEN 1 END)::BIGINT as total_admins,
    COUNT(CASE WHEN role = 'super_admin' OR is_super_admin = true THEN 1 END)::BIGINT as super_admins,
    COUNT(CASE WHEN role = 'admin' AND (is_super_admin = false OR is_super_admin IS NULL) THEN 1 END)::BIGINT as regular_admins,
    COUNT(CASE WHEN role IN ('admin', 'super_admin') AND is_active = true THEN 1 END)::BIGINT as active_admins,
    COUNT(CASE WHEN role IN ('admin', 'super_admin') AND is_active = false THEN 1 END)::BIGINT as inactive_admins
  FROM user_profiles;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- GRANT PERMISSIONS
-- =============================================

GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;
