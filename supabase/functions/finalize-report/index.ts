// supabase/functions/finalize-report/index.ts
// Edge Function to finalize a generated report card PDF by stamping school branding and admin signature,
// saving it to the published path, and updating student_documents.

import { PDFDocument, StandardFonts, rgb, degrees } from 'https://esm.sh/pdf-lib@1.17.1';
import { createServiceClient } from '../_shared/auth.ts';
import { handleCors, getResponseCorsHeaders } from '../_shared/cors-hardened.ts';

// Bump this when deploying to verify the active version in debug responses
const FUNCTION_VERSION = 'finalize-report@2025-09-18';

interface FinalizeReportBody {
  document_id?: string; // student_documents.id (preferred)
  bucket?: string; // storage bucket (default: 'report-cards')
  source_path?: string; // storage path of generated PDF (optional if document_id provided)
  destination_path?: string; // target published path (optional)
  student_id?: string; // optional, used for fallbacks
  term?: number | string; // optional, used for destination path fallback
  academic_year?: string | number; // optional, used for destination path fallback
  verified_by?: string; // admin user id who verified/publishes
  overrides?: {
    school_name?: string;
    logo_path?: string; // can be an HTTP URL or storage path (assumed in 'branding' bucket)
    watermark_path?: string; // optional watermark
    branding_bucket?: string; // optional, default 'branding'
    // Logo sizing overrides (best practice: constrain size, preserve aspect ratio, never upscale)
    logo_max_height?: number; // in PDF points (1/72 inch), default ~72pt (~1in)
    logo_max_width?: number; // in PDF points, default ~120pt (~1.67in)
    // Signature sizing overrides (best practice: constrain size, preserve aspect ratio, never upscale)
    signature_max_width?: number; // in PDF points (1/72 inch), default ~160pt (~2.22in)
    signature_max_height?: number; // in PDF points, default ~60pt (~0.83in)
  };
  debug?: boolean; // include diagnostics in response
}

async function blobToUint8Array(blob: Blob): Promise<Uint8Array> {
  const ab = await blob.arrayBuffer();
  return new Uint8Array(ab);
}

async function tryDownloadFromStorage(supabase: any, bucket: string, path: string): Promise<Uint8Array | null> {
  try {
    const { data, error } = await supabase.storage.from(bucket).download(path);
    if (error || !data) return null;
    return await blobToUint8Array(data as Blob);
  } catch {
    return null;
  }
}

async function tryFetchUrlBytes(url: string): Promise<Uint8Array | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const ab = await res.arrayBuffer();
    return new Uint8Array(ab);
  } catch {
    return null;
  }
}

