// src/utils/migrationHelper.js
// Helper utility to migrate from Firebase to Supabase services

/**
 * Import mapping for migrating from Firebase to Supabase services
 * Use this to update your existing components
 */

// OLD FIREBASE IMPORTS (Replace these)
export const FIREBASE_TO_SUPABASE_MAPPING = {
  // User Service
  'import { getUserRole } from "../services/userService"': 
    'import { getUserRole } from "../services/supabase/userService"',
  
  'import { checkUserRole } from "../services/userService"': 
    'import { checkUserRole } from "../services/supabase/userService"',
  
  'import { getUserProfile } from "../services/userService"': 
    'import { getUserProfile } from "../services/supabase/userService"',

  // Class Service
  'import { getClasses } from "../services/classService"': 
    'import { getClasses } from "../services/supabase/classService"',
  
  'import { createClass } from "../services/classService"': 
    'import { createClass } from "../services/supabase/classService"',
  
  'import { updateClass } from "../services/classService"': 
    'import { updateClass } from "../services/supabase/classService"',

  // Subject Service
  'import { getSubjects } from "../services/subjectService"': 
    'import { getSubjects } from "../services/supabase/subjectService"',
  
  'import { createSubject } from "../services/subjectService"': 
    'import { createSubject } from "../services/supabase/subjectService"',

  // News Service
  'import { getNewsEvents } from "../services/newsService"': 
    'import { getNewsEvents } from "../services/supabase/newsService"',
  
  'import { createNews } from "../services/newsService"': 
    'import { createNews } from "../services/supabase/newsService"',

  // Firebase config imports (Remove these)
  'import { db } from "../firebase/config"': '// Removed Firebase import',
  'import { auth } from "../firebase/config"': '// Removed Firebase import',
  'import { storage } from "../firebase/config"': '// Removed Firebase import',

  // Firebase Firestore imports (Remove these)
  'import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, where, orderBy, limit } from "firebase/firestore"':
    '// Removed Firebase Firestore imports - using Supabase instead',

  // Firebase Auth imports (Remove these)  
  'import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth"':
    '// Removed Firebase Auth imports - using Supabase Auth instead'
}

/**
 * Common patterns to replace in your components
 */
export const COMMON_PATTERNS = {
  // Firebase Firestore patterns → Supabase patterns
  firestore: {
    // Collection reference
    old: 'collection(db, "tableName")',
    new: 'supabase.from("tableName")'
  },
  
  // Query patterns
  query: {
    old: 'getDocs(query(collection(db, "table"), where("field", "==", value)))',
    new: 'supabase.from("table").select("*").eq("field", value)'
  },
  
  // Add document
  add: {
    old: 'addDoc(collection(db, "table"), data)',
    new: 'supabase.from("table").insert(data)'
  },
  
  // Update document
  update: {
    old: 'updateDoc(doc(db, "table", id), updates)',
    new: 'supabase.from("table").update(updates).eq("id", id)'
  },
  
  // Delete document
  delete: {
    old: 'deleteDoc(doc(db, "table", id))',
    new: 'supabase.from("table").delete().eq("id", id)'
  }
}

/**
 * File upload patterns
 */
export const STORAGE_PATTERNS = {
  // Firebase Storage → Supabase Storage (Direct API)
  upload: {
    old: 'uploadBytes(ref(storage, path), file)',
    new: 'directStorageClient.upload(bucketName, fileName, file)'
  },
  
  getUrl: {
    old: 'getDownloadURL(ref(storage, path))',
    new: 'directStorageClient.getPublicUrl(bucketName, fileName)'
  }
}

/**
 * Authentication patterns
 */
export const AUTH_PATTERNS = {
  // Firebase Auth → Supabase Auth
  getCurrentUser: {
    old: 'auth.currentUser',
    new: 'supabase.auth.getUser()'
  },
  
  signIn: {
    old: 'signInWithEmailAndPassword(auth, email, password)',
    new: 'supabase.auth.signInWithPassword({ email, password })'
  },
  
  signOut: {
    old: 'signOut(auth)',
    new: 'supabase.auth.signOut()'
  }
}

/**
 * Quick migration checklist for components
 */
export const MIGRATION_CHECKLIST = [
  '1. Replace Firebase imports with Supabase service imports',
  '2. Update Firebase Firestore calls to Supabase queries',
  '3. Replace Firebase Auth calls with Supabase Auth',
  '4. Update file upload code to use directStorageClient',
  '5. Replace serverTimestamp() with new Date().toISOString()',
  '6. Update error handling for Supabase response format',
  '7. Test the component functionality',
  '8. Remove unused Firebase imports'
]

/**
 * Helper function to show migration status
 */
export const getMigrationStatus = (componentPath) => {
  return {
    component: componentPath,
    status: 'pending',
    steps: MIGRATION_CHECKLIST,
    patterns: {
      firestore: COMMON_PATTERNS,
      storage: STORAGE_PATTERNS,
      auth: AUTH_PATTERNS
    }
  }
}

export default {
  FIREBASE_TO_SUPABASE_MAPPING,
  COMMON_PATTERNS,
  STORAGE_PATTERNS,
  AUTH_PATTERNS,
  MIGRATION_CHECKLIST,
  getMigrationStatus
}