/**
 * check-powershell-boundary.mjs
 *
 * PowerShell boundary classification for the Agent Lee workspace.
 * Scans all .ps1 files and classifies them as:
 *   KEEP_WINDOWS_NATIVE     — must stay PowerShell (Windows device/registry/COM/WMI actions)
 *   MIGRATE_TO_NODE         — can and should be replaced with Node
 *   UNKNOWN_REQUIRES_REVIEW — purpose is unclear; human review needed
 *
 * Architecture rule:
 *   PowerShell is ONLY permitted for Windows-native desktop actions.
 *   Everything else must be Node/TypeScript.
 *
 * Usage:
 *   node scripts/check-powershell-boundary.mjs
 *
 * Classification: CANONICAL_NODE_VALIDATOR — this IS the boundary checker.
 */

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const WORKSPACE_ROOT = path.resolve(__dirname, "..");

const REPORT_PATH = path.join(WORKSPACE_ROOT, "Archive", "reports", "powershell-boundary-report.json");
const RECEIPT_PATH = path.join(WORKSPACE_ROOT, "Archive", "receipts", "powershell-boundary-receipt.json");

// Patterns that indicate a script MUST stay as Windows-native PowerShell
const KEEP_PATTERNS = [
  /Get-Process|Stop-Process|Start-Process|Get-Service|Set-Service|Restart-Service|New-Service/i,
  /New-Object\s+System\.Windows/i,
  /\[System\.Windows\.|COM\s*object|Shell\.Application|WScript\.|WMI|Get-WmiObject|Get-CimInstance/i,
  /registry|HKLM|HKCU|Set-ItemProperty.*HKEY|New-Item.*HKEY/i,
  /Set-AudioDefaultEndpoint|Get-AudioDevice|Out-Speak|Add-Type.*System\.Speech/i,
  /Send-Keys|[Keyboard]|Invoke-Keys|keybd_event/i,
  /Mouse.*click|System\.Windows\.Forms\.Cursor|SetCursorPos/i,
  /Register-ScheduledTask|Get-ScheduledTask|New-ScheduledTask/i,
  /netsh|Get-NetAdapter|Set-NetFirewall|New-NetFirewallRule/i,
  /Install-Package|Install-Module|winget\s+install/i,
  /msiexec|Start-BitsTransfer.*\.msi/i,
  /powershell\.exe.*WindowsPowerShell5\.1Required/i
];

// Patterns that strongly suggest a script can be replaced with Node
const MIGRATE_PATTERNS = [
  /Invoke-WebRequest|Invoke-RestMethod/i,
  /ConvertTo-Json|ConvertFrom-Json/i,
  /Test-Path|New-Item.*Directory|Get-Content|Set-Content|Out-File/i,
  /Write-Output|Write-Host|Write-Verbose/i,
  /\$LASTEXITCODE|node\s+|npm\s+/i,
  /Start-Sleep/i,
  /Select-String|Get-ChildItem.*-Filter/i
];

function nowIso() {
  return new Date().toISOString();
}

function makeId() {
  return `ps-boundary-${Date.now().toString(36)}-${crypto.randomBytes(3).toString("hex")}`;
}

function ensureDir(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

function classifyScript(filePath, content) {
  const isWindowsNative = KEEP_PATTERNS.some(p => p.test(content));
  const hasMigrateSignals = MIGRATE_PATTERNS.some(p => p.test(content));

  // Hardcoded paths are always a migration concern
  const hasHardcodedPaths = /E:\\\.LeeWay-Produucts-File|C:\\Users\\Leona/i.test(content);

  // Scripts in scripts/restart-* or scripts/start-* that just launch node are migration candidates
  const basename = path.basename(filePath);
  const isNodeLauncher = /restart-|start-|launch-/i.test(basename) && /node\s+|node\.exe/i.test(content);
  const isWindowsPs51Required = /WindowsPowerShell5\.1Required/i.test(content);

  if (isWindowsPs51Required) {
    return { classification: "KEEP_WINDOWS_NATIVE", reason: "Explicitly marked WindowsPowerShell5.1Required" };
  }
  if (isWindowsNative) {
    return { classification: "KEEP_WINDOWS_NATIVE", reason: "Uses Windows-native APIs (WMI/COM/registry/audio/input devices)" };
  }
  if (isNodeLauncher && !isWindowsNative) {
    return { classification: "MIGRATE_TO_NODE", reason: "Script just launches Node — replace with direct Node invocation or npm script" };
  }
  if (hasMigrateSignals && !isWindowsNative) {
    const warning = hasHardcodedPaths ? " (HARDCODED_PATHS)" : "";
    return { classification: "MIGRATE_TO_NODE", reason: `Uses only portable PowerShell patterns${warning}` };
  }
  return { classification: "UNKNOWN_REQUIRES_REVIEW", reason: "Mixed or unclear — human review needed" };
}

// Scan only the key source directories — not the whole workspace (too slow)
const SCAN_DIRS = [
  "scripts",
  "agent-lee-coding-mode",
  "LeeWay-Standards"
];

function walkPs1(dir, results = [], depth = 0) {
  if (depth > 4 || results.length >= 500) return results;
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return results; }
  for (const entry of entries) {
    if (results.length >= 500) break;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory() && !["node_modules", ".git", "Archive", "tmp", "piper_bin", "piper_models", "vosk_models"].includes(entry.name)) {
      walkPs1(full, results, depth + 1);
    } else if (entry.isFile() && entry.name.endsWith(".ps1")) {
      results.push(full);
    }
  }
  return results;
}

