/*
FILE: src\components\CodeStudio.tsx
PURPOSE: LeeWay governed asset for leeway-employment-center.
TAG: UI.COMPONENT.C_OD_ES_TU_DI_O.MAIN
REGION: 🔵 UI
GOVERNED_BY: LeeWay Standards
OWNED_BY: Agent Lee / LeeWay Runtime
DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render
IMPORTS: Inferred by verification scanner
EXPORTS: Inferred by verification scanner
STATUS: ACTIVE
*/
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { create } from 'zustand';
import { nanoid } from 'nanoid';
import { 
  X, ChevronLeft, ChevronRight, Briefcase, Zap, Menu, MoreVertical, 
  Search, GitBranch, Bot, PenTool, FileCode, Folder, MoreHorizontal, 
  Plus, FolderPlus, Check, HelpCircle, Globe, Terminal as TerminalIcon, 
  Activity, Eye, EyeOff, Layout, Type, Clock, Hash, List, Sparkles, 
  FileText, ChevronDown, Save, Play, CheckCircle2, AlertCircle, Info,
  Mic, Send, Home, Rocket, MessageSquare, BookOpen, Command as CommandIcon,
  Settings
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Editor from '@monaco-editor/react';
import ReactMarkdown from 'react-markdown';
import { Terminal as XTerm } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import 'xterm/css/xterm.css';
import { GoogleGenAI } from "@google/genai";
import {
  guardedAction,
  type GovernanceContext,
  type GovernanceAuditReceipt,
} from '../core/leewayGovernanceGate';

const cn = (...inputs: any[]) => inputs.filter(Boolean).join(' ');

const CODE_STUDIO_GOVERNANCE_CONTEXT: GovernanceContext = {
  actorId: 'ADMIN-LEE-001',
  role: 'admin',
  policies: ['studio.ai.execute', 'studio.terminal.manage', 'studio.file.save'],
  surface: 'employment-center:code-studio',
};

const getGovernanceToast = (action: string, receipt: GovernanceAuditReceipt, ok: boolean) =>
  ok
    ? `${action} cleared by LeeWay governance. Receipt: ${receipt.id}`
    : `${action} blocked by LeeWay governance. Receipt: ${receipt.id}`;

// --- Types ---
export interface FileNode {
  id: string;
  name: string;
  type: 'file' | 'directory';
  content?: string;
  parentId: string | null;
  path: string;
}

export interface EditorState {
  activeFileId: string | null;
  openFileIds: string[];
  showPreview: boolean;
  wordCount: number;
  readingTime: number;
  isMarkdownPreview: boolean;
}

export interface AppSettings {
  autoSave: 'off' | 'afterDelay' | 'onFocusChange';
  fontSize: number;
  tabSize: number;
  formatOnSave: boolean;
  wordWrap: boolean;
  theme: 'dark' | 'light';
  markdownTheme: 'dark' | 'light';
  spellcheck: boolean;
  mermaidEnabled: boolean;
  brandVoice: string;
}

export interface TerminalState {
  id: string;
  title: string;
  output: string[];
}

export interface AgentState {
  id: string;
  name: string;
  role: string;
  status: 'idle' | 'working' | 'thinking' | 'error';
  currentTask?: string;
  health: number;
  lastAction?: string;
  color: string;
}

export interface MemoryLakeEntry {
  id: string;
  timestamp: string;
  agentId: string;
  agentName: string;
  action: string;
  details: string;
  impact: 'low' | 'medium' | 'high';
}

export interface AppState {
  files: Record<string, FileNode>;
  editor: EditorState;
  settings: AppSettings;
  terminals: TerminalState[];
  activeTerminalId: string | null;
  sidebarVisible: boolean;
  agentVisible: boolean;
  panelVisible: boolean;
  navPanelVisible: boolean;
  writerPanelVisible: boolean;
  activeSidebarTab: 'explorer' | 'search' | 'git' | 'writing' | 'extensions' | 'settings';
  activeTab: 'Files' | 'Projects' | 'To-Do' | 'Terminal' | 'Preview' | 'Monitor' | 'Diagnostics' | 'AgentCore';
  activePanel: 'explorer' | 'search' | 'preview' | 'terminal' | 'scm' | 'agent' | 'core' | 'writer' | 'writing' | 'extensions' | null;
  commandPaletteVisible: boolean;
  agents: AgentState[];
  memoryLake: MemoryLakeEntry[];
  isThinking: boolean;
  todos: { id: string, text: string, completed: boolean }[];
  notes: string;
  notification: { id: string, message: string, type: 'info' | 'success' | 'error' } | null;
}

// --- Store ---
interface AppStore extends AppState {
  setFiles: (files: Record<string, FileNode>) => void;
  addFile: (name: string, type: 'file' | 'directory', parentId: string | null) => void;
  updateFileContent: (id: string, content: string) => void;
  setActiveFile: (id: string | null) => void;
  closeFile: (id: string) => void;
  setPreview: (show: boolean) => void;
  toggleSidebar: (visible?: boolean) => void;
  toggleAgent: (visible?: boolean) => void;
  togglePanel: (visible?: boolean) => void;
  toggleNavPanel: (visible?: boolean) => void;
  toggleWriterPanel: (visible?: boolean) => void;
  toggleCommandPalette: (visible?: boolean) => void;
  setActivePanel: (panel: AppState['activePanel']) => void;
  updateSettings: (settings: Partial<AppState['settings']>) => void;
  updateEditorState: (state: Partial<AppState['editor']>) => void;
  toggleTheme: () => void;
  setSidebarTab: (tab: AppState['activeSidebarTab']) => void;
  setActiveTab: (tab: AppState['activeTab']) => void;
  addTerminal: () => void;
  setActiveTerminal: (id: string) => void;
  appendTerminalOutput: (id: string, text: string) => void;
  addTodo: (text: string) => void;
  toggleTodo: (id: string) => void;
  updateTodo: (id: string, text: string) => void;
  deleteTodo: (id: string) => void;
  updateNotes: (notes: string) => void;
  showNotification: (message: string, type?: 'info' | 'success' | 'error') => void;
  sendMessage: (content: string) => Promise<void>;
  applyAction: (action: any) => void;
}

const initialFiles: Record<string, FileNode> = {
  'root': { id: 'root', name: 'project', type: 'directory', parentId: null, path: '/project' },
  '1': { id: '1', name: 'App.tsx', type: 'file', content: 'export default function App() {\n  return <div>Hello World</div>;\n}', parentId: 'root', path: '/project/App.tsx' },
  '2': { id: '2', name: 'styles.css', type: 'file', content: 'body { background: #1e1e1e; color: white; }', parentId: 'root', path: '/project/styles.css' },
};

export const useAppStore = create<AppStore>((set, get) => ({
  files: initialFiles,
  editor: {
    activeFileId: '1',
    openFileIds: ['1'],
    showPreview: false,
    wordCount: 0,
    readingTime: 0,
    isMarkdownPreview: false,
  },
  settings: {
    autoSave: 'afterDelay',
    fontSize: 14,
    tabSize: 2,
    formatOnSave: true,
    wordWrap: true,
    theme: 'dark',
    markdownTheme: 'dark',
    spellcheck: true,
    mermaidEnabled: true,
    brandVoice: 'Professional, direct, and helpful.',
  },
  terminals: [
    { id: 'default', title: 'bash', output: [] },
  ],
  activeTerminalId: 'default',
  sidebarVisible: false,
  agentVisible: false,
  panelVisible: false,
  navPanelVisible: false,
  writerPanelVisible: false,
  activePanel: null,
  commandPaletteVisible: false,
  activeSidebarTab: 'explorer',
  activeTab: 'Files',
  agents: [
    { id: 'lee', name: 'Agent Lee', role: 'Orchestrator', status: 'idle', health: 100, color: '#3b82f6' },
    { id: 'syntax', name: 'Agent Syntax', role: 'Code Writer', status: 'idle', health: 100, color: '#10b981' },
    { id: 'patch', name: 'Agent Patch', role: 'Code Editor', status: 'idle', health: 100, color: '#f59e0b' },
    { id: 'bughunter', name: 'Agent BugHunter', role: 'Debugger', status: 'idle', health: 100, color: '#ef4444' },
    { id: 'deployer', name: 'Agent Deployer', role: 'Deployment', status: 'idle', health: 100, color: '#8b5cf6' },
    { id: 'nexus', name: 'Agent Nexus', role: 'MCP Integration', status: 'idle', health: 100, color: '#ec4899' },
  ],
  memoryLake: [
    { id: '1', timestamp: new Date().toISOString(), agentId: 'lee', agentName: 'Agent Lee', action: 'System Boot', details: 'Agent Lee online. Memory Lake initialized.', impact: 'low' }
  ],
  isThinking: false,
  todos: [
    { id: '1', text: 'Initialize Code Studio', completed: true },
    { id: '2', text: 'Implement mobile-first layout', completed: true },
  ],
  notes: 'Project: Code Studio\nGoal: Build a mobile-first autonomous IDE.',
  notification: null,

  setFiles: (files) => set({ files }),
  addFile: (name, type, parentId) => set((state) => {
    const id = nanoid();
    const parent = parentId ? state.files[parentId] : null;
    const path = parent ? `${parent.path}/${name}` : `/${name}`;
    return {
      files: {
        ...state.files,
        [id]: { id, name, type, parentId, path, content: type === 'file' ? '' : undefined }
      }
    };
  }),
  updateFileContent: (id, content) => set((state) => ({
    files: { ...state.files, [id]: { ...state.files[id], content } }
  })),
  setActiveFile: (id) => set((state) => ({
    editor: {
      ...state.editor,
      activeFileId: id,
      showPreview: false,
      openFileIds: id && !state.editor.openFileIds.includes(id) ? [...state.editor.openFileIds, id] : state.editor.openFileIds
    }
  })),
  closeFile: (id) => set((state) => {
    const newOpenFiles = state.editor.openFileIds.filter(fid => fid !== id);
    return {
      editor: {
        ...state.editor,
        openFileIds: newOpenFiles,
        activeFileId: state.editor.activeFileId === id ? (newOpenFiles[newOpenFiles.length - 1] || null) : state.editor.activeFileId
      }
    };
  }),
  setPreview: (show) => set((state) => ({ editor: { ...state.editor, showPreview: show } })),
  toggleSidebar: (visible) => set((state) => ({ 
    sidebarVisible: visible !== undefined ? visible : !state.sidebarVisible,
    agentVisible: false 
  })),
  toggleAgent: (visible) => set((state) => ({ 
    agentVisible: visible !== undefined ? visible : !state.agentVisible,
    sidebarVisible: false 
  })),
  togglePanel: (visible) => set((state) => ({ panelVisible: visible !== undefined ? visible : !state.panelVisible })),
  toggleNavPanel: (visible) => set((state) => ({ navPanelVisible: visible !== undefined ? visible : !state.navPanelVisible })),
  toggleWriterPanel: (visible) => set((state) => ({ writerPanelVisible: visible !== undefined ? visible : !state.writerPanelVisible })),
  toggleCommandPalette: (visible) => set((state) => ({ commandPaletteVisible: visible !== undefined ? visible : !state.commandPaletteVisible })),
  setActivePanel: (panel) => set((state) => ({
    activePanel: state.activePanel === panel ? null : panel,
    sidebarVisible: panel === 'explorer' || panel === 'search' || panel === 'scm' || panel === 'writing' || panel === 'extensions' ? true : state.sidebarVisible,
    panelVisible: panel === 'terminal' ? true : state.panelVisible,
    writerPanelVisible: panel === 'writer' ? true : state.writerPanelVisible,
  })),
  updateSettings: (newSettings) => set((state) => ({ settings: { ...state.settings, ...newSettings } })),
  updateEditorState: (newState) => set((state) => ({ editor: { ...state.editor, ...newState } })),
  toggleTheme: () => set((state) => ({ settings: { ...state.settings, theme: state.settings.theme === 'dark' ? 'light' : 'dark' } })),
  setSidebarTab: (tab) => set({ activeSidebarTab: tab, sidebarVisible: true, agentVisible: false }),
  setActiveTab: (tab) => set({ activeTab: tab }),
  addTerminal: () => set((state) => {
    const id = nanoid();
    return { terminals: [...state.terminals, { id, title: 'bash', output: [] }], activeTerminalId: id };
  }),
  setActiveTerminal: (id) => set({ activeTerminalId: id }),
  appendTerminalOutput: (id, text) => set((state) => ({
    terminals: state.terminals.map(t => t.id === id ? { ...t, output: [...t.output, text] } : t)
  })),
  addTodo: (text) => set((state) => ({ todos: [...state.todos, { id: nanoid(), text, completed: false }] })),
  toggleTodo: (id) => set((state) => ({ todos: state.todos.map(t => t.id === id ? { ...t, completed: !t.completed } : t) })),
  updateTodo: (id, text) => set((state) => ({ todos: state.todos.map(t => t.id === id ? { ...t, text } : t) })),
  deleteTodo: (id) => set((state) => ({ todos: state.todos.filter(t => t.id !== id) })),
  updateNotes: (notes) => set({ notes }),
  showNotification: (message, type = 'info') => {
    const id = nanoid();
    set({ notification: { id, message, type } });
    setTimeout(() => set((state) => ({ notification: state.notification?.id === id ? null : state.notification })), 3000);
  },
  sendMessage: async (content) => {
    const { files, agents, memoryLake, todos } = get();
    set((state) => ({
      isThinking: true,
      agents: state.agents.map(a => a.id === 'lee' ? { ...a, status: 'thinking', currentTask: content } : a),
      memoryLake: [...state.memoryLake, { id: nanoid(), timestamp: new Date().toISOString(), agentId: 'lee', agentName: 'Agent Lee', action: 'Task Received', details: content, impact: 'medium' }]
    }));
    try {
      const { GoogleGenAI } = await import('@google/genai');
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
      const systemPrompt = `You are Agent Lee, the Orchestrator of an autonomous coding swarm.
        Current files: ${JSON.stringify(Object.values(files).map(f => ({ id: f.id, path: f.path, name: f.name })))}
        Respond with a JSON object: { "message": "Direct response to user", "actions": [ ...list of actions ] }`;
      
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: systemPrompt + "\n\nTask: " + content,
        config: { responseMimeType: "application/json" }
      });
      
      const data = JSON.parse(response.text || '{}');
      if (data.actions) {
        for (const action of data.actions) {
          get().applyAction(action);
          await new Promise(r => setTimeout(r, 500));
        }
      }
      set((state) => ({
        isThinking: false,
        agents: state.agents.map(a => a.id === 'lee' ? { ...a, status: 'idle', currentTask: undefined } : a),
        memoryLake: [...state.memoryLake, { id: nanoid(), timestamp: new Date().toISOString(), agentId: 'lee', agentName: 'Agent Lee', action: 'Task Completed', details: data.message || 'Finished.', impact: 'high' }]
      }));
    } catch (error) {
      set((state) => ({ isThinking: false, agents: state.agents.map(a => ({ ...a, status: 'error' })) }));
    }
  },
  applyAction: (action) => {
    const state = get();
    switch (action.type) {
      case 'create_file':
        state.addFile(action.name, 'file', action.parentId);
        break;
      case 'update_file':
        state.updateFileContent(action.fileId, action.content);
        break;
      case 'add_todo':
        state.addTodo(action.text);
        break;
      case 'terminal_log':
        state.appendTerminalOutput(action.terminalId || 'default', action.text);
        break;
      case 'set_active_tab':
        state.setActiveTab(action.tab);
        break;
    }
  },
}));

