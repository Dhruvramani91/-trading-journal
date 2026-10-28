import { type ComponentType, lazy } from 'react';

export const CHUNK_RELOAD_STORAGE_KEY = 'theprecisionlab:chunk-reload';
export const CHUNK_RELOAD_COOLDOWN_MS = 15_000;

export function isChunkLoadError(error: unknown): boolean {
  if (!error) return false;
  const message = String((error as Error)?.message || error);
  const name = String((error as Error)?.name || '');
  return (
    name === 'ChunkLoadError' ||
    message.includes('Failed to fetch dynamically imported module') ||
    message.includes('Importing a module script failed') ||
    message.includes('error loading dynamically imported module') ||
    message.includes('Loading chunk') ||
    message.includes('dynamically imported module')
  );
}

/**
 * Wraps dynamic component imports so that when a new deployment invalidates
 * previous chunk hashes, the application automatically reloads to pull the
 * latest HTML and chunk map instead of crashing.
 */
export function lazyWithRetry<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
) {
  return lazy(async () => {
    try {
      return await factory();
    } catch (error: unknown) {
      if (isChunkLoadError(error) && typeof window !== 'undefined') {
        let lastReload = 0;
        try {
          lastReload = Number(sessionStorage.getItem(CHUNK_RELOAD_STORAGE_KEY) || '0');
        } catch {
          // Ignore sessionStorage restrictions
        }
        const now = Date.now();
        if (now - lastReload > CHUNK_RELOAD_COOLDOWN_MS) {
          try {
            sessionStorage.setItem(CHUNK_RELOAD_STORAGE_KEY, String(now));
          } catch {
            // Ignore
          }
          window.location.reload();
          // Never resolve while the browser reloads so React Suspense keeps showing loader
          return new Promise<{ default: T }>(() => {});
        }
      }
      throw error;
    }
  });
}

