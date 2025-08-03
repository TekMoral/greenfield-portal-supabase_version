// import { supabase } from '../../lib/supabaseClient';

// // Helper function to generate employee ID
// const generateEmployeeId = async () => {
//   const year = new Date().getFullYear();
//   const { count } = await supabase
//     .from('user_profiles')
//     .select('*', { count: 'exact', head: true })
//     .eq('role', 'teacher');

//   const nextNumber = (count || 0) + 1;
//   return `TCH${year}${nextNumber.toString().padStart(4, '0')}`;
// };

// // Helper function to upload profile image
// const uploadProfileImage = async (file, teacherId) => {
//   if (!file) return null;

//   try {
//     const fileExt = file.name.split('.').pop();
//     const fileName = `${teacherId}-${Date.now()}.${fileExt}`;
//     const filePath = `teacher-profiles/${fileName}`;

//     const { data, error } = await supabase.storage
//       .from('profile-images')
//       .upload(filePath, file);

//     if (error) throw error;

//     const { data: { publicUrl } } = supabase.storage
//       .from('profile-images')
//       .getPublicUrl(filePath);

//     return publicUrl;
//   } catch (error) {
//     console.error('Error uploading profile image:', error);
//     return null;
//   }
// };

// // Teacher Service using Supabase
// export const teacherService = {
//   // Create a new teacher
//   async createTeacher(teacherData) {
//     try {
//       console.log('🔄 Creating teacher with data:', teacherData);

//       // Generate employee ID
//       const employeeId = await generateEmployeeId();
//       console.log('📝 Generated employee ID:', employeeId);

//       // First create the auth user
//       const { data: authData, error: authError } = await supabase.auth.signUp({
//         email: teacherData.email,
//         password: teacherData.password,
//         options: {
//           data: {
//             full_name: teacherData.name,
//             role: 'teacher'
//           }
//         }
//       });

//       if (authError) {
//         console.error('❌ Auth error:', authError);
//         throw authError;
//       }

//       console.log('✅ Auth user created:', authData.user.id);

//       // Upload profile image if provided
//       let profileImageUrl = null;
//       if (teacherData.profileImage) {
//         console.log('🔄 Uploading profile image...');
//         profileImageUrl = await uploadProfileImage(teacherData.profileImage, authData.user.id);
//         console.log('📸 Profile image uploaded:', profileImageUrl);
//       }

//       // Create/update user profile with teacher data
//       const { data: profileData, error: profileError } = await supabase
//         .from('user_profiles')
//         .upsert({
//           id: authData.user.id,
//           email: teacherData.email,
//           full_name: teacherData.name,
//           role: 'teacher',
//           phone_number: teacherData.phoneNumber,
//           employee_id: employeeId,
//           qualification: teacherData.qualification,
//           specialization: teacherData.subject, // Using subject as specialization
//           hire_date: teacherData.dateHired,
//           profile_image: profileImageUrl,
//           is_active: true,
//           status: 'active'
//         })
//         .select()
//         .single();

//       if (profileError) {
//         console.error('❌ Profile error:', profileError);
//         throw profileError;
//       }

//       console.log('✅ Teacher profile created:', profileData);

//       // Return the teacher data in the format expected by the UI
//       const result = {
//         id: profileData.id,
//         uid: profileData.id,
//         name: profileData.full_name,
//         email: profileData.email,
//         phoneNumber: profileData.phone_number,
//         subject: profileData.specialization,
//         qualification: profileData.qualification,
//         dateHired: profileData.hire_date,
//         profileImageUrl: profileData.profile_image,
//         isActive: profileData.is_active,
//         employeeId: profileData.employee_id
//       };

//       return { success: true, data: result };
//     } catch (error) {
//       console.error('❌ Error creating teacher:', error);
//       return { success: false, error: error.message };
//     }
//   },

