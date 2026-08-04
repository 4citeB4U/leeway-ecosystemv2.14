/**
 * LEEWAY_HEADER - DO NOT REMOVE
 *
 * REGION: UI
 * TAG: UI.WORKSPACE.WRITER.MAIN
 * DESCRIPTION: Writer workspace for Leeway IDE - content writing, text generation, and document creation
 * AUTHORITY: LeeWay-Standards
 * DISCOVERY_PIPELINE: Voice -> Intent -> Location -> Vertical -> Ranking -> Render
 *
 * 5WH:
 * WHAT = Writer Workspace - Leeway IDE content writing and text generation surface
 * WHY = Provide comprehensive writing tools, AI-assisted content creation, and document management
 * WHO = Leeway Innovations / Agent Lee Enablement
 * WHERE = leeway-ide-single-canvas/src/components/WriterWorkspace.tsx
 * WHEN = 2026-06-06
 * HOW = React component with text editor, AI generation, and Leeway Runtime Fabric integration
 *
 * CHAIN: Standards → Integrated → Runtime → Projections
 * LICENSE: PROPRIETARY
 */

import { useState, useEffect } from "react";
import { StudioShell } from "./StudioShell";
import { StudioNode } from "./StudioNode";
import {
  PenTool,
  Plus,
  Compass,
  FileText,
  Settings,
  Grid,
  ChevronRight,
  BookOpen,
  Search,
  CheckCircle,
  Clock,
  Play,
  Pause,
  ArrowRight,
  Volume2,
  Trash2,
  Save,
  Bold,
  Italic,
  Underline,
  List,
  Link,
  Image,
  AlignLeft,
  Book
} from "lucide-react";

