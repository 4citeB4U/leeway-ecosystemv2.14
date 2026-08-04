/*
FILE: src\components\AgentVM.tsx
PURPOSE: LeeWay governed asset for leeway-employment-center.
TAG: UI.COMPONENT.A_GE_NT_VM.MAIN
REGION: 🔵 UI
GOVERNED_BY: LeeWay Standards
OWNED_BY: Agent Lee / LeeWay Runtime
DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render
IMPORTS: Inferred by verification scanner
EXPORTS: Inferred by verification scanner
STATUS: ACTIVE
*/
/*
LEEWAY HEADER â€” DO NOT REMOVE
DISCOVERY_PIPELINE: Voice â†’ Intent â†’ Location â†’ Vertical â†’ Ranking â†’ Render
AUTHORITY: LeeWay-Standards

REGION: UI.COMPONENT.VM.WORKSTATION
TAG: UI.COMPONENT.VM.WORKSTATION.AGENTLEE

COLOR_ONION_HEX:
NEON=#00E5FF
FLUO=#67E8F9
PASTEL=#CFFAFE

ICON_ASCII:
family=lucide
glyph=monitor

5WH:
WHAT = Agent Lee VM workstation component for execution, editing, preview, and console workflows
WHY = Serves as the controlled hands-on execution environment for agent-directed coding and system operations
WHO = Leeway Innovations / Agent Lee System Engineer
WHERE = components/AgentVM.tsx
WHEN = 2026
HOW = React VM surface integrating editor, terminal, browser, memory/diagnostics switching, and event-driven interaction

AGENTS:
ASSESS
AUDIT
NOVA
SHIELD

LICENSE:
MIT
*/
// CHAIN: Standards â†’ Integrated â†’ Runtime â†’ Projections


