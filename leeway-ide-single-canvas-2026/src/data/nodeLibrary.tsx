/**
 * LEEWAY_HEADER - DO NOT REMOVE
 *
 * REGION: DATA
 * TAG: DATA.MODULE.PLACEHOLDER
 * DESCRIPTION: Leeway IDE data module
 * AUTHORITY: LeeWay-Standards
 * DISCOVERY_PIPELINE: Voice -> Intent -> Location -> Vertical -> Ranking -> Render
 *
 * 5WH:
 * WHAT = Data Module
 * WHY = Provide data structures
 * WHO = Leeway Innovations / Agent Lee Enablement
 * WHERE = FILEPATH
 * WHEN = 2026-06-06
 * HOW = TypeScript module
 *
 * CHAIN: Standards ? Integrated ? Runtime ? Projections
 * LICENSE: PROPRIETARY
 */

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  Code,
  CheckCircle,
  FileText,
  Eye,
  Terminal,
  Play,
  Smartphone,
  PenTool,
  BookOpen,
  Search,
  Volume2,
  Mic,
  Activity,
  Camera,
  Cpu,
  Grid,
  Film,
  Video,
  Image,
  Boxes,
  Compass,
  Database,
  Settings,
  Wifi,
  Bluetooth,
  ClipboardList,
  Usb,
  Printer,
  Monitor,
  Rocket,
  RefreshCw,
  Share2,
  Calendar,
  BarChart,
  Layers,
  Package,
  Zap
} from "lucide-react";
import { NodeDefinition, StudioPalette } from "../types/nodeTypes";
import { foundryNodeDefinitions } from "./foundryNodeCatalog";

/**
 * Color mapping for different node types/studios
 */
export const getNodeColor = (nodeType: string): string => {
  const studio = nodeType.split('.')[0];
  
  const studioColors: Record<string, string> = {
    code: '#3b82f6',      // blue
    writer: '#8b5cf6',    // purple
    audio: '#10b981',     // green
    vision: '#f59e0b',    // amber
    devices: '#06b6d4',   // cyan
    video: '#ec4899',     // pink
    xr: '#6366f1',        // indigo
    terminal: '#22c55e',  // green
    knowledge: '#14b8a6', // teal
    settings: '#64748b',  // slate
    publish: '#f97316',   // orange
    foundry: '#8b5cf6',
    content: '#3b82f6'
  };
  
  return studioColors[studio] || '#6b7280'; // default gray
};

/**
 * CODE STUDIO NODES
 * Every panel from the Code workspace becomes a draggable node
 */
const codeStudioNodes: NodeDefinition[] = [
  {
    type: "code.file-tree",
    title: "File Explorer",
    description: "Browse and manage project files and folders",
    icon: <FileText className="w-4 h-4" />,
    category: "Project",
    defaultWidth: 280,
    defaultHeight: 400,
    minWidth: 200,
    minHeight: 300
  },
  {
    type: "code.editor",
    title: "Code Editor",
    description: "Edit source code with syntax highlighting",
    icon: <Code className="w-4 h-4" />,
    category: "Editor",
    defaultWidth: 600,
    defaultHeight: 500,
    minWidth: 400,
    minHeight: 300
  },
  {
    type: "code.console",
    title: "Console",
    description: "View logs, errors, and terminal output",
    icon: <Terminal className="w-4 h-4" />,
    category: "Debug",
    defaultWidth: 600,
    defaultHeight: 250,
    minWidth: 400,
    minHeight: 150
  },
  {
    type: "code.live-preview",
    title: "Live Preview",
    description: "Real-time preview of your application",
    icon: <Eye className="w-4 h-4" />,
    category: "Preview",
    defaultWidth: 375,
    defaultHeight: 667,
    minWidth: 300,
    minHeight: 400
  },
  {
    type: "code.page-node",
    title: "Page Node",
    description: "Visual representation of an app page",
    icon: <Smartphone className="w-4 h-4" />,
    category: "Pages",
    defaultWidth: 200,
    defaultHeight: 300,
    minWidth: 150,
    minHeight: 200
  },
  {
    type: "code.automation-trigger",
    title: "Trigger Node",
    description: "Start an automation workflow",
    icon: <Zap className="w-4 h-4" />,
    category: "Automation",
    defaultWidth: 180,
    defaultHeight: 120,
    minWidth: 150,
    minHeight: 100
  },
  {
    type: "code.automation-action",
    title: "Action Node",
    description: "Perform an automated action",
    icon: <Play className="w-4 h-4" />,
    category: "Automation",
    defaultWidth: 180,
    defaultHeight: 120,
    minWidth: 150,
    minHeight: 100
  }
];

