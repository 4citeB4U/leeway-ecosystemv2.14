/**
 * LEEWAY_HEADER - DO NOT REMOVE
 *
 * REGION: UI
 * TAG: UI.CANVAS.NODE_COMPONENT.MAIN
 * DESCRIPTION: Foundry-compatible node component for Leeway IDE canvas - draggable, resizable, collapsible nodes
 * AUTHORITY: LeeWay-Standards
 * DISCOVERY_PIPELINE: Voice -> Intent -> Location -> Vertical -> Ranking -> Render
 *
 * 5WH:
 * WHAT = Node Component - Foundry-compatible draggable node container for Leeway Runtime Fabric
 * WHY = Provide interactive, draggable, resizable node containers that follow Foundry node standards
 * WHO = Leeway Innovations / Agent Lee Enablement
 * WHERE = leeway-ide-single-canvas/src/components/NodeComponent.tsx
 * WHEN = 2026-06-06
 * HOW = React component with drag/resize handlers, connection ports, and Leeway node metadata
 *
 * CHAIN: Standards → Integrated → Runtime → Projections
 * LICENSE: PROPRIETARY
 *
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from "react";
import { X, ChevronUp, ChevronDown, Maximize2, Minimize2, Cpu } from "lucide-react";
import { NodeInstance } from "../types/nodeTypes";
import { getStudioPalette } from "../data/nodeLibrary";

interface NodeComponentProps {
  node: NodeInstance;
  onUpdate: (id: string, updates: Partial<NodeInstance>) => void;
  onClose?: (id: string) => void;
  onSelect?: (id: string) => void;
  isSelected?: boolean;
  zoom?: number;
  onStartConnect?: (nodeId: string) => void;
  onCompleteConnect?: (nodeId: string) => void;
  isPendingConnectionSource?: boolean;
  children: React.ReactNode;
}

export function NodeComponent({
  node,
  onUpdate,
  onClose,
  onSelect,
  isSelected = false,
  zoom = 1,
  onStartConnect,
  onCompleteConnect,
  isPendingConnectionSource = false,
  children
}: NodeComponentProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const nodeRef = useRef<HTMLDivElement>(null);
  const dragStartPos = useRef({ x: 0, y: 0, nodeX: 0, nodeY: 0 });
  const resizeStartPos = useRef({ x: 0, y: 0, width: 0, height: 0 });

  const handleMouseDown = (e: React.MouseEvent) => {
    // Only drag from header, not from interactive elements
    if ((e.target as HTMLElement).closest("button, input, select, textarea")) {
      return;
    }
    
    if ((e.target as HTMLElement).closest(".node-header")) {
      e.preventDefault();
      setIsDragging(true);
      dragStartPos.current = {
        x: e.clientX,
        y: e.clientY,
        nodeX: node.x,
        nodeY: node.y
      };
      onSelect?.(node.id);
    }
  };

  const handleResizeMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    resizeStartPos.current = {
      x: e.clientX,
      y: e.clientY,
      width: node.width,
      height: node.height
    };
    onSelect?.(node.id);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        // Adjust delta by zoom level
        const dx = (e.clientX - dragStartPos.current.x) / zoom;
        const dy = (e.clientY - dragStartPos.current.y) / zoom;
        onUpdate(node.id, {
          x: Math.max(0, dragStartPos.current.nodeX + dx),
          y: Math.max(0, dragStartPos.current.nodeY + dy)
        });
      } else if (isResizing) {
        // Adjust delta by zoom level
        const dx = (e.clientX - resizeStartPos.current.x) / zoom;
        const dy = (e.clientY - resizeStartPos.current.y) / zoom;
        onUpdate(node.id, {
          width: Math.max(200, resizeStartPos.current.width + dx),
          height: Math.max(150, resizeStartPos.current.height + dy)
        });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizing(false);
    };

    if (isDragging || isResizing) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      return () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [isDragging, isResizing, node.id, onUpdate, zoom]);

  const toggleCollapse = () => {
    onUpdate(node.id, { collapsed: !node.collapsed });
  };

  // Get node color from data
  const nodeColor = node.data?.color || "#3b82f6";
  const foundryStatus = node.data?.status as string | undefined;
  const isProgramming = Boolean(node.data?.programming);
  const beastId = node.data?.content?.beastId || node.data?.beastId;
  const foundryCategory = node.data?.category as string | undefined;
  
  // Get icon from node library
  const studio = node.type.split('.')[0];
  const palette = getStudioPalette(studio);
  const nodeDef = palette?.nodes.find(n => n.type === node.type);
  const nodeIcon = nodeDef?.icon;

  // Collapsed state - show as icon only
  if (node.collapsed) {
    return (
      <div
        ref={nodeRef}
        className={`absolute pointer-events-auto transition-all duration-300 cursor-move group ${
          isSelected ? "scale-110" : "hover:scale-105"
        } ${isDragging ? "cursor-grabbing scale-110" : ""}`}
        style={{
          left: `${node.x}px`,
          top: `${node.y}px`,
          zIndex: node.zIndex
        }}
        onMouseDown={handleMouseDown}
        onClick={() => onSelect?.(node.id)}
        onDoubleClick={toggleCollapse}
        title={`${node.title} (Double-click to expand)`}
      >
        {/* Collapsed Icon Container */}
        <div
          className={`relative w-16 h-16 rounded-2xl shadow-2xl backdrop-blur-md flex items-center justify-center transition-all ${
            isSelected
              ? "border-2 border-blue-500 shadow-blue-500/50"
              : "border border-[#30363d] shadow-lg"
          }`}
          style={{
            background: `linear-gradient(135deg, ${nodeColor}20, ${nodeColor}05)`,
          }}
        >
          {/* Glow effect */}
          <div
            className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity"
            style={{
              background: `radial-gradient(circle at center, ${nodeColor}40, transparent 70%)`,
            }}
          />

          {isProgramming && (
            <div className="absolute inset-0 rounded-2xl border-2 animate-pulse" style={{ borderColor: nodeColor }} />
          )}

          {/* Icon */}
          <div className="relative z-10 flex items-center justify-center" style={{ color: nodeColor }}>
            {isProgramming ? <Cpu className="w-8 h-8 animate-spin" /> : (nodeIcon || <Maximize2 className="w-8 h-8" />)}
          </div>

          {/* Input Port (Left) - Smaller for collapsed */}
          <button
            type="button"
            onMouseUp={(event) => { event.stopPropagation(); onCompleteConnect?.(node.id); }}
            onClick={(event) => { event.stopPropagation(); onCompleteConnect?.(node.id); }}
            className="absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-blue-500 border-2 border-[#0f141c] cursor-crosshair hover:scale-150 transition-transform z-20"
            title="Connect input"
          />

          {/* Output Port (Right) - Smaller for collapsed */}
          <button
            type="button"
            onMouseDown={(event) => { event.stopPropagation(); onStartConnect?.(node.id); }}
            onClick={(event) => { event.stopPropagation(); onStartConnect?.(node.id); }}
            className={`absolute right-0 top-1/2 translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full border-2 border-[#0f141c] cursor-crosshair hover:scale-150 transition-transform z-20 ${isPendingConnectionSource ? "bg-yellow-400 animate-pulse" : "bg-green-500"}`}
            title="Start connection"
          />

          {/* Expand button hint */}
          <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <ChevronDown className="w-3 h-3 text-white" />
          </div>
        </div>

        {/* Node title below icon */}
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 px-2 py-0.5 bg-[#0d1117]/90 rounded text-[8px] font-bold text-[#c9d1d9] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
          <div>{node.title}</div>
          {beastId && <div className="font-mono text-[7px] text-gray-500">{beastId}</div>}
        </div>
      </div>
    );
  }

  // Expanded state - show full node
  return (
    <div
      ref={nodeRef}
      className={`absolute border rounded-xl shadow-lg bg-[#0f141c]/95 backdrop-blur-md pointer-events-auto transition-all duration-300 ${
        isSelected ? "border-blue-500 shadow-blue-500/20" : "border-[#30363d]"
      } ${isDragging ? "cursor-grabbing" : ""}`}
      style={{
        left: `${node.x}px`,
        top: `${node.y}px`,
        width: `${node.width}px`,
        height: `${node.height}px`,
        zIndex: node.zIndex,
        borderTopColor: isSelected ? nodeColor : undefined
      }}
      onMouseDown={handleMouseDown}
    >
      {isProgramming && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center rounded-xl bg-black/85 backdrop-blur-sm">
          <div className="mb-2" style={{ color: nodeColor }}>
            <Cpu className="h-7 w-7 animate-spin" />
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white animate-pulse">Writing Logic...</p>
          <div className="mt-3 h-1 w-1/2 overflow-hidden rounded-full bg-white/10">
            <div className="h-full w-1/2 animate-pulse" style={{ backgroundColor: nodeColor }} />
          </div>
        </div>
      )}

      {foundryStatus === "processing" && !isProgramming && (
        <div className="absolute inset-0 -m-1 rounded-xl border-2 pointer-events-none animate-pulse" style={{ borderColor: nodeColor }} />
      )}

      {/* Input Port (Left) */}
      <button
        type="button"
        onMouseUp={(event) => { event.stopPropagation(); onCompleteConnect?.(node.id); }}
        onClick={(event) => { event.stopPropagation(); onCompleteConnect?.(node.id); }}
        className="absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-blue-500 border-2 border-[#0f141c] cursor-crosshair hover:scale-125 transition-transform z-10"
        title="Connect input"
      />

      {/* Output Port (Right) */}
      <button
        type="button"
        onMouseDown={(event) => { event.stopPropagation(); onStartConnect?.(node.id); }}
        onClick={(event) => { event.stopPropagation(); onStartConnect?.(node.id); }}
        className={`absolute right-0 top-1/2 translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 border-[#0f141c] cursor-crosshair hover:scale-125 transition-transform z-10 ${isPendingConnectionSource ? "bg-yellow-400 animate-pulse" : "bg-green-500"}`}
        title="Start connection"
      />

      {/* Header */}
      <div className="node-header flex items-center justify-between px-3 py-2 bg-[#0d1117]/90 cursor-move select-none rounded-t-xl border-b border-[#30363d]">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {foundryCategory && <span className="rounded bg-white/10 px-1.5 py-0.5 text-[7px] font-black uppercase tracking-widest" style={{ color: nodeColor }}>{foundryCategory.replace("_", " ")}</span>}
            <span className="truncate text-[10px] uppercase font-bold text-[#c9d1d9]">{node.title}</span>
          </div>
          {beastId && <div className="mt-0.5 truncate font-mono text-[7px] font-bold text-gray-500">{beastId}</div>}
        </div>
        <div className="flex items-center space-x-1 shrink-0">
          <button
            onClick={toggleCollapse}
            className="p-1 rounded hover:bg-white/10 flex items-center justify-center transition-colors"
            aria-label="Collapse to icon"
            title="Collapse to icon"
          >
            <Minimize2 className="w-3.5 h-3.5 text-[#c9d1d9]" />
          </button>
          {onClose && (
            <button
              onClick={() => onClose(node.id)}
              className="p-1 rounded hover:bg-red-500/70 flex items-center justify-center transition-colors"
              aria-label="Close"
            >
              <X className="w-3.5 h-3.5 text-[#c9d1d9]" />
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-3 overflow-auto text-[#c9d1d9] custom-scrollbar" style={{ height: `calc(${node.height}px - 48px)` }}>
        {children}
      </div>

      {/* Resize Handle */}
      <div
        className="absolute bottom-0 right-0 w-6 h-6 cursor-se-resize hover:bg-blue-500/20 transition-colors rounded-tl-lg"
        onMouseDown={handleResizeMouseDown}
      >
        <div className="absolute bottom-1.5 right-1.5 w-3 h-3 border-r-2 border-b-2 border-blue-400/60" />
      </div>
    </div>
  );
}

// Leeway Standards: node surface and connection ports
