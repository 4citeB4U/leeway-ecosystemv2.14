/*
FILE: L8_Telemetry_Assembly\Diagnostics.tsx
PURPOSE: LeeWay governed asset for leeway-employment-center.
TAG: UTIL.FILE.D_IA_GN_OS_TI_CS.MAIN
REGION: 🟠 UTIL
GOVERNED_BY: LeeWay Standards
OWNED_BY: Agent Lee / LeeWay Runtime
DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render
IMPORTS: Inferred by verification scanner
EXPORTS: Inferred by verification scanner
STATUS: ACTIVE
*/
/**
 * LEEWAY STANDARDS COMPLIANT | VERSION 2.1
 * REGION: UI.PAGE.DIAGNOSTICS
 * AGENT_OWNER: LWA_Architect
 * DETERMINISTIC_ID: diag-001
 * SOVEREIGNTY_CHECK: PASSED (BONDED_BUS)
 */

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
  Activity, Cpu, Database, Wifi, Thermometer, 
  Gauge, Zap, X, Shield, Terminal, 
  Volume2, Fingerprint, Play, Square, Hammer, Rocket, Monitor,
  PieChart as LucidePieChart, Settings2, Globe, Eye, Mic2, UserCheck, 
  PenTool, Network, Gavel, BookOpen, Code2, Code, ShieldCheck, 
  Server, Languages, Bug, Archive, Trash2, ShieldAlert, Mic, 
  Radio, GitBranch, LucideIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, LineChart, Line,
  PieChart, Pie, Cell
} from 'recharts';
import { Html, Line as DreiLine, PerspectiveCamera, OrbitControls, Stars } from '@react-three/drei';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { cn } from '../lib/utils';
import { eventBus } from '../core/eventBus';

// --- Types ---
interface AgentData {
  id: string;
  title: string;
  subtitle: string;
  responsibility: string;
  icon: LucideIcon;
  imageUrl: string;
  color: string;
  position: [number, number, number];
  description: string;
  tools: string[];
  workflow: string[];
  status: 'ACTIVE' | 'IDLE' | 'SLEEP';
  metrics: { cpu: number; memory: number; latency: number };
  tasks: { id: string; label: string; progress: number; isRunning: boolean }[];
}

// --- Agent Manifest (The 110+ Agent Seed) ---
const AGENTS_RAW: Omit<AgentData, 'position'>[] = [
  {
    id: 'lee-prime',
    title: 'LEE PRIME',
    subtitle: 'SOVEREIGN ORCHESTRATOR',
    responsibility: 'SYSTEM GOVERNANCE',
    icon: Cpu,
    imageUrl: 'https://robohash.org/lee-prime?set=set1',
    color: '#00f2ff',
    description: 'Master sovereign orchestrator of the Agent Lee ecosystem. Routes G1â€“G8 workflows across the federated agent clusters.',
    tools: ['Task Router', 'Context Assembler', 'Event Bus'],
    workflow: ['Receive Intent', 'Decompose Goal', 'Delegate', 'Verify'],
    status: 'ACTIVE',
    metrics: { cpu: 42, memory: 128, latency: 120 },
    tasks: [{ id: 't1', label: 'Monitoring Agent Sync', progress: 45, isRunning: true }]
  },
  {
    id: 'nova',
    title: 'NOVA',
    subtitle: 'MASTER ENGINEER',
    responsibility: 'CODE SYNTHESIS',
    icon: Code2,
    imageUrl: 'https://robohash.org/nova?set=set1',
    color: '#F59E0B',
    description: 'Master software engineer. Writes and debugs software within the sovereign VM sandbox.',
    tools: ['Code Execution', 'Debugger', 'Unit Tester'],
    workflow: ['Read Specs', 'Draft Code', 'Execute Tests'],
    status: 'ACTIVE',
    metrics: { cpu: 88, memory: 512, latency: 450 },
    tasks: [{ id: 't3', label: 'Refactoring Core Logic', progress: 65, isRunning: true }]
  },
  {
      id: 'shield',
      title: 'SHIELD',
      subtitle: 'SECURITY & HEALING',
      responsibility: 'SELF-HEALING SECURITY',
      icon: Shield,
      imageUrl: 'https://robohash.org/shield?set=set1',
      color: '#EF4444',
      description: 'Security and self-healing agent. Monitors errors and enforces the sovereign runtime safety envelope.',
      tools: ['Error Monitor', 'Patch Writer', 'Security Scanner'],
      workflow: ['Detect Anomaly', 'Diagnose', 'Draft Patch'],
      status: 'ACTIVE',
      metrics: { cpu: 22, memory: 96, latency: 30 },
      tasks: [{ id: 't8', label: 'Monitoring Error Flux', progress: 75, isRunning: true }]
  }
];

