// main.jsx
import ReactDOM from "react-dom/client";
import { StrictMode } from "react";
import App from "./App.jsx";
import "./index.css";
import { ToastProvider } from './contexts/ToastContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Inject resource hints for Supabase to reduce first-load DNS/TLS latency
(function addSupabaseResourceHints() {
  try {
    const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
    if (!SUPABASE_URL || typeof document === 'undefined') return;
    const u = new URL(SUPABASE_URL);
    const origins = new Set([u.origin]);
    // Also preconnect to the project's functions domain if using default supabase.co host
    if (u.host.endsWith('.supabase.co')) {
      const functionsOrigin = `${u.protocol}//${u.host.replace('.supabase.co', '.functions.supabase.co')}`;
      origins.add(functionsOrigin);
    }

    const ensureMetaDnsPrefetchEnabled = () => {
      const metaSel = 'meta[http-equiv="x-dns-prefetch-control"]';
      if (!document.head.querySelector(metaSel)) {
        const meta = document.createElement('meta');
        meta.setAttribute('http-equiv', 'x-dns-prefetch-control');
        meta.setAttribute('content', 'on');
        document.head.appendChild(meta);
      }
    };

    const addLink = (rel, href, withCrossOrigin = false) => {
      const selector = `link[rel="${rel}"][href="${href}"]`;
      if (document.head.querySelector(selector)) return;
      const link = document.createElement('link');
      link.rel = rel;
      link.href = href;
      if (withCrossOrigin) link.crossOrigin = 'anonymous';
      document.head.appendChild(link);
    };

    ensureMetaDnsPrefetchEnabled();
    origins.forEach((origin) => {
      // dns-prefetch expects //host form
      const host = new URL(origin).host;
      addLink('dns-prefetch', `//${host}`);
      // preconnect performs TCP+TLS warmup
      addLink('preconnect', origin, true);
    });
  } catch (_) {
    // silently ignore
  }
})();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
    mutations: {
      retry: 0,
    },
  },
});

// Lightweight Web Vitals monitoring (dynamic import, minimal overhead)
// Set VITE_VITALS_ENDPOINT to POST metrics; otherwise derive sensible defaults.
if (typeof window !== 'undefined') {
  (async () => {
    try {
      const { onCLS, onINP, onLCP } = await import('https://esm.sh/web-vitals@3');
      const endpoint = (() => {
        const explicit = import.meta.env.VITE_VITALS_ENDPOINT;
        if (explicit) return explicit;
        try {
          const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
          const FUNCTIONS_BASE = import.meta.env.VITE_SUPABASE_FUNCTIONS_URL;
          if (FUNCTIONS_BASE) {
            return `${FUNCTIONS_BASE.replace(/\/$/, '')}/ingest-web-vitals`;
          }
          if (SUPABASE_URL) {
            const u = new URL(SUPABASE_URL);
            if (u.host.endsWith('.supabase.co')) {
              const functionsOrigin = `${u.protocol}//${u.host.replace('.supabase.co', '.functions.supabase.co')}`;
              return `${functionsOrigin}/ingest-web-vitals`;
            }
            // Local dev: Supabase CLI exposes functions at /functions/v1/<name>
            return `${u.origin}/functions/v1/ingest-web-vitals`;
          }
        } catch (_) {}
        return '';
      })();
      const report = (metric) => {
        const payload = {
          name: metric.name,
          value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
          id: metric.id,
          delta: metric.delta,
          rating: metric.rating,
          page: window.location.pathname,
          ts: Date.now(),
          ua: navigator.userAgent,
        };
        if (endpoint) {
          try {
            if (navigator.sendBeacon) {
              const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
              navigator.sendBeacon(endpoint, blob);
            } else {
              fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
                keepalive: true,
              }).catch(() => {});
            }
          } catch (_) {}
        } else if (!import.meta.env.PROD) {
          // Dev-only console to avoid noise in production when no endpoint is set
          // eslint-disable-next-line no-console
          console.log('[web-vitals]', metric.name, payload);
        }
      };
      onCLS(report);
      onINP(report);
      onLCP(report);
    } catch (_) {
      // ignore if web-vitals cannot be loaded
    }
  })();
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <App />
      </ToastProvider>
    </QueryClientProvider>
  </StrictMode>
);
