import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Minus, Square, Terminal, Folder, Chrome, Mail, MessageSquare, Github, Flame, FileText, Settings, LayoutGrid, Search, Monitor } from 'lucide-react';
import { cn } from '../lib/utils';

interface WindowProps {
  id: string;
  title: string;
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  icon?: React.ElementType;
}

const ICON_MAP: Record<string, React.ElementType> = {
  start: LayoutGrid,
  search: Search,
  desktop: Monitor,
  files: Folder,
  browser: Chrome,
  mail: Mail,
  chat: MessageSquare,
  github: Github,
  terminal: Flame,
  docs: FileText,
  settings: Settings,
};

export const Window: React.FC<WindowProps> = ({ id, title, isOpen, onClose, children, icon: Icon }) => {
  const WindowIcon = (Icon || ICON_MAP[id] || Terminal) as any;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="fixed inset-0 z-[80] flex items-center justify-center p-8 pointer-events-none"
        >
          <div className="w-full max-w-4xl h-full max-h-[80vh] bg-zinc-900/90 backdrop-blur-3xl border border-white/10 rounded-2xl shadow-2xl flex flex-col pointer-events-auto overflow-hidden">
            {/* Window Header */}
            <div className="h-12 bg-black/40 border-b border-white/10 flex items-center justify-between px-4 drag-handle cursor-default select-none">
              <div className="flex items-center gap-3">
                <div className="p-1.5 rounded-lg bg-white/5 text-white/60">
                  <WindowIcon className="w-4 h-4" />
                </div>
                <span className="text-xs font-mono uppercase tracking-widest text-white/60">{title}</span>
              </div>
              <div className="flex items-center gap-1">
                <button className="p-2 hover:bg-white/5 rounded-lg transition-colors text-white/20">
                  <Minus className="w-4 h-4" />
                </button>
                <button className="p-2 hover:bg-white/5 rounded-lg transition-colors text-white/20">
                  <Square className="w-3 h-3" />
                </button>
                <button 
                  onClick={onClose}
                  className="p-2 hover:bg-red-500/80 rounded-lg transition-colors text-white/20 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            
            {/* Window Content */}
            <div className="flex-1 overflow-auto p-8 text-white/80 font-sans">
              {children}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