/**
 * WRITER STUDIO NODES
 * Every panel from the Writer workspace
 */
const writerStudioNodes: NodeDefinition[] = [
  {
    type: "writer.outline",
    title: "Book Outline",
    description: "Hierarchical structure of your book",
    icon: <BookOpen className="w-4 h-4" />,
    category: "Structure",
    defaultWidth: 300,
    defaultHeight: 450,
    minWidth: 250,
    minHeight: 300
  },
  {
    type: "writer.chapter-timeline",
    title: "Chapter Timeline",
    description: "Visual flowchart of all chapters",
    icon: <Layers className="w-4 h-4" />,
    category: "Structure",
    defaultWidth: 700,
    defaultHeight: 150,
    minWidth: 500,
    minHeight: 120
  },
  {
    type: "writer.editor",
    title: "Writing Editor",
    description: "Rich text editor for chapter content",
    icon: <PenTool className="w-4 h-4" />,
    category: "Editor",
    defaultWidth: 600,
    defaultHeight: 500,
    minWidth: 400,
    minHeight: 350
  },
  {
    type: "writer.research",
    title: "Research & References",
    description: "Manage sources and research materials",
    icon: <Search className="w-4 h-4" />,
    category: "Research",
    defaultWidth: 300,
    defaultHeight: 400,
    minWidth: 250,
    minHeight: 300
  },
  {
    type: "writer.insights",
    title: "Writing Insights",
    description: "Readability, word count, and analytics",
    icon: <BarChart className="w-4 h-4" />,
    category: "Analytics",
    defaultWidth: 500,
    defaultHeight: 180,
    minWidth: 400,
    minHeight: 150
  },
  {
    type: "writer.audio-preview",
    title: "Audio Preview",
    description: "Listen to text-to-speech narration",
    icon: <Volume2 className="w-4 h-4" />,
    category: "Preview",
    defaultWidth: 350,
    defaultHeight: 300,
    minWidth: 300,
    minHeight: 250
  },
  {
    type: "writer.automation-flow",
    title: "Publication Flow",
    description: "Automate publishing pipeline",
    icon: <Zap className="w-4 h-4" />,
    category: "Automation",
    defaultWidth: 400,
    defaultHeight: 200,
    minWidth: 350,
    minHeight: 150
  },
  {
    type: "writer.outputs",
    title: "Published Outputs",
    description: "Track generated content and exports",
    icon: <Package className="w-4 h-4" />,
    category: "Publishing",
    defaultWidth: 350,
    defaultHeight: 300,
    minWidth: 300,
    minHeight: 250
  }
];

/**
 * AUDIO STUDIO NODES
 */
const audioStudioNodes: NodeDefinition[] = [
  {
    type: "audio.pipeline",
    title: "Audio Pipeline",
    description: "Chain audio processing nodes",
    icon: <Activity className="w-4 h-4" />,
    category: "Pipeline",
    defaultWidth: 600,
    defaultHeight: 250,
    minWidth: 500,
    minHeight: 200
  },
  {
    type: "audio.mic-input",
    title: "Microphone Input",
    description: "Capture audio from microphone",
    icon: <Mic className="w-4 h-4" />,
    category: "Input",
    defaultWidth: 250,
    defaultHeight: 200,
    minWidth: 200,
    minHeight: 150
  },
  {
    type: "audio.voice-clone",
    title: "Voice Clone Studio",
    description: "Create and manage voice clones",
    icon: <Volume2 className="w-4 h-4" />,
    category: "Voice",
    defaultWidth: 500,
    defaultHeight: 450,
    minWidth: 400,
    minHeight: 350
  },
  {
    type: "audio.waveform",
    title: "Waveform Viewer",
    description: "Visualize audio waveforms",
    icon: <Activity className="w-4 h-4" />,
    category: "Visualization",
    defaultWidth: 600,
    defaultHeight: 200,
    minWidth: 400,
    minHeight: 150
  },
  {
    type: "audio.transcript",
    title: "Transcript",
    description: "Speech-to-text transcription",
    icon: <FileText className="w-4 h-4" />,
    category: "Processing",
    defaultWidth: 400,
    defaultHeight: 350,
    minWidth: 300,
    minHeight: 250
  },
  {
    type: "audio.voice-library",
    title: "Voice Library",
    description: "Browse available voice clones",
    icon: <Database className="w-4 h-4" />,
    category: "Voice",
    defaultWidth: 350,
    defaultHeight: 400,
    minWidth: 300,
    minHeight: 300
  },
  {
    type: "audio.system-health",
    title: "Audio System Health",
    description: "Monitor audio processing status",
    icon: <Cpu className="w-4 h-4" />,
    category: "System",
    defaultWidth: 400,
    defaultHeight: 250,
    minWidth: 350,
    minHeight: 200
  }
];

