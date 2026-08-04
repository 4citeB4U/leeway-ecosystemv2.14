/*
FILE: src\components\Cards.tsx
PURPOSE: LeeWay governed asset for leeway-employment-center.
TAG: UI.COMPONENT.C_AR_DS.MAIN
REGION: 🔵 UI
GOVERNED_BY: LeeWay Standards
OWNED_BY: Agent Lee / LeeWay Runtime
DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render
IMPORTS: Inferred by verification scanner
EXPORTS: Inferred by verification scanner
STATUS: ACTIVE
*/
import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Shield, Zap, Info, CheckCircle2 } from 'lucide-react';
import { EmployeeVM, JobFamily } from '../types';
import { cn } from '../lib/utils';
import EmployeeAvatar from './EmployeeAvatar';

export const JOB_FAMILY_COLORS: Record<JobFamily, { hex: string, bg: string }> = {
  'Sales': { hex: '#2563eb', bg: 'bg-blue-600' },
  'Operations': { hex: '#16a34a', bg: 'bg-green-600' },
  'Inventory': { hex: '#ea580c', bg: 'bg-orange-600' },
  'Compliance': { hex: '#ca8a04', bg: 'bg-yellow-600' },
  'AI': { hex: '#9333ea', bg: 'bg-purple-600' },
  'Admin': { hex: '#dc2626', bg: 'bg-red-600' },
  'Security': { hex: '#18181b', bg: 'bg-zinc-900' },
  'Assistant': { hex: '#a1a1aa', bg: 'bg-zinc-400' },
};

export const EmployeeCard: React.FC<{ vm: EmployeeVM; className?: string }> = ({ vm, className }) => {
  const activationUrl = `${window.location.origin}/activate/${vm.employeeId}?token=${vm.token}`;
  const colors = vm.identity?.jobFamily ? JOB_FAMILY_COLORS[vm.identity.jobFamily] : JOB_FAMILY_COLORS['Assistant'];

  return (
    <div 
      className={cn(
        "w-[320px] h-[480px] bg-white rounded-sm shadow-2xl flex flex-col relative overflow-hidden font-sans select-none border-t-[8px]",
        className
      )}
      style={{ borderTopColor: colors.hex, boxShadow: `0 20px 40px rgba(0,0,0,0.1), 0 0 20px ${colors.hex}15` }}
    >
      {/* Header */}
      <div className="p-4 flex justify-between items-start shrink-0">
        <div className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-30">Leeway Identity</div>
        <div
          className={cn(
            "w-3 h-3 rounded-full animate-pulse",
            vm.status === 'active'
              ? "bg-green-500"
              : vm.status === 'pending'
                ? "bg-yellow-500"
                : vm.status === 'suspended'
                  ? "bg-orange-500"
                  : "bg-red-500"
          )}
        ></div>
      </div>

      {/* Body */}
      <div className="flex-grow flex flex-col p-6">
        {/* Avatar */}
        <div className="w-28 h-28 mb-4 mx-auto relative shrink-0">
            <div 
                className="absolute inset-0 rounded-full border-4 opacity-10 animate-pulse"
                style={{ borderColor: colors.hex }}
            />
            <div className="w-full h-full rounded-full overflow-hidden bg-gray-50 border border-black/5 flex items-center justify-center relative">
                {vm.identity?.gridPos ? (
                    <EmployeeAvatar
                      avatarUrl={vm.avatarUrl}
                      alt={vm.displayName}
                      gridPos={vm.identity.gridPos}
                      className="w-full h-full"
                    />
                ) : vm.avatarUrl ? (
                    <img 
                      src={vm.avatarUrl} 
                      alt={vm.displayName} 
                      className="w-full h-full object-cover" 
                      referrerPolicy="no-referrer"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center opacity-20 text-[8px] text-center p-4">UNIT IDENTITY<br/>ACTIVE</div>
                )}
                
                {/* Name Overlay if Image fails or as part of design */}
                {!vm.avatarUrl && (
                    <div className="absolute inset-0 flex items-center justify-center p-4 text-center">
                        <span className="text-[10px] font-bold uppercase tracking-tighter opacity-40">{vm.displayName}</span>
                    </div>
                )}
            </div>
            
            {/* Status Ribbon */}
            <div 
                className={cn("absolute -bottom-2 right-0 px-2 py-0.5 text-[7px] font-bold text-white uppercase rounded-full shadow-lg", colors.bg)}
            >
                {vm.identity?.jobFamily || 'Unit'}
            </div>
        </div>

        <div className="text-center space-y-1 mb-8">
            <h4 className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40 mb-1">{vm.displayName}</h4>
            <h3 className="text-xl font-serif italic leading-tight tracking-tight px-4">{vm.jobTitle}</h3>
            <div className="flex items-center justify-center gap-2">
                <p className="text-[9px] uppercase tracking-widest opacity-40 font-bold">Authenticated Professional</p>
                {vm.identity?.isCertified && (
                    <div className="px-1.5 py-0.5 bg-black text-white text-[6px] font-black rounded flex items-center gap-1">
                        <CheckCircle2 size={6} />
                        CERTIFIED
                    </div>
                )}
            </div>
        </div>

        <div className="space-y-4 border-t border-black/5 pt-4">
            <div className="flex justify-between text-[8px] uppercase tracking-tighter">
                <span className="opacity-40 font-bold">Employee ID</span>
                <span className="font-mono">{vm.employeeId}</span>
            </div>
            <div className="flex justify-between text-[8px] uppercase tracking-tighter">
                <span className="opacity-40 font-bold">Substrate Pool</span>
                <span className="font-mono uppercase">Strata-IV.L2</span>
            </div>
            <div className="flex justify-between text-[8px] uppercase tracking-tighter">
                <span className="opacity-40 font-bold">Governance</span>
                <span className="truncate max-w-[120px] font-bold">LawEngine Active</span>
            </div>
            <div className="flex justify-between text-[8px] uppercase tracking-tighter">
                <span className="opacity-40 font-bold">Contract</span>
                <span className="font-bold">{vm.contractStatus}</span>
            </div>
        </div>

        {/* QR Section */}
        <div className="mt-auto flex flex-col items-center">
            <div className="w-16 h-16 bg-white shadow-sm mb-2 flex items-center justify-center p-1 border border-black/5">
                <QRCodeSVG value={activationUrl} size={60} level="L" />
            </div>
            <span className="text-[7px] uppercase tracking-[0.3em] font-bold opacity-30">Secure Access Point</span>
        </div>
      </div>
    </div>
  );
};

