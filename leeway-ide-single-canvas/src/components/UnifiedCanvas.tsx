/**
 * LEEWAY_HEADER - DO NOT REMOVE
 *
 * REGION: UI
 * TAG: UI.CANVAS.UNIFIED_LEEWAY_RUNTIME_CANVAS
 * PURPOSE: Leeway-standard n8n-style canvas with runtime-fabric pan, zoom, mesh, and node connection layer.
 * DISCOVERY_PIPELINE: Voice -> Intent -> Location -> Vertical -> Ranking -> Render
 */

import React, { useState, useCallback, useRef, useEffect, cloneElement, isValidElement } from "react";
import { NodeInstance, NodeConnection, LeewayCanvasSettings, DEFAULT_LEEWAY_CANVAS_SETTINGS } from "../types/nodeTypes";
import { MiniMap } from "./MiniMap";
import { GalacticMeshBackground } from "./GalacticMeshBackground";

interface UnifiedCanvasProps {
  nodes: NodeInstance[];
  connections: NodeConnection[];
  onNodesChange: (nodes: NodeInstance[]) => void;
  onConnectionsChange: (connections: NodeConnection[]) => void;
  canvasSettings?: LeewayCanvasSettings;
  onCanvasDrop?: (worldX: number, worldY: number, event: React.DragEvent<HTMLDivElement>) => void;
  children?: React.ReactNode;
}

interface ChildProps {
  zoom?: number;
}

interface Camera {
  x: number;
  y: number;
  zoom: number;
}

