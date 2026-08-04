/*
LEEWAY_HEADER - DO NOT REMOVE

REGION: 🟢 CORE
TAG: CORE.CONNECTIVITY.LEEWAY.LOADER
PURPOSE: Internal-only standalone connectivity loader for Agent Lee runtime assets.
DISCOVERY_PIPELINE:
  Voice → Intent → Location → Vertical → Ranking → Render
*/

import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";

export type AgentLeeRootSource = "env" | "config" | "default" | "walkup" | "degraded";

export type StandaloneConnectivityPaths = {
  sdk: string;
  standards: string;
  mcp: string;
  agents: string;
  governance: string;
  personaSystem: string;
  personaModule: string;
};

export type AgentLeeRootResolution = {
  root: string;
  rootSource: AgentLeeRootSource;
  missingConnectivityPaths: string[];
  paths: StandaloneConnectivityPaths;
};

export type StandaloneConnectivityResult = {
  valid: boolean;
  root: string;
  rootSource: AgentLeeRootSource;
  missing: string[];
  missingConnectivityPaths: string[];
  paths: StandaloneConnectivityPaths;
};

const DEFAULT_AGENT_LEE_ROOT = "C:\\Users\\Leona\\.leeway-vscode\\agent-lee";
const ROOT_DIRECTORIES = [
  "sdk",
  "mcp",
  "agents",
  "governance",
  "Agent_Lee_Persona_System",
  "persona",
  "vscode-extension"
] as const;

function existing(filePath: string) {
  try {
    return fs.existsSync(filePath);
  } catch {
    return false;
  }
}

