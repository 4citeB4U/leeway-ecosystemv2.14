/*
LEEWAY HEADER — DO NOT REMOVE

REGION: 🧠 AI
TAG: AI.PLUGIN.ROUTER.MAIN
PURPOSE: Routes plugin calls under Agent Lee control and normalizes plugin output back through the sovereign runtime.

5WH:
WHAT = Agent Lee universal plugin router
WHY = Lets Agent Lee call any approved plugin through one governed interface
WHO = Agent Lee Plugin Runtime
WHERE = src/plugins/agentLeePluginRouter.ts
WHEN = 2026
HOW = Registry lookup + guard check + adapter execution + receipt logging

AGENTS:
PRIME
PLUGIN_ROUTER
SHIELD
AUDIT

LICENSE:
MIT
*/

import * as fs from "fs";
import * as path from "path";
import { getAdapterForPlugin } from "./plugin.adapters";
import { guardPluginCall } from "./plugin.guard";
import { getPluginById, resolvePluginCatalog, searchPlugins } from "./plugin.registry";
import type { PluginCallInput, PluginCallResult, PluginMeshEntry } from "./plugin.types";
import { performanceGovernor } from "../performance/performanceGovernor";
import { formatAgentRoutedMessage } from "../core/agent-governance";
import { recordAgentLeeRuntimeReceipt } from "../core/agent-lee-runtime-bootstrap";
import { appendFileWithRetries } from "../core/file-ops";
import { assessPluginTrust } from "../core/zero-trust";

const ROOT = path.join(process.env.USERPROFILE || "", ".leeway-vscode");
const RECEIPT_DIR = path.join(ROOT, "logs", "agent-lee");
const AUTH_ENV_MAP: Record<string, string[]> = {
  github: ["GITHUB_TOKEN"],
  vercel: ["VERCEL_TOKEN"],
  netlify: ["NETLIFY_TOKEN"],
  cloudflare: ["CLOUDFLARE_API_TOKEN"],
  sentry: ["SENTRY_AUTH_TOKEN"],
  gmail: ["AGENT_LEE_PLUGIN_BRIDGE"],
  "google-calendar": ["AGENT_LEE_PLUGIN_BRIDGE"],
  slack: ["AGENT_LEE_PLUGIN_BRIDGE"],
  notion: ["AGENT_LEE_PLUGIN_BRIDGE"],
  "google-drive": ["AGENT_LEE_PLUGIN_BRIDGE"],
  stripe: ["STRIPE_SECRET_KEY", "AGENT_LEE_PLUGIN_BRIDGE"],
  sendgrid: ["SENDGRID_API_KEY", "AGENT_LEE_PLUGIN_BRIDGE"],
  hubspot: ["HUBSPOT_PRIVATE_APP_TOKEN", "AGENT_LEE_PLUGIN_BRIDGE"],
  supabase: ["SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_URL", "AGENT_LEE_PLUGIN_BRIDGE"],
  "neon-postgres": ["NEON_API_KEY", "AGENT_LEE_PLUGIN_BRIDGE"],
  semrush: ["SEMRUSH_API_KEY", "AGENT_LEE_PLUGIN_BRIDGE"],
  zotero: ["ZOTERO_API_KEY", "AGENT_LEE_PLUGIN_BRIDGE"],
  scite: ["SCITE_API_KEY", "AGENT_LEE_PLUGIN_BRIDGE"],
  figma: ["AGENT_LEE_PLUGIN_BRIDGE"],
  canva: ["AGENT_LEE_PLUGIN_BRIDGE"]
};

export interface AgentLeePluginRouterOptions {
  userConfirmed?: boolean;
  dryRunDefault?: boolean;
  enabledPluginIds?: string[];
}

