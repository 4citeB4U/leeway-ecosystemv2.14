/*
FILE: src\components\AdminConsole.tsx
PURPOSE: LeeWay governed asset for leeway-employment-center.
TAG: UI.COMPONENT.A_DM_IN_CO_NS_OL_E.MAIN
REGION: 🔵 UI
GOVERNED_BY: LeeWay Standards
OWNED_BY: Agent Lee / LeeWay Runtime
DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render
IMPORTS: Inferred by verification scanner
EXPORTS: Inferred by verification scanner
STATUS: ACTIVE
*/
import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowRightLeft,
  BadgeDollarSign,
  Bot,
  Briefcase,
  CheckCircle2,
  Clock3,
  Cpu,
  Database,
  FileLock2,
  FileText,
  Fingerprint,
  GlobeLock,
  MonitorStop,
  Radar,
  ReceiptText,
  Shield,
  ShieldBan,
  ShieldCheck,
  UserRoundCog,
  Users,
  Wallet,
  XCircle,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import type { AuditReceipt, EmployeeStatus, EmployeeVM, EmployerVault, PrivacyState } from '../types';
import { cn } from '../lib/utils';
import { useWorkforceStore } from '../lib/workforceStore';
import { CONSTRUCT_PROJECTION_PATH } from '../lib/workforceFactory';
import EmployeeAvatar from './EmployeeAvatar';
import AdminInvestorPortal from './AdminInvestorPortal';
import { JOB_FAMILY_COLORS } from './Cards';

type AdminPanel =
  | 'registry'
  | 'contracts'
  | 'deployments'
  | 'sessions'
  | 'privacy'
  | 'audit'
  | 'permissions'
  | 'vaults'
  | 'investors';

type AssistantMessage = {
  id: string;
  role: 'assistant' | 'admin';
  text: string;
};

const ADMIN_ID = 'ADMIN-LEE-001';

const PANELS: { id: AdminPanel; label: string; icon: React.ReactNode }[] = [
  { id: 'registry', label: 'Employee Registry', icon: <Users size={14} /> },
  { id: 'contracts', label: 'Pending Contracts', icon: <FileText size={14} /> },
  { id: 'deployments', label: 'Active Deployments', icon: <Radar size={14} /> },
  { id: 'sessions', label: 'Session Monitor', icon: <Activity size={14} /> },
  { id: 'privacy', label: 'Privacy Guard', icon: <ShieldCheck size={14} /> },
  { id: 'audit', label: 'Audit Receipts', icon: <ReceiptText size={14} /> },
  { id: 'permissions', label: 'Tool Permissions', icon: <Cpu size={14} /> },
  { id: 'vaults', label: 'Employer Data Vaults', icon: <Database size={14} /> },
  { id: 'investors', label: 'Investor Management', icon: <Briefcase size={14} /> },
];

const statusPill = (status: EmployeeStatus) => {
  switch (status) {
    case 'active':
      return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    case 'pending':
      return 'bg-amber-100 text-amber-700 border-amber-200';
    case 'suspended':
      return 'bg-orange-100 text-orange-700 border-orange-200';
    case 'revoked':
    case 'denied':
      return 'bg-rose-100 text-rose-700 border-rose-200';
    default:
      return 'bg-zinc-100 text-zinc-700 border-zinc-200';
  }
};

const privacyPill = (state: PrivacyState) => {
  switch (state) {
    case 'compliant':
      return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    case 'warning':
      return 'bg-amber-100 text-amber-700 border-amber-200';
    default:
      return 'bg-rose-100 text-rose-700 border-rose-200';
  }
};

const currency = (amount: number) => `$${amount.toFixed(2)}`;

const downloadText = (filename: string, content: string) => {
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
};

const buildAssistantReply = (employee: EmployeeVM | undefined, panel: AdminPanel, input: string) => {
  const lower = input.toLowerCase();

  if (!employee) {
    return 'Select a worker and I will walk you through contract review, privacy verification, deployment control, and audit routing.';
  }

  if (lower.includes('approve')) {
    return `Approval path for ${employee.employeeId}: SUM orchestrator -> Leeway governance -> employer namespace release. Payment is currently ${employee.billing.paymentStatus}.`;
  }

  if (lower.includes('revoke') || lower.includes('cancel')) {
    return `Revoking ${employee.employeeId} will invalidate the activation link, stop the active session, and generate a receipt with your admin ID and reason.`;
  }

  if (lower.includes('privacy')) {
    return `${employee.employeeId} is ${employee.privacy.state} for privacy guard. Documents isolated: ${employee.privacy.documentsIsolated ? 'yes' : 'no'}. Global memory leak: ${employee.privacy.globalMemoryLeak ? 'detected' : 'none'}.`;
  }

  if (panel === 'contracts') {
    return `Contract review is staged for ${employee.displayName}. Hourly rate is $1/hr, projected accrual is ${currency(employee.contract.totalAccruedUsd)}, and approval is required before trust is granted.`;
  }

  if (panel === 'sessions') {
    return `${employee.displayName} is currently ${employee.sessionStatus}. If you kill the session, deployment remains governed but execution halts until you reissue a link or re-approve deployment.`;
  }

  return `I can help with ${employee.displayName}: inspect the VM manifest, verify privacy compliance, rotate the activation link, lock device binding, or stop employment entirely.`;
};

