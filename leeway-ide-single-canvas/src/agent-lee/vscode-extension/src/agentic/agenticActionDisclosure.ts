/**
 * LEEWAY_VSCODE_AGENTIC_ACTION_DISCLOSURE
 *
 * Discloses every planned action before execution.
 * - All required fields must be present
 * - Missing fields block execution
 * - No silent assumptions
 * - Creates receipt-ready evidence
 */

export interface ActionDisclosure {
  workflowRunId: string;
  actionId: string;
  taskId: string;
  intentId: string;
  agentId: string;
  standardsAuthorityIds: string[];
  filesToRead: string[];
  filesToEdit: string[];
  toolsToUse: string[];
  commandsToRun: string[];
  modelRoutesToUse: string[];
  workersToInvoke: string[];
  gatesToRun: string[];
  receiptsToWrite: string[];
  riskLevel: "LOW" | "MEDIUM" | "HIGH";
  expectedOutputs: string[];
  failClosedConditions: string[];
  approvalRequired: boolean;
  creatorApprovalState: "pending" | "approved" | "rejected";
  timestamp: string;
  isComplete: boolean;
}

export class AgenticActionDisclosure {
  /**
   * Validate that all required fields are present in action disclosure.
   */
  validateDisclosure(disclosure: ActionDisclosure): { valid: boolean; missingFields: string[] } {
    const required = [
      "workflowRunId",
      "actionId",
      "taskId",
      "intentId",
      "agentId",
      "standardsAuthorityIds",
      "filesToRead",
      "filesToEdit",
      "toolsToUse",
      "commandsToRun",
      "modelRoutesToUse",
      "workersToInvoke",
      "gatesToRun",
      "receiptsToWrite",
      "riskLevel",
      "expectedOutputs",
      "failClosedConditions",
      "approvalRequired",
      "creatorApprovalState",
      "timestamp",
    ];

    const missingFields: string[] = [];

    for (const field of required) {
      const value = (disclosure as any)[field];
      if (value === undefined || value === null) {
        missingFields.push(field);
      }
      // Arrays and strings should not be empty
      if (Array.isArray(value) && value.length === 0) {
        // Some fields can be empty (like filesToEdit, commandsToRun)
        if (!["filesToEdit", "commandsToRun", "workersToInvoke"].includes(field)) {
          missingFields.push(`${field} (empty)`);
        }
      }
    }

    return {
      valid: missingFields.length === 0,
      missingFields,
    };
  }

  /**
   * Require approval if specified.
   */
  requireApprovalIfNeeded(disclosure: ActionDisclosure): void {
    if (disclosure.approvalRequired && disclosure.creatorApprovalState !== "approved") {
      throw new Error(
        `AgenticActionDisclosure: Creator approval required but not granted for action ${disclosure.actionId}. Failing closed.`
      );
    }
  }

  /**
   * Require complete disclosure before execution.
   */
  requireCompleteDisclosure(disclosure: ActionDisclosure): void {
    const validation = this.validateDisclosure(disclosure);

    if (!validation.valid) {
      throw new Error(
        `AgenticActionDisclosure: Incomplete action disclosure. Missing fields: ${validation.missingFields.join(
          ", "
        )}. Failing closed.`
      );
    }

    if (!disclosure.isComplete) {
      throw new Error(
        `AgenticActionDisclosure: Action disclosure not marked complete for action ${disclosure.actionId}. Failing closed.`
      );
    }
  }

  /**
   * Create a new action disclosure.
   */
  createDisclosure(input: {
    workflowRunId: string;
    actionId: string;
    taskId: string;
    intentId: string;
    agentId: string;
    standardsAuthorityIds: string[];
    filesToRead: string[];
    filesToEdit?: string[];
    toolsToUse: string[];
    commandsToRun?: string[];
    modelRoutesToUse: string[];
    workersToInvoke?: string[];
    gatesToRun: string[];
    receiptsToWrite: string[];
    riskLevel: "LOW" | "MEDIUM" | "HIGH";
    expectedOutputs: string[];
    failClosedConditions: string[];
    approvalRequired: boolean;
    creatorApprovalState?: "pending" | "approved" | "rejected";
  }): ActionDisclosure {
    const disclosure: ActionDisclosure = {
      workflowRunId: input.workflowRunId,
      actionId: input.actionId,
      taskId: input.taskId,
      intentId: input.intentId,
      agentId: input.agentId,
      standardsAuthorityIds: input.standardsAuthorityIds,
      filesToRead: input.filesToRead,
      filesToEdit: input.filesToEdit || [],
      toolsToUse: input.toolsToUse,
      commandsToRun: input.commandsToRun || [],
      modelRoutesToUse: input.modelRoutesToUse,
      workersToInvoke: input.workersToInvoke || [],
      gatesToRun: input.gatesToRun,
      receiptsToWrite: input.receiptsToWrite,
      riskLevel: input.riskLevel,
      expectedOutputs: input.expectedOutputs,
      failClosedConditions: input.failClosedConditions,
      approvalRequired: input.approvalRequired,
      creatorApprovalState: input.creatorApprovalState || "pending",
      timestamp: new Date().toISOString(),
      isComplete: false,
    };

    return disclosure;
  }

  /**
   * Mark disclosure as complete.
   */
  markComplete(disclosure: ActionDisclosure): ActionDisclosure {
    disclosure.isComplete = true;
    return disclosure;
  }
}

export const createActionDisclosure = (): AgenticActionDisclosure => {
  return new AgenticActionDisclosure();
};
