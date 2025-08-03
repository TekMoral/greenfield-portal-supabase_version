// src/services/supabase/classService.js
import { supabase } from '../../lib/supabaseClient'

// Helper function to validate and clean teacher ID
const validateTeacherId = (teacherId) => {
  if (!teacherId || !teacherId.trim()) {
    return null;
  }

  const cleanId = teacherId.trim();

  // Check if it's a valid UUID format (basic check)
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  if (!uuidRegex.test(cleanId)) {
    throw new Error(`Teacher ID must be a valid UUID, not a name. Please leave empty or use the actual teacher ID from the system.`);
  }

  return cleanId;
};

// ✅ Get all classes
export const getClasses = async () => {
  try {
    console.log('🔄 Fetching classes...');

    const { data, error } = await supabase
      .from('classes')
      .select('*')
      .eq('status', 'active')
      .order('name');

    if (error) {
      console.error('�� [getClasses] Error:', error);
      return { success: false, error: error.message };
    }

    console.log('✅ Classes fetched successfully:', data?.length || 0);
    return { success: true, data: data || [] };
  } catch (error) {
    console.error('❌ [getClasses] Error fetching classes:', error);
    return { success: false, error: error.message };
  }
}

// ✅ Get class by ID
export const getClassById = async (classId) => {
  try {
    const { data, error } = await supabase
      .from('classes')
      .select('*')
      .eq('id', classId)
      .single();

    if (error) {
      console.error('[getClassById] Error:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('[getClassById] Error fetching class:', error);
    throw error;
  }
}

// ✅ Create new class
export const createClass = async (classData) => {
  const timestamp = new Date().toISOString();
  try {
    console.log("🔄 Creating class with data:", {
      name: classData.name,
      category: classData.category,
      level: classData.level
    });

    // Validate teacher ID
    const validatedTeacherId = validateTeacherId(classData.classTeacherId);

    // Build common category filter
    const categoryFilter = (query) => {
      return classData.category
        ? query.eq("category", classData.category)
        : query.is("category", null);
    };

    // 💤 1. Check if inactive class exists (to reactivate)
    let inactiveQuery = categoryFilter(
      supabase
        .from("classes")
        .select("*")
        .eq("name", classData.name)
        .eq("status", "inactive")
    );

    const { data: inactiveClass, error: inactiveError } =
      await inactiveQuery.single();

    if (inactiveError && inactiveError.code !== "PGRST116") {
      console.warn("⚠️ Error checking inactive class:", inactiveError.message);
    }

    if (inactiveClass) {
      // 🔁 Reactivate existing inactive class
      console.log("🔄 Reactivating inactive class:", {
        id: inactiveClass.id,
        name: inactiveClass.name,
        category: inactiveClass.category
      });
      
      const updateData = {
        level: classData.level,
        category: classData.category || null,
        capacity: classData.capacity || 30,
        description: classData.description || "",
        academic_year: classData.academic_year || "2024/2025",
        class_teacher_id: validatedTeacherId,
        status: "active",
        updated_at: timestamp,
      };

      const { data: reactivatedClass, error: updateError } = await supabase
        .from("classes")
        .update(updateData)
        .eq("id", inactiveClass.id)
        .select()
        .single();

      if (updateError) {
        console.error("❌ Error reactivating class:", updateError);
        throw updateError;
      }

      console.log("✅ Reactivated class:", reactivatedClass);
      return reactivatedClass;
    }

    // 🟢 2. Check if active class with same name + category exists
    let activeQuery = categoryFilter(
      supabase
        .from("classes")
        .select("id, name, category")
        .eq("name", classData.name)
        .eq("status", "active")
    );

    const { data: activeClass, error: activeError } =
      await activeQuery.single();

    if (activeClass) {
      console.log("❌ Found existing active class:", {
        id: activeClass.id,
        name: activeClass.name,
        category: activeClass.category
      });
      
      const catText = classData.category
        ? ` in category "${classData.category}"`
        : " without a category";
      throw new Error(
        `A class named "${classData.name}"${catText} already exists`
      );
    }

    if (activeError && activeError.code !== "PGRST116") {
      console.error("❌ Error checking existing active class:", activeError);
      throw activeError;
    }

    console.log("✅ No duplicate found, proceeding with creation");

    // 🆕 3. Create new class
    const insertData = {
      name: classData.name,
      level: classData.level,
      category: classData.category || null,
      capacity: classData.capacity || 30,
      description: classData.description || "",
      academic_year: classData.academic_year || "2024/2025",
      class_teacher_id: validatedTeacherId,
      status: "active",
    };

    console.log("🔄 Inserting class data:", insertData);

    const { data: newClass, error: insertError } = await supabase
      .from("classes")
      .insert(insertData)
      .select()
      .single();

    if (insertError) {
      console.error("❌ Database insert error:", insertError);
      
      if (insertError.code === "23505") {
        // Check which constraint was violated
        if (insertError.message.includes('classes_name_key')) {
          throw new Error(
            `❌ Database constraint: Class name "${classData.name}" must be unique. Please run the database migration to allow same names with different categories.`
          );
        } else if (insertError.message.includes('classes_name_category_unique')) {
          const catText = classData.category ? ` in category "${classData.category}"` : " without a category";
          throw new Error(
            `A class named "${classData.name}"${catText} already exists`
          );
        } else {
          throw new Error(
            `Duplicate constraint violation: ${insertError.message}`
          );
        }
      }
      
      throw insertError;
    }

    console.log("✅ Class created successfully:", newClass);
    return newClass;
  } catch (error) {
    console.error("❌ [createClass] Failed:", error.message);
    throw error;
  }
};

// ✅ Update class
export const updateClass = async (classId, updates) => {
  try {
    // Validate teacher ID if provided in updates
    if (updates.classTeacherId !== undefined) {
      updates.class_teacher_id = validateTeacherId(updates.classTeacherId);
      delete updates.classTeacherId; // Remove the old key
    }

    const { data, error } = await supabase
      .from('classes')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', classId)
      .select()
      .single();

    if (error) {
      console.error('[updateClass] Error:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('[updateClass] Error updating class:', error);
    throw error;
  }
}

// ✅ Delete class (soft delete)
export const deleteClass = async (classId) => {
  try {
    const { data, error } = await supabase
      .from('classes')
      .update({
        status: 'inactive',
        updated_at: new Date().toISOString()
      })
      .eq('id', classId)
      .select()
      .single();

    if (error) {
      console.error('[deleteClass] Error:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('[deleteClass] Error deleting class:', error);
    throw error;
  }
}

// ✅ Get classes with student count
export const getClassesWithStudentCount = async () => {
  try {
    const { data, error } = await supabase
      .from('classes')
      .select(`
        *,
        student_count:user_profiles(count)
      `)
      .eq('status', 'active')
      .eq('user_profiles.role', 'student')
      .order('name');

    if (error) {
      console.error('[getClassesWithStudentCount] Error:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('[getClassesWithStudentCount] Error:', error);
    throw error;
  }
}

// ✅ Get students in a class
export const getStudentsInClass = async (classId) => {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('class_id', classId)
      .eq('role', 'student')
      .eq('is_active', true)
      .order('full_name');

    if (error) {
      console.error('[getStudentsInClass] Error:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('[getStudentsInClass] Error:', error);
    throw error;
  }
}

// ✅ Search classes
export const searchClasses = async (searchTerm) => {
  try {
    const { data, error } = await supabase
      .from('classes')
      .select('*')
      .or(`name.ilike.%${searchTerm}%,level.ilike.%${searchTerm}%`)
      .eq('status', 'active')
      .order('name');

    if (error) {
      console.error('[searchClasses] Error:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('[searchClasses] Error searching classes:', error);
    throw error;
  }
}

// ✅ Get all teachers for dropdown
export const getTeachers = async () => {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('id, full_name, email')
      .eq('role', 'teacher')
      .eq('is_active', true)
      .order('full_name');

    if (error) {
      console.error('[getTeachers] Error:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('[getTeachers] Error fetching teachers:', error);
    throw error;
  }
}

// ✅ Alias exports for backward compatibility
export const getAllClasses = getClasses;

// ✅ Export service object for easier usage
export const classService = {
  getClasses,
  getAllClasses,
  getClassById,
  createClass,
  updateClass,
  deleteClass,
  getClassesWithStudentCount,
  getStudentsInClass,
  searchClasses,
  getTeachers
};