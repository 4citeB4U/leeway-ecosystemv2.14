/**
 * LEEWAY_VSCODE_AGENTIC_INTENT_CLASSIFIER
 *
 * Classifies user intent into task types and determines required models/workers/gates.
 * - No silent assumptions
 * - Returns classification with confidence
 * - Identifies required action disclosure fields
 */

export type IntentClassification =
  | "code-generation"
  | "code-review"
  | "refactor"
  | "debug"
  | "test"
  | "document"
  | "explain"
  | "architecture"
  | "unknown";

export interface ClassifiedIntent {
  intentId: string;
  userPrompt: string;
  classification: IntentClassification;
  confidence: number;
  requiredModels: string[];
  requiredWorkers: string[];
  requiredGates: string[];
  riskLevel: "LOW" | "MEDIUM" | "HIGH";
  requiresCreatorApproval: boolean;
  expectedOutputFiles: string[];
}

export class AgenticIntentClassifier {
  /**
   * Classify user intent.
   */
  classify(prompt: string): ClassifiedIntent {
    const intentId = `intent-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const lower = prompt.toLowerCase();

    let classification: IntentClassification = "unknown";
    let confidence = 0;
    let requiredModels: string[] = [];
    let requiredWorkers: string[] = [];
    let requiredGates: string[] = [];
    let riskLevel: "LOW" | "MEDIUM" | "HIGH" = "MEDIUM";
    let requiresCreatorApproval = false;
    let expectedOutputFiles: string[] = [];

    // Code generation detection
    if (
      lower.includes("create") ||
      lower.includes("write") ||
      lower.includes("generate") ||
      lower.includes("implement")
    ) {
      classification = "code-generation";
      confidence = 0.85;
      requiredModels = [
        "qwen2.5-coder:14b",
        "qwen2.5-coder:7b",
        "deepseek-coder-v2:16b",
      ];
      requiredWorkers = ["file-writer"];
      requiredGates = ["action-disclosure", "creator-approval"];
      riskLevel = "HIGH";
      requiresCreatorApproval = true;
      expectedOutputFiles = ["*.ts", "*.js", "*.tsx", "*.jsx"];
    }
    // Code review detection
    else if (
      lower.includes("review") ||
      lower.includes("audit") ||
      lower.includes("check")
    ) {
      classification = "code-review";
      confidence = 0.8;
      requiredModels = [
        "qwen2.5-coder:7b",
        "qwen2.5-coder:1.5b",
        "deepseek-coder-v2:16b",
      ];
      requiredWorkers = ["file-reader", "analysis"];
      requiredGates = ["action-disclosure"];
      riskLevel = "LOW";
      requiresCreatorApproval = false;
    }
    // Refactor detection
    else if (
      lower.includes("refactor") ||
      lower.includes("reorganize") ||
      lower.includes("restructure")
    ) {
      classification = "refactor";
      confidence = 0.8;
      requiredModels = [
        "qwen2.5-coder:14b",
        "qwen2.5-coder:7b",
        "deepseek-coder-v2:16b",
      ];
      requiredWorkers = ["file-reader", "file-writer", "analysis"];
      requiredGates = ["action-disclosure", "creator-approval"];
      riskLevel = "HIGH";
      requiresCreatorApproval = true;
    }
    // Debug detection
    else if (
      lower.includes("debug") ||
      lower.includes("fix") ||
      lower.includes("error")
    ) {
      classification = "debug";
      confidence = 0.75;
      requiredModels = [
        "qwen2.5-coder:7b",
        "qwen2.5-coder:1.5b",
        "deepseek-coder-v2:16b",
      ];
      requiredWorkers = ["file-reader", "analysis"];
      requiredGates = ["action-disclosure"];
      riskLevel = "MEDIUM";
      requiresCreatorApproval = false;
    }
    // Test detection
    else if (
      lower.includes("test") ||
      lower.includes("unit") ||
      lower.includes("spec")
    ) {
      classification = "test";
      confidence = 0.8;
      requiredModels = [
        "qwen2.5-coder:7b",
        "qwen2.5-coder:1.5b",
        "deepseek-coder-v2:16b",
      ];
      requiredWorkers = ["file-writer", "test-runner"];
      requiredGates = ["action-disclosure"];
      riskLevel = "MEDIUM";
      requiresCreatorApproval = false;
      expectedOutputFiles = ["*.test.ts", "*.spec.ts"];
    }
    // Document detection
    else if (
      lower.includes("document") ||
      lower.includes("comment") ||
      lower.includes("readme")
    ) {
      classification = "document";
      confidence = 0.8;
      requiredModels = ["qwen2.5-coder:7b", "qwen2.5-coder:1.5b"];
      requiredWorkers = ["file-writer"];
      requiredGates = ["action-disclosure"];
      riskLevel = "LOW";
      requiredGates = ["action-disclosure"];
      requiresCreatorApproval = false;
      expectedOutputFiles = ["*.md", "*.txt"];
    }
    // Explain detection
    else if (
      lower.includes("explain") ||
      lower.includes("understand") ||
      lower.includes("what does")
    ) {
      classification = "explain";
      confidence = 0.75;
      requiredModels = ["qwen2.5-coder:7b", "qwen2.5-coder:1.5b"];
      requiredWorkers = ["file-reader"];
      requiredGates = ["action-disclosure"];
      riskLevel = "LOW";
      requiresCreatorApproval = false;
    }
    // Architecture detection
    else if (
      lower.includes("architecture") ||
      lower.includes("design") ||
      lower.includes("structure")
    ) {
      classification = "architecture";
      confidence = 0.75;
      requiredModels = ["qwen2.5-coder:14b", "qwen2.5-coder:7b"];
      requiredWorkers = ["analysis"];
      requiredGates = ["action-disclosure"];
      riskLevel = "MEDIUM";
      requiresCreatorApproval = false;
    }

    // Default classification if no explicit pattern matched
    if (classification === "unknown") {
      confidence = 0.4;
      requiredModels = ["qwen2.5-coder:7b"];
      requiredWorkers = [];
      requiredGates = ["action-disclosure"];
      riskLevel = "MEDIUM";
      requiresCreatorApproval = false;
    }

    return {
      intentId,
      userPrompt: prompt,
      classification,
      confidence,
      requiredModels,
      requiredWorkers,
      requiredGates,
      riskLevel,
      requiresCreatorApproval,
      expectedOutputFiles,
    };
  }
}

export const createIntentClassifier = (): AgenticIntentClassifier => {
  return new AgenticIntentClassifier();
};
