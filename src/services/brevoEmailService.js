// src/services/brevoEmailService.js
// Deprecated: direct client-side Brevo usage has been removed.
// All email sending is now handled by the Supabase Edge Function `send-email`.
// This module proxies to the central emailService which invokes the Edge Function.

import emailService from './emailService.js'

// Keep default export for backward compatibility
export default emailService

// Re-export named helpers for backward compatibility
export const {
  sendPasswordResetEmail,
  sendExamResultNotification,
  sendReportCardNotification,
  sendBulkNotification,
  testConnection,
  sendStudentPasswordReset,
  sendTeacherPasswordReset,
  notifyExamResults,
  notifyReportCards
} = emailService
