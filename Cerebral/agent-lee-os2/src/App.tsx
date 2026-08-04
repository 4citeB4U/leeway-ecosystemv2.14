import {
    Activity,
    Code,
    Globe,
    Maximize2,
    Minimize2,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import RuntimeBridgeConsole from "./components/RuntimeBridgeConsole";
import { Screensaver } from "./components/Screensaver";
import SpiritualCanvas from "./components/SpiritualCanvas";
import TaskSpinePanel from "./components/TaskSpinePanel";
import TelemetryDashboard from "./components/TelemetryDashboard";
import { Window } from "./components/Window";

export default function App() {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [bootState, setBootState] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [theme, setTheme] = useState("atmospheric");
  const [openWindows, setOpenWindows] = useState<string[]>([]);
  const [spineOpen, setSpineOpen] = useState(false);

  const themes = ["atmospheric", "cyber", "minimal", "metallic"];

  const nextTheme = () => {
    setTheme((prev) => {
      const idx = themes.indexOf(prev);
      return themes[(idx + 1) % themes.length];
    });
  };

  const toggleWindow = (id: string) => {
    setOpenWindows((prev) =>
      prev.includes(id) ? prev.filter((w) => w !== id) : [...prev, id],
    );
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        setIsFullscreen(false);
      }
    }
  };

  useEffect(() => {
    let cancelled = false;

    fetch("/api/health")
      .then((res) => {
        if (!res.ok) throw new Error(`Health probe failed (${res.status})`);
        return res.json();
      })
      .catch(() => null)
      .finally(() => {
        if (!cancelled) setBootState("ready");
      });

    if (bootState === "loading") {
      // no-op here; render below
    }

    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Escape") {
        if (openWindows.length > 0) setOpenWindows([]);
      }
      if (e.key.toLowerCase() === "t") {
        nextTheme();
      }
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      cancelled = true;
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [openWindows]);

  if (bootState === "loading") {
    return <div className="boot-screen">Initializing Sovereign Systems...</div>;
  }

  if (bootState === "error") {
    return <div className="boot-screen error">Daemon Offline.</div>;
  }

  return (
    <main className="relative w-full h-screen overflow-hidden select-none">
      <AnimatePresence mode="wait">
        {theme === "atmospheric" && (
          <motion.div
            key="atmospheric"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 -z-40 pointer-events-none"
          >
            <div className="atmosphere absolute inset-0" />
          </motion.div>
        )}
        {theme === "cyber" && (
          <motion.div
            key="cyber"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 -z-10 pointer-events-none"
          >
            <div className="absolute inset-0 opacity-20 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-size-[100%_2px,3px_100%]" />
          </motion.div>
        )}
        {theme === "minimal" && (
          <motion.div
            key="minimal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 -z-20 pointer-events-none bg-zinc-900/50"
          />
        )}
      </AnimatePresence>

      {/* Adinkra Morphing Canvas Background */}
      <SpiritualCanvas />

      {/* Screensaver Content */}
      <Screensaver
        theme={theme}
        setTheme={setTheme}
        onNextTheme={nextTheme}
        isWindowOpen={openWindows.length > 0}
      />

      {/* Windows Layer */}
      <Window
        id="terminal"
        title="Agent Lee Terminal"
        isOpen={openWindows.includes("terminal")}
        onClose={() => toggleWindow("terminal")}
      >
        <div className="space-y-4 font-mono text-sm">
          <p className="text-green-500">
            agent-lee@mini-pc:~$ systemctl status vibes
          </p>
          <p className="text-white/60">
            ● vibes.service - Agent Lee Vibe Engine
          </p>
          <p className="text-white/60">
            {" "}
            Loaded: loaded (/etc/systemd/system/vibes.service; enabled; vendor
            preset: enabled)
          </p>
          <p className="text-white/60">
            {" "}
            Active: active (running) since Sun 2026-03-01 01:19:22 UTC; 21min
            ago
          </p>
          <p className="text-green-400"> Main PID: 420 (lee-engine)</p>
          <p className="text-white/40 mt-8 animate-pulse">_</p>
        </div>
      </Window>

      <Window
        id="browser"
        title="Web Explorer"
        isOpen={openWindows.includes("browser")}
        onClose={() => toggleWindow("browser")}
      >
        <div className="h-full flex flex-col items-center justify-center gap-6 text-center">
          <Globe className="w-16 h-16 text-blue-500 opacity-20" />
          <h3 className="text-2xl font-bold tracking-tight">
            Secure Browser Instance
          </h3>
          <p className="text-white/40 max-w-md">
            Browsing the track with Agent Lee. All connections are encrypted and
            rhythmic.
          </p>
          <div className="w-full max-w-md h-10 bg-white/5 rounded-full border border-white/10 flex items-center px-4 text-xs text-white/20">
            https://agent-lee.run.app/explorer
          </div>
        </div>
      </Window>

      <Window
        id="files"
        title="System Records"
        isOpen={openWindows.includes("files")}
        onClose={() => toggleWindow("files")}
      >
        <div className="grid grid-cols-4 gap-4">
          {[
            "Documents",
            "Downloads",
            "Music",
            "Pictures",
            "Videos",
            "Projects",
            "System",
            "Logs",
          ].map((folder) => (
            <div
              key={folder}
              className="flex flex-col items-center gap-2 p-4 rounded-xl hover:bg-white/5 transition-colors cursor-pointer group"
            >
              <div className="w-12 h-12 rounded-lg bg-yellow-500/20 flex items-center justify-center text-yellow-500 group-hover:scale-110 transition-transform">
                <Code className="w-6 h-6" />
              </div>
              <span className="text-[10px] uppercase tracking-widest text-white/40">
                {folder}
              </span>
            </div>
          ))}
        </div>
      </Window>

      <Window
        id="runtime"
        title="Runtime Bridge Console"
        icon={Activity}
        isOpen={openWindows.includes("runtime")}
        onClose={() => toggleWindow("runtime")}
      >
        <RuntimeBridgeConsole
          variant="full"
          enabled={openWindows.includes("runtime")}
        />
      </Window>

      {/* Utility Controls */}
      <div className="fixed bottom-6 right-6 z-100 flex items-center gap-4">
        <button
          onClick={() => toggleWindow("runtime")}
          className="p-3 bg-black/60 hover:bg-cyan-900/40 backdrop-blur-xl border border-white/10 hover:border-cyan-500/30 rounded-xl text-white/40 hover:text-cyan-300 transition-all cursor-pointer shadow-2xl"
          title="Runtime Bridge Console"
        >
          <Activity className="w-5 h-5" />
        </button>
        <button
          onClick={() => setSpineOpen(true)}
          className="p-3 bg-black/60 hover:bg-blue-900/40 backdrop-blur-xl border border-white/10 hover:border-blue-500/30 rounded-xl text-white/40 hover:text-blue-300 transition-all cursor-pointer shadow-2xl"
          title="Task Execution Spine"
        >
          <img
            src="/agent-lee-launch-button.svg"
            alt="Agent Lee Launch"
            className="w-5 h-5"
          />
        </button>
        <button
          onClick={toggleFullscreen}
          className="p-3 bg-black/60 hover:bg-white/10 backdrop-blur-xl border border-white/10 rounded-xl text-white/40 hover:text-white transition-all cursor-pointer shadow-2xl"
          title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
        >
          {isFullscreen ? (
            <Minimize2 className="w-5 h-5" />
          ) : (
            <Maximize2 className="w-5 h-5" />
          )}
        </button>
      </div>

      {/* Global Vignette */}
      <div className="fixed inset-0 pointer-events-none shadow-[inset_0_0_200px_rgba(0,0,0,0.8)] z-30" />

      {/* Telemetry Dashboard */}
      <TelemetryDashboard />

      <TaskSpinePanel
        open={spineOpen}
        onClose={() => setSpineOpen(false)}
        onOpenRuntimeConsole={() => toggleWindow("runtime")}
      />
    </main>
  );
}
