# 🚀 Edge Functions Migration Guide

## Phase 1: Core User Management Migration

### Step 1: Deploy Edge Functions

```bash
# Install Supabase CLI if not already installed
npm install -g supabase

# Login to Supabase
supabase login

# Link your project
supabase link --project-ref YOUR_PROJECT_REF

# Deploy Edge Functions
supabase functions deploy create-teacher
supabase functions deploy create-student

# Set environment variables
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### Step 2: Update Import Statements

Replace existing imports in your components:

**Before:**
```javascript
import { createTeacher } from '../../services/supabase/teacherService';
import { createStudent } from '../../services/supabase/studentService';
```

**After:**
```javascript
import { createTeacher } from '../../services/supabase/migrationWrapper';
import { createStudent } from '../../services/supabase/migrationWrapper';
```

### Step 3: Test Migration

1. **Enable Edge Functions**: Set `USE_EDGE_FUNCTIONS_FOR_TEACHERS=true` in your `.env` file
2. **Test Teacher Creation**: Try creating a teacher through the UI
3. **Monitor Console**: Check for "🚀 Using Edge Function" messages
4. **Fallback Testing**: Temporarily break the Edge Function to test fallback

### Step 4: Gradual Rollout

```javascript
// In migrationWrapper.js, gradually enable features:
const FEATURE_FLAGS = {
  USE_EDGE_FUNCTIONS_FOR_TEACHERS: true,  // ✅ Phase 1
  USE_EDGE_FUNCTIONS_FOR_STUDENTS: true,  // ✅ Phase 1
  USE_EDGE_FUNCTIONS_FOR_ADMINS: false,   // 🔄 Phase 2
  USE_EDGE_FUNCTIONS_FOR_REPORTS: false,  // 🔄 Phase 3
  USE_EDGE_FUNCTIONS_FOR_BULK_OPS: false, // 🔄 Phase 3
};
```

## Phase 2: Authentication & Authorization (Next Steps)

### Functions to Create:
- `update-user` - Update user profiles
- `delete-user` - Delete users with proper cleanup
- `create-admin` - Admin user creation
- `reset-password` - Password reset functionality

### Benefits After Phase 1:
- ✅ **Security**: No more admin API keys in client code
- ✅ **Reliability**: No more session conflicts during user creation
- ✅ **Consistency**: Unified user creation process
- ✅ **Scalability**: Server-side validation and processing
- ✅ **Monitoring**: Centralized logging and error handling

## Phase 3: Business Logic Migration

### Functions to Create:
- `generate-report` - Report generation
- `bulk-operations` - Bulk user operations
- `send-notification` - Email/SMS notifications
- `process-uploads` - File upload processing

## Monitoring & Debugging

### Check Migration Status:
```javascript
import { migrationControl } from './services/supabase/migrationWrapper';

// Get current status
const status = migrationControl.getMigrationStats();
console.log('Migration Progress:', status);

// Test Edge Functions
const testResults = await migrationControl.testEdgeFunctions();
console.log('Edge Function Tests:', testResults);
```

### Environment Variables:
```env
# Override feature flags
VITE_USE_EDGE_FUNCTIONS_FOR_TEACHERS=true
VITE_USE_EDGE_FUNCTIONS_FOR_STUDENTS=true

# Supabase configuration
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

## Rollback Plan

If issues occur, you can instantly rollback by:

1. **Disable Feature Flags**: Set all flags to `false`
2. **Revert Imports**: Change back to direct service imports
3. **Monitor**: Check that legacy methods work correctly

## Success Metrics

- ✅ Teacher creation works without session conflicts
- ✅ Student creation works consistently
- ✅ No admin API keys exposed in client code
- ✅ Proper error handling and logging
- ✅ Fallback mechanisms work correctly