export class AgentLeePluginRouter {
  async callPlugin(
    input: PluginCallInput,
    options: AgentLeePluginRouterOptions = {}
  ): Promise<PluginCallResult> {
    const plugin = getPluginById(input.pluginId, options.enabledPluginIds || []);

    if (!plugin) {
      return {
        ok: false,
        pluginId: input.pluginId,
        action: input.action,
        summary: "Plugin not found.",
        error: `No plugin registered with ID: ${input.pluginId}`
      };
    }

    if (plugin.authMode === "mcp" && !performanceGovernor.canRunHeavyMcp()) {
      return {
        ok: false,
        pluginId: input.pluginId,
        action: input.action,
        summary: "Heavy MCP calls are disabled in the current performance profile.",
        error: "PERFORMANCE_BUDGET_BLOCKED"
      };
    }

    const trust = assessPluginTrust(plugin, input, options.userConfirmed ?? false);
    if (!trust.allowed) {
      return {
        ok: false,
        pluginId: input.pluginId,
        action: input.action,
        summary: trust.reason,
        error: trust.requiresConfirmation ? "CONFIRMATION_REQUIRED" : trust.reason,
        requiresFollowUp: trust.requiresConfirmation
      };
    }

    const guard = guardPluginCall(plugin, input, options.userConfirmed ?? false);
    if (!guard.allowed) {
      return {
        ok: false,
        pluginId: input.pluginId,
        action: input.action,
        summary: guard.reason,
        error: guard.requiresConfirmation ? "CONFIRMATION_REQUIRED" : guard.reason,
        requiresFollowUp: guard.requiresConfirmation
      };
    }

    const adapter = getAdapterForPlugin(plugin.id);
    if (!adapter) {
      return {
        ok: false,
        pluginId: input.pluginId,
        action: input.action,
        summary: "Plugin adapter missing.",
        error: `No adapter registered for plugin: ${input.pluginId}`
      };
    }

    const finalInput: PluginCallInput = {
      ...input,
      pluginId: plugin.id,
      dryRun: input.dryRun ?? options.dryRunDefault ?? false,
      sourceUnit: input.sourceUnit || trust.sourceUnit,
      sourceType: input.sourceType || trust.sourceType,
      requestReceiptId: input.requestReceiptId || trust.requestReceiptId,
      capabilityProof: input.capabilityProof || trust.capabilityProof,
      securityZone: input.securityZone || trust.securityZone
    };

    const result = await adapter.execute(finalInput);
    result.summary = formatAgentRoutedMessage(plugin.name || input.pluginId, result.summary);
    await this.writeReceipt(finalInput, result, trust);
    return result;
  }

  findPlugins(userText: string, enabledPluginIds: string[] = []) {
    return searchPlugins(userText, enabledPluginIds);
  }

  getPluginMesh(enabledPluginIds: string[] = []): PluginMeshEntry[] {
    return resolvePluginCatalog(enabledPluginIds).map((plugin) => ({
      id: plugin.id,
      name: plugin.name,
      category: plugin.category,
      riskLevel: plugin.riskLevel,
      enabled: plugin.enabled,
      adapter: plugin.adapter,
      adapterAvailable: Boolean(getAdapterForPlugin(plugin.id)),
      authMode: plugin.authMode,
      authConfigured: this.isPluginConfigured(plugin.id, plugin.authMode),
      requiresConfirmation: plugin.requiresConfirmation
    }));
  }

  private isPluginConfigured(pluginId: string, authMode: string) {
    if (authMode === "none") return true;
    const keys = AUTH_ENV_MAP[pluginId];
    if (!keys?.length) return authMode === "oauth" || authMode === "manual" || authMode === "mcp";
    return keys.some((key) => Boolean(process.env[key]));
  }

  private async writeReceipt(input: PluginCallInput, result: PluginCallResult, trust: ReturnType<typeof assessPluginTrust>) {
    fs.mkdirSync(RECEIPT_DIR, { recursive: true });
    const receipt = {
      ts: new Date().toISOString(),
      pluginId: input.pluginId,
      action: input.action,
      userIntent: input.userIntent,
      sourceUnit: trust.sourceUnit,
      sourceType: trust.sourceType,
      securityZone: trust.securityZone,
      verificationState: trust.verificationState,
      trustScore: trust.trustScore,
      requestReceiptId: trust.requestReceiptId,
      capabilityProof: trust.capabilityProof,
      ok: result.ok,
      summary: result.summary,
      error: result.error || "",
      receiptId: result.receiptId || ""
    };
    appendFileWithRetries(path.join(RECEIPT_DIR, "plugin-receipts.ndjson"), JSON.stringify(receipt) + "\n");
    recordAgentLeeRuntimeReceipt({
      event: "plugin.call.completed",
      pluginId: input.pluginId,
      action: input.action,
      sourceUnit: trust.sourceUnit,
      verificationState: trust.verificationState,
      trustScore: trust.trustScore,
      ok: result.ok,
      receiptId: result.receiptId || ""
    });
  }
}

/*
DISCOVERY_PIPELINE:
Voice → Intent → Location → Vertical → Ranking → Render
*/
