/*
FILE: leeway-agents\src\App.tsx
PURPOSE: LeeWay governed asset for leeway-employment-center.
TAG: AI.ORCHESTRATION.A_PP.MAIN
REGION: 🧠 AI
GOVERNED_BY: LeeWay Standards
OWNED_BY: Agent Lee / LeeWay Runtime
DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render
IMPORTS: Inferred by verification scanner
EXPORTS: Inferred by verification scanner
STATUS: ACTIVE
*/
/* 
LEEWAY HEADER â€” DO NOT REMOVE
REGION: CORE.RUNTIME
TAG: CORE.RUNTIME.MAIN

5WH:
WHAT = Main application entry point and Sovereign Runtime Orchestrator
WHY = Provides the primary UI and execution environment for Agent Lee OS
WHO = Leeway Innovations / Agent Lee System Engineer
WHERE = App.tsx
WHEN = 2026
HOW = React + Vite + Framer Motion + Sovereign Intelligence Engine
*/

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Activity, 
  Brain as BrainIcon,
  Cpu, 
  Database, 
  LayoutDashboard, 
  Mic, 
  MicOff, 
  Network, 
  Play, 
  Plus, 
  ShieldCheck, 
  Zap,
  Bell,
  Settings,
  Search,
  ChevronDown,
  ChevronRight,
  MoreVertical,
  CheckCircle2,
  AlertCircle,
  Clock,
  User,
  Terminal as TerminalIcon,
  Code,
  Globe,
  Folder,
  File,
  Save,
  RotateCcw,
  X,
  Layers,
  Shield,
  MessageSquare,
  Send,
  Loader2,
  Monitor,
  FileText,
  CheckSquare,
  Square,
  Box,
  Package
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Canvas, useFrame } from '@react-three/fiber';
import { 
  Sphere, 
  MeshDistortMaterial, 
  Float, 
  Stars, 
  PerspectiveCamera, 
  Text, 
  OrbitControls, 
  Html,
  Environment,
  Sparkles
} from '@react-three/drei';
import * as THREE from 'three';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart, 
  Pie, 
  Cell, 
  LineChart, 
  Line 
} from 'recharts';
import { LeewayInferenceClient } from './core/LeewayInferenceClient';
import Editor from '@monaco-editor/react';
import AgentLeeDBCenter from './pages/DatabaseHub';
import DiagnosticsPage from './pages/Diagnostics';

// --- Firebase Mock Setup ---
const firebaseConfig = {
  apiKey: "mock-api-key",
  authDomain: "mock-auth-domain",
  projectId: "mock-project-id",
  storageBucket: "mock-storage-bucket",
  messagingSenderId: "mock-sender-id",
  appId: "mock-app-id"
};

// Mocking Firebase for standalone use
const auth = { currentUser: { uid: 'user-123', email: 'osirussees@gmail.com', emailVerified: true, isAnonymous: false, tenantId: '', providerData: [] } };
const db = {};
const onAuthStateChanged = (auth: any, callback: any) => { callback(auth.currentUser); return () => {}; };
const testConnection = () => console.log("Firebase Connection: OK (Mock)");
const handleFirestoreError = (err: any) => console.error(err);

// --- Utilities ---
const cn = (...inputs: any[]) => inputs.filter(Boolean).join(' ');

// --- Engine Logic (Pillars 1-4) ---

class GuardCorps {
  private forbidden = [/remove/i, /delete/i, /purge/i, /wipe/i, /reset/i, /bypass/i];
  async scan(intent: string) {
    for (const pattern of this.forbidden) {
      if (pattern.test(intent)) return { level: "BLOCK", reason: "Destructive command intercepted by Guard Corps." };
    }
    return { level: "SAFE" };
  }
}

class SovereignMemory {
  private storage: any[] = [];
  async persist(event: any) {
    this.storage.push({ ...event, timestamp: Date.now() });
    console.log("[SovereignMemory] Synchronous write to L7 storage.");
  }
  getHistory() { return this.storage; }
}

class PersonaEngine {
  apply(text: string) {
    return `[LEEWAY_SOVEREIGN] ${text} // Sprinkle We + Slang-Injection applied.`;
  }
}

class AgentLeeRuntime {
  private inference = new LeewayInferenceClient();
  private persona = new PersonaEngine();
  private memory = new SovereignMemory();
  private guard = new GuardCorps();

