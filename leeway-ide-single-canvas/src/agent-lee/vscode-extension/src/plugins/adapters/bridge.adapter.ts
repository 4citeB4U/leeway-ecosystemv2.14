/*
LEEWAY HEADER — DO NOT REMOVE

REGION: 🟣 MCP
TAG: MCP.PLUGIN.BRIDGE.ADAPTER

5WH:
WHAT = Generic bridge adapter for approved plugin backends
WHY = Lets Agent Lee route the wider plugin inventory through one governed bridge
WHO = Agent Lee Plugin Runtime
WHERE = src/plugins/adapters/bridge.adapter.ts
WHEN = 2026
HOW = Local plugin bridge POST interface by plugin id and action

AGENTS:
PLUGIN_ROUTER
SHIELD
AUDIT

LICENSE:
MIT
*/

import type { PluginAdapter, PluginCallInput, PluginCallResult } from "../plugin.types";
import { createPluginError, createPluginResult, safeJsonFetch } from "./base.adapter";

const LOCAL_PLUGIN_BRIDGE = process.env.AGENT_LEE_PLUGIN_BRIDGE || "http://localhost:7660/plugins";

export const bridgeAdapter: PluginAdapter = {
  pluginId: "bridge",

  canHandle(_input: PluginCallInput) {
    return true;
  },

  async execute(input: PluginCallInput): Promise<PluginCallResult> {
    try {
      const data = await safeJsonFetch(`${LOCAL_PLUGIN_BRIDGE}/${input.pluginId}/${input.action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          params: input.params || {},
          userIntent: input.userIntent,
          dryRun: input.dryRun ?? false,
          workspaceId: input.workspaceId,
          userId: input.userId
        })
      });

      return createPluginResult(input, `Agent Lee routed ${input.pluginId}.${input.action} through the plugin bridge.`, data);
    } catch (error) {
      return createPluginError(input, error);
    }
  }
};

/*
DISCOVERY_PIPELINE:
Voice → Intent → Location → Vertical → Ranking → Render
*/
