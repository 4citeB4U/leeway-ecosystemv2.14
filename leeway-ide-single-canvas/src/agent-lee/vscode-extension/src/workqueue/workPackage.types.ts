/*
LEEWAY HEADER - DO NOT REMOVE

REGION: AI
TAG: AI.WORKQUEUE.PACKAGE.TYPES
DISCOVERY_PIPELINE: Voice -> Intent -> Location -> Vertical -> Ranking -> Render
*/

export type WorkPackageStatus =
  | "drafting"
  | "reviewing"
  | "approved"
  | "applying"
  | "verified"
  | "failed"
  | "rolled_back";

export type ChangeRisk = "low" | "medium" | "high" | "critical";

export interface WorkPackage {
  id: string;
  title: string;
  objective: string;
  status: WorkPackageStatus;
  priority: "P0" | "P1" | "P2" | "P3";
  risk: ChangeRisk;
  createdAt: string;
  updatedAt: string;
  files: FileChange[];
  databases: DatabaseChange[];
  pluginActions: PluginAction[];
  receipts: WorkReceipt[];
  verification: VerificationState;
}

export interface FileChange {
  id: string;
  path: string;
  language: string;
  status: "pending" | "accepted" | "rejected" | "applied";
  hunks: FileHunk[];
}

export interface FileHunk {
  id: string;
  title: string;
  oldStart: number;
  oldEnd: number;
  newStart: number;
  newEnd: number;
  before: string;
  after: string;
  reason: string;
  risk: ChangeRisk;
  status: "pending" | "accepted" | "rejected" | "applied";
}

export interface DatabaseChange {
  id: string;
  databaseId: string;
  databaseType: "indexeddb" | "sqlite" | "postgres" | "supabase" | "neon" | "firebase";
  title: string;
  operation: "insert" | "update" | "delete" | "migration" | "schema";
  previewSql?: string;
  previewJson?: unknown;
  rollbackPlan: string;
  risk: ChangeRisk;
  status: "pending" | "accepted" | "rejected" | "applied";
}

export interface PluginAction {
  id: string;
  pluginId: string;
  action: string;
  description: string;
  requiresConfirmation: boolean;
  status: "pending" | "accepted" | "rejected" | "executed";
}

export interface VerificationState {
  leewayScore: number;
  buildPassed: boolean;
  testsPassed: boolean;
  lintPassed: boolean;
  databaseSafe: boolean;
  rollbackReady: boolean;
}

export interface WorkReceipt {
  id: string;
  type: "file" | "database" | "plugin" | "verification" | "rollback";
  summary: string;
  timestamp: string;
}