/**
 * VISION STUDIO NODES
 */
const visionStudioNodes: NodeDefinition[] = [
  {
    type: "vision.camera-feed",
    title: "Camera Feed",
    description: "Live camera video stream",
    icon: <Camera className="w-4 h-4" />,
    category: "Input",
    defaultWidth: 400,
    defaultHeight: 300,
    minWidth: 320,
    minHeight: 240
  },
  {
    type: "vision.object-detection",
    title: "Object Detection",
    description: "Detect and classify objects",
    icon: <Eye className="w-4 h-4" />,
    category: "Analysis",
    defaultWidth: 350,
    defaultHeight: 250,
    minWidth: 300,
    minHeight: 200
  },
  {
    type: "vision.segmentation",
    title: "Segmentation",
    description: "Segment image regions",
    icon: <Grid className="w-4 h-4" />,
    category: "Analysis",
    defaultWidth: 350,
    defaultHeight: 250,
    minWidth: 300,
    minHeight: 200
  },
  {
    type: "vision.ocr",
    title: "OCR / Text Recognition",
    description: "Extract text from images",
    icon: <FileText className="w-4 h-4" />,
    category: "Analysis",
    defaultWidth: 350,
    defaultHeight: 250,
    minWidth: 300,
    minHeight: 200
  },
  {
    type: "vision.pose-estimation",
    title: "Pose Estimation",
    description: "Track human body poses",
    icon: <Layers className="w-4 h-4" />,
    category: "Analysis",
    defaultWidth: 350,
    defaultHeight: 250,
    minWidth: 300,
    minHeight: 200
  },
  {
    type: "vision.pipeline",
    title: "Vision Pipeline",
    description: "Chain vision processing steps",
    icon: <Zap className="w-4 h-4" />,
    category: "Pipeline",
    defaultWidth: 500,
    defaultHeight: 200,
    minWidth: 400,
    minHeight: 150
  },
  {
    type: "vision.logs",
    title: "Pipeline Logs",
    description: "View processing logs and errors",
    icon: <Terminal className="w-4 h-4" />,
    category: "Debug",
    defaultWidth: 400,
    defaultHeight: 300,
    minWidth: 350,
    minHeight: 250
  },
  {
    type: "vision.insights",
    title: "Vision Insights",
    description: "Summary of detected elements",
    icon: <BarChart className="w-4 h-4" />,
    category: "Analytics",
    defaultWidth: 300,
    defaultHeight: 350,
    minWidth: 250,
    minHeight: 300
  },
  {
    type: "vision.controls",
    title: "Vision Controls",
    description: "Camera and model settings",
    icon: <Settings className="w-4 h-4" />,
    category: "Settings",
    defaultWidth: 300,
    defaultHeight: 350,
    minWidth: 250,
    minHeight: 300
  },
  {
    type: "vision.performance",
    title: "Performance Monitor",
    description: "FPS, CPU, GPU, memory metrics",
    icon: <Cpu className="w-4 h-4" />,
    category: "System",
    defaultWidth: 450,
    defaultHeight: 150,
    minWidth: 400,
    minHeight: 120
  }
];

/**
 * DEVICES STUDIO NODES
 */
