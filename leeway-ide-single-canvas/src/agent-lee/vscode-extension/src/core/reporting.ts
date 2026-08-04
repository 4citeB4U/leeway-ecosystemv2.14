/*
LEEWAY_HEADER - DO NOT REMOVE

REGION: 💾 DATA
TAG: DATA.LOCAL.REPORTING.MAIN

5WH:
WHAT = Writes Agent Lee front-end evidence reports.
WHY = Captures governed verification evidence for generated or inspected front-end work.
WHO = Agent Lee / LeeWay Runtime.
WHERE = agent-lee/vscode-extension/src/core/reporting.ts
WHEN = 2026
HOW = Infers project context and persists JSON evidence through governed file writes.
*/

import * as fs from "fs";
import * as path from "path";
import { writeJsonWithRetries } from "./file-ops";

const ROOT = path.join(process.env.USERPROFILE || "", ".leeway-vscode");
const REPORT_DIR = path.join(ROOT, "agent-lee", "reports", "frontend-runtime");

export type FrontendEvidenceInput = {
  prompt: string;
  taskType: string;
  workspaceRoot: string;
  targetLabel?: string;
  framework: string;
  filesScanned: number;
  filesConsidered: string[];
  modelsUsed: { role: string; model: string; available: boolean; degraded: boolean }[];
  previewInstructions: string;
  verificationSummary: string;
  responseText: string;
  browserEvidence?: {
    source: string;
    targetUrl: string;
    screenshotPath: string;
    reportPath: string;
    summary: string;
    consoleErrors: string[];
    pageErrors: string[];
    visualDiff?: {
      comparedTo: string;
      diffImagePath: string;
      changedPixels: number;
      diffRatio: number;
      baselineCreated: boolean;
    };
    accessibility?: {
      violations: {
        id: string;
        impact: string;
        description: string;
        help: string;
        nodeCount: number;
      }[];
      incomplete: number;
      passes: number;
    };
    performance?: {
      loadTime: number;
      domContentLoaded: number;
      firstPaint: number;
      firstContentfulPaint: number;
      largestContentfulPaint: number;
      cumulativeLayoutShift: number;
      totalRequests: number;
      totalTransferred: number;
    };
    network?: {
      requests: {
        url: string;
        method: string;
        status: number;
        size: number;
        type: string;
        duration: number;
      }[];
      failedRequests: number;
    };
    bugs?: {
      brokenLinks: string[];
      missingImages: string[];
      consoleWarnings: string[];
      jsErrors: string[];
    };
  };
};

function ensureDir() {
  fs.mkdirSync(REPORT_DIR, { recursive: true });
}

export function inferProjectFramework(workspaceRoot: string) {
  try {
    const packageFile = path.join(workspaceRoot, "package.json");
    if (!fs.existsSync(packageFile)) return "Static HTML/CSS/JS";

    const pkg = JSON.parse(fs.readFileSync(packageFile, "utf8"));
    const deps = {
      ...(pkg.dependencies || {}),
      ...(pkg.devDependencies || {})
    };

    const frameworks: string[] = [];
    if (deps.react) frameworks.push("React");
    if (deps.vite) frameworks.push("Vite");
    if (deps.tailwindcss) frameworks.push("Tailwind");
    if (deps.typescript) frameworks.push("TypeScript");
    if (deps.next) frameworks.push("Next.js");
    if (!frameworks.length) frameworks.push("Web project");
    return frameworks.join(" + ");
  } catch {
    return "Web project";
  }
}

export function inferPreviewInstructions(workspaceRoot: string) {
  try {
    const packageFile = path.join(workspaceRoot, "package.json");
    if (!fs.existsSync(packageFile)) {
      return "Open the created HTML file in a browser, or serve the workspace with a local static server.";
    }

    const pkg = JSON.parse(fs.readFileSync(packageFile, "utf8"));
    const scripts = pkg.scripts || {};
    if (scripts.dev) return `From ${workspaceRoot}, run: npm install, then npm run dev.`;
    if (scripts.start) return `From ${workspaceRoot}, run: npm install, then npm start.`;
    if (scripts.preview) return `From ${workspaceRoot}, run: npm install, then npm run preview.`;
    return `From ${workspaceRoot}, run: npm install, then use the available project scripts in package.json.`;
  } catch {
    return "Review the workspace package.json scripts to preview the front-end locally.";
  }
}

export function writeFrontendEvidenceReport(input: FrontendEvidenceInput) {
  ensureDir();
  const file = path.join(REPORT_DIR, `agent-lee-frontend-report-${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
  writeJsonWithRetries(file, {
    createdAt: new Date().toISOString(),
    ...input
  }, "Agent Lee front-end evidence report.");
  return file;
}

/*
DISCOVERY_PIPELINE:
Voice → Intent → Location → Vertical → Ranking → Render
*/
