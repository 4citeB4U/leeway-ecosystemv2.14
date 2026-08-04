/**
 * LeeWay LOCAL DATA STORE
 * IndexedDB-backed persistence layer for 24/7 self-hosted operation
 * 
 * Stores:
 * 1. runtimeState - System runtime config and status
 * 2. agents - Operational agents and capabilities
 * 3. employees - Employee records
 * 4. tempWorkers - Temporary worker records
 * 5. candidates - Candidate records
 * 6. investors - Investor records
 * 7. positions - Job position listings
 * 8. contracts - Employment contracts
 * 9. deployments - Active/inactive deployments
 * 10. activationLinks - Token-based activation links
 * 11. qrCodes - Generated QR code metadata
 * 12. auditReceipts - Governance audit trail
 * 13. commandReceipts - Admin command execution log
 * 14. voiceSessions - Voice input/output sessions
 * 15. visionSessions - Camera/vision sessions
 * 16. alerts - System alerts and notifications
 */

import type { 
  RuntimeState, Agent, Employee, TempWorker, Candidate, Investor, 
  Position, Contract, Deployment, ActivationLink, QRCode, 
  AuditReceipt, CommandReceipt, VoiceSession, VisionSession, Alert 
} from '../types/store.types';

// ============================================================================
// STORE INITIALIZATION
// ============================================================================

const DB_NAME = 'LeeWayLocalStore';
const DB_VERSION = 1;

let db: IDBDatabase | null = null;

export async function initializeStore(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('Failed to open IndexedDB:', request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      db = request.result;
      console.log('[Store] IndexedDB opened successfully');
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result;

      // 1. Runtime State
      if (!database.objectStoreNames.contains('runtimeState')) {
        database.createObjectStore('runtimeState', { keyPath: 'id' });
      }

      // 2. Agents
      if (!database.objectStoreNames.contains('agents')) {
        const agentStore = database.createObjectStore('agents', { keyPath: 'agentId' });
        agentStore.createIndex('status', 'status', { unique: false });
        agentStore.createIndex('role', 'role', { unique: false });
      }

      // 3. Employees
      if (!database.objectStoreNames.contains('employees')) {
        const empStore = database.createObjectStore('employees', { keyPath: 'employeeId' });
        empStore.createIndex('status', 'status', { unique: false });
        empStore.createIndex('deploymentStatus', 'deploymentStatus', { unique: false });
      }

      // 4. Temp Workers
      if (!database.objectStoreNames.contains('tempWorkers')) {
        const tempStore = database.createObjectStore('tempWorkers', { keyPath: 'tempWorkerId' });
        tempStore.createIndex('status', 'status', { unique: false });
        tempStore.createIndex('availability', 'availability', { unique: false });
      }

      // 5. Candidates
      if (!database.objectStoreNames.contains('candidates')) {
        const candStore = database.createObjectStore('candidates', { keyPath: 'candidateId' });
        candStore.createIndex('status', 'status', { unique: false });
        candStore.createIndex('targetRole', 'targetRole', { unique: false });
      }

      // 6. Investors
      if (!database.objectStoreNames.contains('investors')) {
        const invStore = database.createObjectStore('investors', { keyPath: 'investorId' });
        invStore.createIndex('status', 'status', { unique: false });
        invStore.createIndex('tierLevel', 'tierLevel', { unique: false });
      }

      // 7. Positions
      if (!database.objectStoreNames.contains('positions')) {
        const posStore = database.createObjectStore('positions', { keyPath: 'positionId' });
        posStore.createIndex('department', 'department', { unique: false });
        posStore.createIndex('status', 'status', { unique: false });
      }

      // 8. Contracts
      if (!database.objectStoreNames.contains('contracts')) {
        const conStore = database.createObjectStore('contracts', { keyPath: 'contractId' });
        conStore.createIndex('linkedEntityId', 'linkedEntityId', { unique: false });
        conStore.createIndex('status', 'status', { unique: false });
        conStore.createIndex('expirationDate', 'expirationDate', { unique: false });
      }

      // 9. Deployments
      if (!database.objectStoreNames.contains('deployments')) {
        const depStore = database.createObjectStore('deployments', { keyPath: 'deploymentId' });
        depStore.createIndex('agentId', 'agentId', { unique: false });
        depStore.createIndex('recipientId', 'recipientId', { unique: false });
        depStore.createIndex('status', 'status', { unique: false });
        depStore.createIndex('deploymentDate', 'deploymentDate', { unique: false });
      }

      // 10. Activation Links
      if (!database.objectStoreNames.contains('activationLinks')) {
        const actStore = database.createObjectStore('activationLinks', { keyPath: 'token' });
        actStore.createIndex('deploymentId', 'deploymentId', { unique: false });
        actStore.createIndex('expiresAt', 'expiresAt', { unique: false });
        actStore.createIndex('status', 'status', { unique: false });
      }

      // 11. QR Codes
      if (!database.objectStoreNames.contains('qrCodes')) {
        const qrStore = database.createObjectStore('qrCodes', { keyPath: 'qrId' });
        qrStore.createIndex('linkedTokenId', 'linkedTokenId', { unique: false });
        qrStore.createIndex('createdAt', 'createdAt', { unique: false });
      }

      // 12. Audit Receipts
      if (!database.objectStoreNames.contains('auditReceipts')) {
        const audStore = database.createObjectStore('auditReceipts', { keyPath: 'auditId' });
        audStore.createIndex('timestamp', 'timestamp', { unique: false });
        audStore.createIndex('adminId', 'adminId', { unique: false });
      }

      // 13. Command Receipts
      if (!database.objectStoreNames.contains('commandReceipts')) {
        const cmdStore = database.createObjectStore('commandReceipts', { keyPath: 'commandId' });
        cmdStore.createIndex('timestamp', 'timestamp', { unique: false });
        cmdStore.createIndex('intent', 'intent', { unique: false });
      }

      // 14. Voice Sessions
      if (!database.objectStoreNames.contains('voiceSessions')) {
        const voiceStore = database.createObjectStore('voiceSessions', { keyPath: 'sessionId' });
        voiceStore.createIndex('timestamp', 'timestamp', { unique: false });
        voiceStore.createIndex('adminId', 'adminId', { unique: false });
      }

      // 15. Vision Sessions
      if (!database.objectStoreNames.contains('visionSessions')) {
        const visionStore = database.createObjectStore('visionSessions', { keyPath: 'sessionId' });
        visionStore.createIndex('timestamp', 'timestamp', { unique: false });
        visionStore.createIndex('adminId', 'adminId', { unique: false });
      }

      // 16. Alerts
      if (!database.objectStoreNames.contains('alerts')) {
        const alertStore = database.createObjectStore('alerts', { keyPath: 'alertId' });
        alertStore.createIndex('severity', 'severity', { unique: false });
        alertStore.createIndex('timestamp', 'timestamp', { unique: false });
        alertStore.createIndex('acknowledged', 'acknowledged', { unique: false });
      }

      console.log('[Store] All object stores created');
    };
  });
}

