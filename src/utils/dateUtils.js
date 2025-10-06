// Shared date formatting utilities
// Format: day/mon/year with abbreviated month (lowercase), e.g., 1/jan/2025

export const MONTHS_ABBR = [
  'Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'
];

export function formatDMY(dateLike) {
  const d = new Date(dateLike);
  if (!Number.isFinite(d.getTime())) return '';
  return `${d.getDate()}/${MONTHS_ABBR[d.getMonth()]}/${d.getFullYear()}`;
}

// Accepts d/mon/yyyy (mon is 3-letter abbreviation) or d/m/yyyy (numeric month)
// Returns ISO yyyy-mm-dd or null on parse failure
export function parseDMYtoISO(s) {
  try {
    const parts = String(s).trim().split('/');
    if (parts.length !== 3) return null;
    const day = parseInt(parts[0], 10);
    const year = parseInt(parts[2], 10);
    if (!Number.isFinite(day) || !Number.isFinite(year)) return null;

    let monthIdx = -1;
    const mid = parts[1];
    if (/^[A-Za-z]{3}$/.test(mid)) {
      // Case-insensitive search for month abbreviation
      const midLower = mid.toLowerCase();
      monthIdx = MONTHS_ABBR.findIndex(m => m.toLowerCase() === midLower);
    } else {
      const mnum = parseInt(mid, 10);
      if (Number.isFinite(mnum)) monthIdx = mnum - 1;
    }
    if (monthIdx < 0 || monthIdx > 11) return null;

    const dd = String(day).padStart(2, '0');
    const mm = String(monthIdx + 1).padStart(2, '0');
    return `${year}-${mm}-${dd}`;
  } catch {
    return null;
  }
}