import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  auth, 
  db, 
  signInWithPopup, 
  leewayProvider, 
  onAuthStateChanged, 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  onSnapshot, 
  query, 
  where, 
  orderBy, 
  limit, 
  Timestamp,
  handleFirestoreError,
  testConnection,
  User as FirebaseUser
} from '../lib/firebase';
import { 
  Terminal as TerminalIcon, 
  Code, 
  Globe, 
  Folder, 
  File, 
  ChevronRight, 
  ChevronDown, 
  Save, 
  Play, 
  RotateCcw, 
  X, 
  Maximize2, 
  Minimize2,
  Search,
  Settings,
  User,
  Layout,
  Layers,
  Zap,
  Cpu,
  Shield,
  Activity,
  MessageSquare,
  Send,
  Loader2,
  Monitor,
  FileText,
  CheckCircle2,
  CheckSquare,
  Square,
  Database,
  ListTodo,
  TrendingUp,
  Fingerprint,
  Bot,
  FileCode,
  BookOpen
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Editor from '@monaco-editor/react';
import { Terminal as XTerm } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import 'xterm/css/xterm.css';
import { nanoid } from 'nanoid';
import { EmployeeVM, JobFamily } from '../types';
import AgentLeeCodeStudio from './CodeStudio';
import MemoryLake from './MemoryLake';

// --- Types ---
export interface VFSFile {
  name: string;
  content: string;
  type: 'file';
  path: string;
}

export interface VFSDirectory {
  name: string;
  type: 'dir';
  path: string;
  children: (VFSFile | VFSDirectory)[];
}

export type VFSItem = VFSFile | VFSDirectory;

// --- Initial VFS ---
export const initialVFS: VFSDirectory = {
  name: 'root',
  type: 'dir',
  path: '/',
  children: [
    {
      name: 'src',
      type: 'dir',
      path: '/src',
      children: [
        {
          name: 'App.tsx',
          type: 'file',
          path: '/src/App.tsx',
          content: 'import React from "react";\n\nexport default function App() {\n  return (\n    <div className="p-8 bg-zinc-900 text-white min-h-screen">\n      <h1 className="text-4xl font-bold text-blue-500">Hello Agent Lee VM!</h1>\n      <p className="mt-4 text-zinc-400">This is a live preview from your virtual workspace.</p>\n    </div>\n  );\n}'
        },
        {
          name: 'index.css',
          type: 'file',
          path: '/src/index.css',
          content: 'body { margin: 0; font-family: sans-serif; }'
        }
      ]
    },
    {
      name: 'package.json',
      type: 'file',
      path: '/package.json',
      content: '{\n  "name": "leevm-project",\n  "dependencies": {\n    "react": "^18.0.0"\n  }\n}'
    }
  ]
};

// --- Helper Functions ---
const cn = (...inputs: any[]) => inputs.filter(Boolean).join(' ');

const findItemByPath = (vfs: VFSDirectory, path: string): VFSItem | null => {
  if (path === '/') return vfs;
  const parts = path.split('/').filter(Boolean);
  let current: VFSItem = vfs;

  for (const part of parts) {
    if (current.type === 'dir') {
      const found: VFSItem | undefined = current.children.find((child: VFSItem) => child.name === part);
      if (found) {
        current = found;
      } else {
        return null;
      }
    } else {
      return null;
    }
  }
  return current;
};

// --- Components ---

const FileTreeItem: React.FC<{
  item: VFSItem;
  level: number;
  onSelect: (path: string) => void;
  selectedPath: string;
}> = ({ item, level, onSelect, selectedPath }) => {
  const [isOpen, setIsOpen] = useState(true);
  const isSelected = selectedPath === item.path;

  if (item.type === 'file') {
    return (
      <button
        onClick={() => onSelect(item.path)}
        className={cn(
          "w-full flex items-center gap-2 px-2 py-1 text-xs hover:bg-white/5 transition-colors",
          isSelected ? "bg-blue-500/20 text-blue-400 border-l-2 border-blue-500" : "text-zinc-400"
        )}
        style={{ paddingLeft: `${level * 12 + 8}px` }}
      >
        <File size={14} className="shrink-0" />
        <span className="truncate">{item.name}</span>
      </button>
    );
  }

  return (
    <div>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-2 px-2 py-1 text-xs text-zinc-300 hover:bg-white/5 transition-colors"
        style={{ paddingLeft: `${level * 12 + 8}px` }}
      >
        {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        <Folder size={14} className="text-blue-400 shrink-0" />
        <span className="truncate">{item.name}</span>
      </button>
      {isOpen && (
        <div>
          {item.children.map((child, i) => (
            <FileTreeItem 
              key={i} 
              item={child} 
              level={level + 1} 
              onSelect={onSelect} 
              selectedPath={selectedPath}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// --- OS Apps ---

const Desktop: React.FC<{ onOpenApp: (app: string) => void, installedPackages: string[], onInstall?: (p: string) => void }> = ({ onOpenApp, installedPackages }) => {
  const apps = [
    { id: 'identity', name: 'Identity', icon: <Fingerprint size={24} />, color: 'text-zinc-600' },
    { id: 'vscode', name: 'Studio', icon: <FileCode size={24} />, color: 'text-[#000080]' },
    { id: 'notepad', name: 'Memory Lake', icon: <BookOpen size={24} />, color: 'text-amber-800' },
    { id: 'tasks', name: 'Flow', icon: <ListTodo size={24} />, color: 'text-emerald-800' },
    { id: 'browser', name: 'Nexus', icon: <Globe size={24} />, color: 'text-blue-800' },
    { id: 'terminal', name: 'Console', icon: <TerminalIcon size={24} />, color: 'text-black' },
    { id: 'diagnostics', name: 'Vitals', icon: <Activity size={24} />, color: 'text-rose-800' },
    { id: 'database', name: 'Vault', icon: <Database size={24} />, color: 'text-indigo-800' },
  ];

  const packageApps = [
    { id: 'termux', name: 'Termux', icon: <TerminalIcon size={24} />, color: 'text-green-500' },
    { id: 'userland', name: 'UserLAnd', icon: <Layers size={24} />, color: 'text-blue-500' },
    { id: 'andronix', name: 'Andronix', icon: <Zap size={24} />, color: 'text-orange-500' },
    { id: 'pydroid3', name: 'Pydroid 3', icon: <Code size={24} />, color: 'text-yellow-500' },
  ];

  return (
    <div className="flex-grow p-12 overflow-y-auto space-y-12">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8">
            {apps.map(app => (
                <button
                    key={app.id}
                    onClick={() => onOpenApp(app.id as any)}
                    className="flex flex-col items-center gap-4 group p-6 border border-black/5 hover:border-black/50 hover:bg-white transition-all shadow-sm hover:shadow-xl bg-[#FBFBF9]/50"
                >
                    <div className={cn("opacity-40 group-hover:opacity-100 transition-opacity", app.color)}>
                        {app.icon}
                    </div>
                    <span className="text-[9px] font-black uppercase tracking-widest text-[#1A1A1A]">{app.name}</span>
                </button>
            ))}
        </div>

        {installedPackages.length > 0 && (
            <div className="space-y-6">
                <div className="flex items-center gap-4">
                    <span className="text-[9px] font-black uppercase tracking-widest opacity-30">Installed Node Modules</span>
                    <div className="flex-grow h-px bg-black/5" />
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8">
                    {packageApps.filter(p => installedPackages.includes(p.id)).map(app => (
                        <button
                            key={app.id}
                            onClick={() => onOpenApp('terminal')}
                            className="flex flex-col items-center gap-4 group p-6 border border-black/5 hover:border-black/50 hover:bg-white transition-all bg-white/40"
                        >
                            <div className={cn("opacity-40 group-hover:opacity-100 transition-opacity", app.color)}>
                                {app.icon}
                            </div>
                            <span className="text-[9px] font-black uppercase tracking-widest text-[#1A1A1A]">{app.name}</span>
                        </button>
                    ))}
                </div>
            </div>
        )}
    </div>
  );
};

const Notepad: React.FC<{ content: string; onChange?: (val: string) => void; todos: Task[] }> = ({ content, onChange, todos }) => {
    return (
        <div className="h-full flex flex-col bg-white font-mono text-xs">
            <header className="h-8 bg-[#D1D1D1] border-b border-[#848484] flex items-center justify-between px-3 shrink-0">
                <div className="flex items-center gap-2">
                    <BookOpen size={12} />
                    <span className="font-bold uppercase tracking-wider text-[10px]">Mission Notepad - plan.md</span>
                </div>
                <div className="flex gap-2">
                    <button className="px-2 py-0.5 hover:bg-black/5 rounded">Save</button>
                    <button className="px-2 py-0.5 hover:bg-black/5 rounded">Commit</button>
                </div>
            </header>
            <div className="flex-1 overflow-hidden flex">
                <textarea 
                    value={content}
                    onChange={(e) => onChange?.(e.target.value)}
                    className="flex-1 p-6 resize-none outline-none leading-relaxed bg-[#FBFBF9] text-black"
                    placeholder="Enter mission briefing or plan details..."
                />
                <div className="w-64 border-l border-black/5 bg-[#F2F1ED] p-4 overflow-y-auto">
                    <h3 className="text-[10px] font-black uppercase tracking-widest mb-4 opacity-40 text-black">Sync State</h3>
                    <div className="space-y-3">
                        {todos.map(t => (
                            <div key={t.id} className="flex gap-2 opacity-60 text-black">
                                <div className={cn("w-1.5 h-1.5 rounded-full mt-1 shrink-0", t.completed ? "bg-green-500" : "bg-amber-500")} />
                                <span className={cn(t.completed && "line-through")}>{t.text}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
            <footer className="h-6 bg-[#F2F1ED] border-t border-black/5 flex items-center justify-between px-3 text-[8px] opacity-40 uppercase tracking-widest text-black">
                <span>Lines: {content.split('\n').length} | Chars: {content.length}</span>
                <span>VFS_MOUNT: plan.md</span>
            </footer>
        </div>
    );
};

const Browser: React.FC<{ messages: any[] }> = ({ messages }) => {
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [summary, setSummary] = useState('');

  const handleSearch = async () => {
    if (!query.trim()) return;
    setIsSearching(true);
    try {
      const { performParallelSearch } = await import('../services/searchService');
      const response = await performParallelSearch(query);
      setSearchResults(response.results);
      setSummary(response.summary);
    } catch (error) {
      console.error("Search failed", error);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="flex-grow flex flex-col bg-[#f0f0f0] text-zinc-900 font-sans h-full overflow-hidden">
      <div className="bg-zinc-200 p-2 border-b border-zinc-300 flex items-center gap-2 shrink-0">
        <div className="flex-grow bg-white border border-zinc-300 rounded px-3 py-1 text-[10px] flex items-center gap-2 shadow-inner">
          <Globe size={10} className="text-zinc-400" />
          <input 
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Search via SearXNG, DuckDuckGo, OpenDeepSearch..."
            className="w-full outline-none bg-transparent"
          />
        </div>
        <button 
          onClick={handleSearch}
          disabled={isSearching}
          className="px-4 py-1 bg-blue-600 text-white rounded text-[10px] font-bold uppercase transition-all active:scale-95 disabled:opacity-50"
        >
          {isSearching ? 'Scanning...' : 'Search'}
        </button>
      </div>
      
      <div className="flex-grow p-6 overflow-y-auto bg-white">
        {!searchResults.length && !isSearching ? (
          <div className="h-full flex flex-col items-center justify-center gap-6">
            <h1 className="text-6xl font-black italic tracking-tighter text-blue-600 mb-2">Nexus</h1>
            <div className="w-full max-w-md space-y-4">
                <div className="flex justify-center gap-4">
                    <div className="flex items-center gap-2 text-[9px] font-black uppercase opacity-20">
                        <Shield size={12} />
                        <span>SearXNG Ready</span>
                    </div>
                    <div className="flex items-center gap-2 text-[9px] font-black uppercase opacity-20">
                        <TerminalIcon size={12} />
                        <span>DDG Logic</span>
                    </div>
                    <div className="flex items-center gap-2 text-[9px] font-black uppercase opacity-20">
                        <Cpu size={12} />
                        <span>ODS Layer</span>
                    </div>
                </div>
            </div>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in duration-500">
            {summary && (
              <div className="p-4 bg-blue-50 border border-blue-100 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Bot size={14} className="text-blue-600" />
                  <span className="text-[9px] font-black uppercase tracking-widest text-blue-800">Mission Synthesis</span>
                </div>
                <p className="text-xs text-blue-900 leading-relaxed italic">{summary}</p>
              </div>
            )}

            <div className="space-y-6">
              {searchResults.map((result, i) => (
                <div key={i} className="group border-b border-zinc-100 pb-6 last:border-0 hover:bg-zinc-50/50 p-2 rounded transition-colors">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[8px] font-black px-1.5 py-0.5 bg-zinc-800 text-white uppercase rounded">
                      {result.source}
                    </span>
                    <span className="text-[9px] text-zinc-400 font-mono truncate">{result.url}</span>
                  </div>
                  <h3 className="text-sm font-bold text-blue-600 group-hover:underline cursor-pointer mb-2">
                    {result.title}
                  </h3>
                  <p className="text-xs text-zinc-600 leading-relaxed">
                    {result.snippet}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const Pallium: React.FC<{ user: FirebaseUser | null }> = ({ user }) => {
  return (
    <div className="flex-grow flex flex-col bg-[#c0c0c0] text-zinc-900 font-sans overflow-hidden">
      <div className="bg-[#000080] text-white px-2 py-1 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <Folder size={12} />
          <span className="text-[10px] font-bold uppercase tracking-widest">Memory Lake Explorer</span>
        </div>
      </div>
      <div className="flex-grow p-4 overflow-y-auto bg-white m-2 border-2 border-zinc-500 shadow-inner flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 opacity-40">
            <Layers size={48} className="text-cyan-600" />
            <span className="text-[10px] font-black uppercase tracking-widest text-center">Strata-IV Memory Mesh Synchronized</span>
        </div>
      </div>
    </div>
  );
};

const DatabaseExplorer: React.FC<{ user: FirebaseUser | null }> = ({ user }) => {
  return (
    <div className="flex-grow flex flex-col bg-[#f5f5f5] text-zinc-900 font-sans p-4 overflow-y-auto">
      <div className="flex items-center gap-2 border-b border-zinc-300 pb-2 mb-4">
        <Database size={20} className="text-purple-600" />
        <h2 className="text-sm font-black uppercase tracking-widest">Database Explorer</h2>
      </div>
      <div className="p-4 bg-white border border-zinc-300 rounded shadow-sm">
        <div className="flex items-center gap-2 mb-4">
            <div className={cn("w-2 h-2 rounded-full", user ? "bg-green-500" : "bg-red-500")} />
            <span className="text-xs font-bold font-mono">DB_STATUS: {user ? 'RUNNING' : 'OFFLINE'}</span>
        </div>
        <p className="text-[10px] text-zinc-500 font-mono">No data discovered in the local vault.</p>
      </div>
    </div>
  );
};

const Diagnostics: React.FC<{ todos: Task[] }> = ({ todos }) => {
  return (
    <div className="flex-grow flex flex-col bg-[#1a1a1a] text-green-500 font-mono p-4 overflow-y-auto">
      <div className="flex items-center gap-2 border-b border-green-900/50 pb-2 mb-4">
        <Activity size={16} className="animate-pulse" />
        <h2 className="text-xs font-black uppercase tracking-widest">Unit Vitals & Operational Status</h2>
      </div>
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
            <div className="p-3 border border-green-900/30 bg-green-900/5">
                <div className="text-[8px] text-green-700 uppercase mb-1">Cognitive Load</div>
                <div className="h-1 bg-green-900/20 rounded-full overflow-hidden">
                    <div className="h-full bg-green-500 w-[45%]" />
                </div>
            </div>
            <div className="p-3 border border-green-900/30 bg-green-900/5">
                <div className="text-[8px] text-green-700 uppercase mb-1">Neural Sync</div>
                <div className="h-1 bg-green-900/20 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 w-[88%]" />
                </div>
            </div>
        </div>

        <div className="space-y-2">
            <div className="flex items-center gap-2 text-[8px] text-green-700 uppercase font-bold tracking-widest">
                <ListTodo size={10} />
                <span>Active Task Sequence</span>
            </div>
            <div className="space-y-1">
                {todos.map((todo, i) => (
                    <div key={todo.id} className="flex items-center gap-3 text-[10px] opacity-80 border-l border-green-900/30 pl-3">
                        <span className="text-green-900">[{i+1}]</span>
                        <span className={cn("flex-grow", todo.completed && "line-through opacity-40")}>{todo.text}</span>
                        {todo.completed ? <CheckCircle2 size={10} /> : <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />}
                    </div>
                ))}
                {todos.length === 0 && <div className="text-[10px] italic opacity-40">No tasks requested.</div>}
            </div>
        </div>
      </div>
    </div>
  );
};

export interface Task {
    id: string;
    text: string;
    completed: boolean;
    step?: string;
}

const TaskTracker: React.FC<{ 
    vm: EmployeeVM, 
    todos: Task[], 
    onAdd: (text: string) => void,
    onToggle: (id: string) => void,
    onDelete: (id: string) => void,
    onUpdate: (id: string, text: string) => void
}> = ({ vm, todos, onAdd, onToggle, onDelete, onUpdate }) => {
    const [newTodo, setNewTodo] = useState('');

    return (
        <div className="h-full flex flex-col bg-white">
            <header className="p-8 border-b border-black/5 bg-[#FBFBF9]">
                <div className="flex items-center gap-4 mb-4">
                    <div className="p-3 bg-amber-500/10 rounded-2xl text-amber-600">
                        <ListTodo size={24} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-serif italic">Operational TaskFlow</h2>
                        <p className="text-[10px] font-bold uppercase tracking-widest opacity-40">Scoped Governance Check / Active Duties</p>
                    </div>
                </div>
                <div className="flex flex-wrap gap-2">
                    {vm.contract.duties.map((duty, i) => (
                        <div key={i} className="px-2 py-0.5 bg-black/5 text-[8px] uppercase font-bold tracking-tighter rounded border border-black/5">
                            {duty}
                        </div>
                    ))}
                </div>
            </header>

            <div className="flex-grow flex flex-col overflow-hidden">
                <div className="p-6 border-b border-black/5 flex gap-3">
                    <input 
                        value={newTodo}
                        onChange={(e) => setNewTodo(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && newTodo.trim()) {
                                onAdd(newTodo);
                                setNewTodo('');
                            }
                        }}
                        placeholder="Define next operational step..."
                        className="flex-grow bg-black/5 border border-black/5 rounded-xl px-4 text-xs h-12 outline-none focus:border-amber-500/50 transition-all font-mono"
                    />
                    <button 
                        onClick={() => {
                            if (newTodo.trim()) {
                                onAdd(newTodo);
                                setNewTodo('');
                            }
                        }}
                        className="px-6 bg-amber-500 text-white rounded-xl font-bold text-xs hover:bg-amber-600 transition-colors shadow-lg shadow-amber-500/20"
                    >
                        INJECT
                    </button>
                </div>

                <div className="flex-grow overflow-y-auto p-6 space-y-4">
                    {todos.map((todo) => (
                        <div key={todo.id} className="group flex items-start gap-4 p-4 bg-[#FBFBF9] border border-black/5 rounded-2xl hover:border-amber-500/30 transition-all">
                            <button 
                                onClick={() => onToggle(todo.id)}
                                className={cn(
                                    "mt-0.5 w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all",
                                    todo.completed ? "bg-amber-500 border-amber-500 text-white" : "border-black/10 hover:border-amber-500"
                                )}
                            >
                                {todo.completed && <Check size={12} strokeWidth={4} />}
                            </button>
                            <div className="flex-grow min-w-0">
                                <input 
                                    className={cn(
                                        "w-full bg-transparent border-none outline-none text-xs font-bold font-serif italic mb-1",
                                        todo.completed && "line-through opacity-40"
                                    )}
                                    value={todo.text}
                                    onChange={(e) => onUpdate(todo.id, e.target.value)}
                                />
                                <div className="flex items-center gap-3">
                                    <span className="text-[8px] font-black uppercase tracking-widest opacity-30">Status: {todo.completed ? 'COMPLETED' : 'IN_PROGRESS'}</span>
                                    <span className="text-[8px] font-mono opacity-20">{todo.id.slice(0, 8)}</span>
                                </div>
                            </div>
                            <button 
                                onClick={() => onDelete(todo.id)}
                                className="opacity-0 group-hover:opacity-100 p-2 text-red-500 hover:bg-red-50 rounded-xl transition-all"
                            >
                                <Trash2 size={14} />
                            </button>
                        </div>
                    ))}
                    {todos.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-20 opacity-20">
                            <Bot size={48} className="mb-4" />
                            <p className="text-xs font-black uppercase tracking-widest">No Active Sequence</p>
                        </div>
                    )}
                </div>
            </div>

            <footer className="p-6 border-t border-black/5 bg-[#1A1A1A] text-white">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <Fingerprint size={14} className="text-amber-500" />
                        <span className="text-[9px] font-black uppercase tracking-widest">Contract Alignment Check</span>
                    </div>
                    <div className="px-2 py-0.5 bg-amber-500 text-[8px] font-black">ENFORCED</div>
                </div>
                <div className="text-[8px] leading-relaxed opacity-40 uppercase tracking-wide">
                    Agent behavior is strictly monitored for alignment with contracted duties. Total task performance is evaluated against the scope of authority. Employer has real-time write access to this ledger.
                </div>
            </footer>
        </div>
    );
};

import { Archive, Trash2, Check } from 'lucide-react';

import { EmployeeCard, ContractCard, JOB_FAMILY_COLORS } from './Cards';
import EmployeeAvatar from './EmployeeAvatar';

const Terminal: React.FC<{ onInstall?: (pkg: string) => void, installedPackages?: string[] }> = ({ onInstall, installedPackages }) => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const currentLineRef = useRef('');

  const handleTerminalInput = useCallback((data: string) => {
    if (!xtermRef.current) return;
    const term = xtermRef.current;
    
    if (data === '\r') {
      term.write('\r\n');
      const cmd = currentLineRef.current.trim().toLowerCase();
      if (cmd === 'help') {
        term.writeln('Available: help, clear, pkg list, pkg install [name], pkg installed');
      } else if (cmd === 'clear') {
        term.clear();
      } else if (cmd === 'pkg list') {
        term.writeln('Repos: termux, userland, andronix, pydroid3');
      } else if (cmd.startsWith('pkg install ')) {
        const pkg = cmd.replace('pkg install ', '').trim();
        term.writeln(`Leeway Mirror: pulling ${pkg}...`);
        setTimeout(() => {
          term.writeln(`Success: ${pkg} synchronized.`);
          onInstall?.(pkg);
          term.write('\r\n\x1b[1;32mlee@vm\x1b[0m:\x1b[1;34m~\x1b[0m$ ');
        }, 1000);
        currentLineRef.current = '';
        return;
      } else if (cmd) {
        term.writeln(`Leeway: command '${cmd}' not mapped.`);
      }
      term.write('\x1b[1;32mlee@vm\x1b[0m:\x1b[1;34m~\x1b[0m$ ');
      currentLineRef.current = '';
    } else if (data === '\x7f') { // Backspace
      if (currentLineRef.current.length > 0) {
        currentLineRef.current = currentLineRef.current.slice(0, -1);
        term.write('\b \b');
      }
    } else {
      currentLineRef.current += data;
      term.write(data);
    }
  }, [onInstall]);

  useEffect(() => {
    if (!terminalRef.current) return;
    const term = new XTerm({
      cursorBlink: true,
      fontSize: 12,
      fontFamily: 'JetBrains Mono, monospace',
      theme: { background: '#0c0c0c' }
    });
    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(terminalRef.current);
    try {
      setTimeout(() => {
        if (terminalRef.current) fitAddon.fit();
      }, 100);
    } catch (e) {
      console.warn('Fit failed', e);
    }
    term.writeln('\x1b[1;34mLeeway VM Shell v1.0.0\x1b[0m');
    term.write('\r\n\x1b[1;32mlee@vm\x1b[0m:\x1b[1;34m~\x1b[0m$ ');
    
    term.onData(handleTerminalInput);
    xtermRef.current = term;
    return () => term.dispose();
  }, [handleTerminalInput]);

  return <div ref={terminalRef} className="h-full w-full" />;
};

const IdentityApp: React.FC<{ vm: EmployeeVM }> = ({ vm }) => {
  return (
    <div className="h-full overflow-y-auto p-12 bg-white flex flex-col items-center">
      <div className="max-w-4xl w-full space-y-12">
        <header className="border-b border-black/5 pb-8">
            <h1 className="text-4xl font-serif italic mb-2">Unit Identity Substrate</h1>
            <p className="text-[10px] font-bold uppercase tracking-widest opacity-40">Verified Leeway Professional Spec / {vm.vmId}</p>
        </header>

        <div className="flex flex-col xl:flex-row gap-12 items-start">
            <div className="space-y-4">
                <p className="text-[10px] font-black uppercase tracking-widest opacity-30">Active Facade</p>
                <EmployeeCard vm={vm} />
            </div>
            <div className="space-y-4 flex-grow">
                <p className="text-[10px] font-black uppercase tracking-widest opacity-30">Governance Contract</p>
                <ContractCard vm={vm} />
            </div>
        </div>

        <div className="bg-[#1A1A1A] p-8 text-white space-y-4">
            <div className="flex justify-between items-center bg-white/10 p-4">
                <div className="flex items-center gap-3">
                    <Shield size={16} className="text-blue-400" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Leeway Protocol V.2.1 Activated</span>
                </div>
                <div className="px-2 py-0.5 bg-blue-500 text-[8px] font-black uppercase">Standard Enforcement</div>
            </div>
            <p className="text-[10px] leading-relaxed opacity-60 uppercase tracking-wide">
                This unit is bound by the Leeway Standards of Digital Professionalism. All cognitive outputs are logged and audited against the employer's specified boundaries. Unauthorized deviation is impossible within the current LawEngine configuration.
            </p>
            
            {vm.contract.boundaries && vm.contract.boundaries.length > 0 && (
                <div className="pt-4 border-t border-white/10 space-y-3">
                    <p className="text-[8px] font-black uppercase tracking-[0.2em] text-blue-400">Custom Governance Overrides</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {vm.contract.boundaries.map((b, i) => (
                            <div key={i} className="flex items-center gap-2 text-[9px] uppercase tracking-wider opacity-80">
                                <div className="w-1 h-1 bg-blue-400 rounded-full" />
                                <span>{b}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

const UnitFrame: React.FC<{ 
  children: React.ReactNode; 
  title: string; 
  onClose: () => void; 
  jobFamily?: JobFamily;
}> = ({ children, title, onClose, jobFamily }) => {
  const colors = jobFamily ? JOB_FAMILY_COLORS[jobFamily] : JOB_FAMILY_COLORS['Assistant'];

  return (
    <div className="flex flex-col h-full bg-[#D1D1D1] border-2 border-white border-r-[#848484] border-b-[#848484] shadow-2xl p-1 relative overflow-hidden font-sans">
        {/* Title Bar */}
        <div 
            className="h-8 flex items-center justify-between px-2 cursor-move select-none shadow-[inset_1px_1px_0_rgba(255,255,255,0.4)]"
            style={{ backgroundColor: colors.hex }}
        >
            <div className="flex items-center gap-2">
                <Monitor size={14} className="text-white drop-shadow-md" />
                <span className="text-[10px] font-bold text-white uppercase tracking-widest truncate max-w-[250px] drop-shadow-md">{title}</span>
            </div>
            <div className="flex items-center gap-1">
                <button className="w-6 h-6 bg-[#D1D1D1] border border-white border-r-[#848484] border-b-[#848484] flex items-center justify-center hover:bg-zinc-200 active:shadow-[inset_1px_1px_0_rgba(0,0,0,0.4)] active:translate-x-[0.5px] active:translate-y-[0.5px]">
                    <span className="text-[10px] font-black translate-y-[-1px]">_</span>
                </button>
                <button className="w-6 h-6 bg-[#D1D1D1] border border-white border-r-[#848484] border-b-[#848484] flex items-center justify-center hover:bg-zinc-200 active:shadow-[inset_1px_1px_0_rgba(0,0,0,0.4)] active:translate-x-[0.5px] active:translate-y-[0.5px]">
                    <div className="w-2.5 h-2.5 border border-black" />
                </button>
                <button 
                    onClick={onClose}
                    className="w-6 h-6 bg-[#D1D1D1] border border-white border-r-[#848484] border-b-[#848484] flex items-center justify-center hover:bg-[#c0c0c0] active:shadow-[inset_1px_1px_0_rgba(0,0,0,0.4)] active:translate-x-[0.5px] active:translate-y-[0.5px] ml-1 font-black"
                >
                    <X size={12} className="text-black" />
                </button>
            </div>
        </div>

        {/* Menu Bar (Classic OS style) */}
        <div className="h-6 bg-[#D1D1D1] border-b border-[#848484] flex items-center px-1 gap-4 text-[10px] font-medium text-black shadow-[inset_1px_1px_0_white]">
            {['File', 'Edit', 'Kernel', 'Vitals', 'Logs', 'Secure'].map(m => (
                <button key={m} className="px-2 hover:bg-[#000080] hover:text-white transition-colors">{m}</button>
            ))}
        </div>

        {/* Main Surface */}
        <div className="flex-1 bg-[#F2F1ED] border-t-2 border-l-2 border-[#848484] border-r border-b border-white relative overflow-hidden flex flex-col">
            {children}
        </div>

        {/* Bottom Status Bar */}
        <footer className="h-6 bg-[#D1D1D1] border-t border-white flex items-center justify-between px-2 text-[9px] font-mono text-black/60">
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-1 px-2 border-r border-[#848484]/30">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                    <span>QUANTUM_CORE_READY</span>
                </div>
            </div>
            <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                    <Shield size={10} />
                    <span>ENFORCED_STATE_LOCK</span>
                </div>
                <div className="w-16 h-3 bg-[#848484]/20 border border-white border-r-[#D1D1D1] border-b-[#D1D1D1] overflow-hidden">
                    <motion.div 
                        animate={{ x: ['-100%', '100%'] }}
                        transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                        className="w-1/2 h-full opacity-30"
                        style={{ backgroundColor: colors.hex }}
                    />
                </div>
                <span>SYS_TIME: v2.4.1</span>
            </div>
        </footer>
    </div>
  );
};

// --- Main AgentVM Component ---

interface AgentVMProps {
  vm: EmployeeVM;
  onClose: () => void;
}

export const AgentVM: React.FC<AgentVMProps> = ({ vm, onClose }) => {
  const [currentApp, setCurrentApp] = useState<'desktop' | 'vscode' | 'browser' | 'memorylake' | 'diagnostics' | 'database' | 'terminal' | 'identity' | 'tasks' | 'notepad'>('identity');
  const [activeFilePath, setActiveFilePath] = useState('/src/App.tsx');
  const [vfs, setVfs] = useState(initialVFS);
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [installedPackages, setInstalledPackages] = useState<string[]>([]);
  const planFile = initialVFS.children.find(f => f.name === 'plan.md') as VFSFile | undefined;
  const [notepadContent, setNotepadContent] = useState(planFile?.content || '');
  const [todos, setTodos] = useState<Task[]>([
    { id: 't1', text: 'Initialize neural core workspace', completed: true },
    { id: 't2', text: 'Calibrate operational duty scope', completed: false },
    { id: 't3', text: 'Stream performance logs to employer', completed: false },
  ]);
  
  const colors = vm.identity?.jobFamily ? JOB_FAMILY_COLORS[vm.identity.jobFamily] : JOB_FAMILY_COLORS['Assistant'];
  
  const handleInstallPackage = (pkg: string) => {
    setInstalledPackages(prev => [...prev, pkg]);
  };

  const handleAddTodo = (text: string) => {
    setTodos(prev => [...prev, { id: nanoid(), text, completed: false }]);
  };

  const handleToggleTodo = (id: string) => {
    setTodos(prev => prev.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  const handleDeleteTodo = (id: string) => {
    setTodos(prev => prev.filter(t => t.id !== id));
  };

  const handleUpdateTodo = (id: string, text: string) => {
    setTodos(prev => prev.map(t => t.id === id ? { ...t, text } : t));
  };

  useEffect(() => {
    return onAuthStateChanged(setUser);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-[1000] bg-[#FBFBF9]/90 backdrop-blur-sm p-4 md:p-12 flex items-center justify-center select-none"
    >
      <div className="w-full h-full max-w-6xl shadow-2xl">
        <UnitFrame title={`${vm.displayName} / Remote Administration`} onClose={onClose} jobFamily={vm.identity?.jobFamily}>
          {/* OS Taskbar */}
          <div className="h-11 bg-[#1A1A1A] text-white flex items-center justify-between px-4 shrink-0 border-b border-white/10">
            <div className="flex items-center h-full">
              <button 
                onClick={() => setCurrentApp('desktop')} 
                className="flex items-center gap-2 px-6 h-full hover:bg-white/10 transition-colors border-r border-white/5"
              >
                <div className="w-4 h-4 bg-white rounded-sm flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: colors.hex }} />
                </div>
                <span className="text-[10px] font-black uppercase tracking-[0.2em]">Start</span>
              </button>
              
              <div className="flex h-full ml-2">
                {[
                  { id: 'identity', l: 'Identity' },
                  { id: 'vscode', l: 'Studio' },
                  { id: 'memorylake', l: 'Memory' },
                  { id: 'tasks', l: 'Flow' },
                  { id: 'notepad', l: 'Briefing' },
                  { id: 'diagnostics', l: 'Vitals' },
                  { id: 'terminal', l: 'Console' }
                ].map(app => (
                  <button
                    key={app.id}
                    onClick={() => setCurrentApp(app.id as any)}
                    className={cn(
                      "px-5 h-full text-[9px] font-bold uppercase tracking-widest transition-all relative",
                      currentApp === app.id ? "bg-white text-black" : "hover:bg-white/5 opacity-60 hover:opacity-100"
                    )}
                  >
                    {app.l}
                    {currentApp === app.id && (
                        <div className="absolute bottom-0 left-0 w-full h-[3px]" style={{ backgroundColor: colors.hex }} />
                    )}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-6 px-4">
                <div className="flex flex-col items-end">
                    <span className="text-[8px] font-black uppercase tracking-tighter opacity-40">{vm.displayName}</span>
                    <span className="text-[7px] font-mono opacity-20">{vm.employeeId}</span>
                </div>
                <div className="w-8 h-8 rounded-full overflow-hidden border border-white/10">
                    <EmployeeAvatar
                        avatarUrl={vm.avatarUrl}
                        alt={vm.displayName}
                        gridPos={vm.identity?.gridPos}
                        className="w-full h-full"
                    />
                </div>
            </div>
          </div>

          <div className="flex-grow flex overflow-hidden relative bg-[#F2F1ED] p-8 md:p-12">
             {/* The Virtual Machine Container with Classic Bezel feel */}
             <div 
                className="flex-grow flex flex-col relative overflow-hidden bg-white shadow-[0_0_100px_rgba(0,0,0,0.1)] border border-black/5"
                style={{ outline: `1px solid ${colors.hex}20`, outlineOffset: '8px' }}
             >
                {currentApp === 'desktop' && (
                    <Desktop 
                        onOpenApp={(app) => setCurrentApp(app as any)} 
                        installedPackages={installedPackages} 
                    />
                )}
                {currentApp === 'identity' && (
                    <div className="h-full overflow-y-auto p-12 bg-white flex flex-col items-center">
                        <div className="max-w-5xl w-full flex flex-col xl:flex-row gap-12">
                            <div className="xl:w-[400px] space-y-8 shrink-0">
                                <section className="space-y-4">
                                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] opacity-30 px-2">Unit Facade</h3>
                                    <EmployeeCard vm={vm} />
                                </section>
                                <section className="space-y-4">
                                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] opacity-30 px-2">Bound Contract</h3>
                                    <ContractCard vm={vm} />
                                </section>
                            </div>
                            <div className="flex-1 space-y-12">
                                <header className="border-b border-black/5 pb-8">
                                    <h1 className="text-4xl font-serif italic mb-2">Cognitive Blueprint</h1>
                                    <p className="text-[10px] font-bold uppercase tracking-widest opacity-40">Verified Leeway Professional Spec / {vm.vmId}</p>
                                </header>
                                <div className="grid grid-cols-2 gap-8">
                                    <div className="p-6 bg-[#FBFBF9] border border-black/5 rounded-2xl">
                                        <h4 className="text-[9px] font-black uppercase tracking-widest opacity-30 mb-4">Authority Enforcement</h4>
                                        <div className="flex items-center gap-2 mb-2 font-mono text-xs">
                                            <div className="w-2 h-2 rounded-full bg-green-500" />
                                            <span>KERNEL_LOCK: ACTIVE</span>
                                        </div>
                                        <p className="text-[10px] opacity-60">Memory Lake and Source Control are linked to this primary unit.</p>
                                    </div>
                                    <div className="p-6 bg-[#FBFBF9] border border-black/5 rounded-2xl">
                                        <h4 className="text-[9px] font-black uppercase tracking-widest opacity-30 mb-4">Readiness Level</h4>
                                        <div className="text-2xl font-mono text-zinc-800">{vm.identity?.readinessScore}%</div>
                                        <div className="w-full h-1 bg-black/5 mt-2 rounded-full overflow-hidden">
                                            <div className="h-full bg-amber-500" style={{ width: `${vm.identity?.readinessScore}%` }} />
                                        </div>
                                    </div>
                                </div>
                                <div className="p-8 bg-[#1A1A1A] text-white space-y-6">
                                    <div className="flex justify-between items-center bg-white/5 p-4 border border-white/5 rounded-lg">
                                        <div className="flex items-center gap-3">
                                            <Shield size={16} className="text-blue-400" />
                                            <span className="text-[10px] font-bold tracking-widest uppercase">LawEngine Protocol Engaged</span>
                                        </div>
                                        <span className="text-[8px] font-black px-2 py-0.5 bg-blue-500 uppercase">Enforced</span>
                                    </div>
                                    <p className="text-xs leading-relaxed opacity-50 uppercase tracking-widest">
                                        All agent actions are verified against the governing role standards and user-defined boundaries. No deviations found.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
                {currentApp === 'memorylake' && <MemoryLake />}
                {currentApp === 'notepad' && <MemoryLake />}
                {currentApp === 'tasks' && (
                    <TaskTracker 
                        vm={vm} 
                        todos={todos} 
                        onAdd={handleAddTodo}
                        onToggle={handleToggleTodo}
                        onDelete={handleDeleteTodo}
                        onUpdate={handleUpdateTodo}
                    />
                )}
                {currentApp === 'vscode' && <AgentLeeCodeStudio />}
                {currentApp === 'browser' && <Browser messages={[]} />}
                {currentApp === 'database' && <DatabaseExplorer user={user} />}
                {currentApp === 'diagnostics' && (
                  <div className="h-full flex flex-col p-12 space-y-12 overflow-y-auto">
                      <header className="flex justify-between items-end border-b border-black/5 pb-8">
                          <div className="space-y-1">
                              <h2 className="text-3xl font-serif italic">Operational Vitals</h2>
                              <p className="text-[10px] font-bold uppercase tracking-widest opacity-40">Live Performance Analytics & Logic Streams</p>
                          </div>
                      </header>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                          <section className="p-8 bg-black text-white rounded-2xl space-y-6">
                              <div className="flex justify-between items-center">
                                  <h3 className="text-[10px] font-black uppercase tracking-widest opacity-50">Active Performance Stream</h3>
                                  <div className="flex items-center gap-2">
                                      <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                                      <span className="text-[8px] font-black uppercase tracking-widest">Live Record</span>
                                  </div>
                              </div>
                              <div className="space-y-4">
                                  {todos.map((todo) => (
                                      <div key={todo.id} className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-lg">
                                          <div className="flex items-center gap-4">
                                              <div className={cn("w-2 h-2 rounded-full", todo.completed ? "bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]" : "bg-white/20")} />
                                              <span className={cn("text-xs tracking-wide", todo.completed ? "opacity-100" : "opacity-40")}>{todo.text}</span>
                                          </div>
                                          <span className="text-[8px] font-mono opacity-30">{todo.completed ? 'SYC_DONE' : 'PENDING'}</span>
                                      </div>
                                  ))}
                              </div>
                          </section>
                          <section className="p-8 bg-[#FBFBF9] border border-black/5 rounded-2xl space-y-6">
                              <h3 className="text-[10px] font-black uppercase tracking-widest opacity-50">Cognitive Metrics</h3>
                              <div className="space-y-6">
                                  <div className="space-y-2">
                                      <div className="flex justify-between text-[9px] uppercase tracking-widest">
                                          <span>Neural Load</span>
                                          <span>74%</span>
                                      </div>
                                      <div className="w-full h-1 bg-black/5 rounded-full overflow-hidden">
                                          <div className="h-full bg-black w-[74%]" />
                                      </div>
                                  </div>
                                  <div className="space-y-2">
                                      <div className="flex justify-between text-[9px] uppercase tracking-widest">
                                          <span>Sync Integrity</span>
                                          <span>99.9%</span>
                                      </div>
                                      <div className="w-full h-1 bg-black/5 rounded-full overflow-hidden">
                                          <div className="h-full bg-green-500 w-[99.9%]" />
                                      </div>
                                  </div>
                              </div>
                          </section>
                      </div>
                  </div>
                )}
                {currentApp === 'terminal' && (
                    <Terminal onInstall={handleInstallPackage} installedPackages={installedPackages} />
                )}
             </div>
          </div>
        </UnitFrame>
      </div>
    </motion.div>
  );
};

export default AgentVM;