//   // Get all teachers
//   async getAllTeachers() {
//     try {
//       console.log('🔄 Fetching all teachers...');

//       const { data, error } = await supabase
//         .from('user_profiles')
//         .select('*')
//         .eq('role', 'teacher')
//         .eq('status', 'active')
//         .order('created_at', { ascending: false });

//       if (error) {
//         console.error('❌ Error fetching teachers:', error);
//         throw error;
//       }

//       console.log('✅ Teachers fetched:', data?.length || 0);

//       // Transform data to match UI expectations
//       const transformedData = data?.map(teacher => ({
//         id: teacher.id,
//         uid: teacher.id,
//         name: teacher.full_name,
//         email: teacher.email,
//         phoneNumber: teacher.phone_number,
//         subject: teacher.specialization,
//         qualification: teacher.qualification,
//         dateHired: teacher.hire_date,
//         profileImageUrl: teacher.profile_image,
//         isActive: teacher.is_active,
//         employeeId: teacher.employee_id
//       })) || [];

//       return { success: true, data: transformedData };
//     } catch (error) {
//       console.error('��� Error fetching teachers:', error);
//       return { success: false, error: error.message };
//     }
//   },

//   // Get teacher by ID
//   async getTeacherById(teacherId) {
//     try {
//       const { data, error } = await supabase
//         .from('user_profiles')
//         .select('*')
//         .eq('id', teacherId)
//         .eq('role', 'teacher')
//         .single();

//       if (error) throw error;

//       // Transform data to match UI expectations
//       const result = {
//         id: data.id,
//         uid: data.id,
//         name: data.full_name,
//         email: data.email,
//         phoneNumber: data.phone_number,
//         subject: data.specialization,
//         qualification: data.qualification,
//         dateHired: data.hire_date,
//         profileImageUrl: data.profile_image,
//         isActive: data.is_active,
//         employeeId: data.employee_id
//       };

//       return { success: true, data: result };
//     } catch (error) {
//       console.error('Error fetching teacher:', error);
//       return { success: false, error: error.message };
//     }
//   },

//   // Get teacher by user ID (alias for getTeacherById)
//   async getTeacherByUserId(userId) {
//     return this.getTeacherById(userId);
//   },

//   // Get teacher by UID (alias for getTeacherById)
//   async getTeacherByUid(uid) {
//     return this.getTeacherById(uid);
//   },

//   // Get teacher by employee ID
//   async getTeacherByEmployeeId(employeeId) {
//     try {
//       const { data, error } = await supabase
//         .from('user_profiles')
//         .select('*')
//         .eq('employee_id', employeeId)
//         .eq('role', 'teacher')
//         .single();

//       if (error) throw error;

//       // Transform data to match UI expectations
//       const result = {
//         id: data.id,
//         uid: data.id,
//         name: data.full_name,
//         email: data.email,
//         phoneNumber: data.phone_number,
//         subject: data.specialization,
//         qualification: data.qualification,
//         dateHired: data.hire_date,
//         profileImageUrl: data.profile_image,
//         isActive: data.is_active,
//         employeeId: data.employee_id
//       };

//       return { success: true, data: result };
//     } catch (error) {
//       console.error('Error fetching teacher by employee ID:', error);
//       return { success: false, error: error.message };
//     }
//   },

//   // Update teacher
//   async updateTeacher(teacherId, updateData) {
//     try {
//       console.log('🔄 Updating teacher:', teacherId, updateData);

//       // Handle profile image upload if provided
//       let profileImageUrl = updateData.profileImageUrl;
//       if (updateData.profileImage && typeof updateData.profileImage !== 'string') {
//         console.log('🔄 Uploading new profile image...');
//         profileImageUrl = await uploadProfileImage(updateData.profileImage, teacherId);
//         console.log('📸 New profile image uploaded:', profileImageUrl);
//       }

