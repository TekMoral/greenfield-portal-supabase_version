# User Management & Student Promotion System Setup Guide

This guide explains how to set up and use the comprehensive user management system including suspension, reactivation, graduation, and **dedicated student promotion** features with your updated `user_profiles` table.

## 🗄️ Database Schema Updates

### User Profiles Table Updates

```sql
-- Add status enum column (if not already added)
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS status user_status_enum DEFAULT 'active';

-- Create the enum type if it doesn't exist
CREATE TYPE user_status_enum AS ENUM ('active', 'suspended', 'graduated', 'deleted');

-- Add user status tracking columns
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS suspended_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS suspension_reason TEXT,
ADD COLUMN IF NOT EXISTS suspended_until TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS reactivated_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS reactivated_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS reactivation_reason TEXT,
ADD COLUMN IF NOT EXISTS graduated_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS graduated_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS graduation_reason TEXT,
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS deletion_reason TEXT,
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_status ON user_profiles(status);
CREATE INDEX IF NOT EXISTS idx_user_profiles_suspended_at ON user_profiles(suspended_at);
CREATE INDEX IF NOT EXISTS idx_user_profiles_suspended_by ON user_profiles(suspended_by);
```

### Student Promotions Table (New)

```sql
-- Create student promotions table for tracking promotion history
CREATE TABLE IF NOT EXISTS student_promotions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  from_class_id UUID NOT NULL REFERENCES classes(id),
  to_class_id UUID NOT NULL REFERENCES classes(id),
  academic_year VARCHAR(20) NOT NULL,
  promotion_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  promoted_by UUID NOT NULL REFERENCES auth.users(id),
  promotion_reason TEXT,
  promotion_data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for student promotions
CREATE INDEX IF NOT EXISTS idx_student_promotions_student_id ON student_promotions(student_id);
CREATE INDEX IF NOT EXISTS idx_student_promotions_academic_year ON student_promotions(academic_year);
CREATE INDEX IF NOT EXISTS idx_student_promotions_promotion_date ON student_promotions(promotion_date);
CREATE INDEX IF NOT EXISTS idx_student_promotions_from_class ON student_promotions(from_class_id);
CREATE INDEX IF NOT EXISTS idx_student_promotions_to_class ON student_promotions(to_class_id);

-- Add unique constraint to prevent duplicate promotions in same academic year
ALTER TABLE student_promotions 
ADD CONSTRAINT unique_student_academic_year_promotion 
UNIQUE (student_id, academic_year);
```

## 🚀 Deploy Edge Functions

Deploy the Edge Functions to your Supabase project:

```bash
# Navigate to your Supabase project directory
cd supabase

# Deploy user status management functions
supabase functions deploy suspend-user
supabase functions deploy reactivate-user
supabase functions deploy graduate-student

# Deploy student promotion functions
supabase functions deploy promote-student
supabase functions deploy bulk-promote-students
supabase functions deploy demote-student
supabase functions deploy get-student-promotion-history
supabase functions deploy get-promotion-eligibility

# Optional: Deploy other utility functions
supabase functions deploy get-user-status-history
supabase functions deploy bulk-suspend-users
supabase functions deploy bulk-reactivate-users
```

## 📝 EdgeFunctionsService Integration

The `EdgeFunctionsService` has been updated with comprehensive user management methods:

### User Status Management

```javascript
// Suspend a user
await edgeFunctionsService.suspendUser(userId, userType, reason, suspendedBy, suspendedUntil)

// Reactivate a suspended user
await edgeFunctionsService.reactivateUser(userId, userType, reactivatedBy, reactivationReason)

// Graduate a student
await edgeFunctionsService.graduateStudent(studentId, graduatedBy, graduationDate, graduationReason)

// Get user status history
await edgeFunctionsService.getUserStatusHistory(userId, userType)
```

### Student Promotion Management (NEW)

```javascript
// Promote a single student
await edgeFunctionsService.promoteStudent(
  studentId, 
  fromClassId, 
  toClassId, 
  academicYear, 
  promotedBy, 
  promotionReason, 
  promotionData
)

// Bulk promote students
await edgeFunctionsService.bulkPromoteStudents(
  promotions, 
  academicYear, 
  promotedBy, 
  promotionReason
)

// Demote a student
await edgeFunctionsService.demoteStudent(
  studentId, 
  fromClassId, 
  toClassId, 
  academicYear, 
  demotedBy, 
  demotionReason, 
  demotionData
)

// Get student promotion history
await edgeFunctionsService.getStudentPromotionHistory(studentId)

// Get promotion eligibility for a class
await edgeFunctionsService.getPromotionEligibility(classId, academicYear)
```

