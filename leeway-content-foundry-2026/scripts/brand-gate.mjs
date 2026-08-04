/*
LEEWAY HEADER — DO NOT REMOVE

REGION: CORE
TAG: CORE.CORE.SCRIPTS.BRAND_GATE.MAIN
DESCRIPTION: Auto-enforced by LeeWay Standards Enforcement Engine
AUTHORITY: LeeWay-Standards
DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render

5WH:
WHAT = brand-gate.mjs — governed module
WHY = Enforce LeeWay architectural standards in this file
WHO = Leeway Industries / LeeWay Standards Enforcement Engine
WHERE = scripts/brand-gate.mjs
WHEN = 2026-04-18
HOW = Auto-enforced header; update manually with full 5WH detail

CHAIN: Standards → Integrated → Runtime → Projections
LICENSE: PROPRIETARY
*/
import fs from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();
const governancePath = path.join(repoRoot, 'governance', 'leeway-application-governance.json');

if (!fs.existsSync(governancePath)) {
  console.error(`[brand-gate] Missing governance file: ${governancePath}`);
  process.exit(1);
}

const governance = JSON.parse(fs.readFileSync(governancePath, 'utf8'));
const forbiddenTokens = governance?.brandPolicy?.forbiddenBrandTokens;

if (!Array.isArray(forbiddenTokens) || forbiddenTokens.length === 0) {
  console.error('[brand-gate] No forbiddenBrandTokens configured in governance/leeway-application-governance.json');
  process.exit(1);
}

const ignoredDirs = new Set([
  '.git',
  'node_modules',
  'dist',
  'build',
  'coverage',
  '.next',
  '.turbo',
  '.venv'
]);

const approvedArchivalPathFragments = [
  `${path.sep}receipts${path.sep}move-apply-backups${path.sep}`,
  `${path.sep}LeeWay-Standards${path.sep}receipts${path.sep}move-apply-backups${path.sep}`
];

const ignoredFileSuffixes = [
  '.png', '.jpg', '.jpeg', '.gif', '.webp', '.ico', '.svg',
  '.mp4', '.webm', '.mov', '.mp3', '.wav', '.zip', '.gz', '.pdf'
];

const skipFiles = new Set([
  path.normalize('governance/leeway-application-governance.json')
]);

function isIgnoredDir(dirName) {
  return ignoredDirs.has(dirName);
}

function isApprovedArchivalPath(filePath) {
  const normalized = path.normalize(filePath);
  return approvedArchivalPathFragments.some((fragment) => normalized.includes(fragment));
}

function shouldSkipFile(filePath) {
  const normalized = path.normalize(filePath);
  const relative = path.relative(repoRoot, normalized);

  if (skipFiles.has(relative)) {
    return true;
  }

  if (isApprovedArchivalPath(normalized)) {
    return true;
  }

  const lower = normalized.toLowerCase();
  return ignoredFileSuffixes.some((suffix) => lower.endsWith(suffix));
}

function collectFiles(dirPath, out) {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);

    if (entry.isDirectory()) {
      if (isIgnoredDir(entry.name)) {
        continue;
      }
      collectFiles(fullPath, out);
      continue;
    }

    if (entry.isFile()) {
      out.push(fullPath);
    }
  }
}

function findViolations(filePath, tokens) {
  let content;
  try {
    content = fs.readFileSync(filePath, 'utf8');
  } catch {
    return [];
  }

  const lines = content.split(/\r?\n/);
  const violations = [];

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    for (const token of tokens) {
      if (typeof token !== 'string' || token.length === 0) {
        continue;
      }
      if (line.includes(token)) {
        violations.push({ line: i + 1, token, text: line.trim() });
      }
    }
  }

  return violations;
}

const files = [];
collectFiles(repoRoot, files);

const allViolations = [];
for (const file of files) {
  if (shouldSkipFile(file)) {
    continue;
  }

  const violations = findViolations(file, forbiddenTokens);
  if (violations.length > 0) {
    const relative = path.relative(repoRoot, file).split(path.sep).join('/');
    allViolations.push({ file: relative, violations });
  }
}

if (allViolations.length > 0) {
  console.error('[brand-gate] Forbidden branding detected outside approved archival paths.');
  for (const item of allViolations) {
    for (const violation of item.violations) {
      console.error(`${item.file}:${violation.line} token='${violation.token}' text='${violation.text}'`);
    }
  }
  process.exit(1);
}

console.log(`[brand-gate] OK. Scanned ${files.length} files with no forbidden branding violations.`);
