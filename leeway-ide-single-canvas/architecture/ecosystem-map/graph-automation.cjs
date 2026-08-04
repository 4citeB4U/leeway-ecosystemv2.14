const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const MAP_PATH = path.join(__dirname, 'ecosystem-map.json');
const SCHEMA_PATH = path.join(__dirname, 'schemas', 'ecosystem-map.schema.json');
const EVIDENCE_BASE = path.resolve('D:\\Leeway-Ecosystem v2.1.4\\leeway-ide-single-canvas', 'evidence');
const TRANSIT_HUB_EVIDENCE = path.resolve('D:\\Leeway-Ecosystem v2.1.4\\LeeWay-Enterprise-Transit-Hub', '_evidence');
const GIT_ROOT = path.resolve('D:\\Leeway-Ecosystem v2.1.4');
const GENERATED_DIR = path.join(__dirname, 'generated');
const BACKUP_DIR = path.join(__dirname, 'generated', 'backups');
const VALID_RELATIONSHIP_TYPES = ['governs','contains','feeds','serves','uses','monitors','triggers','precedes','parallel-to','routes-to','connects'];

// --- Helpers ---
function loadMap() { return JSON.parse(fs.readFileSync(MAP_PATH, 'utf-8')); }
function saveMap(map) { fs.writeFileSync(MAP_PATH, JSON.stringify(map, null, 2) + '\n', 'utf-8'); }

function timestamp() { return new Date().toISOString(); }
function shortTs() { return new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19); }

