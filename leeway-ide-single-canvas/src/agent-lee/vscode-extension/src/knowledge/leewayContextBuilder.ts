/*
LEEWAY HEADER - DO NOT REMOVE

REGION: AI
TAG: AI.KNOWLEDGE.CONTEXT.BUILDER
DISCOVERY_PIPELINE: Voice -> Intent -> Location -> Vertical -> Ranking -> Render
*/

import type { LeeWayContextPack } from "./leewayKnowledge.types";
import { leewayKnowledgeStore } from "./leewayKnowledgeStore";

export function buildLeeWayContextPack(query: string): LeeWayContextPack {
  const instructions = leewayKnowledgeStore.search({ query, kinds: ["instruction"], maxResults: 6 }).map((match) => match.record);
  const files = leewayKnowledgeStore.search({ query, kinds: ["file", "symbol"], maxResults: 12 }).map((match) => match.record);
  const tools = leewayKnowledgeStore.search({ query, kinds: ["plugin", "database"], maxResults: 8 }).map((match) => match.record);
  const errors = leewayKnowledgeStore.search({ query, kinds: ["error", "verification"], maxResults: 8 }).map((match) => match.record);
  const receipts = leewayKnowledgeStore.search({ query, kinds: ["receipt", "decision"], maxResults: 8 }).map((match) => match.record);

  return {
    query,
    instructions,
    files,
    tools,
    errors,
    receipts,
    summary: [
      `Instructions: ${instructions.length}`,
      `Files: ${files.length}`,
      `Tools: ${tools.length}`,
      `Errors: ${errors.length}`,
      `Receipts: ${receipts.length}`
    ].join(" | ")
  };
}

export function formatContextPackForPrompt(pack: LeeWayContextPack) {
  return [
    "LEEWAY CONTEXT PACK",
    `QUERY: ${pack.query}`,
    `SUMMARY: ${pack.summary}`,
    "",
    "PROJECT INSTRUCTIONS:",
    ...pack.instructions.map((record) => `- ${record.title}: ${record.summary}`),
    "",
    "RELEVANT FILES:",
    ...pack.files.map((record) => `- ${record.path || record.title}: ${record.summary}`),
    "",
    "TOOLS / PLUGINS:",
    ...pack.tools.map((record) => `- ${record.title}: ${record.summary}`),
    "",
    "RECENT ERRORS / VERIFICATION:",
    ...pack.errors.map((record) => `- ${record.title}: ${record.summary}`),
    "",
    "RECEIPTS / PRIOR DECISIONS:",
    ...pack.receipts.map((record) => `- ${record.title}: ${record.summary}`)
  ].join("\n");
}
