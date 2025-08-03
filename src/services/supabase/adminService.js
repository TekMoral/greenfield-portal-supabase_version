import { supabase } from '../../lib/supabaseClient';

/**
 * Create a new admin user
 */
export const createAdmin = async (adminData) => {
  try {
    // Create user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: adminData.email,
      password: adminData.password,
      email_confirm: true,
      user_metadata: {
        full_name: adminData.name,
        role: 'admin'
      }
    });

    if (authError) {
      console.error('Supabase auth error creating admin:', authError);
      return { success: false, error: authError.message };
    }

    // Create user profile
    const { data: profileData, error: profileError } = await supabase
      .from('user_profiles')
      .insert({
        user_id: authData.user.id,
        email: adminData.email,
        full_name: adminData.name,
        role: 'admin',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (profileError) {
      console.error('Supabase error creating admin profile:', profileError);
      // Try to clean up the auth user if profile creation failed
      await supabase.auth.admin.deleteUser(authData.user.id);
      return { success: false, error: profileError.message };
    }

    return { 
      success: true, 
      data: {
        uid: authData.user.id,
        profile: profileData
      }
    };
  } catch (error) {
    console.error('Error creating admin:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get all admin users
 */
export const getAllAdmins = async () => {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .in('role', ['admin', 'super_admin'])
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase error fetching admins:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Error fetching admins:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Update admin information
 */
export const updateAdmin = async (adminId, updateData) => {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .update({
        ...updateData,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', adminId)
      .select()
      .single();

    if (error) {
      console.error('Supabase error updating admin:', error);
      return { success: false, error: error.message };
    }

    // If email is being updated, also update in auth
    if (updateData.email) {
      const { error: authError } = await supabase.auth.admin.updateUserById(adminId, {
        email: updateData.email
      });

      if (authError) {
        console.error('Supabase auth error updating admin email:', authError);
        // Note: Profile is already updated, but auth email update failed
        return { 
          success: false, 
          error: `Profile updated but email update failed: ${authError.message}` 
        };
      }
    }

    return { success: true, data };
  } catch (error) {
    console.error('Error updating admin:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Update admin status (active/inactive)
 */
export const updateAdminStatus = async (adminId, isActive) => {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .update({
        is_active: isActive,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', adminId)
      .select()
      .single();

    if (error) {
      console.error('Supabase error updating admin status:', error);
      return { success: false, error: error.message };
    }

    // If deactivating, also disable the auth user
    if (!isActive) {
      const { error: authError } = await supabase.auth.admin.updateUserById(adminId, {
        ban_duration: 'none', // This effectively disables the user
        user_metadata: { is_active: false }
      });

      if (authError) {
        console.error('Supabase auth error disabling admin:', authError);
        // Profile is updated but auth disable failed
      }
    } else {
      // If reactivating, enable the auth user
      const { error: authError } = await supabase.auth.admin.updateUserById(adminId, {
        ban_duration: '0', // Remove any ban
        user_metadata: { is_active: true }
      });

      if (authError) {
        console.error('Supabase auth error enabling admin:', authError);
        // Profile is updated but auth enable failed
      }
    }

    return { success: true, data };
  } catch (error) {
    console.error('Error updating admin status:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Delete admin user
 */
export const deleteAdmin = async (adminId) => {
  try {
    // First delete the user profile
    const { error: profileError } = await supabase
      .from('user_profiles')
      .delete()
      .eq('user_id', adminId);

    if (profileError) {
      console.error('Supabase error deleting admin profile:', profileError);
      return { success: false, error: profileError.message };
    }

    // Then delete the auth user
    const { error: authError } = await supabase.auth.admin.deleteUser(adminId);

    if (authError) {
      console.error('Supabase auth error deleting admin:', authError);
      return { 
        success: false, 
        error: `Profile deleted but auth user deletion failed: ${authError.message}` 
      };
    }

    return { success: true };
  } catch (error) {
    console.error('Error deleting admin:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get admin profile by user ID
 */
export const getAdminProfile = async (adminId) => {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', adminId)
      .in('role', ['admin', 'super_admin'])
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return { success: false, error: 'Admin not found' };
      }
      console.error('Supabase error fetching admin profile:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Error fetching admin profile:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Check if user is admin
 */
export const isUserAdmin = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('role, is_super_admin')
      .eq('user_id', userId)
      .single();

    if (error) {
      console.error('Supabase error checking admin status:', error);
      return { success: false, error: error.message };
    }

    const isAdmin = data.role === 'admin' || data.role === 'super_admin' || data.is_super_admin;

    return { 
      success: true, 
      data: {
        isAdmin,
        role: data.role,
        isSuperAdmin: data.is_super_admin
      }
    };
  } catch (error) {
    console.error('Error checking admin status:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get admin statistics
 */
export const getAdminStatistics = async () => {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('role, is_active, created_at')
      .in('role', ['admin', 'super_admin']);

    if (error) {
      console.error('Supabase error fetching admin statistics:', error);
      return { success: false, error: error.message };
    }

    const stats = {
      totalAdmins: data.length,
      activeAdmins: data.filter(admin => admin.is_active).length,
      inactiveAdmins: data.filter(admin => !admin.is_active).length,
      superAdmins: data.filter(admin => admin.role === 'super_admin').length,
      regularAdmins: data.filter(admin => admin.role === 'admin').length,
      recentAdmins: data
        .filter(admin => {
          const createdDate = new Date(admin.created_at);
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          return createdDate > thirtyDaysAgo;
        }).length
    };

    return { success: true, data: stats };
  } catch (error) {
    console.error('Error fetching admin statistics:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Promote user to admin
 */
export const promoteToAdmin = async (userId, adminLevel = 'admin') => {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .update({
        role: adminLevel,
        is_super_admin: adminLevel === 'super_admin',
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      console.error('Supabase error promoting user to admin:', error);
      return { success: false, error: error.message };
    }

    // Update auth user metadata
    const { error: authError } = await supabase.auth.admin.updateUserById(userId, {
      user_metadata: {
        role: adminLevel,
        is_super_admin: adminLevel === 'super_admin'
      }
    });

    if (authError) {
      console.error('Supabase auth error updating user metadata:', authError);
      // Profile is updated but auth metadata update failed
    }

    return { success: true, data };
  } catch (error) {
    console.error('Error promoting user to admin:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Demote admin to regular user
 */
export const demoteAdmin = async (adminId, newRole = 'user') => {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .update({
        role: newRole,
        is_super_admin: false,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', adminId)
      .select()
      .single();

    if (error) {
      console.error('Supabase error demoting admin:', error);
      return { success: false, error: error.message };
    }

    // Update auth user metadata
    const { error: authError } = await supabase.auth.admin.updateUserById(adminId, {
      user_metadata: {
        role: newRole,
        is_super_admin: false
      }
    });

    if (authError) {
      console.error('Supabase auth error updating user metadata:', authError);
      // Profile is updated but auth metadata update failed
    }

    return { success: true, data };
  } catch (error) {
    console.error('Error demoting admin:', error);
    return { success: false, error: error.message };
  }
};

// Export as service object for easier usage
export const adminService = {
  createAdmin,
  getAllAdmins,
  updateAdmin,
  updateAdminStatus,
  deleteAdmin,
  getAdminProfile,
  isUserAdmin,
  getAdminStatistics,
  promoteToAdmin,
  demoteAdmin
};