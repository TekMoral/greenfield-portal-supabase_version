import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface PromoteStudentRequest {
  studentId: string
  fromClassId: string
  toClassId: string
  academicYear: string
  promotedBy?: string
  promotionReason?: string
  promotionData?: {
    grades?: Record<string, any>
    performance?: string
    attendance?: number
    behavior?: string
    teacherRecommendation?: string
    [key: string]: any
  }
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
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Get the authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Verify the JWT token and get user info
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Check if the requesting user has permission to promote students
    const { data: requestingUserProfile, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .select('role, status')
      .eq('id', user.id)
      .single()

    if (profileError || !requestingUserProfile) {
      return new Response(
        JSON.stringify({ error: 'Could not fetch user profile' }),
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Only super admins, admins, can promote students
    if (!['super_admin', 'admin'].includes(requestingUserProfile.role)) {
      return new Response(
        JSON.stringify({ error: 'Insufficient permissions to promote students' }),
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Parse request body
    const { 
      studentId, 
      fromClassId, 
      toClassId, 
      academicYear, 
      promotedBy, 
      promotionReason, 
      promotionData = {} 
    }: PromoteStudentRequest = await req.json()

    if (!studentId || !fromClassId || !toClassId || !academicYear) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: studentId, fromClassId, toClassId, and academicYear' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Check if the student exists and is currently in the fromClass
    const { data: student, error: studentError } = await supabaseAdmin
      .from('user_profiles')
      .select(`
        id,
        full_name,
        email,
        role,
        status,
        class_id
      `)
      .eq('id', studentId)
      .eq('role', 'student')
      .single()

    if (studentError || !student) {
      console.error('Student lookup failed in promote-student', {
        studentId,
        studentError: studentError?.message || studentError || null
      })
      return new Response(
        JSON.stringify({ 
          error: 'Student not found',
          details: studentError?.message || null,
          studentId
        }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Verify student is in the fromClass
    if (student.class_id !== fromClassId) {
      return new Response(
        JSON.stringify({ error: 'Student is not currently in the specified class' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Check if student is active
    if (student.status !== 'active') {
      return new Response(
        JSON.stringify({ error: `Cannot promote student with status: ${student.status}. Only active students can be promoted.` }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Verify the target class exists
    const { data: toClass, error: toClassError } = await supabaseAdmin
      .from('classes')
      .select('id, name, level, category, capacity')
      .eq('id', toClassId)
      .single()

    if (toClassError || !toClass) {
      console.error('Target class lookup failed in promote-student', {
        toClassId,
        toClassError: toClassError?.message || toClassError || null
      })
      return new Response(
        JSON.stringify({ 
          error: 'Target class not found',
          details: toClassError?.message || null,
          toClassId
        }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Check if target class has capacity (optional check)
    if (toClass.capacity) {
      const { count: currentStudents } = await supabaseAdmin
        .from('user_profiles')
        .select('id', { count: 'exact' })
        .eq('class_id', toClassId)
        .eq('role', 'student')
        .eq('status', 'active')

      if (currentStudents && currentStudents >= toClass.capacity) {
        return new Response(
          JSON.stringify({ error: `Target class ${toClass.name} is at full capacity (${toClass.capacity} students)` }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }
    }

    // Check for existing promotion record for this academic year
    const { data: existingPromotion } = await supabaseAdmin
      .from('student_promotions')
      .select('id')
      .eq('student_id', studentId)
      .eq('academic_year', academicYear)
      .single()

    if (existingPromotion) {
      return new Response(
        JSON.stringify({ error: `Student has already been promoted for academic year ${academicYear}` }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Start transaction: Update student's class and create promotion record
    const promotionRecord = {
      student_id: studentId,
      from_class_id: fromClassId,
      to_class_id: toClassId,
      academic_year: academicYear,
      promoted_by: promotedBy || user.id,
      promotion_date: new Date().toISOString(),
      promotion_reason: promotionReason,
      promotion_data: promotionData,
      created_at: new Date().toISOString()
    }

    // Insert promotion record
    const { data: newPromotion, error: promotionError } = await supabaseAdmin
      .from('student_promotions')
      .insert(promotionRecord)
      .select()
      .single()

    if (promotionError) {
      console.error('Error creating promotion record:', promotionError)
      return new Response(
        JSON.stringify({ error: 'Failed to create promotion record' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Update student's class
    let updatePayload: Record<string, any> = {
      class_id: toClassId,
      updated_at: new Date().toISOString(),
      updated_by: promotedBy || user.id
    }

    let { data: updatedStudent, error: updateError } = await supabaseAdmin
      .from('user_profiles')
      .update(updatePayload)
      .eq('id', studentId)
      .select(`
        id,
        full_name,
        class_id
      `)
      .single()

    // If updated_by column doesn't exist, retry without it
    if (updateError && String(updateError.message || updateError).toLowerCase().includes('updated_by')) {
      const retryPayload = {
        class_id: toClassId,
        updated_at: new Date().toISOString()
      }
      ;({ data: updatedStudent, error: updateError } = await supabaseAdmin
        .from('user_profiles')
        .update(retryPayload)
        .eq('id', studentId)
        .select(`
          id,
          full_name,
          class_id
        `)
        .single())
    }

    if (updateError) {
      console.error('Error updating student class:', updateError)
      
      // Rollback: Delete the promotion record
      await supabaseAdmin
        .from('student_promotions')
        .delete()
        .eq('id', newPromotion.id)

      return new Response(
        JSON.stringify({ error: 'Failed to update student class', details: updateError?.message || null }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Log the promotion action in audit log
    try {
      await supabaseAdmin
        .from('audit_logs')
        .insert({
          user_id: user.id,
          action: 'STUDENT_PROMOTED',
          target_user_id: studentId,
          target_user_type: 'student',
          details: {
            student_name: student.full_name,
            from_class: student.classes?.name,
            to_class: toClass.name,
            academic_year: academicYear,
            promotion_reason: promotionReason,
            promotion_data: promotionData
          },
          created_at: new Date().toISOString()
        })
    } catch (auditError) {
      console.error('Error logging promotion action:', auditError)
      // Don't fail the request if audit logging fails
    }

    // Get the from class details for response
    const { data: fromClass } = await supabaseAdmin
      .from('classes')
      .select('id, name, level, category')
      .eq('id', fromClassId)
      .single()

    return new Response(
      JSON.stringify({
        success: true,
        message: `${student.full_name} has been successfully promoted from ${fromClass?.name || 'Unknown'} to ${toClass.name}`,
        data: {
          promotionId: newPromotion.id,
          studentId: updatedStudent.id,
          studentName: updatedStudent.full_name,
          fromClass: {
            id: fromClassId,
            name: fromClass?.name,
            level: fromClass?.level,
            category: fromClass?.category
          },
          toClass: {
            id: toClass.id,
            name: toClass.name,
            level: toClass.level,
            category: toClass.category
          },
          academicYear,
          promotionDate: newPromotion.promotion_date,
          promotedBy: newPromotion.promoted_by,
          promotionReason: newPromotion.promotion_reason,
          promotionData: newPromotion.promotion_data
        }
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Unexpected error in promote-student function:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})