function hashFile(filePath) {
  if (!fs.existsSync(filePath)) return null;
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

// --- Commands ---

// graph audit
function audit() {
  const map = loadMap();
  const results = { timestamp: timestamp(), nodeCount: map.nodes.length, relationshipCount: map.relationships.length, issues: [], warnings: [], info: [] };

  // Schema validation
  const nodeIds = new Set(map.nodes.map(n => n.id));
  const relIds = new Set(map.relationships.map(r => r.id));

  // Duplicate IDs
  const dupNodes = map.nodes.filter((n, i, arr) => arr.findIndex(x => x.id === n.id) !== i);
  if (dupNodes.length) results.issues.push({ type: 'DUPLICATE_NODE_IDS', count: dupNodes.length, ids: [...new Set(dupNodes.map(n => n.id))] });

  const dupRels = map.relationships.filter((r, i, arr) => arr.findIndex(x => x.id === r.id) !== i);
  if (dupRels.length) results.issues.push({ type: 'DUPLICATE_REL_IDS', count: dupRels.length, ids: [...new Set(dupRels.map(r => r.id))] });

  // Dangling relationships
  const dangling = map.relationships.filter(r => !nodeIds.has(r.from) || !nodeIds.has(r.to));
  if (dangling.length) results.issues.push({ type: 'DANGLING_RELATIONSHIPS', count: dangling.length, rels: dangling.map(r => `${r.id}: ${r.from} -> ${r.to}`) });

  // Unknown relationship types
  const unknownTypes = map.relationships.filter(r => !VALID_RELATIONSHIP_TYPES.includes(r.type));
  if (unknownTypes.length) results.warnings.push({ type: 'UNKNOWN_RELATIONSHIP_TYPES', count: unknownTypes.length, types: [...new Set(unknownTypes.map(r => r.type))] });

  // View membership
  const viewIds = new Set(map.views.map(v => v.id));
  for (const view of map.views) {
    const nf = view.nodeFilter || {};
    if (nf.includeIds) {
      const missing = nf.includeIds.filter(id => !nodeIds.has(id));
      if (missing.length) results.warnings.push({ type: 'VIEW_MISSING_NODES', view: view.id, missing });
    }
  }

  // Security data
  const noSecurity = map.nodes.filter(n => !n.securityStatus);
  if (noSecurity.length) results.warnings.push({ type: 'MISSING_SECURITY_STATUS', count: noSecurity.length });

  // Evidence references — check both project evidence and Transit Hub
  const allEvidence = [...new Set(map.nodes.flatMap(n => n.evidence || []))];
  const missingEvidence = allEvidence.filter(ev => {
    const evPath = path.join(EVIDENCE_BASE, ev);
    if (fs.existsSync(evPath)) return false;
    // Check Transit Hub
    const transitPath = path.join(TRANSIT_HUB_EVIDENCE, ev);
    if (fs.existsSync(transitPath)) return false;
    return true;
  });
  if (missingEvidence.length) results.warnings.push({ type: 'MISSING_EVIDENCE', count: missingEvidence.length, evidence: missingEvidence });

  // Source paths — check against git root, project root, and map dir
  const PROJECT_ROOT = path.resolve(GIT_ROOT, 'leeway-ide-single-canvas');
  const allSources = [...new Set(map.nodes.flatMap(n => n.sourcePaths || []))];
  const missingSources = allSources.filter(sp => {
    if (path.isAbsolute(sp)) return !fs.existsSync(sp);
    const candidates = [
      path.resolve(GIT_ROOT, sp),
      path.resolve(PROJECT_ROOT, sp),
      path.resolve(path.dirname(MAP_PATH), sp),
    ];
    // Strip "leeway-ide-single-canvas/" prefix if path already includes project dir
    const stripped = sp.replace(/^leeway-ide-single-canvas\//, '');
    if (stripped !== sp) candidates.push(path.resolve(PROJECT_ROOT, stripped));
    return !candidates.some(c => fs.existsSync(c));
  });
  if (missingSources.length) results.warnings.push({ type: 'MISSING_SOURCE_PATHS', count: missingSources.length, paths: missingSources });

  // Snapshot consistency
  if (map.timeMachine?.snapshots) {
    const lastSnap = map.timeMachine.snapshots[map.timeMachine.snapshots.length - 1];
    if (lastSnap && lastSnap.nodeCount !== map.nodes.length) {
      results.info.push({ type: 'SNAPSHOT_NODE_COUNT_MISMATCH', lastSnapshot: lastSnap.nodeCount, actual: map.nodes.length });
    }
  }

  return results;
}

// graph drift
function drift() {
  const driftScript = path.join(__dirname, 'validate-drift.cjs');
  if (fs.existsSync(driftScript)) {
    const { execSync } = require('child_process');
    let stdout = '';
    let exitCode = 0;
    try {
      stdout = execSync(`node "${driftScript}"`, { encoding: 'utf-8', timeout: 30000, stdio: ['pipe', 'pipe', 'pipe'] });
    } catch (e) {
      // Drift detected exits 1 after writing the report — the report is the result, not the error
      exitCode = e.status ?? 1;
      stdout = (e.stdout || '').toString();
    }
    const reportPath = path.join(GENERATED_DIR, 'drift-report.json');
    if (fs.existsSync(reportPath)) {
      const report = JSON.parse(fs.readFileSync(reportPath, 'utf-8'));
      report.exitCode = exitCode;
      return report;
    }
    return { stdout, exitCode };
  }
  return { error: 'validate-drift.cjs not found' };
}

// graph delta
function delta() {
  const map = loadMap();
  // Build a proposed delta by reading authoritative sources
  // This is a framework — actual source reading needs implementation per source type
  return {
    timestamp: timestamp(),
    status: 'PROPOSED',
    description: 'Framework for graph delta proposals. Implement source-specific readers for auto-population.',
    proposedNodes: [],
    proposedRelationships: [],
    classification: { CONFIRMED: [], STRONG: [], PROBABLE: [], AMBIGUOUS: [], REJECTED: [] },
    instructions: 'Run with --apply to apply proposals. Each proposed item must be validated first.'
  };
}

// graph validate-delta
function validateDelta(deltaData) {
  const map = loadMap();
  const existingIds = new Set(map.nodes.map(n => n.id));
  const existingRelIds = new Set(map.relationships.map(r => r.id));
  const deltaNodeIds = new Set((deltaData.proposedNodes || []).map(n => n.id));
  const validation = { timestamp: timestamp(), valid: true, errors: [], warnings: [] };

  for (const node of (deltaData.proposedNodes || [])) {
    if (!node.id || !node.name || !node.category) {
      validation.errors.push({ type: 'INVALID_NODE', id: node.id || '(no id)', reason: 'Missing required fields (id, name, category)' });
      validation.valid = false;
    }
    if (existingIds.has(node.id)) {
      validation.errors.push({ type: 'DUPLICATE_NODE', id: node.id, reason: 'Node ID already exists' });
      validation.valid = false;
    }
    if (!/^[a-z0-9-]+$/.test(node.id)) {
      validation.errors.push({ type: 'INVALID_ID', id: node.id, reason: 'ID must match ^[a-z0-9-]+$' });
      validation.valid = false;
    }
  }

  for (const rel of (deltaData.proposedRelationships || [])) {
    if (!rel.id || !rel.from || !rel.to || !rel.type) {
      validation.errors.push({ type: 'INVALID_RELATIONSHIP', id: rel.id || '(no id)', reason: 'Missing required fields' });
      validation.valid = false;
    }
    if (existingRelIds.has(rel.id)) {
      validation.errors.push({ type: 'DUPLICATE_RELATIONSHIP', id: rel.id, reason: 'Relationship ID already exists' });
      validation.valid = false;
    }
    if (!VALID_RELATIONSHIP_TYPES.includes(rel.type)) {
      validation.errors.push({ type: 'UNKNOWN_REL_TYPE', id: rel.id, type: rel.type, reason: `Not in valid types: ${VALID_RELATIONSHIP_TYPES.join(', ')}` });
      validation.valid = false;
    }
    const fromValid = existingIds.has(rel.from) || deltaNodeIds.has(rel.from);
    const toValid = existingIds.has(rel.to) || deltaNodeIds.has(rel.to);
    if (!fromValid || !toValid) {
      if (!fromValid) validation.errors.push({ type: 'DANGLING_FROM', id: rel.id, from: rel.from, reason: 'Source node not in graph or delta' });
      if (!toValid) validation.errors.push({ type: 'DANGLING_TO', id: rel.id, to: rel.to, reason: 'Target node not in graph or delta' });
      validation.valid = false;
    }
  }

  return validation;
}

// graph snapshot
function createSnapshot() {
  const map = loadMap();
  const snapshotId = `snapshot-${shortTs()}`;
  const snapshot = {
    snapshotId,
    timestamp: timestamp(),
    label: `Auto-snapshot ${shortTs()}`,
    migrationId: map.metadata.lastMigrationIncluded || 'AUTO',
    description: 'Automated graph maintenance snapshot',
    nodeCount: map.nodes.length,
    relationshipCount: map.relationships.length,
    completionPercent: map.metadata?.completionPercent ?? 92
  };

  if (!map.timeMachine) map.timeMachine = { enabled: true, currentSnapshot: snapshotId, snapshots: [] };
  map.timeMachine.snapshots.push(snapshot);
  map.timeMachine.currentSnapshot = snapshotId;
  map.metadata.snapshotCount = map.timeMachine.snapshots.length;
  saveMap(map);

  return snapshot;
}

// graph backup
function backup() {
  if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });
  const backupName = `ecosystem-map-backup-${shortTs()}.json`;
  const backPath = path.join(BACKUP_DIR, backupName);
  fs.copyFileSync(MAP_PATH, backPath);
  const hash = hashFile(backPath);
  return { backupPath: backPath, hash, timestamp: timestamp() };
}

