// src/utils/sessionUtils.js
// Centralized helpers for academic session (year) and term normalization
// Pure utilities only; do not use React hooks here. Callers should use useSettings()
// to get raw values and then feed them into these helpers.

/**
 * Normalize academic year representation into a consistent string.
 *
 * Accepts common inputs like:
 *  - '2024/2025' (kept)
 *  - '2024-2025' (converted to '2024/2025')
 *  - 2024 or '2024' (returned as '2024')
 *  - trims whitespace
 * Does NOT infer next year to avoid accidental logic; callers can choose to expand if needed.
 */
export function normalizeAcademicYear(val) {
  if (val == null) return '';
  const s = String(val).trim();
  if (!s) return '';
  // Replace dash with slash for consistency if pattern looks like YYYY-YYYY
  const dashMatch = s.match(/^(\d{4})\s*[-]\s*(\d{4})$/);
  if (dashMatch) return `${dashMatch[1]}/${dashMatch[2]}`;
  // Already in YYYY/YYYY form
  const slashMatch = s.match(/^(\d{4})\s*[/]\s*(\d{4})$/);
  if (slashMatch) return `${slashMatch[1]}/${slashMatch[2]}`;
  // Single year (keep as-is)
  const yearOnly = s.match(/^(\d{4})$/);
  if (yearOnly) return yearOnly[1];
  return s; // fallback to original
}

/**
 * Build common alternative variants for an academic year string for fallback querying.
 * E.g., '2024/2025' => ['2024/2025', '2024-2025']
 */
export function buildAcademicYearVariants(val) {
  const norm = normalizeAcademicYear(val);
  if (!norm) return [];
  const out = new Set();
  out.add(norm);
  if (/^(\d{4})\/(\d{4})$/.test(norm)) {
    out.add(norm.replace('/', '-'));
  } else if (/^(\d{4})-(\d{4})$/.test(norm)) {
    out.add(norm.replace('-', '/'));
  }
  return Array.from(out);
}

/**
 * Parse term input to a number 1 | 2 | 3.
 * Accepts numeric, '1st', 'first', 'term 1', 'Second', '3rd', etc.
 * Returns null if not recognized.
 */
export function parseTermToNumber(val) {
  if (val == null) return null;
  if (typeof val === 'number' && [1, 2, 3].includes(val)) return val;
  const raw = String(val).trim().toLowerCase();
  const num = Number(raw);
  if (Number.isInteger(num) && [1, 2, 3].includes(num)) return num;
  // Word patterns
  if (/(^|\b)(first|1st|term\s*1|1\s*term)(\b|$)/i.test(raw)) return 1;
  if (/(^|\b)(second|2nd|term\s*2|2\s*term)(\b|$)/i.test(raw)) return 2;
  if (/(^|\b)(third|3rd|term\s*3|3\s*term)(\b|$)/i.test(raw)) return 3;
  const m = raw.match(/(\d)/);
  if (m) {
    const n = Number(m[1]);
    if ([1, 2, 3].includes(n)) return n;
  }
  return null;
}

/**
 * Get a user-facing term label from 1|2|3, defaulting to 'Term X' if unknown.
 */
export function getTermLabel(termNum) {
  const n = Number(termNum);
  if (n === 1) return '1st Term';
  if (n === 2) return '2nd Term';
  if (n === 3) return '3rd Term';
  return Number.isFinite(n) ? `Term ${n}` : 'Term';
}

/**
 * Prepare normalized values for querying and UI.
 * @param {object} settings - Typically from useSettings()
 * @returns {object} { academicYear, academicYearVariants, term, termLabel }
 */
export function getNormalizedSession(settings = {}) {
  const academicYear = normalizeAcademicYear(settings.academicYear);
  const academicYearVariants = buildAcademicYearVariants(academicYear);
  const term = parseTermToNumber(settings.currentTerm);
  const termLabel = getTermLabel(term);
  return { academicYear, academicYearVariants, term, termLabel };
}

/**
 * Convenience helper for composing RPC parameters.
 * @param {string} academicYearRaw
 * @param {string|number} termRaw
 * @returns {object} { p_academic_year, p_term }
 */
export function toRpcParams(academicYearRaw, termRaw) {
  return {
    p_academic_year: normalizeAcademicYear(academicYearRaw),
    p_term: parseTermToNumber(termRaw),
  };
}

/**
 * Build label for displaying session in UI: "{academicYear} • Term {termNumber}".
 * Falls back gracefully if parts are missing.
 */
export function formatSessionBadge(academicYearRaw, termRaw) {
  const ay = normalizeAcademicYear(academicYearRaw);
  const t = parseTermToNumber(termRaw);
  if (ay && t) return `${ay} • Term ${t}`;
  if (ay) return ay;
  if (t) return `Term ${t}`;
  return '';
}
