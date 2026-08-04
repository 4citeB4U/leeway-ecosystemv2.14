import type {
  LeeWayModuleDiscoveryRecord,
  LeeWayRegisteredModule,
} from "./module-types";

export interface LeeWayModuleDiscoverySource {
  list(): readonly LeeWayRegisteredModule[];
}

export function discoverLeeWayModules(
  source: LeeWayModuleDiscoverySource,
): readonly LeeWayModuleDiscoveryRecord[] {
  return source.list().map((record) => ({
    id: record.contract.metadata.id,
    metadata: record.contract.metadata,
    state: record.state,
    navigation: record.contract.navigation ?? [],
    registeredAt: record.registeredAt,
    updatedAt: record.updatedAt,
    ...(record.error ? { error: record.error } : {}),
  }));
}