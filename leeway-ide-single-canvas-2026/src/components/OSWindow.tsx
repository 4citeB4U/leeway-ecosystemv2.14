/**
 * LEEWAY_HEADER - DO NOT REMOVE
 *
 * REGION: UI
 * TAG: UI.OS.WINDOW_MANAGER.WINDOW
 * DESCRIPTION: OS-managed floating application window - drag, resize, maximize, restore, minimize, close
 * AUTHORITY: LeeWay-Standards
 *
 * 5WH:
 * WHAT = Floating application window for the LeeWay OS desktop
 * WHY = Applications open inside OS-managed windows instead of replacing the shell
 * WHO = Agent Lee / operator
 * WHERE = leeway-ide-single-canvas/src/components/OSWindow.tsx
 * WHEN = 2026-08-02
 * HOW = Pointer-event drag on title bar, 8 resize handles, maximize/restore with previous bounds, minimize keeps session alive
 *
 * CHAIN: Standards -> Application Registry -> BFF -> OS Window -> Application iframe
 * LICENSE: PROPRIETARY
 *
 * NOTE: This app ships raw `@tailwind` directives without a PostCSS/Tailwind pipeline,
 * so all layout here is inline styles by convention.
 */

import { useRef, useCallback, useEffect, useMemo } from "react";
import { Minus, Square, Copy, X, Maximize2 } from "lucide-react";

export interface OSWindowState {
  id: string;
  applicationId: string;
  title: string;
  url: string;
  color: string;
  bounds: { x: number; y: number; width: number; height: number };
  prevBounds: { x: number; y: number; width: number; height: number } | null;
  minimized: boolean;
  maximized: boolean;
  zIndex: number;
  sessionId: string;
  workspaceId: string;
  lastRoute: string;
  lastUpdateAt: string;
  openAt: string;
}

export const MIN_WINDOW_WIDTH = 360;
export const MIN_WINDOW_HEIGHT = 280;
export const TASKBAR_HEIGHT = 48;
export const HEADER_HEIGHT = 56;

export interface UsableArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function getUsableArea(mobile: boolean): UsableArea {
  const top = mobile ? 0 : HEADER_HEIGHT;
  return {
    x: 0,
    y: top,
    width: window.innerWidth,
    height: Math.max(200, window.innerHeight - top - (mobile ? 56 : TASKBAR_HEIGHT)),
  };
}

interface OSWindowProps {
  win: OSWindowState;
  focused: boolean;
  mobile: boolean;
  onFocus: () => void;
  onMove: (bounds: OSWindowState["bounds"]) => void;
  onResize: (bounds: OSWindowState["bounds"]) => void;
  onMinimize: () => void;
  onToggleMaximize: () => void;
  onClose: () => void;
  onSnapshot: (bounds: OSWindowState["bounds"]) => void;
}

const RESIZE_HANDLES: Array<{ id: string; cursor: string; style: React.CSSProperties }> = [
  { id: "n", cursor: "ns-resize", style: { top: 0, left: 24, right: 24, height: 6, cursor: "ns-resize" } },
  { id: "s", cursor: "ns-resize", style: { bottom: 0, left: 24, right: 24, height: 6, cursor: "ns-resize" } },
  { id: "e", cursor: "ew-resize", style: { top: 24, bottom: 24, right: 0, width: 6, cursor: "ew-resize" } },
  { id: "w", cursor: "ew-resize", style: { top: 24, bottom: 24, left: 0, width: 6, cursor: "ew-resize" } },
  { id: "ne", cursor: "nesw-resize", style: { top: 0, right: 0, width: 14, height: 14, cursor: "nesw-resize" } },
  { id: "nw", cursor: "nwse-resize", style: { top: 0, left: 0, width: 14, height: 14, cursor: "nwse-resize" } },
  { id: "se", cursor: "nwse-resize", style: { bottom: 0, right: 0, width: 14, height: 14, cursor: "nwse-resize" } },
  { id: "sw", cursor: "nesw-resize", style: { bottom: 0, left: 0, width: 14, height: 14, cursor: "nesw-resize" } },
];

