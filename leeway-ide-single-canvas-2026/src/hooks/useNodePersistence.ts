/**
 * LEEWAY_HEADER - DO NOT REMOVE
 *
 * REGION: UTIL
 * TAG: UTIL.MODULE.PLACEHOLDER
 * DESCRIPTION: Leeway IDE utility module
 * AUTHORITY: LeeWay-Standards
 * DISCOVERY_PIPELINE: Voice -> Intent -> Location -> Vertical -> Ranking -> Render
 *
 * 5WH:
 * WHAT = Utility Module
 * WHY = Provide utility functions
 * WHO = Leeway Innovations / Agent Lee Enablement
 * WHERE = FILEPATH
 * WHEN = 2026-06-06
 * HOW = TypeScript module
 *
 * CHAIN: Standards ? Integrated ? Runtime ? Projections
 * LICENSE: PROPRIETARY
 */

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect } from "react";
import { NodeInstance, NodeConnection } from "../types/nodeTypes";

const STORAGE_KEY_NODES = "leeway-ide-nodes";
const STORAGE_KEY_CONNECTIONS = "leeway-ide-connections";
const STORAGE_KEY_ACTIVE_STUDIO = "leeway-ide-active-studio";

/**
 * Custom hook for persisting node layout to localStorage
 */
export function useNodePersistence(
  nodes: NodeInstance[],
  connections: NodeConnection[],
  activeStudio: string
) {
  // Save to localStorage whenever nodes or connections change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_NODES, JSON.stringify(nodes));
      localStorage.setItem(STORAGE_KEY_CONNECTIONS, JSON.stringify(connections));
      localStorage.setItem(STORAGE_KEY_ACTIVE_STUDIO, activeStudio);
    } catch (error) {
      console.error("Failed to save node layout:", error);
    }
  }, [nodes, connections, activeStudio]);

  return {
    saveLayout: () => {
      try {
        localStorage.setItem(STORAGE_KEY_NODES, JSON.stringify(nodes));
        localStorage.setItem(STORAGE_KEY_CONNECTIONS, JSON.stringify(connections));
        localStorage.setItem(STORAGE_KEY_ACTIVE_STUDIO, activeStudio);
        return true;
      } catch (error) {
        console.error("Failed to save layout:", error);
        return false;
      }
    },
    clearLayout: () => {
      try {
        localStorage.removeItem(STORAGE_KEY_NODES);
        localStorage.removeItem(STORAGE_KEY_CONNECTIONS);
        localStorage.removeItem(STORAGE_KEY_ACTIVE_STUDIO);
        return true;
      } catch (error) {
        console.error("Failed to clear layout:", error);
        return false;
      }
    }
  };
}

/**
 * Load saved layout from localStorage
 */
export function loadSavedLayout(): {
  nodes: NodeInstance[];
  connections: NodeConnection[];
  activeStudio: string;
} | null {
  try {
    const savedNodes = localStorage.getItem(STORAGE_KEY_NODES);
    const savedConnections = localStorage.getItem(STORAGE_KEY_CONNECTIONS);
    const savedStudio = localStorage.getItem(STORAGE_KEY_ACTIVE_STUDIO);

    if (savedNodes && savedConnections) {
      return {
        nodes: JSON.parse(savedNodes),
        connections: JSON.parse(savedConnections),
        activeStudio: savedStudio || "code"
      };
    }
  } catch (error) {
    console.error("Failed to load saved layout:", error);
  }
  return null;
}

/**
 * Export layout to JSON file
 */
export function exportLayout(
  nodes: NodeInstance[],
  connections: NodeConnection[],
  name: string = "leeway-layout"
) {
  const layout = {
    version: "1.0",
    timestamp: new Date().toISOString(),
    nodes,
    connections
  };

  const blob = new Blob([JSON.stringify(layout, null, 2)], {
    type: "application/json"
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${name}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Import layout from JSON file
 */
export function importLayout(
  file: File,
  callback: (nodes: NodeInstance[], connections: NodeConnection[]) => void
) {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const layout = JSON.parse(e.target?.result as string);
      if (layout.nodes && layout.connections) {
        callback(layout.nodes, layout.connections);
      }
    } catch (error) {
      console.error("Failed to import layout:", error);
    }
  };
  reader.readAsText(file);
}

// Leeway Standards: governed module