async function main() {
  const testId = makeId();
  const startedAt = nowIso();
  console.log(`[${startedAt}] Starting PowerShell boundary check`);
  console.log(`  Workspace: ${WORKSPACE_ROOT}`);

  // Walk only key source dirs, not entire workspace
  const ps1Files = [];
  for (const d of SCAN_DIRS) {
    walkPs1(path.join(WORKSPACE_ROOT, d), ps1Files);
    if (ps1Files.length >= 500) break;
  }
  console.log(`  Found ${ps1Files.length} .ps1 files`);

  const classified = { KEEP_WINDOWS_NATIVE: [], MIGRATE_TO_NODE: [], UNKNOWN_REQUIRES_REVIEW: [] };
  const allResults = [];

  for (const filePath of ps1Files) {
    let content = "";
    try { content = fs.readFileSync(filePath, "utf8"); } catch { content = ""; }
    const rel = path.relative(WORKSPACE_ROOT, filePath).replace(/\\/g, "/");
    const { classification, reason } = classifyScript(filePath, content);
    classified[classification].push(rel);
    allResults.push({ file: rel, classification, reason });
  }

  const report = {
    testId,
    startedAt,
    endedAt: nowIso(),
    workspaceRoot: WORKSPACE_ROOT,
    totalPs1Files: ps1Files.length,
    keepWindowsNative: classified.KEEP_WINDOWS_NATIVE.length,
    migrateToNode: classified.MIGRATE_TO_NODE.length,
    unknownRequiresReview: classified.UNKNOWN_REQUIRES_REVIEW.length,
    keepWindowsNativeFiles: classified.KEEP_WINDOWS_NATIVE,
    migrateToNodeFiles: classified.MIGRATE_TO_NODE,
    unknownRequiresReviewFiles: classified.UNKNOWN_REQUIRES_REVIEW,
    allResults,
    architectureRule: "PowerShell is ONLY permitted for Windows-native desktop actions. Everything else must be Node/TypeScript.",
    portabilityStatus: classified.MIGRATE_TO_NODE.length === 0 && classified.UNKNOWN_REQUIRES_REVIEW.length === 0
      ? "PORTABLE_BOUNDARY_CLEAN"
      : classified.MIGRATE_TO_NODE.length > 0
        ? "MIGRATION_TARGETS_EXIST"
        : "UNKNOWN_FILES_REQUIRE_REVIEW"
  };

  ensureDir(path.dirname(REPORT_PATH));
  ensureDir(path.dirname(RECEIPT_PATH));
  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2), "utf8");
  const receipt = {
    schema: "powershell-boundary-receipt",
    receiptId: testId,
    startedAt,
    endedAt: report.endedAt,
    portabilityStatus: report.portabilityStatus,
    keepWindowsNative: classified.KEEP_WINDOWS_NATIVE.length,
    migrateToNode: classified.MIGRATE_TO_NODE.length,
    unknownRequiresReview: classified.UNKNOWN_REQUIRES_REVIEW.length,
    reportPath: REPORT_PATH,
    ok: true,
    source: "check-powershell-boundary.mjs"
  };
  fs.writeFileSync(RECEIPT_PATH, JSON.stringify(receipt, null, 2), "utf8");

  console.log(`\n  Results:`);
  console.log(`    KEEP_WINDOWS_NATIVE:    ${classified.KEEP_WINDOWS_NATIVE.length}`);
  console.log(`    MIGRATE_TO_NODE:        ${classified.MIGRATE_TO_NODE.length}`);
  console.log(`    UNKNOWN_REQUIRES_REVIEW: ${classified.UNKNOWN_REQUIRES_REVIEW.length}`);
  console.log(`    Portability status:     ${report.portabilityStatus}`);
  if (classified.MIGRATE_TO_NODE.length > 0) {
    console.log(`\n  Migration targets (top 10):`);
    for (const f of classified.MIGRATE_TO_NODE.slice(0, 10)) console.log(`    - ${f}`);
    if (classified.MIGRATE_TO_NODE.length > 10) console.log(`    ... and ${classified.MIGRATE_TO_NODE.length - 10} more (see report)`);
  }
  console.log(`\n  Report:  ${REPORT_PATH}`);
  console.log(`  Receipt: ${RECEIPT_PATH}`);
  console.log("\nAgent Lee desktop control is only proven when the router dispatches tool calls to the Desktop Runtime Host and runtime receipts prove execution.");
}

main().catch((err) => {
  console.error("Boundary check fatal error:", err?.message || String(err));
  process.exit(1);
});
