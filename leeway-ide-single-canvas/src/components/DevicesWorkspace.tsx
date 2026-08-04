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
  Cpu,
  Smartphone,
  Laptop,
  Tv,
  Printer,
  Volume2,
  Watch,
  Settings,
  Grid,
  Search,
  CheckCircle,
  Clock,
  Play,
  Pause,
  ArrowRight,
  TrendingUp,
  RefreshCw,
  Plus,
  AlertTriangle,
  Compass,
  Database,
  Radio,
  Gamepad2,
  Camera,
  Layers,
  HelpCircle,
  Check,
  Send
} from "lucide-react";
import { DeviceDiscoveryService } from "../services/liveAdapters";

const iconMap: Record<string, any> = {
  Cpu: Cpu,
  Smartphone: Smartphone,
  Laptop: Laptop,
  Tv: Tv,
  Printer: Printer,
  Volume2: Volume2,
  Watch: Watch,
  Radio: Radio,
  Gamepad2: Gamepad2,
  Camera: Camera,
  Layers: Layers
};

export function DevicesWorkspace() {
  const [selectedDevice, setSelectedDevice] = useState("Epson ET-4800");
  const [isScanning, setIsScanning] = useState(false);
  const [activeFilter, setActiveFilter] = useState("All Devices (42)");
  const [diagnosing, setDiagnosing] = useState(false);
  const [dialText, setDialText] = useState("Press 'Run Diagnostics' on Epson ET-4800");

  const [devices, setDevices] = useState<{
    name: string;
    category: string;
    connection: string;
    battery: string;
    status: string;
    icon: any;
    alert: boolean;
    enabled: boolean;
    source: string;
  }[]>([
    { name: "My Core Hub", category: "Laptop", connection: "Wi-Fi", battery: "100%", status: "Online", icon: Laptop, alert: false, enabled: true, source: "browser" },
  ]);

  const [chatLog, setChatLog] = useState([
    { sender: "assistant", text: "I detected a warning state on your Epson ET-4800. The cyan ink cartridge level is at 18%, and paper jam flags are reported in tray 2." }
  ]);

  // Handle local scans
  useEffect(() => {
    async function runScan() {
      const real = await DeviceDiscoveryService.scanDevices();
      // Combine with existing simulated peripherals, making sure we tag them with correct sources
      const existingManuals = [
        { name: "LG OLED C3", category: "Smart TV", connection: "Wi-Fi 5", battery: "100%", status: "Online", icon: "Tv" as const, alert: false, enabled: true, source: "mDNS" },
        { name: "Epson ET-4800", category: "Printer", connection: "Wi-Fi", battery: "Ink: 18%", status: "Error/Ink", icon: "Printer" as const, alert: true, enabled: false, source: "IPP/CUPS" },
        { name: "Sony WH-1000XM5", category: "Headphones", connection: "Bluetooth 5.3", battery: "80%", status: "Online", icon: "Volume2" as const, alert: false, enabled: true, source: "Bluetooth" },
        { name: "Apple Watch S9", category: "Watch", connection: "Bluetooth", battery: "63%", status: "Online", icon: "Watch" as const, alert: false, enabled: true, source: "Bluetooth" },
        { name: "Philips Hue Hub", category: "Zigbee Hub", connection: "Thread", battery: "100%", status: "Online", icon: "Cpu" as const, alert: false, enabled: true, source: "manual" },
        { name: "Canon EOS R6", category: "Camera", connection: "Wi-Fi", battery: "55%", status: "Online", icon: "Camera" as const, alert: false, enabled: true, source: "manual" },
        { name: "Nest Thermostat", category: "Regulator", connection: "Wi-Fi", battery: "100%", status: "Online", icon: "Cpu" as const, alert: false, enabled: true, source: "mDNS" }
      ];
      
      const merged = [
        ...real,
        ...existingManuals
      ];
      setDevices(merged as any);
      setIsScanning(false);
    }
    runScan();
  }, [isScanning]);

  const handleDeviceSwitch = (name: string) => {
    setDevices(prev => prev.map(d => {
      if (d.name === name) {
        return { ...d, enabled: !d.enabled, status: !d.enabled ? "Online" : "Offline" };
      }
      return d;
    }));
  };

  const handleRunDiagnostics = () => {
    setDiagnosing(true);
    setDialText("Querying device parameters...");
    setTimeout(() => {
      setDialText("Clear paper feed tray 2 confirmed. Calibrating cyan cartridge offset...");
      setTimeout(() => {
        setDiagnosing(false);
        setDialText("All systems check complete on Epson ET-4800 Printer.");
        setDevices(prev => prev.map(d => {
          if (d.name === "Epson ET-4800") {
            return { ...d, alert: false, status: "Ready", battery: "Ink: 18% / Jam Cleared" };
          }
          return d;
        }));
        setChatLog(prev => [
          ...prev,
          { sender: "assistant", text: "I've successfully run diagnostics on Epson ET-4800. Cyan line blockage was resolved, and Tray 2 paper alignment sensor has been calibrated and cleared." }
        ]);
      }, 1500);
    }, 1500);
  };

  return (
    <StudioShell>
      {/* Encapsulate the devices workspace in a draggable node container */}
      <StudioNode id="devices-workspace" title="Devices Workspace" initialX={60} initialY={90}>
        <div className="flex-1 w-full bg-transparent text-[#c9d1d9] p-6 overflow-y-auto custom-scrollbar flex flex-col space-y-6" id="devices-workspace-container">
      
      {/* Title */}
      <div className="flex items-center justify-between shrink-0 select-none">
        <div>
          <h1 className="text-xl font-bold font-sans tracking-tight text-white flex items-center space-x-2">
            <Cpu className="w-5 h-5 text-blue-400" />
            <span>IoT Hardware Orchestrator</span>
          </h1>
          <p className="text-xs text-gray-500 font-sans mt-0.5">
            Identify local networks, scan nearby peripherals, trace communication pathways, and debug device sensors with Agent Lee.
          </p>
        </div>
        <button 
          onClick={() => setIsScanning(true)}
          className="flex items-center space-x-1.5 py-1.5 px-4 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-xl shadow cursor-pointer transition-all active:scale-95 text-xs"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? "animate-spin" : ""}`} />
          <span>{isScanning ? "Scanning Peripherals..." : "Scan for Devices"}</span>
        </button>
      </div>

      {/* Statistics board timeline header row */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3 select-none">
        <div className="bg-[#161b22]/70 border border-[#30363d] p-3 rounded-2xl">
          <span className="text-[8.5px] font-mono text-gray-400 uppercase">Total Devices</span>
          <span className="block text-xl font-extrabold text-white">42</span>
          <span className="text-[7.5px] text-emerald-400 font-bold tracking-wide block mt-0.5">+6 identified today</span>
        </div>
        <div className="bg-[#161b22]/70 border border-[#30363d] p-3 rounded-2xl">
          <span className="text-[8.5px] font-mono text-gray-400 uppercase">Online Devices</span>
          <span className="block text-xl font-extrabold text-emerald-400">33</span>
          <span className="text-[7.5px] text-gray-500 block mt-0.5">78% online ratio</span>
        </div>
        <div className="bg-[#161b22]/70 border border-[#30363d] p-3 rounded-2xl">
          <span className="text-[8.5px] font-mono text-gray-400 uppercase">Nearby Peripherals</span>
          <span className="block text-xl font-extrabold text-blue-400">7</span>
          <span className="text-[7.5px] text-gray-500 block mt-0.5">Within 10 meters</span>
        </div>
        <div className="bg-[#161b22]/70 border border-[#30363d] p-3 rounded-2xl">
          <span className="text-[8.5px] font-mono text-gray-400 uppercase">Alerts / Hardware</span>
          <span className="block text-xl font-extrabold text-red-400">2</span>
          <span className="text-[7.5px] text-red-500 font-bold block mt-0.5">Requires attention</span>
        </div>
        <div className="bg-[#161b22]/70 border border-[#30363d] p-3 rounded-2xl">
          <span className="text-[8.5px] font-mono text-gray-400 uppercase">Active Automations</span>
          <span className="block text-xl font-extrabold text-white">8</span>
          <span className="text-[7.5px] text-gray-500 block mt-0.5">Device macros active</span>
        </div>
        <div className="bg-[#161b22]/70 border border-[#30363d] p-3 rounded-2xl">
          <span className="text-[8.5px] font-mono text-gray-400 uppercase">Connections Map</span>
          <span className="block text-xl font-extrabold text-[#a21caf]">58</span>
          <span className="text-[7.5px] text-gray-500 block mt-0.5">Communicating channels</span>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 min-h-0 flex-1">
        
        {/* Left Column: Device grid lists (5 Cols) */}
        <div className="xl:col-span-5 flex flex-col space-y-4">
          
          {/* Filters switches categories */}
          <div className="flex bg-[#161b22] p-1 border border-[#30363d] rounded-xl overflow-x-auto scrollbar-none select-none">
            {["All Devices (42)", "Wi-Fi (18)", "Bluetooth (11)", "Zigbee (4)", "Thread (2)"].map((filt) => (
              <button
                key={filt}
                onClick={() => setActiveFilter(filt)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  activeFilter === filt 
                    ? "bg-blue-500 text-white shadow shadow-blue-500/10" 
                    : "text-gray-400 hover:text-white"
                }`}
              >
                {filt}
              </button>
            ))}
          </div>

          {/* Dynamic grid cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 flex-grow overflow-y-auto max-h-[460px] p-0.5 select-none custom-scrollbar">
            {devices.map(dev => {
              const IconComp = typeof dev.icon === "string" ? (iconMap[dev.icon] || Cpu) : (dev.icon || Cpu);
              return (
                <div 
                  key={dev.name}
                  onClick={() => setSelectedDevice(dev.name)}
                  className={`p-3 rounded-2xl border cursor-pointer hover:border-[#30363d]/80 text-left transition-all relative overflow-hidden flex flex-col justify-between ${
                    selectedDevice === dev.name
                      ? dev.alert 
                        ? "bg-red-500/5 border-red-500/60 shadow-[0_0_10px_rgba(239,68,68,0.1)]"
                        : "bg-blue-500/5 border-blue-500/60 shadow-[0_0_10px_rgba(59,130,246,0.15)] animate-[pulse_2s_infinite]"
                      : dev.alert
                        ? "bg-[#0d1117] border-red-500/40 border-2"
                        : "bg-[#0d1117]/80 border-[#30363d]/50"
                  }`}
                >
                  <div className="flex items-center justify-between text-[8px] font-mono">
                    <span className="text-gray-500 uppercase">{dev.connection}</span>
                    <span className="bg-blue-500/10 text-blue-400 text-[6.5px] px-1 py-0.5 rounded font-black uppercase tracking-wider">{dev.source || "manual"}</span>
                    <span className={dev.alert ? "text-red-400 font-bold" : "text-emerald-400 font-semibold"}>{dev.battery}</span>
                  </div>

                  <div className="flex items-center space-x-2 my-2 select-text">
                    <div className={`p-1.5 rounded bg-[#161b22] border border-[#30363d] shrink-0 ${dev.alert ? "border-red-500/30 text-red-400 animate-pulse" : "border-white/5 text-blue-400"}`}>
                      <IconComp className="w-5 h-5 shrink-0" />
                    </div>
                    <div className="truncate">
                      <span className="text-white font-bold block truncate leading-tight">{dev.name}</span>
                      <span className="text-[8px] font-medium text-gray-500 block truncate mt-0.5 leading-none">{dev.category}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[9px] shrink-0">
                    <span className={dev.alert ? "text-red-400 font-bold" : "text-emerald-400"}>{dev.status}</span>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeviceSwitch(dev.name);
                      }}
                      className={`w-7 h-4 rounded-full flex items-center p-0.5 transition-all cursor-pointer ${
                        dev.enabled ? "bg-blue-500" : "bg-gray-800"
                      }`}
                    >
                      <span className={`w-3 h-3 bg-white rounded-full transform shadow duration-150 transition-all ${
                        dev.enabled ? "translate-x-3" : "translate-x-0"
                      }`} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          
        </div>

        {/* Center Column: Network environment specs & Flow Canvas (4 Cols) */}
        <div className="xl:col-span-4 flex flex-col space-y-4">
          
          {/* Network context card */}
          <div className="bg-[#161b22]/70 border border-[#30363d] rounded-2xl p-4 flex flex-col space-y-3.5 shadow-lg select-none">
            <span className="text-[10px] font-mono uppercase font-bold text-gray-400 tracking-wider block">Network Environment Context</span>
            
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-[#0b0f19] p-2 rounded-xl border border-white/5">
                <span className="text-gray-500 text-[8.5px] uppercase">Machine Host</span>
                <span className="block text-white font-bold truncate">MacBook Pro (M3 Pro)</span>
              </div>
              <div className="bg-[#0b0b19] p-2 rounded-xl border border-white/5">
                <span className="text-gray-500 text-[8.5px] uppercase">Active Wi-Fi SSID</span>
                <span className="block text-white font-bold truncate">Leeway_Secure_5G</span>
              </div>
              <div className="bg-[#0b0f19] p-2 rounded-xl border border-white/5">
                <span className="text-gray-500 text-[8.5px] uppercase">Local IP Address</span>
                <span className="block text-blue-400 font-mono font-bold truncate">192.168.1.144</span>
              </div>
              <div className="bg-[#0b0f19] p-2 rounded-xl border border-white/5">
                <span className="text-gray-500 text-[8.5px] uppercase">Subnet Gateway</span>
                <span className="block text-white font-mono font-bold truncate">255.255.255.0</span>
              </div>
            </div>
          </div>

          {/* Device Automations connector diagram */}
          <div className="bg-[#161b22]/70 border border-[#30363d] rounded-2xl p-4.5 flex flex-col space-y-3 shadow-lg relative min-h-0 flex-1">
            <span className="text-[10px] font-mono uppercase font-bold text-gray-400 tracking-wider block">Device Automations canvas</span>
            
            <div className="relative flex-1 min-h-[180px] flex flex-col justify-between text-[7px] font-mono border border-white/5 bg-[#0f141c]/50 p-3 rounded-2xl">
              {/* SVG connection lines tracing */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none select-none z-0">
                <path d="M 64 30 H 122" fill="none" stroke="#2da44e" strokeWidth="1.5" className="stroke-dasharray-glow" />
                <path d="M 174 30 H 224" fill="none" stroke="#30363d" strokeWidth="1" />
                <path d="M 148 40 V 104 C 148 104, 150 110, 160 110 H 202" fill="none" stroke="#30363d" strokeWidth="1" />
              </svg>

              <div className="flex justify-between items-center relative z-10">
                <div className="bg-[#0d1117] px-2 py-1.5 border border-emerald-500/50 rounded flex items-center space-x-1 shrink-0 w-20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                  <span className="text-white">Scan Periph</span>
                </div>
                <div className="bg-[#0d1117] px-2 py-1.5 border border-[#30363d] rounded flex items-center space-x-1 shrink-0 w-20">
                  <span className="w-1.5 h-1.5 bg-blue-500 rounded-full shrink-0" />
                  <span className="text-white">Filter Periph</span>
                </div>
                <div className="bg-[#0d1117] px-2 py-1.5 border border-[#30363d] rounded flex items-center space-x-1 shrink-0 w-22">
                  <span className="w-1.5 h-1.5 bg-purple-500 rounded-full shrink-0" />
                  <span className="text-white">Orchestrate</span>
                </div>
              </div>

              <div className="flex justify-between items-center relative z-10">
                <div className="bg-[#0d1117] px-2 py-1.5 border border-red-500/50 rounded flex items-center space-x-1 shrink-0 w-[96px] mr-auto">
                  <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                  <span className="text-white">Inspect Printer</span>
                </div>
                <div className="bg-[#0d1117] px-2 py-1.5 border border-blue-500/30 rounded flex items-center space-x-1 shrink-0 w-22">
                  <span className="w-1.5 h-1.5 bg-blue-500 rounded-full shrink-0" />
                  <span className="text-white font-bold text-blue-400">Diagnosis OK</span>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Right Column: Inspector Details Panel & Agent context chat (3 Cols) */}
        <div className="xl:col-span-3 flex flex-col space-y-4">
          
          {/* Device Inspector panel */}
          <div className="bg-[#161b22]/70 border border-[#30363d] rounded-2xl p-4 flex flex-col space-y-3.5 shadow-lg select-none shrink-0 border-b-2">
            <span className="text-[10px] font-mono uppercase font-bold text-white tracking-wider border-b border-[#30363d] pb-2 text-left block">Epson ET-4800 Panel</span>
            
            <div className="flex items-center space-x-2.5 bg-black/10 p-2.5 rounded-xl border border-white/5">
              <Printer className="w-8 h-8 text-red-400 shrink-0 select-none" />
              <div>
                <span className="text-xs text-white font-bold select-text block">Epson ET-4800 Series</span>
                <span className="text-[9px] text-red-500 font-bold block mt-0.5">Error Jam Tray 2 • Ink Low</span>
              </div>
            </div>

            <div className="text-[10.5px] space-y-2 select-text font-mono max-h-40 overflow-y-auto">
              <div className="flex justify-between"><span className="text-gray-500 text-left">IP Address</span><span className="text-white">192.168.1.188</span></div>
              <div className="flex justify-between"><span className="text-gray-500 text-left">MAC Address</span><span className="text-white">00:1A:2B:3C:4D:5E</span></div>
              <div className="flex justify-between"><span className="text-gray-500 text-left">Manufacturer</span><span className="text-white">Epson Copier Inc.</span></div>
              <div className="flex justify-between"><span className="text-gray-500 text-left">Serial Number</span><span className="text-white">EPS-0928374-X4</span></div>
              <div className="flex justify-between"><span className="text-gray-500 text-left">Internal CPU</span><span className="text-white">ARM Cortex-M4</span></div>
              <div className="flex justify-between"><span className="text-gray-500 text-left">Subsystem Load</span><span className="text-emerald-400">Low (4.2%)</span></div>
            </div>

            {/* Diagnostic control status bar */}
            <div className="bg-[#0f141c] p-2.5 border border-white/5 rounded-lg text-center font-mono text-[9.5px]">
              <span className="text-blue-400 font-bold block animate-pulse">{dialText}</span>
            </div>

            <div className="space-y-1.5 shrink-0">
              <button 
                onClick={handleRunDiagnostics}
                className="w-full py-2 bg-blue-500 hover:bg-blue-600 font-bold rounded-xl text-white shadow shadow-blue-500/20 transition-all text-xs cursor-pointer flex items-center justify-center"
              >
                {diagnosing ? "Diagnosing..." : "Run Diagnostics"}
              </button>
              <button className="w-full py-1.5 bg-[#161b22] hover:bg-white/5 border border-[#30363d] rounded-xl text-[10px] font-bold text-gray-500 hover:text-white uppercase">
                Clean Print Head
              </button>
            </div>
          </div>

          {/* Agent Lee context helper chat panel */}
          <div className="bg-[#161b22]/70 border border-[#30363d] rounded-2xl p-4 flex flex-col shadow-lg flex-grow overflow-hidden select-none min-h-[180px]">
            <span className="text-[10px] font-mono uppercase font-bold text-gray-400 tracking-wider border-b border-[#30363d] pb-2 text-left block">Agent Lee Context Assistant</span>
            
            {/* Scrolled chat dialogs items */}
            <div className="flex-1 overflow-y-auto max-h-48 custom-scrollbar space-y-2.5 my-3 select-text font-serif">
              {chatLog.map((log, id) => (
                <div key={id} className="flex flex-col space-y-1 text-[11px] leading-relaxed">
                  <span className="text-[9px] font-bold font-mono text-blue-400 tracking-wider uppercase leading-none">{log.sender === "assistant" ? "Agent Lee Copilot" : "You"}</span>
                  <p className="bg-[#0d1117] p-2 rounded-xl border border-white/5 text-[#c9d1d9] leading-relaxed select-text">
                    {log.text}
                  </p>
                </div>
              ))}
            </div>

            {/* Chat recommendations triggers checks checkboxes */}
            <div className="space-y-1.5 shrink-0">
              <button 
                onClick={() => {
                  setChatLog(prev => [
                    ...prev,
                    { sender: "user", text: "Clean my print nozzles." },
                    { sender: "assistant", text: "Initializing print head nozzle wash process. High-pressure ink scrub launched. Printing test calibration grid shortly." }
                  ]);
                }}
                className="w-full text-left bg-[#0d1117] hover:bg-white/5 border border-white/5 text-[9.5px] italic text-[#c9d1d9] p-2 rounded-lg cursor-pointer flex items-center justify-between"
              >
                <span>Trigger print nozzle cleanse scrub</span>
                <ArrowRight className="w-3.5 h-3.5 text-blue-400 shrink-0" />
              </button>
            </div>

          </div>

        </div>

      </div>

        </div>
      </StudioNode>
    </StudioShell>
  );
}
