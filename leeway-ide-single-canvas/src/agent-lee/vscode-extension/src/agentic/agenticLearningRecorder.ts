/**
 * LEEWAY_VSCODE_AGENTIC_LEARNING_RECORDER
 *
 * Records learning patterns from workflow executions.
 * - Every workflow contributes to learned patterns
 * - Patterns inform future task classification and routing
 * - No mutation of learning data
 */

export interface LearningPattern {
  patternId: string;
  taskType: string;
  classification: string;
  successCount: number;
  failureCount: number;
  averageExecutionTime?: number;
  associatedModels: string[];
  associatedWorkers: string[];
  lastUpdated: string;
}

export interface ExecutionLearning {
  learningId: string;
  workflowRunId: string;
  taskId: string;
  classification: string;
  actualExecutionTime: number;
  success: boolean;
  modelsUsed: string[];
  workersUsed: string[];
  timestamp: string;
  insights: string[];
}

export class AgenticLearningRecorder {
  private patterns: Map<string, LearningPattern> = new Map();
  private executions: ExecutionLearning[] = [];

  /**
   * Record learning from a workflow execution.
   */
  recordExecution(input: {
    workflowRunId: string;
    taskId: string;
    classification: string;
    actualExecutionTime: number;
    success: boolean;
    modelsUsed: string[];
    workersUsed: string[];
    insights?: string[];
  }): ExecutionLearning {
    const learning: ExecutionLearning = {
      learningId: `learning-${Date.now()}-${Math.random()
        .toString(36)
        .substr(2, 9)}`,
      workflowRunId: input.workflowRunId,
      taskId: input.taskId,
      classification: input.classification,
      actualExecutionTime: input.actualExecutionTime,
      success: input.success,
      modelsUsed: input.modelsUsed,
      workersUsed: input.workersUsed,
      timestamp: new Date().toISOString(),
      insights: input.insights || [],
    };

    this.executions.push(learning);
    this.updatePattern(input.classification, input.success, input.modelsUsed);

    return learning;
  }

  /**
   * Update learning pattern based on execution.
   */
  private updatePattern(
    classification: string,
    success: boolean,
    modelsUsed: string[]
  ): void {
    let pattern = this.patterns.get(classification);

    if (!pattern) {
      pattern = {
        patternId: `pattern-${Date.now()}`,
        taskType: classification,
        classification,
        successCount: 0,
        failureCount: 0,
        associatedModels: modelsUsed,
        associatedWorkers: [],
        lastUpdated: new Date().toISOString(),
      };
      this.patterns.set(classification, pattern);
    }

    if (success) {
      pattern.successCount++;
    } else {
      pattern.failureCount++;
    }

    // Update model associations
    for (const model of modelsUsed) {
      if (!pattern.associatedModels.includes(model)) {
        pattern.associatedModels.push(model);
      }
    }

    pattern.lastUpdated = new Date().toISOString();
  }

  /**
   * Get learning patterns.
   */
  getPatterns(): LearningPattern[] {
    return Array.from(this.patterns.values());
  }

  /**
   * Get pattern by classification.
   */
  getPattern(classification: string): LearningPattern | undefined {
    return this.patterns.get(classification);
  }

  /**
   * Get execution history.
   */
  getExecutionHistory(): ExecutionLearning[] {
    return [...this.executions];
  }

  /**
   * Get execution history for a task type.
   */
  getTaskTypeHistory(classification: string): ExecutionLearning[] {
    return this.executions.filter((e) => e.classification === classification);
  }

  /**
   * Get success rate for a task type.
   */
  getSuccessRate(classification: string): number {
    const pattern = this.patterns.get(classification);
    if (!pattern) return 0;

    const total = pattern.successCount + pattern.failureCount;
    if (total === 0) return 0;

    return pattern.successCount / total;
  }

  /**
   * Get recommended models for task type.
   */
  getRecommendedModels(classification: string): string[] {
    const pattern = this.patterns.get(classification);
    if (!pattern) {
      // Default recommendation
      return ["qwen2.5-coder:7b", "qwen2.5-coder:1.5b"];
    }

    return pattern.associatedModels;
  }
}

export const createLearningRecorder = (): AgenticLearningRecorder => {
  return new AgenticLearningRecorder();
};
