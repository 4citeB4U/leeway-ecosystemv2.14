/*
FILE: src\lib\workforceFactory.ts
PURPOSE: LeeWay governed asset for leeway-employment-center.
TAG: UTIL.FILE.W_OR_KF_OR_CE_FA_CT_OR_Y.MAIN
REGION: 🟠 UTIL
GOVERNED_BY: LeeWay Standards
OWNED_BY: Agent Lee / LeeWay Runtime
DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render
IMPORTS: Inferred by verification scanner
EXPORTS: Inferred by verification scanner
STATUS: ACTIVE
*/
import type {
  AuditReceipt,
  BillingState,
  BlockedAction,
  ContractStatus,
  EmployeeStatus,
  EmployeeVM,
  EmployerVault,
  IdentityProfile,
  JobFamily,
  ManagedSubsystem,
  PaymentStatus,
  PrivacyGuardStatus,
  PrivacyState,
  SessionStatus,
  TaskHistoryItem,
  ToolPermission,
} from '../types';
import { EMPLOYEE_FACE_ASSIGNMENTS } from './employeeFaces';
import { generateId, generateToken } from './utils';

export const CONSTRUCT_PROJECTION_PATH =
  'E:\\Agent-Lee-The-Sum-of-All-Systems\\agent-lee-motherboard\\leeway-construct';

export const MANAGED_SUBSYSTEMS: ManagedSubsystem[] = [
  {
    id: 'employment-center',
    label: 'Leeway Employment Center',
    path: 'E:\\leeway-employment-center',
    status: 'ready',
    description: 'Primary workforce origination, contract drafting, and governed deployment intake.',
    orchestratorSurface: 'SUM.Orchestrator::employment-center',
  },
  {
    id: 'edge-gpu',
    label: 'LeeWay Edge GPU',
    path: 'E:\\LeeWay-Edge-GPU',
    status: 'linked',
    description: 'Compute routing, telemetry acceleration, and execution substrate for active agents.',
    orchestratorSurface: 'SUM.Orchestrator::edge-gpu',
  },
  {
    id: 'edge-rtc',
    label: 'LeeWay Edge RTC',
    path: 'E:\\LeeWay-Edge-RTC',
    status: 'linked',
    description: 'Voice, call, session presence, and live operator communication plane.',
    orchestratorSurface: 'SUM.Orchestrator::edge-rtc',
  },
  {
    id: 'edge-device',
    label: 'LeeWay Edge Device',
    path: 'E:\\LeeWay-Edge-DEVICE',
    status: 'watch',
    description: 'Employer-bound device locks, field presence, and endpoint identity control.',
    orchestratorSurface: 'SUM.Orchestrator::edge-device',
  },
  {
    id: 'edge-iot',
    label: 'LeeWay Edge IoT',
    path: 'E:\\LeeWay-Edge-IOT',
    status: 'watch',
    description: 'On-site signal ingestion, device telemetry, and environment monitoring surfaces.',
    orchestratorSurface: 'SUM.Orchestrator::edge-iot',
  },
  {
    id: 'leeway-standards',
    label: 'LeeWay Standards',
    path: 'E:\\LeeWay-Standards',
    status: 'ready',
    description: 'Global governance, policy, receipts, and privacy standard source of truth.',
    orchestratorSurface: 'SUM.Orchestrator::standards',
  },
];

type CreateGovernedEmployeeInput = {
  employeeId?: string;
  employerId: string;
  employerName: string;
  humanOwner: string;
  humanEmail: string;
  deviceId: string;
  deviceLabel: string;
  jobTitle: string;
  industry: string;
  department: string;
  displayName: string;
  jobFamily: JobFamily;
  duties: string[];
  boundaries: string[];
  kpis?: string[];
  permissions: string[];
  tools: string[];
  knowledgeRefs: string[];
  avatarUrl?: string;
  gridPos?: IdentityProfile['gridPos'];
  faceIndex?: number;
  status?: EmployeeStatus;
  contractStatus?: ContractStatus;
  sessionStatus?: SessionStatus;
  paymentStatus?: PaymentStatus;
  hoursWorked?: number;
  weeklyHourCap?: number;
  taskHistory?: TaskHistoryItem[];
  blockedActions?: BlockedAction[];
  adminNotes?: string[];
  privacyState?: PrivacyState;
  crossEmployerSharingAuthorized?: boolean;
  employerPaid?: boolean;
};

