import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fs from "fs";
import { execFile } from "child_process";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: "40mb" }));

const PORT = Number(process.env.AGENT_LEE_PORT || 8080);
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
const GOVERNANCE_CORPUS_PATH = process.env.LEEWAY_GOVERNANCE_CORPUS;

const MODELS = {
  orchestrator: process.env.AGENT_LEE_ORCHESTRATOR_MODEL || "qwen3:latest",
  turbo: process.env.AGENT_LEE_TURBO_MODEL || "qwen3:latest",
  fastCoder: process.env.AGENT_LEE_FAST_CODER_MODEL || "qwen3:latest",
  reviewer: process.env.AGENT_LEE_REVIEWER_MODEL || "qwen3:latest",
  deepCoder: process.env.AGENT_LEE_DEEP_CODER_MODEL || "qwen2.5-coder:14b",
  fullCoder: process.env.AGENT_LEE_FULL_CODER_MODEL || "qwen2.5-coder:14b",
  maxCoder: process.env.AGENT_LEE_MAX_CODER_MODEL || "qwen3-coder:latest"
};

const MAX_GOVERNANCE_CHARS = Number(process.env.MAX_GOVERNANCE_CHARS || 3500);
const DESKTOP_SANDBOX_ROOT = process.env.AGENT_LEE_DESKTOP_SANDBOX || "C:\\Users\\Leona\\.leeway-vscode\\agent-lee-coding-mode\\sandbox";
const DESKTOP_AUDIT_LOG = process.env.AGENT_LEE_DESKTOP_AUDIT_LOG || "C:\\Users\\Leona\\.leeway-vscode\\agent-lee-coding-mode\\logs\\desktop-command-audit.jsonl";
const DESKTOP_COMMAND_CONFIRM = "I_AUTHORIZE_AGENT_LEE_DESKTOP_COMMAND";

function auditDesktopCommand(entry) {
  const line = JSON.stringify({
    at: new Date().toISOString(),
    ...entry
  }) + "\n";

  fs.mkdirSync(DESKTOP_SANDBOX_ROOT, { recursive: true });
  fs.mkdirSync(DESKTOP_AUDIT_LOG.split("\\").slice(0, -1).join("\\"), { recursive: true });
  fs.appendFileSync(DESKTOP_AUDIT_LOG, line, "utf8");
}

function runPowerShell(command, cwd, timeoutMs = 30000) {
  return new Promise((resolve) => {
    const safeCwd = cwd && fs.existsSync(cwd) ? cwd : DESKTOP_SANDBOX_ROOT;

    execFile(
      "powershell.exe",
      [
        "-NoProfile",
        "-ExecutionPolicy",
        "Bypass",
        "-Command",
        command
      ],
      {
        cwd: safeCwd,
        timeout: timeoutMs,
        windowsHide: true,
        maxBuffer: 1024 * 1024 * 8
      },
      (error, stdout, stderr) => {
        resolve({
          ok: !error,
          code: error && typeof error.code !== "undefined" ? error.code : 0,
          signal: error && error.signal ? error.signal : null,
          stdout: stdout || "",
          stderr: stderr || "",
          cwd: safeCwd
        });
      }
    );
  });
}


function readGovernanceCorpus() {
  if (!GOVERNANCE_CORPUS_PATH || !fs.existsSync(GOVERNANCE_CORPUS_PATH)) {
    return "REAL LEEWAY GOVERNANCE CORPUS NOT FOUND. Agent Lee must report this gap.";
  }

  const text = fs.readFileSync(GOVERNANCE_CORPUS_PATH, "utf8");
  return text.length > MAX_GOVERNANCE_CHARS
    ? text.slice(0, MAX_GOVERNANCE_CHARS) + "\n\n[TRUNCATED FOR SPEED-GOVERNED MODE]"
    : text;
}

function extractUserText(messages = []) {
  return messages
    .filter((m) => m.role === "user")
    .map((m) => {
      if (typeof m.content === "string") return m.content;
      if (Array.isArray(m.content)) return m.content.map((x) => x.text || "").join("\n");
      return "";
    })
    .join("\n")
    .trim();
}

function normalize(text) {
  return text.toLowerCase().trim();
}

function hasAny(text, keys) {
  const t = normalize(text);
  return keys.some((k) => t.includes(k));
}

function isGreeting(text) {
  const t = normalize(text);
  return [
    "hi",
    "hello",
    "hey",
    "yo",
    "sup",
    "what's up",
    "whats up",
    "agent lee",
    "hello agent lee",
    "hey agent lee",
    "yo agent lee"
  ].includes(t);
}

function isCasual(text) {
  return (
    isGreeting(text) ||
    hasAny(text, [
      "how are you",
      "you there",
      "ready",
      "you ready",
      "let's work",
      "lets work",
      "lock in",
      "locked in"
    ])
  );
}

function isStatusCheck(text) {
  return hasAny(text, [
    "confirm coding mode is online",
    "confirm you are using",
    "coding mode is online",
    "are you online",
    "health check",
    "status check",
    "what model/provider",
    "what provider",
    "are you the local",
    "local leeway-governed",
    "github copilot",
    "are you copilot",
    "or github copilot",
    "who are you",
    "identify yourself"
  ]);
}

function isLightExplain(text) {
  return hasAny(text, [
    "explain what agent lee coding mode is",
    "what is agent lee coding mode",
    "what can you do",
    "how does this work"
  ]);
}

function isSmallCodeTask(text) {
  const t = normalize(text);

  const hasSmallCodeIntent = hasAny(t, [
    "create a typescript function",
    "write a typescript function",
    "create a javascript function",
    "write a javascript function",
    "create a function",
    "write a function",
    "write a small",
    "small typescript",
    "small helper",
    "simple helper",
    "utility function",
    "helper that",
    "safely parses json",
    "safe json parse",
    "parse json",
    "validate",
    "validator",
    "return a typed result object",
    "return a clean result object"
  ]);

  const hasBigBuildIntent = hasAny(t, [
    "full stack",
    "full-stack",
    "backend",
    "frontend",
    "admin page",
    "database",
    "api route",
    "deployment",
    "complete feature",
    "whole app",
    "entire project"
  ]);

  return hasSmallCodeIntent && !hasBigBuildIntent && text.length < 1500;
}

function isDeepRequest(text) {
  return hasAny(text, [
    "deep",
    "thorough",
    "enterprise",
    "production build",
    "full leeway 80",
    "maximum",
    "use qwen3-coder",
    "full heavy",
    "full-heavy",
    "comprehensive"
  ]);
}



function parseVoiceChatRequest(userText) {
  const text = String(userText || "").trim();
  const lower = text.toLowerCase();

  const triggers = [
    "say this out loud",
    "read this out loud",
    "read this aloud",
    "say out loud",
    "speak this",
    "say:"
  ];

  const directAgentLeeSay = lower.startsWith("agent lee, say ") || lower.startsWith("agent lee say ");
  const matchedTrigger = triggers.find((trigger) => lower.includes(trigger));

  if (!directAgentLeeSay && !matchedTrigger) {
    return null;
  }

  let speakText = text;

  if (directAgentLeeSay) {
    speakText = speakText.replace(/^agent lee,\s*say\s+/i, "");
    speakText = speakText.replace(/^agent lee\s+say\s+/i, "");
  }
  else if (matchedTrigger) {
    const index = lower.indexOf(matchedTrigger);
    speakText = text.slice(index + matchedTrigger.length).trim();
    speakText = speakText.replace(/^[:\-]\s*/, "");
  }

  speakText = speakText
    .replaceAll(DESKTOP_COMMAND_CONFIRM, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!speakText) {
    speakText = "Yo, Agent Lee natural voice is online.";
  }

  let voice = "andrew";
  if (lower.includes(" ava ") || lower.includes(" voice ava") || lower.includes("use ava")) {
    voice = "ava";
  }

  const confirmed = text.includes(DESKTOP_COMMAND_CONFIRM);

  return {
    route: confirmed ? "voice-chat-natural-exec" : "voice-chat-natural",
    speakText,
    voice,
    confirmed
  };
}

