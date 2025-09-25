/**
 * Shared sanitizers and validators for frontend usage
 * - sanitizeText(str, { maxLength })
 * - clampNumber(n, { min, max })
 * - isValidURL(str, { protocols })
 */

/**
 * Internal helper to strip HTML tags.
 * Uses DOM parsing in browser environments and falls back to regex otherwise.
 * @param {any} input
 * @returns {string}
 */
const stripTags = (input) => {
  if (input == null) return '';
  const str = String(input);

  // Prefer DOM parsing in browsers for more accurate tag stripping
  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    const tmp = document.createElement('div');
    tmp.innerHTML = str;
    const text = tmp.textContent || tmp.innerText || '';
    // Cleanup
    tmp.textContent = '';
    return text;
  }

  // Fallback: remove tags with a simple regex
  return str.replace(/<[^>]*>/g, '');
};

/**
 * Sanitize free text for safe display/storage.
 * - Strips HTML tags
 * - Normalizes whitespace (collapses to single spaces)
 * - Trims leading/trailing whitespace
 * - Enforces optional maxLength
 * @param {string} str
 * @param {{ maxLength?: number }} [options]
 * @returns {string}
 */
export const sanitizeText = (str, options = {}) => {
  const { maxLength } = options;
  let text = stripTags(str);

  // Normalize whitespace (including newlines and tabs) to a single space
  text = text.replace(/\s+/g, ' ').trim();

  if (typeof maxLength === 'number' && maxLength > 0 && text.length > maxLength) {
    text = text.slice(0, maxLength).trim();
  }

  return text;
};

/**
 * Clamp a number within an inclusive range.
 * If the input is not a finite number, returns null.
 * If both min and max are provided and min > max, they will be swapped.
 * @param {number} n
 * @param {{ min?: number, max?: number }} [options]
 * @returns {number|null}
 */
export const clampNumber = (n, { min = -Infinity, max = Infinity } = {}) => {
  const num = typeof n === 'number' ? n : Number(n);
  if (!Number.isFinite(num)) return null;

  let lo = min;
  let hi = max;
  if (Number.isFinite(lo) && Number.isFinite(hi) && lo > hi) {
    [lo, hi] = [hi, lo];
  }

  return Math.min(Math.max(num, lo), hi);
};

/**
 * Validate a URL, optionally restricting allowed protocols.
 * @param {string} str
 * @param {{ protocols?: string[] }} [options] - Allowed protocols without trailing colon (default ['https'])
 * @returns {boolean}
 */
export const isValidURL = (str, { protocols = ['https'] } = {}) => {
  if (!str || typeof str !== 'string') return false;
  try {
    const url = new URL(str.trim());
    const protocol = url.protocol.replace(/:$/, '').toLowerCase();

    if (Array.isArray(protocols) && protocols.length > 0) {
      const allowed = protocols.map((p) => String(p).toLowerCase().replace(/:$/, ''));
      if (!allowed.includes(protocol)) return false;
    }

    // Explicitly disallow common dangerous protocols
    if (['javascript', 'data', 'vbscript'].includes(protocol)) return false;

    // Basic sanity check
    if (!url.hostname) return false;

    return true;
  } catch (_) {
    return false;
  }
};

export default {
  sanitizeText,
  clampNumber,
  isValidURL,
};