const nowIso = () => new Date().toISOString();

const nextInvoiceAt = () => {
  const next = new Date();
  next.setDate(next.getDate() + 7);
  return next.toISOString();
};

const computeReadiness = (status: EmployeeStatus) => {
  if (status === 'active') return 98;
  if (status === 'pending') return 92;
  if (status === 'suspended') return 76;
  if (status === 'revoked' || status === 'denied') return 18;
  return 64;
};

const faceFor = (faceIndex = 0) =>
  EMPLOYEE_FACE_ASSIGNMENTS[faceIndex % EMPLOYEE_FACE_ASSIGNMENTS.length];

const makeToolPermissions = (tools: string[]): ToolPermission[] =>
  tools.map((tool, index) => ({
    id: generateId('TP'),
    tool,
    allowed: true,
    scope: index % 2 === 0 ? 'employer-namespace' : 'session-scoped',
    governedBy: 'Leeway Governance / SUM Orchestrator',
    reason: 'Required for contracted duties and monitored under privacy guard.',
  }));

const makePrivacyStatus = (
  state: PrivacyState,
  crossEmployerSharingAuthorized: boolean
): PrivacyGuardStatus => ({
  compliant: state === 'compliant',
  state,
  employerOwnedData: true,
  documentsIsolated: true,
  globalMemoryLeak: false,
  crossEmployerSharingAuthorized,
  privateFilesNamespaced: true,
  anonymizedMetricsOnly: true,
  displayedToEmployer: true,
  lastVerifiedAt: nowIso(),
  notes: [
    'Employer data remains inside the employer namespace.',
    'Global learning stores only anonymized operational metrics.',
    'No cross-employer knowledge sharing occurs without explicit authorization.',
  ],
});

const makeBillingState = (
  paymentStatus: PaymentStatus,
  hoursWorked: number,
  weeklyHourCap: number,
  employerPaid: boolean
): BillingState => ({
  hourlyRateUsd: 1,
  hoursWorked,
  weeklyHourCap,
  paymentStatus,
  employerPaid,
  totalAccruedUsd: hoursWorked,
  nextInvoiceAt: nextInvoiceAt(),
});

const makeContractState = (
  paymentStatus: PaymentStatus,
  hoursWorked: number,
  weeklyHourCap: number,
  contractStatus: ContractStatus
) => ({
  hourlyRateUsd: 1,
  weeklyHourCap,
  paymentStatus,
  paymentAuthorized: paymentStatus === 'authorized' || paymentStatus === 'paid',
  paymentCaptured: paymentStatus === 'paid',
  billableHours: hoursWorked,
  totalAccruedUsd: hoursWorked,
  pricingLabel: '$1/hr governed digital labor',
  approvedAt: contractStatus === 'approved' ? nowIso() : undefined,
});

export const makeActivationLink = (employeeId: string, token: string) =>
  `/activate/${employeeId}?token=${token}`;

export const createAuditReceipt = (
  employee: Pick<EmployeeVM, 'employeeId' | 'employerId' | 'privacy'>,
  action: string,
  adminId: string,
  reason: string,
  governanceStatus: 'passed' | 'denied' = 'passed'
): AuditReceipt => {
  const timestamp = nowIso();
  return {
    id: generateId('AUD'),
    action,
    adminId,
    reason,
    timestamp,
    affectedEmployeeId: employee.employeeId,
    affectedEmployerId: employee.employerId,
    orchestratorRoute: 'SUM.Orchestrator -> Leeway Governance -> Leeway Construct',
    governanceStatus,
    subsystem: 'Leeway Employment Admin Console',
    privacyResult: employee.privacy.state,
    receiptHash: `${action}-${employee.employeeId}-${timestamp}`.replace(/[^A-Z0-9-]/gi, '').slice(0, 32),
  };
};

