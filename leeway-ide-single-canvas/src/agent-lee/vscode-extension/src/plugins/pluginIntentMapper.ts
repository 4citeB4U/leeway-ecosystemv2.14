/*
LEEWAY HEADER — DO NOT REMOVE

REGION: 🧠 AI
TAG: AI.PLUGIN.INTENT.MAPPER

5WH:
WHAT = Natural-language plugin intent mapper
WHY = Lets Agent Lee convert user requests into plugin calls
WHO = Agent Lee Plugin Runtime
WHERE = src/plugins/pluginIntentMapper.ts
WHEN = 2026
HOW = Keyword routing first, model routing later

AGENTS:
PRIME
PLUGIN_ROUTER
ALIGN

LICENSE:
MIT
*/

import { normalizePluginId, searchPlugins } from "./plugin.registry";
import type { PluginCallInput } from "./plugin.types";

function inferGenericAction(userText: string, pluginId: string) {
  const text = userText.toLowerCase();

  if (pluginId === "github") {
    if (text.includes("pull request") || text.includes("pr")) return "listPullRequests";
    if (text.includes("workflow") || text.includes("ci")) return "listWorkflows";
    return "listIssues";
  }

  if (pluginId === "vercel") {
    if (text.includes("project")) return "listProjects";
    return "listDeployments";
  }

  if (pluginId === "gmail") {
    if (text.includes("send")) return "sendEmail";
    if (text.includes("draft")) return "createDraft";
    return "searchEmails";
  }

  if (text.includes("deploy") || text.includes("publish")) return "deploy";
  if (text.includes("send")) return "send";
  if (text.includes("delete") || text.includes("remove")) return "delete";
  if (text.includes("create") || text.includes("draft")) return "create";
  if (text.includes("update")) return "update";
  if (text.includes("search") || text.includes("find") || text.includes("look up")) return "search";
  return "read";
}

function extractRepoParams(text: string): { owner?: string; repo?: string } {
  const match = text.match(/github\.com\/([^/\s]+)\/([^/\s]+)/i);
  if (match) {
    return {
      owner: match[1],
      repo: match[2].replace(/\.git$/, "")
    };
  }
  return {};
}

function extractEmailParams(text: string) {
  const to = text.match(/\bto\s+([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})\b/i)?.[1];
  const subject = text.match(/\bsubject\s*[:\-]\s*["']?([^"'\n]+)["']?/i)?.[1];
  return {
    to,
    subject,
    query: text
  };
}

export function mapUserTextToPluginCall(userText: string, enabledPluginIds: string[] = []): PluginCallInput | null {
  const text = userText.toLowerCase();
  const exactNamed = searchPlugins(userText, enabledPluginIds).find((plugin) => text.includes(plugin.name.toLowerCase()) || text.includes(plugin.id));

  let pluginId = exactNamed?.id || "";

  if (!pluginId) {
    if (text.includes("github") || text.includes("repo") || text.includes("pull request") || text.includes("issue")) pluginId = "github";
    else if (text.includes("vercel")) pluginId = "vercel";
    else if (text.includes("gmail") || text.includes("email")) pluginId = "gmail";
    else if (text.includes("slack")) pluginId = "slack";
    else if (text.includes("calendar")) pluginId = "google-calendar";
    else if (text.includes("figma")) pluginId = "figma";
    else if (text.includes("canva")) pluginId = "canva";
    else if (text.includes("stripe") || text.includes("payment")) pluginId = "stripe";
    else if (text.includes("notion")) pluginId = "notion";
    else if (text.includes("drive") || text.includes("docs") || text.includes("sheets")) pluginId = "google-drive";
    else if (text.includes("supabase")) pluginId = "supabase";
    else if (text.includes("neon")) pluginId = "neon-postgres";
    else if (text.includes("hubspot")) pluginId = "hubspot";
    else if (text.includes("sentry")) pluginId = "sentry";
    else if (text.includes("semrush")) pluginId = "semrush";
    else if (text.includes("zotero")) pluginId = "zotero";
    else if (text.includes("scite")) pluginId = "scite";
  }

  if (!pluginId) return null;

  const normalizedPluginId = normalizePluginId(pluginId);
  const action = inferGenericAction(userText, normalizedPluginId);

  if (normalizedPluginId === "github") {
    return {
      pluginId: normalizedPluginId,
      action,
      userIntent: userText,
      params: extractRepoParams(userText)
    };
  }

  if (normalizedPluginId === "gmail") {
    return {
      pluginId: normalizedPluginId,
      action,
      userIntent: userText,
      params: extractEmailParams(userText)
    };
  }

  return {
    pluginId: normalizedPluginId,
    action,
    userIntent: userText,
    params: { query: userText }
  };
}

/*
DISCOVERY_PIPELINE:
Voice → Intent → Location → Vertical → Ranking → Render
*/
