/**
 * LEEWAY_VSCODE_AGENTIC_STANDARDS_RESOLVER
 *
 * Resolves applicable LeeWay Standards for the current workflow context.
 * - Loads BOOK-54, BOOK-55 context
 * - Validates action against standards
 * - Blocks action if standards are violated
 */

export interface StandardsContext {
  standardsSetId: string;
  applicableBooks: string[];
  assistantEmbodimentValid: boolean;
  recordingAndLearningValid: boolean;
  gatesRequired: string[];
  receiptPolicies: Record<string, string>;
  timestamp: string;
}

export class AgenticStandardsResolver {
  private applicableStandards: Map<string, string> = new Map();

  constructor() {
    // Initialize standards mappings
    this.applicableStandards.set(
      "BOOK-54",
      "BOOK-54-ASSISTANT-EMBODIMENT-AND-BEHAVIOR-LAW"
    );
    this.applicableStandards.set(
      "BOOK-55",
      "BOOK-55-ASSISTANT-RECORDING-AND-LEARNING-LAW"
    );
  }

  /**
   * Load standards context for the current workflow.
   */
  loadStandardsContext(input: {
    taskId: string;
    intentId: string;
    requiredStandards?: string[];
  }): StandardsContext {
    const standardsSetId = `standards-${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    // Always apply BOOK-54 and BOOK-55
    const applicableBooks = [
      "BOOK-54",
      "BOOK-55",
      ...(input.requiredStandards || []),
    ];

    const context: StandardsContext = {
      standardsSetId,
      applicableBooks,
      assistantEmbodimentValid: true,
      recordingAndLearningValid: true,
      gatesRequired: [
        "action-disclosure",
        "standards-compliance",
        "model-authorization",
      ],
      receiptPolicies: {
        "BOOK-54": "Required for all agentic actions",
        "BOOK-55": "Required for learning and recording",
      },
      timestamp: new Date().toISOString(),
    };

    return context;
  }

  /**
   * Validate action against standards context.
   */
  validateActionAgainstStandards(
    context: StandardsContext,
    action: any
  ): { valid: boolean; violations: string[] } {
    const violations: string[] = [];

    // Check that standards are acknowledged
    if (!context.applicableBooks.includes("BOOK-54")) {
      violations.push(
        "BOOK-54 (Assistant Embodiment and Behavior) not in applicable standards"
      );
    }

    if (!context.applicableBooks.includes("BOOK-55")) {
      violations.push(
        "BOOK-55 (Assistant Recording and Learning) not in applicable standards"
      );
    }

    // Check that required gates are in place
    if (!action.gatesToRun || action.gatesToRun.length === 0) {
      violations.push("No gates specified for action execution");
    }

    // Check that receipts will be written
    if (!action.receiptsToWrite || action.receiptsToWrite.length === 0) {
      violations.push("No receipts specified for action");
    }

    return {
      valid: violations.length === 0,
      violations,
    };
  }

  /**
   * Require standards validation.
   */
  requireStandardsValidation(
    context: StandardsContext,
    action: any
  ): void {
    const validation = this.validateActionAgainstStandards(context, action);

    if (!validation.valid) {
      throw new Error(
        `AgenticStandardsResolver: Standards violations: ${validation.violations.join(
          ", "
        )}. Failing closed.`
      );
    }
  }

  /**
   * Get applicable standards for task type.
   */
  getApplicableStandards(taskType: string): string[] {
    // All agentic workflows require BOOK-54 and BOOK-55
    const baseStandards = ["BOOK-54", "BOOK-55"];

    // Add task-specific standards
    if (
      taskType.includes("code-generation") ||
      taskType.includes("code-modification")
    ) {
      baseStandards.push("BOOK-56"); // Code Quality Standards (if exists)
    }

    if (taskType.includes("deployment") || taskType.includes("infrastructure")) {
      baseStandards.push("BOOK-57"); // Deployment Standards (if exists)
    }

    return baseStandards;
  }
}

export const createStandardsResolver = (): AgenticStandardsResolver => {
  return new AgenticStandardsResolver();
};