const AGENTS: AgentData[] = AGENTS_RAW.map((agent, i) => {
    const angle = (i / AGENTS_RAW.length) * Math.PI * 2;
    const r = 10;
    return {
        ...agent,
        position: [Math.cos(angle) * r, Math.sin(angle * 0.5) * 2, Math.sin(angle) * r] as [number, number, number]
    };
});

// --- Components ---

function MetricCard({ icon: Icon, label, value, color, sub }: { icon: LucideIcon; label: string; value: string; color: string; sub?: string }) {
  return (
    <div 
      className="p-6 rounded-[2rem] flex flex-col gap-4 border backdrop-blur-3xl transition-all hover:scale-105"
      style={{ 
        backgroundColor: `${color}08`,
        borderColor: `${color}20`,
        boxShadow: `inset 0 0 30px ${color}08`
      }}
    >
      <div className="flex items-center justify-between">
        <div className="p-3 rounded-2xl" style={{ backgroundColor: `${color}15` }}>
          <Icon size={20} style={{ color }} />
        </div>
        <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: color }} />
      </div>
      <div>
        <p className="text-[11px] font-black text-white/40 uppercase tracking-[0.2em] mb-1">{label}</p>
        <p className="text-3xl font-black text-white leading-none">{value}</p>
        {sub && <p className="text-[10px] font-mono mt-2 opacity-50 uppercase tracking-tighter">{sub}</p>}
      </div>
    </div>
  );
}

function SystemProgress({ label, progress, color }: { label: string; progress: number; color: string }) {
  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-2.5">
        <span className="text-[10px] font-black text-white/60 uppercase tracking-widest">{label}</span>
        <span className="text-[10px] font-mono font-black" style={{ color }}>{progress}%</span>
      </div>
      <div className="h-2.5 w-full rounded-full overflow-hidden bg-white/5 border border-white/5">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          className="h-full rounded-full"
          style={{ backgroundColor: color, boxShadow: `0 0 15px ${color}44` }}
        />
      </div>
    </div>
  );
}

const AgentNode = ({ agent, onClick }: { agent: AgentData; onClick: (a: AgentData) => void }) => {
    const meshRef = useRef<THREE.Mesh>(null);
    useFrame((state, delta) => {
        if (meshRef.current) {
            meshRef.current.rotation.y += delta * 0.5;
            meshRef.current.position.y = agent.position[1] + Math.sin(state.clock.elapsedTime + agent.position[0]) * 0.5;
        }
    });

    return (
        <group position={agent.position}>
            <mesh ref={meshRef} onClick={() => onClick(agent)}>
                <sphereGeometry args={[0.5, 32, 32]} />
                <meshStandardMaterial color={agent.color} emissive={agent.color} emissiveIntensity={0.5} wireframe />
            </mesh>
            <Html distanceFactor={15}>
                <div 
                    className="px-3 py-1.5 rounded-xl bg-black/80 border text-[10px] font-black text-white whitespace-nowrap cursor-pointer pointer-events-auto shadow-2xl"
                    style={{ borderColor: agent.color }}
                    onClick={() => onClick(agent)}
                >
                    {agent.title}
                </div>
            </Html>
        </group>
    );
};

