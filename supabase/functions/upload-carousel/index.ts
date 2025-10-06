import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createServiceClient, createUserClient, verifyUserRole } from '../_shared/auth.ts'
import { corsHeaders, handleCors } from '../_shared/cors.ts'

// Allowed image types and size cap
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
const MAX_BYTES = 2 * 1024 * 1024 // 2MB

function getExtFromType(type: string, fallback: string = 'jpg'): string {
  if (!type) return fallback
  if (type.includes('jpeg')) return 'jpg'
  if (type.includes('png')) return 'png'
  if (type.includes('gif')) return 'gif'
  if (type.includes('webp')) return 'webp'
  return fallback
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return handleCors(req)
  }

  try {
    // Validate auth
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ success: false, error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Only admin/super_admin can upload carousel images
    const userClient = createUserClient(authHeader)
    const { user, profile } = await verifyUserRole(userClient, ['admin', 'super_admin'])

    const contentType = req.headers.get('content-type') || ''
    if (!contentType.toLowerCase().includes('multipart/form-data')) {
      return new Response(JSON.stringify({ success: false, error: 'Invalid content type; expected multipart/form-data' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const form = await req.formData()
    const file = form.get('file') as File | null
    const metadataRaw = (form.get('metadata') as string | null) || null

    if (!file) {
      return new Response(JSON.stringify({ success: false, error: 'No file provided' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return new Response(JSON.stringify({ success: false, error: `Invalid file type. Allowed: ${ALLOWED_TYPES.join(', ')}` }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if ((file as any).size && (file as any).size > MAX_BYTES) {
      return new Response(JSON.stringify({ success: false, error: `File too large. Max ${Math.floor(MAX_BYTES / (1024 * 1024))}MB` }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Enforce max carousel images
    const service = createServiceClient()
    const { count, error: countErr } = await service
      .from('carousel_images')
      .select('id', { count: 'exact', head: true })

    if (countErr) {
      return new Response(JSON.stringify({ success: false, error: `Failed to check carousel limit: ${countErr.message}` }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const MAX_CAROUSEL_IMAGES = 20
    if ((count || 0) >= MAX_CAROUSEL_IMAGES) {
      return new Response(JSON.stringify({ success: false, error: `Carousel is full (max ${MAX_CAROUSEL_IMAGES}). Delete old images to upload new ones.` }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    let metadata: any = {}
    if (metadataRaw) {
      try { metadata = JSON.parse(metadataRaw) } catch (_) { /* ignore parse error */ }
    }

    const ext = getExtFromType(file.type, (file.name?.split('.').pop() || 'jpg'))
    const timestamp = Date.now()
    const rand = Math.random().toString(36).substring(7)
    const path = `carousel/${timestamp}_${rand}.${ext}`

    // Upload to storage (carousel-images bucket)
    const { error: upErr } = await service
      .storage
      .from('carousel-images')
      .upload(path, file, { contentType: file.type, cacheControl: 'public, max-age=31536000, immutable' })

    if (upErr) {
      return new Response(JSON.stringify({ success: false, error: `Upload failed: ${upErr.message}` }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Build DB row
    const row = {
      title: metadata.title || '',
      description: metadata.caption || metadata.description || '',
      image_path: path,
      bucket_name: 'carousel-images',
      link_url: metadata.link_url || null,
      is_active: metadata.isActive !== undefined ? !!metadata.isActive : true,
      display_order: Number.isFinite(metadata.order) ? metadata.order : 0,
      created_by: user.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    const { data: inserted, error: dbErr } = await service
      .from('carousel_images')
      .insert(row)
      .select()
      .single()

    if (dbErr) {
      // best-effort cleanup
      try { await service.storage.from('carousel-images').remove([path]) } catch (_) {}
      return new Response(JSON.stringify({ success: false, error: `DB save failed: ${dbErr.message}` }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const { data: pub } = service.storage.from('carousel-images').getPublicUrl(path)
    const url = pub?.publicUrl || null

    const response = {
      success: true,
      data: {
        id: inserted.id,
        ...inserted,
        src: url,
        caption: inserted.description || '',
        alt: inserted.title || 'Carousel image',
        isActive: inserted.is_active
      }
    }

    return new Response(JSON.stringify(response), {
      status: 201,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (error) {
    const message = (error as any)?.message || 'Unexpected error'
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})