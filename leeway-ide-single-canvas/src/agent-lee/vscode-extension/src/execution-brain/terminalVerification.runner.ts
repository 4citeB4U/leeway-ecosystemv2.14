/*
LEEWAY HEADER - DO NOT REMOVE

REGION: CORE
TAG: CORE.EXECUTION_BRAIN.TERMINAL_VERIFICATION.RUNNER
DISCOVERY_PIPELINE: Voice -> Intent -> Location -> Vertical -> Ranking -> Render
*/

import { exec } from "child_process";
import type { VerificationCommand, VerificationResult } from "./executionBrain.types";

export function defaultVerificationCommands(workspaceRoot: string): VerificationCommand[] {
  void workspaceRoot;
  return [
    { id: "compile", label: "Compile project", command: "npm run compile", required: true },
    { id: "lint", label: "Lint project", command: "npm run lint", required: false },
    { id: "test", label: "Run tests", command: "npm test", required: false }
  ];
}

export function runVerificationCommand(command: VerificationCommand, cwd: string): Promise<VerificationResult> {
  return new Promise((resolve) => {
    exec(command.command, { cwd, timeout: 120000 }, (error, stdout, stderr) => {
      const output = `${stdout || ""}\n${stderr || ""}`.trim();
      resolve({
        command: command.command,
        ok: !error,
        exitCode: typeof error?.code === "number" ? error.code : error ? 1 : 0,
        summary: error ? `${command.label} failed.` : `${command.label} passed.`,
        output
      });
    });
  });
}
