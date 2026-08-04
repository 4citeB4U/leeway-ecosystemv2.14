/*
LEEWAY HEADER - DO NOT REMOVE

REGION: CORE
TAG: CORE.EDIT_BUFFER.TYPES.MAIN
DISCOVERY_PIPELINE: Voice -> Intent -> Location -> Vertical -> Ranking -> Render
*/

import type * as vscode from "vscode";

export type AgentLeeEditStatus = "pending" | "accepted" | "rejected" | "applied" | "failed";
export type AgentLeeEditRisk = "low" | "medium" | "high" | "critical";

export interface AgentLeeEditHunk {
  id: string;
  fileId: string;
  title: string;
  reason: string;
  risk: AgentLeeEditRisk;
  status: AgentLeeEditStatus;
  range: vscode.Range;
  originalText: string;
  proposedText: string;
  createdAt: string;
  updatedAt: string;
}

export interface AgentLeeFileEdit {
  id: string;
  uri: vscode.Uri;
  path: string;
  languageId: string;
  status: AgentLeeEditStatus;
  originalText: string;
  proposedText: string;
  hunks: AgentLeeEditHunk[];
  createdAt: string;
  updatedAt: string;
}

export interface AgentLeeEditPackage {
  id: string;
  title: string;
  objective: string;
  status: AgentLeeEditStatus;
  files: AgentLeeFileEdit[];
  createdAt: string;
  updatedAt: string;
}
