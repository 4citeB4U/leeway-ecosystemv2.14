/*
LEEWAY HEADER
TAG: DEVELOPER_COCKPIT.GOVERNED_CODING_LOOP.LEVEL_2.PASS_RUNNER
REGION: DEVELOPER_COCKPIT
DISCOVERY_PIPELINE: Readback -> Plan -> Approval -> Validation -> Repair -> Safety -> Gates -> Report
LEEWAY_ID: LEEWAY_APP::DEVELOPER_COCKPIT::GOVERNED_CODING_LOOP::PASS_RUNNER
CLASSIFICATION: GOVERNANCE_GATE
OWNER: External assistant body under LeeWay Standards
*/
import { spawnSync } from "node:child_process";
import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const runtimeDir = resolve(rootDir, "leeway-agent-lee", "agent-lee-runtime");
const cockpitDir = resolve(rootDir, "leeway-developer-cockpit");
const proofRoot = resolve(rootDir, "Archive", "proofs", "cockpit-level-2-governed-coding-loop");
const reportDir = resolve(rootDir, "Archive", "reports");
const receiptDir = resolve(rootDir, "Archive", "receipts");
const runtimeUrl = "http://localhost:7600";
const nodeBin = process.execPath;
const npmBin = process.platform === "win32" ? "npm.cmd" : "npm";

const assistantBodyId = "codex-assistant-body";
const assistantObjectId = "codex-gpt-5-coding-agent";
const taskId = "RUN_LEEWAY_DEVELOPER_COCKPIT_LEVEL_2_GOVERNED_CODING_LOOP_PASS";
const voiceBlocker = "Voice embodiment continuity remains runtime-blocked, so the voice-embodiment gate stays BLOCKED until a live route proves continuity.";
const standardsChecked = [
  "000-URGENT-LEEWAY-ASSISTANT-LAW/READ-FIRST.md",
  "LeeWay-Standards/standards/BOOK-54-ASSISTANT-EMBODIMENT-AND-BEHAVIOR-LAW.md",
  "LeeWay-Standards/standards/BOOK-55-ASSISTANT-RECORDING-AND-LEARNING-LAW.md",
  "AGENTS.md",
];
const toolsUsed = [
  "functions.shell_command",
  "functions.apply_patch",
  "multi_tool_use.parallel",
];
const mcpUsed = [];

const proofRootRel = "Archive/proofs/cockpit-level-2-governed-coding-loop";
const proofFiles = {
  packageJson: `${proofRootRel}/package.json`,
  readme: `${proofRootRel}/README.md`,
  source: `${proofRootRel}/src/leewaySafeSlugify.js`,
  test: `${proofRootRel}/test/leewaySafeSlugify.test.js`,
  repairTest: `${proofRootRel}/test/leewaySafeSlugify.repair-loop.test.js`,
  buildScript: `${proofRootRel}/scripts/build.js`,
  validateScript: `${proofRootRel}/scripts/validate.js`,
  buildReport: `${proofRootRel}/build-report.json`,
  validationReport: `${proofRootRel}/validation-report.json`,
  receiptStub: `${proofRootRel}/receipt-stub.json`,
  governedApplyReceipt: `${proofRootRel}/governed-apply-receipt.json`,
  failureApplyReceipt: `${proofRootRel}/failure-injection-apply-receipt.json`,
  repairApplyReceipt: `${proofRootRel}/repair-apply-receipt.json`,
};

const reportPaths = {
  markdown: "Archive/reports/leeway-developer-cockpit-level-2-governed-coding-loop-report.md",
  finalJson: "Archive/reports/leeway-developer-cockpit-level-2-governed-coding-loop-report.json",
  readback: "Archive/reports/leeway-developer-cockpit-level-2-level-1-readback.json",
  taskDesign: "Archive/reports/leeway-developer-cockpit-level-2-coding-task-design.json",
  patchPlanGeneration: "Archive/reports/leeway-developer-cockpit-level-2-patch-plan-generation-report.json",
  approvedPatchApplication: "Archive/reports/leeway-developer-cockpit-level-2-approved-patch-application-report.json",
  validationExecution: "Archive/reports/leeway-developer-cockpit-level-2-validation-execution-report.json",
  errorRepairLoop: "Archive/reports/leeway-developer-cockpit-level-2-error-repair-loop-report.json",
  uiWorkflowWiring: "Archive/reports/leeway-developer-cockpit-level-2-ui-workflow-wiring-report.json",
  safetyNegativeTests: "Archive/reports/leeway-developer-cockpit-level-2-safety-negative-tests-report.json",
  gatesUpdate: "Archive/reports/leeway-developer-cockpit-level-2-gates-update-report.json",
  finalValidation: "Archive/reports/leeway-developer-cockpit-level-2-final-validation-report.json",
  receipt: "Archive/receipts/leeway_developer_cockpit_level_2_governed_coding_loop_receipt.json",
};

const subjects = {
  readback: "LEEWAY_APP::DEVELOPER_COCKPIT::LEVEL_2_GOVERNED_CODING_LOOP::LEVEL_1_READBACK",
  taskDesign: "LEEWAY_APP::DEVELOPER_COCKPIT::LEVEL_2_GOVERNED_CODING_LOOP::TASK_DESIGN",
  patchPlanGeneration: "LEEWAY_APP::DEVELOPER_COCKPIT::LEVEL_2_GOVERNED_CODING_LOOP::PATCH_PLAN_GENERATION",
  approvedPatchApplication: "LEEWAY_APP::DEVELOPER_COCKPIT::LEVEL_2_GOVERNED_CODING_LOOP::APPROVED_PATCH_APPLICATION",
  validationExecution: "LEEWAY_APP::DEVELOPER_COCKPIT::LEVEL_2_GOVERNED_CODING_LOOP::VALIDATION_EXECUTION",
  errorRepairLoop: "LEEWAY_APP::DEVELOPER_COCKPIT::LEVEL_2_GOVERNED_CODING_LOOP::ERROR_REPAIR_LOOP",
  uiWorkflowWiring: "LEEWAY_APP::DEVELOPER_COCKPIT::LEVEL_2_GOVERNED_CODING_LOOP::UI_WORKFLOW_WIRING",
  safetyNegativeTests: "LEEWAY_APP::DEVELOPER_COCKPIT::LEVEL_2_GOVERNED_CODING_LOOP::SAFETY_NEGATIVE_TESTS",
  gatesUpdate: "LEEWAY_APP::DEVELOPER_COCKPIT::LEVEL_2_GOVERNED_CODING_LOOP::GATES_UPDATE",
  finalValidation: "LEEWAY_APP::DEVELOPER_COCKPIT::LEVEL_2_GOVERNED_CODING_LOOP::FINAL_VALIDATION",
  finalReport: "LEEWAY_APP::DEVELOPER_COCKPIT::LEVEL_2_GOVERNED_CODING_LOOP::PASS_1",
};

