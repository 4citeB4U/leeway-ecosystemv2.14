import { Tool } from "opencode";

export interface CollectBrowserEvidenceParams {
  evidenceDir: string;
  baseUrl?: string;
  headed?: boolean;
}

export interface CollectBrowserEvidenceResult {
  success: boolean;
  evidenceDir: string;
  screenshots: number;
  consoleErrors: number;
  networkFailures: number;
  traceFile?: string;
  errors: string[];
}

export const collectBrowserEvidence: Tool<CollectBrowserEvidenceParams, CollectBrowserEvidenceResult> = {
  name: "collect-browser-evidence",
  description: "Launch Playwright and collect browser evidence for LeeWay IDE validation",
  parameters: {
    type: "object",
    properties: {
      evidenceDir: { type: "string", description: "Directory to save evidence" },
      baseUrl: { type: "string", description: "Base URL of the application (default: http://localhost:3000)" },
      headed: { type: "boolean", description: "Run headed (visible browser)" },
    },
    required: ["evidenceDir"],
  },
  async execute({ evidenceDir, baseUrl = "http://localhost:3000", headed = false }) {
    const fs = await import("fs/promises");
    const path = await import("path");

    try {
      await fs.mkdir(evidenceDir, { recursive: true });
      await fs.mkdir(path.join(evidenceDir, "screenshots"), { recursive: true });
    } catch (e) {
      return { success: false, evidenceDir, screenshots: 0, consoleErrors: 0, networkFailures: 0, errors: [`Cannot create evidence dir: ${e}`] };
    }

    try {
      const { chromium } = await import("playwright");
      const browser = await chromium.launch({ headless: !headed });
      const context = await browser.newContext({
        viewport: { width: 1920, height: 1080 },
        recordVideo: { dir: path.join(evidenceDir, "videos") },
      });

      const page = await context.newPage();
      
      const consoleErrors: string[] = [];
      const networkFailures: string[] = [];

      page.on("console", msg => {
        if (msg.type() === "error") {
          consoleErrors.push(`${msg.type()}: ${msg.text()}`);
        }
      });

      page.on("response", resp => {
        if (resp.status() >= 400 && resp.url().startsWith(baseUrl)) {
          networkFailures.push(`${resp.status()} ${resp.url()}`);
        }
      });

      // Initial load
      await page.goto(baseUrl, { waitUntil: "networkidle", timeout: 30000 });
      await page.screenshot({ path: path.join(evidenceDir, "screenshots", "01-initial-load.png"), fullPage: true });

      // Navigate modules
      const modules = ["/code", "/workflows", "/runtime", "/agent", "/settings"];
      for (let i = 0; i < modules.length; i++) {
        try {
          await page.goto(baseUrl + modules[i], { waitUntil: "networkidle", timeout: 15000 });
          await page.screenshot({ path: path.join(evidenceDir, "screenshots", `${String(i+2).padStart(2,'0')}-${modules[i].slice(1)}.png`), fullPage: true });
        } catch (e) {
          networkFailures.push(`Navigation failed: ${modules[i]} - ${e}`);
        }
      }

      // Agent Lee overlay
      try {
        await page.click('[data-testid="agent-lee-toggle"]', { timeout: 5000 });
        await page.screenshot({ path: path.join(evidenceDir, "screenshots", "agent-lee-overlay.png"), fullPage: true });
      } catch {}

      await browser.close();

      // Save console log
      await fs.writeFile(path.join(evidenceDir, "browser-console.log"), consoleErrors.join("\n") + "\n");
      await fs.writeFile(path.join(evidenceDir, "network-failures.json"), JSON.stringify(networkFailures, null, 2));

      return {
        success: consoleErrors.length === 0 && networkFailures.length === 0,
        evidenceDir,
        screenshots: modules.length + 2,
        consoleErrors: consoleErrors.length,
        networkFailures: networkFailures.length,
        errors: consoleErrors.length > 0 ? consoleErrors : networkFailures.length > 0 ? networkFailures : [],
      };
    } catch (e) {
      return { success: false, evidenceDir, screenshots: 0, consoleErrors: 0, networkFailures: 0, errors: [`Playwright error: ${e}`] };
    }
  },
};