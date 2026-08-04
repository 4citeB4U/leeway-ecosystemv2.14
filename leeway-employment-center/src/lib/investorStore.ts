/*
FILE: src\lib\investorStore.ts
PURPOSE: Investor portal data persistence and state management
GOVERNED_BY: LeeWay Standards
TAG: UTIL.LIB.INVESTOR_STORE
REGION: 🟠 UTIL
STATUS: ACTIVE
*/

import { 
  InvestorRecord, 
  InvestorAgentAssignment, 
  InvestorInviteToken, 
  InvestorDeploymentAuditReceipt,
  InvestorConversationSummary,
  InvestorPermission,
  InviteTokenStatus
} from '../types';

const INVESTOR_DB_NAME = 'LeeWayInvestorPortal';
const STORE_NAMES = {
  investors: 'investorRecords',
  assignments: 'agentAssignments',
  tokens: 'inviteTokens',
  audits: 'auditReceipts',
  conversations: 'conversationSummaries'
};

let db: IDBDatabase | null = null;

export async function initInvestorDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(INVESTOR_DB_NAME, 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result;

      // Investor Records Store
      if (!database.objectStoreNames.contains(STORE_NAMES.investors)) {
        const investorStore = database.createObjectStore(STORE_NAMES.investors, { keyPath: 'investorId' });
        investorStore.createIndex('email', 'email', { unique: false });
        investorStore.createIndex('status', 'status', { unique: false });
      }

      // Agent Assignments Store
      if (!database.objectStoreNames.contains(STORE_NAMES.assignments)) {
        const assignmentStore = database.createObjectStore(STORE_NAMES.assignments, { keyPath: 'assignmentId' });
        assignmentStore.createIndex('investorId', 'investorId', { unique: false });
        assignmentStore.createIndex('status', 'status', { unique: false });
      }

      // Invite Tokens Store
      if (!database.objectStoreNames.contains(STORE_NAMES.tokens)) {
        const tokenStore = database.createObjectStore(STORE_NAMES.tokens, { keyPath: 'tokenId' });
        tokenStore.createIndex('investorId', 'investorId', { unique: false });
        tokenStore.createIndex('token', 'token', { unique: true });
        tokenStore.createIndex('status', 'status', { unique: false });
      }

      // Audit Receipts Store
      if (!database.objectStoreNames.contains(STORE_NAMES.audits)) {
        const auditStore = database.createObjectStore(STORE_NAMES.audits, { keyPath: 'receiptId' });
        auditStore.createIndex('investorId', 'investorId', { unique: false });
        auditStore.createIndex('timestamp', 'timestamp', { unique: false });
      }

      // Conversation Summaries Store
      if (!database.objectStoreNames.contains(STORE_NAMES.conversations)) {
        const convStore = database.createObjectStore(STORE_NAMES.conversations, { keyPath: 'summaryId' });
        convStore.createIndex('investorId', 'investorId', { unique: false });
        convStore.createIndex('sessionId', 'sessionId', { unique: false });
      }
    };
  });
}

async function ensureDb(): Promise<IDBDatabase> {
  if (db) return db;
  return initInvestorDb();
}

// INVESTOR RECORDS

export async function createInvestor(investor: InvestorRecord): Promise<InvestorRecord> {
  const database = await ensureDb();
  return new Promise((resolve, reject) => {
    const tx = database.transaction([STORE_NAMES.investors], 'readwrite');
    const store = tx.objectStore(STORE_NAMES.investors);
    const request = store.add(investor);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(investor);
  });
}

