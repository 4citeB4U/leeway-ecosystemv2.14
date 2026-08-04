import { Tool } from "opencode";

export interface ValidateMigrationBoundaryParams {
  migrationId: string;
  projectRoot?: string;
}

export interface ValidateMigrationBoundaryResult {
  migrationId: string;
  scope: string[];
  filesInScope: string[];
  filesOutOfScope: string[];
  protectedFilesTouched: string[];
  unexpectedFiles: string[];
}

export const validateMigrationBoundary: Tool<ValidateMigrationBoundaryParams, ValidateMigrationBoundaryResult> = {
  name: "validate-migration-boundary",
  description: "Validate that a migration only touches files within its declared scope",
  parameters: {
    type: "object",
    properties: {
      migrationId: {
        type: "string",
        description: "Migration ID (e.g., MIG-005)",
      },
      projectRoot: {
        type: "string",
        description: "Project root directory",
      },
    },
    required: ["migrationId"],
  },
  async execute({ migrationId, projectRoot = process.cwd() }) {
    const fs = await import("fs/promises");
    const path = await import("path");

    const manifestPath = path.join(projectRoot, "migration", `${migrationId}-manifest.json`);
    let scope: string[] = [];
    
    try {
      const manifest = JSON.parse(await fs.readFile(manifestPath, "utf-8"));
      scope = manifest.scope || [];
    } catch {
      // No manifest, continue with empty scope
    }

    const gitRootCmd = await import("child_process");
    const gitRoot = (gitRootCmd.execSync("git rev-parse --show-toplevel", { cwd: projectRoot, encoding: "utf-8" })).trim();
    
    const status = gitRootCmd.execSync("git status --porcelain=v1 --untracked-files=all", { cwd: gitRoot, encoding: "utf-8" });
    const changedFiles = status.split("\n").filter(l => l).map(l => l.slice(3));

    const protectedFiles = ["package.json", "package-lock.json", "server.ts", "vite.config.ts", "vite.config.js"];
    const protectedFilesTouched = changedFiles.filter(f => protectedFiles.includes(path.basename(f)));

    // Check scope
    const filesInScope = changedFiles.filter(f => 
      scope.some(s => f.startsWith(s.replace(/\*/g, "")))
    );
    const filesOutOfScope = changedFiles.filter(f => 
      !scope.some(s => f.startsWith(s.replace(/\*/g, "")))
    );

    return {
      migrationId,
      scope,
      filesInScope,
      filesOutOfScope,
      protectedFilesTouched,
      unexpectedFiles: [],
    };
  },
};