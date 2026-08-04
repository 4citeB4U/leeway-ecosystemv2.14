/*
LEEWAY HEADER — DO NOT REMOVE

REGION: CORE
TAG: CORE.MODULE.COMPLIANCE_CHECK.MAIN
DESCRIPTION: Auto-enforced by LeeWay Standards Enforcement Engine
AUTHORITY: LeeWay-Standards
DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render

5WH:
WHAT = compliance-check — governed module
WHY = Provide developers with a pre-submit compliance validation tool
WHO = Leeway Innovations / LeeWay Standards Enforcement Engine
WHERE = scripts/compliance-check.mjs
WHEN = 2026-04-18
HOW = Auto-enforced header; update manually with full 5WH detail

CHAIN: Standards → Integrated → Runtime → Projections
LICENSE: PROPRIETARY
*/

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const standardsRoot = path.resolve(__dirname, '..');

const SUPPORTED_EXTENSIONS = new Set(['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs']);
const DEFAULT_IGNORE = [
  'node_modules',
  '.git',
  'dist',
  'coverage',
  '__quarantine__',
  'leeway-standards-parity-report.json',
];

function normalizePath(filePath) {
  return filePath.replace(/\\/g, '/');
}

function shouldIgnore(filePath) {
  const normalized = normalizePath(filePath);
  return DEFAULT_IGNORE.some((part) => normalized.includes(part));
}

function shouldSkipProjectionImportRules(filePath) {
  const normalized = normalizePath(filePath);
  return normalized.endsWith('/scripts/compliance-check.mjs') || normalized.endsWith('scripts/compliance-check.mjs');
}

async function checkFileCompliance(filePath) {
  if (shouldIgnore(filePath)) {
    return null;
  }

  const content = await fs.readFile(filePath, 'utf8');
  const issues = [];

  // Check 1: LEEWAY HEADER
  if (!content.includes('LEEWAY HEADER')) {
    issues.push({ severity: 'critical', check: 'header', message: 'Missing LEEWAY HEADER' });
  }

  // Check 2: TAG
  if (!content.includes('TAG:')) {
    issues.push({ severity: 'critical', check: 'tag', message: 'Missing TAG metadata' });
  }

  // Check 3: REGION
  if (!content.includes('REGION:')) {
    issues.push({ severity: 'critical', check: 'region', message: 'Missing REGION designation' });
  }

  // Check 4: DISCOVERY_PIPELINE
  if (!content.includes('DISCOVERY_PIPELINE:')) {
    issues.push({ severity: 'high', check: 'pipeline', message: 'Missing DISCOVERY_PIPELINE' });
  }

  // Check 5: 5WH
  const has5WH = ['WHAT', 'WHY', 'WHO', 'WHERE', 'WHEN', 'HOW'].every((w) =>
    content.includes(w + ' ='),
  );
  if (!has5WH) {
    issues.push({ severity: 'high', check: '5wh', message: '5WH section incomplete' });
  }

  // Check 6: Forbidden imports (for external modules)
  if (
    !shouldSkipProjectionImportRules(filePath) &&
    (content.includes('type: \'projection\'') || content.includes('type: "projection"'))
  ) {
    if (content.includes("from '/runtime") || content.includes('from "/runtime')) {
      issues.push({
        severity: 'critical',
        check: 'imports',
        message: 'Projections cannot import from /runtime layer',
      });
    }
    if (content.includes("from '/standards") || content.includes('from "/standards')) {
      issues.push({
        severity: 'critical',
        check: 'imports',
        message: 'Projections cannot import from /standards layer',
      });
    }
  }

  // Check 7: For React/projections: Agent Lee form check
  if ((filePath.includes('components') || filePath.includes('projection')) && content.includes('React')) {
    if (
      !content.includes('Agent Lee') &&
      !content.includes('AgentLee') &&
      !content.includes('agent-lee')
    ) {
      issues.push({
        severity: 'medium',
        check: 'form',
        message: 'Projection should identify as Agent Lee component in title',
      });
    }
  }

  // Check 8: Receipt emission
  if (content.includes('export const ProjectionMetadata') || content.includes('export const ModuleMetadata')) {
    if (!content.includes('emitsReceipts')) {
      issues.push({
        severity: 'high',
        check: 'receipts',
        message: 'Module should emit receipts (add emitsReceipts: true)',
      });
    }
  }

  return {
    filePath,
    relativePath: path.relative(standardsRoot, filePath),
    compliant: issues.filter((i) => i.severity === 'critical').length === 0,
    issues,
  };
}

async function walkDirectory(dir, extensions) {
  const results = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    if (DEFAULT_IGNORE.includes(entry.name) || entry.name === 'build') {
      continue;
    }

    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...(await walkDirectory(fullPath, extensions)));
    } else if (extensions.has(path.extname(fullPath))) {
      results.push(fullPath);
    }
  }

  return results;
}

export async function runComplianceCheck(target = process.cwd()) {
  const stat = await fs.stat(target);

  let files = [];
  if (stat.isFile()) {
    files = [target];
  } else {
    files = await walkDirectory(target, SUPPORTED_EXTENSIONS);
  }

  const results = [];
  for (const file of files) {
    const result = await checkFileCompliance(file);
    if (result) {
      results.push(result);
    }
  }

  const summary = {
    scanned: results.length,
    compliant: results.filter((r) => r.compliant).length,
    issues: results.filter((r) => !r.compliant).length,
    criticalIssues: results.flatMap((r) => r.issues).filter((i) => i.severity === 'critical').length,
    results,
  };

  console.log('\n=== LeeWay Compliance Check ===\n');
  console.log(`Files Scanned: ${summary.scanned}`);
  console.log(`Compliant: ${summary.compliant}`);
  console.log(`Issues Found: ${summary.issues}`);
  console.log(`Critical Issues: ${summary.criticalIssues}\n`);

  if (summary.criticalIssues > 0) {
    console.log('❌ COMPLIANCE CHECK FAILED\n');
    for (const result of results.filter((r) => !r.compliant)) {
      console.log(`\n${result.relativePath}`);
      for (const issue of result.issues.filter((i) => i.severity === 'critical')) {
        console.log(`  ❌ [${issue.check}] ${issue.message}`);
      }
      for (const issue of result.issues.filter((i) => i.severity === 'high')) {
        console.log(`  ⚠️  [${issue.check}] ${issue.message}`);
      }
    }
    return { ok: false, summary };
  }

  console.log('✅ ALL FILES PASS COMPLIANCE CHECK');
  return { ok: true, summary };
}

async function main() {
  const target = process.argv[2] || process.cwd();
  const result = await runComplianceCheck(target);
  process.exit(result.ok ? 0 : 1);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error('Compliance check error:', error.message);
    process.exit(1);
  });
}
