#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const WORKSPACE_ROOT = path.resolve(path.join(__dirname, '..', '..'));
const INDEX_NEW = path.join(WORKSPACE_ROOT, 'agent-lee-coding-mode', 'source-index', 'all-leeway-files.index.json.new');

function short(n) {
  if (n > 1e9) return (n/1e9).toFixed(2)+' GB';
  if (n > 1e6) return (n/1e6).toFixed(2)+' MB';
  if (n > 1e3) return (n/1e3).toFixed(2)+' KB';
  return n+' B';
}

async function main() {
  if (!fs.existsSync(INDEX_NEW)) {
    console.error('Index not found:', INDEX_NEW);
    process.exit(2);
  }
  const raw = (await fs.promises.readFile(INDEX_NEW, 'utf8')).replace(/^\uFEFF/, '');
  let arr;
  try { arr = JSON.parse(raw); } catch (e) { console.error('Failed to parse index:', e.message); process.exit(2); }

  const agg = new Map();
  for (const item of arr) {
    const full = item.FullName;
    const rel = path.relative(WORKSPACE_ROOT, full).replace(/\\/g, '/');
    const top = rel.split('/')[0] || rel;
    const size = Number(item.Length) || 0;
    const cur = agg.get(top) || { size: 0, count: 0 };
    cur.size += size;
    cur.count += 1;
    agg.set(top, cur);
  }

  const rows = Array.from(agg.entries()).map(([k,v])=>({name:k,size:v.size,count:v.count}));
  rows.sort((a,b)=>b.size - a.size);

  console.log('Top-level size summary for', WORKSPACE_ROOT);
  console.log('Rank	Bytes		Human	Files	Top-level');
  let rank=1;
  for (const r of rows.slice(0,60)) {
    console.log(`${rank}\t${r.size}\t${short(r.size)}\t${r.count}\t${r.name}`);
    rank++;
  }
  console.log('\nTotal top-level entries:', rows.length);
}

main();
