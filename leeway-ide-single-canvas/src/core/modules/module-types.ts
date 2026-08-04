export type LeeWayModuleId = string;

export type LeeWayModuleLifecycleState =
  | "registered"
  | "discovered"
  | "initializing"
  | "ready"
  | "suspended"
  | "failed"
  | "disposed";

export interface LeeWayModuleMetadata {
  id: LeeWayModuleId;
  name: string;
  version: string;
  description: string;
  category: string;
  tags: readonly string[];
  dependencies: readonly LeeWayModuleId[];
  capabilities: readonly string[];
}

export interface LeeWayModuleNavigationRegistration {
  moduleId: LeeWayModuleId;
  label: string;
  href: string;
  order: number;
  icon?: string;
  parentId?: string;
  hidden?: boolean;
}

export interface LeeWayModuleContext {
  readonly moduleId: LeeWayModuleId;
  readonly runtimeApiVersion: string;
  readonly registeredAt: string;
}

export interface LeeWayModuleContract {
  readonly metadata: LeeWayModuleMetadata;
  readonly navigation?: readonly LeeWayModuleNavigationRegistration[];

  initialize?(context: LeeWayModuleContext): Promise<void> | void;
  suspend?(): Promise<void> | void;
  resume?(): Promise<void> | void;
  dispose?(): Promise<void> | void;
}

export interface LeeWayRegisteredModule {
  readonly contract: LeeWayModuleContract;
  readonly state: LeeWayModuleLifecycleState;
  readonly registeredAt: string;
  readonly updatedAt: string;
  readonly error?: string;
}

export interface LeeWayModuleDiscoveryRecord {
  readonly id: LeeWayModuleId;
  readonly metadata: LeeWayModuleMetadata;
  readonly state: LeeWayModuleLifecycleState;
  readonly navigation: readonly LeeWayModuleNavigationRegistration[];
  readonly registeredAt: string;
  readonly updatedAt: string;
  readonly error?: string;
}