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
 * Neural Connection Layer - Animated connections between drives, slots, and cells
 */

import React, { useMemo } from 'react';
import { DriveId } from '../utils/neuralDB';
import { DRIVE_COLORS, DRIVE_METADATA, LayoutNode } from '../utils/neuralConstants';

interface NeuralConnectionLayerProps {
  nodes: LayoutNode[];
  w: number;
  h: number;
  activeDrive: DriveId;
  activeSlot: number | null;
  activeCell: number | null;
}

export const NeuralConnectionLayer: React.FC<NeuralConnectionLayerProps> = React.memo(({
  nodes,
  w,
  h,
  activeDrive,
  activeSlot,
  activeCell
}) => {
  const driveColor = DRIVE_COLORS[activeDrive];
  const paths: React.ReactNode[] = [];

  const nodeMap = useMemo(() => {
    const map = new Map<string, LayoutNode>();
    nodes.forEach(n => map.set(n.id, n));
    return map;
  }, [nodes]);

  const driveNode = nodeMap.get(`drive_${activeDrive}`);
  
  // Drive to Slots connections
  if (driveNode) {
    for (let i = 1; i <= 8; i++) {
      const slotId = `slot_${activeDrive}-${i}`;
      const slot = nodeMap.get(slotId);
      if (!slot) continue;

      const start = { x: driveNode.x + driveNode.w / 2, y: driveNode.y + driveNode.h };
      const end = { x: slot.x + slot.w / 2, y: slot.y };
      const midY = start.y + (end.y - start.y) * 0.5;
      const d = `M ${start.x} ${start.y} L ${start.x} ${midY} L ${end.x} ${midY} L ${end.x} ${end.y}`;

      const isActive = activeSlot === i;
      
      // Base path
      paths.push(
        <path
          key={`d-s-${slotId}`}
          d={d}
          stroke={driveColor}
          strokeWidth={isActive ? 1.5 : 0.5}
          fill="none"
          opacity={isActive ? 0.6 : 0.05}
          strokeLinejoin="round"
        />
      );

      // Animated path for active connections
      if (isActive) {
        paths.push(
          <path
            key={`d-s-anim-${slotId}`}
            d={d}
            stroke={driveColor}
            strokeWidth={2}
            fill="none"
            className="animate-flow"
            strokeDasharray="4 12"
            strokeLinecap="round"
            filter="url(#glow)"
          />
        );

        // Moving particles
        paths.push(
          <circle key={`d-s-bead-a-${slotId}`} cx={0} cy={0} r="3" fill="#ffffff" filter="url(#glow)">
            <animateMotion dur="2.4s" repeatCount="indefinite" path={d} />
          </circle>
        );
        paths.push(
          <circle key={`d-s-bead-b-${slotId}`} cx={0} cy={0} r="2" fill={driveColor} opacity="0.8" filter="url(#glow)">
            <animateMotion dur="2.4s" repeatCount="indefinite" path={d} begin="0.8s" />
          </circle>
        );

        // Pulse at endpoint
        paths.push(
          <circle key={`pulse-s-${slotId}`} cx={end.x} cy={end.y} r="2" fill={driveColor} opacity="0.8">
            <animate attributeName="r" values="2;9" dur="1.8s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.8;0" dur="1.8s" repeatCount="indefinite" />
          </circle>
        );
      }
    }
  }

  // Slot to Cells connections
  if (activeSlot && driveNode) {
    const slotNode = nodeMap.get(`slot_${activeDrive}-${activeSlot}`);
    if (slotNode) {
      for (let i = 1; i <= 8; i++) {
        const cellId = `cell_${activeDrive}-${activeSlot}-${i}`;
        const cell = nodeMap.get(cellId);
        if (!cell) continue;

        const start = { x: slotNode.x + slotNode.w / 2, y: slotNode.y + slotNode.h };
        const end = { x: cell.x + cell.w / 2, y: cell.y };
        const midY = start.y + (end.y - start.y) * 0.5;
        const d = `M ${start.x} ${start.y} L ${start.x} ${midY} L ${end.x} ${midY} L ${end.x} ${end.y}`;

        const isActive = activeCell === i;

        // Base path
        paths.push(
          <path
            key={`s-c-${cellId}`}
            d={d}
            stroke={driveColor}
            strokeWidth={isActive ? 1.5 : 0.5}
            fill="none"
            opacity={isActive ? 0.6 : 0.05}
            strokeLinejoin="round"
          />
        );

        // Animated path for active connections
        if (isActive) {
          paths.push(
            <path
              key={`s-c-anim-${cellId}`}
              d={d}
              stroke={driveColor}
              strokeWidth={2}
              fill="none"
              className="animate-flow"
              strokeDasharray="4 12"
              strokeLinecap="round"
              filter="url(#glow)"
            />
          );

          // Moving particles
          paths.push(
            <circle key={`s-c-bead-a-${cellId}`} cx={0} cy={0} r="3" fill="#ffffff" filter="url(#glow)">
              <animateMotion dur="2.1s" repeatCount="indefinite" path={d} />
            </circle>
          );
          paths.push(
            <circle key={`s-c-bead-b-${cellId}`} cx={0} cy={0} r="2" fill={driveColor} opacity="0.8" filter="url(#glow)">
              <animateMotion dur="2.1s" repeatCount="indefinite" path={d} begin="0.7s" />
            </circle>
          );

          // Pulse at endpoint
          paths.push(
            <circle key={`pulse-c-${cellId}`} cx={end.x} cy={end.y} r="2" fill={driveColor} opacity="0.8">
              <animate attributeName="r" values="2;9" dur="1.8s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.8;0" dur="1.8s" repeatCount="indefinite" />
            </circle>
          );
        }
      }
    }
  }

  return (
    <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
      <svg width={w} height={h} className="absolute inset-0 overflow-visible">
        <defs>
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {paths}
      </svg>
      {/* Drive icons */}
      {nodes.map(node => {
        if (node.type === 'drive') {
          const driveId = node.id.replace('drive_', '') as DriveId;
          const meta = DRIVE_METADATA[driveId];
          const Icon = meta.icon;
          return (
            <div
              key={node.id}
              className="absolute"
              style={{ left: node.x + node.w / 2 - 6, top: node.y - 20 }}
            >
              <Icon size={12} style={{ color: node.color }} className="opacity-40" />
            </div>
          );
        }
        return null;
      })}
      <style>{`
        .animate-flow {
          animation: dash 1s linear infinite;
        }
        @keyframes dash {
          to {
            stroke-dashoffset: -16;
          }
        }
      `}</style>
    </div>
  );
});

NeuralConnectionLayer.displayName = 'NeuralConnectionLayer';

// Leeway Standards: governed module
