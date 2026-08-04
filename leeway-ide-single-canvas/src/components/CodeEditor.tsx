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

import React, { useState, useEffect, useRef } from "react";
import { X, Play, Code, AlertTriangle, CheckCircle } from "lucide-react";
import { WorkspaceFile } from "../types";

interface CodeEditorProps {
  files: WorkspaceFile[];
  currentFilePath: string;
  onSelectFile: (path: string) => void;
  openTabs: string[];
  onCloseTab: (path: string) => void;
  onFileContentChange: (path: string, newContent: string) => void;
  onRunCompilation: () => void;
}

export function CodeEditor({ 
  files, 
  currentFilePath, 
  onSelectFile, 
  openTabs, 
  onCloseTab,
  onFileContentChange,
  onRunCompilation
}: CodeEditorProps) {
  const activeFile = files.find(f => f.path === currentFilePath) || files[0];
  const [editingContent, setEditingContent] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (activeFile) {
      setEditingContent(activeFile.content);
    }
  }, [currentFilePath, activeFile]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setEditingContent(val);
    onFileContentChange(activeFile.path, val);
  };

  // Syntax highlighting helper for visual presentation of standard TypeScript code
  const highlightCode = (code: string, language: string) => {
    if (!code) return "";
    
    // Safety escape
    const escaped = code
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    if (language === "css") {
      return escaped
        .replace(/(:\s*[^;]+;)/g, '<span class="text-teal-400">$1</span>')
        .replace(/(\.[a-zA-Z0-9_-]+)/g, '<span class="text-amber-400">$1</span>')
        .replace(/(:\s*)/g, '<span class="text-indigo-400">$1</span>');
    }

    if (language === "json") {
      return escaped
        .replace(/("[a-zA-Z0-9_-]+")\s*:/g, '<span class="text-[#ff3366]">$1</span>:')
        .replace(/:\s*("[^"]*")/g, ': <span class="text-emerald-400">$1</span>')
        .replace(/:\s*([0-9]+)/g, ': <span class="text-amber-400">$1</span>');
    }

    // Default JS / TS code highlighter
    return escaped
      // Keywords
      .replace(/\b(import|from|export|default|function|const|let|var|return|if|else|for|while|try|catch|new|throw|await|async|class|interface|export|typeof|instanceof)\b/g, '<span class="text-purple-400 font-semibold">$1</span>')
      // Custom React tags like <Header, <TaskCard, <Button
      .replace(/(&lt;[A-Z][a-zA-Z0-9]*)/g, '<span class="text-amber-400 font-medium">$1</span>')
      .replace(/([A-Z][a-zA-Z0-9]*Props)/g, '<span class="text-teal-400">$1</span>')
      // HTML native tags like div, span, button
      .replace(/(&lt;[a-z]+|&lt;\/[a-z]+)/g, '<span class="text-[#ff3366] font-medium">$1</span>')
      // Custom string literals
      .replace(/("[^"]*"|'[^']*'|`[^`]*`)/g, '<span class="text-emerald-400">$1</span>')
      // Comments
      .replace(/(\/\/.*)/g, '<span class="text-gray-500 font-light italic">$1</span>');
  };

  const getBreadcrumbs = (path: string) => {
    return path.split("/").map((part, index, array) => {
      const isLast = index === array.length - 1;
      return (
        <span key={index} className="flex items-center space-x-1">
          <span className={isLast ? "text-gray-200 font-medium" : "text-gray-500"}>{part}</span>
          {!isLast && <span className="text-gray-600">/</span>}
        </span>
      );
    });
  };

  const lines = editingContent.split("\n");

  return (
    <div className="flex-1 bg-[#0d1117] flex flex-col min-h-0 relative select-text" id="code-editor-root">
      {/* Tab Navigation header */}
      <div className="flex bg-[#161b22] border-b border-[#30363d] h-10 select-none overflow-x-auto overflow-y-hidden custom-scrollbar">
        {openTabs.map(tabPath => {
          const file = files.find(f => f.path === tabPath);
          if (!file) return null;
          const isActive = tabPath === currentFilePath;
          
          return (
            <div
              key={tabPath}
              className={`flex items-center space-x-1 px-4 border-r border-[#30363d] relative cursor-pointer text-xs h-full shrink-0 group transition-colors ${
                isActive 
                  ? "bg-[#0d1117] text-white" 
                  : "bg-[#161b22] text-gray-400 hover:bg-[#0d1117]/60 hover:text-gray-200"
              }`}
              onClick={() => onSelectFile(tabPath)}
            >
              {/* File Icon */}
              <span className="text-[9px] font-mono font-bold uppercase py-0.5 px-1 rounded bg-[#3178c6]/10 text-[#3178c6] scale-90 mr-1.5 border border-[#30363d]">
                {file.name.substring(file.name.lastIndexOf(".") + 1).slice(0, 3)}
              </span>
              <span>{file.name}</span>
              
              {/* Close Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onCloseTab(tabPath);
                }}
                className="opacity-0 group-hover:opacity-100 hover:bg-white/10 rounded p-0.5 text-gray-500 hover:text-white transition-opacity ml-2 shrink-0 cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>

              {/* Bottom active block highlight */}
              {isActive && (
                <div className="absolute left-0 right-0 bottom-0 h-[2.5px] bg-blue-500" />
              )}
            </div>
          );
        })}

        {/* Empty tab text */}
        {openTabs.length === 0 && (
          <div className="flex items-center px-4 text-xs text-gray-500 font-mono italic">
            No active buffers
          </div>
        )}
      </div>

      {/* Editor Header Breadcrumbs & Tools */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#161b22]/95 border-b border-[#30363d] h-8 select-none text-[11px] font-mono">
        <div className="flex items-center space-x-1.5 text-gray-500">
          <Code className="w-3.5 h-3.5 text-gray-400" />
          <span className="text-gray-600 font-sans">:</span>
          <div className="flex items-center space-x-1 font-sans">{getBreadcrumbs(activeFile?.path || "")}</div>
        </div>
        
        {/* Play compilation launcher */}
        <button
          onClick={onRunCompilation}
          title="Run compilation build checker"
          className="flex items-center space-x-1.5 px-3 py-1 bg-[#238636] hover:bg-[#2ea043] rounded text-[10px] text-white font-medium tracking-wide active:scale-95 transition-all cursor-pointer shadow-md shadow-emerald-950/20"
        >
          <Play className="w-3 h-3 fill-white" />
          <span>RUN CODE & BUILD</span>
        </button>
      </div>

      {/* High-Fidelity Monaco Code Canvas Split */}
      <div className="flex-1 overflow-auto relative font-mono custom-scrollbar" id="editor-body-viewport">
        {/* Lines Numbering */}
        <div className="absolute left-0 top-0 bottom-0 w-12 bg-[#161b22]/40 border-r border-[#30363d] select-none py-4 text-right pr-3.5 text-gray-600 text-xs text-mono space-y-1 z-10 leading-6">
          {lines.map((_, i) => (
            <div key={i}>{i + 1}</div>
          ))}
        </div>

        {/* Integrated Code Inputs & Overlay Highlighting */}
        <div className="relative pl-14 py-4 min-h-full leading-6 text-xs text-gray-300">
          {/* Synchronized editable text area */}
          <textarea
            ref={textareaRef}
            value={editingContent}
            onChange={handleChange}
            autoCapitalize="none"
            autoComplete="none"
            spellCheck="false"
            className="absolute left-14 top-4 right-0 bottom-0 min-h-full w-[calc(100%-3.5rem)] opacity-0 bg-transparent text-transparent caret-white resize-none border-0 p-0 focus:outline-0 focus:ring-0 leading-6 text-xs font-mono z-20"
            style={{ whiteSpace: "pre", overflow: "hidden" }}
          />

          {/* Pretty Formatted Highlighter View */}
          <pre 
            className="absolute left-14 top-4 right-0 bottom-0 pointer-events-none whitespace-pre select-text pr-4 leading-6 text-xs z-10"
            dangerouslySetInnerHTML={{ 
              __html: highlightCode(editingContent, activeFile?.language || "typescript") 
            }}
          />
        </div>
      </div>
    </div>
  );
}
