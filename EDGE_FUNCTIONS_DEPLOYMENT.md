# 🚀 Edge Functions Deployment Guide

## 📋 Prerequisites

1. **Supabase CLI installed**: `npm install -g supabase`
2. **Project linked**: Your project should already be linked to `ryiqdiqcmvwdotnrosac`
3. **Service Role Key**: Available from your Supabase Dashboard

## 🔧 Step-by-Step Deployment

### Step 1: Deploy Edge Functions

Run the deployment script:
```bash
# Windows
deploy-functions.bat

# Or manually:
supabase functions deploy create-teacher
supabase functions deploy create-student
supabase functions deploy create-admin
```

### Step 2: Set Service Role Key

Get your service role key from Supabase Dashboard → Settings → API → service_role key

```bash
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

### Step 3: Update Environment Variables

Add to your `.env` file:
```env
# Enable Edge Functions for all user types
VITE_USE_EDGE_FUNCTIONS_FOR_TEACHERS=true
VITE_USE_EDGE_FUNCTIONS_FOR_STUDENTS=true
VITE_USE_EDGE_FUNCTIONS_FOR_ADMINS=true

# Your existing Supabase config
VITE_SUPABASE_URL=https://ryiqdiqcmvwdotnrosac.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
```

### Step 4: Update Import Statements

**IMPORTANT**: Update your teacher service imports to use the migration wrapper:

**In `src/pages/dashboard/Teachers.jsx`:**
```javascript
// Change from:
import { getAllTeachers, createTeacher, deleteTeacher } from '../../services/supabase/teacherService';

// To:
import { getAllTeachers, createTeacher, deleteTeacher } from '../../services/supabase/migrationWrapper';
```

**In any other files using teacher services:**
```javascript
// Change from:
import { createTeacher } from '../../services/supabase/teacherService';

// To:
import { createTeacher } from '../../services/supabase/migrationWrapper';
```

### Step 5: Test the Migration

1. **Open your app** and navigate to Teacher Management
2. **Check the Edge Function Test** component - it should show:
   - Migration status with teachers enabled
   - Edge Function connectivity tests
3. **Try creating a teacher** - you should see console logs showing "🚀 Using Edge Function"
4. **Verify success** - teacher should be created without foreign key errors

## 🔍 Troubleshooting

### Edge Functions Not Deploying
```bash
# Check if you're logged in
supabase status

# Re-link project if needed
supabase link --project-ref ryiqdiqcmvwdotnrosac
```

### Service Role Key Issues
- Make sure you're using the **service_role** key, not the anon key
- The key should start with `eyJ...`
- Set it using: `supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_key`

### Edge Functions Not Working
1. **Check deployment**: `supabase functions list`
2. **Check logs**: `supabase functions logs create-teacher`
3. **Test connectivity**: Use the Edge Function Test component
4. **Fallback**: The system will automatically fall back to legacy methods if Edge Functions fail

### Teacher Creation Still Failing
1. **Check console logs** for "🚀 Using Edge Function" message
2. **Verify feature flag**: `VITE_USE_EDGE_FUNCTIONS_FOR_TEACHERS=true`
3. **Check import statements** - make sure you're importing from `migrationWrapper`
4. **Test Edge Function directly** using the test component

## 📊 Monitoring Success

### Console Log Messages to Look For:

**✅ Success Messages:**
```
🚀 Using Edge Function for teacher creation
✅ Edge Function create-teacher success
✅ Teacher created successfully
```

**❌ Fallback Messages:**
```
⚠️ Edge Function failed, falling back to legacy method
🔄 Using legacy method for teacher creation
```

### Edge Function Test Results:
- **Migration Status**: Should show teachers enabled
- **Edge Function Tests**: Should show ✅ Connected for both endpoints
- **Feature Flags**: Teachers should show ✅ Enabled

## 🎯 Expected Benefits

After successful deployment:

1. **✅ No More Foreign Key Errors**: Teacher creation will work reliably
2. **✅ No Session Conflicts**: Admin can create teachers while logged in
3. **✅ Enhanced Security**: Admin API keys moved server-side
4. **✅ Better Error Handling**: Centralized error management
5. **✅ Automatic Fallback**: Falls back to legacy methods if needed

## 🔄 Rollback Plan

If something goes wrong:

1. **Disable Edge Functions**:
   ```env
   VITE_USE_EDGE_FUNCTIONS_FOR_TEACHERS=false
   ```

2. **Revert Import Statements**:
   ```javascript
   // Change back to:
   import { createTeacher } from '../../services/supabase/teacherService';
   ```

3. **Clear Browser Cache** and test teacher creation

## 📈 Next Steps

Once teacher Edge Functions are working:

1. **Enable Student Edge Functions**: `VITE_USE_EDGE_FUNCTIONS_FOR_STUDENTS=true`
2. **Deploy Admin Functions**: Create `create-admin` Edge Function
3. **Add More Features**: Reports, bulk operations, notifications

## 🆘 Getting Help

If you encounter issues:

1. **Check the console logs** for detailed error messages
2. **Use the Edge Function Test** component to diagnose connectivity
3. **Check Supabase Dashboard** → Edge Functions for deployment status
4. **Review the migration wrapper** logs for fallback behavior

The migration is designed to be safe with automatic fallbacks, so your existing functionality should continue working even if Edge Functions have issues.
