// supabase/functions/generate-report/index.ts
// Deno Edge Function to generate a professional PDF report card and store it in Supabase Storage

import { PDFDocument, StandardFonts, rgb } from 'https://esm.sh/pdf-lib@1.17.1';
import { createServiceClient } from '../_shared/auth.ts';
import { handleCors, getResponseCorsHeaders } from '../_shared/cors-hardened.ts';

// Types for incoming payloads
interface SubjectRow {
  subject_id: string;
  subject_name: string;
  test_score?: number;
  exam_score?: number;
  admin_score?: number;
  total_score?: number;
  remark?: string;
}

interface AttendanceSummary {
  total_days?: number;
  present_days?: number;
  late_days?: number;
  absent_days?: number;
  percentage?: number;
}

interface StudentInfo {
  id: string;
  name: string;
  admission_number?: string;
  class_name?: string;
}

interface TermReportCardData {
  student: StudentInfo;
  term: number;
  academic_year: string | number;
  subjects: SubjectRow[];
  attendance?: AttendanceSummary;
  overall?: {
    average_percentage?: number;
    total_score?: number;
    position?: number;
  };
  overall_remark?: string;
}

interface GenerateReportBody {
  type: 'term_report_card';
  template?: string; // reserved for future theming
  data: TermReportCardData;
  options?: {
    filename?: string;
    persist?: boolean; // if true, function will store metadata row in student_documents
    bucket?: string; // storage bucket name (default: 'report-cards')
    pathPrefix?: string; // default: `${academic_year}/term-${term}/{generated|published}`
    status?: 'generated' | 'published' | 'archived'; // document lifecycle status
    debug?: boolean; // if true, include detailed persistence diagnostics in response
  };
}

function termName(term: number): string {
  if (term === 1) return '1st Term';
  if (term === 2) return '2nd Term';
  if (term === 3) return '3rd Term';
  return `Term ${term}`;
}

function calcLetterGrade(total: number): string {
  const t = Number(total) || 0;
  if (t >= 75) return 'A';
  if (t >= 65) return 'B';
  if (t >= 50) return 'C';
  if (t >= 45) return 'D';
  if (t >= 40) return 'E';
  return 'F';
}

