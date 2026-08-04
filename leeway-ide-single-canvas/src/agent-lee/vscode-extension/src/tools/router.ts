/*
LEEWAY_HEADER - DO NOT REMOVE

REGION: 🟣 MCP
TAG: MCP.TOOLS.ROUTER.MAIN

5WH:
WHAT = Maps user requests to task classes and local model selections.
WHY = Keeps local model routing predictable for Agent Lee command flows.
WHO = Agent Lee / LeeWay Runtime.
WHERE = agent-lee/vscode-extension/src/tools/router.ts
WHEN = 2026
HOW = Keyword classification plus task-to-model routing rules.
*/

export function classifyTask(input: string) {
  const q = input.toLowerCase();

  if (q.includes("force push")) return "force-push";
  if (q.includes("delete branch")) return "delete-branch";
  if (q.includes("overwrite core")) return "overwrite-core";
  if (q.includes("push main") || q.includes("push master")) return "direct-main-push";
  if (q.includes("delete all") || q.includes("remove all")) return "bulk-delete";

  if (q.includes("search") || q.includes("look up") || q.includes("latest docs")) return "web-search";
  if (q.includes("svg") || q.includes("voxel") || q.includes("3d scene") || q.includes("visual asset") || q.includes("scene reconstruction")) return "visual-intelligence";
  if (q.includes("image") || q.includes("screenshot") || q.includes("picture")) return "image";
  if (q.includes("scan") || q.includes("audit") || q.includes("compliance")) return "scan";
  if (q.includes("fix") || q.includes("repair")) return "fix";
  if (q.includes("verify") || q.includes("test") || q.includes("check")) return "verify";

  return "answer";
}

export function selectModel(task: string) {
  if (task === "fix") return "qwen2.5-coder:14b";
  if (task === "verify") return "qwen2.5-coder:14b";
  if (task === "web-search") return "qwen2.5-coder:7b";
  if (task === "visual-intelligence") return "qwen2.5vl:7b";
  if (task === "image") return "qwen2.5vl:7b";
  return "qwen2.5-coder:7b";
}

/*
DISCOVERY_PIPELINE:
Voice → Intent → Location → Vertical → Ranking → Render
*/
