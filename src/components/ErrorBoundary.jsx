import React from 'react';

/**
 * ErrorBoundary
 * - Catches render errors in descendant components
 * - Handles dynamic import (chunk) load errors with a clear recovery path
 * - Supports controlled reset via resetKeys and programmatic reset
 *
 * Props:
 * - fallback: ReactNode | null
 * - fallbackRenderer: ({ error, resetErrorBoundary, isChunkError }) => ReactNode
 * - resetKeys: any[] (when values change, boundary resets)
 * - onError: (error, errorInfo) => void
 * - onReset: ({ reason, prevError }) => void
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });

    // Optional external logging
    if (typeof this.props.onError === 'function') {
      try {
        this.props.onError(error, errorInfo);
      } catch (_) {}
    }

    // Helpful console for developers
    if (import.meta && import.meta.env && import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.error('[ErrorBoundary] Caught error:', error, errorInfo);
    }
  }

  componentDidUpdate(prevProps) {
    const { resetKeys } = this.props;

    // Reset on resetKeys change (shallow compare)
    if (resetKeys && prevProps.resetKeys) {
      const changed = !areArraysShallowEqual(prevProps.resetKeys, resetKeys);
      if (this.state.hasError && changed) {
        this.resetErrorBoundary('keys');
      }
    }
  }

  resetErrorBoundary = (reason = 'manual') => {
    const prevError = this.state.error;
    this.setState({ hasError: false, error: null, errorInfo: null }, () => {
      if (typeof this.props.onReset === 'function') {
        try {
          this.props.onReset({ reason, prevError });
        } catch (_) {}
      }
    });
  };

  renderDefaultFallback(error, resetErrorBoundary, isChunkError) {
    const isDev = !!(import.meta && import.meta.env && import.meta.env.DEV);

    return (
      <div className="min-h-[50vh] flex items-center justify-center p-6">
        <div className="w-full max-w-xl bg-white border border-gray-200 rounded-xl shadow-sm p-6 text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
            <span className="text-red-600 text-xl">⚠️</span>
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">
            Something went wrong
          </h2>
          {isChunkError ? (
            <p className="text-gray-600 mb-4">
              It looks like the app just updated. Please reload to continue.
            </p>
          ) : (
            <p className="text-gray-600 mb-4">
              An unexpected error occurred. You can try again or reload the app.
            </p>
          )}

          {isDev && error?.message ? (
            <div className="text-left bg-gray-50 border border-gray-200 rounded-md p-3 mb-4 overflow-auto max-h-40">
              <div className="text-xs text-gray-800 font-mono whitespace-pre-wrap">
                {String(error.message)}
              </div>
            </div>
          ) : null}

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            {!isChunkError && (
              <button
                type="button"
                onClick={() => resetErrorBoundary()}
                className="px-4 py-2 rounded-lg bg-gray-800 text-white hover:bg-gray-700 transition-colors"
              >
                Try again
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                try {
                  // Reload whole app to fetch latest manifest/chunks
                  window.location.reload();
                } catch (_) {
                  resetErrorBoundary();
                }
              }}
              className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors"
            >
              Reload App
            </button>
          </div>
        </div>
      </div>
    );
  }

  render() {
    const { hasError, error } = this.state;

    if (hasError) {
      const isChunkError = isChunkLoadError(error);
      const { fallback, fallbackRenderer } = this.props;

      if (typeof fallbackRenderer === 'function') {
        return fallbackRenderer({
          error,
          resetErrorBoundary: this.resetErrorBoundary,
          isChunkError,
        });
      }

      if (fallback) {
        return fallback;
      }

      return this.renderDefaultFallback(error, this.resetErrorBoundary, isChunkError);
    }

    return this.props.children;
  }
}

function areArraysShallowEqual(a, b) {
  if (a === b) return true;
  if (!Array.isArray(a) || !Array.isArray(b)) return false;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

// Heuristics for dynamic import / chunk load errors
function isChunkLoadError(error) {
  if (!error) return false;
  const msg = (error && (error.message || error.toString())) || '';
  const name = error && error.name;
  return (
    name === 'ChunkLoadError' ||
    name === 'Loading chunk failed' ||
    /Loading chunk [\d]+ failed/i.test(msg) ||
    /ChunkLoadError/i.test(msg) ||
    /Failed to fetch dynamically imported module/i.test(msg) ||
    /Importing a module script failed/i.test(msg) ||
    /Unexpected token '<'/.test(msg) // when an HTML error is returned for a JS chunk
  );
}

export default ErrorBoundary;

// Optional HOC for convenience
export function withErrorBoundary(Component, boundaryProps = {}) {
  return function ErrorBoundaryWrapper(props) {
    return (
      <ErrorBoundary {...boundaryProps}>
        <Component {...props} />
      </ErrorBoundary>
    );
  };
}
