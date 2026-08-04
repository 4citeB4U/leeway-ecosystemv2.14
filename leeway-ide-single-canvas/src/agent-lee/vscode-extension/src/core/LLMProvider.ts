/*
LEEWAY HEADER — DO NOT REMOVE

REGION: CORE
TAG: CORE.SDK.LLMPROVIDER.MAIN
PURPOSE: Local Ollama provider that routes every model generation request through Agent Lee runtime governance.

COLOR_ONION_HEX:
NEON=#39FF14
FLUO=#0DFF94
PASTEL=#C7FFD8

ICON_ASCII:
family=lucide
glyph=file

5WH:
WHAT = LLMProvider module
WHY = Part of CORE region
WHO = LEEWAY Align Agent
WHERE = core\LLMProvider.ts
WHEN = 2026
HOW = Auto-aligned by LEEWAY align-agent

AGENTS:
ASSESS
ALIGN
AUDIT

LICENSE:
MIT
*/

import { buildModelPromptThroughAgentLee, getAgentLeeRuntimeState } from "./agent-lee-runtime-bootstrap";

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

function resolveAuthorizedModel(candidate: string | undefined, fallback = "qwen2.5-coder:14b") {
  const normalized = String(candidate || "").trim();
  if (AUTHORIZED_MODEL_SET.has(normalized)) return normalized;
  return fallback;
}

function formatUnknownError(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

// Simple LLMProvider interface for optional LLM assistance
export const LLMProvider = {
  async generate(prompt: string, model: string = 'qwen2.5-coder:14b'): Promise<string> {
    try {
      const runtime = getAgentLeeRuntimeState();
      if (!runtime.AGENT_LEE_RUNTIME_READY) {
        return runtime.degradedReason || "Agent Lee runtime is degraded: persona module unavailable.";
      }
      const authorizedModel = resolveAuthorizedModel(model);

      const response = await fetch('http://localhost:11434/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: authorizedModel,
          prompt: buildModelPromptThroughAgentLee(prompt, {
            taskContext: "LLMProvider local generation request.",
            modelName: authorizedModel
          }),
          stream: false
        })
      });
      const data = await response.json();
      return data.response || 'No response from model';
    } catch (error) {
      return `Error: ${formatUnknownError(error)}`;
    }
  },
  async getModels(): Promise<string[]> {
    try {
      const response = await fetch('http://localhost:11434/api/tags');
      const data = await response.json();
      return (data.models?.map((m: any) => m.name) || []).filter((name: string) => AUTHORIZED_MODEL_SET.has(String(name || "").trim()));
    } catch (error) {
      return [];
    }
  }
};

// Attach to window for AgentManager fallback
if (typeof window !== 'undefined') {
  (window as any).LLMProvider = LLMProvider;
}
