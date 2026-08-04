/*
LEEWAY_HEADER - DO NOT REMOVE

TAG: AI.ORCHESTRATION.MODEL.HIVE
REGION: 🧠 AI
DISCOVERY_PIPELINE:
  Voice → Intent → Location → Vertical → Ranking → Render
*/

import * as fs from "fs";
import * as path from "path";

const ROOT = path.join(process.env.USERPROFILE || "", ".leeway-vscode");
const ROUTING_FILE = path.join(ROOT, "agent-lee", "models", "model-routing.json");
const AUTHORIZED_MODEL_IDS = [
  "qwen3:latest",
  "qwen2.5-coder:14b",
  "qwen2.5-coder:7b",
  "qwen2.5-coder:1.5b",
  "qwen2.5vl:7b",
  "qwen3-vl-embedding-local",
  "qwen3-tts-local",
  "qwen2.5-omni-local",
  "qwen2-audio-local",
  "deepseek-coder-v2:16b"
] as const;
const AUTHORIZED_MODEL_SET = new Set<string>(AUTHORIZED_MODEL_IDS);

export type ModelRole =
  | "builder_model"
  | "designer_ux_model"
  | "verifier_model"
  | "visual_helper"
  | "web_helper"
  | "general_helper"
  | "embeddings";

export type FrontendModelSelection = {
  builderModel: string;
  designerModel: string;
  verifierModel: string;
};

export type ModelRoleStatus = {
  role: ModelRole;
  label: string;
  preferred: string;
  selected: string;
  installed: boolean;
  available: boolean;
  modality: "coding" | "visual" | "web" | "general" | "embedding";
  isPrimary: boolean;
  isHiveMember: boolean;
  degraded: boolean;
};

export type ModelHiveStatus = {
  taskType: string;
  degraded: boolean;
  roles: ModelRoleStatus[];
  installedModels: string[];
};

type RoutingConfig = Record<string, string>;

function readRouting(): RoutingConfig {
  try {
    return JSON.parse(fs.readFileSync(ROUTING_FILE, "utf8"));
  } catch {
    return {};
  }
}

function pickInstalled(preferred: string, installed: string[], fallbacks: string[]) {
  if (installed.includes(preferred)) return preferred;
  return fallbacks.find((item) => installed.includes(item)) || preferred;
}

export function classifyTaskType(prompt: string) {
  const q = prompt.toLowerCase();
  if (/(image|screenshot|mockup|ui reference|design reference|video|asset)/i.test(q)) return "visual-coding";
  if (/(fix|repair|refactor|build|design|review|verify|audit|code|implement|debug|test|website|homepage|landing page|dashboard|hero|responsive|tailwind|react|vite|frontend|ui|layout|component)/i.test(q)) return "coding";
  if (/(search|latest|docs|website|github|web)/i.test(q)) return "web";
  return "general";
}

export function buildModelHiveStatus(installedModels: string[], selections: FrontendModelSelection, prompt: string): ModelHiveStatus {
  const config = readRouting();
  const taskType = classifyTaskType(prompt);
  const authorizedInstalled = installedModels.filter((model) => AUTHORIZED_MODEL_SET.has(model));

  const roles: ModelRoleStatus[] = [
    {
      role: "builder_model",
      label: "Builder Model",
      preferred: selections.builderModel || config.codingHivePrimary || config.heavyRepair || "qwen2.5-coder:14b",
      selected: "",
      installed: false,
      available: false,
      modality: "coding",
      isPrimary: true,
      isHiveMember: taskType === "coding" || taskType === "visual-coding",
      degraded: false
    },
    {
      role: "designer_ux_model",
      label: "Designer/UX Model",
      preferred: selections.designerModel || config.codingHiveVerifier || config.dailyCoder || "qwen2.5-coder:7b",
      selected: "",
      installed: false,
      available: false,
      modality: "coding",
      isPrimary: false,
      isHiveMember: taskType === "coding" || taskType === "visual-coding",
      degraded: false
    },
    {
      role: "verifier_model",
      label: "Verifier Model",
      preferred: selections.verifierModel || config.codingHiveReasoner || config.deepReasoner || "qwen2.5-coder:14b",
      selected: "",
      installed: false,
      available: false,
      modality: "coding",
      isPrimary: false,
      isHiveMember: taskType === "coding" || taskType === "visual-coding",
      degraded: false
    },
    {
      role: "visual_helper",
      label: "Visual Helper",
      preferred: config.visualHelper || "qwen2.5vl:7b",
      selected: "",
      installed: false,
      available: false,
      modality: "visual",
      isPrimary: false,
      isHiveMember: taskType === "visual-coding",
      degraded: false
    },
    {
      role: "web_helper",
      label: "Web Helper",
      preferred: config.webHelper || config.generalReasoner || "qwen2.5-coder:7b",
      selected: "",
      installed: false,
      available: false,
      modality: "web",
      isPrimary: false,
      isHiveMember: taskType === "web",
      degraded: false
    },
    {
      role: "general_helper",
      label: "General Helper",
      preferred: config.generalHelper || config.generalReasoner || "qwen2.5-coder:7b",
      selected: "",
      installed: false,
      available: false,
      modality: "general",
      isPrimary: false,
      isHiveMember: taskType === "general",
      degraded: false
    },
    {
      role: "embeddings",
      label: "Embeddings",
      preferred: config.embeddings || "qwen3-vl-embedding-local",
      selected: config.embeddings || "qwen3-vl-embedding-local",
      installed: authorizedInstalled.includes(config.embeddings || "qwen3-vl-embedding-local"),
      available: authorizedInstalled.includes(config.embeddings || "qwen3-vl-embedding-local"),
      modality: "embedding",
      isPrimary: false,
      isHiveMember: false,
      degraded: false
    }
  ];

  const codingFallbacks = [
    "qwen2.5-coder:14b",
    "qwen2.5-coder:7b",
    "qwen2.5-coder:1.5b",
    "deepseek-coder-v2:16b"
  ];
  const visualFallbacks = [
    "qwen2.5vl:7b",
    "qwen2.5-omni-local"
  ];
  const generalFallbacks = [
    "qwen3:latest",
    "qwen2.5-coder:7b",
    "qwen2.5-coder:14b"
  ];

  for (const role of roles) {
    if (role.role === "embeddings") continue;

    const fallbackPool =
      role.modality === "coding" ? codingFallbacks :
      role.modality === "visual" ? visualFallbacks :
      generalFallbacks;

    role.selected = pickInstalled(role.preferred, authorizedInstalled, fallbackPool);
    role.installed = authorizedInstalled.includes(role.preferred);
    role.available = authorizedInstalled.includes(role.selected);
    role.degraded = role.isHiveMember && role.selected !== role.preferred;
  }

  return {
    taskType,
    degraded: roles.some((role) => role.isHiveMember && !role.available),
    // keep embeddings at the end but preserve deterministic display
    roles: roles.sort((a, b) => Number(b.isHiveMember) - Number(a.isHiveMember)),
    installedModels: authorizedInstalled
  };
}

export function summarizeHive(status: ModelHiveStatus) {
  const active = status.roles.filter((role) => role.isHiveMember);
  if (!active.length) return `Task type: ${status.taskType}. No multi-model hive required.`;

  return [
    `Task type: ${status.taskType}`,
    `Hive degraded: ${status.degraded ? "yes" : "no"}`,
    ...active.map((role) => `- ${role.label}: preferred=${role.preferred} selected=${role.selected} available=${role.available}`)
  ].join("\n");
}