export async function getInvestor(investorId: string): Promise<InvestorRecord | undefined> {
  const database = await ensureDb();
  return new Promise((resolve, reject) => {
    const tx = database.transaction([STORE_NAMES.investors], 'readonly');
    const store = tx.objectStore(STORE_NAMES.investors);
    const request = store.get(investorId);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

export async function getAllInvestors(): Promise<InvestorRecord[]> {
  const database = await ensureDb();
  return new Promise((resolve, reject) => {
    const tx = database.transaction([STORE_NAMES.investors], 'readonly');
    const store = tx.objectStore(STORE_NAMES.investors);
    const request = store.getAll();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result || []);
  });
}

export async function updateInvestor(investor: InvestorRecord): Promise<InvestorRecord> {
  const database = await ensureDb();
  return new Promise((resolve, reject) => {
    const tx = database.transaction([STORE_NAMES.investors], 'readwrite');
    const store = tx.objectStore(STORE_NAMES.investors);
    const request = store.put(investor);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(investor);
  });
}

// AGENT ASSIGNMENTS

export async function createAssignment(assignment: InvestorAgentAssignment): Promise<InvestorAgentAssignment> {
  const database = await ensureDb();
  return new Promise((resolve, reject) => {
    const tx = database.transaction([STORE_NAMES.assignments], 'readwrite');
    const store = tx.objectStore(STORE_NAMES.assignments);
    const request = store.add(assignment);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(assignment);
  });
}

export async function getAssignmentsByInvestor(investorId: string): Promise<InvestorAgentAssignment[]> {
  const database = await ensureDb();
  return new Promise((resolve, reject) => {
    const tx = database.transaction([STORE_NAMES.assignments], 'readonly');
    const store = tx.objectStore(STORE_NAMES.assignments);
    const index = store.index('investorId');
    const request = index.getAll(investorId);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result || []);
  });
}

export async function updateAssignment(assignment: InvestorAgentAssignment): Promise<InvestorAgentAssignment> {
  const database = await ensureDb();
  return new Promise((resolve, reject) => {
    const tx = database.transaction([STORE_NAMES.assignments], 'readwrite');
    const store = tx.objectStore(STORE_NAMES.assignments);
    const request = store.put(assignment);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(assignment);
  });
}

// INVITE TOKENS

export async function createInviteToken(token: InvestorInviteToken): Promise<InvestorInviteToken> {
  const database = await ensureDb();
  return new Promise((resolve, reject) => {
    const tx = database.transaction([STORE_NAMES.tokens], 'readwrite');
    const store = tx.objectStore(STORE_NAMES.tokens);
    const request = store.add(token);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(token);
  });
}

export async function getTokenByString(tokenString: string): Promise<InvestorInviteToken | undefined> {
  const database = await ensureDb();
  return new Promise((resolve, reject) => {
    const tx = database.transaction([STORE_NAMES.tokens], 'readonly');
    const store = tx.objectStore(STORE_NAMES.tokens);
    const index = store.index('token');
    const request = index.get(tokenString);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

export async function getTokensByInvestor(investorId: string): Promise<InvestorInviteToken[]> {
  const database = await ensureDb();
  return new Promise((resolve, reject) => {
    const tx = database.transaction([STORE_NAMES.tokens], 'readonly');
    const store = tx.objectStore(STORE_NAMES.tokens);
    const index = store.index('investorId');
    const request = index.getAll(investorId);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result || []);
  });
}

export async function updateInviteToken(token: InvestorInviteToken): Promise<InvestorInviteToken> {
  const database = await ensureDb();
  return new Promise((resolve, reject) => {
    const tx = database.transaction([STORE_NAMES.tokens], 'readwrite');
    const store = tx.objectStore(STORE_NAMES.tokens);
    const request = store.put(token);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(token);
  });
}

// AUDIT RECEIPTS

export async function createAuditReceipt(receipt: InvestorDeploymentAuditReceipt): Promise<InvestorDeploymentAuditReceipt> {
  const database = await ensureDb();
  return new Promise((resolve, reject) => {
    const tx = database.transaction([STORE_NAMES.audits], 'readwrite');
    const store = tx.objectStore(STORE_NAMES.audits);
    const request = store.add(receipt);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(receipt);
  });
}

export async function getAuditsByInvestor(investorId: string): Promise<InvestorDeploymentAuditReceipt[]> {
  const database = await ensureDb();
  return new Promise((resolve, reject) => {
    const tx = database.transaction([STORE_NAMES.audits], 'readonly');
    const store = tx.objectStore(STORE_NAMES.audits);
    const index = store.index('investorId');
    const request = index.getAll(investorId);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result || []);
  });
}

// CONVERSATION SUMMARIES

export async function createConversationSummary(summary: InvestorConversationSummary): Promise<InvestorConversationSummary> {
  const database = await ensureDb();
  return new Promise((resolve, reject) => {
    const tx = database.transaction([STORE_NAMES.conversations], 'readwrite');
    const store = tx.objectStore(STORE_NAMES.conversations);
    const request = store.add(summary);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(summary);
  });
}

export async function getConversationsByInvestor(investorId: string): Promise<InvestorConversationSummary[]> {
  const database = await ensureDb();
  return new Promise((resolve, reject) => {
    const tx = database.transaction([STORE_NAMES.conversations], 'readonly');
    const store = tx.objectStore(STORE_NAMES.conversations);
    const index = store.index('investorId');
    const request = index.getAll(investorId);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result || []);
  });
}