async function maybeHandleVoiceChatTool(userText) {
  const request = parseVoiceChatRequest(userText);

  if (!request) {
    return null;
  }

  if (!request.confirmed) {
    return {
      route: request.route,
      content: `Yo - Agent Lee on deck. Natural voice route locked.

I can speak that using ${request.voice === "ava" ? "Ava, the alternate natural voice" : "Andrew, the primary natural voice"}.

To speak directly from chat, repeat it with:

${DESKTOP_COMMAND_CONFIRM}

Queued text:
${request.speakText}`
    };
  }

  const voice = request.voice === "ava" ? "en-US-AvaNeural" : "en-US-AndrewNeural";
  const safeText = request.speakText.replace(/'/g, "''").slice(0, 2500);
  const safeVoice = voice.replace(/'/g, "''").slice(0, 120);

  const command = `
$ErrorActionPreference = "Stop"

$voiceRoot = Join-Path (Get-Location) "natural-voice"
New-Item -ItemType Directory -Force -Path $voiceRoot | Out-Null

$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$voice = '${safeVoice}'
$text = '${safeText}'
$outFile = Join-Path $voiceRoot ("agent-lee-chat-natural-" + $voice + "-" + $stamp + ".mp3")
$playScriptPath = Join-Path $voiceRoot ("agent-lee-chat-play-" + $stamp + ".ps1")

$py = Get-Command py -ErrorAction SilentlyContinue
$python = Get-Command python -ErrorAction SilentlyContinue

if ($py) {
  & py -m leeway_tts --voice $voice --text $text --write-media $outFile
}
elseif ($python) {
  & python -m leeway_tts --voice $voice --text $text --write-media $outFile
}
else {
  throw "Python launcher not found. Install Python or make py/python available on PATH."
}

if (-not (Test-Path -LiteralPath $outFile)) {
  throw "Natural voice file was not created: $outFile"
}

$estimatedSeconds = [Math]::Min(120, [Math]::Max(8, [Math]::Ceiling($text.Length / 8) + 4))

$playLines = @(
  'Add-Type -AssemblyName PresentationCore',
  '$player = New-Object System.Windows.Media.MediaPlayer',
  '$player.Volume = 1.0',
  '$player.Open([Uri]''' + $outFile + ''')',
  'Start-Sleep -Milliseconds 1200',
  'try {',
  '  if ($player.NaturalDuration.HasTimeSpan) {',
  '    $duration = [Math]::Ceiling($player.NaturalDuration.TimeSpan.TotalSeconds) + 3',
  '  }',
  '  else {',
  '    $duration = ' + $estimatedSeconds,
  '  }',
  '}',
  'catch {',
  '  $duration = ' + $estimatedSeconds,
  '}',
  'if ($duration -lt ' + $estimatedSeconds + ') {',
  '  $duration = ' + $estimatedSeconds,
  '}',
  '$player.Play()',
  'Start-Sleep -Seconds $duration',
  '$player.Stop()',
  '$player.Close()'
)

$playLines | Out-File -Encoding UTF8 $playScriptPath

powershell.exe -NoProfile -STA -ExecutionPolicy Bypass -WindowStyle Hidden -File $playScriptPath

[ordered]@{
  ok = $true
  tool = "voice.chat.natural.exec"
  voice = $voice
  chars = $text.Length
  file = $outFile
  playScript = $playScriptPath
  playback = "hidden-wpf-mediaplayer-sta"
  visiblePlayerOpened = $false
  estimatedSeconds = $estimatedSeconds
} | ConvertTo-Json -Depth 8
`;

  const result = await runDesktopTool("voice.chat.natural.exec", command, 120000);

  return {
    route: request.route,
    content: `Yo - Agent Lee on deck. Natural voice executed.

Voice: ${voice}
Text: ${request.speakText}
Playback: hidden-wpf-mediaplayer-sta
Result:
${result.stdout || result.stderr || "No output returned."}`
  };
}

function classifyTask(text) {
  if (isStatusCheck(text)) return "status";
  if (isCasual(text)) return "casual";
  if (isLightExplain(text)) return "light";
  if (isSmallCodeTask(text)) return "turbo-code";

  if (hasAny(text, [
    "sleeper bug",
    "corrupted by time",
    "time handling",
    "outside environment variables",
    "environment variables",
    "without human support",
    "restart the change process",
    "stopped and asked to change",
    "midway through building"
  ])) return "recovery-governed";

  if (hasAny(text, [
    "review",
    "audit",
    "leeway standard",
    "production ready",
    "score this",
    "leeway 80",
    "benchmark",
    "validate this"
  ])) return isDeepRequest(text) ? "review-deep" : "review";

  if (hasAny(text, [
    "full leeway 80",
    "full enterprise",
    "full production",
    "complete feature",
    "build the whole",
    "front end and back end",
    "frontend and backend",
    "admin page",
    "deployment plan",
    "full stack",
    "full-stack"
  ])) return isDeepRequest(text) ? "full-heavy-deep" : "full-heavy";

  if (hasAny(text, [
    "three.js",
    "threejs",
    "react three fiber",
    "r3f",
    "webxr",
    "augmented",
    "gltf",
    "glb",
    "blender",
    "mesh",
    "quaternion",
    "euler",
    "raycast",
    "3d",
    "spatial",
    "scene",
    "camera",
    "material",
    "geometry"
  ])) return isDeepRequest(text) ? "coding-deep" : "coding";

  if (hasAny(text, [
    "build",
    "create",
    "implement",
    "write code",
    "fix this",
    "refactor",
    "clean this",
    "debug",
    "api",
    "backend",
    "server",
    "database",
    "db",
    "auth",
    "login",
    "token",
    "queue",
    "job",
    "webhook",
    "endpoint",
    "service",
    "page",
    "component",
    "react",
    "next.js",
    "nextjs",
    "dashboard",
    "admin",
    "form",
    "ui",
    "frontend",
    "screen"
  ])) return isDeepRequest(text) ? "coding-deep" : "coding";

  return "light";
}

function agentLeePersonaHeader(routeName) {
  return `Route: ${routeName}

Yo - Agent Lee on deck. Leeway rules locked, noise cut, build path clean.`;
}

function agentLeeFastReply(kind) {
  const corpusExists = !!(GOVERNANCE_CORPUS_PATH && fs.existsSync(GOVERNANCE_CORPUS_PATH));
  const corpusBytes = corpusExists ? fs.statSync(GOVERNANCE_CORPUS_PATH).size : 0;

  if (kind === "status") {
    return `Agent Lee's Coding Mode is online.

Route: status-fast
Leeway governance source: ${corpusExists ? "locked and available" : "missing"}
Leeway corpus path: ${GOVERNANCE_CORPUS_PATH || "not set"}
Leeway corpus size: ${corpusBytes} bytes
Mode: coding only
Voice/vision/avatar: disabled
User-facing assistant: Agent Lee only

This is the local Leeway-governed Agent Lee router, not GitHub Copilot.`;
  }

  return "Route: casual-fast\n\nYo — Agent Lee is online. Coding Mode locked, Leeway rules loaded, no extra noise. Tell me what we’re building and I’ll keep it clean, sharp, and production-grade.";
}

function agentLeeLightReply(userText) {
  const t = normalize(userText);

  if (t.includes("explain what agent lee coding mode is") || t.includes("what is agent lee coding mode")) {
    return "Route: light-fast\n\nAgent Lee's Coding Mode is the local Leeway-governed VS Code coding engine: Agent Lee is the only voice, backed by local Qwen models, Leeway 80, and the locked Leeway source corpus. It is built for production-grade coding only — no voice, no vision, no avatar, just clean Leeway execution.";
  }

  if (t.includes("what can you do") || t.includes("what do you do")) {
    return "Route: light-fast\n\nI run Leeway-governed coding work: planning, implementation, refactoring, review, Leeway 80 checks, PowerShell guidance, GitHub-ready workflow, and deployment planning. Give me the file, feature, or repo task, and I’ll keep it sharp and production-grade.";
  }

  return "Route: light-fast\n\nAgent Lee is online. Keep it simple or hand me the code — I’ll route it clean, stay in Leeway standards, and only bring the heavy workflow when the job actually needs it.";
}

function compactLeewayRules() {
  return `
Leeway Coding Rules:
- Agent Lee is the only user-facing voice.
- Write production-grade code by default.
- Preserve behavior unless change is requested.
- Prefer complete code over fragments.
- Include validation, error handling, security boundaries, and verification when relevant.
- For governed work, include plan, implementation/result, review summary, verification, and deployment notes.
- Do not invent frameworks, cloud providers, auth systems, databases, UI libraries, payment vendors, or deployment targets unless the user provides them.
- If a stack choice is needed but not provided, use neutral placeholders like "existing app framework", "existing auth provider", "existing database", and "existing deployment target".
- Never expose secrets.
- Never recommend destructive commands without explicit approval.
- Use PowerShell for Windows setup.
- Keep responses sharp, technical, lightly hip-hop flavored when natural.
`;
}

function agentLeeSystemBase(taskType, includeGovernance = false) {
  const governance = includeGovernance ? readGovernanceCorpus() : "";

  return `
You are Agent Lee, Leonard Lee's Leeway coding agent.

Voice:
- Calm, confident, technical, direct.
- Light hip-hop flavor when natural.
- No corny slang.
- No generic chatbot voice.
- No Copilot voice.

Mode:
- Coding only.
- No voice.
- No vision.
- No avatar/UI behavior.

Current task type: ${taskType}

${compactLeewayRules()}

${includeGovernance ? `REAL LEEWAY SOURCE CORPUS:\n${governance}` : ""}
`;
}

function instantCodeTemplate(userText) {
  const t = normalize(userText);

  if (
    t.includes("typescript") &&
    t.includes("email") &&
    (t.includes("validate") || t.includes("validator")) &&
    (t.includes("clean result object") || t.includes("typed result object"))
  ) {
    return `Route: turbo-template

\`\`\`ts
export type EmailValidationResult =
  | { ok: true; value: string }
  | {
      ok: false;
      error: "EMAIL_REQUIRED" | "EMAIL_INVALID";
      message: string;
    };

export function validateRequiredEmail(input: unknown): EmailValidationResult {
  if (typeof input !== "string" || input.trim().length === 0) {
    return {
      ok: false,
      error: "EMAIL_REQUIRED",
      message: "Email is required.",
    };
  }

  const value = input.trim().toLowerCase();
  const emailPattern = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;

  if (!emailPattern.test(value)) {
    return {
      ok: false,
      error: "EMAIL_INVALID",
      message: "Email must be a valid email address.",
    };
  }

  return { ok: true, value };
}
\`\`\`

Leeway check: typed contract, unknown input guard, trim/normalization, clear error codes, no secrets, no side effects.`;
  }

  if (
    t.includes("typescript") &&
    (t.includes("safe json") || t.includes("safely parses json") || t.includes("parse json")) &&
    (t.includes("typed result") || t.includes("result object"))
  ) {
    return `Route: turbo-template

\`\`\`ts
export type JsonParseResult<T> =
  | { ok: true; value: T }
  | {
      ok: false;
      error: "JSON_PARSE_FAILED";
      message: string;
    };

export function safeJsonParse<T = unknown>(input: string): JsonParseResult<T> {
  try {
    return {
      ok: true,
      value: JSON.parse(input) as T,
    };
  } catch {
    return {
      ok: false,
      error: "JSON_PARSE_FAILED",
      message: "Input is not valid JSON.",
    };
  }
}
\`\`\`

Leeway check: no throw leak, typed result contract, predictable error code, caller owns validation of parsed shape.`;
  }

  return null;
}

function instantReviewTemplate(userText) {
  const t = normalize(userText);

  if (t.includes("json.parse") && t.includes("function x")) {
    return `${agentLeePersonaHeader("review-template")}

Pass/fail: FAIL.

Top issues:
- Unsafe \`JSON.parse\` can throw and crash the caller.
- No input type guard.
- No typed result contract.
- No error code or recovery path.
- Function name and parameter naming are not production-clear.

Required fix:
\`\`\`ts
export type JsonParseResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: "JSON_PARSE_FAILED"; message: string };

export function safeJsonParse<T = unknown>(input: string): JsonParseResult<T> {
  try {
    return { ok: true, value: JSON.parse(input) as T };
  } catch {
    return {
      ok: false,
      error: "JSON_PARSE_FAILED",
      message: "Input is not valid JSON.",
    };
  }
}
\`\`\`

Deployment risk: medium if used on request bodies, config, webhooks, or user-controlled input. Leeway move: return typed results, never let parse failures escape unhandled.`;
  }

  return null;
}

function instantFullHeavyTemplate(userText) {
  const t = normalize(userText);

  if (
    t.includes("feature flags") &&
    t.includes("admin page") &&
    (t.includes("frontend and backend") || t.includes("full-stack") || t.includes("full stack")) &&
    t.includes("deployment plan")
  ) {
    return `${agentLeePersonaHeader("full-heavy-template")}

## Plan

Build a governed feature-flag admin surface with a frontend management page, backend flag API, audit-safe persistence, and deployment controls.

## Task breakdown

1. Data model
   - \`FeatureFlag\`: id, key, name, description, enabled, environment, rolloutPercent, createdAt, updatedAt.
   - \`FeatureFlagAuditLog\`: id, flagId, actorId, action, beforeJson, afterJson, createdAt.

2. Backend
   - \`GET /api/admin/feature-flags\`: list flags.
   - \`POST /api/admin/feature-flags\`: create flag.
   - \`PATCH /api/admin/feature-flags/:id\`: update enabled state, rollout, metadata.
   - \`DELETE /api/admin/feature-flags/:id\`: soft-delete or disable, not hard-delete by default.

3. Frontend
   - Admin table with search, environment filter, enabled filter.
   - Create/edit modal.
   - Toggle switch with confirmation.
   - Loading, empty, and error states.
   - Audit trail panel per flag.

4. Security
   - Admin-only authorization.
   - Validate all inputs server-side.
   - Never trust client-side environment or actor fields.
   - Log every mutation.

5. Verification
   - Unit tests for validation and authorization.
   - API tests for create/update/list flows.
   - UI tests for loading/error/toggle states.
   - Audit log test for every mutation.

## Implementation result

Use this structure:

\`\`\`text
src/
  app/admin/feature-flags/page.tsx
  components/admin/FeatureFlagTable.tsx
  components/admin/FeatureFlagForm.tsx
  app/api/admin/feature-flags/route.ts
  app/api/admin/feature-flags/[id]/route.ts
  lib/feature-flags/schema.ts
  lib/feature-flags/service.ts
  lib/feature-flags/audit.ts
\`\`\`

## Leeway review summary

Pass condition: the feature is acceptable only if it has admin authorization, typed validation, audit logging, safe mutation handling, and deployment rollback steps.

Current deployment risk: medium until role checks, audit logging, and rollout behavior are tested.

## Deployment notes

1. Deploy behind an internal/admin-only route.
2. Seed flags disabled by default.
3. Verify audit logging in staging.
4. Enable for one environment first.
5. Add rollback by disabling the flag rather than deleting records.

Leeway move: ship this as a controlled admin capability, not just a UI table. Governance, auditability, and rollback are part of the build.`;
  }

  return null;
}

function fullHeavyFallback(userText, reason = "model timeout") {
  return `Route: full-heavy-fallback

Agent Lee kept this governed and bounded. The heavy model path did not complete cleanly: ${reason}.

## Plan

1. Define the feature boundary.
2. Identify frontend, backend, data, auth, validation, testing, and deployment surfaces.
3. Build the smallest production-safe version first.
4. Add auditability and rollback before release.

## Implementation direction

Use this Leeway structure:

\`\`\`text
1. Schema / types
2. Service layer
3. API routes
4. UI components
5. Validation
6. Authorization
7. Tests
8. Deployment checklist
\`\`\`

## Leeway review summary

Required gates:
- typed inputs and outputs
- server-side validation
- authorization checks
- no secret exposure
- safe failure behavior
- verification path
- deployment/rollback plan

## Deployment notes

Do not ship until the admin/security boundary, test path, and rollback behavior are verified.

Request handled:
${userText}`;
}

function genericFullHeavyBlueprint(userText) {
  const t = normalize(userText);

  let domain = "admin capability";
  let domainSlug = "admin-capability";
  if (t.includes("billing settings")) {
    domain = "billing settings";
    domainSlug = "billing-settings";
  }
  if (t.includes("feature flags")) {
    domain = "feature flags";
    domainSlug = "feature-flags";
  }
  if (t.includes("users")) {
    domain = "user management";
    domainSlug = "user-management";
  }
  if (t.includes("roles")) {
    domain = "role management";
    domainSlug = "role-management";
  }

  return `${agentLeePersonaHeader("full-heavy-blueprint")}

## Plan

Build a governed full-stack ${domain} admin workflow using the existing application stack. Do not introduce new frameworks, auth providers, databases, cloud providers, UI libraries, or payment vendors unless they already exist in the project.

## Task breakdown

1. Frontend surface
   - Admin page for listing and editing ${domain}.
   - Loading, empty, error, and success states.
   - Confirmation flow for sensitive changes.
   - Clear validation messages.
   - Audit/history visibility where applicable.

2. Backend/API surface
   - List endpoint for current ${domain}.
   - Read endpoint for a single record or configuration group.
   - Create/update endpoint for allowed admin mutations.
   - Disable/archive endpoint where deletion would be risky.
   - Consistent response envelope for success and error states.

3. Schema and validation
   - Define typed request/response contracts.
   - Validate all input server-side.
   - Reject unknown or unsupported fields.
   - Normalize safe fields only after validation.
   - Keep sensitive fields out of client responses.

4. Authorization boundary
   - Require existing admin authorization.
   - Never trust actor identity, role, tenant, environment, or account ID from the client body.
   - Derive actor and scope from the existing authenticated server context.
   - Return clean 401/403 responses.

5. Auditability
   - Log every mutation.
   - Capture actor, action, target, before/after summary, timestamp, and request correlation ID.
   - Avoid logging secrets, payment tokens, or sensitive billing details.

## Implementation result

Use a neutral project structure and adapt names to the current repo:

\`\`\`text
admin/${domainSlug}/page
components/admin/${domainSlug}/Table
components/admin/${domainSlug}/Form
api/admin/${domainSlug}/list
api/admin/${domainSlug}/update
lib/${domainSlug}/schema
lib/${domainSlug}/service
lib/${domainSlug}/audit
tests/${domainSlug}/api
tests/${domainSlug}/ui
\`\`\`

Recommended response contract:

\`\`\`ts
export type ApiResult<T> =
  | { ok: true; data: T }
  | {
      ok: false;
      error: string;
      message: string;
      fieldErrors?: Record<string, string>;
    };
\`\`\`

Recommended mutation pattern:

\`\`\`ts
export async function updateAdminSetting(input: unknown, context: AdminContext): Promise<ApiResult<UpdatedSetting>> {
  if (!context.actorId || !context.isAdmin) {
    return {
      ok: false,
      error: "FORBIDDEN",
      message: "Admin access is required.",
    };
  }

  const parsed = validateAdminSettingInput(input);
  if (!parsed.ok) {
    return parsed;
  }

  const before = await getCurrentSetting(parsed.data.id, context.scope);
  const updated = await saveSettingChange(parsed.data, context);

  await writeAuditLog({
    actorId: context.actorId,
    action: "ADMIN_SETTING_UPDATED",
    targetId: parsed.data.id,
    before,
    after: updated,
    correlationId: context.correlationId,
  });

  return {
    ok: true,
    data: updated,
  };
}
\`\`\`

## Leeway review summary

Pass condition:
- Uses existing stack only.
- Has admin authorization.
- Has server-side validation.
- Has typed result contracts.
- Has audit logging.
- Has safe error responses.
- Has deployment and rollback steps.

Fail condition:
- Trusts client-provided user IDs, roles, account IDs, or environment.
- Introduces unapproved vendors/frameworks.
- Logs sensitive billing/payment data.
- Deletes important records without a recovery path.
- Ships without tests or rollback.

## Verification checklist

- Unit test validation success/failure paths.
- Unit test authorization failure.
- API test list/read/update flows.
- API test audit log write on every mutation.
- UI test loading, empty, error, success, and confirmation states.
- Security test client cannot mutate actor, role, tenant, or scope.
- Regression test rollback/disable behavior.

## Deployment notes

1. Ship behind existing admin authorization.
2. Deploy disabled or read-only first if the capability is sensitive.
3. Verify audit logs in staging.
4. Run mutation tests against staging data.
5. Enable write actions for a limited admin group.
6. Monitor errors and audit events.
7. Roll back by disabling the admin mutation path, not by deleting data.

Leeway move: this is the governed blueprint. Bring the current repo stack next, and I will turn it into exact files without guessing.`;
}

function recoveryGovernedBlueprint(userText) {
  return `${agentLeePersonaHeader("recovery-governed")}

## Recovery objective

Agent Lee completes the interrupted change without human support by freezing the current state, isolating the wiring/API change, finding the sleeper bug, removing time/env nondeterminism, and shipping only after verification passes.

## 1. Freeze and inspect

- Stop feature expansion.
- Capture current branch, changed files, test output, runtime logs, and environment snapshot.
- Do not delete or rewrite broad areas until the fault boundary is known.
- Create a recovery branch/checkpoint before patching.

PowerShell checkpoint:

\`\`\`powershell
git status
git diff --stat
git diff > .\\agent-lee-recovery.diff
git checkout -b agent-lee/recovery-wiring-api-sleeper-bug
\`\`\`

## 2. Isolate the wiring/API change

Separate the app into stable seams:

- Match viewer rendering layer.
- Game data provider interface.
- Local mock provider.
- External league API provider.
- Mapping/normalization layer.
- Error/loading/retry states.

Required pattern:

\`\`\`ts
export interface MatchDataProvider {
  getMatch(matchId: string): Promise<ApiResult<LeagueMatch>>;
  listMatches(query: MatchQuery): Promise<ApiResult<LeagueMatchSummary[]>>;
}
\`\`\`

The 3D viewer should consume normalized match data only. It should not know whether data came from mocks or the external API.

## 3. Find the sleeper bug

A sleeper bug corrupted by time and environment variables usually comes from nondeterminism:

- direct \`Date.now()\` usage
- timezone-dependent parsing
- stale cached env values
- missing env validation
- environment drift between dev/test/prod
- API base URL changing by shell/session
- feature flags read once at module load
- mock data timestamps that do not match real API timestamps

Search targets:

\`\`\`powershell
Select-String -Path .\\**\\*.ts,.\\**\\*.tsx -Pattern "Date.now|new Date|process.env|import.meta.env|localStorage|sessionStorage" -List
\`\`\`

## 4. Patch time handling

Create a time provider instead of direct wall-clock calls:

\`\`\`ts
export interface Clock {
  now(): Date;
}

export const systemClock: Clock = {
  now: () => new Date(),
};
\`\`\`

In tests, use a fixed clock:

\`\`\`ts
export const fixedClock = (iso: string): Clock => ({
  now: () => new Date(iso),
});
\`\`\`

Rule: no match state, league standings, countdowns, or replay logic should depend on uncontrolled time.

## 5. Patch environment handling

Centralize env validation:

\`\`\`ts
export type LeagueApiEnv = {
  leagueApiBaseUrl: string;
  leagueApiKey?: string;
};

export function loadLeagueApiEnv(source: NodeJS.ProcessEnv): ApiResult<LeagueApiEnv> {
  const leagueApiBaseUrl = source.LEAGUE_API_BASE_URL?.trim();

  if (!leagueApiBaseUrl) {
    return {
      ok: false,
      error: "ENV_MISSING_LEAGUE_API_BASE_URL",
      message: "LEAGUE_API_BASE_URL is required.",
    };
  }

  return {
    ok: true,
    data: {
      leagueApiBaseUrl,
      leagueApiKey: source.LEAGUE_API_KEY,
    },
  };
}
\`\`\`

Rule: do not read raw environment variables across random files. Read once through validated config and pass dependencies inward.

## 6. Complete the wiring change

- Keep mock provider as a test/dev provider.
- Add external API provider behind the same interface.
- Add mapper from external API shape to internal \`LeagueMatch\`.
- Add fallback/error states for external failures.
- Add tests for mock provider, API provider, mapper, and 3D viewer loading/error states.

## 7. Verification checklist

- Unit test fixed clock behavior.
- Unit test env validation failure.
- Unit test mock provider still works.
- Unit test external provider handles API errors.
- Unit test API mapper handles missing fields.
- UI test viewer loading/error/loaded states.
- Regression test no direct \`Date.now()\` or scattered \`process.env\` remains in feature logic.
- Run build and test commands from the existing repo.

PowerShell verification:

\`\`\`powershell
npm test
npm run build
git diff --stat
\`\`\`

## 8. Deployment and rollback

- Deploy with external API disabled or behind existing feature flag if available.
- Verify env variables in staging before enabling.
- Smoke-test one real match and one mock match.
- Roll back by switching provider mode back to mock/local or disabling external API wiring.
- Keep audit notes in the PR describing the time/env sleeper bug and guardrails added.

## Leeway review summary

Pass condition:
- No uncontrolled time dependency.
- No scattered raw env reads.
- Viewer consumes normalized data only.
- API provider is isolated.
- Mock provider remains available.
- Tests cover time, env, API failures, and viewer states.
- Deployment has rollback path.

Leeway move: isolate the chaos, lock the seams, then ship it clean. No guessing, no hero edits, no hand-holding - just controlled execution.`;
}

async function callOllama(model, messages, options = {}) {
  const controller = new AbortController();
  const timeoutMs = options.timeoutMs ?? 60000;
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        model,
        messages,
        stream: false,
        keep_alive: "10m",
        options: {
          temperature: options.temperature ?? 0.08,
          top_p: options.top_p ?? 0.9,
          num_ctx: options.num_ctx ?? 1536,
          num_predict: options.num_predict ?? 450
        }
      })
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Ollama call failed for ${model}: ${response.status} ${text}`);
    }

    const json = await response.json();
    return json?.message?.content || "";
  } finally {
    clearTimeout(timeout);
  }
}

function openAIResponse(content, model = "agent-lee", route = "unknown") {
  return {
    id: `chatcmpl-agent-lee-${Date.now()}`,
    object: "chat.completion",
    created: Math.floor(Date.now() / 1000),
    model,
    route,
    choices: [
      {
        index: 0,
        message: { role: "assistant", content },
        finish_reason: "stop"
      }
    ]
  };
}



function psQuote(value) {
  return "'" + String(value ?? "").replace(/'/g, "''") + "'";
}

function requireDesktopConfirm(req, res) {
  const confirm = String(req.body.confirm || "");
  if (confirm !== DESKTOP_COMMAND_CONFIRM) {
    res.status(403).json({
      ok: false,
      error: "Desktop tool confirmation required.",
      requiredConfirm: DESKTOP_COMMAND_CONFIRM
    });
    return false;
  }
  return true;
}

async function runDesktopTool(toolName, command, timeoutMs = 30000) {
  auditDesktopCommand({
    tool: toolName,
    command,
    cwd: DESKTOP_SANDBOX_ROOT,
    timeoutMs,
    status: "started"
  });

  const result = await runPowerShell(command, DESKTOP_SANDBOX_ROOT, timeoutMs);

  auditDesktopCommand({
    tool: toolName,
    command,
    cwd: result.cwd,
    timeoutMs,
    status: result.ok ? "completed" : "failed",
    code: result.code,
    signal: result.signal,
    stdoutPreview: result.stdout.slice(0, 2000),
    stderrPreview: result.stderr.slice(0, 2000)
  });

  return result;
}

app.get("/tools/desktop/status", (_req, res) => {
  fs.mkdirSync(DESKTOP_SANDBOX_ROOT, { recursive: true });
  fs.mkdirSync(DESKTOP_AUDIT_LOG.split("\\").slice(0, -1).join("\\"), { recursive: true });

  res.json({
    ok: true,
    name: "Agent Lee Desktop Command Bridge",
    sandboxRoot: DESKTOP_SANDBOX_ROOT,
    auditLog: DESKTOP_AUDIT_LOG,
    powershell: "enabled",
    confirmationRequired: DESKTOP_COMMAND_CONFIRM,
    note: "Desktop commands run as the local Windows user. Agent Lee must log commands and prefer sandbox/workspace scope."
  });
});

app.post("/tools/desktop/powershell", async (req, res) => {
  const command = String(req.body.command || "").trim();
  const cwd = req.body.cwd ? String(req.body.cwd) : DESKTOP_SANDBOX_ROOT;
  const confirm = String(req.body.confirm || "");
  const timeoutMs = Number(req.body.timeoutMs || 30000);

  if (!command) {
    return res.status(400).json({ ok: false, error: "Missing command." });
  }

  if (confirm !== DESKTOP_COMMAND_CONFIRM) {
    return res.status(403).json({
      ok: false,
      error: "Desktop command confirmation required.",
      requiredConfirm: DESKTOP_COMMAND_CONFIRM
    });
  }

  auditDesktopCommand({
    command,
    cwd,
    timeoutMs,
    status: "started"
  });

  const result = await runPowerShell(command, cwd, timeoutMs);

  auditDesktopCommand({
    command,
    cwd: result.cwd,
    timeoutMs,
    status: result.ok ? "completed" : "failed",
    code: result.code,
    signal: result.signal,
    stdoutPreview: result.stdout.slice(0, 2000),
    stderrPreview: result.stderr.slice(0, 2000)
  });

  res.json({
    ok: result.ok,
    code: result.code,
    signal: result.signal,
    cwd: result.cwd,
    stdout: result.stdout,
    stderr: result.stderr
  });
});

app.get("/tools/devtools/version", async (_req, res) => {
  try {
    const response = await fetch("http://localhost:9222/json/version");
    if (!response.ok) {
      return res.status(response.status).json({
        ok: false,
        error: `DevTools returned ${response.status}`
      });
    }

    const json = await response.json();
    res.json({
      ok: true,
      ...json
    });
  } catch (err) {
    res.status(500).json({
      ok: false,
      error: err.message
    });
  }
});


app.get("/tools/bluetooth/status", async (_req, res) => {
  const command = `
$ErrorActionPreference = "Continue"

$devices = Get-PnpDevice -Class Bluetooth |
  Select-Object Status, Class, FriendlyName, InstanceId

[ordered]@{
  ok = $true
  tool = "bluetooth.status"
  devices = $devices
} | ConvertTo-Json -Depth 8
`;

  const result = await runDesktopTool("bluetooth.status", command, 30000);

  res.json({
    ok: result.ok,
    stdout: result.stdout,
    stderr: result.stderr
  });
});

app.get("/tools/printers/status", async (_req, res) => {
  const command = `
$ErrorActionPreference = "Continue"

$printers = Get-Printer |
  Select-Object Name, DriverName, PortName, PrinterStatus, Type, Shared

$defaultPrinter = Get-CimInstance Win32_Printer |
  Where-Object { $_.Default -eq $true } |
  Select-Object Name, DriverName, PortName, PrinterStatus

[ordered]@{
  ok = $true
  tool = "printers.status"
  defaultPrinter = $defaultPrinter
  printers = $printers
} | ConvertTo-Json -Depth 8
`;

  const result = await runDesktopTool("printers.status", command, 30000);

  res.json({
    ok: result.ok,
    stdout: result.stdout,
    stderr: result.stderr
  });
});

app.post("/tools/mouse/move", async (req, res) => {
  if (!requireDesktopConfirm(req, res)) return;

  const x = Math.max(0, Math.min(10000, Number(req.body.x || 0)));
  const y = Math.max(0, Math.min(10000, Number(req.body.y || 0)));

  const command = `
$ErrorActionPreference = "Continue"

Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;

public class AgentLeeMouseMove {
  [DllImport("user32.dll")]
  public static extern bool SetCursorPos(int X, int Y);
}
"@

[AgentLeeMouseMove]::SetCursorPos(${x}, ${y}) | Out-Null

[ordered]@{
  ok = $true
  tool = "mouse.move"
  x = ${x}
  y = ${y}
} | ConvertTo-Json -Depth 5
`;

  const result = await runDesktopTool("mouse.move", command, 10000);

  res.json({
    ok: result.ok,
    stdout: result.stdout,
    stderr: result.stderr
  });
});

app.post("/tools/mouse/click", async (req, res) => {
  if (!requireDesktopConfirm(req, res)) return;

  const x = Math.max(0, Math.min(10000, Number(req.body.x || 0)));
  const y = Math.max(0, Math.min(10000, Number(req.body.y || 0)));
  const button = String(req.body.button || "left").toLowerCase();

  const downFlag = button === "right" ? 0x0008 : 0x0002;
  const upFlag = button === "right" ? 0x0010 : 0x0004;

  const command = `
$ErrorActionPreference = "Continue"

Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;

public class AgentLeeMouseClick {
  [DllImport("user32.dll")]
  public static extern bool SetCursorPos(int X, int Y);

  [DllImport("user32.dll")]
  public static extern void mouse_event(int dwFlags, int dx, int dy, int cButtons, int dwExtraInfo);
}
"@

[AgentLeeMouseClick]::SetCursorPos(${x}, ${y}) | Out-Null
Start-Sleep -Milliseconds 150
[AgentLeeMouseClick]::mouse_event(${downFlag}, 0, 0, 0, 0)
Start-Sleep -Milliseconds 80
[AgentLeeMouseClick]::mouse_event(${upFlag}, 0, 0, 0, 0)

[ordered]@{
  ok = $true
  tool = "mouse.click"
  x = ${x}
  y = ${y}
  button = "${button}"
} | ConvertTo-Json -Depth 5
`;

  const result = await runDesktopTool("mouse.click", command, 10000);

  res.json({
    ok: result.ok,
    stdout: result.stdout,
    stderr: result.stderr
  });
});

app.post("/tools/keyboard/type", async (req, res) => {
  if (!requireDesktopConfirm(req, res)) return;

  const textToType = String(req.body.text || "");
  const quotedText = psQuote(textToType);

  const command = `
$ErrorActionPreference = "Continue"

Add-Type -AssemblyName System.Windows.Forms

$oldClipboard = $null
try {
  $oldClipboard = Get-Clipboard -Raw -ErrorAction SilentlyContinue
} catch {}

Set-Clipboard -Value ${quotedText}
Start-Sleep -Milliseconds 150
[System.Windows.Forms.SendKeys]::SendWait("^v")
Start-Sleep -Milliseconds 250

try {
  if ($null -ne $oldClipboard) {
    Set-Clipboard -Value $oldClipboard
  }
} catch {}

[ordered]@{
  ok = $true
  tool = "keyboard.type"
  chars = ${textToType.length}
  note = "Text pasted into the active window, then clipboard was restored when possible."
} | ConvertTo-Json -Depth 5
`;

  const result = await runDesktopTool("keyboard.type", command, 10000);

  res.json({
    ok: result.ok,
    stdout: result.stdout,
    stderr: result.stderr
  });
});

app.post("/tools/screen/screenshot", async (req, res) => {
  if (!requireDesktopConfirm(req, res)) return;

  const command = `
$ErrorActionPreference = "Continue"

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$screenshotDir = Join-Path (Get-Location) "screenshots"
New-Item -ItemType Directory -Force -Path $screenshotDir | Out-Null

$path = Join-Path $screenshotDir ("agent-lee-screen-" + (Get-Date -Format "yyyyMMdd-HHmmss") + ".png")

$bounds = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
$bitmap = New-Object System.Drawing.Bitmap $bounds.Width, $bounds.Height
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$graphics.CopyFromScreen($bounds.Location, [System.Drawing.Point]::Empty, $bounds.Size)
$bitmap.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)

