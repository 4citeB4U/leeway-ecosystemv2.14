import { Tool } from "opencode";
import * as fs from "fs/promises";
import * as path from "path";

export interface InspectBuildLogParams {
  projectRoot?: string;
  logFile?: string;
}

export interface InspectBuildLogResult {
  valid: boolean;
  logPath: string;
  exitCode?: number;
  errors: string[];
  warnings: string[];
  durationMs?: number;
  typescriptErrors: number;
  eslintWarnings: number;
}

export const inspectBuildLog: Tool<InspectBuildLogParams, InspectBuildLogResult> = {
  name: "inspect-build-log",
  description: "Parse npm build log for TypeScript/ESLint errors and build status",
  parameters: {
    type: "object",
    properties: {
      projectRoot: { type: "string", description: "Project root directory" },
      logFile: { type: "string", description: "Specific log file path (optional)" },
    },
  },
  async execute({ projectRoot = process.cwd(), logFile }) {
    if (!logFile) {
      // Find latest evidence build log
      const evidenceDir = path.join(projectRoot, "evidence");
      try {
        const migrations = await fs.readdir(evidenceDir);
        const logFiles: string[] = [];
        for (const m of migrations) {
          const sessions = await fs.readdir(path.join(evidenceDir, m)).catch(() => []);
          for (const s of sessions) {
            const lp = path.join(evidenceDir, m, s, "npm-build.log");
            try {
              await fs.access(lp);
              logFiles.push(lp);
            } catch {}
          }
        }
        if (logFiles.length > 0) {
          logFiles.sort((a, b) => b.localeCompare(a));
          logFile = logFiles[0];
        }
      } catch {}
    }

    if (!logFile) {
      return {
        valid: false,
        logPath: "",
        errors: ["No build log found"],
        warnings: [],
        typescriptErrors: 0,
        eslintWarnings: 0,
      };
    }

    try {
      const content = await fs.readFile(logFile, "utf-8");
      
      const tsErrors = (content.match(/error TS\d+/g) || []).length;
      const tsWarnings = (content.match(/warning TS\d+/g) || []).length;
      const eslintWarnings = (content.match(/warning.*eslint/gi) || []).length;
      
      const exitMatch = content.match(/exit code (\d+)/i);
      const exitCode = exitMatch ? parseInt(exitMatch[1], 10) : undefined;
      
      const durationMatch = content.match(/(\d+\.?\d*)s$/m);
      const durationMs = durationMatch ? parseFloat(durationMatch[1]) * 1000 : undefined;

      return {
        valid: tsErrors === 0 && (!exitCode || exitCode === 0),
        logPath: logFile,
        exitCode,
        errors: tsErrors > 0 ? [`TypeScript errors: ${tsErrors}`] : [],
        warnings: tsWarnings > 0 ? [`TypeScript warnings: ${tsWarnings}`] : [],
        durationMs,
        typescriptErrors: tsErrors,
        eslintWarnings,
      };
    } catch (e) {
      return {
        valid: false,
        logPath: logFile || "",
        errors: [`Failed to read log: ${e}`],
        warnings: [],
        typescriptErrors: 0,
        eslintWarnings: 0,
      };
    }
  },
};