//       const { data, error } = await supabase
//         .from('user_profiles')
//         .update({
//           full_name: updateData.name,
//           email: updateData.email,
//           phone_number: updateData.phoneNumber,
//           specialization: updateData.subject,
//           qualification: updateData.qualification,
//           hire_date: updateData.dateHired,
//           profile_image: profileImageUrl,
//           is_active: updateData.isActive,
//           updated_at: new Date().toISOString()
//         })
//         .eq('id', teacherId)
//         .eq('role', 'teacher')
//         .select()
//         .single();

//       if (error) throw error;

//       console.log('✅ Teacher updated:', data);

//       // Transform data to match UI expectations
//       const result = {
//         id: data.id,
//         uid: data.id,
//         name: data.full_name,
//         email: data.email,
//         phoneNumber: data.phone_number,
//         subject: data.specialization,
//         qualification: data.qualification,
//         dateHired: data.hire_date,
//         profileImageUrl: data.profile_image,
//         isActive: data.is_active,
//         employeeId: data.employee_id
//       };

//       return { success: true, data: result };
//     } catch (error) {
//       console.error('❌ Error updating teacher:', error);
//       return { success: false, error: error.message };
//     }
//   },

//   // Delete teacher (soft delete)
//   async deleteTeacher(teacherId) {
//     try {
//       console.log('🔄 Deleting teacher:', teacherId);

//       const { data, error } = await supabase
//         .from('user_profiles')
//         .update({
//           status: 'inactive',
//           is_active: false,
//           updated_at: new Date().toISOString()
//         })
//         .eq('id', teacherId)
//         .eq('role', 'teacher')
//         .select()
//         .single();

//       if (error) throw error;

//       console.log('✅ Teacher deleted (soft delete):', data);
//       return { success: true, data };
//     } catch (error) {
//       console.error('❌ Error deleting teacher:', error);
//       return { success: false, error: error.message };
//     }
//   },

//   // Get teacher's subjects and classes
//   async getTeacherSubjects(teacherId) {
//     try {
//       const { data, error } = await supabase
//         .from('teacher_assignments')
//         .select(`
//           *,
//           subjects (
//             id,
//             name,
//             code,
//             department
//           ),
//           classes (
//             id,
//             name,
//             description
//           )
//         `)
//         .eq('teacher_id', teacherId)
//         .eq('is_active', true);

//       if (error) throw error;
//       return { success: true, data };
//     } catch (error) {
//       console.error('Error fetching teacher subjects:', error);
//       return { success: false, error: error.message };
//     }
//   },

//   // Assign subject to teacher
//   async assignSubjectToTeacher(teacherId, subjectId, classId, academicYear = null, term = null) {
//     try {
//       const { data, error } = await supabase
//         .from('teacher_assignments')
//         .insert({
//           teacher_id: teacherId,
//           subject_id: subjectId,
//           class_id: classId,
//           academic_year: academicYear,
//           term: term,
//           is_active: true
//         })
//         .select(`
//           *,
//           subjects (
//             id,
//             name,
//             code,
//             department
//           ),
//           classes (
//             id,
//             name,
//             description
//           )
//         `)
//         .single();

//       if (error) throw error;
//       return { success: true, data };
//     } catch (error) {
//       console.error('Error assigning subject to teacher:', error);
//       return { success: false, error: error.message };
//     }
//   },

//   // Remove subject from teacher
//   async removeSubjectFromTeacher(teacherAssignmentId) {
//     try {
//       const { data, error } = await supabase
//         .from('teacher_assignments')
//         .update({ is_active: false })
//         .eq('id', teacherAssignmentId)
//         .select()
//         .single();

//       if (error) throw error;
//       return { success: true, data };
//     } catch (error) {
//       console.error('Error removing subject from teacher:', error);
//       return { success: false, error: error.message };
//     }
//   },

