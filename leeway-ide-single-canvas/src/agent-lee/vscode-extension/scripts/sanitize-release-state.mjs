/*
LEEWAY_HEADER - DO NOT REMOVE

REGION: CORE
TAG: CORE.RUNTIME.EXTENSION.RELEASE_STATE_SANITIZER
PURPOSE: Sanitizes packaged runtime state so VSIX releases cannot bake stale active-host truth into the extension payload.
DISCOVERY_PIPELINE: Voice -> Intent -> Location -> Vertical -> Ranking -> Render
*/

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..");
const packageJsonPath = path.join(root, "package.json");
const runtimeRegistryPath = path.join(root, "runtime", "leeway-extension-update-registry.json");
const vscodeIgnorePath = path.join(root, ".vscodeignore");
const reportPath = path.join(root, "test-evidence", "leeway-release-state-sanitizer-result.json");

const REQUIRED_IGNORE_RULES = [
  "receipts/**",
  "runtime/**/*.receipt.*",
  "runtime/**/*.report.*"
];

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function normalize(value) {
  return String(value || "").trim();
}

function createSanitizedSeed(packageJson, existing = {}) {
  const buildIdentity = packageJson.buildIdentity || {};
  return {
    extensionId: `leeway.${normalize(packageJson.name)}`,
    channel: normalize(existing.channel) || "stable",
    approvedCanonicalVersion: normalize(packageJson.version),
    approvedCanonicalBuildHash: normalize(buildIdentity.buildHash),
    approvedBuildTimestamp: normalize(buildIdentity.buildTimestamp),
    sourceCommit: normalize(existing.sourceCommit) || "unknown",
    vsixSha256: normalize(existing.vsixSha256) || "unknown",
    packageUri: normalize(existing.packageUri) || "unknown",
    installedVersion: "",
    installedBuildHash: "",
    activeHostVersion: "",
    activeHostBuildHash: "",
    updateState: "ACTIVE_HOST_EVALUATION_REQUIRED",
    reloadRequired: false,
    restartRequired: false,
    canonicalReplacementAvailable: false,
    canonicalReplacementVersion: "",
    canonicalReplacementBuildHash: "",
    staleBuildRejected: false,
    failClosedReason: "",
    promotionAllowed: false,
    promotionBlocker: "AWAITING_ACTIVATION_ATTESTATION",
    currentTruthReceiptId: "",
    canonicalInstallReceiptId: "",
    evidenceRegenerationRequired: false,
    policyState: "evaluation-required",
    leeway: {
      LEEWAY_HEADER: "DO NOT REMOVE",
      REGION: "CORE",
      TAG: "CORE.RUNTIME.EXTENSION.UPDATE_REGISTRY",
      PURPOSE: "Release-safe lifecycle seed and activation-updated host truth registry for the packaged Agent Lee extension.",
      DISCOVERY_PIPELINE: "Voice -> Intent -> Location -> Vertical -> Ranking -> Render"
    }
  };
}

function collectSeedViolations(existing, sanitized, packageJson) {
  const violations = [];
  const currentVersion = normalize(packageJson.version);
  const currentBuildHash = normalize(packageJson.buildIdentity?.buildHash);
  const existingPolicyState = normalize(existing.policyState).toLowerCase();

  if (existingPolicyState === "fail-closed-active-host-blocked") {
    violations.push("STALE_POLICY_BLOCKER_PRESENT");
  }
  if (normalize(existing.activeHostVersion) && normalize(existing.activeHostVersion) !== currentVersion) {
    violations.push("STALE_ACTIVE_HOST_VERSION_PRESENT");
  }
  if (normalize(existing.activeHostBuildHash) && normalize(existing.activeHostBuildHash) !== currentBuildHash) {
    violations.push("STALE_ACTIVE_HOST_BUILD_HASH_PRESENT");
  }
  if (normalize(existing.installedVersion)) {
    violations.push("INSTALLED_VERSION_SHOULD_NOT_SHIP");
  }
  if (normalize(existing.installedBuildHash)) {
    violations.push("INSTALLED_BUILD_HASH_SHOULD_NOT_SHIP");
  }
  if (normalize(existing.failClosedReason)) {
    violations.push("FAIL_CLOSED_REASON_SHOULD_NOT_SHIP");
  }
  if (normalize(existing.policyState) && normalize(existing.policyState) !== normalize(sanitized.policyState)) {
    violations.push("NON_NEUTRAL_POLICY_STATE_PRESENT");
  }
  if (normalize(existing.updateState) && normalize(existing.updateState) !== normalize(sanitized.updateState)) {
    violations.push("NON_NEUTRAL_UPDATE_STATE_PRESENT");
  }
  if (existing.promotionAllowed === true) {
    violations.push("PROMOTION_ALLOWED_SHOULD_NOT_SHIP");
  }
  return violations;
}

function collectRuntimeJsonFiles() {
  const runtimeRoot = path.join(root, "runtime");
  if (!fs.existsSync(runtimeRoot)) {
    return [];
  }

  return fs.readdirSync(runtimeRoot, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
    .map((entry) => path.join("runtime", entry.name));
}

const packageJson = readJson(packageJsonPath);
const existingRegistry = fs.existsSync(runtimeRegistryPath) ? readJson(runtimeRegistryPath) : {};
const sanitizedRegistry = createSanitizedSeed(packageJson, existingRegistry);
const seedViolations = collectSeedViolations(existingRegistry, sanitizedRegistry, packageJson);

writeJson(runtimeRegistryPath, sanitizedRegistry);

const persistedRegistry = readJson(runtimeRegistryPath);
const remainingViolations = collectSeedViolations(persistedRegistry, sanitizedRegistry, packageJson);
const ignoreContent = fs.readFileSync(vscodeIgnorePath, "utf8");
const missingIgnoreRules = REQUIRED_IGNORE_RULES.filter((rule) => !ignoreContent.includes(rule));
const runtimeJsonFiles = collectRuntimeJsonFiles();

const report = {
  timestamp: new Date().toISOString(),
  packageVersion: normalize(packageJson.version),
  packageBuildHash: normalize(packageJson.buildIdentity?.buildHash),
  runtimeJsonFiles,
  runtimeRegistryPath: "runtime/leeway-extension-update-registry.json",
  detectedViolationsBeforeSanitization: seedViolations,
  missingIgnoreRules,
  sanitizedRegistry,
  remainingViolationsAfterSanitization: remainingViolations,
  passed: remainingViolations.length === 0 && missingIgnoreRules.length === 0
};

writeJson(reportPath, report);

if (!report.passed) {
  console.error("Release state sanitizer blocked packaging.");
  process.exit(1);
}

console.log(`Release state sanitizer wrote ${reportPath}`);
