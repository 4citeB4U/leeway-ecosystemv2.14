import React from 'react';

export const HUDFrame: React.FC<{ title: string; icon: React.ReactNode; children: React.ReactNode }> = ({ title, icon, children }) => (
  <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-3xl p-6 flex flex-col gap-4">
    <div className="flex items-center gap-3 text-white/60 mb-2">
      <div className="text-orange-500">{icon}</div>
      <span className="text-xs font-mono uppercase tracking-[0.2em] font-bold">{title}</span>
    </div>
    {children}
  </div>
);

export const MetricCard: React.FC<{ icon: React.ReactNode; label: string; value: string; color: string; progress: number }> = ({ icon, label, value, color, progress }) => {
  const colorClass = color === 'cyan' ? 'bg-cyan-500' : color === 'purple' ? 'bg-purple-500' : color === 'amber' ? 'bg-amber-500' : 'bg-emerald-500';
  return (
    <div className="bg-black/40 backdrop-blur-md border border-white/5 rounded-2xl p-4 flex flex-col gap-3 group hover:border-white/20 transition-all">
      <div className="flex items-center justify-between">
        <div className="p-1.5 rounded-lg bg-white/5 text-white/60 group-hover:text-orange-500 transition-colors">
          {icon}
        </div>
        <span className="text-[8px] font-mono text-white/30 uppercase tracking-widest">{label}</span>
      </div>
      <div>
        <div className="text-xl font-bold text-white mb-1">{value}</div>
        <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
          <div 
            className={`h-full ${colorClass} transition-all duration-1000`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
};
