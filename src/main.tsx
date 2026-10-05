import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import { SmoothScroll } from './components/layout/SmoothScroll';
import { installNumberInputWheelGuard } from './lib/numberInputWheel';
import './index.css';
import 'lenis/dist/lenis.css';

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
    <SmoothScroll>
      <App />
    </SmoothScroll>
  </StrictMode>,
);
