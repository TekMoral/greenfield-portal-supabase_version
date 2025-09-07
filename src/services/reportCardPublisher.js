// src/services/reportCardPublisher.js
// High-level publisher: fetch RPC data and call Edge Function to generate PDF

import { supabase } from '../lib/supabaseClient';
import { generateReport } from './supabase/edgeFunctions';

/**
 * Fetch term report card data via RPC and publish a PDF report card.
 * @param {Object} params
 * @param {string} params.studentId
 * @param {number} params.term
 * @param {string|number} params.academicYear
 * @param {Object} [options]
 * @param {boolean} [options.persist=true] - Insert a record in student_documents
 * @param {string} [options.bucket='report-cards']
 * @returns {Promise<{ success: boolean, url?: string, error?: string }>} 
 */
export async function publishStudentTermReport({ studentId, term, academicYear }, options = {}) {
  try {
    if (!studentId || term == null || !academicYear) {
      return { success: false, error: 'Missing studentId, term, or academicYear' };
    }

    // 1) Fetch consolidated report data from RPC (server computes & joins under RLS)
    const { data: rpcData, error: rpcError } = await supabase.rpc('rpc_get_term_report_card', {
      student_id: studentId,
      term: term,
      academic_year: String(academicYear),
    });

    if (rpcError) {
      console.error('rpc_get_term_report_card failed:', rpcError);
      return { success: false, error: rpcError.message };
    }

    const payload = {
      type: 'term_report_card',
      data: rpcData,
      options: {
        filename: `${rpcData?.student?.admission_number || studentId}_${academicYear}_T${term}.pdf`,
        persist: options.persist !== false,
        bucket: options.bucket || 'report-cards',
      },
    };

    // 2) Generate and store PDF via Edge Function
    const result = await generateReport(payload);
    if (!result || !result.url) {
      return { success: false, error: 'Report generation failed' };
    }

    return { success: true, url: result.url };
  } catch (err) {
    console.error('publishStudentTermReport error:', err);
    return { success: false, error: err?.message || String(err) };
  }
}

/**
 * Bulk publish by class: iterate studentIds and call publishStudentTermReport with small delay.
 */
export async function publishReportsForClass({ studentIds, term, academicYear }, options = {}) {
  const results = [];
  for (let i = 0; i < studentIds.length; i++) {
    const id = studentIds[i];
    try {
      // Throttle a bit to avoid rate limiting
      /* eslint-disable no-await-in-loop */
      const res = await publishStudentTermReport({ studentId: id, term, academicYear }, options);
      results.push({ studentId: id, ...res });
      await new Promise(r => setTimeout(r, 150));
      /* eslint-enable no-await-in-loop */
    } catch (e) {
      results.push({ studentId: id, success: false, error: e?.message || String(e) });
    }
  }
  return results;
}
