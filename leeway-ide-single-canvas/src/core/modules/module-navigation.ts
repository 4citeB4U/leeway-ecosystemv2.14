import type {
  LeeWayModuleNavigationRegistration,
  LeeWayRegisteredModule,
} from "./module-types";

export function collectModuleNavigation(
  modules: readonly LeeWayRegisteredModule[],
): readonly LeeWayModuleNavigationRegistration[] {
  return modules
    .flatMap((module) => module.contract.navigation ?? [])
    .filter((entry) => entry.hidden !== true)
    .sort((left, right) => {
      if (left.order !== right.order) {
        return left.order - right.order;
      }

      return left.label.localeCompare(right.label);
    });
}