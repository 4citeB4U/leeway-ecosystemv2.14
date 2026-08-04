/**
 * LEEWAY_HEADER - DO NOT REMOVE
 *
 * REGION: CORE
 * TAG: CORE.TYPES.PLACEHOLDER
 * DESCRIPTION: Leeway IDE type definitions
 * AUTHORITY: LeeWay-Standards
 * DISCOVERY_PIPELINE: Voice -> Intent -> Location -> Vertical -> Ranking -> Render
 *
 * 5WH:
 * WHAT = Type Definitions
 * WHY = Provide type safety
 * WHO = Leeway Innovations / Agent Lee Enablement
 * WHERE = FILEPATH
 * WHEN = 2026-06-06
 * HOW = TypeScript interfaces
 *
 * CHAIN: Standards ? Integrated ? Runtime ? Projections
 * LICENSE: PROPRIETARY
 */

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ReactNode } from "react";

/**
 * Base interface for all node instances on the canvas
 */
export interface NodeInstance {
  id: string;
  type: string;
  title: string;
  x: number;
  y: number;
  width: number;
  height: number;
  collapsed: boolean;
  zIndex: number;
  data?: Record<string, any>;
}

/**
 * Node definition from the library/palette
 */
export interface NodeDefinition {
  type: string;
  title: string;
  description: string;
  icon: ReactNode;
  category: string;
  defaultWidth: number;
  defaultHeight: number;
  minWidth?: number;
  minHeight?: number;
  resizable?: boolean;
  data?: Record<string, any>;
}

/**
 * Studio-specific node palette
 */
export interface StudioPalette {
  studioId: string;
  studioName: string;
  nodes: NodeDefinition[];
}

/**
 * Connection between two nodes
 */
export interface NodeConnection {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  fromPort?: string;
  toPort?: string;
}

export type LeewayCanvasBackgroundMode = "default" | "galactic";
export type LeewayCanvasGalaxyStyle = "all" | "shards" | "orbs";

export interface LeewayCanvasSettings {
  backgroundMode: LeewayCanvasBackgroundMode;
  accentColor: string;
  galaxyTint: string;
  galaxyDensity: number;
  galaxyStyle: LeewayCanvasGalaxyStyle;
  galaxySpeed: number;
  showMeshDots: boolean;
  showMeshLines: boolean;
  themeName: "leeway-blue" | "violet" | "emerald" | "amber" | "monochrome";
}

export const DEFAULT_LEEWAY_CANVAS_SETTINGS: LeewayCanvasSettings = {
  backgroundMode: "galactic",
  accentColor: "#3b82f6",
  galaxyTint: "#3b82f6",
  galaxyDensity: 700,
  galaxyStyle: "all",
  galaxySpeed: 0.3,
  showMeshDots: true,
  showMeshLines: true,
  themeName: "leeway-blue",
};

/**
 * Canvas state
 */
export interface CanvasState {
  nodes: NodeInstance[];
  connections: NodeConnection[];
  selectedNodeId: string | null;
  zoom: number;
  panX: number;
  panY: number;
}

// Leeway Standards: runtime fabric canvas contracts
