import { Tool } from "opencode";

export interface ValidateJsoncParams {
  filePath: string;
  schemaUrl?: string;
}

export interface ValidateJsoncResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  parsed?: any;
}

export const validateJsonc: Tool<ValidateJsoncParams, ValidateJsoncResult> = {
  name: "validate-jsonc",
  description: "Validate JSONC file (JSON with comments) against optional schema",
  parameters: {
    type: "object",
    properties: {
      filePath: {
        type: "string",
        description: "Path to JSONC file",
      },
      schemaUrl: {
        type: "string",
        description: "Optional JSON Schema URL for validation",
      },
    },
    required: ["filePath"],
  },
  async execute({ filePath, schemaUrl }) {
    const fs = await import("fs/promises");
    const path = await import("path");

    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      const content = await fs.readFile(filePath, "utf-8");
      
      // Strip single-line and multi-line comments
      const stripped = content
        .replace(/\/\*[\s\S]*?\*\//g, "")  // multi-line
        .replace(/\/\/.*$/gm, "")          // single-line
        .replace(/,\s*([}\]])/g, "$1");    // trailing commas

      let parsed: any;
      try {
        parsed = JSON.parse(stripped);
      } catch (e) {
        errors.push(`JSON parse error: ${e}`);
        return { valid: false, errors, warnings };
      }

      if (schemaUrl) {
        // Schema validation would go here if we had a schema validator
        warnings.push("Schema validation not implemented in this tool");
      }

      return { valid: errors.length === 0, errors, warnings, parsed };
    } catch (e) {
      errors.push(`File read error: ${e}`);
      return { valid: false, errors, warnings };
    }
  },
};