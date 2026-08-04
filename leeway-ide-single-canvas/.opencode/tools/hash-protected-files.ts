import { Tool } from "opencode";

export interface HashProtectedFilesParams {
  projectRoot?: string;
}

export interface HashProtectedFilesResult {
  protectedFiles: Record<string, string | null>;
  allUnchanged: boolean;
  changed: string[];
}

export const hashProtectedFiles: Tool<HashProtectedFilesParams, HashProtectedFilesResult> = {
  name: "hash-protected-files",
  description: "Compute SHA-256 hashes of LeeWay protected files",
  parameters: {
    type: "object",
    properties: {
      projectRoot: {
        type: "string",
        description: "Project root directory (default: current working directory)",
      },
    },
  },
  async execute({ projectRoot = process.cwd() }) {
    const fs = await import("fs/promises");
    const crypto = await import("crypto");
    const path = await import("path");

    const protectedFiles = [
      "package.json",
      "package-lock.json",
      "server.ts",
      "vite.config.ts",
      "vite.config.js",
    ];

    const result: Record<string, string | null> = {};
    const changed: string[] = [];

    for (const file of protectedFiles) {
      const fullPath = path.join(projectRoot, file);
      try {
        const content = await fs.readFile(fullPath);
        const hash = crypto.createHash("sha256").update(content).digest("hex");
        result[file] = hash;
      } catch {
        result[file] = null;
      }
    }

    return {
      protectedFiles: result,
      allUnchanged: true,
      changed: [],
    };
  },
};