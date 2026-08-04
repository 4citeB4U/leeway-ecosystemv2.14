const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const GIT_ROOT = path.resolve('D:\\Leeway-Ecosystem v2.1.4');
const OUT_DIR = __dirname;

function hashFile(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function resolveSource(rel) {
  const abs = path.join(GIT_ROOT, rel);
  return fs.existsSync(abs) ? abs : null;
}

const DOCUMENTS = [
  {
    id: 'doc-constitution',
    name: 'LeeWay Constitution Law (BOOK-01)',
    sourcePath: 'LeeWay-Standards/standards/BOOK-01-LEEWAY-CONSTITUTION-LAW.md',
    sourceType: 'constitution',
    classification: 'CONFIRMED',
    family: 'constitution',
    description: 'Supreme law of the LeeWay Ecosystem: LeeWay Standards above every agent, model, worker, container, script, route, runtime and UI component.'
  },
  {
    id: 'doc-book-company-authority',
    name: 'Company Authority Law (BOOK-02)',
    sourcePath: 'LeeWay-Standards/standards/BOOK-02-LEEWAY-COMPANY-AUTHORITY-LAW.md',
    sourceType: 'law',
    classification: 'CONFIRMED',
    family: 'law',
    description: 'Company authority law defining creator and operator authority.'
  },
  {
    id: 'doc-book-runtime-authority',
    name: 'Runtime Authority Law (BOOK-03)',
    sourcePath: 'LeeWay-Standards/standards/BOOK-03-LEEWAY-RUNTIME-AUTHORITY-LAW.md',
    sourceType: 'law',
    classification: 'CONFIRMED',
    family: 'law',
    description: 'Runtime authority law: Docker is the portable runtime body, not the authority.'
  },
  {
    id: 'doc-book-agent-law',
    name: 'Agent Law (BOOK-09)',
    sourcePath: 'LeeWay-Standards/standards/BOOK-09-LEEWAY-AGENT-LAW.md',
    sourceType: 'law',
    classification: 'CONFIRMED',
    family: 'law',
    description: 'Agent law governing agent identity, contracts and embodiment.'
  },
  {
    id: 'doc-book-telemetry-receipts',
    name: 'Telemetry Receipts Evidence Law (BOOK-14)',
    sourcePath: 'LeeWay-Standards/standards/BOOK-14-LEEWAY-TELEMETRY-RECEIPTS-EVIDENCE-LAW.md',
    sourceType: 'law',
    classification: 'CONFIRMED',
    family: 'law',
    description: 'Telemetry, receipts and evidence law: no action proof without receipt.'
  },
  {
    id: 'doc-book-gates-validation',
    name: 'Gates Validation Law (BOOK-15)',
    sourcePath: 'LeeWay-Standards/standards/BOOK-15-LEEWAY-GATES-VALIDATION-LAW.md',
    sourceType: 'law',
    classification: 'CONFIRMED',
    family: 'law',
    description: 'Gates and validation law for proof-before-completion.'
  },
  {
    id: 'doc-book-runtime-readiness',
    name: 'Runtime Readiness Law (BOOK-25)',
    sourcePath: 'LeeWay-Standards/standards/BOOK-25-RUNTIME-READINESS-LAW.md',
    sourceType: 'law',
    classification: 'CONFIRMED',
    family: 'law',
    description: 'Runtime readiness law covering startup dependency graphs and readiness gates.'
  },
  {
    id: 'doc-training-book',
    name: 'LeeWay Standards 2-Week Training Book',
    sourcePath: 'LeeWay-Standards/LEEWAY_STANDARDS_2_WEEK_TRAINING_BOOK.md',
    sourceType: 'white-paper',
    classification: 'CONFIRMED',
    family: 'teaching',
    description: 'Company teaching package: two-week training curriculum for LeeWay Standards.'
  },
  {
    id: 'doc-standards-readme',
    name: 'LeeWay Standards README',
    sourcePath: 'LeeWay-Standards/README.md',
    sourceType: 'white-paper',
    classification: 'CONFIRMED',
    family: 'teaching',
    description: 'LeeWay Standards overview and operating manual entry point.'
  },
  {
    id: 'doc-standards-activate',
    name: 'LeeWay Standards Activation Guide',
    sourcePath: 'LeeWay-Standards/ACTIVATE.md',
    sourceType: 'white-paper',
    classification: 'CONFIRMED',
    family: 'teaching',
    description: 'Activation guide for bringing LeeWay Standards online.'
  },
  {
    id: 'doc-contract-proof-first',
    name: 'Proof-First Readiness Contract',
    sourcePath: 'agent-lee-coding-mode/contracts/leeway-proof-first-readiness-contract.md',
    sourceType: 'contract',
    classification: 'CONFIRMED',
    family: 'contract',
    description: 'Contract: no PASS/READY/COMPLETE claim without required proof level.'
  },
  {
    id: 'doc-contract-no-pass-without-proof',
    name: 'No Pass Without Proof Contract',
    sourcePath: 'agent-lee-coding-mode/contracts/leeway-no-pass-without-proof-contract.md',
    sourceType: 'contract',
    classification: 'CONFIRMED',
    family: 'contract',
    description: 'Contract: no gate passes without proof ledger entries.'
  },
  {
    id: 'doc-contract-absolute-proof',
    name: 'Absolute Proof and No False Completion Law',
    sourcePath: 'agent-lee-coding-mode/contracts/leeway-absolute-proof-law.md',
    sourceType: 'law',
    classification: 'CONFIRMED',
    family: 'contract',
    description: 'Absolute proof law: proof levels 0-5 and downgrade rules.'
  },
  {
    id: 'doc-contract-proof-or-blocker',
    name: 'Proof or Blocker Contract',
    sourcePath: 'agent-lee-coding-mode/contracts/leeway-proof-or-blocker-contract.md',
    sourceType: 'contract',
    classification: 'CONFIRMED',
    family: 'contract',
    description: 'Contract: every claim is either proof-backed or a blocker.'
  },
  {
    id: 'doc-contract-owner-identity',
    name: 'Agent Lee Owner Identity Contract',
    sourcePath: 'agent-lee-coding-mode/contracts/agent-lee-owner-identity-contract.md',
    sourceType: 'contract',
    classification: 'CONFIRMED',
    family: 'contract',
    description: 'Owner identity contract for Agent Lee embodiment.'
  },
  {
    id: 'doc-contract-live-embodiment',
    name: 'Agent Lee Live Embodiment Contract',
    sourcePath: 'agent-lee-coding-mode/contracts/agent-lee-live-embodiment-contract.md',
    sourceType: 'contract',
    classification: 'CONFIRMED',
    family: 'contract',
    description: 'Live embodiment contract: ears, eyes, mouth, hands and proofs.'
  },
  {
    id: 'doc-contract-bluetooth',
    name: 'Agent Lee Bluetooth Discovery Contract',
    sourcePath: 'agent-lee-coding-mode/contracts/agent-lee-bluetooth-discovery-contract.md',
    sourceType: 'contract',
    classification: 'PROBABLE',
    family: 'contract',
    description: 'Bluetooth peripheral discovery contract - small contract, needs human review for inclusion.'
  },
  {
    id: 'doc-contract-cursor-rule',
    name: 'Agent Lee Cursor Separation Rule',
    sourcePath: 'agent-lee-coding-mode/contracts/agent-lee-cursor-separation-rule.md',
    sourceType: 'rule',
    classification: 'AMBIGUOUS',
    family: 'contract',
    description: 'Cursor separation rule - classification as governance document is ambiguous.'
  }
];

function buildDelta() {
  const now = new Date().toISOString();
  const confirmed = DOCUMENTS.filter(d => d.classification === 'CONFIRMED');
  const reviewable = DOCUMENTS.filter(d => d.classification !== 'CONFIRMED');

  const proposedNodes = confirmed.map((d, i) => {
    const abs = resolveSource(d.sourcePath);
    const rel = d.sourcePath;
    return {
      id: d.id,
      name: d.name,
      category: 'document',
      status: 'DEFINED',
      truthLevel: abs ? 'PROVEN' : 'UNKNOWN',
      owner: 'leeway-standards',
      version: '1.0.0',
      health: 'UNKNOWN',
      description: d.description,
      sourcePaths: [rel],
      documentation: [rel],
      knownGaps: abs ? [] : ['Source file missing'],
      sourcePath: rel,
      sourceHash: abs ? hashFile(abs) : null,
      sourceType: d.sourceType,
      extractionMethod: 'deterministic-native',
      verificationStatus: d.classification,
      confidence: abs ? 'verified' : 'unknown',
      lastVerified: now,
      evidenceReferences: ''
    };
  });

  const proposedRelationships = [];
  for (const n of proposedNodes) {
    proposedRelationships.push({
      id: `rel-doc-${n.id}`,
      from: 'knowledge-fabric-documentation-graph',
      to: n.id,
      type: 'contains',
      direction: 'forward',
      status: 'DEFINED'
    });
    proposedRelationships.push({
      id: `rel-standards-doc-${n.id}`,
      from: 'leeway-standards',
      to: n.id,
      type: 'governs',
      direction: 'forward',
      status: 'DEFINED'
    });
  }

  const delta = {
    timestamp: now,
    status: 'PROPOSED',
    description: `Document population: ${confirmed.length} confirmed documents from LeeWay Standards, contracts and teaching package; ${reviewable.length} candidates queued for human review.`,
    proposedNodes,
    proposedRelationships,
    classification: {
      CONFIRMED: proposedNodes.map(n => n.id),
      STRONG: [],
      PROBABLE: reviewable.filter(d => d.classification === 'PROBABLE').map(d => d.id),
      AMBIGUOUS: reviewable.filter(d => d.classification === 'AMBIGUOUS').map(d => d.id),
      REJECTED: []
    },
    reviewQueue: reviewable.map(d => ({
      candidateId: d.id,
      name: d.name,
      sourcePath: d.sourcePath,
      classification: d.classification,
      reason: `Not auto-applied. Classification ${d.classification} requires human approval.`
    }))
  };

  const deltaPath = path.join(OUT_DIR, 'generated', 'knowledge-fabric-documents-delta.json');
  fs.mkdirSync(path.dirname(deltaPath), { recursive: true });
  fs.writeFileSync(deltaPath, JSON.stringify(delta, null, 2), 'utf-8');
  return deltaPath;
}

const deltaPath = buildDelta();
console.log(`Document delta written: ${deltaPath}`);
console.log(`Confirmed documents: ${DOCUMENTS.filter(d => d.classification === 'CONFIRMED').length}`);
console.log(`Review queue candidates: ${DOCUMENTS.filter(d => d.classification !== 'CONFIRMED').length}`);