async function buildReportPdf(data: TermReportCardData): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  let page = pdfDoc.addPage([595.28, 841.89]); // A4 portrait (points)
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // Layout constants
  const margin = 40;
  const pageWidth = page.getWidth();
  const pageHeight = page.getHeight();
  const line = 14; // base line height
  const small = 10; const normal = 11; const large = 13; const title = 14;
  let y = pageHeight - margin;

  // Reserve space for branded header drawn in finalize-report
  const headerReserved = 120; // reduced to tighten space under header
  y -= headerReserved;

  // Helpers
  const tw = (t: string, size = normal, f = font) => f.widthOfTextAtSize(String(t ?? ''), size);
  const drawText = (text: string, x: number, yy: number, size = normal, f = font, color = rgb(0,0,0)) => {
    page.drawText(String(text ?? ''), { x, y: yy, size, font: f, color });
  };
  const drawTextRight = (text: string, rightX: number, yy: number, size = normal, f = font, color = rgb(0,0,0)) => {
    const w = tw(String(text ?? ''), size, f);
    page.drawText(String(text ?? ''), { x: rightX - w, y: yy, size, font: f, color });
  };
  const drawRule = (x: number, yy: number, width: number, height = 0.6, color = rgb(0.82, 0.86, 0.9)) => {
    page.drawRectangle({ x, y: yy, width, height, color });
  };
  const wrapText = (text: string, maxWidth: number, size = normal, f = font, maxLines = 2) => {
    const words = String(text || '').split(/\s+/);
    const lines: string[] = [];
    let current = '';
    for (const w of words) {
      const tentative = current ? current + ' ' + w : w;
      if (tw(tentative, size, f) <= maxWidth) {
        current = tentative;
      } else {
        if (current) lines.push(current);
        current = w;
      }
      if (lines.length === maxLines) break;
    }
    if (lines.length < maxLines && current) lines.push(current);
    let truncated = false;
    // If still words remaining and reached maxLines, mark truncated
    const joined = lines.join(' ');
    const originalWidth = tw(String(text || ''), size, f);
    if (lines.length >= maxLines && (words.length > joined.split(/\s+/).length || originalWidth > maxWidth)) truncated = true;

    if (truncated) {
      const last = lines[lines.length - 1];
      // Add ellipsis to fit
      const ell = '…';
      let lastFit = last;
      while (tw(lastFit + ell, size, f) > maxWidth && lastFit.length > 0) {
        lastFit = lastFit.slice(0, -1);
      }
      lines[lines.length - 1] = lastFit + ell;
    }
    return { lines, truncated };
  };

  // Ensure any single line fits within maxWidth by trimming and adding an ellipsis if needed
  const clampTextToWidth = (text: string, maxWidth: number, size = normal, f = font) => {
    let s = String(text || '');
    if (tw(s, size, f) <= maxWidth) return s;
    // Trim until within width, then add ellipsis (and ensure it still fits)
    while (s.length > 0 && tw(s + '…', size, f) > maxWidth) {
      s = s.slice(0, -1);
    }
    return s.length > 0 ? s + '…' : '';
  };

  // Student Information Box
  // Shaded background with a thin border; labels left, values right.
  const studentBoxPadding = 10;
  const studentRows: Array<[string, string]> = [
    ['Student Name', data?.student?.name || ''],
    ['Admission No', data?.student?.admission_number || ''],
    ['Class', data?.student?.class_name || ''],
    ['Session', String(data?.academic_year ?? '')],
    ['Term', termName(Number(data?.term))],
  ];

  const boxInnerWidth = pageWidth - (margin * 2) - (studentBoxPadding * 2);
  const labelColWidth = 120; // left column for labels
  const valueColRight = margin + studentBoxPadding + boxInnerWidth; // right edge for value alignment
  const studentBoxTitle = 'Student Information';
  const studentBoxTitleHeight = line + 4; // slightly tighter
  const studentContentHeight = studentRows.length * (line + 1) + 4; // tighter row spacing
  const studentBoxHeight = studentBoxTitleHeight + studentContentHeight + (studentBoxPadding * 2);

  // Draw container
  const boxYTop = y;
  page.drawRectangle({
    x: margin,
    y: boxYTop - studentBoxHeight,
    width: pageWidth - margin * 2,
    height: studentBoxHeight,
    color: rgb(0.96, 0.97, 0.98)
  });
  // Border
  page.drawRectangle({ x: margin, y: boxYTop - studentBoxHeight, width: pageWidth - margin * 2, height: 0.8, color: rgb(0.8,0.85,0.9) });
  page.drawRectangle({ x: margin, y: boxYTop - 0.8, width: pageWidth - margin * 2, height: 0.8, color: rgb(0.8,0.85,0.9) });

  let sy = boxYTop - studentBoxPadding - large; // start inside box
  drawText(studentBoxTitle, margin + studentBoxPadding, sy, large, bold); sy -= (studentBoxTitleHeight - 2);

  for (const [label, value] of studentRows) {
    const rowY = sy;
    drawText(label + ':', margin + studentBoxPadding, rowY, normal, bold);
    drawTextRight(value, valueColRight, rowY, normal, font);
    sy -= (line + 2);
  }

  y = boxYTop - studentBoxHeight - 16; // tighter spacing after student info box

  // Academic Performance Table
  drawText('Academic Performance', margin, y, title, bold); y -= (line + 2);

  // Column layout - reduced subject width to fit other columns better
  const tableX = margin;
  const tableWidth = pageWidth - margin * 2;
  const colWidths = {
    subject: 140,  // Reduced from 190 to 140
    test: 55,      // Slightly reduced
    exam: 55,      // Slightly reduced  
    ca: 45,        // Reduced for C.A.
    total: 50,     // Slightly reduced
    grade: 45,     // Reduced
    remark: tableWidth - (140 + 55 + 55 + 45 + 50 + 45), // Remaining space
  } as const;
  const colX = {
    subject: tableX,
    test: tableX + 140,
    exam: tableX + 140 + 55,
    ca:   tableX + 140 + 55 + 55,
    total:tableX + 140 + 55 + 55 + 45,
    grade:tableX + 140 + 55 + 55 + 45 + 50,
    remark:tableX + 140 + 55 + 55 + 45 + 50 + 45,
  } as const;

  const headerHeight = line + 4;
  const rowPaddingX = 6;

  const drawTableHeader = () => {
        // Header text
    drawText('Subject', colX.subject + rowPaddingX, y, normal, bold);
    drawTextRight('Test', colX.test + colWidths.test - rowPaddingX, y, normal, bold);
    drawTextRight('Exam', colX.exam + colWidths.exam - rowPaddingX, y, normal, bold);
    drawTextRight('C.A.', colX.ca + colWidths.ca - rowPaddingX, y, normal, bold);
    drawTextRight('Total', colX.total + colWidths.total - rowPaddingX, y, normal, bold);
    drawTextRight('Grade', colX.grade + colWidths.grade - rowPaddingX, y, normal, bold);
    drawText('Remarks', colX.remark + rowPaddingX, y, normal, bold);
    y -= (headerHeight);
    // reduced gap after header
    y -= 2;
  };

  const ensureSpaceForRows = (minSpace = 120) => {
    if (y < minSpace) {
      page = pdfDoc.addPage([pageWidth, pageHeight]);
      // footer and margins preserved implicitly
      y = pageHeight - margin - headerReserved + 20; // leave room for continued marker
      drawText('Continued…', margin, y, small, font, rgb(0.3,0.3,0.3));
      y -= (line * 2);
      // redraw header on new page
      drawTableHeader();
    }
  };

  // Draw initial header
  drawTableHeader();

  const subjects = Array.isArray(data.subjects) ? data.subjects : [];
  let rowIndex = 0;
  for (const srow of subjects) {
    ensureSpaceForRows();
    const subj = srow.subject_name || '-';
    const test = srow.test_score;
    const exam = srow.exam_score;
    const ca = srow.admin_score;
    const total = (srow.total_score != null)
      ? Number(srow.total_score)
      : ((Number(srow.test_score || 0) + Number(srow.exam_score || 0) + Number(srow.admin_score || 0)));
    const grade = calcLetterGrade(total);
    const remarkTxt = srow.remark || '';

    // Row height can grow if remarks wrap; compute wrapped lines
    const remarkMaxWidth = colWidths.remark - (rowPaddingX * 2);
    const { lines: remarkLines } = wrapText(remarkTxt, remarkMaxWidth, normal, font, 2);
    const rowHeight = Math.max(line, remarkLines.length * (line + 0));

    // Alternating row shading - reduced padding
    if (rowIndex % 2 === 1) {
      page.drawRectangle({ x: tableX, y: y - rowHeight - 2, width: tableWidth, height: rowHeight + 4, color: rgb(0.985, 0.99, 0.995) });
    }

    // Subject (left)
    drawText(subj, colX.subject + rowPaddingX, y, normal, font);

    // Numeric right-aligned
    const fmt = (v: any) => (v === null || v === undefined || v === '') ? '' : String(Math.round(Number(v)));
    drawTextRight(fmt(test), colX.test + colWidths.test - rowPaddingX, y, normal, font);
    drawTextRight(fmt(exam), colX.exam + colWidths.exam - rowPaddingX, y, normal, font);
    drawTextRight(fmt(ca), colX.ca + colWidths.ca - rowPaddingX, y, normal, font);
    drawTextRight(fmt(total), colX.total + colWidths.total - rowPaddingX, y, normal, font);

    // Grade (left within column)
    drawTextRight(grade, colX.grade + colWidths.grade - rowPaddingX, y, normal, font);

    // Remarks (wrapped up to 2 lines)
    let ry = y;
    for (const ln of remarkLines) {
      drawText(ln, colX.remark + rowPaddingX, ry, normal, font);
      ry -= line;
    }

    // Advance to next row baseline - reduced spacing
    y -= (rowHeight + 3);

    rowIndex++;
    // If running low on space, new page and re-header
    if (y < 120) {
      page = pdfDoc.addPage([pageWidth, pageHeight]);
      y = pageHeight - margin - headerReserved + 20;
      drawText('Continued…', margin, y, small, font, rgb(0.3,0.3,0.3));
      y -= (line * 2);
      drawTableHeader();
    }
  }

  // Two-column summaries: Attendance (left) and Overall (right)
  y -= 10;
  const gutter = 20;
  const colW = (tableWidth - gutter) / 2;
  const leftX = margin;
  const rightX = margin + colW + gutter;
  const blockHeaderHeight = line + 6;
  const blockPad = 8;

  // Attendance Block - removed Late field
  const a = data.attendance || {};
  const attendanceLines: string[] = [];
  attendanceLines.push(`Total Days: ${a.total_days ?? ''}`);
  attendanceLines.push(`Present: ${a.present_days ?? ''}`);
  attendanceLines.push(`Absent: ${a.absent_days ?? ''}`);
  if (a.percentage != null) attendanceLines.push(`Attendance %: ${a.percentage}%`);

  // Overall Block
  const o = data.overall || {};
  const overallLines: string[] = [];
  if (o.total_score != null) overallLines.push(`Total Score: ${o.total_score}`);
  if (o.average_percentage != null) overallLines.push(`Average %: ${o.average_percentage}`);
  if (o.position != null) overallLines.push(`Position: ${o.position}`);
  if (data.overall_remark) overallLines.push(`Admin Remark: ${data.overall_remark}`);

  // Compute block heights
  const leftBlockHeight = blockHeaderHeight + blockPad + (attendanceLines.length * (line + 2)) + blockPad;
  const rightBlockHeight = blockHeaderHeight + blockPad + (overallLines.length * (line + 2)) + blockPad;
  const maxBlockH = Math.max(leftBlockHeight, rightBlockHeight);

  // New page if not enough space
  if (y - maxBlockH < 60) {
    page = pdfDoc.addPage([pageWidth, pageHeight]);
    y = pageHeight - margin - headerReserved;
  }

  // Draw Attendance block container
  page.drawRectangle({ x: leftX, y: y - leftBlockHeight, width: colW, height: leftBlockHeight, color: rgb(0.97, 0.98, 0.995) });
  drawText('Attendance Summary', leftX + blockPad, y - blockPad - normal, normal, bold);
  let ay = y - blockHeaderHeight - blockPad - 2;
  for (const lineText of attendanceLines) {
    drawText(lineText, leftX + blockPad, ay, normal, font);
    ay -= (line + 2);
  }

  // Draw Overall block container
  page.drawRectangle({ x: rightX, y: y - rightBlockHeight, width: colW, height: rightBlockHeight, color: rgb(0.97, 0.98, 0.995) });
  drawText('Overall Summary', rightX + blockPad, y - blockPad - normal, normal, bold);
  let oy = y - blockHeaderHeight - blockPad - 2;
  for (const lineText of overallLines) {
    const { lines } = wrapText(lineText, colW - (blockPad * 2), normal, font, 3);
    for (const ln of lines) {
      drawText(ln, rightX + blockPad, oy, normal, font);
      oy -= line;
    }
    oy -= 2;
  }

  // Footer note on each page
  const footerNote = 'Note: Test (30), Exam (50), C.A. (20), Total (100)';
  for (const p of pdfDoc.getPages()) {
    p.drawText(footerNote, { x: margin, y: 24, size: small, font, color: rgb(0.3, 0.3, 0.3) });
  }

  // Save with compression settings
  const bytes = await pdfDoc.save({
    useObjectStreams: false,
    addDefaultPage: false,
    objectsPerTick: 50,
    updateFieldAppearances: false
  });
  return bytes;
}

