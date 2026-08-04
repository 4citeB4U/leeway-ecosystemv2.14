/**
 * LEEWAY_HEADER - DO NOT REMOVE
 *
 * REGION: UI
 * TAG: UI.COMPONENT.PLACEHOLDER
 * DESCRIPTION: Leeway IDE component
 * AUTHORITY: LeeWay-Standards
 * DISCOVERY_PIPELINE: Voice -> Intent -> Location -> Vertical -> Ranking -> Render
 *
 * 5WH:
 * WHAT = Component
 * WHY = Provide functionality
 * WHO = Leeway Innovations / Agent Lee Enablement
 * WHERE = FILEPATH
 * WHEN = 2026-06-06
 * HOW = React component
 *
 * CHAIN: Standards ? Integrated ? Runtime ? Projections
 * LICENSE: PROPRIETARY
 */

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Comprehensive Settings Node - Agent Lee Configuration
 * This is the complete settings interface with all tabs
 */

import React, { useState } from "react";
import { Settings, Mic, Users, Wrench, Plug, Palette, Terminal, ShieldCheck } from "lucide-react";
import { LeewayCanvasSettings, DEFAULT_LEEWAY_CANVAS_SETTINGS } from "../types/nodeTypes";
import { OmniTerminalSnapshot, createRequiredOmniTerminalSnapshot } from "../services/omniTerminalFabric";

interface SettingsNodeContentProps {
  data?: any;
  canvasSettings?: LeewayCanvasSettings;
  onCanvasSettingsChange?: (settings: LeewayCanvasSettings) => void;
  runtimeSnapshot?: OmniTerminalSnapshot;
}

