import React, { useEffect, useRef, useState } from "react";
import { sendAgentLeeMessage, getHistory, clearHistory } from "../services/ai";

// ─────────────────────────────────────────────────────────────────────────────
// ChatModal — Agent Lee Prime conversation surface inside Cerebral
//
// Routing: ChatModal → sendAgentLeeMessage() → /api/agent-lee/chat (8765)
//          → Runtime Fabric (4001) → Router Brain (8080) → Ollama (11434)
//          → qwen3:latest / qwen2.5-coder:7b
//
// History and sessionId are managed by ai.ts and propagated automatically.
// ─────────────────────────────────────────────────────────────────────────────

type ChatMessage = {
  id: string;
  text: string;
  from: "me" | "agent";
  meta?: string; // route/identity info shown as a dim sub-line
};

export const ChatModal: React.FC<{ open: boolean; onClose: () => void }> = ({
  open,
  onClose,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const messagesRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (messagesRef.current)
      messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
  }, [messages, open]);

  if (!open) return null;

  const send = async () => {
    if (!input.trim() || sending) return;
    const text = input.trim();
    setInput("");
    setSending(true);
    const id = `${Date.now()}`;
    const agentId = `${id}-r`;

    setMessages((m) => [...m, { id, text, from: "me" }]);
    setMessages((m) => [...m, { id: agentId, text: "…", from: "agent" }]);

    try {
      // sendAgentLeeMessage automatically injects sessionId + history from ai.ts
      const data = await sendAgentLeeMessage(text, false);
      const responseText = data.response || "Agent Lee returned no response text.";

      // Build a compact routing provenance line for transparency
      const metaParts: string[] = [];
      const src = data.sourceOfEmbodiment || data.trace?.sourceOfEmbodiment;
      const rt = data.router || data.trace?.router || data.route || data.trace?.route;
      const model = data.trace?.model;
      if (src) metaParts.push(`source: ${src}`);
      if (rt) metaParts.push(`router: ${rt}`);
      if (model) metaParts.push(`model: ${model}`);
      const meta = metaParts.length ? metaParts.join(" · ") : undefined;

      setMessages((m) =>
        m.map((msg) =>
          msg.id === agentId ? { ...msg, text: responseText, meta } : msg,
        ),
      );
    } catch (e) {
      setMessages((m) =>
        m.map((msg) =>
          msg.id === agentId
            ? {
                ...msg,
                text: `Agent Lee service failure: ${e instanceof Error ? e.message : String(e)}`,
                meta: "endpoint: /api/agent-lee/chat → Runtime Fabric 4001",
              }
            : msg,
        ),
      );
    } finally {
      setSending(false);
    }
  };

  const handleClearHistory = () => {
    clearHistory();
    setMessages([]);
  };

  return (
    <div className="fixed inset-0 z-80 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-full max-w-xl h-3/4 bg-black/95 border border-white/10 rounded-t-xl p-4 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex flex-col">
            <div className="text-sm font-bold">Agent Lee</div>
            <div className="text-[10px] text-white/40">
              via Runtime Fabric · Router 8080 · Ollama
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleClearHistory}
              title="Clear conversation history and start a new session"
              className="px-2 py-1 text-xs bg-white/5 rounded hover:bg-white/10 transition-colors"
            >
              Clear
            </button>
            <button
              onClick={onClose}
              className="px-2 py-1 text-xs bg-white/5 rounded hover:bg-white/10 transition-colors"
            >
              Close
            </button>
          </div>
        </div>

        {/* Messages */}
        <div ref={messagesRef} className="flex-1 overflow-auto mb-2 space-y-2">
          {messages.length === 0 && (
            <div className="text-xs text-white/30 text-center mt-8">
              Agent Lee is ready. Your conversation history is active for this session.
            </div>
          )}
          {messages.map((m) => (
            <div
              key={m.id}
              className={`p-2 rounded ${m.from === "me" ? "bg-orange-600/20 self-end" : "bg-white/5"}`}
            >
              <div className="text-xs text-white/80 whitespace-pre-wrap">{m.text}</div>
              {m.meta && (
                <div className="text-[9px] text-white/25 mt-1">{m.meta}</div>
              )}
            </div>
          ))}
        </div>

        {/* Input */}
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) send();
            }}
            className="flex-1 bg-white/5 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-orange-500/40"
            placeholder="Talk to Agent Lee…"
            aria-label="Chat input"
            disabled={sending}
          />
          <button
            onClick={send}
            disabled={sending}
            className={`px-3 py-2 rounded transition-colors ${
              sending
                ? "bg-white/10 text-white/30 cursor-not-allowed"
                : "bg-emerald-600/80 hover:bg-emerald-600"
            }`}
          >
            {sending ? "…" : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatModal;
