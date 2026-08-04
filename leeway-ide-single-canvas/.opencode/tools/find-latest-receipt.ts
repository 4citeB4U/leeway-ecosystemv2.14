import { Tool } from "opencode";

export interface FindLatestReceiptParams {
  migrationId: string;
  evidenceRoot?: string;
}

export interface FindLatestReceiptResult {
  found: boolean;
  path?: string;
  receipt?: {
    Migration: string;
    Status: string;
    Stage: string;
    Timestamp: string;
    Evidence: string;
  };
}

export const findLatestReceipt: Tool<FindLatestReceiptParams, FindLatestReceiptResult> = {
  name: "find-latest-receipt",
  description: "Find the latest PASS receipt for a given migration ID",
  parameters: {
    type: "object",
    properties: {
      migrationId: {
        type: "string",
        description: "Migration ID (e.g., MIG-005)",
      },
      evidenceRoot: {
        type: "string",
        description: "Root evidence directory (default: ./evidence)",
      },
    },
    required: ["migrationId"],
  },
  async execute({ migrationId, evidenceRoot = "./evidence" }) {
    const fs = await import("fs/promises");
    const path = await import("path");

    const migrationRoot = path.join(evidenceRoot, migrationId);
    
    try {
      const entries = await fs.readdir(migrationRoot, { withFileTypes: true });
      const sessions = entries
        .filter(d => d.isDirectory())
        .map(d => d.name)
        .sort()
        .reverse();

      for (const session of sessions) {
        const receiptPath = path.join(migrationRoot, session, "receipt.json");
        try {
          const content = await fs.readFile(receiptPath, "utf-8");
          const receipt = JSON.parse(content);
          
          if (receipt.Status === "PASS") {
            return {
              found: true,
              path: receiptPath,
              receipt: {
                Migration: receipt.Migration,
                Status: receipt.Status,
                Stage: receipt.Stage,
                Timestamp: receipt.Timestamp,
                Evidence: receipt.Evidence,
              },
            };
          }
        } catch {
          continue;
        }
      }

      return { found: false };
    } catch {
      return { found: false };
    }
  },
};