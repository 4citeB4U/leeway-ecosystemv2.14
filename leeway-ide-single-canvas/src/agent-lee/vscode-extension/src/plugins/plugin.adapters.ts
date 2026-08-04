/*
LEEWAY HEADER — DO NOT REMOVE

REGION: 🟣 MCP
TAG: MCP.PLUGIN.ADAPTER.REGISTRY

5WH:
WHAT = Runtime adapter registry for Agent Lee plugins
WHY = Maps plugin IDs to executable adapters
WHO = Agent Lee Plugin Runtime
WHERE = src/plugins/plugin.adapters.ts
WHEN = 2026
HOW = Adapter list with lookup helper

AGENTS:
PLUGIN_ROUTER
AUDIT
SHIELD

LICENSE:
MIT
*/

import type { PluginAdapter, PluginCallInput } from "./plugin.types";
import { createPluginError } from "./adapters/base.adapter";
import { bridgeAdapter } from "./adapters/bridge.adapter";
import { githubAdapter } from "./adapters/github.adapter";

export type PluginAdapterHealth = {
  pluginId: string;
  available: boolean;
  degraded: boolean;
  modulePath: string;
  exportName: string;
  detail: string;
};

type OptionalAdapterRecord = {
  adapter: PluginAdapter;
  health: PluginAdapterHealth;
};

const optionalAdapterCache = new Map<string, OptionalAdapterRecord>();

function loadOptionalAdapter(
  pluginId: string,
  modulePath: string,
  exportName: string
): OptionalAdapterRecord {
  const cached = optionalAdapterCache.get(pluginId);
  if (cached) {
    return cached;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const loaded = require(modulePath) as Record<string, PluginAdapter | undefined>;
    const adapter = loaded[exportName];
    if (adapter) {
      const record: OptionalAdapterRecord = {
        adapter,
        health: {
          pluginId,
          available: true,
          degraded: false,
          modulePath,
          exportName,
          detail: `Loaded ${modulePath}.`
        }
      };
      optionalAdapterCache.set(pluginId, record);
      return record;
    }
    throw new Error(`Export ${exportName} was not found in ${modulePath}.`);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error || "Unknown adapter load failure.");
    const record: OptionalAdapterRecord = {
      adapter: {
        pluginId,
        canHandle(input: PluginCallInput) {
          return input.pluginId === pluginId;
        },
        async execute(input) {
          return createPluginError(input, error);
        }
      },
      health: {
        pluginId,
        available: false,
        degraded: true,
        modulePath,
        exportName,
        detail
      }
    };
    optionalAdapterCache.set(pluginId, record);
    return record;
  }
}

const OPTIONAL_ADAPTER_SPECS = {
  gmail: { modulePath: "./adapters/gmail.adapter", exportName: "gmailAdapter" },
  vercel: { modulePath: "./adapters/vercel.adapter", exportName: "vercelAdapter" }
} as const;

const DIRECT_ADAPTERS: Record<string, PluginAdapter> = {
  github: githubAdapter
};

export const PLUGIN_ADAPTERS: PluginAdapter[] = [
  githubAdapter,
  bridgeAdapter
];

export function getAdapterForPlugin(pluginId: string): PluginAdapter | undefined {
  if (DIRECT_ADAPTERS[pluginId]) {
    return DIRECT_ADAPTERS[pluginId];
  }

  if (pluginId in OPTIONAL_ADAPTER_SPECS) {
    const spec = OPTIONAL_ADAPTER_SPECS[pluginId as keyof typeof OPTIONAL_ADAPTER_SPECS];
    return loadOptionalAdapter(pluginId, spec.modulePath, spec.exportName).adapter;
  }

  return bridgeAdapter;
}

export function getPluginAdapterHealth(pluginId: string): PluginAdapterHealth {
  if (DIRECT_ADAPTERS[pluginId]) {
    return {
      pluginId,
      available: true,
      degraded: false,
      modulePath: "built-in",
      exportName: pluginId === "github" ? "githubAdapter" : "bridgeAdapter",
      detail: "Built-in adapter is available."
    };
  }

  if (pluginId in OPTIONAL_ADAPTER_SPECS) {
    const spec = OPTIONAL_ADAPTER_SPECS[pluginId as keyof typeof OPTIONAL_ADAPTER_SPECS];
    return loadOptionalAdapter(pluginId, spec.modulePath, spec.exportName).health;
  }

  return {
    pluginId,
    available: true,
    degraded: false,
    modulePath: "bridge",
    exportName: "bridgeAdapter",
    detail: "Falling back to the bridge adapter."
  };
}

export function getOptionalAdapterHealth() {
  return Object.keys(OPTIONAL_ADAPTER_SPECS).map((pluginId) => getPluginAdapterHealth(pluginId));
}

export function hasOptionalAdapterCrashRisk() {
  return getOptionalAdapterHealth().some((entry) => entry.degraded);
}

export function getAdapterHealthSummaryLines() {
  return getOptionalAdapterHealth().map((entry) => (
    `${entry.pluginId}: ${entry.available ? "available" : "disabled"} (${entry.detail})`
  ));
}

export function getAdapterForPluginOrBridge(pluginId: string) {
  return DIRECT_ADAPTERS[pluginId] || bridgeAdapter;
}

/*
DISCOVERY_PIPELINE:
Voice → Intent → Location → Vertical → Ranking → Render
*/
