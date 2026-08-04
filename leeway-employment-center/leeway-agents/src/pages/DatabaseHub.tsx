/*
FILE: leeway-agents\src\pages\DatabaseHub.tsx
PURPOSE: LeeWay governed asset for leeway-employment-center.
TAG: UI.PUBLIC.PAGE.D_AT_AB_AS_EH_UB
REGION: 🔵 UI
GOVERNED_BY: LeeWay Standards
OWNED_BY: Agent Lee / LeeWay Runtime
DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render
IMPORTS: Inferred by verification scanner
EXPORTS: Inferred by verification scanner
STATUS: ACTIVE
*/
import React, { useRef, useState, useMemo, useEffect, Suspense } from 'react';
/*
LEEWAY HEADER â€” DO NOT REMOVE

REGION: UI.PAGE.DATABASE
TAG: UI.PAGE.DATABASE.HUB

COLOR_ONION_HEX:
NEON=#6366F1
FLUO=#818CF8
PASTEL=#E0E7FF

ICON_ASCII:
family=lucide
glyph=database

5WH:
WHAT = DatabaseHub page â€” database management, schema, and monitoring for Agent Lee OS
WHY = Provides database schema editing, monitoring, and policy compliance
WHO = Leeway Innovations / Agent Lee System Engineer
WHERE = pages/DatabaseHub.tsx
WHEN = 2026
HOW = React component with 3D database scene, schema editor, and monitoring

AGENTS:
ASSESS
AUDIT
SHIELD

LICENSE:
MIT
*/

import RetrievalCortex from '../cortices/retrieval/RetrievalCortex';

