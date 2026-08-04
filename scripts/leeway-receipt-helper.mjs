/**
 * leeway-receipt-helper.mjs
 * Leeway Ecosystem v2.1.4 — Receipt Writing Helper (ESM)
 *
 * Usage:
 *   import { writeReceipt } from './leeway-receipt-helper.mjs';
 *   const path = await writeReceipt('my-action', { ok: true, result: ... }, { agentId: 'agent-lee' });
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Resolve Archive/receipts/ relative to the workspace root (two levels up from scripts/)
const WORKSPACE_ROOT = path.resolve(__dirname, '..');
const RECEIPTS_ROOT = path.join(WORKSPACE_ROOT, 'Archive', 'receipts');

/**
 * Write a Leeway receipt to Archive/receipts/<TIMESTAMP>-<action>.json
 *
 * @param {string} action - Short action identifier (e.g. 'governance-gate', 'desktop-speak')
 * @param {object} result - The action result object
 * @param {object} [metadata] - Optional metadata (agentId, controlSurface, etc.)
 * @returns {Promise<string>} Absolute path to the written receipt file
 */
export async function writeReceipt(action, result, metadata = {}) {
  const startedAt = metadata.startedAt || new Date().toISOString();
  const endedAt = new Date().toISOString();
  const timestamp = endedAt.replace(/[:.]/g, '-').replace('T', '_').slice(0, 19);
  const safeAction = String(action).replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 80);
  const filename = `${timestamp}-${safeAction}.json`;

  const receipt = {
    schema: 'leeway.receipt.v1',
    receiptId: `${timestamp}-${safeAction}`,
    action: action,
    status: result?.ok === true ? 'SUCCESS' : result?.ok === false ? 'FAIL' : 'UNKNOWN',
    startedAt,
    endedAt,
    agent: {
      agentId: metadata.agentId || 'agent-lee',
      agentMode: metadata.agentMode || 'code-mode',
      role: metadata.role || 'operator',
    },
    controlSurface: metadata.controlSurface || 'direct',
    result,
    metadata: {
      ...metadata,
      startedAt: undefined,
      agentId: undefined,
      agentMode: undefined,
      role: undefined,
      controlSurface: undefined,
    },
  };

  // Clean undefined keys from nested metadata
  Object.keys(receipt.metadata).forEach(k => {
    if (receipt.metadata[k] === undefined) delete receipt.metadata[k];
  });

  try {
    fs.mkdirSync(RECEIPTS_ROOT, { recursive: true });
    const filePath = path.join(RECEIPTS_ROOT, filename);
    fs.writeFileSync(filePath, JSON.stringify(receipt, null, 2), 'utf8');
    return filePath;
  } catch (err) {
    process.stderr.write(`[leeway-receipt-helper] Failed to write receipt: ${err.message}\n`);
    return null;
  }
}

/**
 * Write a receipt synchronously (for use in catch blocks / shutdown handlers)
 */
export function writeReceiptSync(action, result, metadata = {}) {
  const startedAt = metadata.startedAt || new Date().toISOString();
  const endedAt = new Date().toISOString();
  const timestamp = endedAt.replace(/[:.]/g, '-').replace('T', '_').slice(0, 19);
  const safeAction = String(action).replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 80);
  const filename = `${timestamp}-${safeAction}.json`;

  const receipt = {
    schema: 'leeway.receipt.v1',
    receiptId: `${timestamp}-${safeAction}`,
    action,
    status: result?.ok === true ? 'SUCCESS' : result?.ok === false ? 'FAIL' : 'UNKNOWN',
    startedAt,
    endedAt,
    agent: {
      agentId: metadata.agentId || 'agent-lee',
      agentMode: metadata.agentMode || 'code-mode',
    },
    result,
    metadata,
  };

  try {
    fs.mkdirSync(RECEIPTS_ROOT, { recursive: true });
    const filePath = path.join(RECEIPTS_ROOT, filename);
    fs.writeFileSync(filePath, JSON.stringify(receipt, null, 2), 'utf8');
    return filePath;
  } catch (err) {
    process.stderr.write(`[leeway-receipt-helper] Failed to write receipt sync: ${err.message}\n`);
    return null;
  }
}
