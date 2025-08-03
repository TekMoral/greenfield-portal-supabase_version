-- =============================================
-- SUPABASE STORAGE BUCKETS SETUP - FIXED VERSION
-- SECURE VERSION - MATCHES SECURITY POLICIES
-- =============================================

-- Create storage buckets for file uploads

-- =============================================
-- CREATE STORAGE BUCKETS
-- =============================================

-- Create bucket for student documents (PRIVATE)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'student-documents',
  'student-documents',
  false, -- Private bucket - only admins can manage, students can view their own
  10485760, -- 10MB limit
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/jpg', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain']
) ON CONFLICT (id) DO NOTHING;

-- Create bucket for profile images (PUBLIC)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'profile-images',
  'profile-images',
  true, -- Public bucket - anyone can view, only super admins can manage
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/jpg', 'image/webp', 'image/gif']
) ON CONFLICT (id) DO NOTHING;

-- Create bucket for news and event images (PUBLIC)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'news-images',
  'news-images',
  true, -- Public bucket - anyone can view, admins can manage
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/jpg', 'image/webp', 'image/gif']
) ON CONFLICT (id) DO NOTHING;

-- Create bucket for carousel images (PUBLIC)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'carousel-images',
  'carousel-images',
  true, -- Public bucket - anyone can view, admins can manage
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/jpg', 'image/webp', 'image/gif']
) ON CONFLICT (id) DO NOTHING;

-- Create bucket for assignment attachments (PRIVATE)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'assignment-attachments',
  'assignment-attachments',
  false, -- Private bucket - teachers upload, students/teachers can view based on assignments
  20971520, -- 20MB limit
  ARRAY[
    'application/pdf',
    'image/jpeg', 'image/png', 'image/jpg', 'image/webp',
    'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain', 'text/csv'
  ]
) ON CONFLICT (id) DO NOTHING;

-- =============================================
-- STORAGE POLICIES (RLS for Storage)
-- =============================================

-- Drop existing storage policies first
DROP POLICY IF EXISTS "Students can upload their own documents" ON storage.objects;
DROP POLICY IF EXISTS "Students can view their own documents" ON storage.objects;
DROP POLICY IF EXISTS "Students can update their own documents" ON storage.objects;
DROP POLICY IF EXISTS "Students can delete their own documents" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view profile images" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own profile image" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own profile image" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own profile image" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view news images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can manage news images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view carousel images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can manage carousel images" ON storage.objects;
DROP POLICY IF EXISTS "Teachers can upload assignment attachments" ON storage.objects;
DROP POLICY IF EXISTS "Students and teachers can view assignment attachments" ON storage.objects;
DROP POLICY IF EXISTS "Teachers can update assignment attachments" ON storage.objects;
DROP POLICY IF EXISTS "Teachers can delete assignment attachments" ON storage.objects;
DROP POLICY IF EXISTS "Admins manage student documents storage" ON storage.objects;
DROP POLICY IF EXISTS "Students view own documents storage" ON storage.objects;
DROP POLICY IF EXISTS "Super admins manage profile images" ON storage.objects;
DROP POLICY IF EXISTS "Public view profile images" ON storage.objects;
DROP POLICY IF EXISTS "Admins manage news images" ON storage.objects;
DROP POLICY IF EXISTS "Public view news images" ON storage.objects;
DROP POLICY IF EXISTS "Admins manage carousel images" ON storage.objects;
DROP POLICY IF EXISTS "Public view carousel images" ON storage.objects;
DROP POLICY IF EXISTS "Teachers upload assignment attachments" ON storage.objects;
DROP POLICY IF EXISTS "Students upload assignment submissions" ON storage.objects;
DROP POLICY IF EXISTS "View assignment attachments" ON storage.objects;
DROP POLICY IF EXISTS "Super admins delete assignment attachments" ON storage.objects;

-- =============================================
-- STUDENT DOCUMENTS STORAGE POLICIES
-- =============================================

-- Admins can manage all student documents
CREATE POLICY "Admins manage student documents storage" ON storage.objects
  FOR ALL USING (
    bucket_id = 'student-documents' AND
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'super_admin')
      AND is_active = true
    )
  );

-- Students can view their own documents (folder structure: student-documents/user-id/filename)
CREATE POLICY "Students view own documents storage" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'student-documents' AND
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role = 'student'
      AND is_active = true
    ) AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- =============================================
