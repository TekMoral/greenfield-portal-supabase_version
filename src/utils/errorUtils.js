// src/utils/errorUtils.js

export const isProd = typeof import.meta !== 'undefined' && import.meta.env && !!import.meta.env.PROD;
export const isDev = typeof import.meta !== 'undefined' && import.meta.env && !!import.meta.env.DEV;

// Very conservative sanitization: show generic message if the input looks technical
export function sanitizePublicMessage(input, fallback = 'Something went wrong. Please try again.') {
  if (!input) return fallback;
  const s = String(input);
  // If message contains obvious technical tokens, return fallback
  const technicalPatterns = [
    /stack/i,
    /error:\s/i,
    /exception/i,
    /supabase/i,
    /SQL/i,
    /failed/i,
    /trace/i,
    /undefined/i,
    /cannot\sread\s/i,
    /network/i,
    /timeout/i,
  ];
  if (technicalPatterns.some((re) => re.test(s))) return fallback;
  // If message is too long, trim
  if (s.length > 200) return fallback;
  return s;
}

// Extract a user-friendly message from an Error-like value
export function getPublicErrorMessage(err, fallback) {
  if (!err) return fallback || 'Something went wrong. Please try again.';
  const message = typeof err === 'string' ? err : (err.message || err.error || err.statusText || '');
  return sanitizePublicMessage(message, fallback);
}

// No-op function for disabling logs
export function noop() {}

// Rate-limit wrapper
export function rateLimit(fn, limitMs = 1000) {
  let last = 0;
  return (...args) => {
    const now = Date.now();
    if (now - last >= limitMs) {
      last = now;
      try { return fn(...args); } catch (_) { /* ignore */ }
    }
  };
}