export async function seedInitialData(): Promise<void> {
  if (!db) {
    await initializeStore();
  }

  // Initialize runtime state
  const runtimeState: RuntimeState = {
    id: 'runtime-primary',
    systemOnline: true,
    lastBootTime: new Date().toISOString(),
    runtimeMode: 'LOCAL_SELF_HOST',
    agentLeeStatus: 'ONLINE',
    voiceCapability: 'READY',
    visionCapability: 'READY',
    uptime: '00:00:00',
    buildVersion: '1.0.0-phase7'
  };

  await setRuntimeState(runtimeState);

  // Seed Agent Lee
  const agentLee: Agent = {
    agentId: 'agent-lee-prime',
    displayName: 'Agent Lee',
    roleTitle: 'Administrative Sovereign Agent / Professor / Deployment Commander',
    department: 'Administration',
    employmentType: 'Core Operational',
    status: 'ONLINE',
    languageProfile: ['English', 'Spanish', 'French', 'Arabic', 'Hindi', 'Chinese'],
    jobProfile: {
      title: 'Administrative Agent',
      responsibilities: [
        'System administration',
        'Agent deployment',
        'Voice command processing',
        'Governance oversight',
        'Emergency procedures'
      ]
    },
    permissions: [
      'SHOW_EMPLOYEES', 'SHOW_TEMP_WORKERS', 'SHOW_CANDIDATES', 'SHOW_INVESTORS',
      'CREATE_EMPLOYEE', 'CREATE_TEMP_WORKER', 'DEPLOY_AGENT', 'GENERATE_QR_CODE',
      'REVOKE_ACCESS', 'SUSPEND_ACCESS', 'RESTORE_ACCESS'
    ],
    forbiddenActions: [
      'DELETE_EMPLOYEE', 'DELETE_INVESTOR', 'DISABLE_AUDIT', 'BYPASS_GOVERNANCE'
    ],
    allowedTasks: ['Deploy agents', 'Issue commands', 'Manage deployments', 'Review audits'],
    contractScope: 'Administrative Full Authority',
    currentTasks: [],
    completedTasks: [],
    failedTasks: [],
    qualityScore: 1.0,
    lastActiveAt: new Date().toISOString(),
    governedBy: 'LEEWAY_GOVERNANCE_FRAMEWORK',
    createdAt: new Date().toISOString()
  };

  await createAgent(agentLee);
  console.log('[Store] Agent Lee seeded');
}

