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

import React from "react";
import { CanvasWorkspace } from "./CanvasWorkspace";
import { StudioShell } from "./StudioShell";
import { StudioNode } from "./StudioNode";

/**
 * CodeWorkspace provides the dedicated Code studio for the LeeWay IDE.
 * It reuses the existing CanvasWorkspace implementation to render
 * code specific panels (file tree, code editor, terminal, page
 * previews and automation nodes) on top of the unified automation
 * surface. The activeTab prop is ignored because the canvas now
 * represents the code surface exclusively. If additional code
 * specific behaviour is required later it can be added here without
 * modifying CanvasWorkspace directly.
 */
interface CodeWorkspaceProps {
  /**
   * Optional label for the workspace; kept for future use. Defaults to "code".
   */
  activeTab?: string;
  /**
   * A list of open studio nodes to render on the automation canvas. Each
   * entry contains a unique id and a type corresponding to a sidebar tab.
   */
  openNodes: Array<{ id: string; type: string }>;
  /**
   * Callback invoked when a node requests to close itself. The parent
   * (App.tsx) will remove the node from its state so it disappears.
   */
  onCloseNode: (id: string) => void;
}

export function CodeWorkspace({ activeTab = "code", openNodes, onCloseNode }: CodeWorkspaceProps) {
  /**
   * Define simple placeholder components for each studio node type. These
   * placeholders provide a label indicating which studio has been opened.
   * In a full implementation, you would import the corresponding
   * workspace component (e.g. WriterWorkspace) and render it here
   * without its own StudioShell wrapper. Because many of the existing
   * workspaces include StudioShell themselves, they cannot be nested
   * directly. Instead we use these placeholders until real
   * node‑ready components are created.
   */
  const NodeContent: React.FC<{ type: string }> = ({ type }) => {
    switch (type) {
      case "writer":
        return (
          <div className="p-4 text-xs text-gray-400 font-mono">
            <p className="font-bold text-sm text-white">Writer Studio</p>
            <p className="mt-1">Add and edit documents, outlines, and research notes here.</p>
          </div>
        );
      case "vision":
        return (
          <div className="p-4 text-xs text-gray-400 font-mono">
            <p className="font-bold text-sm text-white">Vision Studio</p>
            <p className="mt-1">Live camera, detection and perception tools will appear here.</p>
          </div>
        );
      case "devices":
        return (
          <div className="p-4 text-xs text-gray-400 font-mono">
            <p className="font-bold text-sm text-white">Devices Studio</p>
            <p className="mt-1">Discover and manage nearby devices once runtime connectivity is available.</p>
          </div>
        );
      case "audio":
        return (
          <div className="p-4 text-xs text-gray-400 font-mono">
            <p className="font-bold text-sm text-white">Audio Studio</p>
            <p className="mt-1">Configure voice clones, recordings, and audio workflows here.</p>
          </div>
        );
      case "video":
        return (
          <div className="p-4 text-xs text-gray-400 font-mono">
            <p className="font-bold text-sm text-white">Video Studio</p>
            <p className="mt-1">Generate and edit media assets, compositions, and promos here.</p>
          </div>
        );
      case "xr":
        return (
          <div className="p-4 text-xs text-gray-400 font-mono">
            <p className="font-bold text-sm text-white">XR / Spatial Studio</p>
            <p className="mt-1">3D / AR / VR tools will populate this node when implemented.</p>
          </div>
        );
      case "knowledge":
        return (
          <div className="p-4 text-xs text-gray-400 font-mono">
            <p className="font-bold text-sm text-white">Knowledge Studio</p>
            <p className="mt-1">View LeeWay system skills, providers and receipts.</p>
          </div>
        );
      case "settings":
        return (
          <div className="p-4 text-xs text-gray-400 font-mono">
            <p className="font-bold text-sm text-white">Settings</p>
            <p className="mt-1">Configure runtime endpoints, permissions and providers.</p>
          </div>
        );
      case "forge":
        return (
          <div className="p-4 text-xs text-gray-400 font-mono">
            <p className="font-bold text-sm text-white">Publish Studio</p>
            <p className="mt-1">Plan and schedule posts to social platforms. Connect your YouTube account here.</p>
          </div>
        );
      default:
        return (
          <div className="p-4 text-xs text-gray-400 font-mono">
            <p className="font-bold text-sm text-white">{type} Studio</p>
            <p className="mt-1">This studio is not yet defined.</p>
          </div>
        );
    }
  };

  return (
    <StudioShell>
      {/* Render the primary Code Workspace as a draggable node. */}
      <StudioNode id="code-workspace" title="Code Workspace" initialX={60} initialY={80}>
        <CanvasWorkspace activeTab={activeTab} />
      </StudioNode>

      {/* Render additional studio nodes. They are draggable/collapsible and
          can be closed via the onCloseNode callback. */}
      {openNodes.map(node => (
        <StudioNode
          key={node.id}
          id={node.id}
          title={`${node.type.charAt(0).toUpperCase() + node.type.slice(1)} Studio`}
          initialX={120 + Math.random() * 200}
          initialY={120 + Math.random() * 200}
          onClose={() => onCloseNode(node.id)}
        >
          <NodeContent type={node.type} />
        </StudioNode>
      ))}
    </StudioShell>
  );
}