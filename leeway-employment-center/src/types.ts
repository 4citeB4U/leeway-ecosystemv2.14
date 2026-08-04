/*
FILE: src\types.ts
PURPOSE: LeeWay governed asset for leeway-employment-center.
TAG: UTIL.FILE.T_YP_ES.MAIN
REGION: 🟠 UTIL
GOVERNED_BY: LeeWay Standards
OWNED_BY: Agent Lee / LeeWay Runtime
DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render
IMPORTS: Inferred by verification scanner
EXPORTS: Inferred by verification scanner
STATUS: ACTIVE
*/
export interface Contract {
  startDate: string;
  endDate: string;
  duties: string[];
  boundaries: string[];
  kpis: string[];
  hourlyRateUsd: number;
  weeklyHourCap: number;
  paymentStatus: PaymentStatus;
  paymentAuthorized: boolean;
  paymentCaptured: boolean;
  billableHours: number;
  totalAccruedUsd: number;
  pricingLabel: string;
  approvedAt?: string;
  approvedBy?: string;
  deniedAt?: string;
  deniedBy?: string;
  denialReason?: string;
}

export type EmployeeStatus =
  | 'active'
  | 'revoked'
  | 'building'
  | 'pending'
  | 'suspended'
  | 'denied';

export type ContractStatus = 'pending' | 'approved' | 'denied' | 'revoked';
export type SessionStatus = 'staged' | 'live' | 'suspended' | 'killed' | 'revoked';
export type PaymentStatus = 'pending' | 'authorized' | 'paid' | 'past_due';
export type QRStatus = 'active' | 'rotated' | 'revoked';
export type PrivacyState = 'compliant' | 'warning' | 'blocked';

export interface EmployeeIdentity {
  jobFamily: JobFamily;
  borderColor: string;
  badgeColor: string;
  statusColor: string;
  avatarId: string;
  authorityLevel: 'standard' | 'elevated' | 'restricted';
  readinessScore?: number;
  isCertified?: boolean;
  gridPos?: {
    fileIndex: number;
    row: number;
    col: number;
    totalRows: number;
    totalCols: number;
  };
}

export interface ToolPermission {
  id: string;
  tool: string;
  allowed: boolean;
  scope: string;
  governedBy: string;
  reason: string;
}

export interface TaskHistoryItem {
  id: string;
  title: string;
  summary: string;
  status: 'queued' | 'running' | 'completed' | 'blocked';
  channel: 'email' | 'phone' | 'crm' | 'deployment' | 'privacy' | 'governance';
  timestamp: string;
  employerScoped: boolean;
}

export interface BlockedAction {
  id: string;
  action: string;
  reason: string;
  policy: string;
  timestamp: string;
}

export interface EmployerBinding {
  employerName: string;
  humanOwner: string;
  humanEmail: string;
  deviceId: string;
  deviceLabel: string;
  namespace: string;
  vaultId: string;
  rtcChannel: string;
  deviceLocked: boolean;
}

export interface DeploymentBinding {
  activationLink: string;
  qrIssued: boolean;
  qrStatus: QRStatus;
  lastRotatedAt?: string;
  lastSessionHeartbeat: string;
}

export interface PrivacyGuardStatus {
  compliant: boolean;
  state: PrivacyState;
  employerOwnedData: boolean;
  documentsIsolated: boolean;
  globalMemoryLeak: boolean;
  crossEmployerSharingAuthorized: boolean;
  privateFilesNamespaced: boolean;
  anonymizedMetricsOnly: boolean;
  displayedToEmployer: boolean;
  lastVerifiedAt: string;
  notes: string[];
}

export interface AgentVMManifest {
  buildId: string;
  runtime: string;
  constructProjectionPath: string;
  orchestratorRoute: string;
  governanceLayer: string;
  managedSystems: string[];
  certificationStatus: 'pending' | 'certified' | 'revoked';
  privacyMode: 'employer-isolated';
  deviceSurface: string;
  rtcSurface: string;
  gpuSurface: string;
  iotSurface: string;
  lastIntegrityCheck: string;
}

export interface BillingState {
  hourlyRateUsd: number;
  hoursWorked: number;
  weeklyHourCap: number;
  paymentStatus: PaymentStatus;
  employerPaid: boolean;
  totalAccruedUsd: number;
  nextInvoiceAt: string;
}

export interface AuditReceipt {
  id: string;
  action: string;
  adminId: string;
  reason: string;
  timestamp: string;
  affectedEmployeeId: string;
  affectedEmployerId: string;
  orchestratorRoute: string;
  governanceStatus: 'passed' | 'denied';
  subsystem: string;
  privacyResult: PrivacyState;
  receiptHash: string;
}

export interface EmployerVault {
  employerId: string;
  employerName: string;
  namespace: string;
  vaultId: string;
  documentCount: number;
  privateFileCount: number;
  isolated: boolean;
  sharingMode: 'isolated' | 'authorized';
  riskLevel: 'low' | 'watch';
  lastAuditAt: string;
}

