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
 * 
 * Layout template selector
 */

import React, { useState } from "react";
import { X, Layout, Search } from "lucide-react";
import { LAYOUT_TEMPLATES, LayoutTemplate } from "../data/layoutTemplates";

interface TemplateSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTemplate: (template: LayoutTemplate) => void;
}

export function TemplateSelector({ isOpen, onClose, onSelectTemplate }: TemplateSelectorProps) {
  const [searchQuery, setSearchQuery] = useState("");

  if (!isOpen) return null;

  const filteredTemplates = LAYOUT_TEMPLATES.filter(t =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const categories = Array.from(new Set(LAYOUT_TEMPLATES.map(t => t.category)));

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-[#0d1117] border border-[#30363d] rounded-xl shadow-2xl w-[800px] max-h-[600px] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#30363d]">
          <div className="flex items-center gap-2">
            <Layout className="w-5 h-5 text-blue-400" />
            <h2 className="text-lg font-bold text-white">Layout Templates</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-[#30363d]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-[#0d1117] border border-[#30363d] rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {/* Templates Grid */}
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          {categories.map(category => {
            const categoryTemplates = filteredTemplates.filter(t => t.category === category);
            if (categoryTemplates.length === 0) return null;

            return (
              <div key={category} className="mb-6">
                <h3 className="text-xs font-bold text-gray-400 uppercase mb-3">{category}</h3>
                <div className="grid grid-cols-2 gap-3">
                  {categoryTemplates.map(template => (
                    <button
                      key={template.id}
                      onClick={() => {
                        onSelectTemplate(template);
                        onClose();
                      }}
                      className="text-left p-4 bg-[#161b22] border border-[#30363d] rounded-lg hover:border-blue-500 hover:bg-[#1c2128] transition-all group"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors">
                          {template.name}
                        </h4>
                        <span className="text-xs text-gray-500 bg-[#0d1117] px-2 py-0.5 rounded">
                          {template.nodes.length} nodes
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 line-clamp-2">
                        {template.description}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}

          {filteredTemplates.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <Layout className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No templates found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Leeway Standards: governed module