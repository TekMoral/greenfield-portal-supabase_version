// src/services/brevoEmailService.js
/**
 * Brevo Email Service for School Portal
 * Handles password reset, exam result notifications, and report card emails
 */

const BREVO_API_URL = 'https://api.brevo.com/v3';

class BrevoEmailService {
  constructor() {
    this.apiKey = null;
    this.initialized = false;
  }

  /**
   * Initialize the service with API key from environment or Supabase secrets
   */
  async initialize() {
    try {
      // Try to get API key from environment first (for development)
      this.apiKey = import.meta.env.VITE_BREVO_API_KEY;
      
      if (!this.apiKey) {
        // In production, we'll get it from Supabase Edge Function
        console.log('Brevo API key not found in environment, will use Edge Function');
      }
      
      this.initialized = true;
      return { success: true };
    } catch (error) {
      console.error('Failed to initialize Brevo service:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send email via Brevo API
   */
  async sendEmail(emailData) {
    try {
      if (!this.initialized) {
        await this.initialize();
      }

      const response = await fetch(`${BREVO_API_URL}/smtp/email`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'api-key': this.apiKey
        },
        body: JSON.stringify(emailData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Brevo API error: ${errorData.message || response.statusText}`);
      }

      const result = await response.json();
      return { success: true, data: result };
    } catch (error) {
      console.error('Failed to send email via Brevo:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail({ email, resetLink, userName }) {
    const emailData = {
      sender: {
        name: "Greenfield School Portal",
        email: "noreply@greenfield.edu.ng"
      },
      to: [
        {
          email: email,
          name: userName || email.split('@')[0]
        }
      ],
      subject: "Password Reset Request - Greenfield School Portal",
      htmlContent: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Password Reset</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
            .button { display: inline-block; background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
            .warning { background: #fef3c7; border: 1px solid #f59e0b; padding: 15px; border-radius: 6px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔐 Password Reset Request</h1>
              <p>Greenfield School Portal</p>
            </div>
            <div class="content">
              <h2>Hello ${userName || 'User'},</h2>
              <p>We received a request to reset your password for your Greenfield School Portal account.</p>
              
              <p>Click the button below to reset your password:</p>
              <a href="${resetLink}" class="button">Reset Password</a>
              
              <div class="warning">
                <strong>⚠️ Security Notice:</strong>
                <ul>
                  <li>This link will expire in 1 hour for security reasons</li>
                  <li>If you didn't request this reset, please ignore this email</li>
                  <li>Never share this link with anyone</li>
                </ul>
              </div>
              
              <p>If the button doesn't work, copy and paste this link into your browser:</p>
              <p style="word-break: break-all; background: #e5e7eb; padding: 10px; border-radius: 4px; font-family: monospace;">${resetLink}</p>
              
              <p>If you have any questions, please contact the school administration.</p>
              
              <p>Best regards,<br>
              <strong>Greenfield School Portal Team</strong></p>
            </div>
            <div class="footer">
              <p>This is an automated message. Please do not reply to this email.</p>
              <p>&copy; ${new Date().getFullYear()} Greenfield School. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      textContent: `
        Password Reset Request - Greenfield School Portal
        
        Hello ${userName || 'User'},
        
        We received a request to reset your password for your Greenfield School Portal account.
        
        Please click the following link to reset your password:
        ${resetLink}
        
        Security Notice:
        - This link will expire in 1 hour for security reasons
        - If you didn't request this reset, please ignore this email
        - Never share this link with anyone
        
        If you have any questions, please contact the school administration.
        
        Best regards,
        Greenfield School Portal Team
        
        This is an automated message. Please do not reply to this email.
      `
    };

    return await this.sendEmail(emailData);
  }

  /**
   * Send exam result notification email
   */
  async sendExamResultNotification({ email, userName, studentName, examTitle, term, academicYear, resultsLink }) {
    const emailData = {
      sender: {
        name: "Greenfield School Portal",
        email: "noreply@greenfield.edu.ng"
      },
      to: [
        {
          email: email,
          name: userName || email.split('@')[0]
        }
      ],
      subject: `📊 Exam Results Available - ${examTitle} | ${term} ${academicYear}`,
      htmlContent: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Exam Results Available</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #3b82f6, #1d4ed8); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
            .button { display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 20px 0; }
            .info-box { background: #dbeafe; border: 1px solid #3b82f6; padding: 20px; border-radius: 6px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
            .highlight { background: #fef3c7; padding: 2px 6px; border-radius: 3px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>📊 Exam Results Available</h1>
              <p>Greenfield School Portal</p>
            </div>
            <div class="content">
              <h2>Dear ${userName || 'Parent/Guardian'},</h2>
              <p>We are pleased to inform you that the exam results for <strong>${studentName}</strong> are now available.</p>
              
              <div class="info-box">
                <h3>📋 Exam Details</h3>
                <ul>
                  <li><strong>Exam:</strong> ${examTitle}</li>
                  <li><strong>Term:</strong> ${term}</li>
                  <li><strong>Academic Year:</strong> ${academicYear}</li>
                  <li><strong>Student:</strong> ${studentName}</li>
                </ul>
              </div>
              
              <p>Click the button below to view the detailed results:</p>
              <a href="${resultsLink}" class="button">View Results</a>
              
              <p><strong>What's included in the results:</strong></p>
              <ul>
                <li>Subject-wise scores and grades</li>
                <li>Overall performance summary</li>
                <li>Class position and statistics</li>
                <li>Teacher comments and recommendations</li>
              </ul>
              
              <p>If you have any questions about the results or need clarification, please don't hesitate to contact your child's class teacher or the school administration.</p>
              
              <p>Thank you for your continued support in your child's education.</p>
              
              <p>Best regards,<br>
              <strong>Greenfield School Academic Team</strong></p>
            </div>
            <div class="footer">
              <p>This is an automated notification. Please do not reply to this email.</p>
              <p>&copy; ${new Date().getFullYear()} Greenfield School. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      textContent: `
        Exam Results Available - Greenfield School Portal
        
        Dear ${userName || 'Parent/Guardian'},
        
        We are pleased to inform you that the exam results for ${studentName} are now available.
        
        Exam Details:
        - Exam: ${examTitle}
        - Term: ${term}
        - Academic Year: ${academicYear}
        - Student: ${studentName}
        
        Please visit the following link to view the detailed results:
        ${resultsLink}
        
        What's included in the results:
        - Subject-wise scores and grades
        - Overall performance summary
        - Class position and statistics
        - Teacher comments and recommendations
        
        If you have any questions about the results or need clarification, please don't hesitate to contact your child's class teacher or the school administration.
        
        Thank you for your continued support in your child's education.
        
        Best regards,
        Greenfield School Academic Team
        
        This is an automated notification. Please do not reply to this email.
      `
    };

    return await this.sendEmail(emailData);
  }

  /**
   * Send report card notification email
   */
  async sendReportCardNotification({ email, userName, studentName, term, academicYear, reportLink, reportType = 'Term Report' }) {
    const emailData = {
      sender: {
        name: "Greenfield School Portal",
        email: "noreply@greenfield.edu.ng"
      },
      to: [
        {
          email: email,
          name: userName || email.split('@')[0]
        }
      ],
      subject: `📋 ${reportType} Ready - ${studentName} | ${term} ${academicYear}`,
      htmlContent: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Report Card Available</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #8b5cf6, #7c3aed); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
            .button { display: inline-block; background: #8b5cf6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 20px 0; }
            .info-box { background: #ede9fe; border: 1px solid #8b5cf6; padding: 20px; border-radius: 6px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
            .achievement { background: #d1fae5; border: 1px solid #10b981; padding: 15px; border-radius: 6px; margin: 15px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>📋 ${reportType} Ready</h1>
              <p>Greenfield School Portal</p>
            </div>
            <div class="content">
              <h2>Dear ${userName || 'Parent/Guardian'},</h2>
              <p>We are delighted to inform you that <strong>${studentName}'s</strong> ${reportType.toLowerCase()} is now ready for download.</p>
              
              <div class="info-box">
                <h3>📊 Report Details</h3>
                <ul>
                  <li><strong>Student:</strong> ${studentName}</li>
                  <li><strong>Report Type:</strong> ${reportType}</li>
                  <li><strong>Term:</strong> ${term}</li>
                  <li><strong>Academic Year:</strong> ${academicYear}</li>
                  <li><strong>Generated:</strong> ${new Date().toLocaleDateString()}</li>
                </ul>
              </div>
              
              <p>Click the button below to download the complete report card:</p>
              <a href="${reportLink}" class="button">Download Report Card</a>
              
              <div class="achievement">
                <h4>🎯 What's in this report:</h4>
                <ul>
                  <li>Comprehensive academic performance across all subjects</li>
                  <li>Attendance record and punctuality</li>
                  <li>Behavioral assessment and character development</li>
                  <li>Teacher comments and recommendations</li>
                  <li>Areas of strength and improvement suggestions</li>
                  <li>Next term's focus areas</li>
                </ul>
              </div>
              
              <p><strong>📅 Important Notes:</strong></p>
              <ul>
                <li>Please review the report with your child</li>
                <li>Discuss areas of improvement and celebrate achievements</li>
                <li>Contact teachers for any clarifications needed</li>
                <li>Keep this report for your records</li>
              </ul>
              
              <p>We appreciate your partnership in your child's educational journey and look forward to continued success.</p>
              
              <p>Warm regards,<br>
              <strong>Greenfield School Academic Office</strong></p>
            </div>
            <div class="footer">
              <p>This is an automated notification. Please do not reply to this email.</p>
              <p>For questions, contact: academic@greenfield.edu.ng</p>
              <p>&copy; ${new Date().getFullYear()} Greenfield School. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      textContent: `
        ${reportType} Ready - Greenfield School Portal
        
        Dear ${userName || 'Parent/Guardian'},
        
        We are delighted to inform you that ${studentName}'s ${reportType.toLowerCase()} is now ready for download.
        
        Report Details:
        - Student: ${studentName}
        - Report Type: ${reportType}
        - Term: ${term}
        - Academic Year: ${academicYear}
        - Generated: ${new Date().toLocaleDateString()}
        
        Please visit the following link to download the complete report card:
        ${reportLink}
        
        What's in this report:
        - Comprehensive academic performance across all subjects
        - Attendance record and punctuality
        - Behavioral assessment and character development
        - Teacher comments and recommendations
        - Areas of strength and improvement suggestions
        - Next term's focus areas
        
        Important Notes:
        - Please review the report with your child
        - Discuss areas of improvement and celebrate achievements
        - Contact teachers for any clarifications needed
        - Keep this report for your records
        
        We appreciate your partnership in your child's educational journey and look forward to continued success.
        
        Warm regards,
        Greenfield School Academic Office
        
        This is an automated notification. Please do not reply to this email.
        For questions, contact: academic@greenfield.edu.ng
      `
    };

    return await this.sendEmail(emailData);
  }

  /**
   * Test email connectivity
   */
  async testConnection() {
    try {
      if (!this.initialized) {
        await this.initialize();
      }

      // Send a test email to verify connection
      const testEmail = {
        sender: {
          name: "Greenfield School Portal",
          email: "noreply@greenfield.edu.ng"
        },
        to: [
          {
            email: "test@greenfield.edu.ng",
            name: "Test User"
          }
        ],
        subject: "Brevo Connection Test",
        htmlContent: "<p>This is a test email to verify Brevo integration.</p>",
        textContent: "This is a test email to verify Brevo integration."
      };

      const result = await this.sendEmail(testEmail);
      return result;
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

// Create and export singleton instance
const brevoEmailService = new BrevoEmailService();
export default brevoEmailService;

// Named exports for specific functions
export const {
  sendPasswordResetEmail,
  sendExamResultNotification,
  sendReportCardNotification,
  testConnection
} = brevoEmailService;