// --- Components ---

const Sidebar = () => {
  const { activeSidebarTab, setSidebarTab, files, setActiveFile, editor, addFile, settings } = useAppStore();
  const [isCreating, setIsCreating] = useState<'file' | 'directory' | null>(null);
  const [newName, setNewName] = useState('');

  const activityItems = [
    { id: 'explorer', icon: Folder, label: 'Explorer' },
    { id: 'search', icon: Search, label: 'Search' },
    { id: 'git', icon: GitBranch, label: 'Source Control' },
    { id: 'writing', icon: PenTool, label: 'Writing' },
    { id: 'extensions', icon: Zap, label: 'Extensions' },
  ] as const;

  const renderTree = (parentId: string | null = 'root', depth = 0) => {
    const children = Object.values(files).filter(f => f.parentId === parentId);
    return children.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
      return a.name.localeCompare(b.name);
    }).map(file => (
      <div key={file.id}>
        <div
          className={cn(
            "flex items-center py-1.5 px-3 cursor-pointer hover:bg-white/5 group text-[13px] transition-colors",
            editor.activeFileId === file.id && "bg-accent/10 text-accent border-l-2 border-accent"
          )}
          style={{ paddingLeft: `${depth * 12 + 12}px` }}
          onClick={() => file.type === 'file' && setActiveFile(file.id)}
        >
          {file.type === 'directory' ? <ChevronDown size={16} className="mr-1.5 text-text-secondary" /> : <div className="w-4 mr-1.5" />}
          {file.type === 'directory' ? <Folder size={16} className="mr-2 text-accent/70" /> : <FileCode size={16} className="mr-2 text-text-secondary" />}
          <span className={cn("truncate", editor.activeFileId === file.id ? "text-accent font-medium" : "text-text-primary")}>{file.name}</span>
        </div>
        {file.type === 'directory' && renderTree(file.id, depth + 1)}
      </div>
    ));
  };

  const renderPanelContent = () => {
    switch (activeSidebarTab) {
      case 'explorer':
        return (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="h-10 px-4 flex items-center justify-between text-[11px] uppercase tracking-wider text-text-secondary font-bold border-b border-white/5">
              <span>Explorer</span>
              <div className="flex gap-1">
                <button onClick={() => setIsCreating('file')} className="p-1 hover:bg-white/10 rounded"><Plus size={14} /></button>
                <button onClick={() => setIsCreating('directory')} className="p-1 hover:bg-white/10 rounded"><FolderPlus size={14} /></button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar py-2">
              {isCreating && (
                <div className="px-4 py-1 flex items-center gap-2">
                  {isCreating === 'file' ? <FileCode size={14} className="text-accent" /> : <Folder size={14} className="text-accent" />}
                  <input autoFocus value={newName} onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { addFile(newName, isCreating, 'root'); setNewName(''); setIsCreating(null); } if (e.key === 'Escape') setIsCreating(null); }} className="bg-bg-tertiary border border-accent/50 text-text-primary text-xs px-1 py-0.5 outline-none w-full rounded" />
                </div>
              )}
              {renderTree('root')}
            </div>
          </div>
        );
      case 'search':
        return <div className="p-4"><h2 className="text-[11px] uppercase font-bold text-text-secondary tracking-widest mb-4">Search</h2><input placeholder="Search" className="w-full bg-bg-tertiary border border-white/10 rounded px-3 py-2 text-sm outline-none focus:border-accent/50" /></div>;
      case 'writing':
        return <div className="p-4"><h2 className="text-[11px] uppercase font-bold text-text-secondary tracking-widest mb-4">Writing Tools</h2><div className="space-y-2">{['README.md', 'Feature Spec', 'Release Notes'].map(t => <button key={t} className="w-full text-left px-3 py-2 text-xs bg-white/5 hover:bg-white/10 rounded border border-white/5">{t}</button>)}</div></div>;
      case 'git':
        return <div className="p-4"><h2 className="text-[11px] uppercase font-bold text-text-secondary tracking-widest mb-4">Source Control</h2><div className="text-xs text-text-secondary italic">No changes detected</div></div>;
      case 'extensions':
        return <div className="p-4"><h2 className="text-[11px] uppercase font-bold text-text-secondary tracking-widest mb-4">Extensions</h2><div className="space-y-2">{['Prettier', 'ESLint', 'Tailwind CSS'].map(ext => <div key={ext} className="p-2 bg-white/5 rounded border border-white/5 text-xs font-bold">{ext}</div>)}</div></div>;
      case 'settings':
        return <div className="p-4"><h2 className="text-[11px] uppercase font-bold text-text-secondary tracking-widest mb-4">Settings</h2><div className="space-y-4"><div className="flex items-center justify-between"><span className="text-xs">Font Size</span><input type="number" value={settings.fontSize} className="w-12 bg-bg-tertiary border border-white/10 rounded px-1 text-xs" /></div></div></div>;
      default:
        return <div className="p-4 text-xs text-text-secondary">Coming soon...</div>;
    }
  };

  return (
    <div className="flex h-full bg-bg-secondary/80 backdrop-blur-xl border-r border-white/5">
      <div className="w-12 flex flex-col items-center py-4 bg-black/20 border-r border-white/5">
        <div className="flex-1 flex flex-col gap-4">
          {activityItems.map(item => (
            <button key={item.id} onClick={() => setSidebarTab(item.id)} className={cn("p-2 transition-all relative group", activeSidebarTab === item.id ? "text-accent" : "text-text-secondary hover:text-text-primary")} title={item.label}>
              <item.icon size={24} strokeWidth={1.5} />
              {activeSidebarTab === item.id && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-accent" />}
            </button>
          ))}
        </div>
        <button onClick={() => setSidebarTab('settings')} className={cn("p-2 transition-all relative group", activeSidebarTab === 'settings' ? "text-accent" : "text-text-secondary hover:text-text-primary")} title="Settings">
          <Settings size={24} strokeWidth={1.5} />
          {activeSidebarTab === 'settings' && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-accent" />}
        </button>
      </div>
      <div className="w-64 flex flex-col bg-black/10">{renderPanelContent()}</div>
    </div>
  );
};

const TopBar = () => {
  const { editor, files, toggleTheme, toggleCommandPalette, showNotification } = useAppStore();
  const activeFile = editor.activeFileId ? files[editor.activeFileId] : null;

  const handleGovernedSave = () => {
    void guardedAction({
      context: CODE_STUDIO_GOVERNANCE_CONTEXT,
      action: 'Save Studio Buffer',
      policy: 'studio.file.save',
      allowedRoles: ['operator', 'admin'],
      execute: async () => activeFile?.name ?? 'No active file',
    }).then((outcome) => {
      showNotification(
        getGovernanceToast('Save Studio Buffer', outcome.receipt, outcome.ok),
        outcome.ok ? 'success' : 'error'
      );
    });
  };

  const handleGovernedRun = () => {
    void guardedAction({
      context: CODE_STUDIO_GOVERNANCE_CONTEXT,
      action: 'Open Governed Studio Dispatch',
      policy: 'studio.ai.execute',
      allowedRoles: ['operator', 'admin'],
      dangerous: true,
      confirmationMessage: 'Open the governed Agent Lee dispatch surface for this studio session?',
      execute: async () => {
        toggleCommandPalette(true);
      },
    }).then((outcome) => {
      showNotification(
        getGovernanceToast('Open Governed Studio Dispatch', outcome.receipt, outcome.ok),
        outcome.ok ? 'success' : 'error'
      );
    });
  };

  return (
    <div className="h-14 bg-bg-secondary/80 backdrop-blur-xl border-b border-white/10 flex items-center justify-between px-4 shrink-0 z-50">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1 text-[10px] font-bold text-text-secondary uppercase tracking-widest overflow-hidden">
          <span className="truncate max-w-[80px]">Code Studio</span>
          <ChevronRight size={12} className="opacity-30 shrink-0" />
          <span className={cn("truncate max-w-[120px] transition-colors", activeFile ? "text-text-primary" : "text-text-secondary italic")}>{activeFile ? activeFile.name : 'No file open'}</span>
        </div>
      </div>
      <div className="flex items-center gap-1">
        <button onClick={() => toggleCommandPalette()} className="p-2 hover:bg-white/5 rounded-xl text-text-secondary hover:text-text-primary transition-all active:scale-90"><span className="text-[10px] font-black border border-white/20 px-1.5 py-0.5 rounded-md bg-white/5">P</span></button>
        <button onClick={handleGovernedSave} className="p-2 hover:bg-white/5 rounded-xl text-text-secondary hover:text-text-primary transition-all active:scale-90"><Save size={18} /></button>
        <button onClick={handleGovernedRun} className="p-2 bg-accent/10 hover:bg-accent/20 rounded-xl text-accent transition-all active:scale-90 shadow-lg shadow-accent/5"><Play size={18} fill="currentColor" /></button>
        <button onClick={() => toggleTheme()} className="p-2 hover:bg-white/5 rounded-xl text-text-secondary hover:text-text-primary transition-all active:scale-90"><MoreVertical size={18} /></button>
      </div>
    </div>
  );
};

const CommandPalette = () => {
  const { commandPaletteVisible, toggleCommandPalette, setActivePanel, showNotification, sendMessage } = useAppStore();
  const [query, setQuery] = useState('');
  const [isDispatching, setIsDispatching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { if (commandPaletteVisible) inputRef.current?.focus(); }, [commandPaletteVisible]);
  const commands = [
    { id: 'new-file', label: 'File: New File', icon: FileCode, action: () => showNotification('New File created', 'success') },
    { id: 'open-explorer', label: 'View: Explorer', icon: Search, action: () => setActivePanel('explorer') },
    { id: 'open-terminal', label: 'View: Terminal', icon: TerminalIcon, action: () => setActivePanel('terminal') },
    { id: 'open-preview', label: 'View: Preview', icon: Globe, action: () => setActivePanel('preview') },
    { id: 'open-writer', label: 'View: Writer Panel', icon: PenTool, action: () => setActivePanel('writer') },
  ];
  const filteredCommands = commands.filter(cmd => cmd.label.toLowerCase().includes(query.toLowerCase()));
  const handleAction = (action: () => void) => { action(); toggleCommandPalette(false); setQuery(''); };

  const handleGovernedDispatch = async () => {
    const intent = query.trim();
    if (!intent || isDispatching) {
      return;
    }

    setIsDispatching(true);
    const outcome = await guardedAction({
      context: CODE_STUDIO_GOVERNANCE_CONTEXT,
      action: 'Dispatch Studio Agent Task',
      policy: 'studio.ai.execute',
      allowedRoles: ['operator', 'admin'],
      dangerous: true,
      confirmationMessage: 'Dispatch this studio task through Agent Lee and connected model routes?',
      execute: async () => {
        await sendMessage(intent);
        return intent;
      },
    });

    showNotification(
      getGovernanceToast('Dispatch Studio Agent Task', outcome.receipt, outcome.ok),
      outcome.ok ? 'success' : 'error'
    );

    if (outcome.ok) {
      toggleCommandPalette(false);
      setQuery('');
    }

    setIsDispatching(false);
  };

  return (
    <AnimatePresence>
      {commandPaletteVisible && (
        <div className="fixed inset-0 z-[200] flex items-start justify-center pt-20 px-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => toggleCommandPalette(false)} />
          <motion.div initial={{ scale: 0.95, opacity: 0, y: -20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: -20 }} className="w-full max-w-lg bg-bg-secondary/90 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-10">
            <div className="p-4 border-b border-white/10 flex items-center gap-3">
              <Search size={18} className="text-text-secondary" />
              <input ref={inputRef} type="text" value={query} disabled={isDispatching} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { if (filteredCommands.length > 0) handleAction(filteredCommands[0].action); else { void handleGovernedDispatch(); } } }} placeholder={isDispatching ? "Dispatching through governance..." : "Type a command or dispatch a task..."} className="flex-1 bg-transparent border-none outline-none text-sm text-text-primary placeholder-text-secondary disabled:opacity-60" />
            </div>
            <div className="max-h-[300px] overflow-y-auto p-2 custom-scrollbar">
              {filteredCommands.map((cmd) => (
                <button key={cmd.id} onClick={() => handleAction(cmd.action)} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-all group text-left">
                  <div className="p-2 bg-white/5 rounded-lg text-text-secondary group-hover:text-accent group-hover:bg-accent/10 transition-colors"><cmd.icon size={16} /></div>
                  <span className="text-sm font-medium text-text-primary flex-1">{cmd.label}</span>
                  <ChevronRight size={14} className="text-text-secondary opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              ))}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

const EditorStage = () => {
  const { editor, files, setActiveFile, closeFile, updateFileContent, settings, updateEditorState } = useAppStore();
  const activeFile = editor.activeFileId ? files[editor.activeFileId] : null;
  useEffect(() => {
    if (activeFile?.content) {
      const words = activeFile.content.split(/\s+/).filter(Boolean).length;
      updateEditorState({ wordCount: words, readingTime: Math.ceil(words / 200) });
    }
  }, [activeFile?.content, updateEditorState]);
  if (!activeFile) return <div className="flex-1 bg-bg-primary flex items-center justify-center text-text-secondary flex-col gap-4"><div className="text-4xl opacity-20 font-bold tracking-tighter text-text-primary">CODE STUDIO</div><div className="text-sm opacity-50">Select a file from the explorer to start editing</div></div>;
  const isMarkdown = activeFile.name.endsWith('.md') || activeFile.name.endsWith('.txt');
  return (
    <div className="flex-1 flex flex-col bg-bg-primary overflow-hidden">
      <div className="flex h-9 bg-bg-secondary overflow-x-auto no-scrollbar items-center justify-between border-b border-bg-primary">
        <div className="flex h-full">
          {editor.openFileIds.map(id => (
            <div key={id} className={cn("flex items-center px-3 min-w-[120px] max-w-[200px] border-r border-bg-primary cursor-pointer group h-full transition-colors", editor.activeFileId === id ? "bg-bg-primary text-text-primary" : "bg-bg-tertiary text-text-secondary hover:bg-bg-secondary")} onClick={() => setActiveFile(id)}>
              <span className="text-xs truncate flex-1">{files[id]?.name}</span>
              <button className={cn("ml-2 p-0.5 rounded hover:bg-bg-tertiary transition-opacity", editor.activeFileId === id ? "opacity-100" : "opacity-0 group-hover:opacity-100")} onClick={(e) => { e.stopPropagation(); closeFile(id); }}><X size={14} /></button>
            </div>
          ))}
        </div>
      </div>
      <div className="h-10 px-4 flex items-center justify-between bg-bg-secondary border-b border-white/5 select-none">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-text-secondary"><FileText size={14} /><span className="text-[11px] font-bold uppercase tracking-widest truncate max-w-[120px]">{activeFile.name}</span></div>
          {isMarkdown && (
            <div className="flex items-center gap-1 border-l border-white/10 pl-4">
              <button onClick={() => updateEditorState({ isMarkdownPreview: !editor.isMarkdownPreview })} className={cn("p-1.5 rounded hover:bg-white/5 transition-all flex items-center gap-2", editor.isMarkdownPreview ? "text-accent bg-accent/10" : "text-text-secondary")}>{editor.isMarkdownPreview ? <EyeOff size={14} /> : <Eye size={14} />}<span className="text-[10px] font-bold uppercase tracking-tighter">Preview</span></button>
            </div>
          )}
        </div>
        <div className="flex items-center gap-4">
          {isMarkdown && <div className="flex items-center gap-3 text-text-secondary border-r border-white/10 pr-4"><div className="flex items-center gap-1"><Type size={12} /> <span className="text-[10px] font-bold">{editor.wordCount}</span></div><div className="flex items-center gap-1"><Clock size={12} /> <span className="text-[10px] font-bold">{editor.readingTime}m</span></div></div>}
          <div className="flex items-center gap-2">{settings.autoSave !== 'off' && <div className="flex items-center gap-1 text-[10px] text-green-500/70 font-bold uppercase tracking-tighter"><CheckCircle2 size={10} /><span>Auto-saved</span></div>}<button className="p-1.5 hover:bg-white/5 text-text-secondary rounded"><MoreHorizontal size={16} /></button></div>
        </div>
      </div>
      <div className="flex-1 flex overflow-hidden relative">
        <div className={cn("flex-1 transition-all duration-300", editor.isMarkdownPreview && isMarkdown ? "w-1/2" : "w-full")}>
          <Editor height="100%" theme={settings.theme === 'dark' ? 'vs-dark' : 'light'} path={activeFile.path} defaultLanguage={activeFile.name.endsWith('.tsx') ? 'typescript' : activeFile.name.endsWith('.md') ? 'markdown' : 'css'} value={activeFile.content} onChange={(value) => updateFileContent(activeFile.id, value || '')} options={{ minimap: { enabled: false }, fontSize: settings.fontSize, fontFamily: "'JetBrains Mono', monospace", automaticLayout: true, padding: { top: 10 }, scrollBeyondLastLine: false, lineNumbers: 'on', wordWrap: settings.wordWrap ? 'on' : 'off' }} />
        </div>
        {editor.isMarkdownPreview && isMarkdown && <div className="w-1/2 bg-white text-black overflow-y-auto p-8 prose prose-sm max-w-none border-l border-border"><ReactMarkdown>{activeFile.content || ''}</ReactMarkdown></div>}
      </div>
    </div>
  );
};

const Panel = () => {
  const { terminals, activeTerminalId, setActiveTerminal, addTerminal, files, togglePanel, settings, showNotification } = useAppStore();
  const [activeTab, setActiveTab] = useState<'terminal' | 'output' | 'debug' | 'problems'>('terminal');
  const [isProvisioningTerminal, setIsProvisioningTerminal] = useState(false);
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const currentLine = useRef('');
  const activeTerminal = terminals.find(t => t.id === activeTerminalId) || terminals[0];

  const handleGovernedTerminalSpawn = async () => {
    if (isProvisioningTerminal) {
      return;
    }

    setIsProvisioningTerminal(true);
    const outcome = await guardedAction({
      context: CODE_STUDIO_GOVERNANCE_CONTEXT,
      action: 'Provision Studio Terminal',
      policy: 'studio.terminal.manage',
      allowedRoles: ['operator', 'admin'],
      execute: async () => {
        addTerminal();
      },
    });

    showNotification(
      getGovernanceToast('Provision Studio Terminal', outcome.receipt, outcome.ok),
      outcome.ok ? 'success' : 'error'
    );
    setIsProvisioningTerminal(false);
  };

  useEffect(() => {
    if (!terminalRef.current || activeTab !== 'terminal') return;
    const term = new XTerm({ theme: { background: settings.theme === 'dark' ? '#1e1e1e' : '#ffffff', foreground: settings.theme === 'dark' ? '#cccccc' : '#333333' }, fontSize: 12, fontFamily: "'JetBrains Mono', monospace", cursorBlink: true, convertEol: true });
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
    if (activeTerminal?.output) activeTerminal.output.forEach(line => term.writeln(line));
    term.writeln(`\x1b[1;32mWelcome to Code Studio ${activeTerminal?.title || 'Terminal'}\x1b[0m`);
    term.write('\r\n$ ');
    term.onData(data => {
      if (data === '\r') { term.write('\r\n'); term.write('$ '); currentLine.current = ''; }
      else if (data === '\x7f') { if (currentLine.current.length > 0) { currentLine.current = currentLine.current.slice(0, -1); term.write('\b \b'); } }
      else { currentLine.current += data; term.write(data); }
    });
    xtermRef.current = term;
    const handleResize = () => {
      try {
        if (terminalRef.current) fitAddon.fit();
      } catch (e) {
        console.warn('Resize fit failed', e);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => { window.removeEventListener('resize', handleResize); term.dispose(); };
  }, [activeTab, settings.theme, activeTerminalId]);

  return (
    <div className="h-64 bg-bg-primary/80 backdrop-blur-xl border-t border-white/10 flex flex-col">
      <div className="h-9 flex items-center px-4 justify-between border-b border-white/10">
        <div className="flex gap-4 h-full overflow-x-auto no-scrollbar">
          <button onClick={() => setActiveTab('terminal')} className={cn("text-[10px] uppercase font-bold h-full px-1 whitespace-nowrap transition-colors", activeTab === 'terminal' ? "text-text-primary border-b border-accent" : "text-text-secondary hover:text-text-primary")}>Terminal</button>
          {terminals.map(t => (
            <button key={t.id} onClick={() => { setActiveTab('terminal'); setActiveTerminal(t.id); }} className={cn("text-[9px] font-mono h-full px-2 flex items-center gap-1 transition-colors", activeTerminalId === t.id && activeTab === 'terminal' ? "text-accent bg-bg-secondary" : "text-text-secondary hover:text-text-primary")}>{t.title}</button>
          ))}
        </div>
        <div className="flex items-center gap-2 text-text-secondary shrink-0">
          <button className="p-1 hover:bg-bg-tertiary rounded disabled:opacity-50" disabled={isProvisioningTerminal} onClick={() => void handleGovernedTerminalSpawn()}><Plus size={14} /></button>
          <button className="p-1 hover:bg-bg-tertiary rounded" onClick={() => togglePanel(false)}><X size={14} /></button>
        </div>
      </div>
      <div className="flex-1 overflow-hidden relative">{activeTab === 'terminal' && <div className="absolute inset-0 p-2" ref={terminalRef} />}</div>
    </div>
  );
};

const NavigationPanel = () => {
  const { toggleNavPanel, setActiveTab, setActivePanel, showNotification, activePanel, activeTab } = useAppStore();
  const navItems = [
    { id: 'home', label: 'Home', icon: Home, action: () => { setActiveTab('Files'); setActivePanel(null); } },
    { id: 'writer', label: 'Writer', icon: PenTool, action: () => setActivePanel('writer') },
    { id: 'terminal', label: 'Terminal', icon: Zap, action: () => setActivePanel('terminal') },
    { id: 'deploy', label: 'Deploy', icon: Rocket, action: () => showNotification('Deploying...', 'info') },
    { id: 'preview', label: 'Web', icon: Globe, action: () => setActivePanel('preview') },
    { id: 'explorer', label: 'Files', icon: Folder, action: () => setActivePanel('explorer') },
    { id: 'settings', label: 'Settings', icon: Settings, action: () => showNotification('Settings...', 'info') },
  ];
  return (
    <div className="h-full flex flex-col bg-bg-secondary/90 backdrop-blur-2xl border-l border-white/10 w-full overflow-hidden">
      <div className="p-4 border-b border-white/10 flex items-center justify-between"><div className="flex items-center gap-2"><Bot size={18} className="text-accent" /><span className="text-xs font-bold uppercase tracking-wider">Navigation</span></div><button onClick={() => toggleNavPanel(false)} className="p-1 hover:bg-white/5 rounded-md text-text-secondary md:hidden"><X size={18} /></button></div>
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-6 custom-scrollbar">
        <div className="flex flex-col gap-2">
          {navItems.map((item) => (
            <button key={item.id} onClick={item.action} className={cn("flex items-center gap-3 p-3 rounded-xl transition-all group", (activePanel === item.id || (activeTab.toLowerCase() === item.id && !activePanel)) ? "bg-accent text-white shadow-lg shadow-accent/20" : "text-text-secondary hover:bg-white/5 hover:text-text-primary")}>
              <item.icon size={18} className={cn("transition-transform group-hover:scale-110", (activePanel === item.id || (activeTab.toLowerCase() === item.id && !activePanel)) ? "text-white" : "text-text-secondary group-hover:text-accent")} /><span className="text-sm font-medium">{item.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

const WriterPanel = () => {
  const { editor, settings } = useAppStore();
  const [activeTab, setActiveTab] = useState<'outline' | 'rewrite' | 'summary' | 'style'>('outline');
  const tabs = [{ id: 'outline', icon: List, label: 'Outline' }, { id: 'rewrite', icon: Sparkles, label: 'Rewrite' }, { id: 'summary', icon: FileText, label: 'Summary' }, { id: 'style', icon: CheckCircle2, label: 'Style' }] as const;
  return (
    <div className="flex flex-col h-full bg-bg-secondary/95 backdrop-blur-2xl border-l border-white/5 w-80">
      <div className="h-12 px-4 flex items-center justify-between border-b border-white/5"><div className="flex items-center gap-2"><PenTool size={16} className="text-accent" /><span className="text-xs font-black uppercase tracking-widest text-text-primary">Writer Panel</span></div><div className="flex items-center gap-3 text-text-secondary"><div className="flex items-center gap-1"><Type size={12} /><span className="text-[10px] font-bold">{editor.wordCount}</span></div><div className="flex items-center gap-1"><Clock size={12} /><span className="text-[10px] font-bold">{editor.readingTime}m</span></div></div></div>
      <div className="flex border-b border-white/5">{tabs.map(tab => (
        <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={cn("flex-1 py-3 flex flex-col items-center gap-1 transition-all relative", activeTab === tab.id ? "text-accent" : "text-text-secondary hover:text-text-primary")}><tab.icon size={16} /><span className="text-[9px] font-bold uppercase tracking-tighter">{tab.label}</span>{activeTab === tab.id && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent" />}</button>
      ))}</div>
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4">{activeTab === 'outline' ? <div className="space-y-2"><div className="flex items-center gap-2 text-xs text-text-primary hover:text-accent cursor-pointer"><Hash size={12} className="text-text-secondary" /><span>Introduction</span></div></div> : <div className="text-xs text-text-secondary italic">Coming soon...</div>}</div>
      <div className="p-4 border-t border-white/5 bg-black/10"><div className="flex items-center justify-between mb-2"><span className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Brand Voice</span><Sparkles size={12} className="text-accent animate-pulse" /></div><p className="text-[11px] text-text-primary leading-relaxed">{settings.brandVoice}</p></div>
    </div>
  );
};

const LivePreview = () => {
  return <div className="w-full h-full bg-white flex flex-col"><div className="h-10 bg-gray-100 border-b flex items-center px-4 gap-2"><div className="flex gap-1.5"><div className="w-3 h-3 rounded-full bg-red-400" /><div className="w-3 h-3 rounded-full bg-yellow-400" /><div className="w-3 h-3 rounded-full bg-green-400" /></div><div className="flex-1 bg-white rounded border px-3 py-1 text-[10px] text-gray-500 truncate">http://localhost:3000</div></div><div className="flex-1 flex items-center justify-center text-gray-400 italic text-sm">Previewing application...</div></div>;
};

const TodoManager = () => {
  const { todos, addTodo, toggleTodo, deleteTodo } = useAppStore();
  const [newTodo, setNewTodo] = useState('');
  return (
    <div className="flex-1 flex flex-col bg-bg-primary p-6 overflow-y-auto">
      <h2 className="text-xl font-bold mb-6 flex items-center gap-2"><CheckCircle2 className="text-accent" /> Development Plan</h2>
      <div className="flex gap-2 mb-6"><input value={newTodo} onChange={(e) => setNewTodo(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && newTodo.trim()) { addTodo(newTodo); setNewTodo(''); } }} placeholder="Add a new task..." className="flex-1 bg-bg-secondary border border-white/10 rounded-xl px-4 py-2 outline-none focus:border-accent" /><button onClick={() => { if (newTodo.trim()) { addTodo(newTodo); setNewTodo(''); } }} className="p-2 bg-accent text-white rounded-xl"><Plus /></button></div>
      <div className="space-y-2">{todos.map(todo => (
        <div key={todo.id} className="flex items-center gap-3 p-4 bg-bg-secondary rounded-xl border border-white/5 group transition-all hover:border-accent/30">
          <button onClick={() => toggleTodo(todo.id)} className={cn("w-5 h-5 rounded-md border flex items-center justify-center transition-colors", todo.completed ? "bg-accent border-accent text-white" : "border-white/20 hover:border-accent")}>{todo.completed && <Check size={14} />}</button>
          <span className={cn("flex-1 text-sm", todo.completed ? "text-text-secondary line-through" : "text-text-primary")}>{todo.text}</span>
          <button onClick={() => deleteTodo(todo.id)} className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/10 text-red-500 rounded transition-all"><X size={16} /></button>
        </div>
      ))}</div>
    </div>
  );
};

// --- Main Component ---

export const AgentLeeCodeStudio = () => {
  const { sidebarVisible, panelVisible, navPanelVisible, writerPanelVisible, activePanel, toggleSidebar, togglePanel, toggleNavPanel, toggleWriterPanel, activeTab, setActiveTab, editor, setPreview, settings, notification } = useAppStore();

  useEffect(() => {
    if (activePanel === 'terminal') togglePanel(true);
    else if (activePanel && ['explorer', 'search', 'scm', 'writing', 'extensions'].includes(activePanel)) toggleSidebar(true);
  }, [activePanel, togglePanel, toggleSidebar]);

  useEffect(() => {
    if (settings.theme === 'light') document.documentElement.classList.add('light');
    else document.documentElement.classList.remove('light');
  }, [settings.theme]);

  const handleSwipe = (event: any, info: any) => {
    const threshold = 60;
    if (info.offset.x > threshold) { if (navPanelVisible) toggleNavPanel(false); else if (writerPanelVisible) toggleWriterPanel(false); else toggleSidebar(true); }
    else if (info.offset.x < -threshold) { if (sidebarVisible) toggleSidebar(false); else toggleNavPanel(true); }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'Files':
        return (
          <div className="flex-1 flex overflow-hidden relative min-h-0 w-full">
            <AnimatePresence mode="wait">{sidebarVisible && <motion.div initial={{ x: -312 }} animate={{ x: 0 }} exit={{ x: -312 }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} className="absolute left-0 top-0 bottom-0 z-40 w-[312px] shadow-2xl bg-bg-secondary border-r border-border"><Sidebar /></motion.div>}</AnimatePresence>
            <div className="flex-1 flex flex-col overflow-hidden relative min-h-0">
              <div className="flex-1 flex overflow-hidden min-h-0">
                <div className="flex-1 flex flex-col overflow-hidden min-h-0"><EditorStage /></div>
                <AnimatePresence>{editor.showPreview && <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 30, stiffness: 300 }} className="absolute inset-y-0 right-0 z-30 w-full md:relative md:w-1/2 lg:w-1/3 border-l border-border bg-white overflow-hidden shadow-2xl md:shadow-none"><div className="absolute top-2 left-2 z-50 md:hidden"><button onClick={() => setPreview(false)} className="p-2 bg-black/20 hover:bg-black/30 rounded-full text-white shadow-lg backdrop-blur-sm"><X size={20} /></button></div><LivePreview /></motion.div>}</AnimatePresence>
                <AnimatePresence>{writerPanelVisible && <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} className="absolute right-0 top-0 bottom-0 z-40 shadow-2xl"><WriterPanel /></motion.div>}</AnimatePresence>
              </div>
              <AnimatePresence>{panelVisible && <motion.div initial={{ y: 300 }} animate={{ y: 0 }} exit={{ y: 300 }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} className="absolute bottom-0 left-0 right-0 z-30 h-64 shadow-2xl bg-bg-primary border-t border-border"><Panel /></motion.div>}</AnimatePresence>
            </div>
          </div>
        );
      case 'To-Do': return <TodoManager />;
      case 'Preview': return <LivePreview />;
      default: return <EditorStage />;
    }
  };

  return (
    <div className="h-[100dvh] w-screen flex flex-col bg-bg-primary text-text-primary font-sans overflow-hidden select-none">
      <TopBar />
      <CommandPalette />
      {!sidebarVisible && <motion.button initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} onClick={() => toggleSidebar(true)} className="absolute left-0 top-1/2 -translate-y-1/2 z-50 w-6 h-24 bg-accent/20 hover:bg-accent/40 backdrop-blur-md border-r border-y border-accent/30 rounded-r-2xl flex items-center justify-center text-accent transition-all group"><ChevronRight size={18} className="group-hover:translate-x-0.5 transition-transform" /></motion.button>}
      {!navPanelVisible && !writerPanelVisible && <motion.button initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} onClick={() => toggleNavPanel(true)} className="absolute right-0 top-1/2 -translate-y-1/2 z-50 w-6 h-24 bg-accent/20 hover:bg-accent/40 backdrop-blur-md border-l border-y border-accent/30 rounded-l-2xl flex items-center justify-center text-accent transition-all group"><ChevronLeft size={18} className="group-hover:-translate-x-0.5 transition-transform" /></motion.button>}
      <motion.div onPanEnd={handleSwipe} className="flex-1 flex flex-row overflow-hidden relative min-h-0">
        <AnimatePresence mode="wait"><motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.15 }} className="flex-1 flex flex-col overflow-hidden min-h-0">{renderTabContent()}</motion.div></AnimatePresence>
        <AnimatePresence>{navPanelVisible && <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} className="absolute right-0 top-0 bottom-0 z-40 w-[280px] shadow-2xl"><NavigationPanel /></motion.div>}</AnimatePresence>
        {(sidebarVisible || navPanelVisible || writerPanelVisible) && <div className="absolute inset-0 bg-black/50 z-30 backdrop-blur-sm transition-all" onClick={() => { toggleSidebar(false); toggleNavPanel(false); toggleWriterPanel(false); }} />}
        <AnimatePresence>{notification && <motion.div initial={{ opacity: 0, y: 50, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 50, scale: 0.9 }} className={cn("absolute bottom-8 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 rounded-2xl shadow-2xl border flex items-center gap-3 backdrop-blur-md min-w-[280px]", notification.type === 'success' ? "bg-green-500/90 border-green-400 text-white" : notification.type === 'error' ? "bg-red-500/90 border-red-400 text-white" : "bg-accent/90 border-accent/50 text-white")}><div className="w-2 h-2 rounded-full bg-white animate-pulse" /><span className="text-sm font-bold tracking-wide">{notification.message}</span></motion.div>}</AnimatePresence>
      </motion.div>
    </div>
  );
};

export default AgentLeeCodeStudio;

