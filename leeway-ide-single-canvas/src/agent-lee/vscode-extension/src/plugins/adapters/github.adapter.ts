/*
LEEWAY HEADER — DO NOT REMOVE

REGION: 🟣 MCP
TAG: MCP.PLUGIN.GITHUB.ADAPTER

5WH:
WHAT = GitHub plugin adapter
WHY = Lets Agent Lee inspect repositories, issues, pull requests, and CI safely
WHO = Agent Lee Plugin Runtime
WHERE = src/plugins/adapters/github.adapter.ts
WHEN = 2026
HOW = GitHub REST API wrapper

AGENTS:
PLUGIN_ROUTER
SHIELD
AUDIT

LICENSE:
MIT
*/

import type { PluginAdapter, PluginCallInput, PluginCallResult } from "../plugin.types";
import { createPluginError, createPluginResult, safeJsonFetch } from "./base.adapter";

const GITHUB_API = "https://api.github.com";

export const githubAdapter: PluginAdapter = {
  pluginId: "github",

  canHandle(input: PluginCallInput) {
    return input.pluginId === "github";
  },

  async execute(input: PluginCallInput): Promise<PluginCallResult> {
    try {
      const token = process.env.GITHUB_TOKEN;
      if (!token) throw new Error("Missing GITHUB_TOKEN.");

      const owner = String(input.params?.owner || "");
      const repo = String(input.params?.repo || "");
      if (!owner || !repo) {
        throw new Error("GitHub call requires owner and repo.");
      }

      const headers = {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json"
      };

      if (input.action === "listIssues") {
        const data = await safeJsonFetch(`${GITHUB_API}/repos/${owner}/${repo}/issues`, { headers });
        return createPluginResult(input, `Fetched GitHub issues for ${owner}/${repo}.`, data);
      }

      if (input.action === "listPullRequests") {
        const data = await safeJsonFetch(`${GITHUB_API}/repos/${owner}/${repo}/pulls`, { headers });
        return createPluginResult(input, `Fetched GitHub pull requests for ${owner}/${repo}.`, data);
      }

      if (input.action === "listWorkflows") {
        const data = await safeJsonFetch(`${GITHUB_API}/repos/${owner}/${repo}/actions/workflows`, { headers });
        return createPluginResult(input, `Fetched GitHub workflows for ${owner}/${repo}.`, data);
      }

      throw new Error(`Unsupported GitHub action: ${input.action}`);
    } catch (error) {
      return createPluginError(input, error);
    }
  }
};

/*
DISCOVERY_PIPELINE:
Voice → Intent → Location → Vertical → Ranking → Render
*/
