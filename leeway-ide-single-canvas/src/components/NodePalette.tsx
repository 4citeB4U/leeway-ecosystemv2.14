/**
 * LEEWAY_HEADER - DO NOT REMOVE
 *
 * REGION: UI
 * TAG: UI.COMPONENT.PLACEHOLDER
 * DESCRIPTION: Leeway IDE component
 * AUTHORITY: LeeWay-Standards
 * DISCOVERY_PIPELINE: Voice -> Intent -> Location -> Vertical -> Ranking -> Render
 *
 * 5WH:
 * WHAT = Component
 * WHY = Provide functionality
 * WHO = Leeway Innovations / Agent Lee Enablement
 * WHERE = FILEPATH
 * WHEN = 2026-06-06
 * HOW = React component
 *
 * CHAIN: Standards ? Integrated ? Runtime ? Projections
 * LICENSE: PROPRIETARY
 */

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { X, Search, Plus } from "lucide-react";
import { NodeDefinition } from "../types/nodeTypes";

interface NodePaletteProps {
  studioName: string;
  nodes: NodeDefinition[];
  isOpen: boolean;
  onClose: () => void;
  onNodeAdd: (nodeType: string) => void;
}

export function NodePalette({
  studioName,
  nodes,
  isOpen,
  onClose,
  onNodeAdd
}: NodePaletteProps) {
  const [searchQuery, setSearchQuery] = useState("");

  if (!isOpen) return null;

  const filteredNodes = nodes.filter(node =>
    node.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    node.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const categories = Array.from(new Set(nodes.map(n => n.category)));

  return (
    <div className="absolute left-16 top-14 bottom-0 w-80 bg-[#161b22] border-r border-[#30363d] z-50 flex flex-col shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-[#30363d] shrink-0">
        <div>
          <h2 className="text-sm font-bold text-white">{studioName} Nodes</h2>
          <p className="text-[10px] text-gray-500 mt-0.5">Drag nodes onto canvas</p>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Search */}
      <div className="p-3 border-b border-[#30363d] shrink-0">
        <div className="relative">
          <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-gray-500" />
          <input
            type="text"
            placeholder="Search nodes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {/* Node List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-4">
        {categories.map(category => {
          const categoryNodes = filteredNodes.filter(n => n.category === category);
          if (categoryNodes.length === 0) return null;

          return (
            <div key={category}>
              <h3 className="text-[10px] uppercase font-bold text-gray-500 tracking-wider mb-2">
                {category}
              </h3>
              <div className="space-y-1.5">
                {categoryNodes.map(node => (
                  <button
                    key={node.type}
                    onClick={() => onNodeAdd(node.type)}
                    className="w-full text-left p-2.5 rounded-lg border border-[#30363d] bg-[#0d1117] hover:bg-[#161b22] hover:border-blue-500/50 transition-all group cursor-pointer"
                  >
                    <div className="flex items-start space-x-2">
                      <div className="shrink-0 mt-0.5 text-blue-400 group-hover:text-blue-300">
                        {node.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold text-white truncate">
                          {node.title}
                        </div>
                        <div className="text-[10px] text-gray-500 line-clamp-2 mt-0.5">
                          {node.description}
                        </div>
                      </div>
                      <Plus className="w-3.5 h-3.5 text-gray-600 group-hover:text-blue-400 shrink-0 mt-0.5" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          );
        })}

        {filteredNodes.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <p className="text-xs">No nodes found</p>
            <p className="text-[10px] mt-1">Try a different search term</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-[#30363d] shrink-0">
        <div className="text-[9px] text-gray-500 text-center">
          {filteredNodes.length} node{filteredNodes.length !== 1 ? 's' : ''} available
        </div>
      </div>
    </div>
  );
}

// Leeway Standards: governed module
