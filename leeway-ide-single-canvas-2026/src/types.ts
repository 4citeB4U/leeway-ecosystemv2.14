/**
 * LEEWAY_HEADER - DO NOT REMOVE
 *
 * REGION: CORE
 * TAG: CORE.TYPES.WORKSPACE.MAIN
 * DESCRIPTION: Core type definitions for Leeway IDE workspace, files, agents, and automation
 * AUTHORITY: LeeWay-Standards
 * DISCOVERY_PIPELINE: Voice -> Intent -> Location -> Vertical -> Ranking -> Render
 *
 * 5WH:
 * WHAT = Core Types - TypeScript type definitions for Leeway IDE workspace structures
 * WHY = Provide type safety and structure for workspace files, chat, agents, and automation nodes
 * WHO = Leeway Innovations / Agent Lee Enablement
 * WHERE = leeway-ide-single-canvas/src/types.ts
 * WHEN = 2026-06-06
 * HOW = TypeScript interfaces following Leeway Runtime Fabric type standards
 *
 * CHAIN: Standards → Integrated → Runtime → Projections
 * LICENSE: PROPRIETARY
 *
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface WorkspaceFile {
  path: string;
  name: string;
  content: string;
  language: string;
}

export interface FileTreeNode {
  name: string;
  path: string;
  type: "file" | "directory";
  children?: FileTreeNode[];
}

export interface ChatMessage {
  id: string;
  sender: "user" | "agent";
  text: string;
  timestamp: string;
  isCodeSuggestion?: boolean;
  suggestedCode?: string;
  suggestedFilePath?: string;
}

export interface AgentLog {
  id: string;
  text: string;
  status: "idle" | "running" | "success" | "error";
}

export interface AutomationNode {
  id: string;
  type: "trigger" | "action";
  label: string;
  description: string;
  x: number;
  y: number;
  config: Record<string, string>;
  status?: "idle" | "running" | "success" | "error";
}

export interface AutomationEdge {
  fromNodeId: string;
  toNodeId: string;
}

export interface SystemState {
  isTerminalOpen: boolean;
  activeConsoleTab: "terminal" | "problems" | "output" | "git";
  activeSidebarTab: "code" | "automation" | "preview" | "settings";
  currentFilePath: string;
  openTabs: string[];
}
