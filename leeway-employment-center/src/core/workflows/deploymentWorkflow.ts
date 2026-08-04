/**
 * LEEWAY DEPLOYMENT WORKFLOW HANDLER
 * Real deployment operations integrated with local store and governance
 * 
 * Handles:
 * - Employee/Temp Worker/Candidate/Investor creation
 * - Contract creation and lifecycle
 * - Agent assignment and deployment
 * - Activation link generation
 * - QR code generation
 * - Deployment management (suspend, revoke, restore, stop)
 * - Audit receipt creation
 */

import * as store from '../store/leewayLocalStore';
import { createAdminCommandAudit } from './adminCommandEngine';
import type { 
  Employee, TempWorker, Candidate, Investor, Contract, 
  Deployment, ActivationLink, QRCode, AuditReceipt 
} from '../types/store.types';

// ============================================================================
// DEPLOYMENT WORKFLOW RESULT
// ============================================================================

export interface DeploymentResult {
  success: boolean;
  message: string;
  entityId?: string;
  deploymentId?: string;
  activationToken?: string;
  qrCodeId?: string;
  auditId?: string;
  url?: string;
  data?: unknown;
}

// ============================================================================
// EMPLOYEE WORKFLOW
// ============================================================================

export async function createEmployeeForDeployment(data: {
  name: string;
  email: string;
  phone: string;
  position: string;
  department: string;
}): Promise<DeploymentResult> {
  try {
    const employee: Omit<Employee, 'employeeId'> = {
      name: data.name,
      email: data.email,
      phone: data.phone,
      position: data.position,
      department: data.department,
      status: 'ACTIVE',
      deploymentStatus: 'UNDEPLOYED',
      hireDate: new Date().toISOString(),
      createdAt: new Date().toISOString()
    };

    const employeeId = await store.createEmployee(employee);

    // Log action
    await store.createAuditReceipt({
      timestamp: new Date().toISOString(),
      adminId: 'admin-system',
      action: 'CREATE_EMPLOYEE',
      entityType: 'EMPLOYEE',
      entityId: employeeId,
      result: 'SUCCESS',
      message: `Employee created: ${data.name} (${employeeId})`
    });

    return {
      success: true,
      message: `Employee created successfully: ${data.name}`,
      entityId: employeeId
    };
  } catch (error) {
    const message = `Failed to create employee: ${String(error)}`;
    console.error(message);
    await store.createAlert({
      severity: 'WARNING',
      title: 'Employee Creation Failed',
      message,
      acknowledged: false
    });
    return { success: false, message };
  }
}

// ============================================================================
// TEMP WORKER WORKFLOW
// ============================================================================

export async function createTempWorkerForDeployment(data: {
  name: string;
  email: string;
  phone: string;
  agency?: string;
  skills: string[];
  availability: 'FULL_TIME' | 'PART_TIME' | 'FLEXIBLE';
  startDate: string;
  endDate?: string;
}): Promise<DeploymentResult> {
  try {
    const worker: Omit<TempWorker, 'tempWorkerId'> = {
      name: data.name,
      email: data.email,
      phone: data.phone,
      agency: data.agency,
      skills: data.skills,
      status: 'AVAILABLE',
      availability: data.availability,
      startDate: data.startDate,
      endDate: data.endDate,
      createdAt: new Date().toISOString()
    };

    const workerId = await store.createTempWorker(worker);

    await store.createAuditReceipt({
      timestamp: new Date().toISOString(),
      adminId: 'admin-system',
      action: 'CREATE_TEMP_WORKER',
      entityType: 'TEMP_WORKER',
      entityId: workerId,
      result: 'SUCCESS',
      message: `Temp worker created: ${data.name} (${workerId})`
    });

    return {
      success: true,
      message: `Temp worker created successfully: ${data.name}`,
      entityId: workerId
    };
  } catch (error) {
    const message = `Failed to create temp worker: ${String(error)}`;
    console.error(message);
    return { success: false, message };
  }
}

// ============================================================================
// CANDIDATE WORKFLOW
// ============================================================================

