import {
  ChevronRight,
  Command,
  Menu,
  MessageSquare,
  Mic,
  Sparkles,
  Volume2,
  Video,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import React, { useEffect, useState } from "react";
import { cn } from "../lib/utils";
import {
  getSystemContext,
  getUser,
  getLocalVoiceStatus,
  sendAgentLeeMessage,
  setUser,
  setVoice,
  speakText,
  getSessionId,
  getHistory,
} from "../services/ai";
import { AgentLee3D } from "./AgentLee3D";
import { DiagnosticsSidebar } from "./DiagnosticsSidebar";

import { SHAPES, ShapeType } from "../types";

interface SystemStats {
  cpu: number;
  ram: number;
  disk: number;
  temp: number;
}

type AgentLeeUiState = "online" | "listening" | "thinking" | "speaking" | "error";
type LocalServiceStatus = {
  label: string;
  value: string;
  ok: boolean;
};
type AgentLeeTrace = {
  endpoint?: string;
  body?: unknown;
  status?: number;
  route?: string;
  agentId?: string;
  responseLength?: number;
};
type LocalDeploymentStatus = {
  id: string;
  name: string;
  type: string;
  active: boolean;
  services: string[];
};

export const Screensaver: React.FC<{
  theme: string;
  setTheme?: (t: string) => void;
  onNextTheme: () => void;
  isWindowOpen?: boolean;
}> = ({ theme, setTheme, onNextTheme, isWindowOpen }) => {
  const [stats, setStats] = useState<SystemStats>({
    cpu: 0,
    ram: 0,
    disk: 42,
    temp: 38,
  });
  const [isHovered, setIsHovered] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [weather, setWeather] = useState<string>("72°F Clear");
  const [traffic, setTraffic] = useState<string>("Smooth Flow");

  // Agent Lee State
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [currentShape, setCurrentShape] = useState<ShapeType>("sphere");
  const [leeColor, setLeeColor] = useState("#f97316");
  const [particleColor, setParticleColor] = useState("#06b6d4");
  const [isRemoteOpen, setIsRemoteOpen] = useState(false);
  const [isDiagnosticsOpen, setIsDiagnosticsOpen] = useState(false);
  const [isLaunching, setIsLaunching] = useState(false);
  const [isChatCollapsed, setIsChatCollapsed] = useState(true);
  const [showCamera, setShowCamera] = useState(false);
  const videoRef = React.useRef<HTMLVideoElement>(null);

  interface GeneratedMedia {
    type: "image" | "video";
    prompt: string;
    url: string;
    status: "idle" | "generating" | "success" | "error";
  }

  const [generatedMedia, setGeneratedMedia] = useState<GeneratedMedia>({
    type: "image",
    prompt: "",
    url: "",
    status: "idle"
  });

  const mediaCanvasRef = React.useRef<HTMLCanvasElement>(null);

  // Voice selection
  const [voices, setVoices] = useState<
    { id: string; label: string; language: string; source?: string; engine?: string; available?: boolean }[]
  >([]);
  const [selectedVoice, setSelectedVoiceState] = useState("agent-lee-local");
  const [voiceStatusText, setVoiceStatusText] = useState("Local voice status loading");
  const [localDeployment, setLocalDeployment] = useState<LocalDeploymentStatus | null>(null);
  const deploymentLabel = `${localDeployment?.name || "LeeWay Local Agent Lee"}: Active`;
  const deploymentServicesLabel = localDeployment?.services?.length
    ? localDeployment.services.join(" | ")
    : "Live local voice status unavailable";
  const [lastAgentTrace, setLastAgentTrace] = useState<AgentLeeTrace | null>(null);

  // User identity & onboarding
  const [userName, setUserName] = useState("");
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingInput, setOnboardingInput] = useState("");

  useEffect(() => {
    getLocalVoiceStatus()
      .then((data) => {
        if (data.deployment) {
          setLocalDeployment(data.deployment);
        }
        const truthfulVoices = data.tts?.voices?.length
          ? data.tts.voices
          : data.agentLeeVoice
            ? [data.agentLeeVoice]
            : [];
        const mappedVoices = truthfulVoices.map((voice) => ({
          id: voice.id,
          label: voice.label || voice.name || voice.id,
          language: voice.language || voice.source || "local",
          source: voice.source || "local",
          engine: voice.engine || data.tts?.engine || "local",
          available: voice.available ?? data.tts?.available ?? false,
        }));
        setVoices(mappedVoices);
        setSelectedVoiceState((current) =>
          mappedVoices.some((voice) => voice.id === current)
            ? current
            : mappedVoices[0]?.id || current,
        );
        setVoiceStatusText(
          data.tts?.available
            ? `Local TTS: ${data.tts.engine}`
            : "Local TTS unavailable; Agent Lee text remains active",
        );
      })
      .catch((error) => {
        setVoices([]);
        setVoiceStatusText(`Local voice status unavailable: ${error instanceof Error ? error.message : String(error)}`);
      });
  }, []);

  const startLocalRuntime = async () => {
    setIsLaunching(true);
    try {
      const resp = await fetch('/api/launcher/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ elevated: true }),
      });
      const data = await resp.json().catch(() => ({}));
      if (resp.ok && data.ok) {
        try { speakText('Starting local runtime. You may see a permission prompt.'); } catch {}
      } else {
        try { speakText('Failed to start local runtime. Check diagnostics.'); } catch {}
      }
    } catch (e) {
      try { speakText('Error starting runtime. See logs.'); } catch {}
    } finally {
      setIsLaunching(false);
    }
  };

  // Onboarding: ask for name on first launch
  useEffect(() => {
    const stored = localStorage.getItem("cerebral_user_name");
    if (stored) {
      setUserName(stored);
      return;
    }
    getUser()
      .then((d) => {
        if (d.name) {
          setUserName(d.name);
          localStorage.setItem("cerebral_user_name", d.name);
        } else {
          setShowOnboarding(true);
        }
      })
      .catch(() => setShowOnboarding(true));
  }, []);

  // Sync isSpeaking from real TTS events so animation matches audio exactly
  useEffect(() => {
    const es = new EventSource("/api/tts/events");
    es.onmessage = (e) => {
      try {
        const d = JSON.parse(e.data);
        if (d.event === "start") {
          setIsSpeaking(true);
          setAgentLeeState("speaking");
        } else if (d.event === "stop") {
          setIsSpeaking(false);
          setAgentLeeState("online");
        }
      } catch { }
    };
    es.onerror = () => { };
    return () => es.close();
  }, []);

  useEffect(() => {
    let cancelled = false;

    const probeJson = async (url: string, init?: RequestInit) => {
      try {
        const response = await fetch(url, init);
        const data = await response.json().catch(() => ({}));
        return { ok: response.ok, status: response.status, data };
      } catch (error) {
        return { ok: false, status: 0, data: { error: String(error) } };
      }
    };

    const refreshLocalStatuses = async () => {
      const patchStatuses = (updates: Array<{ label: string; value: string; ok: boolean }>) => {
        setLocalStatuses((current) => current.map((row) => {
          const match = updates.find((item) => item.label === row.label);
          return match ? { ...row, ...match } : row;
        }));
      };

      const deviceLocalPromise = probeJson("/api/device/local/status");
      const otherProbesPromise = Promise.all([
        probeJson("/api/health"),
        probeJson("/fabric/agent-lee/health"),
        probeJson("/fabric/runtime/health"),
        probeJson("/brain/health"),
        probeJson("/desktop/runtime/status"),
        probeJson("/ollama/api/tags"),
      ]);

      const deviceLocal = await deviceLocalPromise;
      if (cancelled) return;

      const deviceLocalValue = deviceLocal.ok ? "online" : "offline";
      const terminalFabricValue = typeof deviceLocal.data?.terminalFabric === "string"
        ? deviceLocal.data.terminalFabric
        : deviceLocal.ok
          ? "online"
          : "offline";
      const powerShellValue = deviceLocal.data?.powershell?.available ? `available ${deviceLocal.data?.powershell?.version || ""}`.trim() : "missing";
      const powerShell7Value = deviceLocal.data?.powershell7?.available ? `available ${deviceLocal.data?.powershell7?.version || ""}`.trim() : "unavailable";
      const wslUbuntuValue = deviceLocal.data?.wsl?.available
        ? (deviceLocal.data?.wsl?.ubuntu?.available ? "available" : "installed")
        : "unavailable";

      patchStatuses([
        {
          label: "Local Device Fabric",
          value: deviceLocalValue,
          ok: deviceLocal.ok,
        },
        {
          label: "Local Terminal Fabric",
          value: terminalFabricValue,
          ok: Boolean(deviceLocal.data?.terminalFabric === "online" || deviceLocal.data?.terminalFabricStatus),
        },
        {
          label: "Windows PowerShell",
          value: powerShellValue,
          ok: Boolean(deviceLocal.data?.powershell?.available),
        },
        {
          label: "PowerShell 7",
          value: powerShell7Value,
          ok: Boolean(deviceLocal.data?.powershell7?.available),
        },
        {
          label: "WSL Ubuntu",
          value: wslUbuntuValue,
          ok: Boolean(deviceLocal.data?.wsl?.available),
        },
      ]);

      const [daemon, agentLee, fabric, router, desktop, ollama] = await otherProbesPromise;
      if (cancelled) return;

      const routerValue =
        typeof router.data?.router === "string"
          ? router.data.router
          : router.ok
            ? "online"
            : "unknown";

      patchStatuses([
        { label: "Agent Lee", value: agentLee.ok ? "online" : "offline", ok: agentLee.ok },
        {
          label: "Runtime Fabric 4001",
          value: fabric.ok ? "online" : "offline",
          ok: fabric.ok,
        },
        {
          label: "CerebralDaemon 8765",
          value: daemon.ok ? "online" : "offline",
          ok: daemon.ok,
        },
        {
          label: "Router 8080",
          value: router.ok ? routerValue : "unknown",
          ok: router.ok,
        },
        {
          label: "Desktop 8091",
          value: desktop.ok ? "online" : "offline",
          ok: desktop.ok,
        },
        {
          label: "Ollama 11434",
          value: ollama.ok ? "online" : "offline",
          ok: ollama.ok,
        },
      ]);
    };

    refreshLocalStatuses();
    const timer = window.setInterval(refreshLocalStatuses, 30000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  const handleVoiceChange = async (voiceId: string) => {
    setSelectedVoiceState(voiceId);
    try {
      await setVoice(voiceId);
    } catch (e) {
      console.error("Failed to set voice:", e);
    }
  };

  const handleOnboardingSubmit = async () => {
    const name = onboardingInput.trim();
    if (!name) return;
    setUserName(name);
    localStorage.setItem("cerebral_user_name", name);
    setShowOnboarding(false);
    setOnboardingInput("");
    await setUser(name);
  };

  // Adinkra Background State
  const [adinkraConfig, setAdinkraConfig] = useState({
    shape: "OCTAGON",
    palette: "GOLDEN",
    speed: 1.5,
    density: 80,
    waveAmplitude: 20,
  });

  const colors = [
    { name: "Orange", value: "#f97316" },
    { name: "Cyan", value: "#06b6d4" },
    { name: "Emerald", value: "#10b981" },
    { name: "Purple", value: "#a855f7" },
    { name: "Rose", value: "#f43f5e" },
    { name: "Blue", value: "#3b82f6" },
  ];

  const ADINKRA_SHAPES = [
    "OCTAGON",
    "BUBBLES",
    "TRIANGLES",
    "SANKOFA_HEART",
    "BEAR",
    "WAVES",
  ];

  const cycleShape = () => {
    setCurrentShape((prev) => {
      const idx = SHAPES.indexOf(prev);
      return SHAPES[(idx + 1) % SHAPES.length];
    });
    // Also cycle the Adinkra background shape
    setAdinkraConfig((prev: any) => {
      const idx = ADINKRA_SHAPES.indexOf(prev.shape);
      const nextShape = ADINKRA_SHAPES[(idx + 1) % ADINKRA_SHAPES.length];
      queueMicrotask(() => {
        window.dispatchEvent(
          new CustomEvent("adinkra-config-update", {
            detail: { shape: nextShape },
          }),
        );
      });
      return { ...prev, shape: nextShape };
    });
  };

  // Recognition ref to allow push-to-talk toggle
  const recognitionRef = React.useRef<any | null>(null);
  const transcriptRef = React.useRef<string>("");
  const [chatText, setChatText] = useState("");
  const [messages, setMessages] = useState<
    Array<{ id: string; role: "user" | "assistant"; text: string; ts: number }>
  >([]);
  const [agentLeeState, setAgentLeeState] = useState<AgentLeeUiState>("online");
  const [localStatuses, setLocalStatuses] = useState<LocalServiceStatus[]>([
    { label: "Agent Lee", value: "checking", ok: false },
    { label: "Runtime Fabric 4001", value: "checking", ok: false },
    { label: "Local Device Fabric", value: "checking", ok: false },
    { label: "Local Terminal Fabric", value: "checking", ok: false },
    { label: "Windows PowerShell", value: "checking", ok: false },
    { label: "PowerShell 7", value: "checking", ok: false },
    { label: "WSL Ubuntu", value: "checking", ok: false },
    { label: "CerebralDaemon 8765", value: "checking", ok: false },
    { label: "Router 8080", value: "checking", ok: false },
    { label: "Desktop 8091", value: "checking", ok: false },
    { label: "Ollama 11434", value: "checking", ok: false },
  ]);
  const [spiritualShapes, setSpiritualShapes] = useState<any[]>([]);
  const [animationFrameId, setAnimationFrameId] = useState<number | null>(null);
  const [isRecording, setIsRecording] = useState(false);

  const startGenerativeAnimation = (type: "image" | "video", prompt: string) => {
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
      setAnimationFrameId(null);
    }

    const canvas = mediaCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    const lower = prompt.toLowerCase();
    let palette = ["#00ffff", "#ff00ff", "#ff3366", "#0a192f"];
    if (lower.includes("fire") || lower.includes("lava") || lower.includes("sun") || lower.includes("hot") || lower.includes("red") || lower.includes("orange")) {
      palette = ["#FF4500", "#FF8C00", "#FF0000", "#8B0000", "#0d0202"];
    } else if (lower.includes("ocean") || lower.includes("water") || lower.includes("sea") || lower.includes("blue") || lower.includes("cold") || lower.includes("ice") || lower.includes("teal")) {
      palette = ["#00CED1", "#4682B4", "#0000FF", "#191970", "#020b1c"];
    } else if (lower.includes("forest") || lower.includes("nature") || lower.includes("green") || lower.includes("grass") || lower.includes("leaf") || lower.includes("jungle")) {
      palette = ["#00FF00", "#10B981", "#047857", "#064E3B", "#011c14"];
    } else if (lower.includes("space") || lower.includes("star") || lower.includes("cosmic") || lower.includes("galaxy") || lower.includes("purple") || lower.includes("nebula") || lower.includes("universe")) {
      palette = ["#8A2BE2", "#9400D3", "#4B0082", "#E6E6FA", "#06010d"];
    }

    let time = 0;
    const particles: any[] = [];
    for (let i = 0; i < 120; i++) {
      particles.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 1.5,
        vy: (Math.random() - 0.5) * 1.5,
        radius: Math.random() * 2.5 + 1,
        color: palette[Math.floor(Math.random() * 3)]
      });
    }

    const drawFrame = () => {
      time += 0.035;
      ctx.fillStyle = palette[4] || palette[palette.length - 1] || "#090d16";
      ctx.fillRect(0, 0, w, h);

      const grad = ctx.createRadialGradient(w/2, h/2, 20 + Math.sin(time) * 10, w/2, h/2, w/2);
      grad.addColorStop(0, palette[0] + "22");
      grad.addColorStop(0.5, palette[1] + "11");
      grad.addColorStop(1, "transparent");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      ctx.strokeStyle = palette[2];
      ctx.shadowColor = palette[0];
      ctx.shadowBlur = 12;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      const numPoints = 80;
      for (let i = 0; i < numPoints; i++) {
        const angle = (i / numPoints) * Math.PI * 2;
        const wave = Math.sin(angle * 8 + time * 3) * 12 + Math.cos(angle * 12 - time * 2) * 6;
        const radius = Math.min(w, h) * 0.28 + wave;
        const x = w/2 + Math.cos(angle) * radius;
        const y = h/2 + Math.sin(angle) * radius;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.stroke();
      ctx.shadowBlur = 0;

      particles.forEach((p, idx) => {
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0 || p.x > w) p.vx *= -1;
        if (p.y < 0 || p.y > h) p.vy *= -1;

        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();

        for (let j = idx + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dist = Math.hypot(p.x - p2.x, p.y - p2.y);
          if (dist < 60) {
            ctx.strokeStyle = `rgba(255, 255, 255, ${(1 - dist/60) * 0.25})`;
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
          }
        }
      });

      ctx.fillStyle = "rgba(255, 255, 255, 0.35)";
      ctx.font = "9px monospace";
      ctx.textAlign = "left";
      ctx.fillText(`PROMPT: ${prompt.toUpperCase()}`, 20, 30);
      ctx.fillText(`RENDERER: AGENT LEE ENGINE V2`, 20, 45);
      ctx.fillText(`FPS: 60 | TRACE: PASS`, 20, 60);

      ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
      ctx.font = "bold 16px Segoe UI, Arial, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(`AGENT LEE PRIME GENERATION: "${prompt.toUpperCase()}"`, w / 2, h - 25);

      if (type === "video") {
        const frameId = requestAnimationFrame(drawFrame);
        setAnimationFrameId(frameId);
      }
    };

    if (type === "video") {
      drawFrame();
      setGeneratedMedia({
        type,
        prompt,
        url: "canvas-live",
        status: "success"
      });
    } else {
      drawFrame();
      const dataUrl = canvas.toDataURL("image/png");
      setGeneratedMedia({
        type,
        prompt,
        url: dataUrl,
        status: "success"
      });
    }
  };

  const triggerMediaGeneration = (type: "image" | "video", prompt: string) => {
    setGeneratedMedia({
      type,
      prompt,
      url: "",
      status: "generating"
    });

    setTimeout(() => {
      startGenerativeAnimation(type, prompt);
    }, 1800);
  };

  const downloadVideo = () => {
    const canvas = mediaCanvasRef.current;
    if (!canvas) return;

    setIsRecording(true);
    const chunks: Blob[] = [];
    // @ts-ignore
    const stream = canvas.captureStream(30);
    const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });

    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) {
        chunks.push(e.data);
      }
    };

    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${generatedMedia.prompt.replace(/[^a-z0-9]/gi, '_')}.webm`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setIsRecording(false);
    };

    recorder.start();
    setTimeout(() => {
      recorder.stop();
    }, 4000);
  };

  const speakAgentLeeResponse = async (text: string) => {
    try {
      await speakText(text);
    } catch (error) {
      const synth = window.speechSynthesis;
      if (!synth) throw error;
      synth.cancel();
      synth.speak(new SpeechSynthesisUtterance(text));
    }
  };

  // LEEWAY SINGLE BRAIN LAW: Execute UI tool calls returned by Agent Lee Prime
  const handleUIExecution = (tool: any) => {
    try {
      const name = tool.name || tool.toolName || (tool.function && tool.function.name);
      const argsRaw = tool.arguments || tool.args || (tool.function && tool.function.arguments);
      const args = typeof argsRaw === "string" ? JSON.parse(argsRaw) : (argsRaw || {});
      console.log("[Cerebral UI Tool]", name, args);
      if (name === "change_background" || name === "change_theme") {
        if (setTheme && args.theme) setTheme(args.theme);
      } else if (name === "change_ui_color" || name === "change_theme_color") {
        if (args.color) {
          setLeeColor(args.color);
          // Let's set a beautiful complementary color for particles
          const hex = args.color.replace("#", "");
          const r = parseInt(hex.substring(0,2), 16);
          const g = parseInt(hex.substring(2,4), 16);
          const b = parseInt(hex.substring(4,6), 16);
          const compColor = `rgb(${255 - r}, ${255 - g}, ${255 - b})`;
          setParticleColor(compColor);
        }
      } else if (name === "change_shape") {
        if (args.shape) setCurrentShape(args.shape as ShapeType);
      } else if (name === "toggle_camera" || name === "open_camera" || name === "activate_vision") {
        setShowCamera(true);
      } else if (name === "close_camera" || name === "deactivate_vision") {
        setShowCamera(false);
      } else if (name === "create_image" || name === "generate_image") {
        const prompt = args.prompt || args.query || "generative digital art";
        triggerMediaGeneration("image", prompt);
      } else if (name === "create_video" || name === "generate_video") {
        const prompt = args.prompt || args.query || "generative video loop";
        triggerMediaGeneration("video", prompt);
      }
    } catch (err) {
      console.error("[Cerebral UI Tool] Error:", err);
    }
  };

  const sendToAgentLee = async (text: string, asstId: string, speak = true) => {
    setAgentLeeState("thinking");
    try {
      const data = await sendAgentLeeMessage(text, speak);
      if (data.trace) {
        setLastAgentTrace(data.trace);
      }
      const responseText = data.response || "Agent Lee returned no response text.";
      setMessages((m) =>
        m.map((msg) =>
          msg.id === asstId ? { ...msg, text: responseText } : msg,
        ),
      );
      // Execute any UI tool calls Agent Lee Prime returned
      if (Array.isArray(data.tools) && data.tools.length > 0) {
        data.tools.forEach(handleUIExecution);
      }

      if (speak) {
        setAgentLeeState("speaking");
        await speakAgentLeeResponse(responseText);
      }

      setAgentLeeState("online");
      return responseText;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setMessages((m) =>
        m.map((msg) =>
          msg.id === asstId
            ? { ...msg, text: `Agent Lee service failure: ${message}` }
            : msg,
        ),
      );
      setIsSpeaking(false);
      setAgentLeeState("error");
      throw error;
    }
  };

  const handleVoiceInput = async (transcript: string) => {
    setIsListening(false);
    setAgentLeeState("thinking");
    cycleShape();
    setIsChatCollapsed(false);

    const lower = transcript.toLowerCase();
    if (
      lower.includes("do you see me") ||
      lower.includes("open camera") ||
      lower.includes("turn on camera") ||
      lower.includes("activate vision") ||
      lower.includes("look at this") ||
      lower.includes("what am i holding") ||
      lower.includes("what do you see") ||
      lower.includes("describe my background") ||
      lower.includes("what's behind me") ||
      lower.includes("what is behind me")
    ) {
      setShowCamera(true);
    } else if (
      lower.includes("close camera") ||
      lower.includes("hide camera") ||
      lower.includes("turn off camera")
    ) {
      setShowCamera(false);
    }

    const id = String(Date.now());
    setMessages((m) => [
      ...m,
      { id, role: "user", text: transcript, ts: Date.now() },
    ]);

    // Add thinking placeholder immediately so the user sees activity
    const asstId = String(Date.now() + 1);
    setMessages((m) => [
      ...m,
      { id: asstId, role: "assistant", text: "...", ts: Date.now() },
    ]);

    try {
      setIsSpeaking(true);
      await sendToAgentLee(transcript, asstId, true);
    } catch (error) {
      console.error(error);
      setIsSpeaking(false);
    }
  };

  const captureLocalVoice = async () => {
    if (isListening || agentLeeState === "thinking") return;

    setIsListening(true);
    setAgentLeeState("listening");
    setIsChatCollapsed(false);
    cycleShape();

    const asstId = String(Date.now() + 1);
    const transcribingTimer = window.setTimeout(() => {
      setAgentLeeState("listening");
      setMessages((m) =>
        m.map((msg) =>
          msg.id === asstId
            ? { ...msg, text: "Agent Lee transcribing local microphone audio..." }
            : msg,
        ),
      );
    }, 5200);
    setMessages((m) => [
      ...m,
      {
        id: asstId,
        role: "assistant",
        text: "Agent Lee listening through local system microphone...",
        ts: Date.now(),
      },
    ]);

    try {
      const response = await fetch("/api/local-voice/agent-lee-capture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seconds: 5, speak: true, sessionId: getSessionId(), history: getHistory() }),
      });
      const data = await response.json().catch(() => ({}));
      const transcript = String(data.transcript || "").trim();

      if (!response.ok || data.ok === false) {
        const backendError = data.error || `HTTP_${response.status}`;
        const backendMessage = data.message || `Local voice route failed (${response.status})`;
        throw new Error(`${backendError}: ${backendMessage}`);
      }

      if (!transcript) {
        throw new Error("LOCAL_ASR_FAILED: Local ASR returned no transcript");
      }

      setAgentLeeState("thinking");
      cycleShape();
      setIsChatCollapsed(false);

      setMessages((m) => [
        ...m.filter((msg) => msg.id !== asstId),
        {
          id: `${asstId}-u`,
          role: "user",
          text: transcript,
          ts: Date.now(),
        },
        {
          id: asstId,
          role: "assistant",
          text: data.response || "Agent Lee returned no response text.",
          ts: Date.now(),
        },
      ]);
      setAgentLeeState(data.speak ? "speaking" : "online");
      setIsSpeaking(Boolean(data.speak));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setMessages((m) =>
        m.map((msg) =>
          msg.id === asstId
            ? {
                ...msg,
                text: message.startsWith("LOCAL_ASR_FAILED")
                  ? message
                  : `Local voice failure: ${message}`,
              }
            : msg,
        ),
      );
      setAgentLeeState("error");
      setIsSpeaking(false);
    } finally {
      window.clearTimeout(transcribingTimer);
      setIsListening(false);
    }
  };

  // Global custom event for cross-component voice commands (e.g. from Remote Control panel)
  React.useEffect(() => {
    const handleVoiceEvent = (e: any) => {
      if (e.detail) handleVoiceInput(e.detail);
    };
    window.addEventListener("voice-command", handleVoiceEvent);
    return () => window.removeEventListener("voice-command", handleVoiceEvent);
  }, []);

  // Initialize a persistent recognition instance on mount to reduce startup lag
  React.useEffect(() => {
    if (!("webkitSpeechRecognition" in window)) return;
    const Rec = (window as any).webkitSpeechRecognition;
    const rec = new Rec();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "en-US";

    rec.onstart = () => {
      rec.listening = true;
      setIsListening(true);
      setAgentLeeState("listening");
    };

    rec.onend = () => {
      // When recognition ends (either user stopped or aborted), finalize transcript
      setIsListening(false);
      rec.listening = false;
      const t = transcriptRef.current || "";
      transcriptRef.current = "";
      if (t.trim().length > 0) {
        handleVoiceInput(t.trim());
      } else {
        setAgentLeeState("online");
      }
    };

    rec.onresult = (event: any) => {
      let finalT = "";
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const r = event.results[i];
        if (r.isFinal) finalT += r[0].transcript;
      }
      if (finalT)
        transcriptRef.current = (transcriptRef.current || "") + finalT;
    };

    rec.onerror = (event: any) => {
      console.warn("[Speech] error:", event.error);
      rec.listening = false;
      setIsListening(false);
      setAgentLeeState("error");
      if (
        event.error === "not-allowed" ||
        event.error === "service-not-allowed"
      ) {
        alert(
          "Microphone permission denied. Please allow mic access and try again.",
        );
      }
    };

    recognitionRef.current = rec;

    return () => {
      try {
        rec.onresult = null;
        rec.onstart = null;
        rec.onend = null;
        rec.stop && rec.stop();
      } catch (e) { }
      recognitionRef.current = null;
    };
  }, []);

  const toggleListening = () => {
    captureLocalVoice();
    return;

    if (!recognitionRef.current) {
      alert("Speech recognition not supported.");
      return;
    }

    const rec = recognitionRef.current;
    if (rec.listening) {
      // stop and flush
      try {
        rec.stop();
      } catch (e) {
        try {
          rec.abort();
        } catch (e) { }
      }
      // onend handler will call handleVoiceInput with transcript
      return;
    }

    // Start quickly
    transcriptRef.current = "";
    try {
      rec.start();
    } catch (e) {
      // if start fails because already started, ignore
      console.warn("recognition start failed", e);
      setAgentLeeState("error");
    }
  };

  const sendText = async () => {
    const t = chatText.trim();
    if (!t) return;
    setChatText("");
    setIsChatCollapsed(false);

    const lower = t.toLowerCase();
    if (
      lower.includes("do you see me") ||
      lower.includes("open camera") ||
      lower.includes("turn on camera") ||
      lower.includes("activate vision") ||
      lower.includes("look at this") ||
      lower.includes("what am i holding") ||
      lower.includes("what do you see") ||
      lower.includes("describe my background") ||
      lower.includes("what's behind me") ||
      lower.includes("what is behind me")
    ) {
      setShowCamera(true);
    } else if (
      lower.includes("close camera") ||
      lower.includes("hide camera") ||
      lower.includes("turn off camera")
    ) {
      setShowCamera(false);
    }

    const id = String(Date.now());
    setMessages((m) => [...m, { id, role: "user", text: t, ts: Date.now() }]);

    // Add thinking placeholder immediately
    const asstId = String(Date.now() + 1);
    setMessages((m) => [
      ...m,
      { id: asstId, role: "assistant", text: "...", ts: Date.now() },
    ]);

    try {
      setIsSpeaking(false);
      await sendToAgentLee(t, asstId, true);
    } catch (e) {
      console.error(e);
      setIsSpeaking(false);
    }
  };

  useEffect(() => {
    let shapesTimer: any = null;
    const fetchShapes = () => {
      try {
        // @ts-ignore
        const s =
          (window as any).spiritualGetShapes &&
          (window as any).spiritualGetShapes();
        if (s && Array.isArray(s)) setSpiritualShapes(s);
      } catch (e) { }
    };
    fetchShapes();
    shapesTimer = setInterval(fetchShapes, 2000);
    const fetchContext = async () => {
      try {
        const context = await getSystemContext();
        setWeather(context.weather);
        setTraffic(context.traffic);
      } catch (e) {
        console.error("Failed to fetch vibes", e);
      }
    };
    fetchContext();
    const contextTimer = setInterval(fetchContext, 600000); // Every 10 mins

    const adinkraSync = (e: any) =>
      setAdinkraConfig({ ...adinkraConfig, ...e.detail });
    window.addEventListener("adinkra-config-sync", adinkraSync);

    return () => {
      clearInterval(contextTimer);
      window.removeEventListener("adinkra-config-sync", adinkraSync);
    };
  }, []);

  useEffect(() => {
    let stream: MediaStream | null = null;
    if (showCamera) {
      navigator.mediaDevices
        .getUserMedia({ video: true })
        .then((s) => {
          stream = s;
          if (videoRef.current) videoRef.current.srcObject = s;
        })
        .catch((e) => console.error("Camera error:", e));
    } else {
      if (videoRef.current && videoRef.current.srcObject) {
        const s = videoRef.current.srcObject as MediaStream;
        s.getTracks().forEach((t) => t.stop());
        videoRef.current.srcObject = null;
      }
    }
    return () => {
      if (stream) stream.getTracks().forEach((t) => t.stop());
    };
  }, [showCamera]);

  const updateAdinkra = (updates: any) => {
    const nextConfig = { ...adinkraConfig, ...updates };
    setAdinkraConfig(nextConfig);
    queueMicrotask(() => {
      window.dispatchEvent(
        new CustomEvent("adinkra-config-update", { detail: updates }),
      );
    });
  };

  useEffect(() => {
    const fetchTelemetry = async () => {
      try {
        const res = await fetch("/api/telemetry");
        const data = await res.json();
        const ramPct = data.ram_total
          ? Math.round((data.ram_used / data.ram_total) * 100)
          : 0;
        setStats({
          cpu: Math.round(data.cpu_percent ?? 0),
          ram: ramPct,
          disk: data.disk_percent ?? 42,
          temp: data.cpu_temp ?? 38,
        });
      } catch {
        /* keep existing stats on failure */
      }
      setCurrentTime(new Date());
    };
    fetchTelemetry();
    const timer = setInterval(fetchTelemetry, 2000);
    return () => clearInterval(timer);
  }, []);

  // Automatic Morphing & Color Cycling
  useEffect(() => {
    const interval = setInterval(() => {
      if (!isSpeaking && !isListening) {
        cycleShape();
        const availableColors = colors.map((c) => c.value);
        const randomCore =
          availableColors[Math.floor(Math.random() * availableColors.length)];
        let randomParticle =
          availableColors[Math.floor(Math.random() * availableColors.length)];

        // Ensure they are different if possible
        if (randomParticle === randomCore && availableColors.length > 1) {
          randomParticle =
            availableColors.find((c) => c !== randomCore) || randomParticle;
        }

        setLeeColor(randomCore);
        setParticleColor(randomParticle);
      }
    }, 8000); // Faster cycle for "automatic" feel
    return () => clearInterval(interval);
  }, [isSpeaking, isListening]);

  const updateSpiritualShape = (index: number, opts: any) => {
    try {
      // @ts-ignore
      (window as any).spiritualSetShapeOptions &&
        (window as any).spiritualSetShapeOptions(index, opts);
      // refresh local cache
      // @ts-ignore
      const s =
        (window as any).spiritualGetShapes &&
        (window as any).spiritualGetShapes();
      if (s && Array.isArray(s)) setSpiritualShapes(s);
    } catch (e) { }
  };

  return (
    <div
      className="relative w-full h-screen overflow-hidden bg-transparent"
      onMouseMove={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <DiagnosticsSidebar
        forcedOpen={isDiagnosticsOpen}
        onStateChange={setIsDiagnosticsOpen}
      />

      {/* Identity Onboarding Modal */}
      {showOnboarding && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-md">
          <div className="bg-black/90 border border-orange-500/30 rounded-3xl p-8 w-96 flex flex-col gap-6 text-center shadow-2xl">
            <h2 className="text-white text-xl font-mono tracking-widest">
              Identity Required
            </h2>
            <p className="text-white/60 text-sm font-mono leading-relaxed">
              I have not yet learned your name.
              <br />
              What shall I call you, Operator?
            </p>
            <input
              value={onboardingInput}
              onChange={(e) => setOnboardingInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleOnboardingSubmit()}
              className="px-4 py-3 bg-black/60 border border-white/20 rounded-xl text-white font-mono focus:outline-none focus:ring-2 focus:ring-orange-500 placeholder-white/30"
              placeholder="Your name..."
              autoFocus
            />
            <button
              onClick={handleOnboardingSubmit}
              className="px-6 py-3 bg-orange-600 hover:bg-orange-500 transition-colors text-white rounded-xl font-mono tracking-widest uppercase text-sm"
            >
              Establish Identity
            </button>
          </div>
        </div>
      )}

      {/* Floating Camera View */}
      <AnimatePresence>
        {showCamera && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: -20 }}
            className="fixed top-24 left-1/2 -translate-x-1/2 z-[90] w-72 h-48 bg-black/50 backdrop-blur-md border hover:border-orange-500 border-white/10 transition-colors rounded-2xl overflow-hidden shadow-2xl pointer-events-auto"
          >
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover scale-x-[-1]"
            />
            <div className="absolute top-3 left-3 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-[10px] uppercase tracking-widest text-white font-bold px-1 py-0.5 rounded bg-black/40 backdrop-blur-sm">
                Vision Active
              </span>
            </div>
            <button
              onClick={() => setShowCamera(false)}
              className="absolute top-2 right-2 text-white/50 hover:text-white bg-black/50 rounded-full w-6 h-6 flex items-center justify-center text-xs backdrop-blur-sm transition-all hover:bg-red-500"
            >
              ✕
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top UI Layer: Unified Toggles */}
      <div className="fixed top-6 left-6 right-6 z-[100] flex items-center justify-between pointer-events-none">
        <button
          onClick={() => setIsDiagnosticsOpen(!isDiagnosticsOpen)}
          className={cn(
            "p-3 rounded-xl border backdrop-blur-2xl transition-all shadow-2xl pointer-events-auto flex items-center justify-center",
            isDiagnosticsOpen
              ? "bg-orange-600 border-orange-500 text-white"
              : "bg-black/60 border-white/10 text-white/60 hover:text-white hover:bg-orange-600/20",
          )}
          title="Toggle Diagnostics"
        >
          <Menu size={24} />
        </button>

        <div className="flex items-center gap-2 pointer-events-auto">
          <button
            onClick={startLocalRuntime}
            disabled={isLaunching}
            className={cn(
              "px-4 py-2 rounded-xl border backdrop-blur-2xl transition-all shadow-2xl pointer-events-auto font-mono text-[11px]",
              isLaunching
                ? "bg-green-700 border-green-600 text-white/70"
                : "bg-black/60 border-white/10 text-white/60 hover:text-white hover:bg-green-600/20",
            )}
            title="Start local runtime (requires elevation)"
          >
            {isLaunching ? 'Starting…' : 'Launch Runtime'}
          </button>
        </div>

        <button
          onClick={() => setIsRemoteOpen(!isRemoteOpen)}
          className={cn(
            "p-3 rounded-xl border backdrop-blur-2xl transition-all shadow-2xl pointer-events-auto flex items-center justify-center",
            isRemoteOpen
              ? "bg-orange-600 border-orange-500 text-white"
              : "bg-black/60 border-white/10 text-white/60 hover:text-white hover:bg-orange-600/20",
          )}
          title="Toggle Remote Control"
        >
          <Menu size={24} />
        </button>
      </div>

      {/* Main Content */}
      <motion.div
        animate={{
          opacity: isWindowOpen ? 0.3 : 1,
        }}
        transition={{ type: "spring", damping: 25, stiffness: 150 }}
        className="relative z-10 h-full w-full flex items-center justify-between p-12 pointer-events-none"
      >
        {/* Left Side: Empty or subtle info (stats are in sidebar) */}
        <div className="flex flex-col gap-12 w-1/3 h-full justify-center">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-left"
          >
            <h1 className="text-[8vw] font-black leading-none tracking-tighter text-white/90 font-serif italic">
              {currentTime.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
                hour12: false,
              })}
            </h1>
            <p className="text-lg font-mono tracking-[0.3em] text-white/40 uppercase mt-2">
              {currentTime.toLocaleDateString([], {
                weekday: "long",
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </p>
          </motion.div>
        </div>

        {/* Center: Spacer */}
        <div className="w-1/3" />

        {/* Right Side: Remote Control & Interaction */}
        <div className="flex flex-col gap-8 w-1/3 h-full justify-center items-end pointer-events-none">
          {/* Remote Control Panel */}
          <motion.div
            initial={false}
            animate={{
              x: isRemoteOpen ? 0 : 400,
              opacity: isRemoteOpen ? 1 : 0,
            }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-3xl p-6 w-full max-w-xs flex flex-col gap-4 pointer-events-auto shadow-2xl overflow-y-auto max-h-[80vh] custom-scrollbar"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3 text-white/60">
                <Command className="w-5 h-5 text-orange-500" />
                <span className="text-xs font-mono uppercase tracking-[0.2em] font-bold">
                  Remote Control
                </span>
              </div>
              <button
                onClick={() => setIsRemoteOpen(false)}
                className="p-1 hover:bg-white/10 rounded-full transition-colors text-white/40 hover:text-white"
                title="Close Remote Control"
                aria-label="Close Remote Control"
              >
                <ChevronRight size={18} />
              </button>
            </div>

            <div className="flex flex-col gap-2">
              <div className="text-[8px] font-mono text-white/30 uppercase tracking-widest mb-1">
                Core Color
              </div>
              <input
                type="color"
                value={leeColor}
                onChange={(e) => setLeeColor(e.target.value)}
                className="w-full h-8 p-0 border-0 bg-transparent rounded cursor-pointer"
                title="Select Core Color"
              />
            </div>

            {/* Adinkra Background Controls */}
            <div className="mt-4">
              <div className="text-[10px] font-mono text-white/60 uppercase mb-3">
                Adinkra Canvas Controls
              </div>
              <div className="flex flex-col gap-3 p-3 bg-white/5 rounded-xl">
                <div className="flex gap-2 text-xs items-center justify-between">
                  <span className="text-white/60">Shape</span>
                  <select
                    value={adinkraConfig.shape}
                    onChange={(e) => updateAdinkra({ shape: e.target.value })}
                    className="bg-black/50 text-white p-1 rounded border border-white/20 text-xs focus:outline-none"
                  >
                    <option value="OCTAGON">Octagon</option>
                    <option value="BUBBLES">Bubbles</option>
                    <option value="TRIANGLES">Triangles</option>
                    <option value="SANKOFA_HEART">Sankofa Heart</option>
                    <option value="BEAR">Adinkra Bear</option>
                    <option value="WAVES">Waves</option>
                  </select>
                </div>
                <div className="flex gap-2 text-xs items-center justify-between">
                  <span className="text-white/60">Palette</span>
                  <select
                    value={adinkraConfig.palette}
                    onChange={(e) => updateAdinkra({ palette: e.target.value })}
                    className="bg-black/50 text-white p-1 rounded border border-white/20 text-xs focus:outline-none"
                  >
                    <option value="GOLDEN">Golden / Earth</option>
                    <option value="ROYAL">Royal Purple</option>
                    <option value="FIRE">Inferno</option>
                    <option value="OCEAN">Deep Ocean</option>
                    <option value="NEON">Cyber Neon</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between text-xs text-white/40">
                    <span>Speed</span>
                    <span>{Number(adinkraConfig.speed).toFixed(1)}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="5"
                    step="0.1"
                    value={adinkraConfig.speed}
                    onChange={(e) =>
                      updateAdinkra({ speed: Number(e.target.value) })
                    }
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between text-xs text-white/40">
                    <span>Cell Density</span>
                    <span>{adinkraConfig.density}px</span>
                  </div>
                  <input
                    type="range"
                    min="20"
                    max="200"
                    step="5"
                    value={adinkraConfig.density}
                    onChange={(e) =>
                      updateAdinkra({ density: Number(e.target.value) })
                    }
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between text-xs text-white/40">
                    <span>Wave Intense</span>
                    <span>{adinkraConfig.waveAmplitude}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={adinkraConfig.waveAmplitude}
                    onChange={(e) =>
                      updateAdinkra({ waveAmplitude: Number(e.target.value) })
                    }
                  />
                </div>
              </div>
            </div>

            {/* Spiritual shapes controls */}
            <div className="mt-3">
              <div className="text-[10px] font-mono text-white/60 uppercase mb-2">
                Spiritual Shapes
              </div>
              <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto custom-scrollbar">
                {spiritualShapes.length === 0 && (
                  <div className="text-xs text-white/40">
                    No shapes available
                  </div>
                )}
                {spiritualShapes.map((s: any) => (
                  <div
                    key={s.index}
                    className="flex items-center gap-2 p-2 bg-white/3 rounded"
                  >
                    <div className="flex-1">
                      <div className="text-sm font-bold">{s.name}</div>
                      <div className="text-[10px] text-white/40">
                        {s.meaning}
                      </div>
                    </div>
                    <input
                      type="color"
                      defaultValue={s.color}
                      onChange={(e) =>
                        updateSpiritualShape(s.index, { color: e.target.value })
                      }
                      title="Set color"
                    />
                    <button
                      onClick={() =>
                        updateSpiritualShape(s.index, {
                          enabled: !(s.enabled === false),
                        })
                      }
                      className={cn(
                        "px-2 py-1 rounded text-xs",
                        s.enabled === false ? "bg-red-600" : "bg-green-600",
                      )}
                    >
                      {s.enabled === false ? "Off" : "On"}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <div className="text-[8px] font-mono text-white/30 uppercase tracking-widest mb-1">
                Particle Color
              </div>
              <input
                type="color"
                value={particleColor}
                onChange={(e) => setParticleColor(e.target.value)}
                className="w-full h-8 p-0 border-0 bg-transparent rounded cursor-pointer"
                title="Select Particle Color"
              />
            </div>

            {/* Voice Selection */}
            <div className="flex flex-col gap-2 mt-2">
              <div className="text-[8px] font-mono text-white/30 uppercase tracking-widest mb-1 flex items-center gap-1">
                <Volume2 className="w-3 h-3 text-orange-400" />
                Local Agent Lee Voice
              </div>
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2">
                <div className="text-[10px] font-mono font-bold uppercase tracking-widest text-emerald-300">
                  {deploymentLabel}
                </div>
                <div className="mt-1 text-[10px] text-white/45">
                  {deploymentServicesLabel}
                </div>
              </div>
              {voices.length === 0 ? (
                <div className="text-xs text-white/30 italic">
                  {voiceStatusText}
                </div>
              ) : (
                <div className="flex flex-col gap-1">
                  {voices.map((v) => (
                    <button
                      key={v.id}
                      onClick={() => handleVoiceChange(v.id)}
                      disabled={!v.available}
                      className={cn(
                        "w-full text-left px-3 py-2 rounded-lg text-xs font-mono transition-all border",
                        selectedVoice === v.id
                          ? "bg-orange-600/30 border-orange-500 text-orange-300"
                          : "bg-white/5 border-white/10 text-white/60 hover:bg-white/10 hover:text-white",
                        !v.available && "cursor-not-allowed opacity-50",
                      )}
                    >
                      <div className="font-semibold">{v.label}</div>
                      <div className="text-[10px] opacity-60">
                        {v.source || "local"} · {v.engine || "local"} · {v.available ? "available" : "unavailable"}
                      </div>
                    </button>
                  ))}
                  <div className="text-[10px] text-white/35">{voiceStatusText}</div>
                </div>
              )}
            </div>
          </motion.div>

          {/* Interaction UI */}
          <div className="flex flex-col items-end gap-4 relative z-20 pointer-events-auto">
            <div className="flex gap-4">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsChatCollapsed(!isChatCollapsed)}
                className={cn(
                  "p-6 rounded-full transition-all shadow-2xl",
                  !isChatCollapsed
                    ? "bg-orange-600 text-white"
                    : "bg-white/10 text-white/40 hover:bg-white/20",
                )}
                title="Toggle Chat History"
              >
                <MessageSquare className="w-6 h-6" />
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.1, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
                onClick={cycleShape}
                className="p-6 rounded-full bg-gradient-to-br from-purple-600 to-orange-500 text-white shadow-2xl hover:shadow-purple-500/30 transition-all"
                title={`Switch Shape (${currentShape} → next)`}
              >
                <Sparkles className="w-6 h-6" />
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowCamera(!showCamera)}
                className={cn(
                  "p-6 rounded-full transition-all shadow-2xl",
                  showCamera
                    ? "bg-teal-600 text-white"
                    : "bg-white/10 text-white/40 hover:bg-white/20",
                )}
                title="Toggle Camera View"
                aria-label="Toggle Camera View"
              >
                <Video className="w-6 h-6" />
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={toggleListening}
                className={cn(
                  "p-6 rounded-full transition-all shadow-2xl",
                  isListening
                    ? "bg-red-600 text-white animate-pulse"
                    : "bg-blue-600 text-white hover:bg-blue-500",
                )}
                title="Local system microphone capture"
                aria-label="Local system microphone capture"
              >
                <Mic className="w-6 h-6" />
              </motion.button>
              <div className="flex items-center gap-2 ml-2">
                <input
                  aria-label="Chat input"
                  value={chatText}
                  onChange={(e) => setChatText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") sendText();
                  }}
                  placeholder="Type to Lee…"
                  className="w-56 px-3 py-2 rounded-lg bg-black/60 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
                <button
                  onClick={sendText}
                  className="px-3 py-2 rounded-lg bg-orange-600 hover:bg-orange-500 text-white"
                >
                  Send
                </button>
              </div>
            </div>

            {/* Chat history pane */}
            <AnimatePresence>
              {!isChatCollapsed && (
                <motion.div
                  initial={{ opacity: 0, height: 0, y: 20 }}
                  animate={{ opacity: 1, height: "auto", y: 0 }}
                  exit={{ opacity: 0, height: 0, y: 20 }}
                  className="mt-3 w-full max-w-md bg-black/80 backdrop-blur-2xl rounded-2xl p-4 pointer-events-auto overflow-hidden shadow-2xl border border-white/10"
                >
                  <div className="flex items-center justify-between mb-4 border-b border-white/10 pb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                      <span className="text-[10px] uppercase tracking-widest text-white/60 font-bold">
                        Cerebral Comms
                      </span>
                    </div>
                    <button
                      onClick={() => setIsChatCollapsed(true)}
                      className="p-1 hover:bg-white/10 rounded-full transition-colors text-white/40 hover:text-white"
                      title="Close Chat"
                    >
                      <ChevronRight size={16} className="rotate-90" />
                    </button>
                  </div>
                  <div className="max-h-64 overflow-y-auto custom-scrollbar pr-2">
                    {messages.length === 0 && (
                      <div className="text-xs text-white/40 italic">
                        No messages yet — speak or type to begin.
                      </div>
                    )}
                    {messages.map((m) => (
                      <div
                        key={m.id}
                        className={`mb-2 ${m.role === "user" ? "text-right" : "text-left"}`}
                      >
                        <div
                          className={`inline-block px-3 py-2 rounded-lg ${m.role === "user" ? "bg-orange-600 text-white" : "bg-white/5 text-white/90"}`}
                        >
                          <div className="text-sm">{m.text}</div>
                          <div className="text-[10px] text-white/40 mt-1">
                            {new Date(m.ts).toLocaleTimeString()}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  {lastAgentTrace && (
                    <div className="mt-3 rounded-xl border border-cyan-500/20 bg-cyan-500/10 p-3 font-mono text-[10px] text-cyan-100/80">
                      <div className="mb-1 font-bold uppercase tracking-widest text-cyan-300">
                        Agent Lee Route Trace
                      </div>
                      <div>endpoint: {lastAgentTrace.endpoint}</div>
                      <div>body: {JSON.stringify(lastAgentTrace.body)}</div>
                      <div>status: {lastAgentTrace.status}</div>
                      <div>route: {lastAgentTrace.route || "unknown"}</div>
                      <div>agentId: {lastAgentTrace.agentId || "unknown"}</div>
                      <div>response length: {lastAgentTrace.responseLength}</div>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            <div className="grid max-w-3xl grid-cols-2 gap-2 rounded-2xl border border-white/10 bg-black/45 px-4 py-3 backdrop-blur-xl sm:grid-cols-3">
              {localStatuses.map((service) => (
                <div key={service.label} className="flex min-w-0 items-center gap-2">
                  <span
                    className={cn(
                      "h-2 w-2 shrink-0 rounded-full",
                      service.ok ? "bg-emerald-400" : "bg-red-500",
                    )}
                  />
                  <div className="min-w-0">
                    <div className="truncate text-[8px] font-bold uppercase tracking-widest text-white/35">
                      {service.label}
                    </div>
                    <div className="truncate text-[10px] font-mono text-white/70">
                      {service.value}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2 bg-black/40 backdrop-blur-xl px-4 py-2 rounded-full border border-white/10">
              <Volume2
                className={cn(
                  "w-3 h-3",
                  isSpeaking ? "text-green-500" : "text-white/20",
                )}
              />
              <span className="text-[8px] uppercase tracking-widest text-white/40 font-bold">
                {agentLeeState === "speaking" || isSpeaking
                  ? "Agent Lee speaking"
                  : agentLeeState === "thinking"
                    ? "Agent Lee thinking"
                    : agentLeeState === "listening" || isListening
                      ? "Agent Lee listening"
                      : agentLeeState === "error"
                        ? "Agent Lee route error"
                        : deploymentLabel}
              </span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* 3D Agent Lee in Center - z-[5] keeps canvas below z-10 UI; pointer-events-none on wrapper passes clicks to UI buttons above */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-[5]">
        <div className="w-[800px] h-[800px] pointer-events-auto touch-none">
          <AgentLee3D
            shape={currentShape}
            isSpeaking={isSpeaking}
            coreColor={leeColor}
            particleColor={particleColor}
          />
        </div>
      </div>

      {/* Generative Media Preview Modal */}
      <AnimatePresence>
        {generatedMedia.status !== "idle" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 backdrop-blur-md pointer-events-auto"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="w-[640px] bg-slate-900 border border-white/10 rounded-3xl p-6 shadow-2xl flex flex-col gap-6"
            >
              <div className="flex items-center justify-between border-b border-white/5 pb-4">
                <div>
                  <h3 className="text-lg font-bold text-white uppercase tracking-wider">
                    Agent Lee Creative Hub
                  </h3>
                  <p className="text-xs text-white/40">
                    Generative {generatedMedia.type === "image" ? "Image Rendering" : "Video Recording Loop"}
                  </p>
                </div>
                <button
                  onClick={() => {
                    if (animationFrameId) {
                      cancelAnimationFrame(animationFrameId);
                      setAnimationFrameId(null);
                    }
                    setGeneratedMedia({ type: "image", prompt: "", url: "", status: "idle" });
                  }}
                  className="text-white/40 hover:text-white bg-white/5 hover:bg-white/15 rounded-full w-8 h-8 flex items-center justify-center transition-all"
                >
                  ✕
                </button>
              </div>

              {generatedMedia.status === "generating" ? (
                <div className="h-[360px] flex flex-col items-center justify-center gap-4">
                  <div className="relative w-16 h-16">
                    <div className="absolute inset-0 rounded-full border-4 border-orange-500/20" />
                    <div className="absolute inset-0 rounded-full border-4 border-t-orange-500 animate-spin" />
                  </div>
                  <div className="text-sm font-mono text-orange-500 animate-pulse uppercase tracking-widest">
                    Synthesizing Neural Art...
                  </div>
                  <div className="text-[10px] text-white/35 max-w-[280px] text-center font-mono italic">
                    "{generatedMedia.prompt}"
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  <div className="relative aspect-video rounded-2xl overflow-hidden border border-white/10 bg-black shadow-inner">
                    <canvas
                      ref={mediaCanvasRef}
                      width={640}
                      height={360}
                      className="w-full h-full object-contain"
                    />
                  </div>

                  <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                    <div className="text-[10px] font-mono text-white/30 uppercase tracking-widest mb-1">
                      Target Prompt
                    </div>
                    <div className="text-xs text-white/80 font-mono">
                      {generatedMedia.prompt}
                    </div>
                  </div>

                  <div className="flex gap-4">
                    {generatedMedia.type === "image" ? (
                      <a
                        href={generatedMedia.url}
                        download={`${generatedMedia.prompt.replace(/[^a-z0-9]/gi, '_')}.png`}
                        className="flex-1 py-3 px-4 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-center text-sm transition-all"
                      >
                        Download PNG Image
                      </a>
                    ) : (
                      <button
                        onClick={downloadVideo}
                        disabled={isRecording}
                        className={cn(
                          "flex-1 py-3 px-4 rounded-xl font-bold text-center text-sm transition-all text-white",
                          isRecording
                            ? "bg-red-600 animate-pulse"
                            : "bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500"
                        )}
                      >
                        {isRecording ? "Recording 4s Loop..." : "Generate & Download WebM Video"}
                      </button>
                    )}
                    <button
                      onClick={() => {
                        if (animationFrameId) {
                          cancelAnimationFrame(animationFrameId);
                          setAnimationFrameId(null);
                        }
                        setGeneratedMedia({ type: "image", prompt: "", url: "", status: "idle" });
                      }}
                      className="py-3 px-6 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white font-bold text-sm transition-all"
                    >
                      Close
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const StatCard: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string;
  progress: number;
}> = ({ icon, label, value, progress }) => (
  <div className="bg-black/40 backdrop-blur-md border border-white/5 rounded-2xl p-4 flex flex-col gap-3 group hover:border-white/20 transition-all">
    <div className="flex items-center justify-between">
      <div className="p-1.5 rounded-lg bg-white/5 text-white/60 group-hover:text-orange-500 transition-colors">
        {icon}
      </div>
      <span className="text-[8px] font-mono text-white/30 uppercase tracking-widest">
        {label}
      </span>
    </div>
    <div>
      <div className="text-xl font-bold text-white mb-1">{value}</div>
      <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          className="h-full bg-orange-600"
        />
      </div>
    </div>
  </div>
);

const RemoteButton: React.FC<{
  label: string;
  onClick: () => void;
  description: string;
  color?: string;
}> = ({ label, onClick, description, color }) => (
  <button
    onClick={onClick}
    style={color ? { borderColor: color } : undefined}
    className={cn(
      "group flex flex-col items-start gap-1 p-4 rounded-2xl bg-white/5 hover:bg-white/6 border transition-all text-left cursor-pointer",
      color ? "" : "hover:bg-orange-600/20 border-white/5",
    )}
  >
    <span className="text-[10px] font-bold text-white group-hover:text-orange-400 transition-colors">
      {label}
    </span>
    <span className="text-[8px] text-white/30 uppercase tracking-widest">
      {description}
    </span>
  </button>
);
