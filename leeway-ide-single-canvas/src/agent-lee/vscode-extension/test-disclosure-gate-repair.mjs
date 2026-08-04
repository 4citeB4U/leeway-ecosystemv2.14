/**
 * Test script for disclosure gate repair
 * Tests command-aware validation logic
 */

// Mock validation function (extracted from extension.ts)
const LEEWAY_COMMAND_CATEGORIES = {
  CHAT_ONLY: new Set(["sendMessage"]),
  RUNTIME_STATUS: new Set([
    "runtimeStatus",
    "leewayVoiceSettingsChanged",
    "leewayVoiceMuteToggled",
    "leewayVoiceStopRequested",
    "leewayVoiceTestRequested",
    "voiceAlActivateDefault",
    "voiceAlTestDefault",
    "voiceAlTestVoice",
    "voiceAlSetActive"
  ]),
  FILE_READ: new Set([
    "scanSelf",
    "verifySelf",
    "scanWorkspace",
    "verifyWorkspace"
  ]),
  FILE_EDIT: new Set([
    "approveProposedEdit",
    "approveAllProposedEdits",
    "approvePlan",
    "executePlan",
    "setState"
  ]),
  TOOL_USE: new Set([
    "askLocalModel",
    "engineerTask",
    "approvePluginCall"
  ]),
  SYSTEM_MUTATION: new Set([
    "updateAgentLeeNow",
    "setPerformanceProfile",
    "activateClonedVoice",
    "testClonedVoice",
    "saveVoiceCloneSettings",
    "transcribeVoiceReference",
    "voiceAlCloneAndPreview",
    "voiceAlDeleteVoice",
    "voiceAlSaveClone"
  ])
};

const LEEWAY_EXECUTION_CAPABLE_HOST_COMMANDS = new Set([
  "sendMessage",
  "askLocalModel",
  "engineerTask",
  "scanSelf",
  "verifySelf",
  "scanWorkspace",
  "verifyWorkspace",
  "approvePlan",
  "executePlan",
  "approveProposedEdit",
  "approveAllProposedEdits",
  "setState",
  "leewayVoiceSettingsChanged",
  "leewayVoiceMuteToggled",
  "leewayVoiceStopRequested",
  "leewayVoiceTestRequested",
  "activateClonedVoice",
  "testClonedVoice",
  "saveVoiceCloneSettings",
  "transcribeVoiceReference",
  "voiceAlActivateDefault",
  "voiceAlCloneAndPreview",
  "voiceAlDeleteVoice",
  "voiceAlSaveClone",
  "voiceAlSetActive",
  "voiceAlTestDefault",
  "voiceAlTestVoice",
  "updateAgentLeeNow",
  "setPerformanceProfile",
  "approvePluginCall"
]);

const LEEWAY_HIGH_RISK_DISCLOSURE_LEVELS = new Set(["HIGH", "CRITICAL"]);

const LEEWAY_BASE_DISCLOSURE_FIELDS = [
  "actionId",
  "workflowRunId",
  "taskId",
  "intentId",
  "agentId",
  "commandsToRun",
  "governingBookReferences",
  "riskLevel",
  "rollbackPlan",
  "expectedOutputs",
  "receiptId"
];

function disclosureArrayOrEmpty(value) {
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item ?? "").trim())
      .filter(Boolean);
  }
  if (typeof value === "string" && value.trim()) {
    return [value.trim()];
  }
  return [];
}

