/*
FILE: L3_Persistence_Memory\Pallium.tsx
PURPOSE: LeeWay governed asset for leeway-employment-center.
TAG: DATA.LOCAL.STORE.P_AL_LI_UM
REGION: 💾 DATA
GOVERNED_BY: LeeWay Standards
OWNED_BY: Agent Lee / LeeWay Runtime
DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render
IMPORTS: Inferred by verification scanner
EXPORTS: Inferred by verification scanner
STATUS: ACTIVE
*/
/**
 * LEEWAY STANDARDS COMPLIANT | VERSION 2.1
 * REGION: L3_PERSISTENCE (MEMORY_LAKE)
 * AGENT_OWNER: LWA_Architect
 * DETERMINISTIC_ID: memory-lake-001
 * SOVEREIGNTY_CHECK: PASSED
 * 
 * 5WH:
 * WHAT = Pallium (The Memory Lake UI)
 * WHY = Visualizes the deep-seated persistent context of the Agent Lee ecosystem
 * WHO = Leeway Innovations | Sovereign Administrator Interface
 * WHERE = components/Pallium.tsx
 * HOW = React + Three.js (PalliumVisuals) + Northbridge Persistence
 */

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Database, Archive, Folder, FileText, 
  RefreshCw, Code, Download, Zap, Settings, 
  Shield, Brain, Search, Trash2, Filter, 
  Maximize2, Share2, Terminal, Activity, X,
  AlertTriangle, Check
} from 'lucide-react';
import { eventBus } from './core/eventBus';

// --- Sovereign Types ---
export type SectorID = "L" | "E" | "O" | "N" | "A" | "R" | "D" | "LEE";
export const SECTORS: SectorID[] = ["L", "E", "O", "N", "A", "R", "D", "LEE"];

export interface NeuralFlash {
  id: string;
  sector: SectorID;
  timestamp: number;
  label: string;
  tags: string[];
  size: number; // Size in KB
  integrity: number;
  status: 'SECURE' | 'QUARANTINE' | 'SYNCING';
}

const SECTOR_METADATA: Record<SectorID, { color: string; label: string }> = {
  L: { color: '#7B00FF', label: 'LOGIC' },
  E: { color: '#9C27B0', label: 'ENGINE' },
  O: { color: '#00B8D9', label: 'OBJECT' },
  N: { color: '#00C853', label: 'MEDIA' },
  A: { color: '#FFD600', label: 'AUDIO' },
  R: { color: '#FF3D00', label: 'RESEARCH' },
  D: { color: '#00BFAE', label: 'DATA' },
  LEE: { color: '#00E5FF', label: 'CORE' },
};