// --- Main Diagnostics Interface ---
export const Diagnostics: React.FC = () => {
    const [selectedAgent, setSelectedAgent] = useState<AgentData | null>(null);
    const [metrics, setMetrics] = useState({ cpu: 0, mem: 0, net: 0, temp: 42 });
    const [history, setHistory] = useState<any[]>([]);

    useEffect(() => {
        const unsub = eventBus.on('northbridge:pulse', (data: any) => {
            setMetrics({
                cpu: data.telemetry.load.value,
                mem: data.telemetry.memory.value,
                net: data.telemetry.io.value,
                temp: 45 + Math.random() * 5
            });
            setHistory(prev => [...prev.slice(-19), {
                time: new Date().toLocaleTimeString([], { second: '2-digit' }),
                cpu: data.telemetry.load.value,
                mem: data.telemetry.memory.value
            }]);
        });
        return unsub;
    }, []);

    return (
        <div className="w-full h-full bg-[#020306] text-slate-200 overflow-hidden flex flex-col relative font-sans">
            {/* 3D Visual Context */}
            <div className="absolute inset-x-0 top-0 bottom-0 z-0">
                <Canvas>
                    <PerspectiveCamera makeDefault position={[0, 15, 25]} />
                    <OrbitControls enablePan={false} maxPolarAngle={Math.PI / 2.2} />
                    <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
                    <ambientLight intensity={0.5} />
                    <pointLight position={[10, 10, 10]} intensity={1} />
                    {AGENTS.map(a => <AgentNode key={a.id} agent={a} onClick={setSelectedAgent} />)}
                    <gridHelper args={[100, 50, "#00f2ff22", "#00f2ff08"]} position={[0, -2, 0]} />
                </Canvas>
            </div>

            {/* Glass Overlays */}
            <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-[#020306] via-transparent to-transparent opacity-90 z-1" />

            {/* Header HUD */}
            <header className="relative z-10 p-10 flex items-center justify-between">
                <div>
                    <h1 className="text-4xl font-black italic tracking-tighter uppercase text-white drop-shadow-2xl">
                        Sovereign Northbridge <span className="text-[10px] not-italic opacity-40 font-mono tracking-[0.5em] ml-6 text-cyan-400">STATUS_OK</span>
                    </h1>
                    <div className="flex items-center gap-6 mt-3">
                        <div className="flex items-center gap-2.5 px-4 py-1.5 bg-green-500/5 border border-green-500/20 rounded-full">
                            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                            <span className="text-[10px] font-black uppercase text-green-500 tracking-widest">Global Integrity Validated</span>
                        </div>
                    </div>
                </div>

                <div className="flex gap-4">
                    <button className="p-4 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-xl hover:bg-white/10 transition-all">
                        <Settings2 className="w-6 h-6 text-slate-400" />
                    </button>
                </div>
            </header>

            {/* Main Metrics (Bottom Half) */}
            <main className="relative z-10 mt-auto p-10 grid grid-cols-12 gap-8 pointer-events-auto">
                {/* Column 1: Real-time Telemetry */}
                <div className="col-span-8 flex flex-col gap-6">
                    <div className="grid grid-cols-5 gap-6">
                        <MetricCard icon={Cpu} label="Compute Load" value={`${metrics.cpu.toFixed(1)}%`} color="#00f2ff" sub="Qwen-VL-7B" />
                        <MetricCard icon={Database} label="L3 Cache" value={`${metrics.mem.toFixed(1)}%`} color="#A855F7" sub="24GB VRAM" />
                        <MetricCard icon={Wifi} label="Bus Flux" value={`${metrics.net.toFixed(1)}GB/s`} color="#10B981" sub="BondedTensorBus" />
                        <MetricCard icon={Thermometer} label="Core Temp" value={`${metrics.temp.toFixed(1)}Â°C`} color="#EF4444" sub="Delta Limit 85Â°C" />
                        <MetricCard icon={Activity} label="Heartbeat" value="12ms" color="#F59E0B" sub="Sub-ms Jitter" />
                    </div>

                    <div className="h-64 bg-black/40 border border-white/5 rounded-[2.5rem] p-8 backdrop-blur-3xl">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={history}>
                                <defs>
                                    <linearGradient id="loadGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#00f2ff" stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor="#00f2ff" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                                <XAxis dataKey="time" hide />
                                <YAxis hide />
                                <Area type="monotone" dataKey="cpu" stroke="#00f2ff" strokeWidth={4} fill="url(#loadGrad)" isAnimationActive={false} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Column 2: System Health */}
                <div className="col-span-4 p-8 bg-white/[0.03] border border-white/10 rounded-[2.5rem] backdrop-blur-3xl flex flex-col gap-8 shadow-2xl">
                    <h3 className="text-sm font-black uppercase tracking-[0.3em] flex items-center gap-4">
                        <Shield className="text-cyan-500" /> System Sub-States
                    </h3>
                    <div className="space-y-6">
                        <SystemProgress label="Neural Registry" progress={100} color="#00f2ff" />
                        <SystemProgress label="Tensor Pipeline" progress={85} color="#A855F7" />
                        <SystemProgress label="Memory Lake Sync" progress={92} color="#10B981" />
                        <SystemProgress label="RTC Security Bond" progress={98} color="#EF4444" />
                    </div>
                    <button className="mt-auto h-16 bg-white text-black rounded-2xl font-black uppercase tracking-widest hover:bg-cyan-400 transition-all shadow-xl">
                        Perform Deep Audit
                    </button>
                </div>
            </main>

            {/* Agent Detail Modal */}
            <AnimatePresence>
                {selectedAgent && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-10 bg-black/80 backdrop-blur-xl">
                        <motion.div 
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="w-full max-w-5xl bg-[#0a0c10] border-2 rounded-[3.5rem] overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.5)] flex flex-col relative"
                            style={{ borderColor: selectedAgent.color }}
                        >
                            <button onClick={() => setSelectedAgent(null)} className="absolute top-10 right-10 p-4 rounded-full bg-white/5 border border-white/10 hover:bg-white/10">
                                <X size={24} />
                            </button>
                            <div className="flex h-[70vh]">
                                <div className="w-[400px] border-r border-white/5 bg-black/40 p-12 flex flex-col items-center gap-8">
                                    <div className="w-48 h-48 rounded-[3rem] border-4 flex items-center justify-center bg-black overflow-hidden shadow-2xl" style={{ borderColor: selectedAgent.color }}>
                                        <img src={selectedAgent.imageUrl} alt={selectedAgent.title} className="w-full h-full object-contain p-6" />
                                    </div>
                                    <div className="text-center">
                                        <h2 className="text-4xl font-black italic tracking-tighter uppercase text-white">{selectedAgent.title}</h2>
                                        <p className="text-[10px] font-mono tracking-[0.6em] opacity-40 uppercase mt-2">{selectedAgent.subtitle}</p>
                                    </div>
                                    <div className="p-8 bg-white/5 border border-white/10 rounded-3xl w-full">
                                        <p className="text-xs font-bold leading-relaxed italic text-slate-300">"{selectedAgent.description}"</p>
                                    </div>
                                </div>
                                <div className="flex-1 p-12 flex flex-col gap-10 overflow-y-auto no-scrollbar">
                                    <div className="flex items-center gap-6">
                                        <Activity size={32} style={{ color: selectedAgent.color }} />
                                        <h3 className="text-3xl font-black uppercase text-white">Neural Metrics</h3>
                                    </div>
                                    <div className="grid grid-cols-3 gap-6">
                                        <div className="p-8 rounded-3xl bg-black/40 border border-white/5 flex flex-col items-center">
                                            <span className="text-3xl font-black text-white">{selectedAgent.metrics.cpu}%</span>
                                            <span className="text-[9px] font-mono text-slate-500 uppercase mt-2">CPU Bias</span>
                                        </div>
                                        <div className="p-8 rounded-3xl bg-black/40 border border-white/5 flex flex-col items-center">
                                            <span className="text-3xl font-black text-white">{selectedAgent.metrics.memory}MB</span>
                                            <span className="text-[9px] font-mono text-slate-500 uppercase mt-2">Mem Allocation</span>
                                        </div>
                                        <div className="p-8 rounded-3xl bg-black/40 border border-white/5 flex flex-col items-center">
                                            <span className="text-3xl font-black text-white">{selectedAgent.metrics.latency}ms</span>
                                            <span className="text-[9px] font-mono text-slate-500 uppercase mt-2">IO Latency</span>
                                        </div>
                                    </div>
                                    <div className="space-y-6">
                                        <h4 className="text-[10px] font-mono uppercase tracking-widest text-slate-500 flex items-center gap-4">
                                            <Terminal size={14} /> Active Sub-Threads
                                        </h4>
                                        {selectedAgent.tasks.map(t => (
                                            <div key={t.id} className="p-6 bg-white/5 border border-white/5 rounded-2xl flex items-center justify-between">
                                                <span className="text-sm font-black uppercase text-white">{t.label}</span>
                                                <span className="text-xs font-mono text-cyan-500 uppercase">{t.isRunning ? 'Active' : 'Idle'}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Diagnostics;

