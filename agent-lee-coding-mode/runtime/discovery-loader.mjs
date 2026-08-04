import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const AGENT_LEE_ROOT = path.resolve(__dirname, "..");
const WORKSPACE_ROOT = path.resolve(AGENT_LEE_ROOT, "..");
const ACTIVE_STANDARDS_ROOT = path.join(WORKSPACE_ROOT, "LeeWay-Standards");
const DEPRECATED_STANDARDS_ROOT = path.join(WORKSPACE_ROOT, "Leeway-Standards");
const ARCHIVED_STANDARDS_ROOT = path.join(WORKSPACE_ROOT, "Archive", "docs", "deprecated-standards-roots", "Leeway-Standards");
const DISCOVERY_INDEX_CANDIDATES = [
  path.join(AGENT_LEE_ROOT, "source-index", "all-leeway-files.index.json.new"),
  path.join(AGENT_LEE_ROOT, "source-index", "all-leeway-files.index.json"),
  path.join(AGENT_LEE_ROOT, "source-index", "all-leeway-files.index.json.backup")
];
const GOVERNANCE_MANIFEST_CANDIDATES = [
  path.join(ACTIVE_STANDARDS_ROOT, "runtime-governance-manifest.json")
];
const STANDARDS_ROOT_MAP_CANDIDATES = [
  path.join(ACTIVE_STANDARDS_ROOT, "standards-root-map.json"),
  path.join(ARCHIVED_STANDARDS_ROOT, "standards-root-map.json")
];

function stripBom(raw) {
  return String(raw || "").replace(/^\uFEFF/, "");
}

function tolerantJsonParse(raw) {
  const clean = stripBom(raw);
  try {
    return JSON.parse(clean);
  } catch (err) {
    // Try to recover by locating the last JSON object in the stream
    const lastOpen = clean.lastIndexOf("{");
    const lastClose = clean.lastIndexOf("}");
    if (lastOpen !== -1 && lastClose !== -1 && lastClose > lastOpen) {
      const candidate = clean.substring(lastOpen, lastClose + 1);
      try {
        return JSON.parse(candidate);
      } catch (err2) {
        // Try first-to-last braces
        const firstOpen = clean.indexOf("{");
        if (firstOpen !== -1 && lastClose > firstOpen) {
          try {
            return JSON.parse(clean.substring(firstOpen, lastClose + 1));
          } catch (err3) {
            return null;
          }
        }
        return null;
      }
    }
    return null;
  }
}

function loadFirstJsonCandidate(candidates) {
  for (const candidate of candidates) {
    try {
      if (!fs.existsSync(candidate)) continue;
      const raw = fs.readFileSync(candidate, "utf8");
      const parsed = tolerantJsonParse(raw);
      if (!parsed) continue;
      return { path: candidate, parsed };
    } catch (err) {
      // ignore and continue
    }
  }
  return null;
}

function normalizeStandardsRootMap(map) {
  if (!map || typeof map !== "object") return null;
  const archivedRoots = Array.isArray(map.archivedRoots) ? map.archivedRoots.filter(Boolean) : [];
  return {
    canonicalRoot: typeof map.canonicalRoot === "string" && map.canonicalRoot ? map.canonicalRoot : "LeeWay-Standards",
    archivedRoots,
    mergeTimestamp: typeof map.mergeTimestamp === "string" ? map.mergeTimestamp : null,
    filesMerged: Number.isFinite(map.filesMerged) ? map.filesMerged : 0,
    conflictsResolved: Number.isFinite(map.conflictsResolved) ? map.conflictsResolved : 0,
    conflictsRemaining: Number.isFinite(map.conflictsRemaining) ? map.conflictsRemaining : 0,
    writePolicy: typeof map.writePolicy === "string" ? map.writePolicy : "All new standards writes must go to LeeWay-Standards.",
    discoveryPolicy: typeof map.discoveryPolicy === "string" ? map.discoveryPolicy : "Only canonical root is active. Archived roots are excluded from runtime discovery.",
    receiptRequired: map.receiptRequired !== false
  };
}

function inspectStandardsRootState(rootMap) {
  const warnings = [];
  const archivedRoots = rootMap && Array.isArray(rootMap.archivedRoots) ? rootMap.archivedRoots.slice() : [path.join("Archive", "docs", "deprecated-standards-roots", "Leeway-Standards")];
  const canonicalRootExists = fs.existsSync(ACTIVE_STANDARDS_ROOT);
  const canonicalReal = canonicalRootExists ? fs.realpathSync(ACTIVE_STANDARDS_ROOT) : null;
  const deprecatedReal = fs.existsSync(DEPRECATED_STANDARDS_ROOT) ? fs.realpathSync(DEPRECATED_STANDARDS_ROOT) : null;
  const deprecatedRootExistsOutsideArchive = Boolean(deprecatedReal && canonicalReal && deprecatedReal.toLowerCase() !== canonicalReal.toLowerCase());
  const archivedRootExists = fs.existsSync(path.join(WORKSPACE_ROOT, archivedRoots[0] || ""));

  if (!canonicalRootExists) {
    warnings.push(`canonical standards root missing: ${ACTIVE_STANDARDS_ROOT}`);
  }
  if (deprecatedRootExistsOutsideArchive) {
    warnings.push(`deprecated standards root still active outside archive: ${DEPRECATED_STANDARDS_ROOT}`);
  }
  if (!archivedRootExists && archivedRoots.length > 0) {
    warnings.push(`archived standards root missing: ${archivedRoots[0]}`);
  }
  if (rootMap && rootMap.canonicalRoot && rootMap.canonicalRoot !== "LeeWay-Standards") {
    warnings.push(`standards-root-map canonicalRoot mismatch: ${rootMap.canonicalRoot}`);
  }

  return {
    canonicalRoot: "LeeWay-Standards",
    archivedRoots,
    canonicalRootExists,
    deprecatedRootExistsOutsideArchive,
    archivedRootExists,
    warnings
  };
}