function normalizeRoot(candidate: string | undefined | null) {
  const trimmed = String(candidate || "").trim().replace(/^['"]|['"]$/g, "");
  if (!trimmed) return "";
  try {
    return path.resolve(trimmed);
  } catch {
    return "";
  }
}

function buildConnectivityPaths(root: string): StandaloneConnectivityPaths {
  return {
    sdk: path.join(root, "sdk"),
    standards: path.join(root, "sdk", "standards"),
    mcp: path.join(root, "mcp"),
    agents: path.join(root, "agents"),
    governance: path.join(root, "governance"),
    personaSystem: path.join(root, "Agent_Lee_Persona_System"),
    personaModule: path.join(root, "persona")
  };
}

function buildRequiredConnectivityPaths(root: string) {
  const paths = buildConnectivityPaths(root);
  return {
    paths,
    required: [
      ...ROOT_DIRECTORIES.map((segment) => path.join(root, segment)),
      path.join(paths.mcp, "mcp-registry.json"),
      path.join(paths.agents, "registry", "agent-registry.json"),
      path.join(paths.standards, "leeway-standards-canon.json"),
      path.join(paths.sdk, "leeway-sdk", "manifest.json")
    ]
  };
}

function inspectCandidate(root: string) {
  const normalizedRoot = normalizeRoot(root);
  const { paths, required } = buildRequiredConnectivityPaths(normalizedRoot);
  const missingConnectivityPaths = required.filter((item) => !existing(item));
  return {
    root: normalizedRoot,
    paths,
    missingConnectivityPaths,
    valid: normalizedRoot.length > 0 && missingConnectivityPaths.length === 0
  };
}

function containsStandaloneDirectories(root: string) {
  return ROOT_DIRECTORIES.every((segment) => existing(path.join(root, segment)));
}

function getExtensionInstallPath(context?: vscode.ExtensionContext) {
  return normalizeRoot(context?.extensionPath || path.resolve(__dirname, "..", ".."));
}

function readConfiguredRootPath() {
  try {
    const configuration = vscode.workspace.getConfiguration("agentLee");
    const explicit = configuration.inspect<string>("rootPath");
    const configuredValue = normalizeRoot(configuration.get<string>("rootPath"));
    const hasExplicitValue = Boolean(
      explicit?.workspaceFolderValue ||
      explicit?.workspaceValue ||
      explicit?.globalValue
    );

    if (hasExplicitValue && configuredValue) {
      return { root: configuredValue, source: "config" as const };
    }
  } catch {}

  return { root: normalizeRoot(DEFAULT_AGENT_LEE_ROOT), source: "default" as const };
}

function* walkUpRoots(startPath: string) {
  let current = normalizeRoot(startPath);
  while (current) {
    yield current;
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }
}

function findWalkupRoot(context?: vscode.ExtensionContext) {
  for (const candidate of walkUpRoots(getExtensionInstallPath(context))) {
    if (containsStandaloneDirectories(candidate)) {
      return candidate;
    }
  }

  return "";
}

function resolveAgentLeeRootDetails(context?: vscode.ExtensionContext): AgentLeeRootResolution {
  const inspectedCandidates: Array<{ source: Exclude<AgentLeeRootSource, "degraded">; root: string }> = [];
  const seen = new Set<string>();
  let bestMatch = inspectCandidate(DEFAULT_AGENT_LEE_ROOT);

  const consider = (root: string, source: Exclude<AgentLeeRootSource, "degraded">) => {
    const normalizedRoot = normalizeRoot(root);
    if (!normalizedRoot || seen.has(normalizedRoot)) return null;
    seen.add(normalizedRoot);

    const candidate = inspectCandidate(normalizedRoot);
    inspectedCandidates.push({ source, root: normalizedRoot });

    if (candidate.valid) {
      return {
        root: candidate.root,
        rootSource: source,
        missingConnectivityPaths: [],
        paths: candidate.paths
      } satisfies AgentLeeRootResolution;
    }

    if (
      !bestMatch.root ||
      candidate.missingConnectivityPaths.length < bestMatch.missingConnectivityPaths.length
    ) {
      bestMatch = candidate;
    }

    return null;
  };

  const envRoot = normalizeRoot(process.env.AGENT_LEE_ROOT);
  const envResolution = consider(envRoot, "env");
  if (envResolution) return envResolution;

  const configuredRoot = readConfiguredRootPath();
  const configResolution = consider(configuredRoot.root, configuredRoot.source);
  if (configResolution) return configResolution;

  if (configuredRoot.source !== "default") {
    const defaultResolution = consider(DEFAULT_AGENT_LEE_ROOT, "default");
    if (defaultResolution) return defaultResolution;
  }

  const walkupRoot = findWalkupRoot(context);
  const walkupResolution = consider(walkupRoot, "walkup");
  if (walkupResolution) return walkupResolution;

  return {
    root: bestMatch.root,
    rootSource: "degraded",
    missingConnectivityPaths: bestMatch.missingConnectivityPaths,
    paths: bestMatch.paths
  };
}

export function resolveAgentLeeRoot(context?: vscode.ExtensionContext): string {
  return resolveAgentLeeRootDetails(context).root;
}

export function getAgentLeeRoot(context?: vscode.ExtensionContext) {
  return resolveAgentLeeRoot(context);
}

export function getAgentLeeRootResolution(context?: vscode.ExtensionContext) {
  return resolveAgentLeeRootDetails(context);
}

export function getInternalSdkRoot(context?: vscode.ExtensionContext) {
  return path.join(getAgentLeeRoot(context), "sdk");
}

export function getInternalStandardsRoot(context?: vscode.ExtensionContext) {
  return path.join(getInternalSdkRoot(context), "standards");
}

export function getInternalMcpRoot(context?: vscode.ExtensionContext) {
  return path.join(getAgentLeeRoot(context), "mcp");
}

export function getInternalAgentsRoot(context?: vscode.ExtensionContext) {
  return path.join(getAgentLeeRoot(context), "agents");
}

export function getInternalGovernanceRoot(context?: vscode.ExtensionContext) {
  return path.join(getAgentLeeRoot(context), "governance");
}

export function getPersonaSystemRoot(context?: vscode.ExtensionContext) {
  return path.join(getAgentLeeRoot(context), "Agent_Lee_Persona_System");
}

export function getPersonaModuleRoot(context?: vscode.ExtensionContext) {
  return path.join(getAgentLeeRoot(context), "persona");
}

function readJson<T extends Record<string, unknown>>(filePath: string, fallback: T): T {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
  } catch {
    return fallback;
  }
}

function readText(filePath: string) {
  try {
    return fs.readFileSync(filePath, "utf8");
  } catch {
    return "";
  }
}

export function validateStandaloneConnectivity(context?: vscode.ExtensionContext): StandaloneConnectivityResult {
  const resolution = resolveAgentLeeRootDetails(context);
  const { paths } = resolution;

  return {
    valid: resolution.rootSource !== "degraded" && resolution.missingConnectivityPaths.length === 0,
    root: resolution.root,
    rootSource: resolution.rootSource,
    missing: resolution.missingConnectivityPaths,
    missingConnectivityPaths: resolution.missingConnectivityPaths,
    paths
  };
}

export function loadLeewaySdkManifest(context?: vscode.ExtensionContext) {
  return readJson(path.join(getInternalSdkRoot(context), "leeway-sdk", "manifest.json"), {});
}

export function loadAgentRegistry(context?: vscode.ExtensionContext) {
  return readJson(path.join(getInternalAgentsRoot(context), "registry", "agent-registry.json"), {});
}

export function loadMcpRegistry(context?: vscode.ExtensionContext) {
  return readJson(path.join(getInternalMcpRoot(context), "mcp-registry.json"), {});
}

export function loadStandardsCanon(context?: vscode.ExtensionContext) {
  return readJson(path.join(getInternalStandardsRoot(context), "leeway-standards-canon.json"), {});
}

export function loadCollaborationContract(context?: vscode.ExtensionContext) {
  return readText(path.join(getInternalGovernanceRoot(context), "law", "CollaborationContract.ts"));
}

export function loadAllowedTransitions(context?: vscode.ExtensionContext) {
  return readText(path.join(getInternalGovernanceRoot(context), "law", "AllowedTransitions.ts"));
}
