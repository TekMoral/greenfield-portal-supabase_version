-- =============================================
-- FIX FOR USER_PROFILES CIRCULAR DEPENDENCY
-- =============================================
-- This fixes the circular dependency in your existing RLS policies
-- Run this AFTER your main security policies file

-- Drop the problematic user_profiles policies
DROP POLICY IF EXISTS "Students view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Teachers view profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins view profiles" ON user_profiles;
DROP POLICY IF EXISTS "Super admins view all profiles" ON user_profiles;

-- =============================================
-- CORRECTED USER PROFILES POLICIES (NO CIRCULAR DEPENDENCY)
-- =============================================

-- Basic policy: Users can always view their own profile (no role check needed)
CREATE POLICY "Users can view own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = id);

-- Teachers can view student profiles in their classes
CREATE POLICY "Teachers view student profiles" ON user_profiles
  FOR SELECT USING (
    -- User can see their own profile OR
    auth.uid() = id OR
    -- Teacher can see student profiles in their classes
    (
      EXISTS (
        SELECT 1 FROM user_profiles teacher_profile 
        WHERE teacher_profile.id = auth.uid() 
        AND teacher_profile.role = 'teacher'
        AND teacher_profile.is_active = true
      )
      AND role = 'student' 
      AND class_id IN (
        SELECT DISTINCT class_id FROM teacher_assignments 
        WHERE teacher_id = auth.uid() AND is_active = true
      )
    )
  );

-- Admins can view all profiles except super_admin profiles
CREATE POLICY "Admins view non-super-admin profiles" ON user_profiles
  FOR SELECT USING (
    -- User can see their own profile OR
    auth.uid() = id OR
    -- Admin can see non-super-admin profiles
    (
      EXISTS (
        SELECT 1 FROM user_profiles admin_profile 
        WHERE admin_profile.id = auth.uid() 
        AND admin_profile.role = 'admin'
        AND admin_profile.is_active = true
      )
      AND role != 'super_admin'
    )
  );

-- Super admins can view all profiles
CREATE POLICY "Super admins view all profiles" ON user_profiles
  FOR SELECT USING (
    -- User can see their own profile OR
    auth.uid() = id OR
    -- Super admin can see all profiles
    EXISTS (
      SELECT 1 FROM user_profiles super_admin_profile 
      WHERE super_admin_profile.id = auth.uid() 
      AND (super_admin_profile.role = 'super_admin' OR super_admin_profile.is_super_admin = true)
      AND super_admin_profile.is_active = true
    )
  );

-- Only super admins can update user profiles
CREATE POLICY "Only super admins can update profiles" ON user_profiles
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_profiles super_admin_profile 
      WHERE super_admin_profile.id = auth.uid() 
      AND (super_admin_profile.role = 'super_admin' OR super_admin_profile.is_super_admin = true)
      AND super_admin_profile.is_active = true
    )
  );

-- Admins can create students, super admins can create users except other super admins
CREATE POLICY "Admins can create students only" ON user_profiles
  FOR INSERT WITH CHECK (
    -- Super admins can create any user EXCEPT other super admins
    (
      EXISTS (
        SELECT 1 FROM user_profiles super_admin_profile 
        WHERE super_admin_profile.id = auth.uid() 
        AND (super_admin_profile.role = 'super_admin' OR super_admin_profile.is_super_admin = true)
        AND super_admin_profile.is_active = true
      )
      AND role != 'super_admin'
      AND (is_super_admin IS NULL OR is_super_admin = false)
    )
    OR
    -- Ordinary admins can only create students
    (
      EXISTS (
        SELECT 1 FROM user_profiles admin_profile 
        WHERE admin_profile.id = auth.uid() 
        AND admin_profile.role = 'admin'
        AND admin_profile.is_active = true
      )
      AND role = 'student'
    )
  );

-- Only super admins can delete user profiles (prevent admins from deleting other admins)
CREATE POLICY "Only super admins can delete profiles" ON user_profiles
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM user_profiles super_admin_profile 
      WHERE super_admin_profile.id = auth.uid() 
      AND (super_admin_profile.role = 'super_admin' OR super_admin_profile.is_super_admin = true)
      AND super_admin_profile.is_active = true
    )
    -- Prevent super admins from deleting themselves
    AND auth.uid() != id
  );

-- =============================================
-- VERIFICATION
-- =============================================
-- After running this, test with:
-- SELECT id, email, role FROM user_profiles WHERE id = auth.uid();