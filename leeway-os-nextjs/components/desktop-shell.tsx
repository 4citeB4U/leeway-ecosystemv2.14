"use client";

import { useEffect, useMemo, useState } from "react";
import { SCREENS, SCREEN_MAP } from "@/src/lib/screens-data";
import AppScreen, { NATIVE_SCREEN_SLUGS } from "@/components/app-screens";
import ScreenView from "@/components/screen-view";

const DEFAULT_SHORTCUTS = [
  { slug: "leeway_home_1", label: "Home", icon: "home" },
  { slug: "evidence_center", label: "Evidence", icon: "shield" },
  { slug: "control_center", label: "Runtime", icon: "smart_toy" },
  { slug: "app_launcher_1", label: "Apps", icon: "apps" },
  { slug: "appearance_settings", label: "Settings", icon: "tune" }
];

const START_APPS = [
  { slug: "leeway_home_1", label: "LeeWay Home", icon: "home" },
  { slug: "agent_lee_interaction", label: "Agent Lee", icon: "psychology" },
  { slug: "control_center", label: "Runtime Control", icon: "terminal" },
  { slug: "evidence_center", label: "Evidence Center", icon: "verified_user" },
  { slug: "notification_center", label: "Notifications", icon: "notifications" },
  { slug: "appearance_settings", label: "Appearance", icon: "palette" }
];

const ACTUAL_STITCH_SCREENS = SCREENS
  .filter((screen) => screen.sourceDir !== "(concept-only)" && !NATIVE_SCREEN_SLUGS.has(screen.slug))
  .sort((a, b) => a.title.localeCompare(b.title));

const FEATURED_STITCH_SCREENS = ACTUAL_STITCH_SCREENS.slice(0, 8);
const QUICK_LAUNCH_STITCH_SCREENS = ACTUAL_STITCH_SCREENS.slice(0, 5);

type WindowEntry = {
  id: string;
  slug: string;
  title: string;
  z: number;
  minimized: boolean;
  maximized: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
};