const devicesStudioNodes: NodeDefinition[] = [
  {
    type: "devices.dashboard",
    title: "Devices Dashboard",
    description: "Overview of all connected devices",
    icon: <Monitor className="w-4 h-4" />,
    category: "Overview",
    defaultWidth: 600,
    defaultHeight: 200,
    minWidth: 500,
    minHeight: 150
  },
  {
    type: "devices.device-card",
    title: "Device Card",
    description: "Individual device information",
    icon: <Cpu className="w-4 h-4" />,
    category: "Devices",
    defaultWidth: 300,
    defaultHeight: 250,
    minWidth: 250,
    minHeight: 200
  },
  {
    type: "devices.wifi",
    title: "Wi-Fi Devices",
    description: "Manage Wi-Fi connected devices",
    icon: <Wifi className="w-4 h-4" />,
    category: "Network",
    defaultWidth: 350,
    defaultHeight: 400,
    minWidth: 300,
    minHeight: 300
  },
  {
    type: "devices.bluetooth",
    title: "Bluetooth Devices",
    description: "Manage Bluetooth peripherals",
    icon: <Bluetooth className="w-4 h-4" />,
    category: "Network",
    defaultWidth: 350,
    defaultHeight: 400,
    minWidth: 300,
    minHeight: 300
  },
  {
    type: "devices.usb",
    title: "USB Devices",
    description: "Connected USB peripherals",
    icon: <Usb className="w-4 h-4" />,
    category: "Network",
    defaultWidth: 350,
    defaultHeight: 400,
    minWidth: 300,
    minHeight: 300
  },
  {
    type: "devices.inspector",
    title: "Device Inspector",
    description: "Detailed device information and controls",
    icon: <Search className="w-4 h-4" />,
    category: "Tools",
    defaultWidth: 400,
    defaultHeight: 500,
    minWidth: 350,
    minHeight: 400
  },
  {
    type: "devices.automation",
    title: "Device Automation",
    description: "Automate device actions",
    icon: <Zap className="w-4 h-4" />,
    category: "Automation",
    defaultWidth: 450,
    defaultHeight: 300,
    minWidth: 400,
    minHeight: 250
  },
  {
    type: "devices.system-context",
    title: "System Context",
    description: "Host system information",
    icon: <Monitor className="w-4 h-4" />,
    category: "System",
    defaultWidth: 350,
    defaultHeight: 400,
    minWidth: 300,
    minHeight: 300
  }
];

/**
 * VIDEO STUDIO NODES
 */
const videoStudioNodes: NodeDefinition[] = [
  {
    type: "video.create",
    title: "Create Video",
    description: "Start new video project with prompt",
    icon: <Video className="w-4 h-4" />,
    category: "Creation",
    defaultWidth: 500,
    defaultHeight: 300,
    minWidth: 400,
    minHeight: 250
  },
  {
    type: "video.storyboard",
    title: "Storyboard",
    description: "Visual scene-by-scene layout",
    icon: <Film className="w-4 h-4" />,
    category: "Planning",
    defaultWidth: 600,
    defaultHeight: 400,
    minWidth: 500,
    minHeight: 300
  },
  {
    type: "video.timeline",
    title: "Video Timeline",
    description: "Edit video sequence and timing",
    icon: <Layers className="w-4 h-4" />,
    category: "Editing",
    defaultWidth: 700,
    defaultHeight: 200,
    minWidth: 600,
    minHeight: 150
  },
  {
    type: "video.preview",
    title: "Video Preview",
    description: "Watch video with playback controls",
    icon: <Play className="w-4 h-4" />,
    category: "Preview",
    defaultWidth: 640,
    defaultHeight: 400,
    minWidth: 480,
    minHeight: 300
  },
  {
    type: "video.captions",
    title: "Captions & Subtitles",
    description: "Add and edit video captions",
    icon: <FileText className="w-4 h-4" />,
    category: "Editing",
    defaultWidth: 500,
    defaultHeight: 350,
    minWidth: 400,
    minHeight: 300
  },
  {
    type: "video.assets",
    title: "Media Assets",
    description: "Library of clips, images, audio",
    icon: <Image className="w-4 h-4" />,
    category: "Assets",
    defaultWidth: 400,
    defaultHeight: 450,
    minWidth: 350,
    minHeight: 350
  },
  {
    type: "video.export",
    title: "Export & Publish",
    description: "Render and publish video",
    icon: <Share2 className="w-4 h-4" />,
    category: "Publishing",
    defaultWidth: 400,
    defaultHeight: 350,
    minWidth: 350,
    minHeight: 300
  },
  {
    type: "video.pipeline",
    title: "Production Pipeline",
    description: "Automated video generation flow",
    icon: <Zap className="w-4 h-4" />,
    category: "Automation",
    defaultWidth: 600,
    defaultHeight: 250,
    minWidth: 500,
    minHeight: 200
  }
];

