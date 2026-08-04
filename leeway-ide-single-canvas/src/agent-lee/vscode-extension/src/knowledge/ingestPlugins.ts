/*
LEEWAY HEADER - DO NOT REMOVE

REGION: MCP
TAG: MCP.KNOWLEDGE.PLUGIN.INGEST
DISCOVERY_PIPELINE: Voice -> Intent -> Location -> Vertical -> Ranking -> Render
*/

import { leewayKnowledgeStore } from "./leewayKnowledgeStore";

export interface PluginKnowledgeInput {
  id: string;
  name: string;
  category: string;
  description: string;
  tags?: string[];
  risk?: "low" | "medium" | "high" | "critical";
}

export function ingestPluginKnowledge(plugins: PluginKnowledgeInput[]) {
  return plugins.map((plugin) => {
    return leewayKnowledgeStore.upsert({
      kind: "plugin",
      drive: "A",
      title: plugin.name,
      summary: plugin.description,
      content: JSON.stringify(plugin, null, 2),
      tags: ["plugin", plugin.category.toLowerCase(), ...(plugin.tags || [])],
      region: "MCP",
      tag: `MCP.PLUGIN.${plugin.id.replace(/[^a-zA-Z0-9]+/g, "_").toUpperCase()}.MAIN`,
      source: "plugin",
      confidence: 0.95
    });
  });
}