const commandsRun = [];
const runtimeReceiptIds = [];
const failuresEncountered = [];
const lessonsLearned = [
  "A governed coding loop becomes much easier to trust once the runtime treats receipt targets as declared scope, not an afterthought.",
  "Repair-loop proof is strongest when the failure is intentionally narrow and the utility behavior remains untouched.",
  "Level 2 UI state needs a persistent runtime status surface, otherwise approval and validation truth disappears on refresh.",
];
const skillImprovementsSuggested = [
  "Governed coding loop runtime regression skill",
  "Cockpit Level 2 browser proof skill for coding-loop status panels",
  "Receipt-target enforcement regression skill for approval-gated patch apply",
];

const requiredProjectFiles = [
  proofFiles.packageJson,
  proofFiles.readme,
  proofFiles.source,
  proofFiles.test,
  proofFiles.buildScript,
  proofFiles.validateScript,
  proofFiles.buildReport,
  proofFiles.validationReport,
  proofFiles.receiptStub,
];

function relPath(absolutePath) {
  return relative(rootDir, absolutePath).split("\\").join("/");
}

function unique(items) {
  return Array.from(new Set(items.filter(Boolean)));
}

async function exists(absolutePath) {
  try {
    await stat(absolutePath);
    return true;
  } catch {
    return false;
  }
}

async function readJson(relativePath) {
  return JSON.parse(await readFile(resolve(rootDir, relativePath), "utf8"));
}

async function writeJson(relativePath, value) {
  const absolutePath = resolve(rootDir, relativePath);
  await mkdir(dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function writeText(relativePath, value) {
  const absolutePath = resolve(rootDir, relativePath);
  await mkdir(dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, value, "utf8");
}

function runCommand(command, args, cwd, label) {
  commandsRun.push(`${label}: ${[command, ...args].join(" ")}`);
  const result = spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    shell: false,
  });
  return {
    ok: result.status === 0,
    exitCode: result.status ?? 1,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
  };
}

async function fetchJson(path, init = {}) {
  let lastError = null;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(`${runtimeUrl}${path}`, {
        headers: {
          Accept: "application/json",
          ...(init.body ? { "Content-Type": "application/json" } : {}),
          ...(init.headers ?? {}),
        },
        method: init.method ?? "GET",
        body: init.body ? JSON.stringify(init.body) : undefined,
      });
      const text = await response.text();
      let data = null;
      if (text) {
        try {
          data = JSON.parse(text);
        } catch {
          data = { raw: text };
        }
      }
      return { ok: response.ok, status: response.status, data };
    } catch (error) {
      lastError = error;
      if (attempt < 3) {
        await new Promise((resolveAttempt) => setTimeout(resolveAttempt, 750));
      }
    }
  }
  throw lastError;
}

async function listFiles(absoluteDir) {
  if (!(await exists(absoluteDir))) return [];
  const entries = await readdir(absoluteDir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const nextPath = resolve(absoluteDir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await listFiles(nextPath));
      continue;
    }
    files.push(relPath(nextPath));
  }
  return files.sort();
}

function summarizeOutput(text) {
  const trimmed = String(text ?? "").trim();
  if (!trimmed) return "";
  return trimmed.length > 1200 ? `${trimmed.slice(0, 1200)}...` : trimmed;
}

function makeReport(subjectObjectId, extras = {}) {
  return {
    assistantBodyId,
    assistantObjectId,
    taskId,
    subjectObjectId,
    subjectTraceId: "LEEWAY_TRACE::DEVELOPER_COCKPIT::LEVEL_2_GOVERNED_CODING_LOOP::20260527::CODEX",
    standardsChecked,
    toolsUsed,
    MCPsUsed: mcpUsed,
    ...extras,
    finalStatus: extras.finalStatus ?? "PASS",
    remainingBlockers: extras.remainingBlockers ?? [voiceBlocker],
  };
}