$graphics.Dispose()
$bitmap.Dispose()

[ordered]@{
  ok = $true
  tool = "screen.screenshot"
  path = $path
  width = $bounds.Width
  height = $bounds.Height
} | ConvertTo-Json -Depth 5
`;

  const result = await runDesktopTool("screen.screenshot", command, 30000);

  res.json({
    ok: result.ok,
    stdout: result.stdout,
    stderr: result.stderr
  });
});


function parseMouseMovePrompt(prompt) {
  const text = String(prompt || "").toLowerCase();
  const match = text.match(/(?:move\s+(?:the\s+)?mouse\s+(?:to\s+)?)?x?\s*(\d{1,4})\s*[, ]+\s*y?\s*(\d{1,4})/i);
  if (!match) return null;

  return {
    x: Math.max(0, Math.min(10000, Number(match[1]))),
    y: Math.max(0, Math.min(10000, Number(match[2])))
  };
}

function desktopPersona(toolName) {
  return `Yo - Agent Lee on deck. Desktop tool route locked: ${toolName}.`;
}

app.post("/tools/agent/desktop-router", async (req, res) => {
  const prompt = String(req.body.prompt || "").trim();
  const confirm = String(req.body.confirm || "");
  const text = prompt.toLowerCase();

  if (!prompt) {
    return res.status(400).json({
      ok: false,
      error: "Missing prompt."
    });
  }

  const isPrinterStatus =
    text.includes("printer") || text.includes("printers");

  const isPrintAction =
    /\b(print|printing|print\s+this|send\s+to\s+printer)\b/.test(text) &&
    !isPrinterStatus;

  const needsConfirmation =
    text.includes("mouse") ||
    text.includes("keyboard") ||
    text.includes("type") ||
    text.includes("screenshot") ||
    text.includes("screen") ||
    text.includes("click") ||
    isPrintAction;

  if (needsConfirmation && confirm !== DESKTOP_COMMAND_CONFIRM) {
    return res.status(403).json({
      ok: false,
      error: "Desktop action confirmation required.",
      requiredConfirm: DESKTOP_COMMAND_CONFIRM
    });
  }

  // Bluetooth status.
  if (text.includes("bluetooth")) {
    const command = `