export async function loadAllLeewayIndex() {
  let indexObj = null;
  let indexPath = null;

  for (const candidate of DISCOVERY_INDEX_CANDIDATES) {
    if (!fs.existsSync(candidate)) continue;
    const raw = await fs.promises.readFile(candidate, "utf8");
    const parsed = tolerantJsonParse(raw);
    if (!parsed) continue;
    indexObj = Array.isArray(parsed) ? { files: parsed } : parsed;
    indexPath = candidate;
    break;
  }

  if (!indexObj) return null;
  indexObj.discoveryIndexPath = indexPath;
  indexObj.discoveryIndexCandidates = DISCOVERY_INDEX_CANDIDATES.slice();
  const standardsRootMapEntry = loadFirstJsonCandidate(STANDARDS_ROOT_MAP_CANDIDATES);
  const standardsRootMap = normalizeStandardsRootMap(standardsRootMapEntry && standardsRootMapEntry.parsed);
  const standardsRootState = inspectStandardsRootState(standardsRootMap);
  indexObj.standardsRootMap = standardsRootMap;
  indexObj.standardsRootMapPath = standardsRootMapEntry ? standardsRootMapEntry.path : null;
  indexObj.standardsRootState = standardsRootState;
  indexObj.activeStandardsRoot = standardsRootState.canonicalRoot;
  indexObj.archivedStandardsRoots = standardsRootState.archivedRoots.slice();
  indexObj.standardsRootWarnings = standardsRootState.warnings.slice();

  // Try to load governance manifest from the canonical standards root first.
  for (const govPath of GOVERNANCE_MANIFEST_CANDIDATES) {
    try {
      if (!fs.existsSync(govPath)) continue;
      const govRaw = await fs.promises.readFile(govPath, "utf8");
      const govParsed = tolerantJsonParse(govRaw);
      if (govParsed) {
        indexObj.governanceManifest = govParsed;
        indexObj.governanceManifestPath = govPath;
        break;
      }
    } catch (err) {
      // ignore
    }
  }

  return indexObj;
}

export function findModelRole(index, roleName) {
  if (!index) return null;
  // First, check index-provided modelRoles
  if (index.modelRoles && index.modelRoles[roleName]) return index.modelRoles[roleName];

  // Next, check canonical model authority manifest under Leeway Runtime Fabric (discovery-first)
  try {
    const modelAuthorityPath = path.join(AGENT_LEE_ROOT, '..', 'Leeway Runtime Fabric', 'capability-registry', 'registry', 'model-authority.json');
    if (fs.existsSync(modelAuthorityPath)) {
      const raw = stripBom(fs.readFileSync(modelAuthorityPath, 'utf8'));
      const mab = tolerantJsonParse(raw);
      if (mab && mab.modelRoles && mab.modelRoles[roleName]) return mab.modelRoles[roleName];
    }
  } catch (err) {
    // ignore and continue
  }
  // Try to find an external updated-model-hive-registry reference inside index.files
  if (Array.isArray(index.files)) {
    const hive = index.files.find((f) => {
      const fullName = typeof f === "string"
        ? f
        : f && typeof f.FullName === "string"
          ? f.FullName
          : f && typeof f.fullName === "string"
            ? f.fullName
            : "";
      return fullName.endsWith("updated-model-hive-registry.json");
    });
    if (hive) {
      try {
        const hivePathRaw = typeof hive === "string"
          ? hive
          : hive && typeof hive.FullName === "string"
            ? hive.FullName
            : hive && typeof hive.fullName === "string"
              ? hive.fullName
              : "";
        const hivePath = path.isAbsolute(hivePathRaw)
          ? hivePathRaw
          : path.join(AGENT_LEE_ROOT, hivePathRaw);
        if (fs.existsSync(hivePath)) {
          const raw = stripBom(fs.readFileSync(hivePath, "utf8"));
          const parsed = tolerantJsonParse(raw);
          if (parsed && parsed.modelRoles && parsed.modelRoles[roleName]) return parsed.modelRoles[roleName];
        }
      } catch (err) {
        // ignore and fallthrough
      }
    }
  }
  return null;
}

export default {
  loadAllLeewayIndex,
  findModelRole
};
