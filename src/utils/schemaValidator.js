// src/utils/schemaValidator.js
import { supabase } from '../lib/supabaseClient'

// List of required tables from our schema
const REQUIRED_TABLES = [
  'user_profiles',
  'classes',
  'subjects',
  'teacher_assignments',
  'exams',
  'exam_results',
  'assignments',
  'assignment_submissions',
  'grades',
  'attendance',
  'timetables',
  'student_reports',
  'news_events',
  'carousel_images',
  'notifications',
  'student_documents',
  'audit_logs'
]

// Check if all required tables exist
export const validateSchema = async () => {
  try {
    const results = []
    
    for (const tableName of REQUIRED_TABLES) {
      try {
        // Try to query the table (just count, no actual data)
        const { error } = await supabase
          .from(tableName)
          .select('*', { count: 'exact', head: true })
          .limit(1)
        
        if (error) {
          results.push({
            table: tableName,
            exists: false,
            error: error.message
          })
        } else {
          results.push({
            table: tableName,
            exists: true,
            error: null
          })
        }
      } catch (err) {
        results.push({
          table: tableName,
          exists: false,
          error: err.message
        })
      }
    }
    
    const missingTables = results.filter(r => !r.exists)
    const existingTables = results.filter(r => r.exists)
    
    return {
      success: missingTables.length === 0,
      totalTables: REQUIRED_TABLES.length,
      existingTables: existingTables.length,
      missingTables: missingTables.length,
      results,
      missingTableNames: missingTables.map(t => t.table)
    }
  } catch (error) {
    return {
      success: false,
      error: error.message,
      results: []
    }
  }
}

// Check if RLS is enabled on tables
export const checkRLSStatus = async () => {
  try {
    // This would require admin access to check pg_tables
    // For now, we'll just test if we can access tables with RLS
    const testTables = ['user_profiles', 'classes', 'subjects']
    const results = []
    
    for (const tableName of testTables) {
      try {
        const { error } = await supabase
          .from(tableName)
          .select('*')
          .limit(1)
        
        results.push({
          table: tableName,
          accessible: !error,
          error: error?.message || null
        })
      } catch (err) {
        results.push({
          table: tableName,
          accessible: false,
          error: err.message
        })
      }
    }
    
    return {
      success: true,
      results
    }
  } catch (error) {
    return {
      success: false,
      error: error.message
    }
  }
}

// Test basic CRUD operations
export const testBasicOperations = async () => {
  try {
    // Test reading from a public table (classes should be readable by authenticated users)
    const { data: classes, error: classError } = await supabase
      .from('classes')
      .select('*')
      .limit(5)
    
    // Test reading from subjects
    const { data: subjects, error: subjectError } = await supabase
      .from('subjects')
      .select('*')
      .limit(5)
    
    return {
      success: true,
      tests: {
        readClasses: {
          success: !classError,
          error: classError?.message,
          dataCount: classes?.length || 0
        },
        readSubjects: {
          success: !subjectError,
          error: subjectError?.message,
          dataCount: subjects?.length || 0
        }
      }
    }
  } catch (error) {
    return {
      success: false,
      error: error.message
    }
  }
}