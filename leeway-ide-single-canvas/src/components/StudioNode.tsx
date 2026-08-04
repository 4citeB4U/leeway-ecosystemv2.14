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
import { motion } from "framer-motion";
import { X, ChevronUp, ChevronDown } from "lucide-react";

/**
 * StudioNode defines a draggable, collapsible container used to represent
 * individual units of work inside the LeeWay IDE. Each node is
 * absolutely positioned on the studio canvas and exposes a small
 * header with a title and controls for collapsing or closing the node.
 * When collapsed the node contents are hidden, allowing users to
 * declutter their canvas. The drag handle and controls live in the
 * header; dragging anywhere on the node will move it around the
 * canvas. Consumers may supply an onClose callback to remove the
 * node from a list of active nodes when closed.
 */
export interface StudioNodeProps {
  /**
   * A unique identifier for the node. Passed back to onClose when
   * the user closes the node.
   */
  id: string;
  /**
   * Title displayed in the node header. Use short, descriptive labels
   * like "Files", "Editor", "Preview", etc.
   */
  title: string;
  /**
   * Initial horizontal position of the node on the canvas. Defaults
   * to 50px.
   */
  initialX?: number;
  /**
   * Initial vertical position of the node on the canvas. Defaults
   * to 50px.
   */
  initialY?: number;
  /**
   * Children rendered inside the node. When the node is collapsed
   * this content is hidden.
   */
  children: React.ReactNode;
  /**
   * Optional callback invoked when the user clicks the close button.
   * Receives the node id as its sole parameter.
   */
  onClose?: (id: string) => void;
}

export function StudioNode({ id, title, initialX = 50, initialY = 50, children, onClose }: StudioNodeProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [pos, setPos] = useState({ x: initialX, y: initialY });

  return (
    <motion.div
      drag
      dragMomentum={false}
      initial={{ x: pos.x, y: pos.y }}
      animate={{ x: pos.x, y: pos.y }}
      onDragEnd={(e, info) => {
        // Update position state on drag end. Only x and y from the
        // end point are used; we avoid setting width/height because
        // those are controlled by CSS. The info.point values are
        // relative to the viewport, so we assign directly.
        setPos({ x: info.point.x, y: info.point.y });
      }}
      className="absolute border border-[#30363d] rounded-xl shadow-lg bg-[#0f141c]/90 backdrop-blur-md pointer-events-auto"
      style={{ resize: 'both', overflow: 'auto' }}
    >
      {/* Header with title and controls */}
      <div className="flex items-center justify-between px-3 py-2 bg-[#0d1117]/90 cursor-move select-none">
        <span className="text-[10px] uppercase font-bold text-[#c9d1d9] truncate">{title}</span>
        <span className="flex items-center space-x-1">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1 rounded hover:bg-white/10 flex items-center justify-center"
            aria-label={collapsed ? "Expand" : "Collapse"}
          >
            {collapsed ? (
              <ChevronDown className="w-3.5 h-3.5 text-[#c9d1d9]" />
            ) : (
              <ChevronUp className="w-3.5 h-3.5 text-[#c9d1d9]" />
            )}
          </button>
          {onClose && (
            <button
              onClick={() => onClose(id)}
              className="p-1 rounded hover:bg-red-500/70 flex items-center justify-center"
              aria-label="Close"
            >
              <X className="w-3.5 h-3.5 text-[#c9d1d9]" />
            </button>
          )}
        </span>
      </div>
      {!collapsed && (
        <div className="p-3 overflow-auto max-h-[70vh] text-[#c9d1d9] custom-scrollbar">
          {children}
        </div>
      )}
    </motion.div>
  );
}