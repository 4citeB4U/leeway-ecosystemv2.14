/**
 * LEEWAY_HEADER - DO NOT REMOVE
 *
 * REGION: UI
 * TAG: UI.NAVIGATION.SIDEBAR.MAIN
 * DESCRIPTION: Sidebar navigation for Leeway IDE - studio workspace switcher
 * AUTHORITY: LeeWay-Standards
 * DISCOVERY_PIPELINE: Voice -> Intent -> Location -> Vertical -> Ranking -> Render
 *
 * 5WH:
 * WHAT = Sidebar Navigation - Leeway IDE workspace navigation component
 * WHY = Provide quick access to all studio workspaces (Code, Writer, Audio, Vision, Video, XR, Devices, Knowledge, Settings)
 * WHO = Leeway Innovations / Agent Lee Enablement
 * WHERE = leeway-ide-single-canvas/src/components/Sidebar.tsx
 * WHEN = 2026-06-06
 * HOW = React component with icon-based navigation following Leeway Runtime Fabric standards
 *
 * CHAIN: Standards → Integrated → Runtime → Projections
 * LICENSE: PROPRIETARY
 */

import {
  Code,
  Eye,
  Volume2,
  Cpu,
  Database,
  Settings,
  Terminal,
  PenTool,
  Film,
  Boxes
 ,Rocket
 ,AppWindow
} from "lucide-react";

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: any) => void;
  isConsoleOpen: boolean;
  setIsConsoleOpen: (open: boolean) => void;
  /**
   * Optional callback fired when a navigation icon is clicked. This allows
   * the parent App component to perform additional actions beyond simply
   * switching which sidebar tab is highlighted. For example, the unified
   * single‑page version of the Leeway IDE uses this callback to open
   * specific studio nodes on the automation canvas instead of routing
   * to a different page. When not provided, only the activeTab state is
   * updated.
   */
  onNavClick?: (tab: string) => void;
}

export function Sidebar({ activeTab, setActiveTab, isConsoleOpen, setIsConsoleOpen, onNavClick }: SidebarProps) {
  // Define the navigation items in the order prescribed by the LeeWay standards.
  // The standalone "canvas" and "preview" pages have been removed. The
  // navigation now reflects studios: Code, Writer, Audio, Vision, Video,
  // XR / Spatial, Devices, Knowledge, and Settings. Each entry has an
  // identifier (id) used for routing, an icon from lucide-react, and
  // a human‑readable label. The first word of the label is used in
  // the sidebar's small caption.
  const navItems = [
    { id: "code", icon: Code, label: "Code" },
    { id: "writer", icon: PenTool, label: "Writer" },
    { id: "audio", icon: Volume2, label: "Audio" },
    { id: "vision", icon: Eye, label: "Vision" },
    { id: "video", icon: Film, label: "Video" },
    { id: "forge", icon: Rocket, label: "Publish" },
    { id: "xr", icon: Boxes, label: "XR / Spatial" },
    { id: "terminal", icon: Terminal, label: "Terminal Fabric" },
    { id: "devices", icon: Cpu, label: "Devices" },
    { id: "knowledge", icon: Database, label: "Knowledge" },
    { id: "applications", icon: AppWindow, label: "Apps" },
    { id: "settings", icon: Settings, label: "Settings" }
  ];

  return (
    <div className="w-16 bg-[#0d1117] border-r border-[#30363d] flex flex-col text-gray-500 shrink-0 select-none h-full overflow-hidden" id="navigation-sidebar-container">
      {/* Top Section: App Brand Icon (Non-scrolling) */}
      <div className="flex flex-col items-center pt-3 pb-2 shrink-0">
        <div className="w-9 h-9 bg-blue-500 rounded-xl flex items-center justify-center text-white font-bold text-base shadow-lg shadow-blue-500/20">
          L
        </div>
      </div>

      {/* Middle Section: Scrollable Navigation items */}
      <div className="flex-1 w-full overflow-y-auto custom-scrollbar px-1 py-2 space-y-1">
        <nav className="flex flex-col space-y-1 w-full" id="sidebar-navigation">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                id={`sidebar-btn-${item.id}`}
                onClick={() => {
                  // Always set the active tab so the UI highlights
                  setActiveTab(item.id);
                  // Additionally invoke the parent callback if provided to
                  // open a node or perform other actions. This allows the
                  // unified single‑page architecture to treat each nav
                  // click as a request to spawn a studio node on the
                  // automation canvas.
                  onNavClick?.(item.id);
                }}
                title={item.label}
                className={`relative group flex flex-col items-center justify-center py-2 rounded-lg transition-all cursor-pointer ${
                  isActive 
                    ? "bg-[#161b22] text-white font-medium border border-[#30363d]" 
                    : "hover:bg-[#161b22]/50 hover:text-gray-300"
                }`}
              >
                <Icon className={`w-4 h-4 transition-transform group-hover:scale-105 duration-200 ${isActive ? "text-blue-400" : ""}`} />
                <span className="text-[8px] mt-0.5 font-sans font-light tracking-wide scale-90">{item.label.split(" ")[0]}</span>

                {/* Active Indicator bar */}
                {isActive && (
                  <div className="absolute left-0 top-2 bottom-2 w-[2.5px] bg-blue-500 rounded-r-md" />
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Section: Agent Lee app-control truth block (Non-scrolling) */}
      <div className="flex flex-col items-center py-3 border-t border-[#161b22]/80 shrink-0">
        <div className="relative group cursor-pointer flex flex-col items-center justify-center">
          <div className="w-8 h-8 rounded-full bg-[#161b22] border border-blue-500/30 flex items-center justify-center overflow-hidden">
            <span className="text-[10px] text-white font-semibold">AL</span>
          </div>
          <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-blue-500 rounded-full border-2 border-[#0d1117]" />
          
          {/* Status Tooltip popup */}
          <div className="absolute left-14 bottom-0 bg-[#161b22] border border-[#30363d] rounded-lg p-2 shadow-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none w-36 z-50">
            <p className="text-[10px] font-bold text-white">Agent Lee</p>
            <p className="text-[9px] text-[#c9d1d9]/75 font-sans">Single canvas app control</p>
            <div className="flex items-center space-x-1 mt-1 font-sans">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
              <span className="text-[8px] text-blue-400 font-mono font-bold uppercase">Runtime receipt-bound</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