Deno.serve(async (req: Request) => {
  // CORS preflight
  const corsPreflight = handleCors(req);
  if (corsPreflight) return corsPreflight;

  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: getResponseCorsHeaders(req),
      });
    }

    const body = (await req.json()) as GenerateReportBody;

    if (!body || body.type !== 'term_report_card' || !body.data) {
      return new Response(JSON.stringify({ error: 'Invalid payload: expected type term_report_card and data' }), {
        status: 400,
        headers: getResponseCorsHeaders(req),
      });
    }

    const data = body.data;

    // Build PDF
    const pdfBytes = await buildReportPdf(data);

    // Storage upload
    const supabase = createServiceClient();
    const bucket = body.options?.bucket || 'report-cards';
    const term = Number(data.term);
    const yearStr = String(data.academic_year);
    const docStatus = (body.options?.status as 'generated' | 'published' | 'archived' | undefined) || 'generated';
    const defaultFolder = docStatus === 'published' ? 'published' : 'generated';
    const pathPrefix = body.options?.pathPrefix || `${yearStr}/term-${term}/${defaultFolder}`;

    const filename = body.options?.filename || `${data.student.admission_number || data.student.id}_${yearStr}_T${term}.pdf`;
    const storagePath = `${pathPrefix}/${filename}`;

    // Ensure bucket exists (best-effort)
    try {
      // @ts-ignore - admin list buckets not always available; ignore error
      await supabase.storage.getBucket(bucket);
    } catch (_) {
      // ignore; assumes bucket pre-created in dashboard
    }

    // Upload file
    const { error: uploadError } = await supabase.storage.from(bucket).upload(storagePath, pdfBytes, {
      contentType: 'application/pdf',
      upsert: true,
    });

    if (uploadError) {
      return new Response(JSON.stringify({ error: `Upload failed: ${uploadError.message}` }), {
        status: 500,
        headers: getResponseCorsHeaders(req),
      });
    }

    // Get public URL
    const { data: pub } = supabase.storage.from(bucket).getPublicUrl(storagePath);
    const url = pub?.publicUrl || null;

    // Debug and persistence tracking
    const debugEnabled = !!body.options?.debug;
    const insertAttempts: Array<{ payloadKeys: string[]; ok: boolean; error?: string }> | undefined = debugEnabled ? [] : undefined;
    let persisted = false;
    let preflightError: string | null = null;
    if (debugEnabled) {
      try {
        const { error: tableErr } = await supabase.from('student_documents').select('id').limit(1);
        if (tableErr) preflightError = tableErr.message;
      } catch (e) {
        preflightError = String((e as any)?.message || e);
      }
    }

    // Optionally persist a record in student_documents for easy listing in app
    if (body.options?.persist && data.student?.id) {
      const basePayload: any = {
        student_id: data.student.id,
        document_type: 'report_card',
        file_name: filename,
      };

      const nowIso = new Date().toISOString();
      const tryPayloads: any[] = [
        {
          ...basePayload,
          file_url: url,
          storage_path: storagePath,
          bucket_name: bucket,
          mime_type: 'application/pdf',
          term: term,
          academic_year: yearStr,
          uploaded_at: nowIso,
          status: docStatus,
        },
        {
          ...basePayload,
          file_path: storagePath,
          bucket_name: bucket,
          mime_type: 'application/pdf',
          uploaded_at: nowIso,
          status: docStatus,
        },
        {
          ...basePayload,
          file_path: storagePath,
          uploaded_at: nowIso,
          status: docStatus,
        },
      ];

      for (const payload of tryPayloads) {
        const { error: insertErr } = await supabase.from('student_documents').insert(payload);
        if (debugEnabled && insertAttempts) {
          insertAttempts.push({ payloadKeys: Object.keys(payload), ok: !insertErr, error: insertErr?.message });
        }
        if (!insertErr) { persisted = true; break; }
      }
    }

    const responseBody: any = { success: true, url, path: storagePath, bucket, persisted, status: docStatus };
    if (debugEnabled) {
      responseBody.debug = { preflightError, insertAttempts };
    }

    return new Response(JSON.stringify(responseBody), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        ...getResponseCorsHeaders(req),
      },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err?.message || err) }), {
      status: 500,
      headers: getResponseCorsHeaders(req),
    });
  }
});