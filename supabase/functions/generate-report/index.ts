// supabase/functions/generate-report/index.ts
// Deno Edge Function to generate a PDF report card and store it in Supabase Storage

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
    pathPrefix?: string; // default: `${academic_year}/term-${term}`
  };
}

function termName(term: number): string {
  if (term === 1) return '1st Term';
  if (term === 2) return '2nd Term';
  if (term === 3) return '3rd Term';
  return `Term ${term}`;
}

async function buildReportPdf(data: TermReportCardData): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]); // A4 portrait (points)
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  let y = 800;
  const margin = 40;
  const lineHeight = 16;

  const drawText = (text: string, x: number, yPos: number, size = 12, bold = false, color = rgb(0, 0, 0)) => {
    page.drawText(text ?? '', {
      x,
      y: yPos,
      size,
      font: bold ? fontBold : font,
      color,
    });
  };

  // Header
  drawText('Term Report Card', margin, y, 20, true);
  y -= lineHeight * 2;

  // Student Info
  drawText(`Name: ${data.student.name || ''}`, margin, y, 12, true); y -= lineHeight;
  if (data.student.admission_number) { drawText(`Admission No: ${data.student.admission_number}`, margin, y); y -= lineHeight; }
  if (data.student.class_name) { drawText(`Class: ${data.student.class_name}`, margin, y); y -= lineHeight; }
  drawText(`Session: ${String(data.academic_year)}`, margin, y); y -= lineHeight;
  drawText(`Term: ${termName(Number(data.term))}`, margin, y); y -= lineHeight * 2;

  // Subjects Table Header
  drawText('Subjects', margin, y, 14, true); y -= lineHeight;
  drawText('Subject', margin, y, 12, true);
  drawText('Test (30)', margin + 220, y, 12, true);
  drawText('Exam (50)', margin + 300, y, 12, true);
  drawText('Admin (20)', margin + 390, y, 12, true);
  drawText('Total (100)', margin + 480, y, 12, true);
  y -= lineHeight * 1.2;

  // Subjects Rows
  for (const row of (data.subjects || [])) {
    if (y < 120) { // new page if needed
      const np = pdfDoc.addPage([595.28, 841.89]);
      y = 800;
      np.drawText('Continued…', { x: margin, y, size: 10, font });
      y -= lineHeight * 2;
      // switch page reference
      (page as any) = np;
    }
    drawText(row.subject_name || '-', margin, y);
    drawText(String(row.test_score ?? ''), margin + 220, y);
    drawText(String(row.exam_score ?? ''), margin + 300, y);
    drawText(String(row.admin_score ?? ''), margin + 390, y);
    drawText(String(row.total_score ?? ((row.test_score ?? 0) + (row.exam_score ?? 0) + (row.admin_score ?? 0))), margin + 480, y);
    y -= lineHeight;
    if (row.remark) {
      drawText(`Remark: ${row.remark}`, margin + 20, y, 10);
      y -= lineHeight * 0.9;
    }
  }

  y -= lineHeight;

  // Attendance Summary
  drawText('Attendance Summary', margin, y, 14, true); y -= lineHeight;
  const a = data.attendance || {};
  drawText(`Total Days: ${a.total_days ?? ''}`, margin, y); y -= lineHeight;
  drawText(`Present: ${a.present_days ?? ''}  Late: ${a.late_days ?? ''}  Absent: ${a.absent_days ?? ''}`, margin, y); y -= lineHeight;
  if (a.percentage != null) { drawText(`Attendance %: ${a.percentage}%`, margin, y); y -= lineHeight; }

  y -= lineHeight;

  // Overall
  drawText('Overall Summary', margin, y, 14, true); y -= lineHeight;
  if (data.overall?.total_score != null) { drawText(`Overall Total: ${data.overall.total_score}`, margin, y); y -= lineHeight; }
  if (data.overall?.average_percentage != null) { drawText(`Average %: ${data.overall.average_percentage}`, margin, y); y -= lineHeight; }
  if (data.overall?.position != null) { drawText(`Position: ${data.overall.position}`, margin, y); y -= lineHeight; }

  y -= lineHeight;

  // Overall Remark
  if (data.overall_remark) {
    drawText('Admin Remark', margin, y, 14, true); y -= lineHeight;
    drawText(data.overall_remark, margin, y);
    y -= lineHeight;
  }

  const bytes = await pdfDoc.save();
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
    const pathPrefix = body.options?.pathPrefix || `${yearStr}/term-${term}`;

    const filename = body.options?.filename || `${data.student.admission_number || data.student.id}_${yearStr}_T${term}.pdf`;
    const storagePath = `${pathPrefix}/${filename}`;

    // Ensure bucket exists (best-effort)
    try {
      // @ts-ignore - admin list buckets not always available; ignore errors
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

    // Optionally persist a record in student_documents for easy listing in app
    if (body.options?.persist && data.student?.id) {
      const insertPayload = {
        student_id: data.student.id,
        document_type: 'report_card',
        file_name: filename,
        file_url: url,
        storage_path: storagePath,
        term: term,
        academic_year: yearStr,
        created_at: new Date().toISOString(),
      } as any;

      // Best-effort insert (do not fail whole operation on error)
      await supabase.from('student_documents').insert(insertPayload);
    }

    return new Response(JSON.stringify({ success: true, url, path: storagePath, bucket }), {
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
