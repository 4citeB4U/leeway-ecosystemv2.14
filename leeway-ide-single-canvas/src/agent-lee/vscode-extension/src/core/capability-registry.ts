/*
LEEWAY_HEADER - DO NOT REMOVE

TAG: CORE.RUNTIME.CAPABILITY_REGISTRY.MAIN
REGION: 🟢 CORE
PURPOSE: Builds the internal Agent Lee capability catalog from standalone runtime roots.
DISCOVERY_PIPELINE:
  Voice → Intent → Location → Vertical → Ranking → Render
*/

import * as fs from "fs";
import * as path from "path";
import type { ModelHiveStatus } from "./model-hive";
import { getInternalAgentsRoot, getInternalMcpRoot } from "./leeway-connectivity-loader";

export type CapabilityEntry = {
  id: string;
  kind: "mcp" | "agent" | "server";
  label: string;
  source: string;
  description?: string;
  location?: string;
  category?: string;
};

export type CapabilityCatalog = {
  leeway?: {
    LEEWAY_HEADER: string;
    REGION: string;
    TAG: string;
    DISCOVERY_PIPELINE: string;
  };
  generatedAt: string;
  sources: string[];
  entries: CapabilityEntry[];
  counts: {
    total: number;
    mcps: number;
    agents: number;
    servers: number;
  };
};

const ROOT = path.join(process.env.USERPROFILE || "", ".leeway-vscode");
const OUTPUT_FILE = path.join(ROOT, "agent-lee", "mcp", "generated-capability-catalog.json");
const WORKSPACE_AGENTS_ROOT = path.join(ROOT, "workspace", "agents");
const CAPABILITY_QUERY_PATTERN =
  /(?:\bwhat\b|\bwhich\b|\bshow\b|\btell\b|\blist\b|\bhow many\b).{0,80}?\b(mcp|mcps|capabilit(?:y|ies)|agent|agents|server|servers|model|models)\b/i;

function exists(target: string) {
  try {
    return fs.existsSync(target);
  } catch {
    return false;
  }
}

function uniqueExisting(paths: string[]) {
  return Array.from(new Set(paths.filter(Boolean))).filter(exists);
}

function resolveInternalAgentRoots() {
  return uniqueExisting([
    getInternalAgentsRoot()
  ]);
}

function resolveAntigravityRoots() {
  return uniqueExisting([
    path.join(ROOT, "MCP-VS-code-Antigavity"),
    path.join(process.cwd(), "MCP-VS-code-Antigavity"),
    "D:\\MCP-VS-code-Antigavity"
  ]);
}

function safeReadJson(target: string) {
  try {
    return JSON.parse(fs.readFileSync(target, "utf8"));
  } catch {
    return null;
  }
}

function walkFiles(root: string, matcher: RegExp, out: string[] = []) {
  if (!exists(root)) return out;

  for (const item of fs.readdirSync(root)) {
    const full = path.join(root, item);
    let stat: fs.Stats;
    try {
      stat = fs.statSync(full);
    } catch {
      continue;
    }

    if (stat.isDirectory()) {
      if (item === "node_modules" || item === ".git" || item === "dist" || item === "out") continue;
      walkFiles(full, matcher, out);
      continue;
    }

    if (matcher.test(full)) out.push(full);
  }

  return out;
}