// ============================================================================
// RUNTIME STATE
// ============================================================================

export async function getRuntimeState(): Promise<RuntimeState | null> {
  if (!db) await initializeStore();
  
  return new Promise((resolve, reject) => {
    const tx = db!.transaction('runtimeState', 'readonly');
    const store = tx.objectStore('runtimeState');
    const request = store.get('runtime-primary');

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result || null);
  });
}

export async function setRuntimeState(state: RuntimeState): Promise<void> {
  if (!db) await initializeStore();

  return new Promise((resolve, reject) => {
    const tx = db!.transaction('runtimeState', 'readwrite');
    const store = tx.objectStore('runtimeState');
    const request = store.put({ ...state, id: 'runtime-primary' });

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      console.log('[Store] Runtime state updated');
      resolve();
    };
  });
}

export async function ensureAgentLeeOnline(): Promise<Agent> {
  const agentLee = await getAgent('agent-lee-prime');
  if (!agentLee || agentLee.status !== 'ONLINE') {
    const onlineAgent: Agent = {
      agentId: 'agent-lee-prime',
      displayName: 'Agent Lee',
      roleTitle: 'Administrative Sovereign Agent / Professor / Deployment Commander',
      department: 'Administration',
      employmentType: 'Core Operational',
      status: 'ONLINE',
      languageProfile: ['English', 'Spanish', 'French', 'Arabic'],
      jobProfile: {
        title: 'Administrative Agent',
        responsibilities: ['System administration', 'Deployment', 'Voice commands']
      },
      permissions: ['SHOW_EMPLOYEES', 'DEPLOY_AGENT', 'GENERATE_QR_CODE'],
      forbiddenActions: [],
      allowedTasks: ['Deploy agents', 'Issue commands'],
      contractScope: 'Administrative Full Authority',
      currentTasks: [],
      completedTasks: [],
      failedTasks: [],
      qualityScore: 1.0,
      lastActiveAt: new Date().toISOString(),
      governedBy: 'LEEWAY_GOVERNANCE_FRAMEWORK',
      createdAt: new Date().toISOString()
    };

    await createAgent(onlineAgent);
    console.log('[Store] Agent Lee online status restored');
    return onlineAgent;
  }
  return agentLee;
}

// ============================================================================
// AGENTS
// ============================================================================

