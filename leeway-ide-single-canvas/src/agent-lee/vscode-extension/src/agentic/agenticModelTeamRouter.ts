/**
 * LEEWAY_VSCODE_AGENTIC_MODEL_TEAM_ROUTER
 *
 * Routes tasks to the four-model coding team and tracks contributions.
 * - qwen2.5-coder:14b = heavy implementation
 * - qwen2.5-coder:7b = planning/review
 * - qwen2.5-coder:1.5b = lightweight inspection
 * - deepseek-coder-v2:16b = VS Code-only specialist
 *
 * Records all contributions and conflicts.
 */

export type CodingRole =
  | "heavy-implementation"
  | "planning-review"
  | "lightweight-inspection"
  | "vscode-specialist";

export interface ModelTeamMember {
  modelName: string;
  role: CodingRole;
  scopeRestrictions: string[];
  maxContextSize: number;
}

export interface ModelContribution {
  contributionId: string;
  modelName: string;
  role: CodingRole;
  taskId: string;
  input: string;
  output: string;
  timestamp: string;
  tokenEstimate?: number;
}

export interface ModelConflict {
  conflictId: string;
  taskId: string;
  model1: string;
  model2: string;
  conflictType: string;
  resolution: string;
  timestamp: string;
}

export class AgenticModelTeamRouter {
  private team: Map<string, ModelTeamMember> = new Map();
  private contributions: ModelContribution[] = [];
  private conflicts: ModelConflict[] = [];

  constructor() {
    // Initialize the four-model team
    this.team.set("qwen2.5-coder:14b", {
      modelName: "qwen2.5-coder:14b",
      role: "heavy-implementation",
      scopeRestrictions: [],
      maxContextSize: 32000,
    });

    this.team.set("qwen2.5-coder:7b", {
      modelName: "qwen2.5-coder:7b",
      role: "planning-review",
      scopeRestrictions: [],
      maxContextSize: 16000,
    });

    this.team.set("qwen2.5-coder:1.5b", {
      modelName: "qwen2.5-coder:1.5b",
      role: "lightweight-inspection",
      scopeRestrictions: [],
      maxContextSize: 8000,
    });

    this.team.set("deepseek-coder-v2:16b", {
      modelName: "deepseek-coder-v2:16b",
      role: "vscode-specialist",
      scopeRestrictions: ["VS Code extension development", "vscode-api"],
      maxContextSize: 32000,
    });
  }

  /**
   * Route a coding task to appropriate team members.
   */
  routeTask(input: {
    taskId: string;
    taskType: string;
    complexity: "light" | "medium" | "heavy";
    requiresVSCodeKnowledge: boolean;
    estimatedTokens: number;
  }): string[] {
    const selectedModels: string[] = [];

    // Route based on complexity
    if (input.complexity === "heavy") {
      selectedModels.push("qwen2.5-coder:14b");
      selectedModels.push("qwen2.5-coder:7b"); // For review
    } else if (input.complexity === "medium") {
      selectedModels.push("qwen2.5-coder:7b");
      selectedModels.push("qwen2.5-coder:1.5b"); // For inspection
    } else {
      selectedModels.push("qwen2.5-coder:1.5b");
    }

    // Add VS Code specialist if needed
    if (input.requiresVSCodeKnowledge) {
      if (!selectedModels.includes("deepseek-coder-v2:16b")) {
        selectedModels.push("deepseek-coder-v2:16b");
      }
    }

    return selectedModels;
  }

  /**
   * Record a model contribution.
   */
  recordContribution(input: {
    modelName: string;
    taskId: string;
    input: string;
    output: string;
    tokenEstimate?: number;
  }): ModelContribution {
    // Verify model is in team
    const member = this.team.get(input.modelName);
    if (!member) {
      throw new Error(
        `AgenticModelTeamRouter: Model ${input.modelName} not in team. Failing closed.`
      );
    }

    const contribution: ModelContribution = {
      contributionId: `contrib-${Date.now()}-${Math.random()
        .toString(36)
        .substr(2, 9)}`,
      modelName: input.modelName,
      role: member.role,
      taskId: input.taskId,
      input: input.input,
      output: input.output,
      timestamp: new Date().toISOString(),
      tokenEstimate: input.tokenEstimate,
    };

    this.contributions.push(contribution);
    return contribution;
  }

  /**
   * Record a conflict between models.
   */
  recordConflict(input: {
    taskId: string;
    model1: string;
    model2: string;
    conflictType: string;
    resolution: string;
  }): ModelConflict {
    const conflict: ModelConflict = {
      conflictId: `conflict-${Date.now()}-${Math.random()
        .toString(36)
        .substr(2, 9)}`,
      taskId: input.taskId,
      model1: input.model1,
      model2: input.model2,
      conflictType: input.conflictType,
      resolution: input.resolution,
      timestamp: new Date().toISOString(),
    };

    this.conflicts.push(conflict);
    return conflict;
  }

  /**
   * Get all contributions.
   */
  getContributions(): ModelContribution[] {
    return [...this.contributions];
  }

  /**
   * Get contributions for a task.
   */
  getTaskContributions(taskId: string): ModelContribution[] {
    return this.contributions.filter((c) => c.taskId === taskId);
  }

  /**
   * Get all conflicts.
   */
  getConflicts(): ModelConflict[] {
    return [...this.conflicts];
  }

  /**
   * Verify no hidden infrastructure models are in visible coding.
   */
  verifyTeamComposition(): boolean {
    const hiddenInfraModels = [
      "qwen3:latest",
      "qwen2.5vl:7b",
      "qwen3-vl-embedding-local",
      "qwen3-tts-local",
      "qwen2.5-omni-local",
      "qwen2-audio-local",
    ];

    for (const modelName of this.team.keys()) {
      if (
        hiddenInfraModels.some((m) =>
          modelName.toLowerCase().includes(m.toLowerCase())
        )
      ) {
        return false;
      }
    }

    return true;
  }

  /**
   * Verify DeepSeek scope restrictions.
   */
  verifyDeepSeekScope(): boolean {
    const deepSeekContributions = this.contributions.filter((c) =>
      c.modelName.toLowerCase().includes("deepseek")
    );

    for (const contrib of deepSeekContributions) {
      // Check if task involves non-VS Code work
      if (
        !contrib.taskId.toLowerCase().includes("vscode") &&
        !contrib.taskId.toLowerCase().includes("extension")
      ) {
        return false;
      }
    }

    return true;
  }
}

export const createModelTeamRouter = (): AgenticModelTeamRouter => {
  return new AgenticModelTeamRouter();
};
