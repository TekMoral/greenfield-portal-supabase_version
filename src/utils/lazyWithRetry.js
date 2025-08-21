import React from 'react';

// Heuristics for dynamic import / chunk load errors across bundlers
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

/**
 * Wrap React.lazy with a retry mechanism for dynamic imports.
 * - Retries once by default when a chunk load error is detected.
 * - If the retry still fails, forces a full page reload to pick up new assets.
 *
 * @param {() => Promise<any>} factory - Dynamic import function () => import('...')
 * @param {{ maxRetries?: number, retryDelay?: number }} options
 */
export function lazyWithRetry(factory, options = {}) {
  const { maxRetries = 1, retryDelay = 80 } = options;

  let attempts = 0;

  const load = () =>
    factory().catch((err) => {
      if (isChunkLoadError(err) && attempts < maxRetries) {
        attempts += 1;
        return new Promise((resolve, reject) => {
          setTimeout(() => {
            factory()
              .then(resolve)
              .catch((e2) => {
                // Final safeguard: force a reload to fetch the latest manifest/chunks
                if (isChunkLoadError(e2)) {
                  try { window.location.reload(); } catch (_) {}
                }
                reject(e2);
              });
          }, retryDelay);
        });
      }
      throw err;
    });

  return React.lazy(load);
}

export default lazyWithRetry;
