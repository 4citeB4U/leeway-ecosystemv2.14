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
 * 
 * Pre-defined layout templates for quick setup
 */

import { NodeInstance } from "../types/nodeTypes";

export interface LayoutTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  nodes: Omit<NodeInstance, "id">[];
}

export const LAYOUT_TEMPLATES: LayoutTemplate[] = [
  {
    id: "code-workspace",
    name: "Code Workspace",
    description: "Full-stack development setup with file tree, editor, console, and preview",
    category: "Code",
    nodes: [
      {
        type: "code.file-tree",
        title: "File Explorer",
        x: 20,
        y: 20,
        width: 280,
        height: 600,
        collapsed: false,
        zIndex: 1,
        data: {}
      },
      {
        type: "code.editor",
        title: "Code Editor",
        x: 320,
        y: 20,
        width: 700,
        height: 500,
        collapsed: false,
        zIndex: 1,
        data: {}
      },
      {
        type: "code.console",
        title: "Console",
        x: 320,
        y: 540,
        width: 700,
        height: 250,
        collapsed: false,
        zIndex: 1,
        data: {}
      },
      {
        type: "code.live-preview",
        title: "Live Preview",
        x: 1040,
        y: 20,
        width: 500,
        height: 770,
        collapsed: false,
        zIndex: 1,
        data: {}
      }
    ]
  },
  {
    id: "writer-studio",
    name: "Writer Studio",
    description: "Content creation with outline, editor, research, and AI assistant",
    category: "Writer",
    nodes: [
      {
        type: "writer.outline",
        title: "Chapter Outline",
        x: 20,
        y: 20,
        width: 300,
        height: 600,
        collapsed: false,
        zIndex: 1,
        data: {}
      },
      {
        type: "writer.editor",
        title: "Document Editor",
        x: 340,
        y: 20,
        width: 700,
        height: 600,
        collapsed: false,
        zIndex: 1,
        data: {}
      },
      {
        type: "writer.research",
        title: "Research Panel",
        x: 1060,
        y: 20,
        width: 400,
        height: 400,
        collapsed: false,
        zIndex: 1,
        data: {}
      },
      {
        type: "writer.ai-assistant",
        title: "AI Writing Assistant",
        x: 1060,
        y: 440,
        width: 400,
        height: 350,
        collapsed: false,
        zIndex: 1,
        data: {}
      }
    ]
  },
  {
    id: "audio-production",
    name: "Audio Production",
    description: "Audio editing with timeline, waveform, mixer, and effects",
    category: "Audio",
    nodes: [
      {
        type: "audio.timeline",
        title: "Audio Timeline",
        x: 20,
        y: 20,
        width: 1200,
        height: 300,
        collapsed: false,
        zIndex: 1,
        data: {}
      },
      {
        type: "audio.waveform",
        title: "Waveform Editor",
        x: 20,
        y: 340,
        width: 800,
        height: 400,
        collapsed: false,
        zIndex: 1,
        data: {}
      },
      {
        type: "audio.mixer",
        title: "Audio Mixer",
        x: 840,
        y: 340,
        width: 380,
        height: 400,
        collapsed: false,
        zIndex: 1,
        data: {}
      }
    ]
  },
  {
    id: "vision-ai",
    name: "Vision Runtime Studio",
    description: "Computer vision with camera feed, object detection, and analysis",
    category: "Vision",
    nodes: [
      {
        type: "vision.camera-feed",
        title: "Live Camera Feed",
        x: 20,
        y: 20,
        width: 600,
        height: 450,
        collapsed: false,
        zIndex: 1,
        data: {}
      },
      {
        type: "vision.object-detection",
        title: "Object Detection",
        x: 640,
        y: 20,
        width: 400,
        height: 450,
        collapsed: false,
        zIndex: 1,
        data: {}
      },
      {
        type: "vision.image-analysis",
        title: "Image Analysis",
        x: 20,
        y: 490,
        width: 500,
        height: 350,
        collapsed: false,
        zIndex: 1,
        data: {}
      },
      {
        type: "vision.model-training",
        title: "Model Training",
        x: 540,
        y: 490,
        width: 500,
        height: 350,
        collapsed: false,
        zIndex: 1,
        data: {}
      }
    ]
  },
  {
    id: "device-control",
    name: "Device Control Center",
    description: "IoT device management and monitoring",
    category: "Devices",
    nodes: [
      {
        type: "devices.device-list",
        title: "Connected Devices",
        x: 20,
        y: 20,
        width: 350,
        height: 600,
        collapsed: false,
        zIndex: 1,
        data: {}
      },
      {
        type: "devices.device-monitor",
        title: "Device Monitor",
        x: 390,
        y: 20,
        width: 600,
        height: 400,
        collapsed: false,
        zIndex: 1,
        data: {}
      },
      {
        type: "devices.automation-rules",
        title: "Automation Rules",
        x: 390,
        y: 440,
        width: 600,
        height: 350,
        collapsed: false,
        zIndex: 1,
        data: {}
      }
    ]
  },
  {
    id: "video-editor",
    name: "Video Editor",
    description: "Video editing with timeline, preview, and effects",
    category: "Video",
    nodes: [
      {
        type: "video.timeline",
        title: "Video Timeline",
        x: 20,
        y: 500,
        width: 1400,
        height: 300,
        collapsed: false,
        zIndex: 1,
        data: {}
      },
      {
        type: "video.preview",
        title: "Video Preview",
        x: 20,
        y: 20,
        width: 800,
        height: 460,
        collapsed: false,
        zIndex: 1,
        data: {}
      },
      {
        type: "video.effects",
        title: "Effects Panel",
        x: 840,
        y: 20,
        width: 580,
        height: 460,
        collapsed: false,
        zIndex: 1,
        data: {}
      }
    ]
  },
  {
    id: "xr-world-builder",
    name: "XR World Builder",
    description: "3D world creation with scene graph, viewport, and inspector",
    category: "XR",
    nodes: [
      {
        type: "xr.scene-graph",
        title: "Scene Graph",
        x: 20,
        y: 20,
        width: 300,
        height: 700,
        collapsed: false,
        zIndex: 1,
        data: {}
      },
      {
        type: "xr.viewport-3d",
        title: "3D Viewport",
        x: 340,
        y: 20,
        width: 800,
        height: 700,
        collapsed: false,
        zIndex: 1,
        data: {}
      },
      {
        type: "xr.inspector",
        title: "Object Inspector",
        x: 1160,
        y: 20,
        width: 350,
        height: 700,
        collapsed: false,
        zIndex: 1,
        data: {}
      }
    ]
  },
  {
    id: "minimal",
    name: "Minimal Setup",
    description: "Clean slate with just a few essential nodes",
    category: "General",
    nodes: [
      {
        type: "code.file-tree",
        title: "File Explorer",
        x: 50,
        y: 50,
        width: 280,
        height: 400,
        collapsed: false,
        zIndex: 1,
        data: {}
      },
      {
        type: "code.editor",
        title: "Editor",
        x: 350,
        y: 50,
        width: 600,
        height: 500,
        collapsed: false,
        zIndex: 1,
        data: {}
      }
    ]
  }
];

export function getTemplatesByCategory(category: string): LayoutTemplate[] {
  return LAYOUT_TEMPLATES.filter(t => t.category === category);
}

export function getAllTemplates(): LayoutTemplate[] {
  return LAYOUT_TEMPLATES;
}

export function getTemplateById(id: string): LayoutTemplate | undefined {
  return LAYOUT_TEMPLATES.find(t => t.id === id);
}

// Leeway Standards: governed module