function validateExecutionDisclosureEnvelope(msg) {
  const command = String(msg?.command || "").trim();
  if (!command || !LEEWAY_EXECUTION_CAPABLE_HOST_COMMANDS.has(command)) {
    return { ok: true };
  }

  // Determine command category
  let commandCategory = null;
  for (const [category, commands] of Object.entries(LEEWAY_COMMAND_CATEGORIES)) {
    if (commands.has(command)) {
      commandCategory = category;
      break;
    }
  }

  // CHAT_ONLY and RUNTIME_STATUS commands don't require disclosure envelope
  if (commandCategory === "CHAT_ONLY" || commandCategory === "RUNTIME_STATUS") {
    return { ok: true };
  }

  const envelope = msg?.actionDisclosure ?? msg?.disclosure;
  if (!envelope || typeof envelope !== "object") {
    return { ok: false, reason: `Missing actionDisclosure envelope for command: ${command}` };
  }

  // Validate base required fields
  for (const field of LEEWAY_BASE_DISCLOSURE_FIELDS) {
    const value = envelope[field];
    if (Array.isArray(value)) {
      if (!value.length) {
        return { ok: false, reason: `Disclosure field ${field} must not be empty for command: ${command}` };
      }
      continue;
    }
    if (typeof value === "string") {
      if (!value.trim()) {
        return { ok: false, reason: `Disclosure field ${field} must not be blank for command: ${command}` };
      }
      continue;
    }
    if (value === undefined || value === null) {
      return { ok: false, reason: `Disclosure field ${field} is required for command: ${command}` };
    }
  }

  // Category-specific validation
  if (commandCategory === "FILE_READ") {
    const filesToRead = disclosureArrayOrEmpty(envelope.filesToRead);
    if (!filesToRead.length) {
      return { ok: false, reason: `FILE_READ command ${command} requires declared filesToRead` };
    }
  }

  if (commandCategory === "FILE_EDIT") {
    const filesToEdit = disclosureArrayOrEmpty(envelope.filesToEdit);
    if (!filesToEdit.length) {
      return { ok: false, reason: `FILE_EDIT command ${command} requires declared filesToEdit` };
    }
  }

  if (commandCategory === "TOOL_USE") {
    const toolsToUse = disclosureArrayOrEmpty(envelope.toolsToUse);
    if (!toolsToUse.length) {
      return { ok: false, reason: `TOOL_USE command ${command} requires declared toolsToUse` };
    }
  }

  if (commandCategory === "SYSTEM_MUTATION") {
    const filesToRead = disclosureArrayOrEmpty(envelope.filesToRead);
    const filesToEdit = disclosureArrayOrEmpty(envelope.filesToEdit);
    const toolsToUse = disclosureArrayOrEmpty(envelope.toolsToUse);
    
    if (!filesToRead.length && !filesToEdit.length && !toolsToUse.length) {
      return { ok: false, reason: `SYSTEM_MUTATION command ${command} requires at least one of: filesToRead, filesToEdit, or toolsToUse` };
    }
  }

  const commandsToRun = disclosureArrayOrEmpty(envelope.commandsToRun);
  if (!commandsToRun.includes(command)) {
    return { ok: false, reason: `Disclosure commandsToRun must include command: ${command}` };
  }

  const riskLevel = String(envelope.riskLevel || "").trim().toUpperCase();
  if (!riskLevel) {
    return { ok: false, reason: `Disclosure riskLevel missing for command: ${command}` };
  }

  if (LEEWAY_HIGH_RISK_DISCLOSURE_LEVELS.has(riskLevel)) {
    const explicitApproval = envelope.explicitApproval === true;
    if (!explicitApproval) {
      return { ok: false, reason: `HIGH/CRITICAL command ${command} requires explicitApproval=true` };
    }
  }

  const receiptId = String(envelope.receiptId || "").trim();
  if (!receiptId) {
    return { ok: false, reason: `Disclosure receiptId missing for command: ${command}` };
  }

  return { ok: true };
}

