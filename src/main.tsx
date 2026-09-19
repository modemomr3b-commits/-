import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { ErrorBoundary } from './ErrorBoundary.tsx';

// Suppress harmless Supabase Realtime fallback warnings
const originalWarn = console.warn;
console.warn = (...args: any[]) => {
  if (typeof args[0] === 'string' && args[0].includes('Realtime send()')) {
    return;
  }
  originalWarn(...args);
};

// Handle Vite chunk preload errors (e.g. after new Vercel deployments)
const handleChunkError = () => {
  const key = 'brq_preload_count';
  const count = parseInt(sessionStorage.getItem(key) || '0', 10);
  if (count < 2) {
    sessionStorage.setItem(key, (count + 1).toString());
    if ('caches' in window) {
      caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k)))).catch(() => {});
    }
    window.location.href = window.location.origin + window.location.pathname + '?refresh=' + Date.now();
  }
};

window.addEventListener('vite:preload-error', (event) => {
  event.preventDefault();
  handleChunkError();
});

window.addEventListener('unhandledrejection', (event) => {
  const msg = event.reason?.message || '';
  if (
    msg.includes('Failed to fetch dynamically imported module') ||
    msg.includes('ChunkLoadError') ||
    msg.includes('loading chunk') ||
    msg.includes('importing module')
  ) {
    handleChunkError();
  }
});

// Unregister PWA Service Worker to ensure fresh code
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (let registration of registrations) {
      registration.unregister();
    }
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