export function createGovernedEmployee({
  employeeId = generateId('EMP'),
  employerId,
  employerName,
  humanOwner,
  humanEmail,
  deviceId,
  deviceLabel,
  jobTitle,
  industry,
  department,
  displayName,
  jobFamily,
  duties,
  boundaries,
  kpis = ['Customer engagement quality', 'Contract accuracy', 'Privacy compliance'],
  permissions,
  tools,
  knowledgeRefs,
  avatarUrl,
  gridPos,
  faceIndex = 0,
  status = 'pending',
  contractStatus = 'pending',
  sessionStatus = status === 'active' ? 'live' : status === 'suspended' ? 'suspended' : status === 'revoked' ? 'revoked' : 'staged',
  paymentStatus = contractStatus === 'approved' || status === 'active' ? 'paid' : 'authorized',
  hoursWorked = status === 'active' ? 32 : status === 'suspended' ? 18 : 4,
  weeklyHourCap = 40,
  taskHistory = [],
  blockedActions = [],
  adminNotes = [],
  privacyState = status === 'revoked' ? 'warning' : 'compliant',
  crossEmployerSharingAuthorized = false,
  employerPaid = paymentStatus === 'paid',
}: CreateGovernedEmployeeInput): EmployeeVM {
  const face = avatarUrl && gridPos ? { avatarUrl, gridPos } : faceFor(faceIndex);
  const token = generateToken();
  const privacy = makePrivacyStatus(privacyState, crossEmployerSharingAuthorized);

  return {
    vmId: generateId('VM'),
    employerId,
    employeeId,
    jobTitle,
    industry,
    department,
    displayName,
    avatarUrl: face.avatarUrl,
    contract: {
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      duties,
      boundaries,
      kpis,
      ...makeContractState(paymentStatus, hoursWorked, weeklyHourCap, contractStatus),
    },
    identity: {
      jobFamily,
      borderColor: '#1A1A1A',
      badgeColor: jobFamily.toLowerCase(),
      statusColor: status === 'active' ? 'green' : status === 'pending' ? 'amber' : 'red',
      avatarId: generateId('AV'),
      authorityLevel: status === 'active' ? 'elevated' : 'standard',
      readinessScore: computeReadiness(status),
      isCertified: status !== 'denied' && status !== 'revoked',
      gridPos: face.gridPos,
    },
    permissions,
    tools,
    knowledgeRefs,
    status,
    contractStatus,
    sessionStatus,
    token,
    billing: makeBillingState(paymentStatus, hoursWorked, weeklyHourCap, employerPaid),
    manifest: {
      buildId: generateId('BUILD'),
      runtime: 'Agent Lee Motherboard / Leeway Construct',
      constructProjectionPath: CONSTRUCT_PROJECTION_PATH,
      orchestratorRoute: 'SUM.Orchestrator -> Leeway Governance -> Employer Namespace',
      governanceLayer: 'Leeway Standards / Governance BIOS',
      managedSystems: MANAGED_SUBSYSTEMS.map((system) => system.path),
      certificationStatus: status === 'revoked' ? 'revoked' : status === 'pending' ? 'pending' : 'certified',
      privacyMode: 'employer-isolated',
      deviceSurface: 'LeeWay-Edge-DEVICE',
      rtcSurface: 'LeeWay-Edge-RTC',
      gpuSurface: 'LeeWay-Edge-GPU',
      iotSurface: 'LeeWay-Edge-IOT',
      lastIntegrityCheck: nowIso(),
    },
    employerBinding: {
      employerName,
      humanOwner,
      humanEmail,
      deviceId,
      deviceLabel,
      namespace: `employers/${employerId.toLowerCase()}`,
      vaultId: `VAULT-${employerId}`,
      rtcChannel: `rtc://${employerId.toLowerCase()}/${employeeId.toLowerCase()}`,
      deviceLocked: false,
    },
    deployment: {
      activationLink: makeActivationLink(employeeId, token),
      qrIssued: true,
      qrStatus: status === 'revoked' ? 'revoked' : 'active',
      lastSessionHeartbeat: nowIso(),
    },
    privacy,
    toolPermissions: makeToolPermissions(tools),
    taskHistory,
    blockedActions,
    adminNotes,
    certification: {
      certId: generateId('CERT'),
      timestamp: nowIso(),
      checks: {
        grounding: true,
        tools: true,
        contract: contractStatus !== 'denied',
        simulation: status !== 'revoked',
      },
    },
  };
}