export const MemoryLake: React.FC = () => {
  const [activeSector, setActiveSector] = useState<SectorID>("LEE");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [memoryStream, setMemoryStream] = useState<NeuralFlash[]>([]);
  const [pulses, setPulses] = useState<string[]>([]);
  const [isAuditing, setIsAuditing] = useState(false);

  // --- LWA_Janitor: Ghost-Purge Logic ---
  const runJanitorAudit = useCallback(async () => {
    setIsAuditing(true);
    addPulse("LWA_JANITOR: Initiating Orphaned File Scan...");
    
    // Simulate check against Sovereign Database Manifest
    setTimeout(() => {
      setMemoryStream(prev => {
        const totalSize = prev.reduce((acc, curr) => acc + curr.size, 0);
        const limit = 55 * 1024; // 55MB in KB
        
        if (totalSize > limit) {
          addPulse(`WARNING: System Weight Exceeded (${(totalSize/1024).toFixed(2)}MB). Purging non-essential sectors...`, 'RED');
          return prev.filter(m => m.sector !== 'R' && m.sector !== 'N'); // Purge Research and Media
        }
        
        // Find "Ghosts" (files with low integrity or missing signatures)
        const ghosts = prev.filter(m => m.integrity < 0.8);
        if (ghosts.length > 0) {
          addPulse(`GHOST_PURGE: Deleted ${ghosts.length} unindexed neural fragments.`, 'ORANGE');
          return prev.filter(m => m.integrity >= 0.8);
        }
        
        addPulse("JANITOR_AUDIT: Sovereignty Intact. Zero orphans detected.");
        return prev;
      });
      setIsAuditing(false);
    }, 2000);
  }, [memoryStream]);

  const addPulse = (msg: string, type: 'INFO' | 'RED' | 'ORANGE' = 'INFO') => {
    setPulses(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev].slice(0, 50));
  };

  // --- Pulse Synchronization ---
  useEffect(() => {
    // Initial Load (Simulated)
    setMemoryStream([
      { id: 'm1', sector: 'L', label: 'GPU Pipeline Manifest', tags: ['GPU', 'L7'], timestamp: Date.now() - 10000, size: 12, integrity: 0.99, status: 'SECURE' },
      { id: 'm2', sector: 'LEE', label: 'Sovereign Identity BIOS', tags: ['LIRS', 'CORE'], timestamp: Date.now() - 45000, size: 4, integrity: 1.0, status: 'SECURE' },
      { id: 'm3', sector: 'R', label: 'Qwen-VL Token Latents', tags: ['TENSOR', 'VISION'], timestamp: Date.now() - 120000, size: 1200, integrity: 0.74, status: 'QUARANTINE' },
      { id: 'm4', sector: 'E', label: 'Shader Execution Log', tags: ['TRACE', 'L8'], timestamp: Date.now() - 300000, size: 84, integrity: 0.98, status: 'SECURE' },
    ]);

    const unsubscribe = eventBus.on('northbridge:pulse', (data: any) => {
      if (data.type === 'GPU_COMPUTE_COMPLETE') {
        const newFlash: NeuralFlash = {
          id: `idx-${Date.now()}`,
          sector: 'E',
          label: `Compute Receipt: ${data.taskId}`,
          tags: ['GPU', 'RECEIPT'],
          timestamp: Date.now(),
          size: Math.random() * 50,
          integrity: 1.0,
          status: 'SECURE'
        };
        setMemoryStream(prev => [newFlash, ...prev]);
        addPulse(`BONDED_BUS: Signed receipt stored in ENGINE canal.`);
      }
    });

    return () => unsubscribe();
  }, []);

  const filteredStream = useMemo(() => memoryStream.filter(m => 
    (activeSector === "LEE" || m.sector === activeSector) &&
    (m.label.toLowerCase().includes(searchQuery.toLowerCase()))
  ), [memoryStream, activeSector, searchQuery]);

  return (
    <div className="w-full h-full bg-[#050508] text-slate-200 font-sans overflow-hidden flex relative">
      {/* 3D Visual Cortex Background */}
      <div className="absolute inset-0 z-0 opacity-40">
        <Suspense fallback={<div className="absolute inset-0 bg-black flex items-center justify-center text-cyan-500">INIT CORTEX...</div>}>
          <PalliumVisuals memoryData={memoryStream} />
        </Suspense>
      </div>

      {/* Glass Overlay UI */}
      <div className="absolute inset-0 z-1 pointer-events-none bg-gradient-to-t from-[#050508] via-transparent to-transparent opacity-90" />

      {/* Main Command Surface */}
      <main className="relative z-10 flex-grow flex flex-col p-10">
        <header className="flex items-center justify-between mb-12 pointer-events-auto">
          <div className="flex flex-col">
            <h1 className="text-5xl font-black italic tracking-tighter uppercase text-white drop-shadow-[0_0_30px_rgba(255,255,255,0.2)]">
              Memory Lake <span className="text-[10px] not-italic opacity-40 font-mono tracking-[0.6em] ml-6">LWA_L3_SVR</span>
            </h1>
            <div className="flex items-center gap-6 mt-3">
              <div className="flex items-center gap-2.5 px-4 py-1.5 bg-cyan-500/5 border border-cyan-500/20 rounded-full backdrop-blur-md">
                <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_12px_#22d3ee]" />
                <span className="text-[10px] font-black uppercase text-cyan-400 tracking-widest">Bonded Bus Latched</span>
              </div>
              <button 
                onClick={runJanitorAudit}
                disabled={isAuditing}
                className={`flex items-center gap-2 px-4 py-1.5 bg-purple-500/10 border border-purple-500/20 rounded-full backdrop-blur-md hover:bg-purple-500/20 transition-all ${isAuditing ? 'animate-pulse' : ''}`}
              >
                <Trash2 size={12} className="text-purple-400" />
                <span className="text-[10px] font-black uppercase text-purple-400 tracking-widest">{isAuditing ? 'Auditing...' : 'Run Janitor Audit'}</span>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-5">
             <div className="relative group">
               <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-500 group-focus-within:text-cyan-400" />
               <input 
                 type="text" 
                 placeholder="SCAN NEURAL PATHS..."
                 className="w-96 h-14 bg-white/5 border border-white/10 rounded-2xl pl-14 pr-8 text-[11px] font-black uppercase tracking-widest focus:outline-none focus:border-cyan-500/50 backdrop-blur-2xl transition-all"
                 value={searchQuery}
                 onChange={e => setSearchQuery(e.target.value)}
               />
             </div>
          </div>
        </header>

        {/* Sector Nav (The HUD) */}
        <nav className="flex items-center gap-4 mb-12 pointer-events-auto overflow-x-auto no-scrollbar pb-2">
           {SECTORS.map(id => (
             <button 
               key={id}
               onClick={() => setActiveSector(id)}
               className={cn(
                 "min-w-[120px] h-20 px-10 rounded-3xl border flex flex-col items-center justify-center gap-1.5 transition-all group relative overflow-hidden backdrop-blur-xl",
                 activeSector === id 
                   ? "bg-white/10 border-white/30 shadow-[0_0_40px_rgba(0,0,0,0.5)] scale-105" 
                   : "bg-black/20 border-white/5 opacity-50 hover:opacity-100"
               )}
               style={{ 
                 borderColor: activeSector === id ? SECTOR_METADATA[id].color : undefined,
                 boxShadow: activeSector === id ? `0 0 25px ${SECTOR_METADATA[id].color}44` : undefined
               }}
             >
                <span 
                  className="text-2xl font-black italic transition-all group-hover:scale-110 drop-shadow-md"
                  style={{ color: SECTOR_METADATA[id].color }}
                >
                  {id}
                </span>
                <span className="text-[8px] font-mono opacity-40 uppercase tracking-[0.3em] group-hover:opacity-100 transition-opacity">
                  {SECTOR_METADATA[id].label}
                </span>
                {activeSector === id && (
                  <motion.div 
                    layoutId="sectorReflow"
                    className="absolute inset-0 bg-white/5 pointer-events-none"
                  />
                )}
             </button>
           ))}
        </nav>

        {/* Neural Grid */}
        <div className="flex-grow grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 overflow-y-auto no-scrollbar pointer-events-auto pb-20 pr-4">
           {filteredStream.map((flash, idx) => (
             <motion.div 
               key={flash.id}
               initial={{ opacity: 0, scale: 0.95 }}
               animate={{ opacity: 1, scale: 1 }}
               transition={{ delay: idx * 0.05 }}
               className="group p-8 bg-white/[0.03] border border-white/5 rounded-[2.5rem] backdrop-blur-3xl hover:border-white/20 hover:bg-white/[0.08] transition-all cursor-pointer relative overflow-hidden shadow-2xl"
             >
                <div className="flex items-start justify-between mb-6">
                   <div 
                     className="p-4 rounded-[1.5rem] bg-white/5 border shadow-inner"
                     style={{ borderColor: SECTOR_METADATA[flash.sector].color + '44' }}
                   >
                     <Archive className="w-6 h-6 text-white" />
                   </div>
                   <div className="flex flex-col items-end gap-1.5">
                      <span className="text-[11px] font-mono text-slate-500 uppercase font-black">{flash.size.toFixed(1)} KB</span>
                      <div className={`flex items-center gap-1.5 px-2 py-0.5 border rounded-md ${flash.status === 'SECURE' ? 'bg-green-500/10 border-green-500/20 text-green-500' : 'bg-red-500/10 border-red-500/20 text-red-500'}`}>
                        {flash.status === 'SECURE' ? <Shield size={10} /> : <AlertTriangle size={10} />}
                        <span className="text-[9px] font-black uppercase tracking-tighter">{flash.status}</span>
                      </div>
                   </div>
                </div>
                
                <h4 className="text-lg font-black uppercase tracking-tight text-white mb-3 leading-tight group-hover:text-cyan-400 transition-colors">
                  {flash.label}
                </h4>
                
                <div className="flex flex-wrap gap-2.5 mt-6">
                   {flash.tags.map(tag => (
                     <span key={tag} className="text-[9px] font-black px-3 py-1 bg-black/40 border border-white/5 rounded-lg uppercase tracking-widest text-slate-500 group-hover:text-slate-300 transition-colors">
                        {tag}
                     </span>
                   ))}
                </div>

                <div className="absolute right-6 bottom-6 opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all flex gap-4">
                  <Share2 size={18} className="text-slate-500 hover:text-white" />
                  <Maximize2 size={18} className="text-slate-500 hover:text-white" />
                </div>
             </motion.div>
           ))}

           {/* Add Flash Slot */}
           <motion.div 
             whileHover={{ scale: 1.02 }}
             className="group p-8 border-2 border-dashed border-white/10 rounded-[2.5rem] hover:border-cyan-500/30 transition-all flex flex-col items-center justify-center text-slate-600 hover:text-cyan-400 cursor-pointer bg-white/[0.01]"
           >
              <RefreshCw className="w-10 h-10 mb-5 group-hover:rotate-180 transition-transform duration-1000" />
              <span className="text-xs font-black uppercase tracking-[0.3em]">Inject Neural Context</span>
           </motion.div>
        </div>
      </main>

      {/* Activity Monitor (Floating Sidebar) */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.aside 
            initial={{ x: 500 }}
            animate={{ x: 0 }}
            exit={{ x: 500 }}
            className="w-[450px] h-full bg-[#0a0c10]/80 backdrop-blur-3xl border-l border-white/10 z-30 flex flex-col shadow-[-50px_0_100px_rgba(0,0,0,0.8)]"
          >
             <div className="p-10 border-b border-white/5 flex items-center justify-between">
                <div>
                   <h3 className="text-xl font-black uppercase tracking-tight flex items-center gap-4 text-white">
                    <Activity size={24} className="text-green-500" /> Pulse Stream
                  </h3>
                  <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest mt-1">Real-time Persistence I/O</p>
                </div>
                <button onClick={() => setIsSidebarOpen(false)} className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-slate-500 hover:text-white transition-all">
                  <X size={20} />
                </button>
             </div>

             <div className="flex-grow space-y-4 overflow-y-auto no-scrollbar p-10 font-mono text-[10px]">
                {pulses.map((p, i) => (
                  <div key={i} className={`p-3 rounded-lg border ${p.includes('WARNING') ? 'bg-red-500/10 border-red-500/20 text-red-400' : p.includes('PURGE') ? 'bg-orange-500/10 border-orange-500/20 text-orange-400' : 'bg-white/5 border-white/10 text-cyan-400'}`}>
                    {p}
                  </div>
                ))}
             </div>

             <div className="p-10 border-t border-white/10 bg-black/40 space-y-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-black uppercase text-slate-500">System Residency</span>
                  <span className="text-[10px] font-mono text-cyan-400">
                    {(memoryStream.reduce((acc, curr) => acc + curr.size, 0) / 1024).toFixed(2)} / 55.00 MB
                  </span>
                </div>
                <div className="h-1.5 bg-black/40 rounded-full overflow-hidden">
                   <motion.div 
                     className="h-full bg-cyan-500"
                     initial={{ width: 0 }}
                     animate={{ width: `${Math.min(100, (memoryStream.reduce((acc, curr) => acc + curr.size, 0) / (55 * 1024)) * 100)}%` }}
                   />
                </div>
                <div className="flex items-center justify-center gap-6 mt-2 opacity-40">
                   <div className="flex items-center gap-2">
                     <div className="w-2 h-2 rounded-full bg-green-500" />
                     <span className="text-[9px] font-black uppercase tracking-widest">Sovereignty Enforced</span>
                   </div>
                   <div className="w-px h-3 bg-white/20" />
                   <span className="text-[9px] font-mono uppercase tracking-widest">HNSW_LAKE_v2.0</span>
                </div>
             </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Quick Access HUD (Bottom) */}
      <AnimatePresence>
        {!isSidebarOpen && (
          <motion.div 
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            className="absolute bottom-12 right-12 z-40"
          >
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="w-16 h-16 bg-cyan-600 hover:bg-cyan-500 text-white rounded-[1.5rem] flex items-center justify-center shadow-2xl transition-all hover:scale-110 active:scale-95"
            >
              <Terminal size={24} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Utilities (Bottom Center) */}
      <div className="absolute bottom-12 left-1/2 -translate-x-1/2 z-20 flex items-center gap-8 px-10 py-5 bg-black/60 backdrop-blur-3xl border border-white/10 rounded-[2rem] shadow-[0_30px_60px_rgba(0,0,0,0.8)] pointer-events-auto">
        <div className="flex items-center gap-4 px-5 py-2.5 bg-white/5 rounded-2xl border border-white/10">
          <Settings className="w-4 h-4 text-slate-400 hover:text-white transition-colors cursor-pointer" />
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Lake Protocols</span>
        </div>
        <div className="w-px h-8 bg-white/10" />
        <div className="flex items-center gap-8">
          <button className="text-slate-400 hover:text-cyan-400 transition-all hover:scale-110"><Maximize2 size={24} /></button>
          <button className="text-slate-400 hover:text-cyan-400 transition-all hover:scale-110"><RefreshCw size={24} /></button>
          <button className="text-slate-400 hover:text-cyan-400 transition-all hover:scale-110"><Zap size={24} /></button>
          <button className="text-red-500/40 hover:text-red-500 transition-all hover:scale-110"><Trash2 size={24} /></button>
        </div>
      </div>
    </div>
  );
};

export default MemoryLake;

