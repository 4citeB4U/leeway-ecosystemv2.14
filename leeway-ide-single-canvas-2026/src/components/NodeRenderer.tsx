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
 */

import React from "react";
import { NodeInstance, LeewayCanvasSettings } from "../types/nodeTypes";
import { FileExplorer } from "./FileExplorer";
import { CodeEditor } from "./CodeEditor";
import { ConsolePanel } from "./ConsolePanel";
import { LivePreview } from "./LivePreview";
import { CameraFeed } from "./CameraFeed";
import { SettingsNodeContent } from "./SettingsNodeContent";
import { FoundryNodeInspector } from "./FoundryNodeInspector";
import { isFoundryNode } from "../data/foundryNodeCatalog";
import { TerminalFabricNodeContent } from "./TerminalFabricNodeContent";
import { OmniTerminalSnapshot } from "../services/omniTerminalFabric";

/**
 * NodeRenderer maps node types to their corresponding content components.
 * This is the central registry that determines what gets rendered inside each node.
 */
interface NodeRendererProps {
  node: NodeInstance;
  onUpdate?: (id: string, updates: Partial<NodeInstance>) => void;
  canvasSettings?: LeewayCanvasSettings;
  onCanvasSettingsChange?: (settings: LeewayCanvasSettings) => void;
  runtimeSnapshot?: OmniTerminalSnapshot;
}