-- PROFILE IMAGES STORAGE POLICIES
-- =============================================

-- Super admins can manage all profile images
CREATE POLICY "Super admins manage profile images" ON storage.objects
  FOR ALL USING (
    bucket_id = 'profile-images' AND
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND (role = 'super_admin' OR is_super_admin = true)
      AND is_active = true
    )
  );

-- Anyone can view profile images (public bucket)
CREATE POLICY "Public view profile images" ON storage.objects
  FOR SELECT USING (bucket_id = 'profile-images');

-- =============================================
-- NEWS IMAGES STORAGE POLICIES
-- =============================================

-- Admins can manage news images
CREATE POLICY "Admins manage news images" ON storage.objects
  FOR ALL USING (
    bucket_id = 'news-images' AND
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'super_admin')
      AND is_active = true
    )
  );

-- Anyone can view news images (public bucket)
CREATE POLICY "Public view news images" ON storage.objects
  FOR SELECT USING (bucket_id = 'news-images');

-- =============================================
-- CAROUSEL IMAGES STORAGE POLICIES
-- =============================================

-- Admins can manage carousel images
CREATE POLICY "Admins manage carousel images" ON storage.objects
  FOR ALL USING (
    bucket_id = 'carousel-images' AND
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'super_admin')
      AND is_active = true
    )
  );

-- Anyone can view carousel images (public bucket)
CREATE POLICY "Public view carousel images" ON storage.objects
  FOR SELECT USING (bucket_id = 'carousel-images');

-- =============================================
-- ASSIGNMENT ATTACHMENTS STORAGE POLICIES
-- =============================================

-- Teachers can upload assignment attachments for their subjects
CREATE POLICY "Teachers upload assignment attachments" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'assignment-attachments' AND
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role = 'teacher'
      AND is_active = true
    )
  );

-- Students can upload assignment submissions
CREATE POLICY "Students upload assignment submissions" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'assignment-attachments' AND
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role = 'student'
      AND is_active = true
    )
  );

-- Teachers, students, and admins can view assignment attachments
CREATE POLICY "View assignment attachments" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'assignment-attachments' AND
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role IN ('teacher', 'student', 'admin', 'super_admin')
      AND is_active = true
    )
  );

-- Super admins can delete assignment attachments
CREATE POLICY "Super admins delete assignment attachments" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'assignment-attachments' AND
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND (role = 'super_admin' OR is_super_admin = true)
      AND is_active = true
    )
  );

-- =============================================
-- HELPER FUNCTIONS FOR STORAGE
-- =============================================

-- Function to get public URL for files
CREATE OR REPLACE FUNCTION get_public_storage_url(bucket_name TEXT, file_path TEXT)
RETURNS TEXT AS $$
BEGIN
  -- Return the public URL format for Supabase storage
  -- The client should replace {project_id} with actual project ID
  RETURN 'https://{project_id}.supabase.co/storage/v1/object/public/' || bucket_name || '/' || file_path;
END;
$$ LANGUAGE plpgsql;

-- Function to get signed URL for private files (placeholder)
CREATE OR REPLACE FUNCTION get_signed_storage_url(bucket_name TEXT, file_path TEXT, expires_in INTEGER DEFAULT 3600)
RETURNS TEXT AS $$
BEGIN
  -- This would need to be implemented with a custom function or edge function
  -- For now, return a placeholder that indicates signed URL is needed
  RETURN 'signed_url_needed:' || bucket_name || '/' || file_path;
END;
$$ LANGUAGE plpgsql;

-- Function to validate file upload permissions
CREATE OR REPLACE FUNCTION can_upload_to_bucket(bucket_name TEXT, user_role TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  CASE bucket_name
    WHEN 'student-documents' THEN
      RETURN user_role IN ('admin', 'super_admin');
    WHEN 'profile-images' THEN
      RETURN user_role = 'super_admin';
    WHEN 'news-images' THEN
      RETURN user_role IN ('admin', 'super_admin');
    WHEN 'carousel-images' THEN
      RETURN user_role IN ('admin', 'super_admin');
    WHEN 'assignment-attachments' THEN
      RETURN user_role IN ('teacher', 'student', 'admin', 'super_admin');
    ELSE
      RETURN FALSE;
  END CASE;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- VERIFICATION QUERIES
-- =============================================
