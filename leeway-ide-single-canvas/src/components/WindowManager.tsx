/**
 * LEEWAY_HEADER - DO NOT REMOVE
 *
 * REGION: UI
 * TAG: UI.OS.WINDOW_MANAGER.MAIN
 * DESCRIPTION: LeeWay OS window manager - floating application windows over the desktop, taskbar, persistence, z-order, unique frame colors from the Application Registry
 * AUTHORITY: LeeWay-Standards
 *
 * 5WH:
 * WHAT = OS window manager for the LeeWay desktop
 * WHY = Default applications open as real movable OS windows; minimize keeps sessions alive; state persists per session/workspace
 * WHO = Agent Lee / operator
 * WHERE = leeway-ide-single-canvas/src/components/WindowManager.tsx
 * WHEN = 2026-08-02
 * HOW = WindowManagerProvider owns window state; WindowDesktop renders windows + taskbar; localStorage persistence key leeway.os.windowState.v1
 *
 * CHAIN: Standards -> Application Registry (frameColor) -> BFF -> OS Window -> Application iframe
 * LICENSE: PROPRIETARY
 *
 * NOTE: This app ships raw `@tailwind` directives without a PostCSS/Tailwind pipeline,
 * so all layout here is inline styles by convention.
 */

import { createContext, useContext, useEffect, useMemo, useRef, useState, useCallback, type ReactNode } from "react";
import { AppWindow, Monitor, Code2, Users, PenTool, BookOpen } from "lucide-react";
import { OSWindow, OSWindowState, getUsableArea, MIN_WINDOW_WIDTH, MIN_WINDOW_HEIGHT, TASKBAR_HEIGHT, HEADER_HEIGHT } from "./OSWindow";

const PERSIST_KEY = "leeway.os.windowState.v1";
const WORKSPACE_ID = "leeway-workspace-default";

export interface RegistryAppInfo {
  applicationId: string;
  applicationName: string;
  lifecycleState: string;
  port?: number;
  endpoints?: Record<string, string>;
  frameColor?: string;
}

const APP_ICONS: Record<string, ReactNode> = {
  "leeway-ide": <Code2 style={{ width: 14, height: 14 }} />,
  "leeway-employment-center": <Users style={{ width: 14, height: 14 }} />,
  "leeway-svg-creator": <PenTool style={{ width: 14, height: 14 }} />,
  "leeway-open-notebook": <BookOpen style={{ width: 14, height: 14 }} />,
};

const DEFAULT_COLORS: Record<string, string> = {
  "leeway-ide": "#58a6ff",
  "leeway-employment-center": "#3fb950",
  "leeway-svg-creator": "#d29922",
  "leeway-open-notebook": "#bc8cff",
};

interface WindowManagerContextValue {
  windows: OSWindowState[];
  openWindow: (app: RegistryAppInfo) => OSWindowState | null;
  focusWindow: (id: string) => void;
  closeWindow: (id: string) => void;
  minimizeWindow: (id: string) => void;
  toggleMaximize: (id: string) => void;
  restoreWindow: (id: string) => void;
  moveWindow: (id: string, bounds: OSWindowState["bounds"]) => void;
  resizeWindow: (id: string, bounds: OSWindowState["bounds"]) => void;
  snapshotBounds: (id: string, bounds: OSWindowState["bounds"]) => void;
}

const WindowManagerContext = createContext<WindowManagerContextValue | null>(null);

export function useWindowManager(): WindowManagerContextValue {
  const ctx = useContext(WindowManagerContext);
  if (!ctx) throw new Error("useWindowManager must be used within WindowManagerProvider");
  return ctx;
}

function endpointFor(app: RegistryAppInfo): string | null {
  if (app.endpoints?.root) return app.endpoints.root;
  if (app.port) return `http://localhost:${app.port}`;
  return null;
}

function sanitizePersisted(windows: OSWindowState[]): OSWindowState[] {
  return windows.filter((w) => w && w.id && w.url && typeof w.bounds?.x === "number").map((w) => ({
    ...w,
    bounds: {
      x: Math.max(0, w.bounds.x),
      y: Math.max(0, w.bounds.y),
      width: Math.max(MIN_WINDOW_WIDTH, Math.min(w.bounds.width, window.innerWidth)),
      height: Math.max(MIN_WINDOW_HEIGHT, Math.min(w.bounds.height, window.innerHeight - TASKBAR_HEIGHT - HEADER_HEIGHT)),
    },
    prevBounds: w.prevBounds && typeof w.prevBounds.x === "number" ? w.prevBounds : null,
    minimized: Boolean(w.minimized),
    maximized: Boolean(w.maximized),
  }));
}

