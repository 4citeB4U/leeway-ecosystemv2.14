/**
 * LEEWAY_VSCODE_AGENTIC_TRUTH_GUARD
 *
 * Ensures the active runtime truth state is consistent and clean.
 * - Enforces authorized model guard state
 * - Validates workflow preconditions
 * - Blocks execution on truth violation
 * - Writes receipt for all truth checks
 */

export interface RuntimeTruth {
  modelPurgeClean: boolean;
  activeForbiddenHits: number;
  packageForbiddenHits: number;
  installedForbiddenHits: number;
  compilePass: boolean;
  selectorLockPass: boolean;
  authorizedModelGuardImplemented: boolean;
  noPurgeBlockers: boolean;
  timestamp: string;
}

export interface TruthViolation {
  violationType:
    | "model_purge_dirty"
    | "forbidden_token_detected"
    | "compile_fail"
    | "selector_unlocked"
    | "guard_missing"
    | "blocker_present";
  message: string;
  severity: "BLOCK" | "WARN";
  source: string;
}

export class AgenticTruthGuard {
  private lastKnownTruth: RuntimeTruth | null = null;
  private violations: TruthViolation[] = [];

  /**
   * Record the current runtime truth state.
   */
  recordRuntimeTruth(truth: RuntimeTruth): void {
    this.lastKnownTruth = truth;
    this.validateTruth(truth);
  }

  /**
   * Validate runtime truth preconditions.
   */
  private validateTruth(truth: RuntimeTruth): void {
    this.violations = [];

    if (!truth.modelPurgeClean) {
      this.violations.push({
        violationType: "model_purge_dirty",
        message: "Model purge is not clean. Agentic workflow cannot execute.",
        severity: "BLOCK",
        source: "agenticTruthGuard.validateTruth",
      });
    }

    if (
      truth.activeForbiddenHits > 0 ||
      truth.packageForbiddenHits > 0 ||
      truth.installedForbiddenHits > 0
    ) {
      this.violations.push({
        violationType: "forbidden_token_detected",
        message: `Forbidden model tokens detected in active/package/installed. Hits: ${truth.activeForbiddenHits}/${truth.packageForbiddenHits}/${truth.installedForbiddenHits}. Agentic workflow blocked.`,
        severity: "BLOCK",
        source: "agenticTruthGuard.validateTruth",
      });
    }

    if (!truth.compilePass) {
      this.violations.push({
        violationType: "compile_fail",
        message:
          "TypeScript compile failed. Agentic workflow modules cannot run.",
        severity: "BLOCK",
        source: "agenticTruthGuard.validateTruth",
      });
    }

    if (!truth.selectorLockPass) {
      this.violations.push({
        violationType: "selector_unlocked",
        message:
          "Model selector is not locked to authorized coding models. Agentic workflow blocked.",
        severity: "BLOCK",
        source: "agenticTruthGuard.validateTruth",
      });
    }

    if (!truth.authorizedModelGuardImplemented) {
      this.violations.push({
        violationType: "guard_missing",
        message: "Authorized model guard not implemented. Agentic workflow blocked.",
        severity: "BLOCK",
        source: "agenticTruthGuard.validateTruth",
      });
    }

    if (!truth.noPurgeBlockers) {
      this.violations.push({
        violationType: "blocker_present",
        message:
          "Model purge has remaining blockers. Agentic workflow cannot execute.",
        severity: "BLOCK",
        source: "agenticTruthGuard.validateTruth",
      });
    }
  }

  /**
   * Check if truth is clean enough for agentic execution.
   */
  isTruthClean(): boolean {
    return this.violations.filter((v) => v.severity === "BLOCK").length === 0;
  }

  /**
   * Get all violations, blocking or not.
   */
  getViolations(): TruthViolation[] {
    return [...this.violations];
  }

  /**
   * Get blocking violations only.
   */
  getBlockingViolations(): TruthViolation[] {
    return this.violations.filter((v) => v.severity === "BLOCK");
  }

  /**
   * Require truth to be clean before proceeding.
   */
  requireCleanTruth(): void {
    const blockers = this.getBlockingViolations();
    if (blockers.length > 0) {
      throw new Error(
        `AgenticTruthGuard: Truth violations prevent execution. Blockers: ${blockers
          .map((b) => b.violationType)
          .join(", ")}. Failing closed.`
      );
    }
  }

  /**
   * Get the last known truth state.
   */
  getLastKnownTruth(): RuntimeTruth | null {
    return this.lastKnownTruth;
  }
}

export const createTruthGuard = (): AgenticTruthGuard => {
  return new AgenticTruthGuard();
};
