// supabase/functions/delete-student/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createServiceClient, createUserClient, verifyUserRole } from '../_shared/auth.ts';
import { corsHeaders, handleCors } from '../_shared/cors.ts';

interface DeleteStudentRequest {
  studentId: string;
  deleteMethod?: 'soft'; // only soft delete for now
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return handleCors(req);
  }

  try {
    console.log("Authorization header received:", req.headers.get('Authorization'));
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    // Verify the user is admin or super_admin
    const userClient = createUserClient(authHeader);
    const { user, profile } = await verifyUserRole(userClient, ['admin', 'super_admin']);

    // Parse request body
    const body: DeleteStudentRequest = await req.json();
    const { studentId, deleteMethod = 'soft' } = body;

    if (!studentId) {
      throw new Error('Missing required field: studentId');
    }

    // Service client for DB and auth
    const serviceClient = createServiceClient();

    // Fetch student profile
    const { data: student, error: studentError } = await serviceClient
      .from('user_profiles')
      .select('*')
      .eq('id', studentId)
      .single();

    if (studentError || !student) {
      throw new Error('Student not found');
    }

    // Prevent accidental deletion of admin or super_admin
    if (student.role !== 'student') {
      throw new Error('Cannot delete non-student users in this function');
    }

    let deletionResult: any = {};

    // Soft delete logic
    const { data: updatedStudent, error: softDeleteError } = await serviceClient
      .from('user_profiles')
      .update({
        is_active: false,
        status: 'deleted',
        deleted_at: new Date().toISOString(),
        deleted_by: user.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', studentId)
      .select()
      .single();

    if (softDeleteError) {
      throw new Error(`Failed to soft delete student: ${softDeleteError.message}`);
    }

    deletionResult = {
      method: 'soft',
      profileDeleted: true,
      authUserDeleted: false,
      data: updatedStudent
    };

    // Optionally update auth user metadata
    try {
      await serviceClient.auth.admin.updateUserById(studentId, {
        user_metadata: {
          ...student.user_metadata,
          is_active: false,
          deleted_at: new Date().toISOString(),
          deleted_by: user.id
        }
      });
    } catch (authError) {
      console.warn('Failed to update auth user metadata for soft delete:', authError);
    }

    // Log deletion in audit_logs (aligned with create-student logging)
    try {
      // Identify acting admin/super-admin from auth token
      const { data: { user: actingAuthUser } } = await userClient.auth.getUser();

      // Fetch class info for human-readable context
      let classInfo: { id: string | null; name: string | null } = { id: student.class_id || null, name: null };
      try {
        if (student.class_id) {
          const { data: classData } = await serviceClient
            .from('classes')
            .select('id, name')
            .eq('id', student.class_id)
            .single();
          if (classData) {
            classInfo = { id: classData.id, name: classData.name };
          }
        }
      } catch (_) { /* ignore class lookup issues */ }

      // Normalize request IP and User-Agent for logging
      const xf = req.headers.get('x-forwarded-for') || '';
      const ipAddr = xf.split(',')[0]?.trim() || null; // inet field: must be a valid IP or null
      const userAgent = req.headers.get('user-agent') || null;

      await serviceClient.from('audit_logs').insert([
        {
          user_id: actingAuthUser?.id ?? user.id ?? null,
          action: 'delete_student',
          resource_type: 'student',
          resource_id: student.id,
          details: {
            email: student.email,
            admission_number: (student as any).admission_number || null,
            class: classInfo,
            deleted_by: actingAuthUser?.email ?? (profile as any)?.email ?? null,
            method: deleteMethod
          },
          ip_address: ipAddr,
          user_agent: userAgent,
          created_at: new Date().toISOString()
        }
      ]);
    } catch (auditError) {
      console.warn('Failed to log student deletion:', auditError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `${student.full_name} has been successfully soft deleted`,
        data: {
          deletedStudentId: studentId,
          deletedStudentName: student.full_name,
          deletedStudentEmail: student.email,
          deleteMethod: 'soft',
          deletedBy: profile.full_name,
          ...deletionResult
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('Error deleting student:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'An unexpected error occurred'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    );
  }
});
