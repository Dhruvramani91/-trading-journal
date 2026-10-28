import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import { installNumberInputWheelGuard } from './lib/numberInputWheel';
import { CHUNK_RELOAD_COOLDOWN_MS, CHUNK_RELOAD_STORAGE_KEY } from './lib/lazyWithRetry';
import './index.css';

/**
 * Handle stale chunk failures across deployments.
 * When a new deployment is published, existing browser sessions attempting
 * to load dynamically split modules will fail to fetch the previous chunk hash.
 * Vite fires a `vite:preloadError` event — reload the window once to fetch the latest
 * index.html and modern chunk hashes.
 */
window.addEventListener('vite:preloadError', (event) => {
  event.preventDefault();
  let lastReload = 0;
  try {
    lastReload = Number(sessionStorage.getItem(CHUNK_RELOAD_STORAGE_KEY) || '0');
  } catch {
    // Ignore
  }
  const now = Date.now();
  if (now - lastReload > CHUNK_RELOAD_COOLDOWN_MS) {
    try {
      sessionStorage.setItem(CHUNK_RELOAD_STORAGE_KEY, String(now));
    } catch {
      // Ignore
    }
    window.location.reload();
  }
});

/*
 * Global guard: the mouse wheel must never change a number input's value
 * (e.g. Account Size, Account P&L/R). Installed once here so it applies to
 * every numeric input in the app; normal page scrolling is unaffected.
 */
installNumberInputWheelGuard();

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('Root element #root not found');

createRoot(rootEl).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
