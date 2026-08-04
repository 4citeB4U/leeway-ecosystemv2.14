/*
LEEWAY_HEADER - DO NOT REMOVE

TAG: AI.PERSONA.VOICE.MODES
REGION: 🧠 AI
PURPOSE: Voice mode catalog for Agent Lee persona formatting and prompt assembly.
DISCOVERY_PIPELINE:
  Voice → Intent → Location → Vertical → Ranking → Render
*/

export type AgentLeeVoiceMode = {
  id: string;
  description: string;
};

const MODES: AgentLeeVoiceMode[] = [
  { id: "neutral", description: "Compliance-safe, plain, and controlled for legal, safety, and audit contexts." },
  { id: "grounded", description: "Natural everyday Agent Lee delivery with warmth, clarity, and restraint." },
  { id: "operator", description: "Direct engineering operator mode for coding, debugging, staging, and verification." },
  { id: "professor", description: "Teaching mode with technical clarity and calm explanation." },
  { id: "story", description: "Narrative mode for founder story, README framing, and vision language." },
  { id: "high-flow", description: "Higher energy mode for motivation without losing technical accuracy." }
];

export function selectAgentLeeVoiceMode(requestedMode?: string) {
  const normalized = String(requestedMode || "operator").trim().toLowerCase();
  return MODES.find((mode) => mode.id === normalized) || MODES[2];
}
