/*
LEEWAY HEADER — DO NOT REMOVE

REGION: CORE
TAG: CORE.SCRIPTS.SYNC_LEEWAY_HIVEMIND.MAIN
DESCRIPTION: Builds runtime HiveMind manifest from external Leeway systems.
AUTHORITY: Leeway Industries
DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render

5WH:
WHAT = Sync script for Agent Lee HiveMind capabilities
WHY = Load full Leeway intelligence from external product directories for MVP runtime
WHO = Leeway Industries / Agent Lee Runtime
WHERE = scripts/sync-leeway-hivemind.mjs
WHEN = 2026-04-29
HOW = Reads external governance/agent artifacts and emits public/leeway-hivemind.json

CHAIN: Standards → Integrated → Runtime → Projections
LICENSE: PROPRIETARY
*/

import fs from 'node:fs/promises';
import path from 'node:path';

const SOURCES = [
  'E:/.Leeway-new-line-of-products/leeway-employment-center',
  'E:/.Leeway-new-line-of-products/Agent-Lee-The-Sum-of-All-Systems',
];

const CANDIDATE_FILES = [
  '.leeway/registry.json',
  '.leeway/layer-policy.json',
  '.leeway/config.json',
  'AGENTS.md',
  'AGENT_VM_SPEC.md',
  'UNIFIED_SYSTEM_DOCUMENTATION.md',
  'SYSTEM_ARCHITECTURE.md',
  'governance-compliance-report.json',
  'src/core/leewayGovernanceGate.ts',
  'leeway-agents/src/core/governanceEnforcer.ts',
  'src/core/seeds/agentCrewSeed.ts',
];

const DEFAULT_INTENT_MAP = [
  {
    intent: 'document_to_video_pipeline',
    keywords: ['pdf', 'document', 'convert', 'pipeline', 'movie', 'video'],
    nodeSequence: ['pdf_to_story', 'story_to_script', 'script_to_images', 'images_to_movie'],
    ownerAgent: 'Agent Lee Orchestrator',
  },
  {
    intent: 'social_distribution',
    keywords: ['social', 'instagram', 'tiktok', 'youtube', 'facebook', 'linkedin', 'post'],
    nodeSequence: ['agent_lee_social'],
    ownerAgent: 'Dispatch Center',
  },
  {
    intent: 'thumbnail_refinement',
    keywords: ['thumbnail', 'thumb', 'cover'],
    nodeSequence: ['image_to_thumb_raw', 'thumb_best_pick'],
    ownerAgent: 'Skill Capability Layer',
  },
  {
    intent: 'blog_expansion',
    keywords: ['blog', 'article', 'write-up', 'summary'],
    nodeSequence: ['movie_to_blog'],
    ownerAgent: 'Persistence + Narrative Cortex',
  },
];

function normalizeAgentName(raw) {
  return raw
    .replace(/\.(ts|tsx|js|jsx|mjs|cjs|md|json)$/i, '')
    .replace(/[-_]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function isLikelyAgentLabel(name) {
  if (!name) return false;
  if (name.length < 4 || name.length > 60) return false;
  const words = name.split(/\s+/).filter(Boolean);
  if (words.length > 6) return false;
  if (!/(agent|cortex|sentinel|orchestrator|governor|router|hivemind)/i.test(name)) return false;
  return true;
}

async function readIfExists(filePath) {
  try {
    return await fs.readFile(filePath, 'utf8');
  } catch {
    return null;
  }
}

function extractAgentsFromRegistry(raw, bucket) {
  try {
    const data = JSON.parse(raw);
    const addName = (value) => {
      if (typeof value !== 'string') return;
      if (!/agent|cortex|sentinel|govern|orchestr|router|hive/i.test(value)) return;
      bucket.add(normalizeAgentName(path.basename(value)));
    };

    if (data && typeof data === 'object') {
      for (const value of Object.values(data)) {
        if (typeof value === 'string') addName(value);
      }
    }

    if (data?.files && typeof data.files === 'object') {
      for (const key of Object.keys(data.files)) addName(key);
    }
  } catch {
    // Non-fatal parse failures; continue with other sources.
  }
}

function extractAgentsFromText(raw, bucket) {
  const matches = raw.match(/\b([A-Z][A-Za-z0-9\- ]*(Agent|Cortex|Sentinel|Orchestrator|Governor|Router|Registry|HiveMind))\b/g);
  if (!matches) return;
  for (const match of matches) {
    const normalized = normalizeAgentName(match);
    if (isLikelyAgentLabel(normalized)) {
      bucket.add(normalized);
    }
  }
}

async function buildManifest() {
  const sourceSummaries = [];
  const discoveredAgents = new Set();
  const discoveredArtifacts = [];

  for (const sourceRoot of SOURCES) {
    const summary = {
      sourceRoot,
      exists: false,
      artifactsRead: 0,
      artifactsFound: [],
    };

    try {
      await fs.access(sourceRoot);
      summary.exists = true;
    } catch {
      sourceSummaries.push(summary);
      continue;
    }

    for (const relativeFile of CANDIDATE_FILES) {
      const fullPath = path.join(sourceRoot, relativeFile);
      const content = await readIfExists(fullPath);
      if (!content) continue;

      summary.artifactsRead += 1;
      summary.artifactsFound.push(relativeFile);
      discoveredArtifacts.push(fullPath);

      if (relativeFile.endsWith('.json')) {
        extractAgentsFromRegistry(content, discoveredAgents);
      }
      extractAgentsFromText(content, discoveredAgents);
    }

    sourceSummaries.push(summary);
  }

  const manifest = {
    schemaVersion: '1.0.0',
    generatedAt: new Date().toISOString(),
    authority: 'Leeway Industries',
    persona: 'Agent Lee',
    lane: 'hivemind',
    sources: sourceSummaries,
    discoveredArtifacts,
    agentRoster: Array.from(discoveredAgents).sort(),
    intentMap: DEFAULT_INTENT_MAP,
  };

  return manifest;
}

async function main() {
  const manifest = await buildManifest();
  const outPath = path.resolve('public/leeway-hivemind.json');
  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await fs.writeFile(outPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

  const sourceCount = manifest.sources.filter((s) => s.exists).length;
  console.log(`[hivemind-sync] sources available: ${sourceCount}/${manifest.sources.length}`);
  console.log(`[hivemind-sync] discovered agents: ${manifest.agentRoster.length}`);
  console.log(`[hivemind-sync] wrote ${outPath}`);
}

main().catch((error) => {
  console.error('[hivemind-sync] failed:', error.message);
  process.exit(1);
});