export function UnifiedCanvas({
  nodes,
  connections,
  onNodesChange,
  onConnectionsChange,
  canvasSettings = DEFAULT_LEEWAY_CANVAS_SETTINGS,
  onCanvasDrop,
  children
}: UnifiedCanvasProps) {
  const [camera, setCamera] = useState<Camera>({ x: 0, y: 0, zoom: 1 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [spacePressed, setSpacePressed] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);

  const accentColor = canvasSettings.accentColor || canvasSettings.galaxyTint || "#3b82f6";

  const clientToWorld = useCallback((clientX: number, clientY: number) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return { x: clientX, y: clientY };
    return {
      x: (clientX - rect.left - camera.x) / camera.zoom,
      y: (clientY - rect.top - camera.y) / camera.zoom,
    };
  }, [camera]);

  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    if (!canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const worldX = (mouseX - camera.x) / camera.zoom;
    const worldY = (mouseY - camera.y) / camera.zoom;
    const zoomDelta = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.min(Math.max(camera.zoom * zoomDelta, 0.12), 3);
    const newX = mouseX - worldX * newZoom;
    const newY = mouseY - worldY * newZoom;

    setCamera({ x: newX, y: newY, zoom: newZoom });
  }, [camera]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 1 || (e.button === 0 && spacePressed)) {
      e.preventDefault();
      setIsPanning(true);
      setPanStart({ x: e.clientX - camera.x, y: e.clientY - camera.y });
    }
  }, [camera, spacePressed]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isPanning) {
      setCamera(prev => ({ ...prev, x: e.clientX - panStart.x, y: e.clientY - panStart.y }));
    }
  }, [isPanning, panStart]);

  const handleMouseUp = useCallback(() => setIsPanning(false), []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" && !e.repeat) {
        e.preventDefault();
        setSpacePressed(true);
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault();
        setSpacePressed(false);
        setIsPanning(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.addEventListener("wheel", handleWheel, { passive: false });
    return () => canvas.removeEventListener("wheel", handleWheel);
  }, [handleWheel]);

  const gridSize = 40;
  const gridColor = accentColor;
  const gridOffset = {
    x: (camera.x % (gridSize * camera.zoom)) / camera.zoom,
    y: (camera.y % (gridSize * camera.zoom)) / camera.zoom,
  };

  return (
    <div
      ref={canvasRef}
      className="flex-1 relative overflow-hidden bg-[#0d1117]"
      id="unified-canvas-container"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onDragOver={(event) => {
        if (onCanvasDrop) {
          event.preventDefault();
          event.dataTransfer.dropEffect = "copy";
        }
      }}
      onDrop={(event) => {
        if (!onCanvasDrop) return;
        event.preventDefault();
        const world = clientToWorld(event.clientX, event.clientY);
        onCanvasDrop(world.x, world.y, event);
      }}
      style={{ cursor: isPanning ? "grabbing" : spacePressed ? "grab" : "default" }}
    >
      <GalacticMeshBackground
        tint={canvasSettings.galaxyTint}
        density={canvasSettings.galaxyDensity}
        style={canvasSettings.galaxyStyle}
        speed={canvasSettings.galaxySpeed}
        enabled={canvasSettings.backgroundMode === "galactic"}
      />

      <div className="absolute top-4 right-4 z-50 bg-black/80 backdrop-blur-md border border-white/10 rounded-lg px-3 py-2 text-xs font-mono text-white pointer-events-none">
        Zoom: {Math.round(camera.zoom * 100)}%
      </div>

      <button
        type="button"
        onClick={() => setCamera({ x: 0, y: 0, zoom: 1 })}
        className="absolute top-4 right-32 z-50 bg-black/80 backdrop-blur-md border border-white/10 rounded-lg px-3 py-2 text-xs font-bold text-white hover:bg-white/10 transition-all"
      >
        Reset View
      </button>

      <MiniMap
        nodes={nodes}
        camera={camera}
        onCameraChange={setCamera}
        canvasWidth={canvasRef.current?.clientWidth || 1000}
        canvasHeight={canvasRef.current?.clientHeight || 800}
      />

      <div
        className="relative z-10"
        style={{
          transform: `translate(${camera.x}px, ${camera.y}px) scale(${camera.zoom})`,
          transformOrigin: "0 0",
          position: "absolute",
          inset: 0,
          pointerEvents: isPanning ? "none" : "auto",
        }}
      >
        {canvasSettings.showMeshDots && (
          <div
            className="absolute pointer-events-none select-none"
            style={{
              left: -10000,
              top: -10000,
              width: 20000,
              height: 20000,
              backgroundImage: `radial-gradient(circle, ${gridColor}40 2px, transparent 2px), radial-gradient(circle, ${gridColor}22 1px, transparent 1px)`,
              backgroundSize: `${gridSize}px ${gridSize}px, ${gridSize / 2}px ${gridSize / 2}px`,
              backgroundPosition: `${gridOffset.x}px ${gridOffset.y}px, ${gridOffset.x + gridSize / 2}px ${gridOffset.y + gridSize / 2}px`,
            }}
          />
        )}

        {canvasSettings.showMeshLines && (
          <div
            className="absolute pointer-events-none select-none opacity-30"
            style={{
              left: -10000,
              top: -10000,
              width: 20000,
              height: 20000,
              backgroundImage: `linear-gradient(${gridColor}26 1px, transparent 1px), linear-gradient(90deg, ${gridColor}26 1px, transparent 1px)`,
              backgroundSize: `${gridSize * 2}px ${gridSize * 2}px`,
              backgroundPosition: `${gridOffset.x}px ${gridOffset.y}px`,
            }}
          />
        )}

        <svg className="absolute pointer-events-none" style={{ left: -10000, top: -10000, width: 20000, height: 20000, overflow: "visible" }}>
          {connections.map(conn => {
            const fromNode = nodes.find(n => n.id === conn.fromNodeId);
            const toNode = nodes.find(n => n.id === conn.toNodeId);
            if (!fromNode || !toNode) return null;
            const startX = fromNode.x + fromNode.width;
            const startY = fromNode.y + fromNode.height / 2;
            const endX = toNode.x;
            const endY = toNode.y + toNode.height / 2;
            const cx1 = startX + 50;
            const cx2 = endX - 50;
            return (
              <g key={conn.id}>
                <path d={`M ${startX} ${startY} C ${cx1} ${startY}, ${cx2} ${endY}, ${endX} ${endY}`} fill="none" stroke={`${accentColor}55`} strokeWidth="7" filter="blur(3px)" />
                <path d={`M ${startX} ${startY} C ${cx1} ${startY}, ${cx2} ${endY}, ${endX} ${endY}`} fill="none" stroke={accentColor} strokeWidth="2.5" strokeDasharray="6 6" />
              </g>
            );
          })}
        </svg>

        {React.Children.map(children, child => {
          if (isValidElement<ChildProps>(child)) return cloneElement(child, { zoom: camera.zoom });
          return child;
        })}
      </div>
    </div>
  );
}