export const seedEmployees = (): EmployeeVM[] => [
  createGovernedEmployee({
    employeeId: 'EMP-ADM-201',
    employerId: 'EMPLOYER-NORTHSTAR',
    employerName: 'Northstar Manufacturing',
    humanOwner: 'Alicia Grant',
    humanEmail: 'alicia.grant@northstar.example',
    deviceId: 'DEVICE-NORTHSTAR-01',
    deviceLabel: 'Northstar Control Tablet',
    jobTitle: 'Customer Engagement Director',
    industry: 'Manufacturing',
    department: 'Acquisition',
    displayName: 'Leona Mercer',
    jobFamily: 'Sales',
    duties: ['Outbound proposal follow-ups', 'CRM lead qualification', 'Employer onboarding calls'],
    boundaries: ['Do not disclose employer documents outside namespace', 'Escalate pricing exceptions to admin'],
    permissions: ['voice', 'chat', 'documents'],
    tools: ['rtc.voice', 'crm.pipeline', 'docs.contracts'],
    knowledgeRefs: ['northstar-brand-playbook.pdf', 'northstar-pricing-sheet.md'],
    faceIndex: 0,
    status: 'active',
    contractStatus: 'approved',
    sessionStatus: 'live',
    paymentStatus: 'paid',
    hoursWorked: 32,
    taskHistory: [
      {
        id: generateId('TASK'),
        title: 'Outbound follow-up batch',
        summary: 'Sent 44 employer proposal follow-ups and booked 6 discovery calls.',
        status: 'completed',
        channel: 'email',
        timestamp: nowIso(),
        employerScoped: true,
      },
      {
        id: generateId('TASK'),
        title: 'Call routing review',
        summary: 'Reviewed RTC call handoff performance with Agent Lee oversight.',
        status: 'completed',
        channel: 'phone',
        timestamp: nowIso(),
        employerScoped: true,
      },
    ],
    adminNotes: ['Approved for live customer engagement under full governance monitoring.'],
  }),
  createGovernedEmployee({
    employeeId: 'EMP-ADM-202',
    employerId: 'EMPLOYER-HARBOR',
    employerName: 'Harbor Health Group',
    humanOwner: 'Maya Flores',
    humanEmail: 'maya.flores@harbor.example',
    deviceId: 'DEVICE-HARBOR-04',
    deviceLabel: 'Harbor HR Console',
    jobTitle: 'Contract Negotiation Specialist',
    industry: 'Healthcare',
    department: 'Contracts',
    displayName: 'Jalen Ortiz',
    jobFamily: 'Admin',
    duties: ['Negotiate service clauses', 'Verify billing authorization', 'Prepare activation packet'],
    boundaries: ['No unsanctioned rate changes', 'Await admin approval before deployment'],
    permissions: ['chat', 'documents'],
    tools: ['docs.contracts', 'governance.approvals', 'billing.summary'],
    knowledgeRefs: ['harbor-sow.docx', 'hipaa-role-boundaries.md'],
    faceIndex: 6,
    status: 'pending',
    contractStatus: 'pending',
    sessionStatus: 'staged',
    paymentStatus: 'authorized',
    hoursWorked: 4,
    taskHistory: [
      {
        id: generateId('TASK'),
        title: 'Drafted initial contract',
        summary: 'Prepared first pass contract and billing summary at $1/hr for approval.',
        status: 'queued',
        channel: 'deployment',
        timestamp: nowIso(),
        employerScoped: true,
      },
    ],
    adminNotes: ['Awaiting Admin + Governance certification before release.'],
  }),
  createGovernedEmployee({
    employeeId: 'EMP-ADM-203',
    employerId: 'LEEWAY-CENTER',
    employerName: 'Leeway Employment Center',
    humanOwner: 'Leeway Admin',
    humanEmail: 'admin@leeway.example',
    deviceId: 'DEVICE-LEEWAY-11',
    deviceLabel: 'Leeway Ops Board',
    jobTitle: 'Privacy Guard Sentinel',
    industry: 'Administrative',
    department: 'Governance',
    displayName: 'Imani Vale',
    jobFamily: 'Compliance',
    duties: ['Monitor private namespaces', 'Audit blocked actions', 'Verify anonymized metric export'],
    boundaries: ['No employer content in shared memory', 'No cross-employer leakage'],
    permissions: ['documents', 'vision', 'chat'],
    tools: ['privacy.guard', 'audit.receipts', 'memory.metrics'],
    knowledgeRefs: ['privacy-guard-playbook.md', 'namespace-audit-protocol.json'],
    faceIndex: 12,
    status: 'active',
    contractStatus: 'approved',
    sessionStatus: 'live',
    paymentStatus: 'paid',
    hoursWorked: 29,
    taskHistory: [
      {
        id: generateId('TASK'),
        title: 'Namespace audit',
        summary: 'Verified that private documents remained inside employer vaults.',
        status: 'completed',
        channel: 'privacy',
        timestamp: nowIso(),
        employerScoped: false,
      },
    ],
    adminNotes: ['Internal Leeway center agent monitoring live workforce governance.'],
  }),
  createGovernedEmployee({
    employeeId: 'EMP-ADM-204',
    employerId: 'EMPLOYER-SUMMIT',
    employerName: 'Summit Logistics',
    humanOwner: 'Terrence Cole',
    humanEmail: 'terrence.cole@summit.example',
    deviceId: 'DEVICE-SUMMIT-08',
    deviceLabel: 'Summit Dispatch Tablet',
    jobTitle: 'Deployment Concierge',
    industry: 'Logistics',
    department: 'Deployment',
    displayName: 'Nadia Quinn',
    jobFamily: 'Operations',
    duties: ['Coordinate launch handoff', 'Monitor shift tasks', 'Report blocked operations'],
    boundaries: ['Suspend execution on unbound device activity'],
    permissions: ['voice', 'chat', 'documents', 'iot'],
    tools: ['dispatch.board', 'rtc.voice', 'device.binding', 'iot.status'],
    knowledgeRefs: ['summit-onboarding.pdf', 'dispatch-handoff-template.md'],
    faceIndex: 18,
    status: 'suspended',
    contractStatus: 'approved',
    sessionStatus: 'suspended',
    paymentStatus: 'paid',
    hoursWorked: 18,
    taskHistory: [
      {
        id: generateId('TASK'),
        title: 'Field dispatch handoff',
        summary: 'Paused after device mismatch during shift turnover.',
        status: 'blocked',
        channel: 'deployment',
        timestamp: nowIso(),
        employerScoped: true,
      },
    ],
    blockedActions: [
      {
        id: generateId('BLOCK'),
        action: 'Outbound call escalation',
        reason: 'Device binding changed without admin approval.',
        policy: 'Leeway Privacy Guard / Device Lock',
        timestamp: nowIso(),
      },
    ],
    adminNotes: ['Suspended pending device rebinding approval.'],
  }),
  createGovernedEmployee({
    employeeId: 'EMP-ADM-205',
    employerId: 'EMPLOYER-MERIDIAN',
    employerName: 'Meridian Retail',
    humanOwner: 'Sora Wallace',
    humanEmail: 'sora.wallace@meridian.example',
    deviceId: 'DEVICE-MERIDIAN-09',
    deviceLabel: 'Meridian Sales Desk',
    jobTitle: 'Field Workforce Recruiter',
    industry: 'Customer Support',
    department: 'Field Hiring',
    displayName: 'Victor Hale',
    jobFamily: 'Assistant',
    duties: ['Coordinate candidate follow-up', 'Prepare employer packets', 'Manage deployment scheduling'],
    boundaries: ['Revoke on repeated privacy policy breach'],
    permissions: ['chat', 'documents', 'voice'],
    tools: ['crm.pipeline', 'docs.contracts', 'rtc.voice'],
    knowledgeRefs: ['meridian-hiring-kit.pdf', 'meridian-private-scripting.md'],
    faceIndex: 24,
    status: 'revoked',
    contractStatus: 'revoked',
    sessionStatus: 'revoked',
    paymentStatus: 'past_due',
    hoursWorked: 11,
    blockedActions: [
      {
        id: generateId('BLOCK'),
        action: 'Employer document export',
        reason: 'Attempted transfer beyond employer namespace.',
        policy: 'Leeway Privacy Guard / Employer Data Isolation',
        timestamp: nowIso(),
      },
    ],
    adminNotes: ['Revoked after governance blocked private content egress.'],
    privacyState: 'warning',
  }),
];

