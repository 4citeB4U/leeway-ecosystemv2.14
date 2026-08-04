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

import { useState, useEffect } from "react";
import { StudioShell } from "./StudioShell";
import { StudioNode } from "./StudioNode";
import {
  Video,
  Film,
  Plus,
  Compass,
  FileText,
  Search,
  CheckCircle,
  Clock,
  Play,
  Pause,
  ArrowRight,
  TrendingUp,
  Volume2,
  Trash2,
  Save,
  Grid,
  FileVideo,
  Layers,
  Upload,
  Cpu,
  RefreshCw,
  Sliders,
  Sparkles,
  Youtube,
  Twitter,
  Linkedin,
  Globe,
  Settings
} from "lucide-react";

export function VideoWorkspace() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [playProgress, setPlayProgress] = useState(18); // 00:18 in seconds
  const [isRendering, setIsRendering] = useState(false);
  const [renderProgress, setRenderProgress] = useState(72);
  const [activeTab, setActiveTab] = useState("Project");
  const [prompt, setPrompt] = useState(
    "Create a 60-second product launch video introducing our new AI workspace. Show the problem, the solution, key features, and a CTA to try it today."
  );
  const [selectedScene, setSelectedScene] = useState(2);

  // Auto-sync active scene card as progress timeline advances
  useEffect(() => {
    if (!isPlaying) return;
    if (playProgress < 5) {
      setSelectedScene(1);
    } else if (playProgress < 15) {
      setSelectedScene(2);
    } else if (playProgress < 30) {
      setSelectedScene(3);
    } else if (playProgress < 40) {
      setSelectedScene(4);
    } else if (playProgress < 50) {
      setSelectedScene(5);
    } else {
      setSelectedScene(6);
    }
  }, [playProgress, isPlaying]);

  // Play timeline simulation
  useEffect(() => {
    let interval: any;
    if (isPlaying) {
      interval = setInterval(() => {
        setPlayProgress(prev => (prev < 60 ? prev + 1 : 0));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isPlaying]);

  // Render video simulation progress
  useEffect(() => {
    let interval: any;
    if (isRendering) {
      interval = setInterval(() => {
        setRenderProgress(prev => {
          if (prev < 100) {
            return prev + 1;
          } else {
            setIsRendering(false);
            return 100;
          }
        });
      }, 800);
    }
    return () => clearInterval(interval);
  }, [isRendering]);

  const handleStartRender = () => {
    setRenderProgress(0);
    setIsRendering(true);
  };

  const formatTime = (secs: number) => {
    const min = Math.floor(secs / 60);
    const sec = secs % 60;
    return `${min}:${sec < 10 ? "0" + sec : sec}`;
  };

  const scenes = [
    { id: 1, title: "Problem", duration: "5s", text: "The old way slows you down.", from: "0:00", to: "0:05", bg: "bg-gradient-to-br from-indigo-950/60 to-red-950/60" },
    { id: 2, title: "Solution", duration: "10s", text: "Meet LeeWay IDE: Everything you need.", from: "0:05", to: "0:15", bg: "bg-gradient-to-br from-indigo-950/60 to-[#0e172e]" },
    { id: 3, title: "Key Features", duration: "15s", text: "All in one flow.", from: "0:15", to: "0:30", bg: "bg-gradient-to-br from-[#0e172e] to-teal-950/40" },
    { id: 4, title: "Voice & AI", duration: "10s", text: "Agent Lee narrates with your voice.", from: "0:30", to: "0:40", bg: "bg-gradient-to-br from-indigo-950/60 to-purple-950/60" },
    { id: 5, title: "Results", duration: "10s", text: "Ship faster. Work smarter. Get more done.", from: "0:40", to: "0:50", bg: "bg-gradient-to-br from-teal-950/40 to-blue-950/50" },
    { id: 6, title: "Call to Action", duration: "10s", text: "Start your free trial today.", from: "0:50", to: "1:00", bg: "bg-gradient-to-br from-emerald-950/50 to-indigo-950/60" }
  ];

  return (
    <StudioShell>
      {/* Wrap the video workspace in a draggable node container */}
      <StudioNode id="video-workspace" title="Video Workspace" initialX={60} initialY={90}>
        <div className="flex-1 w-full bg-transparent text-[#c9d1d9] p-6 overflow-y-auto custom-scrollbar flex flex-col space-y-6" id="video-workspace-container">
      
      {/* Title */}
      <div className="flex items-center justify-between shrink-0 select-none">
        <div>
          <h1 className="text-xl font-bold font-sans tracking-tight text-white flex items-center space-x-2">
            <Video className="w-5 h-5 text-purple-400" />
            <span>AI Video Workshop</span>
          </h1>
          <p className="text-xs text-gray-400 font-sans mt-0.5">
            Convert project source, document files, or outlines into narrated video walkthroughs using Agent Lee voice clones.
          </p>
        </div>
        <div className="flex items-center space-x-2 text-[10px] bg-[#161b22] px-3 py-1.5 rounded-lg border border-[#30363d] font-mono">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse mr-1" />
          <span className="text-gray-400">Media Renderer Pipeline:</span>
          <span className="text-white font-bold ml-1">Live</span>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 min-h-0">
        
        {/* Left Column: Create Form & Media library (4 Cols) */}
        <div className="xl:col-span-4 flex flex-col space-y-5">
          
          {/* Create Video with Agent Lee form */}
          <div className="bg-[#161b22]/70 border border-[#30363d] rounded-2xl p-4 flex flex-col space-y-3 shadow-lg select-none">
            <span className="text-[10px] font-mono uppercase font-bold text-gray-400 tracking-wider border-b border-[#30363d] pb-2 text-white block">Generate Promo Video</span>
            
            <p className="text-[9.5px] text-gray-500 leading-snug">Generate full-length explainer videos based on outlines, chapters, or files.</p>

            {/* Input Mode selection tabs */}
            <div className="flex space-x-1 font-mono text-[9px] bg-[#0d1117] p-1 border border-white/5 rounded-lg">
              <span className="bg-[#161b22] border border-[#30363d] text-white px-2 py-1 rounded cursor-pointer font-bold">From Writing</span>
              <span className="text-gray-500 px-2 py-1 rounded cursor-pointer font-bold">From App / Data</span>
            </div>

            {/* Prompt textarea */}
            <div className="space-y-1.5">
              <span className="text-[9.5px] text-gray-500">Creative script prompt</span>
              <textarea 
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="w-full h-24 bg-[#0d1117] border border-[#30363d] focus:outline-none focus:border-purple-500 rounded-xl p-2.5 text-xs text-white leading-relaxed resize-none overflow-y-auto"
                maxLength={2000}
              />
              <div className="flex justify-between text-[8px] font-mono text-gray-500">
                <span>Markdown output supported</span>
                <span>{prompt.length} / 2000 chars</span>
              </div>
            </div>

            {/* Action buttons */}
            <button 
              onClick={handleStartRender}
              className="w-full py-2 bg-purple-500 hover:bg-purple-600 font-bold rounded-xl text-white shadow shadow-purple-500/25 transition-all text-xs cursor-pointer flex items-center justify-center space-x-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Generate Video Storyboard</span>
            </button>

            {/* AI helpers options */}
            <div className="grid grid-cols-2 gap-1.5 text-[8.5px] font-mono">
              <span className="bg-[#0f141c] hover:bg-[#161b22] border border-gray-800 p-1.5 rounded cursor-pointer text-center">Improve Script</span>
              <span className="bg-[#0f141c] hover:bg-[#161b22] border border-gray-800 p-1.5 rounded cursor-pointer text-center">Expand to Scenes</span>
              <span className="bg-[#0f141c] hover:bg-[#161b22] border border-gray-800 p-1.5 rounded cursor-pointer text-center">Translate (ES/FR)</span>
              <span className="bg-[#0f141c] hover:bg-[#161b22] border border-gray-800 p-1.5 rounded cursor-pointer text-center">Adjust Tone</span>
            </div>
          </div>

          {/* Media Assets Library */}
          <div className="bg-[#161b22]/70 border border-[#30363d] rounded-2xl p-4 flex flex-col space-y-3.5 shadow-lg select-none flex-1">
            <div className="flex items-center justify-between border-b border-[#30363d] pb-2">
              <span className="text-[10px] font-mono uppercase font-bold text-gray-400 tracking-wider">Media Assets Vault</span>
              <button className="flex items-center space-x-1 text-[8px] bg-[#161b22] hover:bg-white/5 border border-[#30363d] text-white px-2 py-1 rounded shadow cursor-pointer uppercase">
                <Upload className="w-3 h-3" />
                <span>Upload</span>
              </button>
            </div>

            {/* Tabs for library category */}
            <div className="flex space-x-1 bg-[#0d1117] p-1 border border-[#30363d]/50 rounded-lg shrink-0">
              {["Project", "Stock", "Brand"].map(t => (
                <span 
                  key={t}
                  onClick={() => setActiveTab(t)}
                  className={`text-[8.5px] font-bold px-2 py-0.5 rounded cursor-pointer flex-1 text-center ${
                    activeTab === t ? "bg-[#161b22] border border-[#30363d] text-white" : "text-gray-500"
                  }`}
                >
                  {t}
                </span>
              ))}
            </div>

            {/* Grid display assets */}
            <div className="grid grid-cols-2 gap-2 flex-1 overflow-y-auto max-h-56">
              {[
                { name: "hero-bg.mp4", duration: "00:12", type: "Video" },
                { name: "dashboard_ui.png", duration: "1200x675", type: "Image" },
                { name: "agent-lee_speaking.mp4", duration: "00:08", type: "Video" },
                { name: "feature-1_highlights.png", duration: "1200x675", type: "Image" },
                { name: "ai-mesh_visual.mp4", duration: "00:10", type: "Video" },
                { name: "cta-bg_outro.png", duration: "1200x675", type: "Image" }
              ].map((asset, idx) => (
                <div key={idx} className="bg-[#0b0f19] border border-[#30363d]/50 hover:border-purple-500/30 rounded-lg p-2 flex flex-col space-y-1 text-[8.5px] relative overflow-hidden cursor-pointer">
                  <div className="h-10 bg-black/40 rounded flex items-center justify-center font-mono opacity-80 uppercase font-light text-[8px]">
                    {asset.type === "Video" ? <FileVideo className="w-4 h-4 text-purple-400" /> : <Layers className="w-4 h-4 text-blue-400" />}
                  </div>
                  <span className="text-white font-bold block truncate mt-1">{asset.name}</span>
                  <span className="text-gray-500 font-mono text-[7.5px] block leading-none">{asset.duration} • {asset.type}</span>
                </div>
              ))}
            </div>
            
          </div>

        </div>

        {/* Center Column: Timelines, Storyboards & Video player (5 Cols) */}
        <div className="xl:col-span-5 flex flex-col space-y-5">
          
          {/* Storyboard track list */}
          <div className="bg-[#161b22]/70 border border-[#30363d] rounded-2xl p-4 flex flex-col space-y-3 shadow-lg select-none min-h-0 scrollbar-none">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase font-bold text-gray-400 tracking-wider">Storyboard scenes track</span>
              <span className="text-[9px] font-mono text-gray-500">6 scenes total</span>
            </div>

            {/* Horizontal track list scrolls */}
            <div className="flex space-x-2.5 overflow-x-auto pb-1.5 scrollbar-thin select-none">
              <div className="bg-[#0f141c] hover:bg-white/5 border border-dashed border-[#30363d] p-3 py-4 rounded-xl flex items-center justify-center flex-col shrink-0 w-24 text-center cursor-pointer">
                <Plus className="w-5 h-5 text-purple-400 mb-1" />
                <span className="text-[9px] text-gray-400 font-bold block uppercase leading-none mt-1">Add Scene</span>
              </div>
              {scenes.map(sc => (
                <div 
                  key={sc.id}
                  onClick={() => {
                    setSelectedScene(sc.id);
                    const startSecMap: Record<number, number> = { 1: 0, 2: 5, 3: 15, 4: 30, 5: 40, 6: 50 };
                    setPlayProgress(startSecMap[sc.id] || 0);
                  }}
                  className={`p-2.5 rounded-xl border shrink-0 w-36 cursor-pointer text-left flex flex-col space-y-1.5 relative overflow-hidden transition-all ${
                    selectedScene === sc.id 
                      ? "bg-purple-500/5 border-purple-500/70 shadow-sm" 
                      : "bg-[#0d1117] border-[#30363d]/50 hover:border-gray-800"
                  }`}
                >
                  <div className="flex items-center justify-between text-[8px] font-mono">
                    <span className="text-purple-400 font-bold">SCENE 0{sc.id}</span>
                    <span className="text-gray-500">{sc.duration}</span>
                  </div>
                  <div className={`h-11 rounded flex items-center justify-center p-1 uppercase text-[7.5px] font-mono font-bold font-semibold text-center select-text max-w-[130px] overflow-hidden truncate ${sc.bg}`}>
                    {sc.title}
                  </div>
                  <span className="text-[8.5px] italic text-gray-400 line-clamp-1 block select-text leading-tight">{sc.text}</span>
                  <div className="flex justify-between items-baseline text-[7px] text-gray-500 font-mono leading-none">
                    <span>{sc.from} - {sc.to}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Player viewport screen */}
          <div className="bg-[#161b22]/70 border border-[#30363d] rounded-2xl p-5 flex flex-col space-y-4 shadow-lg flex-1 min-h-0 relative">
            <div className="flex items-center justify-between border-b border-[#30363d] pb-2 shrink-0">
              <span className="text-[10px] font-mono uppercase font-bold text-gray-400 tracking-wider">Viewport Monitor renderer</span>
              <span className="text-[9px] font-mono text-purple-400 flex items-center space-x-1.5 border border-purple-500/10 px-1.5 py-0.5 rounded bg-purple-500/5">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse shrink-0" />
                <span>RENDERING WORK</span>
              </span>
            </div>

            {/* Video center screen */}
            <div className="bg-black border border-[#30363d]/50 rounded-2xl flex-grow overflow-hidden flex flex-col justify-end p-4 relative min-h-[170px] select-none">
              
              {/* Backing active frame streaming media */}
              <div className="absolute inset-0 z-0">
                <video
                  key={selectedScene}
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="w-full h-full object-cover opacity-65"
                  src={
                    selectedScene === 1
                      ? "https://assets.mixkit.co/videos/preview/mixkit-hand-of-a-frustrated-developer-over-his-face-close-up-34283-large.mp4"
                      : selectedScene === 2
                      ? "https://assets.mixkit.co/videos/preview/mixkit-software-developer-working-on-code-screen-close-up-34281-large.mp4"
                      : selectedScene === 3
                      ? "https://assets.mixkit.co/videos/preview/mixkit-hands-of-a-man-working-on-a-computer-keyboard-40618-large.mp4"
                      : selectedScene === 4
                      ? "https://assets.mixkit.co/videos/preview/mixkit-animation-of-sound-waves-in-purple-shades-41551-large.mp4"
                      : selectedScene === 5
                      ? "https://assets.mixkit.co/videos/preview/mixkit-business-charts-and-graphs-on-a-screen-40545-large.mp4"
                      : "https://assets.mixkit.co/videos/preview/mixkit-creative-workspace-with-computer-and-warm-lighting-40539-large.mp4"
                  }
                />
                
                {/* Visualizer wave lines overlay if audio scene 4 */}
                {selectedScene === 4 && (
                  <div className="absolute inset-x-0 bottom-16 flex justify-center items-end space-x-1 h-12 z-10 opacity-70">
                    <span className="w-1 bg-[#a855f7] h-6 rounded-full animate-[bounce_0.6s_infinite] delay-100" />
                    <span className="w-1 bg-[#a855f7] h-10 rounded-full animate-[bounce_0.6s_infinite] delay-300" />
                    <span className="w-1 bg-[#a855f7] h-4 rounded-full animate-[bounce_0.6s_infinite] delay-150" />
                    <span className="w-1 bg-[#a855f7] h-11 rounded-full animate-[bounce_0.6s_infinite] delay-500" />
                    <span className="w-1 bg-[#a855f7] h-8 rounded-full animate-[bounce_0.6s_infinite] delay-200" />
                  </div>
                )}
                
                {/* Vignette dark shadowing filter for text readability */}
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-black/60" />
              </div>

              {/* Active Scene Narration Text banner overlays */}
              <div className="relative z-10 flex-grow flex items-center justify-center p-4 text-center">
                <span className="font-sans font-medium text-white text-xs tracking-wide bg-black/55 backdrop-blur-md px-3.5 py-2 rounded-xl border border-white/10 shadow-2xl leading-relaxed max-w-xs animate-in fade-in slide-in-from-bottom-2 duration-300">
                  {scenes.find(s => s.id === selectedScene)?.text || "Everything you need. In one flow."}
                </span>
              </div>

              {/* Slider reader timeline progress */}
              <div className="space-y-1 mt-3 shrink-0 relative z-10 select-none">
                <div className="h-1 bg-gray-800 rounded-full overflow-hidden relative">
                  <div 
                    className="bg-purple-500 h-full transition-all duration-300" 
                    style={{ width: `${(playProgress / 60) * 100}%` }} 
                  />
                </div>
                <div className="flex justify-between text-[8px] font-mono text-gray-500">
                  <span>{formatTime(playProgress)}</span>
                  <span>01:00</span>
                </div>
              </div>

              {/* Media play controls */}
              <div className="flex items-center justify-between mt-2 shrink-0 relative z-10 select-none">
                <div className="flex items-center space-x-3 text-xs">
                  <button 
                    onClick={() => setIsPlaying(!isPlaying)}
                    className="w-7 h-7 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 active:scale-95 duration-100 cursor-pointer shadow"
                  >
                    {isPlaying ? <Pause className="w-3.5 h-3.5 fill-black text-black" /> : <Play className="w-3.5 h-3.5 fill-black text-black pl-0.5" />}
                  </button>
                  <span className="text-[10px] text-gray-400 font-mono">00:{playProgress < 10 ? `0${playProgress}` : playProgress} / 01:00</span>
                </div>
                <div className="flex items-center space-x-2 text-gray-500">
                  <Volume2 className="w-4 h-4 text-gray-400" />
                  <span className="text-[8.5px] font-mono">30 FPS</span>
                  <span className="text-[9.5px] font-mono text-emerald-400 uppercase font-bold bg-emerald-500/10 px-1 py-0.5 rounded">Rendered</span>
                </div>
              </div>
            </div>

            {/* Video Production Flowchart */}
            <div className="bg-[#0f141c]/50 p-2 text-[7.5px] border border-white/5 rounded-xl">
              <span className="text-[8px] text-gray-500 uppercase font-bold tracking-wider leading-none mb-1 opacity-75">Production Flow</span>
              <div className="flex justify-between items-center whitespace-nowrap overflow-x-hidden font-mono text-gray-400">
                <span>Script</span>
                <span className="text-gray-700">→</span>
                <span>Scene Generator</span>
                <span className="text-gray-700">→</span>
                <span className="text-[#a855f7] font-bold">Narration Syn</span>
                <span className="text-gray-700">→</span>
                <span>Apply Brand</span>
                <span className="text-gray-700">→</span>
                <span className="text-[#10b981] font-bold">Output Assembly</span>
              </div>
            </div>

          </div>

        </div>

        {/* Right Column: Export, Captions & Progress panel (3 Cols) */}
        <div className="xl:col-span-3 flex flex-col space-y-5">
          
          {/* Export & Publish panel */}
          <div className="bg-[#161b22]/70 border border-[#30363d] rounded-2xl p-4 flex flex-col space-y-3.5 shadow-lg select-none shrink-0">
            <span className="text-[10px] font-mono uppercase font-bold text-gray-400 tracking-wider border-b border-[#30363d] pb-2">Export Workbench</span>
            
            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <span className="text-gray-500 text-[10px]">Target Format</span>
                <div className="grid grid-cols-2 gap-1.5 font-mono text-[9px]">
                  <span className="bg-[#0d1117] border border-purple-500 text-purple-400 font-bold p-1 rounded text-center">MP4 (H.264)</span>
                  <span className="bg-[#0d1117] border border-transparent p-1 rounded text-center text-gray-500">WebM (VP9)</span>
                  <span className="bg-[#0d1117] border border-transparent p-1 rounded text-center text-gray-500">MOV (Apple)</span>
                  <span className="bg-[#0d1117] border border-transparent p-1 rounded text-center text-gray-500">Audio (MP3)</span>
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-gray-500 text-[10px]">Render Quality Quality</span>
                <select className="w-full bg-[#0d1117] border border-[#30363d] rounded-xl px-2.5 py-1.5 text-white text-xs focus:outline-none focus:border-purple-500">
                  <option>1080p High Definition (Recommended)</option>
                  <option>720p Mobile optimized</option>
                  <option>4K Ultra Quality (Pro)</option>
                </select>
              </div>

              <button 
                onClick={handleStartRender}
                className="w-full py-2 bg-purple-500 hover:bg-purple-600 font-bold rounded-xl text-white shadow shadow-purple-500/20 transition-all text-xs cursor-pointer text-center"
              >
                Assemble & Render Final MP4
              </button>
            </div>
          </div>

          {/* Subtitles scroll panel */}
          <div className="bg-[#161b22]/70 border border-[#30363d] rounded-2xl p-4 flex flex-col space-y-3 shadow-lg select-none flex-1 max-h-56">
            <div className="flex items-center justify-between border-b border-[#30363d] pb-2">
              <span className="text-[10px] font-mono uppercase font-bold text-gray-400 tracking-wider">Subtitles timeline</span>
              <span className="text-[8px] text-gray-500 font-mono">Synced</span>
            </div>

            <div className="space-y-1.5 overflow-y-auto max-h-40 font-mono text-[9px] text-[#c9d1d9]/85 select-text leading-snug">
              <div className="flex items-start text-purple-400">
                <span className="opacity-50 select-none mr-2">00:00:00</span>
                <span>The old way slows you down.</span>
              </div>
              <div className="flex items-start text-purple-400">
                <span className="opacity-50 select-none mr-2">00:00:05</span>
                <span>Meet LeeWay IDE: Everything you need.</span>
              </div>
              <div className="flex items-start text-purple-400">
                <span className="opacity-50 select-none mr-2">00:00:15</span>
                <span>All in one cohesive smart workspace flow.</span>
              </div>
              <div className="flex items-start text-gray-500 font-light text-[8.5px]">
                <span className="opacity-50 select-none mr-2">00:00:30</span>
                <span className="italic">Agent Lee vocal narration track synthe...</span>
              </div>
            </div>

            <button className="w-full py-1 border border-[#30363d] rounded-xl text-[8px] font-bold text-gray-500 hover:text-white uppercase mt-auto">
              Auto Generate Captions
            </button>
          </div>

          {/* Connected Social channels */}
          <div className="bg-[#161b22]/70 border border-[#30363d] rounded-2xl p-4 flex flex-col space-y-3 shadow-lg select-none flex-1">
            <span className="text-[10px] font-mono uppercase font-bold text-gray-400 tracking-wider">Publish Channels</span>
            
            <div className="space-y-2 text-[10px] flex-grow flex flex-col justify-center">
              {[
                { icon: Youtube, name: "YouTube", handle: "@leeway-ide-vault", ready: true },
                { icon: Twitter, name: "Twitter / X", handle: "@leeway_ai", ready: true },
                { icon: Linkedin, name: "LinkedIn", handle: "/company/leeway", ready: true },
                { icon: Globe, name: "Deploy Website", handle: "leeway.com/promo", ready: true }
              ].map((chan, idx) => (
                <div key={idx} className="flex justify-between items-center bg-[#0d1117] p-2 rounded-xl border border-white/5">
                  <div className="flex items-center space-x-2">
                    <chan.icon className="w-4.5 h-4.5 text-purple-400 shrink-0" />
                    <div>
                      <span className="text-[10px] text-white font-bold leading-tight block">{chan.name}</span>
                      <span className="text-[8px] text-gray-500 leading-none select-text block">{chan.handle}</span>
                    </div>
                  </div>
                  <span className="text-[8px] font-mono bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded leading-none uppercase font-bold">READY</span>
                </div>
              ))}
            </div>

            <button className="w-full py-1.5 bg-[#161b22] border border-[#30363d] rounded-xl text-[10px] font-bold text-gray-500 hover:text-white uppercase mt-auto cursor-pointer">
              Publish to Channels
            </button>
          </div>

        </div>

      </div>

      {/* Rendering Video Popup progress bar */}
      {isRendering && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#161b22] border border-purple-500/60 rounded-2xl p-4.5 shadow-2xl w-80 animate-bounce duration-1000 select-none">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-white flex items-center space-x-1">
              <RefreshCw className="w-3.5 h-3.5 text-purple-400 animate-spin mr-1 shrink-0" />
              <span>Rendering promo video...</span>
            </span>
            <span className="text-xs font-mono font-bold text-purple-400">{renderProgress}%</span>
          </div>
          <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
            <div 
              className="bg-purple-500 h-full duration-300 transition-all" 
              style={{ width: `${renderProgress}%` }} 
            />
          </div>
          <p className="text-[9px] text-gray-500 font-mono mt-2">
            Codec: H.264 MP4 • Est. Time: {Math.ceil((100 - renderProgress) * 0.8)} seconds remaining
          </p>
        </div>
      )}

        </div>
      </StudioNode>
    </StudioShell>
  );
}
