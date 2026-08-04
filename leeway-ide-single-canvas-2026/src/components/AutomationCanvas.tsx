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

import React, { useState } from "react";
import { 
  Play, 
  Trash2, 
  PlusCircle, 
  ToggleLeft, 
  ToggleRight, 
  Check, 
  Settings,
  GitPullRequest
} from "lucide-react";
import { AutomationNode, AutomationEdge } from "../types";

export function AutomationCanvas() {
  const [nodes, setNodes] = useState<AutomationNode[]>([
    { id: "1", type: "trigger", label: "New User Trigger", description: "Webhook path: /api/signup", x: 60, y: 150, config: { path: "/api/signup" } },
    { id: "2", type: "action", label: "Create Account", description: "Knex database insertion", x: 260, y: 150, config: { target_table: "users" } },
    { id: "3", type: "action", label: "Send Welcome Email", description: "Postmark API integration", x: 460, y: 120, config: { template_name: "welcome_v2" } },
    { id: "4", type: "action", label: "Add to Active CRM", description: "Salesforce contact pipeline", x: 260, y: 280, config: { list_id: "newsletter_leads_2" } },
    { id: "5", type: "action", label: "Log Event Audit", description: "Pino server JSON pipeline", x: 460, y: 280, config: { severity: "info" } }
  ]);

  const [edges, setEdges] = useState<AutomationEdge[]>([
    { fromNodeId: "1", toNodeId: "2" },
    { fromNodeId: "2", toNodeId: "3" },
    { fromNodeId: "2", toNodeId: "4" },
    { fromNodeId: "4", toNodeId: "5" }
  ]);

  const [activeWorkflow, setActiveWorkflow] = useState(true);
  const [selectedNode, setSelectedNode] = useState<AutomationNode | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  // Quick inputs to add customized nodes
  const [newNodeLabel, setNewNodeLabel] = useState("");
  const [newNodeType, setNewNodeType] = useState<"trigger" | "action">("action");

  const runWorkflowAnimation = () => {
    if (isRunning) return;
    setIsRunning(true);

    // Sequence indices
    const steps = ["1", "2-4", "3-5"];

    const updateStatus = (targetIds: string[], status: any) => {
      setNodes(prev => prev.map(n => targetIds.includes(n.id) ? { ...n, status } : n));
    };

    // Reset status
    setNodes(prev => prev.map(n => ({ ...n, status: "idle" })));

    // Step 1: New User Trigger fires
    setTimeout(() => {
      updateStatus(["1"], "running");
    }, 200);
    setTimeout(() => {
      updateStatus(["1"], "success");
      updateStatus(["2", "4"], "running");
    }, 1200);

    // Step 2: Create Account / CRM fires
    setTimeout(() => {
      updateStatus(["2", "4"], "success");
      updateStatus(["3", "5"], "running");
    }, 2400);

    // Step 3: Send Welcome Email / Log Event completes
    setTimeout(() => {
      updateStatus(["3", "5"], "success");
      setIsRunning(false);
    }, 3600);
  };

  const handleNodeDragStart = (e: React.MouseEvent, nodeId: string) => {
    if ((e.target as HTMLElement).closest("button, input, select, textarea, span")) return;
    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;
    
    const targetNode = nodes.find(n => n.id === nodeId);
    if (!targetNode) return;
    
    const initialX = targetNode.x;
    const initialY = targetNode.y;
    
    const handleMouseMove = (moveEvent: MouseEvent) => {
      const dx = moveEvent.clientX - startX;
      const dy = moveEvent.clientY - startY;
      setNodes(prev => prev.map(n => 
        n.id === nodeId 
          ? { ...n, x: Math.max(10, Math.min(1000, initialX + dx)), y: Math.max(10, Math.min(600, initialY + dy)) }
          : n
      ));
    };
    
    const handleMouseUp = () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
    
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };

  const handleAddNode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNodeLabel.trim()) return;

    // Place the new node at a random-ish coordinate on the grid
    const freshId = (Date.now()).toString();
    const freshNode: AutomationNode = {
      id: freshId,
      type: newNodeType,
      label: newNodeLabel.trim(),
      description: newNodeType === "trigger" ? "Simulated API Trigger" : "Postman/REST API action",
      x: 350,
      y: 200,
      config: { api_endpoint: "https://api.example.com/v1" }
    };

    setNodes(prev => [...prev, freshNode]);
    
    // Auto-link to Create Account action (node '2') if any action is created
    if (newNodeType === "action") {
      setEdges(prev => [...prev, { fromNodeId: "2", toNodeId: freshId }]);
    } else {
      setEdges(prev => [...prev, { fromNodeId: freshId, toNodeId: "2" }]);
    }

    setNewNodeLabel("");
  };

  const handleDeleteNode = (nodeId: string) => {
    setNodes(prev => prev.filter(n => n.id !== nodeId));
    setEdges(prev => prev.filter(e => e.fromNodeId !== nodeId && e.toNodeId !== nodeId));
    if (selectedNode?.id === nodeId) {
      setSelectedNode(null);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 select-none bg-[#161b22]/50 border border-[#30363d] rounded-2xl overflow-hidden p-4" id="automation-canvas-panel">
      {/* Header panel */}
      <div className="flex items-center justify-between border-b border-[#30363d] pb-3.5 mb-4 shrink-0">
        <div className="flex items-center space-x-2">
          <GitPullRequest className="w-4 h-4 text-blue-400" />
          <div>
            <div className="flex items-center space-x-1 font-sans">
              <span className="text-xs font-bold text-white">Automation Flow</span>
              <span className="text-[9px] bg-blue-500/10 border border-blue-500/15 text-blue-400 px-1 hover:text-blue-200 rounded font-bold tracking-tight">Active</span>
            </div>
            <p className="text-[9px] text-gray-500 font-sans">User Onboarding Workflow</p>
          </div>
        </div>

        {/* Workflow settings and execution */}
        <div className="flex items-center space-x-2 shrink-0">
          <button
            onClick={() => setActiveWorkflow(!activeWorkflow)}
            className="flex items-center text-blue-400 hover:opacity-80 transition-colors cursor-pointer"
            title="Toggle state of workflow"
          >
            {activeWorkflow ? (
              <ToggleRight className="w-7 h-7 text-blue-500" />
            ) : (
              <ToggleLeft className="w-7 h-7 text-gray-500" />
            )}
          </button>

          <button
            onClick={runWorkflowAnimation}
            disabled={isRunning || !activeWorkflow}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-[10px] font-bold tracking-wide active:scale-95 transition-all disabled:opacity-40 cursor-pointer shadow shadow-blue-500/20"
          >
            <Play className={`w-3.5 h-3.5 ${isRunning ? "animate-spin" : "fill-white"}`} />
            <span>{isRunning ? "RUNNING..." : "TRIGGER FLOW"}</span>
          </button>
        </div>
      </div>

      <div className="flex-grow flex gap-4 min-h-0 overflow-hidden relative">
        {/* The Node canvas container */}
        <div className="flex-grow bg-[#0d1117] border border-[#30363d] rounded-xl overflow-hidden relative" id="n8n-nodes-field">
          {/* Grid Background */}
          <div 
            className="absolute inset-0 select-none pointer-events-none opacity-[0.03]" 
            style={{ 
              backgroundImage: "radial-gradient(#ffffff 1px, transparent 1px)", 
              backgroundSize: "20px 20px" 
            }} 
          />

          {/* Connectors SVG Layer */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
            {edges.map((edge, idx) => {
              const fromN = nodes.find(n => n.id === edge.fromNodeId);
              const toN = nodes.find(n => n.id === edge.toNodeId);

              if (!fromN || !toN) return null;

              // Node dimensions variables
              const nw = 140;
              const nh = 50;

              // calculate pins
              const startX = fromN.x + nw;
              const startY = fromN.y + nh / 2;
              const endX = toN.x;
              const endY = toN.y + nh / 2;

              // Bezier coordinates
              const cx1 = startX + 50;
              const cy1 = startY;
              const cx2 = endX - 50;
              const cy2 = endY;

              const isEdgeGlowing = 
                fromN.status === "success" && 
                (toN.status === "running" || toN.status === "success");

              return (
                <g key={idx}>
                  <path
                    d={`M ${startX} ${startY} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${endX} ${endY}`}
                    fill="none"
                    stroke={isEdgeGlowing ? "#58a6ff" : "rgba(255, 250, 250, 0.08)"}
                    strokeWidth={isEdgeGlowing ? "2.5" : "1.5"}
                    className={isEdgeGlowing ? "stroke-dasharray-glow" : ""}
                    style={{
                      strokeDasharray: isEdgeGlowing ? "8 4" : "none",
                      animation: isEdgeGlowing ? "dashGlow 1.2s linear infinite" : "none"
                    }}
                  />
                </g>
              );
            })}
          </svg>

          {/* Styles block for glowing line */}
          <style dangerouslySetInnerHTML={{ __html: `
            @keyframes dashGlow {
              to {
                stroke-dashoffset: -20;
              }
            }
          `}} />

          {/* Node items layout overlay */}
          <div className="absolute inset-0 overflow-hidden p-4">
            {nodes.map(node => {
              const isTrigger = node.type === "trigger";
              let statusColor = "border-[#30363d]";
              let statusClasses = "";
              
              if (node.status === "running") {
                statusColor = "border-blue-500 shadow-[0_0_12px_rgba(88,166,255,0.15)] bg-blue-500/5";
                statusClasses = "animate-pulse";
              } else if (node.status === "success") {
                statusColor = "border-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.15)] bg-emerald-500/5";
              }

              return (
                <div
                  key={node.id}
                  onClick={() => setSelectedNode(node)}
                  onMouseDown={(e) => handleNodeDragStart(e, node.id)}
                  style={{ left: `${node.x}px`, top: `${node.y}px` }}
                  className={`absolute w-[150px] bg-[#161b22] border ${statusColor} rounded-xl p-2.5 transition-shadow cursor-move hover:border-blue-500/40 select-none z-10 hover:shadow-lg ${statusClasses}`}
                >
                  <div className="flex items-center justify-between mb-1 text-[9px] font-mono tracking-wider">
                    <span className={isTrigger ? "text-amber-400" : "text-blue-400"}>
                      {node.type.toUpperCase()}
                    </span>
                    {node.status === "success" && (
                      <span className="text-emerald-400 font-bold font-mono">OK</span>
                    )}
                  </div>
                  <h4 className="text-[11px] font-semibold text-white tracking-tight leading-4 truncate">{node.label}</h4>
                  <p className="text-[8px] text-gray-500 leading-3 truncate mt-0.5">{node.description}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Info & Creation sidebar drawer */}
        <div className="w-48 shrink-0 flex flex-col justify-between">
          {/* Node config details */}
          <div className="space-y-3 flex-1 overflow-y-auto">
            {selectedNode ? (
              <div className="p-3 bg-[#161b22] border border-[#30363d] rounded-2xl space-y-2.5 select-none animate-in fade-in zoom-in-95 duration-150">
                <div className="flex justify-between items-center border-b border-[#30363d] pb-1.5 mb-1 shrink-0">
                  <span className="text-[10px] font-mono uppercase text-gray-400 font-bold tracking-wider">Node Details</span>
                  <button 
                    onClick={() => setSelectedNode(null)} 
                    className="p-0.5 hover:bg-white/5 text-gray-500 hover:text-white rounded cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  </button>
                </div>

                <div className="space-y-1">
                  <label className="text-[8px] uppercase tracking-wider text-gray-500 font-mono font-bold block">Label</label>
                  <span className="text-xs text-white font-medium block leading-none">{selectedNode.label}</span>
                </div>

                <div className="space-y-1">
                  <label className="text-[8px] uppercase tracking-wider text-gray-500 font-mono font-bold block">Config Parameters</label>
                  <div className="bg-[#0d1117] p-2 rounded-lg text-[9px] font-mono text-[#c9d1d9]/80 border border-[#30363d] max-h-24 overflow-y-auto custom-scrollbar">
                    {Object.entries(selectedNode.config || {}).map(([k, v]) => (
                      <div key={k} className="truncate">
                        <span className="text-blue-400">{k}:</span> {v}
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => handleDeleteNode(selectedNode.id)}
                  className="w-full py-1.5 bg-red-500/10 hover:bg-red-500 hover:text-white text-red-400 rounded-lg text-[10px] font-bold tracking-wide transition-all uppercase flex items-center justify-center space-x-1.5 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5 shrink-0" />
                  <span>Delete Node</span>
                </button>
              </div>
            ) : (
              <div className="p-3 bg-[#161b22]/60 border border-dashed border-[#30363d] rounded-2xl text-center text-gray-500 select-none py-8">
                <Settings className="w-6 h-6 mx-auto text-gray-600 mb-1 animate-spin duration-1000" />
                <p className="text-[10px] font-bold text-[#c9d1d9]/80">Inspect parameters</p>
                <p className="text-[9px] mt-0.5">Click any node in the grid to view variables and edit coordinates.</p>
              </div>
            )}

            {/* Quick adding form */}
            <form onSubmit={handleAddNode} className="p-3 bg-[#161b22] border border-[#30363d] rounded-2xl space-y-2.5">
              <span className="text-[10px] font-mono uppercase text-gray-400 block font-bold mb-1">Add Connector Node</span>
              
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => setNewNodeType("action")}
                  className={`py-1 text-[9px] uppercase tracking-wide font-bold rounded-lg border transition-all cursor-pointer ${
                    newNodeType === "action" 
                      ? "bg-blue-500/10 border-blue-500/30 text-blue-400" 
                      : "bg-[#0d1117] border-transparent text-gray-500"
                  }`}
                >
                  Action
                </button>
                <button
                  type="button"
                  onClick={() => setNewNodeType("trigger")}
                  className={`py-1 text-[9px] uppercase tracking-wide font-bold rounded-lg border transition-all cursor-pointer ${
                    newNodeType === "trigger" 
                      ? "bg-amber-400/10 border-amber-400/30 text-amber-500" 
                      : "bg-[#0d1117] border-transparent text-gray-500"
                  }`}
                >
                  Trigger
                </button>
              </div>

              <input
                type="text"
                placeholder="Label name (e.g. Slack)..."
                value={newNodeLabel}
                onChange={(e) => setNewNodeLabel(e.target.value)}
                className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg text-[10px] px-2 py-1.5 focus:outline-none focus:border-blue-500 text-gray-200"
              />

              <button
                type="submit"
                className="w-full py-1.5 bg-white/5 hover:bg-white/10 border border-[#30363d] text-gray-300 rounded-lg text-[10px] font-bold tracking-wide uppercase flex items-center justify-center space-x-1 cursor-pointer transition-colors"
              >
                <PlusCircle className="w-3.5 h-3.5 text-blue-400" />
                <span>Append Node</span>
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
