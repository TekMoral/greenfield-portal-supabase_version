// supabase/functions/send-email/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface EmailRequest {
  type: 'password_reset' | 'exam_result' | 'report_card' | 'bulk_notification' | 'test'
  data: {
    email?: string
    emails?: string[]
    userName?: string
    studentName?: string
    resetLink?: string
    examTitle?: string
    term?: string
    academicYear?: string
    resultsLink?: string
    reportLink?: string
    reportType?: string
    subject?: string
    content?: string | { html: string; text: string }
    recipients?: Array<{ email: string; name?: string }>
  }
}

const BREVO_API_URL = 'https://api.brevo.com/v3'

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get Brevo API key from Supabase secrets
    const brevoApiKey = Deno.env.get('BREVO_API_KEY')
    if (!brevoApiKey) {
      throw new Error('BREVO_API_KEY not configured in Supabase secrets')
    }

    // Verify authentication
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Missing authorization header')
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    )

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) {
      throw new Error('Invalid authentication')
    }

    // Parse request body
    const body: EmailRequest = await req.json()
    const { type, data } = body

    let emailData: any = {
      sender: {
        name: "Greenfield College Portal",
        email: "admin@greenfieldcollege.name.ng"
      }
    }

    // Build email based on type
    switch (type) {
      case 'password_reset':
        if (!data.email || !data.resetLink) {
          throw new Error('Missing required fields for password reset email')
        }
        emailData = {
          ...emailData,
          to: [{ email: data.email, name: data.userName || data.email.split('@')[0] }],
          subject: "Password Reset Request - Greenfield School Portal",
          htmlContent: generatePasswordResetHTML(data),
          textContent: generatePasswordResetText(data)
        }
        break

      case 'exam_result':
        if (!data.email || !data.studentName || !data.examTitle || !data.resultsLink) {
          throw new Error('Missing required fields for exam result email')
        }
        emailData = {
          ...emailData,
          to: [{ email: data.email, name: data.userName || data.email.split('@')[0] }],
          subject: `📊 Exam Results Available - ${data.examTitle} | ${data.term} ${data.academicYear}`,
          htmlContent: generateExamResultHTML(data),
          textContent: generateExamResultText(data)
        }
        break

      case 'report_card':
        if (!data.email || !data.studentName || !data.reportLink) {
          throw new Error('Missing required fields for report card email')
        }
        emailData = {
          ...emailData,
          to: [{ email: data.email, name: data.userName || data.email.split('@')[0] }],
          subject: `📋 ${data.reportType || 'Term Report'} Ready - ${data.studentName} | ${data.term} ${data.academicYear}`,
          htmlContent: generateReportCardHTML(data),
          textContent: generateReportCardText(data)
        }
        break

      case 'bulk_notification':
        if (!data.recipients || !data.subject || !data.content) {
          throw new Error('Missing required fields for bulk notification')
        }
        emailData = {
          ...emailData,
          to: data.recipients.map(recipient => ({
            email: recipient.email,
            name: recipient.name || recipient.email.split('@')[0]
          })),
          subject: data.subject,
          htmlContent: typeof data.content === 'object' ? data.content.html : data.content,
          textContent: typeof data.content === 'object' ? data.content.text : data.content.replace(/<[^>]*>/g, '')
        }
        break

      case 'test':
        emailData = {
          ...emailData,
          to: [{ email: data.email || 'test@greenfield.edu.ng', name: 'Test User' }],
          subject: "Brevo Connection Test - Greenfield School Portal",
          htmlContent: "<p>✅ This is a test email to verify Brevo integration is working correctly.</p>",
          textContent: "✅ This is a test email to verify Brevo integration is working correctly."
        }
        break

      default:
        throw new Error(`Unsupported email type: ${type}`)
    }

    // Send email via Brevo API
    const response = await fetch(`${BREVO_API_URL}/smtp/email`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'api-key': brevoApiKey
      },
      body: JSON.stringify(emailData)
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(`Brevo API error: ${errorData.message || response.statusText}`)
    }

    const result = await response.json()

    // Log email activity
    await supabaseClient
      .from('audit_logs')
      .insert({
        user_id: user.id,
        action: 'EMAIL_SENT',
        table_name: 'email_notifications',
        details: {
          email_type: type,
          recipient_count: Array.isArray(emailData.to) ? emailData.to.length : 1,
          subject: emailData.subject,
          brevo_message_id: result.messageId
        },
        description: `Sent ${type} email via Brevo`,
        ip_address: req.headers.get('x-forwarded-for') || 'unknown'
      })

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: result,
        message: 'Email sent successfully'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('Email sending error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})

// HTML Template Functions
function generatePasswordResetHTML(data: any): string {
  return `
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
          <h2>Hello ${data.userName || 'User'},</h2>
          <p>We received a request to reset your password for your Greenfield School Portal account.</p>
          
          <p>Click the button below to reset your password:</p>
          <a href="${data.resetLink}" class="button">Reset Password</a>
          
          <div class="warning">
            <strong>⚠️ Security Notice:</strong>
            <ul>
              <li>This link will expire in 1 hour for security reasons</li>
              <li>If you didn't request this reset, please ignore this email</li>
              <li>Never share this link with anyone</li>
            </ul>
          </div>
          
          <p>If the button doesn't work, copy and paste this link into your browser:</p>
          <p style="word-break: break-all; background: #e5e7eb; padding: 10px; border-radius: 4px; font-family: monospace;">${data.resetLink}</p>
          
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
  `
}

function generatePasswordResetText(data: any): string {
  return `
    Password Reset Request - Greenfield School Portal
    
    Hello ${data.userName || 'User'},
    
    We received a request to reset your password for your Greenfield School Portal account.
    
    Please click the following link to reset your password:
    ${data.resetLink}
    
    Security Notice:
    - This link will expire in 1 hour for security reasons
    - If you didn't request this reset, please ignore this email
    - Never share this link with anyone
    
    If you have any questions, please contact the school administration.
    
    Best regards,
    Greenfield School Portal Team
    
    This is an automated message. Please do not reply to this email.
  `
}

function generateExamResultHTML(data: any): string {
  return `
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
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>📊 Exam Results Available</h1>
          <p>Greenfield School Portal</p>
        </div>
        <div class="content">
          <h2>Dear ${data.userName || 'Parent/Guardian'},</h2>
          <p>We are pleased to inform you that the exam results for <strong>${data.studentName}</strong> are now available.</p>
          
          <div class="info-box">
            <h3>📋 Exam Details</h3>
            <ul>
              <li><strong>Exam:</strong> ${data.examTitle}</li>
              <li><strong>Term:</strong> ${data.term}</li>
              <li><strong>Academic Year:</strong> ${data.academicYear}</li>
              <li><strong>Student:</strong> ${data.studentName}</li>
            </ul>
          </div>
          
          <p>Click the button below to view the detailed results:</p>
          <a href="${data.resultsLink}" class="button">View Results</a>
          
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
  `
}

function generateExamResultText(data: any): string {
  return `
    Exam Results Available - Greenfield School Portal
    
    Dear ${data.userName || 'Parent/Guardian'},
    
    We are pleased to inform you that the exam results for ${data.studentName} are now available.
    
    Exam Details:
    - Exam: ${data.examTitle}
    - Term: ${data.term}
    - Academic Year: ${data.academicYear}
    - Student: ${data.studentName}
    
    Please visit the following link to view the detailed results:
    ${data.resultsLink}
    
    Thank you for your continued support in your child's education.
    
    Best regards,
    Greenfield School Academic Team
    
    This is an automated notification. Please do not reply to this email.
  `
}

function generateReportCardHTML(data: any): string {
  return `
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
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>📋 ${data.reportType || 'Term Report'} Ready</h1>
          <p>Greenfield School Portal</p>
        </div>
        <div class="content">
          <h2>Dear ${data.userName || 'Parent/Guardian'},</h2>
          <p>We are delighted to inform you that <strong>${data.studentName}'s</strong> ${(data.reportType || 'term report').toLowerCase()} is now ready for download.</p>
          
          <div class="info-box">
            <h3>📊 Report Details</h3>
            <ul>
              <li><strong>Student:</strong> ${data.studentName}</li>
              <li><strong>Report Type:</strong> ${data.reportType || 'Term Report'}</li>
              <li><strong>Term:</strong> ${data.term}</li>
              <li><strong>Academic Year:</strong> ${data.academicYear}</li>
              <li><strong>Generated:</strong> ${new Date().toLocaleDateString()}</li>
            </ul>
          </div>
          
          <p>Click the button below to download the complete report card:</p>
          <a href="${data.reportLink}" class="button">Download Report Card</a>
          
          <p>We appreciate your partnership in your child's educational journey.</p>
          
          <p>Warm regards,<br>
          <strong>Greenfield School Academic Office</strong></p>
        </div>
        <div class="footer">
          <p>This is an automated notification. Please do not reply to this email.</p>
          <p>&copy; ${new Date().getFullYear()} Greenfield School. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `
}

function generateReportCardText(data: any): string {
  return `
    ${data.reportType || 'Term Report'} Ready - Greenfield School Portal
    
    Dear ${data.userName || 'Parent/Guardian'},
    
    We are delighted to inform you that ${data.studentName}'s ${(data.reportType || 'term report').toLowerCase()} is now ready for download.
    
    Report Details:
    - Student: ${data.studentName}
    - Report Type: ${data.reportType || 'Term Report'}
    - Term: ${data.term}
    - Academic Year: ${data.academicYear}
    - Generated: ${new Date().toLocaleDateString()}
    
    Please visit the following link to download the complete report card:
    ${data.reportLink}
    
    We appreciate your partnership in your child's educational journey.
    
    Warm regards,
    Greenfield School Academic Office
    
    This is an automated notification. Please do not reply to this email.
  `
}