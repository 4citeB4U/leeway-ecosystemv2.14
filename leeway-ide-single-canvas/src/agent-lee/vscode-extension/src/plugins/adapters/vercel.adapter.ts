/*
LEEWAY HEADER — DO NOT REMOVE

REGION: 🟣 MCP
TAG: MCP.PLUGIN.VERCEL.ADAPTER

5WH:
WHAT = Vercel plugin adapter
WHY = Lets Agent Lee inspect and manage Vercel deployments safely
WHO = Agent Lee Plugin Runtime
WHERE = src/plugins/adapters/vercel.adapter.ts
WHEN = 2026
HOW = Vercel API wrapper with confirmation gate upstream

AGENTS:
PLUGIN_ROUTER
SHIELD
AUDIT

LICENSE:
MIT
*/

import type { PluginAdapter, PluginCallInput, PluginCallResult } from "../plugin.types";
import { createPluginError, createPluginResult, safeJsonFetch } from "./base.adapter";

const VERCEL_API = "https://api.vercel.com";

export const vercelAdapter: PluginAdapter = {
  pluginId: "vercel",

  canHandle(input: PluginCallInput) {
    return input.pluginId === "vercel";
  },

  async execute(input: PluginCallInput): Promise<PluginCallResult> {
    try {
      const token = process.env.VERCEL_TOKEN;
      if (!token) throw new Error("Missing VERCEL_TOKEN.");

      const headers = {
        Authorization: `Bearer ${token}`
      };

      if (input.action === "listProjects") {
        const data = await safeJsonFetch(`${VERCEL_API}/v9/projects`, { headers });
        return createPluginResult(input, "Fetched Vercel projects.", data);
      }

      if (input.action === "listDeployments") {
        const data = await safeJsonFetch(`${VERCEL_API}/v6/deployments`, { headers });
        return createPluginResult(input, "Fetched Vercel deployments.", data);
      }

      throw new Error(`Unsupported Vercel action: ${input.action}`);
    } catch (error) {
      return createPluginError(input, error);
    }
  }
};

/*
DISCOVERY_PIPELINE:
Voice → Intent → Location → Vertical → Ranking → Render
*/