export function WriterWorkspace() {
  const [selectedChapter, setSelectedChapter] = useState("Chapter 2");
  const [isPlayingScript, setIsPlayingScript] = useState(false);
  const [audioProgress, setAudioProgress] = useState(84); // 1:24 in seconds is 84
  const [editorContent, setEditorContent] = useState(
    `It wasn't loud.\nIt wasn't sudden.\nIt was a thread—thin as thought—woven through the noise.\nMira had trained for years to filter distractions, but nothing prepared her for this. The signal felt alive, intentional.\nIt called not to her ears, but to something older.`
  );
  const [wordCount, setWordCount] = useState(3105);

  useEffect(() => {
    // Count real words in editor content
    const words = editorContent.trim().split(/\s+/).filter(w => w.length > 0).length;
    setWordCount(words ? words + 3000 : 3000); // base chapter count offset + local edits
  }, [editorContent]);

  // Handle play audio audio progress bar state
  useEffect(() => {
    let interval: any;
    if (isPlayingScript) {
      interval = setInterval(() => {
        setAudioProgress(prev => (prev < 278 ? prev + 1 : 0)); // Limit 4:38 which is 278 seconds
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isPlayingScript]);

  const formatTime = (secs: number) => {
    const min = Math.floor(secs / 60);
    const sec = secs % 60;
    return `${min}:${sec < 10 ? "0" + sec : sec}`;
  };

  return (
    <StudioShell>
      {/* Wrap the writer workspace in a single draggable/collapsible node.
          The StudioNode will provide a header with collapse and close
          controls and allow the entire writer UI to be repositioned
          anywhere on the canvas. */}
      <StudioNode id="writer-workspace" title="Writer Workspace" initialX={60} initialY={80}>
        <div className="flex-1 w-full bg-transparent text-[#c9d1d9] p-6 overflow-y-auto custom-scrollbar flex flex-col space-y-6" id="writer-workspace-container">

        {/* Title & dropdown block */}
        <div className="flex items-center justify-between shrink-0 select-none">
          <div>
            <h1 className="text-xl font-bold font-sans tracking-tight text-white flex items-center space-x-2">
              <PenTool className="w-5 h-5 text-purple-400" />
              <span>Writer Workspace</span>
            </h1>
            <p className="text-xs text-gray-400 font-sans mt-0.5">
              Write books, manage references, analyze readability, and automate formatting pipelines with Agent Lee.
            </p>
          </div>
          <div className="flex items-center space-x-3 text-xs">
            <select className="bg-[#161b22] px-3 py-1.5 rounded-xl border border-[#30363d] focus:outline-none focus:border-purple-500 font-sans text-white text-xs">
              <option>The Future, Written (Novel Project)</option>
              <option>Technical Documentation App</option>
              <option>Short Stories Collection</option>
            </select>
            <button className="flex items-center space-x-1 py-1.5 px-3.5 bg-purple-500 hover:bg-purple-600 text-white font-bold rounded-xl shadow cursor-pointer">
              <Plus className="w-3.5 h-3.5" />
              <span>New Book Project</span>
            </button>
          </div>
        </div>

      {/* Chapters flowchart mapping bar (Top horizontal slider) */}
      <div className="bg-[#161b22]/70 border border-[#30363d] rounded-2xl p-4 shadow-lg select-none">
        <span className="text-[10px] font-mono uppercase font-bold text-gray-500 tracking-wider block mb-3.5">Chapters Flowchart Timeline</span>
        <div className="flex items-center space-x-3 overflow-x-auto pb-1.5 scrollbar-thin">
          <div className="bg-[#0f141c] border border-[#30363d] px-3 py-2 rounded-xl shrink-0 w-28 text-center">
            <span className="text-[7.5px] font-mono text-gray-500 uppercase font-light">Book Hub</span>
            <span className="block text-[11px] font-bold text-white truncate leading-none mt-0.5">The Future...</span>
            <span className="text-[8px] text-[#22c55e] font-mono leading-none">Draft Level</span>
          </div>
          <span className="text-gray-600 font-bold">→</span>
          <div className="bg-[#0f141c] border border-transparent hover:border-[#30363d] px-3 py-2 rounded-xl shrink-0 w-36 text-center cursor-pointer">
            <span className="text-[7.5px] font-mono text-gray-500 uppercase">Chapter 1</span>
            <span className="block text-[11px] font-medium text-white/80 truncate leading-none mt-0.5">Awakening</span>
            <span className="text-[8px] text-gray-500 font-mono font-light leading-none">2,342 words</span>
          </div>
          <span className="text-gray-600 font-bold">→</span>
          <div className="bg-[#1b122c] border border-purple-500/70 shadow-[0_0_10px_rgba(168,85,247,0.15)] px-4 py-2 rounded-xl shrink-0 w-40 text-center cursor-pointer scale-102">
            <span className="text-[7.5px] font-mono text-purple-400 font-bold tracking-wider uppercase">Chapter 2 • EDITING</span>
            <span className="block text-[11px] font-bold text-white truncate leading-tight mt-0.5 select-text">The Signal</span>
            <span className="text-[8px] text-purple-400 font-mono font-bold leading-none">{wordCount} words</span>
          </div>
          <span className="text-purple-600 font-bold">→</span>
          <div className="bg-[#0f141c] border border-transparent hover:border-[#30363d] px-3 py-2 rounded-xl shrink-0 w-36 text-center cursor-pointer">
            <span className="text-[7.5px] font-mono text-gray-500 uppercase">Chapter 3</span>
            <span className="block text-[11px] font-medium text-white/80 truncate leading-none mt-0.5">The Network</span>
            <span className="text-[8px] text-gray-500 font-mono font-light leading-none">2,812 words</span>
          </div>
          <span className="text-gray-600 font-bold">→</span>
          <div className="bg-[#0f141c] border border-transparent hover:border-[#30363d] px-3 py-2 rounded-xl shrink-0 w-36 text-center cursor-pointer">
            <span className="text-[7.5px] font-mono text-gray-500 uppercase">Chapter 4</span>
            <span className="block text-[11px] font-medium text-white/80 truncate leading-none mt-0.5">The Choice</span>
            <span className="text-[8px] text-gray-500 font-mono font-light leading-none">3,876 words</span>
          </div>
          <span className="text-gray-600 font-bold">→</span>
          <div className="bg-[#0f141c] border border-transparent hover:border-[#30363d] px-3 py-2 rounded-xl shrink-0 w-36 text-center cursor-pointer">
            <span className="text-[7.5px] font-mono text-gray-500 uppercase">Chapter 5</span>
            <span className="block text-[11px] font-medium text-white/80 truncate leading-none mt-0.5">The Horizon</span>
            <span className="text-[8px] text-gray-500 font-mono font-light leading-none">2,487 words</span>
          </div>
          <span className="text-gray-600 font-bold">→</span>
          <button className="flex items-center justify-center p-2 rounded-xl bg-[#0f141c] hover:bg-white/5 border border-dashed border-[#30363d] select-none text-[10px] text-gray-500 hover:text-white shrink-0 cursor-pointer">
            <Plus className="w-4 h-4 mr-1 text-purple-400" /> Append Chapter
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 min-h-0">
        
        {/* Column 1: Outline Tree & Reference Manager (3 Cols) */}
        <div className="xl:col-span-3 flex flex-col space-y-5">
          
          {/* Outline Panel */}
          <div className="bg-[#161b22]/70 border border-[#30363d] rounded-2xl p-4 flex flex-col space-y-4 shadow-lg select-none flex-1">
            <span className="text-[10px] font-mono uppercase font-bold text-gray-400 tracking-wider border-b border-[#30363d] pb-2 block">Novel Table Structure</span>
            
            <div className="space-y-2 text-xs font-sans overflow-y-auto max-h-56">
              <div className="flex items-center space-x-1.5 font-bold text-white py-0.5">
                <BookOpen className="w-3.5 h-3.5 text-purple-400" />
                <span className="select-text">The Future, Written</span>
              </div>
              <div className="pl-3.5 space-y-1.5 text-[#c9d1d9]/85">
                <div className="text-gray-500 text-[10px] uppercase font-bold tracking-widest mt-2 block">Part I: Awakening</div>
                <div className="pl-1 hover:text-white cursor-pointer py-0.5">1. Awakening</div>
                <div className="pl-1 bg-purple-500/10 border-l-2 border-purple-500 font-bold text-purple-400 px-1 py-0.5 rounded-r select-text">2. The Signal</div>
                <div className="pl-1 hover:text-white cursor-pointer py-0.5">3. The Network</div>
                
                <div className="text-gray-500 text-[10px] uppercase font-bold tracking-widest mt-3 block">Part II: The Choice</div>
                <div className="pl-1 hover:text-white cursor-pointer py-0.5">4. The Choice</div>
                <div className="pl-1 hover:text-white cursor-pointer py-0.5">5. The Horizon</div>
                <div className="text-gray-500 font-semibold mt-3 block">Appendix</div>
                <div className="text-gray-500 font-semibold block">Notes & References</div>
              </div>
            </div>
            
            <button className="w-full py-1.5 border border-[#30363d] rounded-xl text-[10px] font-bold tracking-wide text-gray-500 hover:text-white uppercase mt-auto">
              + Generate Section
            </button>
          </div>

          {/* Research & References */}
          <div className="bg-[#161b22]/70 border border-[#30363d] rounded-2xl p-4 flex flex-col space-y-3.5 shadow-lg select-none flex-1">
            <div className="flex items-center justify-between border-b border-[#30363d] pb-2">
              <span className="text-[10px] font-mono uppercase font-bold text-gray-400 tracking-wider">Research & Sources</span>
              <span className="text-[9px] font-mono text-gray-500">Vault</span>
            </div>

            {/* Filters */}
            <div className="flex space-x-1 bg-[#0d1117] p-1 rounded-lg border border-[#30363d]/50">
              <span className="text-[8px] font-bold bg-[#161b22] border border-[#30363d] text-white px-2 py-0.5 rounded cursor-pointer">All</span>
              <span className="text-[8px] font-bold text-gray-500 px-2 py-0.5 rounded cursor-pointer">Web</span>
              <span className="text-[8px] font-bold text-gray-500 px-2 py-0.5 rounded cursor-pointer">Books</span>
              <span className="text-[8px] font-bold text-gray-500 px-2 py-0.5 rounded cursor-pointer">Notes</span>
            </div>

            <div className="space-y-1.5 overflow-y-auto max-h-56">
              {[
                { title: "The Signal and the Noise by Nate Silver", type: "Book", highlight: true },
                { title: "Neuromorphic Computing research", type: "Research Paper", highlight: false },
                { title: "The Future of Interfaces", type: "MIT Review", highlight: false },
                { title: "Consciousness & AI Perception model", type: "Video doc", highlight: false },
                { title: "AGI Safety alignment structures", type: "OpenAI Doc", highlight: false }
              ].map((res, i) => (
                <div 
                  key={i} 
                  className={`p-2 rounded-lg border text-[10px] cursor-pointer ${
                    res.highlight 
                      ? "bg-purple-500/5 border-purple-500/40 text-purple-300"
                      : "bg-[#0d1117] border-transparent hover:border-gray-800 text-gray-400"
                  }`}
                >
                  <span className="font-bold block truncate text-white">{res.title}</span>
                  <span className="text-[8px] font-mono text-gray-500 block uppercase mt-0.5">{res.type}</span>
                </div>
              ))}
            </div>

            <button className="w-full py-1.5 border border-[#30363d] rounded-xl text-[9px] font-bold tracking-wide text-purple-400 hover:text-purple-300 hover:bg-purple-500/5 uppercase">
              + Add Source Asset
            </button>
          </div>

        </div>

        {/* Column 2: Rich editor content & writing insights (5 Cols) */}
        <div className="xl:col-span-5 flex flex-col space-y-5">
          
          {/* The Rich Text Editor Card */}
          <div className="bg-[#161b22]/70 border border-[#30363d] rounded-2xl p-4 flex flex-col space-y-3.5 shadow-lg relative min-h-0 flex-grow">
            
            <div className="flex items-center justify-between border-b border-[#30363d] pb-2">
              <span className="text-[11px] font-bold text-white font-sans flex items-center space-x-1.5 font-sans">
                <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
                <span className="select-text">Chapter 2: The Signal</span>
              </span>
              <span className="text-[9px] font-mono bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded uppercase font-bold tracking-wider select-none flex items-center space-x-1">
                <CheckCircle className="w-3 h-3 text-emerald-400" />
                <span>SAVED BUFFER</span>
              </span>
            </div>

            {/* Word processing micro toolbar formatting */}
            <div className="flex items-center justify-between bg-[#0d1117] p-2 rounded-xl border border-[#30363d] shrink-0 select-none">
              <div className="flex items-center space-x-3 text-gray-500">
                <span className="text-[10px] font-mono text-gray-400 mr-2 border-r border-[#30363d] pr-2.5">Normal text</span>
                <Bold className="w-3.5 h-3.5 hover:text-white cursor-pointer" />
                <Italic className="w-3.5 h-3.5 hover:text-white cursor-pointer" />
                <Underline className="w-3.5 h-3.5 hover:text-white cursor-pointer" />
                <span className="h-3.5 w-[1px] bg-[#30363d]" />
                <List className="w-3.5 h-3.5 hover:text-white cursor-pointer" />
                <Link className="w-3.5 h-3.5 hover:text-white cursor-pointer" />
                <Image className="w-3.5 h-3.5 hover:text-white cursor-pointer" />
                <AlignLeft className="w-3.5 h-3.5 hover:text-white cursor-pointer" />
              </div>
              <span className="text-[9px] font-mono text-purple-400 font-bold tracking-wide">{wordCount} WORDS</span>
            </div>

            {/* Primary Writing Area Textarea */}
            <div className="flex-grow min-h-[180px] bg-[#0d1117] rounded-xl border border-[#30363d] relative overflow-hidden flex flex-col p-3">
              <span className="text-[14px] font-bold text-white block select-text font-serif mb-2">The Signal</span>
              <textarea
                value={editorContent}
                onChange={(e) => setEditorContent(e.target.value)}
                className="w-full flex-grow bg-transparent text-[#c9d1d9] leading-relaxed text-sm focus:outline-none resize-none font-serif select-text outline-none p-0 custom-scrollbar overflow-y-auto"
                placeholder="Type your literary story..."
              />
            </div>

            {/* Auto save toggles bottom bar */}
            <div className="flex items-center justify-between text-[10px] text-gray-500 shrink-0 select-none">
              <div className="flex items-center space-x-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                <span>Auto-save activated</span>
              </div>
              <div className="flex items-center space-x-3 font-mono">
                <span>View: Markdown</span>
                <span>Spaces: 2 (UTF-8)</span>
              </div>
            </div>

          </div>

          {/* Writing Insights Dashboard stats */}
          <div className="bg-[#161b22]/70 border border-[#30363d] rounded-2xl p-4 flex flex-col space-y-3 shadow-lg select-none min-h-0 shrink-0">
            <span className="text-[10px] font-mono uppercase font-bold text-gray-400 tracking-wider border-b border-[#30363d] pb-2 block">Writing Insights</span>
            
            <div className="grid grid-cols-5 gap-2 text-center font-mono text-[9px]">
              <div className="bg-[#0d1117] p-2 rounded-lg border border-gray-800">
                <span className="text-gray-500 block">Words Total</span>
                <span className="text-white font-bold block mt-0.5">{wordCount}</span>
                <span className="text-emerald-400 text-[7.5px] font-bold block mt-0.5">+12% vs last</span>
              </div>
              <div className="bg-[#0d1117] p-2 rounded-lg border border-gray-800">
                <span className="text-gray-500 block">Readability</span>
                <span className="text-emerald-400 font-bold block mt-0.5">62</span>
                <span className="text-emerald-400 text-[7.5px] font-bold block mt-0.5">Good (target 65)</span>
              </div>
              <div className="bg-[#0d1117] p-2 rounded-lg border border-gray-800">
                <span className="text-gray-500 block">Focus Words</span>
                <span className="text-emerald-400 font-bold block mt-0.5">12</span>
                <span className="text-emerald-400 text-[7.5px] font-bold block mt-0.5">Strong</span>
              </div>
              <div className="bg-[#0d1117] p-2 rounded-lg border border-gray-800">
                <span className="text-gray-500 block">Clarity Score</span>
                <span className="text-[#3b82f6] font-bold block mt-0.5">85%</span>
                <span className="text-[#3b82f6] text-[7.5px] font-bold block mt-0.5">Excellent</span>
              </div>
              <div className="bg-[#0d1117] p-2 rounded-lg border border-gray-800">
                <span className="text-gray-500 block">Voice Match</span>
                <span className="text-[#a855f7] font-bold block mt-0.5">91%</span>
                <span className="text-[#a855f7] text-[7.5px] font-bold block mt-0.5">Strong match</span>
              </div>
            </div>
          </div>

        </div>

        {/* Column 3: Automation Flow & Mobile speech narration preview (4 Cols) */}
        <div className="xl:col-span-4 flex flex-col space-y-5">
          
          {/* Automation Flow */}
          <div className="bg-[#161b22]/70 border border-[#30363d] rounded-2xl p-4 flex flex-col space-y-3 shadow-lg select-none min-h-[140px] relative">
            <span className="text-[10px] font-mono uppercase font-bold text-gray-400 tracking-wider">Publication Automation Canvas</span>
            
            {/* Bezier flow path lines overlay */}
            <div className="relative flex-1 flex flex-col justify-between text-[7.5px] font-mono border border-white/5 bg-[#0f141c]/50 p-2.5 rounded-xl">
              <svg className="absolute inset-0 w-full h-full pointer-events-none select-none z-0">
                <path d="M 68 30 H 130" fill="none" stroke="#a855f7" strokeWidth="1.5" className="stroke-dasharray-glow" />
                <path d="M 174 30 C 190 30, 200 15, 230 15 H 250" fill="none" stroke="#30363d" strokeWidth="1" />
                <path d="M 174 30 C 190 30, 200 45, 230 45 H 250" fill="none" stroke="#30363d" strokeWidth="1" />
              </svg>

              <div className="flex justify-between items-center relative z-10">
                <div className="bg-[#0d1117] px-2 py-1 border border-purple-500/50 rounded flex items-center space-x-1 shrink-0 w-[84px]">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-500 shrink-0" />
                  <span className="text-white">Chapter Draft</span>
                </div>
                <div className="bg-[#0d1117] px-2 py-1 border border-purple-500/50 rounded flex items-center space-x-1 shrink-0 w-[84px]">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-500 shrink-0 animate-pulse" />
                  <span className="text-white">Revise Text</span>
                </div>
                <div className="space-y-1.5 flex flex-col shrink-0">
                  <div className="bg-[#0d1117] px-2 py-0.5 border border-gray-800 rounded text-center w-[80px]">
                    <span className="text-gray-400">Blog post</span>
                  </div>
                  <div className="bg-[#0d1117] px-2 py-0.5 border border-gray-800 rounded text-center w-[80px]">
                    <span className="text-gray-400 font-bold text-purple-400">Voice Synthesis</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Live Reading Preview frame */}
          <div className="bg-[#161b22]/70 border border-[#30363d] rounded-2xl p-4 flex flex-col space-y-4 shadow-lg select-none relative min-h-0 flex-grow justify-between">
            <div className="flex items-center justify-between border-b border-[#30363d] pb-2 shrink-0">
              <span className="text-[10px] font-mono uppercase font-bold text-gray-400 tracking-wider">Live Reading Preview</span>
              <span className="text-[9px] font-mono text-emerald-400 flex items-center space-x-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>Connected</span>
              </span>
            </div>

            {/* Tabs inside smartphone frame preview modes */}
            <div className="flex space-x-1 self-center shrink-0">
              <span className="text-[8px] bg-purple-500/10 border border-purple-500/20 text-purple-300 px-2.5 py-1 rounded">Text Preview</span>
              <span className="text-[8px] bg-purple-500/20 border border-purple-500/40 text-purple-400 px-2.5 py-1 rounded font-bold">Read Aloud</span>
              <span className="text-[8px] bg-[#0d1117] border border-[#30363d]/50 text-gray-500 px-2.5 py-1 rounded">Mobile App</span>
            </div>

            {/* Embedded mockup smartphone frame rendering active chapter detail content */}
            <div className="bg-[#0d1117] border border-[#30363d] rounded-2xl p-3 flex flex-col relative overflow-hidden flex-1 my-3 select-none justify-between max-h-[220px]">
              
              {/* Playback sound graphic container */}
              <div className="text-center space-y-1 mt-1 flex-grow flex flex-col justify-center">
                <span className="text-[8px] font-mono text-purple-400 block tracking-widest font-bold uppercase">Synthesized Audio Feed</span>
                <span className="text-[12px] font-extrabold text-white block select-text font-serif leading-none mt-1">Chapter 2: The Signal</span>
                <p className="text-[9.5px] italic text-gray-400 leading-snug line-clamp-3 select-text max-w-[190px] mx-auto font-serif mt-1">
                  "It wasn't loud. It wasn't sudden. It was a thread—thin as thought—woven through the noise."
                </p>
              </div>

              {/* Slider reader timeline progress */}
              <div className="space-y-1 mt-3 shrink-0">
                <div className="h-1 bg-gray-800 rounded-full overflow-hidden relative">
                  <div 
                    className="bg-purple-500 h-full transition-all duration-300" 
                    style={{ width: `${(audioProgress / 278) * 100}%` }} 
                  />
                </div>
                <div className="flex justify-between text-[8px] font-mono text-gray-500 select-none">
                  <span>{formatTime(audioProgress)}</span>
                  <span>4:38</span>
                </div>
              </div>

              {/* Media play paus controllers */}
              <div className="flex items-center justify-center space-x-4 mt-2 shrink-0">
                <span className="text-[9.5px] text-gray-500 font-mono hover:text-white cursor-pointer select-none">⏮</span>
                <button 
                  onClick={() => setIsPlayingScript(!isPlayingScript)}
                  className="w-8 h-8 rounded-full bg-purple-500 hover:bg-purple-600 flex items-center justify-center text-white cursor-pointer active:scale-95 shadow shadow-purple-500/20 shrink-0"
                >
                  {isPlayingScript ? (
                    <Pause className="w-3.5 h-3.5 fill-white text-white" />
                  ) : (
                    <Play className="w-3.5 h-3.5 fill-white text-white pl-0.5" />
                  )}
                </button>
                <span className="text-[9.5px] text-gray-500 font-mono hover:text-white cursor-pointer select-none">⏭</span>
                <span className="text-[9px] font-mono text-purple-500 font-bold bg-[#1b122c] px-1 rounded">1.0x</span>
              </div>
            </div>
            
          </div>

          {/* Outputs */}
          <div className="bg-[#161b22]/70 border border-[#30363d] rounded-2xl p-4 flex flex-col space-y-4 shadow-lg select-none min-h-[140px]">
            <span className="text-[10px] font-mono uppercase font-bold text-gray-400 tracking-wider border-b border-[#30363d] pb-2">Published Outputs</span>
            
            <div className="space-y-1.5 text-[9.5px] font-sans flex-1 overflow-y-auto max-h-40">
              {[
                { name: "Blog Post: The Signal... ", label: "Draft", style: "text-gray-500 bg-gray-800/20 border-gray-800" },
                { name: "eBook (PDF): Novel Complete", label: "Ready", style: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" },
                { name: "Script: Chapter 2 - The Signal", label: "Ready", style: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" },
                { name: "Audio: The Signal (TTS Voice)", label: "Processing", style: "text-purple-400 bg-purple-500/15 border-purple-500/35 font-bold animate-pulse" },
                { name: "WordPress: thefuturewritten.com", label: "Scheduled", style: "text-amber-400 bg-amber-500/10 border-amber-500/15" },
                { name: "Social Content Posts (6 items)", label: "Queued", style: "text-blue-400 bg-blue-500/10 border-blue-500/15" }
              ].map((out, idx) => (
                <div key={idx} className="flex justify-between items-center bg-[#0d1117] p-1.5 rounded border border-white/5">
                  <span className="text-white truncate font-bold">{out.name}</span>
                  <span className={`px-1.5 py-0.5 rounded text-[8px] font-mono uppercase tracking-wider font-bold border ${out.style}`}>
                    {out.label}
                  </span>
                </div>
              ))}
            </div>

            <button className="w-full py-1.5 bg-[#161b22] hover:bg-[#30363d] border border-[#30363d] rounded-xl text-[10px] font-bold text-gray-500 hover:text-white tracking-wide uppercase cursor-pointer">
              View All Outputs →
            </button>
          </div>

        </div>

        </div>
        </div>
      </StudioNode>
    </StudioShell>
  );
}