export function SettingsNodeContent({ data, canvasSettings = DEFAULT_LEEWAY_CANVAS_SETTINGS, onCanvasSettingsChange, runtimeSnapshot }: SettingsNodeContentProps) {
  const [activeTab, setActiveTab] = useState("general");
  const omniTerminal = runtimeSnapshot ?? createRequiredOmniTerminalSnapshot();

  const tabs = [
    { id: "general", icon: Settings, label: "General" },
    { id: "configuration", icon: Settings, label: "Configuration" },
    { id: "canvas", icon: Palette, label: "Canvas Theme" },
    { id: "omni-terminal", icon: Terminal, label: "Omni-Terminal" },
    { id: "voice", icon: Mic, label: "Voice of Agent Lee" },
    { id: "mcp", icon: Settings, label: "MCP servers" },
    { id: "agents", icon: Users, label: "Agents" },
    { id: "workers", icon: Wrench, label: "Workers" },
    { id: "plugins", icon: Plug, label: "Plugins" }
  ];

  return (
    <div className="flex h-full bg-[#0d1117]">
      {/* Sidebar */}
      <div className="w-40 border-r border-[#30363d] p-2 space-y-1">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-[10px] transition-colors ${
                activeTab === tab.id
                  ? "bg-blue-500/20 text-blue-400 font-bold"
                  : "text-gray-400 hover:bg-white/5 hover:text-white"
              }`}
            >
              <Icon className="w-3 h-3" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar text-xs">
        {activeTab === "general" && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-white">General Settings</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold text-gray-300 mb-1">Agent environment</label>
                <select className="w-full bg-[#161b22] border border-[#30363d] rounded px-2 py-1 text-[10px] text-white">
                  <option>Windows native</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-300 mb-1">Language</label>
                <select className="w-full bg-[#161b22] border border-[#30363d] rounded px-2 py-1 text-[10px] text-white">
                  <option>Auto Detect</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-300 mb-1">Speed</label>
                <select className="w-full bg-[#161b22] border border-[#30363d] rounded px-2 py-1 text-[10px] text-white">
                  <option>Standard</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {activeTab === "configuration" && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-white">Configuration</h3>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-gray-300 mb-1">Work Mode</label>
                  <select className="w-full bg-[#161b22] border border-[#30363d] rounded px-2 py-1 text-[10px] text-white">
                    <option>Execute</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-300 mb-1">Approval</label>
                  <select className="w-full bg-[#161b22] border border-[#30363d] rounded px-2 py-1 text-[10px] text-white">
                    <option>Default</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-300 mb-1">Primary Model</label>
                <select className="w-full bg-[#161b22] border border-[#30363d] rounded px-2 py-1 text-[10px] text-white">
                  <option>qwen2.5-coder:14b</option>
                </select>
              </div>
              <div>
                <h4 className="text-[10px] font-bold text-purple-400 uppercase mb-2">LeeWay Model Family</h4>
                <div className="space-y-1">
                  {[
                    "QWEN 2.5 Coder 14B (9.0 GB)",
                    "QWEN 2.5 Coder 7B (4.7 GB)",
                    "QWEN 2.5 Coder 1.5B (986 MB)",
                    "QWEN 3 (5.2 GB)",
                    "QWEN 2.5 VL 7B (6.0 GB)",
                    "DeepSeek Coder 1B (776 MB)"
                  ].map((model, idx) => (
                    <div key={idx} className="bg-[#161b22] border border-[#30363d] rounded p-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] text-white">{model}</span>
                        <span className="text-[8px] text-red-400">OLLAMA_CONNECTION_FAILED</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}


        {activeTab === "canvas" && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-white">Agent Lee Canvas Theme</h3>
            <p className="text-[10px] leading-relaxed text-gray-400">These settings control the Leeway IDE board itself: background mode, mesh color, shape density, animation speed, and the default no-shapes background.</p>
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-300 mb-1">Board Background</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: "Default", value: "default" as const },
                    { label: "Galactic Mesh", value: "galactic" as const },
                  ].map((mode) => (
                    <button
                      key={mode.value}
                      type="button"
                      onClick={() => onCanvasSettingsChange?.({ ...canvasSettings, backgroundMode: mode.value })}
                      className={`rounded border px-3 py-2 text-[10px] font-black uppercase ${canvasSettings.backgroundMode === mode.value ? "border-blue-500 bg-blue-500/20 text-blue-300" : "border-[#30363d] bg-[#161b22] text-gray-400"}`}
                    >
                      {mode.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="space-y-1">
                  <span className="block text-[10px] font-bold text-gray-300">Accent Color</span>
                  <input type="color" value={canvasSettings.accentColor} onChange={(e) => onCanvasSettingsChange?.({ ...canvasSettings, accentColor: e.target.value, galaxyTint: e.target.value })} className="h-9 w-full rounded border border-[#30363d] bg-[#161b22]" />
                </label>
                <label className="space-y-1">
                  <span className="block text-[10px] font-bold text-gray-300">Mesh Tint</span>
                  <input type="color" value={canvasSettings.galaxyTint} onChange={(e) => onCanvasSettingsChange?.({ ...canvasSettings, galaxyTint: e.target.value })} className="h-9 w-full rounded border border-[#30363d] bg-[#161b22]" />
                </label>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-300 mb-1">Mesh Style</label>
                <select value={canvasSettings.galaxyStyle} onChange={(e) => onCanvasSettingsChange?.({ ...canvasSettings, galaxyStyle: e.target.value as LeewayCanvasSettings["galaxyStyle"] })} className="w-full bg-[#161b22] border border-[#30363d] rounded px-2 py-1 text-[10px] text-white">
                  <option value="all">Full Mixed Mesh</option>
                  <option value="shards">Glass Shards</option>
                  <option value="orbs">Soft Orbs</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-300 mb-1">Shape Density: {canvasSettings.galaxyDensity}</label>
                <input type="range" min="0" max="1200" step="50" value={canvasSettings.galaxyDensity} onChange={(e) => onCanvasSettingsChange?.({ ...canvasSettings, galaxyDensity: Number(e.target.value) })} className="w-full" />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-300 mb-1">Scroll / Drift Speed: {canvasSettings.galaxySpeed.toFixed(2)}</label>
                <input type="range" min="0" max="1.5" step="0.05" value={canvasSettings.galaxySpeed} onChange={(e) => onCanvasSettingsChange?.({ ...canvasSettings, galaxySpeed: Number(e.target.value) })} className="w-full" />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => onCanvasSettingsChange?.({ ...canvasSettings, showMeshDots: !canvasSettings.showMeshDots })} className={`rounded border px-3 py-2 text-[9px] font-bold ${canvasSettings.showMeshDots ? "border-blue-500/50 bg-blue-500/20 text-blue-300" : "border-[#30363d] bg-[#161b22] text-gray-500"}`}>Dots</button>
                <button type="button" onClick={() => onCanvasSettingsChange?.({ ...canvasSettings, showMeshLines: !canvasSettings.showMeshLines })} className={`rounded border px-3 py-2 text-[9px] font-bold ${canvasSettings.showMeshLines ? "border-blue-500/50 bg-blue-500/20 text-blue-300" : "border-[#30363d] bg-[#161b22] text-gray-500"}`}>Lines</button>
              </div>

              <button type="button" onClick={() => onCanvasSettingsChange?.(DEFAULT_LEEWAY_CANVAS_SETTINGS)} className="w-full rounded border border-white/10 bg-white/5 px-3 py-2 text-[10px] font-black uppercase text-gray-300 hover:bg-white/10">Restore Leeway Defaults</button>
            </div>
          </div>
        )}

        {activeTab === "omni-terminal" && (
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-white">Omni-Terminal</h3>
                <p className="mt-1 font-mono text-[9px] text-gray-500">{omniTerminal.runtimeEndpoint}</p>
              </div>
              <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-[8px] font-black uppercase tracking-widest text-amber-300">
                {omniTerminal.terminalFabricStatus}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {[
                ["Runtime endpoint", omniTerminal.runtimeEndpoint],
                ["Runtime", omniTerminal.runtimeStatus],
                ["Local bridge", omniTerminal.localBridgeStatus],
                ["Local bridge URL", omniTerminal.localDeviceBridgeEndpoint ?? "LOCAL_DEVICE_BRIDGE_REQUIRED"],
                ["Terminal Fabric", omniTerminal.terminalFabricStatus],
                ["Sessions", `${omniTerminal.activeSessionCount} / ${omniTerminal.sessionStatus}`],
                ["Device registry", `${omniTerminal.deviceRegistryCount} / ${omniTerminal.deviceRegistryStatus}`],
                ["Tags", omniTerminal.deviceTagCount],
                ["Last receipt", omniTerminal.lastReceipt?.receiptId ?? "None"],
                ["Blocked commands", omniTerminal.blockedCommandCount],
                ["Approval queue", omniTerminal.approvalQueueCount],
              ].map(([label, value]) => (
                <div key={label} className="rounded border border-[#30363d] bg-[#161b22] p-2">
                  <div className="text-[8px] font-black uppercase tracking-widest text-gray-500">{label}</div>
                  <div className="mt-1 truncate font-mono text-[9px] text-white">{value}</div>
                </div>
              ))}
            </div>

            <div>
              <h4 className="mb-2 text-[10px] font-bold uppercase text-gray-300">Endpoint Checks</h4>
              <div className="space-y-1">
                {omniTerminal.endpointsChecked.length === 0 ? (
                  <div className="rounded border border-[#30363d] bg-[#161b22] p-3 font-mono text-[9px] text-amber-300">RUNTIME_FABRIC_UNREACHABLE</div>
                ) : (
                  omniTerminal.endpointsChecked.map((probe) => (
                    <div key={probe.id} className="grid grid-cols-[1fr_1.2fr_auto] gap-2 rounded border border-[#30363d] bg-[#161b22] p-2 text-[8px]">
                      <span className="truncate font-bold text-white">{probe.id}</span>
                      <span className="truncate font-mono text-gray-500">{probe.path}</span>
                      <span className={probe.ok ? "font-black text-emerald-300" : "font-black text-amber-300"}>{probe.ok ? "reachable" : probe.statusCode}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div>
              <h4 className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase text-gray-300">
                <ShieldCheck className="h-3 w-3 text-emerald-400" />
                Protocol Bridges
              </h4>
              <div className="grid grid-cols-2 gap-2">
                {omniTerminal.protocols.map((protocol) => (
                  <div key={protocol.id} className="rounded border border-[#30363d] bg-[#161b22] p-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-[9px] font-bold text-white">{protocol.label}</span>
                      <span className={`rounded px-1.5 py-0.5 text-[7px] font-black uppercase ${
                        protocol.status === "Connected"
                          ? "bg-emerald-500/15 text-emerald-300"
                          : protocol.status === "Disabled" || protocol.status === "Error"
                            ? "bg-red-500/15 text-red-300"
                            : "bg-amber-500/15 text-amber-300"
                      }`}>
                        {protocol.status}
                      </span>
                    </div>
                    <p className="mt-1 truncate text-[8px] text-gray-500">{protocol.code}</p>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h4 className="mb-2 text-[10px] font-bold uppercase text-gray-300">Device Discovery</h4>
              <div className="grid grid-cols-4 gap-1">
                {["Scan LAN", "Scan mDNS", "Scan Bluetooth", "Scan USB", "Scan Serial", "Scan Printers", "Scan ADB", "Scan IoT", "Scan All"].map((label) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => window.dispatchEvent(new CustomEvent("leeway:omni-terminal-command-plan", { detail: { prompt: label, source: "settings" } }))}
                    className="rounded border border-blue-500/20 bg-blue-500/10 px-2 py-1.5 text-[8px] font-bold uppercase text-blue-300"
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h4 className="mb-2 text-[10px] font-bold uppercase text-gray-300">Device Tags</h4>
              <div className="space-y-1">
                {omniTerminal.tags.length === 0 ? (
                  <div className="rounded border border-[#30363d] bg-[#161b22] p-3 font-mono text-[9px] text-amber-300">NO_DEVICE_REGISTRY_BOUND</div>
                ) : (
                  omniTerminal.tags.map((tag) => (
                    <div key={tag.tag} className="grid grid-cols-4 gap-2 rounded border border-[#30363d] bg-[#161b22] p-2 text-[8px]">
                      <span className="font-bold text-white">{tag.tag}</span>
                      <span className="text-gray-400">{tag.deviceCount} devices</span>
                      <span className="text-gray-400">{tag.defaultProtocol}</span>
                      <span className="text-amber-300">{tag.approvalMode}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div>
              <h4 className="mb-2 text-[10px] font-bold uppercase text-gray-300">Execution Policy</h4>
              <div className="grid grid-cols-2 gap-1">
                {[
                  "allow local shell",
                  "allow SSH",
                  "allow ADB",
                  "allow printer actions",
                  "allow BLE reads",
                  "allow BLE writes",
                  "allow serial commands",
                  "allow IoT commands",
                  "allow SDR receive",
                  "allow SDR transmit",
                  "require receipts",
                  "require approval for medium risk",
                  "block high risk unless manually approved",
                ].map((policy) => {
                  const enabled = policy === "require receipts" || policy.includes("approval") || policy.includes("block high risk");
                  return (
                    <label key={policy} className="flex items-center gap-2 rounded border border-[#30363d] bg-[#161b22] px-2 py-1.5 text-[8px] uppercase text-gray-300">
                      <input type="checkbox" checked={enabled} readOnly className="h-3 w-3 accent-blue-500" />
                      <span>{policy}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div>
              <h4 className="mb-2 text-[10px] font-bold uppercase text-gray-300">Terminal Theme</h4>
              <div className="grid grid-cols-2 gap-2">
                <select className="rounded border border-[#30363d] bg-[#161b22] px-2 py-1 text-[10px] text-white">
                  <option>JetBrains Mono</option>
                  <option>Consolas</option>
                  <option>Fira Code</option>
                </select>
                <input type="number" min="9" max="18" defaultValue={11} className="rounded border border-[#30363d] bg-[#161b22] px-2 py-1 text-[10px] text-white" />
                <select className="rounded border border-[#30363d] bg-[#161b22] px-2 py-1 text-[10px] text-white">
                  <option>Block cursor</option>
                  <option>Bar cursor</option>
                </select>
                <select className="rounded border border-[#30363d] bg-[#161b22] px-2 py-1 text-[10px] text-white">
                  <option>Leeway dark mesh</option>
                  <option>High contrast</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {activeTab === "voice" && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-white">Voice of Agent Lee</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold text-gray-300 mb-1">Voice Output</label>
                <div className="rounded border border-amber-500/30 bg-amber-500/10 p-2 font-mono text-[9px] text-amber-300">
                  {omniTerminal.localBridgeStatus === "LOCAL_DEVICE_BRIDGE_REQUIRED" ? "LOCAL_DEVICE_BRIDGE_REQUIRED" : "COMMAND_RECEIPT_REQUIRED"}
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-300 mb-1">Voice Provider</label>
                <select className="w-full bg-[#161b22] border border-[#30363d] rounded px-2 py-1 text-[10px] text-white">
                  <option>Runtime Fabric voice route required</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-gray-300 mb-1">Speed: 0.90x</label>
                  <input type="range" min="0.5" max="2" step="0.1" defaultValue="0.9" className="w-full" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-300 mb-1">Volume: 1.00x</label>
                  <input type="range" min="0" max="2" step="0.1" defaultValue="1" className="w-full" />
                </div>
              </div>
              <div className="border-t border-[#30363d] pt-3">
                <h4 className="text-[10px] font-bold text-gray-300 mb-2">Voice Cloning</h4>
                <div className="bg-[#161b22] border border-[#30363d] rounded p-2 text-[9px] text-gray-400">
                  Clone engine: RUNTIME_BACKEND_STATUS_REQUIRED<br/>
                  Reference: COMMAND_RECEIPT_REQUIRED
                </div>
                <div className="flex gap-1 mt-2">
                  <button onClick={() => window.dispatchEvent(new CustomEvent("leeway:omni-terminal-command-plan", { detail: { prompt: "Create voice clone command plan", source: "settings" } }))} className="px-2 py-1 bg-blue-500/20 border border-blue-500/30 rounded text-[9px] text-blue-400">Plan Clone</button>
                  <button onClick={() => window.dispatchEvent(new CustomEvent("leeway:omni-terminal-command-plan", { detail: { prompt: "Create voice test command plan", source: "settings" } }))} className="px-2 py-1 bg-blue-500/20 border border-blue-500/30 rounded text-[9px] text-blue-400">Plan Test</button>
                </div>
              </div>
              <div className="border-t border-[#30363d] pt-3">
                <h4 className="text-[10px] font-bold text-gray-300 mb-2">Camera Status</h4>
                <div className="bg-[#161b22] border border-[#30363d] rounded p-2 text-[9px]">
                  <div className="text-amber-400">{omniTerminal.localBridgeStatus}</div>
                  <div className="text-gray-500">Status: CAMERA_RUNTIME_RECEIPT_REQUIRED</div>
                </div>
                <div className="flex gap-1 mt-2">
                  <button onClick={() => window.dispatchEvent(new CustomEvent("leeway:omni-terminal-command-plan", { detail: { prompt: "Create camera test command plan", source: "settings" } }))} className="px-2 py-1 bg-blue-500/20 border border-blue-500/30 rounded text-[9px] text-blue-400">Plan Camera Test</button>
                  <button onClick={() => window.dispatchEvent(new CustomEvent("leeway:omni-terminal-command-plan", { detail: { prompt: "Create camera permission command plan", source: "settings" } }))} className="px-2 py-1 bg-blue-500/20 border border-blue-500/30 rounded text-[9px] text-blue-400">Plan Permission</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "mcp" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">MCP Servers</h3>
              <button className="px-2 py-1 bg-blue-500/20 border border-blue-500/30 rounded text-[9px] text-blue-400">+ Add</button>
            </div>
            <div className="space-y-1">
              {[
                "LeeWay Registry MCP Agent",
                "LeeWay Desktop Commander MCP Agent",
                "LeeWay Docs RAG MCP Agent",
                "LeeWay Health MCP Agent",
                "LeeWay Memory MCP Agent",
                "LeeWay Planner MCP Agent"
              ].map((server, idx) => (
                <div key={idx} className="bg-[#161b22] border border-[#30363d] rounded p-2 flex items-center justify-between">
                  <div className="text-[9px] text-white">{server}</div>
                  <button className="p-0.5 hover:bg-white/5 rounded"><Settings className="w-3 h-3 text-gray-400" /></button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "agents" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">Agents</h3>
              <button className="px-2 py-1 bg-blue-500/20 border border-blue-500/30 rounded text-[9px] text-blue-400">+ Add</button>
            </div>
            <div className="space-y-1">
              {[
                { name: "Agent Lee Prime", desc: "Primary chat and execution lead" },
                { name: "LeeWay File Navigator Agent", desc: "File system navigation" },
                { name: "LeeWay Host Execution Agent", desc: "Host-side execution" },
                { name: "LeeWay Media Forge Agent", desc: "Image and media generation" },
                { name: "LeeWay Shield Governor Agent", desc: "Security officer" }
              ].map((agent, idx) => (
                <div key={idx} className="bg-[#161b22] border border-[#30363d] rounded p-2">
                  <div className="text-[9px] font-bold text-white">{agent.name}</div>
                  <div className="text-[8px] text-gray-500">{agent.desc}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "workers" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">Workers</h3>
              <button className="px-2 py-1 bg-blue-500/20 border border-blue-500/30 rounded text-[9px] text-blue-400">+ Add</button>
            </div>
            <div className="space-y-1">
              {[
                { name: "Leeway Visual Orchestrator", type: "LVIS Orchestration" },
                { name: "Leeway Vector Reconstruction", type: "Vector Reconstruction" },
                { name: "Leeway Voxel Reconstruction", type: "Voxel Reconstruction" },
                { name: "Leeway Scene Reconstruction", type: "Scene Reconstruction" },
                { name: "Leeway Asset Repair Worker", type: "Asset Repair" }
              ].map((worker, idx) => (
                <div key={idx} className="bg-[#161b22] border border-[#30363d] rounded p-2">
                  <div className="text-[9px] font-bold text-white">{worker.name}</div>
                  <div className="text-[8px] text-purple-400">{worker.type}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "plugins" && (
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-white">Plugins</h3>
            {["Coding", "Design", "Productivity"].map(category => (
              <div key={category}>
                <h4 className="text-[10px] font-bold text-purple-400 uppercase mb-2">{category}</h4>
                <div className="grid grid-cols-2 gap-2">
                  {[1, 2, 3, 4].map(idx => (
                    <div key={idx} className="bg-[#161b22] border border-[#30363d] rounded p-2 hover:border-blue-500/30 cursor-pointer">
                      <div className="text-[9px] font-bold text-white">Plugin {idx}</div>
                      <div className="text-[8px] text-gray-500">Description</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Leeway Standards: Agent Lee settings surface
