import { supabase } from '../../lib/supabaseClient';

/**
 * Get class names from class IDs for display purposes
 */
export const getClassNamesByIds = async (classIds) => {
  if (!classIds || classIds.length === 0) {
    return { success: true, data: [] };
  }
  
  try {
    const { data: classes, error } = await supabase
      .from('classes')
      .select('id, name, level, category')
      .in('id', classIds);

    if (error) {
      console.error('Supabase error fetching class names:', error);
      return { success: false, error: error.message };
    }
    
    const classNames = classes.map(classData => ({
      id: classData.id,
      name: classData.name,
      level: classData.level,
      category: classData.category
    }));
    
    return { success: true, data: classNames };
  } catch (error) {
    console.error('Error fetching class names:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Format class names for display
 */
export const formatClassNames = (classes) => {
  if (!classes || classes.length === 0) return 'No classes';
  
  if (classes.length === 1) {
    const cls = classes[0];
    return `${cls.name} - ${cls.level}${cls.category ? ` (${cls.category})` : ''}`;
  }
  
  if (classes.length <= 3) {
    return classes.map(cls => 
      `${cls.name} - ${cls.level}${cls.category ? ` (${cls.category})` : ''}`
    ).join(', ');
  }
  
  return `${classes.length} classes (${classes.slice(0, 2).map(cls => cls.name).join(', ')}, +${classes.length - 2} more)`;
};

/**
 * Get class display info by ID
 */
export const getClassDisplayInfo = async (classId) => {
  try {
    const { data: classData, error } = await supabase
      .from('classes')
      .select('id, name, level, category')
      .eq('id', classId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return { success: false, error: 'Class not found' };
      }
      console.error('Supabase error fetching class display info:', error);
      return { success: false, error: error.message };
    }

    const displayInfo = {
      id: classData.id,
      name: classData.name,
      level: classData.level,
      category: classData.category,
      fullName: `${classData.name} - ${classData.level}${classData.category ? ` (${classData.category})` : ''}`,
      shortName: classData.name
    };

    return { success: true, data: displayInfo };
  } catch (error) {
    console.error('Error fetching class display info:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get all classes for display with optional filtering
 */
export const getAllClassesForDisplay = async (filters = {}) => {
  try {
    let query = supabase
      .from('classes')
      .select('id, name, level, category');

    // Apply filters
    if (filters.level) {
      query = query.eq('level', filters.level);
    }

    if (filters.category) {
      query = query.eq('category', filters.category);
    }

    // Apply ordering
    query = query.order('level').order('name');

    const { data: classes, error } = await query;

    if (error) {
      console.error('Supabase error fetching classes for display:', error);
      return { success: false, error: error.message };
    }

    const displayClasses = classes.map(cls => ({
      id: cls.id,
      name: cls.name,
      level: cls.level,
      category: cls.category,
      fullName: `${cls.name} - ${cls.level}${cls.category ? ` (${cls.category})` : ''}`,
      shortName: cls.name
    }));

    return { success: true, data: displayClasses };
  } catch (error) {
    console.error('Error fetching classes for display:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Group classes by level for display
 */
export const getClassesGroupedByLevel = async () => {
  try {
    const classesResult = await getAllClassesForDisplay();
    
    if (!classesResult.success) {
      return classesResult;
    }

    const classes = classesResult.data;
    const groupedClasses = {};

    classes.forEach(cls => {
      if (!groupedClasses[cls.level]) {
        groupedClasses[cls.level] = [];
      }
      groupedClasses[cls.level].push(cls);
    });

    return { success: true, data: groupedClasses };
  } catch (error) {
    console.error('Error grouping classes by level:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Group classes by category for display
 */
export const getClassesGroupedByCategory = async () => {
  try {
    const classesResult = await getAllClassesForDisplay();
    
    if (!classesResult.success) {
      return classesResult;
    }

    const classes = classesResult.data;
    const groupedClasses = {};

    classes.forEach(cls => {
      const category = cls.category || 'General';
      if (!groupedClasses[category]) {
        groupedClasses[category] = [];
      }
      groupedClasses[category].push(cls);
    });

    return { success: true, data: groupedClasses };
  } catch (error) {
    console.error('Error grouping classes by category:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get class hierarchy for display (Level > Category > Classes)
 */
export const getClassHierarchy = async () => {
  try {
    const classesResult = await getAllClassesForDisplay();
    
    if (!classesResult.success) {
      return classesResult;
    }

    const classes = classesResult.data;
    const hierarchy = {};

    classes.forEach(cls => {
      const level = cls.level;
      const category = cls.category || 'General';

      if (!hierarchy[level]) {
        hierarchy[level] = {};
      }

      if (!hierarchy[level][category]) {
        hierarchy[level][category] = [];
      }

      hierarchy[level][category].push(cls);
    });

    return { success: true, data: hierarchy };
  } catch (error) {
    console.error('Error creating class hierarchy:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Search classes by name or level
 */
export const searchClasses = async (searchTerm) => {
  try {
    const { data: classes, error } = await supabase
      .from('classes')
      .select('id, name, level, category')
      .or(`name.ilike.%${searchTerm}%,level.ilike.%${searchTerm}%,category.ilike.%${searchTerm}%`)
      .order('name');

    if (error) {
      console.error('Supabase error searching classes:', error);
      return { success: false, error: error.message };
    }

    const displayClasses = classes.map(cls => ({
      id: cls.id,
      name: cls.name,
      level: cls.level,
      category: cls.category,
      fullName: `${cls.name} - ${cls.level}${cls.category ? ` (${cls.category})` : ''}`,
      shortName: cls.name
    }));

    return { success: true, data: displayClasses };
  } catch (error) {
    console.error('Error searching classes:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get class options for select dropdowns
 */
export const getClassOptions = async (includeEmpty = true) => {
  try {
    const classesResult = await getAllClassesForDisplay();
    
    if (!classesResult.success) {
      return classesResult;
    }

    const classes = classesResult.data;
    const options = classes.map(cls => ({
      value: cls.id,
      label: cls.fullName,
      level: cls.level,
      category: cls.category
    }));

    if (includeEmpty) {
      options.unshift({
        value: '',
        label: 'Select a class...',
        level: null,
        category: null
      });
    }

    return { success: true, data: options };
  } catch (error) {
    console.error('Error getting class options:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get class statistics for display
 */
export const getClassDisplayStatistics = async () => {
  try {
    const classesResult = await getAllClassesForDisplay();
    
    if (!classesResult.success) {
      return classesResult;
    }

    const classes = classesResult.data;
    
    const stats = {
      totalClasses: classes.length,
      byLevel: {},
      byCategory: {},
      levels: [...new Set(classes.map(cls => cls.level))],
      categories: [...new Set(classes.map(cls => cls.category).filter(Boolean))]
    };

    // Count by level
    classes.forEach(cls => {
      if (!stats.byLevel[cls.level]) {
        stats.byLevel[cls.level] = 0;
      }
      stats.byLevel[cls.level]++;
    });

    // Count by category
    classes.forEach(cls => {
      const category = cls.category || 'General';
      if (!stats.byCategory[category]) {
        stats.byCategory[category] = 0;
      }
      stats.byCategory[category]++;
    });

    return { success: true, data: stats };
  } catch (error) {
    console.error('Error getting class display statistics:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Validate class IDs
 */
export const validateClassIds = async (classIds) => {
  try {
    if (!classIds || classIds.length === 0) {
      return { success: true, data: { valid: [], invalid: [] } };
    }

    const { data: existingClasses, error } = await supabase
      .from('classes')
      .select('id')
      .in('id', classIds);

    if (error) {
      console.error('Supabase error validating class IDs:', error);
      return { success: false, error: error.message };
    }

    const existingIds = existingClasses.map(cls => cls.id);
    const invalidIds = classIds.filter(id => !existingIds.includes(id));

    return {
      success: true,
      data: {
        valid: existingIds,
        invalid: invalidIds,
        allValid: invalidIds.length === 0
      }
    };
  } catch (error) {
    console.error('Error validating class IDs:', error);
    return { success: false, error: error.message };
  }
};

// Export as service object for easier usage
export const classDisplayService = {
  getClassNamesByIds,
  formatClassNames,
  getClassDisplayInfo,
  getAllClassesForDisplay,
  getClassesGroupedByLevel,
  getClassesGroupedByCategory,
  getClassHierarchy,
  searchClasses,
  getClassOptions,
  getClassDisplayStatistics,
  validateClassIds
};