/*
LEEWAY HEADER - DO NOT REMOVE

REGION: AI
TAG: AI.KNOWLEDGE.CONTEXT.PREPARE
DISCOVERY_PIPELINE: Voice -> Intent -> Location -> Vertical -> Ranking -> Render
*/

import { loadProjectInstructions } from "./leewayInstructionLoader";
import { indexWorkspace } from "./leewayRepoIndexer";
import { buildLeeWayContextPack, formatContextPackForPrompt } from "./leewayContextBuilder";
import { writeKnowledgeReceipt } from "./leewayKnowledgeReceipts";
import { ingestPluginKnowledge } from "./ingestPlugins";

type PluginSeed = {
  id: string;
  name: string;
  description: string;
  category: string;
};

let pluginsSeeded = false;

export function prepareCodexLevelContext(workspaceRoot: string, userText: string, plugins: PluginSeed[]) {
  if (!pluginsSeeded && plugins.length) {
    ingestPluginKnowledge(plugins.map((plugin) => ({
      id: plugin.id,
      name: plugin.name,
      category: plugin.category,
      description: plugin.description,
      tags: ["catalog"]
    })));
    pluginsSeeded = true;
  }

  const instructions = loadProjectInstructions(workspaceRoot);
  const stats = indexWorkspace(workspaceRoot);
  const contextPack = buildLeeWayContextPack(userText);

  writeKnowledgeReceipt({
    title: "Knowledge context prepared",
    summary: `Loaded ${instructions.length} instruction files and indexed ${stats.filesIndexed} files.`,
    action: "knowledge.prepare",
    result: "passed",
    tags: ["knowledge", "context", "index"]
  });

  return formatContextPackForPrompt(contextPack);
}
