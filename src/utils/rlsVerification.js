import { supabase } from '../lib/supabaseClient';

/**
 * RLS Policy Verification Utility
 * Tests current Row Level Security policies and provides recommendations
 */

export const verifyRLSPolicies = async () => {
  const results = {
    timestamp: new Date().toISOString(),
    currentUser: null,
    userProfile: null,
    tests: [],
    recommendations: [],
    summary: {
      passed: 0,
      failed: 0,
      total: 0
    }
  };

  try {
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    results.currentUser = user ? { id: user.id, email: user.email } : null;

    if (userError) {
      results.tests.push({
        name: 'Authentication Check',
        status: 'failed',
        error: userError.message,
        recommendation: 'User must be authenticated to test RLS policies'
      });
      return results;
    }

    if (!user) {
      results.tests.push({
        name: 'Authentication Check',
        status: 'failed',
        error: 'No authenticated user',
        recommendation: 'Please log in to test RLS policies'
      });
      return results;
    }

    // Get user profile
    try {
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileError) {
        results.tests.push({
          name: 'User Profile Access',
          status: 'failed',
          error: profileError.message,
          recommendation: 'RLS may be blocking profile access or profile does not exist'
        });
      } else {
        results.userProfile = profile;
        results.tests.push({
          name: 'User Profile Access',
          status: 'passed',
          details: `Can access own profile (${profile.role})`
        });
      }
    } catch (error) {
      results.tests.push({
        name: 'User Profile Access',
        status: 'failed',
        error: error.message,
        recommendation: 'Check user_profiles RLS policies'
      });
    }

    // Test 1: Check if RLS is enabled on critical tables
    const criticalTables = ['user_profiles', 'exam_results', 'grades', 'attendance'];
    
    for (const table of criticalTables) {
      try {
        // Try to access table - this will fail if RLS is properly configured and user lacks permission
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .limit(1);

        if (error) {
          // If error is about insufficient privileges, RLS is working
          if (error.message.includes('insufficient_privilege') || 
              error.message.includes('row-level security') ||
              error.code === '42501') {
            results.tests.push({
              name: `RLS Protection - ${table}`,
              status: 'passed',
              details: 'Table is protected by RLS policies'
            });
          } else {
            results.tests.push({
              name: `RLS Protection - ${table}`,
              status: 'warning',
              error: error.message,
              recommendation: 'Unexpected error - check table configuration'
            });
          }
        } else {
          // If we can access data, check if it's appropriate for user role
          const userRole = results.userProfile?.role;
          if (table === 'user_profiles' && data.length > 0) {
            // For user_profiles, we should only see our own profile or profiles we're allowed to see
            const hasOwnProfile = data.some(row => row.id === user.id);
            const hasOtherProfiles = data.some(row => row.id !== user.id);
            
            if (hasOwnProfile && !hasOtherProfiles) {
              results.tests.push({
                name: `RLS Protection - ${table}`,
                status: 'passed',
                details: 'Can only access own profile'
              });
            } else if (hasOtherProfiles && ['admin', 'super_admin', 'teacher'].includes(userRole)) {
              results.tests.push({
                name: `RLS Protection - ${table}`,
                status: 'passed',
                details: `${userRole} can access other profiles as expected`
              });
            } else {
              results.tests.push({
                name: `RLS Protection - ${table}`,
                status: 'warning',
                details: 'Unexpected access pattern - review policies',
                recommendation: 'Check if RLS policies match intended access control'
              });
            }
          } else {
            results.tests.push({
              name: `RLS Protection - ${table}`,
              status: 'info',
              details: `Can access ${table} (${data.length} rows visible)`
            });
          }
        }
      } catch (error) {
        results.tests.push({
          name: `RLS Protection - ${table}`,
          status: 'failed',
          error: error.message,
          recommendation: `Check ${table} table exists and RLS policies are configured`
        });
      }
    }

    // Test 2: Check public access tables
    const publicTables = ['news_events', 'carousel_images', 'classes', 'subjects'];
    
    for (const table of publicTables) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .limit(1);

        if (error) {
          results.tests.push({
            name: `Public Access - ${table}`,
            status: 'failed',
            error: error.message,
            recommendation: `${table} should be accessible to authenticated users`
          });
        } else {
          results.tests.push({
            name: `Public Access - ${table}`,
            status: 'passed',
            details: `Can access ${table} (${data.length} rows visible)`
          });
        }
      } catch (error) {
        results.tests.push({
          name: `Public Access - ${table}`,
          status: 'failed',
          error: error.message,
          recommendation: `Check ${table} table configuration`
        });
      }
    }

    // Test 3: Test write operations (should be restricted)
    const userRole = results.userProfile?.role;
    
    // Try to create a test record in user_profiles (should fail for non-admins)
    if (userRole && !['admin', 'super_admin'].includes(userRole)) {
      try {
        const { error } = await supabase
          .from('user_profiles')
          .insert({
            email: 'test@example.com',
            full_name: 'Test User',
            role: 'student'
          });

        if (error) {
          results.tests.push({
            name: 'Write Protection - user_profiles',
            status: 'passed',
            details: 'Non-admin cannot create user profiles'
          });
        } else {
          results.tests.push({
            name: 'Write Protection - user_profiles',
            status: 'failed',
            details: 'Non-admin was able to create user profile',
            recommendation: 'Review INSERT policies on user_profiles'
          });
        }
      } catch (error) {
        results.tests.push({
          name: 'Write Protection - user_profiles',
          status: 'passed',
          details: 'Write operation properly blocked'
        });
      }
    }

    // Calculate summary
    results.tests.forEach(test => {
      results.summary.total++;
      if (test.status === 'passed') {
        results.summary.passed++;
      } else if (test.status === 'failed') {
        results.summary.failed++;
      }
    });

    // Generate recommendations
    if (results.summary.failed > 0) {
      results.recommendations.push('Some RLS policies may need adjustment - review failed tests');
    }
    
    if (!results.userProfile) {
      results.recommendations.push('User profile not accessible - ensure user has a profile in user_profiles table');
    }

    if (results.summary.passed === results.summary.total) {
      results.recommendations.push('All tests passed - RLS policies appear to be working correctly');
    }

  } catch (error) {
    results.tests.push({
      name: 'RLS Verification',
      status: 'failed',
      error: error.message,
      recommendation: 'Check database connection and authentication'
    });
  }

  return results;
};

/**
 * Quick RLS status check
 */
export const quickRLSCheck = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return {
        status: 'unauthenticated',
        message: 'Please log in to check RLS status'
      };
    }

    // Try to access user_profiles
    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select('id, role, is_active')
      .eq('id', user.id)
      .single();

    if (error) {
      return {
        status: 'blocked',
        message: 'RLS is blocking access (this might be expected)',
        error: error.message
      };
    }

    return {
      status: 'accessible',
      message: `RLS allows access for ${profile.role}`,
      userRole: profile.role,
      isActive: profile.is_active
    };

  } catch (error) {
    return {
      status: 'error',
      message: 'Error checking RLS status',
      error: error.message
    };
  }
};

/**
 * Check if specific RLS policies exist
 */
export const checkPolicyExists = async (tableName, policyName) => {
  try {
    // This requires a custom RPC function in Supabase
    const { data, error } = await supabase
      .rpc('check_policy_exists', {
        table_name: tableName,
        policy_name: policyName
      });

    if (error) {
      return {
        exists: false,
        error: 'RPC function not available - cannot check policy existence'
      };
    }

    return {
      exists: data,
      message: data ? 'Policy exists' : 'Policy not found'
    };
  } catch (error) {
    return {
      exists: false,
      error: error.message
    };
  }
};