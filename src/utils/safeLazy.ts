import { lazy, ComponentType } from 'react';

/**
 * Wraps dynamic React.lazy imports with retry logic, cache clearing, and automatic reload on bundle/chunk updates.
 */
export function safeLazy<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>
) {
  return lazy(async () => {
    try {
      const module = await factory();
      // On success, reset reload count
      sessionStorage.removeItem('brq_chunk_reload_count');
      return module;
    } catch (error: any) {
      console.warn('Dynamic import failed, retrying...', error);

      const isChunkError =
        error?.name === 'ChunkLoadError' ||
        /failed to fetch dynamically imported module/i.test(error?.message || '') ||
        /loading chunk/i.test(error?.message || '') ||
        /importing module/i.test(error?.message || '');

      if (isChunkError) {
        // Try retrying twice after brief delays
        for (let i = 0; i < 2; i++) {
          try {
            await new Promise((resolve) => setTimeout(resolve, 500 * (i + 1)));
            const retriedModule = await factory();
            sessionStorage.removeItem('brq_chunk_reload_count');
            return retriedModule;
          } catch (e) {
            console.warn(`Retry attempt ${i + 1} failed for dynamic module import`);
          }
        }

        // Clear browser caches & service workers
        if ('caches' in window) {
          try {
            const keys = await caches.keys();
            await Promise.all(keys.map((k) => caches.delete(k)));
          } catch (e) {
            console.error('Failed clearing caches:', e);
          }
        }

        const key = 'brq_chunk_reload_count';
        const count = parseInt(sessionStorage.getItem(key) || '0', 10);
        if (count < 2) {
          sessionStorage.setItem(key, (count + 1).toString());
          const cleanUrl = window.location.origin + window.location.pathname + '?refresh=' + Date.now();
          window.location.href = cleanUrl;
          return new Promise<{ default: T }>(() => {});
        }
      }
      throw error;
    }
  });
}