export function OSWindow({ win, focused, mobile, onFocus, onMove, onResize, onMinimize, onToggleMaximize, onClose, onSnapshot }: OSWindowProps) {
  const frameRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ startX: number; startY: number; startBounds: OSWindowState["bounds"] } | null>(null);
  const resizeRef = useRef<{ handle: string; startX: number; startY: number; startBounds: OSWindowState["bounds"] } | null>(null);

  const clampToDesktop = useCallback((bounds: OSWindowState["bounds"]) => {
    const area = getUsableArea(mobile);
    const minVisible = 96;
    let x = bounds.x;
    let y = bounds.y;
    if (x > area.x + area.width - minVisible) x = area.x + area.width - minVisible;
    if (y > area.y + area.height - minVisible) y = area.y + area.height - minVisible;
    if (x + bounds.width < minVisible) x = minVisible - bounds.width;
    if (y < area.y) y = area.y;
    x = Math.max(0, x);
    return { ...bounds, x, y };
  }, [mobile]);

  const handleTitleBarPointerDown = useCallback((e: React.PointerEvent) => {
    if (win.maximized || mobile) return;
    if ((e.target as HTMLElement).closest("[data-window-control]")) return;
    onFocus();
    dragRef.current = { startX: e.clientX, startY: e.clientY, startBounds: { ...win.bounds } };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }, [win.maximized, win.bounds, mobile, onFocus]);

  const handleTitleBarPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragRef.current) return;
    const { startX, startY, startBounds } = dragRef.current;
    const next = clampToDesktop({
      ...startBounds,
      x: startBounds.x + (e.clientX - startX),
      y: startBounds.y + (e.clientY - startY),
    });
    onMove(next);
  }, [clampToDesktop, onMove]);

  const endDrag = useCallback(() => {
    dragRef.current = null;
    resizeRef.current = null;
  }, []);

  const handleResizePointerDown = useCallback((handle: string) => (e: React.PointerEvent) => {
    if (win.maximized || mobile) return;
    e.stopPropagation();
    onFocus();
    resizeRef.current = { handle, startX: e.clientX, startY: e.clientY, startBounds: { ...win.bounds } };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }, [win.maximized, win.bounds, mobile, onFocus]);

  const handleResizePointerMove = useCallback((e: React.PointerEvent) => {
    if (!resizeRef.current) return;
    const { handle, startX, startY, startBounds } = resizeRef.current;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    const next = { ...startBounds };
    if (handle.includes("e")) next.width = Math.max(MIN_WINDOW_WIDTH, startBounds.width + dx);
    if (handle.includes("s")) next.height = Math.max(MIN_WINDOW_HEIGHT, startBounds.height + dy);
    if (handle.includes("w")) {
      next.width = Math.max(MIN_WINDOW_WIDTH, startBounds.width - dx);
      next.x = startBounds.x + (startBounds.width - next.width);
    }
    if (handle.includes("n")) {
      next.height = Math.max(MIN_WINDOW_HEIGHT, startBounds.height - dy);
      next.y = startBounds.y + (startBounds.height - next.height);
    }
    onResize(clampToDesktop(next));
  }, [clampToDesktop, onResize]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!focused) return;
      if (e.altKey && e.key === "ArrowLeft") {
        e.preventDefault();
        onSnapshot({ ...win.bounds });
        const area = getUsableArea(mobile);
        onMove({ ...win.bounds, x: area.x, y: area.y, width: Math.floor(area.width / 2), height: area.height });
      } else if (e.altKey && e.key === "ArrowRight") {
        e.preventDefault();
        onSnapshot({ ...win.bounds });
        const area = getUsableArea(mobile);
        onMove({ ...win.bounds, x: area.x + Math.floor(area.width / 2), y: area.y, width: Math.floor(area.width / 2), height: area.height });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [focused, win.bounds, mobile, onMove, onSnapshot]);

  const style: React.CSSProperties = useMemo(() => {
    if (mobile) return { top: 0, left: 0, width: "100%", height: "100%", zIndex: win.zIndex };
    return { top: win.bounds.y, left: win.bounds.x, width: win.bounds.width, height: win.bounds.height, zIndex: win.zIndex };
  }, [mobile, win.bounds, win.zIndex]);

  return (
    <div
      ref={frameRef}
      data-os-window={win.id}
      data-application-id={win.applicationId}
      data-minimized={win.minimized || undefined}
      data-maximized={win.maximized || undefined}
      data-focused={focused || undefined}
      data-session-id={win.sessionId}
      data-bounds={JSON.stringify(win.bounds)}
      data-mobile={mobile || undefined}
      role="dialog"
      aria-label={`${win.title} window`}
      style={{
        position: "fixed",
        display: win.minimized ? "none" : "flex",
        flexDirection: "column",
        borderRadius: 12,
        overflow: "hidden",
        border: `1px solid ${win.color}`,
        background: "rgba(13, 17, 23, 0.95)",
        color: "#c9d1d9",
        ...style,
        boxShadow: focused ? `0 0 0 1px ${win.color}66, 0 18px 50px -12px ${win.color}33` : "0 18px 40px -16px rgba(0,0,0,0.7)",
      }}
      onPointerDown={onFocus}
    >
      {/* Title bar */}
      <div
        data-os-titlebar
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          height: 36,
          padding: "0 8px",
          userSelect: "none",
          flexShrink: 0,
          cursor: mobile ? "default" : "grab",
          background: `linear-gradient(90deg, ${win.color}1f, transparent 55%)`,
          borderBottom: `1px solid ${win.color}44`,
        }}
        onPointerDown={handleTitleBarPointerDown}
        onPointerMove={handleTitleBarPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onDoubleClick={() => { if (!mobile) onToggleMaximize(); }}
        title="Drag to move. Double-click to maximize."
      >
        <span style={{ width: 8, height: 8, borderRadius: "9999px", background: win.color, flexShrink: 0 }} aria-hidden="true" />
        <span style={{ fontSize: 11, fontWeight: 700, color: "#ffffff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{win.title}</span>
        <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 8, fontFamily: "monospace", color: "#8b949e", flexShrink: 0 }}>
          <span style={{ width: 6, height: 6, borderRadius: "9999px", background: focused ? "#34d399" : "#6e7681" }} aria-hidden="true" />
          {focused ? "focused" : "unfocused"}
        </span>
        <span style={{ flex: 1 }} />
        <button data-window-control type="button" aria-label="Minimize window" title="Minimize" onClick={() => { onMinimize(); onFocus(); }}
          style={{ padding: 4, borderRadius: 4, background: "transparent", border: "none", color: "#8b949e", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Minus style={{ width: 14, height: 14 }} />
        </button>
        <button data-window-control type="button" aria-label={win.maximized ? "Restore window" : "Maximize window"} title={win.maximized ? "Restore" : "Maximize"} onClick={() => { onToggleMaximize(); onFocus(); }}
          style={{ padding: 4, borderRadius: 4, background: "transparent", border: "none", color: "#8b949e", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
          {win.maximized ? <Copy style={{ width: 14, height: 14 }} /> : <Square style={{ width: 12, height: 12 }} />}
        </button>
        <button data-window-control type="button" aria-label="Close window" title="Close (application session stays running)" onClick={onClose}
          style={{ padding: 4, borderRadius: 4, background: "transparent", border: "none", color: "#8b949e", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <X style={{ width: 14, height: 14 }} />
        </button>
      </div>

      {/* Content */}
      <div style={{ flex: 1, minHeight: 0, background: "#0d1117", position: "relative" }}>
        <iframe
          src={win.url}
          title={`${win.title} application surface`}
          style={{ width: "100%", height: "100%", border: 0, background: "#ffffff" }}
          referrerPolicy="no-referrer"
          allow="clipboard-read; clipboard-write"
        />
      </div>

      {/* Resize handles (desktop only) */}
      {!mobile && !win.maximized && RESIZE_HANDLES.map((h) => (
        <div
          key={h.id}
          data-resize-handle={h.id}
          onPointerDown={handleResizePointerDown(h.id)}
          onPointerMove={handleResizePointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          style={{ position: "absolute", ...h.style, zIndex: 5 }}
          aria-hidden="true"
        />
      ))}

      {/* Maximize icon hint when maximized */}
      {!mobile && win.maximized && (
        <span style={{ position: "absolute", top: 8, right: 56, color: "#6e7681", pointerEvents: "none", display: "flex" }} aria-hidden="true"><Maximize2 style={{ width: 12, height: 12 }} /></span>
      )}
    </div>
  );
}