  async run(intent: string) {
    const safety = await this.guard.scan(intent);
    if (safety.level === "BLOCK") return { error: safety.reason };

    const result = await this.inference.infer(intent);
    const response = this.persona.apply(result.response);
    
    await this.memory.persist({ intent, response, status: "SUCCESS" });
    
    return { response, status: "SUCCESS" };
  }
}

// --- Types ---
interface Agent {
  id: string;
  name: string;
  role: string;
  status: 'Healthy' | 'Warning' | 'Critical';
  compliance: number;
  family: 'Governance' | 'Discovery' | 'Integrity' | 'Security' | 'Orchestration' | 'Standards' | 'MCP' | 'SHIELD' | 'CORE' | 'UI' | 'BRAIN';
  lead: string;
}

interface VFSFile { name: string; content: string; type: 'file'; path: string; }
interface VFSDirectory { name: string; type: 'dir'; path: string; children: (VFSFile | VFSDirectory)[]; }
type VFSItem = VFSFile | VFSDirectory;

// --- Sub-Components ---

const AssemblyLine: React.FC<{ agents: Agent[], onDeployComplete: (agentId: string) => void }> = ({ agents, onDeployComplete }) => {
  const [isDeploying, setIsDeploying] = useState(false);
  const [deploymentStep, setDeploymentStep] = useState(0);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);

  const steps = [
    { label: 'Neural_Mapping', icon: BrainIcon },
    { label: 'Safety_Audit', icon: ShieldCheck },
    { label: 'Context_Injection', icon: Database },
    { label: 'Deployment', icon: Zap },
  ];

  const stations = [
    { color: 'text-cyber-green', glow: 'shadow-[0_0_30px_rgba(34,197,94,0.4)]', bg: 'bg-cyber-green/10' },
    { color: 'text-cyber-orange', glow: 'shadow-[0_0_30px_rgba(249,115,22,0.4)]', bg: 'bg-cyber-orange/10' },
    { color: 'text-cyber-blue', glow: 'shadow-[0_0_30px_rgba(0,242,255,0.4)]', bg: 'bg-cyber-blue/10' },
    { color: 'text-yellow-400', glow: 'shadow-[0_0_30px_rgba(250,204,21,0.4)]', bg: 'bg-yellow-400/10' },
    { color: 'text-cyber-red', glow: 'shadow-[0_0_30px_rgba(239,68,68,0.4)]', bg: 'bg-cyber-red/10' },
    { color: 'text-purple-500', glow: 'shadow-[0_0_30px_rgba(168,85,247,0.4)]', bg: 'bg-purple-500/10' },
  ];

  useEffect(() => {
    if (isDeploying && deploymentStep > 0 && deploymentStep < 5) {
      const timer = setTimeout(() => {
        if (deploymentStep === 4) {
          setTimeout(() => {
            if (selectedAgent) {
              onDeployComplete(selectedAgent.id);
              setIsDeploying(false);
              setDeploymentStep(0);
              setSelectedAgent(null);
              const u = new SpeechSynthesisUtterance(`${selectedAgent.name} deployment complete.`);
              window.speechSynthesis.speak(u);
            }
          }, 2000);
        } else {
          setDeploymentStep(prev => prev + 1);
        }
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [isDeploying, deploymentStep, selectedAgent, onDeployComplete]);

  const handleStartDeployment = (agent: Agent) => {
    setSelectedAgent(agent);
    setIsDeploying(true);
    setDeploymentStep(1);
    const u = new SpeechSynthesisUtterance(`Initiating deployment sequence for ${agent.name}.`);
    window.speechSynthesis.speak(u);
  };

  return (
    <div className="flex-grow flex flex-col bg-[#05070a] border border-cyber-border rounded-sm overflow-hidden font-mono">
      <div className="bg-[#0a0f1a] px-4 py-2 border-b border-cyber-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity size={16} className="text-cyber-blue" />
          <span className="text-xs font-black uppercase tracking-widest text-cyber-blue">Automated_Replication_Factory_v2.0</span>
        </div>
      </div>

      <div className="flex-grow flex flex-col md:flex-row overflow-hidden">
        <div className="w-full md:w-64 border-r border-cyber-border flex flex-col bg-black/40">
          <div className="p-3 border-b border-cyber-border bg-white/5"><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Individual Agent Clones</span></div>
          <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
            {agents.map(agent => (
              <button key={agent.id} disabled={isDeploying} onClick={() => setSelectedAgent(agent)} className={cn("w-full p-2 border text-left transition-all", selectedAgent?.id === agent.id ? "bg-cyber-blue/10 border-cyber-blue text-cyber-blue" : "bg-black/40 border-cyber-border text-slate-500 hover:text-cyber-blue")}>
                <div className="flex items-center justify-between mb-1"><span className="text-[10px] font-black uppercase">{agent.name}</span><div className={cn("w-1.5 h-1.5 rounded-full", agent.status === 'Healthy' ? 'bg-cyber-green' : 'bg-cyber-orange')} /></div>
                <div className="text-[8px] opacity-60 uppercase">{agent.family} // {agent.role}</div>
              </button>
            ))}
          </div>
          {selectedAgent && !isDeploying && (
            <div className="p-3 border-t border-cyber-border bg-cyber-blue/5">
              <button onClick={() => handleStartDeployment(selectedAgent)} className="w-full py-2 bg-cyber-blue text-black text-[10px] font-black uppercase tracking-widest hover:bg-cyber-blue/80 shadow-[0_0_15px_rgba(0,242,255,0.3)]">Initiate Cloning</button>
            </div>
          )}
        </div>

        <div className="flex-1 relative flex flex-col items-center justify-center p-4 bg-[#020408] overflow-hidden">
          <div className="absolute inset-0 opacity-5 bg-[linear-gradient(to_right,#1f2937_1px,transparent_1px),linear-gradient(to_bottom,#1f2937_1px,transparent_1px)] bg-[length:20px_20px]" />
          <div className="relative w-full h-full flex flex-col items-center justify-center gap-12">
            <div className="w-full flex justify-around items-end px-10">
              {stations.map((station, i) => (
                <div key={i} className="relative flex flex-col items-center group">
                  <div className="relative w-2 h-32 bg-[#1a1f26] origin-top">
                    <div className="absolute top-0 w-8 h-8 bg-[#2a2f36] rounded-full -left-3 border border-white/10" />
                    <motion.div animate={{ rotate: [15, -15, 15] }} transition={{ duration: 4, repeat: Infinity, delay: i * 0.3 }} className="absolute top-8 w-2 h-24 bg-[#2a2f36] origin-top rounded-full">
                      <motion.div animate={{ rotate: [-20, 20, -20] }} transition={{ duration: 3, repeat: Infinity, delay: i * 0.3 }} className="absolute bottom-0 w-2 h-20 bg-[#3a3f46] origin-top rounded-full">
                        <div className="absolute bottom-0 w-4 h-6 bg-[#4a4f56] -left-1 rounded-sm flex items-center justify-center">
                          <div className={cn("w-1 h-1 rounded-full animate-pulse", station.color.replace('text', 'bg'))} />
                          <motion.div animate={{ opacity: [0.2, 0.8, 0.2], height: [40, 60, 40] }} transition={{ duration: 0.5, repeat: Infinity }} className={cn("absolute top-full w-px blur-[1px]", station.color.replace('text', 'bg'))} />
                        </div>
                      </motion.div>
                    </motion.div>
                  </div>
                  <div className="mt-4 relative">
                    <div className="w-24 h-24 rounded-t-full border-x border-t border-white/20 bg-white/5 backdrop-blur-sm relative overflow-hidden">
                      <div className="absolute inset-0 flex items-center justify-center">
                        <motion.div animate={{ y: [0, -5, 0], scale: [1, 1.05, 1] }} transition={{ duration: 3, repeat: Infinity, delay: i * 0.5 }} className={cn("w-12 h-12 rounded-full border-2 border-white/20 flex items-center justify-center relative overflow-hidden", station.bg, station.glow)}>
                          <Cpu size={16} className={cn("animate-pulse", station.color)} />
                        </motion.div>
                      </div>
                    </div>
                    <div className="w-24 h-4 bg-[#0a0f1a] border border-white/10 rounded-b-sm shadow-lg" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <AnimatePresence>
            {isDeploying && selectedAgent && (
              <motion.div key="deployment-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                <div className="relative flex flex-col items-center">
                  {deploymentStep === 4 && <motion.div animate={{ height: 2000, opacity: [0, 1, 0.8, 1] }} className="absolute bottom-0 w-64 bg-gradient-to-t from-cyber-blue/60 via-white/40 to-transparent blur-3xl pointer-events-none" />}
                  <motion.div animate={{ y: deploymentStep === 4 ? -1000 : 0, scale: deploymentStep === 4 ? 0.2 : 1, opacity: deploymentStep === 4 ? 0 : 1 }} transition={{ duration: 2, ease: "easeIn" }} className="w-40 h-40 rounded-full border-4 border-cyber-blue bg-cyber-blue/20 shadow-[0_0_100px_rgba(0,242,255,0.5)] flex flex-col items-center justify-center relative overflow-hidden">
                    <span className="text-xs font-black text-white uppercase mb-2 z-10">{selectedAgent.name}</span>
                    <Cpu size={48} className="text-white animate-pulse z-10" />
                    <span className="text-[8px] font-black text-white/60 uppercase mt-2 z-10">CLONE_INSTANCE</span>
                  </motion.div>
                  <div className="mt-8 text-center">
                    <div className="text-xl font-black text-cyber-blue uppercase tracking-[0.5em] animate-pulse">{steps[deploymentStep - 1]?.label || 'INITIALIZING'}</div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

const AgentVM: React.FC<{ vfs: VFSDirectory, onVFSChange: (vfs: VFSDirectory) => void, activeFilePath: string, setActiveFilePath: (path: string) => void, isMinimized: boolean, setIsMinimized: (min: boolean) => void, messages: any[], onSendMessage: (content: string) => void, isThinking: boolean }> = ({ vfs, onVFSChange, activeFilePath, setActiveFilePath, isMinimized, setIsMinimized, messages, onSendMessage, isThinking }) => {
  const [activeFileContent, setActiveFileContent] = useState('');
  const [currentApp, setCurrentApp] = useState<'desktop' | 'vscode' | 'browser' | 'notepad' | 'pallium' | 'terminal'>('desktop');
  const [isAppMinimized, setIsAppMinimized] = useState(false);

  useEffect(() => {
    const findItem = (dir: VFSDirectory, path: string): VFSItem | null => {
      if (path === '/') return dir;
      const parts = path.split('/').filter(Boolean);
      let curr: VFSItem = dir;
      for (const p of parts) {
        if (curr.type === 'dir') {
          const found = curr.children.find(c => c.name === p);
          if (found) curr = found; else return null;
        } else return null;
      }
      return curr;
    };
    const file = findItem(vfs, activeFilePath);
    if (file && file.type === 'file') setActiveFileContent(file.content);
  }, [activeFilePath, vfs]);

  const FileTreeItem: React.FC<{ item: VFSItem, level: number, onSelect: (path: string) => void, selectedPath: string }> = ({ item, level, onSelect, selectedPath }) => {
    const [isOpen, setIsOpen] = useState(true);
    const isSelected = selectedPath === item.path;
    if (item.type === 'file') return <button onClick={() => onSelect(item.path)} className={cn("w-full flex items-center gap-2 px-2 py-1 text-xs hover:bg-white/5 transition-colors", isSelected ? "bg-blue-500/20 text-blue-400 border-l-2 border-blue-500" : "text-zinc-400")} style={{ paddingLeft: `${level * 12 + 8}px` }}><File size={14} /><span>{item.name}</span></button>;
    return <div><button onClick={() => setIsOpen(!isOpen)} className="w-full flex items-center gap-2 px-2 py-1 text-xs text-zinc-300 hover:bg-white/5" style={{ paddingLeft: `${level * 12 + 8}px` }}>{isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}<Folder size={14} className="text-blue-400" /><span>{item.name}</span></button>{isOpen && <div>{item.children.map((c, i) => <FileTreeItem key={i} item={c} level={level + 1} onSelect={onSelect} selectedPath={selectedPath} />)}</div>}</div>;
  };

  if (isMinimized) return <motion.button onClick={() => setIsMinimized(false)} className="fixed bottom-24 right-8 w-14 h-14 bg-black rounded-full flex items-center justify-center shadow-2xl z-50 border-2 border-yellow-500/50"><Cpu className="text-white" size={20} /></motion.button>;

  return (
    <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-full h-full flex flex-col">
      <div className="relative flex flex-col h-full items-center">
        <div className="relative p-3 bg-[#dcd7c0] rounded-[20px] shadow-2xl border-[6px] border-[#c5bfab] flex flex-col w-full aspect-[4/3] overflow-hidden z-20">
          <div className="relative flex-grow bg-[#1a1b1e] rounded-[12px] border-[5px] border-[#b0aa93] shadow-inner overflow-hidden flex flex-col">
            <div className="h-6 bg-[#c0c0c0] border-b border-white shadow-sm flex items-center justify-between px-2 shrink-0 z-50">
              <div className="flex items-center gap-2">
                <button onClick={() => { setCurrentApp('desktop'); setIsAppMinimized(false); }} className="px-1.5 py-0.5 bg-[#c0c0c0] border border-white shadow-sm text-[9px] font-bold text-zinc-900">Start</button>
                <div className="flex gap-1">
                  {['vscode', 'browser', 'notepad', 'terminal'].map(app => (
                    <button key={app} onClick={() => { setCurrentApp(app as any); setIsAppMinimized(false); }} className={cn("px-2 py-0.5 text-[8px] font-bold border border-white shadow-sm", currentApp === app && !isAppMinimized ? "bg-zinc-300 shadow-inner" : "bg-[#c0c0c0]")}>{app.toUpperCase()}</button>
                  ))}
                </div>
              </div>
              {currentApp !== 'desktop' && (
                <div className="flex gap-1">
                  <button onClick={() => setIsAppMinimized(!isAppMinimized)} className="w-3 h-3 bg-[#c0c0c0] border border-white shadow-sm flex items-center justify-center text-[8px] font-bold">_</button>
                  <button onClick={() => setCurrentApp('desktop')} className="w-3 h-3 bg-[#c0c0c0] border border-white shadow-sm flex items-center justify-center text-[8px] font-bold">X</button>
                </div>
              )}
            </div>
            <div className="flex-grow flex overflow-hidden relative">
              {(currentApp === 'desktop' || isAppMinimized) && (
                <div className="absolute inset-0 bg-[#008080] p-4 grid grid-cols-4 gap-4 content-start">
                  {[
                    { id: 'vscode', name: 'LeeCode', icon: <Code size={24} />, color: 'text-blue-400' },
                    { id: 'browser', name: 'Web Search', icon: <Globe size={24} />, color: 'text-orange-400' },
                    { id: 'notepad', name: 'Notepad', icon: <FileText size={24} />, color: 'text-yellow-400' },
                    { id: 'terminal', name: 'Terminal', icon: <TerminalIcon size={24} />, color: 'text-zinc-400' },
                  ].map(app => (
                    <button key={app.id} onClick={() => { setCurrentApp(app.id as any); setIsAppMinimized(false); }} className="flex flex-col items-center gap-1 group">
                      <div className={cn("p-3 bg-zinc-900/20 rounded-lg border border-transparent group-hover:border-white/20 transition-all shadow-lg", app.color)}>{app.icon}</div>
                      <span className="text-[10px] font-bold text-white drop-shadow-md">{app.name}</span>
                    </button>
                  ))}
                </div>
              )}
              {!isAppMinimized && (
                <div className="flex-grow flex flex-col">
                  {currentApp === 'notepad' && <div className="flex-grow bg-white text-zinc-900 p-4 overflow-y-auto text-xs whitespace-pre-wrap">{activeFileContent}</div>}
                  {currentApp === 'browser' && <div className="flex-grow bg-white flex flex-col items-center justify-center gap-4"><h1 className="text-4xl font-black italic text-blue-600">Leeway Search</h1><div className="w-full max-w-sm h-10 border border-zinc-200 rounded-full flex items-center px-4 gap-3"><Search size={16} className="text-zinc-400" /><input className="bg-transparent outline-none text-sm w-full" placeholder="Search leeway..." /></div></div>}
                  {currentApp === 'terminal' && <div className="flex-grow bg-black text-green-500 p-4 font-mono text-xs">lee@vm:~$ _</div>}
                  {currentApp === 'vscode' && (
                    <div className="flex-grow flex flex-col bg-[#1e1e1e]">
                      <div className="h-7 bg-[#323233] flex items-center px-2 shrink-0 border-b border-black/20 text-zinc-400 text-[9px] font-medium"><Code size={10} className="text-blue-400 mr-2" />LeeCode Studio â€” {activeFilePath.split('/').pop()}</div>
                      <div className="flex-grow flex overflow-hidden">
                        <div className="w-40 bg-[#252526] border-r border-white/5 flex flex-col shrink-0 overflow-hidden"><div className="h-7 flex items-center px-2 text-[8px] font-bold text-zinc-500 uppercase tracking-widest bg-[#2d2d2d]">Explorer</div><div className="flex-grow overflow-y-auto"><FileTreeItem item={vfs} level={0} onSelect={setActiveFilePath} selectedPath={activeFilePath} /></div></div>
                        <div className="flex-grow flex flex-col min-w-0">
                          <div className="flex-grow relative overflow-hidden"><Editor height="100%" path={activeFilePath} defaultLanguage="typescript" theme="vs-dark" value={activeFileContent} options={{ fontSize: 12, minimap: { enabled: false }, scrollBeyondLastLine: false, padding: { top: 4 }, fontFamily: 'JetBrains Mono, monospace', wordWrap: 'on', automaticLayout: true }} /></div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          <div className="h-8 mt-1 flex items-center justify-between px-3 w-full"><span className="text-[7px] font-black text-[#8a846d] italic">AgentVM-3000</span><button onClick={() => setIsMinimized(true)} className="w-3 h-3 rounded-sm bg-[#ff4b4b] border border-[#cc3a3a]" /></div>
        </div>
      </div>
    </motion.div>
  );
};

// --- Main App Component ---

export default function App() {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [executionLog, setExecutionLog] = useState<any[]>([]);
  const [currentView, setCurrentView] = useState<'dashboard' | 'workstation' | 'assembly' | 'diagnostics' | 'database'>('diagnostics');
  const [isMinimized, setIsMinimized] = useState(false);
  const [activeFilePath, setActiveFilePath] = useState('/deploy.config');
  const [vfs, setVfs] = useState<VFSDirectory>({
    name: 'root', type: 'dir', path: '/', children: [
      { name: 'agents', type: 'dir', path: '/agents', children: [{ name: 'LeePrime.agent', type: 'file', path: '/agents/LeePrime.agent', content: '{\n  "id": "1",\n  "name": "Lee Prime"\n}' }] },
      { name: 'deploy.config', type: 'file', path: '/deploy.config', content: 'TARGET=PRODUCTION\nREGION=US-EAST' }
    ]
  });

  const [agents] = useState<Agent[]>([
    { id: 'lee-prime', name: 'Lee Prime', role: 'Sovereign Orchestrator', status: 'Healthy', compliance: 100, family: 'BRAIN', lead: 'Lee' },
    { id: 'nova', name: 'Nova', role: 'Master Engineer', status: 'Healthy', compliance: 100, family: 'CORE', lead: 'Nova' },
    { id: 'atlas', name: 'Atlas', role: 'Research Intel', status: 'Healthy', compliance: 98, family: 'CORE', lead: 'Atlas' },
    { id: 'sage', name: 'Sage', role: 'Memory Architect', status: 'Healthy', compliance: 100, family: 'CORE', lead: 'Sage' },
    { id: 'pixel', name: 'Pixel', role: 'Visual Intelligence', status: 'Healthy', compliance: 99, family: 'UI', lead: 'Pixel' },
    { id: 'echo', name: 'Echo', role: 'Voice & Emotion', status: 'Healthy', compliance: 97, family: 'UI', lead: 'Echo' },
    { id: 'aegis', name: 'Guard Aegis', role: 'Registry Keeper', status: 'Healthy', compliance: 100, family: 'SHIELD', lead: 'Aegis' },
    { id: 'scribe', name: 'Scribe', role: 'Chronicler', status: 'Healthy', compliance: 100, family: 'CORE', lead: 'Scribe' },
    { id: 'shield', name: 'Shield', role: 'Security & Healing', status: 'Healthy', compliance: 95, family: 'SHIELD', lead: 'Shield' },
    { id: 'adam', name: 'Adam Cortex', role: 'Graph Architect', status: 'Healthy', compliance: 96, family: 'BRAIN', lead: 'Adam' },
    { id: 'brain-sentinel', name: 'Brain Sentinel', role: 'Neural Overseer', status: 'Healthy', compliance: 99, family: 'BRAIN', lead: 'Sentinel' },
    { id: 'gabriel', name: 'Gabriel', role: 'Law Enforcer', status: 'Healthy', compliance: 100, family: 'BRAIN', lead: 'Gabriel' },
    { id: 'librarian', name: 'Librarian', role: 'Docs Governance', status: 'Healthy', compliance: 98, family: 'CORE', lead: 'Librarian' },
    { id: 'lily', name: 'Lily Cortex', role: 'Analytical Thinker', status: 'Healthy', compliance: 97, family: 'BRAIN', lead: 'Lily' },
    { id: 'marshal', name: 'Marshal Verify', role: 'Verification Corps', status: 'Healthy', compliance: 99, family: 'BRAIN', lead: 'Marshal' },
    { id: 'nexus', name: 'Nexus', role: 'Deployment Engine', status: 'Healthy', compliance: 94, family: 'CORE', lead: 'Nexus' },
    { id: 'syntax-forge', name: 'Syntax Forge', role: 'Code Architect', status: 'Healthy', compliance: 98, family: 'CORE', lead: 'Forge' },
    { id: 'aria', name: 'Aria', role: 'Multilingual Agent', status: 'Healthy', compliance: 96, family: 'UI', lead: 'Aria' },
    { id: 'bug-hunter', name: 'Bug Hunter', role: 'Fault Seeker', status: 'Healthy', compliance: 95, family: 'CORE', lead: 'Bug' },
    { id: 'clerk', name: 'Clerk Archive', role: 'Report Keeper', status: 'Healthy', compliance: 99, family: 'CORE', lead: 'Clerk' },
    { id: 'janitor', name: 'Janitor', role: 'Storage Hygiene', status: 'Healthy', compliance: 100, family: 'CORE', lead: 'Janitor' },
    { id: 'leeway-standards', name: 'Leeway Std', role: 'SDK Bridge', status: 'Healthy', compliance: 100, family: 'BRAIN', lead: 'Standards' },
    { id: 'safety', name: 'Safety', role: 'Redaction Guard', status: 'Healthy', compliance: 100, family: 'SHIELD', lead: 'Safety' },
    { id: 'stt', name: 'Streaming STT', role: 'Speech-to-Text', status: 'Healthy', compliance: 98, family: 'UI', lead: 'STT' },
    { id: 'tts', name: 'Streaming TTS', role: 'Text-to-Speech', status: 'Healthy', compliance: 98, family: 'UI', lead: 'TTS' },
    { id: 'conductor', name: 'Conductor', role: 'Live Pipeline', status: 'Healthy', compliance: 97, family: 'UI', lead: 'Conductor' },
    { id: 'router', name: 'Router Agent', role: 'Routing Intelligence', status: 'Healthy', compliance: 99, family: 'BRAIN', lead: 'Router' },
  ]);

  const engine = useMemo(() => new AgentLeeRuntime(), []);

  const speak = (text: string) => { const u = new SpeechSynthesisUtterance(text); u.rate = 1.1; window.speechSynthesis.speak(u); };

  const handleRunWorkflow = async (intent: string = "Execute standard workflow") => {
    setIsProcessing(true); speak("Executing Leeway Sovereign Workflow.");
    try {
      const result = await engine.run(intent);
      if (result.error) speak(`Security Alert: ${result.error}`);
      else speak(`Workflow complete.`);
      setExecutionLog((engine as any).memory.getHistory());
    } catch (error) { console.error(error); speak("Workflow execution failed."); } finally { setIsProcessing(false); }
  };

  const handleDeployComplete = (agentId: string) => {
    const agent = agents.find(a => a.id === agentId);
    speak(`Deployment successful. A clone of ${agent?.name} has been teleported.`);
    (engine as any).logger.log({ intent: `Deploy Clone: ${agent?.name}`, status: "SUCCESS" });
    setExecutionLog((engine as any).logger.getHistory());
  };

  return (
    <div className="h-screen w-screen flex flex-col p-4 bg-[#020406] text-cyber-blue font-mono overflow-hidden">
      <div className="flex-1 flex flex-col border-[12px] border-[#1a1f26] rounded-xl shadow-[0_0_100px_rgba(0,0,0,0.8)] overflow-hidden bg-black relative">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-3 bg-[#2a2f36] rounded-b-md z-50 flex items-center justify-center gap-2 border-x border-b border-white/5">
          <div className="w-1 h-1 rounded-full bg-cyber-green animate-pulse" /><div className="w-1 h-1 rounded-full bg-cyber-blue" /><div className="w-1 h-1 rounded-full bg-cyber-orange" />
        </div>
        <div className="absolute left-0 top-1/4 bottom-1/4 w-1 flex flex-col justify-around gap-2 px-0.5 opacity-20">{[...Array(20)].map((_, i) => <div key={i} className="h-px w-full bg-white" />)}</div>
        <div className="absolute right-0 top-1/4 bottom-1/4 w-1 flex flex-col justify-around gap-2 px-0.5 opacity-20">{[...Array(20)].map((_, i) => <div key={i} className="h-px w-full bg-white" />)}</div>
        <div className="absolute bottom-0 left-6 h-6 flex items-center gap-2 z-50"><ShieldCheck size={10} className="text-cyber-blue/40" /><span className="text-[8px] font-black text-white/20 tracking-[0.4em] uppercase">LEEWAY_OS</span></div>

        <header className="flex items-center justify-between px-6 py-3 border-b border-cyber-border bg-cyber-card/50 backdrop-blur-md">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3"><div className="p-1.5 bg-cyber-blue/10 border border-cyber-blue/30 rounded-sm"><ShieldCheck className="text-cyber-blue" size={20} /></div><div className="flex flex-col"><h1 className="text-xs font-black tracking-[0.3em] uppercase text-white">Leeway_Deployment_Center</h1><span className="text-[8px] text-slate-500 font-bold">SECURE_AGENT_INVESTIGATION_ENVIRONMENT_v4.0</span></div></div>
          </div>
          <div className="flex items-center gap-4"><div className="flex flex-col items-end"><span className="text-[7px] text-slate-500 uppercase font-black tracking-widest">Auth_Session</span><span className="text-[9px] text-cyber-blue/80 font-bold">osirussees@gmail.com</span></div><div className="w-9 h-9 rounded-sm bg-cyber-blue/10 border border-cyber-blue/30 flex items-center justify-center"><User size={18} className="text-cyber-blue" /></div></div>
        </header>

        <main className="flex-1 flex overflow-hidden">
          <aside className="w-16 flex flex-col gap-3 shrink-0 p-3 border-r border-cyber-border bg-black/40">
            {[
              { id: 'diagnostics', icon: Activity, label: 'Diagnostics' },
              { id: 'workstation', icon: TerminalIcon, label: 'Workstation' },
              { id: 'assembly', icon: Zap, label: 'Assembly Line' },
              { id: 'database', icon: Database, label: 'Database Hub' },
            ].map((item) => (
              <button key={item.id} onClick={() => setCurrentView(item.id as any)} className={cn("w-full aspect-square flex items-center justify-center border transition-all relative group", currentView === item.id ? "bg-cyber-blue/20 border-cyber-blue text-cyber-blue shadow-[0_0_15px_rgba(0,242,255,0.3)]" : "bg-cyber-card border-cyber-border text-slate-500 hover:text-cyber-blue")}><item.icon size={20} /></button>
            ))}
          </aside>

          <div className="flex-1 flex flex-col overflow-hidden relative">
            <AnimatePresence mode="wait">
              <motion.div key={currentView} initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.02 }} transition={{ duration: 0.3 }} className="flex-1 overflow-hidden">
                {currentView === 'diagnostics' ? (
                  <DiagnosticsPage />
                ) : currentView === 'workstation' ? (
                  <AgentVM vfs={vfs} onVFSChange={setVfs} activeFilePath={activeFilePath} setActiveFilePath={setActiveFilePath} isMinimized={isMinimized} setIsMinimized={setIsMinimized} messages={[]} onSendMessage={handleRunWorkflow} isThinking={isProcessing} />
                ) : currentView === 'assembly' ? (
                  <AssemblyLine agents={agents} onDeployComplete={handleDeployComplete} />
                ) : (
                  <AgentLeeDBCenter />
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>

        <div className="h-6 bg-[#1a1f26] border-t border-black/40 flex items-center px-4 justify-between">
          <div className="flex gap-4"><div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-cyber-green" /><span className="text-[7px] text-slate-500 font-black uppercase">Power_On</span></div></div>
          <div className="text-[7px] text-slate-600 font-black uppercase tracking-widest">Leeway_Workstation_Series_X</div>
        </div>
      </div>
    </div>
  );
}

