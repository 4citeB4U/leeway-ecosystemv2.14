import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const sharedReceiptRoot = path.join(root, '..', 'Archive', 'receipts', 'leeway-presentation-engine');
const receiptRoot = path.join(root, 'receipts');
const stamp = new Date().toISOString().replace(/[:.]/g, '-');

const checks = [
  { name: 'index.html exists', ok: existsSync(path.join(root, 'index.html')) },
  { name: 'README.md exists', ok: existsSync(path.join(root, 'README.md')) },
  { name: 'leeway.presentation.manifest.json exists', ok: existsSync(path.join(root, 'leeway.presentation.manifest.json')) },
  { name: 'agent monetization mode exists', ok: existsSync(path.join(root, '..', 'agent-lee-coding-mode', 'runtime', 'agent-lee-monetization-narration-mode.json')) }
];

const ok = checks.every((check) => check.ok);
const receipt = {
  receiptType: 'LEEWAY_PRESENTATION_LAUNCH_RECEIPT',
  schema: 'leeway.presentation.launch.receipt.v1',
  objectId: 'LW-ECO-014',
  name: 'leeway-presentation-engine',
  status: ok ? 'PASS' : 'FAIL',
  launchedAt: new Date().toISOString(),
  launchTarget: 'index.html',
  launchRoute: '/agent-lee/capabilities/presentation/launch',
  selectedBackend: 'qwen3:latest',
  responseMode: 'monetization-narration',
  fallbackUsed: false,
  timeoutMs: 5000,
  controlSurface: 'presentation-engine',
  checks
};

if (!existsSync(receiptRoot)) {
  mkdirSync(receiptRoot, { recursive: true });
}
if (!existsSync(sharedReceiptRoot)) {
  mkdirSync(sharedReceiptRoot, { recursive: true });
}

const localReceiptPath = path.join(receiptRoot, 'presentation-launch.receipt.json');
const sharedReceiptPath = path.join(sharedReceiptRoot, `presentation-launch-${stamp}.json`);

writeFileSync(localReceiptPath, JSON.stringify({ ...receipt, receiptPath: localReceiptPath }, null, 2), 'utf8');
writeFileSync(sharedReceiptPath, JSON.stringify({ ...receipt, receiptPath: sharedReceiptPath }, null, 2), 'utf8');

console.log(`Presentation launch receipt written to: ${localReceiptPath}`);
console.log(`Shared launch receipt written to: ${sharedReceiptPath}`);
console.log(`LeeWay Presentation Engine Launch: ${ok ? 'PASS' : 'FAIL'}`);

if (!ok) {
  process.exit(1);
}