//   // Get teacher dashboard stats
//   async getTeacherStats(teacherId) {
//     try {
//       // Get classes count
//       const { count: classCount } = await supabase
//         .from('teacher_assignments')
//         .select('class_id', { count: 'exact', head: true })
//         .eq('teacher_id', teacherId)
//         .eq('is_active', true);

//       // Get subjects count
//       const { count: subjectCount } = await supabase
//         .from('teacher_assignments')
//         .select('subject_id', { count: 'exact', head: true })
//         .eq('teacher_id', teacherId)
//         .eq('is_active', true);

//       // Get students count (total across all classes)
//       const { data: teacherClasses } = await supabase
//         .from('teacher_assignments')
//         .select('class_id')
//         .eq('teacher_id', teacherId)
//         .eq('is_active', true);

//       let totalStudents = 0;
//       if (teacherClasses?.length > 0) {
//         const classIds = [...new Set(teacherClasses.map(tc => tc.class_id))];
//         const { count: studentCount } = await supabase
//           .from('user_profiles')
//           .select('*', { count: 'exact', head: true })
//           .in('class_id', classIds)
//           .eq('role', 'student')
//           .eq('status', 'active');
//         totalStudents = studentCount || 0;
//       }

//       return {
//         success: true,
//         data: {
//           totalClasses: classCount || 0,
//           totalSubjects: subjectCount || 0,
//           totalStudents: totalStudents
//         }
//       };
//     } catch (error) {
//       console.error('Error fetching teacher stats:', error);
//       return { success: false, error: error.message };
//     }
//   }
// };

// // Export individual functions for backward compatibility
// export const {
//   createTeacher,
//   getAllTeachers,
//   getTeacherById,
//   getTeacherByUserId,
//   getTeacherByEmployeeId,
//   updateTeacher,
//   deleteTeacher,
//   getTeacherSubjects,
//   assignSubjectToTeacher,
//   removeSubjectFromTeacher,
//   getTeacherStats
// } = teacherService;

// // Legacy function names for compatibility
// export const addTeacher = createTeacher;
// export const getTeacher = getTeacherById;
// export const getTeacherByUid = getTeacherByUserId;


import { supabase } from "../../lib/supabaseClient";

// Cache for frequently accessed data
const cache = {
  teacherCount: null,
  cacheTime: null,
  TTL: 5 * 60 * 1000, // 5 minutes
};

// Data transformation utility
const transformTeacherData = (profile) => {
  console.log("📋 Transforming profile data:", {
    id: profile.id,
    role: profile.role,
    full_name: profile.full_name,
  });

  return {
    id: profile.id,
    uid: profile.id,
    name: profile.full_name,
    email: profile.email,
    phoneNumber: profile.phone_number,
    subject: profile.specialization,
    qualification: profile.qualification,
    dateHired: profile.hire_date,
    profileImageUrl: profile.profile_image,
    isActive: profile.is_active,
    employeeId: profile.employee_id,
    role: profile.role, // Added role to return data for debugging
  };
};

// Helper function to generate employee ID with caching
const generateEmployeeId = async () => {
  const year = new Date().getFullYear();
  const now = Date.now();

  let count;
  if (
    cache.teacherCount !== null &&
    cache.cacheTime &&
    now - cache.cacheTime < cache.TTL
  ) {
    count = cache.teacherCount;
  } else {
    const { count: freshCount } = await supabase
      .from("user_profiles")
      .select("*", { count: "exact", head: true })
      .eq("role", "teacher");

    count = freshCount || 0;
    cache.teacherCount = count;
    cache.cacheTime = now;
  }

  const nextNumber = count + 1;
  return `TCH${year}${nextNumber.toString().padStart(4, "0")}`;
};

