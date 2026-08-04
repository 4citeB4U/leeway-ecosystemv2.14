/// <reference types="vite/client" />
// ─────────────────────────────────────────────────────────────────────────────
// Cerebral AI Service Layer
// ALL chat now routes through Agent Lee Prime via /api/agent-lee/chat
// Runtime Fabric (4001) → Router Brain (8080) → Ollama (11434)
// ─────────────────────────────────────────────────────────────────────────────

// Canonical Agent Lee endpoint — never /api/chat (Foundry/local)
const AGENT_LEE_URL =
  (import.meta.env.VITE_AGENT_LEE_CHAT_URL as string) || "/api/agent-lee/chat";
const HEALTH_URL = (import.meta.env.VITE_HEALTH_URL as string) || "/health";

// TTS — proxied through Daemon which now routes to Desktop Runtime 8091
const SPEAK_URL = (import.meta.env.VITE_SPEAK_URL as string) || "/api/chat/tts";

const SETTINGS_URL =
  (import.meta.env.VITE_SETTINGS_URL as string) || "/api/settings";
const LOCAL_VOICE_STATUS_URL =
  (import.meta.env.VITE_LOCAL_VOICE_STATUS_URL as string) || "/api/local-voice/status";
const VOICE_SET_URL = "/api/tts/voice";

const AGENT_LEE_CHAT_ENDPOINT_LABEL = "POST /api/agent-lee/chat";

const HANDSHAKE = (import.meta.env.VITE_NEURAL_HANDSHAKE as string) || null;

const getHeaders = () => ({
  "Content-Type": "application/json",
  ...(HANDSHAKE ? { "x-neural-handshake": HANDSHAKE } : {}),
});

// ─────────────────────────────────────────────────────────────────────────────
// Session ID — persists for the lifetime of this browser tab/session.
// Passed to Agent Lee Prime so conversation context is maintained.
// ─────────────────────────────────────────────────────────────────────────────
let _sessionId: string | null = null;