$ErrorActionPreference = "Continue"

$devices = Get-PnpDevice -Class Bluetooth |
  Select-Object Status, Class, FriendlyName, InstanceId

[ordered]@{
  ok = $true
  tool = "bluetooth.status"
  devices = $devices
} | ConvertTo-Json -Depth 8
`;

    const result = await runDesktopTool("agent.desktop-router.bluetooth.status", command, 30000);

    return res.json({
      ok: result.ok,
      route: "desktop-router",
      tool: "bluetooth.status",
      message: desktopPersona("bluetooth.status"),
      stdout: result.stdout,
      stderr: result.stderr
    });
  }

  // Printer status.
  if (text.includes("printer") || text.includes("printers")) {
    const command = `
$ErrorActionPreference = "Continue"

$printers = Get-Printer |
  Select-Object Name, DriverName, PortName, PrinterStatus, Type, Shared

$defaultPrinter = Get-CimInstance Win32_Printer |
  Where-Object { $_.Default -eq $true } |
  Select-Object Name, DriverName, PortName, PrinterStatus

[ordered]@{
  ok = $true
  tool = "printers.status"
  defaultPrinter = $defaultPrinter
  printers = $printers
} | ConvertTo-Json -Depth 8
`;

    const result = await runDesktopTool("agent.desktop-router.printers.status", command, 30000);

    return res.json({
      ok: result.ok,
      route: "desktop-router",
      tool: "printers.status",
      message: desktopPersona("printers.status"),
      stdout: result.stdout,
      stderr: result.stderr
    });
  }

  // Screenshot.
  if (text.includes("screenshot") || text.includes("screen shot") || text.includes("capture screen")) {
    const command = `