export async function createCandidateForDeployment(data: {
  name: string;
  email: string;
  phone: string;
  targetRole: string;
  skills: string[];
  experience: string;
}): Promise<DeploymentResult> {
  try {
    const candidate: Omit<Candidate, 'candidateId'> = {
      name: data.name,
      email: data.email,
      phone: data.phone,
      targetRole: data.targetRole,
      skills: data.skills,
      experience: data.experience,
      status: 'NEW',
      appliedAt: new Date().toISOString(),
      createdAt: new Date().toISOString()
    };

    const candidateId = await store.createCandidate(candidate);

    await store.createAuditReceipt({
      timestamp: new Date().toISOString(),
      adminId: 'admin-system',
      action: 'CREATE_CANDIDATE',
      entityType: 'CANDIDATE',
      entityId: candidateId,
      result: 'SUCCESS',
      message: `Candidate created: ${data.name} (${candidateId})`
    });

    return {
      success: true,
      message: `Candidate created successfully: ${data.name}`,
      entityId: candidateId
    };
  } catch (error) {
    const message = `Failed to create candidate: ${String(error)}`;
    console.error(message);
    return { success: false, message };
  }
}

// ============================================================================
// INVESTOR WORKFLOW
// ============================================================================

export async function createInvestorForDeployment(data: {
  name: string;
  email: string;
  phone: string;
  company: string;
  tierLevel: 'GOLD' | 'SILVER' | 'BRONZE' | 'STANDARD';
  investmentAmount?: number;
}): Promise<DeploymentResult> {
  try {
    const investor: Omit<Investor, 'investorId'> = {
      name: data.name,
      email: data.email,
      phone: data.phone,
      company: data.company,
      tierLevel: data.tierLevel,
      status: 'ACTIVE',
      investmentAmount: data.investmentAmount,
      createdAt: new Date().toISOString()
    };

    const investorId = await store.createInvestor(investor);

    await store.createAuditReceipt({
      timestamp: new Date().toISOString(),
      adminId: 'admin-system',
      action: 'CREATE_INVESTOR',
      entityType: 'INVESTOR',
      entityId: investorId,
      result: 'SUCCESS',
      message: `Investor created: ${data.name} (${investorId})`
    });

    return {
      success: true,
      message: `Investor created successfully: ${data.name}`,
      entityId: investorId
    };
  } catch (error) {
    const message = `Failed to create investor: ${String(error)}`;
    console.error(message);
    return { success: false, message };
  }
}

// ============================================================================
// CONTRACT WORKFLOW
// ============================================================================

export async function createContractForEntity(data: {
  linkedEntityId: string;
  entityType: 'EMPLOYEE' | 'TEMP_WORKER' | 'CANDIDATE' | 'INVESTOR' | 'AGENT';
  startDate: string;
  endDate: string;
  duration: string;
  permissions: string[];
  payRate?: number;
  contractDetails: string;
}): Promise<DeploymentResult> {
  try {
    const contract: Omit<Contract, 'contractId' | 'createdAt'> = {
      linkedEntityId: data.linkedEntityId,
      entityType: data.entityType,
      status: 'ACTIVE',
      startDate: data.startDate,
      endDate: data.endDate,
      duration: data.duration,
      permissions: data.permissions,
      payRate: data.payRate,
      contractDetails: data.contractDetails
    };

    const contractId = await store.createContract(contract);

    await store.createAuditReceipt({
      timestamp: new Date().toISOString(),
      adminId: 'admin-system',
      action: 'CREATE_CONTRACT',
      entityType: 'CONTRACT',
      entityId: contractId,
      result: 'SUCCESS',
      message: `Contract created for ${data.entityType}: ${data.linkedEntityId}`
    });

    return {
      success: true,
      message: `Contract created successfully (ID: ${contractId})`,
      entityId: contractId
    };
  } catch (error) {
    const message = `Failed to create contract: ${String(error)}`;
    console.error(message);
    return { success: false, message };
  }
}

// ============================================================================
// ACTIVATION LINK & QR CODE GENERATION
// ============================================================================