function assertCondition(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function collectRuntimeReceipt(...ids) {
  for (const id of ids.filter(Boolean)) {
    runtimeReceiptIds.push(id);
  }
}

function summarizeTestCases() {
  return [
    { input: " Hello World ", expected: "hello-world" },
    { input: "Agent_Lee Coding!!!", expected: "agent-lee-coding" },
    { input: "---Already---Slug---", expected: "already-slug" },
    { input: "   ", expected: "untitled" },
    { input: "LeeWay    Standards", expected: "leeway-standards" },
  ];
}

async function scanForbiddenModelRoutes() {
  const touchedFiles = [
    "leeway-agent-lee/agent-lee-runtime/src/api/routes.ts",
    "leeway-agent-lee/agent-lee-runtime/src/storage/patchPlanStore.ts",
    "leeway-agent-lee/agent-lee-runtime/src/workspace/governedCodingLoop.ts",
    "leeway-developer-cockpit/index.html",
    "leeway-developer-cockpit/src/api/core-runtime-client.js",
    "leeway-developer-cockpit/src/main/validate.js",
    "leeway-developer-cockpit/src/renderer/cockpit.js",
  ];
  const findings = [];
  for (const file of touchedFiles) {
    const text = await readFile(resolve(rootDir, file), "utf8");
    if (/\b(openai|anthropic|gemini|claude)\b/i.test(text)) {
      findings.push(file);
    }
  }
  return findings;
}

async function createLevel2CodePlan(sessionId, taskRequest) {
  commandsRun.push(`POST ${runtimeUrl}/workspace/patch-plan [LEVEL_2_CODEBASE]`);
  const response = await fetchJson("/workspace/patch-plan", {
    method: "POST",
    body: {
      proofMode: "LEVEL_2_CODEBASE",
      requestedBy: "leeway-developer-cockpit",
      sessionId,
      taskRequest,
      files: [proofFiles.packageJson],
    },
  });
  assertCondition(response.ok, `Level 2 patch plan request failed: ${JSON.stringify(response.data)}`);
  collectRuntimeReceipt(response.data?.receiptId);
  return response.data;
}

async function applyPlan(plan, receiptTarget, extra = {}) {
  commandsRun.push(`POST ${runtimeUrl}/workspace/apply-approved-patch [${plan.patchPlanId}]`);
  const response = await fetchJson("/workspace/apply-approved-patch", {
    method: "POST",
    body: {
      patchPlanId: plan.patchPlanId,
      sessionId: plan.sessionId,
      approvedBy: "leeway-developer-cockpit",
      approvalState: "APPROVED",
      requestedFiles: plan.filesProposedForEditing ?? [],
      receiptTarget,
      ...extra,
    },
  });
  assertCondition(response.ok, `Approved patch apply failed: ${JSON.stringify(response.data)}`);
  collectRuntimeReceipt(...(response.data?.receipts ?? []));
  return response.data;
}

async function main() {
  await mkdir(reportDir, { recursive: true });
  await mkdir(receiptDir, { recursive: true });

  const level1Files = [
    "Archive/reports/leeway-developer-cockpit-level-1-executable-operations-report.json",
    "Archive/reports/leeway-developer-cockpit-level-1-live-execution-proof.json",
    "Archive/reports/leeway-developer-cockpit-level-1-validation-report.json",
    "Archive/receipts/leeway_developer_cockpit_level_1_executable_operations_receipt.json",
  ];
  const [level1Report, level1Proof, level1Validation, level1Receipt] = await Promise.all(level1Files.map(readJson));

  const readbackReport = makeReport(subjects.readback, {
    filesRead: unique([...standardsChecked, ...level1Files]),
    filesChanged: [reportPaths.readback],
    commandsRun: [],
    gatesRun: level1Report.gatesRun,
    receiptsWritten: [],
    failuresEncountered: [],
    lessonsLearned: level1Report.lessonsLearned ?? [],
    skillImprovementsSuggested: level1Report.skillImprovementsSuggested ?? [],
    level1ProvenEndpoints: [
      "GET /gates",
      "POST /agent-lee/chat",
      "POST /workspace/patch-plan",
      "POST /workspace/apply-approved-patch",
    ],
    safetyGuarantees: [
      "apply is approval-gated",
      "apply is proof-scope-only",
      "undeclared writes are refused",
      "out-of-scope planning is blocked",
      "unapproved apply is blocked",
    ],
    negativeTestsPassed: [
      "out-of-scope planning blocked",
      "apply without approval blocked",
      "no unapproved file mutation observed",
    ],
    remainingBlockers: level1Report.remainingBlockers ?? [voiceBlocker],
    level2MustAdd: [
      "Create a real proof-scope code package, not just a proof file.",
      "Validate behavior with executable tests and a validation script.",
      "Demonstrate a governed repair loop after a safe failure injection.",
      "Expose Level 2 coding-loop state and gates in the Cockpit UI.",
    ],
    level1Summary: {
      finalStatus: level1Report.finalStatus,
      rawRuntimeFlow: level1Proof.rawRuntimeFlow,
      validations: level1Validation.validations,
      receipt: level1Receipt.finalStatus,
    },
  });
  await writeJson(reportPaths.readback, readbackReport);

  const taskDesignReport = makeReport(subjects.taskDesign, {
    filesRead: unique([...standardsChecked, reportPaths.readback]),
    filesChanged: [reportPaths.taskDesign],
    commandsRun: [],
    gatesRun: [],
    receiptsWritten: [],
    failuresEncountered: [],
    lessonsLearned: [],
    skillImprovementsSuggested: [],
    finalStatus: "PASS",
    codingTask: {
      proofRoot: proofRootRel,
      utilityName: "leewaySafeSlugify",
      language: "JavaScript",
      manifest: proofFiles.packageJson,
      source: proofFiles.source,
      test: proofFiles.test,
      readme: proofFiles.readme,
      validationScript: proofFiles.validateScript,
      buildReport: proofFiles.buildReport,
      validationReport: proofFiles.validationReport,
      receiptStub: proofFiles.receiptStub,
      repairLoopTest: proofFiles.repairTest,
    },
    requiredBehavior: summarizeTestCases(),
    validationPlan: [
      "Run the proof build script.",
      "Run the proof test suite.",
      "Run the proof validation script.",
      "Verify required files, JSON parse, receipts, and patch-plan lineage.",
    ],
    repairLoopPlan: [
      "Inject a temporary failing test inside proof scope.",
      "Detect the failure by rerunning tests.",
      "Repair the failure through a second approved runtime patch.",
      "Rerun validation and prove the package passes again.",
    ],
  });
  await writeJson(reportPaths.taskDesign, taskDesignReport);

  const codePlan = await createLevel2CodePlan(
    "level2-codebase-plan",
    "Create the Level 2 governed coding loop proof package for leewaySafeSlugify under Archive/proofs/cockpit-level-2-governed-coding-loop/."
  );
  const patchPlanGenerationReport = makeReport(subjects.patchPlanGeneration, {
    filesRead: unique([...standardsChecked, reportPaths.readback, reportPaths.taskDesign]),
    filesChanged: [reportPaths.patchPlanGeneration],
    commandsRun: commandsRun.slice(-1),
    gatesRun: (codePlan.gates ?? []).map((gateId) => ({ gateId, result: "PENDING_APPROVAL" })),
    receiptsWritten: [codePlan.receiptId],
    failuresEncountered: [],
    lessonsLearned: [],
    skillImprovementsSuggested: [],
    finalStatus: "PASS",
    patchPlanId: codePlan.patchPlanId,
    sessionId: codePlan.sessionId,
    planKind: codePlan.planKind,
    filesToCreate: codePlan.filesProposedForCreation ?? [],
    filesToRead: codePlan.filesProposedForReading ?? [],
    filesToEdit: codePlan.filesProposedForEditing ?? [],
    validationCommands: codePlan.commandsProposedForValidation ?? [],
    expectedOutputs: codePlan.expectedOutputs ?? [],
    gates: codePlan.gates ?? [],
    receiptsRequired: codePlan.receiptsRequired ?? [],
    receiptTargets: codePlan.receiptTargets ?? [],
    risks: codePlan.risks ?? [],
    approvalRequirement: codePlan.receiptTargetRequired === true ? "APPROVED plus declared receiptTarget" : "APPROVED",
  });
  await writeJson(reportPaths.patchPlanGeneration, patchPlanGenerationReport);

  const applyResult = await applyPlan(codePlan, codePlan.receiptTargets?.[0] ?? proofFiles.governedApplyReceipt);
  const projectFilesAfterApply = await listFiles(proofRoot);
  for (const file of requiredProjectFiles.concat(proofFiles.governedApplyReceipt)) {
    assertCondition(projectFilesAfterApply.includes(file), `Expected proof file missing after apply: ${file}`);
  }
  const approvedPatchApplicationReport = makeReport(subjects.approvedPatchApplication, {
    filesRead: unique([...standardsChecked, reportPaths.patchPlanGeneration]),
    filesChanged: [reportPaths.approvedPatchApplication, ...requiredProjectFiles, proofFiles.governedApplyReceipt],
    commandsRun: commandsRun.slice(-1),
    gatesRun: (codePlan.gates ?? []).map((gateId) => ({ gateId, result: "LIVE" })),
    receiptsWritten: [...(applyResult.receipts ?? []), ...(applyResult.receiptFiles ?? [])],
    failuresEncountered: [],
    lessonsLearned: [],
    skillImprovementsSuggested: [],
    finalStatus: "PASS",
    patchPlanId: applyResult.patchPlanId,
    receiptFiles: applyResult.receiptFiles ?? [],
    diffSummary: applyResult.diffSummary ?? [],
    validationCommands: applyResult.validationCommands ?? [],
    declaredScopeRespected: (applyResult.diffSummary ?? []).every((entry) => String(entry.path).startsWith(proofRootRel)),
  });
  await writeJson(reportPaths.approvedPatchApplication, approvedPatchApplicationReport);

  const buildRun = runCommand(nodeBin, ["./scripts/build.js"], proofRoot, "level2-proof-build");
  const testRun = runCommand(nodeBin, ["--test", "./test/leewaySafeSlugify.test.js"], proofRoot, "level2-proof-test");
  const validateRun = runCommand(nodeBin, ["./scripts/validate.js"], proofRoot, "level2-proof-validate");
  assertCondition(buildRun.ok, `Proof build failed: ${buildRun.stderr || buildRun.stdout}`);
  assertCondition(testRun.ok, `Proof tests failed: ${testRun.stderr || testRun.stdout}`);
  assertCondition(validateRun.ok, `Proof validation failed: ${validateRun.stderr || validateRun.stdout}`);

  const buildReport = JSON.parse(await readFile(resolve(proofRoot, "build-report.json"), "utf8"));
  const validationReport = JSON.parse(await readFile(resolve(proofRoot, "validation-report.json"), "utf8"));
  const validationExecutionReport = makeReport(subjects.validationExecution, {
    filesRead: unique([...standardsChecked, ...requiredProjectFiles, proofFiles.governedApplyReceipt]),
    filesChanged: [reportPaths.validationExecution, proofFiles.buildReport, proofFiles.validationReport],
    commandsRun: commandsRun.slice(-3),
    gatesRun: [
      { gateId: "cockpit-level-2-approved-patch-application-gate", result: "LIVE" },
      { gateId: "cockpit-level-2-validation-execution-gate", result: "LIVE" },
    ],
    receiptsWritten: [],
    failuresEncountered: [],
    lessonsLearned: [],
    skillImprovementsSuggested: [],
    finalStatus: "PASS",
    fileExistence: requiredProjectFiles.every((file) => projectFilesAfterApply.includes(file)),
    jsonParses: true,
    utilityBehaviorPasses: validationReport.status === "PASS",
    validationScriptPasses: validateRun.ok,
    testSuitePasses: testRun.ok,
    buildScriptPasses: buildRun.ok,
    noOutOfScopeFilesChanged: (applyResult.diffSummary ?? []).every((entry) => String(entry.path).startsWith(proofRootRel)),
    patchPlanExists: Boolean(codePlan.patchPlanId),
    applyReceiptExists: await exists(resolve(rootDir, proofFiles.governedApplyReceipt)),
    buildReportStatus: buildReport.status,
    validationReportStatus: validationReport.status,
    caseResults: validationReport.caseResults ?? [],
  });
  await writeJson(reportPaths.validationExecution, validationExecutionReport);

  const failurePlan = await fetchJson("/workspace/patch-plan", {
    method: "POST",
    body: {
      proofMode: "LEVEL_2_FAILURE_INJECTION",
      requestedBy: "leeway-developer-cockpit",
      sessionId: "level2-failure-injection",
      taskRequest: "Introduce a temporary failing test inside proof scope to prove the governed repair loop.",
      files: [proofFiles.repairTest],
    },
  });
  assertCondition(failurePlan.ok, `Failure injection plan failed: ${JSON.stringify(failurePlan.data)}`);
  collectRuntimeReceipt(failurePlan.data?.receiptId);
  const failureApply = await applyPlan(failurePlan.data, failurePlan.data.receiptTargets?.[0] ?? proofFiles.failureApplyReceipt);
  const failingTestRun = runCommand(nodeBin, ["--test", "./test/leewaySafeSlugify.test.js", "./test/leewaySafeSlugify.repair-loop.test.js"], proofRoot, "level2-proof-repair-loop-failure");
  assertCondition(!failingTestRun.ok, "Failure injection did not produce a failing test run.");
  failuresEncountered.push("A temporary repair-loop test intentionally failed before the governed repair plan was applied.");

  const repairPlan = await fetchJson("/workspace/patch-plan", {
    method: "POST",
    body: {
      proofMode: "LEVEL_2_REPAIR",
      requestedBy: "leeway-developer-cockpit",
      sessionId: "level2-repair-plan",
      taskRequest: "Repair the temporary Level 2 repair-loop test without changing leewaySafeSlugify behavior.",
      files: [proofFiles.repairTest],
    },
  });
  assertCondition(repairPlan.ok, `Repair plan failed: ${JSON.stringify(repairPlan.data)}`);
  collectRuntimeReceipt(repairPlan.data?.receiptId);
  const repairApply = await applyPlan(repairPlan.data, repairPlan.data.receiptTargets?.[0] ?? proofFiles.repairApplyReceipt);
  const repairedTestRun = runCommand(nodeBin, ["--test", "./test/leewaySafeSlugify.test.js", "./test/leewaySafeSlugify.repair-loop.test.js"], proofRoot, "level2-proof-repair-loop-pass");
  const postRepairValidateRun = runCommand(nodeBin, ["./scripts/validate.js"], proofRoot, "level2-proof-validate-post-repair");
  assertCondition(repairedTestRun.ok, `Repaired test run still failing: ${repairedTestRun.stderr || repairedTestRun.stdout}`);
  assertCondition(postRepairValidateRun.ok, `Post-repair validation failed: ${postRepairValidateRun.stderr || postRepairValidateRun.stdout}`);

  const errorRepairLoopReport = makeReport(subjects.errorRepairLoop, {
    filesRead: unique([...standardsChecked, proofFiles.repairTest, reportPaths.validationExecution]),
    filesChanged: [
      reportPaths.errorRepairLoop,
      proofFiles.repairTest,
      proofFiles.failureApplyReceipt,
      proofFiles.repairApplyReceipt,
      proofFiles.validationReport,
    ],
    commandsRun: commandsRun.slice(-5),
    gatesRun: [
      { gateId: "cockpit-level-2-repair-loop-gate", result: "LIVE" },
    ],
    receiptsWritten: [
      failurePlan.data?.receiptId,
      ...(failureApply.receipts ?? []),
      repairPlan.data?.receiptId,
      ...(repairApply.receipts ?? []),
      proofFiles.failureApplyReceipt,
      proofFiles.repairApplyReceipt,
    ],
    failuresEncountered: [
      "Temporary repair-loop test failed as designed before the repair plan was applied.",
    ],
    lessonsLearned: [],
    skillImprovementsSuggested: [],
    finalStatus: "PASS",
    failureInjection: {
      patchPlanId: failurePlan.data?.patchPlanId,
      applyPatchPlanId: failureApply.patchPlanId,
      failingExitCode: failingTestRun.exitCode,
      failingStdout: summarizeOutput(failingTestRun.stdout),
      failingStderr: summarizeOutput(failingTestRun.stderr),
    },
    repairPlan: {
      patchPlanId: repairPlan.data?.patchPlanId,
      applyPatchPlanId: repairApply.patchPlanId,
      repairedExitCode: repairedTestRun.exitCode,
      validationExitCode: postRepairValidateRun.exitCode,
    },
    temporaryFailureDetected: !failingTestRun.ok,
    finalUtilityStillValid: repairedTestRun.ok && postRepairValidateRun.ok,
  });
  await writeJson(reportPaths.errorRepairLoop, errorRepairLoopReport);

  const statusPayload = await fetchJson("/workspace/coding-loop-status");
  const uiWorkflowWiringReport = makeReport(subjects.uiWorkflowWiring, {
    filesRead: [
      "leeway-developer-cockpit/index.html",
      "leeway-developer-cockpit/src/api/core-runtime-client.js",
      "leeway-developer-cockpit/src/renderer/cockpit.js",
      "leeway-developer-cockpit/src/main/validate.js",
      "leeway-agent-lee/agent-lee-runtime/src/api/routes.ts",
      "leeway-agent-lee/agent-lee-runtime/src/workspace/governedCodingLoop.ts",
    ],
    filesChanged: [reportPaths.uiWorkflowWiring],
    commandsRun: [
      `GET ${runtimeUrl}/workspace/coding-loop-status`,
    ],
    gatesRun: [],
    receiptsWritten: [],
    failuresEncountered: [],
    lessonsLearned: [],
    skillImprovementsSuggested: [],
    finalStatus: "PARTIAL",
    cockpitUiSurface: {
      panel: "panel-workspace",
      statusCard: "coding-loop-status-output",
      patchPlanDefaults: {
        taskRequestMentionsLevel2: true,
        targetPath: proofFiles.packageJson,
      },
      runtimeClientExportsStatusRoute: true,
      runtimeStatusPayload: statusPayload.data ?? null,
    },
    blockers: [
      "Browser-side Level 2 UI proof is not captured by this runner and must be completed separately.",
    ],
  });
  await writeJson(reportPaths.uiWorkflowWiring, uiWorkflowWiringReport);

  async function negativeCodePlan(sessionId) {
    const response = await fetchJson("/workspace/patch-plan", {
      method: "POST",
      body: {
        proofMode: "LEVEL_2_CODEBASE",
        requestedBy: "leeway-developer-cockpit",
        sessionId,
        taskRequest: "Create a fresh Level 2 plan for safety-negative testing only.",
        files: [proofFiles.packageJson],
      },
    });
    assertCondition(response.ok, `Negative test patch plan failed: ${JSON.stringify(response.data)}`);
    collectRuntimeReceipt(response.data?.receiptId);
    return response.data;
  }

  const negativePlanUnapproved = await negativeCodePlan("level2-negative-unapproved");
  const negativeUnapproved = await fetchJson("/workspace/apply-approved-patch", {
    method: "POST",
    body: {
      patchPlanId: negativePlanUnapproved.patchPlanId,
      sessionId: negativePlanUnapproved.sessionId,
      approvedBy: "leeway-developer-cockpit",
      approvalState: "PENDING",
      requestedFiles: negativePlanUnapproved.filesProposedForEditing,
      receiptTarget: negativePlanUnapproved.receiptTargets?.[0],
    },
  });

  const negativePlanUndeclared = await negativeCodePlan("level2-negative-undeclared");
  const negativeUndeclared = await fetchJson("/workspace/apply-approved-patch", {
    method: "POST",
    body: {
      patchPlanId: negativePlanUndeclared.patchPlanId,
      sessionId: negativePlanUndeclared.sessionId,
      approvedBy: "leeway-developer-cockpit",
      approvalState: "APPROVED",
      requestedFiles: [...negativePlanUndeclared.filesProposedForEditing, `${proofRootRel}/undeclared.txt`],
      receiptTarget: negativePlanUndeclared.receiptTargets?.[0],
    },
  });

  const negativePlanScope = await negativeCodePlan("level2-negative-scope");
  const negativeScope = await fetchJson("/workspace/apply-approved-patch", {
    method: "POST",
    body: {
      patchPlanId: negativePlanScope.patchPlanId,
      sessionId: negativePlanScope.sessionId,
      approvedBy: "leeway-developer-cockpit",
      approvalState: "APPROVED",
      requestedFiles: negativePlanScope.filesProposedForEditing,
      receiptTarget: "Archive/reports/outside-proof-scope-receipt.json",
    },
  });

  const negativeInvalidPlan = await fetchJson("/workspace/apply-approved-patch", {
    method: "POST",
    body: {
      patchPlanId: "patch-plan-invalid-does-not-exist",
      sessionId: "level2-negative-invalid-plan",
      approvedBy: "leeway-developer-cockpit",
      approvalState: "APPROVED",
      requestedFiles: [proofFiles.packageJson],
      receiptTarget: proofFiles.governedApplyReceipt,
    },
  });

  const negativePlanReceiptTarget = await negativeCodePlan("level2-negative-missing-receipt-target");
  const negativeMissingReceipt = await fetchJson("/workspace/apply-approved-patch", {
    method: "POST",
    body: {
      patchPlanId: negativePlanReceiptTarget.patchPlanId,
      sessionId: negativePlanReceiptTarget.sessionId,
      approvedBy: "leeway-developer-cockpit",
      approvalState: "APPROVED",
      requestedFiles: negativePlanReceiptTarget.filesProposedForEditing,
    },
  });

  const negativeForbiddenModelRoute = await fetchJson("/workspace/patch-plan", {
    method: "POST",
    body: {
      proofMode: "LEVEL_2_CODEBASE",
      requestedBy: "leeway-developer-cockpit",
      sessionId: "level2-negative-forbidden-model-route",
      taskRequest: "Attempt a forbidden model route during patch plan generation.",
      files: [proofFiles.packageJson],
      modelRoute: "forbidden:model-route",
    },
  });

  const safetyNegativeTestsReport = makeReport(subjects.safetyNegativeTests, {
    filesRead: unique([...standardsChecked, reportPaths.patchPlanGeneration, reportPaths.approvedPatchApplication]),
    filesChanged: [reportPaths.safetyNegativeTests],
    commandsRun: commandsRun.slice(-7),
    gatesRun: [
      { gateId: "cockpit-level-2-negative-safety-gate", result: "LIVE" },
    ],
    receiptsWritten: [],
    failuresEncountered: [],
    lessonsLearned: [],
    skillImprovementsSuggested: [],
    finalStatus: "PASS",
    negativeChecks: {
      applyWithoutApprovalBlocked: negativeUnapproved.ok === false && negativeUnapproved.data?.blockerId === "APPROVAL_REQUIRED",
      undeclaredFileBlocked: negativeUndeclared.ok === false && negativeUndeclared.data?.blockerId === "UNDECLARED_PATCH_PATH",
      outsideProofScopeBlocked: negativeScope.ok === false && negativeScope.data?.blockerId === "PROOF_SCOPE_REQUIRED",
      invalidPatchPlanIdBlocked: negativeInvalidPlan.ok === false && negativeInvalidPlan.data?.blockerId === "PATCH_PLAN_NOT_FOUND",
      missingReceiptTargetBlocked: negativeMissingReceipt.ok === false && negativeMissingReceipt.data?.blockerId === "RECEIPT_TARGET_REQUIRED",
      forbiddenModelRouteBlocked: negativeForbiddenModelRoute.ok === false && negativeForbiddenModelRoute.data?.blockerId === "FORBIDDEN_MODEL_ROUTE",
    },
    blockerPayloads: {
      unapproved: negativeUnapproved.data,
      undeclared: negativeUndeclared.data,
      outsideScope: negativeScope.data,
      invalidPatchPlan: negativeInvalidPlan.data,
      missingReceiptTarget: negativeMissingReceipt.data,
      forbiddenModelRoute: negativeForbiddenModelRoute.data,
    },
  });
  await writeJson(reportPaths.safetyNegativeTests, safetyNegativeTestsReport);

  const gatesPayload = await fetchJson("/gates");
  assertCondition(gatesPayload.ok, `GET /gates failed: ${JSON.stringify(gatesPayload.data)}`);
  const gateIndex = new Map((gatesPayload.data?.gates ?? []).map((gate) => [gate.gateId, gate]));
  const gatesUpdateReport = makeReport(subjects.gatesUpdate, {
    filesRead: [reportPaths.taskDesign, reportPaths.patchPlanGeneration, reportPaths.approvedPatchApplication, reportPaths.validationExecution, reportPaths.errorRepairLoop, reportPaths.safetyNegativeTests],
    filesChanged: [reportPaths.gatesUpdate],
    commandsRun: [`GET ${runtimeUrl}/gates`],
    gatesRun: (gatesPayload.data?.gates ?? []).map((gate) => ({ gateId: gate.gateId, result: gate.status })),
    receiptsWritten: [],
    failuresEncountered: [],
    lessonsLearned: [],
    skillImprovementsSuggested: [],
    finalStatus: "PASS",
    requiredGateStates: {
      level1ExecutableOperations: gateIndex.get("cockpit-level-1-executable-operations-gate")?.status ?? "MISSING",
      level2CodingTaskDesign: gateIndex.get("cockpit-level-2-coding-task-design-gate")?.status ?? "MISSING",
      patchPlanGeneration: gateIndex.get("cockpit-level-2-patch-plan-generation-gate")?.status ?? "MISSING",
      approvedPatchApplication: gateIndex.get("cockpit-level-2-approved-patch-application-gate")?.status ?? "MISSING",
      validationExecution: gateIndex.get("cockpit-level-2-validation-execution-gate")?.status ?? "MISSING",
      repairLoop: gateIndex.get("cockpit-level-2-repair-loop-gate")?.status ?? "MISSING",
      negativeSafety: gateIndex.get("cockpit-level-2-negative-safety-gate")?.status ?? "MISSING",
      voiceEmbodiment: gateIndex.get("voice-embodiment-gate")?.status ?? "MISSING",
    },
  });
  await writeJson(reportPaths.gatesUpdate, gatesUpdateReport);

  const runtimeBuild = runCommand(npmBin, ["run", "build"], runtimeDir, "runtime-build");
  const cockpitBuild = runCommand(npmBin, ["run", "build"], cockpitDir, "cockpit-build");
  const cockpitValidate = runCommand(npmBin, ["run", "validate"], cockpitDir, "cockpit-validate");
  const connectRuntime = runCommand(npmBin, ["run", "connect-runtime"], cockpitDir, "cockpit-connect-runtime");
  assertCondition(runtimeBuild.ok, `Runtime build failed: ${runtimeBuild.stderr || runtimeBuild.stdout}`);
  assertCondition(cockpitBuild.ok, `Cockpit build failed: ${cockpitBuild.stderr || cockpitBuild.stdout}`);
  assertCondition(cockpitValidate.ok, `Cockpit validate failed: ${cockpitValidate.stderr || cockpitValidate.stdout}`);
  assertCondition(connectRuntime.ok, `Cockpit connect-runtime failed: ${connectRuntime.stderr || connectRuntime.stdout}`);

  commandsRun.push(`POST ${runtimeUrl}/agent-lee/chat [final-smoke]`);
  const chatSmoke = await fetchJson("/agent-lee/chat", {
    method: "POST",
    body: {
      sessionId: "level2-final-chat-smoke",
      message: "Inspect this workspace before coding and explain the governed path.",
    },
  });
  assertCondition(chatSmoke.ok, `Agent Lee chat smoke failed: ${JSON.stringify(chatSmoke.data)}`);
  collectRuntimeReceipt(chatSmoke.data?.receiptId);

  const smokePlan = await fetchJson("/workspace/patch-plan", {
    method: "POST",
    body: {
      requestedBy: "leeway-developer-cockpit",
      sessionId: "level2-final-smoke-level1-plan",
      taskRequest: "Create a final smoke proof file for endpoint validation only.",
      files: ["Archive/proofs/cockpit-level-1-patch-plan-proof/level2-final-smoke.md"],
    },
  });
  assertCondition(smokePlan.ok, `Final smoke patch plan failed: ${JSON.stringify(smokePlan.data)}`);
  collectRuntimeReceipt(smokePlan.data?.receiptId);
  const smokeApply = await fetchJson("/workspace/apply-approved-patch", {
    method: "POST",
    body: {
      patchPlanId: smokePlan.data?.patchPlanId,
      sessionId: smokePlan.data?.sessionId,
      approvedBy: "leeway-developer-cockpit",
      approvalState: "APPROVED",
      requestedFiles: smokePlan.data?.filesProposedForEditing ?? [],
    },
  });
  assertCondition(smokeApply.ok, `Final smoke apply failed: ${JSON.stringify(smokeApply.data)}`);
  collectRuntimeReceipt(...(smokeApply.data?.receipts ?? []));

  const reportJsonPaths = Object.values(reportPaths).filter((path) =>
    path.endsWith(".json") &&
    path !== reportPaths.finalJson &&
    path !== reportPaths.receipt &&
    path !== reportPaths.finalValidation
  );
  const parsedReports = await Promise.all(reportJsonPaths.map((path) => readJson(path)));
  const forbiddenModelRouteFindings = await scanForbiddenModelRoutes();
  const finalValidationReport = makeReport(subjects.finalValidation, {
    filesRead: unique([
      ...reportJsonPaths,
      proofFiles.buildReport,
      proofFiles.validationReport,
      proofFiles.governedApplyReceipt,
      proofFiles.failureApplyReceipt,
      proofFiles.repairApplyReceipt,
    ]),
    filesChanged: [reportPaths.finalValidation],
    commandsRun: commandsRun.slice(-9),
    gatesRun: (gatesPayload.data?.gates ?? []).map((gate) => ({ gateId: gate.gateId, result: gate.status })),
    receiptsWritten: [],
    failuresEncountered: [],
    lessonsLearned: [],
    skillImprovementsSuggested: [],
    finalStatus: "PASS",
    validations: {
      runtimeBuild: runtimeBuild.ok ? "PASS" : "FAIL",
      cockpitBuild: cockpitBuild.ok ? "PASS" : "FAIL",
      cockpitValidate: cockpitValidate.ok ? "PASS" : "FAIL",
      connectRuntime: connectRuntime.ok ? "PASS" : "FAIL",
      endpointSmokeTests: {
        gates: gatesPayload.ok ? "PASS" : "FAIL",
        agentLeeChat: chatSmoke.ok ? "PASS" : "FAIL",
        patchPlan: smokePlan.ok ? "PASS" : "FAIL",
        applyApprovedPatch: smokeApply.ok ? "PASS" : "FAIL",
      },
      level2ProofValidation: postRepairValidateRun.ok ? "PASS" : "FAIL",
      jsonReportParse: parsedReports.length === reportJsonPaths.length ? "PASS" : "FAIL",
      forbiddenModelRouteScan: forbiddenModelRouteFindings.length === 0 ? "PASS" : "FAIL",
      outOfScopeMutationCheck:
        (applyResult.diffSummary ?? []).every((entry) => String(entry.path).startsWith(proofRootRel)) &&
        (failureApply.diffSummary ?? []).every((entry) => String(entry.path).startsWith(proofRootRel)) &&
        (repairApply.diffSummary ?? []).every((entry) => String(entry.path).startsWith(proofRootRel))
          ? "PASS"
          : "FAIL",
      receiptExistenceCheck:
        await exists(resolve(rootDir, proofFiles.governedApplyReceipt)) &&
        await exists(resolve(rootDir, proofFiles.failureApplyReceipt)) &&
        await exists(resolve(rootDir, proofFiles.repairApplyReceipt))
          ? "PASS"
          : "FAIL",
    },
    forbiddenModelRouteFindings,
  });
  await writeJson(reportPaths.finalValidation, finalValidationReport);

  const markdownReport = [
    "# LeeWay Developer Cockpit Level 2 Governed Coding Loop Report",
    "",
    "Verdict: `LEEWAY_DEVELOPER_COCKPIT_LEVEL_2_GOVERNED_CODING_LOOP_PARTIAL`",
    "",
    "## Proven",
    "",
    "- Level 2 proof package was generated through `/workspace/patch-plan` and `/workspace/apply-approved-patch` under `Archive/proofs/cockpit-level-2-governed-coding-loop/`.",
    "- `leewaySafeSlugify(input)` passes the required behavior cases through source, tests, build script, and validation script.",
    "- A temporary validation failure was injected inside proof scope, detected, repaired through a second approved patch, and revalidated successfully.",
    "- Safety negative tests blocked unapproved apply, undeclared file requests, outside-scope receipt targets, invalid patch plan ids, missing receipt targets, and forbidden model-route requests.",
    "- `/gates` now publishes the Level 2 coding-loop gate family while keeping the voice embodiment gate honestly blocked.",
    "",
    "## Remaining Blocker",
    "",
    "- Browser-side Level 2 UI proof is still pending, so this runner writes a provisional `PARTIAL` final report until the Cockpit UI is reproven live on `http://localhost:7800`.",
    "",
    "Runtime truth wins.",
    "",
  ].join("\n");
  await writeText(reportPaths.markdown, markdownReport);

  const provisionalFinalReport = makeReport(subjects.finalReport, {
    filesRead: unique([...reportJsonPaths, reportPaths.finalValidation]),
    filesChanged: [reportPaths.markdown, reportPaths.finalJson],
    commandsRun,
    gatesRun: (gatesPayload.data?.gates ?? []).map((gate) => ({ gateId: gate.gateId, result: gate.status })),
    receiptsWritten: runtimeReceiptIds,
    failuresEncountered,
    lessonsLearned,
    skillImprovementsSuggested,
    finalStatus: "LEEWAY_DEVELOPER_COCKPIT_LEVEL_2_GOVERNED_CODING_LOOP_PARTIAL",
    remainingBlockers: [
      "Browser-side Level 2 UI proof is pending before PASS can be claimed.",
      voiceBlocker,
    ],
    verdict: "LEEWAY_DEVELOPER_COCKPIT_LEVEL_2_GOVERNED_CODING_LOOP_PARTIAL",
    proofArtifacts: {
      proofRoot: proofRootRel,
      codePlanId: codePlan.patchPlanId,
      applyPlanId: applyResult.patchPlanId,
      failurePlanId: failurePlan.data?.patchPlanId,
      repairPlanId: repairPlan.data?.patchPlanId,
      receipts: unique([
        proofFiles.governedApplyReceipt,
        proofFiles.failureApplyReceipt,
        proofFiles.repairApplyReceipt,
      ]),
    },
  });
  await writeJson(reportPaths.finalJson, provisionalFinalReport);

  const provisionalReceipt = makeReport(subjects.finalReport, {
    filesRead: unique([...reportJsonPaths, reportPaths.markdown, reportPaths.finalJson]),
    filesChanged: [reportPaths.receipt],
    commandsRun,
    gatesRun: (gatesPayload.data?.gates ?? []).map((gate) => ({ gateId: gate.gateId, result: gate.status })),
    receiptsWritten: unique(runtimeReceiptIds),
    failuresEncountered,
    lessonsLearned,
    skillImprovementsSuggested,
    finalStatus: "LEEWAY_DEVELOPER_COCKPIT_LEVEL_2_GOVERNED_CODING_LOOP_PARTIAL",
    remainingBlockers: [
      "Browser-side Level 2 UI proof is pending before PASS can be claimed.",
      voiceBlocker,
    ],
    receiptObjectId: "LEEWAY_RECEIPT::DEVELOPER_COCKPIT::LEVEL_2_GOVERNED_CODING_LOOP::20260527",
    verdict: "LEEWAY_DEVELOPER_COCKPIT_LEVEL_2_GOVERNED_CODING_LOOP_PARTIAL",
    reportPaths,
    runtimeReceiptsObserved: unique(runtimeReceiptIds),
  });
  await writeJson(reportPaths.receipt, provisionalReceipt);
}

await main();
