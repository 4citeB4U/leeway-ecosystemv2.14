/**
 * LeeWay LOCAL STORE TYPE DEFINITIONS
 * All type contracts for IndexedDB persistence layer
 */

// ============================================================================
// RUNTIME STATE
// ============================================================================

export interface RuntimeState {
  id: string;
  systemOnline: boolean;
  lastBootTime: string;
  runtimeMode: 'LOCAL_SELF_HOST' | 'CLOUD_MANAGED' | 'HYBRID';
  agentLeeStatus: 'ONLINE' | 'OFFLINE' | 'DEGRADED';
  voiceCapability: 'READY' | 'NOT_AVAILABLE' | 'FALLBACK';
  visionCapability: 'READY' | 'NOT_AVAILABLE' | 'FALLBACK';
  uptime: string;
  buildVersion: string;
}

// ============================================================================
// AGENTS
// ============================================================================

export interface JobProfile {
  title: string;
  responsibilities: string[];
}

export interface Agent {
  agentId: string;
  displayName: string;
  roleTitle: string;
  department: string;
  employmentType: 'Core Operational' | 'Contractor' | 'Vendor' | 'Partner';
  status: 'ONLINE' | 'OFFLINE' | 'STANDBY' | 'DEGRADED';
  languageProfile: string[];
  jobProfile: JobProfile;
  permissions: string[];
  forbiddenActions: string[];
  allowedTasks: string[];
  contractScope: string;
  currentTasks: string[];
  completedTasks: string[];
  failedTasks: string[];
  qualityScore: number;
  lastActiveAt: string;
  governedBy: string;
  createdAt: string;
}

// ============================================================================
// EMPLOYEES
// ============================================================================

export interface Employee {
  employeeId: string;
  name: string;
  email: string;
  phone: string;
  position: string;
  department: string;
  status: 'ACTIVE' | 'INACTIVE' | 'ON_LEAVE' | 'TERMINATED';
  deploymentStatus: 'UNDEPLOYED' | 'DEPLOYED' | 'SUSPENDED' | 'REVOKED';
  hireDate: string;
  createdAt: string;
}

// ============================================================================
// TEMP WORKERS
// ============================================================================

export interface TempWorker {
  tempWorkerId: string;
  name: string;
  email: string;
  phone: string;
  agency?: string;
  skills: string[];
  status: 'AVAILABLE' | 'ASSIGNED' | 'UNAVAILABLE';
  availability: 'FULL_TIME' | 'PART_TIME' | 'FLEXIBLE';
  startDate: string;
  endDate?: string;
  createdAt: string;
}

// ============================================================================
// CANDIDATES
// ============================================================================

export interface Candidate {
  candidateId: string;
  name: string;
  email: string;
  phone: string;
  targetRole: string;
  skills: string[];
  experience: string;
  status: 'NEW' | 'REVIEWING' | 'APPROVED' | 'REJECTED' | 'HIRED';
  appliedAt: string;
  createdAt: string;
}

// ============================================================================
// INVESTORS
// ============================================================================

export interface Investor {
  investorId: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  tierLevel: 'GOLD' | 'SILVER' | 'BRONZE' | 'STANDARD';
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'REVOKED';
  investmentAmount?: number;
  createdAt: string;
}

// ============================================================================
// POSITIONS
// ============================================================================

export interface Position {
  positionId: string;
  title: string;
  department: string;
  description: string;
  requirements: string[];
  salary?: number;
  status: 'OPEN' | 'CLOSED' | 'FILLED' | 'DRAFT';
  createdAt: string;
}

// ============================================================================
// CONTRACTS
// ============================================================================

export interface Contract {
  contractId: string;
  linkedEntityId: string;
  entityType: 'EMPLOYEE' | 'TEMP_WORKER' | 'CANDIDATE' | 'INVESTOR' | 'AGENT';
  status: 'DRAFT' | 'ACTIVE' | 'SUSPENDED' | 'REVOKED' | 'EXPIRED';
  startDate: string;
  endDate: string;
  duration: string;
  permissions: string[];
  payRate?: number;
  contractDetails: string;
  createdAt: string;
  suspendedAt?: string;
  revokedAt?: string;
}

// ============================================================================
// DEPLOYMENTS
// ============================================================================

export interface Deployment {
  deploymentId: string;
  agentId: string;
  recipientId: string;
  recipientType: 'EMPLOYEE' | 'INVESTOR' | 'CANDIDATE' | 'TEMP_WORKER';
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'STOPPED' | 'REVOKED';
  activationLinkToken: string;
  deploymentDate: string;
  expectedDurationDays: number;
  purpose: string;
  stoppedAt?: string;
  suspendedAt?: string;
  revokedAt?: string;
}

// ============================================================================
// ACTIVATION LINKS
// ============================================================================

export interface ActivationLink {
  token: string;
  deploymentId: string;
  entityType: 'EMPLOYEE' | 'INVESTOR' | 'CANDIDATE' | 'TEMP_WORKER';
  entityId: string;
  agentId: string;
  status: 'ACTIVE' | 'REVOKED' | 'EXPIRED' | 'ROTATED';
  expiresAt: string;
  usedAt?: string;
  createdAt: string;
}

// ============================================================================
// QR CODES
// ============================================================================

export interface QRCode {
  qrId: string;
  linkedTokenId: string;
  qrData: string;
  qrFormat: 'DATA_URL' | 'SVG' | 'PNG';
  purpose: string;
  createdAt: string;
}

// ============================================================================
// AUDIT RECEIPTS
// ============================================================================

export interface AuditReceipt {
  auditId: string;
  timestamp: string;
  adminId: string;
  action: string;
  entityType: string;
  entityId: string;
  result: 'SUCCESS' | 'FAILURE' | 'BLOCKED';
  message: string;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// COMMAND RECEIPTS
// ============================================================================

export interface CommandReceipt {
  commandId: string;
  timestamp: string;
  adminId: string;
  commandText: string;
  intent: string;
  parameters: Record<string, unknown>;
  success: boolean;
  result: string;
  confidence: number;
  voiceInput: boolean;
  auditId?: string;
}

// ============================================================================
// VOICE SESSIONS
// ============================================================================

export interface VoiceSession {
  sessionId: string;
  timestamp: string;
  adminId: string;
  inputText: string;
  recognitionConfidence: number;
  outputText: string;
  synthesisStatus: 'SUCCESS' | 'FAILED' | 'FALLBACK';
  durationMs: number;
}

// ============================================================================
// VISION SESSIONS
// ============================================================================

export interface VisionSession {
  sessionId: string;
  timestamp: string;
  adminId: string;
  cameraInitialized: boolean;
  framesProcessed: number;
  facesDetected: number;
  gesturesDetected: string[];
  status: 'ACTIVE' | 'SUSPENDED' | 'COMPLETED' | 'ERROR';
}

// ============================================================================
// ALERTS
// ============================================================================

export interface Alert {
  alertId: string;
  timestamp: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  title: string;
  message: string;
  acknowledged: boolean;
  acknowledgedAt?: string;
}