export async function generateActivationLinkForDeployment(data: {
  deploymentId: string;
  entityType: 'EMPLOYEE' | 'INVESTOR' | 'CANDIDATE' | 'TEMP_WORKER';
  entityId: string;
  agentId: string;
}): Promise<DeploymentResult> {
  try {
    const token = generateToken();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days

    const link: Omit<ActivationLink, 'createdAt'> = {
      token,
      deploymentId: data.deploymentId,
      entityType: data.entityType,
      entityId: data.entityId,
      agentId: data.agentId,
      status: 'ACTIVE',
      expiresAt
    };

    await store.createActivationLink(link);

    await store.createAuditReceipt({
      timestamp: new Date().toISOString(),
      adminId: 'admin-system',
      action: 'GENERATE_ACTIVATION_LINK',
      entityType: 'ACTIVATION_LINK',
      entityId: token,
      result: 'SUCCESS',
      message: `Activation link generated for ${data.entityType} ${data.entityId}`
    });

    // Generate QR code record
    const qrUrl = `http://localhost:3000/activate?token=${token}`;
    const qrId = await store.generateQRCodeRecord({
      linkedTokenId: token,
      qrData: qrUrl,
      qrFormat: 'DATA_URL',
      purpose: `Deployment activation for ${data.entityType}`
    });

    return {
      success: true,
      message: `Activation link generated successfully`,
      activationToken: token,
      qrCodeId: qrId,
      url: qrUrl
    };
  } catch (error) {
    const message = `Failed to generate activation link: ${String(error)}`;
    console.error(message);
    return { success: false, message };
  }
}

// ============================================================================
// DEPLOYMENT CREATION & MANAGEMENT
// ============================================================================

export async function createDeploymentForAgent(data: {
  agentId: string;
  recipientId: string;
  recipientType: 'EMPLOYEE' | 'INVESTOR' | 'CANDIDATE' | 'TEMP_WORKER';
  expectedDurationDays: number;
  purpose: string;
}): Promise<DeploymentResult> {
  try {
    // Generate activation link first
    const token = generateToken();
    const expiresAt = new Date(Date.now() + data.expectedDurationDays * 24 * 60 * 60 * 1000).toISOString();

    // Create deployment record
    const deployment: Omit<Deployment, 'deploymentId'> = {
      agentId: data.agentId,
      recipientId: data.recipientId,
      recipientType: data.recipientType,
      status: 'ACTIVE',
      activationLinkToken: token,
      deploymentDate: new Date().toISOString(),
      expectedDurationDays: data.expectedDurationDays,
      purpose: data.purpose
    };

    const deploymentId = await store.createDeployment(deployment);

    // Create activation link
    const link: Omit<ActivationLink, 'createdAt'> = {
      token,
      deploymentId,
      entityType: data.recipientType,
      entityId: data.recipientId,
      agentId: data.agentId,
      status: 'ACTIVE',
      expiresAt
    };

    await store.createActivationLink(link);

    await store.createAuditReceipt({
      timestamp: new Date().toISOString(),
      adminId: 'admin-system',
      action: 'CREATE_DEPLOYMENT',
      entityType: 'DEPLOYMENT',
      entityId: deploymentId,
      result: 'SUCCESS',
      message: `Agent ${data.agentId} deployed to ${data.recipientType} ${data.recipientId}`
    });

    const activationUrl = `http://localhost:3000/activate?token=${token}`;

    return {
      success: true,
      message: `Deployment created successfully (ID: ${deploymentId})`,
      deploymentId,
      activationToken: token,
      url: activationUrl
    };
  } catch (error) {
    const message = `Failed to create deployment: ${String(error)}`;
    console.error(message);
    return { success: false, message };
  }
}

export async function suspendDeployment(deploymentId: string): Promise<DeploymentResult> {
  try {
    await store.suspendDeployment(deploymentId);

    await store.createAuditReceipt({
      timestamp: new Date().toISOString(),
      adminId: 'admin-system',
      action: 'SUSPEND_DEPLOYMENT',
      entityType: 'DEPLOYMENT',
      entityId: deploymentId,
      result: 'SUCCESS',
      message: `Deployment suspended: ${deploymentId}`
    });

    return {
      success: true,
      message: `Deployment suspended successfully`
    };
  } catch (error) {
    const message = `Failed to suspend deployment: ${String(error)}`;
    console.error(message);
    return { success: false, message };
  }
}