$ErrorActionPreference = "Continue"

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$screenshotDir = Join-Path (Get-Location) "screenshots"
New-Item -ItemType Directory -Force -Path $screenshotDir | Out-Null

$path = Join-Path $screenshotDir ("agent-lee-screen-" + (Get-Date -Format "yyyyMMdd-HHmmss") + ".png")

$bounds = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
$bitmap = New-Object System.Drawing.Bitmap $bounds.Width, $bounds.Height
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$graphics.CopyFromScreen($bounds.Location, [System.Drawing.Point]::Empty, $bounds.Size)
$bitmap.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)

$graphics.Dispose()
$bitmap.Dispose()

[ordered]@{
  ok = $true
  tool = "screen.screenshot"
  path = $path
  width = $bounds.Width
  height = $bounds.Height
} | ConvertTo-Json -Depth 5
`;

    const result = await runDesktopTool("agent.desktop-router.screen.screenshot", command, 30000);

    return res.json({
      ok: result.ok,
      route: "desktop-router",
      tool: "screen.screenshot",
      message: desktopPersona("screen.screenshot"),
      stdout: result.stdout,
      stderr: result.stderr
    });
  }

  // Mouse move.
  if (text.includes("mouse") && text.includes("move")) {
    const coords = parseMouseMovePrompt(prompt);

    if (!coords) {
      return res.status(400).json({
        ok: false,
        route: "desktop-router",
        tool: "mouse.move",
        error: "Mouse move requested, but no coordinates were found. Example: move mouse to 300 300."
      });
    }

    const command = `