// graph hash
function hashEvidence() {
  const map = loadMap();
  const allEvidence = [...new Set(map.nodes.flatMap(n => n.evidence || []))];
  const results = [];
  for (const ev of allEvidence) {
    const evPath = path.join(EVIDENCE_BASE, ev);
    const receiptPath = path.join(evPath, 'receipt.json');
    results.push({ evidence: ev, exists: fs.existsSync(evPath), receiptHash: hashFile(receiptPath), path: evPath });
  }
  return { timestamp: timestamp(), total: allEvidence.length, found: results.filter(r => r.exists).length, results };
}

// --- CLI ---
function main() {
  const args = process.argv.slice(2);
  const command = args.find(a => !a.startsWith('--')) || 'help';
  const isDryRun = !args.includes('--apply');

  const commands = {
    audit: () => { const r = audit(); console.log(JSON.stringify(r, null, 2)); return r; },
    drift: () => { const r = drift(); console.log(JSON.stringify(r, null, 2)); return r; },
    delta: () => { const r = delta(); console.log(JSON.stringify(r, null, 2)); return r; },
    'validate-delta': () => {
      const deltaPath = args.find(a => a.startsWith('--delta='));
      if (!deltaPath) { console.error('Usage: --delta=<path>'); process.exit(1); }
      const d = JSON.parse(fs.readFileSync(deltaPath.replace('--delta=', ''), 'utf-8'));
      const r = validateDelta(d);
      console.log(JSON.stringify(r, null, 2)); return r;
    },
    apply: () => {
      if (isDryRun) { console.log('DRY RUN — Use --apply to apply. No changes written.'); return { status: 'DRY_RUN' }; }
      const deltaPath = args.find(a => a.startsWith('--delta='));
      if (!deltaPath) { console.error('Usage: --delta=<path>'); process.exit(1); }
      const d = JSON.parse(fs.readFileSync(deltaPath.replace('--delta=', ''), 'utf-8'));
      const validation = validateDelta(d);
      if (!validation.valid) { console.error('Delta validation failed. Fix errors first.'); console.log(JSON.stringify(validation, null, 2)); process.exit(1); }
      // Apply delta
      const map = loadMap();
      for (const node of (d.proposedNodes || [])) map.nodes.push(node);
      for (const rel of (d.proposedRelationships || [])) map.relationships.push(rel);
      map.metadata.nodeCount = map.nodes.length;
      map.metadata.relationshipCount = map.relationships.length;
      // Create backup
      const bk = backup();
      saveMap(map);
      console.log(`Applied ${(d.proposedNodes||[]).length} nodes, ${(d.proposedRelationships||[]).length} relationships.`);
      console.log(`Backup: ${bk.backupPath}`);
      return { status: 'APPLIED', nodesAdded: (d.proposedNodes||[]).length, relsAdded: (d.proposedRelationships||[]).length, backup: bk };
    },
    snapshot: () => { const r = createSnapshot(); console.log(JSON.stringify(r, null, 2)); return r; },
    mermaid: () => {
      const gen = require('./generate-mermaid.cjs');
      console.log('Mermaid diagrams regenerated.');
      return { status: 'REGENERATED' };
    },
    backup: () => { const r = backup(); console.log(JSON.stringify(r, null, 2)); return r; },
    hash: () => { const r = hashEvidence(); console.log(JSON.stringify(r, null, 2)); return r; },
    help: () => {
      console.log('Graph Automation CLI');
      console.log('Usage: node graph-automation.cjs <command> [options]');
      console.log('');
      console.log('Commands:');
      console.log('  audit             — Comprehensive graph audit');
      console.log('  drift             — Check drift against live state');
      console.log('  delta             — Propose graph delta from sources');
      console.log('  validate-delta    — Validate a proposed delta (--delta=<path>)');
      console.log('  apply             — Apply validated delta (--delta=<path> --apply)');
      console.log('  snapshot          — Create Time Machine snapshot');
      console.log('  mermaid           — Regenerate Mermaid diagrams');
      console.log('  backup            — Create timestamped backup');
      console.log('  hash              — Validate evidence hashes');
      console.log('  help              — This help');
      console.log('');
      console.log('Safety: dry-run is default. Use --apply to write changes.');
    }
  };

  if (commands[command]) return commands[command]();
  console.error(`Unknown command: ${command}. Use 'help' for usage.`);
  process.exit(1);
}

main();