export async function listAgents(): Promise<Agent[]> {
  if (!db) await initializeStore();

  return new Promise((resolve, reject) => {
    const tx = db!.transaction('agents', 'readonly');
    const store = tx.objectStore('agents');
    const request = store.getAll();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

export async function createAgent(agent: Agent): Promise<string> {
  if (!db) await initializeStore();

  return new Promise((resolve, reject) => {
    const tx = db!.transaction('agents', 'readwrite');
    const store = tx.objectStore('agents');
    const request = store.put(agent);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      console.log(`[Store] Agent created: ${agent.agentId}`);
      resolve(agent.agentId);
    };
  });
}

export async function getAgent(agentId: string): Promise<Agent | null> {
  if (!db) await initializeStore();

  return new Promise((resolve, reject) => {
    const tx = db!.transaction('agents', 'readonly');
    const store = tx.objectStore('agents');
    const request = store.get(agentId);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result || null);
  });
}

// ============================================================================
// EMPLOYEES
// ============================================================================

export async function listEmployees(): Promise<Employee[]> {
  if (!db) await initializeStore();

  return new Promise((resolve, reject) => {
    const tx = db!.transaction('employees', 'readonly');
    const store = tx.objectStore('employees');
    const request = store.getAll();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

export async function createEmployee(employee: Omit<Employee, 'employeeId'>): Promise<string> {
  if (!db) await initializeStore();

  const employeeId = `emp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const fullEmployee: Employee = {
    ...employee,
    employeeId
  };

  return new Promise((resolve, reject) => {
    const tx = db!.transaction('employees', 'readwrite');
    const store = tx.objectStore('employees');
    const request = store.put(fullEmployee);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      console.log(`[Store] Employee created: ${employeeId}`);
      resolve(employeeId);
    };
  });
}

// ============================================================================
// TEMP WORKERS
// ============================================================================

export async function listTempWorkers(): Promise<TempWorker[]> {
  if (!db) await initializeStore();

  return new Promise((resolve, reject) => {
    const tx = db!.transaction('tempWorkers', 'readonly');
    const store = tx.objectStore('tempWorkers');
    const request = store.getAll();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

export async function createTempWorker(worker: Omit<TempWorker, 'tempWorkerId'>): Promise<string> {
  if (!db) await initializeStore();

  const tempWorkerId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const fullWorker: TempWorker = {
    ...worker,
    tempWorkerId
  };

  return new Promise((resolve, reject) => {
    const tx = db!.transaction('tempWorkers', 'readwrite');
    const store = tx.objectStore('tempWorkers');
    const request = store.put(fullWorker);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      console.log(`[Store] Temp worker created: ${tempWorkerId}`);
      resolve(tempWorkerId);
    };
  });
}

// ============================================================================
// CANDIDATES
// ============================================================================

export async function listCandidates(): Promise<Candidate[]> {
  if (!db) await initializeStore();

  return new Promise((resolve, reject) => {
    const tx = db!.transaction('candidates', 'readonly');
    const store = tx.objectStore('candidates');
    const request = store.getAll();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

export async function createCandidate(candidate: Omit<Candidate, 'candidateId'>): Promise<string> {
  if (!db) await initializeStore();

  const candidateId = `cand-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const fullCandidate: Candidate = {
    ...candidate,
    candidateId
  };

  return new Promise((resolve, reject) => {
    const tx = db!.transaction('candidates', 'readwrite');
    const store = tx.objectStore('candidates');
    const request = store.put(fullCandidate);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      console.log(`[Store] Candidate created: ${candidateId}`);
      resolve(candidateId);
    };
  });
}

// ============================================================================
// INVESTORS
// ============================================================================

export async function listInvestors(): Promise<Investor[]> {
  if (!db) await initializeStore();

  return new Promise((resolve, reject) => {
    const tx = db!.transaction('investors', 'readonly');
    const store = tx.objectStore('investors');
    const request = store.getAll();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

export async function createInvestor(investor: Omit<Investor, 'investorId'>): Promise<string> {
  if (!db) await initializeStore();

  const investorId = `inv-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const fullInvestor: Investor = {
    ...investor,
    investorId
  };

  return new Promise((resolve, reject) => {
    const tx = db!.transaction('investors', 'readwrite');
    const store = tx.objectStore('investors');
    const request = store.put(fullInvestor);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      console.log(`[Store] Investor created: ${investorId}`);
      resolve(investorId);
    };
  });
}

// ============================================================================
// POSITIONS
// ============================================================================

export async function listPositions(): Promise<Position[]> {
  if (!db) await initializeStore();

  return new Promise((resolve, reject) => {
    const tx = db!.transaction('positions', 'readonly');
    const store = tx.objectStore('positions');
    const request = store.getAll();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

export async function createPosition(position: Omit<Position, 'positionId'>): Promise<string> {
  if (!db) await initializeStore();

  const positionId = `pos-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const fullPosition: Position = {
    ...position,
    positionId
  };

  return new Promise((resolve, reject) => {
    const tx = db!.transaction('positions', 'readwrite');
    const store = tx.objectStore('positions');
    const request = store.put(fullPosition);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      console.log(`[Store] Position created: ${positionId}`);
      resolve(positionId);
    };
  });
}

// ============================================================================
// CONTRACTS
// ============================================================================

export async function listContracts(): Promise<Contract[]> {
  if (!db) await initializeStore();

  return new Promise((resolve, reject) => {
    const tx = db!.transaction('contracts', 'readonly');
    const store = tx.objectStore('contracts');
    const request = store.getAll();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

export async function createContract(contract: Omit<Contract, 'contractId' | 'createdAt'>): Promise<string> {
  if (!db) await initializeStore();

  const contractId = `con-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const fullContract: Contract = {
    ...contract,
    contractId,
    createdAt: new Date().toISOString()
  };

  return new Promise((resolve, reject) => {
    const tx = db!.transaction('contracts', 'readwrite');
    const store = tx.objectStore('contracts');
    const request = store.put(fullContract);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      console.log(`[Store] Contract created: ${contractId}`);
      resolve(contractId);
    };
  });
}

export async function suspendContract(contractId: string): Promise<void> {
  if (!db) await initializeStore();

  return new Promise((resolve, reject) => {
    const tx = db!.transaction('contracts', 'readwrite');
    const store = tx.objectStore('contracts');
    const request = store.get(contractId);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const contract = request.result;
      if (contract) {
        contract.status = 'SUSPENDED';
        contract.suspendedAt = new Date().toISOString();
        store.put(contract);
        console.log(`[Store] Contract suspended: ${contractId}`);
      }
      resolve();
    };
  });
}

export async function revokeContract(contractId: string): Promise<void> {
  if (!db) await initializeStore();

  return new Promise((resolve, reject) => {
    const tx = db!.transaction('contracts', 'readwrite');
    const store = tx.objectStore('contracts');
    const request = store.get(contractId);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const contract = request.result;
      if (contract) {
        contract.status = 'REVOKED';
        contract.revokedAt = new Date().toISOString();
        store.put(contract);
        console.log(`[Store] Contract revoked: ${contractId}`);
      }
      resolve();
    };
  });
}

export async function renewContract(contractId: string, newEndDate: string): Promise<void> {
  if (!db) await initializeStore();

  return new Promise((resolve, reject) => {
    const tx = db!.transaction('contracts', 'readwrite');
    const store = tx.objectStore('contracts');
    const request = store.get(contractId);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const contract = request.result;
      if (contract) {
        contract.endDate = newEndDate;
        contract.status = 'ACTIVE';
        store.put(contract);
        console.log(`[Store] Contract renewed: ${contractId}`);
      }
      resolve();
    };
  });
}

export async function activateContract(contractId: string): Promise<void> {
  if (!db) await initializeStore();

  return new Promise((resolve, reject) => {
    const tx = db!.transaction('contracts', 'readwrite');
    const store = tx.objectStore('contracts');
    const request = store.get(contractId);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const contract = request.result;
      if (contract) {
        contract.status = 'ACTIVE';
        contract.suspendedAt = undefined;
        store.put(contract);
        console.log(`[Store] Contract activated: ${contractId}`);
      }
      resolve();
    };
  });
}

// ============================================================================
// DEPLOYMENTS
// ============================================================================

export async function listDeployments(): Promise<Deployment[]> {
  if (!db) await initializeStore();

  return new Promise((resolve, reject) => {
    const tx = db!.transaction('deployments', 'readonly');
    const store = tx.objectStore('deployments');
    const request = store.getAll();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

export async function createDeployment(deployment: Omit<Deployment, 'deploymentId'>): Promise<string> {
  if (!db) await initializeStore();

  const deploymentId = `dep-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const fullDeployment: Deployment = {
    ...deployment,
    deploymentId
  };

  return new Promise((resolve, reject) => {
    const tx = db!.transaction('deployments', 'readwrite');
    const store = tx.objectStore('deployments');
    const request = store.put(fullDeployment);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      console.log(`[Store] Deployment created: ${deploymentId}`);
      resolve(deploymentId);
    };
  });
}

export async function stopDeployment(deploymentId: string): Promise<void> {
  if (!db) await initializeStore();

  return new Promise((resolve, reject) => {
    const tx = db!.transaction('deployments', 'readwrite');
    const store = tx.objectStore('deployments');
    const request = store.get(deploymentId);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const deployment = request.result;
      if (deployment) {
        deployment.status = 'STOPPED';
        deployment.stoppedAt = new Date().toISOString();
        store.put(deployment);
        console.log(`[Store] Deployment stopped: ${deploymentId}`);
      }
      resolve();
    };
  });
}

export async function suspendDeployment(deploymentId: string): Promise<void> {
  if (!db) await initializeStore();

  return new Promise((resolve, reject) => {
    const tx = db!.transaction('deployments', 'readwrite');
    const store = tx.objectStore('deployments');
    const request = store.get(deploymentId);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const deployment = request.result;
      if (deployment) {
        deployment.status = 'SUSPENDED';
        deployment.suspendedAt = new Date().toISOString();
        store.put(deployment);
        console.log(`[Store] Deployment suspended: ${deploymentId}`);
      }
      resolve();
    };
  });
}

export async function revokeDeployment(deploymentId: string): Promise<void> {
  if (!db) await initializeStore();

  return new Promise((resolve, reject) => {
    const tx = db!.transaction('deployments', 'readwrite');
    const store = tx.objectStore('deployments');
    const request = store.get(deploymentId);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const deployment = request.result;
      if (deployment) {
        deployment.status = 'REVOKED';
        deployment.revokedAt = new Date().toISOString();
        store.put(deployment);
        console.log(`[Store] Deployment revoked: ${deploymentId}`);
      }
      resolve();
    };
  });
}

export async function restoreDeployment(deploymentId: string): Promise<void> {
  if (!db) await initializeStore();

  return new Promise((resolve, reject) => {
    const tx = db!.transaction('deployments', 'readwrite');
    const store = tx.objectStore('deployments');
    const request = store.get(deploymentId);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const deployment = request.result;
      if (deployment) {
        deployment.status = 'ACTIVE';
        deployment.suspendedAt = undefined;
        deployment.revokedAt = undefined;
        store.put(deployment);
        console.log(`[Store] Deployment restored: ${deploymentId}`);
      }
      resolve();
    };
  });
}

// ============================================================================
// ACTIVATION LINKS
// ============================================================================

export async function createActivationLink(link: Omit<ActivationLink, 'createdAt'>): Promise<string> {
  if (!db) await initializeStore();

  const fullLink: ActivationLink = {
    ...link,
    createdAt: new Date().toISOString()
  };

  return new Promise((resolve, reject) => {
    const tx = db!.transaction('activationLinks', 'readwrite');
    const store = tx.objectStore('activationLinks');
    const request = store.put(fullLink);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      console.log(`[Store] Activation link created: ${link.token}`);
      resolve(link.token);
    };
  });
}

export async function getActivationByToken(token: string): Promise<ActivationLink | null> {
  if (!db) await initializeStore();

  return new Promise((resolve, reject) => {
    const tx = db!.transaction('activationLinks', 'readonly');
    const store = tx.objectStore('activationLinks');
    const request = store.get(token);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const link = request.result;
      if (!link) {
        resolve(null);
        return;
      }

      // Check if expired
      if (link.expiresAt && new Date(link.expiresAt) < new Date()) {
        resolve(null);
        return;
      }

      // Check if revoked
      if (link.status === 'REVOKED') {
        resolve(null);
        return;
      }

      resolve(link);
    };
  });
}

export async function rotateActivationLink(oldToken: string): Promise<string> {
  if (!db) await initializeStore();

  const oldLink = await getActivationByToken(oldToken);
  if (!oldLink) {
    throw new Error('Original link not found or expired');
  }

  const newToken = generateToken();
  const newLink: ActivationLink = {
    ...oldLink,
    token: newToken,
    status: 'ACTIVE',
    createdAt: new Date().toISOString()
  };

  await createActivationLink(newLink);

  // Mark old as rotated
  return new Promise((resolve, reject) => {
    const tx = db!.transaction('activationLinks', 'readwrite');
    const store = tx.objectStore('activationLinks');
    const request = store.get(oldToken);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const oldLinkRecord = request.result;
      if (oldLinkRecord) {
        oldLinkRecord.status = 'ROTATED';
        store.put(oldLinkRecord);
      }
      console.log(`[Store] Activation link rotated: ${oldToken} → ${newToken}`);
      resolve(newToken);
    };
  });
}

