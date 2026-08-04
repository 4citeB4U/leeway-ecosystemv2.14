/*
LEEWAY HEADER — DO NOT REMOVE

REGION: 🧠 AI
TAG: AI.PLUGIN.REGISTRY.TYPES

5WH:
WHAT = Shared Agent Lee plugin type system
WHY = Gives Agent Lee one governed way to understand all plugin connectors
WHO = Agent Lee Plugin Runtime
WHERE = src/plugins/plugin.types.ts
WHEN = 2026
HOW = TypeScript interfaces and execution contracts

AGENTS:
PRIME
PLUGIN_ROUTER
AUDIT
SHIELD

LICENSE:
MIT
*/

export type PluginCategory =
  | "coding"
  | "deployment"
  | "design"
  | "productivity"
  | "research"
  | "finance"
  | "crm"
  | "communication"
  | "database"
  | "analytics"
  | "observability"
  | "storage"
  | "security"
  | "automation"
  | "other";

export type PluginRiskLevel = "low" | "medium" | "high" | "critical";

export type PluginAuthMode =
  | "none"
  | "apiKey"
  | "oauth"
  | "mcp"
  | "local"
  | "manual";

export type PluginPermission =
  | "read"
  | "write"
  | "send"
  | "deploy"
  | "delete"
  | "billing"
  | "admin";

export interface AgentLeePlugin {
  id: string;
  name: string;
  category: PluginCategory;
  description: string;
  authMode: PluginAuthMode;
  permissions: PluginPermission[];
  riskLevel: PluginRiskLevel;
  enabled: boolean;
  requiresConfirmation: boolean;
  tags: string[];
  adapter: string;
}

export interface PluginCallInput {
  pluginId: string;
  action: string;
  params?: Record<string, unknown>;
  userIntent: string;
  userId?: string;
  workspaceId?: string;
  dryRun?: boolean;
  sourceUnit?: string;
  sourceType?: "user" | "agent" | "plugin" | "runtime" | "bridge" | "external";
  requestReceiptId?: string;
  capabilityProof?: string[] | string;
  securityZone?: string;
}

export interface PluginCallResult {
  ok: boolean;
  pluginId: string;
  action: string;
  summary: string;
  data?: unknown;
  error?: string;
  receiptId?: string;
  requiresFollowUp?: boolean;
}

export interface PluginAdapter {
  pluginId: string;
  canHandle(input: PluginCallInput): boolean;
  execute(input: PluginCallInput): Promise<PluginCallResult>;
}

export interface PluginMeshEntry {
  id: string;
  name: string;
  category: PluginCategory;
  riskLevel: PluginRiskLevel;
  enabled: boolean;
  adapter: string;
  adapterAvailable: boolean;
  authMode: PluginAuthMode;
  authConfigured: boolean;
  requiresConfirmation: boolean;
}

/*
DISCOVERY_PIPELINE:
Voice → Intent → Location → Vertical → Ranking → Render
*/
