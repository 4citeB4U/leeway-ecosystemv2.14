import { Tool } from "opencode";

export interface ValidateReceiptParams {
  receiptPath: string;
  expectedMigration?: string;
}

export interface ValidateReceiptResult {
  valid: boolean;
  errors: string[];
  receipt?: {
    Migration: string;
    Status: string;
    Stage: string;
    ScriptVersion: string;
    ProjectRoot: string;
    GitRoot: string;
    Evidence: string;
    Manifest?: string;
    Specification?: string;
    BuildLog?: string;
    Rollback?: string;
    Timestamp: string;
  };
}

export const validateReceipt: Tool<ValidateReceiptParams, ValidateReceiptResult> = {
  name: "validate-receipt",
  description: "Validate a migration receipt file for completeness and correctness",
  parameters: {
    type: "object",
    properties: {
      receiptPath: {
        type: "string",
        description: "Path to receipt.json file",
      },
      expectedMigration: {
        type: "string",
        description: "Expected migration ID",
      },
    },
    required: ["receiptPath"],
  },
  async execute({ receiptPath, expectedMigration }) {
    const fs = await import("fs/promises");
    
    const errors: string[] = [];
    
    try {
      const content = await fs.readFile(receiptPath, "utf-8");
      const receipt = JSON.parse(content);
      
      // Required fields
      const requiredFields = [
        "Migration", "Status", "Stage", "ScriptVersion", 
        "ProjectRoot", "GitRoot", "Evidence", "Timestamp"
      ];
      
      for (const field of requiredFields) {
        if (!receipt[field]) {
          errors.push(`Missing required field: ${field}`);
        }
      }
      
      if (expectedMigration && receipt.Migration !== expectedMigration) {
        errors.push(`Migration mismatch: expected ${expectedMigration}, got ${receipt.Migration}`);
      }
      
      if (receipt.Status !== "PASS" && receipt.Status !== "FAIL") {
        errors.push(`Invalid Status: ${receipt.Status} (expected PASS or FAIL)`);
      }
      
      // Validate timestamp format
      try {
        new Date(receipt.Timestamp).toISOString();
      } catch {
        errors.push("Invalid Timestamp format");
      }
      
      return {
        valid: errors.length === 0,
        errors,
        receipt: {
          Migration: receipt.Migration,
          Status: receipt.Status,
          Stage: receipt.Stage,
          ScriptVersion: receipt.ScriptVersion,
          ProjectRoot: receipt.ProjectRoot,
          GitRoot: receipt.GitRoot,
          Evidence: receipt.Evidence,
          Manifest: receipt.Manifest,
          Specification: receipt.Specification,
          BuildLog: receipt.BuildLog,
          Rollback: receipt.Rollback,
          Timestamp: receipt.Timestamp,
        },
      };
    } catch (err) {
      return {
        valid: false,
        errors: [`Failed to read/parse receipt: ${err}`],
      };
    }
  },
};