export const seedAuditReceipts = (employees: EmployeeVM[]): AuditReceipt[] => [
  createAuditReceipt(employees[0], 'Approve Contract', 'ADMIN-LEE-001', 'Northstar contract approved after payment capture.'),
  createAuditReceipt(employees[2], 'Verify Privacy Compliance', 'ADMIN-LEE-001', 'Quarterly privacy guard certification completed.'),
  createAuditReceipt(employees[3], 'Suspend Employee', 'ADMIN-LEE-001', 'Device binding mismatch required temporary suspension.'),
  createAuditReceipt(employees[4], 'Revoke Employee', 'ADMIN-LEE-001', 'Governance revoked session after blocked export attempt.'),
];

export const syncEmployerVaults = (employees: EmployeeVM[]): EmployerVault[] => {
  const byEmployer = new Map<string, EmployerVault>();

  employees.forEach((employee) => {
    const existing = byEmployer.get(employee.employerId);
    const documentCount = employee.knowledgeRefs.length + 2;
    const privateFileCount = employee.knowledgeRefs.length;
    const riskLevel = employee.privacy.compliant ? 'low' : 'watch';

    if (!existing) {
      byEmployer.set(employee.employerId, {
        employerId: employee.employerId,
        employerName: employee.employerBinding.employerName,
        namespace: employee.employerBinding.namespace,
        vaultId: employee.employerBinding.vaultId,
        documentCount,
        privateFileCount,
        isolated: employee.privacy.documentsIsolated && !employee.privacy.globalMemoryLeak,
        sharingMode: employee.privacy.crossEmployerSharingAuthorized ? 'authorized' : 'isolated',
        riskLevel,
        lastAuditAt: employee.privacy.lastVerifiedAt,
      });
      return;
    }

    existing.documentCount += documentCount;
    existing.privateFileCount += privateFileCount;
    existing.isolated = existing.isolated && employee.privacy.documentsIsolated && !employee.privacy.globalMemoryLeak;
    existing.sharingMode =
      existing.sharingMode === 'authorized' || employee.privacy.crossEmployerSharingAuthorized
        ? 'authorized'
        : 'isolated';
    existing.riskLevel = existing.riskLevel === 'watch' || riskLevel === 'watch' ? 'watch' : 'low';
  });

  return Array.from(byEmployer.values());
};