/**
 * XR STUDIO NODES
 */
const xrStudioNodes: NodeDefinition[] = [
  {
    type: "xr.viewport",
    title: "3D Viewport",
    description: "View and manipulate 3D scene",
    icon: <Boxes className="w-4 h-4" />,
    category: "Viewport",
    defaultWidth: 600,
    defaultHeight: 500,
    minWidth: 500,
    minHeight: 400
  },
  {
    type: "xr.scene-graph",
    title: "Scene Graph",
    description: "Hierarchical scene structure",
    icon: <Layers className="w-4 h-4" />,
    category: "Structure",
    defaultWidth: 300,
    defaultHeight: 450,
    minWidth: 250,
    minHeight: 350
  },
  {
    type: "xr.inspector",
    title: "Object Inspector",
    description: "Edit object properties",
    icon: <Settings className="w-4 h-4" />,
    category: "Properties",
    defaultWidth: 350,
    defaultHeight: 500,
    minWidth: 300,
    minHeight: 400
  },
  {
    type: "xr.world-builder",
    title: "World Builder",
    description: "Build environments and terrains",
    icon: <Compass className="w-4 h-4" />,
    category: "Creation",
    defaultWidth: 400,
    defaultHeight: 450,
    minWidth: 350,
    minHeight: 350
  },
  {
    type: "xr.assets",
    title: "3D Assets",
    description: "Models, materials, textures library",
    icon: <Package className="w-4 h-4" />,
    category: "Assets",
    defaultWidth: 400,
    defaultHeight: 450,
    minWidth: 350,
    minHeight: 350
  },
  {
    type: "xr.preview-modes",
    title: "Preview Modes",
    description: "Test in Desktop, AR, VR",
    icon: <Eye className="w-4 h-4" />,
    category: "Preview",
    defaultWidth: 350,
    defaultHeight: 300,
    minWidth: 300,
    minHeight: 250
  },
  {
    type: "xr.performance",
    title: "Performance Monitor",
    description: "FPS, draw calls, memory usage",
    icon: <BarChart className="w-4 h-4" />,
    category: "System",
    defaultWidth: 450,
    defaultHeight: 200,
    minWidth: 400,
    minHeight: 150
  },
  {
    type: "xr.console",
    title: "XR Console",
    description: "Logs, errors, and warnings",
    icon: <Terminal className="w-4 h-4" />,
    category: "Debug",
    defaultWidth: 500,
    defaultHeight: 250,
    minWidth: 400,
    minHeight: 200
  }
];

function terminalNode(
  type: string,
  title: string,
  description: string,
  category: string,
  icon: React.ReactNode,
  defaultWidth = 420,
  defaultHeight = 320
): NodeDefinition {
  return {
    type,
    title,
    description,
    icon,
    category,
    defaultWidth,
    defaultHeight,
    minWidth: 300,
    minHeight: 220,
    resizable: true,
    data: {
      leewayNodeId: `LEEWAY_APP::IDE_SINGLE_CANVAS::OMNI_TERMINAL::${type.toUpperCase().replace(/[^A-Z0-9]+/g, "_")}`,
      fabric: "omni-terminal",
      status: "OMNI_TERMINAL_FABRIC_REQUIRED",
      receiptStatus: "COMMAND_RECEIPT_REQUIRED",
      requiresRuntimeTruth: true,
    },
  };
}

/**
 * TERMINAL FABRIC NODES
 * Truth-bound Omni-Terminal / Device Command Fabric node family.
 */
