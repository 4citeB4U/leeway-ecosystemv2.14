/*
LEEWAY HEADER — DO NOT REMOVE

REGION: 🟢 CORE
TAG: CORE.PERFORMANCE.LAZY.SERVICE.REGISTRY

5WH:
WHAT = Agent Lee lazy service registry
WHY = Keeps heavy services cold until explicitly needed
WHO = Agent Lee Runtime Performance Governor
WHERE = src/performance/lazyServiceRegistry.ts
WHEN = 2026
HOW = Lazy async service creation with lifecycle tracking

AGENTS:
DOCTOR
PRIME
AUDIT

LICENSE:
MIT
*/

import type { ServiceState } from "./performance.types";

export interface LazyService<T> {
  id: string;
  state: ServiceState;
  core: boolean;
  get(): Promise<T>;
  warm(): Promise<T>;
  pause(): Promise<void>;
  resume(): Promise<void>;
  dispose?(): Promise<void>;
}

interface LazyServiceControls<T> {
  core?: boolean;
  warm?: (service: T) => Promise<void>;
  pause?: (service: T) => Promise<void>;
  resume?: (service: T) => Promise<void>;
  dispose?: (service: T) => Promise<void>;
}

class LazyServiceRegistry {
  private services = new Map<string, LazyService<unknown>>();

  register<T>(
    id: string,
    factory: () => Promise<T>,
    controls: LazyServiceControls<T> = {}
  ): LazyService<T> {
    let instance: T | null = null;

    const service: LazyService<T> = {
      id,
      state: "idle",
      core: Boolean(controls.core),
      async get() {
        if (instance) return instance;

        service.state = "warm";
        instance = await factory();
        service.state = "active";
        return instance;
      },
      async warm() {
        const current = await service.get();
        if (controls.warm) {
          await controls.warm(current);
        }
        service.state = "active";
        return current;
      },
      async pause() {
        if (instance && controls.pause) {
          await controls.pause(instance);
        }
        service.state = "paused";
      },
      async resume() {
        const current = await service.get();
        if (controls.resume) {
          await controls.resume(current);
        }
        service.state = "active";
      },
      async dispose() {
        if (instance && controls.dispose) {
          await controls.dispose(instance);
        }
        instance = null;
        service.state = "idle";
      }
    };

    this.services.set(id, service as LazyService<unknown>);
    return service;
  }

  getState(id: string): ServiceState {
    return this.services.get(id)?.state ?? "disabled";
  }

  list() {
    return Array.from(this.services.values()).map((service) => ({
      id: service.id,
      state: service.state,
      core: service.core
    }));
  }

  async warmServices(ids: string[]): Promise<string[]> {
    const warmed: string[] = [];
    for (const id of ids) {
      const service = this.services.get(id);
      if (!service) continue;
      await service.warm();
      warmed.push(id);
    }
    return warmed;
  }

  async pauseServices(ids?: string[]): Promise<string[]> {
    const targets = ids ?? Array.from(this.services.keys());
    const paused: string[] = [];
    for (const id of targets) {
      const service = this.services.get(id);
      if (!service) continue;
      await service.pause();
      paused.push(id);
    }
    return paused;
  }

  async resumeServices(ids?: string[]): Promise<string[]> {
    const targets = ids ?? Array.from(this.services.keys());
    const resumed: string[] = [];
    for (const id of targets) {
      const service = this.services.get(id);
      if (!service) continue;
      await service.resume();
      resumed.push(id);
    }
    return resumed;
  }

  async disposeIdleServices(): Promise<string[]> {
    const disposed: string[] = [];
    for (const [id, service] of this.services.entries()) {
      if (service.state === "active" || service.state === "warm") continue;
      await service.dispose?.();
      disposed.push(id);
    }
    return disposed;
  }

  async disposeAll(): Promise<void> {
    for (const service of this.services.values()) {
      await service.dispose?.();
    }
  }
}

export const lazyServiceRegistry = new LazyServiceRegistry();

/*
DISCOVERY_PIPELINE:
Voice → Intent → Location → Vertical → Ranking → Render
*/