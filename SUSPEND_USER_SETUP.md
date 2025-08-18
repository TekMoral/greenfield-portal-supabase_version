# User Suspension System Setup Guide

This guide explains how to set up and use the user suspension system with your updated `user_profiles` table that includes status enum (`active`, `suspended`, `graduated`, `deleted`).

## 🗄️ Database Schema Updates

First, ensure your `user_profiles` table has the following columns:

```sql
-- Add status enum column (if not already added)
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS status user_status_enum DEFAULT 'active';

-- Create the enum type if it doesn't exist
CREATE TYPE user_status_enum AS ENUM ('active', 'suspended', 'graduated', 'deleted');

-- Add suspension-related columns
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

## 🚀 Deploy Edge Functions

Deploy the Edge Functions to your Supabase project:

```bash
# Navigate to your Supabase project directory
cd supabase

# Deploy the suspend-user function
supabase functions deploy suspend-user

# Deploy the reactivate-user function
supabase functions deploy reactivate-user

# Deploy the update-user-status function
supabase functions deploy update-user-status

# Optional: Deploy other status-related functions
supabase functions deploy graduate-student
supabase functions deploy get-user-status-history
supabase functions deploy bulk-suspend-users
supabase functions deploy bulk-reactivate-users
```

## 📝 EdgeFunctionsService Integration

The `EdgeFunctionsService` has been updated with the following new methods:

### Core Methods

```javascript
// Suspend a user
await edgeFunctionsService.suspendUser(userId, userType, reason, suspendedBy, suspendedUntil)

// Reactivate a suspended user
await edgeFunctionsService.reactivateUser(userId, userType, reactivatedBy, reactivationReason)

// Update user status with metadata
await edgeFunctionsService.updateUserStatus(userId, userType, status, metadata)

// Graduate a student
await edgeFunctionsService.graduateStudent(studentId, graduatedBy, graduationDate, graduationReason)

// Get user status history
await edgeFunctionsService.getUserStatusHistory(userId, userType)
```

### Bulk Operations

```javascript
// Bulk suspend users
await edgeFunctionsService.bulkSuspendUsers(userIds, userType, reason, suspendedBy, suspendedUntil)

// Bulk reactivate users
await edgeFunctionsService.bulkReactivateUsers(userIds, userType, reactivatedBy, reactivationReason)
```

## 🎯 Usage Examples

### 1. Basic User Suspension

```javascript
import edgeFunctionsService from '../services/supabase/edgeFunctions';

const suspendStudent = async (studentId) => {
  try {
    const result = await edgeFunctionsService.suspendUser(
      studentId,
      'student',
      'Violation of school policies',
      null, // Will use current user
      null  // Indefinite suspension
    );
    
    if (result.success) {
      toast.success(result.message);
    }
  } catch (error) {
    toast.error('Failed to suspend student');
  }
};
```

### 2. Temporary Suspension

```javascript
const temporarySuspension = async (userId, userType) => {
  const suspendedUntil = new Date();
  suspendedUntil.setDate(suspendedUntil.getDate() + 30); // 30 days

  const result = await edgeFunctionsService.suspendUser(
    userId,
    userType,
    'Temporary suspension for review',
    null,
    suspendedUntil.toISOString()
  );
};
```

### 3. Reactivate User

```javascript
const reactivateUser = async (userId, userType) => {
  const result = await edgeFunctionsService.reactivateUser(
    userId,
    userType,
    null, // Will use current user
    'Appeal approved by administration'
  );
};
```

### 4. Graduate Student

```javascript
const graduateStudent = async (studentId) => {
  const result = await edgeFunctionsService.graduateStudent(
    studentId,
    null, // Will use current user
    new Date().toISOString(),
    'Successfully completed all requirements'
  );
};
```

### 5. Update Status with Metadata

```javascript
const updateUserStatus = async (userId, userType, newStatus) => {
  const result = await edgeFunctionsService.updateUserStatus(
    userId,
    userType,
    newStatus,
    {
      reason: 'Administrative decision',
      notes: 'Updated via admin panel',
      effectiveDate: new Date().toISOString(),
      updatedBy: currentUserId
    }
  );
};
```

## 🔐 Permissions & Security

### Role-Based Access Control

- **Super Admins**: Can suspend/reactivate any user including other admins
- **Admins**: Can suspend/reactivate students and teachers, but not other admins
- **Teachers/Students**: Cannot suspend or reactivate users

### Security Features

1. **Self-Protection**: Users cannot suspend themselves
2. **Admin Protection**: Only super admins can suspend other admins
3. **JWT Verification**: All requests require valid authentication
4. **Audit Logging**: All status changes are logged for accountability
5. **Status Validation**: Prevents invalid status transitions

## 📊 Status Transitions

### Valid Status Transitions

```
active → suspended (with reason)
active → graduated (students only)
active → deleted (soft delete)

