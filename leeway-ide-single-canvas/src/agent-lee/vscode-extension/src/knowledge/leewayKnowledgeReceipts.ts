/*
LEEWAY HEADER - DO NOT REMOVE

REGION: DATA
TAG: DATA.KNOWLEDGE.RECEIPTS.MAIN
DISCOVERY_PIPELINE: Voice -> Intent -> Location -> Vertical -> Ranking -> Render
*/

import { leewayKnowledgeStore } from "./leewayKnowledgeStore";

export function writeKnowledgeReceipt(input: {
  title: string;
  summary: string;
  action: string;
  files?: string[];
  commands?: string[];
  result: "passed" | "failed" | "blocked" | "pending";
  tags?: string[];
}) {
  return leewayKnowledgeStore.upsert({
    kind: "receipt",
    drive: "R",
    title: input.title,
    summary: input.summary,
    content: JSON.stringify(input, null, 2),
    tags: ["receipt", input.action, input.result, ...(input.tags || [])],
    region: "DATA",
    tag: "DATA.RECEIPT.AGENTLEE.MAIN",
    source: "agent",
    confidence: 1
  });
}
