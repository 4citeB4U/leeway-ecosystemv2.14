/**
 * LEEWAY_HEADER - DO NOT REMOVE
 *
 * REGION: UI
 * TAG: UI.WORKSPACE.AUDIO.MAIN
 * DESCRIPTION: Audio workspace for Leeway IDE - voice cloning, live recording, and audio asset management
 * AUTHORITY: LeeWay-Standards
 * DISCOVERY_PIPELINE: Voice -> Intent -> Location -> Vertical -> Ranking -> Render
 *
 * 5WH:
 * WHAT = Audio Workspace - Leeway IDE audio production and voice cloning surface
 * WHY = Provide comprehensive audio creation, voice cloning, and live recording capabilities
 * WHO = Leeway Innovations / Agent Lee Enablement
 * WHERE = leeway-ide-single-canvas/src/components/AudioWorkspace.tsx
 * WHEN = 2026-06-06
 * HOW = React component with live recording, voice library management, and Leeway Runtime Fabric integration
 *
 * CHAIN: Standards → Integrated → Runtime → Projections
 * LICENSE: PROPRIETARY
 */

import { useState, useEffect } from "react";
import { StudioShell } from "./StudioShell";
import { StudioNode } from "./StudioNode";
import {
  Mic,
  Volume2,
  VolumeX,
  Play,
  Pause,
  Plus,
  RefreshCw,
  Sliders,
  CheckCircle,
  HelpCircle,
  Activity,
  ChevronRight,
  ShieldAlert,
  Smartphone,
  Phone,
  FileText,
  Radio,
  Zap,
  Power,
  SlidersHorizontal
} from "lucide-react";

