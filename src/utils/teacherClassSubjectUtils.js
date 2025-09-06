// Utility functions for teacher class/subject operations across pages
// - Aggregate subjects across teacher classes
// - Compute class options for a selected subject (grouped vs individual)
// - Expand a selected class entry into concrete class IDs for data fetching

// Extract a base class label by stripping trailing category labels
// Uses the same normalization as the assignment modal for consistency
const extractBaseLabel = (name) => {
  if (!name) return '';
  const rawName = String(name).toUpperCase().trim().replace(/\s+/g, ' ');
  // Strip trailing category labels
  const stripped = rawName.replace(/\s+(SCIENCE|ARTS?|COMMERCIAL)$/, '');
  // Match common senior/junior patterns and normalize to standard format
  let m = stripped.match(/^(JSS|JS|JUNIOR( SECONDARY)?)\s*(\d+)/i);
  if (m) return `JSS ${m[3]}`;
  m = stripped.match(/^(SSS|SS|SENIOR( SECONDARY)?)\s*(\d+)/i);
  if (m) return `SSS ${m[3]}`;
  // Fallback: try to extract the first number and infer level by presence of SSS/JSS
  const num = (stripped.match(/\b(\d)\b/) || [])[1];
  if (/JSS|JUNIOR/.test(stripped) && num) return `JSS ${num}`;
  if (/SSS|SENIOR/.test(stripped) && num) return `SSS ${num}`;
  return stripped; // final fallback
};

const normalize = (v) => String(v || '').trim().toLowerCase();

const matchesSubject = (s, subjectId, subjectName) => {
  if (!s) return false;
  if (subjectId) return String(s.subjectId) === String(subjectId);
  return normalize(s.subjectName) === normalize(subjectName);
};

// Returns unique subjects across teacherClasses as { subjectId, subjectName }
export const aggregateSubjects = (teacherClasses) => {
  const map = new Map();
  (Array.isArray(teacherClasses) ? teacherClasses : []).forEach((cls) => {
    (cls.subjectsTaught || []).forEach((s) => {
      const key = String(s.subjectId || s.subjectName);
      if (!map.has(key)) {
        map.set(key, { subjectId: s.subjectId || '', subjectName: s.subjectName });
      }
    });
  });
  return Array.from(map.values());
};

// Compute class options for a subject.
// If the subject is core, return grouped class entries (isGrouped true, category 'All Categories').
// Otherwise return individual classes per category.
// Optionally pass coreSubjects array to enforce "core" even if grouped entries are not present.
export const getClassesForSubject = (teacherClasses, { subjectId = '', subjectName = '', coreSubjects = [] } = {}) => {
  const list = Array.isArray(teacherClasses) ? teacherClasses : [];
  const isSubjectIn = (ci) => (ci.subjectsTaught || []).some((s) => matchesSubject(s, subjectId, subjectName));

  // Detect core by: existing grouped entries OR department flag OR provided core subject list
  const groupedHasSubject = list.some((ci) => ci.isGrouped && isSubjectIn(ci));
  const deptCore = list.some((ci) => (ci.subjectsTaught || []).some((s) => matchesSubject(s, subjectId, subjectName) && normalize(s.department) === 'core'));
  const providedCore = subjectName && Array.isArray(coreSubjects) && coreSubjects.map(normalize).includes(normalize(subjectName));
  const isCore = groupedHasSubject || deptCore || providedCore;

  const out = [];
  if (isCore) {
    // Prefer precomputed grouped classes
    const anyGrouped = list.some((ci) => ci.isGrouped);
    if (anyGrouped) {
      list.forEach((ci) => {
        if (ci.isGrouped && isSubjectIn(ci)) {
          out.push({
            id: ci.id,
            name: ci.name,
            level: ci.level,
            category: 'All Categories',
            isGrouped: true,
            studentCount: ci.studentCount,
            individualClasses: ci.individualClasses,
            subjectsTaught: ci.subjectsTaught, // Preserve subjects
          });
        }
      });
      // Sort by name then level for stability
      return out.sort((a, b) => a.name.localeCompare(b.name) || String(a.level).localeCompare(String(b.level)));
    }

    // Fallback: derive groups from individual classes by base label
    const groups = new Map();
    list.forEach((ci) => {
      if (!ci.isGrouped && isSubjectIn(ci)) {
        const base = extractBaseLabel(ci.name);
        const groupKey = base; // Use normalized base as key
        if (!groups.has(groupKey)) {
          groups.set(groupKey, {
            id: `${base.replace(/\s+/g, '_')}_GROUPED`,
            name: base,
            level: ci.level,
            category: 'All Categories',
            isGrouped: true,
            studentCount: 0,
            individualClasses: [],
            subjectsTaught: [], // Initialize subjects array
          });
        }
        const g = groups.get(groupKey);
        g.studentCount += ci.studentCount || 0;
        
        // Merge subjects from this class
        (ci.subjectsTaught || []).forEach(subject => {
          if (!g.subjectsTaught.some(s => s.subjectName === subject.subjectName)) {
            g.subjectsTaught.push(subject);
          }
        });
        
        // Deduplicate individualClasses by id
        const icId = String(ci.id);
        if (!g.individualClasses.some(ic => String(ic.id) === icId)) {
          g.individualClasses.push({ id: ci.id, name: ci.name, category: ci.category, studentCount: ci.studentCount });
        }
      }
    });
    return Array.from(groups.values()).sort((a, b) => a.name.localeCompare(b.name) || String(a.level).localeCompare(String(b.level)));
  }

  // Non-core: return individual classes that have the subject
  list.forEach((ci) => {
    if (!ci.isGrouped && isSubjectIn(ci)) {
      out.push({
        id: ci.id,
        name: ci.name,
        level: ci.level,
        category: ci.category,
        isGrouped: false,
        studentCount: ci.studentCount,
        subjectsTaught: ci.subjectsTaught, // Preserve subjects
      });
    }
  });
  return out.sort((a, b) => a.name.localeCompare(b.name) || String(a.level).localeCompare(String(b.level)));
};

// Expand a class entry (grouped or individual) into class IDs for fetching students
export const expandClassEntryToIds = (classEntry) => {
  if (!classEntry) return [];
  if (classEntry.isGrouped && Array.isArray(classEntry.individualClasses)) {
    return classEntry.individualClasses.map((c) => c.id);
  }
  return [classEntry.id];
};

export default {
  aggregateSubjects,
  getClassesForSubject,
  expandClassEntryToIds,
};
