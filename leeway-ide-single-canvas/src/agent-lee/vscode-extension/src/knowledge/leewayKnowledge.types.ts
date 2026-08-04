/*
LEEWAY HEADER - DO NOT REMOVE

REGION: AI
TAG: AI.KNOWLEDGE.TYPES.MAIN
DISCOVERY_PIPELINE: Voice -> Intent -> Location -> Vertical -> Ranking -> Render
*/

export type LeeWayKnowledgeKind =
  | "file"
  | "symbol"
  | "instruction"
  | "task"
  | "plugin"
  | "error"
  | "verification"
  | "receipt"
  | "database"
  | "decision";

export type LeeWayDrive = "L" | "E" | "O" | "N" | "A" | "R" | "D" | "LEE";
export type LeeWayRegion = "UI" | "AI" | "DATA" | "CORE" | "MCP" | "SEO" | "UTIL";

export interface LeeWayKnowledgeRecord {
  id: string;
  kind: LeeWayKnowledgeKind;
  drive: LeeWayDrive;
  title: string;
  path?: string;
  summary: string;
  content?: string;
  tags: string[];
  region: LeeWayRegion;
  tag: string;
  source: "workspace" | "agent" | "plugin" | "user" | "verification" | "memory";
  confidence: number;
  createdAt: string;
  updatedAt: string;
  hash?: string;
  embedding?: number[];
}

export interface LeeWayRetrievalQuery {
  query: string;
  kinds?: LeeWayKnowledgeKind[];
  tags?: string[];
  maxResults?: number;
  minConfidence?: number;
}

export interface LeeWayRetrievalMatch {
  record: LeeWayKnowledgeRecord;
  score: number;
  reason: string;
}

export interface LeeWayContextPack {
  query: string;
  instructions: LeeWayKnowledgeRecord[];
  files: LeeWayKnowledgeRecord[];
  tools: LeeWayKnowledgeRecord[];
  errors: LeeWayKnowledgeRecord[];
  receipts: LeeWayKnowledgeRecord[];
  summary: string;
}
