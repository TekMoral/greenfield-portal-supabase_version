// supabase/functions/get-report-url/index.ts
// Edge Function to generate a short-lived signed URL for a report card PDF
// Only the owning student, an admin/super_admin, or an associated guardian may access it.

import { createServiceClient, createUserClient } from '../_shared/auth.ts';
import { handleCors, getResponseCorsHeaders } from '../_shared/cors-hardened.ts';

// Bump this when deploying to verify the active version in debug responses
const FUNCTION_VERSION = 'get-report-url@2025-09-18';

interface GetReportUrlBody {
  document_id?: string; // preferred
  bucket?: string;      // optional if document_id provided
  path?: string;        // optional if document_id provided
  expires_in?: number;  // seconds, default 300
  debug?: boolean;
}


Deno.serve(async (req: Request) => {
  const corsPreflight = handleCors(req);
  if (corsPreflight) return corsPreflight;

  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: getResponseCorsHeaders(req),
      });
    }

    const body = (await req.json()) as GetReportUrlBody;
    const expiresIn = Math.max(30, Math.min(3600, Number(body?.expires_in) || 300));

    // Require Authorization header
    const authHeader = req.headers.get('authorization') || req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized: Missing Authorization header' }), {
        status: 401,
        headers: getResponseCorsHeaders(req),
      });
    }

    const userClient = createUserClient(authHeader);
    const { data: userRes, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userRes?.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized: Invalid token' }), {
        status: 401,
        headers: getResponseCorsHeaders(req),
      });
    }

    const requester = userRes.user;
    const service = createServiceClient();

    // Resolve target document
    let doc: any | null = null;
    if (body.document_id) {
      const { data, error } = await service
        .from('student_documents')
        .select('id, student_id, bucket_name, storage_path, file_path, status')
        .eq('id', body.document_id)
        .single();
      if (error || !data) {
        return new Response(JSON.stringify({ error: 'Document not found' }), { status: 404, headers: getResponseCorsHeaders(req) });
      }
      doc = data;
    } else if (body.bucket && body.path) {
      // Fallback lookup to find document row by bucket/path (optional)
      const { data, error } = await service
        .from('student_documents')
        .select('id, student_id, bucket_name, storage_path, file_path, status')
        .eq('bucket_name', body.bucket)
        .or(`storage_path.eq.${body.path},file_path.eq.${body.path}`)
        .limit(1)
        .maybeSingle();
      if (error || !data) {
        return new Response(JSON.stringify({ error: 'Document not found for given bucket/path' }), { status: 404, headers: getResponseCorsHeaders(req) });
      }
      doc = data;
    } else {
      return new Response(JSON.stringify({ error: 'document_id required (or bucket + path)' }), { status: 400, headers: getResponseCorsHeaders(req) });
    }

    // Defer status-based access checks until after role evaluation

    const bucket = doc.bucket_name || body.bucket || 'report-cards';
    const path = doc.file_path || doc.storage_path;
    if (!path) {
      return new Response(JSON.stringify({ error: 'Document has no file path' }), { status: 400, headers: getResponseCorsHeaders(req) });
    }

    // Fetch requester profile
    const { data: requesterProfile } = await service
      .from('user_profiles')
      .select('id, email, role, is_super_admin')
      .eq('id', requester.id)
      .maybeSingle();

    const requesterRole = requesterProfile?.role || null;
    const isSuperAdmin = requesterProfile?.is_super_admin === true;

    // Status-based gating: only admins/super_admins can access non-published drafts
    const isPublished = doc?.status === 'published';
    if (!isPublished) {
      const isAdminLike = requesterRole === 'admin' || requesterRole === 'super_admin' || isSuperAdmin;
      if (!isAdminLike) {
        return new Response(JSON.stringify({ error: 'Report is not published' }), { status: 403, headers: getResponseCorsHeaders(req) });
      }
    }

    // Fetch student profile to evaluate guardian linkage
    const { data: studentProfile } = await service
      .from('user_profiles')
      .select('id, role, guardian_email')
      .eq('id', doc.student_id)
      .maybeSingle();

    const studentId: string = doc.student_id;
    const studentGuardianEmail: string | null = studentProfile?.guardian_email || null;

    // Authorization checks
    let allowed = false;

    // Admins and super_admins allowed always
    if (requesterRole === 'admin' || requesterRole === 'super_admin' || isSuperAdmin) {
      allowed = true;
    }

    if (isPublished) {
      // The owning student allowed for published only
      if (!allowed && requester.id === studentId && requesterRole === 'student') {
        allowed = true;
      }

      // Guardian allowed for published only if email matches student's guardian_email
      const requesterEmail = requester.email || requesterProfile?.email || null;
      if (!allowed && requesterRole === 'guardian' && requesterEmail && studentGuardianEmail) {
        if (requesterEmail.toLowerCase() === String(studentGuardianEmail).toLowerCase()) {
          allowed = true;
        }
      }
    }

    if (!allowed) {
      return new Response(JSON.stringify({ error: 'Forbidden: You are not allowed to access this report' }), {
        status: 403,
        headers: getResponseCorsHeaders(req),
      });
    }

    // Create a signed URL
    const { data: signed, error: signErr } = await service
      .storage
      .from(bucket)
      .createSignedUrl(path, expiresIn);

    if (signErr || !signed?.signedUrl) {
      return new Response(JSON.stringify({ error: `Failed to create signed URL: ${signErr?.message || 'unknown error'}` }), {
        status: 500,
        headers: getResponseCorsHeaders(req),
      });
    }

    const response: any = {
      success: true,
      url: signed.signedUrl,
      expires_in: expiresIn,
      path,
      bucket,
      version: FUNCTION_VERSION,
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...getResponseCorsHeaders(req) },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String((err as any)?.message || err) }), {
      status: 500,
      headers: getResponseCorsHeaders(req),
    });
  }
});
