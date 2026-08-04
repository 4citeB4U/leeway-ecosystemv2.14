import type { LeeWayModuleContract, LeeWayModuleMetadata } from "../modules/module-types";
import { leeWayModuleRegistry } from "../modules/module-registry";
import { assertWorkflowEngineStateTransition, createLeeWayWorkflowEngineRegistration } from "./workflow-engine-contract";
import type {
  LeeWayWorkflowEngineId,
  LeeWayWorkflowEngineLifecycleState,
  LeeWayWorkflowEngineMetadata,
  LeeWayWorkflowEngineProvider,
  LeeWayWorkflowEngineRegistration,
} from "./workflow-engine-types";

export class LeeWayWorkflowEngineRegistry {
  private readonly engines = new Map<LeeWayWorkflowEngineId, LeeWayWorkflowEngineRegistration>();
  private readonly providers = new Map<LeeWayWorkflowEngineId, LeeWayWorkflowEngineProvider>();

  register(
    metadata: LeeWayWorkflowEngineMetadata,
    provider: LeeWayWorkflowEngineProvider,
    moduleContract?: LeeWayModuleContract,
  ): LeeWayWorkflowEngineRegistration {
    const id = metadata.id.trim();

    if (!id) {
      throw new Error("LeeWay Workflow Engine metadata.id is required.");
    }

    if (this.engines.has(id)) {
      throw new Error("LeeWay Workflow Engine is already registered: " + id);
    }

    const moduleMetadata: LeeWayModuleMetadata = moduleContract?.metadata ?? {
      id,
      name: metadata.name,
      version: metadata.version,
      description: metadata.description,
      category: "workflow-engine",
      tags: ["workflow-engine", metadata.provider],
      dependencies: [],
      capabilities: [...metadata.capabilities],
    };

    if (moduleContract) {
      leeWayModuleRegistry.register(moduleContract);
    }

    const registration = createLeeWayWorkflowEngineRegistration(metadata, moduleMetadata);
    this.engines.set(id, registration);
    this.providers.set(id, provider);
    return registration;
  }

  unregister(id: LeeWayWorkflowEngineId): boolean {
    this.providers.delete(id);
    return this.engines.delete(id);
  }

  get(id: LeeWayWorkflowEngineId): LeeWayWorkflowEngineRegistration | undefined {
    return this.engines.get(id);
  }

  getProvider(id: LeeWayWorkflowEngineId): LeeWayWorkflowEngineProvider | undefined {
    return this.providers.get(id);
  }

  has(id: LeeWayWorkflowEngineId): boolean {
    return this.engines.has(id);
  }

  list(): readonly LeeWayWorkflowEngineRegistration[] {
    return Array.from(this.engines.values());
  }

  transition(
    id: LeeWayWorkflowEngineId,
    next: LeeWayWorkflowEngineLifecycleState,
    error?: string,
  ): LeeWayWorkflowEngineRegistration {
    const current = this.engines.get(id);
    if (!current) {
      throw new Error("LeeWay Workflow Engine is not registered: " + id);
    }

    assertWorkflowEngineStateTransition(current.state, next);

    const updated: LeeWayWorkflowEngineRegistration = {
      ...current,
      state: next,
      updatedAt: new Date().toISOString(),
      ...(error ? { error } : {}),
    };

    this.engines.set(id, updated);
    return updated;
  }

  clear(): void {
    this.engines.clear();
    this.providers.clear();
  }
}

export const leeWayWorkflowEngineRegistry = new LeeWayWorkflowEngineRegistry();