### Bulk Operations

```javascript
// Bulk suspend users
await edgeFunctionsService.bulkSuspendUsers(userIds, userType, reason, suspendedBy, suspendedUntil)

// Bulk reactivate users
await edgeFunctionsService.bulkReactivateUsers(userIds, userType, reactivatedBy, reactivationReason)
```

## 🎯 Usage Examples

### 1. Single Student Promotion

```javascript
import edgeFunctionsService from '../services/supabase/edgeFunctions';

const promoteStudent = async (studentId, fromClassId, toClassId) => {
  try {
    const result = await edgeFunctionsService.promoteStudent(
      studentId,
      fromClassId,
      toClassId,
      '2024-2025', // Academic year
      null, // Will use current user
      'End of academic year promotion',
      {
        grades: { math: 'A', english: 'B+', science: 'A-' },
        performance: 'excellent',
        attendance: 95,
        teacherRecommendation: 'Outstanding student, ready for next level'
      }
    );
    
    if (result.success) {
      toast.success(result.message);
      console.log('Promotion details:', result.data);
    }
  } catch (error) {
    toast.error('Failed to promote student');
  }
};
```

### 2. Bulk Student Promotion

```javascript
const bulkPromoteClass = async (classId, targetClassId) => {
  // Get all students in the class
  const studentsToPromote = students
    .filter(s => s.class_id === classId && s.status === 'active')
    .map(student => ({
      studentId: student.id,
      fromClassId: classId,
      toClassId: targetClassId,
      promotionData: {
        performance: 'satisfactory',
        attendance: student.attendance || 90
      }
    }));

  const result = await edgeFunctionsService.bulkPromoteStudents(
    studentsToPromote,
    '2024-2025',
    null, // Will use current user
    'End of academic year bulk promotion'
  );

  if (result.success) {
    toast.success(`Successfully promoted ${result.data.successCount} students`);
    
    // Handle any failures
    if (result.data.failed.length > 0) {
      result.data.failed.forEach(failure => {
        console.error(`Failed to promote ${failure.studentName}: ${failure.error}`);
      });
    }
  }
};
```

### 3. Student Demotion

```javascript
const demoteStudent = async (studentId, fromClassId, toClassId) => {
  const result = await edgeFunctionsService.demoteStudent(
    studentId,
    fromClassId,
    toClassId,
    '2024-2025',
    null, // Will use current user
    'Academic performance requires additional support',
    {
      performance: 'needs_improvement',
      attendance: 75,
      teacherRecommendation: 'Student needs more time to master current level concepts'
    }
  );
};
```

### 4. Get Promotion History

```javascript
const viewPromotionHistory = async (studentId) => {
  const result = await edgeFunctionsService.getStudentPromotionHistory(studentId);
  
  if (result.success) {
    const history = result.data.promotions;
    history.forEach(promotion => {
      console.log(`${promotion.academic_year}: ${promotion.from_class_name} → ${promotion.to_class_name}`);
      console.log(`Reason: ${promotion.promotion_reason}`);
      console.log(`Date: ${new Date(promotion.promotion_date).toLocaleDateString()}`);
    });
  }
};
```

### 5. Check Promotion Eligibility

```javascript
const checkClassEligibility = async (classId) => {
  const result = await edgeFunctionsService.getPromotionEligibility(classId, '2024-2025');
  
  if (result.success) {
    const eligibility = result.data;
    console.log(`Eligible students: ${eligibility.eligible_count}`);
    console.log(`Ineligible students: ${eligibility.ineligible_count}`);
    
    // Show detailed eligibility data
    eligibility.students.forEach(student => {
      console.log(`${student.name}: ${student.eligible ? 'Eligible' : 'Not Eligible'}`);
      if (!student.eligible) {
        console.log(`Reasons: ${student.reasons.join(', ')}`);
      }
    });
  }
};
```

## 🔐 Permissions & Security

### Role-Based Access Control

