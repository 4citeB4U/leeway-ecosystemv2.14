/**
 * LEEWAY_HEADER - DO NOT REMOVE
 *
 * REGION: UI
 * TAG: UI.TERMINAL.CONSOLE_PANEL
 * DESCRIPTION: Truth-bound Leeway IDE console panel routed to Agent Lee command planning.
 * AUTHORITY: LeeWay-Standards
 * DISCOVERY_PIPELINE: Voice -> Intent -> Location -> Vertical -> Ranking -> Render
 *
 * 5WH:
 * WHAT = Console and terminal log surface
 * WHY = Provide a terminal-facing UI without faking shell execution, sessions, or receipts
 * WHO = Leeway Innovations / Agent Lee Enablement
 * WHERE = leeway-ide-single-canvas/src/components/ConsolePanel.tsx
 * WHEN = 2026-06-07
 * HOW = React component with local UI commands and Omni-Terminal command-plan routing
 *
 * CHAIN: Standards -> Agent Lee -> Omni-Terminal Plan -> Approval -> Receipt
 * LICENSE: PROPRIETARY
 */

import React, { useState, useRef, useEffect } from "react";
import { Terminal as TermIcon, AlertCircle, ChevronUp, ChevronDown } from "lucide-react";

export interface LogLine {
  text: string;
  type: "info" | "success" | "error" | "input";
}

interface ConsolePanelProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  logs: LogLine[];
  onAddLog: (line: LogLine) => void;
  onClearLogs: () => void;
  onCommand?: (command: string) => Promise<void> | void;
}

export function ConsolePanel({
  isOpen,
  setIsOpen,
  logs,
  onAddLog,
  onClearLogs,
  onCommand,
}: ConsolePanelProps) {
  const [activeTab, setActiveTab] = useState<"terminal" | "problems" | "output" | "git">("terminal");
  const [shellInput, setShellInput] = useState("");
  const [isPlanningCommand, setIsPlanningCommand] = useState(false);
  const terminalEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs, isOpen]);

  const handleShellCommand = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!shellInput.trim() || isPlanningCommand) return;

    const cmd = shellInput.trim();
    const parsedCmd = cmd.toLowerCase();
    onAddLog({ text: `leeway > ${cmd}`, type: "input" });
    setShellInput("");

    if (parsedCmd === "clear") {
      onClearLogs();
      return;
    }

    if (parsedCmd === "help") {
      onAddLog({
        text: [
          "Leeway IDE Terminal v2.1",
          "help: display command context",
          "clear: purge console log history",
          "npm run build: create a Runtime Fabric command plan",
          "git status: create a Runtime Fabric command plan",
          "node -v: create a Runtime Fabric command plan",
          "sensors: create a Runtime Fabric command plan",
          "Execution is receipt-bound. Commands do not run unless Omni-Terminal Fabric approves, executes, and returns a receipt.",
        ].join("\n"),
        type: "info",
      });
      return;
    }

    try {
      setIsPlanningCommand(true);
      if (onCommand) {
        await onCommand(cmd);
      } else {
        onAddLog({
          text: "OMNI_TERMINAL_FABRIC_REQUIRED: no command planner is bound to this console.",
          type: "error",
        });
      }
    } finally {
      setIsPlanningCommand(false);
    }
  };

  if (!isOpen) {
    return (
      <div className="bg-[#161b22] border-t border-[#30363d] h-10 px-4 flex items-center justify-between select-none shrink-0">
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center space-x-2 text-xs text-[#c9d1d9] hover:text-white cursor-pointer"
        >
          <TermIcon className="w-4 h-4 text-blue-400" />
          <span className="font-mono">Console & Terminal Log</span>
          <span className="text-[10px] bg-white/5 text-gray-400 font-mono px-1 py-0.2 rounded shrink-0">plan</span>
        </button>
        <button
          onClick={() => setIsOpen(true)}
          className="p-1 hover:bg-white/5 rounded text-gray-500 hover:text-white cursor-pointer"
        >
          <ChevronUp className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="bg-[#0d1117] border-t border-[#30363d] h-56 flex flex-col shrink-0 min-h-0 relative select-none" id="console-logs-tabpanel">
      <div className="flex justify-between items-center bg-[#161b22] border-b border-[#30363d] px-2 select-none h-9">
        <div className="flex space-x-3 text-xs">
          {(["terminal", "problems", "output", "git"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-1.5 px-3.5 capitalize font-sans tracking-wide transition-colors cursor-pointer relative ${
                activeTab === tab ? "text-white font-medium" : "text-gray-400 hover:text-gray-200"
              }`}
            >
              <span className="flex items-center space-x-1.5">
                {tab === "problems" && <span className="w-1.5 h-1.5 bg-yellow-400 rounded-full shrink-0" />}
                <span>{tab}</span>
              </span>
              {activeTab === tab && <div className="absolute left-2.5 right-2.5 bottom-0 h-[2px] bg-blue-500 rounded-full" />}
            </button>
          ))}
        </div>

        <button
          onClick={() => setIsOpen(false)}
          className="p-1 text-gray-500 hover:text-white hover:bg-white/5 rounded cursor-pointer"
        >
          <ChevronDown className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-grow overflow-y-auto p-4 font-mono text-[11px] leading-5 custom-scrollbar min-h-0 bg-[#0d1117]/40">
        {activeTab === "terminal" && (
          <div className="space-y-1.5 select-text">
            {logs.map((log, idx) => {
              let textClass = "text-gray-300";
              if (log.type === "success") textClass = "text-emerald-400";
              else if (log.type === "error") textClass = "text-red-400 font-medium";
              else if (log.type === "input") textClass = "text-blue-400 font-semibold";

              return (
                <div key={idx} className={`${textClass} whitespace-pre-wrap select-text`}>
                  {log.text}
                </div>
              );
            })}

            <form onSubmit={handleShellCommand} className="flex items-center space-x-1.5 pt-1.5">
              <span className="text-blue-400 font-bold shrink-0">leeway &gt;</span>
              <input
                type="text"
                value={shellInput}
                onChange={(event) => setShellInput(event.target.value)}
                disabled={isPlanningCommand}
                placeholder={isPlanningCommand ? "Creating command plan..." : "Type command (e.g. help, git status, npm run build)"}
                className="flex-1 bg-transparent border-0 focus:ring-0 focus:outline-none p-0 text-white font-mono text-[11px] disabled:opacity-50"
                id="terminal-command-input"
              />
            </form>
            <div ref={terminalEndRef} />
          </div>
        )}

        {activeTab === "problems" && (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 space-y-1.5">
            <AlertCircle className="w-8 h-8 text-amber-500" />
            <p className="text-xs font-sans text-gray-300">Runtime command checks require receipts.</p>
            <p className="text-[10px]">Use the command planner for shell, device, or bridge actions.</p>
          </div>
        )}

        {activeTab === "output" && (
          <div className="space-y-1 text-gray-400 select-text font-mono">
            <div>[info] Console is bound to Agent Lee command planning.</div>
            <div>[info] Real execution requires Omni-Terminal Fabric and command receipts.</div>
            <div>[info] Use Runtime Health Monitor nodes for live bridge status.</div>
          </div>
        )}

        {activeTab === "git" && (
          <div className="space-y-1 text-gray-400 font-mono">
            <div>Git status is not read by the browser console.</div>
            <div className="text-amber-400">COMMAND_PLAN_REQUIRED</div>
            <div className="text-gray-500 mt-2">Type git status to request a Runtime Fabric command plan.</div>
          </div>
        )}
      </div>
    </div>
  );
}

// Leeway Standards: truth-bound terminal console surface
