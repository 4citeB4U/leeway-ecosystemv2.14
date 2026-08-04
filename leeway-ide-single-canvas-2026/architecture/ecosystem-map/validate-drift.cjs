const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const MAP_PATH = path.join(__dirname, 'ecosystem-map.json');
const GIT_ROOT = path.resolve(path.join(__dirname, '..', '..', '..'));
const PROJECT_ROOT = path.resolve(path.join(__dirname, '..', '..'));
const EVIDENCE_BASE = path.join(PROJECT_ROOT, 'evidence');
const ARCHITECTURE_BASE = path.resolve(path.join(__dirname, '..'));

function loadMap() {
  return JSON.parse(fs.readFileSync(MAP_PATH, 'utf-8'));
}

function checkDockerContainers(expectedNames) {
  const results = [];
  try {
    const stdout = execSync('docker ps --format "{{.Names}}"', {
      encoding: 'utf-8',
      timeout: 15000
    });
    const running = stdout.split('\n').map(s => s.trim()).filter(Boolean);
    for (const expected of expectedNames) {
      const found = running.some(r => r.startsWith(expected) || r === expected);
      results.push({ container: expected, running: found });
    }
  } catch (e) {
    return expectedNames.map(exp => ({ container: exp, running: false, error: e.message }));
  }
  return results;
}

function checkEvidenceDirs(expectedEvidencePaths) {
  const results = [];
  for (const ev of expectedEvidencePaths) {
    // Normalize: strip "evidence/" prefix if present, as EVIDENCE_BASE already includes it
    const normalized = ev.replace(/^evidence\//i, '').replace(/\/+$/, '');
    const fullPath = path.join(EVIDENCE_BASE, normalized);
    results.push({ evidence: ev, exists: fs.existsSync(fullPath) });
  }
  return results;
}

function checkSourceDirs(expectedSourcePaths) {
  const results = [];
  for (const sp of expectedSourcePaths) {
    // Try against git root first, then project root
    let fullPath = path.resolve(path.join(GIT_ROOT, sp));
    let exists = fs.existsSync(fullPath);
    if (!exists) {
      fullPath = path.resolve(path.join(PROJECT_ROOT, sp));
      exists = fs.existsSync(fullPath);
    }
    // Also try literal path (for absolute paths like C:\Users\...)
    if (!exists && path.isAbsolute(sp)) {
      exists = fs.existsSync(sp);
      fullPath = sp;
    }
    results.push({ sourcePath: sp, exists, resolvedTo: exists ? fullPath : null });
  }
  return results;
}

function checkNodeCompleteness(node) {
  const gaps = [];
  if (!node.id || !node.name || !node.category || !node.status || !node.truthLevel) {
    gaps.push('Missing required fields');
  }
  if (node.status === 'LIVE_READ_ONLY' || node.status === 'LIVE_WRITE_BOUNDED' || node.status === 'PRODUCTION_READY') {
    if (node.containers && node.containers.length > 0) {
      const containerResults = checkDockerContainers(node.containers);
      const missing = containerResults.filter(r => !r.running);
      if (missing.length > 0) {
        gaps.push(`Containers not running: ${missing.map(m => m.container).join(', ')}`);
      }
    }
  }
  return gaps;
}

function run() {
  const report = {
    timestamp: new Date().toISOString(),
    mapPath: MAP_PATH,
    valid: true,
    nodeCount: 0,
    relationshipCount: 0,
    containerChecks: [],
    evidenceChecks: [],
    sourceChecks: [],
    nodeIssues: [],
    knownGapsFound: [],
    driftDetected: false,
    warnings: []
  };

  // Load map
  let map;
  try {
    map = loadMap();
    report.nodeCount = map.nodes.length;
    report.relationshipCount = map.relationships.length;
  } catch (e) {
    report.valid = false;
    report.warnings.push(`Cannot load map: ${e.message}`);
    return report;
  }

  // Collect all unique container names from nodes
  const allContainers = [...new Set(
    map.nodes.flatMap(n => n.containers || [])
  )];
  if (allContainers.length > 0) {
    report.containerChecks = checkDockerContainers(allContainers);
    const missingContainers = report.containerChecks.filter(c => !c.running);
    if (missingContainers.length > 0) {
      report.driftDetected = true;
      report.warnings.push(`${missingContainers.length} expected container(s) not running`);
      for (const mc of missingContainers) {
        report.warnings.push(`  - ${mc.container}`);
      }
    }
  }

  // Collect evidence paths
  const allEvidence = [...new Set(
    map.nodes.flatMap(n => n.evidence || [])
  )];
  if (allEvidence.length > 0) {
    report.evidenceChecks = checkEvidenceDirs(allEvidence);
    const missingEvidence = report.evidenceChecks.filter(e => !e.exists);
    if (missingEvidence.length > 0) {
      report.driftDetected = true;
      report.warnings.push(`${missingEvidence.length} evidence path(s) not found`);
      for (const me of missingEvidence) {
        report.warnings.push(`  - ${me.evidence}`);
      }
    }
  }

  // Collect source paths
  const allSources = [...new Set(
    map.nodes.flatMap(n => n.sourcePaths || [])
  )];
  if (allSources.length > 0) {
    report.sourceChecks = checkSourceDirs(allSources);
    const missingSources = report.sourceChecks.filter(s => !s.exists);
    if (missingSources.length > 0) {
      report.driftDetected = true;
      report.warnings.push(`${missingSources.length} source path(s) not found`);
      for (const ms of missingSources) {
        report.warnings.push(`  - ${ms.sourcePath}`);
      }
    }
  }

  // Validate individual nodes
  for (const node of map.nodes) {
    const issues = checkNodeCompleteness(node);
    if (issues.length > 0) {
      report.nodeIssues.push({ node: node.id, issues });
    }
    if (node.knownGaps && node.knownGaps.length > 0) {
      report.knownGapsFound.push({ node: node.id, gaps: node.knownGaps });
    }
  }

  report.valid = !report.driftDetected;

  // Write report
  const outputDir = path.join(__dirname, 'generated');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  const reportPath = path.join(outputDir, 'drift-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf-8');

  console.log('=== LeeWay Ecosystem Map Drift Validation ===');
  console.log(`Timestamp: ${report.timestamp}`);
  console.log(`Nodes: ${report.nodeCount}`);
  console.log(`Relationships: ${report.relationshipCount}`);
  console.log(`Containers checked: ${report.containerChecks.length}`);
  console.log(`Evidence paths checked: ${report.evidenceChecks.length}`);
  console.log(`Source paths checked: ${report.sourceChecks.length}`);
  console.log(`Drift detected: ${report.driftDetected}`);
  console.log(`Warnings: ${report.warnings.length}`);
  console.log(`Node issues: ${report.nodeIssues.length}`);
  console.log(`Known gaps: ${report.knownGapsFound.length}`);
  console.log(`\nReport written to: ${reportPath}`);

  if (report.driftDetected) {
    console.log('\n=== WARNINGS ===');
    for (const w of report.warnings) {
      console.log(w);
    }
  }
  if (report.nodeIssues.length > 0) {
    console.log('\n=== NODE ISSUES ===');
    for (const ni of report.nodeIssues) {
      console.log(`  ${ni.node}: ${ni.issues.join('; ')}`);
    }
  }
  if (report.knownGapsFound.length > 0) {
    console.log('\n=== KNOWN GAPS ===');
    for (const kg of report.knownGapsFound) {
      console.log(`  ${kg.node}: ${kg.gaps.join('; ')}`);
    }
  }

  process.exit(report.driftDetected ? 1 : 0);
}

run();
