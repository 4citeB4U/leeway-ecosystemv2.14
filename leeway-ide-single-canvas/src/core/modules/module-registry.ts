import { assertModuleStateTransition } from "./module-lifecycle";
import type {
  LeeWayModuleContract,
  LeeWayModuleId,
  LeeWayModuleLifecycleState,
  LeeWayRegisteredModule,
} from "./module-types";

export class LeeWayModuleRegistry {
  private readonly modules = new Map<LeeWayModuleId, LeeWayRegisteredModule>();

  register(contract: LeeWayModuleContract): LeeWayRegisteredModule {
    const id = contract.metadata.id.trim();

    if (!id) {
      throw new Error("LeeWay module metadata.id is required.");
    }

    if (this.modules.has(id)) {
      throw new Error("LeeWay module is already registered: " + id);
    }

    const timestamp = new Date().toISOString();

    const record: LeeWayRegisteredModule = {
      contract,
      state: "registered",
      registeredAt: timestamp,
      updatedAt: timestamp,
    };

    this.modules.set(id, record);
    return record;
  }

  unregister(id: LeeWayModuleId): boolean {
    return this.modules.delete(id);
  }

  has(id: LeeWayModuleId): boolean {
    return this.modules.has(id);
  }

  get(id: LeeWayModuleId): LeeWayRegisteredModule | undefined {
    return this.modules.get(id);
  }

  list(): readonly LeeWayRegisteredModule[] {
    return Array.from(this.modules.values());
  }

  transition(
    id: LeeWayModuleId,
    next: LeeWayModuleLifecycleState,
    error?: string,
  ): LeeWayRegisteredModule {
    const current = this.modules.get(id);

    if (!current) {
      throw new Error("LeeWay module is not registered: " + id);
    }

    assertModuleStateTransition(current.state, next);

    const updated: LeeWayRegisteredModule = {
      ...current,
      state: next,
      updatedAt: new Date().toISOString(),
      ...(error ? { error } : {}),
    };

    this.modules.set(id, updated);
    return updated;
  }

  clear(): void {
    this.modules.clear();
  }
}

export const leeWayModuleRegistry = new LeeWayModuleRegistry();