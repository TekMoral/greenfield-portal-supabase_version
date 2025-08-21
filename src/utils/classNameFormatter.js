/**
 * Utility function to format class names consistently
 * Ensures there's always a single space between letters and numbers
 * Examples: 
 * - "SSS1" -> "SSS 1"
 * - "JSS 1" -> "JSS 1" 
 * - "sss1" -> "SSS 1"
 * - "jss 1" -> "JSS 1"
 * - "Primary1" -> "Primary 1"
 * - "Basic1" -> "Basic 1"
 */

export const formatClassName = (className) => {
  if (!className || typeof className !== 'string') {
    return className;
  }

  // Convert to uppercase for consistency
  let formatted = className.trim().toUpperCase();
  
  // Handle common patterns: letters followed by numbers
  // This regex finds letters followed immediately by numbers and adds a space
  formatted = formatted.replace(/([A-Z]+)(\d+)/g, '$1 $2');
  
  // Handle cases where there might be multiple spaces
  formatted = formatted.replace(/\s+/g, ' ');
  
  // Handle specific common patterns
  const patterns = [
    // JSS patterns
    { pattern: /^JSS\s*(\d+)$/i, replacement: 'JSS $1' },
    // SSS patterns  
    { pattern: /^SSS\s*(\d+)$/i, replacement: 'SSS $1' },
    // Primary patterns
    { pattern: /^PRIMARY\s*(\d+)$/i, replacement: 'Primary $1' },
    // Basic patterns
    { pattern: /^BASIC\s*(\d+)$/i, replacement: 'Basic $1' },
    // Nursery patterns
    { pattern: /^NURSERY\s*(\d+)$/i, replacement: 'Nursery $1' },
    // KG patterns
    { pattern: /^KG\s*(\d+)$/i, replacement: 'KG $1' },
  ];

  // Apply specific patterns
  for (const { pattern, replacement } of patterns) {
    if (pattern.test(formatted)) {
      formatted = formatted.replace(pattern, replacement);
      break;
    }
  }

  return formatted.trim();
};

/**
 * Format class name for display with level
 * @param {string} className - The class name
 * @param {string} level - The class level (optional)
 * @returns {string} Formatted class name with level
 */
export const formatClassWithLevel = (className, level) => {
  const formattedClass = formatClassName(className);
  
  if (!level) {
    return formattedClass;
  }
  
  return `${formattedClass} ${level}`.trim();
};

/**
 * Format class name for display with level and category
 * @param {string} className - The class name
 * @param {string} level - The class level (optional)
 * @param {string} category - The class category (optional)
 * @returns {string} Formatted class name with level and category
 */
export const formatFullClassName = (className, level, category) => {
  let formatted = formatClassWithLevel(className, level);
  
  if (category) {
    formatted += ` (${category})`;
  }
  
  return formatted;
};

/**
 * Sorts classes according to Nigerian school hierarchy and numerical order
 * @param {Array} classes - Array of class objects with name, level, and category properties
 * @returns {Array} - Sorted array of classes
 */
export const sortClasses = (classes) => {
  return classes.sort((a, b) => {
    // First sort by level (Junior before Senior)
    if (a.level !== b.level) {
      return a.level === "Junior" ? -1 : 1;
    }

    // Helper function to parse class names for proper sorting
    const parseClassName = (name) => {
      // Handle different class patterns
      const patterns = [
        { regex: /^(JSS|jss)\s*(\d+)$/i, prefix: 'JSS', order: 1 },
        { regex: /^(SSS|sss)\s*(\d+)$/i, prefix: 'SSS', order: 2 },
        { regex: /^(Primary|primary)\s*(\d+)$/i, prefix: 'Primary', order: 3 },
        { regex: /^(Basic|basic)\s*(\d+)$/i, prefix: 'Basic', order: 4 },
        { regex: /^(Nursery|nursery)\s*(\d+)$/i, prefix: 'Nursery', order: 5 },
        { regex: /^(KG|kg)\s*(\d+)$/i, prefix: 'KG', order: 6 },
      ];

      for (const pattern of patterns) {
        const match = name.match(pattern.regex);
        if (match) {
          return {
            prefix: pattern.prefix,
            number: parseInt(match[2], 10),
            order: pattern.order,
            original: name
          };
        }
      }

      // Fallback for unrecognized patterns
      return {
        prefix: name,
        number: 0,
        order: 999,
        original: name
      };
    };

    const classA = parseClassName(a.name);
    const classB = parseClassName(b.name);

    // First compare by class type order (JSS before SSS, etc.)
    if (classA.order !== classB.order) {
      return classA.order - classB.order;
    }

    // If same class type, compare by number (JSS1 before JSS2)
    if (classA.number !== classB.number) {
      return classA.number - classB.number;
    }

    // If same prefix and number, compare by category (for Senior classes)
    if (a.category && b.category) {
      const categoryOrder = { 'Science': 1, 'Art': 2, 'Commercial': 3 };
      const orderA = categoryOrder[a.category] || 999;
      const orderB = categoryOrder[b.category] || 999;
      if (orderA !== orderB) {
        return orderA - orderB;
      }
    }

    // Final fallback to alphabetical
    return a.name.localeCompare(b.name);
  });
};

export default formatClassName;