import { 
  Database, Brain, Sparkles, ShieldCheck, 
  ExternalLink, Info, X, LogIn, LogOut, User as UserIcon,
  Activity, Shield, Terminal, Save, Edit3, CheckCircle2,
  AlertCircle, Cpu, Network, Lock
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Firebase Imports
import { enforceFileGovernance } from '../core/governanceEnforcer';
import { createFileMeta, logFileEvent } from '../core/fileOps';
import { 
  auth, 
  db, 
  leewayProvider,
  getAuth,
  leewayAuthProvider,
  signInWithPopup, 
  onAuthStateChanged, 
  collection, 
  doc, 
  setDoc, 
  addDoc, 
  serverTimestamp, 
  query, 
  orderBy, 
  limit, 
  onSnapshot, 
  getDocFromServer,
  type FirebaseUser 
} from '../components/firebase';
import type { User } from 'firebase/auth';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// 3D Database Topology is now handled by RetrievalCortex

const DB_INFO: Record<string, any> = {
  chroma: {
    name: 'Neural Core',
    provider: 'Chroma',
    description: 'Primary vector embedding engine for real-time semantic retrieval.',
    link: 'https://www.trychroma.com/',
    color: 'text-green-400',
    borderColor: 'border-green-400/30',
    bgColor: 'bg-green-400/10',
    schema: { collection: "agent_memories", embedding_dim: 1536, distance_metric: "cosine" }
  },
  milvus: {
    name: 'Cold Store',
    provider: 'Milvus',
    description: 'Massive-scale archival vector storage.',
    link: 'https://milvus.io/',
    color: 'text-amber-400',
    borderColor: 'border-amber-400/30',
    bgColor: 'bg-amber-400/10',
    schema: { collection: "global_archive", shards: 16, index_type: "HNSW" }
  },
  weaviate: {
    name: 'Agent Memory',
    provider: 'Weaviate',
    description: 'AI-native object-vector database.',
    link: 'https://weaviate.io/',
    color: 'text-sky-400',
    borderColor: 'border-sky-400/30',
    bgColor: 'bg-sky-400/10',
    schema: { class: "AgentContext", vectorizer: "text2vec-openai" }
  },
  faiss: {
    name: 'Task Registry',
    provider: 'Faiss',
    description: 'High-performance similarity search library.',
    link: 'https://github.com/facebookresearch/faiss',
    color: 'text-purple-400',
    borderColor: 'border-purple-400/30',
    bgColor: 'bg-purple-400/10',
    schema: { index_type: "IVFFlat", nlist: 1024, metric: "L2", dimensions: 768 }
  },
  firebase: {
    name: 'Neural Core Hub',
    provider: 'Firebase',
    description: 'Central orchestration layer.',
    link: 'https://firebase.leeway.com/',
    color: 'text-white',
    borderColor: 'border-white/30',
    bgColor: 'bg-white/10',
    schema: { collections: ["users", "logs", "policies"], realtime: true }
  }
};

type Tab = 'schema' | 'monitoring' | 'policies';

export default function AgentLeeDBCenter() {
  const [user, setUser] = useState<User | null>(null);
  const [selectedDb, setSelectedDb] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('schema');
  const [loading, setLoading] = useState(false);
  const [editedSchema, setEditedSchema] = useState<string>('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [isMobile, setIsMobile] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const connectMetaMask = async () => {
    if (typeof (window as any).ethereum !== 'undefined') {
      try {
        const accounts = await (window as any).ethereum.request({ method: 'eth_requestAccounts' });
        const address = accounts[0];
        setWalletAddress(address);
        // Mock user for UI consistency
        setUser({
          uid: address,
          email: `${address.slice(0, 6)}...${address.slice(-4)}@web3`,
          displayName: `Commander ${address.slice(0, 6)}`,
          photoURL: `https://api.dicebear.com/7.x/identicon/svg?seed=${address}`,
        } as any);
      } catch (error) {
        console.error("MetaMask Connection Error:", error);
      }
    } else {
      alert("MetaMask not detected. Please install the MetaMask extension.");
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          await setDoc(doc(db, 'users', currentUser.uid), {
            uid: currentUser.uid,
            email: currentUser.email,
            displayName: currentUser.displayName,
            photoURL: currentUser.photoURL,
            lastLogin: serverTimestamp(),
            role: 'agent_commander'
          }, { merge: true });
        } catch (error) {
          handleFirestoreError(error, OperationType.WRITE, `users/${currentUser.uid}`);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, leewayProvider);
    } catch (error) {
      console.error("Login Error:", error);
    }
  };

  const handleLogout = () => {
    auth.signOut();
    setWalletAddress(null);
    setUser(null);
  };

  const handleSelect = async (dbId: string | null) => {
    setSelectedDb(dbId);
    if (dbId) {
      setEditedSchema(JSON.stringify(DB_INFO[dbId].schema, null, 2));
      setLoading(true);
      setTimeout(() => setLoading(false), 500);
    }
  };

  const handleSaveSchema = async () => {
    // Create file meta with 5W+How
    const meta = createFileMeta({
      name: `${selectedDb || 'unknown'}_schema.json`,
      createdBy: user?.uid || 'anonymous',
      location: `database/${selectedDb || 'unknown'}`,
      why: 'Schema update for database compliance and optimization',
      how: 'User-initiated schema commit via DatabaseHub UI',
    });
    // Log file event with full traceability
    logFileEvent({
      meta,
      action: 'update',
      actor: user?.uid || 'anonymous',
      timestamp: new Date().toISOString(),
      details: { schema: editedSchema },
    });
    setSaveStatus('saving');
    setTimeout(() => {
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    }, 1000);
  };

  return (
    <div className="flex h-screen w-full bg-slate-950 overflow-hidden font-sans text-slate-200 relative">
      {/* Auth Header */}
      <div className="absolute top-4 md:top-6 right-4 md:right-6 z-50 flex items-center gap-4">
        {user ? (
          <div className="flex items-center gap-2 md:gap-3 bg-slate-900/80 backdrop-blur-xl border border-slate-800 p-1 md:p-1.5 pr-3 md:pr-4 rounded-full shadow-2xl">
            <img src={user.photoURL || ''} alt={user.displayName || ''} className="w-7 h-7 md:w-9 md:h-9 rounded-full border-2 border-blue-500/50" referrerPolicy="no-referrer" />
            <div className="flex flex-col">
              <span className="text-[7px] md:text-[9px] text-blue-400 font-black uppercase tracking-widest">{walletAddress ? 'Web3 Commander' : 'Commander'}</span>
              <span className="text-[10px] md:text-xs text-white font-bold truncate max-w-[80px] md:max-w-none">{user.displayName}</span>
            </div>
            <button onClick={handleLogout} className="ml-1 md:ml-2 p-1.5 md:p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-red-400 transition-all">
              <LogOut className="w-3.5 h-3.5 md:w-4 md:h-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <button 
              onClick={connectMetaMask}
              className="flex items-center gap-2 px-4 md:px-6 py-2 md:py-3 bg-orange-600/20 hover:bg-orange-600/30 text-orange-400 border border-orange-500/30 rounded-full font-black text-[10px] md:text-xs uppercase tracking-widest transition-all active:scale-95"
            >
              <Lock className="w-3.5 h-3.5 md:w-4 md:h-4" />
              <span className="hidden sm:inline">MetaMask</span>
              <span className="sm:hidden">Web3</span>
            </button>
            <button 
              onClick={handleLogin}
              className="flex items-center gap-2 px-4 md:px-8 py-2 md:py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white rounded-full font-black text-[10px] md:text-xs uppercase tracking-widest shadow-2xl shadow-blue-900/40 transition-all active:scale-95 border border-blue-400/20"
            >
              <LogIn className="w-3.5 h-3.5 md:w-4 md:h-4" />
              <span className="hidden sm:inline">Initialize Neural Link</span>
              <span className="sm:hidden">Link</span>
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 relative">
        {/* 3D scene removed: all 3D rendering is now handled by PalliumVisuals.tsx */}
        <RetrievalCortex />
        
        {/* Database Selection - Floating Panel */}
        <div className="absolute bottom-8 left-8 z-20 flex flex-col gap-4 pointer-events-none">
          <div className="flex items-center gap-4 pointer-events-auto">
            {Object.keys(DB_INFO).map((dbId) => (
              <button 
                key={dbId}
                onClick={() => handleSelect(dbId)}
                className={`p-4 rounded-2xl border transition-all flex flex-col items-center gap-2 bg-slate-900/60 backdrop-blur-xl ${selectedDb === dbId ? 'border-blue-500 scale-110 shadow-[0_0_20px_rgba(59,130,246,0.3)]' : 'border-slate-800 hover:border-slate-600'}`}
              >
                <Database className={`w-6 h-6 ${DB_INFO[dbId].color}`} />
                <span className="text-[8px] font-black uppercase tracking-widest text-white">{DB_INFO[dbId].name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {selectedDb && (
          <motion.div 
            initial={isMobile ? { y: '100%' } : { x: '100%' }}
            animate={isMobile ? { y: 0 } : { x: 0 }}
            exit={isMobile ? { y: '100%' } : { x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 200 }}
            className={`
              ${isMobile ? 'w-full h-[80vh] bottom-0 left-0 rounded-t-[2.5rem]' : 'w-[450px] h-full right-0 border-l'} 
              bg-slate-900/95 backdrop-blur-2xl border-slate-800 p-6 md:p-8 flex flex-col gap-6 md:gap-8 shadow-2xl z-50 fixed
            `}
          >
            {isMobile && <div className="w-12 h-1.5 bg-slate-800 rounded-full mx-auto mb-2 shrink-0" />}
            
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-3 md:gap-4">
                <div className={`p-2 md:p-3 rounded-2xl ${DB_INFO[selectedDb].bgColor} border ${DB_INFO[selectedDb].borderColor}`}>
                  <Database className={`w-6 h-6 md:w-8 md:h-8 ${DB_INFO[selectedDb].color}`} />
                </div>
                <div>
                  <h2 className={`text-xl md:text-2xl font-black tracking-tighter uppercase italic ${DB_INFO[selectedDb].color}`}>
                    {DB_INFO[selectedDb].name}
                  </h2>
                  <div className="flex items-center gap-2">
                    <Cpu className="w-3 h-3 text-slate-500" />
                    <p className="text-[8px] md:text-[10px] text-slate-500 font-mono uppercase tracking-[0.2em]">{DB_INFO[selectedDb].provider} Engine</p>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setSelectedDb(null)}
                className="p-2 hover:bg-slate-800 rounded-xl transition-colors text-slate-500 hover:text-white border border-transparent hover:border-slate-700"
              >
                <X className="w-5 h-5 md:w-6 md:h-6" />
              </button>
            </div>

            <div className="flex p-1 bg-slate-950 rounded-xl border border-slate-800 shrink-0">
              {(['schema', 'monitoring', 'policies'] as Tab[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 md:py-2.5 rounded-lg text-[8px] md:text-[10px] font-black uppercase tracking-widest transition-all ${
                    activeTab === tab 
                      ? 'bg-slate-800 text-white shadow-lg' 
                      : 'text-slate-500 hover:text-slate-300 hover:bg-slate-900'
                  }`}
                >
                  {tab === 'schema' && <Terminal className="w-3 h-3 md:w-3.5 md:h-3.5" />}
                  {tab === 'monitoring' && <Activity className="w-3 h-3 md:w-3.5 md:h-3.5" />}
                  {tab === 'policies' && <Shield className="w-3 h-3 md:w-3.5 md:h-3.5" />}
                  {isMobile ? tab.charAt(0).toUpperCase() + tab.slice(1, 3) : tab}
                </button>
              ))}
            </div>

            <div className="flex-1 flex flex-col gap-4 md:gap-6 overflow-y-auto pr-1 custom-scrollbar">
              {activeTab === 'schema' && (
                <div className="flex flex-col gap-3 md:gap-4 h-full min-h-[200px]">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-[8px] md:text-[10px] font-black text-slate-500 uppercase tracking-widest">
                      <Edit3 className="w-3 h-3 md:w-3.5 md:h-3.5" />
                      Live Schema Editor
                    </div>
                    <button 
                      onClick={handleSaveSchema}
                      disabled={saveStatus !== 'idle'}
                      className={`flex items-center gap-2 px-3 md:px-4 py-1 md:py-1.5 rounded-lg text-[8px] md:text-[10px] font-black uppercase tracking-widest transition-all ${
                        saveStatus === 'saved' ? 'bg-green-500 text-white' : 'bg-blue-600 hover:bg-blue-500 text-white'
                      }`}
                    >
                      {saveStatus === 'idle' && <><Save className="w-3 h-3 md:w-3.5 md:h-3.5" /> Commit</>}
                      {saveStatus === 'saving' && <div className="w-3 h-3 md:w-3.5 md:h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                      {saveStatus === 'saved' && <><CheckCircle2 className="w-3 h-3 md:w-3.5 md:h-3.5" /> Deployed</>}
                    </button>
                  </div>
                  <textarea
                    value={editedSchema}
                    onChange={(e) => setEditedSchema(e.target.value)}
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-xl p-3 md:p-4 font-mono text-[10px] md:text-xs text-blue-400 focus:outline-none focus:border-blue-500/50 resize-none custom-scrollbar"
                    spellCheck={false}
                  />
                </div>
              )}

              {activeTab === 'monitoring' && (
                <div className="flex flex-col gap-4 md:gap-6">
                  <div className="grid grid-cols-2 gap-3 md:gap-4">
                    <div className="bg-slate-950 border border-slate-800 p-3 md:p-4 rounded-xl">
                      <p className="text-[8px] md:text-[9px] text-slate-500 font-black uppercase tracking-widest mb-1">Latency</p>
                      <p className="text-lg md:text-xl font-black text-white">12ms</p>
                    </div>
                    <div className="bg-slate-950 border border-slate-800 p-3 md:p-4 rounded-xl">
                      <p className="text-[8px] md:text-[9px] text-slate-500 font-black uppercase tracking-widest mb-1">Throughput</p>
                      <p className="text-lg md:text-xl font-black text-white">4.2k/s</p>
                    </div>
                  </div>
                  <div className="bg-slate-950 border border-slate-800 p-4 md:p-6 rounded-xl flex flex-col gap-3 md:gap-4">
                    <div className="flex items-center justify-between">
                      <p className="text-[9px] md:text-[10px] text-slate-400 font-black uppercase tracking-widest">Node Health</p>
                      <span className="px-2 py-0.5 bg-green-500/20 text-green-500 text-[8px] md:text-[9px] font-black rounded-full uppercase">Optimal</span>
                    </div>
                    <div className="h-1.5 md:h-2 bg-slate-900 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: '94%' }}
                        className="h-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]"
                      />
                    </div>
                    <div className="flex justify-between text-[8px] md:text-[9px] text-slate-600 font-mono">
                      <span>LOAD: 12%</span>
                      <span>UPTIME: 99.99%</span>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'policies' && (
                <div className="flex flex-col gap-3 md:gap-4">
                  {[
                    { icon: Lock, title: 'Zero Trust', desc: 'Requests must be cryptographically signed.', color: 'text-blue-400' },
                    { icon: ShieldCheck, title: 'Sovereignty', desc: 'Embeddings are isolated per agent cluster.', color: 'text-green-400' },
                    { icon: AlertCircle, title: 'Compliance', desc: 'Neural retrievals are logged and evaluated.', color: 'text-amber-400' }
                  ].map((policy, idx) => (
                    <div key={idx} className="bg-slate-950 border border-slate-800 p-4 md:p-5 rounded-xl flex items-start gap-3 md:gap-4">
                      <policy.icon className={`w-4 h-4 md:w-5 md:h-5 ${policy.color} mt-0.5`} />
                      <div>
                        <h4 className="text-[10px] md:text-xs font-black text-white uppercase tracking-wider mb-0.5 md:mb-1">{policy.title}</h4>
                        <p className="text-[9px] md:text-[10px] text-slate-500 leading-relaxed">{policy.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-2 md:mt-4 pt-4 md:pt-6 border-t border-slate-800">
                <div className="flex items-center gap-2 text-[8px] md:text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 md:mb-4">
                  <Sparkles className="w-3 h-3 md:w-3.5 md:h-3.5" />
                  Agent Lee Evaluation
                </div>
                
                {/* leeway evaluation UI removed */}
              </div>
            </div>

            <div className="pt-4 md:pt-6 border-t border-slate-800 flex flex-col gap-3 md:gap-4 shrink-0">
              <div className="flex items-center gap-2 md:gap-3 px-3 md:px-4 py-2 md:py-3 bg-blue-600/10 border border-blue-500/20 rounded-xl">
                <Network className="w-4 h-4 md:w-5 md:h-5 text-blue-400" />
                <p className="text-[8px] md:text-[10px] text-blue-400 font-black uppercase tracking-[0.15em]">Ready for Deployment</p>
              </div>
              <a 
                href={DB_INFO[selectedDb].link} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-3 md:py-4 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-black text-[10px] md:text-xs uppercase tracking-widest transition-all group border border-slate-700"
              >
                Access Core <ExternalLink className="w-3.5 h-3.5 md:w-4 md:h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!selectedDb && (
        <div className="absolute bottom-8 md:bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center gap-4 md:gap-6 pointer-events-none w-full px-4">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="px-4 md:px-8 py-3 md:py-4 bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-2xl flex items-center gap-3 md:gap-6 shadow-2xl"
          >
            <div className="flex items-center gap-2 md:gap-3 text-[9px] md:text-xs text-slate-400 font-bold uppercase tracking-widest text-center">
              <Info className="w-3 h-3 md:w-4 md:h-4 text-blue-400 shrink-0" />
              <span>Select a neural node to initialize</span>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