function humanizeId(id: string) {
  return id
    .replace(/\.[^.]+$/, "")
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function scanAntigravityMcps(root: string) {
  const entries: CapabilityEntry[] = [];
  if (!exists(root)) return entries;

  for (const name of fs.readdirSync(root)) {
    const dir = path.join(root, name);
    if (!exists(dir) || !fs.statSync(dir).isDirectory()) continue;

    const pkg = safeReadJson(path.join(dir, "package.json"));
    const packageName = pkg?.name || name;
    const description = pkg?.description || "";

    if (!/mcp|stitch|banana|debugger/i.test(packageName) && !/mcp|stitch|banana|debugger/i.test(name)) {
      continue;
    }

    entries.push({
      id: name,
      kind: "mcp",
      label: packageName,
      source: "Antigravity",
      description,
      location: dir,
      category: "External MCP"
    });
  }

  return entries;
}

function scanInternalAgents(root: string) {
  const entries: CapabilityEntry[] = [];
  const files = walkFiles(root, /\.(ts|js|json|md)$/i);

  for (const file of files) {
    const relative = path.relative(root, file).replace(/\\/g, "/");
    const base = path.basename(file).replace(/\.(ts|js)$/i, "");
    const lower = base.toLowerCase();

    const isAgentFile =
      lower.includes("agent") ||
      /^(aria|atlas|nexus|nova|pixel|sage|shield|vector|ward|bus|observer|governor|registry|repair|runtime|sentinel|scaler)$/i.test(base);

    if (!isAgentFile) continue;

    const group = relative.split("/")[2] || "agents";
    entries.push({
      id: relative.replace(/\//g, ":"),
      kind: "agent",
      label: base,
      source: "Agent Lee Internal",
      location: file,
      category: group
    });
  }

  return entries;
}

function scanInternalMcp(root: string) {
  const entries: CapabilityEntry[] = [];
  const mcpRoot = path.join(root, "tools");
  const files = walkFiles(mcpRoot, /\.(ts|js|json)$/i);

  for (const file of files) {
    const base = path.basename(file).replace(/\.(ts|js)$/i, "");
    entries.push({
      id: base,
      kind: "mcp",
      label: base,
      source: "Agent Lee Internal",
      location: file,
      category: "MCP Agent"
    });
  }

  return entries;
}

function scanWorkspaceAgents(root: string) {
  const entries: CapabilityEntry[] = [];
  if (!exists(root)) return entries;

  for (const name of fs.readdirSync(root)) {
    const dir = path.join(root, name);
    if (!exists(dir) || !fs.statSync(dir).isDirectory()) continue;

    entries.push({
      id: name,
      kind: /mcp/i.test(name) ? "mcp" : "agent",
      label: humanizeId(name),
      source: "Workspace",
      location: dir,
      category: "Local Workspace"
    });
  }

  return entries;
}

function scanVsCodeMcpServers(root: string) {
  const entries: CapabilityEntry[] = [];
  const settingsFile = path.join(root, "adapters", "vscode-mcp-settings-snippet.json");
  const settings = safeReadJson(settingsFile);
  const servers = settings?.mcpServers || {};

  for (const [id, config] of Object.entries<any>(servers)) {
    entries.push({
      id,
      kind: "server",
      label: id,
      source: "Agent Lee Internal",
      description: Array.isArray(config?.args) ? config.args.join(" ") : "",
      location: settingsFile,
      category: "VS Code MCP Server"
    });
  }

  return entries;
}

function dedupe(entries: CapabilityEntry[]) {
  const seen = new Set<string>();
  const output: CapabilityEntry[] = [];

  for (const entry of entries) {
    const key = `${entry.kind}:${entry.id}:${entry.source}`;
    if (seen.has(key)) continue;
    seen.add(key);
    output.push(entry);
  }

  return output.sort((a, b) => a.label.localeCompare(b.label));
}

function summarizeCounts(entries: CapabilityEntry[]) {
  return {
    total: entries.length,
    mcps: entries.filter((entry) => entry.kind === "mcp").length,
    agents: entries.filter((entry) => entry.kind === "agent").length,
    servers: entries.filter((entry) => entry.kind === "server").length
  };
}

export function buildCapabilityCatalog() {
  const antigravityRoots = resolveAntigravityRoots();
  const internalAgentRoots = resolveInternalAgentRoots();
  const internalMcpRoots = uniqueExisting([getInternalMcpRoot()]);
  const entries = dedupe([
    ...antigravityRoots.flatMap((root) => scanAntigravityMcps(root)),
    ...internalAgentRoots.flatMap((root) => scanInternalAgents(root)),
    ...internalMcpRoots.flatMap((root) => scanInternalMcp(root)),
    ...scanWorkspaceAgents(WORKSPACE_AGENTS_ROOT),
    ...internalMcpRoots.flatMap((root) => scanVsCodeMcpServers(root))
  ]);

  const catalog: CapabilityCatalog = {
    leeway: {
      LEEWAY_HEADER: "DO NOT REMOVE",
      REGION: "🟣 MCP",
      TAG: "MCP.CATALOG.CAPABILITY.GENERATED",
      DISCOVERY_PIPELINE: "Voice → Intent → Location → Vertical → Ranking → Render"
    },
    generatedAt: new Date().toISOString(),
    sources: [...antigravityRoots, ...internalAgentRoots, ...internalMcpRoots, WORKSPACE_AGENTS_ROOT].filter(exists),
    entries,
    counts: summarizeCounts(entries)
  };

  try {
    fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(catalog, null, 2), "utf8");
  } catch (err) {
    console.warn("[Agent Lee] Failed to write capability catalog:", err);
  }
  return catalog;
}

export function loadCapabilityCatalog() {
  if (exists(OUTPUT_FILE)) {
    const json = safeReadJson(OUTPUT_FILE);
    if (json?.entries) return json as CapabilityCatalog;
  }
  return buildCapabilityCatalog();
}

export function formatCapabilitySummary(catalog: CapabilityCatalog) {
  const bySource = new Map<string, CapabilityEntry[]>();
  for (const entry of catalog.entries) {
    const bucket = bySource.get(entry.source) || [];
    bucket.push(entry);
    bySource.set(entry.source, bucket);
  }

  const lines = [
    `Capability catalog generated: ${catalog.generatedAt}`,
    `Totals: ${catalog.counts.total} connected items | MCPs: ${catalog.counts.mcps} | Agents: ${catalog.counts.agents} | VS Code MCP servers: ${catalog.counts.servers}`
  ];

  for (const [source, entries] of bySource) {
    const mcps = entries.filter((entry) => entry.kind === "mcp").slice(0, 20).map((entry) => entry.label);
    const agents = entries.filter((entry) => entry.kind === "agent").slice(0, 20).map((entry) => entry.label);
    const servers = entries.filter((entry) => entry.kind === "server").slice(0, 20).map((entry) => entry.label);

    lines.push(`Source: ${source}`);
    if (mcps.length) lines.push(`- MCPs: ${mcps.join(", ")}`);
    if (agents.length) lines.push(`- Agents: ${agents.join(", ")}`);
    if (servers.length) lines.push(`- Servers: ${servers.join(", ")}`);
  }

  return lines.join("\n");
}

export function searchCapabilityCatalog(catalog: CapabilityCatalog, query: string, limit = 8) {
  const normalized = query.toLowerCase().trim();
  if (!normalized) return [];

  const terms = normalized.split(/[^a-z0-9]+/i).filter(Boolean);
  const scored = catalog.entries.map((entry) => {
    const haystack = [
      entry.id,
      entry.label,
      entry.source,
      entry.description || "",
      entry.location || "",
      entry.category || "",
      entry.kind
    ].join(" ").toLowerCase();

    let score = 0;
    if (entry.id.toLowerCase() === normalized || entry.label.toLowerCase() === normalized) score += 120;
    if (entry.id.toLowerCase().includes(normalized)) score += 70;
    if (entry.label.toLowerCase().includes(normalized)) score += 60;
    if ((entry.description || "").toLowerCase().includes(normalized)) score += 30;
    if ((entry.category || "").toLowerCase().includes(normalized)) score += 20;

    for (const term of terms) {
      if (haystack.includes(term)) score += 12;
    }

    return { entry, score };
  })
  .filter((item) => item.score > 0)
  .sort((a, b) => b.score - a.score || a.entry.label.localeCompare(b.entry.label))
  .slice(0, limit)
  .map((item) => item.entry);

  return scored;
}

export function isCapabilityQuestion(query: string) {
  const lowered = query.toLowerCase();
  if (/\b(what's going on|whats going on|what's happening|whats happening|what are you up to|what are you doing|how are you|how you doing)\b/i.test(query)) {
    return false;
  }
  return (
    lowered.includes("capabilities") ||
    lowered.includes("workflow") ||
    lowered.includes("what can you help build") ||
    lowered.includes("what can you build") ||
    lowered.includes("what can you help me build") ||
    lowered.includes("how many agents") ||
    lowered.includes("how many mcps") ||
    lowered.includes("connected agents") ||
    lowered.includes("connected to") ||
    lowered.includes("what models") ||
    lowered.includes("what can you do") ||
    lowered.includes("what are you capable of") ||
    lowered.includes("what mcp") ||
    lowered.includes("which mcp") ||
    lowered.includes("available to use") ||
    CAPABILITY_QUERY_PATTERN.test(query)
  );
}

function listLabels(entries: CapabilityEntry[], kind: CapabilityEntry["kind"], limit = 5) {
  return entries
    .filter((entry) => entry.kind === kind)
    .slice(0, limit)
    .map((entry) => entry.label);
}

function formatSourceFamily(entries: CapabilityEntry[]) {
  const mcps = listLabels(entries, "mcp");
  const agents = listLabels(entries, "agent");
  const servers = listLabels(entries, "server");
  const parts: string[] = [];

  if (mcps.length) parts.push(`MCPs like ${mcps.join(", ")}`);
  if (agents.length) parts.push(`agents like ${agents.join(", ")}`);
  if (servers.length) parts.push(`servers like ${servers.join(", ")}`);

  return parts.join("; ");
}

export function buildCapabilityAnswer(args: {
  catalog: CapabilityCatalog;
  matches: CapabilityEntry[];
  hive: ModelHiveStatus;
  primaryModel: string;
}) {
  const bySource = new Map<string, CapabilityEntry[]>();
  for (const entry of args.catalog.entries) {
    const bucket = bySource.get(entry.source) || [];
    bucket.push(entry);
    bySource.set(entry.source, bucket);
  }

  const activeHive = args.hive.roles.filter((role) =>
    role.role === "builder_model" ||
    role.role === "designer_ux_model" ||
    role.role === "verifier_model"
  );

  const lines: string[] = [
    `I can work across ${args.catalog.counts.total} connected capabilities in this runtime.`,
    `My main lanes are repository work, UI systems, debugging, automation, agent and MCP wiring, local tooling, validation, and governed packaging.`
  ];

  if (activeHive.length) {
    lines.push(`My active build stack is ${activeHive.map((role) => `${role.label}: ${role.selected}`).join(" | ")}.`);
  }

  const familyLines = Array.from(bySource.entries())
    .map(([source, entries]) => {
      const summary = formatSourceFamily(entries);
      if (!summary) return "";
      return `- ${source}: ${summary}.`;
    })
    .filter(Boolean);

  if (familyLines.length) {
    lines.push("", "Active subsystem families:");
    lines.push(...familyLines);
  }

  if (args.matches.length) {
    lines.push("", "Closest capability matches:");
    lines.push(
      ...args.matches.map((entry) =>
        `- ${entry.label} [${entry.kind}] from ${entry.source}${entry.description ? `: ${entry.description}` : ""}${entry.location ? ` | ${entry.location}` : ""}`
      )
    );
  }
  lines.push("", "Tell me what you want me to inspect, build, or fix, and I can use the right path directly.");

  return lines.join("\n");
}
