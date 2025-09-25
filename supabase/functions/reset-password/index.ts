// supabase/functions/reset-password/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface ResetPasswordRequest {
  email: string
  redirectTo?: string
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client with service role key for admin operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    
    // Parse request body
    const body: ResetPasswordRequest = await req.json()
    const { email, redirectTo } = body

    if (!email) {
      throw new Error('Email is required')
    }

    // Check if user exists in our system using service role
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .select('id, email, full_name, role')
      .eq('email', email.trim())
      .single()

    if (profileError || !userProfile) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'No account found with this email address',
          code: 'USER_NOT_FOUND'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404,
        },
      )
    }

    // Generate password reset link using Admin API (custom email flow)
    const redirectUrl = redirectTo || `${req.headers.get('origin') || 'http://localhost:3000'}/reset-password`
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email: email.trim(),
      options: { redirectTo: redirectUrl }
    })

    if (linkError) {
      console.error('Generate link error:', linkError)
      throw new Error(linkError.message || 'Failed to generate reset link')
    }

    // Use the Supabase-generated action link which will redirect to our app with a `code`
    const resetLink = (linkData?.properties as any)?.action_link || (linkData as any)?.action_link || redirectUrl

    // Send custom branded email via Brevo
    const brevoApiKey = Deno.env.get('BREVO_API_KEY')
    if (!brevoApiKey) {
      throw new Error('Email service not configured: missing BREVO_API_KEY')
    }

    try {
      const emailData = {
        sender: {
          name: Deno.env.get('BREVO_SENDER_NAME') || "Greenfield College Portal",
          email: Deno.env.get('BREVO_SENDER_EMAIL') || "admin@greenfieldcollege.name.ng"
        },
        to: [
          {
            email: email.trim(),
            name: userProfile.full_name || email.split('@')[0]
          }
        ],
        subject: "Password Reset Request - Greenfield College Portal",
        htmlContent: generatePasswordResetHTML({
          userName: userProfile.full_name || email.split('@')[0],
          resetLink
        }),
        textContent: generatePasswordResetText({
          userName: userProfile.full_name || email.split('@')[0],
          resetLink
        })
      }

      const brevoResponse = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'api-key': brevoApiKey
        },
        body: JSON.stringify(emailData)
      })

      if (!brevoResponse.ok) {
        const errorText = await brevoResponse.text()
        const details = `BREVO_ERROR status=${brevoResponse.status} ${brevoResponse.statusText} body=${errorText}`
        console.error('Custom email service failed:', details)
        throw new Error(details)
      }

      console.log('Custom branded email sent successfully')
    } catch (emailError) {
      console.error('Custom email service failed:', emailError)
      throw emailError
    }

    // Log the password reset attempt
    await supabaseAdmin
      .from('audit_logs')
      .insert({
        user_id: userProfile.id,
        action: 'PASSWORD_RESET_REQUESTED',
        table_name: 'auth.users',
        details: {
          email: email.trim(),
          user_name: userProfile.full_name,
          user_role: userProfile.role
        },
        description: `Password reset requested for ${userProfile.full_name} (${email.trim()})`,
        ip_address: req.headers.get('x-forwarded-for') || 'unknown'
      })

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Password reset instructions have been sent to your email',
        data: {
          email: email.trim(),
          userName: userProfile.full_name || email.split('@')[0]
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('Password reset error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'An error occurred while processing your request'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})

function generatePasswordResetHTML(data: { userName: string; resetLink: string }): string {
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
          <p>Greenfield College Portal</p>
        </div>
        <div class="content">
          <h2>Hello ${data.userName},</h2>
          <p>We received a request to reset your password for your Greenfield College Portal account.</p>
          
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
          <strong>Greenfield College Portal Team</strong></p>
        </div>
        <div class="footer">
          <p>This is an automated message. Please do not reply to this email.</p>
          <p>&copy; ${new Date().getFullYear()} Greenfield College. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `
}

function generatePasswordResetText(data: { userName: string; resetLink: string }): string {
  return `
    Password Reset Request - Greenfield College Portal
    
    Hello ${data.userName},
    
    We received a request to reset your password for your Greenfield College Portal account.
    
    Please click the following link to reset your password:
    ${data.resetLink}
    
    Security Notice:
    - This link will expire in 1 hour for security reasons
    - If you didn't request this reset, please ignore this email
    - Never share this link with anyone
    
    If you have any questions, please contact the school administration.
    
    Best regards,
    Greenfield College Portal Team
    
    This is an automated message. Please do not reply to this email.
  `
}