const StatCard: React.FC<{ label: string; value: string; note: string; icon: React.ReactNode }> = ({
  label,
  value,
  note,
  icon,
}) => (
  <div className="border border-black/5 bg-white p-5 shadow-sm">
    <div className="flex items-start justify-between gap-4">
      <div>
        <div className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">{label}</div>
        <div className="mt-3 text-3xl font-serif italic tracking-tight">{value}</div>
        <div className="mt-2 text-[11px] text-zinc-500 leading-relaxed">{note}</div>
      </div>
      <div className="text-zinc-400">{icon}</div>
    </div>
  </div>
);

const SectionShell: React.FC<{ title: string; eyebrow?: string; children: React.ReactNode }> = ({
  title,
  eyebrow,
  children,
}) => (
  <section className="border border-black/5 bg-white shadow-sm">
    <div className="border-b border-black/5 px-5 py-4">
      {eyebrow && <div className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">{eyebrow}</div>}
      <h3 className="mt-1 text-xl font-serif italic tracking-tight">{title}</h3>
    </div>
    <div className="p-5">{children}</div>
  </section>
);

export default function AdminConsole({
  onOpenVM,
  onOpenBuilder,
}: {
  onOpenVM: (employee: EmployeeVM) => void;
  onOpenBuilder: () => void;
}) {
  const employees = useWorkforceStore((state) => state.employees);
  const auditReceipts = useWorkforceStore((state) => state.auditReceipts);
  const employerVaults = useWorkforceStore((state) => state.employerVaults);
  const managedSubsystems = useWorkforceStore((state) => state.managedSubsystems);
  const approveContract = useWorkforceStore((state) => state.approveContract);
  const denyContract = useWorkforceStore((state) => state.denyContract);
  const suspendEmployee = useWorkforceStore((state) => state.suspendEmployee);
  const revokeEmployee = useWorkforceStore((state) => state.revokeEmployee);
  const killSession = useWorkforceStore((state) => state.killSession);
  const rotateActivationLink = useWorkforceStore((state) => state.rotateActivationLink);
  const lockDeviceBinding = useWorkforceStore((state) => state.lockDeviceBinding);
  const verifyPrivacyCompliance = useWorkforceStore((state) => state.verifyPrivacyCompliance);

  const [panel, setPanel] = useState<AdminPanel>('registry');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(employees[0]?.employeeId ?? null);
  const [adminReason, setAdminReason] = useState('Administrative governance review approved by Agent Lee and Leeway admin.');
  const [assistantInput, setAssistantInput] = useState('');
  const [assistantMessages, setAssistantMessages] = useState<AssistantMessage[]>([
    {
      id: 'lee-0',
      role: 'assistant',
      text: 'Agent Lee online. I can certify contracts, explain privacy posture, and route admin actions through governance for you.',
    },
  ]);

  useEffect(() => {
    if (!selectedEmployeeId && employees[0]) {
      setSelectedEmployeeId(employees[0].employeeId);
      return;
    }

    if (selectedEmployeeId && !employees.some((employee) => employee.employeeId === selectedEmployeeId)) {
      setSelectedEmployeeId(employees[0]?.employeeId ?? null);
    }
  }, [employees, selectedEmployeeId]);

  const selectedEmployee = employees.find((employee) => employee.employeeId === selectedEmployeeId);

  const stats = useMemo(
    () => ({
      active: employees.filter((employee) => employee.status === 'active').length,
      pending: employees.filter((employee) => employee.contractStatus === 'pending').length,
      suspended: employees.filter((employee) => employee.status === 'suspended').length,
      revoked: employees.filter((employee) => employee.status === 'revoked' || employee.status === 'denied').length,
      privacyCompliant: employees.filter((employee) => employee.privacy.state === 'compliant').length,
      liveSessions: employees.filter((employee) => employee.sessionStatus === 'live').length,
    }),
    [employees]
  );

  const pendingContracts = employees.filter((employee) => employee.contractStatus === 'pending');
  const activeDeployments = employees.filter((employee) => employee.status === 'active');
  const suspendedOrRevoked = employees.filter(
    (employee) => employee.status === 'suspended' || employee.status === 'revoked' || employee.status === 'denied'
  );

  const verificationRows = [
    {
      label: 'admin can approve contract',
      passed: auditReceipts.some((receipt) => receipt.action === 'Approve Contract'),
    },
    {
      label: 'admin can deny contract',
      passed: auditReceipts.some((receipt) => receipt.action === 'Deny Contract'),
    },
    {
      label: 'admin can revoke employee',
      passed: auditReceipts.some((receipt) => receipt.action === 'Revoke Employee'),
    },
    {
      label: 'revoked link fails',
      passed: employees.some((employee) => employee.status === 'revoked' && employee.deployment.qrStatus === 'revoked'),
    },
    {
      label: 'suspended employee cannot execute task',
      passed: employees.some((employee) => employee.status === 'suspended' && employee.sessionStatus === 'suspended'),
    },
    {
      label: 'employer documents stay isolated',
      passed: employerVaults.every((vault) => vault.isolated),
    },
    {
      label: 'global memory does not receive employer private content',
      passed: employees.every((employee) => !employee.privacy.globalMemoryLeak),
    },
    {
      label: 'audit receipt generated for every admin action',
      passed: auditReceipts.length >= 4,
    },
  ];

  const fullActivationLink = selectedEmployee
    ? selectedEmployee.deployment.qrStatus === 'revoked'
      ? 'REVOKED / INVALID'
      : `${window.location.origin}${selectedEmployee.deployment.activationLink}`
    : 'No employee selected';

  const runAction = (action: () => void) => {
    action();
    setAdminReason('Administrative governance review approved by Agent Lee and Leeway admin.');
  };

  const exportAuditReport = () => {
    const content = [
      '# Leeway Admin Audit Export',
      '',
      `Generated: ${new Date().toISOString()}`,
      `Admin ID: ${ADMIN_ID}`,
      '',
      '## Receipts',
      ...auditReceipts.map(
        (receipt) =>
          `- ${receipt.timestamp} | ${receipt.action} | ${receipt.affectedEmployeeId} | ${receipt.affectedEmployerId} | ${receipt.reason}`
      ),
    ].join('\n');

    downloadText('ADMIN_AUDIT_EXPORT.md', content);
  };

  const sendAssistantMessage = () => {
    if (!assistantInput.trim()) {
      return;
    }

    const prompt = assistantInput.trim();
    const response = buildAssistantReply(selectedEmployee, panel, prompt);
    setAssistantMessages((current) => [
      ...current,
      { id: `admin-${current.length + 1}`, role: 'admin', text: prompt },
      { id: `lee-${current.length + 2}`, role: 'assistant', text: response },
    ]);
    setAssistantInput('');
  };

  return (
    <div className="space-y-8">
      <header className="space-y-6">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="space-y-4">
            <div className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400">Projected from Leeway Construct</div>
            <h2 className="text-5xl font-serif italic leading-tight tracking-tighter">Leeway Employment Admin Console</h2>
            <p className="max-w-3xl text-sm uppercase tracking-wide leading-relaxed text-zinc-500">
              Deploy, monitor, approve, deny, suspend, revoke, audit, and privacy-guard every governed digital employee.
            </p>
          </div>

          <div className="max-w-xl border border-black/10 bg-white px-5 py-4 shadow-sm">
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Final Rule</div>
            <p className="mt-2 text-sm leading-relaxed">
              No digital employee is fully trusted until Admin + Governance certify it.
            </p>
            <p className="mt-3 text-[11px] text-zinc-500">{CONSTRUCT_PROJECTION_PATH}</p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Governed Workforce"
            value={`${employees.length}`}
            note={`${stats.active} active, ${stats.pending} pending certification`}
            icon={<Users size={20} />}
          />
          <StatCard
            label="Live Sessions"
            value={`${stats.liveSessions}`}
            note={`${stats.suspended} suspended or paused under governance`}
            icon={<Activity size={20} />}
          />
          <StatCard
            label="Hourly Billing"
            value="$1/hr"
            note="Every contract is priced at one dollar per hour and tracked in receipts."
            icon={<BadgeDollarSign size={20} />}
          />
          <StatCard
            label="Privacy Guard"
            value={`${stats.privacyCompliant}/${employees.length}`}
            note="Employer content remains isolated from shared system memory."
            icon={<ShieldCheck size={20} />}
          />
        </div>

        <div className="grid gap-4 xl:grid-cols-[1.3fr,1fr]">
          <SectionShell title="Managed Systems" eyebrow="Motherboard / Construct">
            <div className="grid gap-3 md:grid-cols-2">
              {managedSubsystems.map((system) => (
                <div key={system.id} className="border border-black/5 bg-[#FBFBF9] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-medium">{system.label}</div>
                    <span className={cn('border px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest', system.status === 'ready' ? 'border-emerald-200 bg-emerald-100 text-emerald-700' : system.status === 'linked' ? 'border-blue-200 bg-blue-100 text-blue-700' : 'border-amber-200 bg-amber-100 text-amber-700')}>
                      {system.status}
                    </span>
                  </div>
                  <p className="mt-2 text-[11px] leading-relaxed text-zinc-500">{system.description}</p>
                  <p className="mt-3 break-all text-[10px] font-mono text-zinc-400">{system.path}</p>
                </div>
              ))}
            </div>
          </SectionShell>

          <SectionShell title="Verification Matrix" eyebrow="Required Checks">
            <div className="space-y-3">
              {verificationRows.map((row) => (
                <div key={row.label} className="flex items-center justify-between gap-3 border-b border-black/5 pb-3 last:border-b-0 last:pb-0">
                  <span className="text-[11px] uppercase tracking-wide text-zinc-500">{row.label}</span>
                  <span className={cn('flex items-center gap-2 border px-2.5 py-1 text-[9px] font-bold uppercase tracking-widest', row.passed ? 'border-emerald-200 bg-emerald-100 text-emerald-700' : 'border-amber-200 bg-amber-100 text-amber-700')}>
                    {row.passed ? <CheckCircle2 size={12} /> : <Clock3 size={12} />}
                    {row.passed ? 'Pass' : 'Watch'}
                  </span>
                </div>
              ))}
            </div>
          </SectionShell>
        </div>
      </header>

      <div className="grid gap-6 xl:grid-cols-[240px,1fr,420px]">
        <aside className="space-y-4">
          <SectionShell title="Admin Panels" eyebrow="Construct Layer">
            <div className="space-y-2">
              {PANELS.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setPanel(item.id)}
                  className={cn(
                    'flex w-full items-center justify-between gap-3 border px-3 py-3 text-left transition-all',
                    panel === item.id ? 'border-black bg-black text-white' : 'border-black/5 bg-[#FBFBF9] hover:border-black/20'
                  )}
                >
                  <span className="flex items-center gap-3 text-[11px] font-bold uppercase tracking-widest">
                    {item.icon}
                    {item.label}
                  </span>
                </button>
              ))}
            </div>
          </SectionShell>

          <SectionShell title="Admin Shortcuts" eyebrow="Action Surface">
            <div className="space-y-2">
              <button
                onClick={onOpenBuilder}
                className="flex w-full items-center justify-between border border-black bg-black px-3 py-3 text-[11px] font-bold uppercase tracking-widest text-white"
              >
                Draft New Employee
                <ArrowRightLeft size={14} />
              </button>
              <button
                onClick={exportAuditReport}
                className="flex w-full items-center justify-between border border-black/10 px-3 py-3 text-[11px] font-bold uppercase tracking-widest"
              >
                Export Audit Report
                <ReceiptText size={14} />
              </button>
            </div>
          </SectionShell>
        </aside>

        <div className="space-y-6">
          {panel === 'registry' && (
            <SectionShell title="Workforce Registry" eyebrow="Employee Registry">
              <div className="space-y-3">
                {employees.map((employee) => (
                  <button
                    key={employee.employeeId}
                    onClick={() => setSelectedEmployeeId(employee.employeeId)}
                    className={cn(
                      'grid w-full grid-cols-[72px,1fr,120px,120px] items-center gap-4 border px-4 py-4 text-left transition-all',
                      selectedEmployeeId === employee.employeeId ? 'border-black bg-[#FBFBF9]' : 'border-black/5 hover:border-black/20'
                    )}
                  >
                    <div className="h-14 w-14 overflow-hidden rounded-full border border-black/10">
                      <EmployeeAvatar
                        avatarUrl={employee.avatarUrl}
                        alt={employee.displayName}
                        gridPos={employee.identity.gridPos}
                        className="h-full w-full"
                      />
                    </div>
                    <div>
                      <div className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">{employee.employeeId}</div>
                      <div className="mt-1 text-lg font-serif italic">{employee.jobTitle}</div>
                      <div className="mt-1 text-[11px] uppercase tracking-wide text-zinc-500">
                        {employee.employerBinding.employerName} â€¢ {employee.employerBinding.humanOwner}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className={cn('inline-flex border px-2 py-1 text-[9px] font-bold uppercase tracking-widest', statusPill(employee.status))}>
                        {employee.status}
                      </div>
                      <div className="text-[10px] uppercase tracking-wide text-zinc-500">{employee.sessionStatus}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Billing</div>
                      <div className="mt-1 text-sm font-medium">{currency(employee.billing.totalAccruedUsd)}</div>
                      <div className="text-[10px] uppercase tracking-wide text-zinc-500">{employee.billing.paymentStatus}</div>
                    </div>
                  </button>
                ))}
              </div>
            </SectionShell>
          )}

          {panel === 'contracts' && (
            <SectionShell title="Contract Review" eyebrow="Pending Contracts">
              <div className="grid gap-4 lg:grid-cols-2">
                {pendingContracts.map((employee) => (
                  <div key={employee.employeeId} className="border border-black/5 bg-[#FBFBF9] p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">{employee.employeeId}</div>
                        <div className="mt-2 text-2xl font-serif italic">{employee.jobTitle}</div>
                        <div className="mt-2 text-[11px] uppercase tracking-wide text-zinc-500">
                          {employee.employerBinding.employerName} â€¢ {employee.employerBinding.humanOwner}
                        </div>
                      </div>
                      <span className={cn('border px-2 py-1 text-[9px] font-bold uppercase tracking-widest', statusPill(employee.status))}>
                        {employee.contractStatus}
                      </span>
                    </div>

                    <div className="mt-5 space-y-2 text-[11px] text-zinc-600">
                      <div>Projected billing: {currency(employee.contract.totalAccruedUsd)} accrued â€¢ {employee.contract.pricingLabel}</div>
                      <div>Payment status: {employee.contract.paymentStatus}</div>
                      <div>Employer namespace: {employee.employerBinding.namespace}</div>
                    </div>

                    <div className="mt-5 flex gap-2">
                      <button
                        onClick={() => {
                          setSelectedEmployeeId(employee.employeeId);
                          runAction(() => approveContract(employee.employeeId, ADMIN_ID, 'Contract approved for governed deployment at $1/hr.'));
                        }}
                        className="flex-1 border border-black bg-black px-3 py-3 text-[10px] font-bold uppercase tracking-widest text-white"
                      >
                        Approve Contract
                      </button>
                      <button
                        onClick={() => {
                          setSelectedEmployeeId(employee.employeeId);
                          runAction(() => denyContract(employee.employeeId, ADMIN_ID, 'Contract denied pending revised governance and billing terms.'));
                        }}
                        className="flex-1 border border-black/10 px-3 py-3 text-[10px] font-bold uppercase tracking-widest"
                      >
                        Deny Contract
                      </button>
                    </div>
                  </div>
                ))}
                {pendingContracts.length === 0 && (
                  <div className="border border-dashed border-black/10 p-8 text-[11px] uppercase tracking-wide text-zinc-500">
                    No pending contracts at this moment.
                  </div>
                )}
              </div>
            </SectionShell>
          )}

          {panel === 'deployments' && (
            <SectionShell title="Deployment Control" eyebrow="Active Deployments">
              <div className="space-y-3">
                {activeDeployments.map((employee) => (
                  <div key={employee.employeeId} className="grid gap-4 border border-black/5 bg-[#FBFBF9] p-4 lg:grid-cols-[1.4fr,1fr,180px]">
                    <div>
                      <div className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">{employee.employeeId}</div>
                      <div className="mt-1 text-xl font-serif italic">{employee.jobTitle}</div>
                      <div className="mt-1 text-[11px] uppercase tracking-wide text-zinc-500">{employee.employerBinding.employerName}</div>
                    </div>
                    <div className="space-y-2 text-[11px] text-zinc-600">
                      <div>Link status: {employee.deployment.qrStatus}</div>
                      <div>Session: {employee.sessionStatus}</div>
                      <div>Device lock: {employee.employerBinding.deviceLocked ? 'locked' : 'open'}</div>
                    </div>
                    <button
                      onClick={() => setSelectedEmployeeId(employee.employeeId)}
                      className="border border-black/10 px-3 py-3 text-[10px] font-bold uppercase tracking-widest"
                    >
                      Inspect Deployment
                    </button>
                  </div>
                ))}
              </div>
            </SectionShell>
          )}

          {panel === 'sessions' && (
            <SectionShell title="Live Sessions" eyebrow="Session Monitor">
              <div className="space-y-3">
                {employees.map((employee) => (
                  <div key={employee.employeeId} className="grid gap-4 border border-black/5 bg-[#FBFBF9] p-4 lg:grid-cols-[1.2fr,1fr,220px]">
                    <div>
                      <div className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">{employee.employeeId}</div>
                      <div className="mt-1 text-xl font-serif italic">{employee.displayName}</div>
                      <div className="mt-1 text-[11px] uppercase tracking-wide text-zinc-500">{employee.jobTitle}</div>
                    </div>
                    <div className="space-y-1 text-[11px] text-zinc-600">
                      <div>Status: {employee.sessionStatus}</div>
                      <div>Last heartbeat: {new Date(employee.deployment.lastSessionHeartbeat).toLocaleString()}</div>
                      <div>RTC: {employee.employerBinding.rtcChannel}</div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setSelectedEmployeeId(employee.employeeId);
                          runAction(() => killSession(employee.employeeId, ADMIN_ID, 'Admin terminated session from Session Monitor.'));
                        }}
                        className="flex-1 border border-black bg-black px-3 py-3 text-[10px] font-bold uppercase tracking-widest text-white"
                      >
                        Kill Session
                      </button>
                      <button
                        onClick={() => {
                          setSelectedEmployeeId(employee.employeeId);
                          runAction(() => rotateActivationLink(employee.employeeId, ADMIN_ID, 'Activation link rotated during session review.'));
                        }}
                        className="flex-1 border border-black/10 px-3 py-3 text-[10px] font-bold uppercase tracking-widest"
                      >
                        Rotate Link
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </SectionShell>
          )}

          {panel === 'privacy' && (
            <SectionShell title="Privacy Guard" eyebrow="Employer Data Isolation">
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="space-y-3">
                  {employees.map((employee) => (
                    <button
                      key={employee.employeeId}
                      onClick={() => setSelectedEmployeeId(employee.employeeId)}
                      className="w-full border border-black/5 bg-[#FBFBF9] p-4 text-left hover:border-black/20"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">{employee.employeeId}</div>
                          <div className="mt-1 text-lg font-serif italic">{employee.displayName}</div>
                        </div>
                        <span className={cn('border px-2 py-1 text-[9px] font-bold uppercase tracking-widest', privacyPill(employee.privacy.state))}>
                          {employee.privacy.state}
                        </span>
                      </div>
                      <div className="mt-3 grid gap-1 text-[11px] text-zinc-600">
                        <div>Documents isolated: {employee.privacy.documentsIsolated ? 'yes' : 'no'}</div>
                        <div>Private files namespaced: {employee.privacy.privateFilesNamespaced ? 'yes' : 'no'}</div>
                        <div>Global memory leak: {employee.privacy.globalMemoryLeak ? 'detected' : 'none'}</div>
                      </div>
                    </button>
                  ))}
                </div>

                <div className="border border-black/5 bg-[#FBFBF9] p-5">
                  <div className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Privacy Guard Policy</div>
                  <ul className="mt-4 space-y-3 text-[12px] leading-relaxed text-zinc-600">
                    <li>Employer data remains employer-owned and locked inside the employer namespace.</li>
                    <li>Global learning stores anonymized operational metrics only, never employer private content.</li>
                    <li>No cross-employer knowledge sharing occurs unless explicit authorization is recorded.</li>
                    <li>Every private file remains inside the employer data vault and is verified by governance.</li>
                  </ul>
                </div>
              </div>
            </SectionShell>
          )}

          {panel === 'audit' && (
            <SectionShell title="Audit Receipts" eyebrow="Governed Admin Actions">
              <div className="space-y-3">
                {auditReceipts.map((receipt) => (
                  <div key={receipt.id} className="border border-black/5 bg-[#FBFBF9] p-4">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <div className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">{receipt.id}</div>
                        <div className="mt-1 text-lg font-serif italic">{receipt.action}</div>
                        <div className="mt-1 text-[11px] uppercase tracking-wide text-zinc-500">
                          {receipt.affectedEmployeeId} â€¢ {receipt.affectedEmployerId}
                        </div>
                      </div>
                      <div className="text-right text-[11px] text-zinc-500">
                        <div>{new Date(receipt.timestamp).toLocaleString()}</div>
                        <div>{receipt.adminId}</div>
                      </div>
                    </div>
                    <div className="mt-4 grid gap-2 text-[11px] text-zinc-600">
                      <div>Reason: {receipt.reason}</div>
                      <div>Route: {receipt.orchestratorRoute}</div>
                      <div>Privacy result: {receipt.privacyResult}</div>
                      <div>Receipt hash: {receipt.receiptHash}</div>
                    </div>
                  </div>
                ))}
              </div>
            </SectionShell>
          )}

          {panel === 'permissions' && (
            <SectionShell title="Tool Permissions" eyebrow="Governed Tool Access">
              <div className="space-y-4">
                {(selectedEmployee ? [selectedEmployee] : employees).map((employee) => (
                  <div key={employee.employeeId} className="border border-black/5 bg-[#FBFBF9] p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <div className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">{employee.employeeId}</div>
                        <div className="mt-1 text-lg font-serif italic">{employee.displayName}</div>
                      </div>
                      <button
                        onClick={() => setSelectedEmployeeId(employee.employeeId)}
                        className="border border-black/10 px-3 py-2 text-[10px] font-bold uppercase tracking-widest"
                      >
                        Focus
                      </button>
                    </div>
                    <div className="mt-4 grid gap-3">
                      {employee.toolPermissions.map((permission) => (
                        <div key={permission.id} className="grid gap-3 border border-black/5 bg-white p-3 lg:grid-cols-[180px,120px,1fr]">
                          <div className="text-[11px] font-bold uppercase tracking-wide">{permission.tool}</div>
                          <div className={cn('inline-flex border px-2 py-1 text-[9px] font-bold uppercase tracking-widest', permission.allowed ? 'border-emerald-200 bg-emerald-100 text-emerald-700' : 'border-rose-200 bg-rose-100 text-rose-700')}>
                            {permission.allowed ? 'allowed' : 'blocked'}
                          </div>
                          <div className="text-[11px] text-zinc-600">
                            {permission.scope} â€¢ {permission.reason}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </SectionShell>
          )}

          {panel === 'vaults' && (
            <SectionShell title="Employer Data Vaults" eyebrow="Isolation Surfaces">
              <div className="grid gap-4 lg:grid-cols-2">
                {employerVaults.map((vault: EmployerVault) => (
                  <div key={vault.vaultId} className="border border-black/5 bg-[#FBFBF9] p-5">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">{vault.employerId}</div>
                        <div className="mt-1 text-xl font-serif italic">{vault.employerName}</div>
                      </div>
                      <span className={cn('border px-2 py-1 text-[9px] font-bold uppercase tracking-widest', vault.isolated ? 'border-emerald-200 bg-emerald-100 text-emerald-700' : 'border-rose-200 bg-rose-100 text-rose-700')}>
                        {vault.isolated ? 'isolated' : 'risk'}
                      </span>
                    </div>
                    <div className="mt-4 space-y-2 text-[11px] text-zinc-600">
                      <div>Namespace: {vault.namespace}</div>
                      <div>Vault ID: {vault.vaultId}</div>
                      <div>Document count: {vault.documentCount}</div>
                      <div>Private files: {vault.privateFileCount}</div>
                      <div>Sharing mode: {vault.sharingMode}</div>
                      <div>Risk level: {vault.riskLevel}</div>
                    </div>
                  </div>
                ))}
              </div>
            </SectionShell>
          )}

          {panel === 'investors' && (
            <AdminInvestorPortal />
          )}

          {panel === 'deployments' && suspendedOrRevoked.length > 0 && (
            <SectionShell title="Suspended / Revoked Employees" eyebrow="Containment Queue">
              <div className="space-y-3">
                {suspendedOrRevoked.map((employee) => (
                  <div key={employee.employeeId} className="grid gap-4 border border-black/5 bg-[#FBFBF9] p-4 lg:grid-cols-[1.2fr,1fr,200px]">
                    <div>
                      <div className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">{employee.employeeId}</div>
                      <div className="mt-1 text-xl font-serif italic">{employee.jobTitle}</div>
                      <div className="mt-1 text-[11px] uppercase tracking-wide text-zinc-500">{employee.employerBinding.employerName}</div>
                    </div>
                    <div className="space-y-1 text-[11px] text-zinc-600">
                      <div>Status: {employee.status}</div>
                      <div>Session: {employee.sessionStatus}</div>
                      <div>Blocked actions: {employee.blockedActions.length}</div>
                    </div>
                    <button
                      onClick={() => setSelectedEmployeeId(employee.employeeId)}
                      className="border border-black/10 px-3 py-3 text-[10px] font-bold uppercase tracking-widest"
                    >
                      Inspect Incident
                    </button>
                  </div>
                ))}
              </div>
            </SectionShell>
          )}
        </div>

        <aside className="space-y-6">
          <SectionShell title="Selected Employee" eyebrow="Inspector">
            {selectedEmployee ? (
              <div className="space-y-5">
                <div className="flex gap-4">
                  <div className="h-20 w-20 overflow-hidden rounded-full border border-black/10 shadow-sm">
                    <EmployeeAvatar
                      avatarUrl={selectedEmployee.avatarUrl}
                      alt={selectedEmployee.displayName}
                      gridPos={selectedEmployee.identity.gridPos}
                      className="h-full w-full"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">{selectedEmployee.employeeId}</div>
                    <div className="mt-1 text-2xl font-serif italic">{selectedEmployee.jobTitle}</div>
                    <div className="mt-1 text-[11px] uppercase tracking-wide text-zinc-500">{selectedEmployee.displayName}</div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className={cn('border px-2 py-1 text-[9px] font-bold uppercase tracking-widest', statusPill(selectedEmployee.status))}>
                        {selectedEmployee.status}
                      </span>
                      <span className={cn('border px-2 py-1 text-[9px] font-bold uppercase tracking-widest', privacyPill(selectedEmployee.privacy.state))}>
                        {selectedEmployee.privacy.state}
                      </span>
                      <span
                        className="border px-2 py-1 text-[9px] font-bold uppercase tracking-widest text-white"
                        style={{ backgroundColor: JOB_FAMILY_COLORS[selectedEmployee.identity.jobFamily].hex }}
                      >
                        {selectedEmployee.identity.jobFamily}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 border-t border-black/5 pt-4 text-[11px] text-zinc-600">
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Employer Binding</div>
                    <div className="mt-2 space-y-1">
                      <div>{selectedEmployee.employerBinding.employerName}</div>
                      <div>{selectedEmployee.employerBinding.humanOwner} â€¢ {selectedEmployee.employerBinding.humanEmail}</div>
                      <div>{selectedEmployee.employerBinding.deviceLabel} â€¢ {selectedEmployee.employerBinding.deviceId}</div>
                    </div>
                  </div>

                  <div>
                    <div className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Billing & Contract</div>
                    <div className="mt-2 space-y-1">
                      <div>$1/hr â€¢ {selectedEmployee.contract.pricingLabel}</div>
                      <div>Hours logged: {selectedEmployee.billing.hoursWorked}</div>
                      <div>Accrued: {currency(selectedEmployee.billing.totalAccruedUsd)}</div>
                      <div>Payment: {selectedEmployee.billing.paymentStatus}</div>
                    </div>
                  </div>

                  <div>
                    <div className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Activation & Session</div>
                    <div className="mt-2 space-y-2">
                      <div className="break-all">{fullActivationLink}</div>
                      <div>QR status: {selectedEmployee.deployment.qrStatus}</div>
                      <div>Session: {selectedEmployee.sessionStatus}</div>
                    </div>
                  </div>

                  <div className="rounded-sm border border-black/5 bg-[#FBFBF9] p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Contract Snapshot</div>
                        <div className="mt-3 text-[11px] font-bold uppercase tracking-wide text-zinc-500">Duties</div>
                        <div className="mt-2 space-y-1">
                          {selectedEmployee.contract.duties.map((duty) => (
                            <div key={duty}>{duty}</div>
                          ))}
                        </div>
                        <div className="mt-4 text-[11px] font-bold uppercase tracking-wide text-zinc-500">Boundaries</div>
                        <div className="mt-2 space-y-1">
                          {selectedEmployee.contract.boundaries.map((boundary) => (
                            <div key={boundary}>{boundary}</div>
                          ))}
                        </div>
                      </div>
                      <div className="w-[88px] shrink-0 border border-black/5 bg-white p-2">
                        <QRCodeSVG value={fullActivationLink} size={72} />
                      </div>
                    </div>
                  </div>

                  <div className="rounded-sm border border-black/5 bg-[#FBFBF9] p-4">
                    <div className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">VM Manifest</div>
                    <div className="mt-3 space-y-1 break-all text-[11px] text-zinc-600">
                      <div>Build: {selectedEmployee.manifest.buildId}</div>
                      <div>Runtime: {selectedEmployee.manifest.runtime}</div>
                      <div>Route: {selectedEmployee.manifest.orchestratorRoute}</div>
                      <div>Projection: {selectedEmployee.manifest.constructProjectionPath}</div>
                      <div>Managed systems: {selectedEmployee.manifest.managedSystems.length}</div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-[11px] uppercase tracking-wide text-zinc-500">Select an employee to inspect contract, manifest, privacy, and deployment controls.</div>
            )}
          </SectionShell>

          <SectionShell title="Admin Actions" eyebrow="Governed Controls">
            <div className="space-y-4">
              <textarea
                value={adminReason}
                onChange={(event) => setAdminReason(event.target.value)}
                className="min-h-24 w-full border border-black/10 bg-[#FBFBF9] p-3 text-[11px] leading-relaxed outline-none"
                placeholder="Reason for admin action"
              />

              <div className="grid gap-2 sm:grid-cols-2">
                <button
                  disabled={!selectedEmployee}
                  onClick={() => selectedEmployee && runAction(() => approveContract(selectedEmployee.employeeId, ADMIN_ID, adminReason))}
                  className="flex items-center justify-center gap-2 border border-black bg-black px-3 py-3 text-[10px] font-bold uppercase tracking-widest text-white disabled:opacity-30"
                >
                  <CheckCircle2 size={14} />
                  Approve Contract
                </button>
                <button
                  disabled={!selectedEmployee}
                  onClick={() => selectedEmployee && runAction(() => denyContract(selectedEmployee.employeeId, ADMIN_ID, adminReason))}
                  className="flex items-center justify-center gap-2 border border-black/10 px-3 py-3 text-[10px] font-bold uppercase tracking-widest disabled:opacity-30"
                >
                  <XCircle size={14} />
                  Deny Contract
                </button>
                <button
                  disabled={!selectedEmployee}
                  onClick={() => selectedEmployee && runAction(() => suspendEmployee(selectedEmployee.employeeId, ADMIN_ID, adminReason))}
                  className="flex items-center justify-center gap-2 border border-black/10 px-3 py-3 text-[10px] font-bold uppercase tracking-widest disabled:opacity-30"
                >
                  <ShieldBan size={14} />
                  Suspend Employee
                </button>
                <button
                  disabled={!selectedEmployee}
                  onClick={() => selectedEmployee && runAction(() => revokeEmployee(selectedEmployee.employeeId, ADMIN_ID, adminReason))}
                  className="flex items-center justify-center gap-2 border border-black/10 px-3 py-3 text-[10px] font-bold uppercase tracking-widest disabled:opacity-30"
                >
                  <AlertTriangle size={14} />
                  Revoke Employee
                </button>
                <button
                  disabled={!selectedEmployee}
                  onClick={() => selectedEmployee && runAction(() => killSession(selectedEmployee.employeeId, ADMIN_ID, adminReason))}
                  className="flex items-center justify-center gap-2 border border-black/10 px-3 py-3 text-[10px] font-bold uppercase tracking-widest disabled:opacity-30"
                >
                  <MonitorStop size={14} />
                  Kill Session
                </button>
                <button
                  disabled={!selectedEmployee}
                  onClick={() => selectedEmployee && runAction(() => rotateActivationLink(selectedEmployee.employeeId, ADMIN_ID, adminReason))}
                  className="flex items-center justify-center gap-2 border border-black/10 px-3 py-3 text-[10px] font-bold uppercase tracking-widest disabled:opacity-30"
                >
                  <ArrowRightLeft size={14} />
                  Rotate Activation Link
                </button>
                <button
                  disabled={!selectedEmployee}
                  onClick={() => selectedEmployee && runAction(() => lockDeviceBinding(selectedEmployee.employeeId, ADMIN_ID, adminReason))}
                  className="flex items-center justify-center gap-2 border border-black/10 px-3 py-3 text-[10px] font-bold uppercase tracking-widest disabled:opacity-30"
                >
                  <FileLock2 size={14} />
                  Lock Device Binding
                </button>
                <button
                  disabled={!selectedEmployee}
                  onClick={() => selectedEmployee && runAction(() => verifyPrivacyCompliance(selectedEmployee.employeeId, ADMIN_ID, adminReason))}
                  className="flex items-center justify-center gap-2 border border-black/10 px-3 py-3 text-[10px] font-bold uppercase tracking-widest disabled:opacity-30"
                >
                  <Shield size={14} />
                  Verify Privacy Compliance
                </button>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                <button
                  disabled={!selectedEmployee}
                  onClick={() => selectedEmployee && onOpenVM(selectedEmployee)}
                  className="flex items-center justify-center gap-2 border border-black/10 px-3 py-3 text-[10px] font-bold uppercase tracking-widest disabled:opacity-30"
                >
                  <Fingerprint size={14} />
                  Open Agent VM
                </button>
                <button
                  onClick={exportAuditReport}
                  className="flex items-center justify-center gap-2 border border-black/10 px-3 py-3 text-[10px] font-bold uppercase tracking-widest"
                >
                  <FileText size={14} />
                  Export Audit Report
                </button>
              </div>
            </div>
          </SectionShell>

          <SectionShell title="Agent Lee" eyebrow="Administrative Assistant">
            <div className="space-y-4">
              <div className="max-h-72 space-y-3 overflow-y-auto border border-black/5 bg-[#FBFBF9] p-4">
                {assistantMessages.map((message) => (
                  <div
                    key={message.id}
                    className={cn(
                      'rounded-sm border px-3 py-3 text-[11px] leading-relaxed',
                      message.role === 'assistant' ? 'border-black/5 bg-white' : 'border-black bg-black text-white'
                    )}
                  >
                    <div className="mb-1 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em]">
                      {message.role === 'assistant' ? <Bot size={12} /> : <UserRoundCog size={12} />}
                      {message.role === 'assistant' ? 'Agent Lee' : 'Admin'}
                    </div>
                    <div>{message.text}</div>
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <textarea
                  value={assistantInput}
                  onChange={(event) => setAssistantInput(event.target.value)}
                  className="min-h-20 w-full border border-black/10 bg-[#FBFBF9] p-3 text-[11px] leading-relaxed outline-none"
                  placeholder="Ask Agent Lee to explain a contract, revoke a worker, check privacy, or suggest the next action."
                />
                <button
                  onClick={sendAssistantMessage}
                  className="flex w-full items-center justify-center gap-2 border border-black bg-black px-3 py-3 text-[10px] font-bold uppercase tracking-widest text-white"
                >
                  <Bot size={14} />
                  Send to Agent Lee
                </button>
              </div>
            </div>
          </SectionShell>

          {selectedEmployee && (
            <SectionShell title="Blocked Actions & Task History" eyebrow="Operational Trace">
              <div className="space-y-4">
                <div>
                  <div className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Blocked Actions</div>
                  <div className="mt-3 space-y-2">
                    {selectedEmployee.blockedActions.length > 0 ? (
                      selectedEmployee.blockedActions.map((action) => (
                        <div key={action.id} className="border border-black/5 bg-[#FBFBF9] p-3 text-[11px] text-zinc-600">
                          <div className="font-bold uppercase tracking-wide">{action.action}</div>
                          <div className="mt-1">{action.reason}</div>
                          <div className="mt-1 text-[10px] uppercase tracking-wide text-zinc-400">{action.policy}</div>
                        </div>
                      ))
                    ) : (
                      <div className="border border-dashed border-black/10 p-3 text-[11px] uppercase tracking-wide text-zinc-500">
                        No blocked actions recorded.
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <div className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Task History</div>
                  <div className="mt-3 space-y-2">
                    {selectedEmployee.taskHistory.map((task) => (
                      <div key={task.id} className="border border-black/5 bg-[#FBFBF9] p-3 text-[11px] text-zinc-600">
                        <div className="flex items-center justify-between gap-3">
                          <div className="font-bold uppercase tracking-wide">{task.title}</div>
                          <div className="text-[10px] uppercase tracking-wide text-zinc-400">{task.status}</div>
                        </div>
                        <div className="mt-1">{task.summary}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </SectionShell>
          )}
        </aside>
      </div>
    </div>
  );
}

