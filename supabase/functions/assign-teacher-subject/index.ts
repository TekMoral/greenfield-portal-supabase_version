import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createServiceClient, createUserClient, verifyUserRole } from '../_shared/auth.ts'
import { corsHeaders, handleCors } from '../_shared/cors.ts'

interface AssignTeacherSubjectRequest {
  teacherId: string
  subjectId: string
  classId: string
  academicYear?: string
  term?: number
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return handleCors(req)
  }

  try {
    console.log('🔄 Starting teacher-subject assignment...')
    
    // Verify authorization
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Missing authorization header')
    }

    // Create user client to verify permissions
    const userClient = createUserClient(authHeader)
    const { user, profile } = await verifyUserRole(userClient, ['admin', 'super_admin'])

    // Parse request body
    const body: AssignTeacherSubjectRequest = await req.json()
    console.log('✅ Request body parsed and authorized')
    
    // Validate required fields
    if (!body.teacherId || !body.subjectId || !body.classId) {
      throw new Error('Missing required fields: teacherId, subjectId, classId')
    }

    console.log('✅ Input validation passed')

    // Create service client for admin operations (bypasses RLS)
    const serviceClient = createServiceClient()

    // Enforce per-teacher subject limit: max 3 unique subjects
    console.log(`🔍 Checking teacher subject limit for teacher: ${body.teacherId}`)
    const { data: teacherAssignments, error: teacherCountErr } = await serviceClient
      .from('teacher_assignments')
      .select('subject_id')
      .eq('teacher_id', body.teacherId)
      .eq('is_active', true)

    if (teacherCountErr) {
      throw new Error(`Failed to check teacher subject limit: ${teacherCountErr.message}`)
    }

    const teacherSubjectSet = new Set((teacherAssignments || []).map((a: any) => a.subject_id))
    const hasSubjectAlready = teacherSubjectSet.has(body.subjectId)
    console.log(`📚 Teacher currently has ${teacherSubjectSet.size} unique subject(s). Already has this one? ${hasSubjectAlready}`)
    if (!hasSubjectAlready && teacherSubjectSet.size >= 3) {
      console.log(`❌ LIMIT REACHED: Teacher already has 3 unique subjects assigned`)
      throw new Error('Teacher already has the maximum number of subjects (3) assigned')
    }

    // Check global limit: max 3 unique teachers per subject across all classes
    console.log(`🔍 Checking global limit for subject: ${body.subjectId}`)
    
    const { data: existingAssignments, error: countError } = await serviceClient
      .from('teacher_assignments')
      .select('teacher_id, class_id')
      .eq('subject_id', body.subjectId)
      .eq('is_active', true)

    if (countError) {
      throw new Error(`Failed to check existing assignments: ${countError.message}`)
    }

    console.log(`📊 Existing assignments for subject ${body.subjectId}:`, existingAssignments)

    // Count unique teachers for this subject
    const uniqueTeachers = new Set(existingAssignments?.map(a => a.teacher_id) || [])
    console.log(`👥 Unique teachers already assigned: ${Array.from(uniqueTeachers)}`)
    console.log(`📈 Current teacher count: ${uniqueTeachers.size}/3`)
    
    // Check if this teacher is already assigned to this subject
    const teacherAlreadyAssigned = uniqueTeachers.has(body.teacherId)
    console.log(`🔍 Is teacher already assigned? ${teacherAlreadyAssigned}`)
    
    // If teacher not already assigned and we're at the limit, reject
    if (!teacherAlreadyAssigned && uniqueTeachers.size >= 3) {
      const currentTeachers = Array.from(uniqueTeachers)
      console.log(`❌ LIMIT REACHED: Subject already has 3 teachers:`, currentTeachers)
      throw new Error(`Subject already has the maximum number of teachers (3) assigned across all classes. Current teachers: ${currentTeachers.length}`)
    }
    
    console.log(`✅ Global limit check passed. Proceeding with assignment...`)

    // Create the teacher assignment using service client (bypasses RLS)
    const { data: assignment, error: insertError } = await serviceClient
      .from('teacher_assignments')
      .insert({
        teacher_id: body.teacherId,
        subject_id: body.subjectId,
        class_id: body.classId,
        academic_year: body.academicYear || `${new Date().getFullYear()}/${new Date().getFullYear() + 1}`,
        term: body.term || 1,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select(`
        *,
        subjects!inner (id, name, code, department),
        classes!inner (id, name, description)
      `)
      .single()

    if (insertError) {
      console.error('❌ Insert error:', insertError)
      throw new Error(`Failed to create teacher assignment: ${insertError.message}`)
    }

    console.log('✅ Teacher assignment created successfully:', assignment.id)

    // Audit log for teacher assignment
    try {
      const xf = req.headers.get('x-forwarded-for') || ''
      const ipAddr = xf.split(',')[0]?.trim() || null
      const userAgent = req.headers.get('user-agent') || null

      await serviceClient
        .from('audit_logs')
        .insert([
          {
            user_id: user.id,
            action: 'assign_teacher_subject',
            resource_type: 'teacher_assignment',
            resource_id: assignment.id,
            details: {
              teacher_id: body.teacherId,
              subject_id: body.subjectId,
              subject_name: assignment.subjects?.name,
              class_id: body.classId,
              class_name: assignment.classes?.name,
              academic_year: assignment.academic_year,
              term: assignment.term,
              assigned_by: user.email || null
            },
            ip_address: ipAddr,
            user_agent: userAgent,
            created_at: new Date().toISOString()
          }
        ])
    } catch (auditError) {
      console.error('Error logging teacher assignment:', auditError)
    }

    return new Response(
      JSON.stringify({ success: true, data: assignment }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 201,
      }
    )

  } catch (error) {
    console.error('❌ Error assigning teacher to subject:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'An unexpected error occurred',
        details: 'Teacher assignment failed. Check logs for details.'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})