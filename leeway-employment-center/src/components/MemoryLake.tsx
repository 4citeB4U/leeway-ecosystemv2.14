/*
FILE: src\components\MemoryLake.tsx
PURPOSE: LeeWay governed asset for leeway-employment-center.
TAG: UI.COMPONENT.M_EM_OR_YL_AK_E.MAIN
REGION: 🔵 UI
GOVERNED_BY: LeeWay Standards
OWNED_BY: Agent Lee / LeeWay Runtime
DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render
IMPORTS: Inferred by verification scanner
EXPORTS: Inferred by verification scanner
STATUS: ACTIVE
*/
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import JSZip from 'jszip';
import { openDB, DBSchema, IDBPDatabase } from 'idb';
import {
  Home, 
  Activity, 
  Rocket, 
  Terminal, 
  Settings, 
  Mic, 
  Send, 
  Search, 
  Database,
  Archive,
  Code,
  Trash2,
  Download,
  Share2,
  Plus,
  X,
  FileText,
  Video,
  Folder
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import {
  guardedAction,
  type GovernanceContext,
  type GovernanceAuditReceipt,
} from "../core/leewayGovernanceGate";

const MEMORY_LAKE_GOVERNANCE_CONTEXT: GovernanceContext = {
  actorId: "ADMIN-LEE-001",
  role: "admin",
  policies: ["memory.upload", "memory.seed", "memory.export", "memory.share", "memory.delete"],
  surface: "employment-center:memory-lake",
};

const getGovernanceLabel = (action: string, receipt: GovernanceAuditReceipt, ok: boolean) =>
  ok
    ? `${action} cleared by LeeWay governance. Receipt: ${receipt.id}`
    : `${action} blocked by LeeWay governance. Receipt: ${receipt.id}`;

// ==========================================
// 0. SYSTEM CONSTANTS & TYPES
// ==========================================

const DB_NAME_CORE = 'agent-lee-neural-core';
const DB_VERSION_CORE = 3;
const DB_NAME_COLD = 'agent-lee-cold-store';
const DB_VERSION_COLD = 1;

export type DriveId = "L" | "E" | "O" | "N" | "A" | "R" | "D" | "LEE";
export type CorruptionStatus = "safe" | "suspect" | "corrupt" | "offloaded"; 
export type FileCategory = "code" | "data" | "doc" | "media" | "sys" | "archive" | "pdf" | "audio";

const DRIVE_COLORS: Record<DriveId, string> = {
    "LEE": "#ffffff", "N": "#d8b4fe", "A": "#f472b6", "R": "#fb923c",
    "O": "#fbbf24", "L": "#22d3ee", "E": "#facc15", "D": "#4ade80",
};

const DRIVE_METADATA: Record<DriveId, { label: string; icon: any; type: string; capacity: string; description: string }> = {
  "LEE": { label: "CORE", icon: Database, type: "System", capacity: "8 GB", description: "Core neural processing and system registry." },
  "N": { label: "MEDIA", icon: Video, type: "Media", capacity: "8 GB", description: "High-bandwidth neural media streaming." },
  "A": { label: "MEDIA", icon: Video, type: "Media", capacity: "8 GB", description: "Audio-visual sensory data storage." },
  "R": { label: "LARGE", icon: Archive, type: "Storage", capacity: "8 GB", description: "Large-scale resource and asset repository." },
  "O": { label: "LARGE", icon: Archive, type: "Storage", capacity: "8 GB", description: "Object-based cold storage for archives." },
  "L": { label: "LOGIC", icon: Code, type: "Code", capacity: "8 GB", description: "Neural logic and algorithmic codebases." },
  "E": { label: "ENGINE", icon: Terminal, type: "Code", capacity: "8 GB", description: "Experimental engine and data processing." },
  "D": { label: "DOCS", icon: FileText, type: "Docs", capacity: "8 GB", description: "Documentation and neural briefing logs." },
};

const CATEGORY_ICONS: Record<FileCategory, any> = {
  code: Code,
  media: Video,
  doc: FileText,
  archive: Archive,
  sys: Database,
  data: Folder,
  pdf: FileText,
  audio: Mic
};

export interface ExternalRef {
    type: 'opfs' | 'handle';
    path: string;
    archiveId?: string;
}

export interface NeuralFile {
  id: string;
  driveId: DriveId;
  slotId: number;
  cellId: number;
  name: string;
  path: string; 
  extension: string;
  sizeBytes: number;
  content: string | Blob | null; 
  category: FileCategory;
  status: CorruptionStatus;
  lastModified: number;
  signature: string; 
  annotations: { id: string; text: string; timestamp: string }[];
  externalRef?: ExternalRef;
}

export interface ColdArchiveEntry {
  id: string;
  name: string;
  sizeBytes: number;
  createdAt: number;
  path: string; 
  mimeType: string;
  originalDriveId?: string;
  originalSlotId?: number;
}

// ==========================================
// 1. UTILITIES: OPFS
// ==========================================

function normalizePath(path: string): string {
  return path.replace(/^opfs:\//, "").replace(/^\/+/, "");
}

async function getOpfsRoot(): Promise<FileSystemDirectoryHandle> {
  return await navigator.storage.getDirectory();
}

async function opfsWriteFile(path: string, blob: Blob): Promise<void> {
  const rel = normalizePath(path);
  const parts = rel.split("/").filter(Boolean);
  const fileName = parts.pop();
  if (!fileName) throw new Error(`Invalid OPFS path: ${path}`);

  let dir = await getOpfsRoot();
  for (const part of parts) {
    dir = await dir.getDirectoryHandle(part, { create: true });
  }

  const fh = await dir.getFileHandle(fileName, { create: true });
  const w = await (fh as any).createWritable();
  await w.write(blob);
  await w.close();
}

async function opfsReadFile(path: string): Promise<File> {
  const rel = normalizePath(path);
  const parts = rel.split("/").filter(Boolean);
  const fileName = parts.pop();
  if (!fileName) throw new Error(`Invalid OPFS path: ${path}`);

  let dir = await getOpfsRoot();
  for (const part of parts) {
    dir = await dir.getDirectoryHandle(part, { create: false });
  }

  const fh = await dir.getFileHandle(fileName, { create: false });
  return await fh.getFile();
}

async function opfsDeleteFile(path: string): Promise<void> {
  const rel = normalizePath(path);
  const parts = rel.split("/").filter(Boolean);
  const fileName = parts.pop();
  if (!fileName) return;

  try {
    let dir = await getOpfsRoot();
    for (const part of parts) {
      dir = await dir.getDirectoryHandle(part, { create: false });
    }
    await dir.removeEntry(fileName);
  } catch (e) {
    console.warn("Failed to delete OPFS file:", path, e);
  }
}

// ==========================================
// 2. LOGIC: COLD STORE
// ==========================================

interface ColdDB extends DBSchema {
  archives: { key: string; value: ColdArchiveEntry };
}

class ColdStorageLink {
  private dbPromise = openDB<ColdDB>(DB_NAME_COLD, DB_VERSION_COLD, {
    upgrade(db) {
      db.createObjectStore('archives', { keyPath: 'id' });
    },
  });

  async addArchive(blob: Blob, meta: Omit<ColdArchiveEntry, 'path' | 'createdAt' | 'sizeBytes'>): Promise<ColdArchiveEntry> {
    const path = `archives/${meta.id}_${meta.name}`;
    await opfsWriteFile(path, blob);
    
    const entry: ColdArchiveEntry = {
      ...meta,
      path,
      sizeBytes: blob.size,
      createdAt: Date.now(),
    };

    const db = await this.dbPromise;
    await db.put('archives', entry);
    return entry;
  }

  async getArchiveBlob(id: string): Promise<Blob | null> {
    const db = await this.dbPromise;
    const entry = await db.get('archives', id);
    if (!entry) return null;
    try {
      return await opfsReadFile(entry.path);
    } catch (e) {
      console.error("Failed to read cold archive:", e);
      return null;
    }
  }

  async removeArchive(id: string) {
    const db = await this.dbPromise;
    const entry = await db.get('archives', id);
    if (entry) {
      await opfsDeleteFile(entry.path);
      await db.delete('archives', id);
    }
  }

  async listArchives(): Promise<ColdArchiveEntry[]> {
    const db = await this.dbPromise;
    return db.getAll('archives');
  }
}
const coldStore = new ColdStorageLink();

// ==========================================
// 3. LOGIC: NEURAL DB
// ==========================================

interface NeuralDB extends DBSchema {
  files: {
    key: string;
    value: NeuralFile;
    indexes: { 'by-slot': [string, number]; 'by-cell': [string, number, number]; 'by-signature': string };
  };
  meta: { key: string; value: { initialized: boolean } };
}

class NeuralLink {
  private dbPromise: Promise<IDBPDatabase<NeuralDB>>;

  constructor() {
    this.dbPromise = openDB<NeuralDB>(DB_NAME_CORE, DB_VERSION_CORE, {
      upgrade(db, oldVersion) {
        if (oldVersion < 2) {
             if (db.objectStoreNames.contains('files')) db.deleteObjectStore('files');
             if (db.objectStoreNames.contains('meta')) db.deleteObjectStore('meta');
        }
        if (!db.objectStoreNames.contains('files')) {
            const fileStore = db.createObjectStore('files', { keyPath: 'id' });
            fileStore.createIndex('by-slot', ['driveId', 'slotId']);
            fileStore.createIndex('by-cell', ['driveId', 'slotId', 'cellId']);
            fileStore.createIndex('by-signature', 'signature');
        }
        if (!db.objectStoreNames.contains('meta')) {
            db.createObjectStore('meta');
        }
      },
    });
    this.initializeCore();
  }

  private async initializeCore() {
    const db = await this.dbPromise;
    const meta = await db.get('meta', 'init');
    if (!meta) {
      await this.seedMockData();
      await db.put('meta', { initialized: true }, 'init');
    }
  }

  async getFiles(driveId: DriveId, slotId: number, cellId: number): Promise<NeuralFile[]> {
    const db = await this.dbPromise;
    return db.getAllFromIndex('files', 'by-cell', [driveId, slotId, cellId]);
  }

  async getFilesBySlot(driveId: DriveId, slotId: number): Promise<NeuralFile[]> {
    const db = await this.dbPromise;
    return db.getAllFromIndex('files', 'by-slot', [driveId, slotId]);
  }

  async getFilesByDrive(driveId: DriveId): Promise<NeuralFile[]> {
    const db = await this.dbPromise;
    const range = IDBKeyRange.bound([driveId, 0], [driveId, 100]); 
    return db.getAllFromIndex('files', 'by-slot', range);
  }

  async getAllFiles(): Promise<NeuralFile[]> {
    const db = await this.dbPromise;
    return db.getAll('files');
  }

  async getCopies(signature: string): Promise<NeuralFile[]> {
    const db = await this.dbPromise;
    return db.getAllFromIndex('files', 'by-signature', signature);
  }

  async addFile(file: NeuralFile) {
    const db = await this.dbPromise;
    await db.put('files', file);
  }

  async renameFile(id: string, newName: string) {
      const db = await this.dbPromise;
      const f = await db.get('files', id);
      if (f) {
          f.name = newName;
          f.lastModified = Date.now();
          await db.put('files', f);
      }
  }

  async deleteFile(id: string) {
    const db = await this.dbPromise;
    await db.delete('files', id);
  }
  
  async updateStatus(id: string, status: CorruptionStatus) {
      const db = await this.dbPromise;
      const f = await db.get('files', id);
      if(f) { f.status = status; await db.put('files', f); }
  }

  async offload(id: string, ref: ExternalRef) {
      const db = await this.dbPromise;
      const f = await db.get('files', id);
      if(f) {
          f.content = null; 
          f.status = 'offloaded';
          f.externalRef = ref;
          f.lastModified = Date.now();
          await db.put('files', f);
      }
  }

  async addExampleFiles(driveId: DriveId, slotId: number, cellId: number) {
    const examples: { name: string; category: FileCategory; ext: string; content: string | Blob }[] = [
      { 
        name: "neural_core.ts", 
        category: "code", 
        ext: "ts", 
        content: `export class NeuralProcessor {\n  private synapses: Map<string, number> = new Map();\n\n  process(input: number[]): number {\n    return input.reduce((acc, val) => acc + val, 0) / input.length;\n  }\n}` 
      },
      { 
        name: "system_manifest.json", 
        category: "data", 
        ext: "json", 
        content: JSON.stringify({ version: "8.5.0", status: "stable", nodes: 1024, integrity: 0.9998 }, null, 2) 
      },
      { 
        name: "agent_briefing.pdf", 
        category: "pdf", 
        ext: "pdf", 
        content: new Blob(["%PDF-1.4\n%MOCK_PDF_CONTENT\n1 0 obj\n<< /Title (Agent Briefing) >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF"], { type: "application/pdf" }) 
      },
      { 
        name: "ambient_hum.mp3", 
        category: "audio", 
        ext: "mp3", 
        content: new Blob([new Uint8Array(1000)], { type: "audio/mpeg" }) 
      },
      { 
        name: "node_schematic.png", 
        category: "media", 
        ext: "png", 
        content: new Blob([new Uint8Array(5000)], { type: "image/png" }) 
      },
      { 
        name: "backup_logs.zip", 
        category: "archive", 
        ext: "zip", 
        content: new Blob([new Uint8Array(2000)], { type: "application/zip" }) 
      },
      { 
        name: "neural_stream.mp4", 
        category: "media", 
        ext: "mp4", 
        content: new Blob([new Uint8Array(10000)], { type: "video/mp4" }) 
      }
    ];

    for (const ex of examples) {
      const file: NeuralFile = {
        id: `example-${ex.name}-${Date.now()}-${Math.random()}`,
        driveId, slotId, cellId,
        name: ex.name,
        path: "",
        extension: ex.ext,
        sizeBytes: ex.content instanceof Blob ? ex.content.size : ex.content.length,
        content: ex.content,
        category: ex.category,
        status: 'safe',
        lastModified: Date.now(),
        signature: `SIG_EX_${ex.name}`,
        annotations: []
      };
      await this.addFile(file);
    }
  }

  private async seedMockData() {
    const drives: DriveId[] = ["L", "E", "O", "N", "A", "R", "D", "LEE"];
    const roles: Record<string, FileCategory[]> = {
        "LEE": ["sys", "code"],
        "N": ["media"], "A": ["media"],
        "R": ["media", "doc", "pdf"], "O": ["archive", "data"],
        "L": ["code", "data"], "E": ["data", "code", "audio"],
        "D": ["doc", "pdf"]
    };

    const db = await this.dbPromise;
    const tx = db.transaction('files', 'readwrite');

    for (const d of drives) {
        for (let s = 1; s <= 8; s++) {
            for (let c = 1; c <= 8; c++) {
                if (Math.random() > 0.85) {
                    const count = Math.floor(Math.random() * 2) + 1;
                    for (let i = 0; i < count; i++) {
                        const cat = roles[d][i % roles[d].length] || 'doc';
                        const isCorrupt = (d === 'D' || d === 'E') && Math.random() > 0.95;
                        let extension = 'dat';
                        if (cat === 'code') extension = 'ts';
                        if (cat === 'media') extension = 'png';
                        if (cat === 'pdf') extension = 'pdf';
                        if (cat === 'audio') extension = 'mp3';
                        if (cat === 'data') extension = 'json';
                        
                        let content: string | Blob = isCorrupt ? "CORRUPTED_SECTOR_DATA" : "Active neural pathway data...";
                        if (cat === 'media') content = new Blob([new Uint8Array(100)], { type: 'image/png' });
                        if (cat === 'pdf') content = new Blob(["%PDF-1.4\n%MOCK"], { type: 'application/pdf' });
                        if (cat === 'audio') content = new Blob([new Uint8Array(100)], { type: 'audio/mpeg' });
                        if (cat === 'data') content = JSON.stringify({ node: d, slot: s, cell: c, status: "active" });

                        const file: NeuralFile = {
                            id: `${d}-${s}-${c}-${i}-${Date.now()}-${Math.random()}`,
                            driveId: d, slotId: s, cellId: c,
                            name: `mem_frag_${d}${s}${c}_${i}.${extension}`,
                            path: "", extension: extension,
                            sizeBytes: content instanceof Blob ? content.size : content.length,
                            content: content, category: cat,
                            status: isCorrupt ? 'corrupt' : 'safe',
                            lastModified: Date.now(),
                            signature: `SIG_${d}_${i}`,
                            annotations: []
                        };
                        tx.store.put(file);
                    }
                }
            }
        }
    }
    await tx.done;
  }
}
const neuralDB = new NeuralLink();

// ==========================================
// 4. UI COMPONENTS & AESTHETICS
// ==========================================

interface LayoutNode {
  id: string;
  x: number; y: number; w: number; h: number;
  color: string;
  type: "drive" | "slot" | "cell" | "file";
}

// ==========================================
// 4. UI COMPONENTS: PREVIEWER
// ==========================================

const FilePreview: React.FC<{ file: NeuralFile }> = ({ file }) => {
  const [contentUrl, setContentUrl] = useState<string | null>(null);
  const [textContent, setTextContent] = useState<string | null>(null);

  useEffect(() => {
    if (!file.content) return;

    if (file.content instanceof Blob) {
      const url = URL.createObjectURL(file.content);
      setContentUrl(url);
      return () => URL.revokeObjectURL(url);
    } else if (typeof file.content === 'string') {
      setTextContent(file.content);
    }
  }, [file]);

  if (file.category === 'media' && file.extension.match(/(mp4|mov|webm)/i)) {
    return (
      <div className="w-full aspect-video rounded-2xl overflow-hidden bg-black/40 border border-white/10 flex items-center justify-center">
        {contentUrl ? (
          <video src={contentUrl} controls className="max-w-full max-h-full" />
        ) : (
          <div className="text-slate-500 text-[10px] font-mono">LOADING VIDEO...</div>
        )}
      </div>
    );
  }

  if (file.category === 'media' || file.extension.match(/(png|jpg|jpeg|gif|webp)/i)) {
    return (
      <div className="w-full aspect-video rounded-2xl overflow-hidden bg-black/40 border border-white/10 flex items-center justify-center">
        {contentUrl ? (
          <img src={contentUrl} alt={file.name} className="max-w-full max-h-full object-contain" referrerPolicy="no-referrer" />
        ) : (
          <div className="text-slate-500 text-[10px] font-mono">LOADING IMAGE...</div>
        )}
      </div>
    );
  }

  if (file.category === 'audio' || file.extension.match(/(mp3|wav|ogg|m4a)/i)) {
    return (
      <div className="w-full p-6 rounded-2xl bg-black/40 border border-white/10 flex flex-col items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-cyan-500/20 flex items-center justify-center text-cyan-500 animate-pulse">
          <Mic size={32} />
        </div>
        {contentUrl && (
          <audio controls src={contentUrl} className="w-full h-10 accent-cyan-500" />
        )}
      </div>
    );
  }

  if (file.category === 'pdf' || file.extension.toLowerCase() === 'pdf') {
    return (
      <div className="w-full h-[400px] rounded-2xl overflow-hidden bg-white border border-white/10">
        {contentUrl ? (
          <iframe src={contentUrl} className="w-full h-full border-none" title={file.name} />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-900 font-mono">LOADING PDF...</div>
        )}
      </div>
    );
  }

  if (file.category === 'code' || file.category === 'doc' || typeof file.content === 'string') {
    return (
      <div className="w-full max-h-[400px] overflow-auto rounded-2xl bg-black/80 border border-white/10 p-5 font-mono text-[12px] leading-relaxed text-cyan-400/90 selection:bg-cyan-500/30 shadow-inner">
        <pre className="whitespace-pre-wrap break-all font-mono">
          {textContent || "No text content available."}
        </pre>
      </div>
    );
  }

  if (file.category === 'data' || file.extension.toLowerCase() === 'json') {
    return (
      <div className="w-full max-h-[400px] overflow-auto rounded-2xl bg-black/80 border border-white/10 p-5 font-mono text-[12px] leading-relaxed text-amber-400/90 selection:bg-amber-500/30 shadow-inner">
        <pre className="whitespace-pre-wrap break-all font-mono">
          {textContent || "No data content available."}
        </pre>
      </div>
    );
  }

  if (file.category === 'archive' || file.extension.match(/(zip|rar|7z|tar)/i)) {
    return (
      <div className="w-full py-12 rounded-2xl bg-black/40 border border-white/10 flex flex-col items-center justify-center">
        <Archive size={48} className="mb-4 text-slate-500" />
        <span className="text-[10px] font-mono tracking-widest uppercase text-slate-400">Compressed Archive â€¢ {file.extension.toUpperCase()}</span>
        <span className="text-[9px] font-mono text-slate-600 mt-2">{(file.sizeBytes / 1024).toFixed(2)} KB</span>
      </div>
    );
  }

  return (
    <div className="w-full py-12 rounded-2xl bg-black/40 border border-white/10 flex flex-col items-center justify-center opacity-40">
      <Database size={48} className="mb-4" />
      <span className="text-[10px] font-mono tracking-widest uppercase">Binary Node â€¢ No Preview</span>
    </div>
  );
};

// ==========================================
// 5. UI COMPONENTS: CORE
// ==========================================

const ConnectionLayer: React.FC<{ nodes: LayoutNode[], w: number, h: number, activeDrive: DriveId, activeSlot: number|null, activeCell: number|null }> = React.memo(({ nodes, w, h, activeDrive, activeSlot, activeCell }) => {
    const driveColor = DRIVE_COLORS[activeDrive];
    const paths: React.ReactNode[] = [];

    // Use a Map for O(1) node lookup
    const nodeMap = useMemo(() => {
        const map = new Map<string, LayoutNode>();
        nodes.forEach(n => map.set(n.id, n));
        return map;
    }, [nodes]);

    const driveNode = nodeMap.get(`drive_${activeDrive}`);
    if (driveNode) {
        // Drive to Slots
        for (let i = 1; i <= 8; i++) {
            const slotId = `slot_${activeDrive}-${i}`;
            const slot = nodeMap.get(slotId);
            if (!slot) continue;

            const start = { x: driveNode.x + driveNode.w/2, y: driveNode.y + driveNode.h };
            const end = { x: slot.x + slot.w/2, y: slot.y };
            
            const midY = start.y + (end.y - start.y) * 0.5;
            const d = `M ${start.x} ${start.y} L ${start.x} ${midY} L ${end.x} ${midY} L ${end.x} ${end.y}`;
            
            const isActive = activeSlot === i;
            paths.push(<path key={`d-s-${slotId}`} d={d} stroke={driveColor} strokeWidth={isActive ? 1.5 : 0.5} fill="none" opacity={isActive ? 0.6 : 0.05} strokeLinejoin="round" />);
            if (isActive) {
              paths.push(<path key={`d-s-anim-${slotId}`} d={d} stroke={driveColor} strokeWidth={2} fill="none" className="animate-flow" strokeDasharray="4 12" strokeLinecap="round" filter="url(#glow)" />);
              paths.push(<circle key={`pulse-s-${slotId}`} cx={end.x} cy={end.y} r="2" fill={driveColor} className="animate-ping" />);
            }
        }
    }

    if (activeSlot && driveNode) {
        const slotNode = nodeMap.get(`slot_${activeDrive}-${activeSlot}`);
        if (slotNode) {
            // Slot to Cells
            for (let i = 1; i <= 8; i++) {
                const cellId = `cell_${activeDrive}-${activeSlot}-${i}`;
                const cell = nodeMap.get(cellId);
                if (!cell) continue;

                const start = { x: slotNode.x + slotNode.w/2, y: slotNode.y + slotNode.h };
                const end = { x: cell.x + cell.w/2, y: cell.y };
                
                const midY = start.y + (end.y - start.y) * 0.5;
                const d = `M ${start.x} ${start.y} L ${start.x} ${midY} L ${end.x} ${midY} L ${end.x} ${end.y}`;

                const isActive = activeCell === i;
                paths.push(<path key={`s-c-${cellId}`} d={d} stroke={driveColor} strokeWidth={isActive ? 1.5 : 0.5} fill="none" opacity={isActive ? 0.6 : 0.05} strokeLinejoin="round" />);
                if (isActive) {
                  paths.push(<path key={`s-c-anim-${cellId}`} d={d} stroke={driveColor} strokeWidth={2} fill="none" className="animate-flow" strokeDasharray="4 12" strokeLinecap="round" filter="url(#glow)" />);
                  paths.push(<circle key={`pulse-c-${cellId}`} cx={end.x} cy={end.y} r="2" fill={driveColor} className="animate-ping" />);
                }
            }
        }
    }

    return (
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
        <svg width={w} height={h} className="absolute inset-0 overflow-visible">
            <defs>
                <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                    <feMerge>
                        <feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/>
                    </feMerge>
                </filter>
            </defs>
            {paths}
        </svg>
        {nodes.map(node => {
          if (node.type === 'drive') {
            const driveId = node.id.replace('drive_', '') as DriveId;
            const meta = DRIVE_METADATA[driveId];
            const Icon = meta.icon;
            return (
              <div key={node.id} className="absolute" style={{ left: node.x + node.w/2 - 6, top: node.y - 20 }}>
                <Icon size={12} style={{ color: node.color }} className="opacity-40" />
              </div>
            );
          }
          return null;
        })}
      </div>
    );
});

const CouncilConsole: React.FC = () => {
  const [input, setInput] = useState("");
  return (
    <div className="w-full px-4 pb-4">
      <div className="relative flex items-center gap-2">
        <div className="relative flex-1">
          <input 
            type="text" 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Talk to Agent Lee..."
            className="w-full bg-slate-900/60 border border-white/10 rounded-2xl py-4 pl-5 pr-14 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 transition-all backdrop-blur-xl shadow-2xl"
          />
          <button className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center bg-cyan-500 rounded-xl text-black hover:bg-cyan-400 transition-colors shadow-[0_0_15px_rgba(34,211,238,0.4)]">
            <Send size={18} />
          </button>
        </div>
        <button className="w-12 h-12 flex items-center justify-center bg-slate-800/60 border border-white/10 rounded-2xl text-slate-400 hover:text-cyan-400 transition-colors backdrop-blur-xl">
          <Mic size={22} />
        </button>
      </div>
    </div>
  );
};

const BottomNav: React.FC = () => {
  const navItems = [
    { id: 'home', icon: Home, label: 'Home' },
    { id: 'diagnostic', icon: Activity, label: 'Diagnostic' },
    { id: 'deployment', icon: Rocket, label: 'Deployment' },
    { id: 'code', icon: Terminal, label: 'Studio' },
    { id: 'settings', icon: Settings, label: 'Settings' },
  ];
  return (
    <nav className="w-full h-20 flex items-center justify-around bg-black/60 border-t border-white/5 backdrop-blur-3xl px-4 pb-4">
      {navItems.map((item) => (
        <button key={item.id} className="flex flex-col items-center justify-center gap-1.5 text-slate-500 hover:text-cyan-400 transition-all group">
          <item.icon size={22} className="group-hover:scale-110 group-hover:drop-shadow-[0_0_8px_rgba(34,211,238,0.5)] transition-all" />
          <span className="text-[10px] font-black uppercase tracking-tighter opacity-60 group-hover:opacity-100">{item.label}</span>
        </button>
      ))}
    </nav>
  );
};

// ==========================================
// 6. MAIN APPLICATION
// ==========================================

export const MemoryLake: React.FC = () => {
  const [activeDrive, setActiveDrive] = useState<DriveId>("LEE");
  const [activeSlot, setActiveSlot] = useState<number | null>(1);
  const [activeCell, setActiveCell] = useState<number | null>(1);
  const [files, setFiles] = useState<NeuralFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<NeuralFile | null>(null);
  const [loading, setLoading] = useState(false);
  const [governanceBusy, setGovernanceBusy] = useState<null | "upload" | "seed" | "download" | "share" | "delete">(null);
  const [governanceNotice, setGovernanceNotice] = useState<null | { type: "success" | "error"; message: string }>(null);
  const [dim, setDim] = useState({ w: 0, h: 0 });

  const [scrollHeight, setScrollHeight] = useState(2000);

  const containerRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const nodeRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const driveColor = DRIVE_COLORS[activeDrive];

  const applyGovernanceNotice = (action: string, receipt: GovernanceAuditReceipt, ok: boolean) => {
    setGovernanceNotice({
      type: ok ? "success" : "error",
      message: getGovernanceLabel(action, receipt, ok)
    });
  };

  useEffect(() => {
    if(!containerRef.current) return;
    const ro = new ResizeObserver(e => {
        if (e[0]) setDim({ w: e[0].contentRect.width, h: e[0].contentRect.height });
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (mainRef.current) {
      setScrollHeight(mainRef.current.scrollHeight);
    }
  }, [files, activeDrive, activeSlot, activeCell, dim]);

  const loadFiles = async () => {
    if (!activeSlot || !activeCell) return;
    setLoading(true);
    try {
      const fs = await neuralDB.getFiles(activeDrive, activeSlot, activeCell);
      setFiles(fs);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  useEffect(() => { loadFiles(); }, [activeDrive, activeSlot, activeCell]);

  const ingestSelectedFiles = async (fileList: FileList) => {
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
    await loadFiles();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || !activeSlot || !activeCell || governanceBusy) return;

    setGovernanceBusy("upload");
    const outcome = await guardedAction({
      context: MEMORY_LAKE_GOVERNANCE_CONTEXT,
      action: "Import Memory Nodes",
      policy: "memory.upload",
      allowedRoles: ["operator", "admin"],
      dangerous: true,
      confirmationMessage: `Import ${fileList.length} file(s) into the Memory Lake?`,
      execute: async () => {
        await ingestSelectedFiles(fileList);
        return fileList.length;
      },
    });

    applyGovernanceNotice("Import Memory Nodes", outcome.receipt, outcome.ok);
    setGovernanceBusy(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

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
              id, type, color, 
              x: Math.round(r.left - mainRect.left), 
              y: Math.round(r.top - mainRect.top + scrollY), 
              w: Math.round(r.width), h: Math.round(r.height) 
            });
        }
    };

    (Object.keys(DRIVE_COLORS) as DriveId[]).forEach(d => add(`drive_${d}`, 'drive', DRIVE_COLORS[d]));
    for(let i=1; i<=8; i++) add(`slot_${activeDrive}-${i}`, 'slot', driveColor);
    for(let i=1; i<=8; i++) add(`cell_${activeDrive}-${activeSlot}-${i}`, 'cell', driveColor);
    
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

  const handleScroll = useCallback(() => {
    // Throttled scroll handling if needed, but currently no-op for performance
  }, []);

  const setRef = (id: string) => (el: HTMLElement | null) => { if (el) nodeRefs.current.set(id, el as HTMLDivElement); else nodeRefs.current.delete(id); };

  const handleSeedExamples = async () => {
    if (!activeSlot || !activeCell || governanceBusy) {
      return;
    }

    setGovernanceBusy("seed");
    const outcome = await guardedAction({
      context: MEMORY_LAKE_GOVERNANCE_CONTEXT,
      action: "Seed Example Memory Nodes",
      policy: "memory.seed",
      allowedRoles: ["operator", "admin"],
      execute: async () => {
        setLoading(true);
        try {
          await neuralDB.addExampleFiles(activeDrive, activeSlot, activeCell);
          await loadFiles();
        } finally {
          setLoading(false);
        }
      },
    });

    applyGovernanceNotice("Seed Example Memory Nodes", outcome.receipt, outcome.ok);
    setGovernanceBusy(null);
  };

  const handleDownloadSelectedFile = async () => {
    if (!selectedFile || governanceBusy) {
      return;
    }

    setGovernanceBusy("download");
    const outcome = await guardedAction({
      context: MEMORY_LAKE_GOVERNANCE_CONTEXT,
      action: "Export Memory Node",
      policy: "memory.export",
      allowedRoles: ["operator", "admin"],
      dangerous: true,
      confirmationMessage: `Export ${selectedFile.name} from the Memory Lake?`,
      execute: async () => {
        if (!selectedFile.content) {
          throw new Error("Selected file has no locally hydrated content.");
        }

        const blob =
          selectedFile.content instanceof Blob
            ? selectedFile.content
            : new Blob([selectedFile.content], { type: "text/plain;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = selectedFile.name;
        anchor.click();
        URL.revokeObjectURL(url);
      },
    });

    applyGovernanceNotice("Export Memory Node", outcome.receipt, outcome.ok);
    setGovernanceBusy(null);
  };

  const handleShareSelectedFile = async () => {
    if (!selectedFile || governanceBusy) {
      return;
    }

    setGovernanceBusy("share");
    const outcome = await guardedAction({
      context: MEMORY_LAKE_GOVERNANCE_CONTEXT,
      action: "Share Memory Node Summary",
      policy: "memory.share",
      allowedRoles: ["operator", "admin"],
      dangerous: true,
      confirmationMessage: `Share metadata for ${selectedFile.name} outside the Memory Lake?`,
      execute: async () => {
        const shareText = `${selectedFile.name}\nDrive ${selectedFile.driveId} / Slot ${selectedFile.slotId} / Cell ${selectedFile.cellId}\nCategory: ${selectedFile.category}`;
        if (navigator.share) {
          await navigator.share({
            title: selectedFile.name,
            text: shareText
          });
          return;
        }

        await navigator.clipboard.writeText(shareText);
      },
    });

    applyGovernanceNotice("Share Memory Node Summary", outcome.receipt, outcome.ok);
    setGovernanceBusy(null);
  };

  const handleDeleteSelectedFile = async () => {
    if (!selectedFile || governanceBusy) {
      return;
    }

    const doomedFile = selectedFile;
    setGovernanceBusy("delete");
    const outcome = await guardedAction({
      context: MEMORY_LAKE_GOVERNANCE_CONTEXT,
      action: "Delete Memory Node",
      policy: "memory.delete",
      allowedRoles: ["admin"],
      dangerous: true,
      confirmationMessage: `Delete ${doomedFile.name} from the Memory Lake? This action cannot be undone.`,
      execute: async () => {
        await neuralDB.deleteFile(doomedFile.id);
        await loadFiles();
        setSelectedFile(null);
      },
    });

    applyGovernanceNotice("Delete Memory Node", outcome.receipt, outcome.ok);
    setGovernanceBusy(null);
  };

  return (
    <div ref={containerRef} className="flex flex-col h-full w-full bg-[#020408] text-slate-200 overflow-hidden font-sans selection:bg-cyan-500/30 relative antialiased">
      {/* Atmospheric Background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-cyan-900/20 blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-900/20 blur-[150px] animate-pulse" style={{ animationDelay: '2s' }} />
        <div className="absolute top-[30%] right-[10%] w-[30%] h-[30%] rounded-full bg-purple-900/10 blur-[100px]" />
        
        {/* Digital Grid/Lines Tracing */}
        <div className="absolute inset-0 opacity-[0.15]" 
          style={{ 
            backgroundImage: `linear-gradient(to right, #ffffff10 1px, transparent 1px), linear-gradient(to bottom, #ffffff10 1px, transparent 1px)`,
            backgroundSize: '40px 40px'
          }} 
        />
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-[0.03] mix-blend-overlay" />
      </div>

      <header className="pt-10 pb-4 px-6 flex items-center justify-between z-30 bg-gradient-to-b from-black/95 via-black/60 to-transparent backdrop-blur-xl border-b border-white/5">
        <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }}>
          <h1 className="text-xl font-black tracking-tighter uppercase flex items-center gap-2 drop-shadow-[0_0_15px_rgba(34,211,238,0.4)]">
            <Database size={20} className="text-cyan-500" />
            Memory Lake
          </h1>
          <div className="text-[8px] font-mono text-cyan-500/60 tracking-[0.4em] uppercase mt-0.5">Neural Monolith V8.5</div>
        </motion.div>
        <div className="flex items-center gap-3">
          <div className="text-right hidden xs:block">
            <div className="text-[8px] font-mono text-slate-500 uppercase tracking-widest">Integrity</div>
            <div className="text-[10px] font-bold text-emerald-500 drop-shadow-[0_0_8px_rgba(16,185,129,0.4)]">99.98%</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-900 border border-white/10 flex items-center justify-center overflow-hidden shadow-2xl ring-1 ring-white/5">
             <img src="https://picsum.photos/seed/agentlee/100/100" alt="Agent" className="w-full h-full object-cover opacity-70" referrerPolicy="no-referrer" />
          </div>
        </div>
      </header>

      {governanceNotice && (
        <div className={`mx-6 mt-4 rounded-2xl border px-4 py-3 text-[11px] font-mono uppercase tracking-[0.2em] z-30 ${
          governanceNotice.type === "success"
            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
            : "border-red-500/30 bg-red-500/10 text-red-400"
        }`}>
          {governanceNotice.message}
        </div>
      )}

      {/* Main Content */}
      <main 
        ref={mainRef} 
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto overflow-x-hidden no-scrollbar pb-40 z-20 px-4 sm:px-6 relative touch-pan-y overscroll-behavior-y-contain"
      >
        <ConnectionLayer nodes={layoutNodes} w={dim.w} h={scrollHeight} activeDrive={activeDrive} activeSlot={activeSlot} activeCell={activeCell} />
        
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
                <div className="text-xs font-bold text-orange-400">{(Math.random() * 10 + 32).toFixed(1)}Â°C</div>
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
              <span className="text-[10px] font-mono text-cyan-500/40">â€¢</span>
              <span className="text-[10px] font-bold text-cyan-500 uppercase tracking-[0.1em]">{DRIVE_METADATA[activeDrive].type}</span>
            </div>
            <div className="h-[1px] flex-1 mx-6 bg-white/5" />
          </div>
          <div className="flex gap-3 overflow-x-auto no-scrollbar py-3">
            {(Object.keys(DRIVE_COLORS) as DriveId[]).map(d => {
              const meta = DRIVE_METADATA[d];
              const Icon = meta.icon;
              return (
                <button key={d} ref={setRef(`drive_${d}`)} onClick={() => { setActiveDrive(d); setActiveSlot(1); setActiveCell(1); }}
                  className={`min-w-[80px] h-20 rounded-2xl border transition-all relative flex flex-col items-center justify-center gap-2 group ${activeDrive === d ? 'bg-white/5 border-white/20 shadow-2xl' : 'bg-black/40 border-white/5 opacity-40 hover:opacity-100'}`}
                  style={{ color: DRIVE_COLORS[d], borderColor: activeDrive === d ? DRIVE_COLORS[d] : undefined }}>
                  <Icon size={18} className={`${activeDrive === d ? 'animate-pulse' : ''}`} />
                  <div className="flex flex-col items-center">
                    <span className="text-[10px] font-black leading-none">{d}</span>
                    <span className="text-[7px] font-mono opacity-60 uppercase tracking-tighter mt-1">{meta.label}</span>
                    <span className="text-[6px] font-mono opacity-40 mt-0.5">{meta.capacity}</span>
                  </div>
                  <div className={`absolute bottom-0 left-4 right-4 h-[2px] rounded-full transition-all ${activeDrive === d ? 'opacity-100' : 'opacity-0'}`} style={{ backgroundColor: DRIVE_COLORS[d], boxShadow: `0 0 15px ${DRIVE_COLORS[d]}` }} />
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
                <button key={id} ref={setRef(`slot_${activeDrive}-${id}`)} onClick={() => { setActiveSlot(id); setActiveCell(1); }}
                  className={`h-16 rounded-2xl border flex flex-col items-center justify-center transition-all ${activeSlot === id ? 'bg-white/5 border-white/20' : 'bg-black/20 border-white/5 opacity-30'}`}
                  style={{ borderColor: activeSlot === id ? driveColor : undefined }}>
                  <span className="text-[9px] font-mono opacity-40">S0{id}</span>
                  <span className="text-sm font-black italic" style={{ color: activeSlot === id ? driveColor : undefined }}>LINK</span>
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
                <button key={id} ref={setRef(`cell_${activeDrive}-${activeSlot}-${id}`)} onClick={() => setActiveCell(id)}
                  className={`h-16 rounded-2xl border flex flex-col items-center justify-center transition-all ${activeCell === id ? 'bg-white/5 border-white/20' : 'bg-black/20 border-white/5 opacity-30'}`}
                  style={{ borderColor: activeCell === id ? driveColor : undefined }}>
                  <span className="text-[9px] font-mono opacity-40">C0{id}</span>
                  <span className="text-sm font-black" style={{ color: activeCell === id ? driveColor : undefined }}>CORE</span>
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
              <button onClick={() => void handleSeedExamples()} disabled={governanceBusy !== null} className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-cyan-400 transition-all flex items-center justify-center disabled:opacity-50" title="Seed Examples">
                <Rocket size={16} />
              </button>
              <button className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white transition-all flex items-center justify-center"><Search size={16} /></button>
              <button onClick={() => fileInputRef.current?.click()} disabled={governanceBusy !== null} className="w-10 h-10 rounded-xl bg-cyan-500 text-black shadow-[0_0_15px_rgba(34,211,238,0.3)] hover:bg-cyan-400 transition-all flex items-center justify-center disabled:opacity-50">
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
                const Icon = CATEGORY_ICONS[f.category] || FileText;
                return (
                  <motion.div key={f.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={() => setSelectedFile(f)}
                    className={`flex items-center gap-5 p-4 sm:p-5 rounded-[24px] sm:rounded-[28px] bg-white/[0.03] border border-white/5 hover:bg-white/[0.06] hover:border-white/10 transition-all cursor-pointer group relative overflow-hidden shadow-xl will-change-transform ${f.status === 'corrupt' ? 'border-red-500/30 bg-red-950/10' : ''}`}>
                    <div className="w-14 h-14 rounded-2xl bg-black/50 flex items-center justify-center border border-white/5 group-hover:border-white/20 transition-all shadow-inner" style={{ borderColor: f.status !== 'corrupt' ? `${driveColor}30` : undefined }}>
                      <Icon size={24} style={{ color: driveColor }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={`text-sm font-bold truncate ${f.status === 'corrupt' ? 'text-red-400' : 'text-slate-100'}`}>{f.name}</div>
                      <div className="flex items-center gap-2 mt-1.5">
                        <div className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">{(f.sizeBytes/1024).toFixed(1)} KB â€¢ {f.category}</div>
                        {DRIVE_METADATA[activeDrive].type === 'Storage' && (
                          <div className="px-1.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-[7px] font-mono text-amber-500 uppercase tracking-tighter">Large</div>
                        )}
                        {DRIVE_METADATA[activeDrive].type === 'Media' && (
                          <div className="px-1.5 py-0.5 rounded-full bg-pink-500/10 border border-pink-500/20 text-[7px] font-mono text-pink-500 uppercase tracking-tighter">Media</div>
                        )}
                        {DRIVE_METADATA[activeDrive].type === 'System' && (
                          <div className="px-1.5 py-0.5 rounded-full bg-white/10 border border-white/20 text-[7px] font-mono text-white uppercase tracking-tighter">System</div>
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

      {/* Footer Area */}
      <footer className="absolute bottom-0 left-0 w-full z-40 bg-[#020408]">
          <BottomNav />
      </footer>

      {/* Modals */}
      <AnimatePresence>
        {selectedFile && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedFile(null)}
            className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-2xl flex items-end justify-center">
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 28, stiffness: 220 }} onClick={e => e.stopPropagation()}
              className="w-full max-w-2xl bg-[#080a0e] border-t border-white/10 rounded-t-[50px] p-8 pb-14 shadow-[0_-30px_60px_rgba(0,0,0,0.6)] overflow-y-auto max-h-[90dvh] no-scrollbar">
              <div className="w-14 h-1.5 bg-white/10 rounded-full mx-auto mb-10" />
              
              <div className="flex items-start justify-between mb-10">
                <div className="flex items-center gap-5">
                  <div className="w-20 h-20 rounded-[32px] bg-black/50 border border-white/10 flex items-center justify-center shadow-2xl" style={{ borderColor: `${driveColor}50` }}>
                    <Database size={40} style={{ color: driveColor }} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-white tracking-tight leading-tight">{selectedFile.name}</h2>
                    <div className="text-[11px] font-mono text-slate-500 uppercase tracking-[0.2em] mt-2">
                      {selectedFile.driveId} â€¢ SLOT {selectedFile.slotId} â€¢ CELL {selectedFile.cellId}
                    </div>
                  </div>
                </div>
                <button onClick={() => setSelectedFile(null)} className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-slate-500 hover:text-white transition-all"><X size={24} /></button>
              </div>

              {/* Preview Area */}
              <div className="mb-10">
                <div className="px-2 mb-4 flex justify-between items-center">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">Node Preview</span>
                  <div className="h-[1px] flex-1 mx-6 bg-white/5" />
                </div>
                <FilePreview file={selectedFile} />
              </div>

              <div className="grid grid-cols-2 gap-5 mb-10">
                <div className="p-6 rounded-[32px] bg-white/[0.03] border border-white/5 shadow-inner">
                  <div className="text-[10px] font-bold text-slate-500 uppercase mb-2 tracking-widest">Size</div>
                  <div className="text-base font-mono text-slate-200">{(selectedFile.sizeBytes/1024).toFixed(2)} KB</div>
                </div>
                <div className="p-6 rounded-[32px] bg-white/[0.03] border border-white/5 shadow-inner">
                  <div className="text-[10px] font-bold text-slate-500 uppercase mb-2 tracking-widest">Category</div>
                  <div className="text-base font-mono text-slate-200 uppercase">{selectedFile.category}</div>
                </div>
              </div>

              <div className="space-y-4">
                <button onClick={() => void handleDownloadSelectedFile()} disabled={governanceBusy !== null} className="w-full py-6 bg-cyan-500 text-black font-black text-base rounded-[32px] flex items-center justify-center gap-3 hover:bg-cyan-400 transition-all shadow-[0_0_25px_rgba(34,211,238,0.4)] active:scale-[0.98] disabled:opacity-50">
                  <Download size={20} /> DOWNLOAD NODE
                </button>
                <div className="grid grid-cols-2 gap-4">
                  <button onClick={() => void handleShareSelectedFile()} disabled={governanceBusy !== null} className="py-6 bg-white/5 border border-white/10 text-slate-300 font-bold text-base rounded-[32px] flex items-center justify-center gap-3 hover:bg-white/10 transition-all disabled:opacity-50">
                    <Share2 size={18} /> SHARE
                  </button>
                  <button onClick={() => void handleDeleteSelectedFile()} disabled={governanceBusy !== null} className="py-6 bg-red-950/20 border border-red-500/20 text-red-500 font-bold text-base rounded-[32px] flex items-center justify-center gap-3 hover:bg-red-500/10 transition-all disabled:opacity-50">
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
        .animate-flow { animation: dash 2s linear infinite; }
        @keyframes dash { to { stroke-dashoffset: -50; } }
        @keyframes pulse-glow {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.6; }
        }
        input, button { -webkit-tap-highlight-color: transparent; }
      `}</style>
    </div>
  );
};

export default MemoryLake;

