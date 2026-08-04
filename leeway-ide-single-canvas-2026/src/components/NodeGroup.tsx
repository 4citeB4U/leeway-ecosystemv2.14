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
 * Node grouping functionality
 */

import React from "react";
import { NodeInstance } from "../types/nodeTypes";

export interface NodeGroup {
  id: string;
  name: string;
  color: string;
  nodeIds: string[];
  collapsed: boolean;
}

interface NodeGroupProps {
  group: NodeGroup;
  nodes: NodeInstance[];
  onUpdate: (groupId: string, updates: Partial<NodeGroup>) => void;
  onDelete: (groupId: string) => void;
}

export function NodeGroupComponent({ group, nodes, onUpdate, onDelete }: NodeGroupProps) {
  const groupNodes = nodes.filter(n => group.nodeIds.includes(n.id));
  
  if (groupNodes.length === 0) return null;

  // Calculate bounding box
  const minX = Math.min(...groupNodes.map(n => n.x));
  const minY = Math.min(...groupNodes.map(n => n.y));
  const maxX = Math.max(...groupNodes.map(n => n.x + n.width));
  const maxY = Math.max(...groupNodes.map(n => n.y + n.height));

  const padding = 20;

  return (
    <div
      className="absolute pointer-events-none"
      style={{
        left: `${minX - padding}px`,
        top: `${minY - padding}px`,
        width: `${maxX - minX + padding * 2}px`,
        height: `${maxY - minY + padding * 2}px`,
        border: `2px dashed ${group.color}`,
        borderRadius: "12px",
        backgroundColor: `${group.color}10`,
        zIndex: 0
      }}
    >
      {/* Group label */}
      <div
        className="absolute -top-6 left-0 px-2 py-1 rounded text-xs font-bold pointer-events-auto"
        style={{
          backgroundColor: group.color,
          color: "white"
        }}
      >
        {group.name}
        <button
          onClick={() => onDelete(group.id)}
          className="ml-2 hover:text-red-200"
        >
          ×
        </button>
      </div>
    </div>
  );
}

// Leeway Standards: governed module