// Test scenarios
const tests = [
  {
    name: "Test 1: Normal chat (sendMessage) passes without disclosure",
    msg: { command: "sendMessage", text: "Hello Agent Lee" },
    expectedPass: true
  },
  {
    name: "Test 2: Runtime status check passes without disclosure",
    msg: { command: "runtimeStatus" },
    expectedPass: true
  },
  {
    name: "Test 3: File read operation without disclosure blocked",
    msg: { command: "scanWorkspace" },
    expectedPass: false,
    expectedReason: "Missing actionDisclosure envelope"
  },
  {
    name: "Test 4: File read with disclosure but no filesToRead blocked",
    msg: {
      command: "scanWorkspace",
      actionDisclosure: {
        actionId: "test-action-1",
        workflowRunId: "test-workflow-1",
        taskId: "test-task-1",
        intentId: "test-intent-1",
        agentId: "agent-lee",
        commandsToRun: ["scanWorkspace"],
        governingBookReferences: ["BOOK-54"],
        riskLevel: "LOW",
        rollbackPlan: "none",
        expectedOutputs: ["scan results"],
        receiptId: "receipt-1"
      }
    },
    expectedPass: false,
    expectedReason: "FILE_READ command scanWorkspace requires declared filesToRead"
  },
  {
    name: "Test 5: File read with complete disclosure passes",
    msg: {
      command: "scanWorkspace",
      actionDisclosure: {
        actionId: "test-action-2",
        workflowRunId: "test-workflow-2",
        taskId: "test-task-2",
        intentId: "test-intent-2",
        agentId: "agent-lee",
        filesToRead: ["src/**/*.ts"],
        commandsToRun: ["scanWorkspace"],
        governingBookReferences: ["BOOK-54"],
        riskLevel: "LOW",
        rollbackPlan: "none",
        expectedOutputs: ["scan results"],
        receiptId: "receipt-2"
      }
    },
    expectedPass: true
  },
  {
    name: "Test 6: Tool use without disclosure blocked",
    msg: { command: "askLocalModel", text: "What is TypeScript?" },
    expectedPass: false,
    expectedReason: "Missing actionDisclosure envelope"
  },
  {
    name: "Test 7: Tool use with complete disclosure passes",
    msg: {
      command: "askLocalModel",
      text: "What is TypeScript?",
      actionDisclosure: {
        actionId: "test-action-3",
        workflowRunId: "test-workflow-3",
        taskId: "test-task-3",
        intentId: "test-intent-3",
        agentId: "agent-lee",
        toolsToUse: ["ollama"],
        commandsToRun: ["askLocalModel"],
        governingBookReferences: ["BOOK-54"],
        riskLevel: "LOW",
        rollbackPlan: "none",
        expectedOutputs: ["model response"],
        receiptId: "receipt-3"
      }
    },
    expectedPass: true
  },
  {
    name: "Test 8: System mutation without disclosure blocked",
    msg: { command: "updateAgentLeeNow" },
    expectedPass: false,
    expectedReason: "Missing actionDisclosure envelope"
  },
  {
    name: "Test 9: Voice settings change passes without disclosure",
    msg: { command: "leewayVoiceSettingsChanged", settings: { volume: 0.8 } },
    expectedPass: true
  },
  {
    name: "Test 10: Non-execution command passes",
    msg: { command: "unknownCommand" },
    expectedPass: true
  }
];

// Run tests
console.log("=".repeat(80));
console.log("DISCLOSURE GATE REPAIR TEST SUITE");
console.log("=".repeat(80));
console.log();

let passed = 0;
let failed = 0;

for (const test of tests) {
  const result = validateExecutionDisclosureEnvelope(test.msg);
  const testPassed = result.ok === test.expectedPass;
  
  if (testPassed && test.expectedReason) {
    // Check if reason matches
    const reasonMatches = result.reason && result.reason.includes(test.expectedReason);
    if (!reasonMatches) {
      console.log(`❌ FAIL: ${test.name}`);
      console.log(`   Expected reason to contain: "${test.expectedReason}"`);
      console.log(`   Got: "${result.reason || 'N/A'}"`);
      failed++;
      continue;
    }
  }
  
  if (testPassed) {
    console.log(`✅ PASS: ${test.name}`);
    passed++;
  } else {
    console.log(`❌ FAIL: ${test.name}`);
    console.log(`   Expected: ${test.expectedPass ? "PASS" : "FAIL"}`);
    console.log(`   Got: ${result.ok ? "PASS" : "FAIL"}`);
    if (result.reason) {
      console.log(`   Reason: ${result.reason}`);
    }
    failed++;
  }
}

console.log();
console.log("=".repeat(80));
console.log(`TEST RESULTS: ${passed} passed, ${failed} failed out of ${tests.length} total`);
console.log("=".repeat(80));

if (failed === 0) {
  console.log();
  console.log("✅ ALL TESTS PASSED - Disclosure gate repair is working correctly!");
  console.log();
  console.log("Key improvements verified:");
  console.log("  ✓ Normal chat messages (sendMessage) no longer blocked");
  console.log("  ✓ Runtime status checks work without disclosure");
  console.log("  ✓ File operations require appropriate disclosure");
  console.log("  ✓ Tool use requires appropriate disclosure");
  console.log("  ✓ System mutations require appropriate disclosure");
  console.log("  ✓ Command-aware validation working correctly");
  process.exit(0);
} else {
  console.log();
  console.log("❌ SOME TESTS FAILED - Review the failures above");
  process.exit(1);
}

// Made with Bob