export function getSessionId(): string {
  if (!_sessionId) {
    // Reuse from sessionStorage if we already created one this tab session
    const stored = sessionStorage.getItem("leeway_cerebral_session_id");
    if (stored) {
      _sessionId = stored;
    } else {
      _sessionId = `cerebral-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      sessionStorage.setItem("leeway_cerebral_session_id", _sessionId);
    }
  }
  return _sessionId;
}

// ─────────────────────────────────────────────────────────────────────────────
// Conversation History — maintains last N turns for context continuity.
// Passed to the /api/agent-lee/chat endpoint on each call.
// ─────────────────────────────────────────────────────────────────────────────
const MAX_HISTORY_TURNS = 20;
const _conversationHistory: Array<{ role: "user" | "assistant"; content: string }> = [];

function appendHistory(role: "user" | "assistant", content: string) {
  _conversationHistory.push({ role, content });
  // Keep only last MAX_HISTORY_TURNS entries
  if (_conversationHistory.length > MAX_HISTORY_TURNS) {
    _conversationHistory.splice(0, _conversationHistory.length - MAX_HISTORY_TURNS);
  }
}

export function getHistory() {
  return [..._conversationHistory];
}

export function clearHistory() {
  _conversationHistory.length = 0;
  _sessionId = null;
  sessionStorage.removeItem("leeway_cerebral_session_id");
}

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
export type AgentLeeChatResult = {
  ok?: boolean;
  agentId?: string;
  sourceOfEmbodiment?: string;
  corePath?: string;
  response?: string;
  route?: string;
  router?: string;
  mode?: string;
  speak?: boolean;
  tools?: unknown[];
  proof?: unknown[];
  error?: string;
  message?: string;
  details?: string;
  raw?: unknown;
  trace?: {
    endpoint?: string;
    body?: { input: string; mode: string; speak: boolean };
    status?: number;
    route?: string;
    agentId?: string;
    sourceOfEmbodiment?: string;
    corePath?: string;
    responseLength?: number;
    speak?: boolean;
    model?: string;
    router?: string;
  };
};

export type LocalVoiceStatus = {
  ok?: boolean;
  deployment?: {
    id: string;
    name: string;
    type: string;
    active: boolean;
    default: boolean;
    services: string[];
  };
  asr?: { engine: string; available: boolean; error?: string };
  tts?: {
    engine: string;
    available: boolean;
    voices: Array<{
      id: string;
      label?: string;
      name?: string;
      language?: string;
      engine?: string;
      source?: string;
      available?: boolean;
    }>;
  };
  agentLeeVoice?: {
    id: string;
    name: string;
    label?: string;
    source: string;
    available: boolean;
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// Diagnostics
// ─────────────────────────────────────────────────────────────────────────────
async function probeService(url: string, init?: RequestInit) {
  try {
    const response = await fetch(url, init);
    return { ok: response.ok, status: response.status };
  } catch (error) {
    return { ok: false, status: 0, error: String(error) };
  }
}

export async function diagnoseAgentLeeFailure() {
  const daemon = await probeService("/api/health");
  if (!daemon.ok) return "8765 down";

  const fabric = await probeService("/fabric/agent-lee/chat", {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({
      input: "Agent Lee route health probe.",
      mode: "chat",
      speak: false,
    }),
  });
  if (!fabric.ok) return "4001 down";

  const router = await probeService("/brain/health");
  if (!router.ok) return "8080 empty response";

  const desktop = await probeService("/desktop/runtime/status");
  if (!desktop.ok) return "8091 unavailable";

  return "Agent Lee route failed";
}

// ─────────────────────────────────────────────────────────────────────────────
// PRIMARY CHAT — Agent Lee Prime via Runtime Fabric
// This is the ONLY chat function that should be called by UI components.
// ─────────────────────────────────────────────────────────────────────────────
export async function sendAgentLeeMessage(
  message: string,
  speak = false,
  extraHistory?: Array<{ role: "user" | "assistant"; content: string }>,
) {
  // Append the user's message to local history before sending
  appendHistory("user", message);

  const sessionId = getSessionId();
  const history = extraHistory ?? getHistory();

  const body = {
    input: message,
    mode: "chat",
    speak,
    sessionId,
    history,
  };

  const response = await fetch(AGENT_LEE_URL, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(body),
  });

  let data: AgentLeeChatResult = {};
  let rawResponse = "";
  try {
    rawResponse = await response.text();
    data = rawResponse ? JSON.parse(rawResponse) : {};
  } catch {
    data = { error: "INVALID_JSON", message: "Agent Lee route returned non-JSON." };
  }

  if (!response.ok || data.ok === false || !data.response) {
    throw new Error(
      [
        `endpoint=${AGENT_LEE_CHAT_ENDPOINT_LABEL}`,
        `status=${response.status}`,
        `backendError=${data.error || "NONE"}`,
        `message=${data.message || data.details || "No backend message"}`,
        `raw=${rawResponse || JSON.stringify(data)}`,
      ].join(" | "),
    );
  }

  // Append the agent's response to history for next turn
  appendHistory("assistant", data.response);

  data.trace = {
    endpoint: AGENT_LEE_CHAT_ENDPOINT_LABEL,
    body,
    status: response.status,
    route: data.route,
    agentId: data.agentId,
    responseLength: data.response.length,
  };

  return data;
}

// ─────────────────────────────────────────────────────────────────────────────
// DEPRECATED ALIASES — kept to prevent import errors but now route through
// Agent Lee Prime. Do NOT call these from new code.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @deprecated Use sendAgentLeeMessage() instead.
 * Redirects to Agent Lee Prime — Foundry Local path has been decommissioned.
 */
export async function sendMessage(message: string): Promise<string> {
  const data = await sendAgentLeeMessage(message, false);
  return data.response || "No response.";
}

/**
 * @deprecated Use sendAgentLeeMessage() instead.
 */
export async function getChatResponse(message: string, _history?: unknown): Promise<string> {
  return sendMessage(message);
}

/**
 * @deprecated Use sendAgentLeeMessage() instead.
 * SSE streaming is handled server-side by the Agent Lee router.
 * Returns the full response when complete (no partial streaming on client).
 */
export async function streamChatResponse(
  message: string,
  onChunk: (partial: string) => void,
): Promise<string> {
  const data = await sendAgentLeeMessage(message, false);
  const text = data.response || "No response.";
  onChunk(text);
  return text;
}

// ─────────────────────────────────────────────────────────────────────────────
// TTS — speaks text via Daemon which proxies to Desktop Runtime 8091
// ─────────────────────────────────────────────────────────────────────────────
export async function speakText(text: string) {
  const response = await fetch(SPEAK_URL, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({ text }),
  });

  if (!response.ok) {
    throw new Error(`TTS endpoint failed (${response.status})`);
  }

  return await response.json().catch(() => ({ ok: true }));
}

export async function generateSpeech(text: string) {
  try {
    const response = await fetch(SPEAK_URL, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ text }),
    });
    if (!response.ok) throw new Error("TTS Request Failed");
    return { status: "queued", backend: "desktop-runtime" };
  } catch (e) {
    return { status: "error", message: String(e) };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Voice Management
// ─────────────────────────────────────────────────────────────────────────────
export async function getVoices() {
  const status = await getLocalVoiceStatus();
  const voices = status.tts?.voices?.length
    ? status.tts.voices
    : status.agentLeeVoice
      ? [status.agentLeeVoice]
      : [];
  return {
    status: status.ok ? "success" : "unavailable",
    deployment: status.deployment,
    asr: status.asr,
    tts: status.tts,
    agentLeeVoice: status.agentLeeVoice,
    voices: voices.map((voice) => ({
      id: voice.id,
      label: voice.label || voice.name || voice.id,
      language: voice.language || voice.source || "local",
      source: voice.source || "local",
      engine: voice.engine || status.tts?.engine || "local",
      available: voice.available ?? status.tts?.available ?? false,
    })),
  };
}

export async function getLocalVoiceStatus(): Promise<LocalVoiceStatus> {
  const endpoints = [
    LOCAL_VOICE_STATUS_URL,
    "/api/leeway/local-voice/status",
  ];

  let lastError: unknown = null;
  for (const endpoint of endpoints) {
    try {
      const res = await fetch(endpoint, { headers: getHeaders() });
      if (!res.ok) {
        lastError = new Error(`Local voice status failed (${res.status}) at ${endpoint}`);
        continue;
      }
      return await res.json();
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Local voice status unavailable.");
}

export async function setVoice(voiceId: string) {
  const res = await fetch(VOICE_SET_URL, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({ voice_id: voiceId }),
  });
  return await res.json();
}

// ─────────────────────────────────────────────────────────────────────────────
// Settings & Context
// ─────────────────────────────────────────────────────────────────────────────
export async function getSystemContext() {
  try {
    const res = await fetch(HEALTH_URL, { headers: getHeaders() });
    return await res.json();
  } catch (e) {
    return { weather: "72°F Clear", traffic: "Smooth Flow" };
  }
}

export async function getSettings() {
  try {
    const res = await fetch(SETTINGS_URL, { headers: getHeaders() });
    if (!res.ok) return {};
    return await res.json();
  } catch (e) {
    return {};
  }
}

export async function setBgSettings(bg: {
  bg_color?: string;
  bg_speed?: number;
}) {
  try {
    const res = await fetch(SETTINGS_URL, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(bg),
    });
    if (!res.ok) throw new Error("failed to set bg settings");
    return await res.json();
  } catch (e) {
    return { error: String(e) };
  }
}

export async function getTtsEnabled(): Promise<boolean> {
  try {
    const res = await fetch(SETTINGS_URL, { headers: getHeaders() });
    if (!res.ok) return true;
    const j = await res.json();
    return Boolean(j.tts_enabled);
  } catch (e) {
    return true;
  }
}

export async function setTtsEnabled(enabled: boolean) {
  try {
    const res = await fetch(SETTINGS_URL, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ tts_enabled: !!enabled }),
    });
    if (!res.ok) throw new Error("failed to set setting");
    return await res.json();
  } catch (e) {
    return { error: String(e) };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// User Identity
// ─────────────────────────────────────────────────────────────────────────────
export async function getUser(): Promise<{ name: string; id: string }> {
  try {
    const res = await fetch("/api/user", { headers: getHeaders() });
    if (!res.ok) return { name: "", id: "" };
    return await res.json();
  } catch {
    return { name: "", id: "" };
  }
}

export async function setUser(name: string): Promise<{ ok: boolean }> {
  try {
    const res = await fetch("/api/user", {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ name }),
    });
    if (!res.ok) return { ok: false };
    return await res.json();
  } catch {
    return { ok: false };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// File System
// ─────────────────────────────────────────────────────────────────────────────
export async function listFiles(path: string) {
  try {
    const res = await fetch(
      `/api/files/list?path=${encodeURIComponent(path)}`,
      { headers: getHeaders() },
    );
    if (!res.ok) return { error: `HTTP ${res.status}` };
    return await res.json();
  } catch (e) {
    return { error: String(e) };
  }
}

export async function readFile(path: string) {
  try {
    const res = await fetch(
      `/api/files/read?path=${encodeURIComponent(path)}`,
      { headers: getHeaders() },
    );
    if (!res.ok) return { error: `HTTP ${res.status}` };
    return await res.json();
  } catch (e) {
    return { error: String(e) };
  }
}

export async function writeFile(path: string, content: string) {
  try {
    const res = await fetch("/api/files/write", {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ path, content }),
    });
    if (!res.ok) return { error: `HTTP ${res.status}` };
    return await res.json();
  } catch (e) {
    return { error: String(e) };
  }
}

export async function openFile(path: string) {
  try {
    const res = await fetch(
      `/api/files/open?path=${encodeURIComponent(path)}`,
      { headers: getHeaders() },
    );
    if (!res.ok) return { error: `HTTP ${res.status}` };
    return await res.json();
  } catch (e) {
    return { error: String(e) };
  }
}

export async function searchFiles(query: string, root?: string) {
  try {
    const params = new URLSearchParams({ q: query });
    if (root) params.set("root", root);
    const res = await fetch(`/api/files/search?${params}`, {
      headers: getHeaders(),
    });
    if (!res.ok) return { error: `HTTP ${res.status}` };
    return await res.json();
  } catch (e) {
    return { error: String(e) };
  }
}
