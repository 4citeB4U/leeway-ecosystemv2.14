/**
 * LEEWAY_VSCODE_AGENTIC_WORKER_ORCHESTRATOR
 *
 * Governs all workers used in agentic workflow.
 * - Every worker has objectId, route, authority, receipt policy
 * - Observed-only workers cannot mutate
 * - Workers are routed through authorized model paths
 */

export type WorkerRole = "file-reader" | "file-writer" | "analysis" | "planning" | "gate-validator" | "learning-recorder" | "test-runner";

export interface WorkerDefinition {
  objectId: string;
  workerRole: WorkerRole;
  route: string;
  lane: "visible-coding" | "hidden-infrastructure" | "observation-only";
  authority: string;
  receiptPolicy: "required" | "optional";
  allowedActions: string[];
  forbiddenActions: string[];
  modelRoutesAllowed: string[];
  timestamp: string;
}

export interface WorkerInvocation {
  invocationId: string;
  workerObjectId: string;
  taskId: string;
  input: any;
  output?: any;
  status: "pending" | "running" | "complete" | "failed";
  timestamp: string;
  receiptWritten: boolean;
}

export class AgenticWorkerOrchestrator {
  private workers: Map<string, WorkerDefinition> = new Map();
  private invocations: WorkerInvocation[] = [];

  constructor() {
    // Register default workers
    this.registerWorker({
      objectId: "worker-file-reader-001",
      workerRole: "file-reader",
      route: "observed-only",
      lane: "observation-only",
      authority: "LEEWAY_WORKFLOW_AUTHORITY",
      receiptPolicy: "required",
      allowedActions: ["read-file", "list-directory"],
      forbiddenActions: ["write-file", "delete-file", "modify-file"],
      modelRoutesAllowed: [],
    });

    this.registerWorker({
      objectId: "worker-file-writer-001",
      workerRole: "file-writer",
      route: "governed-mutation",
      lane: "visible-coding",
      authority: "LEEWAY_WORKFLOW_AUTHORITY",
      receiptPolicy: "required",
      allowedActions: ["write-file", "create-file", "modify-file"],
      forbiddenActions: ["delete-file", "delete-directory"],
      modelRoutesAllowed: [
        "qwen2.5-coder:14b",
        "qwen2.5-coder:7b",
        "deepseek-coder-v2:16b",
      ],
    });

    this.registerWorker({
      objectId: "worker-analysis-001",
      workerRole: "analysis",
      route: "analysis-pipeline",
      lane: "hidden-infrastructure",
      authority: "LEEWAY_WORKFLOW_AUTHORITY",
      receiptPolicy: "required",
      allowedActions: ["analyze", "report"],
      forbiddenActions: ["mutate", "write"],
      modelRoutesAllowed: ["qwen3:latest", "qwen2.5-coder:7b"],
    });

    this.registerWorker({
      objectId: "worker-gate-validator-001",
      workerRole: "gate-validator",
      route: "governance-gate",
      lane: "hidden-infrastructure",
      authority: "LEEWAY_WORKFLOW_AUTHORITY",
      receiptPolicy: "required",
      allowedActions: ["validate", "check", "pass", "block"],
      forbiddenActions: ["mutate"],
      modelRoutesAllowed: [],
    });

    this.registerWorker({
      objectId: "worker-learning-recorder-001",
      workerRole: "learning-recorder",
      route: "learning-pipeline",
      lane: "hidden-infrastructure",
      authority: "LEEWAY_WORKFLOW_AUTHORITY",
      receiptPolicy: "required",
      allowedActions: ["record-learning", "update-patterns"],
      forbiddenActions: [],
      modelRoutesAllowed: [],
    });
  }

  /**
   * Register a worker.
   */
  registerWorker(worker: Omit<WorkerDefinition, "timestamp">): void {
    const definition: WorkerDefinition = {
      ...worker,
      timestamp: new Date().toISOString(),
    };

    this.workers.set(worker.objectId, definition);
  }

  /**
   * Invoke a worker.
   */
  async invokeWorker(input: {
    workerObjectId: string;
    taskId: string;
    modelRoute?: string;
    input: any;
  }): Promise<WorkerInvocation> {
    const worker = this.workers.get(input.workerObjectId);
    if (!worker) {
      throw new Error(
        `AgenticWorkerOrchestrator: Worker ${input.workerObjectId} not found. Failing closed.`
      );
    }

    // Verify model route is allowed
    if (input.modelRoute) {
      if (!worker.modelRoutesAllowed.includes(input.modelRoute)) {
        throw new Error(
          `AgenticWorkerOrchestrator: Worker ${worker.objectId} cannot use model route ${input.modelRoute}. Allowed: ${worker.modelRoutesAllowed.join(
            ", "
          )}. Failing closed.`
        );
      }
    }

    // Verify worker is not observation-only if mutating
    if (
      worker.lane === "observation-only" &&
      input.input.action &&
      input.input.action.includes("write")
    ) {
      throw new Error(
        `AgenticWorkerOrchestrator: Worker ${worker.objectId} is observation-only and cannot mutate. Failing closed.`
      );
    }

    const invocation: WorkerInvocation = {
      invocationId: `invocation-${Date.now()}-${Math.random()
        .toString(36)
        .substr(2, 9)}`,
      workerObjectId: input.workerObjectId,
      taskId: input.taskId,
      input: input.input,
      status: "running",
      timestamp: new Date().toISOString(),
      receiptWritten: false,
    };

    this.invocations.push(invocation);
    return invocation;
  }

  /**
   * Mark worker invocation as complete.
   */
  markInvocationComplete(
    invocationId: string,
    output: any,
    receiptWritten: boolean = false
  ): void {
    const invocation = this.invocations.find((i) => i.invocationId === invocationId);
    if (invocation) {
      invocation.status = "complete";
      invocation.output = output;
      invocation.receiptWritten = receiptWritten;
    }
  }

  /**
   * Get invocations for a task.
   */
  getTaskInvocations(taskId: string): WorkerInvocation[] {
    return this.invocations.filter((i) => i.taskId === taskId);
  }

  /**
   * Get all invocations.
   */
  getAllInvocations(): WorkerInvocation[] {
    return [...this.invocations];
  }

  /**
   * Verify all invocations have receipts written.
   */
  verifyReceiptsWritten(): boolean {
    return this.invocations.every((i) => i.receiptWritten || i.status !== "complete");
  }
}

export const createWorkerOrchestrator = (): AgenticWorkerOrchestrator => {
  return new AgenticWorkerOrchestrator();
};
