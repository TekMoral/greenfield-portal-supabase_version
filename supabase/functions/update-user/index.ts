import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createServiceClient, createUserClient, verifyUserRole } from '../_shared/auth.ts'
import { corsHeaders, handleCors } from '../_shared/cors.ts'

interface UpdateUserRequest {
  userId: string
  userType: 'teacher' | 'student' | 'admin'
  updateData: {
    full_name?: string
    email?: string
    phone_number?: string
    is_active?: boolean
    // Teacher specific
    subject?: string
    qualification?: string
    date_hired?: string
    // Student specific
    admission_number?: string
    class_id?: string
    guardian_name?: string
    date_of_birth?: string
    gender?: string
    // Admin specific
    role?: string
    // Common fields
    status?: string
    notes?: string
    profile_image?: string
  }
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return handleCors(req)
  }

  try {
    // Verify authorization
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Missing authorization header')
    }

    // Create user client to verify permissions
    const userClient = createUserClient(authHeader)
    const { user, profile } = await verifyUserRole(userClient, ['admin', 'super_admin'])

    // Parse request body
    const body: UpdateUserRequest = await req.json()
    
    // Validate required fields
    if (!body.userId || !body.userType || !body.updateData) {
      throw new Error('Missing required fields: userId, userType, updateData')
    }

    // Validate userType
    if (!['teacher', 'student', 'admin'].includes(body.userType)) {
      throw new Error('Invalid userType. Must be teacher, student, or admin')
    }

    // Permission checks based on user type being updated
    if (body.userType === 'admin' && profile.role !== 'super_admin') {
      throw new Error('Only super administrators can update admin users')
    }

    // Prevent non-super-admins from updating super-admin profiles
    if (body.updateData.role === 'super_admin' && profile.role !== 'super_admin') {
      throw new Error('Only super administrators can assign super admin role')
    }

    // Create service client for operations
    const serviceClient = createServiceClient()

    // Get the current user data
    const { data: currentUser, error: currentUserError } = await serviceClient
      .from('user_profiles')
      .select('*')
      .eq('id', body.userId)
      .single()

    if (currentUserError || !currentUser) {
      throw new Error('User not found')
    }

    // Prevent users from updating their own critical fields inappropriately
    if (currentUser.id === user.id) {
      // Users can update their own profile but not their role or active status
      if (body.updateData.role && body.updateData.role !== currentUser.role) {
        throw new Error('Users cannot change their own role')
      }
      if (body.updateData.is_active === false) {
        throw new Error('Users cannot deactivate themselves')
      }
    }

    // Prepare update data
    const updateFields: any = {
      updated_at: new Date().toISOString()
    }

    // Map common fields
    if (body.updateData.full_name !== undefined) updateFields.full_name = body.updateData.full_name
    if (body.updateData.email !== undefined) updateFields.email = body.updateData.email
    if (body.updateData.phone_number !== undefined) updateFields.phone_number = body.updateData.phone_number
    if (body.updateData.is_active !== undefined) updateFields.is_active = body.updateData.is_active
    if (body.updateData.status !== undefined) updateFields.status = body.updateData.status
    if (body.updateData.notes !== undefined) updateFields.notes = body.updateData.notes
    if (body.updateData.profile_image !== undefined) updateFields.profile_image = body.updateData.profile_image

    // Map type-specific fields
    switch (body.userType) {
      case 'teacher':
        // Map to actual teacher profile columns
        if (body.updateData.subject !== undefined) updateFields.specialization = body.updateData.subject
        if (body.updateData.qualification !== undefined) updateFields.qualification = body.updateData.qualification
        if (body.updateData.date_hired !== undefined) updateFields.hire_date = body.updateData.date_hired
        break
      
      case 'student':
        if (body.updateData.admission_number !== undefined) updateFields.admission_number = body.updateData.admission_number
        if (body.updateData.class_id !== undefined) updateFields.class_id = body.updateData.class_id
        if (body.updateData.guardian_name !== undefined) updateFields.guardian_name = body.updateData.guardian_name
        if (body.updateData.date_of_birth !== undefined) updateFields.date_of_birth = body.updateData.date_of_birth
        if (body.updateData.gender !== undefined) updateFields.gender = body.updateData.gender
        break
      
      case 'admin':
        if (body.updateData.role !== undefined) updateFields.role = body.updateData.role
        break
    }

    // Update the user profile
    const { data: updatedUser, error: updateError } = await serviceClient
      .from('user_profiles')
      .update(updateFields)
      .eq('id', body.userId)
      .select()
      .single()

    if (updateError) {
      throw new Error(`Failed to update user: ${updateError.message}`)
    }

    // Update auth user if email changed
    if (body.updateData.email && body.updateData.email !== currentUser.email) {
      try {
        const { error: authError } = await serviceClient.auth.admin.updateUserById(body.userId, {
          email: body.updateData.email,
          user_metadata: {
            ...currentUser.user_metadata,
            full_name: body.updateData.full_name || currentUser.full_name,
            updated_at: new Date().toISOString()
          }
        })

        if (authError) {
          console.warn('Failed to update auth user email:', authError)
          // Don't fail the entire operation for auth update issues
        }
      } catch (authError) {
        console.warn('Auth update error:', authError)
      }
    }

    // Log the user update (aligned with create/delete student audit format)
    try {
      const { data: { user: actingAuthUser } } = await userClient.auth.getUser();

      // Normalize request IP and User-Agent for inet compatibility
      const xf = req.headers.get('x-forwarded-for') || '';
      const ipAddr = xf.split(',')[0]?.trim() || null; // inet must be valid IP or null
      const userAgent = req.headers.get('user-agent') || null;

      if (body.userType === 'student') {
        // Human-readable class info before/after
        let newClassInfo: { id: string | null; name: string | null } = { id: (updatedUser as any).class_id || null, name: null };
        let oldClassInfo: { id: string | null; name: string | null } = { id: (currentUser as any).class_id || null, name: null };
        try {
          if ((updatedUser as any).class_id) {
            const { data: classNew } = await serviceClient
              .from('classes')
              .select('id, name')
              .eq('id', (updatedUser as any).class_id)
              .single();
            if (classNew) newClassInfo = { id: classNew.id, name: classNew.name };
          }
          if ((currentUser as any).class_id) {
            const { data: classOld } = await serviceClient
              .from('classes')
              .select('id, name')
              .eq('id', (currentUser as any).class_id)
              .single();
            if (classOld) oldClassInfo = { id: classOld.id, name: classOld.name };
          }
        } catch (_) { /* ignore class lookup errors */ }

        // Determine actual changed fields by comparing previous vs updated values
        const candidateFields = Object.keys(body.updateData);
        const normalize = (v: any) => (v === undefined ? null : v);
        const changedFields = candidateFields.filter((key) => {
          const before = normalize((currentUser as any)[key]);
          const after = normalize((updatedUser as any)[key]);
          return JSON.stringify(before) !== JSON.stringify(after);
        });

        const oldValues: Record<string, any> = {};
        const newValues: Record<string, any> = {};
        for (const key of changedFields) {
          oldValues[key] = normalize((currentUser as any)[key]);
          newValues[key] = normalize((updatedUser as any)[key]);
        }

        // Only include class details if class_id changed
        const classChanged = changedFields.includes('class_id');
        const details: Record<string, any> = {
          updated_by: actingAuthUser?.email ?? null,
          updated_fields: changedFields,
          changes: changedFields.map((f) => ({ field: f, before: oldValues[f], after: newValues[f] }))
        };
        if (classChanged) {
          details.class_before = oldClassInfo;
          details.class_after = newClassInfo;
        }
        // Include email/admission_number only if they changed
        if (changedFields.includes('email')) details.email = (updatedUser as any).email;
        if (changedFields.includes('admission_number')) details.admission_number = (updatedUser as any).admission_number || null;

        await serviceClient.from('audit_logs').insert([
          {
            user_id: actingAuthUser?.id ?? user.id ?? null,
            action: 'update_student',
            resource_type: 'student',
            resource_id: body.userId,
            details,
            old_values: oldValues,
            new_values: newValues,
            ip_address: ipAddr,
            user_agent: userAgent,
            created_at: new Date().toISOString()
          }
        ]);
      } else {
        // Generic logging for non-student updates in a consistent shape
        const candidateFields2 = Object.keys(body.updateData);
        const normalize2 = (v: any) => (v === undefined ? null : v);
        const changedFields2 = candidateFields2.filter((key) => {
          const before = normalize2((currentUser as any)[key]);
          const after = normalize2((updatedUser as any)[key]);
          return JSON.stringify(before) !== JSON.stringify(after);
        });

        const oldValues2: Record<string, any> = {};
        const newValues2: Record<string, any> = {};
        for (const key of changedFields2) {
          oldValues2[key] = normalize2((currentUser as any)[key]);
          newValues2[key] = normalize2((updatedUser as any)[key]);
        }

        const detailsGeneric: Record<string, any> = {
          name: (updatedUser as any).full_name,
          email: (updatedUser as any).email,
          updated_by: actingAuthUser?.email ?? null,
          updated_fields: changedFields2,
          changes: changedFields2.map((f) => ({ field: f, before: oldValues2[f], after: newValues2[f] }))
        };

        await serviceClient.from('audit_logs').insert([
          {
            user_id: actingAuthUser?.id ?? user.id ?? null,
            action: `update_${body.userType}`,
            resource_type: body.userType,
            resource_id: body.userId,
            details: detailsGeneric,
            old_values: oldValues2,
            new_values: newValues2,
            ip_address: ipAddr,
            user_agent: userAgent,
            created_at: new Date().toISOString()
          }
        ]);
      }
    } catch (auditError) {
      console.warn('Failed to log user update:', auditError)
      // Don't fail the operation for audit logging
    }

    // Transform data for response
    const responseData = {
      id: updatedUser.id,
      email: updatedUser.email,
      name: updatedUser.full_name,
      fullName: updatedUser.full_name,
      phoneNumber: updatedUser.phone_number,
      role: updatedUser.role,
      userType: body.userType,
      isActive: updatedUser.is_active,
      status: updatedUser.status,
      updatedAt: updatedUser.updated_at,
      // Include type-specific fields in response
      ...(body.userType === 'teacher' && {
        subject: (updatedUser as any).specialization,
        qualification: (updatedUser as any).qualification,
        dateHired: (updatedUser as any).hire_date
      }),
      ...(body.userType === 'student' && {
        admissionNumber: updatedUser.admission_number,
        classId: updatedUser.class_id,
        guardianName: updatedUser.guardian_name,
        dateOfBirth: updatedUser.date_of_birth,
        gender: updatedUser.gender
      })
    }

    return new Response(
      JSON.stringify({ success: true, data: responseData }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Error updating user:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'An unexpected error occurred' 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})