$ErrorActionPreference = "Continue"

Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;

public class AgentLeeAutoMouseMove {
  [DllImport("user32.dll")]
  public static extern bool SetCursorPos(int X, int Y);
}
"@

[AgentLeeAutoMouseMove]::SetCursorPos(${coords.x}, ${coords.y}) | Out-Null

[ordered]@{
  ok = $true
  tool = "mouse.move"
  x = ${coords.x}
  y = ${coords.y}
} | ConvertTo-Json -Depth 5
`;

    const result = await runDesktopTool("agent.desktop-router.mouse.move", command, 10000);

    return res.json({
      ok: result.ok,
      route: "desktop-router",
      tool: "mouse.move",
      message: desktopPersona("mouse.move"),
      stdout: result.stdout,
      stderr: result.stderr
    });
  }

  return res.status(404).json({
    ok: false,
    route: "desktop-router",
    error: "No desktop tool matched this prompt.",
    supportedExamples: [
      "check bluetooth",
      "check printers",
      "take a screenshot",
      "move mouse to 300 300"
    ]
  });
});



app.get("/tools/voice/list", async (_req, res) => {
  const command = `
$ErrorActionPreference = "Continue"

Add-Type -AssemblyName System.Speech

$speaker = New-Object System.Speech.Synthesis.SpeechSynthesizer

$voices = $speaker.GetInstalledVoices() | ForEach-Object {
  [ordered]@{
    Name = $_.VoiceInfo.Name
    Culture = $_.VoiceInfo.Culture.ToString()
    Gender = $_.VoiceInfo.Gender.ToString()
    Age = $_.VoiceInfo.Age.ToString()
    Description = $_.VoiceInfo.Description
    Enabled = $_.Enabled
  }
}

[ordered]@{
  ok = $true
  tool = "voice.list"
  voices = $voices
} | ConvertTo-Json -Depth 8
`;

  const result = await runDesktopTool("voice.list", command, 30000);

  res.json({
    ok: result.ok,
    route: "voice.list",
    stdout: result.stdout,
    stderr: result.stderr
  });
});

app.post("/tools/voice/speak", async (req, res) => {
  const confirm = String(req.body.confirm || "");
  const textToSpeak = String(req.body.text || "").trim();
  const voiceName = String(req.body.voice || "").trim();

  if (!textToSpeak) {
    return res.status(400).json({
      ok: false,
      error: "Missing text."
    });
  }

  if (confirm !== DESKTOP_COMMAND_CONFIRM) {
    return res.status(403).json({
      ok: false,
      error: "Voice output confirmation required.",
      requiredConfirm: DESKTOP_COMMAND_CONFIRM
    });
  }

  const safeText = textToSpeak.replace(/'/g, "''").slice(0, 1200);
  const safeVoice = voiceName.replace(/'/g, "''").slice(0, 200);

  const command = `
$ErrorActionPreference = "Continue"

Add-Type -AssemblyName System.Speech

$speaker = New-Object System.Speech.Synthesis.SpeechSynthesizer
$speaker.Rate = 0
$speaker.Volume = 100

$availableVoices = $speaker.GetInstalledVoices() | ForEach-Object { $_.VoiceInfo.Name }

$requestedVoice = '${safeVoice}'
$selectedVoice = $speaker.Voice.Name
$voiceSelectionApplied = $false
$voiceSelectionError = ""

if ($requestedVoice -and ($availableVoices -contains $requestedVoice)) {
  try {
    $speaker.SelectVoice($requestedVoice)
    $selectedVoice = $speaker.Voice.Name
    $voiceSelectionApplied = $true
  }
  catch {
    $voiceSelectionError = $_.Exception.Message
  }
}
elseif ($requestedVoice) {
  $voiceSelectionError = "Requested voice not available to System.Speech: $requestedVoice"
}

$speaker.Speak('${safeText}')