// ============================================================================
// QR CODES
// ============================================================================

export async function generateQRCodeRecord(qrData: Omit<QRCode, 'qrId' | 'createdAt'>): Promise<string> {
  if (!db) await initializeStore();

  const qrId = `qr-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const fullQR: QRCode = {
    ...qrData,
    qrId,
    createdAt: new Date().toISOString()
  };

  return new Promise((resolve, reject) => {
    const tx = db!.transaction('qrCodes', 'readwrite');
    const store = tx.objectStore('qrCodes');
    const request = store.put(fullQR);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      console.log(`[Store] QR code generated: ${qrId}`);
      resolve(qrId);
    };
  });
}

// ============================================================================
// AUDIT RECEIPTS
// ============================================================================

export async function createAuditReceipt(receipt: Omit<AuditReceipt, 'auditId'>): Promise<string> {
  if (!db) await initializeStore();

  const auditId = `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const fullReceipt: AuditReceipt = {
    ...receipt,
    auditId
  };

  return new Promise((resolve, reject) => {
    const tx = db!.transaction('auditReceipts', 'readwrite');
    const store = tx.objectStore('auditReceipts');
    const request = store.put(fullReceipt);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      console.log(`[Store] Audit receipt created: ${auditId}`);
      resolve(auditId);
    };
  });
}