// Optimized profile image upload
const uploadProfileImage = async (file, teacherId) => {
  if (!file) return null;

  const fileExt = file.name.split(".").pop();
  const fileName = `${teacherId}-${Date.now()}.${fileExt}`;
  const filePath = `teacher-profiles/${fileName}`;

  try {
    const [
      { error: uploadError },
      {
        data: { publicUrl },
      },
    ] = await Promise.all([
      supabase.storage.from("profile-images").upload(filePath, file),
      supabase.storage.from("profile-images").getPublicUrl(filePath),
    ]);

    if (uploadError) throw uploadError;
    return publicUrl;
  } catch (error) {
    console.error("Error uploading profile image:", error);
    return null;
  }
};

// Unified database operations
const dbOperations = {
  async queryTeachers(filters = {}, options = {}) {
    let query = supabase
      .from("user_profiles")
      .select(options.select || "*")
      .eq("role", "teacher"); // ✅ Always filtering by teacher role

    console.log("🔍 Querying teachers with filters:", filters);

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined) query = query.eq(key, value);
    });

    if (options.single) query = query.single();
    if (options.order)
      query = query.order(options.order.field, {
        ascending: options.order.asc,
      });
    if (options.limit) query = query.limit(options.limit);

    return query;
  },

  async updateProfile(id, updates) {
    console.log("🔄 Updating profile with data:", updates);
    return supabase
      .from("user_profiles")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("role", "teacher") // ✅ Ensuring we only update teacher profiles
      .select()
      .single();
  },
};