[ordered]@{
  ok = $true
  tool = "voice.speak"
  requestedVoice = $requestedVoice
  selectedVoice = $selectedVoice
  voiceSelectionApplied = $voiceSelectionApplied
  voiceSelectionError = $voiceSelectionError
  availableVoices = $availableVoices
  chars = ${safeText.length}
} | ConvertTo-Json -Depth 8
`;

  const result = await runDesktopTool("voice.speak", command, 30000);

  res.json({
    ok: result.ok,
    route: "voice.speak",
    stdout: result.stdout,
    stderr: result.stderr
  });
});



app.get("/tools/voice/natural/list", (_req, res) => {
  res.json({
    ok: true,
    route: "voice.natural.list",
    lockedVoices: [
      {
        id: "en-US-AndrewNeural",
        alias: "andrew",
        role: "primary",
        label: "Agent Lee Primary Natural Voice"
      },
      {
        id: "en-US-AvaNeural",
        alias: "ava",
        role: "alternate",
        label: "Agent Lee Alternate Natural Voice"
      }
    ],
    defaultVoice: "en-US-AndrewNeural",
    note: "Natural voice uses leeway_tts, generates audio in the sandbox, and plays it through hidden WPF MediaPlayer playback."
  });
});

app.post("/tools/voice/natural/speak", async (req, res) => {
  const confirm = String(req.body.confirm || "");
  const textToSpeak = String(req.body.text || "").trim();
  const requestedVoice = String(req.body.voice || "en-US-AndrewNeural").trim();

  if (!textToSpeak) {
    return res.status(400).json({
      ok: false,
      error: "Missing text."
    });
  }

  if (confirm !== DESKTOP_COMMAND_CONFIRM) {
    return res.status(403).json({
      ok: false,
      error: "Natural voice output confirmation required.",
      requiredConfirm: DESKTOP_COMMAND_CONFIRM
    });
  }

  let voice = requestedVoice;

  if (voice.toLowerCase() === "andrew" || voice.toLowerCase() === "primary" || voice.toLowerCase() === "lee") {
    voice = "en-US-AndrewNeural";
  }

  if (voice.toLowerCase() === "ava" || voice.toLowerCase() === "alternate" || voice.toLowerCase() === "backup") {
    voice = "en-US-AvaNeural";
  }

  const allowed = new Set(["en-US-AndrewNeural", "en-US-AvaNeural"]);

  if (!allowed.has(voice)) {
    return res.status(400).json({
      ok: false,
      error: "Voice is not locked for Agent Lee natural mode.",
      allowedVoices: ["en-US-AndrewNeural", "en-US-AvaNeural"]
    });
  }

  const safeText = textToSpeak.replace(/'/g, "''").slice(0, 2500);
  const safeVoice = voice.replace(/'/g, "''").slice(0, 120);

  const command = `
$ErrorActionPreference = "Stop"

$voiceRoot = Join-Path (Get-Location) "natural-voice"
New-Item -ItemType Directory -Force -Path $voiceRoot | Out-Null

$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$voice = '${safeVoice}'
$text = '${safeText}'
$outFile = Join-Path $voiceRoot ("agent-lee-natural-" + $voice + "-" + $stamp + ".mp3")
$playScriptPath = Join-Path $voiceRoot ("agent-lee-play-" + $stamp + ".ps1")

$py = Get-Command py -ErrorAction SilentlyContinue
$python = Get-Command python -ErrorAction SilentlyContinue

if ($py) {
  & py -m leeway_tts --voice $voice --text $text --write-media $outFile
}
elseif ($python) {
  & python -m leeway_tts --voice $voice --text $text --write-media $outFile
}
else {
  throw "Python launcher not found. Install Python or make py/python available on PATH."
}

if (-not (Test-Path -LiteralPath $outFile)) {
  throw "Natural voice file was not created: $outFile"
}

$estimatedSeconds = [Math]::Min(120, [Math]::Max(8, [Math]::Ceiling($text.Length / 8) + 4))

