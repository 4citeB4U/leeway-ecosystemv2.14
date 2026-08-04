import { Tool } from "opencode";

export interface ValidateSkillManifestParams {
  manifestPath?: string;
  skillsRoot?: string;
}

export interface ValidateSkillManifestResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  skills: Array<{
    id: string;
    name: string;
    path: string;
    hasSkillMd: boolean;
    skillMdValid: boolean;
    inManifest: boolean;
    inOpencodeConfig: boolean;
  }>;
  opencodeConfigValid: boolean;
}

export const validateSkillManifest: Tool<ValidateSkillManifestParams, ValidateSkillManifestResult> = {
  name: "validate-skill-manifest",
  description: "Validate Leeway skills manifest against installed skills and OpenCode config",
  parameters: {
    type: "object",
    properties: {
      manifestPath: {
        type: "string",
        description: "Path to skills-manifest.json (default: .leeway/skills/skills-manifest.json)",
      },
      skillsRoot: {
        type: "string",
        description: "Root directory of installed skills (default: ~/.agents/skills)",
      },
    },
  },
  async execute({ manifestPath, skillsRoot }) {
    const fs = await import("fs/promises");
    const path = await import("path");
    const os = await import("os");

    const homeDir = os.homedir();
    const defaultSkillsRoot = path.join(homeDir, ".agents", "skills");
    const defaultManifestPath = path.join(process.cwd(), ".leeway", "skills", "skills-manifest.json");

    const skillsDir = skillsRoot || defaultSkillsRoot;
    const manifestFile = manifestPath || defaultManifestPath;

    const errors: string[] = [];
    const warnings: string[] = [];
    const results: ValidateSkillManifestResult["skills"] = [];

    // Read manifest
    let manifest: any = null;
    try {
      manifest = JSON.parse(await fs.readFile(manifestFile, "utf-8"));
    } catch {
      errors.push(`Cannot read manifest: ${manifestFile}`);
      return { valid: false, errors, warnings, skills: [], opencodeConfigValid: false };
    }

    // Read OpenCode config
    let opencodeConfig: any = null;
    try {
      const configPath = path.join(homeDir, ".config", "opencode", "opencode.jsonc");
      const content = await fs.readFile(configPath, "utf-8");
      opencodeConfig = JSON.parse(content.replace(/\/\/.*$/gm, "")); // strip comments
    } catch {
      warnings.push("Cannot read OpenCode config");
    }

    const ocSkillPaths = opencodeConfig?.skills?.paths || [];

    // Scan skills directory
    let installedSkills: string[] = [];
    try {
      installedSkills = (await fs.readdir(skillsDir, { withFileTypes: true }))
        .filter(d => d.isDirectory())
        .map(d => d.name);
    } catch {
      errors.push(`Cannot read skills directory: ${skillsDir}`);
    }

    // Check each skill in manifest
    for (const skill of manifest.skills || []) {
      const skillDir = path.join(skillsDir, skill.name);
      const skillMdPath = path.join(skillDir, "SKILL.md");
      
      let hasSkillMd = false;
      let skillMdValid = false;
      
      try {
        const mdContent = await fs.readFile(skillMdPath, "utf-8");
        hasSkillMd = true;
        // Basic validation
        if (mdContent.includes(`name: ${skill.name}`) || mdContent.includes(`name: "${skill.name}"`)) {
          skillMdValid = true;
        }
      } catch {
        // No SKILL.md
      }

      const inManifest = true;
      const inOpencodeConfig = ocSkillPaths.some((p: string) => 
        p.includes(".agents/skills") || p.includes(".leeway/skills")
      );

      results.push({
        id: skill.name,
        name: skill.name,
        path: skillDir,
        hasSkillMd,
        skillMdValid,
        inManifest,
        inOpencodeConfig,
      });

      if (!hasSkillMd) {
        warnings.push(`Skill ${skill.name}: missing SKILL.md`);
      }
      if (!skillMdValid && hasSkillMd) {
        warnings.push(`Skill ${skill.name}: SKILL.md missing name field`);
      }
    }

    // Check for installed skills not in manifest
    const manifestNames = new Set((manifest.skills || []).map((s: any) => s.name));
    for (const installed of installedSkills) {
      if (!manifestNames.has(installed)) {
        warnings.push(`Installed skill not in manifest: ${installed}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      skills: results,
      opencodeConfigValid: !!opencodeConfig?.skills?.paths?.length,
    };
  },
};