function formatTime(date: Date) {
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export default function DesktopShell() {
  const [startOpen, setStartOpen] = useState(false);
  const [windows, setWindows] = useState<WindowEntry[]>([]);
  const [wallpaperReady, setWallpaperReady] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [quickSettingsOpen, setQuickSettingsOpen] = useState(false);
  const [time, setTime] = useState(() => new Date());
  const [nextZ, setNextZ] = useState(100);
  const [dragState, setDragState] = useState<{ id: string; offsetX: number; offsetY: number } | null>(null);
  const wallpaperUrl = "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1600&q=80";

  useEffect(() => {
    const timer = window.setInterval(() => setTime(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const img = new Image();
    img.src = wallpaperUrl;
    img.onload = () => setWallpaperReady(true);
  }, [wallpaperUrl]);

  const openWindow = (slug: string) => {
    const screen = SCREEN_MAP[slug];
    if (!screen) return;
    setWindows((prev) => {
      const existing = prev.find((w) => w.slug === slug);
      if (existing) {
        return prev.map((w) =>
          w.id === existing.id ? { ...w, minimized: false, z: nextZ } : w
        );
      }
      const nextX = 120 + prev.length * 28;
      const nextY = 120 + prev.length * 28;
      return [
        ...prev,
        {
          id: `${slug}-${Date.now()}`,
          slug,
          title: screen.title,
          z: nextZ,
          minimized: false,
          maximized: false,
          x: nextX,
          y: nextY,
          width: 760,
          height: 520
        }
      ];
    });
    setNextZ((z) => z + 1);
    setStartOpen(false);
  };

  const closeWindow = (id: string) => {
    setWindows((prev) => prev.filter((w) => w.id !== id));
  };

  const minimizeWindow = (id: string) => {
    setWindows((prev) => prev.map((w) => (w.id === id ? { ...w, minimized: true } : w)));
  };

  const focusWindow = (id: string) => {
    setWindows((prev) =>
      prev.map((w) => (w.id === id ? { ...w, z: nextZ } : w))
    );
    setNextZ((z) => z + 1);
  };

  const toggleMaximize = (id: string) => {
    setWindows((prev) =>
      prev.map((w) => {
        if (w.id !== id) return w;
        if (w.maximized) {
          return {
            ...w,
            maximized: false,
            x: 120,
            y: 120,
            width: 760,
            height: 520
          };
        }
        const availableWidth = Math.max(640, window.innerWidth - 60);
        const availableHeight = Math.max(420, window.innerHeight - 160);
        return {
          ...w,
          minimized: false,
          maximized: true,
          x: 24,
          y: 24,
          width: availableWidth,
          height: availableHeight
        };
      })
    );
    focusWindow(id);
  };

  const taskbarItems = useMemo(
    () => windows.map((windowEntry) => ({
      ...windowEntry,
      icon: START_APPS.find((app) => app.slug === windowEntry.slug)?.icon ?? "dashboard"
    })),
    [windows]
  );

  const activeWindows = [...windows].sort((a, b) => a.z - b.z);
  const openAppCount = windows.filter((w) => !w.minimized).length;

  const restoreWindow = (id: string) => {
    setWindows((prev) =>
      prev.map((w) => (w.id === id ? { ...w, minimized: false, z: nextZ } : w))
    );
    setNextZ((z) => z + 1);
  };

  const startDrag = (event: React.PointerEvent<HTMLDivElement>, id: string) => {
    const windowEntry = windows.find((w) => w.id === id);
    if (!windowEntry || windowEntry.maximized) return;
    setDragState({
      id,
      offsetX: event.clientX - windowEntry.x,
      offsetY: event.clientY - windowEntry.y
    });
    focusWindow(id);
  };

  useEffect(() => {
    if (!dragState) return undefined;

    const handlePointerMove = (event: PointerEvent) => {
      setWindows((prev) =>
        prev.map((w) => {
          if (w.id !== dragState.id) return w;
          const nextX = Math.max(24, Math.min(event.clientX - dragState.offsetX, window.innerWidth - w.width - 24));
          const nextY = Math.max(24, Math.min(event.clientY - dragState.offsetY, window.innerHeight - w.height - 120));
          return { ...w, x: nextX, y: nextY };
        })
      );
    };

    const handlePointerUp = () => setDragState(null);

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [dragState]);

  const renderWindowContent = (windowEntry: WindowEntry) => {
    const screen = SCREEN_MAP[windowEntry.slug];
    if (!screen) {
      return <div className="p-6 text-slate-200">Unknown screen: {windowEntry.slug}</div>;
    }
    if (NATIVE_SCREEN_SLUGS.has(screen.slug)) {
      return (
        <AppScreen
          slug={screen.slug}
          title={screen.title}
          agentOnline={true}
          runtimeOnline={true}
          openWindow={openWindow}
        />
      );
    }
    return <ScreenView screen={screen} />;
  };

  return (
    <div className="desktop-shell relative min-h-screen overflow-hidden text-white">
      <div
        className="desktop-wallpaper absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: wallpaperReady ? `url(${wallpaperUrl})` : "none" }}
      />
      <div className="desktop-overlay absolute inset-0 bg-black/20 backdrop-blur-sm" />

      <div className="desktop-hero relative z-10 px-6 py-8 lg:px-10">
        <div className="max-w-5xl rounded-3xl border border-white/10 bg-black/40 p-8 shadow-[0_40px_120px_-30px_rgba(0,0,0,0.8)] backdrop-blur-3xl">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-sky-300/80">LeeWay OS</p>
              <h1 className="mt-3 text-4xl font-semibold tracking-tight text-white">A desktop shell for Agent Lee</h1>
              <p className="mt-3 max-w-2xl text-sm text-slate-300">Launch core OS screens, manage windows, and integrate runtime evidence directly from a single shell interface.</p>
            </div>
            <div className="rounded-3xl bg-white/5 px-5 py-4 text-right ring-1 ring-white/10 backdrop-blur-xl">
              <div className="text-[0.65rem] uppercase tracking-[0.35em] text-slate-400">Live status</div>
              <div className="mt-3 text-3xl font-semibold text-white">{formatTime(time)}</div>
              <div className="mt-1 text-sm text-slate-400">{time.toLocaleDateString()}</div>
            </div>
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {DEFAULT_SHORTCUTS.map((app) => (
              <button
                key={app.slug}
                onClick={() => openWindow(app.slug)}
                className="group rounded-3xl border border-white/10 bg-white/5 px-4 py-5 text-left transition hover:border-sky-400/40 hover:bg-white/10"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-sky-300 shadow-[0_10px_30px_-20px_rgba(56,189,248,0.75)] transition group-hover:bg-sky-400/20">
                  <span className="material-symbols-outlined text-2xl">{app.icon}</span>
                </div>
                <div className="mt-4">
                  <p className="text-base font-semibold text-white">{app.label}</p>
                  <p className="mt-1 text-sm text-slate-400">Open the {app.label} workspace</p>
                </div>
              </button>
            ))}
          </div>
          <div className="mt-8 rounded-3xl border border-white/10 bg-slate-950/70 p-6 shadow-xl shadow-black/20 backdrop-blur-xl">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-sky-300/80">Real stitch screens</p>
                <h2 className="mt-2 text-xl font-semibold text-white">Launch real OS surfaces</h2>
              </div>
              <p className="text-sm text-slate-400">Built from the exported Sketch/Stitch UI metadata.</p>
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {QUICK_LAUNCH_STITCH_SCREENS.map((screen) => (
                <button
                  key={screen.slug}
                  onClick={() => openWindow(screen.slug)}
                  className="rounded-3xl border border-white/10 bg-slate-900/80 px-4 py-4 text-left text-sm text-white transition hover:border-sky-400/40 hover:bg-sky-400/10"
                >
                  <div className="font-semibold">{screen.title}</div>
                  <div className="mt-1 text-slate-400">{screen.sourceDir}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <aside className={`start-menu ${startOpen ? "open" : ""} z-20`}>
        <div className="rounded-[32px] border border-white/10 bg-slate-950/95 p-5 shadow-2xl shadow-black/50 backdrop-blur-3xl">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-3xl bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Start</p>
              <h2 className="mt-3 text-xl font-semibold text-white">Launch apps, runtime tools, and Agent Lee experiences.</h2>
            </div>
            <div className="rounded-3xl bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Actions</p>
              <div className="mt-3 flex flex-col gap-3">
                <button
                  onClick={() => openWindow("agent_lee_interaction")}
                  className="rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 text-left text-sm text-white transition hover:border-sky-400/40 hover:bg-sky-400/10"
                >
                  <span className="font-semibold">Open Agent Lee</span>
                  <div className="mt-1 text-slate-400">Start a runtime-backed interaction session.</div>
                </button>
                <button
                  onClick={() => openWindow("evidence_center")}
                  className="rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 text-left text-sm text-white transition hover:border-sky-400/40 hover:bg-sky-400/10"
                >
                  <span className="font-semibold">Evidence Center</span>
                  <div className="mt-1 text-slate-400">View runtime receipts and security proofs.</div>
                </button>
              </div>
            </div>
          </div>
          <div className="mt-4 rounded-3xl bg-white/5 p-4">
            <p className="text-xs uppercase tracking-[0.35em] text-slate-400">OS Screens</p>
            <h3 className="mt-3 text-lg font-semibold text-white">Actual stitch screen collection</h3>
            <div className="mt-4 grid gap-3">
              {FEATURED_STITCH_SCREENS.map((screen) => (
                <button
                  key={screen.slug}
                  onClick={() => openWindow(screen.slug)}
                  className="rounded-3xl border border-white/10 bg-slate-900/80 px-4 py-3 text-left text-sm text-white transition hover:border-sky-400/40 hover:bg-sky-400/10"
                >
                  <div className="font-semibold">{screen.title}</div>
                  <div className="text-slate-400">{screen.sourceDir}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </aside>

      <div className="desktop-windows relative z-20">
        {activeWindows.map((windowEntry) => {
          const screen = SCREEN_MAP[windowEntry.slug];
          return (
            <div
              key={windowEntry.id}
              style={{
                zIndex: windowEntry.z,
                left: windowEntry.x,
                top: windowEntry.y,
                width: windowEntry.width,
                height: windowEntry.height
              }}
              className={`desktop-window ${windowEntry.minimized ? "desktop-window-minimized" : ""}`}
              onMouseDown={() => focusWindow(windowEntry.id)}
            >
              <div className="desktop-window-title">
                <div
                  className="desktop-window-title-drag"
                  onPointerDown={(event) => {
                    if ((event.target as HTMLElement).closest("button")) return;
                    startDrag(event, windowEntry.id);
                  }}
                  onDoubleClick={() => toggleMaximize(windowEntry.id)}
                >
                  <p className="font-semibold text-white">{windowEntry.title}</p>
                  <p className="text-xs text-slate-400">{screen?.sourceDir || "LeeWay OS"}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="desktop-window-button"
                    onClick={() => minimizeWindow(windowEntry.id)}
                    title="Minimize"
                  >
                    &#8722;
                  </button>
                  <button
                    type="button"
                    className="desktop-window-button"
                    onClick={() => toggleMaximize(windowEntry.id)}
                    title={windowEntry.maximized ? "Restore" : "Maximize"}
                  >
                    {windowEntry.maximized ? "❐" : "▢"}
                  </button>
                  <button
                    type="button"
                    className="desktop-window-button"
                    onClick={() => closeWindow(windowEntry.id)}
                    title="Close"
                  >
                    ×
                  </button>
                </div>
              </div>
              {!windowEntry.minimized && (
                <div className="desktop-window-body">
                  {renderWindowContent(windowEntry)}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="desktop-taskbar relative z-30 flex items-center justify-between px-4 py-3 shadow-[0_0_60px_#00000040]">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setStartOpen((open) => !open)}
            className="start-button flex items-center gap-2 rounded-3xl border border-white/10 bg-white/10 px-4 py-2 text-sm text-white transition hover:bg-white/15"
          >
            <span className="material-symbols-outlined">menu</span>
            Start
          </button>
          <div className="hidden items-center gap-3 text-sm text-slate-300 sm:flex">
            {DEFAULT_SHORTCUTS.slice(0, 4).map((app) => (
              <button
                key={app.slug}
                onClick={() => openWindow(app.slug)}
                className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-slate-200 transition hover:bg-white/10"
              >
                {app.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-3 text-sm text-slate-200">
          {taskbarItems.length > 0 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {taskbarItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => (item.minimized ? restoreWindow(item.id) : focusWindow(item.id))}
                  className={`flex items-center gap-2 rounded-2xl border px-3 py-2 text-slate-200 transition ${item.minimized ? "border-white/10 bg-white/5" : "border-sky-400 bg-sky-400/15"}`}
                  title={item.title}
                >
                  <span className="material-symbols-outlined">{item.icon}</span>
                  <span className="hidden sm:inline">{item.title}</span>
                </button>
              ))}
            </div>
          )}
          <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
            <span className="material-symbols-outlined">memory</span>
            <span>{openAppCount} open</span>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm">{formatTime(time)}</div>
        </div>
      </div>

      {notificationOpen && (
        <div className="fixed right-4 bottom-20 z-40 w-96 rounded-3xl border border-white/10 bg-slate-950/95 p-4 shadow-2xl backdrop-blur-xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm uppercase tracking-[0.35em] text-slate-400">Notifications</p>
              <p className="text-lg font-semibold text-white">Recent alerts</p>
            </div>
            <button onClick={() => setNotificationOpen(false)} className="text-slate-300 hover:text-white">×</button>
          </div>
          <div className="space-y-3">
            {[
              { title: "Runtime receipt created", description: "A new evidence receipt is available.", time: "Just now" },
              { title: "Agent Lee suggestion", description: "Review the new adaptation plan.", time: "2m ago" }
            ].map((notification) => (
              <div key={notification.title} className="rounded-3xl border border-white/10 bg-slate-900/80 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-white">{notification.title}</p>
                    <p className="mt-2 text-sm text-slate-400">{notification.description}</p>
                  </div>
                  <span className="text-xs text-slate-500">{notification.time}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {quickSettingsOpen && (
        <div className="fixed right-4 bottom-20 z-40 w-96 rounded-3xl border border-white/10 bg-slate-950/95 p-4 shadow-2xl backdrop-blur-xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm uppercase tracking-[0.35em] text-slate-400">Quick Settings</p>
              <p className="text-lg font-semibold text-white">Shell controls</p>
            </div>
            <button onClick={() => setQuickSettingsOpen(false)} className="text-slate-300 hover:text-white">×</button>
          </div>
          <div className="space-y-3">
            {[
              { label: "Dark mode", enabled: true },
              { label: "Auto-sync devices", enabled: false },
              { label: "Agent suggestions", enabled: true },
              { label: "Notifications", enabled: true }
            ].map((setting) => (
              <div key={setting.label} className="flex items-center justify-between rounded-3xl border border-white/10 bg-slate-900/80 px-4 py-3">
                <div>
                  <p className="font-semibold text-white">{setting.label}</p>
                  <p className="text-sm text-slate-400">{setting.enabled ? "Enabled" : "Disabled"}</p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${setting.enabled ? "bg-emerald-500/15 text-emerald-300" : "bg-white/10 text-slate-300"}`}>
                  {setting.enabled ? "ON" : "OFF"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
