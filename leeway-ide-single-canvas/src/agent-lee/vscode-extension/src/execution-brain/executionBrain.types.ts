/*
LEEWAY HEADER - DO NOT REMOVE

REGION: AI
TAG: AI.EXECUTION_BRAIN.TYPES.MAIN
DISCOVERY_PIPELINE: Voice -> Intent -> Location -> Vertical -> Ranking -> Render
*/

export type ExecutionBrainPhase =
  | "indexing"
  | "planning"
  | "drafting"
  | "review"
  | "applying"
  | "verifying"
  | "repairing"
  | "complete"
  | "blocked";

export type ExecutionRisk = "low" | "medium" | "high" | "critical";

export interface DependencyNode {
  filePath: string;
  imports: string[];
  exports: string[];
  commands: string[];
  routes: string[];
  envVars: string[];
  relatedFiles: string[];
}

export interface MinimalHunk {
  id: string;
  filePath: string;
  operation: "insert" | "replace" | "delete";
  anchorText?: string;
  before: string;
  after: string;
  reason: string;
  confidence: number;
  risk: ExecutionRisk;
}

export interface ConflictCheckResult {
  safe: boolean;
  conflictType:
    | "none"
    | "document_version_changed"
    | "original_text_missing"
    | "anchor_missing"
    | "file_deleted";
  detail: string;
}

export interface RebasedHunkResult {
  rebased: boolean;
  before: string;
  after: string;
  anchorText?: string;
  detail: string;
}

export interface VerificationCommand {
  id: string;
  command: string;
  label: string;
  required: boolean;
}

export interface VerificationResult {
  command: string;
  ok: boolean;
  exitCode: number | null;
  summary: string;
  output: string;
}

export interface PlannedDatabaseTransaction {
  id: string;
  title: string;
  databaseType: "indexeddb" | "sqlite" | "postgres" | "supabase" | "neon" | "firebase";
  operation: "insert" | "update" | "delete" | "migration" | "schema";
  previewSql?: string;
  previewJson?: unknown;
  rollbackPlan: string;
  risk: ExecutionRisk;
  requiresApproval: boolean;
}

export interface DiagnosticRepairCandidate {
  id: string;
  filePath: string;
  source: "typescript" | "lint" | "build" | "runtime";
  message: string;
  line?: number;
  column?: number;
  severity: "error" | "warning";
  suggestedAction: string;
}

export interface ExecutionBrainPlan {
  id: string;
  title: string;
  prompt: string;
  phase: ExecutionBrainPhase;
  risk: ExecutionRisk;
  dependencyNodes: DependencyNode[];
  targetFiles: string[];
  hunks: MinimalHunk[];
  verificationCommands: VerificationCommand[];
  databaseTransactions: PlannedDatabaseTransaction[];
  repairCandidates: DiagnosticRepairCandidate[];
  receipts: string[];
}