const terminalFabricNodes: NodeDefinition[] = [
  terminalNode("terminal.local-shell", "Local Shell", "Truth-bound local shell session surface", "Session Nodes", <Terminal className="w-4 h-4" />),
  terminalNode("terminal.powershell", "PowerShell", "Windows PowerShell session node", "Session Nodes", <Terminal className="w-4 h-4" />),
  terminalNode("terminal.bash", "Bash", "Bash shell session node", "Session Nodes", <Terminal className="w-4 h-4" />),
  terminalNode("terminal.cmd", "CMD", "Windows CMD session node", "Session Nodes", <Terminal className="w-4 h-4" />),
  terminalNode("terminal.ssh", "SSH Terminal", "Remote SSH session node", "Session Nodes", <Wifi className="w-4 h-4" />),
  terminalNode("terminal.adb", "ADB Shell", "Android / TV ADB shell node", "Session Nodes", <Smartphone className="w-4 h-4" />),
  terminalNode("terminal.serial-console", "Serial Console", "UART / serial command session node", "Session Nodes", <Usb className="w-4 h-4" />),
  terminalNode("terminal.docker-shell", "Docker Shell", "Container shell session node", "Session Nodes", <Package className="w-4 h-4" />),
  terminalNode("terminal.runtime-shell", "Runtime Shell", "Runtime Fabric shell session node", "Session Nodes", <Cpu className="w-4 h-4" />),

  terminalNode("terminal.device-scanner", "Device Scanner", "Requests truthful device discovery from Runtime Fabric", "Device Nodes", <Search className="w-4 h-4" />),
  terminalNode("terminal.device-registry", "Device Registry", "Displays real device registry records or required status", "Device Nodes", <Database className="w-4 h-4" />, 520, 390),
  terminalNode("terminal.device-tag-group", "Device Tag Group", "Groups devices by governed runtime tag", "Device Nodes", <Layers className="w-4 h-4" />),
  terminalNode("terminal.printer-device", "Printer Device", "Printer bridge status and print command target", "Device Nodes", <Printer className="w-4 h-4" />),
  terminalNode("terminal.ble-device", "BLE Device", "BLE / GATT device node", "Device Nodes", <Bluetooth className="w-4 h-4" />),
  terminalNode("terminal.usb-hid-device", "USB HID Device", "USB HID bridge device node", "Device Nodes", <Usb className="w-4 h-4" />),
  terminalNode("terminal.iot-device", "IoT Device", "MQTT / IoT device command target", "Device Nodes", <Wifi className="w-4 h-4" />),
  terminalNode("terminal.robot-device", "Robot Device", "Robotics / micro-ROS governed command target", "Device Nodes", <Cpu className="w-4 h-4" />),
  terminalNode("terminal.camera-device", "Camera Device", "Camera device bridge target", "Device Nodes", <Camera className="w-4 h-4" />),
  terminalNode("terminal.audio-device", "Audio Device", "Audio device bridge target", "Device Nodes", <Volume2 className="w-4 h-4" />),
  terminalNode("terminal.phone-device", "Phone Device", "Phone or mobile bridge target", "Device Nodes", <Smartphone className="w-4 h-4" />),
  terminalNode("terminal.tv-device", "TV Device", "Smart TV / display bridge target", "Device Nodes", <Monitor className="w-4 h-4" />),

  terminalNode("terminal.global-command", "Global Command", "Natural-language command intent that creates a plan first", "Command Nodes", <Zap className="w-4 h-4" />, 520, 360),
  terminalNode("terminal.command-plan", "Command Plan", "Risk-classified command plan with approval and rollback fields", "Command Nodes", <ClipboardList className="w-4 h-4" />, 560, 420),
  terminalNode("terminal.command-queue", "Command Queue", "Pending command queue from Runtime Fabric", "Command Nodes", <Layers className="w-4 h-4" />),
  terminalNode("terminal.broadcast-command", "Broadcast Command", "Tag-group broadcast command plan surface", "Command Nodes", <Share2 className="w-4 h-4" />),
  terminalNode("terminal.scheduled-command", "Scheduled Command", "Scheduled command plan node", "Command Nodes", <Calendar className="w-4 h-4" />),
  terminalNode("terminal.conditional-command", "Conditional Command", "Condition-gated command plan node", "Command Nodes", <Activity className="w-4 h-4" />),
  terminalNode("terminal.command-receipt", "Command Receipt", "Displays real command receipts only", "Command Nodes", <FileText className="w-4 h-4" />, 520, 360),
  terminalNode("terminal.rollback-command", "Rollback Command", "Rollback plan and recovery command surface", "Command Nodes", <RefreshCw className="w-4 h-4" />),

  terminalNode("terminal.heartbeat-monitor", "Heartbeat Monitor", "Session and bridge heartbeat monitor", "Monitor Nodes", <Activity className="w-4 h-4" />),
  terminalNode("terminal.log-stream", "Log Stream", "Runtime log stream monitor", "Monitor Nodes", <Terminal className="w-4 h-4" />),
  terminalNode("terminal.bus-monitor", "Bus Monitor", "USB / device bus monitor", "Monitor Nodes", <Usb className="w-4 h-4" />),
  terminalNode("terminal.serial-monitor", "Serial Monitor", "Serial console output monitor", "Monitor Nodes", <Terminal className="w-4 h-4" />),
  terminalNode("terminal.ble-gatt-monitor", "BLE GATT Monitor", "BLE service and characteristic monitor", "Monitor Nodes", <Bluetooth className="w-4 h-4" />),
  terminalNode("terminal.network-monitor", "Network Monitor", "LAN / mDNS / runtime network monitor", "Monitor Nodes", <Wifi className="w-4 h-4" />),
  terminalNode("terminal.printer-queue-monitor", "Printer Queue Monitor", "Printer queue and job receipt monitor", "Monitor Nodes", <Printer className="w-4 h-4" />),
  terminalNode("terminal.adb-device-monitor", "ADB Device Monitor", "ADB device and shell monitor", "Monitor Nodes", <Smartphone className="w-4 h-4" />),
  terminalNode("terminal.runtime-health-monitor", "Runtime Health Monitor", "Runtime Fabric health and blocker monitor", "Monitor Nodes", <Cpu className="w-4 h-4" />),

  terminalNode("terminal.approval-gate", "Approval Gate", "Medium/high-risk approval gate node", "Governance Nodes", <CheckCircle className="w-4 h-4" />),
  terminalNode("terminal.risk-classifier", "Risk Classifier", "Low/medium/high/blocked risk classifier node", "Governance Nodes", <BarChart className="w-4 h-4" />),
  terminalNode("terminal.policy-check", "Policy Check", "Sentinel/Governor command policy check node", "Governance Nodes", <Settings className="w-4 h-4" />),
  terminalNode("terminal.receipt-validator", "Receipt Validator", "Verifies command receipt existence before success claims", "Governance Nodes", <FileText className="w-4 h-4" />),
  terminalNode("terminal.sentinel-review", "Sentinel Review", "Human/policy review surface for risky commands", "Governance Nodes", <Eye className="w-4 h-4" />),
  terminalNode("terminal.rollback-plan", "Rollback Plan", "Rollback requirements and recovery plan node", "Governance Nodes", <RefreshCw className="w-4 h-4" />),
];

