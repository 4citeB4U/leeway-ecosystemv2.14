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

import { useState } from "react";
import { 
  Folder, 
  FolderOpen, 
  FileCode, 
  ChevronDown, 
  ChevronRight, 
  Terminal,
  FileText
} from "lucide-react";
import { WorkspaceFile } from "../types";

interface FileExplorerProps {
  files: WorkspaceFile[];
  currentFilePath: string;
  onSelectFile: (path: string) => void;
}

export function FileExplorer({ files, currentFilePath, onSelectFile }: FileExplorerProps) {
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({
    "src": true,
    "src/pages": true,
    "src/components": true,
    "src/hooks": true,
    "src/services": true,
    "src/styles": false,
    "automation": true,
  });

  const toggleFolder = (path: string) => {
    setExpandedFolders(prev => ({
      ...prev,
      [path]: !prev[path]
    }));
  };

  // Predefined tree structure for visual elegance
  const workspaceTree = [
    {
      type: "directory",
      name: "src",
      path: "src",
      children: [
        {
          type: "directory",
          name: "pages",
          path: "src/pages",
          children: [
            { type: "file", name: "Home.tsx", path: "src/pages/Home.tsx", ext: "TS" },
            { type: "file", name: "Tasks.tsx", path: "src/pages/Tasks.tsx", ext: "TS" },
            { type: "file", name: "Analytics.tsx", path: "src/pages/Analytics.tsx", ext: "TS" }
          ]
        },
        {
          type: "directory",
          name: "components",
          path: "src/components",
          children: [
            { type: "file", name: "Header.tsx", path: "src/components/Header.tsx", ext: "TS" },
            { type: "file", name: "TaskCard.tsx", path: "src/components/TaskCard.tsx", ext: "TS" },
            { type: "file", name: "Chart.tsx", path: "src/components/Chart.tsx", ext: "TS" },
            { type: "file", name: "Button.tsx", path: "src/components/Button.tsx", ext: "TS" }
          ]
        },
        {
          type: "directory",
          name: "hooks",
          path: "src/hooks",
          children: [
            { type: "file", name: "useTasks.ts", path: "src/hooks/useTasks.ts", ext: "TS" }
          ]
        },
        {
          type: "directory",
          name: "services",
          path: "src/services",
          children: [
            { type: "file", name: "api.ts", path: "src/services/api.ts", ext: "TS" },
            { type: "file", name: "storage.ts", path: "src/services/storage.ts", ext: "TS" }
          ]
        },
        {
          type: "directory",
          name: "styles",
          path: "src/styles",
          children: [
            { type: "file", name: "theme.css", path: "src/styles/theme.css", ext: "CSS" }
          ]
        }
      ]
    },
    {
      type: "directory",
      name: "automation",
      path: "automation",
      children: [
        { type: "file", name: "workflows.json", path: "automation/workflows.json", ext: "JSON" }
      ]
    },
    { type: "file", name: "package.json", path: "package.json", ext: "NPM" },
    { type: "file", name: "README.md", path: "README.md", ext: "MD" }
  ];

  /* Recursive node renderer */
  const renderNode = (node: any, depth = 0) => {
    const isDir = node.type === "directory";
    const isExpanded = expandedFolders[node.path];
    const isFileActive = currentFilePath === node.path;

    if (isDir) {
      return (
        <div key={node.path} className="select-none">
          <button
            onClick={() => toggleFolder(node.path)}
            className="w-full flex items-center hover:bg-[#161b22] py-1 px-2 rounded-md font-sans text-xs text-[#c9d1d9] transition-colors cursor-pointer group"
            style={{ paddingLeft: `${depth * 12 + 6}px` }}
          >
            <span className="text-gray-500 mr-1 shrink-0">
              {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
            </span>
            <span className="mr-1.5 shrink-0 text-amber-500/80">
              {isExpanded ? <FolderOpen className="w-4 h-4 fill-amber-500/10" /> : <Folder className="w-4 h-4 fill-amber-500/15" />}
            </span>
            <span className="group-hover:text-white truncate">{node.name}</span>
          </button>
          {isExpanded && node.children && (
            <div className="mt-0.5">
              {node.children.map((child: any) => renderNode(child, depth + 1))}
            </div>
          )}
        </div>
      );
    } else {
      // Icon selection based on file extension
      let badgeColor = "bg-[#3178c6]/10 text-[#3178c6]"; // default TS blue
      let badgeTxt = "TS";
      
      if (node.ext === "CSS") {
        badgeColor = "bg-teal-500/10 text-teal-400";
        badgeTxt = "CS";
      } else if (node.ext === "JSON") {
        badgeColor = "bg-yellow-500/10 text-yellow-400";
        badgeTxt = "{}";
      } else if (node.ext === "NPM") {
        badgeColor = "bg-rose-500/10 text-rose-400";
        badgeTxt = "npm";
      } else if (node.ext === "MD") {
        badgeColor = "bg-indigo-500/10 text-indigo-400";
        badgeTxt = "M";
      }

      return (
        <button
          key={node.path}
          id={`file-tree-btn-${node.path.replace(/\//g, "-")}`}
          onClick={() => onSelectFile(node.path)}
          className={`w-full flex items-center py-1 px-2 rounded-md font-sans text-xs transition-colors cursor-pointer group ${
            isFileActive 
              ? "bg-[#161b22] text-white font-medium border-l-2 border-blue-500" 
              : "text-[#c9d1d9]/70 hover:bg-[#161b22] hover:text-blue-400"
          }`}
          style={{ paddingLeft: `${depth * 12 + 18}px` }}
        >
          {/* File extension mini tag indicator */}
          <span className={`w-5 text-center text-[8px] font-mono font-bold shrink-0 mr-2 py-0.5 rounded border border-[#30363d] ${badgeColor}`}>
            {badgeTxt}
          </span>
          <span className="truncate">{node.name}</span>
        </button>
      );
    }
  };

  return (
    <div className="w-56 bg-[#161b22]/40 border-r border-[#30363d] flex flex-col shrink-0 select-none h-full">
      {/* Pane title */}
      <div className="flex items-center justify-between p-4 border-b border-[#30363d]">
        <h3 className="text-xs uppercase font-mono font-bold tracking-wider text-gray-400">Workspace</h3>
        <div className="flex items-center space-x-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <span className="text-[10px] text-[#c9d1d9] font-medium">MyApp</span>
        </div>
      </div>

      {/* Explorer Tree List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-0.5 custom-scrollbar" id="workspace-filetree">
        {workspaceTree.map(node => renderNode(node, 0))}
      </div>
      
      {/* Explorer Bottom Context */}
      <div className="p-3 border-t border-[#30363d] bg-[#161b22] flex items-center justify-between font-mono text-[9px] text-[#c9d1d9]/60">
        <div className="flex items-center space-x-1">
          <Terminal className="w-3.5 h-3.5 text-blue-400" />
          <span>Vite Active</span>
        </div>
        <span>Port: 5173</span>
      </div>
    </div>
  );
}
