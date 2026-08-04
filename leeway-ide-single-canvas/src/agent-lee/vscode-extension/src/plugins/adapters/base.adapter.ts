/*
LEEWAY HEADER — DO NOT REMOVE

REGION: 🟣 MCP
TAG: MCP.PLUGIN.ADAPTER.BASE

5WH:
WHAT = Base adapter helpers for Agent Lee plugin calls
WHY = Normalizes API/plugin execution for all connectors
WHO = Agent Lee Plugin Runtime
WHERE = src/plugins/adapters/base.adapter.ts
WHEN = 2026
HOW = Fetch wrapper, error handling, and result formatting

AGENTS:
PLUGIN_ROUTER
SHIELD
AUDIT

LICENSE:
MIT
*/

import type { PluginCallInput, PluginCallResult } from "../plugin.types";

export function createPluginResult(
  input: PluginCallInput,
  summary: string,
  data?: unknown
): PluginCallResult {
  return {
    ok: true,
    pluginId: input.pluginId,
    action: input.action,
    summary,
    data,
    receiptId: createReceiptId(input.pluginId)
  };
}

export function createPluginError(
  input: PluginCallInput,
  error: unknown
): PluginCallResult {
  return {
    ok: false,
    pluginId: input.pluginId,
    action: input.action,
    summary: "Plugin call failed.",
    error: error instanceof Error ? error.message : String(error),
    receiptId: createReceiptId(input.pluginId)
  };
}

export function createReceiptId(pluginId: string): string {
  const stamp = new Date().toISOString().replace(/[^0-9]/g, "").slice(0, 14);
  const rand = Math.random().toString(36).slice(2, 8);
  return `LEE-${pluginId.toUpperCase().replace(/[^A-Z0-9]/g, "")}-${stamp}-${rand}`;
}

export async function safeJsonFetch<T = unknown>(
  url: string,
  init: RequestInit = {}
): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status}: ${text || res.statusText}`);
  }
  return await res.json() as T;
}

/*
DISCOVERY_PIPELINE:
Voice → Intent → Location → Vertical → Ranking → Render
*/