/**
 * KNOWLEDGE STUDIO NODES
 */
const knowledgeStudioNodes: NodeDefinition[] = [
  {
    type: "knowledge.skills",
    title: "System Skills",
    description: "Available AI capabilities",
    icon: <Zap className="w-4 h-4" />,
    category: "Skills",
    defaultWidth: 400,
    defaultHeight: 450,
    minWidth: 350,
    minHeight: 350
  },
  {
    type: "knowledge.providers",
    title: "Service Providers",
    description: "Connected AI and API services",
    icon: <Database className="w-4 h-4" />,
    category: "Providers",
    defaultWidth: 400,
    defaultHeight: 400,
    minWidth: 350,
    minHeight: 300
  },
  {
    type: "knowledge.receipts",
    title: "Usage Receipts",
    description: "API usage and billing history",
    icon: <FileText className="w-4 h-4" />,
    category: "Billing",
    defaultWidth: 500,
    defaultHeight: 400,
    minWidth: 400,
    minHeight: 300
  }
];

/**
 * SETTINGS STUDIO NODES
 */
const settingsStudioNodes: NodeDefinition[] = [
  {
    type: "settings.agent-lee",
    title: "Agent Lee Settings",
    description: "Complete Agent Lee configuration with voice, MCP, agents, workers, and plugins",
    icon: <Settings className="w-4 h-4" />,
    category: "Agent",
    defaultWidth: 900,
    defaultHeight: 600,
    minWidth: 700,
    minHeight: 500
  },
  {
    type: "settings.runtime",
    title: "Runtime Configuration",
    description: "Configure Runtime Fabric endpoints",
    icon: <Settings className="w-4 h-4" />,
    category: "Runtime",
    defaultWidth: 450,
    defaultHeight: 400,
    minWidth: 400,
    minHeight: 350
  },
  {
    type: "settings.permissions",
    title: "Permissions",
    description: "Manage app permissions",
    icon: <Settings className="w-4 h-4" />,
    category: "Security",
    defaultWidth: 400,
    defaultHeight: 350,
    minWidth: 350,
    minHeight: 300
  },
  {
    type: "settings.providers",
    title: "Provider Settings",
    description: "Configure external services",
    icon: <Database className="w-4 h-4" />,
    category: "Integration",
    defaultWidth: 450,
    defaultHeight: 400,
    minWidth: 400,
    minHeight: 350
  }
];