export interface ManagedSubsystem {
  id: string;
  label: string;
  path: string;
  status: 'linked' | 'ready' | 'watch';
  description: string;
  orchestratorSurface: string;
}

export type JobFamily = 
  | 'Sales' 
  | 'Operations' 
  | 'Inventory' 
  | 'Compliance' 
  | 'AI' 
  | 'Admin' 
  | 'Security' 
  | 'Assistant';

export interface EmployeeVM {
  vmId: string;
  employerId: string;
  employeeId: string;
  jobTitle: string;
  industry: string;
  department: string;
  displayName: string;
  avatarUrl: string;
  contract: Contract;
  identity: EmployeeIdentity;
  permissions: string[];
  tools: string[];
  knowledgeRefs: string[];
  status: EmployeeStatus;
  contractStatus: ContractStatus;
  sessionStatus: SessionStatus;
  token: string;
  billing: BillingState;
  manifest: AgentVMManifest;
  employerBinding: EmployerBinding;
  deployment: DeploymentBinding;
  privacy: PrivacyGuardStatus;
  toolPermissions: ToolPermission[];
  taskHistory: TaskHistoryItem[];
  blockedActions: BlockedAction[];
  adminNotes: string[];
  certification?: {
    certId: string;
    timestamp: string;
    checks: {
      grounding: boolean;
      tools: boolean;
      contract: boolean;
      simulation: boolean;
    };
  };
}

export interface SkillItem {
  id: string;
  name: string;
  selected: boolean;
}

export interface SkillBlock {
  id: string;
  category: string;
  items: SkillItem[];
}

export interface IdentityProfile {
  id: string;
  name: string;
  jobTitle: string;
  avatarUrl: string;
  jobFamily: JobFamily;
  employeeId: string;
  gridPos?: {
    fileIndex: number;
    row: number;
    col: number;
    totalRows: number;
    totalCols: number;
  };
}

export interface IntakeForm {
  jobTitle: string;
  industry: string;
  jobFamily: JobFamily;
  environment: string;
  responsibilities: string[];
  skillBlocks: SkillBlock[];
  selectedIdentity?: IdentityProfile;
  capabilities: {
    voice: boolean;
    chat: boolean;
    vision: boolean;
    iot: boolean;
    documents: boolean;
  };
  boundaries: {
    neverDo: string[];
    escalateOn: string[];
  };
}

// ========================================
// INVESTOR PORTAL TYPES
// ========================================

export type InvestorStatus = 'active' | 'pending' | 'suspended' | 'revoked';
export type InvestorAgentStatus = 'deployed' | 'pending' | 'suspended' | 'revoked';
export type InviteTokenStatus = 'active' | 'used' | 'rotated' | 'revoked';

export interface InvestorPermission {
  id: string;
  permission: string;
  allowed: boolean;
  description: string;
}

export interface InvestorRecord {
  investorId: string;
  name: string;
  email: string;
  company: string;
  role: string;
  interestLevel: 'high' | 'medium' | 'low';
  status: InvestorStatus;
  createdAt: string;
  createdBy: string;
  notes: string;
}

export interface InvestorAgentAssignment {
  assignmentId: string;
  investorId: string;
  agentName: string;
  agentType: 'Investor Relations Agent' | 'Demo Agent';
  status: InvestorAgentStatus;
  deployedAt: string;
  deployedBy: string;
  permissions: InvestorPermission[];
  deviceLimit: number;
  sessionLimit: number;
  expirationHours: number;
}

export interface InvestorInviteToken {
  tokenId: string;
  investorId: string;
  assignmentId: string;
  token: string;
  status: InviteTokenStatus;
  activationLink: string;
  qrCode?: string;
  createdAt: string;
  createdBy: string;
  rotatedAt?: string;
  usedAt?: string;
  usedByEmail?: string;
  expiresAt: string;
}

export interface InvestorDeploymentAuditReceipt {
  receiptId: string;
  investorId: string;
  assignmentId: string;
  action: string;
  adminId: string;
  timestamp: string;
  governanceStatus: 'passed' | 'denied';
  reason: string;
  details: Record<string, any>;
}

export interface InvestorConversationSummary {
  summaryId: string;
  investorId: string;
  assignmentId: string;
  sessionId: string;
  messageCount: number;
  topicsDiscussed: string[];
  questionsAsked: string[];
  interestedProducts: string[];
  meetingRequested: boolean;
  feedbackSubmitted: string;
  conversationStart: string;
  conversationEnd: string;
}

export interface InvestorPortalConfig {
  baseUrl: string;
  defaultDeviceLimit: number;
  defaultSessionLimit: number;
  defaultExpirationHours: number;
  allowQrCode: boolean;
  sendMode: 'copy-link' | 'email' | 'both';
  emailEnabled: boolean;
  governedBy: string;
}

