// src/services/emailService.js
/**
 * Email Service for School Portal
 * Handles password reset, exam result notifications, and report card emails via Supabase Edge Functions
 */

import { supabase } from '../lib/supabaseClient';

class EmailService {
  constructor() {
    this.initialized = false;
  }

  /**
   * Initialize the service
   */
  async initialize() {
    try {
      this.initialized = true;
      return { success: true };
    } catch (error) {
      console.error('Failed to initialize email service:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send email via Supabase Edge Function
   */
  async sendEmail(type, data) {
    try {
      if (!this.initialized) {
        await this.initialize();
      }

      console.log(`📧 Sending ${type} email...`, { type, recipient: data.email });

      const { data: result, error } = await supabase.functions.invoke('send-email', {
        body: {
          type,
          data
        }
      });

      if (error) {
        console.error('Email service error:', error);
        throw new Error(error.message || 'Failed to send email');
      }

      if (!result.success) {
        throw new Error(result.error || 'Email sending failed');
      }

      console.log('✅ Email sent successfully:', result.data);
      return { success: true, data: result.data };
    } catch (error) {
      console.error('Failed to send email:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail({ email, resetLink, userName }) {
    if (!email || !resetLink) {
      return { success: false, error: 'Email and reset link are required' };
    }

    return await this.sendEmail('password_reset', {
      email,
      resetLink,
      userName
    });
  }

  /**
   * Send exam result notification email
   */
  async sendExamResultNotification({ 
    email, 
    userName, 
    studentName, 
    examTitle, 
    term, 
    academicYear, 
    resultsLink 
  }) {
    if (!email || !studentName || !examTitle || !resultsLink) {
      return { 
        success: false, 
        error: 'Email, student name, exam title, and results link are required' 
      };
    }

    return await this.sendEmail('exam_result', {
      email,
      userName,
      studentName,
      examTitle,
      term,
      academicYear,
      resultsLink
    });
  }

  /**
   * Send report card notification email
   */
  async sendReportCardNotification({ 
    email, 
    userName, 
    studentName, 
    term, 
    academicYear, 
    reportLink, 
    reportType = 'Term Report' 
  }) {
    if (!email || !studentName || !reportLink) {
      return { 
        success: false, 
        error: 'Email, student name, and report link are required' 
      };
    }

    return await this.sendEmail('report_card', {
      email,
      userName,
      studentName,
      term,
      academicYear,
      reportLink,
      reportType
    });
  }

  /**
   * Send bulk notification emails
   */
  async sendBulkNotification({ recipients, subject, content }) {
    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return { success: false, error: 'Recipients array is required' };
    }

    if (!subject || !content) {
      return { success: false, error: 'Subject and content are required' };
    }

    return await this.sendEmail('bulk_notification', {
      recipients,
      subject,
      content
    });
  }

  /**
   * Test email connectivity
   */
  async testConnection(testEmail = null) {
    try {
      const result = await this.sendEmail('test', {
        email: testEmail || 'test@greenfieldcollege.name.ng'
      });

      return result;
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Send password reset email to student
   */
  async sendStudentPasswordReset(student) {
    try {
      const resetLink = `${window.location.origin}/reset-password?token=RESET_TOKEN&email=${encodeURIComponent(student.email)}`;
      
      return await this.sendPasswordResetEmail({
        email: student.email,
        resetLink,
        userName: student.full_name || student.first_name
      });
    } catch (error) {
      console.error('Error sending student password reset:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send password reset email to teacher
   */
  async sendTeacherPasswordReset(teacher) {
    try {
      const resetLink = `${window.location.origin}/reset-password?token=RESET_TOKEN&email=${encodeURIComponent(teacher.email)}`;
      
      return await this.sendPasswordResetEmail({
        email: teacher.email,
        resetLink,
        userName: teacher.full_name || teacher.name
      });
    } catch (error) {
      console.error('Error sending teacher password reset:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send exam results to parents/guardians
   */
  async notifyExamResults({ students, examTitle, term, academicYear }) {
    const results = [];
    
    for (const student of students) {
      try {
        // Send to guardian email if available, otherwise to student email
        const recipientEmail = student.guardian_email || student.email;
        const recipientName = student.guardian_name || `${student.first_name}'s Guardian`;
        
        if (!recipientEmail) {
          results.push({
            studentId: student.id,
            studentName: student.full_name,
            success: false,
            error: 'No email address available'
          });
          continue;
        }

        const resultsLink = `${window.location.origin}/student/results?exam=${examTitle}&student=${student.id}`;
        
        const result = await this.sendExamResultNotification({
          email: recipientEmail,
          userName: recipientName,
          studentName: student.full_name,
          examTitle,
          term,
          academicYear,
          resultsLink
        });

        results.push({
          studentId: student.id,
          studentName: student.full_name,
          email: recipientEmail,
          ...result
        });

        // Add small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        results.push({
          studentId: student.id,
          studentName: student.full_name,
          success: false,
          error: error.message
        });
      }
    }

    return {
      success: true,
      results,
      summary: {
        total: students.length,
        sent: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length
      }
    };
  }

  /**
   * Send report cards to parents/guardians
   */
  async notifyReportCards({ students, term, academicYear, reportType = 'Term Report' }) {
    const results = [];
    
    for (const student of students) {
      try {
        // Send to guardian email if available, otherwise to student email
        const recipientEmail = student.guardian_email || student.email;
        const recipientName = student.guardian_name || `${student.first_name}'s Guardian`;
        
        if (!recipientEmail) {
          results.push({
            studentId: student.id,
            studentName: student.full_name,
            success: false,
            error: 'No email address available'
          });
          continue;
        }

        const reportLink = `${window.location.origin}/reports/download?student=${student.id}&term=${term}&year=${academicYear}`;
        
        const result = await this.sendReportCardNotification({
          email: recipientEmail,
          userName: recipientName,
          studentName: student.full_name,
          term,
          academicYear,
          reportLink,
          reportType
        });

        results.push({
          studentId: student.id,
          studentName: student.full_name,
          email: recipientEmail,
          ...result
        });

        // Add small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        results.push({
          studentId: student.id,
          studentName: student.full_name,
          success: false,
          error: error.message
        });
      }
    }

    return {
      success: true,
      results,
      summary: {
        total: students.length,
        sent: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length
      }
    };
  }
}

// Create and export singleton instance
const emailService = new EmailService();
export default emailService;

// Named exports for specific functions
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
} = emailService;