suspended → active (reactivation)
suspended → deleted (escalation)

graduated → active (rare, readmission)
deleted → active (restoration)
```

### Business Rules

- Only students can be graduated
- Deleted users can only be reactivated to active status
- Suspended users must provide a reason for suspension
- Status changes are logged with timestamps and user IDs

## 🎨 UI Integration

### Add Suspend/Reactivate Buttons

```jsx
import { SuspendButton, ReactivateButton } from '../components/ui/ActionButtons';

const UserActionsCell = ({ user, onStatusChange }) => {
  const handleSuspend = async () => {
    const result = await edgeFunctionsService.suspendUser(
      user.id,
      user.role,
      'Policy violation'
    );
    if (result.success) {
      onStatusChange(user.id, 'suspended');
    }
  };

  const handleReactivate = async () => {
    const result = await edgeFunctionsService.reactivateUser(
      user.id,
      user.role,
      null,
      'Appeal approved'
    );
    if (result.success) {
      onStatusChange(user.id, 'active');
    }
  };

  return (
    <div className="flex space-x-2">
      {user.status === 'active' && (
        <SuspendButton onClick={handleSuspend} />
      )}
      {user.status === 'suspended' && (
        <ReactivateButton onClick={handleReactivate} />
      )}
    </div>
  );
};
```

### Status Badge Component

```jsx
const StatusBadge = ({ status }) => {
  const statusConfig = {
    active: { color: 'green', text: 'Active' },
    suspended: { color: 'red', text: 'Suspended' },
    graduated: { color: 'blue', text: 'Graduated' },
    deleted: { color: 'gray', text: 'Deleted' }
  };

  const config = statusConfig[status] || statusConfig.active;

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium bg-${config.color}-100 text-${config.color}-800`}>
      {config.text}
    </span>
  );
};
```

## 🔍 Monitoring & Analytics

### Status History Tracking

```javascript
const getStatusHistory = async (userId, userType) => {
  const result = await edgeFunctionsService.getUserStatusHistory(userId, userType);
  
  if (result.success) {
    // Display status change timeline
    result.data.history.forEach(change => {
      console.log(`${change.timestamp}: ${change.oldStatus} → ${change.newStatus}`);
      console.log(`Reason: ${change.reason}`);
      console.log(`Changed by: ${change.changedBy}`);
    });
  }
};
```

### Bulk Operations for Reports

```javascript
// Get all suspended users
const getSuspendedUsers = async () => {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('status', 'suspended')
    .order('suspended_at', { ascending: false });
    
  return data;
};

// Get graduation statistics
const getGraduationStats = async (year) => {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('status', 'graduated')
    .gte('graduated_at', `${year}-01-01`)
    .lt('graduated_at', `${year + 1}-01-01`);
    
  return data;
};
```

## 🚨 Error Handling

### Common Error Scenarios

```javascript
const handleSuspendUser = async (userId, userType) => {
  try {
    const result = await edgeFunctionsService.suspendUser(userId, userType, reason);
    
    if (!result.success) {
      // Handle specific error cases
      switch (result.error) {
        case 'User is already suspended':
          toast.warning('This user is already suspended');
          break;
        case 'You cannot suspend yourself':
          toast.error('You cannot suspend your own account');
          break;
        case 'Only super admins can suspend other admins':
          toast.error('Insufficient permissions');
          break;
        default:
          toast.error(result.error || 'Failed to suspend user');
      }
    }
  } catch (error) {
    console.error('Suspension error:', error);
    toast.error('Network error occurred');
  }
};
```

## 📋 Testing

### Test the Edge Functions

```javascript
// Test suspension
const testSuspension = async () => {
  const testUserId = 'test-user-id';
  const result = await edgeFunctionsService.suspendUser(
    testUserId,
    'student',
    'Test suspension'
  );
  console.log('Suspension test result:', result);
};

// Test reactivation
const testReactivation = async () => {
  const testUserId = 'test-user-id';
  const result = await edgeFunctionsService.reactivateUser(
    testUserId,
    'student',
    null,
    'Test reactivation'
  );
  console.log('Reactivation test result:', result);
};
```

## 🎉 Conclusion

Your user suspension system is now ready! The EdgeFunctionsService provides a centralized, secure way to manage user statuses with proper authentication, authorization, and audit logging.

### Key Benefits

- ✅ Centralized status management
- ✅ Role-based access control
- ✅ Comprehensive audit logging
- ✅ Flexible metadata support
- ✅ Bulk operations support
- ✅ Type-safe TypeScript implementation
- ✅ Consistent error handling

### Next Steps

1. Deploy the Edge Functions to your Supabase project
2. Update your database schema with the new columns
3. Integrate the suspend/reactivate buttons into your UI
4. Test the functionality with different user roles
5. Set up monitoring and analytics for user status changes

For any issues or questions, refer to the example components and usage patterns provided in this guide.