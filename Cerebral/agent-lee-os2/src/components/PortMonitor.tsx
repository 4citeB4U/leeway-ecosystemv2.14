import React from 'react';

const ports = Array.from({ length: 21 }, (_, i) => 6000 + i);

// Mock checkPort function
const checkPort = (port: number) => {
  return Math.random() > 0.3; // Randomly online/offline for demo
};

export const PortMonitor = () => {
  return (
    <div className="grid grid-cols-7 gap-2 p-4 bg-black/50 rounded-3xl border border-cyan-500/30 backdrop-blur-xl">
      {ports.map((port) => (
        <div
          key={port}
          className="flex flex-col items-center p-2 border border-white/10 rounded"
        >
          <span className="text-[10px] text-cyan-400 font-mono">{port}</span>
          <div
            className={`w-3 h-3 rounded-full ${checkPort(port) ? "bg-green-500 shadow-[0_0_10px_green]" : "bg-red-900"}`}
          />
        </div>
      ))}
      <div className="col-span-7 mt-4 text-[10px] font-mono text-white/50 uppercase tracking-widest text-center">
        PI-MODE: ACTIVE (2 CORES / 1.2GB) | MODE: NORMAL
      </div>
    </div>
  );
};

export default PortMonitor;