export async function listAuditReceipts(): Promise<AuditReceipt[]> {
  if (!db) await initializeStore();

  return new Promise((resolve, reject) => {
    const tx = db!.transaction('auditReceipts', 'readonly');
    const store = tx.objectStore('auditReceipts');
    const request = store.getAll();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

// ============================================================================
// COMMAND RECEIPTS
// ============================================================================

export async function createCommandReceipt(receipt: Omit<CommandReceipt, 'commandId'>): Promise<string> {
  if (!db) await initializeStore();

  const commandId = `cmd-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const fullReceipt: CommandReceipt = {
    ...receipt,
    commandId
  };

  return new Promise((resolve, reject) => {
    const tx = db!.transaction('commandReceipts', 'readwrite');
    const store = tx.objectStore('commandReceipts');
    const request = store.put(fullReceipt);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      console.log(`[Store] Command receipt created: ${commandId}`);
      resolve(commandId);
    };
  });
}

// ============================================================================
// VOICE SESSIONS
// ============================================================================

export async function createVoiceSession(session: Omit<VoiceSession, 'sessionId'>): Promise<string> {
  if (!db) await initializeStore();

  const sessionId = `voice-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const fullSession: VoiceSession = {
    ...session,
    sessionId
  };

  return new Promise((resolve, reject) => {
    const tx = db!.transaction('voiceSessions', 'readwrite');
    const store = tx.objectStore('voiceSessions');
    const request = store.put(fullSession);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      console.log(`[Store] Voice session created: ${sessionId}`);
      resolve(sessionId);
    };
  });
}

// ============================================================================
// VISION SESSIONS
// ============================================================================

export async function createVisionSession(session: Omit<VisionSession, 'sessionId'>): Promise<string> {
  if (!db) await initializeStore();

  const sessionId = `vision-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const fullSession: VisionSession = {
    ...session,
    sessionId
  };

  return new Promise((resolve, reject) => {
    const tx = db!.transaction('visionSessions', 'readwrite');
    const store = tx.objectStore('visionSessions');
    const request = store.put(fullSession);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      console.log(`[Store] Vision session created: ${sessionId}`);
      resolve(sessionId);
    };
  });
}

// ============================================================================
// ALERTS
// ============================================================================

export async function createAlert(alert: Omit<Alert, 'alertId' | 'timestamp'>): Promise<string> {
  if (!db) await initializeStore();

  const alertId = `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const fullAlert: Alert = {
    ...alert,
    alertId,
    timestamp: new Date().toISOString()
  };

  return new Promise((resolve, reject) => {
    const tx = db!.transaction('alerts', 'readwrite');
    const store = tx.objectStore('alerts');
    const request = store.put(fullAlert);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      console.log(`[Store] Alert created: ${alertId}`);
      resolve(alertId);
    };
  });
}

export async function listAlerts(): Promise<Alert[]> {
  if (!db) await initializeStore();

  return new Promise((resolve, reject) => {
    const tx = db!.transaction('alerts', 'readonly');
    const store = tx.objectStore('alerts');
    const request = store.getAll();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

export async function acknowledgeAlert(alertId: string): Promise<void> {
  if (!db) await initializeStore();

  return new Promise((resolve, reject) => {
    const tx = db!.transaction('alerts', 'readwrite');
    const store = tx.objectStore('alerts');
    const request = store.get(alertId);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const alert = request.result;
      if (alert) {
        alert.acknowledged = true;
        store.put(alert);
        console.log(`[Store] Alert acknowledged: ${alertId}`);
      }
      resolve();
    };
  });
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

export async function closeStore(): Promise<void> {
  if (db) {
    db.close();
    db = null;
    console.log('[Store] IndexedDB closed');
  }
}
