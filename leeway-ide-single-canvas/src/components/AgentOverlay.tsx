/**
 * LEEWAY_HEADER - DO NOT REMOVE
 *
 * REGION: UI
 * TAG: UI.AGENT_LEE.APPLICATION_CONTROL_OVERLAY
 * DESCRIPTION: Agent Lee overlay connected to the single-canvas application-control layer and Runtime Fabric chat bridge.
 * AUTHORITY: LeeWay-Standards
 * DISCOVERY_PIPELINE: Voice -> Intent -> Location -> Vertical -> Ranking -> Render
 *
 * 5WH:
 * WHAT = Agent Lee chat and application-control overlay
 * WHY = Let Agent Lee operate the IDE surface while preserving truthful Runtime Fabric execution boundaries
 * WHO = Leeway Innovations / Agent Lee Enablement
 * WHERE = leeway-ide-single-canvas/src/components/AgentOverlay.tsx
 * WHEN = 2026-06-07
 * HOW = React chat panel with local app-control dispatch, bridge chat fallback, and code suggestion injection
 *
 * CHAIN: Standards -> Agent Lee -> App Control -> Runtime Fabric -> Receipts
 * LICENSE: PROPRIETARY
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { Bot, CheckCircle, Loader2, Mic, Send, Sparkles, X } from "lucide-react";
import { ChatMessage, AgentLog } from "../types";

export interface AgentLeeOverlayCommandResult {
  handled: boolean;
  text: string;
}

interface AgentOverlayProps {
  currentFile: string;
  currentCode: string;
  onCodeInjected: (code: string) => void;
  onAgentCommand?: (prompt: string) => Promise<AgentLeeOverlayCommandResult>;
  runtimeSummary?: string;
  controlSummary?: string;
}

function nowLabel() {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function renderText(txt: string) {
  return txt.split("\n").map((line, index) => (
    <p key={index} className="mb-2 leading-relaxed">
      {line.split(/(`[^`]+`)/g).map((part, partIndex) => {
        if (part.startsWith("`") && part.endsWith("`")) {
          return (
            <code key={partIndex} className="rounded bg-white/10 px-1 py-0.5 font-mono text-[10px] text-blue-300">
              {part.slice(1, -1)}
            </code>
          );
        }
        return <span key={partIndex}>{part}</span>;
      })}
    </p>
  ));
}

function shouldRouteToAgentLeeChat(prompt: string) {
  return /\b(who are you|lineage|identity|agent lee|your origin|your runtime|your route)\b/i.test(prompt);
}

const AGENT_LEE_LINEAGE_PROMPT = "Who are you and what is your lineage?";

export function AgentOverlay({
  currentFile,
  currentCode,
  onCodeInjected,
  onAgentCommand,
  runtimeSummary = "Runtime truth not loaded.",
  controlSummary = "Agent Lee application-control layer active.",
}: AgentOverlayProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isVoiceLoading, setIsVoiceLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const deploymentLabel = "LeeWay Local Agent Lee: Active";

  const agentLogs: AgentLog[] = useMemo(() => [
    { id: "1", text: "Single-canvas control route registered", status: "success" },
    { id: "2", text: controlSummary, status: "success" },
    { id: "3", text: runtimeSummary.split("\n")[0] ?? "Runtime status pending", status: runtimeSummary.includes("UNREACHABLE") ? "error" : "running" },
    { id: "4", text: "Command execution requires receipts", status: "success" },
  ], [controlSummary, runtimeSummary]);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, isLoading]);

  const appendAgentMessage = (text: string, extra?: Partial<ChatMessage>) => {
    setMessages((prev) => [
      ...prev,
      {
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        sender: "agent",
        text,
        timestamp: nowLabel(),
        ...extra,
      },
    ]);
  };

  useEffect(() => {
    let cancelled = false;

    const loadAgentLeeIdentity = async () => {
      try {
        const response = await fetch("/api/leeway/runtime-fabric/agent-chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            input: AGENT_LEE_LINEAGE_PROMPT,
            mode: "chat",
            speak: false,
          }),
        });
        const raw = await response.text();
        const data = raw ? JSON.parse(raw) : {};
        const responseText = data.response || "";
        const traceText = data.trace
          ? [
              `source: ${data.sourceOfEmbodiment || data.trace.sourceOfEmbodiment || "unknown"}`,
              `corePath: ${data.corePath || data.trace.corePath || "unknown"}`,
              `router: ${data.router || data.trace.router || "unknown"}`,
            ].join("\n")
          : "";

        if (cancelled) return;
        if (response.ok && data.ok !== false && responseText) {
          appendAgentMessage(responseText);
          if (traceText) {
            appendAgentMessage(traceText, {
              isCodeSuggestion: false,
            });
          }
        } else {
          appendAgentMessage(
            [
              "Agent Lee bridge failure:",
              `endpoint=POST /api/leeway/runtime-fabric/agent-chat`,
              `status=${response.status}`,
              `backendError=${data.error || "NONE"}`,
              `raw=${raw || JSON.stringify(data)}`,
            ].join("\n"),
          );
        }
      } catch (error: any) {
        if (!cancelled) {
          appendAgentMessage(
            [
              "Agent Lee bridge failure:",
              "endpoint=POST /api/leeway/runtime-fabric/agent-chat",
              "status=0",
              `backendError=${error?.message || String(error)}`,
            ].join("\n"),
          );
        }
      }
    };

    loadAgentLeeIdentity();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSend = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userPrompt = inputValue.trim();
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: "user",
      text: userPrompt,
      timestamp: nowLabel(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputValue("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/leeway/runtime-fabric/agent-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input: userPrompt,
          mode: "chat",
          speak: false,
        }),
      });

      const raw = await response.text();
      const data = raw ? JSON.parse(raw) : {};

      const responseText = data.response || null;
      const traceText = data.trace
        ? [
            `source: ${data.sourceOfEmbodiment || data.trace.sourceOfEmbodiment || "unknown"}`,
            `corePath: ${data.corePath || data.trace.corePath || "unknown"}`,
            `router: ${data.router || data.trace.router || "unknown"}`,
            `responseLength: ${data.trace.responseLength ?? "unknown"}`,
          ].join("\n")
        : "";

      if (response.ok && responseText) {
        const codeBlockRegex = /```(?:typescript|javascript|tsx|jsx|css|html|json)?\n([\s\S]*?)\n```/g;
        const matches = [...responseText.matchAll(codeBlockRegex)];
        const suggestedCode = matches.length > 0 ? matches[0][1] : "";

        appendAgentMessage(responseText, {
          isCodeSuggestion: Boolean(suggestedCode),
          suggestedCode: suggestedCode || undefined,
          suggestedFilePath: currentFile,
        });
        if (traceText) {
          appendAgentMessage(traceText);
        }
      } else {
        const upstreamError = data.error || "UNKNOWN_ERROR";
        const upstreamMsg   = data.message || data.details || "No detail provided";
        throw new Error(
          [
            `endpoint=POST /api/leeway/runtime-fabric/agent-chat`,
            `status=${response.status}`,
            `backendError=${upstreamError}`,
            `message=${upstreamMsg}`,
            `raw=${raw || JSON.stringify(data)}`,
          ].join(" | "),
        );
      }
    } catch (err: any) {
      // Map known offline codes to human-readable status lines
      const raw = err.message || "Failed request";
      appendAgentMessage(`Agent Lee service failure: ${raw}`);
      return;
      let statusLine = raw;
      if (raw.includes("AGENT_LEE_ROUTER_8080_OFFLINE"))   statusLine = "Router brain :8080 OFFLINE — start agent-lee-coding-mode.";
      else if (raw.includes("AGENT_LEE_DESKTOP_8091_OFFLINE")) statusLine = "Desktop runtime :8091 OFFLINE — start agent-lee-coding-mode desktop.";
      else if (raw.includes("LEEWAY_RUNTIME_FABRIC_4001_OFFLINE") || raw.includes("LEEWAY_RUNTIME_FABRIC_UNREACHABLE")) statusLine = "Runtime Fabric :4001/:8111 OFFLINE — run start-leeway-local-agent-stack.ps1.";
      else if (raw.includes("AGENT_LEE_ROUTER_8080_TIMEOUT"))   statusLine = "Router brain :8080 TIMEOUT — Ollama :11434 may be overloaded.";

      appendAgentMessage([
        `⚠ ${statusLine}`,
      ].join("\n"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleLocalVoice = async () => {
    if (isLoading || isVoiceLoading) return;

    setIsVoiceLoading(true);
    appendAgentMessage("Agent Lee listening through local system microphone...");

    try {
      const response = await fetch("/api/leeway/local-voice/agent-lee-capture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seconds: 5, speak: true }),
      });
      const data = await response.json().catch(() => ({}));
      const transcript = String(data.transcript || "").trim();

      if (!response.ok || data.ok === false) {
        throw new Error(data.message || data.error || `Local voice route failed (${response.status})`);
      }

      if (!transcript) {
        throw new Error("LOCAL_ASR_FAILED: Local ASR returned no transcript");
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `${Date.now()}-voice-user`,
          sender: "user",
          text: transcript,
          timestamp: nowLabel(),
        },
        {
          id: `${Date.now()}-voice-agent`,
          sender: "agent",
          text: data.response || "Agent Lee returned no response text.",
          timestamp: nowLabel(),
        },
      ]);
    } catch (error: any) {
      const message = error?.message || String(error);
      appendAgentMessage(
        message.startsWith("LOCAL_ASR_FAILED")
          ? message
          : `Local voice failure: ${message}`,
      );
    } finally {
      setIsVoiceLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="absolute bottom-16 right-4 z-[90] flex items-center rounded-full bg-blue-500 p-3 text-white shadow-lg transition-all hover:bg-blue-600 hover:scale-105 active:scale-95"
        title="Open Agent Lee"
        id="agent-trigger-button"
      >
        <Sparkles className="mr-1 h-5 w-5 shrink-0 text-white" />
        <span className="pr-1 text-xs font-bold">Agent Lee</span>
      </button>
    );
  }

  return (
    <div
      className="absolute bottom-16 right-4 z-[90] flex max-h-[78%] w-96 flex-col rounded-xl border border-[#30363d] bg-[#161b22]/95 shadow-2xl backdrop-blur pointer-events-auto"
      id="agent-chat-overlay"
    >
      <div className="flex items-center justify-between rounded-t-xl border-b border-[#30363d] bg-[#161b22]/90 p-3.5">
        <div className="flex min-w-0 items-center gap-2">
          <Bot className="h-5 w-5 shrink-0 text-blue-400" />
          <div className="min-w-0">
            <div className="flex items-center gap-1">
              <span className="text-xs font-bold text-white">Agent Lee</span>
              <span className="rounded border border-emerald-500/20 bg-emerald-500/15 px-1 py-0.2 font-mono text-[8px] font-bold uppercase tracking-wider text-emerald-400">
                App Control
              </span>
            </div>
            <p className="truncate text-[9px] text-gray-500">Single canvas operator</p>
          </div>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="rounded p-1 text-gray-500 transition-colors hover:bg-white/5 hover:text-white"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="border-b border-[#30363d] bg-emerald-500/10 px-3 py-2.5">
        <div className="mb-1 flex items-center gap-2 font-mono text-[9px] font-bold uppercase tracking-wider text-emerald-300">
          <span className="h-2 w-2 rounded-full bg-emerald-400" />
          {deploymentLabel}
        </div>
        <p className="text-[9px] text-emerald-100/60">Runtime Fabric chat bridge active</p>
      </div>

      <div className="border-b border-[#30363d] bg-[#0d1117]/60 px-3 py-2.5">
        <p className="mb-1.5 font-mono text-[9px] font-bold uppercase tracking-wider text-gray-500">Control Logs</p>
        <div className="space-y-1">
          {agentLogs.map((log) => (
            <div key={log.id} className="flex items-center text-[10px] text-gray-300">
              <span className={`mr-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${
                log.status === "success" ? "bg-emerald-500" : log.status === "error" ? "bg-red-500" : "bg-amber-500"
              }`} />
              <span className="truncate text-gray-400">{log.text}</span>
            </div>
          ))}
        </div>
      </div>

      <div ref={scrollRef} className="custom-scrollbar max-h-72 flex-1 space-y-3 overflow-y-auto p-3.5 text-xs text-gray-300" id="agent-chat-scroller">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"}`}>
            <span className="mb-1 px-1 text-[9px] text-gray-500">
              {msg.sender === "user" ? "You" : "Agent Lee"} - {msg.timestamp}
            </span>
            <div
              className={`max-w-[95%] rounded-xl p-3 shadow-sm ${
                msg.sender === "user"
                  ? "rounded-tr-none bg-blue-500 text-white"
                  : "rounded-tl-none border border-[#30363d] bg-[#0d1117]"
              }`}
            >
              <div className="select-text">{renderText(msg.text)}</div>

              {msg.isCodeSuggestion && msg.suggestedCode && (
                <div className="mt-3 border-t border-[#30363d] pt-3">
                  <div className="mb-2 flex items-center gap-1.5 font-mono text-[10px] text-emerald-400">
                    <CheckCircle className="h-3.5 w-3.5" />
                    <span>Proposed edits for {msg.suggestedFilePath}</span>
                  </div>
                  <button
                    onClick={() => msg.suggestedCode && onCodeInjected(msg.suggestedCode)}
                    className="w-full rounded-lg bg-emerald-500 py-1.5 text-center text-[10px] font-bold uppercase text-black transition-all hover:brightness-110 active:scale-95"
                  >
                    Apply Changes to Editor
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex items-center gap-2 p-2 text-gray-400">
            <Loader2 className="h-4 w-4 animate-spin text-blue-400" />
            <span className="font-mono text-[10px] uppercase tracking-wider">Agent Lee routing...</span>
          </div>
        )}
        {isVoiceLoading && (
          <div className="flex items-center gap-2 p-2 text-gray-400">
            <Loader2 className="h-4 w-4 animate-spin text-emerald-400" />
            <span className="font-mono text-[10px] uppercase tracking-wider">Local mic capture...</span>
          </div>
        )}
      </div>

      <div className="rounded-b-xl border-t border-[#30363d] bg-[#161b22]/90 p-3">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            handleSend();
          }}
          className="relative flex items-center"
        >
          <input
            type="text"
            value={inputValue}
            onChange={(event) => setInputValue(event.target.value)}
            placeholder="Message Agent Lee..."
            className="w-full rounded-lg border border-[#30363d] bg-[#0d1117] px-3.5 py-2.5 pr-16 text-xs text-gray-200 outline-none transition-colors placeholder:text-gray-500 focus:border-blue-500"
            id="agent-chat-input-element"
          />
          <button
            type="button"
            onClick={handleLocalVoice}
            disabled={isLoading || isVoiceLoading}
            className="absolute right-8 rounded p-1.5 text-gray-500 transition-all hover:text-white disabled:opacity-30"
            title="Local system microphone"
            aria-label="Local system microphone"
          >
            {isVoiceLoading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-400" />
            ) : (
              <Mic className="h-3.5 w-3.5 text-emerald-400" />
            )}
          </button>
          <button
            type="submit"
            disabled={!inputValue.trim() || isLoading}
            className="absolute right-1.5 rounded p-1.5 text-gray-500 transition-all hover:text-white disabled:opacity-30"
          >
            <Send className="h-3.5 w-3.5 text-blue-400" />
          </button>
        </form>
      </div>
    </div>
  );
}

// Leeway Standards: Agent Lee application-control overlay
