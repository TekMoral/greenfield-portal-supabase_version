import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface PromotionItem {
  studentId: string
  fromClassId: string
  toClassId: string
  promotionData?: Record<string, any>
}

interface BulkPromoteRequest {
  promotions: PromotionItem[]
  academicYear: string
  promotedBy: string
  promotionReason: string
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

    // Check if the requesting user has permission to bulk promote students
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

    // Only super admins and admins can bulk promote students
    if (!['super_admin', 'admin'].includes(requestingUserProfile.role)) {
      return new Response(
        JSON.stringify({ error: 'Insufficient permissions for bulk promotion. Only super admins and admins can perform bulk promotions.' }),
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Parse request body
    const { promotions, academicYear, promotedBy, promotionReason }: BulkPromoteRequest = await req.json()

    if (!promotions || !Array.isArray(promotions) || promotions.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Missing or empty promotions array' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    if (!academicYear || !promotionReason) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: academicYear and promotionReason' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Validate each promotion item
    for (const promotion of promotions) {
      if (!promotion.studentId || !promotion.fromClassId || !promotion.toClassId) {
        return new Response(
          JSON.stringify({ error: 'Each promotion must have studentId, fromClassId, and toClassId' }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }
    }

    // Limit bulk operations to prevent abuse
    if (promotions.length > 100) {
      return new Response(
        JSON.stringify({ error: 'Bulk promotion limited to 100 students at a time' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const results = {
      successful: [],
      failed: [],
      successCount: 0,
      failureCount: 0
    }

    // Process each promotion
    for (const promotion of promotions) {
      try {
        // Check if the student exists and is in the correct class
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
          .eq('id', promotion.studentId)
          .eq('role', 'student')
          .single()

        if (studentError || !student) {
          results.failed.push({
            studentId: promotion.studentId,
            error: 'Student not found',
            promotion
          })
          results.failureCount++
          continue
        }

        // Verify student is in the fromClass
        if (student.class_id !== promotion.fromClassId) {
          results.failed.push({
            studentId: promotion.studentId,
            studentName: student.full_name,
            error: 'Student is not in the specified from class',
            promotion
          })
          results.failureCount++
          continue
        }

        // Check if student is active
        if (student.status !== 'active') {
          results.failed.push({
            studentId: promotion.studentId,
            studentName: student.full_name,
            error: `Cannot promote student with status: ${student.status}`,
            promotion
          })
          results.failureCount++
          continue
        }

        // Check for existing promotion record for this academic year
        const { data: existingPromotion } = await supabaseAdmin
          .from('student_promotions')
          .select('id')
          .eq('student_id', promotion.studentId)
          .eq('academic_year', academicYear)
          .single()

        if (existingPromotion) {
          results.failed.push({
            studentId: promotion.studentId,
            studentName: student.full_name,
            error: `Already promoted for academic year ${academicYear}`,
            promotion
          })
          results.failureCount++
          continue
        }

        // Verify the target class exists
        const { data: toClass, error: toClassError } = await supabaseAdmin
          .from('classes')
          .select('id, name, level, category, capacity')
          .eq('id', promotion.toClassId)
          .single()

        if (toClassError || !toClass) {
          results.failed.push({
            studentId: promotion.studentId,
            studentName: student.full_name,
            error: 'Target class not found',
            promotion
          })
          results.failureCount++
          continue
        }

        // Create promotion record
        const promotionRecord = {
          student_id: promotion.studentId,
          from_class_id: promotion.fromClassId,
          to_class_id: promotion.toClassId,
          academic_year: academicYear,
          promoted_by: promotedBy || user.id,
          promotion_date: new Date().toISOString(),
          promotion_reason: promotionReason,
          promotion_data: promotion.promotionData || {},
          created_at: new Date().toISOString()
        }

        // Insert promotion record
        const { data: newPromotion, error: promotionError } = await supabaseAdmin
          .from('student_promotions')
          .insert(promotionRecord)
          .select()
          .single()

        if (promotionError) {
          results.failed.push({
            studentId: promotion.studentId,
            studentName: student.full_name,
            error: 'Failed to create promotion record',
            promotion
          })
          results.failureCount++
          continue
        }

        // Update student's class
        let updatePayload: Record<string, any> = { 
          class_id: promotion.toClassId,
          updated_at: new Date().toISOString(),
          updated_by: promotedBy || user.id
        }

        let { error: updateError } = await supabaseAdmin
          .from('user_profiles')
          .update(updatePayload)
          .eq('id', promotion.studentId)

        if (updateError && String(updateError.message || updateError).toLowerCase().includes('updated_by')) {
          const retryPayload = {
            class_id: promotion.toClassId,
            updated_at: new Date().toISOString()
          }
          ;({ error: updateError } = await supabaseAdmin
            .from('user_profiles')
            .update(retryPayload)
            .eq('id', promotion.studentId))
        }

        if (updateError) {
          // Rollback: Delete the promotion record
          await supabaseAdmin
            .from('student_promotions')
            .delete()
            .eq('id', newPromotion.id)

          results.failed.push({
            studentId: promotion.studentId,
            studentName: student.full_name,
            error: 'Failed to update student class',
            promotion
          })
          results.failureCount++
          continue
        }

        // Success
        results.successful.push({
          studentId: promotion.studentId,
          studentName: student.full_name,
          fromClass: null,
          toClass: toClass.name,
          promotionId: newPromotion.id,
          promotion
        })
        results.successCount++

        // Log individual promotion in audit log
        try {
          await supabaseAdmin
            .from('audit_logs')
            .insert({
              user_id: user.id,
              action: 'STUDENT_BULK_PROMOTED',
              target_user_id: promotion.studentId,
              target_user_type: 'student',
              details: {
                student_name: student.full_name,
                from_class_id: promotion.fromClassId,
                to_class: toClass.name,
                academic_year: academicYear,
                promotion_reason: promotionReason,
                bulk_operation: true
              },
              created_at: new Date().toISOString()
            })
        } catch (auditError) {
          console.error('Error logging individual promotion:', auditError)
        }

      } catch (error) {
        console.error(`Error processing promotion for student ${promotion.studentId}:`, error)
        results.failed.push({
          studentId: promotion.studentId,
          error: `Unexpected error: ${error.message}`,
          promotion
        })
        results.failureCount++
      }
    }

    // Log bulk operation summary in audit log
    try {
      await supabaseAdmin
        .from('audit_logs')
        .insert({
          user_id: user.id,
          action: 'BULK_STUDENT_PROMOTION',
          target_user_id: null,
          target_user_type: 'student',
          details: {
            total_promotions: promotions.length,
            successful_promotions: results.successCount,
            failed_promotions: results.failureCount,
            academic_year: academicYear,
            promotion_reason: promotionReason,
            results: results
          },
          created_at: new Date().toISOString()
        })
    } catch (auditError) {
      console.error('Error logging bulk promotion summary:', auditError)
    }

    const statusCode = results.failureCount > 0 ? (results.successCount > 0 ? 207 : 400) : 200
    const message = results.failureCount === 0 
      ? `Successfully promoted all ${results.successCount} students`
      : `Promoted ${results.successCount} students successfully, ${results.failureCount} failed`

    return new Response(
      JSON.stringify({
        success: results.failureCount === 0,
        message,
        data: results
      }),
      { 
        status: statusCode, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Unexpected error in bulk-promote-students function:', error)
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