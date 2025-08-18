

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

      // Validate required fields
      if (
        !teacherData.email ||
        !teacherData.name ||
        !teacherData.subject ||
        !teacherData.qualification
      ) {
        const missingFields = [];
        if (!teacherData.email) missingFields.push("email");
        if (!teacherData.name) missingFields.push("name");
        if (!teacherData.subject) missingFields.push("subject");
        if (!teacherData.qualification) missingFields.push("qualification");
        throw new Error(`Missing required fields: ${missingFields.join(", ")}`);
      }

      // Check for existing email
      const { data: existingEmail, error: emailCheckError } = await supabase
        .from("user_profiles")
        .select("email, id, role")
        .eq("email", teacherData.email)
        .limit(1);

      if (emailCheckError) {
        console.error("❌ Error checking existing email:", emailCheckError);
        throw emailCheckError;
      }

      if (existingEmail && existingEmail.length > 0) {
        throw new Error(
          `A user with email ${teacherData.email} already exists`
        );
      }

      // Generate employee ID
      const employeeId = await generateEmployeeId();
      console.log("✅ Employee ID generated:", employeeId);

      // Create auth user with fallback password
      const authPassword = teacherData.password || "defaultPassword123";

      console.log("🔄 Creating auth user...");
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: teacherData.email,
        password: authPassword,
        options: {
          data: {
            full_name: teacherData.name,
            role: "teacher",
          },
        },
      });

      if (authError) {
        console.error("❌ Auth signup error:", authError);
        if (
          authError.message.includes("already registered") ||
          authError.message.includes("already been registered")
        ) {
          throw new Error("A user with this email is already registered");
        }
        if (authError.message.includes("Password should be at least")) {
          throw new Error("Password must be at least 6 characters long");
        }
        throw authError;
      }

      if (!authData.user) {
        throw new Error("Failed to create authentication user");
      }

      console.log("✅ Auth user created:", authData.user.id);

      // Wait a moment for the database trigger to create the basic profile
      console.log("⏳ Waiting for database trigger to create profile...");
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Check if a profile was automatically created by the trigger
      const { data: autoCreatedProfile, error: autoCheckError } = await supabase
        .from("user_profiles")
        .select("id, email, role, full_name")
        .eq("id", authData.user.id)
        .single();

      if (autoCheckError && autoCheckError.code !== "PGRST116") {
        console.error("❌ Error checking for auto-created profile:", autoCheckError);
        throw new Error("Failed to find auto-created profile. Database trigger may not be working.");
      }

      if (!autoCreatedProfile) {
        throw new Error("Database trigger did not create profile. Please check trigger configuration.");
      }

      console.log("✅ Auto-created profile found:", autoCreatedProfile);

      // Upload image if provided
      const profileImageUrl = teacherData.profileImage
        ? await uploadProfileImage(teacherData.profileImage, authData.user.id)
        : null;

      // Prepare teacher-specific profile data to update the auto-created profile
      const teacherProfileData = {
        phone_number: teacherData.phoneNumber || null,
        employee_id: employeeId,
        qualification: teacherData.qualification || null,
        specialization: teacherData.subject || null,
        hire_date: teacherData.dateHired || new Date().toISOString().split("T")[0],
        profile_image: profileImageUrl,
        updated_at: new Date().toISOString(),
      };

      // Remove any undefined values
      Object.keys(teacherProfileData).forEach((key) => {
        if (teacherProfileData[key] === undefined) {
          delete teacherProfileData[key];
        }
      });

      console.log("🔄 Updating profile with teacher-specific data...");
      const { data: updatedRecord, error: updateError } = await supabase
        .from("user_profiles")
        .update(teacherProfileData)
        .eq("id", authData.user.id)
        .select("*")
        .single();

      if (updateError) {
        console.error("❌ Profile update error:", updateError);
        throw new Error(`Failed to update teacher profile: ${updateError.message}`);
      }

      if (!updatedRecord) {
        throw new Error("Teacher record was not updated properly");
      }

      // Invalidate cache after successful creation
      cache.teacherCount = null;
      cache.cacheTime = null;

      console.log("✅ Teacher created successfully");
      return { success: true, data: transformTeacherData(updatedRecord) };

    } catch (error) {
      console.error("❌ Error creating teacher:", error);

      // Return more specific error messages
      let errorMessage = error.message;
      if (error.message.includes("already registered")) {
        errorMessage = "A user with this email is already registered.";
      } else if (error.message.includes("Password should be at least")) {
        errorMessage = "Password must be at least 6 characters long.";
      } else if (error.message.includes("Database trigger")) {
        errorMessage = "Database configuration issue: Please contact system administrator.";
      }

      return { success: false, error: errorMessage };
    }
  },

  async getAllTeachers() {
    try {
      console.log("🔄 Fetching all teachers...");

      const { data, error } = await dbOperations.queryTeachers(
        {},
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
