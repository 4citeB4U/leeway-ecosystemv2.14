/**
 * LEEWAY_VSCODE_AGENTIC_TASK_PLANNER
 *
 * Generates a task execution plan based on classified intent.
 * - Breaks down work into steps
 * - Identifies dependencies
 * - Maps steps to workers and models
 * - No execution, only planning
 */

export interface TaskStep {
  stepId: string;
  sequenceNumber: number;
  description: string;
  targetWorkers: string[];
  targetModels: string[];
  requiredInputs: string[];
  expectedOutputs: string[];
  dependsOnSteps: string[];
  estimatedTime?: number;
}

export interface TaskPlan {
  planId: string;
  taskId: string;
  intentId: string;
  taskDescription: string;
  steps: TaskStep[];
  totalExpectedTime?: number;
  riskLevel: "LOW" | "MEDIUM" | "HIGH";
  requiresApproval: boolean;
  timestamp: string;
}

export class AgenticTaskPlanner {
  /**
   * Generate a task plan from classified intent.
   */
  planTask(input: {
    taskId: string;
    intentId: string;
    classification: string;
    description: string;
    requiredModels: string[];
    requiredWorkers: string[];
    filesToRead: string[];
    filesToEdit: string[];
    expectedOutputs: string[];
    riskLevel: "LOW" | "MEDIUM" | "HIGH";
    requiresApproval: boolean;
  }): TaskPlan {
    const planId = `plan-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const steps: TaskStep[] = [];

    // Step 1: Read files if any
    if (input.filesToRead.length > 0) {
      steps.push({
        stepId: `step-${steps.length + 1}`,
        sequenceNumber: steps.length + 1,
        description: `Read files: ${input.filesToRead.join(", ")}`,
        targetWorkers: ["file-reader"],
        targetModels: [],
        requiredInputs: input.filesToRead,
        expectedOutputs: input.filesToRead.map((f) => `content-of-${f}`),
        dependsOnSteps: [],
      });
    }

    // Step 2: Analyze / Plan
    if (input.classification !== "explain") {
      steps.push({
        stepId: `step-${steps.length + 1}`,
        sequenceNumber: steps.length + 1,
        description: `Analyze task and generate plan for ${input.classification}`,
        targetWorkers: ["analysis", "planning"],
        targetModels: input.requiredModels,
        requiredInputs: steps.length > 0 ? [`output-${steps[0].stepId}`] : [],
        expectedOutputs: ["analysis-report", "execution-plan"],
        dependsOnSteps: steps.length > 0 ? [steps[steps.length - 1].stepId] : [],
      });
    }

    // Step 3: Execute modification if needed
    if (input.filesToEdit.length > 0) {
      steps.push({
        stepId: `step-${steps.length + 1}`,
        sequenceNumber: steps.length + 1,
        description: `Edit files: ${input.filesToEdit.join(", ")}`,
        targetWorkers: ["file-writer"],
        targetModels: input.requiredModels,
        requiredInputs: steps.length > 0 ? [`output-${steps[steps.length - 1].stepId}`] : [],
        expectedOutputs: input.filesToEdit.map((f) => `edited-${f}`),
        dependsOnSteps: steps.length > 0 ? [steps[steps.length - 1].stepId] : [],
      });
    }

    // Step 4: Validation
    steps.push({
      stepId: `step-${steps.length + 1}`,
      sequenceNumber: steps.length + 1,
      description: "Run validation gates",
      targetWorkers: ["gate-validator"],
      targetModels: [],
      requiredInputs: steps.length > 0 ? [`output-${steps[steps.length - 1].stepId}`] : [],
      expectedOutputs: ["validation-report"],
      dependsOnSteps: steps.length > 0 ? [steps[steps.length - 1].stepId] : [],
    });

    // Step 5: Record learning
    steps.push({
      stepId: `step-${steps.length + 1}`,
      sequenceNumber: steps.length + 1,
      description: "Record learning patterns",
      targetWorkers: ["learning-recorder"],
      targetModels: [],
      requiredInputs: [],
      expectedOutputs: ["learning-record"],
      dependsOnSteps: steps.length > 0 ? [steps[steps.length - 1].stepId] : [],
    });

    const plan: TaskPlan = {
      planId,
      taskId: input.taskId,
      intentId: input.intentId,
      taskDescription: input.description,
      steps,
      totalExpectedTime: steps.length * 5, // Rough estimate
      riskLevel: input.riskLevel,
      requiresApproval: input.requiresApproval,
      timestamp: new Date().toISOString(),
    };

    return plan;
  }

  /**
   * Get the execution order of steps.
   */
  getExecutionOrder(plan: TaskPlan): TaskStep[] {
    // Return steps in sequence order (already planned that way)
    return plan.steps.sort((a, b) => a.sequenceNumber - b.sequenceNumber);
  }

  /**
   * Validate step dependencies are satisfied.
   */
  validateDependencies(plan: TaskPlan): { valid: boolean; issues: string[] } {
    const issues: string[] = [];
    const stepIds = new Set(plan.steps.map((s) => s.stepId));

    for (const step of plan.steps) {
      for (const depId of step.dependsOnSteps) {
        if (!stepIds.has(depId)) {
          issues.push(`Step ${step.stepId} depends on missing step ${depId}`);
        }
      }
    }

    return { valid: issues.length === 0, issues };
  }
}

export const createTaskPlanner = (): AgenticTaskPlanner => {
  return new AgenticTaskPlanner();
};
