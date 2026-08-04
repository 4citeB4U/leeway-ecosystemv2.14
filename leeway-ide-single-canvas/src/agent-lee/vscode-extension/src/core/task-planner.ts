/*
LEEWAY_HEADER - DO NOT REMOVE

TAG: CORE.RUNTIME.TASK.PLANNER
REGION: 🟢 CORE
PURPOSE: Task planning support for Agent Lee engineering and command execution.
DISCOVERY_PIPELINE:
  Voice → Intent → Location → Vertical → Ranking → Render
*/

import * as path from "path";

export type WorkMode = "execute" | "plan" | "ask";
export type PlanPhase = "inspect" | "analyze" | "execute" | "verify" | "document";

export type TaskPlanStep = {
  id: string;
  title: string;
  detail: string;
  phase: PlanPhase;
};

export type TaskPlan = {
  id: string;
  prompt: string;
  summary: string;
  approvalPrompt: string;
  executionHint: string;
  steps: TaskPlanStep[];
  createdAt: string;
  workspaceRoot: string;
};

function extractJsonObject(text: string) {
  const fenced = text.match(/```json\s*([\s\S]*?)```/i);
  if (fenced) return fenced[1].trim();
  const first = text.indexOf("{");
  const last = text.lastIndexOf("}");
  if (first >= 0 && last > first) return text.slice(first, last + 1);
  return "";
}

function slug(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48) || "plan";
}

function normalizeSteps(rawSteps: any[] | undefined): TaskPlanStep[] {
  const fallback: TaskPlanStep[] = [
    { id: "inspect-context", title: "Inspect the relevant workspace files", detail: "Read the files tied to the request before making decisions.", phase: "inspect" },
    { id: "analyze-request", title: "Analyze the request against LeeWay standards", detail: "Turn the request into a governed execution path.", phase: "analyze" },
    { id: "execute-response", title: "Execute the approved workflow", detail: "Run the supported Agent Lee workflow for this task.", phase: "execute" },
    { id: "verify-output", title: "Verify the result", detail: "Check the output and note any risks or blockers.", phase: "verify" },
    { id: "document-work", title: "Document the plan and artifacts", detail: "Save the plan/report path so the workflow is recoverable.", phase: "document" }
  ];

  if (!Array.isArray(rawSteps) || !rawSteps.length) return fallback;

  const allowed = new Set<PlanPhase>(["inspect", "analyze", "execute", "verify", "document"]);
  const seen = new Set<string>();
  const steps = rawSteps
    .map((step, index) => {
      const phase = allowed.has(step?.phase) ? step.phase as PlanPhase : fallback[Math.min(index, fallback.length - 1)].phase;
      const title = String(step?.title || fallback[Math.min(index, fallback.length - 1)].title).trim();
      const detail = String(step?.detail || fallback[Math.min(index, fallback.length - 1)].detail).trim();
      const id = slug(String(step?.id || `${phase}-${title || index + 1}`));
      if (!title || seen.has(id)) return null;
      seen.add(id);
      return { id, title, detail, phase };
    })
    .filter(Boolean) as TaskPlanStep[];

  return steps.length ? steps.slice(0, 6) : fallback;
}

function fallbackPlan(prompt: string, workspaceRoot: string, mode: WorkMode): TaskPlan {
  const createdAt = new Date().toISOString();
  const base = path.basename(workspaceRoot || "workspace");
  return {
    id: `${slug(prompt)}-${createdAt.replace(/[:.]/g, "-")}`,
    prompt,
    summary: mode === "plan"
      ? `Build a governed plan for "${prompt}" in ${base} before any execution.`
      : `Inspect ${base}, create a governed plan, and wait for approval before execution.`,
    approvalPrompt: mode === "plan"
      ? "Review the plan, save it if it looks right, then choose whether to execute it."
      : "Review the plan and approve it before Agent Lee executes the workflow.",
    executionHint: "The plan is staged so the sidebar can track the next active task and the evidence trail.",
    steps: normalizeSteps(undefined),
    createdAt,
    workspaceRoot
  };
}

export async function createTaskPlan(args: {
  prompt: string;
  mode: WorkMode;
  workspaceRoot: string;
  targetLabel?: string;
  files: string[];
  model: string;
  ollama: (prompt: string, model: string) => Promise<string>;
}): Promise<TaskPlan> {
  const createdAt = new Date().toISOString();
  const plannerPrompt = `
You are producing a governed execution plan for Agent Lee.

USER REQUEST:
${args.prompt}

WORK MODE:
${args.mode}

TARGET:
${args.targetLabel || args.workspaceRoot || "workspace"}

FILES IN PLAY:
${args.files.slice(0, 12).map((file) => `- ${file}`).join("\n") || "- No local files were preloaded yet."}

RULES:
- Return JSON only.
- Steps must be SPECIFIC to the user request above — name real files, real features, real problems.
- Do NOT use generic step titles like "Inspect files" or "Analyze request". Be concrete.
- Use only these phases in this order: inspect, analyze, execute, verify, document.
- Use 4 to 6 steps. Each step needs a title AND a detail sentence that describes exactly what Agent Lee will do.
- The execute step(s) must name the specific edits, commands, or changes to be made.
- The verify step must describe the actual check Agent Lee will run (e.g. compile, test, diff review).
- The document step must mention saving the evidence trail and plan path.
- If the request mentions headers, all header-related steps must name the exact header format and which files.
- If the request mentions fixing a bug, name the bug symptom in the execute step.

JSON SCHEMA:
{
  "summary": "string — one sentence describing what will be done",
  "approvalPrompt": "string — one sentence asking the user to approve",
  "executionHint": "string — one sentence on what will run automatically",
  "steps": [
    {
      "id": "string — lowercase-hyphen slug matching the step",
      "title": "string — specific action title, 5-10 words",
      "detail": "string — one sentence describing exactly what happens in this step",
      "phase": "inspect | analyze | execute | verify | document"
    }
  ]
}
`;

  try {
    const raw = await args.ollama(plannerPrompt, args.model);
    const jsonText = extractJsonObject(raw);
    if (!jsonText) return fallbackPlan(args.prompt, args.workspaceRoot, args.mode);
    const parsed = JSON.parse(jsonText);
    return {
      id: `${slug(args.prompt)}-${createdAt.replace(/[:.]/g, "-")}`,
      prompt: args.prompt,
      summary: String(parsed.summary || "").trim() || fallbackPlan(args.prompt, args.workspaceRoot, args.mode).summary,
      approvalPrompt: String(parsed.approvalPrompt || "").trim() || fallbackPlan(args.prompt, args.workspaceRoot, args.mode).approvalPrompt,
      executionHint: String(parsed.executionHint || "").trim() || "Agent Lee will surface the workflow as a tracked to-do list before any execution.",
      steps: normalizeSteps(parsed.steps),
      createdAt,
      workspaceRoot: args.workspaceRoot
    };
  } catch {
    return fallbackPlan(args.prompt, args.workspaceRoot, args.mode);
  }
}
