-- =============================================
-- BASIC SETUP FOR TESTING STUDENT CREATION
-- Run this in Supabase SQL Editor first
-- =============================================

-- Insert basic subjects
INSERT INTO subjects (id, name, code, description, department, is_core, status) VALUES
  ('550e8400-e29b-41d4-a716-446655440001', 'Mathematics', 'MATH101', 'Basic Mathematics', 'Mathematics', true, 'active'),
  ('550e8400-e29b-41d4-a716-446655440002', 'English Language', 'ENG101', 'English Language and Literature', 'Languages', true, 'active'),
  ('550e8400-e29b-41d4-a716-446655440003', 'Physics', 'PHY101', 'Basic Physics', 'Sciences', false, 'active'),
  ('550e8400-e29b-41d4-a716-446655440004', 'Chemistry', 'CHE101', 'Basic Chemistry', 'Sciences', false, 'active'),
  ('550e8400-e29b-41d4-a716-446655440005', 'Biology', 'BIO101', 'Basic Biology', 'Sciences', false, 'active')
ON CONFLICT (id) DO NOTHING;

-- Insert basic classes
INSERT INTO classes (id, name, description, level, category, academic_year, capacity, status) VALUES
  ('660e8400-e29b-41d4-a716-446655440001', 'Grade 10A', 'Grade 10 Science Class A', 'Secondary', 'Science', '2024/2025', 30, 'active'),
  ('660e8400-e29b-41d4-a716-446655440002', 'Grade 10B', 'Grade 10 Arts Class B', 'Secondary', 'Arts', '2024/2025', 30, 'active'),
  ('660e8400-e29b-41d4-a716-446655440003', 'Grade 11A', 'Grade 11 Science Class A', 'Secondary', 'Science', '2024/2025', 25, 'active'),
  ('660e8400-e29b-41d4-a716-446655440004', 'Grade 11B', 'Grade 11 Arts Class B', 'Secondary', 'Arts', '2024/2025', 25, 'active'),
  ('660e8400-e29b-41d4-a716-446655440005', 'Grade 12A', 'Grade 12 Science Class A', 'Secondary', 'Science', '2024/2025', 20, 'active')
ON CONFLICT (id) DO NOTHING;

-- Verify the data was inserted
SELECT 'Basic setup completed!' as message;
SELECT 
  (SELECT COUNT(*) FROM classes WHERE status = 'active') as total_classes,
  (SELECT COUNT(*) FROM subjects WHERE status = 'active') as total_subjects;