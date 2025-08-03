# 🔄 Schema Migration Guide

## 📋 Issues Found and Fixed

### ❌ **Problems in Original Schemas:**

1. **Table Duplications:**
   - `students` table defined in multiple files
   - `user_profiles` with conflicting column structures
   - Overlapping table definitions across 6 different SQL files

2. **Hardcoded Data:**
   - Academic year '2024/2025' hardcoded in classes table
   - Fixed grade scales and GPA calculations
   - Hardcoded term values (1, 2, 3)
   - Fixed grading weights

3. **Schema Fragmentation:**
   - 6 separate SQL files with overlapping functionality
   - Inconsistent naming conventions
   - Duplicate function definitions
   - Conflicting RLS policies

4. **Column Conflicts:**
   - `user_profiles.id` vs `user_profiles.user_id`
   - Inconsistent foreign key references
   - Mixed data types for similar fields

### ✅ **Solutions Implemented:**

## 🆕 New Consolidated Schema

### **Clean Files:**
- `supabase-consolidated-clean-schema.sql` - Main database schema
- `supabase-storage-setup.sql` - Storage buckets and policies

### **Key Improvements:**

1. **Unified User Management:**
   - Single `user_profiles` table for all user types
   - Role-based fields (student, teacher, admin specific)
   - Consistent UUID primary keys

2. **Flexible Academic Structure:**
   - No hardcoded academic years
   - Configurable terms and grading periods
   - Customizable grading scales

3. **Clean Relationships:**
   - Proper foreign key constraints
   - Consistent naming conventions
   - Optimized indexes

4. **Comprehensive Features:**
   - File upload support with Supabase Storage
   - Notification system
   - Audit logging
   - Attendance tracking
   - Grade management
   - Report generation
   - Admin creation functions

## 🚀 Migration Steps

### **Step 1: Backup Current Data**
```sql
-- Export your current data before migration
-- Use Supabase dashboard or pg_dump
```

### **Step 2: Run Clean Schema**
1. Open Supabase SQL Editor
2. Copy and paste `supabase-consolidated-clean-schema.sql`
3. Execute the script

### **Step 3: Update Service Imports**
Update your service files to use the new table structure:

```javascript
// OLD - Multiple table references
const { data: students } = await supabase.from('students')
const { data: profiles } = await supabase.from('user_profiles')

// NEW - Unified approach
const { data: students } = await supabase
  .from('user_profiles')
  .select('*')
  .eq('role', 'student')
```

### **Step 4: Remove Old Schema Files**
Delete these fragmented schema files:
- `supabase-schema-final.sql`
- `supabase-teacher-student-management-schema.sql`
- `supabase-remaining-services-schema.sql`
- `supabase-legacy-tables-schema.sql`
- `supabase-grades-results-schema.sql`
- `supabase-admin-carousel-schema.sql`
- `supabase-reports-timetables-schema.sql`

## 📊 Schema Comparison

### **Before (Fragmented):**
```
6 SQL files
15+ duplicate table definitions
Hardcoded academic year: '2024/2025'
Inconsistent column naming
Mixed foreign key references
```

### **After (Consolidated):**
```
1 SQL file
0 duplicates
Fully configurable
Consistent naming
Clean relationships
```

## 🔧 Configuration Options

### **Academic Years:**
```sql
-- Now configurable per class/term
INSERT INTO classes (name, academic_year) 
VALUES ('Grade 1A', '2024/2025');

INSERT INTO classes (name, academic_year) 
VALUES ('Grade 1B', '2025/2026');
```

### **Grading Scales:**
```sql
-- Modify the calculate_grade() function for your school's scale
CREATE OR REPLACE FUNCTION calculate_grade(percentage DECIMAL)
RETURNS TEXT AS $$
BEGIN
  -- Customize these thresholds for your school
  CASE 
    WHEN percentage >= 90 THEN RETURN 'A+';
    WHEN percentage >= 80 THEN RETURN 'A';
    -- ... add your school's grade boundaries
  END CASE;
END;
$$ LANGUAGE plpgsql;
```

### **Term Structure:**
```sql
-- Flexible term system
INSERT INTO teacher_assignments (teacher_id, subject_id, class_id, term)
VALUES (teacher_uuid, subject_uuid, class_uuid, 1); -- First term

-- Support for quarters, semesters, or any term structure
```

## 🛡️ Security Features

### **Row Level Security:**
- Enabled on all tables
- Role-based access control
- Student data protection
- Teacher-specific access

### **Audit Logging:**
- All changes tracked
- User action history
- Data integrity monitoring

## 📱 Service Integration

### **File Uploads:**
- Cloudinary integration ready
- Document management
- Profile image support

### **Notifications:**
- Real-time messaging
- Priority levels
- Read/unread tracking

### **Reports:**
- Comprehensive student reports
- Grade analytics
- Attendance summaries

## ✅ Verification Checklist

After migration, verify:

- [ ] All tables created successfully
- [ ] No duplicate table errors
- [ ] RLS policies active
- [ ] Indexes created
- [ ] Functions working
- [ ] Triggers active
- [ ] Sample data inserts work
- [ ] Service connections successful

## ���� Troubleshooting

### **Common Issues:**

1. **Permission Errors:**
   ```sql
   -- Grant permissions if needed
   GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
   ```

2. **RLS Blocking Access:**
   ```sql
   -- Temporarily disable RLS for testing
   ALTER TABLE table_name DISABLE ROW LEVEL SECURITY;
   ```

3. **Function Errors:**
   ```sql
   -- Check function exists
   SELECT * FROM pg_proc WHERE proname = 'calculate_grade';
   ```

## 🎯 Next Steps

1. **Test the new schema** with sample data
2. **Update your services** to use the new structure
3. **Configure grading scales** for your school
4. **Set up academic years** and terms
5. **Import existing data** if needed
6. **Test all functionality** thoroughly

## 📞 Support

If you encounter issues:
1. Check the Supabase logs
2. Verify table relationships
3. Test with simple queries first
4. Ensure proper permissions

Your schema is now clean, efficient, and ready for production! 🚀