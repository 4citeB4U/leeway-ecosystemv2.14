/**
 * LEEWAY_VSCODE_AGENTIC_RECEIPT_WRITER
 *
 * Writes receipt evidence for every action, state change, and gate result.
 * - One receipt per action or event
 * - No aggregation or summarization
 * - Every receipt references workflow, standards, model routes
 * - Receipts are immutable after writing
 */

export interface Receipt {
  receiptId: string;
  assistantBodyId: string;
  assistantObjectId: string;
  workflowRunId: string;
  actionId?: string;
  taskId?: string;
  intentId?: string;
  standardsAuthorityIds: string[];
  timestamp: string;
  eventType:
    | "workflow-initialized"
    | "intent-classified"
    | "disclosure-created"
    | "disclosure-approved"
    | "action-started"
    | "model-team-routing-complete"
    | "worker-invoked"
    | "gate-passed"
    | "gate-blocked"
    | "file-read"
    | "file-edited"
    | "command-executed"
    | "learning-recorded"
    | "workflow-complete"
    | "workflow-blocked";
  statusCode: "SUCCESS" | "BLOCKED" | "PARTIAL";
  evidence: Record<string, any>;
  modelRoutesUsed: string[];
  workersInvoked: string[];
  filesAffected: string[];
  commandsRun: string[];
  gatesRun: string[];
  failClosedCondition?: string;
}

export class AgenticReceiptWriter {
  private receipts: Receipt[] = [];

  /**
   * Write a new receipt.
   */
  writeReceipt(input: {
    assistantBodyId: string;
    assistantObjectId: string;
    workflowRunId: string;
    actionId?: string;
    taskId?: string;
    intentId?: string;
    standardsAuthorityIds: string[];
    eventType: Receipt["eventType"];
    statusCode: "SUCCESS" | "BLOCKED" | "PARTIAL";
    evidence: Record<string, any>;
    modelRoutesUsed?: string[];
    workersInvoked?: string[];
    filesAffected?: string[];
    commandsRun?: string[];
    gatesRun?: string[];
    failClosedCondition?: string;
  }): Receipt {
    const receipt: Receipt = {
      receiptId: `receipt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      assistantBodyId: input.assistantBodyId,
      assistantObjectId: input.assistantObjectId,
      workflowRunId: input.workflowRunId,
      actionId: input.actionId,
      taskId: input.taskId,
      intentId: input.intentId,
      standardsAuthorityIds: input.standardsAuthorityIds,
      timestamp: new Date().toISOString(),
      eventType: input.eventType,
      statusCode: input.statusCode,
      evidence: input.evidence,
      modelRoutesUsed: input.modelRoutesUsed || [],
      workersInvoked: input.workersInvoked || [],
      filesAffected: input.filesAffected || [],
      commandsRun: input.commandsRun || [],
      gatesRun: input.gatesRun || [],
      failClosedCondition: input.failClosedCondition,
    };

    this.receipts.push(receipt);
    return receipt;
  }

  /**
   * Get all receipts for a workflow run.
   */
  getReceiptsForWorkflow(workflowRunId: string): Receipt[] {
    return this.receipts.filter((r) => r.workflowRunId === workflowRunId);
  }

  /**
   * Get receipt by ID.
   */
  getReceiptById(receiptId: string): Receipt | undefined {
    return this.receipts.find((r) => r.receiptId === receiptId);
  }

  /**
   * Get all receipts.
   */
  getAllReceipts(): Receipt[] {
    return [...this.receipts];
  }

  /**
   * Export receipts as JSON.
   */
  exportAsJSON(): string {
    return JSON.stringify(this.receipts, null, 2);
  }

  /**
   * Export receipts for a workflow run.
   */
  exportWorkflowReceipts(workflowRunId: string): string {
    const workflowReceipts = this.getReceiptsForWorkflow(workflowRunId);
    return JSON.stringify(workflowReceipts, null, 2);
  }
}

export const createReceiptWriter = (): AgenticReceiptWriter => {
  return new AgenticReceiptWriter();
};
