#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const AGENT_LEE_ROOT = path.resolve(__dirname, "..");
const WORKSPACE_ROOT = path.resolve(AGENT_LEE_ROOT, "..");
const INDEX_DIR = path.join(AGENT_LEE_ROOT, "source-index");
const INDEX_FILE = path.join(INDEX_DIR, "all-leeway-files.index.json");
const ACTIVE_STANDARDS_ROOT = path.join(WORKSPACE_ROOT, "LeeWay-Standards");
const DEPRECATED_STANDARDS_ROOT = path.join(WORKSPACE_ROOT, "Leeway-Standards");

const EXCLUDE_DIRS = new Set(["node_modules", ".git", "archive", "dist", "build", "__pycache__", "source-index"]);

function shouldExcludeEntry(name) {
  const normalized = String(name || "").toLowerCase();
  if (EXCLUDE_DIRS.has(normalized)) return true;
  if (String(name || "") === "Leeway-Standards") {
    console.warn("EXCLUDING_DEPRECATED_STANDARDS_ROOT_OUTSIDE_ARCHIVE", DEPRECATED_STANDARDS_ROOT);
    return true;
  }
  if (normalized.startsWith(".venv")) return true;
  if (normalized.startsWith(".git")) return true;
  if (normalized.startsWith("archive")) return true;
  return false;
}

async function walk(dir, out) {
  const entries = await fs.promises.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    try {
      const name = entry.name;
      if (shouldExcludeEntry(name)) continue;
      const full = path.join(dir, name);
      if (entry.isSymbolicLink()) continue;
      if (entry.isDirectory()) {
        await walk(full, out);
      } else if (entry.isFile()) {
        const stat = await fs.promises.stat(full);
        out.push({
          FullName: full,
          Name: name,
          Extension: path.extname(name),
          Length: stat.size,
          LastWriteTime: `/Date(${Math.round(stat.mtimeMs)})/`
        });
      }
    } catch (err) {
      // Ignore permission errors and continue
      // console.warn('walk error', dir, err && err.message);
    }
  }
}

async function main() {
  try {
    const out = [];
    const start = Date.now();
    console.log('Scanning workspace root:', WORKSPACE_ROOT);
    console.log('Active standards root:', ACTIVE_STANDARDS_ROOT);
    const canonicalReal = fs.existsSync(ACTIVE_STANDARDS_ROOT) ? fs.realpathSync(ACTIVE_STANDARDS_ROOT) : null;
    const deprecatedReal = fs.existsSync(DEPRECATED_STANDARDS_ROOT) ? fs.realpathSync(DEPRECATED_STANDARDS_ROOT) : null;
    if (deprecatedReal && (!canonicalReal || deprecatedReal.toLowerCase() !== canonicalReal.toLowerCase())) {
      console.warn('DEPRECATED_STANDARDS_ROOT_PRESENT_OUTSIDE_ARCHIVE', DEPRECATED_STANDARDS_ROOT);
    }
    await walk(WORKSPACE_ROOT, out);
    await fs.promises.mkdir(INDEX_DIR, { recursive: true });

    const ts = new Date().toISOString().replace(/[:.]/g, "-");
    const archiveDir = path.join(WORKSPACE_ROOT, 'Archive', 'backups', 'discovery-refresh');
    await fs.promises.mkdir(archiveDir, { recursive: true });

    // Backup existing index if present
    if (fs.existsSync(INDEX_FILE)) {
      const existing = await fs.promises.readFile(INDEX_FILE, 'utf8');
      const backupPath = path.join(archiveDir, `all-leeway-files.index.json.${ts}.backup.json`);
      await fs.promises.writeFile(backupPath, existing, 'utf8');
      console.log('Backed up existing index to', backupPath);
    }

    const newIndexPath = path.join(INDEX_DIR, `all-leeway-files.index.json.${ts}.new.json`);
    await fs.promises.writeFile(newIndexPath, JSON.stringify(out, null, 2), 'utf8');
    // Also write a canonical .new filename for atomc replacement/pickup by other tools
    const canonicalNew = path.join(INDEX_DIR, 'all-leeway-files.index.json.new');
    await fs.promises.writeFile(canonicalNew, JSON.stringify(out, null, 2), 'utf8');
    await fs.promises.writeFile(INDEX_FILE, JSON.stringify(out, null, 2), 'utf8');

    // Mirror into archive for traceability
    const archiveMirror = path.join(archiveDir, `all-leeway-files.index.json.${ts}.new.json`);
    await fs.promises.writeFile(archiveMirror, JSON.stringify(out, null, 2), 'utf8');

    console.log('WROTE_NEW_INDEX', newIndexPath);
    console.log('WROTE_CANONICAL_NEW', canonicalNew);
    console.log('WROTE_CANONICAL_INDEX', INDEX_FILE);
    console.log('ARCHIVE_MIRROR', archiveMirror);
    console.log('TOTAL_FILES', out.length, 'DURATION_MS', Date.now() - start);
  } catch (err) {
    console.error('ERROR generating discovery index:', err && err.stack || err);
    process.exit(2);
  }
}

main();
