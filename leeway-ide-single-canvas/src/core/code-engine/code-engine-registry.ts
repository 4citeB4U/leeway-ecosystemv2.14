import type { LeeWayModuleContract, LeeWayModuleMetadata } from "../modules/module-types";
import { leeWayModuleRegistry } from "../modules/module-registry";
import { assertEngineStateTransition, createLeeWayCodeEngineRegistration } from "./code-engine-contract";
import type {
  LeeWayCodeEngineId,
  LeeWayCodeEngineLifecycleState,
  LeeWayCodeEngineMetadata,
  LeeWayCodeEngineProvider,
  LeeWayCodeEngineRegistration,
} from "./code-engine-types";

export class LeeWayCodeEngineRegistry {
  private readonly engines = new Map<LeeWayCodeEngineId, LeeWayCodeEngineRegistration>();
  private readonly providers = new Map<LeeWayCodeEngineId, LeeWayCodeEngineProvider>();

  register(
    metadata: LeeWayCodeEngineMetadata,
    provider: LeeWayCodeEngineProvider,
    moduleContract?: LeeWayModuleContract,
  ): LeeWayCodeEngineRegistration {
    const id = metadata.id.trim();

    if (!id) {
      throw new Error("LeeWay Code Engine metadata.id is required.");
    }

    if (this.engines.has(id)) {
      throw new Error("LeeWay Code Engine is already registered: " + id);
    }

    const moduleMetadata: LeeWayModuleMetadata = moduleContract?.metadata ?? {
      id,
      name: metadata.name,
      version: metadata.version,
      description: metadata.description,
      category: "code-engine",
      tags: ["code-engine", metadata.provider],
      dependencies: [],
      capabilities: [...metadata.capabilities],
    };

    if (moduleContract) {
      leeWayModuleRegistry.register(moduleContract);
    }

    const registration = createLeeWayCodeEngineRegistration(metadata, moduleMetadata);
    this.engines.set(id, registration);
    this.providers.set(id, provider);
    return registration;
  }

  unregister(id: LeeWayCodeEngineId): boolean {
    this.providers.delete(id);
    return this.engines.delete(id);
  }

  get(id: LeeWayCodeEngineId): LeeWayCodeEngineRegistration | undefined {
    return this.engines.get(id);
  }

  getProvider(id: LeeWayCodeEngineId): LeeWayCodeEngineProvider | undefined {
    return this.providers.get(id);
  }

  has(id: LeeWayCodeEngineId): boolean {
    return this.engines.has(id);
  }

  list(): readonly LeeWayCodeEngineRegistration[] {
    return Array.from(this.engines.values());
  }

  transition(
    id: LeeWayCodeEngineId,
    next: LeeWayCodeEngineLifecycleState,
    error?: string,
  ): LeeWayCodeEngineRegistration {
    const current = this.engines.get(id);
    if (!current) {
      throw new Error("LeeWay Code Engine is not registered: " + id);
    }

    assertEngineStateTransition(current.state, next);

    const updated: LeeWayCodeEngineRegistration = {
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

export const leeWayCodeEngineRegistry = new LeeWayCodeEngineRegistry();