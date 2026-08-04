import type { LeeWayModuleLifecycleState } from "./module-types";

const transitions: Readonly<
  Record<LeeWayModuleLifecycleState, readonly LeeWayModuleLifecycleState[]>
> = {
  registered: ["discovered", "initializing", "failed", "disposed"],
  discovered: ["initializing", "failed", "disposed"],
  initializing: ["ready", "failed", "disposed"],
  ready: ["suspended", "failed", "disposed"],
  suspended: ["ready", "failed", "disposed"],
  failed: ["initializing", "disposed"],
  disposed: [],
};

export function canTransitionModuleState(
  current: LeeWayModuleLifecycleState,
  next: LeeWayModuleLifecycleState,
): boolean {
  return transitions[current].includes(next);
}

export function assertModuleStateTransition(
  current: LeeWayModuleLifecycleState,
  next: LeeWayModuleLifecycleState,
): void {
  if (!canTransitionModuleState(current, next)) {
    throw new Error(
      "Invalid LeeWay module lifecycle transition: " +
        current +
        " -> " +
        next,
    );
  }
}

export function getAllowedModuleTransitions(
  current: LeeWayModuleLifecycleState,
): readonly LeeWayModuleLifecycleState[] {
  return transitions[current];
}