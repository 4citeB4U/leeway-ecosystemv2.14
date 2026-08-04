/*
LEEWAY HEADER — DO NOT REMOVE

REGION: 🧠 AI
TAG: AI.PLUGIN.REGISTRY.MAIN

5WH:
WHAT = Agent Lee master plugin registry
WHY = Lets Agent Lee discover, route, and govern all plugin connectors
WHO = Agent Lee Plugin Runtime
WHERE = src/plugins/plugin.registry.ts
WHEN = 2026
HOW = Catalog-driven registry with safe metadata and adapter mapping

AGENTS:
PRIME
PLUGIN_ROUTER
AUDIT
SHIELD

LICENSE:
MIT
*/

import { DEFAULT_PLUGIN_CATALOG, PluginCatalogEntry } from "../core/settings-catalog";
import type {
  AgentLeePlugin,
  PluginAuthMode,
  PluginCategory,
  PluginPermission,
  PluginRiskLevel
} from "./plugin.types";

type PluginOverride = Partial<Omit<AgentLeePlugin, "id" | "name" | "description" | "enabled">>;

const PLUGIN_ALIASES: Record<string, string> = {
  googlecalendar: "google-calendar",
  googlecalendarapp: "google-calendar",
  googledrive: "google-drive",
  googlemail: "gmail",
  githubapp: "github",
  neon: "neon-postgres",
  postgres: "neon-postgres",
  sendgridapp: "sendgrid",
  hubspotcrm: "hubspot"
};

