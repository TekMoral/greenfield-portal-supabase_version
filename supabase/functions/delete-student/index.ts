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

    // Log deletion in audit_logs
    try {
      await serviceClient.from('audit_logs').insert({
        user_id: user.id,
        action: 'STUDENT_DELETE',
        target_id: studentId,
        target_type: 'student',
        details: {
          studentName: student.full_name,
          studentEmail: student.email,
          deletedBy: profile.full_name,
          deletionResult
        },
        description: `Soft deleted student: ${student.full_name} (${student.email})`,
        ip_address: req.headers.get('x-forwarded-for') || 'unknown',
        user_agent: req.headers.get('user-agent') || 'unknown'
      });
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