export async function revokeDeployment(deploymentId: string): Promise<DeploymentResult> {
  try {
    await store.revokeDeployment(deploymentId);

    await store.createAuditReceipt({
      timestamp: new Date().toISOString(),
      adminId: 'admin-system',
      action: 'REVOKE_DEPLOYMENT',
      entityType: 'DEPLOYMENT',
      entityId: deploymentId,
      result: 'SUCCESS',
      message: `Deployment revoked: ${deploymentId}`
    });

    return {
      success: true,
      message: `Deployment revoked successfully`
    };
  } catch (error) {
    const message = `Failed to revoke deployment: ${String(error)}`;
    console.error(message);
    return { success: false, message };
  }
}

export async function restoreDeployment(deploymentId: string): Promise<DeploymentResult> {
  try {
    await store.restoreDeployment(deploymentId);

    await store.createAuditReceipt({
      timestamp: new Date().toISOString(),
      adminId: 'admin-system',
      action: 'RESTORE_DEPLOYMENT',
      entityType: 'DEPLOYMENT',
      entityId: deploymentId,
      result: 'SUCCESS',
      message: `Deployment restored: ${deploymentId}`
    });

    return {
      success: true,
      message: `Deployment restored successfully`
    };
  } catch (error) {
    const message = `Failed to restore deployment: ${String(error)}`;
    console.error(message);
    return { success: false, message };
  }
}

export async function stopDeployment(deploymentId: string): Promise<DeploymentResult> {
  try {
    await store.stopDeployment(deploymentId);

    await store.createAuditReceipt({
      timestamp: new Date().toISOString(),
      adminId: 'admin-system',
      action: 'STOP_DEPLOYMENT',
      entityType: 'DEPLOYMENT',
      entityId: deploymentId,
      result: 'SUCCESS',
      message: `Deployment stopped: ${deploymentId}`
    });

    return {
      success: true,
      message: `Deployment stopped successfully`
    };
  } catch (error) {
    const message = `Failed to stop deployment: ${String(error)}`;
    console.error(message);
    return { success: false, message };
  }
}

// ============================================================================
// ACTIVATION LINK ROTATION
// ============================================================================

export async function rotateActivationLink(oldToken: string): Promise<DeploymentResult> {
  try {
    const newToken = await store.rotateActivationLink(oldToken);

    await store.createAuditReceipt({
      timestamp: new Date().toISOString(),
      adminId: 'admin-system',
      action: 'ROTATE_ACTIVATION_LINK',
      entityType: 'ACTIVATION_LINK',
      entityId: oldToken,
      result: 'SUCCESS',
      message: `Activation link rotated: ${oldToken} → ${newToken}`
    });

    const activationUrl = `http://localhost:3000/activate?token=${newToken}`;

    return {
      success: true,
      message: `Activation link rotated successfully`,
      activationToken: newToken,
      url: activationUrl
    };
  } catch (error) {
    const message = `Failed to rotate activation link: ${String(error)}`;
    console.error(message);
    return { success: false, message };
  }
}

// ============================================================================
// LIST OPERATIONS
// ============================================================================

export async function getDeployments(): Promise<Deployment[]> {
  try {
    return await store.listDeployments();
  } catch (error) {
    console.error('Failed to list deployments:', error);
    return [];
  }
}

export async function getEmployees(): Promise<Employee[]> {
  try {
    return await store.listEmployees();
  } catch (error) {
    console.error('Failed to list employees:', error);
    return [];
  }
}

export async function getTempWorkers(): Promise<TempWorker[]> {
  try {
    return await store.listTempWorkers();
  } catch (error) {
    console.error('Failed to list temp workers:', error);
    return [];
  }
}

export async function getCandidates(): Promise<Candidate[]> {
  try {
    return await store.listCandidates();
  } catch (error) {
    console.error('Failed to list candidates:', error);
    return [];
  }
}

export async function getInvestors(): Promise<Investor[]> {
  try {
    return await store.listInvestors();
  } catch (error) {
    console.error('Failed to list investors:', error);
    return [];
  }
}

export async function getContracts(): Promise<Contract[]> {
  try {
    return await store.listContracts();
  } catch (error) {
    console.error('Failed to list contracts:', error);
    return [];
  }
}

export async function getAgents(): Promise<store.Agent[]> {
  try {
    return await store.listAgents();
  } catch (error) {
    console.error('Failed to list agents:', error);
    return [];
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function generateToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 32; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

export { store };