export function WindowManagerProvider({ children }: { children: ReactNode }) {
  const [windows, setWindows] = useState<OSWindowState[]>(() => {
    try {
      const saved = localStorage.getItem(PERSIST_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return sanitizePersisted(parsed);
      }
    } catch {
      // ignore corrupt persisted state
    }
    return [];
  });
  const [mobile, setMobile] = useState(() => typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const zCounter = useRef(0);

  useEffect(() => {
    const mql = window.matchMedia("(max-width: 767px)");
    const onChange = (e: MediaQueryListEvent) => setMobile(e.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      try {
        localStorage.setItem(PERSIST_KEY, JSON.stringify(windows));
      } catch {
        // storage unavailable - window state stays in memory
      }
    }, 300);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [windows]);

  const openWindow = useCallback((app: RegistryAppInfo) => {
    const url = endpointFor(app);
    if (!url) return null;
    const existing = windows.find((w) => w.applicationId === app.applicationId);
    if (existing) {
      setWindows((prev) => prev.map((w) => w.id === existing.id ? { ...w, minimized: false, maximized: false } : w));
      return existing;
    }
    zCounter.current += 1;
    const area = getUsableArea(false);
    const width = Math.min(920, Math.max(MIN_WINDOW_WIDTH, Math.floor(area.width * 0.62)));
    const height = Math.min(640, Math.max(MIN_WINDOW_HEIGHT, Math.floor(area.height * 0.72)));
    const count = windows.length;
    const win: OSWindowState = {
      id: `win-${app.applicationId}`,
      applicationId: app.applicationId,
      title: app.applicationName || app.applicationId,
      url,
      color: app.frameColor || DEFAULT_COLORS[app.applicationId] || "#58a6ff",
      bounds: { x: 64 + (count % 5) * 36, y: area.y + 24 + (count % 5) * 28, width, height },
      prevBounds: null,
      minimized: false,
      maximized: false,
      zIndex: 30 + zCounter.current,
      sessionId: `session-${app.applicationId}-${Date.now()}`,
      workspaceId: WORKSPACE_ID,
      lastRoute: "/",
      lastUpdateAt: new Date().toISOString(),
      openAt: new Date().toISOString(),
    };
    setWindows((prev) => [...prev, win]);
    return win;
  }, [windows]);

  const focusWindow = useCallback((id: string) => {
    setWindows((prev) => {
      const target = prev.find((w) => w.id === id);
      if (!target) return prev;
      const maxZ = Math.max(...prev.map((w) => w.zIndex), 0);
      if (target.zIndex === maxZ) return prev;
      return prev.map((w) => (w.id === id ? { ...w, zIndex: maxZ + 1 } : w));
    });
  }, []);

  const closeWindow = useCallback((id: string) => {
    setWindows((prev) => prev.filter((w) => w.id !== id));
  }, []);

  const minimizeWindow = useCallback((id: string) => {
    setWindows((prev) => prev.map((w) => (w.id === id ? { ...w, minimized: true } : w)));
  }, []);

  const toggleMaximize = useCallback((id: string) => {
    setWindows((prev) => prev.map((w) => {
      if (w.id !== id) return w;
      const area = getUsableArea(false);
      if (w.maximized) {
        const back = w.prevBounds || w.bounds;
        return { ...w, maximized: false, bounds: back };
      }
      return {
        ...w,
        maximized: true,
        prevBounds: { ...w.bounds },
        bounds: { x: area.x, y: area.y, width: area.width, height: area.height },
      };
    }));
  }, []);

  const restoreWindow = useCallback((id: string) => {
    setWindows((prev) => prev.map((w) => (w.id === id ? { ...w, minimized: false } : w)));
    focusWindow(id);
  }, [focusWindow]);

  const moveWindow = useCallback((id: string, bounds: OSWindowState["bounds"]) => {
    setWindows((prev) => prev.map((w) => (w.id === id ? { ...w, bounds, lastUpdateAt: new Date().toISOString() } : w)));
  }, []);

  const resizeWindow = useCallback((id: string, bounds: OSWindowState["bounds"]) => {
    setWindows((prev) => prev.map((w) => (w.id === id ? { ...w, bounds, lastUpdateAt: new Date().toISOString() } : w)));
  }, []);

  const snapshotBounds = useCallback((id: string, bounds: OSWindowState["bounds"]) => {
    setWindows((prev) => prev.map((w) => (w.id === id ? { ...w, prevBounds: { ...bounds } } : w)));
  }, []);

  const value = useMemo(() => ({
    windows,
    openWindow,
    focusWindow,
    closeWindow,
    minimizeWindow,
    toggleMaximize,
    restoreWindow,
    moveWindow,
    resizeWindow,
    snapshotBounds,
  }), [windows, openWindow, focusWindow, closeWindow, minimizeWindow, toggleMaximize, restoreWindow, moveWindow, resizeWindow, snapshotBounds]);

  return <WindowManagerContext.Provider value={value}>{children}</WindowManagerContext.Provider>;
}

export function WindowDesktop({ onOpenLauncher }: { onOpenLauncher: () => void }) {
  const { windows, focusWindow, closeWindow, minimizeWindow, toggleMaximize, restoreWindow, moveWindow, resizeWindow, snapshotBounds } = useWindowManager();
  const [mobile, setMobile] = useState(() => typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches);

  useEffect(() => {
    const mql = window.matchMedia("(max-width: 767px)");
    const onChange = (e: MediaQueryListEvent) => setMobile(e.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  const focusedId = windows.reduce<string | null>((acc, w) => (!w.minimized && w.zIndex > (acc ? (windows.find((x) => x.id === acc)?.zIndex ?? 0) : 0) ? w.id : acc), null);

  const sorted = [...windows].sort((a, b) => a.zIndex - b.zIndex);

  return (
    <>
      {/* Desktop window layer - floating application windows above the LeeWay desktop */}
      <div className="os-desktop" data-os-desktop="true" aria-label="LeeWay OS desktop"
        style={{ position: "fixed", inset: 0, zIndex: 30, pointerEvents: "none" }}>
        {sorted.map((win) => (
          <div key={win.id} style={{ pointerEvents: "auto" }}>
            <OSWindow
              win={win}
              focused={focusedId === win.id}
              mobile={mobile}
              onFocus={() => focusWindow(win.id)}
              onMove={(b) => moveWindow(win.id, b)}
              onResize={(b) => resizeWindow(win.id, b)}
              onMinimize={() => minimizeWindow(win.id)}
              onToggleMaximize={() => toggleMaximize(win.id)}
              onClose={() => closeWindow(win.id)}
              onSnapshot={(b) => snapshotBounds(win.id, b)}
            />
          </div>
        ))}
      </div>

      {/* Taskbar / footer */}
      <footer className="os-taskbar" data-os-taskbar="true" aria-label="LeeWay taskbar"
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 50,
          height: TASKBAR_HEIGHT,
          background: "#161b22",
          borderTop: "1px solid #30363d",
          display: "flex",
          alignItems: "center",
          gap: 4,
          padding: "0 8px",
          userSelect: "none",
        }}>
        <button
          type="button"
          onClick={onOpenLauncher}
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "0 12px", height: 32, borderRadius: 8, background: "transparent", border: "none", color: "#8b949e", cursor: "pointer" }}
          aria-label="Open Applications Launcher"
          title="Default Applications"
        >
          <AppWindow style={{ width: 16, height: 16, color: "#58a6ff" }} />
          <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>Apps</span>
        </button>
        <span style={{ height: 24, width: 1, background: "#30363d", margin: "0 4px" }} aria-hidden="true" />
        {windows.length === 0 && (
          <span style={{ fontSize: 10, fontFamily: "monospace", color: "#484f58", padding: "0 8px" }} data-taskbar-empty="true">
            No application windows open
          </span>
        )}
        {windows.map((win) => {
          const isFocused = focusedId === win.id;
          return (
            <button
              key={win.id}
              type="button"
              data-taskbar-window={win.id}
              data-application-id={win.applicationId}
              data-minimized={win.minimized || undefined}
              data-focused={isFocused || undefined}
              onClick={() => (win.minimized ? restoreWindow(win.id) : focusWindow(win.id))}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "0 10px",
                height: 32,
                borderRadius: 8,
                border: `1px solid ${isFocused ? "rgba(255,255,255,0.15)" : "transparent"}`,
                background: isFocused ? "rgba(255,255,255,0.10)" : "transparent",
                color: "#e6edf3",
                cursor: "pointer",
                opacity: win.minimized ? 0.6 : 1,
              }}
              aria-label={`${win.minimized ? "Restore" : "Focus"} ${win.title}`}
              title={`${win.title} — ${win.minimized ? "minimized" : isFocused ? "focused" : "running"}`}
            >
              <span style={{ width: 6, height: 6, borderRadius: "9999px", background: win.color, flexShrink: 0 }} aria-hidden="true" />
              <span style={{ display: "flex", color: "#e6edf3" }}>{APP_ICONS[win.applicationId] || <Monitor style={{ width: 14, height: 14 }} />}</span>
              <span style={{ fontSize: 10, fontWeight: 600, color: "#e6edf3", maxWidth: 140, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{win.title}</span>
              <span style={{ width: 6, height: 6, borderRadius: "9999px", background: win.minimized ? "#fbbf24" : isFocused ? "#34d399" : "#6e7681", flexShrink: 0 }} aria-hidden="true" title={win.minimized ? "minimized" : "running"} />
            </button>
          );
        })}
      </footer>
    </>
  );
}
