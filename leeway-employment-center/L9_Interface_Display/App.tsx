/*
FILE: L9_Interface_Display\App.tsx
PURPOSE: LeeWay governed asset for leeway-employment-center.
TAG: UTIL.FILE.A_PP.MAIN
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
 * REGION: UI.PAGE.LANDING (PWA)
 * AGENT_OWNER: LWA_Architect
 * DETERMINISTIC_ID: pwa-land-001
 * SOVEREIGNTY_CHECK: PASSED
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, useScroll, useTransform, useSpring, AnimatePresence } from 'framer-motion';
import { 
  Activity, Cpu, Database, Wifi, Shield, 
  Terminal, Monitor, Globe, Brain, Zap, 
  ChevronDown, Rocket, Fingerprint, Lock,
  Layers, Database as DbIcon, Archive, Hammer, Code
} from 'lucide-react';

import { Diagnostics } from './Diagnostics';
import { DatabaseHub } from './DatabaseHub';
import { MemoryLake } from './Pallium';
import LeeWayUniverse from './LeeWayUniverse';
import { AgentVMProvider } from './VerifiedAgentVM';
import { rtcNode } from './core/rtc.sovereign.node';

/**
 * The LeeWay Sovereign Edge Ecosystem - Unified PWA
 */
export default function App() {
  const { scrollYProgress } = useScroll();
  const smoothProgress = useSpring(scrollYProgress, { stiffness: 100, damping: 30, restDelta: 0.001 });

  const [leewayId, setLeewayId] = useState('');
  const [isJoined, setIsJoined] = useState(false);

  // Background Opacity Transitions based on scroll
  const bgOpacity = useTransform(smoothProgress, [0, 0.1, 0.9, 1], [0.1, 1, 1, 0.1]);

  const handleJoin = async () => {
    if (!leewayId) return;
    const success = await rtcNode.connect(leewayId, 'SOVEREIGN_HUB');
    if (success) setIsJoined(true);
  };

  return (
    <AgentVMProvider>
      <div className="relative min-h-[700vh] bg-[#020306] text-white selection:bg-cyan-500/30 font-sans overflow-x-hidden">
        
        {/* Persistent Background Fabric */}
        <div className="fixed inset-0 z-0 pointer-events-none">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(0,242,255,0.05)_0%,transparent_100%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-[size:60px_60px]" />
        </div>

        {/* --- Global Progress Bar --- */}
        <motion.div 
          className="fixed top-0 left-0 right-0 h-1 z-[110] bg-cyan-500 origin-left"
          style={{ scaleX: smoothProgress }}
        />

        {/* --- SECTION 0: ARRIVAL / IDENTITY --- */}
        <Section index={0} title="Sovereignty Starts Here" icon={Fingerprint}>
          <div className="max-w-4xl mx-auto text-center space-y-12">
            <motion.h1 
              initial={{ y: 50, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              className="text-8xl font-black italic tracking-tighter uppercase leading-none"
            >
              The LeeWay <br/> <span className="text-cyan-400">Civilization</span>
            </motion.h1>
            <p className="text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
              Welcome to the first functionally isomorphic software GPU civilization. Claim your ID to activate your local edge node.
            </p>
            <div className="flex flex-col items-center gap-6">
              <input 
                type="text" 
                placeholder="Enter LeeWay ID (e.g. LWA-2026)"
                className="w-full max-w-md h-20 bg-white/5 border-2 border-white/10 rounded-[2rem] px-8 text-2xl font-black uppercase text-cyan-400 focus:border-cyan-500 outline-none transition-all text-center"
                value={leewayId}
                onChange={(e) => setLeewayId(e.target.value)}
              />
              <button 
                onClick={handleJoin}
                className="h-20 px-16 bg-white text-black text-xl font-black uppercase rounded-[2rem] hover:bg-cyan-400 hover:scale-105 transition-all shadow-[0_0_50px_rgba(255,255,255,0.2)]"
              >
                {isJoined ? 'Node Active' : 'Activate Sovereign Hub'}
              </button>
            </div>
          </div>
          <div className="absolute bottom-20 left-1/2 -translate-x-1/2 animate-bounce opacity-40">
            <ChevronDown size={32} />
          </div>
        </Section>

        {/* --- SECTION 1: THE NORTHBRIDGE (DatabaseHub) --- */}
        <Section index={1} title="The Northbridge Controller" icon={Database} theme="orange">
          <div className="w-full h-[80vh] bg-black/40 border border-white/5 rounded-[4rem] overflow-hidden backdrop-blur-3xl shadow-2xl relative">
            <div className="absolute inset-0 overflow-y-auto no-scrollbar">
              <DatabaseHub />
            </div>
            <div className="absolute bottom-10 right-10 z-50 p-6 bg-orange-500 text-black rounded-3xl font-black uppercase tracking-widest pointer-events-none">
              L1 Persistence Localized
            </div>
          </div>
        </Section>

        {/* --- SECTION 2: THE CONNECTIVITY (Edge RTC) --- */}
        <Section index={2} title="Edge RTC & Connectivity" icon={Wifi} theme="green">
          <div className="grid grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <h2 className="text-6xl font-black italic uppercase tracking-tighter">Your Private <br/> <span className="text-green-400">Data Tunnel</span></h2>
              <p className="text-xl text-slate-400 leading-relaxed">
                Gaming on the go. Low-latency video. Secure developer pipes. The Bonded Tensor Bus ensures zero-copy sync between your devices and the silicon continent.
              </p>
              <div className="grid grid-cols-2 gap-4">
                <FeatureCard icon={Zap} title="Gaming Bridge" desc="Sub-ms latency streaming." />
                <FeatureCard icon={Monitor} title="Studio Ready" desc="4K Voice & Vision understanding." />
              </div>
            </div>
            <div className="h-[60vh] bg-green-500/10 border-2 border-green-500/20 rounded-[3rem] p-10 flex flex-col justify-center gap-8 relative overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(74,222,128,0.1)_0%,transparent_100%)] animate-pulse" />
                <div className="relative z-10 flex items-center justify-between border-b border-green-500/20 pb-6">
                    <span className="font-mono text-green-400">EDGE_ID: {leewayId || 'PENDING'}</span>
                    <span className="font-mono text-green-400">BITRATE: 50.4 Gb/s</span>
                </div>
                <div className="relative z-10 flex flex-col gap-4">
                    <div className="h-12 bg-white/5 rounded-xl border border-white/10 flex items-center px-4 font-mono text-xs">P2P MESH_ENCRYPTED: ACTIVE</div>
                    <div className="h-12 bg-white/5 rounded-xl border border-white/10 flex items-center px-4 font-mono text-xs">SFU_FEDERATION: CONNECTED</div>
                    <div className="h-12 bg-white/5 rounded-xl border border-white/10 flex items-center px-4 font-mono text-xs">SECURE_TUNNEL: IN_PROGRESS</div>
                </div>
            </div>
          </div>
        </Section>

        {/* --- SECTION 3: THE MEMORY LAKE (Pallium) --- */}
        <Section index={3} title="Memory Lake Archives" icon={Archive} theme="purple">
          <div className="w-full h-[80vh] rounded-[4rem] overflow-hidden border border-white/10 bg-black/40 backdrop-blur-3xl">
            <MemoryLake />
          </div>
        </Section>

        {/* --- SECTION 4: THE UNIVERSE (LeeWay Universe) --- */}
        <Section index={4} title="The Civilized Grid" icon={Globe} theme="cyan">
          <div className="w-full h-[80vh] rounded-[4rem] overflow-hidden border border-white/10 bg-black relative">
            <LeeWayUniverse />
            <div className="absolute top-10 left-10 p-4 bg-cyan-500 text-black rounded-2xl font-black uppercase italic">
              110+ Specialized Agents Online
            </div>
          </div>
        </Section>

        {/* --- SECTION 5: THE SANDBOX (Verified VM / Developer API) --- */}
        <Section index={5} title="Developer Verified VM" icon={Code} theme="amber">
          <div className="grid grid-cols-12 gap-12">
            <div className="col-span-5 space-y-8 py-10">
                <h2 className="text-6xl font-black italic uppercase text-amber-500">Forge Your <br/> Intelligence</h2>
                <p className="text-xl text-slate-400 italic font-mono uppercase tracking-tighter">
                   "Consistent Voice. Powerful Image Understanding. Zero-Trust Sandboxing."
                </p>
                <div className="space-y-4">
                    <div className="flex items-center gap-4 text-amber-500">
                        <Lock /> <span className="font-black uppercase tracking-widest text-sm">PROMPT INJECTION PROTECTION</span>
                    </div>
                    <div className="flex items-center gap-4 text-cyan-500">
                        <Hammer /> <span className="font-black uppercase tracking-widest text-sm">REAL-TIME SDK DEBUGGING</span>
                    </div>
                </div>
            </div>
            <div className="col-span-7 bg-white/5 border border-white/10 rounded-[3rem] p-12 overflow-hidden relative shadow-2xl">
                <div className="flex items-center justify-between mb-8">
                    <span className="font-mono text-amber-500 text-xs tracking-widest">VERIFIED_VM_INSTANCE_X</span>
                    <div className="flex gap-2">
                        <div className="w-3 h-3 rounded-full bg-red-500" />
                        <div className="w-3 h-3 rounded-full bg-amber-500" />
                        <div className="w-3 h-3 rounded-full bg-green-500" />
                    </div>
                </div>
                <div className="space-y-6 font-mono text-sm text-amber-500/80">
                    <p className="">{'>'} Initialize LLM Core (Gemma-2b-Local)...</p>
                    <p className="">{'>'} Spawning Sovereign Execution Isolate...</p>
                    <p className="">{'>'} Identity Audit: LWA-2026 Verified.</p>
                    <p className="">{'>'} Memory Limit: 4096MB Set.</p>
                    <p className="text-white">{'>'} SYSTEM READY. WAITING FOR DEVELOPER INTENT.</p>
                </div>
                <div className="absolute bottom-10 inset-x-12 h-[2px] bg-amber-500/20" />
            </div>
          </div>
        </Section>

        {/* --- SECTION 6: THE PULSE (Diagnostics) --- */}
        <Section index={6} title="Final Telemetry Pulse" icon={Activity} theme="cyan">
           <div className="w-full h-[90vh] -mt-10 overflow-y-auto no-scrollbar relative z-[101]">
              <Diagnostics />
           </div>
        </Section>

        {/* Footer */}
        <footer className="h-[40vh] bg-black flex flex-col items-center justify-center border-t border-white/5 space-y-6">
            <div className="w-20 h-20 bg-cyan-500 rounded-[2rem] animate-pulse shadow-[0_0_80px_rgba(0,242,255,0.4)]" />
            <h2 className="text-3xl font-black italic tracking-tighter uppercase">LeeWay Innovations</h2>
            <p className="font-mono text-[10px] text-white/20 tracking-[1em] uppercase">Sovereign Intelligence Architecture 2026</p>
        </footer>

      </div>
    </AgentVMProvider>
  );
}

// --- Internal Layout Components ---

function Section({ index, title, icon: Icon, children, theme = "cyan" }: { index: number; title: string; icon: any; children: React.ReactNode; theme?: string }) {
    const sectionColors: Record<string, string> = {
        cyan: "text-cyan-400",
        orange: "text-orange-400",
        green: "text-green-400",
        purple: "text-purple-400",
        amber: "text-amber-500"
    };

    return (
        <section className="min-h-screen relative flex flex-col items-center justify-center p-10 md:p-24 overflow-hidden z-10">
            <motion.div 
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: false, amount: 0.3 }}
                className="w-full max-w-7xl flex flex-col gap-12"
            >
                <div className="flex items-center gap-6">
                    <div className={`p-4 rounded-3xl bg-white/5 border border-white/10 ${sectionColors[theme]}`}>
                        <Icon size={32} />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[10px] font-mono tracking-[0.5em] text-white/30 uppercase">Layer L{index + 1} System Overview</span>
                        <h2 className={`text-3xl font-black uppercase tracking-widest ${sectionColors[theme]}`}>{title}</h2>
                    </div>
                </div>
                {children}
            </motion.div>
        </section>
    );
}

function FeatureCard({ icon: Icon, title, desc }: { icon: any; title: string; desc: string }) {
    return (
        <div className="p-8 bg-white/5 border border-white/10 rounded-3xl hover:bg-white/10 transition-all cursor-default group">
            <Icon size={24} className="text-cyan-400 mb-4 group-hover:scale-110 transition-transform" />
            <h4 className="text-lg font-black uppercase text-white mb-2">{title}</h4>
            <p className="text-sm text-slate-400 leading-relaxed italic">{desc}</p>
        </div>
    );
}

