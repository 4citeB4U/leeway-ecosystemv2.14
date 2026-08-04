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
 * Mini-map for canvas navigation
 */

import React, { useRef, useEffect } from "react";
import { NodeInstance } from "../types/nodeTypes";

interface MiniMapProps {
  nodes: NodeInstance[];
  camera: { x: number; y: number; zoom: number };
  onCameraChange: (camera: { x: number; y: number; zoom: number }) => void;
  canvasWidth: number;
  canvasHeight: number;
}

export function MiniMap({ nodes, camera, onCameraChange, canvasWidth, canvasHeight }: MiniMapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDragging = useRef(false);

  const MINIMAP_WIDTH = 200;
  const MINIMAP_HEIGHT = 150;
  const SCALE = 0.1; // Scale factor for minimap

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, MINIMAP_WIDTH, MINIMAP_HEIGHT);

    // Draw background
    ctx.fillStyle = "rgba(13, 17, 23, 0.9)";
    ctx.fillRect(0, 0, MINIMAP_WIDTH, MINIMAP_HEIGHT);

    // Draw grid
    ctx.strokeStyle = "rgba(59, 130, 246, 0.1)";
    ctx.lineWidth = 0.5;
    for (let x = 0; x < MINIMAP_WIDTH; x += 20) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, MINIMAP_HEIGHT);
      ctx.stroke();
    }
    for (let y = 0; y < MINIMAP_HEIGHT; y += 20) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(MINIMAP_WIDTH, y);
      ctx.stroke();
    }

    // Draw nodes
    nodes.forEach(node => {
      const x = node.x * SCALE;
      const y = node.y * SCALE;
      const w = node.width * SCALE;
      const h = node.height * SCALE;

      // Node rectangle
      ctx.fillStyle = "rgba(59, 130, 246, 0.6)";
      ctx.fillRect(x, y, w, h);
      
      // Node border
      ctx.strokeStyle = "rgba(59, 130, 246, 0.8)";
      ctx.lineWidth = 1;
      ctx.strokeRect(x, y, w, h);
    });

    // Draw viewport rectangle
    const viewportX = (-camera.x / camera.zoom) * SCALE;
    const viewportY = (-camera.y / camera.zoom) * SCALE;
    const viewportW = (canvasWidth / camera.zoom) * SCALE;
    const viewportH = (canvasHeight / camera.zoom) * SCALE;

    ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
    ctx.lineWidth = 2;
    ctx.strokeRect(viewportX, viewportY, viewportW, viewportH);

    // Fill viewport with semi-transparent overlay
    ctx.fillStyle = "rgba(255, 255, 255, 0.1)";
    ctx.fillRect(viewportX, viewportY, viewportW, viewportH);

  }, [nodes, camera, canvasWidth, canvasHeight]);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    isDragging.current = true;
    handleMouseMove(e);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging.current) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Convert minimap coordinates to canvas coordinates
    const canvasX = -(x / SCALE) * camera.zoom;
    const canvasY = -(y / SCALE) * camera.zoom;

    onCameraChange({ ...camera, x: canvasX, y: canvasY });
  };

  const handleMouseUp = () => {
    isDragging.current = false;
  };

  return (
    <div className="absolute bottom-4 right-4 z-50 bg-black/80 backdrop-blur-md border border-white/10 rounded-lg p-2">
      <div className="text-[10px] font-bold text-white mb-1 px-1">Mini Map</div>
      <canvas
        ref={canvasRef}
        width={MINIMAP_WIDTH}
        height={MINIMAP_HEIGHT}
        className="cursor-pointer rounded"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      />
    </div>
  );
}

// Leeway Standards: governed module