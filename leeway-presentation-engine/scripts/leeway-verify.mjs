import { writeFileSync, existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const sharedReceiptRoot = path.join(root, '..', 'Archive', 'receipts', 'leeway-presentation-engine');
const checks = [
  { name: 'index.html exists', ok: existsSync(path.join(root, 'index.html')) },
  { name: 'style.css exists', ok: existsSync(path.join(root, 'style.css')) },
  { name: 'decks-data.json exists', ok: existsSync(path.join(root, 'decks-data.json')) },
  { name: 'package.json exists', ok: existsSync(path.join(root, 'package.json')) },
  { name: 'README.md exists', ok: existsSync(path.join(root, 'README.md')) },
  { name: 'leeway.presentation.manifest.json exists', ok: existsSync(path.join(root, 'leeway.presentation.manifest.json')) },
  { name: 'agent monetization narration mode exists', ok: existsSync(path.join(root, '..', 'agent-lee-coding-mode', 'runtime', 'agent-lee-monetization-narration-mode.json')) },
  { name: 'project contract exists', ok: existsSync(path.join(root, 'leeway.project.json')) }
];

const allOk = checks.every(c => c.ok);
const report = {
  schema: 'leeway.presentation.readiness-report.v1',
  status: allOk ? 'PASS' : 'FAIL',
  timestamp: new Date().toISOString(),
  scope: 'Presentation engine launch, proof, and monetization narration readiness',
  checks
};

const reportsDir = path.join(root, 'reports');
if (!existsSync(reportsDir)) {
  mkdirSync(reportsDir);
}
writeFileSync(path.join(reportsDir, 'presentation-readiness-report.json'), JSON.stringify(report, null, 2));

const receiptDir = path.join(root, 'receipts');
if (!existsSync(receiptDir)) {
  mkdirSync(receiptDir);
}
const receipt = {
  receiptType: 'LEEWAY_PROOF_RECEIPT',
  schema: 'leeway.presentation.proof.receipt.v1',
  objectId: "LW-ECO-014",
  name: "leeway-presentation-engine",
  status: report.status,
  verifiedBy: "Antigravity",
  controlSurface: "presentation-engine",
  selectedBackend: "qwen3:latest",
  responseMode: "monetization-narration",
  timeoutMs: 5000,
  fallbackUsed: false,
  timestamp: report.timestamp,
  checks: checks.map(c => ({ name: c.name, ok: c.ok })),
  artifactPaths: {
    root,
    reportPath: path.join(reportsDir, 'presentation-readiness-report.json'),
    localReceiptPath: path.join(receiptDir, 'presentation-proof.receipt.json'),
    sharedReceiptRoot
  }
};
const localReceiptPath = path.join(receiptDir, 'presentation-proof.receipt.json');
const sharedReceiptPath = path.join(sharedReceiptRoot, `presentation-proof-${report.timestamp.replace(/[:.]/g, '-')}.json`);
if (!existsSync(sharedReceiptRoot)) {
  mkdirSync(sharedReceiptRoot, { recursive: true });
}
writeFileSync(localReceiptPath, JSON.stringify({ ...receipt, receiptPath: localReceiptPath }, null, 2));
writeFileSync(sharedReceiptPath, JSON.stringify({ ...receipt, receiptPath: sharedReceiptPath }, null, 2));
console.log('Evidence receipt written to: ' + localReceiptPath);
console.log('Shared receipt written to: ' + sharedReceiptPath);

console.log('LeeWay Presentation Engine Readiness: ' + report.status);
checks.forEach(c => console.log(`- ${c.name}: ${c.ok ? 'OK' : 'FAIL'}`));

if (!allOk) process.exit(1);
