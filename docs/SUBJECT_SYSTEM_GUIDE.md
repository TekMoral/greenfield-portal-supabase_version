# 📚 School Portal Subject Management System

## 🎯 Overview

This system handles **relational subject management** with support for **department-based subject organization** and **teacher-subject-class assignments**. The system uses a PostgreSQL database with proper relationships between subjects, teachers, classes, and students.

## 📋 Database Structure

### Core Tables

#### 1. **Subjects Table** (`public.subjects`)
```sql
CREATE TABLE public.subjects (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT UNIQUE,
  description TEXT,
  department TEXT,           -- Core department categorization
  credit_hours INTEGER DEFAULT 1,
  is_core BOOLEAN DEFAULT FALSE,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

#### 2. **Teacher Assignments Table** (`public.teacher_assignments`)
```sql
CREATE TABLE public.teacher_assignments (
  id UUID PRIMARY KEY,
  teacher_id UUID REFERENCES user_profiles(id),
  subject_id UUID REFERENCES subjects(id),
  class_id UUID REFERENCES classes(id),
  academic_year TEXT,
  term INTEGER,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

## 🏗️ Subject Service Implementation

### Core Functions Available

#### ✅ **Basic CRUD Operations**
- `getSubjects()` - Get all active subjects
- `getSubjectById(subjectId)` - Get specific subject
- `createSubject(subjectData)` - Create new subject
- `updateSubject(subjectId, updates)` - Update existing subject
- `deleteSubject(subjectId)` - Soft delete subject (sets status to 'inactive')

#### ✅ **Department-Based Operations**
- `getSubjectsByDepartment(department)` - Get subjects by department
- `addSubjectToDepartment(department, subjectName)` - Legacy compatibility function
- `removeSubjectFromDepartment(department, subjectName)` - Legacy compatibility function

#### ✅ **Search and Filter Operations**
- `searchSubjects(searchTerm)` - Search subjects by name, code, or department
- `getSubjectsByTeacher(teacherId)` - Get subjects taught by specific teacher

## 📋 Subject Categories (Department-Based)

### 1. **Core Subjects** (`department: 'core'`)
- **Who takes them**: ALL students regardless of level or category
- **Examples**: English Language, Mathematics, Civic Education, Physical Education
- **Database**: `subjects` table with `department = 'core'` and `is_core = true`

### 2. **Junior Subjects** (`department: 'junior'`)
- **Who takes them**: Only Junior Secondary students
- **Examples**: Basic Science, Basic Technology, Social Studies, Creative Arts
- **Database**: `subjects` table with `department = 'junior'`

### 3. **Category Subjects** (Senior Level Only)
- **Science Category** (`department: 'science'`): Physics, Chemistry, Biology, Further Mathematics
- **Art Category** (`department: 'art'`): Literature, Government, History, CRS, Fine Arts
- **Commercial Category** (`department: 'commercial'`): Economics, Accounting, Commerce, Business Studies
- **Database**: `subjects` table with respective department values

## 🔄 How Student Subject Assignment Works

### Subject Resolution Logic:
```javascript
// From teacherStudentService.js
export const getStudentSubjects = async (studentId) => {
  // 1. Get core subjects (taken by ALL students)
  const coreSubjects = await getSubjectsByDepartment('core');

  // 2. For Junior level, add junior-specific subjects
  if (classData.level === 'Junior') {
    const juniorSubjects = await getSubjectsByDepartment('junior');
    allSubjects = [...coreSubjects, ...juniorSubjects];
  }

  // 3. For Senior level, add category-specific subjects
  if (classData.level === 'Senior' && classData.category) {
    const categorySubjects = await getSubjectsByDepartment(classData.category.toLowerCase());
    allSubjects = [...coreSubjects, ...categorySubjects];
  }

  return allSubjects;
}
```

### Teacher-Subject Relationships:
```javascript
// Teachers are assigned to subjects through teacher_assignments table
export const getSubjectsByTeacher = async (teacherId) => {
  const { data } = await supabase
    .from('teacher_assignments')
    .select('*, subject:subjects(*)')
    .eq('teacher_id', teacherId)
    .eq('is_active', true);

  return data?.map(assignment => assignment.subject) || [];
}
```

## 🏫 Teacher-Student Relationships

### How Teachers See Students:
1. **Core subject teachers** → See ALL students across all classes taking that subject
2. **Category subject teachers** → See only students in classes with matching category
3. **Junior subject teachers** → See only Junior level students

### Assignment Distribution Logic:
- **Core subject assignment** → Reaches ALL students taking that subject
- **Category subject assignment** → Reaches only students in that category
- **Junior subject assignment** → Reaches only Junior students

## 🛠️ Implementation Features

### ✅ **Relational Integrity**
- Foreign key constraints ensure data consistency
- Proper joins between subjects, teachers, and classes
- Cascade deletes maintain referential integrity

### ✅ **Flexible Department System**
- Subjects organized by department (core, junior, science, art, commercial)
- Easy to add new departments or modify existing ones
- Department-based filtering and querying

### ✅ **Teacher Assignment Management**
- Many-to-many relationship between teachers, subjects, and classes
- Academic year and term tracking
- Active/inactive status for assignments

### ✅ **Search and Discovery**
- Full-text search across subject names, codes, and departments
- Department-based filtering
- Teacher-specific subject listings

## 🚀 Usage Examples

### Creating a New Subject:
```javascript
import { createSubject } from '../services/supabase/subjectService';

const newSubject = await createSubject({
  name: 'Advanced Physics',
  code: 'PHY',
  description: 'Advanced physics for senior students',
  department: 'science',
  credit_hours: 3,
  is_core: false
});
```

### Getting Subjects by Department:
```javascript
import { getSubjectsByDepartment } from '../services/supabase/subjectService';

// Get all core subjects
const coreSubjects = await getSubjectsByDepartment('core');

// Get all science subjects
const scienceSubjects = await getSubjectsByDepartment('science');
```

### Searching Subjects:
```javascript
import { searchSubjects } from '../services/supabase/subjectService';

// Search for subjects containing "math"
const mathSubjects = await searchSubjects('math');
```

## 🔧 Setup Instructions

### 1. **Database Setup**
```sql
-- Subjects are created through the admin interface or API
-- Example core subjects:
INSERT INTO subjects (name, code, department, is_core) VALUES
('English Language', 'ENG101', 'core', true),
('Mathematics', 'MTH101', 'core', true),
('Civic Education', 'CIV101', 'core', true);
```

### 2. **Teacher Assignment**
```sql
-- Teachers are assigned to subjects through teacher_assignments table
INSERT INTO teacher_assignments (teacher_id, subject_id, class_id, academic_year, term) VALUES
('teacher-uuid', 'subject-uuid', 'class-uuid', '2024/2025', 1);
```

### 3. **Class Configuration**
- Set correct `level` (Junior/Senior) in classes table
- Set `category` for Senior classes (Science/Art/Commercial)
- Assign teachers to subjects through the admin interface

## 📊 Benefits

1. **Relational Integrity**: Proper database relationships ensure data consistency
2. **Scalable Architecture**: Easy to add new subjects, departments, or relationships
3. **Flexible Querying**: Department-based and search-based subject discovery
4. **Teacher Management**: Clear teacher-subject-class relationships
5. **Academic Tracking**: Academic year and term-based assignment tracking

## 🔍 Troubleshooting

### Issue: Subject not appearing for students
**Solution**: Check if subject is active (`status = 'active'`) and properly assigned to the class

### Issue: Teacher can't see subject
**Solution**: Verify teacher has an active assignment in `teacher_assignments` table

### Issue: Department filtering not working
**Solution**: Ensure subjects have correct `department` values (core, junior, science, art, commercial)

### Issue: Search not returning results
**Solution**: Check that search terms match subject `name`, `code`, or `department` fields

## 🔄 Migration Notes

The current implementation uses a **relational database approach** rather than the document-based structure mentioned in previous versions. This provides:

- Better data integrity through foreign key constraints
- More efficient querying through proper indexing
- Easier maintenance and updates
- Better support for complex relationships

All legacy functions (`addSubjectToDepartment`, `removeSubjectFromDepartment`) are maintained for backward compatibility but internally use the new relational structure.
