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
import { CameraFeed } from "./CameraFeed";
import {
  Eye,
  Camera,
  Play,
  Cpu,
  RefreshCw,
  Sliders,
  CheckCircle,
  HelpCircle,
  ChevronRight,
  Database,
  Terminal,
  Grid,
  TrendingUp,
  Settings,
  Plus,
  Compass,
  AlertTriangle,
  Layers,
  Thermometer,
  UserCheck
} from "lucide-react";

export function VisionWorkspace() {
  const [activeSegment, setActiveSegment] = useState("Live Camera");
  const [selectedMode, setSelectedMode] = useState("Object Detection");
  const [isLive, setIsLive] = useState(true);
  const [fps, setFps] = useState(30);
  const [resolution, setResolution] = useState("1920 x 1080 (16:9)");
  const [confidence, setConfidence] = useState(0.40);
  const [faceDetected, setFaceDetected] = useState(true);

  // Simulated live metrics state
  const [metrics, setMetrics] = useState({
    inferenceTime: 24.3,
    fpsReal: 30.1,
    cpu: 18,
    gpu: 32,
    memory: 1.2
  });

  // Cycle stats slowly for high fidelity live feel
  useEffect(() => {
    const int = setInterval(() => {
      setMetrics(prev => ({
        inferenceTime: parseFloat((23 + Math.random() * 2.5).toFixed(1)),
        fpsReal: parseFloat((29.8 + Math.random() * 0.5).toFixed(1)),
        cpu: Math.floor(16 + Math.random() * 4),
        gpu: Math.floor(30 + Math.random() * 5),
        memory: parseFloat((1.18 + Math.random() * 0.04).toFixed(2))
      }));
    }, 1500);
    return () => clearInterval(int);
  }, []);

  return (
    <StudioShell>
      {/* Wrap vision studio in a draggable node to provide consistent node-based interaction */}
      <StudioNode id="vision-workspace" title="Vision Workspace" initialX={70} initialY={90}>
        <div className="flex-1 w-full bg-transparent text-[#c9d1d9] p-6 overflow-y-auto custom-scrollbar flex flex-col space-y-6" id="vision-workspace-container">
      
      {/* Title block */}
      <div className="flex flex-col md:flex-row md:items-center justify-between shrink-0 gap-3">
        <div>
          <h1 className="text-xl font-bold font-sans tracking-tight text-white flex items-center space-x-2">
            <Eye className="w-5 h-5 text-blue-400 animate-pulse" />
            <span>AI Computer Vision Studio</span>
          </h1>
          <p className="text-xs text-gray-500 font-sans mt-0.5">
            Manage real-time node cameras, facial detection overlays, depth grids, and YOLO inference analytics.
          </p>
        </div>
        
        {/* Segmented control bar */}
        <div className="flex bg-[#161b22] p-1 rounded-xl border border-[#30363d] self-start md:self-center">
          {["Live Camera", "Scenes", "Datasets", "Models", "Calibrations", "History"].map(seg => (
            <button
              key={seg}
              onClick={() => setActiveSegment(seg)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeSegment === seg 
                  ? "bg-blue-500 text-white shadow-md shadow-blue-500/10" 
                  : "text-gray-400 hover:text-white"
              }`}
            >
              {seg}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 min-h-0">
        
        {/* Left Column: Logitech feed & Pipeline logs (4 Cols) */}
        <div className="xl:col-span-4 flex flex-col space-y-5">
          
          {/* Camera Viewport */}
          <div className="bg-[#161b22]/70 border border-[#30363d] rounded-2xl flex flex-col overflow-hidden shadow-lg select-none">
            <div className="flex items-center justify-between p-3.5 border-b border-[#30363d] bg-black/10">
              <span className="text-[10px] font-mono uppercase font-bold text-gray-400 tracking-wider">Camera 1 • Logitech MX Brio</span>
              <span className="text-[9px] font-mono bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded uppercase font-bold flex items-center space-x-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>LIVE FEED</span>
              </span>
            </div>

            {/* Simulated Live Frame Visual */}
            <div className="relative bg-black h-56 flex items-center justify-center overflow-hidden">
              <CameraFeed showMesh={faceDetected} meshMode={selectedMode} className="h-full" />
            </div>
          </div>

          {/* Vision Pipeline */}
          <div className="bg-[#161b22]/70 border border-[#30363d] rounded-2xl p-4 flex flex-col space-y-3 shadow-lg min-h-0">
            <span className="text-[10px] font-mono uppercase font-bold text-gray-400 tracking-wider">Vision Pipeline Layout</span>
            
            {/* Horizontal flow line of pipeline steps */}
            <div className="bg-[#0f141c] p-3 rounded-xl border border-[#30363d]/50 space-y-3.5 select-none text-[8px] font-mono">
              <div className="flex items-center justify-between">
                <div className="bg-[#161b22] px-2 py-1.5 border border-blue-500/30 rounded text-center shrink-0 w-20">
                  <Camera className="w-3.5 h-3.5 text-blue-400 mx-auto mb-1" />
                  <span className="font-bold text-white block">Capture</span>
                  <span className="text-gray-500 uppercase leading-none">CAMERA 1</span>
                </div>
                <span className="text-gray-600 font-bold">→</span>
                <div className="bg-[#121824] px-2 py-1.5 border border-blue-500 rounded text-center shrink-0 w-24 shadow-[0_0_8px_rgba(59,130,246,0.1)]">
                  <Cpu className="w-3.5 h-3.5 text-blue-400 mx-auto mb-1 animate-spin duration-1000" />
                  <span className="font-bold text-white block">Detect OBJ</span>
                  <span className="text-blue-400 uppercase font-bold leading-none">YOLOv8</span>
                </div>
                <span className="text-gray-600 font-bold">→</span>
                <div className="bg-[#161b22] px-2 py-1.5 border border-[#30363d] rounded text-center shrink-0 w-22">
                  <Compass className="w-3.5 h-3.5 text-blue-400 mx-auto mb-1" />
                  <span className="font-bold text-white block">OCR / Scene</span>
                  <span className="text-gray-500 uppercase leading-none">TEXT MATCH</span>
                </div>
              </div>
            </div>
          </div>

          {/* Pipeline Logs (Log drawer console block) */}
          <div className="bg-[#161b22]/70 border border-[#30363d] rounded-2xl p-4 flex flex-col space-y-3 shadow-lg flex-1 overflow-x-hidden select-none">
            <div className="flex items-center justify-between border-b border-[#30363d] pb-2">
              <span className="text-[10px] font-mono uppercase font-bold text-gray-400 tracking-wider">Pipeline Logs</span>
              <span className="text-[8px] font-mono text-gray-500">Live logs</span>
            </div>

            <div className="space-y-2 font-mono text-[9.5px] leading-relaxed flex-1 overflow-y-auto max-h-48 custom-scrollbar scroll-smooth">
              <div className="flex items-start text-emerald-400">
                <span className="opacity-50 shrink-0 select-none mr-2">10:24:31</span>
                <span>[INFO] Frame captured from Camera 1 index successfully.</span>
              </div>
              <div className="flex items-start text-emerald-400">
                <span className="opacity-50 shrink-0 select-none mr-2">10:24:31</span>
                <span>[YOLO] Detected 12 core objects (94% confidence accuracy).</span>
              </div>
              <div className="flex items-start text-[#c9d1d9]/90">
                <span className="opacity-50 shrink-0 select-none mr-2">10:24:31</span>
                <span>[OCR] Text parsed regions: "LeeWay IDE" matches found.</span>
              </div>
              <div className="flex items-start text-[#c9d1d9]/90">
                <span className="opacity-50 shrink-0 select-none mr-2">10:24:32</span>
                <span>[VIT] Scene classification categorized: "Office Environment" (94%).</span>
              </div>
              <div className="flex items-start text-blue-400">
                <span className="opacity-50 shrink-0 select-none mr-2">10:24:32</span>
                <span>[FLOW] Action triggered successfully: Dynamic App UI Update.</span>
              </div>
            </div>

            <button className="w-full py-1.5 border border-[#30363d] rounded-xl text-[9px] font-bold tracking-wide text-gray-500 hover:text-white uppercase">
              View All Logs
            </button>
          </div>

        </div>

        {/* Center Column: Analysis Modes & JSON Configurations (5 Cols) */}
        <div className="xl:col-span-5 flex flex-col space-y-5">
          
          {/* Analysis Modes Grid (3x3 elements) */}
          <div className="bg-[#161b22]/70 border border-[#30363d] rounded-2xl p-4.5 flex flex-col space-y-3.5 shadow-lg select-none min-h-0">
            <span className="text-[10px] font-mono uppercase font-bold text-gray-400 tracking-wider block">Analysis Modes</span>
            
            <div className="grid grid-cols-3 gap-2.5">
              {[
                { name: "Object Detection", desc: "12 objects • 94%", color: "text-blue-400", activeBg: "bg-blue-500/10 border-blue-500/40" },
                { name: "Segmentation", desc: "Contours • 89%", color: "text-purple-400", activeBg: "bg-purple-500/10 border-purple-500/40" },
                { name: "Depth", desc: "Grayscale • 88%", color: "text-indigo-400", activeBg: "bg-indigo-500/10 border-indigo-500/40" },
                { name: "OCR / Text", desc: "2 regions • 96%", color: "text-cyan-400", activeBg: "bg-cyan-500/10 border-cyan-500/40" },
                { name: "Thermal", desc: "Heatmap • 35.6°C avg", color: "text-amber-500", activeBg: "bg-amber-500/10 border-amber-500/40" },
                { name: "Pose Estimation", desc: "Skeletal • 92%", color: "text-emerald-400", activeBg: "bg-emerald-500/10 border-emerald-500/40" },
                { name: "Environment", desc: "3D Map • 87%", color: "text-pink-400", activeBg: "bg-pink-500/10 border-pink-500/40" },
                { name: "Scene Classification", desc: "Workspace • 94%", color: "text-yellow-400", activeBg: "bg-yellow-500/15 border-yellow-500/35" },
                { name: "Anomaly Detection", desc: "Checked • No errors", color: "text-red-400", activeBg: "bg-red-500/10 border-red-500/40" }
              ].map(mode => {
                const isActive = selectedMode === mode.name;
                return (
                  <div
                    key={mode.name}
                    onClick={() => setSelectedMode(mode.name)}
                    className={`p-2.5 rounded-xl border cursor-pointer hover:border-[#30363d]/80 text-left transition-all ${
                      isActive 
                        ? mode.activeBg 
                        : "bg-[#0d1117]/80 border-[#30363d]/50"
                    }`}
                  >
                    <span className={`text-[10px] font-bold text-white block ${isActive ? mode.color : ""}`}>{mode.name}</span>
                    <span className="text-[8px] text-gray-500 font-mono block mt-0.5">{mode.desc}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* JSON Hyperparameter Settings Editor */}
          <div className="bg-[#161b22]/70 border border-[#30363d] rounded-2xl p-4 flex flex-col space-y-3 shadow-lg relative min-h-0">
            <div className="flex items-center justify-between border-b border-[#30363d] pb-2">
              <span className="text-[10px] font-mono uppercase font-bold text-white tracking-wider flex items-center space-x-1.5">
                <Terminal className="text-blue-400 w-3.5 h-3.5" />
                <span>Vision Node: {selectedMode}</span>
              </span>
              <span className="text-[9px] font-mono text-gray-500">JSON Options</span>
            </div>

            <div className="bg-[#0d1117] border border-[#30363d] rounded-lg p-3 pt-2 text-[10.5px] font-mono text-blue-300 leading-relaxed overflow-x-auto max-h-48 scroll-smooth select-text">
              <pre className="text-[#c9d1d9]">{`{
  `}<span className="text-purple-400">"id"</span>: <span className="text-emerald-400">"detect_objects_1"</span>,
  <span className="text-purple-400">"type"</span>: <span className="text-emerald-400">"vision.detect_objects"</span>,
  <span className="text-purple-400">"model"</span>: <span className="text-emerald-400">"yolov8-nano"</span>,
  <span className="text-purple-400">"confidence_threshold"</span>: <span className="text-orange-400">{confidence.toFixed(2)}</span>,
  <span className="text-purple-400">"input"</span>: {`{
    `}<span className="text-purple-400">"source"</span>: <span className="text-emerald-400">"camera_1"</span>,
    <span className="text-purple-400">"resize"</span>: [<span className="text-orange-400">640</span>, <span className="text-orange-400">640</span>]
  {`},`}
  <span className="text-purple-400">"output"</span>: {`{
    `}<span className="text-purple-400">"objects"</span>: <span className="text-emerald-400">true</span>,
    <span className="text-purple-400">"boxes"</span>: <span className="text-emerald-400">true</span>,
    <span className="text-purple-400">"labels"</span>: <span className="text-emerald-400">true</span>,
    <span className="text-purple-400">"scores"</span>: <span className="text-emerald-400">true</span>
  {`}
}`}
              </pre>
            </div>

            {/* Slider to adjust parameter in json */}
            <div className="flex items-center space-x-3 text-xs">
              <span className="text-gray-400 font-mono">Conf Threshold:</span>
              <input 
                type="range" 
                min="0.10" 
                max="0.95" 
                step="0.05"
                value={confidence}
                onChange={(e) => setConfidence(parseFloat(e.target.value))}
                className="flex-1 accent-blue-500 h-1 bg-gray-800 rounded-lg cursor-pointer scale-y-110" 
              />
              <span className="font-mono text-white font-bold">{confidence.toFixed(2)}</span>
            </div>
          </div>

          {/* Performance stats mini panel */}
          <div className="bg-[#161b22]/50 border border-[#30363d]/50 rounded-2xl p-4 flex flex-col space-y-2 shadow select-none">
            <span className="text-[9px] font-mono text-gray-500 uppercase font-bold tracking-wider">Performance Monitor Analytics</span>
            
            <div className="grid grid-cols-5 gap-2 font-mono text-[9px]">
              <div className="bg-[#0d1117] p-2 roundedborder border-gray-800">
                <span className="text-gray-500 block">Inference</span>
                <span className="text-white font-bold">{metrics.inferenceTime} ms</span>
              </div>
              <div className="bg-[#0d1117] p-2 rounded border border-gray-800">
                <span className="text-gray-500 block">FPS</span>
                <span className="text-[#3b82f6] font-bold">{metrics.fpsReal}</span>
              </div>
              <div className="bg-[#0d1117] p-2 rounded border border-gray-800">
                <span className="text-gray-500 block">CPU</span>
                <span className="text-white font-bold">{metrics.cpu}%</span>
              </div>
              <div className="bg-[#0d1117] p-2 rounded border border-gray-800">
                <span className="text-gray-500 block">GPU</span>
                <span className="text-white font-bold">{metrics.gpu}%</span>
              </div>
              <div className="bg-[#0d1117] p-2 rounded border border-gray-800">
                <span className="text-gray-500 block">Memory</span>
                <span className="text-[#10b981] font-bold">{metrics.memory} GB</span>
              </div>
            </div>
          </div>

        </div>

        {/* Right Column: Controls, Insights & Consumers (3 Cols) */}
        <div className="xl:col-span-3 flex flex-col space-y-5">
          
          {/* Vision Insights */}
          <div className="bg-[#161b22]/70 border border-[#30363d] rounded-2xl p-4 flex flex-col space-y-4 shadow-lg select-none">
            <span className="text-[10px] font-mono uppercase font-bold text-gray-400 tracking-wider border-b border-[#30363d] pb-2">Vision Insights</span>
            
            <div className="space-y-3.5 text-xs font-sans">
              <div className="flex items-center justify-between">
                <span className="text-gray-400">People</span>
                <span className="text-white font-bold">1 Person (98% match)</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Objects Identified</span>
                <span className="text-blue-400 font-mono font-bold">12 objects</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Text Regions</span>
                <span className="text-white font-bold">2 regions</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Scene Classified</span>
                <span className="text-emerald-400 font-bold">Office Environment</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Lighting</span>
                <span className="text-white font-bold">Good (82%)</span>
              </div>
            </div>

            <button className="w-full py-1.5 border border-[#30363d] rounded-xl text-[10px] font-bold tracking-wide text-gray-400 hover:text-white uppercase">
              View Full Report
            </button>
          </div>

          {/* Vision Controls */}
          <div className="bg-[#161b22]/70 border border-[#30363d] rounded-2xl p-4 flex flex-col space-y-3 shadow-lg select-none">
            <span className="text-[10px] font-mono uppercase font-bold text-gray-400 tracking-wider">Vision Controls</span>

            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <span className="text-gray-500 text-[10px]">Camera Input</span>
                <select className="w-full bg-[#0d1117] border border-[#30363d] rounded-xl px-2.5 py-1.5 text-white text-xs focus:outline-none focus:border-blue-500">
                  <option>Logitech MX Brio</option>
                  <option>FaceTime HD Camera</option>
                  <option>IP Camera Gateway</option>
                </select>
              </div>

              <div className="space-y-1">
                <span className="text-gray-500 text-[10px]">Output Resolution</span>
                <select 
                  value={resolution}
                  onChange={(e) => setResolution(e.target.value)}
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded-xl px-2.5 py-1.5 text-white text-xs focus:outline-none focus:border-blue-500"
                >
                  <option>1920 x 1080 (16:9)</option>
                  <option>1280 x 720 (16:9)</option>
                  <option>640 x 480 (4:3)</option>
                </select>
              </div>

              <div className="space-y-1">
                <span className="text-gray-500 text-[10px]">Maximum Target FPS</span>
                <select 
                  value={fps}
                  onChange={(e) => setFps(parseInt(e.target.value))}
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded-xl px-2.5 py-1.5 text-white text-xs focus:outline-none focus:border-blue-500"
                >
                  <option value={30}>30</option>
                  <option value={60}>60</option>
                  <option value={15}>15</option>
                </select>
              </div>

              <button className="w-full py-2 bg-blue-500 hover:bg-blue-600 font-bold rounded-xl text-white shadow shadow-blue-500/25 transition-all text-[11px] cursor-pointer">
                Calibrate Active Camera
              </button>
            </div>
          </div>

          {/* Vision Consumers */}
          <div className="bg-[#161b22]/70 border border-[#30363d] rounded-2xl p-4 flex flex-col space-y-3 shadow-lg select-none flex-1">
            <span className="text-[10px] font-mono uppercase font-bold text-gray-400 tracking-wider">Vision Consumers</span>

            <div className="space-y-2.5 flex-grow flex flex-col justify-center">
              {[
                { name: "Live Preview Stream", desc: "Show in dashboard frames" },
                { name: "Data File Logger", desc: "Write coordinate variables" },
                { name: "Trigger Automated flow", desc: "Match conditional actions" },
                { name: "Update Application UI", desc: "Sync frontends on variables" }
              ].map((cons, idx) => (
                <div key={idx} className="flex items-center justify-between bg-[#0d1117] p-2 rounded-xl border border-white/5">
                  <div>
                    <span className="text-xs text-white font-bold block leading-tight">{cons.name}</span>
                    <span className="text-[8px] text-gray-500 block mt-0.5">{cons.desc}</span>
                  </div>
                  <button className="w-8 h-4.5 bg-blue-500 rounded-full flex items-center p-0.5 pointer-events-none">
                    <span className="w-3.5 h-3.5 bg-white rounded-full transform translate-x-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <button className="w-full py-2 bg-[#161b22] hover:bg-[#30363d] border border-[#30363d] rounded-xl text-xs font-bold text-gray-400 hover:text-white transition-all cursor-pointer">
              + Add Consumer Target
            </button>
          </div>

        </div>

      </div>

        </div>
      </StudioNode>
    </StudioShell>
  );
}
