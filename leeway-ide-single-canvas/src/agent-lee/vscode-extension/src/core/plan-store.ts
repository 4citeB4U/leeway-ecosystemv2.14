/*
LEEWAY_HEADER - DO NOT REMOVE

REGION: 💾 DATA
TAG: DATA.LOCAL.PLAN_STORE.MAIN

5WH:
WHAT = Persists Agent Lee execution plans to disk.
WHY = Leaves a recoverable planning trail before governed edits are applied.
WHO = Agent Lee / LeeWay Runtime.
WHERE = agent-lee/vscode-extension/src/core/plan-store.ts
WHEN = 2026
HOW = Saves markdown plans through the governed file-ops layer.
*/

import * as fs from "fs";
import * as path from "path";
import { writeTextWithRetries } from "./file-ops";
import { TaskPlan } from "./task-planner";

const ROOT = path.join(process.env.USERPROFILE || "", ".leeway-vscode");

function slug(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48) || "plan";
}

function resolvePlanDir(workspaceRoot: string) {
  if (workspaceRoot && fs.existsSync(workspaceRoot)) {
    return path.join(workspaceRoot, ".agent-lee", "plans");
  }
  return path.join(ROOT, "agent-lee", "plans");
}

export function saveTaskPlan(plan: TaskPlan) {
  const dir = resolvePlanDir(plan.workspaceRoot);
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${plan.createdAt.replace(/[:.]/g, "-")}-${slug(plan.prompt)}.md`);
  const lines = [
    `# Agent Lee Plan`,
    ``,
    `- Created: ${plan.createdAt}`,
    `- Workspace: ${plan.workspaceRoot || "not open"}`,
    `- Prompt: ${plan.prompt}`,
    ``,
    `## Summary`,
    ``,
    plan.summary,
    ``,
    `## Approval Prompt`,
    ``,
    plan.approvalPrompt,
    ``,
    `## Execution Hint`,
    ``,
    plan.executionHint,
    ``,
    `## Steps`,
    ``,
    ...plan.steps.map((step, index) => `${index + 1}. [ ] ${step.title} (${step.phase})\n   - ${step.detail}`)
  ];

  writeTextWithRetries(file, lines.join("\n"), "Agent Lee execution plan receipt.");
  return file;
}

/*
DISCOVERY_PIPELINE:
Voice → Intent → Location → Vertical → Ranking → Render
*/
