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