- **Super Admins**: Full access to all operations
- **Admins**: Can manage students and teachers, bulk operations
- **Teachers**: Can promote/demote students in their classes
- **Students**: Read-only access to their own data

### Student Promotion Permissions

- **Promote Students**: Super Admins, Admins, Teachers
- **Bulk Promote**: Super Admins, Admins only
- **Demote Students**: Super Admins, Admins, Teachers (with restrictions)
- **View History**: Super Admins, Admins, Teachers (own students), Students (own history)

### Security Features

1. **Class Validation**: Ensures student is actually in the source class
2. **Capacity Checks**: Prevents promotion to full classes
3. **Duplicate Prevention**: One promotion per student per academic year
4. **Status Validation**: Only active students can be promoted
5. **Audit Logging**: All promotions are logged with full details
6. **Transaction Safety**: Rollback on failure to maintain data integrity

## 📊 Promotion Business Rules

### Valid Promotion Scenarios

```
Grade 1 → Grade 2 (normal progression)
Grade 2 → Grade 3 (normal progression)
Grade 3 → Grade 2 (demotion for academic support)
Any Grade → Graduated (final year students)
```

### Promotion Requirements

- Student must be in `active` status
- Student must be currently enrolled in the `fromClass`
- Target class must exist and have capacity
- No existing promotion record for the academic year
- Proper academic performance (configurable)

### Promotion Data Structure

```javascript
const promotionData = {
  grades: {
    math: 'A',
    english: 'B+',
    science: 'A-',
    social_studies: 'B'
  },
  performance: 'excellent', // excellent, good, satisfactory, needs_improvement
  attendance: 95, // percentage
  behavior: 'exemplary', // exemplary, good, satisfactory, concerning
  teacherRecommendation: 'Ready for next level',
  extracurricular: ['sports', 'music'],
  specialNotes: 'Outstanding leadership qualities'
};
```

## 🎨 UI Integration

### Promotion Button Component

```jsx
import { PromoteButton, DemoteButton } from '../components/ui/ActionButtons';

const StudentPromotionCell = ({ student, onPromotionChange }) => {
  const [loading, setLoading] = useState(false);

  const handlePromote = async () => {
    setLoading(true);
    try {
      const result = await edgeFunctionsService.promoteStudent(
        student.id,
        student.class_id,
        getNextClassId(student.class_id),
        getCurrentAcademicYear()
      );
      
      if (result.success) {
        onPromotionChange(student.id, result.data);
        toast.success(result.message);
      }
    } catch (error) {
      toast.error('Failed to promote student');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex space-x-2">
      <PromoteButton 
        onClick={handlePromote} 
        loading={loading}
        disabled={student.status !== 'active'}
      />
      <DemoteButton 
        onClick={() => handleDemote(student)} 
        disabled={student.status !== 'active'}
      />
    </div>
  );
};
```

### Promotion History Modal

```jsx
const PromotionHistoryModal = ({ studentId, isOpen, onClose }) => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && studentId) {
      fetchPromotionHistory();
    }
  }, [isOpen, studentId]);

  const fetchPromotionHistory = async () => {
    setLoading(true);
    try {
      const result = await edgeFunctionsService.getStudentPromotionHistory(studentId);
      if (result.success) {
        setHistory(result.data.promotions);
      }
    } catch (error) {
      toast.error('Failed to load promotion history');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="p-6">
        <h3 className="text-lg font-semibold mb-4">Promotion History</h3>
        {loading ? (
          <div className="text-center py-4">Loading...</div>
        ) : (
          <div className="space-y-4">
            {history.map(promotion => (
              <div key={promotion.id} className="border-l-4 border-blue-500 pl-4">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium">
                      {promotion.from_class_name} → {promotion.to_class_name}
                    </p>
                    <p className="text-sm text-gray-600">
                      Academic Year: {promotion.academic_year}
                    </p>
                    <p className="text-sm text-gray-600">
                      Date: {new Date(promotion.promotion_date).toLocaleDateString()}
                    </p>
                    {promotion.promotion_reason && (
                      <p className="text-sm text-gray-600">
                        Reason: {promotion.promotion_reason}
                      </p>
                    )}
                  </div>
                  <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                    Promoted
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
};
```

## 🔍 Monitoring & Analytics

### Promotion Statistics