function sanitizeStoragePath(path?: string | null): string | null {
  if (!path) return null;
  try {
    let p = String(path).trim();
    // Remove leading slashes
    p = p.replace(/^\/+/, '');
    // If someone included the bucket prefix, strip it (branding/...) to relative path
    p = p.replace(/^branding\//i, '');
    // Decode URI components if present
    try { p = decodeURIComponent(p); } catch (_) { /* ignore */ }
    return p;
  } catch {
    return path as any;
  }
}

function isLikelyPng(bytes?: Uint8Array | null): boolean {
  if (!bytes || bytes.length < 8) return false;
  return bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47;
}

function isLikelyJpg(bytes?: Uint8Array | null): boolean {
  if (!bytes || bytes.length < 2) return false;
  return bytes[0] === 0xFF && bytes[1] === 0xD8;
}

function sanitizeSingleLine(text?: string | null): string {
  if (!text) return '';
  try {
    let t = String(text);
    // Replace newlines (which cannot be encoded in WinAnsi/simple fonts) with spaces
    t = t.replace(/[\r\n]+/g, ' ');
    // Remove other control characters
    t = t.replace(/[\x00-\x08\x0B-\x1F]+/g, ' ');
    // Collapse repeated whitespace
    t = t.replace(/\s\s+/g, ' ').trim();
    return t;
  } catch {
    return String(text || '');
  }
}

// Compress image bytes before embedding
async function compressImageBytes(bytes: Uint8Array, maxWidth = 800, maxHeight = 600, quality = 0.8): Promise<Uint8Array> {
  try {
    // Create a canvas to resize/compress the image
    const canvas = new OffscreenCanvas(1, 1);
    const ctx = canvas.getContext('2d');
    if (!ctx) return bytes;

    // Create image from bytes
    const blob = new Blob([bytes]);
    const imageBitmap = await createImageBitmap(blob);
    
    // Calculate new dimensions maintaining aspect ratio
    let { width, height } = imageBitmap;
    const aspectRatio = width / height;
    
    if (width > maxWidth) {
      width = maxWidth;
      height = width / aspectRatio;
    }
    if (height > maxHeight) {
      height = maxHeight;
      width = height * aspectRatio;
    }
    
    // Resize canvas and draw image
    canvas.width = Math.round(width);
    canvas.height = Math.round(height);
    ctx.drawImage(imageBitmap, 0, 0, canvas.width, canvas.height);
    
    // Convert to compressed JPEG
    const compressedBlob = await canvas.convertToBlob({
      type: 'image/jpeg',
      quality: quality
    });
    
    imageBitmap.close();
    return new Uint8Array(await compressedBlob.arrayBuffer());
  } catch (error) {
    // If compression fails, return original bytes
    console.warn('Image compression failed:', error);
    return bytes;
  }
}

async function embedImageGeneric(pdfDoc: PDFDocument, bytes: Uint8Array, compress = true) {
  let imageBytes = bytes;
  
  // Compress image if requested and it's large
  if (compress && bytes.length > 50000) { // Only compress if > 50KB
    imageBytes = await compressImageBytes(bytes, 400, 300, 0.85);
  }
  
  // Try to detect; fallback to trying PNG then JPG
  try {
    if (isLikelyPng(imageBytes)) return await pdfDoc.embedPng(imageBytes);
    if (isLikelyJpg(imageBytes)) return await pdfDoc.embedJpg(imageBytes);
  } catch (_) {
    // continue to fallbacks below
  }
  try {
    return await pdfDoc.embedPng(imageBytes);
  } catch (_) {
    // ignore and try JPG
  }
  return await pdfDoc.embedJpg(imageBytes);
}

function extractYearTermFromPath(path?: string): { year?: string; term?: number } {
  try {
    if (!path) return {};
    const m = String(path).match(/(\d{4})\/term-(\d+)/i);
    if (m) return { year: m[1], term: Number(m[2]) };
    return {};
  } catch {
    return {};
  }
}

function termName(term?: number): string {
  const t = Number(term || 0);
  if (t === 1) return '1st Term';
  if (t === 2) return '2nd Term';
  if (t === 3) return '3rd Term';
  return `Term ${t}`;
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

    const body = (await req.json()) as FinalizeReportBody;
    const debugEnabled = !!body?.debug;
    const diag: any = debugEnabled ? { version: FUNCTION_VERSION, steps: [] as string[], errors: [] as string[] } : undefined;

    const supabase = createServiceClient();

    // 1) Resolve the source document row and storage path
    let row: any | null = null;
    if (body.document_id) {
      if (debugEnabled) diag.steps.push('Fetching student_documents row by id');
      const { data, error } = await supabase
        .from('student_documents')
        .select('id, student_id, file_name, storage_path, file_path, bucket_name, file_url, term, academic_year, is_verified, verified_by, verified_at, status')
        .eq('id', body.document_id)
        .single();
      if (error) {
        return new Response(JSON.stringify({ error: `Document not found: ${error.message}` }), { status: 404, headers: getResponseCorsHeaders(req) });
      }
      row = data;
    }

    const bucket = body.bucket || row?.bucket_name || 'report-cards';
    const sourcePath = body.source_path || row?.storage_path || row?.file_path;

    if (!sourcePath) {
      return new Response(JSON.stringify({ error: 'Missing source_path and no storage_path/file_path found on document' }), {
        status: 400,
        headers: getResponseCorsHeaders(req),
      });
    }

    // 2) Download the generated PDF
    if (debugEnabled) diag.steps.push(`Downloading source PDF: ${bucket}:${sourcePath}`);
    const srcBytes = await tryDownloadFromStorage(supabase, bucket, sourcePath);
    if (!srcBytes) {
      return new Response(JSON.stringify({ error: 'Failed to download source PDF from storage' }), {
        status: 500,
        headers: getResponseCorsHeaders(req),
      });
    }

    // 3) Load PDF and prepare stamping
    const pdfDoc = await PDFDocument.load(srcBytes);
    const pages = pdfDoc.getPages();
    const firstPage = pages[0];
    const lastPage = pages[pages.length - 1];
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // 4) Fetch branding settings and assets
    const brandingBucket = body.overrides?.branding_bucket || 'branding';

    let schoolName: string | undefined = body.overrides?.school_name;
    let logoPath: string | undefined = body.overrides?.logo_path;
    let watermarkPath: string | undefined = body.overrides?.watermark_path;
    let headerAddress: string | undefined;
    let headerPhone: string | undefined;
    let headerEmail: string | undefined;
    let headerWebsite: string | undefined;
    let headerMotto: string | undefined;
    let fallbackSignaturePath: string | undefined;

    // Fetch school settings - always try to get the data
    try {
      if (debugEnabled) diag.steps.push('Fetching school_settings');
      const { data: settings, error: settingsError } = await supabase
        .from('school_settings')
        .select('school_name, logo_path, watermark_path, address, phone, email, website, signature, motto')
        .limit(1)
        .maybeSingle();
      
      if (debugEnabled) {
        diag.steps.push(`Settings query result: ${JSON.stringify({ settings, error: settingsError })}`);
      }
      
      if (settingsError) {
        if (debugEnabled) diag.errors.push(`school_settings query error: ${settingsError.message}`);
      }
      
      if (settings) {
        // Use database values, but don't override if already provided
        if (!schoolName) schoolName = settings.school_name as string | undefined;
        if (!logoPath) logoPath = settings.logo_path as string | undefined;
        if (!watermarkPath) watermarkPath = settings.watermark_path as string | undefined;
        headerAddress = (settings.address as string | undefined) || headerAddress;
        headerPhone = (settings.phone as string | undefined) || headerPhone;
        headerEmail = (settings.email as string | undefined) || headerEmail;
        headerWebsite = (settings.website as string | undefined) || headerWebsite;
        headerMotto = (settings.motto as string | undefined) || headerMotto;
        if (!fallbackSignaturePath && (settings as any).signature) fallbackSignaturePath = (settings as any).signature as string;
        
        if (debugEnabled) {
          diag.steps.push(`Extracted values: name="${schoolName}", address="${headerAddress}", phone="${headerPhone}", email="${headerEmail}", website="${headerWebsite}", motto="${headerMotto}"`);
        }
      } else {
        if (debugEnabled) {
          diag.errors.push('No school_settings found');
        }
      }
    } catch (e) {
      if (debugEnabled) diag.errors.push(`school_settings fetch failed: ${String((e as any)?.message || e)}`);
    }

    // Logo bytes (robust load with path sanitization and fallbacks)
    let logoBytes: Uint8Array | null = null;
    if (logoPath) {
      if (/^https?:\/\//i.test(logoPath)) {
        logoBytes = await tryFetchUrlBytes(logoPath);
      } else {
        const p1 = sanitizeStoragePath(logoPath);
        if (p1) logoBytes = await tryDownloadFromStorage(supabase, brandingBucket, p1);
        if (!logoBytes) {
          // Fallback: try original as-is (in case sanitization was overzealous)
          logoBytes = await tryDownloadFromStorage(supabase, brandingBucket, logoPath);
        }
      }
    }

    // Signature assets (verified_by -> signature_path, name, title)
    const verifiedBy = body.verified_by || row?.verified_by || null;
    let signerName: string | undefined; let signerTitle: string | undefined; let signaturePath: string | undefined;
    if (verifiedBy) {
      try {
        if (debugEnabled) diag.steps.push('Fetching signatory profile');
        const { data: signatory } = await supabase
          .from('user_profiles')
          .select('full_name, title, signature_path')
          .eq('id', verifiedBy)
          .maybeSingle();
        signerName = signatory?.full_name || undefined;
        signerTitle = signatory?.title || undefined;
        signaturePath = signatory?.signature_path || undefined;
      } catch (e) {
        if (debugEnabled) diag.errors.push(`user_profiles fetch failed: ${String((e as any)?.message || e)}`);
      }
    }

    if (!signaturePath && fallbackSignaturePath) {
      signaturePath = fallbackSignaturePath;
    }
    let signatureBytes: Uint8Array | null = null;
    if (signaturePath) {
      if (/^https?:\/\//i.test(signaturePath)) {
        signatureBytes = await tryFetchUrlBytes(signaturePath);
      } else {
        const p1 = sanitizeStoragePath(signaturePath);
        if (p1) signatureBytes = await tryDownloadFromStorage(supabase, brandingBucket, p1);
        if (!signatureBytes) signatureBytes = await tryDownloadFromStorage(supabase, brandingBucket, signaturePath);
      }
    }

    // 5) Draw header: school name centered with logo beside it, term below
    try {
      const headerMargin = 36;
      const topY = firstPage.getHeight() - headerMargin;

      // Determine term label
      const { term: pathTerm } = extractYearTermFromPath(sourcePath);
      const termNum = Number(body.term || row?.term || pathTerm || 1);
      const termLabel = `${termName(termNum)} Report`;

      // School name metrics
      const titleSize = 26;
      const nameText = sanitizeSingleLine(schoolName || '');
      const nameColor = rgb(0.12, 0.16, 0.22); // professional slate tone
      const nameWidth = bold.widthOfTextAtSize(nameText, titleSize);
      let nameX = Math.max(headerMargin, (firstPage.getWidth() - nameWidth) / 2);
      const nameY = topY - titleSize; // place near top

      // Draw name first (centered)
      if (nameText) {
        firstPage.drawText(nameText, { x: nameX, y: nameY, size: titleSize, font: bold, color: nameColor });
      }

      // Draw logo to the immediate left of the name
      if (logoBytes && nameText) {
        try {
          const logoImg = await embedImageGeneric(pdfDoc, logoBytes);
          
          // Best practice: constrain logo by max dimensions, preserve aspect ratio, and avoid upscaling.
          const logoMaxH = Math.max(50, Math.min(130, Number(body?.overrides?.logo_max_height) || 82));
          const logoMaxW = Math.max(70, Math.min(220, Number(body?.overrides?.logo_max_width) || 150));
          
          const scale = Math.min(1, logoMaxW / logoImg.width, logoMaxH / logoImg.height);
          const lw = logoImg.width * scale;
          const lh = logoImg.height * scale;
          const gap = 10;
          let lx = nameX - gap - lw;
          if (lx < headerMargin) {
            // If logo would go off-page, shift name right to accommodate
            const delta = headerMargin - lx;
            nameX += delta;
            lx = headerMargin;
            // Redraw name at new position
            firstPage.drawText(nameText, { x: nameX, y: nameY, size: titleSize, font: bold, color: nameColor });
          }
          const ly = nameY + (titleSize / 2) - (lh / 2) - 5;
          firstPage.drawImage(logoImg, { x: lx, y: ly, width: lw, height: lh });
        } catch (e) {
          if (debugEnabled) diag.errors.push(`Logo embed failed: ${String((e as any)?.message || e)}`);
        }
      }

      // Header layout: School name, motto, address, contact, term
      let belowY = nameY;
      const mottoText = sanitizeSingleLine(headerMotto || '');
      
      // Prepare contact info
      const addressSafe = sanitizeSingleLine(headerAddress || '');
      const phoneSafe = sanitizeSingleLine(headerPhone || '');
      const emailSafe = sanitizeSingleLine(headerEmail || '');
      const websiteSafe = sanitizeSingleLine(headerWebsite || '');
      
      const infoParts2: string[] = [];
      if (phoneSafe) infoParts2.push(`Tel: ${phoneSafe}`);
      if (emailSafe) infoParts2.push(emailSafe);
      if (websiteSafe) infoParts2.push(websiteSafe);
      const infoLine2 = infoParts2.join(' • ');

      const centerDraw = (text: string, y: number, size = 10) => {
        const tw = font.widthOfTextAtSize(text, size);
        const tx = Math.max(headerMargin, (firstPage.getWidth() - tw) / 2);
        firstPage.drawText(text, { x: tx, y, size, font, color: rgb(0,0,0) });
      };

      // 1. Draw motto first (directly below school name)
      if (mottoText) {
        const mottoSize = 12;
        const mottoDisplay = `MOTTO: ${mottoText}`;
        const mw = font.widthOfTextAtSize(mottoDisplay, mottoSize);
        const mx = Math.max(headerMargin, (firstPage.getWidth() - mw) / 2);
        const my = belowY - 16;
        const mottoColor = rgb(0.28, 0.33, 0.41); // slate-600 tone
        firstPage.drawText(mottoDisplay, { x: mx, y: my, size: mottoSize, font, color: mottoColor });
        belowY = my;
      }
      
      // 2. Draw address below motto
      let ciY = belowY - 12;
      if (addressSafe) {
        centerDraw(addressSafe, ciY, 10);
        belowY = ciY;
        ciY -= 12;
      }
      
      // 3. Draw other contact info below address
      ciY = belowY - 12;
      if (infoLine2) {
        centerDraw(infoLine2, ciY, 10);
        belowY = ciY;
        ciY -= 12;
      }
      
      // 4. Finally draw term label as the last element in header

      if (termLabel) {
  const termSize = 14;
  const tw = bold.widthOfTextAtSize(termLabel, termSize);
  const tx = Math.max(headerMargin, (firstPage.getWidth() - tw) / 2);

  // give extra top margin, e.g., 24 points instead of 14
  ciY = belowY - 24;  
  firstPage.drawText(termLabel, { x: tx, y: ciY, size: termSize, font: bold, color: rgb(0,0,0) });

  belowY = ciY;       // update for next element
  ciY -= 12;          // spacing for next line
}

    } catch (e) {
      if (debugEnabled) diag.errors.push(`Header draw failed: ${String((e as any)?.message || e)}`);
    }

    // 6) Optional watermark across pages (published)
    if (watermarkPath) {
      try {
        let wmBytes: Uint8Array | null = null;
        if (/^https?:\/\//i.test(watermarkPath)) {
          wmBytes = await tryFetchUrlBytes(watermarkPath);
        } else {
          const p1 = sanitizeStoragePath(watermarkPath);
          if (p1) wmBytes = await tryDownloadFromStorage(supabase, brandingBucket, p1);
          if (!wmBytes) wmBytes = await tryDownloadFromStorage(supabase, brandingBucket, watermarkPath);
        }
        if (wmBytes) {
          const wmImg = await embedImageGeneric(pdfDoc, wmBytes);
          for (const p of pages) {
            const pw = p.getWidth();
            const ph = p.getHeight();
            // Larger coverage and centered
            const scale = Math.min(pw / (wmImg.width * 0.95), ph / (wmImg.height * 0.95));
            const w = wmImg.width * scale; const h = wmImg.height * scale;
            p.drawImage(wmImg, {
              x: (pw - w) / 2,
              y: (ph - h) / 2,
              width: w,
              height: h,
              opacity: 0.12
            });
          }
        }
      } catch (e) {
        if (debugEnabled) diag.errors.push(`Watermark failed: ${String((e as any)?.message || e)}`);
      }
    }

    // 7) Draw signature block on last page (bottom-right)
    try {
      const margin = 40;
      const pageW = lastPage.getWidth();

      // Best practice: constrain signature by max dimensions, preserve aspect ratio, and avoid upscaling.
      const sigMaxW = Math.max(80, Math.min(300, Number(body?.overrides?.signature_max_width) || 120));
      const sigMaxH = Math.max(40, Math.min(200, Number(body?.overrides?.signature_max_height) || 45));

      const sigBoxWidth = sigMaxW; // also used for the underline length
      const x = Math.max(margin, pageW - margin - sigBoxWidth);
      const imgY = 70; // distance from bottom for image

      if (signatureBytes) {
        try {
          const sigImg = await embedImageGeneric(pdfDoc, signatureBytes);
          const scale = Math.min(1, sigMaxW / sigImg.width, sigMaxH / sigImg.height);
          const w = sigImg.width * scale;
          const h = sigImg.height * scale;
          lastPage.drawImage(sigImg, { x, y: imgY, width: w, height: h });
        } catch (e) {
          if (debugEnabled) diag.errors.push(`Signature embed failed: ${String((e as any)?.message || e)}`);
        }
      }

      // Draw a thin line under the signature area
      const lineY = imgY - 6;
      lastPage.drawRectangle({ x, y: lineY, width: sigBoxWidth, height: 0.7, color: rgb(0,0,0) });

      // Labels and metadata below the line
      let ty = lineY - 12;
      lastPage.drawText('Authorized Signature', { x, y: ty, size: 9, font, color: rgb(0,0,0) });
      ty -= 12;

      const nameText = sanitizeSingleLine(signerName || '');
      const titleText = sanitizeSingleLine(signerTitle || '');
      const dateIso = row?.verified_at || new Date().toISOString();
      const dateText = `Date: ${new Date(dateIso).toLocaleDateString()}`;

      if (nameText) { lastPage.drawText(nameText, { x, y: ty, size: 10, font, color: rgb(0,0,0) }); ty -= 12; }
      if (titleText) { lastPage.drawText(titleText, { x, y: ty, size: 10, font, color: rgb(0,0,0) }); ty -= 12; }
      lastPage.drawText(dateText, { x, y: ty, size: 10, font, color: rgb(0,0,0) });
    } catch (e) {
      if (debugEnabled) diag.errors.push(`Signature draw failed: ${String((e as any)?.message || e)}`);
    }

    // 8) Save PDF with compression
    const outBytes = await pdfDoc.save({
      useObjectStreams: false,
      addDefaultPage: false,
      objectsPerTick: 50,
      updateFieldAppearances: false
    });

    // 9) Compute destination path
    let destPath = body.destination_path || '';
    if (!destPath) {
      if (sourcePath.includes('/generated/')) {
        destPath = sourcePath.replace('/generated/', '/published/');
      } else {
        const { year: pathYear, term: pathTerm } = extractYearTermFromPath(sourcePath);
        const year = String(body.academic_year || row?.academic_year || pathYear || '');
        const termNum = Number(body.term || row?.term || pathTerm || 1);
        const filename = row?.file_name || sourcePath.split('/').pop() || `report_${year}_T${termNum}.pdf`;
        destPath = `${year}/term-${termNum}/published/${filename}`;
      }
    }

    // 10) Upload to destination (published)
    if (debugEnabled) diag.steps.push(`Uploading published PDF: ${bucket}:${destPath}`);
    const { error: upErr } = await supabase.storage.from(bucket).upload(destPath, outBytes, {
      contentType: 'application/pdf',
      upsert: true,
      // reduce CDN/browser caching; prefer versioned filenames in production
      cacheControl: 'no-cache, max-age=0, s-maxage=0, must-revalidate'
    });
    if (upErr) {
      return new Response(JSON.stringify({ error: `Upload failed: ${upErr.message}` }), { status: 500, headers: getResponseCorsHeaders(req) });
    }

    // 11) Public URL disabled for private buckets. Use signed URLs via an authenticated endpoint.
    const url: string | null = null;
    const url_versioned: string | null = null;

    // 12) Update DB row (if document_id provided)
    let updated = false;
    if (row?.id) {
      const nowIso = new Date().toISOString();
      const updates: any = {
        status: 'published',
        storage_path: destPath,
        file_path: destPath,
        file_url: null,
        uploaded_at: nowIso,
      };
      if (!row.verified_by && (body.verified_by || row.verified_by)) updates.verified_by = body.verified_by || row.verified_by;
      if (!row.verified_at) updates.verified_at = nowIso;
      if (row.is_verified !== true) updates.is_verified = true;
      const { error: updErr } = await supabase.from('student_documents').update(updates).eq('id', row.id);
      if (!updErr) updated = true; else if (debugEnabled) diag.errors.push(`DB update failed: ${updErr.message}`);
    }

    const response: any = { success: true, path: destPath, bucket, updated };
    if (debugEnabled) response.debug = diag;

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