/*
LEEWAY HEADER — DO NOT REMOVE

REGION: 🟣 MCP
TAG: MCP.PLUGIN.GMAIL.ADAPTER

5WH:
WHAT = Gmail plugin adapter
WHY = Lets Agent Lee draft, read, and send email through approved OAuth backend
WHO = Agent Lee Plugin Runtime
WHERE = src/plugins/adapters/gmail.adapter.ts
WHEN = 2026
HOW = Local backend bridge, never raw secrets in frontend

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

export const gmailAdapter: PluginAdapter = {
  pluginId: "gmail",

  canHandle(input: PluginCallInput) {
    return input.pluginId === "gmail";
  },

  async execute(input: PluginCallInput): Promise<PluginCallResult> {
    try {
      if (input.action === "searchEmails") {
        const data = await safeJsonFetch(`${LOCAL_PLUGIN_BRIDGE}/gmail/search`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input.params || {})
        });
        return createPluginResult(input, "Searched Gmail messages.", data);
      }

      if (input.action === "createDraft") {
        const data = await safeJsonFetch(`${LOCAL_PLUGIN_BRIDGE}/gmail/draft`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input.params || {})
        });
        return createPluginResult(input, "Created Gmail draft.", data);
      }

      if (input.action === "sendEmail") {
        const data = await safeJsonFetch(`${LOCAL_PLUGIN_BRIDGE}/gmail/send`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input.params || {})
        });
        return createPluginResult(input, "Sent Gmail message.", data);
      }

      throw new Error(`Unsupported Gmail action: ${input.action}`);
    } catch (error) {
      return createPluginError(input, error);
    }
  }
};

/*
DISCOVERY_PIPELINE:
Voice → Intent → Location → Vertical → Ranking → Render
*/