```javascript
// Get promotion statistics for an academic year
const getPromotionStats = async (academicYear) => {
  const { data, error } = await supabase
    .from('student_promotions')
    .select(`
      *,
      from_class:from_class_id(name, level),
      to_class:to_class_id(name, level),
      student:student_id(full_name)
    `)
    .eq('academic_year', academicYear);
    
  if (data) {
    const stats = {
      total_promotions: data.length,
      by_grade: {},
      by_month: {},
      success_rate: 100 // Assuming all recorded promotions were successful
    };
    
    // Group by grade level
    data.forEach(promotion => {
      const fromLevel = promotion.from_class.level;
      const toLevel = promotion.to_class.level;
      const key = `${fromLevel} → ${toLevel}`;
      
      stats.by_grade[key] = (stats.by_grade[key] || 0) + 1;
    });
    
    return stats;
  }
};

// Get students due for promotion
const getStudentsDueForPromotion = async (classId, academicYear) => {
  const { data, error } = await supabase
    .from('user_profiles')
    .select(`
      id,
      full_name,
      class_id,
      classes(name, level),
      student_promotions!left(id)
    `)
    .eq('class_id', classId)
    .eq('role', 'student')
    .eq('status', 'active')
    .is('student_promotions.id', null); // Students without promotion records
    
  return data || [];
};
```

## 🚨 Error Handling

### Common Promotion Errors

```javascript
const handlePromotionError = (error, studentName) => {
  const errorMessages = {
    'Student not found': `Student ${studentName} not found in the system`,
    'Student is not in the specified class': `${studentName} is not currently in the selected class`,
    'Target class not found': 'The target class no longer exists',
    'Target class is at full capacity': 'Cannot promote - target class is full',
    'Student has already been promoted': `${studentName} has already been promoted this academic year`,
    'Cannot promote student with status': `${studentName} must be active to be promoted`,
    'Insufficient permissions': 'You do not have permission to promote students'
  };

  const message = errorMessages[error] || `Failed to promote ${studentName}`;
  toast.error(message);
};
```

## 📋 Testing

### Test Student Promotion

```javascript
// Test single promotion
const testPromotion = async () => {
  const testData = {
    studentId: 'test-student-id',
    fromClassId: 'grade-1-class-id',
    toClassId: 'grade-2-class-id',
    academicYear: '2024-2025',
    promotionData: {
      grades: { math: 'A', english: 'B' },
      performance: 'excellent',
      attendance: 95
    }
  };

  const result = await edgeFunctionsService.promoteStudent(
    testData.studentId,
    testData.fromClassId,
    testData.toClassId,
    testData.academicYear,
    null,
    'Test promotion',
    testData.promotionData
  );
  
  console.log('Promotion test result:', result);
};

// Test bulk promotion
const testBulkPromotion = async () => {
  const promotions = [
    { studentId: 'student-1', fromClassId: 'class-1', toClassId: 'class-2' },
    { studentId: 'student-2', fromClassId: 'class-1', toClassId: 'class-2' }
  ];

  const result = await edgeFunctionsService.bulkPromoteStudents(
    promotions,
    '2024-2025',
    null,
    'Test bulk promotion'
  );
  
  console.log('Bulk promotion test result:', result);
};
```

## 🎉 Conclusion

Your comprehensive user management system is now ready with dedicated student promotion functionality! The system provides:

### Key Benefits

- ✅ **Dedicated Student Promotion**: Specialized functions for academic progression
- ✅ **Comprehensive Tracking**: Full promotion history and audit trails
- ✅ **Bulk Operations**: Efficient end-of-year promotions
- ✅ **Business Rule Validation**: Prevents invalid promotions
- ✅ **Role-Based Security**: Appropriate permissions for different user types
- ✅ **Transaction Safety**: Data integrity with rollback capabilities
- ✅ **Rich Metadata**: Detailed promotion data including grades and performance
- ✅ **Flexible Architecture**: Easy to extend with additional features

### Next Steps

1. **Deploy Edge Functions** to your Supabase project
2. **Update Database Schema** with promotion tables and columns
3. **Integrate Promotion UI** into your student management interface
4. **Set up Academic Year Management** for proper promotion cycles
5. **Configure Class Progression Rules** for your school structure
6. **Test Promotion Workflows** with sample data
7. **Train Staff** on the new promotion features

The system is designed to handle complex academic scenarios while maintaining data integrity and providing comprehensive audit trails for all student progression activities.