export const teacherService = {
  async createTeacher(teacherData) {
    try {
      console.log("🔄 Creating teacher with data:", {
        name: teacherData.name,
        email: teacherData.email,
        subject: teacherData.subject,
      });

      const [employeeId, authResult] = await Promise.all([
        generateEmployeeId(),
        supabase.auth.signUp({
          email: teacherData.email,
          password: teacherData.password,
          options: {
            data: {
              full_name: teacherData.name,
              role: "teacher", // ✅ Explicitly set to teacher
            },
          },
        }),
      ]);

      if (authResult.error) {
        console.error("❌ Auth error:", authResult.error);
        throw authResult.error;
      }

      const userId = authResult.data.user.id;
      console.log("✅ Auth user created with ID:", userId);
      console.log("🔍 Auth user metadata:", authResult.data.user.user_metadata);

      // Upload image if provided
      const profileImageUrl = teacherData.profileImage
        ? await uploadProfileImage(teacherData.profileImage, userId)
        : null;

      // Prepare profile data
      const profilePayload = {
        id: userId,
        email: teacherData.email,
        full_name: teacherData.name,
        role: "teacher", // ✅ Explicitly set to teacher
        phone_number: teacherData.phoneNumber,
        employee_id: employeeId,
        qualification: teacherData.qualification,
        specialization: teacherData.subject,
        hire_date: teacherData.dateHired,
        profile_image: profileImageUrl,
        is_active: true,
        status: "active",
      };

      console.log("📝 Creating profile with payload:", {
        id: profilePayload.id,
        role: profilePayload.role,
        employee_id: profilePayload.employee_id,
        full_name: profilePayload.full_name,
      });

      const { data: profileData, error: profileError } = await supabase
        .from("user_profiles")
        .insert(profilePayload)
        .select()
        .single();

      if (profileError) {
        console.error("❌ Profile creation error:", profileError);
        throw profileError;
      }

      console.log("✅ Profile created successfully:", {
        id: profileData.id,
        role: profileData.role,
        employee_id: profileData.employee_id,
        full_name: profileData.full_name,
      });

      // Verify the created profile
      const { data: verifyData, error: verifyError } = await supabase
        .from("user_profiles")
        .select("id, role, full_name, employee_id")
        .eq("id", userId)
        .single();

      if (verifyError) {
        console.warn("⚠️ Could not verify profile creation:", verifyError);
      } else {
        console.log("🔍 Verification - Profile in DB:", verifyData);
      }

      // Invalidate cache after successful creation
      cache.teacherCount = null;
      cache.cacheTime = null;

      console.log("✅ Teacher created successfully:", employeeId);
      return { success: true, data: transformTeacherData(profileData) };
    } catch (error) {
      console.error("❌ Error creating teacher:", error);
      return { success: false, error: error.message };
    }
  },

  async getAllTeachers() {
    try {
      console.log("🔄 Fetching all teachers...");

      const { data, error } = await dbOperations.queryTeachers(
        { status: "active" },
        { order: { field: "created_at", asc: false } }
      );

      if (error) throw error;

      console.log("✅ Teachers fetched:", data?.length || 0);

      // Debug: Log first teacher's role if any exist
      if (data && data.length > 0) {
        console.log("🔍 First teacher role check:", {
          name: data[0].full_name,
          role: data[0].role,
          employee_id: data[0].employee_id,
        });
      }

      return {
        success: true,
        data: data?.map(transformTeacherData) || [],
      };
    } catch (error) {
      console.error("❌ Error fetching teachers:", error);
      return { success: false, error: error.message };
    }
  },

  // Single method handles all ID-based queries
  async getTeacherById(identifier, identifierType = "id") {
    try {
      console.log(`🔍 Fetching teacher by ${identifierType}:`, identifier);

      const filter = { [identifierType]: identifier };
      const { data, error } = await dbOperations.queryTeachers(filter, {
        single: true,
      });

      if (error) throw error;

      console.log("✅ Teacher found:", {
        id: data.id,
        role: data.role,
        name: data.full_name,
      });

      return { success: true, data: transformTeacherData(data) };
    } catch (error) {
      console.error(`❌ Error fetching teacher by ${identifierType}:`, error);
      return { success: false, error: error.message };
    }
  },

  // Simplified aliases using the unified method
  async getTeacherByUserId(userId) {
    return this.getTeacherById(userId, "id");
  },

  async getTeacherByUid(uid) {
    return this.getTeacherById(uid, "id");
  },

  async getTeacherByEmployeeId(employeeId) {
    return this.getTeacherById(employeeId, "employee_id");
  },

  async updateTeacher(teacherId, updateData) {
    try {
      console.log("🔄 Updating teacher:", teacherId);

      // Handle image upload if needed
      let profileImageUrl = updateData.profileImageUrl;
      if (
        updateData.profileImage &&
        typeof updateData.profileImage !== "string"
      ) {
        profileImageUrl = await uploadProfileImage(
          updateData.profileImage,
          teacherId
        );
      }

      const updatePayload = {
        full_name: updateData.name,
        email: updateData.email,
        phone_number: updateData.phoneNumber,
        specialization: updateData.subject,
        qualification: updateData.qualification,
        hire_date: updateData.dateHired,
        profile_image: profileImageUrl,
        is_active: updateData.isActive,
        // Note: Not updating role here to prevent accidental changes
      };

      console.log("📝 Update payload:", updatePayload);

      const { data, error } = await dbOperations.updateProfile(
        teacherId,
        updatePayload
      );
      if (error) {
        console.error("❌ Update error:", error);
        throw error;
      }

      console.log("✅ Teacher updated:", {
        id: data.id,
        role: data.role,
        employee_id: data.employee_id,
      });

      return { success: true, data: transformTeacherData(data) };
    } catch (error) {
      console.error("❌ Error updating teacher:", error);
      return { success: false, error: error.message };
    }
  },

  async deleteTeacher(teacherId) {
    try {
      console.log("🔄 Soft deleting teacher:", teacherId);

      const { data, error } = await dbOperations.updateProfile(teacherId, {
        status: "inactive",
        is_active: false,
      });

      if (error) throw error;

      console.log("✅ Teacher deactivated:", {
        id: data.id,
        employee_id: data.employee_id,
        status: data.status,
      });

      return { success: true, data };
    } catch (error) {
      console.error("❌ Error deleting teacher:", error);
      return { success: false, error: error.message };
    }
  },

  // Diagnostic method to check role issues
  async diagnoseRoleIssues(teacherId) {
    try {
      console.log("🔍 Diagnosing role issues for teacher:", teacherId);

      // Check auth user
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();
      if (authError) {
        console.log("Auth check failed:", authError);
      } else if (user) {
        console.log("Current auth user:", {
          id: user.id,
          role: user.user_metadata?.role,
          email: user.email,
        });
      }

      // Check profile in database
      const { data: profile, error: profileError } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("id", teacherId)
        .single();

      if (profileError) {
        console.log("Profile check failed:", profileError);
      } else {
        console.log("Profile in database:", {
          id: profile.id,
          role: profile.role,
          employee_id: profile.employee_id,
          status: profile.status,
          created_at: profile.created_at,
        });
      }

      return { success: true, authUser: user, profile };
    } catch (error) {
      console.error("Diagnosis failed:", error);
      return { success: false, error: error.message };
    }
  },

  async getTeacherSubjects(teacherId) {
    try {
      const { data, error } = await supabase
        .from("teacher_assignments")
        .select(
          `
          *,
          subjects!inner (id, name, code, department),
          classes!inner (id, name, description)
        `
        )
        .eq("teacher_id", teacherId)
        .eq("is_active", true);

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error("Error fetching teacher subjects:", error);
      return { success: false, error: error.message };
    }
  },

  async assignSubjectToTeacher(
    teacherId,
    subjectId,
    classId,
    academicYear = null,
    term = null
  ) {
    try {
      const { data, error } = await supabase
        .from("teacher_assignments")
        .insert({
          teacher_id: teacherId,
          subject_id: subjectId,
          class_id: classId,
          academic_year: academicYear,
          term: term,
          is_active: true,
        })
        .select(
          `
          *,
          subjects!inner (id, name, code, department),
          classes!inner (id, name, description)
        `
        )
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error("Error assigning subject to teacher:", error);
      return { success: false, error: error.message };
    }
  },

  async removeSubjectFromTeacher(teacherAssignmentId) {
    try {
      const { data, error } = await supabase
        .from("teacher_assignments")
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq("id", teacherAssignmentId)
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error("Error removing subject from teacher:", error);
      return { success: false, error: error.message };
    }
  },

  async getTeacherStats(teacherId) {
    try {
      const { data: assignments } = await supabase
        .from("teacher_assignments")
        .select("class_id, subject_id")
        .eq("teacher_id", teacherId)
        .eq("is_active", true);

      if (!assignments?.length) {
        return {
          success: true,
          data: { totalClasses: 0, totalSubjects: 0, totalStudents: 0 },
        };
      }

      const uniqueClassIds = [...new Set(assignments.map((a) => a.class_id))];
      const uniqueSubjectIds = [
        ...new Set(assignments.map((a) => a.subject_id)),
      ];

      const { count: studentCount } = await supabase
        .from("user_profiles")
        .select("*", { count: "exact", head: true })
        .in("class_id", uniqueClassIds)
        .eq("role", "student")
        .eq("status", "active");

      return {
        success: true,
        data: {
          totalClasses: uniqueClassIds.length,
          totalSubjects: uniqueSubjectIds.length,
          totalStudents: studentCount || 0,
        },
      };
    } catch (error) {
      console.error("Error fetching teacher stats:", error);
      return { success: false, error: error.message };
    }
  },
};

// Export individual functions and aliases for backward compatibility
export const {
  createTeacher,
  getAllTeachers,
  getTeacherById,
  getTeacherByUserId,
  getTeacherByEmployeeId,
  updateTeacher,
  deleteTeacher,
  getTeacherSubjects,
  assignSubjectToTeacher,
  removeSubjectFromTeacher,
  getTeacherStats,
} = teacherService;

// Legacy aliases
export const addTeacher = createTeacher;
export const getTeacher = getTeacherById;
export const getTeacherByUid = getTeacherByUserId;