const PLUGIN_OVERRIDES: Record<string, PluginOverride> = {
  github: {
    category: "coding",
    authMode: "apiKey",
    permissions: ["read", "write", "admin"],
    riskLevel: "high",
    requiresConfirmation: true,
    tags: ["repo", "git", "issues", "pull-requests", "ci"],
    adapter: "githubAdapter"
  },
  vercel: {
    category: "deployment",
    authMode: "apiKey",
    permissions: ["read", "deploy", "admin"],
    riskLevel: "high",
    requiresConfirmation: true,
    tags: ["deploy", "frontend", "hosting"],
    adapter: "vercelAdapter"
  },
  netlify: {
    category: "deployment",
    authMode: "apiKey",
    permissions: ["read", "deploy", "admin"],
    riskLevel: "high",
    requiresConfirmation: true,
    tags: ["deploy", "hosting", "static"],
    adapter: "bridgeAdapter"
  },
  cloudflare: {
    category: "deployment",
    authMode: "apiKey",
    permissions: ["read", "write", "deploy", "admin"],
    riskLevel: "critical",
    requiresConfirmation: true,
    tags: ["dns", "workers", "edge", "security"],
    adapter: "bridgeAdapter"
  },
  sentry: {
    category: "observability",
    authMode: "apiKey",
    permissions: ["read", "write"],
    riskLevel: "medium",
    requiresConfirmation: false,
    tags: ["errors", "monitoring", "debug"],
    adapter: "bridgeAdapter"
  },
  figma: {
    category: "design",
    authMode: "oauth",
    permissions: ["read", "write"],
    riskLevel: "medium",
    requiresConfirmation: true,
    tags: ["design", "ui", "prototype"],
    adapter: "bridgeAdapter"
  },
  canva: {
    category: "design",
    authMode: "oauth",
    permissions: ["read", "write"],
    riskLevel: "medium",
    requiresConfirmation: true,
    tags: ["design", "social", "graphics"],
    adapter: "bridgeAdapter"
  },
  gmail: {
    category: "communication",
    authMode: "oauth",
    permissions: ["read", "write", "send", "delete"],
    riskLevel: "critical",
    requiresConfirmation: true,
    tags: ["email", "inbox", "send"],
    adapter: "gmailAdapter"
  },
  "google-calendar": {
    category: "productivity",
    authMode: "oauth",
    permissions: ["read", "write", "delete"],
    riskLevel: "high",
    requiresConfirmation: true,
    tags: ["calendar", "schedule", "events"],
    adapter: "bridgeAdapter"
  },
  slack: {
    category: "communication",
    authMode: "oauth",
    permissions: ["read", "write", "send"],
    riskLevel: "high",
    requiresConfirmation: true,
    tags: ["chat", "team", "messages"],
    adapter: "bridgeAdapter"
  },
  notion: {
    category: "productivity",
    authMode: "oauth",
    permissions: ["read", "write", "delete"],
    riskLevel: "high",
    requiresConfirmation: true,
    tags: ["docs", "notes", "knowledge"],
    adapter: "bridgeAdapter"
  },
  "google-drive": {
    category: "storage",
    authMode: "oauth",
    permissions: ["read", "write", "delete"],
    riskLevel: "high",
    requiresConfirmation: true,
    tags: ["drive", "docs", "sheets", "slides"],
    adapter: "bridgeAdapter"
  },
  stripe: {
    category: "finance",
    authMode: "apiKey",
    permissions: ["read", "write", "billing"],
    riskLevel: "critical",
    requiresConfirmation: true,
    tags: ["payments", "billing", "checkout"],
    adapter: "bridgeAdapter"
  },
  sendgrid: {
    category: "communication",
    authMode: "apiKey",
    permissions: ["send", "write", "read"],
    riskLevel: "high",
    requiresConfirmation: true,
    tags: ["email", "marketing", "transactional"],
    adapter: "bridgeAdapter"
  },
  hubspot: {
    category: "crm",
    authMode: "oauth",
    permissions: ["read", "write", "delete", "admin"],
    riskLevel: "critical",
    requiresConfirmation: true,
    tags: ["crm", "sales", "contacts"],
    adapter: "bridgeAdapter"
  },
  supabase: {
    category: "database",
    authMode: "apiKey",
    permissions: ["read", "write", "delete", "admin"],
    riskLevel: "critical",
    requiresConfirmation: true,
    tags: ["database", "auth", "storage"],
    adapter: "bridgeAdapter"
  },
  "neon-postgres": {
    category: "database",
    authMode: "apiKey",
    permissions: ["read", "write", "delete", "admin"],
    riskLevel: "critical",
    requiresConfirmation: true,
    tags: ["postgres", "database", "sql"],
    adapter: "bridgeAdapter"
  },
  semrush: {
    category: "analytics",
    authMode: "apiKey",
    permissions: ["read"],
    riskLevel: "medium",
    requiresConfirmation: false,
    tags: ["seo", "traffic", "keywords"],
    adapter: "bridgeAdapter"
  },
  zotero: {
    category: "research",
    authMode: "oauth",
    permissions: ["read", "write"],
    riskLevel: "medium",
    requiresConfirmation: true,
    tags: ["research", "papers", "citations"],
    adapter: "bridgeAdapter"
  },
  scite: {
    category: "research",
    authMode: "apiKey",
    permissions: ["read"],
    riskLevel: "medium",
    requiresConfirmation: false,
    tags: ["research", "citations", "science"],
    adapter: "bridgeAdapter"
  }
};

function normalizeCategory(category: string, pluginId: string): PluginCategory {
  const lowered = category.toLowerCase();
  if (PLUGIN_OVERRIDES[pluginId]?.category) return PLUGIN_OVERRIDES[pluginId].category as PluginCategory;
  if (lowered === "coding") return "coding";
  if (lowered === "design") return "design";
  if (lowered === "productivity") return "productivity";
  if (lowered === "research") return "research";
  return "other";
}

function inferAuthMode(entry: PluginCatalogEntry, category: PluginCategory): PluginAuthMode {
  const text = `${entry.name} ${entry.description}`.toLowerCase();
  if (text.includes("oauth")) return "oauth";
  if (category === "design" || category === "productivity" || text.includes("gmail") || text.includes("calendar")) return "oauth";
  if (text.includes("mcp")) return "mcp";
  if (text.includes("local")) return "local";
  return "apiKey";
}

