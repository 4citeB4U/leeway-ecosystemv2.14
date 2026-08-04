/*
LEEWAY_HEADER - DO NOT REMOVE

REGION: 🟢 CORE
TAG: CORE.RUNTIME.FILE_OPS.MAIN

5WH:
WHAT = Shared file-system helpers for governed Agent Lee writes.
WHY = Centralizes retry logic, LeeWay metadata enforcement, and post-write auditing.
WHO = Agent Lee / LeeWay Runtime.
WHERE = agent-lee/vscode-extension/src/core/file-ops.ts
WHEN = 2026
HOW = Retry-safe wrappers around synchronous file writes with LeeWay policy integration.
*/

import * as fs from "fs";
import * as path from "path";
import { auditDirectoryBeforeWrite, auditLeewayContent, ensureLeewayCompliantContent, isGovernedFile } from "./leeway-write-policy";

const LOCK_ERROR_CODES = new Set(["EACCES", "EBUSY", "EPERM"]);

function isLockError(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const code = "code" in error ? String((error as { code?: unknown }).code || "") : "";
  return LOCK_ERROR_CODES.has(code);
}

function sleepSync(ms: number) {
  const start = Date.now();
  while (Date.now() - start < ms) {
    // Short synchronous wait so transient Windows file locks can clear.
  }
}

function withRetriesSync(work: () => void, retries = 4, delayMs = 40) {
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      work();
      return;
    } catch (error) {
      lastError = error;
      if (attempt === retries || !isLockError(error)) throw error;
      sleepSync(delayMs * (attempt + 1));
    }
  }

  throw lastError;
}

export function writeJsonWithRetries(filePath: string, value: unknown, purpose?: string) {
  const content = JSON.stringify(value, null, 2);
  return writeTextWithRetries(filePath, content, purpose);
}

export function writeTextWithRetries(filePath: string, content: string, purpose?: string) {
  const nextContent = ensureGovernedContent(filePath, content, purpose);
  const directoryAudit = auditDirectoryBeforeWrite(path.dirname(filePath));
  const audit = auditLeewayContent(filePath, nextContent);

  withRetriesSync(() => {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, nextContent, "utf8");
  });

  return { audit, directoryAudit };
}

export function appendFileWithRetries(filePath: string, content: string) {
  withRetriesSync(() => {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.appendFileSync(filePath, content, "utf8");
  });
}

export function ensureGovernedContent(filePath: string, content: string, purpose?: string) {
  if (!isGovernedFile(filePath)) return content;
  return ensureLeewayCompliantContent(filePath, content, purpose);
}

export function describeFileError(error: unknown) {
  if (!error || typeof error !== "object") return "Unknown file-system failure.";
  const anyError = error as { code?: unknown; message?: unknown };
  const code = anyError.code ? String(anyError.code) : "UNKNOWN";
  const message = anyError.message ? String(anyError.message) : "Unknown file-system failure.";
  return `${code}: ${message}`;
}

/*
DISCOVERY_PIPELINE:
Voice → Intent → Location → Vertical → Ranking → Render
*/
