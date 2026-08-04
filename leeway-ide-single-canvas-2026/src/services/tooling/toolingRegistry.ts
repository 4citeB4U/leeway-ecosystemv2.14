import mcpRegistry from "../../agent-lee/mcp/mcp-registry.json";
import leewayMcpRegistry from "../../agent-lee/mcp/leeway-mcp-registry.json";

export interface ToolingRegistryEntry {
  id: string;
  name: string;
  category: string;
  description?: string;
  source: "workspace" | "leeway" | "builtin";
  enabled: boolean;
  route?: string;
  capabilities?: string[];
}

export interface ToolingSnapshot {
  generatedAt: string;
  mcpCount: number;
  enabledCount: number;
  entries: ToolingRegistryEntry[];
}

function normalizeEntry(input: any, source: "workspace" | "leeway" | "builtin", fallbackCategory = "tooling"): ToolingRegistryEntry {
  if (source === "leeway") {
    return {
      id: input.id || input.name || "unknown",
      name: input.name || input.id || "Unnamed tool",
      category: input.category || fallbackCategory,
      description: input.purpose || input.description || "LeeWay-managed capability",
      source,
      enabled: true,
      route: input.route,
      capabilities: Array.isArray(input.tools) ? input.tools : undefined,
    };
  }

  return {
    id: input.id || input.name || "unknown",
    name: input.name || input.id || "Unnamed tool",
    category: input.category || fallbackCategory,
    description: input.description || input.purpose || "Registered capability",
    source,
    enabled: Boolean(input.enabled ?? true),
    route: input.route,
    capabilities: Array.isArray(input.capabilities) ? input.capabilities : undefined,
  };
}

function dedupeEntries(entries: ToolingRegistryEntry[]): ToolingRegistryEntry[] {
  const byId = new Map<string, ToolingRegistryEntry>();
  entries.forEach((entry) => {
    const key = (entry.id || entry.name || "").trim().toLowerCase();
    if (!key) return;
    if (!byId.has(key)) {
      byId.set(key, entry);
    }
  });
  return Array.from(byId.values());
}

function loadWorkspaceMcpEntries(): ToolingRegistryEntry[] {
  const entries = Array.isArray((mcpRegistry as any)?.tools) ? (mcpRegistry as any).tools : [];
  return entries.map((entry: any) => normalizeEntry(entry, "workspace", "mcp"));
}

function loadLeewayMcpEntries(): ToolingRegistryEntry[] {
  const entries = Array.isArray((leewayMcpRegistry as any)?.tools) ? (leewayMcpRegistry as any).tools : [];
  return entries.map((entry: any) => normalizeEntry(entry, "leeway", "mcp"));
}

export function buildToolingSnapshot(): ToolingSnapshot {
  const entries = dedupeEntries([
    ...loadWorkspaceMcpEntries(),
    ...loadLeewayMcpEntries(),
  ]);

  return {
    generatedAt: new Date().toISOString(),
    mcpCount: entries.length,
    enabledCount: entries.filter((entry) => entry.enabled).length,
    entries,
  };
}

export function getToolingSnapshot(): ToolingSnapshot {
  return buildToolingSnapshot();
}