export const ContractCard: React.FC<{ vm: EmployeeVM; className?: string }> = ({ vm, className }) => {
    return (
        <div className={cn(
            "w-[320px] h-[480px] bg-white rounded-sm shadow-2xl border border-black/5 flex flex-col p-8 text-[#1A1A1A] font-sans select-none overflow-y-auto",
            className
        )}>
            <div className="flex items-center gap-2 mb-8 border-b border-black/10 pb-4">
                <div className="w-2 h-2 bg-black rounded-full"></div>
                <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-40">Deployment Contract</h2>
            </div>

            <div className="space-y-6">
                <section>
                    <label className="text-[8px] font-bold uppercase tracking-widest opacity-30 mb-2 block">Position Specification</label>
                    <p className="text-lg font-serif italic text-[#1A1A1A]">{vm.jobTitle}</p>
                    <p className="text-[9px] opacity-40 uppercase tracking-widest">Term: 90 Days</p>
                    <p className="text-[9px] opacity-40 uppercase tracking-widest mt-1">{vm.contract.pricingLabel}</p>
                </section>

                <section>
                    <label className="text-[8px] font-bold uppercase tracking-widest opacity-30 mb-2 block">Primary Duties</label>
                    <ul className="space-y-1">
                        {vm.contract.duties.map((duty, i) => (
                            <li key={i} className="text-[10px] leading-relaxed flex items-start gap-2">
                                <span className="opacity-20 translate-y-1 text-[6px]">â—</span>
                                {duty}
                            </li>
                        ))}
                    </ul>
                </section>

                <section>
                    <label className="text-[8px] font-bold uppercase tracking-widest opacity-30 mb-2 block">Hard Boundaries</label>
                    <ul className="space-y-1">
                        {vm.contract.boundaries.map((boundary, i) => (
                            <li key={i} className="text-[10px] leading-relaxed italic opacity-70 flex items-start gap-2">
                                <span className="text-red-500 text-[6px] translate-y-1">â– </span>
                                {boundary}
                            </li>
                        ))}
                    </ul>
                </section>

                <section className="bg-[#FBFBF9] p-4 border border-black/5">
                    <label className="text-[8px] font-bold uppercase tracking-widest opacity-30 mb-1 block">Enforcement Logic</label>
                    <p className="text-[9px] text-[#1A1A1A]/60 leading-tight">
                        All actions are governed by Leeway Law Engine. Activity is logged and auditable.
                    </p>
                </section>

                <section className="bg-[#FBFBF9] p-4 border border-black/5">
                    <label className="text-[8px] font-bold uppercase tracking-widest opacity-30 mb-2 block">Billing & Privacy Guard</label>
                    <div className="space-y-2 text-[9px] text-[#1A1A1A]/70 leading-tight">
                        <p>Rate: ${vm.contract.hourlyRateUsd}/hr â€¢ Payment: {vm.contract.paymentStatus}</p>
                        <p>Employer data stays employer-owned and employer-scoped.</p>
                        <p>Private files remain namespaced and are not written to global shared memory.</p>
                        <p>Global learning retains anonymized operational metrics only.</p>
                    </div>
                </section>
            </div>

            <div className="mt-8 pt-6 border-t border-black/5 flex justify-between items-end opacity-20">
                <div className="flex flex-col">
                    <span className="text-[6px] font-bold uppercase tracking-widest">Leeway Gov Core</span>
                    <span className="text-[8px] font-serif italic">Authority Verification</span>
                </div>
                <div className="text-[6px] text-right font-mono">
                    VER_2.4.0<br/>
                    STRATA_IV
                </div>
            </div>
        </div>
    );
};

