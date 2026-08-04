import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getSkillsFull } from '../agent-lee-coding-mode/runtime/agent-lee-orchestration-runtime.mjs';

const ROOT = path.resolve(path.join('.', 'agent-lee-coding-mode'));
const OUT = path.join(ROOT, 'Archive', 'receipts', `skills_audit-${Date.now().toString(36)}.json`);

try {
  const report = getSkillsFull();
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify({ at: new Date().toISOString(), report }, null, 2));
  console.log('Skills audit written to', OUT);
} catch (err) {
  console.error('Skills audit failed:', String(err));
  process.exit(2);
}
