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

import React, { useState, useEffect } from "react";
import { 
  Smartphone, 
  Tablet, 
  Monitor, 
  RotateCw, 
  ExternalLink, 
  Plus, 
  CheckSquare, 
  Square, 
  ChevronRight, 
  Clock,
  PieChart
} from "lucide-react";

interface AppTask {
  id: string;
  title: string;
  completed: boolean;
  dueDate: string;
  category: string;
}

export function LivePreview() {
  const [viewportMode, setViewportMode] = useState<"mobile" | "tablet" | "desktop">("mobile");
  const [activePage, setActivePage] = useState<"home" | "tasks" | "analytics">("home");
  const [customPages, setCustomPages] = useState<string[]>(["Home", "Tasks", "Analytics"]);
  
  // Interactive prototype tasks pool state
  const [tasks, setTasks] = useState<AppTask[]>([
    { id: "1", title: "Design new dashboard layout", completed: true, dueDate: "Today", category: "Design" },
    { id: "2", title: "Review analytics integrations", completed: true, dueDate: "Today", category: "Review" },
    { id: "3", title: "Implement system webhook events", completed: false, dueDate: "Tomorrow", category: "Engineering" },
    { id: "4", title: "Run telemetry unit tests", completed: false, dueDate: "Tomorrow", category: "Testing" }
  ]);
  
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [isAddingPage, setIsAddingPage] = useState(false);
  const [newPageName, setNewPageName] = useState("");

  const handleToggleTask = (id: string) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    const fresh: AppTask = {
      id: Date.now().toString(),
      title: newTaskTitle.trim(),
      completed: false,
      dueDate: "Today",
      category: "User Created"
    };
    setTasks(prev => [fresh, ...prev]);
    setNewTaskTitle("");
  };

  const handleCreatePage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPageName.trim()) return;
    setCustomPages(prev => [...prev, newPageName.trim()]);
    setNewPageName("");
    setIsAddingPage(false);
  };

  const completedCount = tasks.filter(t => t.completed).length;
  const progressPercent = Math.round((completedCount / (tasks.length || 1)) * 100);

  return (
    <div className="flex-1 flex flex-col min-h-0 select-none bg-[#161b22]/50 border border-[#30363d] rounded-2xl overflow-hidden p-4" id="live-preview-panel-container">
      {/* Header Viewport Switcher */}
      <div className="flex items-center justify-between border-b border-[#30363d] pb-3.5 mb-4 shrink-0">
        <div className="flex items-center space-x-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-white">Live Applet Preview</h3>
        </div>

        {/* Viewport Form Selectors */}
        <div className="flex items-center space-x-1.5 bg-[#0d1117] p-1 rounded-xl border border-[#30363d]">
          <button
            onClick={() => setViewportMode("mobile")}
            className={`p-2 rounded-lg transition-all cursor-pointer ${
              viewportMode === "mobile" ? "bg-blue-500 text-white" : "text-gray-400 hover:text-white"
            }`}
            title="Mobile iPhone Sim"
          >
            <Smartphone className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewportMode("tablet")}
            className={`p-2 rounded-lg transition-all cursor-pointer ${
              viewportMode === "tablet" ? "bg-blue-500 text-white" : "text-gray-400 hover:text-white"
            }`}
            title="Tablet iPad Sim"
          >
            <Tablet className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewportMode("desktop")}
            className={`p-2 rounded-lg transition-all cursor-pointer ${
              viewportMode === "desktop" ? "bg-blue-500 text-white" : "text-gray-400 hover:text-white"
            }`}
            title="Desktop Browser Sim"
          >
            <Monitor className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Pages switcher & frame simulation pane splits */}
      <div className="flex-1 flex gap-4 min-h-0 overflow-hidden">
        {/* Pages directory switcher */}
        <div className="w-44 shrink-0 flex flex-col justify-between border-r border-[#30363d] pr-4 select-none">
          <div className="space-y-3">
            <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-gray-500 font-bold mb-1">
              <span>App Interfaces</span>
              <span className="text-[9px] bg-blue-500/15 text-blue-400 px-1 rounded">active</span>
            </div>
            
            <div className="space-y-1.5 overflow-y-auto max-h-56 custom-scrollbar pr-1">
              {customPages.map((page) => {
                const isCurrent = activePage === page.toLowerCase();
                return (
                  <button
                    key={page}
                    onClick={() => setActivePage(page.toLowerCase() as any)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left text-xs transition-all cursor-pointer ${
                      isCurrent 
                        ? "bg-[#161b22] border border-blue-500/40 text-white font-medium" 
                        : "bg-[#0d1117]/80 hover:bg-[#161b22] text-[#c9d1d9]/80"
                    }`}
                  >
                    <span className="truncate">{page}</span>
                    <ChevronRight className={`w-3.5 h-3.5 transition-transform ${isCurrent ? "translate-x-0.5 text-blue-400" : "text-gray-600"}`} />
                  </button>
                );
              })}
            </div>

            {/* In-app page creation selector */}
            {!isAddingPage ? (
              <button
                onClick={() => setIsAddingPage(true)}
                className="w-full py-1.5 border border-dashed border-[#30363d] hover:bg-white/5 rounded-xl flex items-center justify-center space-x-1 text-[10px] uppercase font-mono tracking-wider font-bold text-gray-500 hover:text-gray-300 transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Custom Page</span>
              </button>
            ) : (
              <form onSubmit={handleCreatePage} className="p-2 bg-[#0d1117] border border-[#30363d] rounded-xl space-y-1.5">
                <input
                  type="text"
                  placeholder="Page Name..."
                  value={newPageName}
                  onChange={(e) => setNewPageName(e.target.value)}
                  className="w-full bg-[#0d1117] text-xs px-2 py-1 focus:outline-none border border-[#30363d] rounded focus:border-blue-500 text-gray-200"
                  autoFocus
                />
                <div className="flex gap-1.5">
                  <button 
                    type="submit" 
                    className="flex-1 py-1 bg-blue-500 text-white text-[9px] uppercase tracking-wider font-bold rounded hover:opacity-90 cursor-pointer"
                  >
                    Add
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setIsAddingPage(false)} 
                    className="px-2 py-1 bg-white/5 text-gray-400 text-[9px] uppercase tracking-wider rounded hover:bg-white/10 cursor-pointer"
                  >
                    X
                  </button>
                </div>
              </form>
            )}
          </div>

          <div className="bg-[#000000]/10 p-2.5 rounded-xl border border-[#30363d] text-[9px] font-mono text-gray-500">
            <span className="block font-semibold text-gray-400 mb-0.5">Mock Server Proxy:</span>
            <span className="block text-emerald-400">● Live on port 3000</span>
          </div>
        </div>

        {/* Viewport Wrapper Canvas */}
        <div className="flex-1 flex items-center justify-center bg-[#0d1117]/50 border border-[#30363d] rounded-xl p-3 select-none overflow-y-auto w-full">
          {viewportMode === "mobile" && (
            /* Elegant iPhone 15 Pro Wrapper mock frame container */
            <div className="w-64 h-[440px] bg-[#0d1117] border-4 border-[#30363d] rounded-[36px] shadow-2xl relative flex flex-col p-1.5 shrink-0 overflow-hidden ring-4 ring-[#161b22]">
              {/* iPhone Island notch */}
              <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-16 h-3 bg-black rounded-full z-50 flex items-center justify-center">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500/30 self-center absolute right-3" />
              </div>

              {/* iPhone internal UI header bar */}
              <div className="h-6 flex items-center justify-between px-4 text-[9px] text-gray-500 font-mono mt-1 shrink-0">
                <span>10:42</span>
                <div className="flex items-center space-x-1 shrink-0">
                  <span className="w-2 h-1.5 rounded-sm bg-gray-500" />
                  <span className="w-3 h-1.5 rounded-sm bg-emerald-500 text-[6px] font-bold text-center leading-none text-black">98</span>
                </div>
              </div>

              {/* iOS Live mock screen context */}
              <div className="flex-grow bg-[#0d1117] rounded-[28px] overflow-hidden flex flex-col p-3 min-h-0 select-none">
                {/* Home Page list view */}
                {activePage === "home" && (
                  <div className="flex flex-col h-full">
                    <div className="flex items-center justify-between mt-2 mb-3.5 border-b border-[#30363d] pb-2 shrink-0">
                      <span className="text-sm font-bold text-white font-sans tracking-tight">My Tasks</span>
                      <span className="text-[8px] bg-emerald-500/10 border border-emerald-500/15 text-emerald-400 px-1.5 py-0.2 rounded font-mono font-bold tracking-tight">Synced</span>
                    </div>

                    {/* Checkbox tasks scroller list */}
                    <div className="flex-1 overflow-y-auto space-y-2 pr-0.5 custom-scrollbar min-h-0">
                      {tasks.map(t => (
                        <div 
                           key={t.id}
                           onClick={() => handleToggleTask(t.id)}
                           className={`flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer ${
                             t.completed 
                               ? "bg-white/5 border-[#30363d] opacity-40 line-through" 
                               : "bg-[#161b22] border-[#30363d] hover:border-blue-500/30"
                           }`}
                        >
                          <div className="flex items-center space-x-2 truncate font-sans">
                            {t.completed ? (
                              <CheckSquare className="w-4 h-4 text-emerald-400 shrink-0" />
                            ) : (
                              <Square className="w-4 h-4 text-gray-500 shrink-0 hover:text-blue-400" />
                            )}
                            <span className="text-[10px] text-gray-200 truncate font-sans tracking-tight font-medium">{t.title}</span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Quick insert action form form */}
                    <form onSubmit={handleAddTask} className="mt-3 select-none flex space-x-1.5 shrink-0 border-t border-[#30363d] pt-3">
                      <input
                        type="text"
                        value={newTaskTitle}
                        onChange={(e) => setNewTaskTitle(e.target.value)}
                        placeholder="Add fast task..."
                        className="flex-1 bg-[#161b22] border border-[#30363d] rounded-lg text-[9px] px-2 py-1.5 text-gray-200 focus:outline-none focus:border-blue-500"
                      />
                      <button 
                        type="submit"
                        className="bg-blue-500 hover:bg-blue-600 shadow shadow-blue-500/20 p-2 rounded-lg text-white transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5 animate-pulse" />
                      </button>
                    </form>
                  </div>
                )}

                {/* Filtered lists page simulation view */}
                {activePage === "tasks" && (
                  <div className="flex flex-col h-full">
                    <div className="flex justify-between items-center mt-2 mb-3 shrink-0">
                      <span className="text-sm font-bold text-white font-sans">Pending Tasks</span>
                      <span className="text-[9px] text-blue-400 font-mono font-bold tracking-tight bg-blue-500/10 px-1.5 py-0.2 rounded border border-blue-500/20">
                        {tasks.filter(t => !t.completed).length} items
                      </span>
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-2 pr-0.5 custom-scrollbar min-h-0">
                      {tasks.filter(t => !t.completed).map(t => (
                        <div 
                          key={t.id}
                          onClick={() => handleToggleTask(t.id)}
                          className="flex items-center justify-between p-2.5 bg-[#161b22] rounded-xl border border-[#30363d] transition-all cursor-pointer font-sans"
                        >
                          <div className="flex items-center space-x-2 truncate">
                            <Square className="w-4 h-4 text-gray-500 shrink-0" />
                            <span className="text-[10px] text-gray-200 truncate font-sans tracking-tight font-medium">{t.title}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Simulated Chart/Analytics view */}
                {activePage === "analytics" && (
                  <div className="flex flex-col h-full">
                    <div className="mt-2 mb-3 shrink-0">
                      <span className="text-sm font-bold text-white font-sans">Analytics Dashboard</span>
                    </div>

                    <div className="bg-[#161b22] p-3 rounded-2xl border border-[#30363d] space-y-3 flex-1 overflow-y-auto custom-scrollbar">
                      <div className="text-center py-2 shrink-0 font-sans">
                        <PieChart className="w-8 h-8 text-blue-400 mx-auto mb-1 animate-pulse" />
                        <span className="text-[10px] font-mono text-gray-400">Completion Gauge</span>
                        <h4 className="text-xl font-bold font-mono text-white mt-1 ">{progressPercent}%</h4>
                      </div>

                      {/* Bar Gauge visual */}
                      <div className="space-y-1.5 font-sans">
                        <div className="flex justify-between text-[8px] font-mono text-gray-500">
                          <span>Ratio</span>
                          <span>{completedCount} of {tasks.length}</span>
                        </div>
                        <div className="h-2 bg-[#0d1117] border border-[#30363d] rounded-full overflow-hidden">
                          <div 
                            style={{ width: `${progressPercent}%` }}
                            className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-300"
                          />
                        </div>
                      </div>

                      <div className="border-t border-[#30363d] pt-2.5 mt-2 space-y-1.5 text-[9px] text-gray-400">
                        <div className="flex justify-between font-sans">
                          <span>Design Task percentage:</span>
                          <span className="font-mono text-white font-bold">100%</span>
                        </div>
                        <div className="flex justify-between font-sans">
                          <span>Automations fired today:</span>
                          <span className="font-mono text-white font-bold">14 times</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {viewportMode === "tablet" && (
            /* iPad simulated responsive frame */
            <div className="w-[340px] h-[340px] bg-[#0d1117] border-6 border-[#30363d] rounded-[24px] shadow-2xl p-3 shrink-0 relative flex flex-col overflow-hidden ring-4 ring-[#161b22]">
              <div className="flex items-center justify-between border-b border-[#30363d] pb-2 mb-3 shrink-0 text-white font-sans font-bold text-xs select-none">
                <span>MyApp Workspace Tablet Console</span>
                <span className="text-[8px] bg-blue-500/10 border border-blue-500/15 text-blue-400 px-1 rounded uppercase tracking-wider font-mono">active</span>
              </div>
              <div className="flex-1 bg-[#0d1117] rounded-xl p-3 text-xs overflow-y-auto text-gray-400">
                <span className="block text-blue-400 font-bold uppercase font-mono tracking-wide mb-1.5">Active variables:</span>
                <div className="grid grid-cols-2 gap-2 text-[10px] p-2 bg-[#161b22] rounded border border-[#30363d] font-mono mb-2">
                  <div>completed_count = {completedCount}</div>
                  <div>total_pool = {tasks.length}</div>
                  <div>progress_level = {progressPercent}%</div>
                  <div>selected_page = '{activePage}'</div>
                </div>

                <div className="space-y-1 mt-2 font-sans">
                  <p>In tablet mode, you can inspect simulated UI bounds dynamically. If you want to modify grid systems, please add responsive breakpoints like <code className="text-blue-400 bg-white/5 px-1 py-0.5 rounded text-[9px] font-mono">md:grid-cols-2</code> to the pages list layout inside the VS code text editor.</p>
                </div>
              </div>
            </div>
          )}

          {viewportMode === "desktop" && (
            /* Full desktop simulated preview frame */
            <div className="w-[430px] h-[330px] bg-[#0d1117] border-2 border-[#30363d] rounded-xl shadow-2xl flex flex-col shrink-0 overflow-hidden select-none">
              <div className="bg-[#161b22] px-3 py-1.5 border-b border-[#30363d] flex items-center justify-between shrink-0 font-mono text-[9px] text-gray-500">
                <div className="flex items-center space-x-1.5 shrink-0">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                  <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
                  <span className="w-2.5 h-2.5 rounded-full bg-green-500/80" />
                </div>
                <span>http://localhost:3000/my-app</span>
                <span className="text-blue-400">Chrome 125</span>
              </div>
              
              <div className="flex-1 bg-[#0d1117] p-4 text-xs overflow-y-auto text-gray-300 select-none custom-scrollbar min-h-0">
                <h3 className="text-sm font-bold text-white mb-2 ml-1">MyApp Desktop Integration</h3>
                <div className="grid grid-cols-2 gap-3.5 mb-2.5">
                  <div className="p-3 bg-[#161b22] rounded-xl border border-[#30363d] space-y-1.5">
                    <span className="text-[9px] font-mono text-gray-500 uppercase tracking-widest block font-bold">Metrics Overview</span>
                    <div className="text-xl font-bold font-mono tracking-tight text-white">{completedCount} <span className="text-gray-500 text-xs font-normal">items checked</span></div>
                  </div>
                  <div className="p-3 bg-[#161b22] rounded-xl border border-[#30363d] space-y-1.5">
                    <span className="text-[9px] font-mono text-gray-500 uppercase tracking-widest block font-bold">Active Stream</span>
                    <span className="text-xs text-blue-400 font-semibold uppercase font-mono">Webhook listening</span>
                  </div>
                </div>

                <div className="border border-[#30363d] p-3 rounded-xl bg-[#161b22]/40">
                  <p className="font-sans text-[11px] text-gray-400">Desktop presentation runs adaptive media queries securely. The live server is proxying client-side interactions safely under port 3000 container routing.</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