$playLines = @(
  'Add-Type -AssemblyName PresentationCore',
  '$player = New-Object System.Windows.Media.MediaPlayer',
  '$player.Volume = 1.0',
  '$player.Open([Uri]''' + $outFile + ''')',
  'Start-Sleep -Milliseconds 1200',
  'try {',
  '  if ($player.NaturalDuration.HasTimeSpan) {',
  '    $duration = [Math]::Ceiling($player.NaturalDuration.TimeSpan.TotalSeconds) + 3',
  '  }',
  '  else {',
  '    $duration = ' + $estimatedSeconds,
  '  }',
  '}',
  'catch {',
  '  $duration = ' + $estimatedSeconds,
  '}',
  'if ($duration -lt ' + $estimatedSeconds + ') {',
  '  $duration = ' + $estimatedSeconds,
  '}',
  '$player.Play()',
  'Start-Sleep -Seconds $duration',
  '$player.Stop()',
  '$player.Close()'
)

$playLines | Out-File -Encoding UTF8 $playScriptPath

powershell.exe -NoProfile -STA -ExecutionPolicy Bypass -WindowStyle Hidden -File $playScriptPath

[ordered]@{
  ok = $true
  tool = "voice.natural.speak"
  voice = $voice
  chars = $text.Length
  file = $outFile
  playScript = $playScriptPath
  playback = "hidden-wpf-mediaplayer-sta"
  visiblePlayerOpened = $false
  estimatedSeconds = $estimatedSeconds
} | ConvertTo-Json -Depth 8
`;

  const result = await runDesktopTool("voice.natural.speak", command, 120000);

  res.json({
    ok: result.ok,
    route: "voice.natural.speak",
    stdout: result.stdout,
    stderr: result.stderr
  });
});

app.get("/health", async (_req, res) => {
  try {
    const tagsResponse = await fetch(`${OLLAMA_BASE_URL}/api/tags`);
    const tags = await tagsResponse.json();

    res.json({
      ok: true,
      name: "Agent Lee's Coding Mode",
      mode: process.env.AGENT_LEE_MODE || "CODING_ONLY",
      governanceCorpus: GOVERNANCE_CORPUS_PATH,
      governanceCorpusExists: !!(GOVERNANCE_CORPUS_PATH && fs.existsSync(GOVERNANCE_CORPUS_PATH)),
      governanceCorpusBytes: GOVERNANCE_CORPUS_PATH && fs.existsSync(GOVERNANCE_CORPUS_PATH)
        ? fs.statSync(GOVERNANCE_CORPUS_PATH).size
        : 0,
      sourceRoots: process.env.LEEWAY_SOURCE_ROOTS,
      ollama: OLLAMA_BASE_URL,
      models: MODELS,
      installed: tags.models || []
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.get("/routes", (_req, res) => {
  res.json({
    casual: "instant router response",
    status: "instant router response",
    light: "instant router response",
    turboTemplate: "instant code template for known common patterns",
    turboCode: `${MODELS.turbo} single call, small unknown code`,
    coding: `${MODELS.fastCoder} single call, normal coding speed lane`,
    review: "instant template when known risk, otherwise qwen3 governed review",
    recoveryGoverned: "instant governed recovery blueprint for interrupted work, sleeper bugs, time/env corruption",
    deepCoding: `${MODELS.deepCoder} explicit deep coding`,
    fullHeavy: {
      mode: "optimized governed single-pass workflow",
      model: MODELS.fullCoder,
      includes: ["plan", "implementation", "review summary", "verification", "deployment notes"],
      governance: "enabled, compact corpus"
    },
    maxHeavy: {
      model: MODELS.maxCoder,
      note: "reserved for explicit maximum/deep enterprise build"
    }
  });
});

app.get("/v1/models", (_req, res) => {
  res.json({
    object: "list",
    data: [{ id: "agent-lee", object: "model", created: 0, owned_by: "leeway" }]
  });
});


function desktopChatNeedsConfirm(text) {
  const t = String(text || "").toLowerCase();

  const safeStatus =
    t.includes("bluetooth") ||
    t.includes("printer") ||
    t.includes("printers");

  const risky =
    t.includes("mouse") ||
    t.includes("keyboard") ||
    t.includes("type") ||
    t.includes("screenshot") ||
    t.includes("screen shot") ||
    t.includes("capture screen") ||
    t.includes("click") ||
    /\b(print|printing|send\s+to\s+printer)\b/.test(t);

  return risky && !safeStatus;
}

function desktopChatHasConfirm(text) {
  return String(text || "").includes(DESKTOP_COMMAND_CONFIRM);
}

function desktopToolResponse(routeName, toolName, stdout, stderr = "") {
  return `${agentLeePersonaHeader(routeName)}

Desktop tool: ${toolName}

Result:

\`\`\`json
${stdout.trim()}
\`\`\`

${stderr ? `Warnings/errors:\n\n\`\`\`text\n${stderr.trim()}\n\`\`\`` : "Leeway check: command completed through governed desktop bridge and audit log."}`;
}

async function maybeHandleDesktopChatTool(userText) {
  const text = String(userText || "");
  const t = text.toLowerCase();

  const looksDesktop =
    t.includes("bluetooth") ||
    t.includes("printer") ||
    t.includes("printers") ||
    t.includes("mouse") ||
    t.includes("keyboard") ||
    t.includes("screenshot") ||
    t.includes("screen shot") ||
    t.includes("capture screen");

  if (!looksDesktop) return null;

  if (desktopChatNeedsConfirm(text) && !desktopChatHasConfirm(text)) {
    return {
      route: "desktop-confirm-required",
      content: `${agentLeePersonaHeader("desktop-confirm-required")}

I can do that, but this is a live desktop action. Add this confirmation phrase to the prompt:

\`\`\`text
${DESKTOP_COMMAND_CONFIRM}
\`\`\`

Safe status checks like Bluetooth/printer listing do not need confirmation. Mouse movement, clicks, typing, screenshots, printing, and screen actions do.`
    };
  }

  if (t.includes("bluetooth")) {
    const command = `
$ErrorActionPreference = "Continue"

$devices = Get-PnpDevice -Class Bluetooth |
  Select-Object Status, Class, FriendlyName, InstanceId

[ordered]@{
  ok = $true
  tool = "bluetooth.status"
  devices = $devices
} | ConvertTo-Json -Depth 8
`;

    const result = await runDesktopTool("chat.bluetooth.status", command, 30000);

    return {
      route: "desktop-tool",
      tool: "bluetooth.status",
      content: desktopToolResponse("desktop-tool", "bluetooth.status", result.stdout, result.stderr)
    };
  }

  if (t.includes("printer") || t.includes("printers")) {
    const command = `
$ErrorActionPreference = "Continue"

$printers = Get-Printer |
  Select-Object Name, DriverName, PortName, PrinterStatus, Type, Shared

$defaultPrinter = Get-CimInstance Win32_Printer |
  Where-Object { $_.Default -eq $true } |
  Select-Object Name, DriverName, PortName, PrinterStatus

[ordered]@{
  ok = $true
  tool = "printers.status"
  defaultPrinter = $defaultPrinter
  printers = $printers
} | ConvertTo-Json -Depth 8
`;

    const result = await runDesktopTool("chat.printers.status", command, 30000);

    return {
      route: "desktop-tool",
      tool: "printers.status",
      content: desktopToolResponse("desktop-tool", "printers.status", result.stdout, result.stderr)
    };
  }

  if (t.includes("screenshot") || t.includes("screen shot") || t.includes("capture screen")) {
    const command = `
$ErrorActionPreference = "Continue"

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$screenshotDir = Join-Path (Get-Location) "screenshots"
New-Item -ItemType Directory -Force -Path $screenshotDir | Out-Null

$path = Join-Path $screenshotDir ("agent-lee-screen-" + (Get-Date -Format "yyyyMMdd-HHmmss") + ".png")

$bounds = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
$bitmap = New-Object System.Drawing.Bitmap $bounds.Width, $bounds.Height
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$graphics.CopyFromScreen($bounds.Location, [System.Drawing.Point]::Empty, $bounds.Size)
$bitmap.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)

$graphics.Dispose()
$bitmap.Dispose()

[ordered]@{
  ok = $true
  tool = "screen.screenshot"
  path = $path
  width = $bounds.Width
  height = $bounds.Height
} | ConvertTo-Json -Depth 5
`;

    const result = await runDesktopTool("chat.screen.screenshot", command, 30000);

    return {
      route: "desktop-tool",
      tool: "screen.screenshot",
      content: desktopToolResponse("desktop-tool", "screen.screenshot", result.stdout, result.stderr)
    };
  }

  if (t.includes("mouse") && t.includes("move")) {
    const coords = parseMouseMovePrompt(text);

    if (!coords) {
      return {
        route: "desktop-tool-error",
        content: `${agentLeePersonaHeader("desktop-tool-error")}

Mouse move requested, but I need coordinates.

Use:

\`\`\`text
Agent Lee, move mouse to 500 500. ${DESKTOP_COMMAND_CONFIRM}
\`\`\``
      };
    }

    const command = `
$ErrorActionPreference = "Continue"

Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;

public class AgentLeeChatMouseMove {
  [DllImport("user32.dll")]
  public static extern bool SetCursorPos(int X, int Y);
}
"@

[AgentLeeChatMouseMove]::SetCursorPos(${coords.x}, ${coords.y}) | Out-Null

[ordered]@{
  ok = $true
  tool = "mouse.move"
  x = ${coords.x}
  y = ${coords.y}
} | ConvertTo-Json -Depth 5
`;

    const result = await runDesktopTool("chat.mouse.move", command, 10000);

    return {
      route: "desktop-tool",
      tool: "mouse.move",
      content: desktopToolResponse("desktop-tool", "mouse.move", result.stdout, result.stderr)
    };
  }

  return null;
}

app.post("/v1/chat/completions", async (req, res) => {
  try {
    const userText = extractUserText(req.body.messages || []);
    const voiceTool = maybeHandleVoiceChatTool(userText);
    if (voiceTool) {
      return res.json(openAIResponse(voiceTool.content, "agent-lee", voiceTool.route));
    }

    const desktopTool = await maybeHandleDesktopChatTool(userText);
    if (desktopTool) {
      return res.json(openAIResponse(desktopTool.content, "agent-lee", desktopTool.route));
    }

    const taskType = classifyTask(userText);

    if (taskType === "status" || taskType === "casual") {
      return res.json(openAIResponse(agentLeeFastReply(taskType), "agent-lee", `${taskType}-fast`));
    }

    if (taskType === "light") {
      return res.json(openAIResponse(agentLeeLightReply(userText), "agent-lee", "light-fast"));
    }

    if (taskType === "turbo-code") {
      const templated = instantCodeTemplate(userText);
      if (templated) {
        return res.json(openAIResponse(templated, "agent-lee", "turbo-template"));
      }

      const final = await callOllama(MODELS.turbo, [
        { role: "system", content: agentLeeSystemBase(taskType, false) },
        {
          role: "user",
          content: `
Handle this as Agent Lee Turbo Code.

Request:
${userText}

Return code first. Keep it concise. Include only a short Leeway verification note.
`
        }
      ], { temperature: 0.08, num_ctx: 1536, num_predict: 420, timeoutMs: 45000 });

      return res.json(openAIResponse(`Route: turbo-code\n\n${final}`, "agent-lee", "turbo-code"));
    }

    if (taskType === "recovery-governed") {
      return res.json(openAIResponse(recoveryGovernedBlueprint(userText), "agent-lee", "recovery-governed"));
    }

    if (taskType === "review") {
      const templated = instantReviewTemplate(userText);
      if (templated) {
        return res.json(openAIResponse(templated, "agent-lee", "review-template"));
      }

      const review = await callOllama(MODELS.reviewer, [
        { role: "system", content: agentLeeSystemBase(taskType, true) },
        {
          role: "user",
          content: `
Review this against Leeway standards.

Request:
${userText}

Return:
- pass/fail
- top 3 issues
- required fix
- deployment risk
Keep it concise.
`
        }
      ], { temperature: 0.08, num_ctx: 2048, num_predict: 500, timeoutMs: 45000 });

      return res.json(openAIResponse(`Route: review-governed-fast\n\n${review}`, "agent-lee", "review-governed-fast"));
    }

    if (taskType === "coding") {
      const final = await callOllama(MODELS.fastCoder, [
        { role: "system", content: agentLeeSystemBase(taskType, false) },
        {
          role: "user",
          content: `
Handle this as Agent Lee coding speed lane.

Request:
${userText}

Return:
- code or commands first
- short plan only if needed
- concise Leeway-standard notes
- verification step if relevant
Keep output tight.
`
        }
      ], { temperature: 0.08, num_ctx: 2048, num_predict: 650, timeoutMs: 60000 });

      return res.json(openAIResponse(`Route: coding-speed\n\n${final}`, "agent-lee", "coding-speed"));
    }

    if (taskType === "coding-deep" || taskType === "review-deep") {
      const final = await callOllama(MODELS.deepCoder, [
        { role: "system", content: agentLeeSystemBase(taskType, true) },
        {
          role: "user",
          content: `
Handle this as Agent Lee deep governed coding.

Request:
${userText}

Return production-grade output with plan, implementation, review notes, verification, and deployment risk.
`
        }
      ], { temperature: 0.08, num_ctx: 4096, num_predict: 1200, timeoutMs: 120000 });

      return res.json(openAIResponse(`Route: deep-governed\n\n${final}`, "agent-lee", "deep-governed"));
    }

    if (taskType === "full-heavy-deep") {
      const final = await callOllama(MODELS.maxCoder, [
        { role: "system", content: agentLeeSystemBase(taskType, true) },
        {
          role: "user",
          content: `
Handle this as Agent Lee maximum governed enterprise build.

Request:
${userText}

Return:
1. Plan
2. Implementation
3. Leeway review
4. Verification
5. Deployment notes
Keep it bounded and production-grade.
`
        }
      ], { temperature: 0.08, num_ctx: 8192, num_predict: 1800, timeoutMs: 240000 });

      return res.json(openAIResponse(`Route: max-heavy-governed\n\n${final}`, "agent-lee", "max-heavy-governed"));
    }

    // Optimized full-heavy default: deterministic governed blueprint.
    const templatedFull = instantFullHeavyTemplate(userText);
    if (templatedFull) {
      return res.json(openAIResponse(templatedFull, "agent-lee", "full-heavy-template"));
    }

    return res.json(openAIResponse(genericFullHeavyBlueprint(userText), "agent-lee", "full-heavy-blueprint"));
  } catch (err) {
    const msg = err.name === "AbortError" ? "model call timed out" : err.message;
    return res.status(500).json(openAIResponse(`Agent Lee hit a runtime error: ${msg}`, "agent-lee", "error"));
  }
});

app.listen(PORT, () => {
  console.log(`Agent Lee's Coding Mode running on http://localhost:${PORT}`);
  console.log(`Ollama endpoint: ${OLLAMA_BASE_URL}`);
  console.log(`Governance corpus: ${GOVERNANCE_CORPUS_PATH}`);
  console.log(`Routing locked: instant/template/qwen3 speed lanes, explicit deep lanes, optimized full-heavy`);
});






