export function AudioWorkspace() {
  const [isPlayingLive, setIsPlayingLive] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordTime, setRecordTime] = useState(28);
  const [latency, setLatency] = useState(98);
  const [selectedVoice, setSelectedVoice] = useState("Agent Lee Clone");
  const [voiceLibrary, setVoiceLibrary] = useState([
    { id: "v1", name: "Agent Lee Clone", version: "v2.1", date: "Created 2 days ago", active: true },
    { id: "v2", name: "Agent Lee (Calm)", version: "v1.3", date: "Created 1 week ago", active: false },
    { id: "v3", name: "Agent Lee (Energetic)", version: "v1.1", date: "Created 2 weeks ago", active: false },
    { id: "v4", name: "Agent Lee (Narrator)", version: "v1.0", date: "Created 3 weeks ago", active: false }
  ]);

  const [assignments, setAssignments] = useState({
    webApp: true,
    mobileApp: true,
    podcast: true,
    callFlow: true,
    videoNarration: false
  });

  // Pulse animation for recording timer
  useEffect(() => {
    let interval: any;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordTime(prev => (prev < 59 ? prev + 1 : 0));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  const handleToggleAssignment = (key: keyof typeof assignments) => {
    setAssignments(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <StudioShell>
      {/* Encapsulate the entire audio interface in a single draggable, collapsible node. */}
      <StudioNode id="audio-workspace" title="Audio Workspace" initialX={60} initialY={80}>
        <div className="flex-1 w-full bg-transparent text-[#c9d1d9] p-6 overflow-y-auto custom-scrollbar flex flex-col space-y-6" id="audio-workspace-container">

        {/* Title block */}
        <div className="flex items-center justify-between shrink-0">
          <div>
            <h1 className="text-xl font-bold font-sans tracking-tight text-white flex items-center space-x-2">
              <Volume2 className="w-5 h-5 text-blue-400" />
              <span>Voice Clone Studio</span>
            </h1>
            <p className="text-xs text-gray-500 font-sans mt-0.5">
              Configure natural text-to-speech voice models and deploy real-time audio interaction pipelines.
            </p>
          </div>
          <div className="flex items-center space-x-2 text-[10px] bg-[#161b22] px-3 py-1.5 rounded-lg border border-[#30363d] font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse mr-1" />
            <span className="text-gray-400">Voice Synthesis Engine:</span>
            <span className="text-white font-bold ml-1">Live</span>
          </div>
        </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 min-h-0">
        
        {/* Left Column: Health Metrics & Clone Form (4 Cols) */}
        <div className="xl:col-span-4 flex flex-col space-y-5">
          
          {/* Audio System Health */}
          <div className="bg-[#161b22]/70 border border-[#30363d] rounded-2xl p-4 flex flex-col space-y-4 shadow-lg">
            <div className="flex items-center justify-between border-b border-[#30363d] pb-2">
              <span className="text-[10px] font-mono uppercase font-bold text-gray-400 tracking-wider">Audio System Health</span>
              <span className="text-[9px] font-mono bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded uppercase font-bold">● LIVE</span>
            </div>
            
            <div className="grid grid-cols-1 gap-2.5 text-xs">
              <div className="flex items-center justify-between bg-[#0d1117] p-2 rounded-lg border border-[#30363d]/50">
                <span className="text-gray-400">Microphone</span>
                <span className="text-emerald-400 font-semibold font-mono">Good</span>
              </div>
              <div className="flex items-center justify-between bg-[#0d1117] p-2 rounded-lg border border-[#30363d]/50">
                <span className="text-gray-400">Speech Processing</span>
                <span className="text-emerald-400 font-semibold font-mono">Optimal</span>
              </div>
              <div className="flex items-center justify-between bg-[#0d1117] p-2 rounded-lg border border-[#30363d]/50">
                <span className="text-gray-400">Clone Voice Engine</span>
                <span className="text-blue-400 font-semibold font-mono">Active</span>
              </div>
              <div className="flex items-center justify-between bg-[#0d1117] p-2 rounded-lg border border-[#30363d]/50">
                <span className="text-gray-400">Voice Output</span>
                <span className="text-emerald-400 font-semibold font-mono">Good</span>
              </div>
              <div className="flex items-center justify-between bg-[#0d1117] p-2 rounded-lg border border-[#30363d]/50">
                <span className="text-gray-400">Latency</span>
                <span className="text-blue-400 font-semibold font-mono">{latency}ms</span>
              </div>
            </div>

            {/* Sparkline wave simulation */}
            <div className="h-8 flex items-end justify-between px-1 bg-[#0d1117]/50 rounded-lg border border-[#30363d]/30 relative overflow-hidden">
              <div className="absolute top-1 left-2 text-[8px] font-mono text-gray-500 uppercase">Jitter Log</div>
              {[15, 24, 18, 30, 22, 12, 19, 35, 42, 28, 14, 18, 25, 30, 12, 16, 26, 34, 18, 10, 15, 22, 28].map((h, i) => (
                <div 
                  key={i} 
                  style={{ height: `${h}%` }} 
                  className={`w-[4%] rounded-t-sm transition-all duration-300 ${
                    i === 8 ? "bg-red-500/80" : "bg-blue-500/50"
                  }`} 
                />
              ))}
            </div>

            <div className="flex items-center justify-between text-[10px] font-mono text-gray-500 pt-1">
              <span>Uptime: 2h 43m</span>
              <span>Quality score: 100%</span>
            </div>
          </div>

          {/* Voice Clone Studio */}
          <div className="bg-[#161b22]/70 border border-[#30363d] rounded-2xl p-4 flex flex-col space-y-4 shadow-lg flex-1">
            <div className="flex items-center justify-between border-b border-[#30363d] pb-2">
              <span className="text-[10px] font-mono uppercase font-bold text-white tracking-wider flex items-center space-x-1">
                <Mic className="w-3.5 h-3.5 text-blue-400" />
                <span>Voice Clone Studio</span>
              </span>
              <span className="text-[9px] font-mono text-gray-400">Secure Vault</span>
            </div>

            {/* Steps indicator */}
            <div className="grid grid-cols-4 gap-1 select-none">
              <div className="bg-blue-500/20 border border-blue-500/30 text-blue-400 text-[8px] font-bold py-1.5 rounded text-center">
                1. RECORD
              </div>
              <div className="bg-[#0f141c] border border-gray-800 text-gray-500 text-[8px] font-bold py-1.5 rounded text-center">
                2. CLONE
              </div>
              <div className="bg-[#0f141c] border border-gray-800 text-gray-500 text-[8px] font-bold py-1.5 rounded text-center">
                3. SETTINGS
              </div>
              <div className="bg-[#0f141c] border border-gray-800 text-gray-500 text-[8px] font-bold py-1.5 rounded text-center">
                4. DEPLOY
              </div>
            </div>

            {/* Step Content: Record Your Voice layout */}
            <div className="bg-[#0d1117] border border-[#30363d] rounded-xl p-3 flex flex-col space-y-3">
              <div>
                <span className="text-[10px] font-bold text-white font-sans">Record Your Voice</span>
                <p className="text-[9px] text-gray-500">Read the sample text down naturally for 30-60 seconds.</p>
              </div>

              {/* Dynamic waveform analyzer graphic */}
              <div className="h-16 bg-[#090b11] border border-white/5 rounded-xl flex items-center justify-center p-2 relative overflow-hidden">
                {isRecording ? (
                  <div className="flex items-center justify-center space-x-1 w-full">
                    {[3, 8, 5, 12, 18, 9, 4, 15, 24, 30, 26, 12, 5, 18, 22, 16, 8, 14, 25, 12, 6, 12, 7, 3].map((val, idx) => (
                      <span 
                        key={idx} 
                        style={{ height: `${val * 2}px` }} 
                        className="w-1 bg-red-400 rounded-full animate-pulse mr-px shrink-0" 
                      />
                    ))}
                    <div className="absolute top-1.5 right-2 text-[8px] font-mono text-red-500 animate-pulse font-bold tracking-tight bg-red-500/10 px-1 py-0.5 rounded">
                      ● RECORDING 00:{recordTime < 10 ? `0${recordTime}` : recordTime}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center">
                    <div className="flex items-center space-x-1.5">
                      <Mic className="w-4 h-4 text-gray-500 animate-bounce duration-1000" />
                      <span className="text-[10px] font-mono text-gray-400 tracking-wide uppercase">Voice Reader System Idle</span>
                    </div>
                    <span className="text-[8px] text-gray-500 mt-0.5">Click Start to record sample track</span>
                  </div>
                )}
              </div>

              {/* Controls */}
              <div className="flex space-x-2">
                <button 
                  onClick={() => setIsRecording(!isRecording)}
                  className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                    isRecording 
                      ? "bg-red-500 hover:bg-red-600 text-white" 
                      : "bg-[#161b22] hover:bg-[#30363d] text-white border border-[#30363d]"
                  }`}
                >
                  {isRecording ? "Stop Recording" : "Start Sample Capture"}
                </button>
              </div>
            </div>

            {/* Quality metadata checklist */}
            <div className="grid grid-cols-2 gap-2 text-[10px]">
              <div className="bg-[#0f141c] p-2.5 rounded-lg border border-[#30363d]/50">
                <span className="text-gray-500 block">Sample Quality</span>
                <span className="text-emerald-400 font-bold font-mono">Excellent</span>
                <div className="w-full bg-gray-800 h-1 rounded overflow-hidden mt-1 text-center">
                  <div className="bg-emerald-500 h-full w-[94%]" />
                </div>
              </div>
              <div className="bg-[#0f141c] p-2.5 rounded-lg border border-[#30363d]/50">
                <span className="text-gray-500 block">Detected Duration</span>
                <span className="text-white font-bold font-mono">00:32 seconds</span>
              </div>
              <div className="bg-[#0f141c] p-2.5 rounded-lg border border-[#30363d]/50">
                <span className="text-gray-500 block">Clarity Score</span>
                <span className="text-emerald-400 font-bold font-mono">96% Accuracy</span>
              </div>
              <div className="bg-[#0f141c] p-2.5 rounded-lg border border-[#30363d]/50">
                <span className="text-gray-500 block">Background Noise</span>
                <span className="text-emerald-400 font-bold font-mono">Low</span>
              </div>
            </div>

            {/* Cloned Voice Sample Text Preview */}
            <div className="flex-1 bg-[#0d1117] p-3 rounded-lg border border-[#30363d]/40 flex flex-col space-y-1 justify-between max-h-[140px] overflow-hidden">
              <span className="text-[8px] font-mono text-gray-500 uppercase tracking-widest block font-bold">Sample Text Preview</span>
              <p className="text-[10.5px] italic text-[#c9d1d9] leading-relaxed select-text font-serif">
                "LeeWay gives me a voice that's always me — across every app, every device, every experience. Intuitively tuned and always aligned."
              </p>
              <div className="flex items-center space-x-1.5 text-[8px] text-gray-500">
                <span className="w-1 h-1 bg-blue-500 rounded-full" />
                <span>Encrypted on-device vault deployment setup verified</span>
              </div>
            </div>
            
          </div>

        </div>

        {/* Center Log: Core Audio Flow & Live Wave Equalizer (5 Cols) */}
        <div className="xl:col-span-5 flex flex-col space-y-5">
          
          {/* Audio flow diagram */}
          <div className="bg-[#161b22]/70 border border-[#30363d] rounded-2xl p-4 flex flex-col space-y-3.5 shadow-lg relative min-h-0 overflow-hidden">
            <span className="text-[10px] font-mono uppercase font-bold text-gray-400 tracking-wider">Audio Routing Canvas</span>
            
            <div className="flex-1 min-h-[190px] relative flex flex-col justify-between">
              
              {/* Dotted Grid Background */}
              <div className="absolute inset-0 pointer-events-none opacity-[0.035] bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:12px_12px]" />
              
              {/* Node connectors canvas */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none select-none z-0">
                {/* Bezier connector paths */}
                <path d="M 68 35 H 145" fill="none" stroke="#30363d" strokeWidth="1.5" />
                <path d="M 188 35 H 250" fill="none" stroke="rgba(59,130,246,0.3)" strokeWidth="1.5" className="stroke-dasharray-glow" />
                <path d="M 295 35 H 350" fill="none" stroke="#30363d" strokeWidth="1.5" />
                <path d="M 398 35 H 430" fill="none" stroke="#30363d" strokeWidth="1.5" />
                
                {/* Secondary branching paths */}
                <path d="M 272 50 V 105 H 200" fill="none" stroke="#30363d" strokeWidth="1.5" />
                <path d="M 272 105 H 300" fill="none" stroke="#30363d" strokeWidth="1.5" />
                <path d="M 272 50 V 165 H 222" fill="none" stroke="#30363d" strokeWidth="1.5" />
              </svg>

              {/* Core Nodes Map Row 1 */}
              <div className="flex items-center justify-between w-full relative z-10 select-none">
                <div className="bg-[#0d1117] hover:border-blue-500/40 border border-[#30363d] rounded-xl px-2.5 py-1.5 flex flex-col items-center justify-center shrink-0 w-16">
                  <Mic className="w-3.5 h-3.5 text-blue-400 mb-1" />
                  <span className="text-[7.5px] font-bold text-white uppercase">Mic Input</span>
                  <span className="text-[6.5px] font-mono text-emerald-400">LIVE</span>
                </div>

                <div className="bg-[#0d1117] hover:border-blue-500/40 border border-[#30363d] rounded-xl px-2.5 py-1.5 flex flex-col items-center justify-center shrink-0 w-20">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-blue-400 mb-1" />
                  <span className="text-[7.5px] font-bold text-white uppercase">Audio Clean</span>
                  <span className="text-[6.5px] font-mono text-gray-500">AI FILTER</span>
                </div>

                <div className="bg-[#121824] border border-blue-500/65 shadow-[0_0_10px_rgba(59,130,246,0.15)] rounded-xl px-2 py-1.5 flex flex-col items-center justify-center shrink-0 w-24">
                  <RefreshCw className="w-3.5 h-3.5 text-blue-400 mb-1 animate-spin duration-1000" />
                  <span className="text-[7.5px] font-bold text-white uppercase">Clone Voice</span>
                  <span className="text-[6.5px] font-mono text-blue-400">ACTIVE ENGINE</span>
                </div>

                <div className="bg-[#0d1117] border border-[#30363d] rounded-xl px-2.5 py-1.5 flex flex-col items-center justify-center shrink-0 w-22">
                  <FileText className="w-3.5 h-3.5 text-blue-400 mb-1" />
                  <span className="text-[7.5px] font-bold text-white uppercase">Transcript</span>
                  <span className="text-[6.5px] font-mono text-emerald-400">REAL-TIME</span>
                </div>

                <div className="bg-[#0d1117] border border-[#30363d] rounded-xl px-2.5 py-1.5 flex flex-col items-center justify-center shrink-0 w-18">
                  <Volume2 className="w-3.5 h-3.5 text-blue-400 mb-1" />
                  <span className="text-[7.5px] font-bold text-white uppercase">Voice Out</span>
                  <span className="text-[6.5px] font-mono text-gray-500">CLONE ACT</span>
                </div>
              </div>

              {/* Row 2 Branchings */}
              <div className="flex justify-between items-center w-full relative z-10 select-none">
                <div className="bg-[#0d1117] border border-[#30363d] rounded-xl px-2.5 py-1.5 flex flex-col items-center justify-center shrink-0 w-24">
                  <Radio className="w-3.5 h-3.5 text-purple-400 mb-1" />
                  <span className="text-[7.5px] font-bold text-white uppercase">Podcast generator</span>
                  <span className="text-[6.5px] font-mono text-purple-400">GENERATE EPISODE</span>
                </div>

                <div className="bg-[#0d1117] border border-[#30363d] rounded-xl px-2.5 py-1.5 flex flex-col items-center justify-center shrink-0 w-24">
                  <Phone className="w-3.5 h-3.5 text-amber-400 mb-1" />
                  <span className="text-[7.5px] font-bold text-white uppercase">Call Flow Link</span>
                  <span className="text-[6.5px] font-mono text-amber-400">VOICE CLIENT</span>
                </div>

                <div className="bg-[#0d1117] border border-[#30363d] rounded-xl px-2.5 py-1.5 flex flex-col items-center justify-center shrink-0 w-24">
                  <FileText className="w-3.5 h-3.5 text-emerald-400 mb-1" />
                  <span className="text-[7.5px] font-bold text-white uppercase">Narration Feed</span>
                  <span className="text-[6.5px] font-mono text-emerald-400">TEXT READ ALOUD</span>
                </div>
              </div>

            </div>
          </div>

          {/* Live Audio Preview (Speaker & Wave Equalizer block with Pulsating circular ring) */}
          <div className="bg-[#161b22]/70 border border-[#30363d] rounded-2xl p-5 flex flex-col space-y-4 shadow-lg flex-1 relative min-h-0 overflow-hidden">
            <div className="flex items-center justify-between border-b border-[#30363d] pb-2">
              <span className="text-[10px] font-mono uppercase font-bold text-gray-400 tracking-wider">Live Audio Preview</span>
              <span className="text-[9px] font-mono text-emerald-400 flex items-center space-x-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>Connected</span>
              </span>
            </div>

            {/* Toggle tabs for source */}
            <div className="flex space-x-1 z-10 self-center">
              <span className="text-[9px] bg-blue-500/10 border border-blue-500/20 text-blue-400 px-2 py-1 rounded-lg cursor-pointer">Clone Voice</span>
              <span className="text-[9px] bg-[#0d1117] border border-[#30363d]/50 text-gray-500 px-2 py-1 rounded-lg cursor-pointer">Raw Input</span>
              <span className="text-[9px] bg-[#0d1117] border border-[#30363d]/50 text-gray-500 px-2 py-1 rounded-lg cursor-pointer">Output Mode</span>
            </div>

            {/* Breathtaking circular pulsating neural sound equalizer ring */}
            <div className="flex-1 flex flex-col items-center justify-center py-4 relative group shrink-0 min-h-[160px]">
              
              {/* Circle container */}
              <div 
                onClick={() => setIsPlayingLive(!isPlayingLive)}
                className={`relative w-28 h-28 rounded-full border border-blue-500/10 flex items-center justify-center cursor-pointer transition-transform duration-300 hover:scale-[1.03] active:scale-95 bg-[#0e1322] select-none ${
                  isPlayingLive ? "shadow-[0_0_24px_rgba(59,130,246,0.15)] border-blue-500/30" : "hover:shadow-lg"
                }`}
              >
                {/* SVG equalizer ring circles */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none select-none animate-[spin_10s_linear_infinite]" viewBox="0 0 100 100">
                  <circle 
                    cx="50" cy="50" r="44" 
                    fill="none" 
                    stroke="rgba(59,130,246,0.3)" 
                    strokeWidth="1.5" 
                    strokeDasharray="4 8" 
                    className={isPlayingLive ? "animate-[pulse_1.5s_infinite]" : ""} 
                  />
                  <circle 
                    cx="50" cy="50" r="40" 
                    fill="none" 
                    stroke="rgba(59,130,246,0.15)" 
                    strokeWidth="1.5" 
                    strokeDasharray="10 5" 
                  />
                </svg>

                {/* Speaker indicator waves */}
                {isPlayingLive ? (
                  <div className="flex items-center space-x-0.5 h-12">
                    <span className="w-1 h-3 bg-blue-500 rounded-full animate-[bounce_0.6s_infinite]" />
                    <span className="w-1 h-6 bg-blue-400 rounded-full animate-[bounce_0.8s_infinite] delay-100" />
                    <span className="w-1 h-8 bg-blue-500 rounded-full animate-[bounce_0.5s_infinite] delay-200" />
                    <span className="w-1 h-10 bg-blue-400 rounded-full animate-[bounce_0.7s_infinite] delay-300" />
                    <span className="w-1 h-6 bg-blue-500 rounded-full animate-[bounce_0.9s_infinite] delay-150" />
                    <span className="w-1 h-4 bg-blue-400 rounded-full animate-[bounce_0.6s_infinite] delay-75" />
                  </div>
                ) : (
                  <Play className="w-7 h-7 text-blue-500 fill-blue-500 pl-1 animate-pulse" />
                )}
              </div>

              {/* Play instruction label */}
              <div className="text-center mt-3 z-10">
                <span className="text-[10px] text-gray-500 block">Click ring to preview cloned voice stream</span>
                <span className="text-[11px] font-bold text-white mt-1 block">Speaking as: {selectedVoice} (v2.1)</span>
              </div>
            </div>

            {/* L/R Peak output meter bars */}
            <div className="bg-[#0d1117] p-2 py-3 rounded-lg border border-[#30363d]/50 space-y-1.5 select-none shrink-0">
              <div className="flex items-center justify-between text-[8px] font-mono text-gray-500 uppercase tracking-widest leading-none">
                <span>Left Channel DB</span>
                <span>-12dB</span>
              </div>
              <div className="h-1.5 bg-[#161b22] rounded-full overflow-hidden flex">
                <div 
                  className="bg-[#2da44e] h-full duration-150 transition-all rounded" 
                  style={{ width: isPlayingLive ? "68%" : "5%" }} 
                />
                {isPlayingLive && <div className="bg-[#d29922] h-full w-[12%] animate-pulse" />}
              </div>
              <div className="flex items-center justify-between text-[8px] font-mono text-gray-500 uppercase tracking-widest leading-none pt-1">
                <span>Right Channel DB</span>
                <span>-12dB</span>
              </div>
              <div className="h-1.5 bg-[#161b22] rounded-full overflow-hidden flex">
                <div 
                  className="bg-[#2da44e] h-full duration-150 transition-all rounded" 
                  style={{ width: isPlayingLive ? "74%" : "5%" }} 
                />
                {isPlayingLive && <div className="bg-[#f85149] h-full w-[8%] animate-pulse" />}
              </div>
            </div>

            <div className="flex items-center justify-between text-[9px] font-mono text-gray-500 shrink-0">
              <span className="flex items-center"><Zap className="w-3 h-3 text-emerald-500 mr-1 shrink-0" /> Latency: 98ms</span>
              <span>Quality: HD Mono (Audio Cloner Matrix)</span>
            </div>
          </div>

          {/* Sample Workflow */}
          <div className="bg-[#161b22]/50 border border-[#30363d]/50 rounded-2xl p-3 flex flex-col space-y-2 select-none shadow">
            <span className="text-[9px] font-mono text-gray-500 uppercase font-bold tracking-wider">Sample Workflow: App Voice Assistant</span>
            <div className="flex items-center justify-between space-x-1.5 text-[10px] font-mono">
              <div className="bg-[#0d1117] p-1.5 px-2 rounded-lg text-center flex-1 border border-gray-800">
                <span className="block text-white font-bold">User Speaks</span>
                <span className="text-[8px] text-gray-500 uppercase font-light">Input</span>
              </div>
              <span className="text-gray-600 font-bold shrink-0">→</span>
              <div className="bg-[#0d1117] p-1.5 px-2 rounded-lg text-center flex-1 border border-gray-800">
                <span className="block text-white font-bold">AI Model</span>
                <span className="text-[8px] text-gray-500 uppercase font-light">Parse Text</span>
              </div>
              <span className="text-gray-600 font-bold shrink-0">→</span>
              <div className="bg-blue-500/10 border border-blue-500/20 text-blue-400 p-1.5 px-2 rounded-lg text-center flex-1">
                <span className="block text-blue-400 font-bold">Lee Clone</span>
                <span className="text-[8px] text-blue-500 uppercase font-light font-sans font-bold">Responds</span>
              </div>
              <span className="text-gray-600 font-bold shrink-0">→</span>
              <div className="bg-[#0d1117] p-1.5 px-2 rounded-lg text-center flex-1 border border-gray-800">
                <span className="block text-emerald-400 font-bold">Play Audio</span>
                <span className="text-[8px] text-gray-500 uppercase font-light">To User</span>
              </div>
            </div>
          </div>

        </div>

        {/* Right Column: Voice Library & Assign Switches (3 Cols) */}
        <div className="xl:col-span-3 flex flex-col space-y-5">
          
          {/* Voice Library */}
          <div className="bg-[#161b22]/70 border border-[#30363d] rounded-2xl p-4 flex flex-col space-y-4.5 shadow-lg select-none">
            <div className="flex items-center justify-between border-b border-[#30363d] pb-2">
              <span className="text-[10px] font-mono uppercase font-bold text-gray-400 tracking-wider">Voice Library</span>
              <button className="flex items-center space-x-1 text-[9px] bg-blue-500 hover:bg-blue-600 text-white font-bold px-2 py-1 rounded shadow cursor-pointer">
                <Plus className="w-3 h-3" />
                <span>New Clone</span>
              </button>
            </div>

            <div className="space-y-2.5">
              {voiceLibrary.map(voice => (
                <div 
                  key={voice.id}
                  onClick={() => {
                    setSelectedVoice(voice.name);
                    setVoiceLibrary(prev => prev.map(v => ({ ...v, active: v.id === voice.id })));
                  }}
                  className={`p-3 rounded-xl border transition-all cursor-pointer flex flex-col space-y-1 ${
                    voice.active 
                      ? "bg-blue-500/5 border-blue-500 shadow-sm" 
                      : "bg-[#0d1117]/80 hover:bg-[#161b22]/50 border-[#30363d] hover:border-gray-700"
                  }`}
                >
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-white font-bold tracking-tight">{voice.name}</span>
                    {voice.active && (
                      <span className="text-[8px] uppercase tracking-wide px-1.5 bg-emerald-500/15 text-emerald-400 font-bold border border-emerald-500/20 rounded">Active</span>
                    )}
                  </div>
                  <div className="flex justify-between items-baseline text-[9px] text-gray-500">
                    <span>{voice.version} • {voice.date}</span>
                    {voice.active && (
                      <div className="flex items-end space-x-0.5 h-2">
                        <span className="w-[1.5px] h-1.5 bg-blue-400 rounded-full animate-pulse" />
                        <span className="w-[1.5px] h-2 bg-blue-400 rounded-full animate-pulse delay-75" />
                        <span className="w-[1.5px] h-1 bg-blue-400 rounded-full animate-pulse delay-150" />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <button className="w-full py-1.5 border border-[#30363d] rounded-xl text-[10px] font-bold tracking-wide text-gray-400 hover:text-white hover:bg-white/5 transition-all cursor-pointer uppercase">
              View All Voices
            </button>
          </div>

          {/* Assign Clone Voice Switches */}
          <div className="bg-[#161b22]/70 border border-[#30363d] rounded-2xl p-4 flex flex-col space-y-4 shadow-lg select-none flex-1">
            <div className="flex items-center justify-between border-b border-[#30363d] pb-2">
              <span className="text-[10px] font-mono uppercase font-bold text-gray-400 tracking-wider">Assign Clone Voice</span>
              <span className="text-[9px] text-gray-500">Targets</span>
            </div>

            <p className="text-[9px] text-gray-500 leading-normal">
              Select which live runtime components deploy the active cloned voice.
            </p>

            <div className="space-y-3.5 flex-1 justify-center flex flex-col">
              
              {/* Web App */}
              <div className="flex items-center justify-between bg-[#0d1117] p-2 px-3 rounded-lg border border-[#30363d]/50">
                <div className="flex items-center space-x-2">
                  <Smartphone className="w-4 h-4 text-blue-400" />
                  <div>
                    <span className="text-xs text-white font-bold block leading-tight">Web App Client</span>
                    <span className="text-[9px] text-gray-500 leading-none">Customer Assistant voice</span>
                  </div>
                </div>
                <button 
                  onClick={() => handleToggleAssignment("webApp")}
                  className={`w-9 h-5 rounded-full transition-all flex items-center p-0.5 cursor-pointer ${
                    assignments.webApp ? "bg-blue-500" : "bg-gray-800"
                  }`}
                >
                  <span className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-all ${
                    assignments.webApp ? "translate-x-4" : "translate-x-0"
                  }`} />
                </button>
              </div>

              {/* Mobile App */}
              <div className="flex items-center justify-between bg-[#0d1117] p-2 px-3 rounded-lg border border-[#30363d]/50">
                <div className="flex items-center space-x-2">
                  <Smartphone className="w-4 h-4 text-blue-400" />
                  <div>
                    <span className="text-xs text-white font-bold block leading-tight">Mobile App Client</span>
                    <span className="text-[9px] text-gray-500 leading-none">Onboarding guide</span>
                  </div>
                </div>
                <button 
                  onClick={() => handleToggleAssignment("mobileApp")}
                  className={`w-9 h-5 rounded-full transition-all flex items-center p-0.5 cursor-pointer ${
                    assignments.mobileApp ? "bg-blue-500" : "bg-gray-800"
                  }`}
                >
                  <span className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-all ${
                    assignments.mobileApp ? "translate-x-4" : "translate-x-0"
                  }`} />
                </button>
              </div>

              {/* Podcast */}
              <div className="flex items-center justify-between bg-[#0d1117] p-2 px-3 rounded-lg border border-[#30363d]/50">
                <div className="flex items-center space-x-2">
                  <Radio className="w-4 h-4 text-purple-400" />
                  <div>
                    <span className="text-xs text-white font-bold block leading-tight">Podcast Generator</span>
                    <span className="text-[9px] text-gray-500 leading-none">Host Voice Synthesizer</span>
                  </div>
                </div>
                <button 
                  onClick={() => handleToggleAssignment("podcast")}
                  className={`w-9 h-5 rounded-full transition-all flex items-center p-0.5 cursor-pointer ${
                    assignments.podcast ? "bg-blue-500" : "bg-gray-800"
                  }`}
                >
                  <span className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-all ${
                    assignments.podcast ? "translate-x-4" : "translate-x-0"
                  }`} />
                </button>
              </div>

              {/* Call Flow */}
              <div className="flex items-center justify-between bg-[#0d1117] p-2 px-3 rounded-lg border border-[#30363d]/50">
                <div className="flex items-center space-x-2">
                  <Phone className="w-4 h-4 text-amber-400" />
                  <div>
                    <span className="text-xs text-white font-bold block leading-tight">Call Flow Agent</span>
                    <span className="text-[9px] text-gray-500 leading-none">Voice Telephony Agent</span>
                  </div>
                </div>
                <button 
                  onClick={() => handleToggleAssignment("callFlow")}
                  className={`w-9 h-5 rounded-full transition-all flex items-center p-0.5 cursor-pointer ${
                    assignments.callFlow ? "bg-blue-500" : "bg-gray-800"
                  }`}
                >
                  <span className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-all ${
                    assignments.callFlow ? "translate-x-4" : "translate-x-0"
                  }`} />
                </button>
              </div>

              {/* Video Narration */}
              <div className="flex items-center justify-between bg-[#0d1117] p-2 px-3 rounded-lg border border-[#30363d]/50">
                <div className="flex items-center space-x-2">
                  <FileText className="w-4 h-4 text-emerald-400" />
                  <div>
                    <span className="text-xs text-white font-bold block leading-tight">Video Narration</span>
                    <span className="text-[9px] text-gray-500 leading-none">Content Reader Model</span>
                  </div>
                </div>
                <button 
                  onClick={() => handleToggleAssignment("videoNarration")}
                  className={`w-9 h-5 rounded-full transition-all flex items-center p-0.5 cursor-pointer ${
                    assignments.videoNarration ? "bg-blue-500" : "bg-gray-800"
                  }`}
                >
                  <span className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-all ${
                    assignments.videoNarration ? "translate-x-4" : "translate-x-0"
                  }`} />
                </button>
              </div>

            </div>

            <div className="flex items-start space-x-2 bg-[#0d1117] p-2.5 rounded-lg border border-white/5 mt-auto">
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <p className="text-[9px] text-gray-400 leading-snug">
                All external channels will automatically fetch speech tracks synthesized via the active voice clone vault profile. Safe metadata is signed with cryptographic credentials.
              </p>
            </div>
          </div>

        </div>
</div>

</div>
</StudioNode>
    </StudioShell>
  );
}
