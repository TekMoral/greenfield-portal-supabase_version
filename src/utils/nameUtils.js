/**
 * Get full name from student/user object
 */
export const getFullName = (person) => {
  if (!person) return 'Unknown';
  
  if (person.name) {
    return person.name;
  }
  
  if (person.firstName && person.surname) {
    return `${person.firstName} ${person.surname}`;
  }
  
  if (person.firstName) {
    return person.firstName;
  }
  
  if (person.surname) {
    return person.surname;
  }
  
  return 'Unknown';
};

/**
 * Get initials from student/user object
 */
export const getInitials = (person) => {
  if (!person) return 'U';
  
  const fullName = getFullName(person);
  
  if (fullName === 'Unknown') return 'U';
  
  const nameParts = fullName.split(' ').filter(part => part.length > 0);
  
  if (nameParts.length === 0) return 'U';
  if (nameParts.length === 1) return nameParts[0].charAt(0).toUpperCase();
  
  return (nameParts[0].charAt(0) + nameParts[nameParts.length - 1].charAt(0)).toUpperCase();
};

/**
 * Format name for display (capitalize first letters)
 */
export const formatName = (name) => {
  if (!name) return 'Unknown';
  
  return name
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

/**
 * Get display name with fallback
 */
export const getDisplayName = (person, fallback = 'Unknown User') => {
  const name = getFullName(person);
  return name === 'Unknown' ? fallback : formatName(name);
};

/**
 * Check if a person's name matches a search query
 */
export const nameMatchesSearch = (person, searchQuery) => {
  if (!searchQuery || !person) return true;
  
  const query = searchQuery.toLowerCase().trim();
  if (!query) return true;
  
  const fullName = getFullName(person).toLowerCase();
  const firstName = person.firstName?.toLowerCase() || '';
  const surname = person.surname?.toLowerCase() || '';
  const admissionNumber = person.admissionNumber?.toLowerCase() || '';
  
  return fullName.includes(query) || 
         firstName.includes(query) || 
         surname.includes(query) ||
         admissionNumber.includes(query);
};