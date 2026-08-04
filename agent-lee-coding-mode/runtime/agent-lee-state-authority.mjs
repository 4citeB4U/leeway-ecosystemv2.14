import { getLeePrimeRuntimeState, getModelPoolStatus } from "./agent-lee-orchestration-runtime.mjs";

/**
 * Resolves the sovereign state of Agent Lee Prime, ensuring that model or receipt failures
 * do not collapse the agent's independent status.
 */
export async function getSovereignState() {
  let modelState = "READY";
  let executionState = "READY";
  let receiptState = "VALID";
  let veritasState = "PASS";
  let leePrimeState = "ACTIVE";

  try {
    const runtimeState = getLeePrimeRuntimeState();
    
    // Check execution infrastructure
    if (runtimeState.executionState?.status !== "HEALTHY") {
      executionState = "FAILED";
    }
    
    // Check receipt ledger chain
    if (runtimeState.receiptState?.ledgerIntact === false || runtimeState.receiptState?.lastReceiptExists === false) {
      receiptState = "INVALID";
    }
  } catch (err) {
    executionState = "FAILED";
    receiptState = "INVALID";
  }

  try {
    const modelPool = await getModelPoolStatus();
    if (!modelPool || modelPool.ok !== true || !modelPool.roles || modelPool.roles.length === 0) {
      modelState = "FAILED";
    } else {
      const runningRoles = modelPool.roles.filter(r => r.classification === "RUNNING");
      if (runningRoles.length === 0) {
        modelState = "FAILED";
      }
    }
  } catch (err) {
    modelState = "FAILED";
  }

  // Resolve constitutional state based on component health
  let constitutionalState = "READY";
  if (leePrimeState === "INACTIVE" || executionState === "FAILED") {
    constitutionalState = "BLOCKED";
  } else if (modelState === "FAILED" || receiptState === "INVALID" || veritasState === "FAIL") {
    constitutionalState = "DEGRADED";
  }

  return {
    constitutionalState,
    executionState,
    modelState,
    receiptState,
    veritasState,
    leePrimeState
  };
}