function inferPermissions(entry: PluginCatalogEntry, category: PluginCategory): PluginPermission[] {
  const text = `${entry.name} ${entry.description}`.toLowerCase();
  const permissions = new Set<PluginPermission>(["read"]);
  if (text.includes("manage") || text.includes("create") || text.includes("draft") || text.includes("build")) permissions.add("write");
  if (text.includes("deploy")) permissions.add("deploy");
  if (text.includes("delete") || text.includes("remove")) permissions.add("delete");
  if (text.includes("payment") || text.includes("billing")) permissions.add("billing");
  if (text.includes("admin") || category === "deployment" || category === "database") permissions.add("admin");
  if (text.includes("email") || text.includes("send")) permissions.add("send");
  return [...permissions];
}

function inferRiskLevel(category: PluginCategory, permissions: PluginPermission[]): PluginRiskLevel {
  if (permissions.includes("billing") || permissions.includes("admin") || permissions.includes("delete")) return "critical";
  if (permissions.includes("deploy") || permissions.includes("send") || permissions.includes("write")) return "high";
  if (category === "research" || category === "design" || category === "analytics" || category === "observability") return "medium";
  return "low";
}

function buildDefaultTags(entry: PluginCatalogEntry): string[] {
  return `${entry.name} ${entry.description}`
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((part) => part && part.length > 2)
    .filter((part, index, list) => list.indexOf(part) === index)
    .slice(0, 10);
}

export const AGENT_LEE_PLUGINS: AgentLeePlugin[] = DEFAULT_PLUGIN_CATALOG.map((entry) => {
  const override = PLUGIN_OVERRIDES[entry.id] || {};
  const category = normalizeCategory(entry.category, entry.id);
  const permissions = override.permissions || inferPermissions(entry, category);
  const riskLevel = override.riskLevel || inferRiskLevel(category, permissions);

  return {
    id: entry.id,
    name: entry.name,
    category,
    description: entry.description,
    authMode: override.authMode || inferAuthMode(entry, category),
    permissions,
    riskLevel,
    enabled: true,
    requiresConfirmation: override.requiresConfirmation ?? (riskLevel === "high" || riskLevel === "critical"),
    tags: override.tags || buildDefaultTags(entry),
    adapter: override.adapter || "bridgeAdapter"
  };
});

export function normalizePluginId(id: string): string {
  const normalized = id.trim().toLowerCase();
  return PLUGIN_ALIASES[normalized] || normalized;
}

export function resolvePluginCatalog(enabledPluginIds: string[] = []): AgentLeePlugin[] {
  const normalizedEnabled = new Set(enabledPluginIds.map(normalizePluginId));
  const useOpenMesh = normalizedEnabled.size === 0;
  return AGENT_LEE_PLUGINS.map((plugin) => ({
    ...plugin,
    enabled: useOpenMesh || normalizedEnabled.has(plugin.id)
  }));
}

export function getPluginById(id: string, enabledPluginIds: string[] = []): AgentLeePlugin | undefined {
  const normalized = normalizePluginId(id);
  return resolvePluginCatalog(enabledPluginIds).find((plugin) => plugin.id === normalized);
}

export function getPluginsByCategory(category: AgentLeePlugin["category"], enabledPluginIds: string[] = []): AgentLeePlugin[] {
  return resolvePluginCatalog(enabledPluginIds).filter((plugin) => plugin.category === category);
}

export function searchPlugins(query: string, enabledPluginIds: string[] = []): AgentLeePlugin[] {
  const q = query.toLowerCase();
  return resolvePluginCatalog(enabledPluginIds).filter((plugin) => (
    plugin.id.toLowerCase().includes(q) ||
    plugin.name.toLowerCase().includes(q) ||
    plugin.description.toLowerCase().includes(q) ||
    plugin.tags.some((tag) => tag.toLowerCase().includes(q))
  ));
}

/*
DISCOVERY_PIPELINE:
Voice → Intent → Location → Vertical → Ranking → Render
*/
