import {
  Activity,
  ChevronLeft,
  Network,
  Shield,
  Terminal
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import React, { useState } from "react";
import { PortMonitor } from "./PortMonitor";
import SystemTelemetry from "./SystemTelemetry";
import { TunnelPanel } from "./TunnelPanel";

export const DiagnosticsSidebar: React.FC<{ forcedOpen?: boolean; onStateChange?: (open: boolean) => void }> = ({ forcedOpen, onStateChange }) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = forcedOpen !== undefined ? forcedOpen : internalOpen;
  const setIsOpen = (open: boolean) => {
    if (onStateChange) onStateChange(open);
    else setInternalOpen(open);
  };
  const [activeTab, setActiveTab] = useState<"telemetry" | "ports" | "tunnel">(
    "telemetry",
  );
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState<"telemetry" | "ports" | "tunnel">(
    "telemetry",
  );

  return (
    <div className="fixed left-0 top-0 h-full z-50 flex items-start pt-6 pointer-events-none">
      <motion.div
        initial={false}
        animate={{ x: isOpen ? 0 : -520 }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className="h-[92vh] w-[520px] bg-black/40 backdrop-blur-2xl border-r border-white/10 rounded-r-3xl pointer-events-auto flex flex-col overflow-hidden shadow-[20px_0_50px_rgba(0,0,0,0.5)]"
      >
        {/* Header */}
        <div className="p-6 border-b border-white/10 flex items-center justify-between bg-white/5">
          <div className="flex items-center gap-3">
            <Activity className="text-orange-500 w-5 h-5" />
            <span className="text-xs font-mono font-bold uppercase tracking-[0.2em] text-white/80">
              System Diagnostics
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsOpen(false)}
              className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/40 hover:text-white"
              title="Close Diagnostics"
              aria-label="Close Diagnostics"
            >
              <ChevronLeft size={20} />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex p-2 gap-1 bg-black/20">
          <TabButton
            active={activeTab === "telemetry"}
            onClick={() => {
              setActiveTab("telemetry");
              setModalTab("telemetry");
              setModalOpen(true);
            }}
            icon={<Shield size={14} />}
            label="Telemetry"
          />
          <TabButton
            active={activeTab === "ports"}
            onClick={() => {
              setActiveTab("ports");
              setModalTab("ports");
              setModalOpen(true);
            }}
            icon={<Network size={14} />}
            label="Ports"
          />
          <TabButton
            active={activeTab === "tunnel"}
            onClick={() => {
              setActiveTab("tunnel");
              setModalTab("tunnel");
              setModalOpen(true);
            }}
            icon={<Terminal size={14} />}
            label="Tunnel"
          />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          <AnimatePresence mode="wait">
            {activeTab === "telemetry" && (
              <motion.div
                key="telemetry"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <SystemTelemetry />
              </motion.div>
            )}
            {activeTab === "ports" && (
              <motion.div
                key="ports"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <PortMonitor />
              </motion.div>
            )}
            {activeTab === "tunnel" && (
              <motion.div
                key="tunnel"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="h-full"
              >
                <TunnelPanel />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Modal / Pop-out */}
        {modalOpen && (
          <div className="fixed inset-0 z-60 flex items-center justify-center">
            <div
              className="absolute inset-0 bg-black/60"
              onClick={() => setModalOpen(false)}
            />
            <div className="relative z-70 w-[80vw] max-w-4xl h-[80vh] bg-black/90 border border-white/10 rounded-2xl p-4 overflow-auto">
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm font-bold font-mono uppercase">
                  Diagnostics — {modalTab}
                </div>
                <button
                  onClick={() => setModalOpen(false)}
                  className="px-3 py-1 rounded bg-white/5"
                >
                  Close
                </button>
              </div>
              <div className="h-full overflow-auto">
                {modalTab === "telemetry" && <SystemTelemetry />}
                {modalTab === "ports" && <PortMonitor />}
                {modalTab === "tunnel" && <TunnelPanel />}
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="p-4 border-t border-white/10 bg-black/40">
          <div className="flex items-center justify-between text-[8px] font-mono text-white/20 uppercase tracking-widest">
            <span>Agent Lee Kernel v4.2.0</span>
            <div className="flex items-center gap-3">
              <span className="text-emerald-500/50">
                Secure Connection Established
              </span>
              <button
                onClick={() => setModalOpen(true)}
                title="Open Charge Details"
                aria-label="Open Charge Details"
                className="p-1 rounded bg-white/5"
              >
                <svg
                  width="36"
                  height="36"
                  viewBox="0 0 36 36"
                  className="text-white/60"
                >
                  <circle
                    cx="18"
                    cy="18"
                    r="14"
                    fill="#091322"
                    stroke="#374151"
                    strokeWidth="2"
                  />
                  <path
                    d="M18 6 A12 12 0 1 1 17.99 6"
                    fill="#f59e0b"
                    opacity="0.95"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Floating button removed — managed by top-level unified toggles */}

      {/* Expand-all removed — telemetry is embedded inside Sovereign Intelligence */}
    </div>
  );
};

const TabButton: React.FC<{
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}> = ({ active, onClick, icon, label }) => (
  <button
    onClick={onClick}
    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-[10px] font-mono uppercase tracking-widest transition-all ${active
      ? "bg-orange-600/20 text-orange-400 border border-orange-500/30"
      : "text-white/30 hover:text-white/60 hover:bg-white/5"
      }`}
  >
    {icon}
    <span className="hidden sm:inline">{label}</span>
  </button>
);
