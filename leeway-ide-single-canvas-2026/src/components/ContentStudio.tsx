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

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Content Studio - Neural Monolith Knowledge Base
 * Integrated with IndexedDB, OPFS, Drive/Slot/Cell architecture, and neural animations
 */

import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Database, Rocket, Search, Plus, Download, Trash2, Share2, Eye, Folder
} from "lucide-react";
import { neuralDB, DriveId, NeuralFile, FileCategory } from "../utils/neuralDB";
import { DRIVE_COLORS, DRIVE_METADATA, CATEGORY_ICONS, LayoutNode } from "../utils/neuralConstants";
import { NeuralConnectionLayer } from "./NeuralConnectionLayer";
import { NeuralFilePreview } from "./NeuralFilePreview";

interface ContentStudioProps {
  isOpen: boolean;
  onClose: () => void;
  onDragStart?: (item: any, e: React.DragEvent) => void;
  accentColor?: string;
}

export function ContentStudio({ isOpen, onClose, accentColor = "#22d3ee" }: ContentStudioProps) {
  const [activeDrive, setActiveDrive] = useState<DriveId>("LEE");
  const [activeSlot, setActiveSlot] = useState<number | null>(1);
  const [activeCell, setActiveCell] = useState<number | null>(1);
  const [files, setFiles] = useState<NeuralFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<NeuralFile | null>(null);
  const [loading, setLoading] = useState(false);
  const [dim, setDim] = useState({ w: 0, h: 0 });
  const [scrollHeight, setScrollHeight] = useState(2000);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [panelSize, setPanelSize] = useState({ width: 600, height: 800 });
  const [panelPosition, setPanelPosition] = useState({ x: 100, y: 100 });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const containerRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const nodeRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const driveColor = DRIVE_COLORS[activeDrive];

  // Resize observer
  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(e => {
      if (e[0]) setDim({ w: e[0].contentRect.width, h: e[0].contentRect.height });
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  // Update scroll height
  useEffect(() => {
    if (mainRef.current) {
      setScrollHeight(mainRef.current.scrollHeight);
    }
  }, [files, activeDrive, activeSlot, activeCell, dim]);

  // Load files from neural DB
  const loadFiles = async () => {
    if (!activeSlot || !activeCell) return;
    setLoading(true);
    try {
      const fs = await neuralDB.getFiles(activeDrive, activeSlot, activeCell);
      setFiles(fs);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) loadFiles();
  }, [activeDrive, activeSlot, activeCell, isOpen]);

  // Handle file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || !activeSlot || !activeCell) return;

    for (let i = 0; i < fileList.length; i++) {
      const f = fileList[i];
      const ext = f.name.split('.').pop() || '';
      let category: FileCategory = 'doc';
      if (ext.match(/(ts|js|tsx|jsx|html|css|json|py|go|rs)/i)) category = 'code';
      else if (ext.match(/(png|jpg|jpeg|gif|webp|mp4|mov)/i)) category = 'media';
      else if (ext.match(/(mp3|wav|ogg|m4a)/i)) category = 'audio';
      else if (ext.match(/(pdf)/i)) category = 'pdf';
      else if (ext.match(/(zip|rar|7z|tar)/i)) category = 'archive';

      let content: string | Blob;
      if (category === 'code' || category === 'doc' || f.type.startsWith('text/')) {
        content = await f.text();
      } else {
        content = f;
      }

      const neuralFile: NeuralFile = {
        id: `${activeDrive}-${activeSlot}-${activeCell}-${Date.now()}-${i}`,
        driveId: activeDrive,
        slotId: activeSlot,
        cellId: activeCell,
        name: f.name,
        path: "",
        extension: ext,
        sizeBytes: f.size,
        content: content,
        category: category,
        status: 'safe',
        lastModified: Date.now(),
        signature: `SIG_${Math.random().toString(36).substr(2, 9)}`,
        annotations: []
      };

      await neuralDB.addFile(neuralFile);
    }
    loadFiles();
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Layout nodes for neural connections
  const [layoutNodes, setLayoutNodes] = useState<LayoutNode[]>([]);

  const updateLayout = useCallback(() => {
    if (!containerRef.current || !mainRef.current) return;
    const nodes: LayoutNode[] = [];
    const mainRect = mainRef.current.getBoundingClientRect();
    const scrollY = mainRef.current.scrollTop;

    const add = (id: string, type: any, color: string) => {
      const el = nodeRefs.current.get(id);
      if (el) {
        const r = el.getBoundingClientRect();
        nodes.push({
          id,
          type,
          color,
          x: Math.round(r.left - mainRect.left),
          y: Math.round(r.top - mainRect.top + scrollY),
          w: Math.round(r.width),
          h: Math.round(r.height)
        });
      }
    };

    (Object.keys(DRIVE_COLORS) as DriveId[]).forEach(d => add(`drive_${d}`, 'drive', DRIVE_COLORS[d]));
    for (let i = 1; i <= 8; i++) add(`slot_${activeDrive}-${i}`, 'slot', driveColor);
    for (let i = 1; i <= 8; i++) add(`cell_${activeDrive}-${activeSlot}-${i}`, 'cell', driveColor);

    setLayoutNodes(nodes);
    setDim({ w: Math.round(mainRect.width), h: Math.round(mainRect.height) });
    setScrollHeight(mainRef.current.scrollHeight);
  }, [activeDrive, activeSlot, activeCell, driveColor]);

  useEffect(() => {
    if (!mainRef.current) return;
    const observer = new ResizeObserver(() => {
      updateLayout();
    });
    observer.observe(mainRef.current);
    return () => observer.disconnect();
  }, [updateLayout]);

  const layoutTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (layoutTimerRef.current) clearTimeout(layoutTimerRef.current);
    layoutTimerRef.current = setTimeout(updateLayout, 150);
    return () => {
      if (layoutTimerRef.current) clearTimeout(layoutTimerRef.current);
    };
  }, [activeDrive, activeSlot, activeCell, updateLayout]);

  const setRef = (id: string) => (el: HTMLElement | null) => {
    if (el) nodeRefs.current.set(id, el as HTMLDivElement);
    else nodeRefs.current.delete(id);
  };

  // Drag handlers for moving the panel
  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.drag-handle')) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - panelPosition.x, y: e.clientY - panelPosition.y });
    }
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging) {
      setPanelPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
    if (isResizing) {
      setPanelSize({
        width: Math.max(400, e.clientX - panelPosition.x),
        height: Math.max(300, e.clientY - panelPosition.y)
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setIsResizing(false);
  };

  useEffect(() => {
    if (isDragging || isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, isResizing, dragStart, panelPosition]);

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      style={{
        position: 'fixed',
        left: panelPosition.x,
        top: panelPosition.y,
        width: isCollapsed ? 300 : panelSize.width,
        height: isCollapsed ? 60 : panelSize.height,
        zIndex: 200
      }}
      className="bg-[#020408] text-slate-200 rounded-2xl shadow-2xl border border-white/10 overflow-hidden font-sans selection:bg-cyan-500/30 antialiased"
      onMouseDown={handleMouseDown}
    >
      <div ref={containerRef} className="flex flex-col h-full relative">
        {/* Atmospheric Background */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-cyan-900/20 blur-[120px] animate-pulse" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-900/20 blur-[150px] animate-pulse" style={{ animationDelay: '2s' }} />
          <div className="absolute top-[30%] right-[10%] w-[30%] h-[30%] rounded-full bg-purple-900/10 blur-[100px]" />
          <div
            className="absolute inset-0 opacity-[0.15]"
            style={{
              backgroundImage: `linear-gradient(to right, #ffffff10 1px, transparent 1px), linear-gradient(to bottom, #ffffff10 1px, transparent 1px)`,
              backgroundSize: '40px 40px'
            }}
          />
        </div>

        {/* Header */}
        <header className="drag-handle pt-4 pb-3 px-4 flex items-center justify-between z-30 bg-gradient-to-b from-black/95 via-black/60 to-transparent backdrop-blur-xl border-b border-white/5 cursor-move">
          <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="pointer-events-none">
            <h1 className="text-sm font-black tracking-tighter uppercase flex items-center gap-2 drop-shadow-[0_0_15px_rgba(34,211,238,0.4)]">
              <Database size={16} className="text-cyan-500" />
              Live Wallet
            </h1>
            <div className="text-[7px] font-mono text-cyan-500/60 tracking-[0.4em] uppercase mt-0.5">Neural Monolith V8.5</div>
          </motion.div>
          <div className="flex items-center gap-2 pointer-events-auto">
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="w-8 h-8 rounded-lg bg-slate-900 border border-white/10 flex items-center justify-center hover:bg-white/5 transition-all"
              title={isCollapsed ? "Expand" : "Collapse"}
            >
              <span className="text-slate-400 text-xs">{isCollapsed ? "+" : "−"}</span>
            </button>
            <button onClick={onClose} className="w-8 h-8 rounded-lg bg-slate-900 border border-white/10 flex items-center justify-center hover:bg-white/5 transition-all">
              <X size={16} className="text-slate-400" />
            </button>
          </div>
        </header>

        {/* Main Content */}
        <main
          ref={mainRef}
          className="flex-1 overflow-y-auto overflow-x-hidden no-scrollbar pb-12 z-20 px-4 sm:px-6 relative touch-pan-y overscroll-behavior-y-contain"
        >
          <NeuralConnectionLayer
            nodes={layoutNodes}
            w={dim.w}
            h={scrollHeight}
            activeDrive={activeDrive}
            activeSlot={activeSlot}
            activeCell={activeCell}
          />

          {/* Drive Info Card */}
          <motion.section
            key={activeDrive}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
            className="mt-6 p-5 sm:p-6 rounded-[24px] sm:rounded-[32px] bg-gradient-to-br from-white/5 to-transparent border border-white/10 relative overflow-hidden group will-change-transform"
          >
            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
              {React.createElement(DRIVE_METADATA[activeDrive].icon, { size: 80, style: { color: DRIVE_COLORS[activeDrive] } })}
            </div>
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-black/40 border border-white/10" style={{ color: DRIVE_COLORS[activeDrive] }}>
                  {React.createElement(DRIVE_METADATA[activeDrive].icon, { size: 20 })}
                </div>
                <div>
                  <h2 className="text-lg font-black tracking-tighter uppercase leading-none">{DRIVE_METADATA[activeDrive].type} DRIVE</h2>
                  <p className="text-[9px] font-mono text-slate-500 uppercase tracking-widest mt-1">Allocation: {activeDrive} // Status: Optimal</p>
                  <p className="text-[10px] text-slate-400 mt-3 max-w-[240px] leading-relaxed">{DRIVE_METADATA[activeDrive].description}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-3 rounded-2xl bg-black/20 border border-white/5">
                  <div className="text-[7px] font-mono text-slate-500 uppercase mb-1">Capacity</div>
                  <div className="text-xs font-bold">{DRIVE_METADATA[activeDrive].capacity}</div>
                </div>
                <div className="p-3 rounded-2xl bg-black/20 border border-white/5">
                  <div className="text-[7px] font-mono text-slate-500 uppercase mb-1">Usage</div>
                  <div className="text-xs font-bold">{(Math.random() * 40 + 10).toFixed(1)}%</div>
                </div>
                <div className="p-3 rounded-2xl bg-black/20 border border-white/5">
                  <div className="text-[7px] font-mono text-slate-500 uppercase mb-1">Temp</div>
                  <div className="text-xs font-bold text-orange-400">{(Math.random() * 10 + 32).toFixed(1)}°C</div>
                </div>
                <div className="p-3 rounded-2xl bg-black/20 border border-white/5">
                  <div className="text-[7px] font-mono text-slate-500 uppercase mb-1">Latency</div>
                  <div className="text-xs font-bold text-emerald-500">0.4ms</div>
                </div>
              </div>
              <div className="mt-6">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[7px] font-mono text-slate-500 uppercase tracking-widest">Neural Sync Status</span>
                  <span className="text-[7px] font-mono text-emerald-500 uppercase tracking-widest">Stable</span>
                </div>
                <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: '85%' }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 shadow-[0_0_10px_rgba(34,211,238,0.5)]"
                  />
                </div>
              </div>
            </div>
          </motion.section>

          {/* Drives */}
          <section className="mt-6 relative z-10">
            <div className="px-2 mb-3 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">Drives</span>
                <span className="text-[10px] font-mono text-cyan-500/40">•</span>
                <span className="text-[10px] font-bold text-cyan-500 uppercase tracking-[0.1em]">{DRIVE_METADATA[activeDrive].type}</span>
              </div>
              <div className="h-[1px] flex-1 mx-6 bg-white/5" />
            </div>
            <div className="flex gap-3 overflow-x-auto no-scrollbar py-3">
              {(Object.keys(DRIVE_COLORS) as DriveId[]).map(d => {
                const meta = DRIVE_METADATA[d];
                const Icon = meta.icon;
                return (
                  <button
                    key={d}
                    ref={setRef(`drive_${d}`)}
                    onClick={() => {
                      setActiveDrive(d);
                      setActiveSlot(1);
                      setActiveCell(1);
                    }}
                    className={`min-w-[80px] h-20 rounded-2xl border transition-all relative flex flex-col items-center justify-center gap-2 group ${activeDrive === d ? 'bg-white/5 border-white/20 shadow-2xl' : 'bg-black/40 border-white/5 opacity-40 hover:opacity-100'
                      }`}
                    style={{ color: DRIVE_COLORS[d], borderColor: activeDrive === d ? DRIVE_COLORS[d] : undefined }}
                  >
                    <Icon size={18} className={`${activeDrive === d ? 'animate-pulse' : ''}`} />
                    <div className="flex flex-col items-center">
                      <span className="text-[10px] font-black leading-none">{d}</span>
                      <span className="text-[7px] font-mono opacity-60 uppercase tracking-tighter mt-1">{meta.label}</span>
                      <span className="text-[6px] font-mono opacity-40 mt-0.5">{meta.capacity}</span>
                    </div>
                    <div
                      className={`absolute bottom-0 left-4 right-4 h-[2px] rounded-full transition-all ${activeDrive === d ? 'opacity-100' : 'opacity-0'
                        }`}
                      style={{ backgroundColor: DRIVE_COLORS[d], boxShadow: `0 0 15px ${DRIVE_COLORS[d]}` }}
                    />
                  </button>
                );
              })}
            </div>
          </section>

          <div className="grid grid-cols-1 gap-8 mt-8 relative z-10">
            {/* Slots */}
            <section>
              <div className="px-2 mb-3 flex justify-between items-center">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">Slots</span>
                <div className="h-[1px] flex-1 mx-6 bg-white/5" />
              </div>
              <div className="grid grid-cols-4 gap-3">
                {Array.from({ length: 8 }, (_, i) => i + 1).map(id => (
                  <button
                    key={id}
                    ref={setRef(`slot_${activeDrive}-${id}`)}
                    onClick={() => {
                      setActiveSlot(id);
                      setActiveCell(1);
                    }}
                    className={`h-16 rounded-2xl border flex flex-col items-center justify-center transition-all ${activeSlot === id ? 'bg-white/5 border-white/20' : 'bg-black/20 border-white/5 opacity-30'
                      }`}
                    style={{ borderColor: activeSlot === id ? driveColor : undefined }}
                  >
                    <span className="text-[9px] font-mono opacity-40">S0{id}</span>
                    <span className="text-sm font-black italic" style={{ color: activeSlot === id ? driveColor : undefined }}>
                      LINK
                    </span>
                  </button>
                ))}
              </div>
            </section>

            {/* Cells */}
            <section>
              <div className="px-2 mb-3 flex justify-between items-center">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">Cells</span>
                <div className="h-[1px] flex-1 mx-6 bg-white/5" />
              </div>
              <div className="grid grid-cols-4 gap-3">
                {Array.from({ length: 8 }, (_, i) => i + 1).map(id => (
                  <button
                    key={id}
                    ref={setRef(`cell_${activeDrive}-${activeSlot}-${id}`)}
                    onClick={() => setActiveCell(id)}
                    className={`h-16 rounded-2xl border flex flex-col items-center justify-center transition-all ${activeCell === id ? 'bg-white/5 border-white/20' : 'bg-black/20 border-white/5 opacity-30'
                      }`}
                    style={{ borderColor: activeCell === id ? driveColor : undefined }}
                  >
                    <span className="text-[9px] font-mono opacity-40">C0{id}</span>
                    <span className="text-sm font-black" style={{ color: activeCell === id ? driveColor : undefined }}>
                      CORE
                    </span>
                  </button>
                ))}
              </div>
            </section>
          </div>

          {/* File Grid */}
          <section className="mt-12 relative z-10">
            <div className="flex items-center justify-between mb-2 px-2">
              <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-[0.3em]">Neural Nodes</h3>
              <div className="flex gap-3">
                <button
                  onClick={async () => {
                    if (activeSlot && activeCell) {
                      setLoading(true);
                      await neuralDB.addExampleFiles(activeDrive, activeSlot, activeCell);
                      await loadFiles();
                      setLoading(false);
                    }
                  }}
                  className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-cyan-400 transition-all flex items-center justify-center"
                  title="Seed Examples"
                >
                  <Rocket size={16} />
                </button>
                <button className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white transition-all flex items-center justify-center">
                  <Search size={16} />
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-10 h-10 rounded-xl bg-cyan-500 text-black shadow-[0_0_15px_rgba(34,211,238,0.3)] hover:bg-cyan-400 transition-all flex items-center justify-center"
                >
                  <Plus size={18} />
                </button>
                <input type="file" ref={fileInputRef} onChange={handleFileUpload} multiple className="hidden" />
              </div>
            </div>

            <div className="flex items-center gap-2 text-[9px] font-mono text-cyan-500/40 uppercase mb-6 px-2">
              <Folder size={10} />
              <span className="text-cyan-500/80">{activeDrive}</span>
              <span className="opacity-20">/</span>
              <span className="text-cyan-500/80">{DRIVE_METADATA[activeDrive].type}</span>
              <span className="opacity-20">/</span>
              <span>SLOT 0{activeSlot}</span>
              <span className="opacity-20">/</span>
              <span>CELL 0{activeCell}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {loading ? (
                <div className="col-span-full py-24 flex flex-col items-center justify-center opacity-30">
                  <div className="w-12 h-12 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mb-6" />
                  <span className="text-[11px] font-mono tracking-[0.3em] uppercase">Syncing Neural Grid...</span>
                </div>
              ) : files.length > 0 ? (
                files.map(f => {
                  const Icon = CATEGORY_ICONS[f.category] || Database;
                  return (
                    <motion.div
                      key={f.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      draggable
                      onDragStart={(e: any) => {
                        if (e.dataTransfer) {
                          e.dataTransfer.setData('application/json', JSON.stringify({
                            type: 'content-file',
                            file: f,
                            driveId: activeDrive,
                            slot: activeSlot,
                            cell: activeCell
                          }));
                          e.dataTransfer.effectAllowed = 'copy';
                        }
                      }}
                      onClick={() => setSelectedFile(f)}
                      className={`flex items-center gap-5 p-4 sm:p-5 rounded-[24px] sm:rounded-[28px] bg-white/[0.03] border border-white/5 hover:bg-white/[0.06] hover:border-white/10 transition-all cursor-move group relative overflow-hidden shadow-xl will-change-transform ${f.status === 'corrupt' ? 'border-red-500/30 bg-red-950/10' : ''
                        }`}
                      title="Drag to canvas to create a node"
                    >
                      <div
                        className="w-14 h-14 rounded-2xl bg-black/50 flex items-center justify-center border border-white/5 group-hover:border-white/20 transition-all shadow-inner"
                        style={{ borderColor: f.status !== 'corrupt' ? `${driveColor}30` : undefined }}
                      >
                        <Icon size={24} style={{ color: driveColor }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className={`text-sm font-bold truncate ${f.status === 'corrupt' ? 'text-red-400' : 'text-slate-100'}`}>
                          {f.name}
                        </div>
                        <div className="flex items-center gap-2 mt-1.5">
                          <div className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">
                            {(f.sizeBytes / 1024).toFixed(1)} KB • {f.category}
                          </div>
                          {DRIVE_METADATA[activeDrive].type === 'Storage' && (
                            <div className="px-1.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-[7px] font-mono text-amber-500 uppercase tracking-tighter">
                              Large
                            </div>
                          )}
                          {DRIVE_METADATA[activeDrive].type === 'Media' && (
                            <div className="px-1.5 py-0.5 rounded-full bg-pink-500/10 border border-pink-500/20 text-[7px] font-mono text-pink-500 uppercase tracking-tighter">
                              Media
                            </div>
                          )}
                          {DRIVE_METADATA[activeDrive].type === 'System' && (
                            <div className="px-1.5 py-0.5 rounded-full bg-white/10 border border-white/20 text-[7px] font-mono text-white uppercase tracking-tighter">
                              System
                            </div>
                          )}
                        </div>
                      </div>
                      {f.status === 'corrupt' && <div className="absolute top-3 right-3 w-2 h-2 rounded-full bg-red-500 animate-ping" />}
                    </motion.div>
                  );
                })
              ) : (
                <div className="col-span-full py-24 flex flex-col items-center justify-center border-2 border-dashed border-white/5 rounded-[40px] opacity-20">
                  <Database size={48} className="mb-6" />
                  <span className="text-[11px] font-mono tracking-[0.3em] uppercase">No active nodes in this cell</span>
                </div>
              )}
            </div>
          </section>
        </main>

        {/* File Preview Modal */}
        <AnimatePresence>
          {selectedFile && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedFile(null)}
              className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-2xl flex items-end justify-center"
            >
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 28, stiffness: 220 }}
                onClick={e => e.stopPropagation()}
                className="w-full max-w-2xl bg-[#080a0e] border-t border-white/10 rounded-t-[50px] p-8 pb-14 shadow-[0_-30px_60px_rgba(0,0,0,0.6)] overflow-y-auto max-h-[90dvh] no-scrollbar"
              >
                <div className="w-14 h-1.5 bg-white/10 rounded-full mx-auto mb-10" />

                <div className="flex items-start justify-between mb-10">
                  <div className="flex items-center gap-5">
                    <div
                      className="w-20 h-20 rounded-[32px] bg-black/50 border border-white/10 flex items-center justify-center shadow-2xl"
                      style={{ borderColor: `${driveColor}50` }}
                    >
                      <Database size={40} style={{ color: driveColor }} />
                    </div>
                    <div>
                      <h2 className="text-2xl font-black text-white tracking-tight leading-tight">{selectedFile.name}</h2>
                      <div className="text-[11px] font-mono text-slate-500 uppercase tracking-[0.2em] mt-2">
                        {selectedFile.driveId} • SLOT {selectedFile.slotId} • CELL {selectedFile.cellId}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedFile(null)}
                    className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-slate-500 hover:text-white transition-all"
                  >
                    <X size={24} />
                  </button>
                </div>

                {/* Preview Area */}
                <div className="mb-10">
                  <div className="px-2 mb-4 flex justify-between items-center">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">Node Preview</span>
                    <div className="h-[1px] flex-1 mx-6 bg-white/5" />
                  </div>
                  <NeuralFilePreview file={selectedFile} />
                </div>

                <div className="grid grid-cols-2 gap-5 mb-10">
                  <div className="p-6 rounded-[32px] bg-white/[0.03] border border-white/5 shadow-inner">
                    <div className="text-[10px] font-bold text-slate-500 uppercase mb-2 tracking-widest">Size</div>
                    <div className="text-base font-mono text-slate-200">{(selectedFile.sizeBytes / 1024).toFixed(2)} KB</div>
                  </div>
                  <div className="p-6 rounded-[32px] bg-white/[0.03] border border-white/5 shadow-inner">
                    <div className="text-[10px] font-bold text-slate-500 uppercase mb-2 tracking-widest">Category</div>
                    <div className="text-base font-mono text-slate-200 uppercase">{selectedFile.category}</div>
                  </div>
                </div>

                <div className="space-y-4">
                  <button className="w-full py-6 bg-cyan-500 text-black font-black text-base rounded-[32px] flex items-center justify-center gap-3 hover:bg-cyan-400 transition-all shadow-[0_0_25px_rgba(34,211,238,0.4)] active:scale-[0.98]">
                    <Download size={20} /> DOWNLOAD NODE
                  </button>
                  <div className="grid grid-cols-2 gap-4">
                    <button className="py-6 bg-white/5 border border-white/10 text-slate-300 font-bold text-base rounded-[32px] flex items-center justify-center gap-3 hover:bg-white/10 transition-all">
                      <Share2 size={18} /> SHARE
                    </button>
                    <button className="py-6 bg-red-950/20 border border-red-500/20 text-red-500 font-bold text-base rounded-[32px] flex items-center justify-center gap-3 hover:bg-red-500/10 transition-all">
                      <Trash2 size={18} /> DELETE
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <style>{`
          .no-scrollbar::-webkit-scrollbar { display: none; }
          input, button { -webkit-tap-highlight-color: transparent; }
        `}</style>
      </div>
    </motion.div>
  );
}

// Leeway Standards: governed module
