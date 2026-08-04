/**
 * LEEWAY_HEADER - DO NOT REMOVE
 *
 * REGION: RUNTIME
 * TAG: RUNTIME.ENTRY.MAIN
 * DESCRIPTION: Leeway IDE application entry point
 * AUTHORITY: LeeWay-Standards
 * DISCOVERY_PIPELINE: Voice -> Intent -> Location -> Vertical -> Ranking -> Render
 *
 * 5WH:
 * WHAT = Application Entry Point
 * WHY = Bootstrap React application
 * WHO = Leeway Innovations / Agent Lee Enablement
 * WHERE = src/main.tsx
 * WHEN = 2026-06-06
 * HOW = React root rendering
 *
 * CHAIN: Standards ? Integrated ? Runtime ? Projections
 * LICENSE: PROPRIETARY
 */

import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
