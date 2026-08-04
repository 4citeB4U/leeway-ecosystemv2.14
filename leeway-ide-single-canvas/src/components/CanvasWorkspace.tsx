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

import React, { useState, useEffect, useRef } from "react";
import { CameraFeed } from "./CameraFeed";
import {
  FolderOpen,
  FileCode,
  Laptop,
  CheckCircle,
  Eye,
  Settings,
  Grid,
  TrendingUp,
  RefreshCw,
  Plus,
  Play,
  Pause,
  Clock,
  ArrowRight,
  Wifi,
  Sliders,
  Sparkles,
  Search,
  Activity,
  Zap,
  Phone,
  Power,
  Volume2,
  Trash2,
  Minimize2,
  Maximize2,
  Maximize,
  Compass,
  Database,
  Cpu,
  Smartphone,
  Info,
  Layers,
  Code2,
  MousePointer,
  Hand,
  ChevronRight,
  X,
  PlusCircle,
  MinusCircle,
  HelpCircle
} from "lucide-react";

// Types representing files
interface FileItem {
  name: string;
  path: string;
  content: string;
  language: string;
}

export function CanvasWorkspace({ activeTab = "canvas" }: { activeTab?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Canvas Panning and Zooming states
  const [scale, setScale] = useState<number>(0.95);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 20, y: 10 });
  const [activeTool, setActiveTool] = useState<"select" | "pan">("select");
  const [isCanvasPanning, setIsCanvasPanning] = useState<boolean>(false);
  const [startPanMouse, setStartPanMouse] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [startPanOffset, setStartPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Currently focused file and opened tabs
  const [selectedFile, setSelectedFile] = useState<string>("src/pages/Home.tsx");
  const [activeEditorTab, setActiveEditorTab] = useState<string>("Home.tsx");
  const [isCompiling, setIsCompiling] = useState<boolean>(false);
  const [simPulse, setSimPulse] = useState<number>(0);
  const [showNotification, setShowNotification] = useState<string | null>(null);

  // Tasks state synced across simulate interfaces
  const [tasks, setTasks] = useState([
    { id: "1", title: "Design new dashboard", priority: "High", completed: false },
    { id: "2", title: "Review analytics data", priority: "Med", completed: true },
    { id: "3", title: "Implement API endpoint", priority: "High", completed: false },
    { id: "4", title: "Write unit tests", priority: "Low", completed: false }
  ]);

  // Terminal Console Logs
  const [terminalLogs, setTerminalLogs] = useState<string[]>([
    "⚙️ Leeway Node-Canvas system mounted successfully.",
    "🔌 Bound automated hook vectors to port 3000 mapping tunnels.",
    "🟢 Drag window headers or floating workflow bubbles to rearrange canvas coordinates.",
    "💡 Tip: Switch to Hand Tool (H) to pan/move the dotted workspace background."
  ]);

  // Folder Expansion State
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({
    src: true,
    pages: true,
    components: false,
    hooks: true,
    services: false
  });

  // Windows and Nodes floating positions state dictionary
  const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>({
    workspace: { x: 50, y: 390 },
    codeEditor: { x: 340, y: 520 },
    page1: { x: 420, y: 70 },
    page2: { x: 780, y: 70 },
    page3: { x: 1140, y: 70 },
    livePreview: { x: 1010, y: 520 },
    visionLive: { x: 1500, y: 110 },
    systemContext: { x: 1470, y: 525 },
    // Workflow Nodes (Connected pipeline bubbles representation)
    wf_newuser: { x: 80, y: 110 },
    wf_createaccount: { x: 240, y: 110 },
    wf_sendemail: { x: 400, y: 110 },
    wf_addcrm: { x: 150, y: 240 },
    wf_logevent: { x: 310, y: 240 },
    wf_fetchtasks: { x: 620, y: 385 },
    wf_updatetask: { x: 960, y: 390 },
    wf_geninsights: { x: 1330, y: 395 },
    // Bottom pipeline action blocks
    wf_useraction: { x: 710, y: 640 },
    wf_validateinput: { x: 840, y: 640 },
    wf_processrequest: { x: 970, y: 640 },
    wf_success_decision: { x: 1100, y: 640 },
    wf_updatedb: { x: 1225, y: 565 },
    wf_notifyadmin: { x: 1225, y: 670 },
    wf_logevent2: { x: 1225, y: 775 }
  });

  // Full representation of indexed Workspace Files
  const [filesData, setFilesData] = useState<Record<string, FileItem>>({
    "src/pages/Home.tsx": {
      name: "Home.tsx",
      path: "src/pages/Home.tsx",
      content: `import { useTasks } from '../hooks/useTasks';
import { TaskItem } from '../components/TaskItem';
import { StatsCard } from '../components/StatsCard';

export default function Home() {
  const { tasks, loading, addTask, toggleTask } = useTasks();

  return (
    <div className="page-home">
      <header className="header">
        <h1>Welcome back, Alex Lee</h1>
      </header>
      
      <StatsCard title="Today's Focus" value="3/7 tasks completed" />
      
      <div className="recent">
        <TaskItem title="Design new dashboard" active={true} />
        <TaskItem title="Review analytics data" active={false} />
      </div>
    </div>
  );
}`,
      language: "typescript"
    },
    "src/hooks/useTasks.ts": {
      name: "useTasks.ts",
      path: "src/hooks/useTasks.ts",
      content: `import { useState, useEffect } from 'react';

export function useTasks() {
  const [tasks, setTasks] = useState([
    { id: 1, title: 'Design new dashboard', priority: 'High', completed: false },
    { id: 2, title: 'Review analytics data', priority: 'Med', completed: true }
  ]);

  const addTask = (title) => {
    setTasks(prev => [...prev, { id: Date.now(), title, completed: false }]);
  };

  return { tasks, addTask };
}`,
      language: "typescript"
    },
    "src/services/api.ts": {
      name: "api.ts",
      path: "src/services/api.ts",
      content: `export async function fetchTasksData() {
  const response = await fetch('/api/tasks');
  return response.json();
}

export async function sendWebhook(event: string) {
  console.log('[Webhook Triggered] event:', event);
}`,
      language: "typescript"
    },
    "src/styles/styles.css": {
      name: "styles.css",
      path: "src/styles/styles.css",
      content: `@import "tailwindcss";

body {
  background-color: #0b0f19;
  color: #c9d1d9;
  font-family: 'Inter', sans-serif;
}`,
      language: "css"
    },
    "package.json": {
      name: "package.json",
      path: "package.json",
      content: `{
  "name": "leeway-core",
  "version": "2.1.0",
  "dependencies": {
    "react": "^19.0.0",
    "tailwindcss": "^4.0.0"
  }
}`,
      language: "json"
    }
  });

  const activeFile = filesData[selectedFile] || filesData["src/pages/Home.tsx"];

  const handleToggleTask = (id: string) => {
    setTasks(prev =>
      prev.map(t => (t.id === id ? { ...t, completed: !t.completed } : t))
    );
    const item = tasks.find(t => t.id === id);
    addLog(`Task toggled: "${item?.title}" completed status is now ${!item?.completed}`);
  };

  // Pulse simulation controller
  useEffect(() => {
    let interval: any;
    if (isCompiling) {
      interval = setInterval(() => {
        setSimPulse(p => {
          if (p >= 100) {
            setIsCompiling(false);
            addLog("✓ Active code bundle compiled successfully. Synced mock devices!");
            return 0;
          }
          return p + 10;
        });
      }, 120);
    }
    return () => clearInterval(interval);
  }, [isCompiling]);

  const addLog = (msg: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setTerminalLogs(prev => [...prev, `[${timestamp}] ${msg}`]);
  };

  const handleCompile = () => {
    setIsCompiling(true);
    setSimPulse(0);
    addLog(`⚙️ Compiling active buffer: ${activeFile.name}...`);
  };

  // Window coordinate dragging handler
  const handleWindowDragStart = (e: React.MouseEvent, id: string) => {
    // Avoid dragging when interacting with interactive inputs or scroll overlays
    if (
      (e.target as HTMLElement).closest(
        "button, input, textarea, pre, select, option, a, [draggable=false]"
      )
    ) {
      return;
    }
    if (activeTool === "pan") return;

    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startY = e.clientY;
    const initialX = positions[id]?.x || 0;
    const initialY = positions[id]?.y || 0;

    addLog(`Repositioning window "${id}"`);

    const handleMouseMove = (moveEvent: MouseEvent) => {
      // Divide offset change by scale ratio for precise cursor tracking on zoom!
      const dx = (moveEvent.clientX - startX) / scale;
      const dy = (moveEvent.clientY - startY) / scale;
      setPositions(prev => ({
        ...prev,
        [id]: { x: Math.round(initialX + dx), y: Math.round(initialY + dy) }
      }));
    };

    const handleMouseUp = () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };

  // Empty canvas pan dragging handler
  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    // Traverse ancestors to check if we are clicking on any window, node, or bubble
    let current: HTMLElement | null = e.target as HTMLElement;
    while (current && current !== containerRef.current) {
      if (
        (current.id && current.id in positions) ||
        current.classList.contains("window-card") ||
        current.classList.contains("workflow-bubble")
      ) {
        if (activeTool === "select") {
          return; // Let the node dragging handler deal with this interaction
        }
      }
      current = current.parentElement;
    }

    e.preventDefault();
    setIsCanvasPanning(true);
    setStartPanMouse({ x: e.clientX, y: e.clientY });
    setStartPanOffset({ x: panOffset.x, y: panOffset.y });
  };

  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (!isCanvasPanning) return;
      const dx = e.clientX - startPanMouse.x;
      const dy = e.clientY - startPanMouse.y;
      setPanOffset({
        x: startPanOffset.x + dx,
        y: startPanOffset.y + dy
      });
    };

    const handleGlobalMouseUp = () => {
      setIsCanvasPanning(false);
    };

    if (isCanvasPanning) {
      window.addEventListener("mousemove", handleGlobalMouseMove);
      window.addEventListener("mouseup", handleGlobalMouseUp);
    }

    return () => {
      window.removeEventListener("mousemove", handleGlobalMouseMove);
      window.removeEventListener("mouseup", handleGlobalMouseUp);
    };
  }, [isCanvasPanning, startPanMouse, startPanOffset]);

  // Zoom manipulation with wheel actions
  const handleWheelZoom = (e: React.WheelEvent) => {
    // Only zoom when mouse is container bound
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.05 : 0.95;
    setScale(prev => Math.max(0.4, Math.min(1.8, prev * zoomFactor)));
  };

  // Retrieve connector coordinates dynamically to bind SVG wires
  const getAnchorPort = (id: string, side: "left" | "right" | "top" | "bottom" | "center" = "center") => {
    const pos = positions[id];
    if (!pos) return { x: 0, y: 0 };

    let w = 140;
    let h = 42;

    if (id === "workspace") {
      w = 230;
      h = 320;
    } else if (id === "codeEditor") {
      w = 460;
      h = 360;
    } else if (id.startsWith("page")) {
      w = 260;
      h = 360;
    } else if (id === "livePreview") {
      w = 265;
      h = 370;
    } else if (id === "visionLive") {
      w = 280;
      h = 240;
    } else if (id === "systemContext") {
      w = 280;
      h = 320;
    } else if (id === "wf_success_decision") {
      w = 110;
      h = 100;
    }

    if (side === "left") return { x: pos.x, y: pos.y + h / 2 };
    if (side === "right") return { x: pos.x + w, y: pos.y + h / 2 };
    if (side === "top") return { x: pos.x + w / 2, y: pos.y };
    if (side === "bottom") return { x: pos.x + w / 2, y: pos.y + h };

    return { x: pos.x + w / 2, y: pos.y + h / 2 };
  };

  // Generate nice curves connecting pipeline steps
  const renderBezierCurve = (
    fromId: string,
    toId: string,
    fromSide: "left" | "right" | "top" | "bottom" | "center" = "right",
    toSide: "left" | "right" | "top" | "bottom" | "center" = "left",
    color: string = "rgba(48, 54, 61, 0.6)",
    isDashed: boolean = false,
    hasPulse: boolean = false
  ) => {
    const start = getAnchorPort(fromId, fromSide);
    const end = getAnchorPort(toId, toSide);

    const dx = Math.abs(end.x - start.x) * 0.45;
    const dy = Math.abs(end.y - start.y) * 0.1;

    let pathD = "";
    if (fromSide === "right" && toSide === "left") {
      pathD = `M ${start.x} ${start.y} C ${start.x + dx} ${start.y}, ${end.x - dx} ${end.y}, ${end.x} ${end.y}`;
    } else if (fromSide === "bottom" && toSide === "top") {
      pathD = `M ${start.x} ${start.y} C ${start.x} ${start.y + dy}, ${end.x} ${end.y - dy}, ${end.x} ${end.y}`;
    } else if (fromSide === "bottom" && toSide === "left") {
      pathD = `M ${start.x} ${start.y} C ${start.x} ${start.y + dy}, ${end.x - dx} ${end.y}, ${end.x} ${end.y}`;
    } else {
      pathD = `M ${start.x} ${start.y} C ${start.x + dx} ${start.y}, ${end.x - dx} ${end.y}, ${end.x} ${end.y}`;
    }

    const isAutomationCurve = fromId.startsWith("wf_") || toId.startsWith("wf_");
    const activeOpacity = activeTab === "code" && isAutomationCurve ? 0.15 : 1;

    return (
      <g key={`${fromId}-${toId}`} style={{ opacity: activeOpacity }} className="transition-opacity duration-300">
        <path
          d={pathD}
          fill="none"
          stroke={color}
          strokeWidth="1.5"
          strokeDasharray={isDashed ? "4,4" : undefined}
          className="transition-all duration-75"
        />
        {hasPulse && (
          <circle r="3.5" fill="#3b82f6" className="shadow-lg animate-pulse">
            <animateMotion dur="2.4s" repeatCount="indefinite" path={pathD} />
          </circle>
        )}
      </g>
    );
  };

  // Syntactic Highlighting parser for real-time visual code views
  const renderHighlightedTSX = (rawText: string) => {
    const lines = rawText.split("\n");
    return lines.map((line, idx) => {
      const keywords = [
        "import",
        "from",
        "export",
        "default",
        "function",
        "const",
        "return",
        "let",
        "if",
        "else",
        "map",
        "filter"
      ];
      const words = line.split(/(\s+|,|\.|\(|\)|\{|\}|\[|\]|<|>|=|\/|;|`|'|")/);

      let isComment = false;
      let isString = false;
      let quoteChar = "";

      const elements = words.map((w, wIdx) => {
        if (!w) return null;

        if (w === "//" || (line.trim().startsWith("//") && wIdx === 0)) {
          isComment = true;
        }

        if (isComment) {
          return (
            <span key={wIdx} className="text-[#6a737d] italic">
              {w}
            </span>
          );
        }

        if ((w === '"' || w === "'" || w === "`") && !isString) {
          isString = true;
          quoteChar = w;
          return <span key={wIdx} className="text-[#9ecbff]">{w}</span>;
        } else if (isString && w === quoteChar) {
          isString = false;
          return <span key={wIdx} className="text-[#9ecbff]">{w}</span>;
        }

        if (isString) {
          return <span key={wIdx} className="text-[#a5d6ff]">{w}</span>;
        }

        if (keywords.includes(w)) {
          return (
            <span key={wIdx} className="text-[#ff7b72] font-semibold">
              {w}
            </span>
          );
        }

        if (w.match(/^[A-Z][a-zA-Z0-9]*$/)) {
          return (
            <span key={wIdx} className="text-[#79c0ff]">
              {w}
            </span>
          );
        }

        if (w.match(/^\d+$/)) {
          return <span key={wIdx} className="text-[#f0883e]">{w}</span>;
        }

        if (w.startsWith("use") && w[3]?.toUpperCase() === w[3]) {
          return (
            <span key={wIdx} className="text-[#d2a8ff] italic">
              {w}
            </span>
          );
        }

        if (w === "tasks" || w === "loading" || w === "addTask") {
          return <span key={wIdx} className="text-[#ffa657]">{w}</span>;
        }

        if (["(", ")", "{", "}", "[", "]"].includes(w)) {
          return <span key={wIdx} className="text-[#f2cc60]">{w}</span>;
        }

        return (
          <span key={wIdx} className="text-[#c9d1d9]">
            {w}
          </span>
        );
      });

      return (
        <div key={idx} className="flex font-mono text-[10.5px] leading-relaxed">
          <span className="w-8 text-right pr-2 text-gray-600 select-none border-r border-[#30363d]/30 mr-2 text-[9px] tabular-nums">
            {idx + 1}
          </span>
          <span className="whitespace-pre">{elements}</span>
        </div>
      );
    });
  };

  // Checklist statistics compiled live
  const completedTaskCount = tasks.filter(t => t.completed).length;
  const taskCompletionRatio = Math.round((completedTaskCount / tasks.length) * 100);

  return (
    <div
      ref={containerRef}
      className={`flex-grow h-full bg-[#0b0f19] relative select-none overflow-hidden outline-none ${
        activeTool === "pan"
          ? isCanvasPanning
            ? "cursor-grabbing"
            : "cursor-grab"
          : "cursor-default"
      }`}
      onMouseDown={handleCanvasMouseDown}
      onWheel={handleWheelZoom}
      id="main-draggable-node-canvas"
    >
      
      {/* 1. Underlying giant dotted grid grid-mesh backdrop */}
      <div
        className="absolute inset-0 transition-transform duration-75 ease-out pointer-events-none"
        style={{
          transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${scale})`,
          backgroundImage: "radial-gradient(#1f293d 1.5px, transparent 1.5px)",
          backgroundSize: "22px 22px",
          transformOrigin: "0 0"
        }}
      />

      {/* 2. Panoramic interconnect lines layer (SVGs are offset mapped and scale adjusted too!) */}
      <svg
        className="absolute inset-0 pointer-events-none select-none z-10 transition-transform duration-75 ease-out"
        style={{
          transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${scale})`,
          transformOrigin: "0 0",
          width: "3500px",
          height: "2200px"
        }}
      >
        {/* Top workflow connectors */}
        {renderBezierCurve("wf_newuser", "wf_createaccount", "right", "left", "rgba(59, 130, 246, 0.75)", false, true)}
        {renderBezierCurve("wf_createaccount", "wf_sendemail", "right", "left", "rgba(59, 130, 246, 0.5)", false)}
        {renderBezierCurve("wf_newuser", "wf_addcrm", "bottom", "left", "rgba(59, 130, 246, 0.4)", true)}
        {renderBezierCurve("wf_addcrm", "wf_logevent", "right", "left", "rgba(59, 130, 246, 0.5)")}

        {/* Dynamic linking indicators file lines */}
        {renderBezierCurve("workspace", "codeEditor", "right", "left", "rgba(110, 118, 129, 0.25)", true)}
        {renderBezierCurve("codeEditor", "livePreview", "right", "left", "rgba(110, 118, 129, 0.25)", true)}

        {/* Live connections from bubbles to simulator components */}
        {renderBezierCurve("wf_fetchtasks", "page1", "bottom", "left", "rgba(56, 189, 248, 0.5)", true, true)}
        {renderBezierCurve("wf_fetchtasks", "page2", "bottom", "left", "rgba(56, 189, 248, 0.5)", true)}
        {renderBezierCurve("page3", "wf_geninsights", "bottom", "left", "rgba(168, 85, 247, 0.5)", true)}

        {/* Bottom pipeline flows */}
        {renderBezierCurve("wf_useraction", "wf_validateinput", "right", "left", "rgba(16, 185, 129, 0.75)")}
        {renderBezierCurve("wf_validateinput", "wf_processrequest", "right", "left", "rgba(16, 185, 129, 0.75)")}
        {renderBezierCurve("wf_processrequest", "wf_success_decision", "right", "left", "rgba(16, 185, 129, 0.75)", false, true)}
        {renderBezierCurve("wf_success_decision", "wf_updatedb", "right", "left", "rgba(16, 185, 129, 0.6)")}
        {renderBezierCurve("wf_success_decision", "wf_notifyadmin", "right", "left", "rgba(245, 158, 11, 0.6)")}
        {renderBezierCurve("wf_success_decision", "wf_logevent2", "right", "left", "rgba(100, 116, 139, 0.6)")}
      </svg>

      {/* 3. The actual draggable nodes content layer */}
      <div
        className="absolute inset-0 transition-transform duration-75 ease-out select-none"
        style={{
          transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${scale})`,
          transformOrigin: "0 0"
        }}
      >

        {/* TOP FLOATING WORKFLOW BUBBLES wrapper */}
        <div className={`absolute inset-0 z-30 pointer-events-none ${activeTab === "code" ? "opacity-15 grayscale transition-all duration-300" : "transition-all duration-300"}`}>
          <div className="relative w-full h-full pointer-events-auto">
            {/* Trigger Bubble: New User */}
            <div
              id="wf_newuser"
          style={{ left: positions.wf_newuser.x, top: positions.wf_newuser.y }}
          className="absolute z-30 bg-[#161b22]/90 border border-blue-500/40 rounded-xl px-2.5 py-1 flex items-center space-x-2 shadow-lg cursor-pointer select-none whitespace-nowrap"
          onMouseDown={(e) => handleWindowDragStart(e, "wf_newuser")}
        >
          <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-ping" />
          <div className="text-[9px] font-mono leading-none">
            <span className="text-blue-400 block font-bold text-[7.5px] uppercase">New User</span>
            <span className="text-gray-300 font-sans font-semibold">Trigger</span>
          </div>
        </div>

        {/* Action Bubble: Create Account */}
        <div
          id="wf_createaccount"
          style={{ left: positions.wf_createaccount.x, top: positions.wf_createaccount.y }}
          className="absolute z-30 bg-[#161b22]/90 border border-gray-700/60 rounded-xl px-2.5 py-1 flex items-center space-x-2 shadow-lg cursor-pointer select-none whitespace-nowrap"
          onMouseDown={(e) => handleWindowDragStart(e, "wf_createaccount")}
        >
          <Compass className="w-3.5 h-3.5 text-gray-500" />
          <div className="text-[9px] font-mono leading-none">
            <span className="text-gray-400 block font-bold text-[7.5px] uppercase">Create Account</span>
            <span className="text-gray-300 font-sans font-semibold">Action</span>
          </div>
        </div>

        {/* Action Bubble: Send Welcome Email */}
        <div
          id="wf_sendemail"
          style={{ left: positions.wf_sendemail.x, top: positions.wf_sendemail.y }}
          className="absolute z-30 bg-[#161b22]/90 border border-gray-700/60 rounded-xl px-2.5 py-1 flex items-center space-x-2 shadow-lg cursor-pointer select-none whitespace-nowrap"
          onMouseDown={(e) => handleWindowDragStart(e, "wf_sendemail")}
        >
          <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
          <div className="text-[9px] font-mono leading-none">
            <span className="text-gray-400 block font-bold text-[7.5px] uppercase">Send Welcome Email</span>
            <span className="text-gray-300 font-sans font-semibold">Action</span>
          </div>
        </div>

        {/* Action Bubble: Add to CRM */}
        <div
          id="wf_addcrm"
          style={{ left: positions.wf_addcrm.x, top: positions.wf_addcrm.y }}
          className="absolute z-30 bg-[#161b22]/90 border border-gray-700/60 rounded-xl px-2.5 py-1 flex items-center space-x-2 shadow-lg cursor-pointer select-none whitespace-nowrap"
          onMouseDown={(e) => handleWindowDragStart(e, "wf_addcrm")}
        >
          <Database className="w-3.5 h-3.5 text-blue-500" />
          <div className="text-[9px] font-mono leading-none">
            <span className="text-gray-400 block font-bold text-[7.5px] uppercase">Add to CRM</span>
            <span className="text-gray-300 font-sans font-semibold">Action</span>
          </div>
        </div>

        {/* Action Bubble: Log Event */}
        <div
          id="wf_logevent"
          style={{ left: positions.wf_logevent.x, top: positions.wf_logevent.y }}
          className="absolute z-30 bg-[#161b22]/90 border border-gray-700/60 rounded-xl px-2.5 py-1 flex items-center space-x-2 shadow-lg cursor-pointer select-none whitespace-nowrap"
          onMouseDown={(e) => handleWindowDragStart(e, "wf_logevent")}
        >
          <Activity className="w-3.5 h-3.5 text-purple-400" />
          <div className="text-[9px] font-mono leading-none">
            <span className="text-gray-400 block font-bold text-[7.5px] uppercase">Log Event</span>
            <span className="text-gray-300 font-sans font-semibold">Action</span>
          </div>
        </div>

        {/* Pipeline Fetch Tasks Action */}
        <div
          id="wf_fetchtasks"
          style={{ left: positions.wf_fetchtasks.x, top: positions.wf_fetchtasks.y }}
          className="absolute z-30 bg-[#161b22]/95 border border-blue-500/30 rounded-xl px-2.5 py-1 flex items-center space-x-2 shadow-lg cursor-pointer select-none whitespace-nowrap"
          onMouseDown={(e) => handleWindowDragStart(e, "wf_fetchtasks")}
        >
          <RefreshCw className="w-3.5 h-3.5 text-blue-400 animate-spin" />
          <div className="text-[9px] font-mono leading-none">
            <span className="text-blue-400 block font-bold text-[7.5px] uppercase">Fetch Tasks</span>
            <span className="text-gray-300 font-sans font-semibold">Action</span>
          </div>
        </div>

        {/* Pipeline Update Task Action */}
        <div
          id="wf_updatetask"
          style={{ left: positions.wf_updatetask.x, top: positions.wf_updatetask.y }}
          className="absolute z-30 bg-[#161b22]/95 border border-sky-400/20 rounded-xl px-2.5 py-1 flex items-center space-x-2 shadow-lg cursor-pointer select-none whitespace-nowrap"
          onMouseDown={(e) => handleWindowDragStart(e, "wf_updatetask")}
        >
          <Sliders className="w-3.5 h-3.5 text-sky-400" />
          <div className="text-[9px] font-mono leading-none">
            <span className="text-sky-300 block font-bold text-[7.5px] uppercase">Update Task</span>
            <span className="text-gray-300 font-sans font-semibold">Action</span>
          </div>
        </div>

        {/* Pipeline Generate Insights Action */}
        <div
          id="wf_geninsights"
          style={{ left: positions.wf_geninsights.x, top: positions.wf_geninsights.y }}
          className="absolute z-30 bg-[#161b22]/95 border border-purple-500/30 rounded-xl px-2.5 py-1 flex items-center space-x-2 shadow-lg cursor-pointer select-none whitespace-nowrap"
          onMouseDown={(e) => handleWindowDragStart(e, "wf_geninsights")}
        >
          <Sparkles className="w-3.5 h-3.5 text-purple-400" />
          <div className="text-[9px] font-mono leading-none">
            <span className="text-purple-400 block font-bold text-[7.5px] uppercase">Generate Insights</span>
            <span className="text-gray-300 font-sans font-semibold">Action</span>
          </div>
        </div>


          </div>
        </div>


        {/* WINDOW 1: WORKSPACE (File Explorer list) */}
        <div
          id="workspace"
          style={{ left: positions.workspace.x, top: positions.workspace.y }}
          className="absolute w-[240px] window-card bg-[#0d1117] border border-[#30363d] rounded-xl flex flex-col shadow-2xl z-20 overflow-hidden select-none"
          onMouseDown={(e) => handleWindowDragStart(e, "workspace")}
        >
          <div className="h-9 px-3 bg-[#161b22] border-b border-[#30363d] flex items-center justify-between cursor-move shrink-0">
            <span className="text-[10px] font-semibold text-gray-300 tracking-wide uppercase font-sans flex items-center space-x-1.5">
              <FolderOpen className="w-3.5 h-3.5 text-blue-400" />
              <span>Workspace</span>
            </span>
            <div className="flex items-center space-x-1.5 text-gray-500">
              <span className="w-2.5 h-2.5 rounded-full hover:bg-slate-700 block transition-colors cursor-pointer" />
              <span className="w-2.5 h-2.5 rounded-full hover:bg-slate-700 block transition-colors cursor-pointer" />
            </div>
          </div>

          <div className="p-3 flex-1 flex flex-col space-y-2 max-h-[290px] overflow-y-auto custom-scrollbar">
            <div className="flex items-center space-x-1.5 font-sans font-bold text-xs text-white pb-1.5 border-b border-white/5 select-text">
              <span>📂 MyApp</span>
              <span className="text-[8px] bg-blue-500/10 text-blue-400 px-1 py-0.2 rounded font-mono uppercase">Node</span>
            </div>

            <div className="space-y-1.5 font-mono text-[10.5px] mt-1 select-text">
              {/* src root folder */}
              <div
                className="hover:text-white cursor-pointer py-0.5 flex items-center justify-between"
                onClick={() =>
                  setExpandedFolders(prev => ({ ...prev, src: !prev.src }))
                }
              >
                <span className="text-gray-300">
                  {expandedFolders.src ? "▼" : "▶"} src
                </span>
                <span className="text-[8px] text-gray-600 block pr-1 leading-none">DIR</span>
              </div>

              {expandedFolders.src && (
                <div className="pl-3 border-l border-dashed border-gray-800 space-y-1">
                  {/* pages */}
                  <div
                    className="hover:text-white cursor-pointer py-0.5 flex items-center justify-between"
                    onClick={() =>
                      setExpandedFolders(prev => ({
                        ...prev,
                        pages: !prev.pages
                      }))
                    }
                  >
                    <span className="text-gray-400">
                      {expandedFolders.pages ? "▼" : "▶"} pages
                    </span>
                  </div>

                  {expandedFolders.pages && (
                    <div className="pl-3 border-l border-dashed border-gray-800 space-y-0.5">
                      {/* Home */}
                      <div
                        onClick={() => {
                          setSelectedFile("src/pages/Home.tsx");
                          setActiveEditorTab("Home.tsx");
                        }}
                        className={`pl-2 py-1 hover:bg-[#161b22] rounded cursor-pointer flex items-center justify-between transition-colors ${
                          selectedFile === "src/pages/Home.tsx"
                            ? "bg-blue-500/10 text-blue-300 font-bold border border-blue-500/20"
                            : "text-gray-400"
                        }`}
                      >
                        <span>└ Home.tsx</span>
                        <span className="text-[7.5px] text-emerald-500 font-bold uppercase mr-1">Active</span>
                      </div>

                      {/* Tasks.tsx */}
                      <div
                        onClick={() => {
                          setSelectedFile("src/hooks/useTasks.ts"); // Switch files in inspector
                          setActiveEditorTab("useTasks.ts");
                        }}
                        className={`pl-2 py-1 hover:bg-[#161b22] rounded cursor-pointer flex items-center justify-between transition-colors ${
                          selectedFile === "src/hooks/useTasks.ts"
                            ? "bg-blue-500/10 text-blue-300 font-bold border border-blue-500/20"
                            : "text-gray-400"
                        }`}
                      >
                        <span>└ Tasks.tsx</span>
                        <span className="text-[7.5px] text-gray-500 mr-2">TSX</span>
                      </div>

                      {/* Analytics.tsx */}
                      <div
                        onClick={() => {
                          setSelectedFile("src/services/api.ts"); // Map values
                          setActiveEditorTab("api.ts");
                        }}
                        className={`pl-2 py-1 hover:bg-[#161b22] rounded cursor-pointer flex items-center justify-between transition-colors ${
                          selectedFile === "src/services/api.ts"
                            ? "bg-blue-500/10 text-blue-300 font-bold border border-blue-500/20"
                            : "text-gray-400"
                        }`}
                      >
                        <span>└ Analytics.tsx</span>
                        <span className="text-[7.5px] text-gray-500 mr-2">TSX</span>
                      </div>
                    </div>
                  )}

                  {/* hooks */}
                  <div
                    className="hover:text-white cursor-pointer py-0.5"
                    onClick={() =>
                      setExpandedFolders(prev => ({
                        ...prev,
                        hooks: !prev.hooks
                      }))
                    }
                  >
                    <span className="text-gray-400">
                      {expandedFolders.hooks ? "▼" : "▶"} hooks
                    </span>
                  </div>

                  {expandedFolders.hooks && (
                    <div className="pl-3 border-l border-dashed border-gray-800 space-y-0.5">
                      <div
                        onClick={() => {
                          setSelectedFile("src/hooks/useTasks.ts");
                          setActiveEditorTab("useTasks.ts");
                        }}
                        className={`pl-2 py-0.5 hover:bg-[#161b22] rounded cursor-pointer border border-transparent ${
                          selectedFile === "src/hooks/useTasks.ts"
                            ? "text-blue-300 font-bold"
                            : "text-gray-400"
                        }`}
                      >
                        <span>└ useTasks.ts</span>
                      </div>
                    </div>
                  )}

                  {/* services */}
                  <div
                    className="hover:text-white cursor-pointer py-0.5"
                    onClick={() =>
                      setExpandedFolders(prev => ({
                        ...prev,
                        services: !prev.services
                      }))
                    }
                  >
                    <span className="text-gray-400">
                      {expandedFolders.services ? "▼" : "▶"} services
                    </span>
                  </div>

                  {expandedFolders.services && (
                    <div className="pl-3 border-l border-dashed border-gray-800 space-y-0.5">
                      <div
                        onClick={() => {
                          setSelectedFile("src/services/api.ts");
                          setActiveEditorTab("api.ts");
                        }}
                        className={`pl-2 py-0.5 hover:bg-[#161b22] rounded cursor-pointer border border-transparent ${
                          selectedFile === "src/services/api.ts"
                            ? "text-blue-300 font-bold"
                            : "text-gray-400"
                        }`}
                      >
                        <span>└ api.ts</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* PackageJSON */}
              <div
                onClick={() => {
                  setSelectedFile("package.json");
                  setActiveEditorTab("package.json");
                }}
                className={`py-1 pl-2 hover:bg-[#161b22] rounded cursor-pointer flex justify-between uppercase text-[9.5px] font-bold ${
                  selectedFile === "package.json"
                    ? "text-blue-300 font-bold"
                    : "text-gray-500"
                }`}
              >
                <span>📦 package.json</span>
              </div>
            </div>
          </div>
        </div>


        {/* WINDOW 2: CODE EDITOR */}
        <div
          id="codeEditor"
          style={{ left: positions.codeEditor.x, top: positions.codeEditor.y }}
          className="absolute w-[470px] window-card bg-[#0d1117] border border-[#30363d] rounded-xl flex flex-col shadow-2xl z-20 overflow-hidden"
          onMouseDown={(e) => handleWindowDragStart(e, "codeEditor")}
        >
          {/* Header tabs bar */}
          <div className="h-9 px-3 bg-[#161b22] border-b border-[#30363d] flex items-center justify-between cursor-move shrink-0">
            <div className="flex items-center space-x-1.5">
              <FileCode className="w-4 h-4 text-emerald-400" />
              {/* Coding Tab triggers */}
              {["Home.tsx", "useTasks.ts", "api.ts", "styles.css"].map(tabFile => {
                let pathKey = "";
                if (tabFile === "Home.tsx") pathKey = "src/pages/Home.tsx";
                else if (tabFile === "useTasks.ts") pathKey = "src/hooks/useTasks.ts";
                else if (tabFile === "api.ts") pathKey = "src/services/api.ts";
                else if (tabFile === "styles.css") pathKey = "src/styles/styles.css";

                const isCurrent = activeEditorTab === tabFile;
                return (
                  <button
                    key={tabFile}
                    onClick={() => {
                      setActiveEditorTab(tabFile);
                      setSelectedFile(pathKey);
                    }}
                    className={`px-2 py-1 text-[9.5px] rounded border font-mono font-bold leading-none cursor-pointer   ${
                      isCurrent
                        ? "bg-[#0d1117] border-[#30363d] text-white"
                        : "bg-transparent border-transparent text-gray-500 hover:text-gray-300"
                    }`}
                  >
                    {tabFile}
                  </button>
                );
              })}
            </div>

            <button
              onClick={handleCompile}
              className={`text-[9.5px] font-mono leading-none tracking-wider px-2 py-1 rounded-md border font-bold uppercase transition-all ${
                isCompiling
                  ? "bg-amber-500/15 text-amber-400 border-amber-500/30 animate-pulse"
                  : "bg-blue-500/10 text-blue-400 border-blue-500/30 hover:bg-blue-500/20"
              }`}
            >
              {isCompiling ? `Compiling: ${simPulse}%` : "Compile"}
            </button>
          </div>

          {/* Actual Code editor area */}
          <div className="p-3 bg-[#0d1117] flex-1 flex flex-col min-h-0">
            <div className="text-[8px] font-mono uppercase text-gray-500 mb-1 leading-none select-text">
              {activeFile.path} • Typescript Mode
            </div>

            <div className="flex-grow max-h-[260px] overflow-y-auto custom-scrollbar rounded-lg bg-[#07090e] border border-[#161b22] p-2.5">
              {/* Highlight selector output */}
              <div className="font-mono text-left">{renderHighlightedTSX(activeFile.content)}</div>
            </div>

            <div className="flex items-center justify-between text-[7px] font-mono text-gray-500 mt-2 shrink-0 border-t border-[#161b22] pt-1.5 select-text">
              <span>Lines: {activeFile.content.split("\n").length} • Spaces: 2</span>
              <span className="text-emerald-400 font-bold uppercase">AST Syntax Valid</span>
            </div>
          </div>
        </div>


        {/* HARDWARE PAGE OVERLAYS PANEL 3: PAGE 1 (HOME SCREEN SIM) */}
        <div
          id="page1"
          style={{ left: positions.page1.x, top: positions.page1.y }}
          className="absolute w-[260px] window-card bg-[#161b22]/90 border border-emerald-500/40 rounded-2xl p-3 flex flex-col shadow-2xl z-20 min-h-0 select-none"
          onMouseDown={(e) => handleWindowDragStart(e, "page1")}
        >
          <div className="flex items-center justify-between pb-1.5 border-b border-[#30363d]/50 select-text mb-2 shrink-0">
            <span className="text-[9px] font-mono uppercase font-bold text-gray-400 tracking-wider">
              Page 1: Home.tsx
            </span>
            <span className="text-[8px] font-mono text-emerald-400 flex items-center space-x-1 uppercase font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse mr-1"></span>
              Active
            </span>
          </div>

          {/* Mobile phone chassis mockup in dark slate */}
          <div className="bg-[#0d1117] border border-[#30363d] rounded-2xl p-3.5 flex flex-col relative overflow-hidden flex-1 justify-between min-h-[250px]">
            <div>
              <span className="text-[8px] text-gray-500 font-mono block leading-none uppercase">Mobile viewport</span>
              <h4 className="text-xs font-bold text-white block mt-1 font-sans select-text">
                Welcome back, Alex Lee
              </h4>

              {/* Progress Panel metrics */}
              <div className="bg-[#161b22] border border-white/5 p-2 rounded-xl mt-3 space-y-1 select-text">
                <span className="text-[7.5px] uppercase tracking-wide text-gray-400 block font-bold">
                  Today's Focus
                </span>
                <span className="text-[10px] font-bold text-white block">
                  {completedTaskCount} / {tasks.length} tasks completed
                </span>
                <div className="h-1 bg-gray-800 rounded-full overflow-hidden mt-1 relative">
                  <div
                    style={{ width: `${taskCompletionRatio}%` }}
                    className="bg-blue-500 h-full transition-all duration-300"
                  />
                  <div className="absolute right-0 top-0 text-[6.5px] font-mono font-bold leading-none select-none text-blue-400 pr-1 select-text">
                    {taskCompletionRatio}%
                  </div>
                </div>
              </div>

              {/* Checklist review lists inside mobile sim */}
              <div className="space-y-1.5 mt-3 text-[9px] text-gray-400 font-sans select-text">
                {tasks.slice(0, 3).map((task, idx) => (
                  <div key={task.id} className="flex items-center justify-between">
                    <span className={`block truncate max-w-[120px] ${task.completed ? "line-through text-gray-600" : ""}`}>
                      • {task.title}
                    </span>
                    <span
                      className={`text-[7px] font-mono px-1 rounded uppercase font-bold ${
                        task.completed
                          ? "bg-emerald-500/10 text-emerald-400"
                          : "bg-slate-800 text-slate-400"
                      }`}
                    >
                      {task.completed ? "Done" : "Pending"}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between text-[7px] font-mono text-gray-500 mt-3 shrink-0 border-t border-white/5 pt-1.5">
              <span>LOC: 124 lines</span>
              <span>Component Home</span>
            </div>
          </div>
        </div>


        {/* WINDOW 4: PAGE 2 (TASKS INTERACTIVE CHECKLIST) */}
        <div
          id="page2"
          style={{ left: positions.page2.x, top: positions.page2.y }}
          className="absolute w-[260px] window-card bg-[#161b22]/90 border border-blue-500/40 rounded-2xl p-3 flex flex-col shadow-2xl z-20 min-h-0 select-none"
          onMouseDown={(e) => handleWindowDragStart(e, "page2")}
        >
          <div className="flex items-center justify-between pb-1.5 border-b border-[#30363d]/50 select-text mb-2 shrink-0">
            <span className="text-[9px] font-mono uppercase font-bold text-gray-400 tracking-wider">
              Page 2: Tasks.tsx
            </span>
            <span className="text-[8px] font-mono text-blue-400 flex items-center space-x-1 uppercase font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse mr-1"></span>
              Live Link
            </span>
          </div>

          <div className="bg-[#0d1117] border border-[#30363d] rounded-2xl p-3.5 flex flex-col relative overflow-hidden flex-1 justify-between min-h-[250px]">
            <div className="space-y-3 shrink-0">
              <div className="flex justify-between items-baseline select-text">
                <span className="text-xs font-bold text-white font-sans leading-none">
                  My Tasks
                </span>
                <span className="text-[7px] bg-blue-500/10 text-blue-300 font-mono font-bold uppercase rounded p-1 leading-none">
                  TODAY LOCKS
                </span>
              </div>

              {/* Working checklist trackers inputs togglers */}
              <div className="space-y-1.5">
                {tasks.map(task => (
                  <div
                    key={task.id}
                    onClick={() => handleToggleTask(task.id)}
                    className={`flex items-center justify-between p-1.5 bg-[#161b22]/70 rounded border text-[9px] cursor-pointer hover:border-blue-500/30 transition-all ${
                      task.completed
                        ? "border-emerald-500/10 text-slate-500 font-medium"
                        : "border-[#30363d] text-white font-bold"
                    }`}
                  >
                    <div className="flex items-center space-x-2 truncate max-w-[150px]">
                      <span className={`text-[10px] ${task.completed ? "text-emerald-400" : "text-gray-500"}`}>
                        {task.completed ? "☑" : "☐"}
                      </span>
                      <span className="truncate">{task.title}</span>
                    </div>
                    <span
                      className={`text-[6.5px] px-1 font-mono rounded font-bold uppercase ${
                        task.priority === "High"
                          ? "bg-red-500/15 text-red-400 border border-red-500/10"
                          : "bg-amber-500/15 text-amber-400 border border-amber-500/10"
                      }`}
                    >
                      {task.priority}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between text-[7px] font-mono text-gray-500 shrink-0 border-t border-white/5 pt-1.5 mt-2">
              <span>LOC: 98 lines</span>
              <span>Click items to check</span>
            </div>
          </div>
        </div>


        {/* WINDOW 5: PAGE 3 (ANALYTICS SCREEN DISPARITY) */}
        <div
          id="page3"
          style={{ left: positions.page3.x, top: positions.page3.y }}
          className="absolute w-[260px] window-card bg-[#161b22]/90 border border-purple-500/40 rounded-2xl p-3 flex flex-col shadow-2xl z-20 min-h-0 select-none"
          onMouseDown={(e) => handleWindowDragStart(e, "page3")}
        >
          <div className="flex items-center justify-between pb-1.5 border-b border-[#30363d]/50 select-text mb-2 shrink-0">
            <span className="text-[9px] font-mono uppercase font-bold text-gray-400 tracking-wider">
              Page 3: Analytics.tsx
            </span>
            <span className="text-[8px] font-mono text-purple-400 flex items-center space-x-1 uppercase font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse mr-1"></span>
              Building
            </span>
          </div>

          <div className="bg-[#0d1117] border border-[#30363d] rounded-2xl p-3.5 flex flex-col relative overflow-hidden flex-1 justify-between min-h-[250px]">
            <div className="space-y-2.5">
              <span className="text-xs font-bold text-white block select-text font-sans">
                Telemetry Overview
              </span>

              {/* Stats card lists */}
              <div className="space-y-1.5 text-[8.5px] font-sans">
                <div className="flex justify-between items-baseline border-b border-white/5 pb-1">
                  <span className="text-gray-400">Total Users</span>
                  <span className="text-white font-mono font-bold">2,847 <span className="text-emerald-400 font-bold">(+12%)</span></span>
                </div>

                {/* Sparkling vector chart */}
                <div className="h-6 w-full bg-[#161b22] border border-white/5 rounded overflow-hidden relative mt-1 select-none pointer-events-none">
                  <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 20">
                    <path
                      d="M 0 18 Q 20 8, 40 12 T 80 4 T 100 12"
                      fill="none"
                      stroke="#3b82f6"
                      strokeWidth="1.5"
                    />
                  </svg>
                </div>

                <div className="flex justify-between items-baseline border-b border-white/5 pb-1 mt-2">
                  <span className="text-gray-400">Completion Level</span>
                  <span className="text-[#a855f7] font-mono font-bold">
                    {taskCompletionRatio}% <span className="text-emerald-400">(+{completedTaskCount})</span>
                  </span>
                </div>

                {/* Completion Ratio Curve dynamically calculated */}
                <div className="h-6 w-full bg-[#161b22] border border-white/5 rounded overflow-hidden relative mt-1 select-none pointer-events-none">
                  <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 20">
                    <path
                      d={`M 0 18 Q 25 ${Math.max(2, 20 - taskCompletionRatio / 4)}, 50 14 T 80 8 T 100 ${Math.max(2, 20 - taskCompletionRatio / 5)}`}
                      fill="none"
                      stroke="#10b981"
                      strokeWidth="1.5"
                    />
                  </svg>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between text-[7px] font-mono text-gray-500 shrink-0 border-t border-white/5 pt-1.5 mt-2">
              <span>LOC: 156 lines</span>
              <span>Updated live from Page 2</span>
            </div>
          </div>
        </div>


        {/* WINDOW 6: LIVE PREVIEW SYSTEM MOCKUP */}
        <div
          id="livePreview"
          style={{ left: positions.livePreview.x, top: positions.livePreview.y }}
          className="absolute w-[265px] window-card bg-[#0d1117] border border-[#30363d] rounded-xl flex flex-col shadow-2xl z-20 overflow-hidden"
          onMouseDown={(e) => handleWindowDragStart(e, "livePreview")}
        >
          <div className="h-9 px-3 bg-[#161b22] border-b border-[#30363d] flex items-center justify-between cursor-move shrink-0">
            <span className="text-[10px] font-semibold text-gray-300 tracking-wide uppercase font-sans flex items-center space-x-1">
              <Eye className="w-3.5 h-3.5 text-blue-400" />
              <span>Live Phone Preview</span>
            </span>
            <div className="flex items-center space-x-1 bg-black/35 px-1.5 py-0.5 rounded text-[8px] font-mono text-emerald-400">
              <span className="w-1 h-1 bg-emerald-500 rounded-full animate-ping mr-1" />
              <span>Connected</span>
            </div>
          </div>

          <div className="p-3 bg-black flex-1 flex flex-col">
            <div className="flex bg-[#161b22] p-0.5 border border-white/5 rounded-lg justify-between text-[8px] font-sans font-bold leading-none mb-3">
              <span className="px-2 py-1 bg-blue-500 text-white rounded cursor-pointer uppercase font-bold text-center">Mobile</span>
              <span className="px-2 py-1 text-gray-400 rounded cursor-pointer uppercase text-center hover:text-white">Tablet</span>
              <span className="px-2 py-1 text-gray-400 rounded cursor-pointer uppercase text-center hover:text-white">Desktop</span>
            </div>

            {/* Mobile simulator body with real dynamic interaction! */}
            <div className="bg-[#0d1117] border border-gray-800 rounded-2xl p-4 flex flex-col justify-between h-[230px] shadow-inner font-sans text-left">
              <div>
                <div className="flex justify-between items-center text-[7.5px] font-mono text-gray-600 border-b border-white/5 pb-1">
                  <span>Carrier 5G</span>
                  <span>9:41 AM</span>
                </div>

                <div className="mt-2.5">
                  <span className="text-[8px] text-gray-500 font-mono block uppercase">Client Sandbox</span>
                  <span className="text-[11px] font-extrabold text-white leading-tight">
                    Alex Lee Dashboard
                  </span>
                </div>

                {/* Inner simulated action block */}
                <div className="bg-[#161b22] border border-white/5 p-2 rounded-xl mt-3 select-text space-y-1">
                  <div className="flex items-center justify-between text-[7px] text-gray-400 font-bold uppercase leading-none">
                    <span>Task Automation</span>
                    <span className="text-emerald-400 font-bold">Online</span>
                  </div>
                  <div className="flex justify-between items-center text-[10px] font-bold text-white mt-1 leading-normal">
                    <span>{completedTaskCount} Completed</span>
                    <span className="text-[8.5px] font-mono block font-bold text-blue-400">{taskCompletionRatio}% Ratio</span>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between">
                  <button
                    onClick={() => {
                      setTasks(prev =>
                        prev.map(t => ({ ...t, completed: !t.completed }))
                      );
                      addLog("Master toggled all preview items!");
                    }}
                    className="w-full text-center py-1.5 bg-blue-500 hover:bg-blue-600 rounded-xl text-[8px] cursor-pointer text-white font-bold transition-all uppercase"
                  >
                    Toggle All Checklist items
                  </button>
                </div>
              </div>

              <div className="text-[7px] font-mono font-bold text-slate-500 text-center leading-none select-text">
                Port 3000 Tunnel • Synced
              </div>
            </div>
          </div>
        </div>


        {/* WINDOW 7: VISION LIVE */}
        <div
          id="visionLive"
          style={{ left: positions.visionLive.x, top: positions.visionLive.y }}
          className="absolute w-[280px] window-card bg-[#161b22]/90 border border-[#30363d] rounded-xl flex flex-col shadow-2xl z-20 overflow-hidden"
          onMouseDown={(e) => handleWindowDragStart(e, "visionLive")}
        >
          <div className="h-9 px-3 bg-[#161b22] border-b border-[#30363d] flex items-center justify-between cursor-move shrink-0">
            <span className="text-[10px] font-bold text-gray-300 tracking-wide uppercase font-sans flex items-center space-x-1.5">
              <Eye className="w-3.5 h-3.5 text-blue-400" />
              <span>Vision Live</span>
            </span>
            <div className="flex items-center space-x-1 block uppercase font-mono text-[8px] font-bold text-emerald-400">
              <span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
              <span>LIVE FEED</span>
            </div>
          </div>

          <div className="relative h-40 overflow-hidden flex items-center justify-center">
            <CameraFeed showMesh={true} meshMode="Object Detection" className="h-full w-full" />
          </div>
        </div>


        {/* WINDOW 8: SYSTEM CONTEXT SPECIFICATIONS */}
        <div
          id="systemContext"
          style={{ left: positions.systemContext.x, top: positions.systemContext.y }}
          className="absolute w-[280px] window-card bg-[#161b22]/90 border border-[#30363d] rounded-2xl p-3 flex flex-col shadow-2xl z-20 select-none"
          onMouseDown={(e) => handleWindowDragStart(e, "systemContext")}
        >
          <div className="flex items-center justify-between pb-1.5 border-b border-[#30363d]/50 select-text mb-2 shrink-0">
            <span className="text-[9px] font-mono uppercase font-bold text-gray-400 tracking-wider">
              System context diagnostics
            </span>
            <span className="text-[7.5px] font-mono text-emerald-400 font-bold uppercase block tracking-wide flex items-center">
              <span className="w-1 h-1 rounded-full bg-emerald-500 animate-ping mr-1"></span>
              LIVE OK
            </span>
          </div>

          <div className="space-y-3 flex-1 overflow-y-auto custom-scrollbar">
            <div className="space-y-1 font-mono text-[9.5px]">
              <div className="flex justify-between items-center bg-black/45 p-1.5 px-2 rounded-lg border border-white/5">
                <span className="text-gray-500">Browser Client:</span>
                <span className="text-white font-bold select-text">Chrome v125</span>
              </div>
              <div className="flex justify-between items-center bg-black/45 p-1.5 px-2 rounded-lg border border-white/5">
                <span className="text-gray-500">Operating OS:</span>
                <span className="text-gray-300">macOS Sonoma (14.5)</span>
              </div>
              <div className="flex justify-between items-center bg-black/45 p-1.5 px-2 rounded-lg border border-white/5">
                <span className="text-gray-500">Host Engine:</span>
                <span className="text-white font-bold select-text">MacBook Pro M3 Pro</span>
              </div>
              <div className="flex justify-between items-center bg-black/45 p-1.5 px-2 rounded-lg border border-white/5">
                <span className="text-gray-500">GPU Tracker:</span>
                <span className="text-sky-400 font-bold select-text">M3 18-Core Hardware</span>
              </div>
            </div>

            {/* Scanned devices lists peripherals */}
            <div className="space-y-1.5">
              <span className="text-[8px] font-mono font-bold uppercase text-gray-500 tracking-wide block">
                Local Bluetooth Networks
              </span>

              <div className="grid grid-cols-1 gap-1.5 font-sans">
                {[
                  { name: "Apple AirPods Pro", type: "Connected Studio Audio", signal: "Synced (92%)", color: "text-emerald-400" },
                  { name: "iPhone 15 Pro Max", type: "Active Sandbox Host", signal: "Ready", color: "text-blue-400" },
                  { name: "Logitech MX Master 3S", type: "Wireless Bluetooth Pointer", signal: "Online", color: "text-emerald-400" }
                ].map((device, i) => (
                  <div key={i} className="flex justify-between items-center bg-[#0d1117] p-1.5 rounded-lg border border-white/5 text-[9px] select-text">
                    <div>
                      <span className="text-white font-bold block leading-none">{device.name}</span>
                      <span className="text-[7.5px] text-gray-500 block leading-none mt-1">{device.type}</span>
                    </div>
                    <span className={`text-[7.5px] font-mono uppercase font-black ${device.color}`}>{device.signal}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>


        {/* BOTTOM PIPELINE FLOWCHART BLOCKS (Draggable & Connected) wrapper */}
        <div className={`absolute inset-0 z-20 pointer-events-none ${activeTab === "code" ? "opacity-15 grayscale transition-all duration-300" : "transition-all duration-300"}`}>
          <div className="relative w-full h-full pointer-events-auto">
            {/* User Action Trigger */}
            <div
              id="wf_useraction"
              style={{ left: positions.wf_useraction.x, top: positions.wf_useraction.y }}
              className="absolute z-20 bg-[#161b22]/95 border border-emerald-500/40 rounded-xl px-2.5 py-1.5 flex items-center space-x-2 shadow-lg cursor-pointer whitespace-nowrap"
              onMouseDown={(e) => handleWindowDragStart(e, "wf_useraction")}
            >
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <div className="text-[9.5px] leading-tight">
                <span className="text-emerald-400 font-bold block text-[7px] uppercase font-mono font-sans mt-0.5">User Action</span>
                <span className="text-white font-semibold font-sans">Trigger Node</span>
              </div>
            </div>

            {/* Validate Input Action */}
            <div
              id="wf_validateinput"
              style={{ left: positions.wf_validateinput.x, top: positions.wf_validateinput.y }}
              className="absolute z-20 bg-[#161b22]/95 border border-gray-700 rounded-xl px-2.5 py-1.5 flex items-center space-x-2 shadow-lg cursor-pointer whitespace-nowrap"
              onMouseDown={(e) => handleWindowDragStart(e, "wf_validateinput")}
            >
              <Compass className="w-3.5 h-3.5 text-blue-400" />
              <div className="text-[9.5px] leading-tight text-left">
                <span className="text-gray-400 block text-[7px] uppercase font-mono">Validate Input</span>
                <span className="text-white font-semibold font-sans mb-1 block">Sanitize Action</span>
              </div>
            </div>

            {/* Process Request Action */}
            <div
              id="wf_processrequest"
              style={{ left: positions.wf_processrequest.x, top: positions.wf_processrequest.y }}
              className="absolute z-20 bg-[#161b22]/95 border border-gray-700 rounded-xl px-2.5 py-1.5 flex items-center space-x-2 shadow-lg cursor-pointer whitespace-nowrap"
              onMouseDown={(e) => handleWindowDragStart(e, "wf_processrequest")}
            >
              <Activity className="w-3.5 h-3.5 text-emerald-400 animate-spin" style={{ animationDuration: "3s" }} />
              <div className="text-[9.5px] leading-tight text-left">
                <span className="text-gray-400 block text-[7px] uppercase font-mono">Process Request</span>
                <span className="text-white font-semibold font-sans block mb-1">Compute Action</span>
              </div>
            </div>

            {/* Diamond Decision Node Shape: Success? */}
            <div
              id="wf_success_decision"
              style={{ left: positions.wf_success_decision.x, top: positions.wf_success_decision.y }}
              className="absolute z-20 w-[100px] h-[100px] flex items-center justify-center cursor-pointer select-none"
              onMouseDown={(e) => handleWindowDragStart(e, "wf_success_decision")}
            >
              {/* Diamond block styled using CSS border clip representation */}
              <div className="absolute inset-0 bg-[#161b22]/95 border-2 border-purple-500/40 rotate-45 rounded-lg shadow-xl" />
              <div className="relative text-center leading-none z-10 text-[9.5px] font-bold font-sans">
                <span className="text-purple-400 font-mono text-[7px] uppercase tracking-wider block">Decision</span>
                <span className="text-white text-[10.5px] font-black uppercase mt-1 block">Success?</span>
              </div>
            </div>

            {/* Decision Action: Update Database */}
            <div
              id="wf_updatedb"
              style={{ left: positions.wf_updatedb.x, top: positions.wf_updatedb.y }}
              className="absolute z-20 bg-[#161b22]/95 border border-emerald-500/20 rounded-xl px-2.5 py-1.5 flex items-center space-x-2 shadow-lg cursor-pointer whitespace-nowrap text-left"
              onMouseDown={(e) => handleWindowDragStart(e, "wf_updatedb")}
            >
              <Database className="w-3.5 h-3.5 text-emerald-400" />
              <div className="text-[9.5px] leading-tight">
                <span className="text-emerald-400 font-bold block text-[7px] uppercase font-mono">Update Database</span>
                <span className="text-white font-semibold font-sans select-text">Write DB Action</span>
              </div>
            </div>

            {/* Decision Action: Notify Admin */}
            <div
              id="wf_notifyadmin"
              style={{ left: positions.wf_notifyadmin.x, top: positions.wf_notifyadmin.y }}
              className="absolute z-20 bg-[#161b22]/95 border border-amber-500/20 rounded-xl px-2.5 py-1.5 flex items-center space-x-2 shadow-lg cursor-pointer whitespace-nowrap text-left"
              onMouseDown={(e) => handleWindowDragStart(e, "wf_notifyadmin")}
            >
              <Volume2 className="w-3.5 h-3.5 text-amber-400" />
              <div className="text-[9.5px] leading-tight">
                <span className="text-amber-400 font-bold block text-[7px] uppercase font-mono">Notify Admin</span>
                <span className="text-white font-semibold font-sans">Alert System</span>
              </div>
            </div>

            {/* Decision Action: Log Event 2 */}
            <div
              id="wf_logevent2"
              style={{ left: positions.wf_logevent2.x, top: positions.wf_logevent2.y }}
              className="absolute z-20 bg-[#161b22]/95 border border-gray-700/60 rounded-xl px-2.5 py-1.5 flex items-center space-x-2 shadow-lg cursor-pointer whitespace-nowrap text-left"
              onMouseDown={(e) => handleWindowDragStart(e, "wf_logevent2")}
            >
              <Activity className="w-3.5 h-3.5 text-purple-400" />
              <div className="text-[9.5px] leading-tight">
                <span className="text-purple-400 font-bold block text-[7px] uppercase font-mono font-sans mt-0.5">Log Event</span>
                <span className="text-white font-semibold font-sans">Event Action</span>
              </div>
            </div>
          </div>
        </div>

      </div>


      {/* 4. DRAG-PAN HUD TOOLBAR CONTROLS (BOTTOM LEFT FIXED) */}
      <div className="absolute bottom-16 left-6 z-40 bg-[#161b22]/95 border border-[#30363d] rounded-2xl p-2.5 shadow-2xl flex items-center space-x-4 font-sans select-none">
        {/* Pointer vs Hand tool selectors */}
        <div className="flex bg-[#0d1117] border border-[#30363d] rounded-xl p-0.5">
          <button
            onClick={() => {
              setActiveTool("select");
              addLog("Switched to Element Drag/Select Tool");
            }}
            title="Element Selection Tool (V)"
            className={`px-3 py-1.5 rounded-lg text-xs font-bold leading-none cursor-pointer flex items-center space-x-1 transition-all ${
              activeTool === "select"
                ? "bg-blue-500 text-white font-extrabold shadow shadow-blue-500/15"
                : "text-gray-400 hover:text-white"
            }`}
          >
            <MousePointer className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Select</span>
          </button>

          <button
            onClick={() => {
              setActiveTool("pan");
              addLog("Switched to Background Navigation Canvas Pan Tool");
            }}
            title="Canvas Pan Navigation Tool (H)"
            className={`px-3 py-1.5 rounded-lg text-xs font-bold leading-none cursor-pointer flex items-center space-x-1 transition-all ${
              activeTool === "pan"
                ? "bg-blue-500 text-white font-extrabold shadow shadow-blue-500/15"
                : "text-gray-400 hover:text-white"
            }`}
          >
            <Hand className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Pan</span>
          </button>
        </div>

        {/* Zoom factors indicators */}
        <div className="flex items-center space-x-2.5">
          <button
            onClick={() => {
              setScale(prev => Math.max(0.4, prev - 0.1));
              addLog(`Zoomed out workspace: ${Math.round((scale - 0.1) * 100)}%`);
            }}
            className="p-1 hover:bg-[#0d1117] rounded-lg text-gray-400 hover:text-white transition-opacity h-7 w-7 flex items-center justify-center border border-transparent hover:border-[#30363d]"
          >
            <MinusCircle className="w-4 h-4 text-gray-500 font-bold hover:text-white" />
          </button>

          <div
            onClick={() => {
              setScale(0.95);
              setPanOffset({ x: 20, y: 10 });
              addLog("Reset container pan bounds & scale zoom.");
            }}
            title="Double-click to reset layout bounds"
            className="text-[10px] text-white font-mono font-black uppercase text-center bg-[#0d1117] border border-[#30363d] rounded-lg px-2 py-1 leading-none cursor-pointer hover:bg-slate-800"
          >
            {Math.round(scale * 100)}%
          </div>

          <button
            onClick={() => {
              setScale(prev => Math.min(1.8, prev + 0.1));
              addLog(`Zoomed in workspace: ${Math.round((scale + 0.1) * 100)}%`);
            }}
            className="p-1 hover:bg-[#0d1117] rounded-lg text-gray-400 hover:text-white transition-opacity h-7 w-7 flex items-center justify-center border border-transparent hover:border-[#30363d]"
          >
            <PlusCircle className="w-4 h-4 text-gray-500 font-bold hover:text-white" />
          </button>
        </div>

        {/* Keyboard helpers key prompt */}
        <div className="hidden lg:flex items-center space-x-1 bg-black/15 px-2 py-1 rounded text-[7.5px] font-mono text-gray-500 leading-none">
          <span>Click & Drag Window Headers • Wheel to Zoom</span>
        </div>
      </div>


      {/* 5. DIAGNOSTICS LOG PANEL (BOTTOM RIGHT FIXED) */}
      <div className="absolute bottom-6 right-6 z-40 w-96 bg-[#161b22]/95 border border-[#30363d] rounded-2xl shadow-2xl overflow-hidden font-mono text-[9px] select-text">
        <div className="bg-[#0d1117] px-3.5 py-2 border-b border-[#30363d] flex justify-between items-center select-none">
          <span className="text-gray-400 uppercase font-black tracking-wide flex items-center">
            <Activity className="w-3.5 h-3.5 text-blue-400 mr-1.5 animate-pulse" />
            <span>Interactive Node Compiler Logs</span>
          </span>
          <button
            onClick={() => setTerminalLogs([])}
            className="text-gray-600 hover:text-white uppercase transition-all font-black"
          >
            Clear
          </button>
        </div>

        <div className="p-3 max-h-28 overflow-y-auto custom-scrollbar space-y-1.5 text-left text-[#c9d1d9]/85 select-text bg-[#07090e]">
          {terminalLogs.slice(-6).map((log, i) => (
            <div key={i} className="truncate select-text">
              <span className="text-emerald-500 font-bold mr-1">⚡</span>
              <span>{log}</span>
            </div>
          ))}
          {terminalLogs.length === 0 && (
            <div className="text-gray-600 italic">No output triggers registered. Try compiling code.</div>
          )}
        </div>
      </div>

    </div>
  );
}
