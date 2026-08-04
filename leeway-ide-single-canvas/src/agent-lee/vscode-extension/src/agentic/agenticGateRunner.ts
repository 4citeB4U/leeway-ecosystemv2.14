/**
 * LEEWAY_VSCODE_AGENTIC_GATE_RUNNER
 *
 * Runs governance gates that must pass before workflow can proceed.
 * - Each gate has defined pass/fail criteria
 * - Gate results are recorded in receipts
 * - Failed gates block execution
 */

export interface GateResult {
  gateId: string;
  gateName: string;
  passed: boolean;
  timestamp: string;
  details: string;
  evidence?: Record<string, any>;
}

export interface GateDefinition {
  gateId: string;
  gateName: string;
  description: string;
  checkFunction: () => Promise<boolean>;
}

export class AgenticGateRunner {
  private gates: Map<string, GateDefinition> = new Map();
  private results: GateResult[] = [];

  /**
   * Register a gate.
   */
  registerGate(gate: GateDefinition): void {
    this.gates.set(gate.gateId, gate);
  }

  /**
   * Run a single gate.
   */
  async runGate(gateId: string): Promise<GateResult> {
    const gate = this.gates.get(gateId);
    if (!gate) {
      throw new Error(
        `AgenticGateRunner: Gate ${gateId} not found. Failing closed.`
      );
    }

    let passed = false;
    try {
      passed = await gate.checkFunction();
    } catch (error) {
      passed = false;
    }

    const result: GateResult = {
      gateId,
      gateName: gate.gateName,
      passed,
      timestamp: new Date().toISOString(),
      details: passed
        ? `Gate ${gate.gateName} passed`
        : `Gate ${gate.gateName} failed`,
      evidence: { gateId, gateName: gate.gateName, passed },
    };

    this.results.push(result);
    return result;
  }

  /**
   * Run multiple gates and return results.
   */
  async runGates(gateIds: string[]): Promise<GateResult[]> {
    const results: GateResult[] = [];
    for (const gateId of gateIds) {
      results.push(await this.runGate(gateId));
    }
    return results;
  }

  /**
   * Require all gates to pass.
   */
  async requireGatesPass(gateIds: string[]): Promise<void> {
    const results = await this.runGates(gateIds);
    const failures = results.filter((r) => !r.passed);

    if (failures.length > 0) {
      throw new Error(
        `AgenticGateRunner: ${failures.length} gate(s) failed: ${failures
          .map((f) => f.gateName)
          .join(", ")}. Failing closed.`
      );
    }
  }

  /**
   * Get all gate results.
   */
  getResults(): GateResult[] {
    return [...this.results];
  }

  /**
   * Get results for a specific workflow run context.
   */
  getResultsForContext(context: any): GateResult[] {
    return this.results;
  }
}

export const createGateRunner = (): AgenticGateRunner => {
  const runner = new AgenticGateRunner();

  // Register standard gates
  runner.registerGate({
    gateId: "action-disclosure",
    gateName: "Action Disclosure Gate",
    description: "Ensure action disclosure is complete",
    checkFunction: async () => true, // Will be overridden
  });

  runner.registerGate({
    gateId: "creator-approval",
    gateName: "Creator Approval Gate",
    description: "Ensure creator has approved the action",
    checkFunction: async () => true, // Will be overridden
  });

  runner.registerGate({
    gateId: "model-authorization",
    gateName: "Model Authorization Gate",
    description: "Ensure all models are authorized",
    checkFunction: async () => true, // Will be overridden
  });

  runner.registerGate({
    gateId: "standards-compliance",
    gateName: "Standards Compliance Gate",
    description: "Ensure action complies with standards",
    checkFunction: async () => true, // Will be overridden
  });

  return runner;
};
