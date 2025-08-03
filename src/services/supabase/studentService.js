import { supabase } from "../../lib/supabaseClient";

// Student Service using Supabase with unified user_profiles table
export const studentService = {
  // Create a new student
  async createStudent(studentData) {
    try {
      console.log("🔄 Creating student...");

      // Validate required fields
      if (
        !studentData.email ||
        !studentData.first_name ||
        !studentData.surname ||
        !studentData.admission_number
      ) {
        const missingFields = [];
        if (!studentData.email) missingFields.push("email");
        if (!studentData.first_name) missingFields.push("first_name");
        if (!studentData.surname) missingFields.push("surname");
        if (!studentData.admission_number)
          missingFields.push("admission_number");
        throw new Error(`Missing required fields: ${missingFields.join(", ")}`);
      }

      // Validate class_id is provided
      if (!studentData.class_id) {
        throw new Error("Class selection is required");
      }

      // Check for existing email
      const { data: existingEmail, error: emailCheckError } = await supabase
        .from("user_profiles")
        .select("email, id, role")
        .eq("email", studentData.email)
        .limit(1);

      if (emailCheckError) {
        console.error("❌ Error checking existing email:", emailCheckError);
        throw emailCheckError;
      }

      if (existingEmail && existingEmail.length > 0) {
        throw new Error(
          `A user with email ${studentData.email} already exists`
        );
      }

      // Check for existing admission number
      const { data: existingAdmission, error: admissionCheckError } =
        await supabase
          .from("user_profiles")
          .select("admission_number, id, full_name")
          .eq("admission_number", studentData.admission_number)
          .eq("role", "student")
          .limit(1);

      if (admissionCheckError) {
        console.error(
          "❌ Error checking existing admission number:",
          admissionCheckError
        );
        throw admissionCheckError;
      }

      if (existingAdmission && existingAdmission.length > 0) {
        throw new Error(
          `A student with admission number ${studentData.admission_number} already exists`
        );
      }

      // Create auth user first
      const authPassword =
        studentData.password ||
        studentData.admission_number ||
        "defaultPassword123";

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: studentData.email,
        password: authPassword,
        options: {
          data: {
            full_name: `${studentData.first_name} ${studentData.surname}`,
            role: "student",
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

      // Wait a moment for any triggers to complete
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Check if a profile was automatically created by a trigger
      const { data: autoCreatedProfile, error: autoCheckError } = await supabase
        .from("user_profiles")
        .select("id, email, role, full_name")
        .eq("id", authData.user.id)
        .single();

      if (autoCheckError && autoCheckError.code !== "PGRST116") {
        console.error(
          "❌ Error checking for auto-created profile:",
          autoCheckError
        );
      }

      // Prepare profile data
      const profileData = {
        id: authData.user.id,
        email: studentData.email,
        full_name: `${studentData.first_name} ${studentData.surname}`,
        role: "student",
        admission_number: studentData.admission_number,
        class_id: studentData.class_id,
        date_of_birth: studentData.date_of_birth || null,
        gender: studentData.gender || null,
        phone_number: studentData.contact || null,
        guardian_name: studentData.guardian_name || null,
        guardian_phone: studentData.contact || null,
        guardian_email: studentData.guardian_email || null,
        profile_image: studentData.profileImageUrl || null,
        address: studentData.address || null,
        admission_date:
          studentData.admission_date || new Date().toISOString().split("T")[0],
        is_active: true,
        status: "active",
      };

      // Remove any undefined values
      Object.keys(profileData).forEach((key) => {
        if (profileData[key] === undefined) {
          delete profileData[key];
        }
      });

      let studentRecord;
      let profileError;

      if (autoCreatedProfile) {
        // Remove id from update data since we can't update the primary key
        const updateData = { ...profileData };
        delete updateData.id;

        // Update the existing profile
        const { data: updatedRecord, error: updateError } = await supabase
          .from("user_profiles")
          .update(updateData)
          .eq("id", authData.user.id)
          .select("*")
          .single();

        studentRecord = updatedRecord;
        profileError = updateError;
      } else {
        // Insert new profile
        const { data: insertedRecord, error: insertError } = await supabase
          .from("user_profiles")
          .insert(profileData)
          .select("*")
          .single();

        studentRecord = insertedRecord;
        profileError = insertError;
      }

      if (profileError) {
        console.error("❌ Profile creation/update error:", profileError);

        // Clean up auth user if profile creation fails
        try {
          await supabase.auth.admin.deleteUser(authData.user.id);
          console.log("🧹 Cleaned up auth user after profile creation failure");
        } catch (cleanupError) {
          console.error("❌ Failed to cleanup auth user:", cleanupError);
        }

        // Handle specific database errors
        if (profileError.code === "23505") {
          // Unique constraint violation
          if (profileError.message.includes("email")) {
            throw new Error("A user with this email already exists");
          }
          if (profileError.message.includes("admission_number")) {
            throw new Error(
              "A student with this admission number already exists"
            );
          }
          throw new Error(`Duplicate data detected: ${profileError.message}`);
        }

        if (profileError.code === "23503") {
          // Foreign key constraint violation
          if (profileError.message.includes("class_id")) {
            throw new Error(
              "Invalid class selected. Please choose a valid class."
            );
          }
          throw new Error(
            "Invalid reference data. Please check your selections."
          );
        }

        throw new Error(
          `Database error (${profileError.code}): ${profileError.message}`
        );
      }

      if (!studentRecord) {
        throw new Error("Student record was not created properly");
      }

      // Fetch class information separately
      let classInfo = null;
      try {
        const { data: classData } = await supabase
          .from("classes")
          .select("id, name, level, category")
          .eq("id", studentData.class_id)
          .single();
        classInfo = classData;
      } catch (classError) {
        console.warn("⚠️ Could not fetch class info:", classError);
      }

      // Add class info to student record if available
      const enrichedStudentRecord = {
        ...studentRecord,
        classes: classInfo,
      };

      console.log("✅ Student created successfully");
      return { success: true, data: enrichedStudentRecord };
    } catch (error) {
      console.error("❌ Error creating student:", error);

      // Return more specific error messages
      let errorMessage = error.message;
      if (error.code === "23505") {
        errorMessage =
          "Duplicate data detected. Please check email and admission number.";
      } else if (error.message.includes("already registered")) {
        errorMessage = "A user with this email is already registered.";
      } else if (error.message.includes("Password should be at least")) {
        errorMessage = "Password must be at least 6 characters long.";
      }

      return { success: false, error: errorMessage };
    }
  },

  // Get all students - Simple and reliable 2-query approach
  async getAllStudents() {
    try {
      console.log("🔄 Fetching students and classes...");

      // Get all students
      const { data: students, error: studentsError } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("role", "student")
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (studentsError) {
        console.error("❌ Error fetching students:", studentsError);
        throw studentsError;
      }

      // Get all classes
      const { data: classes, error: classesError } = await supabase
        .from("classes")
        .select("id, name, level, category");

      if (classesError) {
        console.error("❌ Error fetching classes:", classesError);
        throw classesError;
      }

      // Manually join the data
      const enrichedStudents = students.map((student) => {
        const studentClass = classes.find((cls) => cls.id === student.class_id);
        return {
          ...student,
          classes: studentClass || null,
        };
      });

      console.log("✅ Students and classes fetched successfully");
      return { success: true, data: enrichedStudents || [] };
    } catch (error) {
      console.error("❌ Error in getAllStudents:", error);
      return { success: false, error: error.message };
    }
  },

  // Get student by ID
  async getStudentById(studentId) {
    try {
      // Get student
      const { data: student, error: studentError } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("id", studentId)
        .eq("role", "student")
        .single();

      if (studentError) throw studentError;

      // Get class info if student has class_id
      let classInfo = null;
      if (student.class_id) {
        const { data: classData } = await supabase
          .from("classes")
          .select("id, name, level, category")
          .eq("id", student.class_id)
          .single();
        classInfo = classData;
      }

      const enrichedStudent = {
        ...student,
        classes: classInfo,
      };

      return { success: true, data: enrichedStudent };
    } catch (error) {
      console.error("Error fetching student:", error);
      return { success: false, error: error.message };
    }
  },

  // Get student by admission number
  async getStudentByAdmissionNumber(admissionNumber) {
    try {
      // Get student
      const { data: student, error: studentError } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("admission_number", admissionNumber)
        .eq("role", "student")
        .single();

      if (studentError) throw studentError;

      // Get class info if student has class_id
      let classInfo = null;
      if (student.class_id) {
        const { data: classData } = await supabase
          .from("classes")
          .select("id, name, level, category")
          .eq("id", student.class_id)
          .single();
        classInfo = classData;
      }

      const enrichedStudent = {
        ...student,
        classes: classInfo,
      };

      return { success: true, data: enrichedStudent };
    } catch (error) {
      console.error("Error fetching student by admission number:", error);
      return { success: false, error: error.message };
    }
  },

  // Check if admission number exists
  async checkAdmissionNumberExists(admissionNumber) {
    try {
      const { data, error } = await supabase
        .from("user_profiles")
        .select("admission_number")
        .eq("admission_number", admissionNumber)
        .eq("role", "student")
        .single();

      if (error && error.code !== "PGRST116") throw error;
      return !!data;
    } catch (error) {
      console.error("Error checking admission number:", error);
      return false;
    }
  },

  // Get next admission number
  async getNextAdmissionNumber(initial) {
    try {
      const year = new Date().getFullYear().toString().slice(-2);
      let attempts = 0;
      const maxAttempts = 10;

      while (attempts < maxAttempts) {
        let baseNumber = 1;

        if (attempts === 0) {
          const pattern = `${initial}%${year}`;
          const { data, error } = await supabase
            .from("user_profiles")
            .select("admission_number")
            .eq("role", "student")
            .like("admission_number", pattern)
            .order("admission_number", { ascending: false })
            .limit(1);

          if (error) throw error;

          if (data && data.length > 0) {
            const lastNumber = data[0].admission_number;
            const numberPart = lastNumber.slice(1, -2);
            baseNumber = (parseInt(numberPart) || 0) + 1;
          }
        } else {
          baseNumber = Math.floor(Math.random() * 999) + 1;
        }

        const paddedNumber = String(baseNumber).padStart(3, "0");
        const candidateAdmissionNumber = `${initial}${paddedNumber}${year}`;

        const exists = await this.checkAdmissionNumberExists(
          candidateAdmissionNumber
        );

        if (!exists) {
          return baseNumber;
        }

        attempts++;
      }

      // Fallback
      const timestamp = Date.now().toString().slice(-3);
      return parseInt(timestamp);
    } catch (error) {
      console.error("Error getting next admission number:", error);
      return Math.floor(Math.random() * 900) + 100;
    }
  },

  // Get students by class
  async getStudentsByClass(classId) {
    try {
      // Get students
      const { data: students, error: studentsError } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("class_id", classId)
        .eq("role", "student")
        .eq("is_active", true)
        .order("full_name", { ascending: true });

      if (studentsError) throw studentsError;

      // Get class info
      const { data: classData } = await supabase
        .from("classes")
        .select("id, name, level, category")
        .eq("id", classId)
        .single();

      // Add class info to each student
      const enrichedStudents = students.map((student) => ({
        ...student,
        classes: classData || null,
      }));

      return { success: true, data: enrichedStudents || [] };
    } catch (error) {
      console.error("Error fetching students by class:", error);
      return { success: false, error: error.message };
    }
  },

  // Update student
  async updateStudent(studentId, updateData) {
    try {
      const profileUpdateData = {
        full_name:
          updateData.first_name && updateData.surname
            ? `${updateData.first_name} ${updateData.surname}`
            : updateData.full_name,
        email: updateData.email,
        class_id: updateData.class_id,
        date_of_birth: updateData.date_of_birth,
        gender: updateData.gender,
        phone_number: updateData.contact,
        guardian_name: updateData.guardian_name,
        guardian_phone: updateData.contact,
        profile_image: updateData.profileImageUrl,
        updated_at: new Date().toISOString(),
      };

      // Remove undefined values
      Object.keys(profileUpdateData).forEach((key) => {
        if (profileUpdateData[key] === undefined) {
          delete profileUpdateData[key];
        }
      });

      // Update student
      const { data: student, error: updateError } = await supabase
        .from("user_profiles")
        .update(profileUpdateData)
        .eq("id", studentId)
        .eq("role", "student")
        .select("*")
        .single();

      if (updateError) {
        console.error("❌ Error updating student:", updateError);
        throw updateError;
      }

      // Get class info if student has class_id
      let classInfo = null;
      if (student.class_id) {
        const { data: classData } = await supabase
          .from("classes")
          .select("id, name, level, category")
          .eq("id", student.class_id)
          .single();
        classInfo = classData;
      }

      const enrichedStudent = {
        ...student,
        classes: classInfo,
      };

      return { success: true, data: enrichedStudent };
    } catch (error) {
      console.error("❌ Error in updateStudent:", error);
      return { success: false, error: error.message };
    }
  },

  // Delete student (hard delete)
  async deleteStudent(studentId) {
    try {
      const { data, error } = await supabase
        .from("user_profiles")
        .delete()
        .eq("id", studentId)
        .eq("role", "student")
        .select()
        .single(); // optional: if you want the deleted row returned

      if (error) {
        console.error("❌ Error deleting student:", error);
        throw error;
      }

      return { success: true, data };
    } catch (error) {
      console.error("❌ Error in deleteStudent:", error);
      return { success: false, error: error.message };
    }
  },

  // Get student dashboard stats
  async getStudentStats(studentId) {
    try {
      // Get exam results count
      const { count: examCount } = await supabase
        .from("exam_results")
        .select("*", { count: "exact", head: true })
        .eq("student_id", studentId);

      // Get average score
      const { data: avgData } = await supabase
        .from("exam_results")
        .select("score, max_score")
        .eq("student_id", studentId);

      let averagePercentage = 0;
      if (avgData?.length > 0) {
        const totalPercentage = avgData.reduce((sum, result) => {
          const percentage = (result.score / result.max_score) * 100;
          return sum + percentage;
        }, 0);
        averagePercentage = totalPercentage / avgData.length;
      }

      // Get subjects count
      const { data: studentData } = await supabase
        .from("user_profiles")
        .select("class_id")
        .eq("id", studentId)
        .single();

      let subjectCount = 0;
      if (studentData?.class_id) {
        const { count } = await supabase
          .from("teacher_assignments")
          .select("*", { count: "exact", head: true })
          .eq("class_id", studentData.class_id)
          .eq("is_active", true);
        subjectCount = count || 0;
      }

      return {
        success: true,
        data: {
          totalExams: examCount || 0,
          averageScore: Math.round(averagePercentage * 100) / 100,
          totalSubjects: subjectCount,
        },
      };
    } catch (error) {
      console.error("Error fetching student stats:", error);
      return { success: false, error: error.message };
    }
  },
};

// Export individual functions for backward compatibility
export const {
  createStudent,
  getAllStudents,
  getStudentById,
  getStudentByAdmissionNumber,
  checkAdmissionNumberExists,
  getNextAdmissionNumber,
  getStudentsByClass,
  updateStudent,
  deleteStudent,
  getStudentStats,
} = studentService;

// Legacy function names for compatibility
export const addStudent = createStudent;
export const getStudent = getStudentById;
