/*
FILE: core\diagnostics_bridge.ts
PURPOSE: Shared diagnostics bridge for LeeWay employment-center surfaces.
TAG: CORE.RUNTIME.DIAGNOSTICS_BRIDGE.MAIN
REGION: 🟢 CORE
GOVERNED_BY: LeeWay Standards
OWNED_BY: Agent Lee / LeeWay Runtime
DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render
IMPORTS: ./eventBus
EXPORTS: DiagnosticsReport, readDiagnosticsReports, pushDiagnosticsReport
STATUS: ACTIVE
*/

import { eventBus } from './eventBus';

export interface DiagnosticsReport {
  id: string;
  surface: string;
  status: 'ok' | 'warn' | 'error';
  message: string;
  agents: string[];
  mcps: string[];
  tags: string[];
  timestamp: string;
}

const REPORTS_KEY = 'agent_lee_diagnostics_reports';
const MAX_REPORTS = 400;

export function readDiagnosticsReports(): DiagnosticsReport[] {
  try {
    const raw = localStorage.getItem(REPORTS_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error(error);
    return [];
  }
}

export function pushDiagnosticsReport(
  report: Omit<DiagnosticsReport, 'id' | 'timestamp'>
) {
  try {
    const next: DiagnosticsReport = {
      ...report,
      id: `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
      timestamp: new Date().toISOString()
    };

    const reports = readDiagnosticsReports();
    const updated = [next, ...reports].slice(0, MAX_REPORTS);
    localStorage.setItem(REPORTS_KEY, JSON.stringify(updated));
    eventBus.emit('diagnostics:report', next);

    return next;
  } catch (error) {
    console.error(error);
    return null;
  }
}
