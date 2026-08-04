/**
 * LEEWAY_HEADER - DO NOT REMOVE
 *
 * REGION: UI
 * TAG: UI.RUNTIME.LEEWAY_IDE_APP
 * PURPOSE: Leeway IDE single-canvas runtime surface wired to Leeway Runtime Fabric, Live Wallet, and Foundry-compatible nodes.
 * DISCOVERY_PIPELINE: Voice -> Intent -> Location -> Vertical -> Ranking -> Render
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import { Wifi, Cpu, Settings, Layers, Layout, Wallet, Terminal } from "lucide-react";
import { Sidebar } from "./components/Sidebar";
import { UnifiedCanvas } from "./components/UnifiedCanvas";
import { NodePalette } from "./components/NodePalette";
import { NodeComponent } from "./components/NodeComponent";
import { NodeRenderer } from "./components/NodeRenderer";
import { AgentOverlay, AgentLeeOverlayCommandResult } from "./components/AgentOverlay";
import { ConsolePanel, LogLine } from "./components/ConsolePanel";
import { ContentStudio } from "./components/ContentStudio";
import { TemplateSelector } from "./components/TemplateSelector";
import { LiveWallet, LiveWalletItem } from "./components/LiveWallet";
import { ApplicationsLauncher } from "./components/ApplicationsLauncher";
import { WindowManagerProvider, WindowDesktop } from "./components/WindowManager";
import { NodeInstance, NodeConnection, DEFAULT_LEEWAY_CANVAS_SETTINGS, LeewayCanvasSettings } from "./types/nodeTypes";
import { getStudioPalette, getNodeColor, studioPalettes } from "./data/nodeLibrary";
import { createFoundryNodeData } from "./data/foundryNodeCatalog";
import { LayoutTemplate } from "./data/layoutTemplates";
import { useNodePersistence, loadSavedLayout, exportLayout } from "./hooks/useNodePersistence";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import {
  OmniTerminalSnapshot,
  createRequiredOmniTerminalSnapshot,
  formatOmniTerminalSummary,
  loadOmniTerminalSnapshot,
  isOmniTerminalCommandPlanApproved,
  requestOmniTerminalCommandPlan,
  requestOmniTerminalCommandExecution,
} from "./services/omniTerminalFabric";
import {
  AgentLeeApplicationIntent,
  AGENT_LEE_APPLICATION_CONTROL_NODE_ID,
  classifyAgentLeeApplicationIntent,
} from "./agent-lee/application-control/agentLeeApplicationControl";
import { buildToolingSnapshot } from "./services/tooling/toolingRegistry";
import { getSkillRegistrySnapshot } from "./services/tooling/skillRegistry";

const INITIAL_WALLET_CONTENT: LiveWalletItem[] = [
  {
    id: "wallet-strategy-source",
    beastId: "LEEWAY-PDF-9876",
    type: "pdf",
    name: "Q3 Growth Strategy",
    category: "Planning",
    timestamp: "2024-04-29 10:30",
  },
  {
    id: "wallet-teaser-video",
    beastId: "LEEWAY-V-2341",
    type: "video",
    name: "Teaser Trailer v1",
    category: "Marketing",
    timestamp: "2024-04-29 11:15",
  },
  {
    id: "wallet-social-short",
    beastId: "LEEWAY-S-7721",
    type: "short",
    name: "Viral Short Draft",
    category: "Social",
    timestamp: "2024-04-29 12:00",
  },
];

type LocalServiceStatus = {
  label: string;
  value: string;
  ok: boolean;
};

const DEFAULT_NODES: NodeInstance[] = [
  {
      id: "code-file-tree-1",
      type: "code.file-tree",
      title: "File Explorer",
      x: 20,
      y: 20,
      width: 280,
      height: 400,
      collapsed: false,
      zIndex: 1,
      data: {
        color: getNodeColor("code.file-tree")
      }
    },
    {
      id: "code-editor-1",
      type: "code.editor",
      title: "Code Editor",
      x: 320,
      y: 20,
      width: 600,
      height: 500,
      collapsed: false,
      zIndex: 1,
      data: {
        color: getNodeColor("code.editor")
      }
    },
    {
      id: "code-console-1",
      type: "code.console",
      title: "Console",
      x: 320,
      y: 540,
      width: 600,
      height: 250,
      collapsed: false,
      zIndex: 1,
      data: {
        color: getNodeColor("code.console")
      }
    }
];

export default function App() {
  // Active studio determines which palette is shown
  const [activeStudio, setActiveStudio] = useState<string>("code");
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const [isContentStudioOpen, setIsContentStudioOpen] = useState(false);
  const [isLiveWalletOpen, setIsLiveWalletOpen] = useState(false);
  const [isApplicationsOpen, setIsApplicationsOpen] = useState(false);
  const [isTemplateSelectorOpen, setIsTemplateSelectorOpen] = useState(false);
  const [isConsoleOpen, setIsConsoleOpen] = useState(true);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isDraggingContent, setIsDraggingContent] = useState(false);
  const [pendingConnectionNodeId, setPendingConnectionNodeId] = useState<string | null>(null);
  const [omniTerminalSnapshot, setOmniTerminalSnapshot] = useState<OmniTerminalSnapshot>(() =>
    createRequiredOmniTerminalSnapshot("Runtime truth snapshot is initializing.")
  );
  const [localStatuses, setLocalStatuses] = useState<LocalServiceStatus[]>([
    { label: "Agent Lee", value: "checking", ok: false },
    { label: "Runtime Fabric 4001", value: "checking", ok: false },
    { label: "Router 8080", value: "checking", ok: false },
    { label: "Desktop 8091", value: "checking", ok: false },
    { label: "Ollama 11434", value: "checking", ok: false },
    { label: "CerebralDaemon 8765", value: "checking", ok: false },
    { label: "Ubuntu WSL", value: "checking", ok: false },
  ]);
  const [wslReceiptPath, setWslReceiptPath] = useState("");
  const [isStartingWsl, setIsStartingWsl] = useState(false);
  const [wslStartError, setWslStartError] = useState("");
  const [consoleLogs, setConsoleLogs] = useState<LogLine[]>([
    { text: "Leeway IDE console attached to Agent Lee command planning.", type: "info" },
    { text: "Local Terminal Fabric will update from the live Runtime Fabric and local device probes.", type: "info" },
  ]);
  const [canvasSettings, setCanvasSettings] = useState<LeewayCanvasSettings>(() => {
    try {
      const saved = localStorage.getItem("leeway.canvas.settings");
      return saved ? { ...DEFAULT_LEEWAY_CANVAS_SETTINGS, ...JSON.parse(saved) } : DEFAULT_LEEWAY_CANVAS_SETTINGS;
    } catch {
      return DEFAULT_LEEWAY_CANVAS_SETTINGS;
    }
  });
  const [walletContent, setWalletContent] = useState<LiveWalletItem[]>(INITIAL_WALLET_CONTENT);
  const [toolingSnapshot, setToolingSnapshot] = useState(() => buildToolingSnapshot());
  const [skillSnapshot] = useState(() => getSkillRegistrySnapshot());
  
  // Node state management - load from localStorage on mount
  const [nodes, setNodes] = useState<NodeInstance[]>(() => {
    const saved = loadSavedLayout();
    return saved?.nodes || DEFAULT_NODES;
  });

  const [connections, setConnections] = useState<NodeConnection[]>(() => {
    const saved = loadSavedLayout();
    return saved?.connections || [];
  });

  // Load saved active studio
  useEffect(() => {
    const saved = loadSavedLayout();
    if (saved?.activeStudio) {
      setActiveStudio(saved.activeStudio);
    }
  }, []);

  const handleStartUbuntuWsl = useCallback(async () => {
    setIsStartingWsl(true);
    setWslStartError("");
    try {
      const response = await fetch("/api/leeway/device/wsl/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ distro: "Ubuntu" }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) {
        throw new Error(data.message || data.error || "Ubuntu WSL start failed");
      }
      setWslReceiptPath(data.receiptPath || "");
      const ubuntu = data.status?.ubuntu || {};
      const nextRow = {
        label: "Ubuntu WSL",
        value: ubuntu.running ? "running / healthy" : "installed / stopped",
        ok: Boolean(ubuntu.installed),
      };
      setLocalStatuses((current) => {
        const replaced = current.map((service) => service.label === nextRow.label ? nextRow : service);
        return current.some((service) => service.label === nextRow.label) ? replaced : [...replaced, nextRow];
      });
      setConsoleLogs((current) => [
        ...current,
        { text: `Ubuntu WSL start receipt: ${data.receiptPath || "receipt unavailable"}`, type: data.ok ? "success" : "error" },
      ]);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setWslStartError(message);
      setConsoleLogs((current) => [...current, { text: `Ubuntu WSL start failed: ${message}`, type: "error" }]);
    } finally {
      setIsStartingWsl(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    const refreshRuntimeTruth = async () => {
      const snapshot = await loadOmniTerminalSnapshot();
      if (!cancelled) {
        setOmniTerminalSnapshot(snapshot);
      }
    };

    refreshRuntimeTruth();
    const timer = window.setInterval(refreshRuntimeTruth, 15000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const refreshToolingSnapshot = async () => {
      try {
        const response = await fetch("/api/leeway/tooling/registry");
        const data = await response.json().catch(() => ({}));
        if (!cancelled && data?.entries) {
          setToolingSnapshot({
            generatedAt: data.generatedAt || new Date().toISOString(),
            mcpCount: data.mcpCount || 0,
            enabledCount: data.enabledCount || 0,
            entries: data.entries || [],
          });
        }
      } catch {
        // Keep the built-in snapshot if the runtime endpoint is unavailable.
      }
    };

    refreshToolingSnapshot();
    const timer = window.setInterval(refreshToolingSnapshot, 60000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const refreshLocalStatuses = async () => {
      try {
        const response = await fetch("/api/leeway/local-status");
        const data = await response.json().catch(() => ({}));
        if (!cancelled && Array.isArray(data.services)) {
          setLocalStatuses(data.services);
        }
      } catch {
        if (!cancelled) {
          setLocalStatuses((current) =>
            current.map((service) => ({ ...service, value: "offline", ok: false })),
          );
        }
      }
    };

    refreshLocalStatuses();
    const timer = window.setInterval(refreshLocalStatuses, 30000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    if (omniTerminalSnapshot.runtimeStatus === "RUNTIME_CONNECTED") {
      const terminalFabricText = String(omniTerminalSnapshot.terminalFabricStatus || "").toUpperCase();
      if (terminalFabricText.includes("READY") || terminalFabricText.includes("ONLINE") || terminalFabricText.includes("CONNECTED")) {
        setConsoleLogs((current) => {
          if (current.some((line) => line.text.includes("Local Terminal Fabric: Online"))) {
            return current;
          }
          return [
            ...current,
            { text: "Local Terminal Fabric: Online", type: "success" },
          ];
        });
      }
    }
  }, [omniTerminalSnapshot.runtimeStatus, omniTerminalSnapshot.terminalFabricStatus]);

  // Foundry node runtime event: generated artifacts save themselves back to the Live Wallet.
  useEffect(() => {
    const handleSaveNodeToWallet = (event: Event) => {
      const detail = (event as CustomEvent).detail ?? {};
      const itemType = detail.type || detail.asset_type || "post";
      const savedItem: LiveWalletItem = {
        id: `foundry-save-${Date.now()}`,
        beastId: detail.beastId || `LEEWAY-SAVE-${Math.floor(Math.random() * 9000) + 1000}`,
        type: itemType as LiveWalletItem["type"],
        name: detail.name || detail.title || "Saved Foundry Result",
        category: detail.category || "Saved",
        timestamp: new Date().toLocaleString(),
        content: detail.last_result || detail.caption || detail.text || "",
        fileData: detail.fileData,
      };
      setWalletContent((prev) => [savedItem, ...prev]);
      setIsLiveWalletOpen(true);
    };

    window.addEventListener("save-node-to-wallet", handleSaveNodeToWallet as EventListener);
    window.addEventListener("save-node-to-live-wallet", handleSaveNodeToWallet as EventListener);
    return () => {
      window.removeEventListener("save-node-to-wallet", handleSaveNodeToWallet as EventListener);
      window.removeEventListener("save-node-to-live-wallet", handleSaveNodeToWallet as EventListener);
    };
  }, []);

  useEffect(() => {
    localStorage.setItem("leeway.canvas.settings", JSON.stringify(canvasSettings));
  }, [canvasSettings]);

  // Auto-save layout
  useNodePersistence(nodes, connections, activeStudio);

  // Keyboard shortcuts
  useKeyboardShortcuts({
    onNewNode: () => setIsPaletteOpen(true),
    onSearch: () => setIsPaletteOpen(true),
    onSave: () => {
      console.log("Layout saved!");
    },
    onDelete: () => {
      if (selectedNodeId) {
        setNodes(prev => prev.filter(n => n.id !== selectedNodeId));
        setConnections(prev => prev.filter(c =>
          c.fromNodeId !== selectedNodeId && c.toNodeId !== selectedNodeId
        ));
        setSelectedNodeId(null);
      }
    },
    onDuplicate: () => {
      if (selectedNodeId) {
        const nodeToDuplicate = nodes.find(n => n.id === selectedNodeId);
        if (nodeToDuplicate) {
          const newNode: NodeInstance = {
            ...nodeToDuplicate,
            id: `${nodeToDuplicate.type}-${Date.now()}`,
            x: nodeToDuplicate.x + 20,
            y: nodeToDuplicate.y + 20,
            zIndex: Math.max(...nodes.map(n => n.zIndex), 0) + 1,
            data: {
              ...nodeToDuplicate.data,
              color: nodeToDuplicate.data?.color || getNodeColor(nodeToDuplicate.type)
            }
          };
          setNodes(prev => [...prev, newNode]);
        }
      }
    },
    onTogglePalette: () => setIsPaletteOpen(prev => !prev),
    onExport: () => {
      exportLayout(nodes, connections, `leeway-layout-${Date.now()}`);
    }
  });

  // Derive host description from browser user agent
  const hostDescription: string = typeof navigator !== "undefined" && navigator.userAgent
    ? navigator.userAgent.split("(")[0].trim()
    : "Unknown Device";

  const addConsoleLog = useCallback((line: LogLine) => {
    setConsoleLogs((prev) => [...prev, line]);
  }, []);

  const clearConsoleLogs = useCallback(() => {
    setConsoleLogs([]);
  }, []);

  const resolveNodeDefinition = useCallback((nodeType: string) => {
    return studioPalettes.flatMap((palette) => palette.nodes).find((nodeDef) => nodeDef.type === nodeType);
  }, []);

  const addNodeByType = useCallback((nodeType: string, position?: { x: number; y: number }, customData?: Record<string, any>) => {
    const nodeDef = resolveNodeDefinition(nodeType);
    if (!nodeDef) return null;

    const newNode: NodeInstance = {
      id: `${nodeType}-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      type: nodeType,
      title: nodeDef.title,
      x: position?.x ?? 100 + Math.random() * 200,
      y: position?.y ?? 100 + Math.random() * 200,
      width: nodeDef.defaultWidth,
      height: nodeDef.defaultHeight,
      collapsed: false,
      zIndex: Math.max(0, ...nodes.map((node) => node.zIndex)) + 1,
      data: createFoundryNodeData(nodeDef, {
        color: getNodeColor(nodeType),
        ...(customData ?? {}),
      }),
    };

    setNodes((prev) => [...prev, newNode]);
    setSelectedNodeId(newNode.id);
    return newNode;
  }, [nodes, resolveNodeDefinition]);

  const addNodeBatch = useCallback((nodeTypes: string[], startX = 120, startY = 90) => {
    const timestamp = Date.now();
    const baseZ = Math.max(0, ...nodes.map((node) => node.zIndex)) + 1;
    const createdNodes: NodeInstance[] = [];

    nodeTypes.forEach((nodeType, index) => {
      const nodeDef = resolveNodeDefinition(nodeType);
      if (!nodeDef) return;

      createdNodes.push({
        id: `${nodeType}-${timestamp}-${index}`,
        type: nodeType,
        title: nodeDef.title,
        x: startX + (index % 3) * 460,
        y: startY + Math.floor(index / 3) * 360,
        width: nodeDef.defaultWidth,
        height: nodeDef.defaultHeight,
        collapsed: false,
        zIndex: baseZ + index,
        data: createFoundryNodeData(nodeDef, {
          color: getNodeColor(nodeType),
        }),
      });
    });

    if (createdNodes.length > 0) {
      setNodes((prev) => [...prev, ...createdNodes]);
      setSelectedNodeId(createdNodes[createdNodes.length - 1].id);
    }

    return createdNodes;
  }, [nodes, resolveNodeDefinition]);

  const connectNodeIdsSequential = useCallback((nodeIds: string[]) => {
    const edgesToAdd: NodeConnection[] = [];
    for (let index = 0; index < nodeIds.length - 1; index += 1) {
      const fromNodeId = nodeIds[index];
      const toNodeId = nodeIds[index + 1];
      const exists = connections.some((connection) => connection.fromNodeId === fromNodeId && connection.toNodeId === toNodeId);
      if (!exists) {
        edgesToAdd.push({
          id: `edge-agent-lee-${Date.now()}-${index}`,
          fromNodeId,
          toNodeId,
        });
      }
    }
    if (edgesToAdd.length > 0) {
      setConnections((prev) => [...prev, ...edgesToAdd]);
    }
    return edgesToAdd.length;
  }, [connections]);

  const connectExistingNodesSequential = useCallback(() => {
    const sortedNodes = [...nodes].sort((a, b) => (a.y - b.y) || (a.x - b.x));
    return connectNodeIdsSequential(sortedNodes.map((node) => node.id));
  }, [connectNodeIdsSequential, nodes]);

  const updateCommandPlanNodes = useCallback((prompt: string, status: string, details: string, plan?: Record<string, any>, receipt?: Record<string, any>, sourceNodeId?: string) => {
    const planPayload = plan ?? {
      planId: `PLAN_REQUIRED_${Date.now()}`,
      status,
      prompt,
      targetDevices: [],
      targetTags: [],
      protocol: "Runtime Fabric endpoint required",
      commands: [],
      expectedEffect: "No command execution occurred.",
      riskLevel: "Unclassified",
      approvalRequirement: "COMMAND_APPROVAL_REQUIRED",
      rollbackPlan: "Unavailable until Runtime Fabric returns a plan.",
      receiptRequirement: "COMMAND_RECEIPT_REQUIRED",
      details,
    };

    setNodes((prev) => prev.map((node) => {
      if (node.id === sourceNodeId || node.type === "terminal.command-plan" || node.type === "terminal.global-command") {
        return {
          ...node,
          data: {
            ...(node.data ?? {}),
            status,
            activeCommand: prompt,
            commandPlan: planPayload,
            receiptStatus: receipt ? receipt.status : "COMMAND_RECEIPT_REQUIRED",
          },
        };
      }
      if (node.type === "terminal.command-receipt") {
        return {
          ...node,
          data: {
            ...(node.data ?? {}),
            commandReceipt: receipt,
            status: receipt ? receipt.status : "COMMAND_RECEIPT_REQUIRED",
            receiptStatus: receipt ? receipt.status : "COMMAND_RECEIPT_REQUIRED",
          },
        };
      }
      return node;
    }));
  }, []);

  const createCommandPlanForPrompt = useCallback(async (prompt: string, source: "agent-lee-overlay" | "console-panel" | "node" = "agent-lee-overlay", sourceNodeId?: string) => {
    if (!nodes.some((node) => node.type === "terminal.command-plan")) {
      addNodeBatch(["terminal.global-command", "terminal.command-plan", "terminal.approval-gate", "terminal.command-receipt"], 160, 120);
    }

    addConsoleLog({ text: `COMMAND_PLAN_REQUIRED: ${prompt}`, type: "info" });
    const result = await requestOmniTerminalCommandPlan({ prompt, source, nodeId: sourceNodeId });

    updateCommandPlanNodes(
      prompt,
      result.status,
      result.details,
      result.plan,
      result.receipt,
      sourceNodeId
    );

    addConsoleLog({
      text: `${result.status}: ${result.details}`,
      type: result.ok ? "info" : "error",
    });

    if (source !== "node" && result.ok && result.plan && isOmniTerminalCommandPlanApproved(result.plan)) {
      await executeApprovedCommandPlan(result.plan, sourceNodeId);
    }

    return [
      `Command plan route: ${result.status}`,
      result.details,
      "No terminal/device command was executed unless Runtime Fabric returned an approval-bound receipt.",
    ].join("\n");
  }, [addConsoleLog, addNodeBatch, nodes, updateCommandPlanNodes]);

  const executeApprovedCommandPlan = useCallback(async (plan?: Record<string, any>, sourceNodeId?: string) => {
    const planFromCanvas = plan
      ?? (sourceNodeId ? nodes.find((node) => node.id === sourceNodeId)?.data?.commandPlan : undefined)
      ?? nodes.find((node) => node.type === "terminal.command-plan")?.data?.commandPlan;

    if (!planFromCanvas) {
      addConsoleLog({ text: "COMMAND_PLAN_REQUIRED: Runtime Fabric has not returned a command plan.", type: "error" });
      return;
    }

    addConsoleLog({ text: `COMMAND_EXECUTION_REQUESTED: ${planFromCanvas.planId ?? planFromCanvas.id ?? "unidentified plan"}`, type: "info" });
    const result = await requestOmniTerminalCommandExecution(planFromCanvas, sourceNodeId);

    updateCommandPlanNodes(
      String(planFromCanvas.prompt ?? planFromCanvas.command ?? "Runtime Fabric command execution request"),
      result.status,
      result.details,
      planFromCanvas,
      result.receipt,
      sourceNodeId
    );

    const stdout = String((result.payload as any)?.stdout || result.receipt?.stdout || "").trim();
    const stderr = String((result.payload as any)?.stderr || result.receipt?.stderr || "").trim();
    const exitCode = typeof (result.payload as any)?.exitCode === "number"
      ? (result.payload as any).exitCode
      : result.receipt?.exitCode;
    const receiptPath = String((result.payload as any)?.receiptPath || result.receipt?.receiptPath || "").trim();

    addConsoleLog({
      text: result.receipt
        ? [
            `${result.status}: Receipt ${result.receipt.receiptId} returned by Runtime Fabric.`,
            stdout ? `stdout: ${stdout}` : null,
            stderr ? `stderr: ${stderr}` : null,
            typeof exitCode === "number" ? `exitCode: ${exitCode}` : null,
            receiptPath ? `receiptPath: ${receiptPath}` : null,
          ].filter(Boolean).join("\n")
        : `${result.status}: ${result.details}`,
      type: result.receipt ? "success" : "error",
    });
  }, [addConsoleLog, nodes, updateCommandPlanNodes]);

  // Handle sidebar navigation clicks
  const handleNavClick = (studioId: string) => {
    if (studioId === "applications") {
      setIsApplicationsOpen(true);
      setIsPaletteOpen(false);
      return;
    }
    setActiveStudio(studioId);
    setIsPaletteOpen(true);
  };

  // Handle adding a new node from the palette
  const handleAddNode = (nodeType: string) => {
    addNodeByType(nodeType);
  };

  const handleFileUploadToWallet = (file: File) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      const fileData = String(event.target?.result || "");
      const type = file.type.includes("pdf")
        ? "pdf"
        : file.type.includes("video")
          ? "video"
          : file.type.includes("audio")
            ? "audio"
            : "image";

      const newItem: LiveWalletItem = {
        id: `wallet-${Date.now()}`,
        beastId: `LEEWAY-${type.toUpperCase().slice(0, 1)}-${Math.floor(Math.random() * 9000) + 1000}`,
        type,
        name: file.name,
        category: "Uploaded",
        timestamp: new Date().toLocaleString(),
        fileData,
      };

      setWalletContent((prev) => [newItem, ...prev]);
    };

    reader.readAsDataURL(file);
  };

  const addWalletItemAsNode = (item: LiveWalletItem, clientX: number, clientY: number) => {
    const newNode: NodeInstance = {
      id: `content-wallet-${item.id}-${Date.now()}`,
      type: "foundry.live_wallet_item",
      title: item.name,
      x: clientX,
      y: clientY,
      width: 400,
      height: 360,
      collapsed: false,
      zIndex: Math.max(...nodes.map((n) => n.zIndex), 0) + 1,
      data: createFoundryNodeData(
        {
          type: "foundry.live_wallet_item",
          title: "Live Wallet Item",
          description: "Source content dropped from the Live Wallet onto the canvas",
          icon: null,
          category: "Content Nodes",
          defaultWidth: 400,
          defaultHeight: 360,
          data: {
            foundry: true,
            foundryId: "live_wallet_item",
            category: "content",
            config: { locked_source: true },
            content: {},
            schedule: { scheduled_at: "", timezone: "UTC", status: "unscheduled" },
            inputs: [],
            outputs: ["content_asset"],
            supportsScheduling: true,
            runBehavior: "provide_content_asset",
          },
        },
        {
          content: {
            ...item,
            walletItem: item,
            asset_ref: item.beastId,
          },
        }
      ),
    };

    setNodes((prev) => [...prev, newNode]);
  };

  const executeAgentLeeIntent = useCallback(async (intent: AgentLeeApplicationIntent) => {
    switch (intent.command) {
      case "agentLee.ide.openStudio":
        if (intent.studioId) {
          setActiveStudio(intent.studioId);
        }
        return `Opened studio: ${intent.studioId ?? activeStudio}`;

      case "agentLee.ide.openPalette":
        if (intent.studioId) {
          setActiveStudio(intent.studioId);
        }
        setIsPaletteOpen(true);
        return `Opened node palette: ${intent.studioId ?? activeStudio}`;

      case "agentLee.ide.openLiveWallet":
        setIsLiveWalletOpen(true);
        return "Opened Live Wallet.";

      case "agentLee.ide.openContentStudio":
        setIsContentStudioOpen(true);
        return "Opened Content Studio.";

      case "agentLee.ide.openTerminalConsole":
        setActiveStudio("terminal");
        setIsPaletteOpen(true);
        setIsConsoleOpen(true);
        return "Opened Terminal Fabric palette and console.";

      case "agentLee.ide.openSettings":
        setActiveStudio("settings");
        setIsPaletteOpen(true);
        if (!nodes.some((node) => node.type === "settings.agent-lee")) {
          addNodeByType("settings.agent-lee", { x: 140, y: 100 });
        }
        return "Opened Agent Lee settings.";

      case "agentLee.ide.addNode":
        if (intent.nodeType) {
          const created = addNodeByType(intent.nodeType);
          return created ? `Added node: ${created.title}.` : `Node type not registered: ${intent.nodeType}.`;
        }
        return "No node type was supplied.";

      case "agentLee.ide.addNodeGroup": {
        const groups: Record<string, string[]> = {
          "omni-terminal-core": [
            "terminal.global-command",
            "terminal.device-registry",
            "terminal.local-shell",
            "terminal.command-plan",
            "terminal.approval-gate",
            "terminal.command-receipt",
            "terminal.runtime-health-monitor",
          ],
          "xr-core": [
            "xr.viewport",
            "xr.scene-graph",
            "xr.world-builder",
            "xr.assets",
            "xr.preview-modes",
            "xr.console",
          ],
          "coding-core": [
            "code.file-tree",
            "code.editor",
            "code.console",
            "code.live-preview",
            "code.automation-trigger",
            "code.automation-action",
          ],
          "agent-lee-governance": [
            "settings.agent-lee",
            "terminal.risk-classifier",
            "terminal.policy-check",
            "terminal.receipt-validator",
            "terminal.sentinel-review",
          ],
        };
        const nodeTypes = intent.groupId ? groups[intent.groupId] : [];
        const created = addNodeBatch(nodeTypes, 120, 90);
        if (created.length > 1) {
          connectNodeIdsSequential(created.map((node) => node.id));
        }
        return `Added node group: ${intent.groupId ?? "unknown"} (${created.length} nodes).`;
      }

      case "agentLee.ide.placeWalletItem": {
        const item = walletContent[0];
        if (!item) return "Live Wallet is open, but it has no content to place.";
        addWalletItemAsNode(item, 180, 180);
        return `Placed Live Wallet item on canvas: ${item.name}.`;
      }

      case "agentLee.ide.connectSequential": {
        const count = connectExistingNodesSequential();
        return count > 0 ? `Connected ${count} node route(s).` : "No new node routes were needed.";
      }

      case "agentLee.ide.expandAllNodes":
        setNodes((prev) => prev.map((node) => ({ ...node, collapsed: false })));
        return "Expanded all nodes.";

      case "agentLee.ide.collapseAllNodes":
        setNodes((prev) => prev.map((node) => ({ ...node, collapsed: true })));
        return "Collapsed all nodes.";

      case "agentLee.ide.createCommandPlan":
        return createCommandPlanForPrompt(intent.prompt ?? "Create a governed command plan.", "agent-lee-overlay");

      default:
        return "Unsupported Agent Lee application-control intent.";
    }
  }, [
    activeStudio,
    addNodeBatch,
    addNodeByType,
    connectExistingNodesSequential,
    connectNodeIdsSequential,
    createCommandPlanForPrompt,
    nodes,
    walletContent,
  ]);

  const handleAgentLeeCommand = useCallback(async (prompt: string): Promise<AgentLeeOverlayCommandResult> => {
    const result = classifyAgentLeeApplicationIntent(prompt);
    if (!result.handled) {
      return { handled: false, text: result.summary };
    }

    const responses: string[] = [];
    for (const intent of result.intents) {
      responses.push(await executeAgentLeeIntent(intent));
    }

    addConsoleLog({ text: `${AGENT_LEE_APPLICATION_CONTROL_NODE_ID}: ${result.summary}`, type: "info" });

    return {
      handled: true,
      text: [
        "Agent Lee application-control route handled this request.",
        ...responses,
        `Runtime truth: ${omniTerminalSnapshot.terminalFabricStatus}`,
      ].join("\n"),
    };
  }, [addConsoleLog, executeAgentLeeIntent, omniTerminalSnapshot.terminalFabricStatus]);

  const handleConsoleCommand = useCallback(async (command: string) => {
    await createCommandPlanForPrompt(command, "console-panel");
  }, [createCommandPlanForPrompt]);

  useEffect(() => {
    const handleNodeCommandPlan = (event: Event) => {
      const detail = (event as CustomEvent).detail ?? {};
      const prompt = String(detail.prompt ?? "Create a governed command plan.");
      const nodeId = typeof detail.nodeId === "string" ? detail.nodeId : undefined;
      createCommandPlanForPrompt(prompt, detail.source === "node" ? "node" : "agent-lee-overlay", nodeId);
    };

    window.addEventListener("leeway:omni-terminal-command-plan", handleNodeCommandPlan as EventListener);
    return () => window.removeEventListener("leeway:omni-terminal-command-plan", handleNodeCommandPlan as EventListener);
  }, [createCommandPlanForPrompt]);

  useEffect(() => {
    const handleNodeCommandExecute = (event: Event) => {
      const detail = (event as CustomEvent).detail ?? {};
      const nodeId = typeof detail.nodeId === "string" ? detail.nodeId : undefined;
      const plan = detail.plan && typeof detail.plan === "object" ? detail.plan : undefined;
      executeApprovedCommandPlan(plan, nodeId);
    };

    window.addEventListener("leeway:omni-terminal-command-execute", handleNodeCommandExecute as EventListener);
    return () => window.removeEventListener("leeway:omni-terminal-command-execute", handleNodeCommandExecute as EventListener);
  }, [executeApprovedCommandPlan]);

  // Handle template selection
  const handleSelectTemplate = (template: LayoutTemplate) => {
    const newNodes: NodeInstance[] = template.nodes.map((nodeDef, idx) => {
      // Get the node definition from the library to get icon
      const palette = getStudioPalette(nodeDef.type.split('.')[0]);
      const libNodeDef = palette?.nodes.find(n => n.type === nodeDef.type);
      
      return {
        ...nodeDef,
        id: `${nodeDef.type}-${Date.now()}-${idx}`,
        data: {
          ...nodeDef.data,
          color: getNodeColor(nodeDef.type)
        }
      };
    });
    setNodes(newNodes);
    setConnections([]);
  };

  const currentPalette = getStudioPalette(activeStudio);
  const runtimeSummary = useMemo(() => formatOmniTerminalSummary(omniTerminalSnapshot), [omniTerminalSnapshot]);
  const runtimeConnected = omniTerminalSnapshot.runtimeStatus === "RUNTIME_CONNECTED";
  const terminalFabricOnline = runtimeConnected && (
    String(omniTerminalSnapshot.terminalFabricStatus).toUpperCase().includes("READY") ||
    String(omniTerminalSnapshot.terminalFabricStatus).toUpperCase().includes("ONLINE") ||
    String(omniTerminalSnapshot.terminalFabricStatus).toUpperCase().includes("CONNECTED")
  );
  const controlSummary = `${AGENT_LEE_APPLICATION_CONTROL_NODE_ID} active`;
  const toolSummary = `${toolingSnapshot.enabledCount}/${toolingSnapshot.mcpCount} MCP capabilities enabled`;
  const skillSummary = `${skillSnapshot.filter((skill) => skill.enabled).length}/${skillSnapshot.length} skills active`;

  return (
    <WindowManagerProvider>
      <div className="w-screen h-screen bg-[#0d1117] text-[#c9d1d9] font-sans flex flex-col overflow-hidden relative" id="leeway-ide-root">
        {/* OS window layer + taskbar */}
        <WindowDesktop onOpenLauncher={() => setIsApplicationsOpen(true)} />
      
      {/* Header Toolbar */}
      <header className="h-14 bg-[#161b22] border-b border-[#30363d] flex items-center justify-between px-4 shrink-0 select-none z-50">
        
        {/* Left segment */}
        <div className="flex items-center space-x-3.5">
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 bg-blue-500 rounded flex items-center justify-center font-bold text-white text-xs font-sans shrink-0 uppercase">L</div>
            <span className="text-sm font-semibold tracking-tight text-white font-sans">
              Leeway IDE
            </span>
          </div>
          <span className="h-4 w-[1px] bg-[#30363d]" />
          
          {/* Runtime status */}
          <div className="flex items-center space-x-1.5 text-[10px] text-[#c9d1d9]/70 font-mono">
            <Wifi className={`w-3.5 h-3.5 ${runtimeConnected ? "text-emerald-500" : "text-red-500"}`} />
            <span className={`${runtimeConnected ? "text-emerald-500" : "text-red-500"} font-bold uppercase`}>
              {runtimeConnected ? "Runtime Connected" : "Runtime Disconnected"}
            </span>
            <span className="text-gray-500">|</span>
            <span className={`truncate max-w-[180px] ${terminalFabricOnline ? "text-emerald-500" : "text-amber-500"}`} title={omniTerminalSnapshot.details}>
              {terminalFabricOnline ? "Local Terminal Fabric: Online" : (runtimeConnected ? omniTerminalSnapshot.terminalFabricStatus : omniTerminalSnapshot.runtimeStatus)}
            </span>
          </div>

          <div className="hidden xl:flex items-center gap-1.5 font-mono text-[8px] uppercase tracking-wider">
            <span className="rounded-full border border-[#30363d] bg-[#0d1117]/80 px-2 py-1" title={toolSummary}>
              {toolSummary}
            </span>
            <span className="rounded-full border border-[#30363d] bg-[#0d1117]/80 px-2 py-1" title={skillSummary}>
              {skillSummary}
            </span>
            {localStatuses.map((service) => (
              <span
                key={service.label}
                className="flex max-w-[120px] items-center gap-1 rounded-full border border-[#30363d] bg-[#0d1117]/80 px-2 py-1"
                title={`${service.label}: ${service.value}`}
              >
                <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${service.ok ? "bg-emerald-400" : "bg-red-500"}`} />
                <span className="truncate text-gray-500">{service.label}</span>
                <span className={service.ok ? "truncate text-emerald-300" : "truncate text-red-300"}>
                  {service.value}
                </span>
              </span>
            ))}
          </div>
          <div className="hidden 2xl:flex max-w-[320px] items-center gap-2 font-mono text-[8px] uppercase tracking-wider">
            <button
              type="button"
              onClick={handleStartUbuntuWsl}
              disabled={isStartingWsl}
              className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-1 font-bold text-emerald-200 transition hover:bg-emerald-500/20 disabled:cursor-wait disabled:opacity-60"
              title={wslReceiptPath || wslStartError || "Start Ubuntu WSL through Runtime Fabric"}
            >
              {isStartingWsl ? "Starting WSL" : "Start Ubuntu WSL"}
            </button>
            {(wslReceiptPath || wslStartError) && (
              <span className={wslStartError ? "truncate text-red-300" : "truncate text-emerald-300"}>
                {wslStartError || `receipt: ${wslReceiptPath}`}
              </span>
            )}
          </div>
        </div>

        {/* Center voice visualization */}
        <div className="hidden md:flex items-center space-x-6">
          <div className="flex items-center space-x-1">
            <div className="text-[10px] text-gray-400 font-mono flex items-center space-x-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-gray-500 shrink-0" />
              <span>Voice Clone Agent:</span>
              <span className="text-gray-500 font-medium">Inactive</span>
            </div>
            <div className="flex items-end space-x-0.5 h-4.5 pl-2.5 opacity-50">
              <span className="w-[2.5px] h-2.5 bg-gray-500/50 rounded-full animate-[bounce_0.8s_infinite]" />
              <span className="w-[2.5px] h-4 bg-gray-500 rounded-full animate-[bounce_0.6s_infinite]" style={{ animationDelay: "0.1s" }} />
              <span className="w-[2.5px] h-1.5 bg-gray-500/40 rounded-full animate-[bounce_1s_infinite]" style={{ animationDelay: "0.2s" }} />
              <span className="w-[2.5px] h-3 bg-gray-500 rounded-full animate-[bounce_0.7s_infinite]" style={{ animationDelay: "0.3s" }} />
              <span className="w-[2.5px] h-4.5 bg-gray-500/80 rounded-full animate-[bounce_0.5s_infinite]" style={{ animationDelay: "0.4s" }} />
            </div>
          </div>
        </div>

        {/* Right context */}
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setIsConsoleOpen(prev => !prev)}
            className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 border border-amber-500/30 rounded-lg text-[10px] font-bold text-amber-300 hover:bg-amber-500/20 transition-all"
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>Terminal</span>
          </button>

          <button
            onClick={() => setIsTemplateSelectorOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 bg-purple-500/10 border border-purple-500/30 rounded-lg text-[10px] font-bold text-purple-400 hover:bg-purple-500/20 transition-all"
          >
            <Layout className="w-3.5 h-3.5" />
            <span>Templates</span>
          </button>
          
          <button
            onClick={() => setIsContentStudioOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 border border-blue-500/30 rounded-lg text-[10px] font-bold text-blue-400 hover:bg-blue-500/20 transition-all"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Content Studio</span>
          </button>
                    <button
            onClick={() => setIsLiveWalletOpen(prev => !prev)}
            className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-[10px] font-bold text-emerald-400 hover:bg-emerald-500/20 transition-all"
          >
            <Wallet className="w-3.5 h-3.5" />
            <span>Live Wallet</span>
          </button>
          
          <div className="flex items-center space-x-2 text-[10px] font-mono border border-[#30363d] bg-[#0d1117] px-3 py-1.5 rounded-lg">
            <Cpu className="w-3.5 h-3.5 text-blue-400 shrink-0" />
            <span className="text-gray-400">Host:</span>
            <span className="text-white font-semibold truncate max-w-[150px]" title={hostDescription}>{hostDescription}</span>
          </div>
          
          <button
            onClick={() => { setActiveStudio("settings"); setIsPaletteOpen(true); }}
            className="p-1.5 hover:bg-white/5 rounded-lg text-gray-500 hover:text-white transition-opacity duration-150 cursor-pointer"
            title="Open Agent Lee settings"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main layout body */}
      <div className="flex-1 flex min-h-0 relative">
        
        {/* Sidebar */}
        <Sidebar 
          activeTab={activeStudio} 
          setActiveTab={setActiveStudio}
          isConsoleOpen={isConsoleOpen}
          setIsConsoleOpen={setIsConsoleOpen}
          onNavClick={handleNavClick}
        />

        {/* Node Palette */}
        {currentPalette && (
          <NodePalette
            studioName={currentPalette.studioName}
            nodes={currentPalette.nodes}
            isOpen={isPaletteOpen}
            onClose={() => setIsPaletteOpen(false)}
            onNodeAdd={handleAddNode}
          />
        )}

        {/* Template Selector */}
        <TemplateSelector
          isOpen={isTemplateSelectorOpen}
          onClose={() => setIsTemplateSelectorOpen(false)}
          onSelectTemplate={handleSelectTemplate}
        />

        {/* Content Studio */}
        <ContentStudio
          isOpen={isContentStudioOpen}
          onClose={() => setIsContentStudioOpen(false)}
          onDragStart={(item, e) => {
            // Handle drag start - will create node on drop
            e.dataTransfer.setData('application/json', JSON.stringify(item));
          }}
          accentColor={canvasSettings.accentColor}
        />

        <LiveWallet
          isOpen={isLiveWalletOpen}
          content={walletContent}
          onClose={() => setIsLiveWalletOpen(false)}
          onUpload={handleFileUploadToWallet}
          accentColor={canvasSettings.accentColor}
        />

        <ApplicationsLauncher
          isOpen={isApplicationsOpen}
          onClose={() => setIsApplicationsOpen(false)}
          accentColor={canvasSettings.accentColor}
        />

        {/* Unified Canvas with Leeway Runtime Fabric mesh, zoom, pan, drag/drop, and connection layer */}
        <UnifiedCanvas
          nodes={nodes}
          connections={connections}
          onNodesChange={setNodes}
          onConnectionsChange={setConnections}
          canvasSettings={canvasSettings}
          onCanvasDrop={(worldX, worldY, e) => {
            setIsDraggingContent(false);
            try {
              const walletPayload = e.dataTransfer.getData("application/leeway-live-wallet") || e.dataTransfer.getData("application/leeway-content-wallet");
              if (walletPayload) {
                addWalletItemAsNode(JSON.parse(walletPayload), worldX, worldY);
                return;
              }

              const raw = e.dataTransfer.getData("application/json");
              if (!raw) return;
              const data = JSON.parse(raw);
              if (data.type === "content-file") {
                const file = data.file;
                const newNode: NodeInstance = {
                  id: `content-${file.id}-${Date.now()}`,
                  type: `content.${file.category}`,
                  title: file.name,
                  x: worldX,
                  y: worldY,
                  width: 400,
                  height: 300,
                  collapsed: false,
                  zIndex: Math.max(...nodes.map(n => n.zIndex), 0) + 1,
                  data: { file, driveId: data.driveId, slot: data.slot, cell: data.cell, color: getNodeColor(`content.${file.category}`) }
                };
                setNodes(prev => [...prev, newNode]);
              }
            } catch (err) {
              console.error("Failed to parse drop data:", err);
            }
          }}
        >
          {nodes.map(node => (
            <NodeComponent
              key={node.id}
              node={node}
              onUpdate={(id, updates) => {
                setNodes(prev => prev.map(n => n.id === id ? { ...n, ...updates } : n));
              }}
              onClose={(id) => {
                setNodes(prev => prev.filter(n => n.id !== id));
                setConnections(prev => prev.filter(c => c.fromNodeId !== id && c.toNodeId !== id));
                if (selectedNodeId === id) setSelectedNodeId(null);
              }}
              onSelect={(id) => {
                setSelectedNodeId(id);
                const maxZ = Math.max(...nodes.map(n => n.zIndex), 0);
                setNodes(prev => prev.map(n => n.id === id ? { ...n, zIndex: maxZ + 1 } : n));
              }}
              onStartConnect={(id) => setPendingConnectionNodeId(id)}
              onCompleteConnect={(targetId) => {
                if (!pendingConnectionNodeId || pendingConnectionNodeId === targetId) return;
                const exists = connections.some(c => c.fromNodeId === pendingConnectionNodeId && c.toNodeId === targetId);
                if (!exists) {
                  setConnections(prev => [...prev, { id: `edge-${Date.now()}`, fromNodeId: pendingConnectionNodeId, toNodeId: targetId }]);
                }
                setPendingConnectionNodeId(null);
              }}
              isPendingConnectionSource={pendingConnectionNodeId === node.id}
              isSelected={node.id === selectedNodeId}
            >
              <NodeRenderer
                node={node}
                onUpdate={(id, updates) => {
                  setNodes(prev => prev.map(n => n.id === id ? { ...n, ...updates } : n));
                }}
                canvasSettings={canvasSettings}
                onCanvasSettingsChange={setCanvasSettings}
                runtimeSnapshot={omniTerminalSnapshot}
              />
            </NodeComponent>
          ))}
        </UnifiedCanvas>
      </div>

      <ConsolePanel
        isOpen={isConsoleOpen}
        setIsOpen={setIsConsoleOpen}
        logs={consoleLogs}
        onAddLog={addConsoleLog}
        onClearLogs={clearConsoleLogs}
        onCommand={handleConsoleCommand}
      />

      <AgentOverlay
        currentFile="leeway-ide-single-canvas/src/App.tsx"
        currentCode={JSON.stringify({ activeStudio, selectedNodeId, nodeCount: nodes.length, connectionCount: connections.length }, null, 2)}
        runtimeSummary={runtimeSummary}
        controlSummary={controlSummary}
        onAgentCommand={handleAgentLeeCommand}
        onCodeInjected={(code) => {
          const targetId = selectedNodeId && nodes.find((node) => node.id === selectedNodeId && node.type === "code.editor")
            ? selectedNodeId
            : nodes.find((node) => node.type === "code.editor")?.id;
          if (!targetId) {
            addNodeByType("code.editor", { x: 280, y: 120 }, { content: code });
          } else {
            setNodes((prev) => prev.map((node) => node.id === targetId ? { ...node, data: { ...(node.data ?? {}), content: code } } : node));
          }
          addConsoleLog({ text: "Agent Lee staged code into the Code Editor node.", type: "success" });
        }}
      />
      </div>
    </WindowManagerProvider>
  );
}

// Leeway Standards: runtime application surface
