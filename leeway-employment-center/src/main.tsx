/*
FILE: src\main.tsx
PURPOSE: LeeWay governed asset for leeway-employment-center.
TAG: UTIL.FILE.M_AI_N.MAIN
REGION: 🟠 UTIL
GOVERNED_BY: LeeWay Standards
OWNED_BY: Agent Lee / LeeWay Runtime
DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render
IMPORTS: Inferred by verification scanner
EXPORTS: Inferred by verification scanner
STATUS: ACTIVE
*/
import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

window.addEventListener('error', (event) => {
  console.error('Global Error caught:', event.error);
  if (event.error && event.error.message && event.error.message.includes('dimensions')) {
    console.warn('DIMENSIONS ERROR DETECTED. Stack trace:', event.error.stack);
  }
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

