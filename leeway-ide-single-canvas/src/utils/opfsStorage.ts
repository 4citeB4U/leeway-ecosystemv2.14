/**
 * LEEWAY_HEADER - DO NOT REMOVE
 *
 * REGION: UTIL
 * TAG: UTIL.MODULE.PLACEHOLDER
 * DESCRIPTION: Leeway IDE utility module
 * AUTHORITY: LeeWay-Standards
 * DISCOVERY_PIPELINE: Voice -> Intent -> Location -> Vertical -> Ranking -> Render
 *
 * 5WH:
 * WHAT = Utility Module
 * WHY = Provide utility functions
 * WHO = Leeway Innovations / Agent Lee Enablement
 * WHERE = FILEPATH
 * WHEN = 2026-06-06
 * HOW = TypeScript module
 *
 * CHAIN: Standards ? Integrated ? Runtime ? Projections
 * LICENSE: PROPRIETARY
 */

/**
 * OPFS Storage - Origin Private File System integration
 */

import { openDB, DBSchema } from 'idb';

const DB_NAME_COLD = 'agent-lee-cold-store';
const DB_VERSION_COLD = 1;

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

interface ColdDB extends DBSchema {
  archives: { key: string; value: ColdArchiveEntry };
}

function normalizePath(path: string): string {
  return path.replace(/^opfs:\//, "").replace(/^\/+/, "");
}

async function getOpfsRoot(): Promise<FileSystemDirectoryHandle> {
  return await navigator.storage.getDirectory();
}

export async function opfsWriteFile(path: string, blob: Blob): Promise<void> {
  const rel = normalizePath(path);
  const parts = rel.split("/").filter(Boolean);
  const fileName = parts.pop();
  if (!fileName) throw new Error(`Invalid OPFS path: ${path}`);

  let dir = await getOpfsRoot();
  for (const part of parts) {
    dir = await dir.getDirectoryHandle(part, { create: true });
  }

  const fh = await dir.getFileHandle(fileName, { create: true });
  const w = await fh.createWritable();
  await w.write(blob);
  await w.close();
}

export async function opfsReadFile(path: string): Promise<File> {
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

export async function opfsDeleteFile(path: string): Promise<void> {
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

export class ColdStorageLink {
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

export const coldStore = new ColdStorageLink();

// Leeway Standards: governed module
