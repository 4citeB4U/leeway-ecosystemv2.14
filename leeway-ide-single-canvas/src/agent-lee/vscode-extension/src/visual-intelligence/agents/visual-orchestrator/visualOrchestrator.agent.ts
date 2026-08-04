/*
LEEWAY_HEADER - DO NOT REMOVE

REGION: 🧠 AI
TAG: AI.VISUAL.ORCHESTRATOR.AGENT
PURPOSE: Sovereign Leeway Visual Orchestrator Agent for routing LVIS workflows and blocking fake success.
DISCOVERY_PIPELINE:
  Voice → Intent → Location → Vertical → Ranking → Render
*/

import { createBaseReceipt, validateReceiptSchema } from "../../system/LVIS.schemas";
import { writeLvisJsonReceipt } from "../../runtime/visualReceipts";
import { runVisualTaskBroker } from "../../runtime/visualTaskBroker";
import { classifyVisualRequest } from "./visualOrchestrator.tools";

export async function runVisualOrchestratorAgent(input: { request: string; payload: any; outputRoot?: string }) {
  const workflow = classifyVisualRequest(input.request);
  const receipt = createBaseReceipt(workflow);
  const result = await runVisualTaskBroker(workflow, input.payload);
  const resultScore = typeof (result as { score?: unknown }).score === "number" ? Number((result as { score: number }).score) : 0;
  receipt.workersUsed = Array.from(new Set(JSON.stringify(result).match(/leeway-[a-z-]+/g) || []));
  receipt.validation.schemaValid = validateReceiptSchema(receipt);
  receipt.quality.score = resultScore;
  receipt.quality.passed = resultScore > 0;
  if (input.outputRoot) {
    receipt.outputFiles.push(writeLvisJsonReceipt(input.outputRoot, receipt));
  }
  receipt.governance.receiptWritten = true;
  return { workflow, result, receipt };
}