/**
 * PUBLISH STUDIO NODES
 */
const publishStudioNodes: NodeDefinition[] = [
  {
    type: "publish.social-posts",
    title: "Social Media Posts",
    description: "Create and schedule social content",
    icon: <Share2 className="w-4 h-4" />,
    category: "Social",
    defaultWidth: 450,
    defaultHeight: 400,
    minWidth: 400,
    minHeight: 350
  },
  {
    type: "publish.calendar",
    title: "Publishing Calendar",
    description: "Schedule content releases",
    icon: <Calendar className="w-4 h-4" />,
    category: "Planning",
    defaultWidth: 600,
    defaultHeight: 400,
    minWidth: 500,
    minHeight: 350
  },
  {
    type: "publish.analytics",
    title: "Analytics Dashboard",
    description: "Track engagement and performance",
    icon: <BarChart className="w-4 h-4" />,
    category: "Analytics",
    defaultWidth: 550,
    defaultHeight: 400,
    minWidth: 500,
    minHeight: 350
  },
  {
    type: "publish.channels",
    title: "Publishing Channels",
    description: "Connect YouTube, Twitter, etc.",
    icon: <Rocket className="w-4 h-4" />,
    category: "Channels",
    defaultWidth: 400,
    defaultHeight: 450,
    minWidth: 350,
    minHeight: 350
  }
];

/**
 * STUDIO PALETTES
 * Export all studio palettes for use in the IDE
 */
export const studioPalettes: StudioPalette[] = [
  {
    studioId: "code",
    studioName: "Code",
    nodes: codeStudioNodes
  },
  {
    studioId: "writer",
    studioName: "Writer",
    nodes: writerStudioNodes
  },
  {
    studioId: "audio",
    studioName: "Audio",
    nodes: audioStudioNodes
  },
  {
    studioId: "vision",
    studioName: "Vision",
    nodes: visionStudioNodes
  },
  {
    studioId: "devices",
    studioName: "Devices",
    nodes: devicesStudioNodes
  },
  {
    studioId: "video",
    studioName: "Video",
    nodes: videoStudioNodes
  },
  {
    studioId: "xr",
    studioName: "XR / Spatial",
    nodes: xrStudioNodes
  },
  {
    studioId: "terminal",
    studioName: "Terminal Fabric",
    nodes: terminalFabricNodes
  },
  {
    studioId: "knowledge",
    studioName: "Knowledge",
    nodes: knowledgeStudioNodes
  },
  {
    studioId: "settings",
    studioName: "Settings",
    nodes: settingsStudioNodes
  },
  {
    studioId: "forge",
    studioName: "Deploy / Foundry",
    nodes: [
      ...foundryNodeDefinitions,
      ...publishStudioNodes
    ]
  }
];

/**
 * Helper function to get palette for a specific studio
 */
export function getStudioPalette(studioId: string): StudioPalette | undefined {
  return studioPalettes.find(p => p.studioId === studioId);
}

// Leeway Standards: governed module