export function NodeRenderer({ node, onUpdate, canvasSettings, onCanvasSettingsChange, runtimeSnapshot }: NodeRendererProps) {
  if (isFoundryNode(node)) {
    return <FoundryNodeInspector node={node} onUpdate={onUpdate} />;
  }
  if (node.type.startsWith("terminal.")) {
    return <TerminalFabricNodeContent node={node} onUpdate={onUpdate} runtimeSnapshot={runtimeSnapshot} />;
  }
  switch (node.type) {
    // SETTINGS STUDIO NODES
    case "settings.agent-lee":
      return <SettingsNodeContent data={node.data} canvasSettings={canvasSettings} onCanvasSettingsChange={onCanvasSettingsChange} runtimeSnapshot={runtimeSnapshot} />;
    
    // CODE STUDIO NODES
    case "code.file-tree":
      return (
        <div className="p-3 space-y-2">
          <p className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Project Files</p>
          <div className="space-y-1 text-xs">
            <div className="font-bold text-white">src/</div>
            <div className="pl-3 space-y-1 text-gray-400">
              <div className="hover:text-white cursor-pointer">App.tsx</div>
              <div className="hover:text-white cursor-pointer">main.tsx</div>
              <div className="hover:text-white cursor-pointer">types.ts</div>
            </div>
          </div>
        </div>
      );
    
    case "code.editor": {
      const editorContent = node.data?.content || `import React from 'react';

export default function App() {
  return <div>Hello World</div>;
}`;
      return (
        <div className="p-3 space-y-2">
          <pre className="max-h-80 overflow-auto rounded-lg border border-[#30363d] bg-[#0d1117] p-3 font-mono text-xs leading-5 text-[#c9d1d9] custom-scrollbar">
            {editorContent}
          </pre>
        </div>
      );
    }
    
    case "code.console":
      return (
        <div className="p-3 space-y-1 font-mono text-[9px]">
          <div className="text-amber-400">[INFO] COMMAND_PLAN_REQUIRED</div>
          <div className="text-gray-400">[INFO] Browser node console does not execute shell commands.</div>
          <div className="text-gray-400">[INFO] Use Terminal Fabric for Runtime Fabric command planning.</div>
          <div className="text-amber-400">[INFO] COMMAND_RECEIPT_REQUIRED before success claims.</div>
        </div>
      );
    
    case "code.live-preview":
      return <LivePreview />;
    
    case "code.page-node":
      return (
        <div className="p-4 text-center">
          <div className="w-full h-48 bg-[#0d1117] border border-[#30363d] rounded-lg flex items-center justify-center">
            <span className="text-gray-500 text-xs">Page Preview</span>
          </div>
          <p className="text-xs text-gray-400 mt-2">{node.data?.pageName || "Untitled Page"}</p>
        </div>
      );
    
    case "code.automation-trigger":
      return (
        <div className="p-3">
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
            <p className="text-xs font-bold text-amber-400 uppercase mb-1">Trigger</p>
            <p className="text-xs text-gray-300">{node.data?.label || "New Trigger"}</p>
            <p className="text-[10px] text-gray-500 mt-1">{node.data?.description || "Configure trigger conditions"}</p>
          </div>
        </div>
      );
    
    case "code.automation-action":
      return (
        <div className="p-3">
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
            <p className="text-xs font-bold text-blue-400 uppercase mb-1">Action</p>
            <p className="text-xs text-gray-300">{node.data?.label || "New Action"}</p>
            <p className="text-[10px] text-gray-500 mt-1">{node.data?.description || "Configure action parameters"}</p>
          </div>
        </div>
      );

    // WRITER STUDIO NODES
    case "writer.outline":
      return (
        <div className="p-3 space-y-2">
          <p className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Book Structure</p>
          <div className="space-y-1 text-xs">
            <div className="font-bold text-white">The Future, Written</div>
            <div className="pl-3 space-y-1 text-gray-400">
              <div className="hover:text-white cursor-pointer">1. Awakening</div>
              <div className="hover:text-white cursor-pointer">2. The Signal</div>
              <div className="hover:text-white cursor-pointer">3. The Network</div>
            </div>
          </div>
        </div>
      );

    case "writer.chapter-timeline":
      return (
        <div className="p-3">
          <div className="flex items-center space-x-2 overflow-x-auto">
            {["Awakening", "The Signal", "The Network", "The Choice"].map((chapter, i) => (
              <div key={i} className="bg-[#0d1117] border border-[#30363d] px-3 py-2 rounded-lg shrink-0 text-center">
                <span className="text-[8px] text-gray-500 block">Chapter {i + 1}</span>
                <span className="text-[10px] text-white font-bold block">{chapter}</span>
              </div>
            ))}
          </div>
        </div>
      );

    case "writer.editor":
      return (
        <div className="p-3 space-y-2">
          <textarea
            className="w-full h-full bg-[#0d1117] border border-[#30363d] rounded-lg p-3 text-sm text-white resize-none focus:outline-none focus:border-blue-500"
            placeholder="Start writing..."
            defaultValue={node.data?.content || ""}
          />
        </div>
      );

    case "writer.research":
      return (
        <div className="p-3 space-y-2">
          <p className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Research Sources</p>
          <div className="space-y-1.5">
            {["The Signal and the Noise", "Neuromorphic Computing", "The Future of Interfaces"].map((source, i) => (
              <div key={i} className="bg-[#0d1117] border border-[#30363d] p-2 rounded-lg">
                <p className="text-xs text-white font-bold truncate">{source}</p>
                <p className="text-[9px] text-gray-500">Research Paper</p>
              </div>
            ))}
          </div>
        </div>
      );

    // VISION STUDIO NODES
    case "vision.camera-feed":
      return <CameraFeed showMesh={true} meshMode="Object Detection" />;

    case "vision.object-detection":
      return (
        <div className="p-3 space-y-2">
          <p className="text-xs font-bold text-amber-400">VISION_RUNTIME_REQUIRED</p>
          <div className="bg-[#0d1117] border border-[#30363d] rounded-lg p-2">
            <p className="text-[10px] text-gray-400">Detected: no runtime-backed inference receipt</p>
            <p className="text-[10px] text-gray-400">Status: COMMAND_RECEIPT_REQUIRED</p>
          </div>
        </div>
      );

    case "vision.pipeline":
      return (
        <div className="p-3">
          <div className="flex items-center justify-between text-[8px]">
            <div className="bg-[#0d1117] border border-blue-500/30 px-2 py-1 rounded">Capture</div>
            <span className="text-gray-600">→</span>
            <div className="bg-[#0d1117] border border-blue-500 px-2 py-1 rounded">Detect</div>
            <span className="text-gray-600">→</span>
            <div className="bg-[#0d1117] border border-[#30363d] px-2 py-1 rounded">Process</div>
          </div>
        </div>
      );

    case "vision.logs":
      return (
        <div className="p-3 space-y-1 font-mono text-[9px]">
          <div className="text-amber-400">[INFO] VISION_RUNTIME_REQUIRED</div>
          <div className="text-gray-400">[INFO] No camera, object detection, OCR, or pose result is displayed without a Runtime Fabric receipt.</div>
          <div className="text-amber-400">[INFO] COMMAND_RECEIPT_REQUIRED</div>
        </div>
      );

    // DEVICES STUDIO NODES
    case "devices.device-card":
      return (
        <div className="p-3">
          <div className="bg-[#0d1117] border border-[#30363d] rounded-lg p-3">
            <p className="text-xs font-bold text-white">{node.data?.deviceName || "Device"}</p>
            <p className="text-[10px] text-gray-500 mt-1">{node.data?.deviceType || "Runtime-backed device required"}</p>
            <div className="mt-2 flex items-center space-x-1">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              <span className="text-[9px] text-amber-400">{runtimeSnapshot?.localBridgeStatus ?? "LOCAL_DEVICE_BRIDGE_REQUIRED"}</span>
            </div>
          </div>
        </div>
      );

    // AUDIO STUDIO NODES
    case "audio.waveform":
      return (
        <div className="p-3">
          <div className="h-24 bg-[#0d1117] border border-[#30363d] rounded-lg flex flex-col items-center justify-center gap-2">
            <span className="text-[10px] font-bold text-amber-400">AUDIO_RUNTIME_REQUIRED</span>
            <span className="text-[9px] text-gray-500">No waveform without live audio capture receipt.</span>
          </div>
        </div>
      );

    case "audio.voice-clone":
      return (
        <div className="p-3 space-y-3">
          <p className="text-xs font-bold text-purple-400">Voice Clone Studio</p>
          <div className="space-y-2">
            <div className="bg-[#0d1117] border border-[#30363d] rounded-lg p-2">
              <p className="text-[10px] text-white font-bold">RUNTIME_BACKEND_STATUS_REQUIRED</p>
              <p className="text-[9px] text-gray-500">Voice clone output requires provider status and command receipt.</p>
            </div>
            <button className="w-full py-1.5 bg-purple-500/20 border border-purple-500/30 text-purple-300 rounded-lg text-[10px] font-bold">
              COMMAND_PLAN_REQUIRED
            </button>
          </div>
        </div>
      );

    // VIDEO STUDIO NODES
    case "video.storyboard":
      return (
        <div className="p-3">
          <div className="grid grid-cols-2 gap-2">
            {["Scene 1", "Scene 2", "Scene 3", "Scene 4"].map((scene, i) => (
              <div key={i} className="bg-[#0d1117] border border-[#30363d] rounded-lg p-2 aspect-video flex items-center justify-center">
                <span className="text-[9px] text-gray-500">{scene}</span>
              </div>
            ))}
          </div>
        </div>
      );

    case "video.preview":
      return (
        <div className="p-3">
          <div className="bg-black rounded-lg aspect-video flex items-center justify-center">
            <span className="text-gray-600 text-xs">Video Preview</span>
          </div>
          <div className="mt-2 flex items-center justify-center space-x-2">
            <button className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
              <span className="text-white text-xs">▶</span>
            </button>
          </div>
        </div>
      );

    // XR STUDIO NODES
    case "xr.viewport":
      return (
        <div className="p-3">
          <div className="bg-[#0d1117] border border-[#30363d] rounded-lg aspect-video flex items-center justify-center">
            <span className="text-gray-500 text-xs">3D Viewport</span>
          </div>
        </div>
      );

    case "xr.scene-graph":
      return (
        <div className="p-3 space-y-1 text-xs">
          <div className="font-bold text-white">Scene</div>
          <div className="pl-3 space-y-1 text-gray-400">
            <div>└ Terrain</div>
            <div>└ Building</div>
            <div className="pl-3">└ Interior</div>
            <div>└ Lighting</div>
          </div>
        </div>
      );

    // CONTENT STUDIO NODES (from Neural Monolith)
    case "content.text":
    case "content.document":
      return (
        <div className="p-3 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Document</p>
            <span className="text-[9px] text-gray-600">{node.data?.fileSize || "0 KB"}</span>
          </div>
          <div className="bg-[#0d1117] border border-[#30363d] rounded-lg p-3 max-h-48 overflow-y-auto">
            <p className="text-xs text-gray-300 whitespace-pre-wrap font-mono">
              {node.data?.content || node.data?.preview || "Empty document"}
            </p>
          </div>
          <div className="flex items-center justify-between text-[9px] text-gray-500">
            <span>Modified: {node.data?.modified ? new Date(node.data.modified).toLocaleDateString() : "Unknown"}</span>
            <span>{node.data?.category || "text"}</span>
          </div>
        </div>
      );

    case "content.code":
      return (
        <div className="p-3 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-[10px] uppercase font-bold text-purple-500 tracking-wider">Code File</p>
            <span className="text-[9px] text-gray-600">{node.data?.language || "plaintext"}</span>
          </div>
          <div className="bg-[#0d1117] border border-[#30363d] rounded-lg p-3 max-h-48 overflow-y-auto font-mono text-[10px]">
            <pre className="text-gray-300 whitespace-pre-wrap">
              {node.data?.content || node.data?.preview || "// Empty file"}
            </pre>
          </div>
          <div className="flex items-center justify-between text-[9px] text-gray-500">
            <span>{node.data?.fileSize || "0 KB"}</span>
            <span>Lines: {node.data?.lines || 0}</span>
          </div>
        </div>
      );

    case "content.image":
      return (
        <div className="p-3 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-[10px] uppercase font-bold text-blue-500 tracking-wider">Image</p>
            <span className="text-[9px] text-gray-600">{node.data?.dimensions || "Unknown"}</span>
          </div>
          <div className="bg-[#0d1117] border border-[#30363d] rounded-lg overflow-hidden">
            {node.data?.url || node.data?.preview ? (
              <img
                src={node.data?.url || node.data?.preview}
                alt={node.data?.name || "Image"}
                className="w-full h-auto max-h-64 object-contain"
              />
            ) : (
              <div className="w-full h-48 flex items-center justify-center">
                <span className="text-gray-600 text-xs">No preview available</span>
              </div>
            )}
          </div>
          <div className="flex items-center justify-between text-[9px] text-gray-500">
            <span>{node.data?.fileSize || "0 KB"}</span>
            <span>{node.data?.format || "image"}</span>
          </div>
        </div>
      );

    case "content.audio":
      return (
        <div className="p-3 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-[10px] uppercase font-bold text-purple-500 tracking-wider">Audio</p>
            <span className="text-[9px] text-gray-600">{node.data?.duration || "0:00"}</span>
          </div>
          <div className="bg-[#0d1117] border border-[#30363d] rounded-lg p-3">
            {node.data?.url ? (
              <audio controls className="w-full">
                <source src={node.data.url} type={node.data?.mimeType || "audio/mpeg"} />
                Your browser does not support audio playback.
              </audio>
            ) : (
              <div className="h-16 flex items-center justify-center">
                <span className="text-gray-600 text-xs">No audio file</span>
              </div>
            )}
          </div>
          <div className="flex items-center justify-between text-[9px] text-gray-500">
            <span>{node.data?.fileSize || "0 KB"}</span>
            <span>{node.data?.format || "audio"}</span>
          </div>
        </div>
      );

    case "content.video":
      return (
        <div className="p-3 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-[10px] uppercase font-bold text-red-500 tracking-wider">Video</p>
            <span className="text-[9px] text-gray-600">{node.data?.duration || "0:00"}</span>
          </div>
          <div className="bg-[#0d1117] border border-[#30363d] rounded-lg overflow-hidden">
            {node.data?.url ? (
              <video controls className="w-full h-auto max-h-64">
                <source src={node.data.url} type={node.data?.mimeType || "video/mp4"} />
                Your browser does not support video playback.
              </video>
            ) : (
              <div className="w-full h-48 flex items-center justify-center">
                <span className="text-gray-600 text-xs">No video file</span>
              </div>
            )}
          </div>
          <div className="flex items-center justify-between text-[9px] text-gray-500">
            <span>{node.data?.fileSize || "0 KB"}</span>
            <span>{node.data?.resolution || "unknown"}</span>
          </div>
        </div>
      );

    case "content.model":
      return (
        <div className="p-3 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-[10px] uppercase font-bold text-cyan-500 tracking-wider">3D Model</p>
            <span className="text-[9px] text-gray-600">{node.data?.format || "unknown"}</span>
          </div>
          <div className="bg-[#0d1117] border border-[#30363d] rounded-lg p-3 h-48 flex items-center justify-center">
            <div className="text-center">
              <div className="text-4xl mb-2">🎲</div>
              <p className="text-xs text-gray-400">{node.data?.name || "3D Model"}</p>
              <p className="text-[9px] text-gray-600 mt-1">
                {node.data?.vertices ? `${node.data.vertices} vertices` : "Model preview"}
              </p>
            </div>
          </div>
          <div className="flex items-center justify-between text-[9px] text-gray-500">
            <span>{node.data?.fileSize || "0 KB"}</span>
            <span>{node.data?.format || "model"}</span>
          </div>
        </div>
      );

    case "content.data":
      return (
        <div className="p-3 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-[10px] uppercase font-bold text-green-500 tracking-wider">Data File</p>
            <span className="text-[9px] text-gray-600">{node.data?.format || "json"}</span>
          </div>
          <div className="bg-[#0d1117] border border-[#30363d] rounded-lg p-3 max-h-48 overflow-y-auto">
            <pre className="text-xs text-gray-300 whitespace-pre-wrap font-mono">
              {node.data?.content || node.data?.preview || "{}"}
            </pre>
          </div>
          <div className="flex items-center justify-between text-[9px] text-gray-500">
            <span>{node.data?.fileSize || "0 KB"}</span>
            <span>{node.data?.records ? `${node.data.records} records` : "data"}</span>
          </div>
        </div>
      );

    // GENERIC FALLBACK
    default:
      return (
        <div className="p-4 text-center">
          <p className="text-xs text-gray-500">Node Type: {node.type}</p>
          <p className="text-[10px] text-gray-600 mt-1">Content component not yet implemented</p>
        </div>
      );
  }
}

// Leeway Standards: node renderer registry
