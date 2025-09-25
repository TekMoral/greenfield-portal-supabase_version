-- Migration: Add require_password_change flag for first-login password rotation
-- Description:
--  - Adds a boolean column public.user_profiles.require_password_change
--  - Defaults to false for general use
--  - Initializes to true for all existing student profiles so they are forced to change on next login
--  - This supports the policy:
--      1) Initial password = admission_number
--      2) On first login, student must change password
--      3) Admin reset sets password back to admission_number and flips require_password_change back to true

set search_path = public;

-- 1) Add column if not exists
alter table if exists public.user_profiles
  add column if not exists require_password_change boolean not null default false;

-- 2) Initialize for existing students
update public.user_profiles
set require_password_change = true
where role = 'student';

-- 3) Optional: comment for documentation
comment on column public.user_profiles.require_password_change is
  'If true, user must change their password at next login. Used primarily for students whose initial/reset password is their admission_number.';
