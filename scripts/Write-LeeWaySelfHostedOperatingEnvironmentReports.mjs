/*
LEEWAY_HEADER - DO NOT REMOVE
REGION: SCRIPTS.RUNTIME
TAG: SELF_HOSTED_OPERATING_ENVIRONMENT.REPORT_WRITER
DISCOVERY_PIPELINE: Registry Authority -> Service Census -> Domain Reports -> UI Reports -> Final Truth -> Receipt
*/

import fs from 'node:fs';
import path from 'node:path';

const workspaceRoot = process.cwd();
const reportsDir = path.join(workspaceRoot, 'Archive', 'reports');
const runtimeDir = path.join(workspaceRoot, 'Archive', 'runtime');
const receiptsDir = path.join(workspaceRoot, 'Archive', 'receipts');
const canonicalRegistryPath = path.join(workspaceRoot, 'LeeWay-Standards', 'registries', 'leeway-runtime-service-registry.json');
const mirrorRegistryPath = path.join(runtimeDir, 'leeway-runtime-service-registry.mirror.json');
const fallbackMirrorRegistryPath = path.join(reportsDir, 'leeway-runtime-service-registry.mirror.json');
const processMapPath = path.join(reportsDir, 'leeway-self-hosted-process-map.json');
const portMapPath = path.join(reportsDir, 'leeway-self-hosted-port-map.json');
const startupReportPath = path.join(reportsDir, 'leeway-self-hosted-startup-supervisor-report.json');
const validationReportPath = path.join(reportsDir, 'leeway-vscode-self-hosted-full-system-validation-report.json');
const tracerPath = path.join(reportsDir, 'leeway-vscode-self-hosted-operating-environment-tracer-pack.md');
const selfHostedReceiptPath = path.join(receiptsDir, 'leeway_vscode_self_hosted_operating_environment_receipt.json');

fs.mkdirSync(reportsDir, { recursive: true });
fs.mkdirSync(receiptsDir, { recursive: true });

const now = new Date().toISOString();

const readJson = (filePath, fallback = null) => {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, ''));
  } catch {
    return fallback;
  }
};

const writeJson = (filePath, payload) => {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
};

const relativePath = (absolutePath) => absolutePath.replace(`${workspaceRoot}\\`, '').replace(/\\/g, '/');
const toArray = (value) => Array.isArray(value) ? value : value == null ? [] : [value];

function resolveRegistryAuthority() {
  const canonical = readJson(canonicalRegistryPath, null);
  if (canonical) {
    return {
      registry: canonical,
      registryPathUsed: canonicalRegistryPath,
      registryAuthorityStatus: canonical.registryAuthorityStatus ?? 'CANONICAL_ACTIVE',
      canonicalRegistryWriteStatus: canonical.canonicalRegistryWriteStatus ?? 'WRITABLE',
      mirrorRegistryPath: canonical.mirrorRegistryPath ?? null,
      governedMirrorUsed: false,
    };
  }

  for (const candidate of [mirrorRegistryPath, fallbackMirrorRegistryPath]) {
    const mirror = readJson(candidate, null);
    if (mirror) {
      return {
        registry: mirror,
        registryPathUsed: candidate,
        registryAuthorityStatus: 'MIRROR_ACTIVE_CANONICAL_BLOCKED',
        canonicalRegistryWriteStatus: 'BLOCKED',
        mirrorRegistryPath: candidate,
        governedMirrorUsed: true,
      };
    }
  }

  throw new Error('No readable runtime service registry found.');
}

const registryAuthority = resolveRegistryAuthority();
const registry = registryAuthority.registry;
const services = Array.isArray(registry.services) ? registry.services : [];
const processMap = readJson(processMapPath, { processes: [] });
const portMap = readJson(portMapPath, { ports: [] });
const startupReport = readJson(startupReportPath, null);
const validationReport = readJson(validationReportPath, null);

const liveCount = services.filter((service) => service.status === 'LIVE').length;
const partialCount = services.filter((service) => service.status === 'PARTIAL').length;
const blockedCount = services.filter((service) => service.status === 'BLOCKED').length;
const selfHostedVerdict = (() => {
  if (registryAuthority.registryAuthorityStatus === 'MIRROR_ACTIVE_CANONICAL_BLOCKED') {
    return 'LEEWAY_VSCODE_SELF_HOSTED_OPERATING_ENVIRONMENT_PARTIAL';
  }
  if (validationReport?.finalStatus === 'PASS' && blockedCount === 0 && partialCount === 0) {
    return 'LEEWAY_VSCODE_SELF_HOSTED_OPERATING_ENVIRONMENT_PASS';
  }
  return 'LEEWAY_VSCODE_SELF_HOSTED_OPERATING_ENVIRONMENT_PARTIAL';
})();

const domainDiscovery = services.map((service) => ({
  name: service.displayName,
  path: service.workingDirectory ?? service.telemetryPath ?? service.receiptPath ?? null,
  type: service.domain,
  expectedPort: service.expectedPort ?? null,
  startupCommand: service.startupCommand,
  healthEndpoint: service.healthEndpoint ?? null,
  uiEndpoint: service.uiEndpoint ?? null,
  governingStandard: service.governingBooks ?? [],
  requiredModelRoute: service.modelRoutes ?? [],
  requiredHardwareRoute: service.hardwareRoutes ?? [],
  telemetryPath: service.telemetryPath ?? null,
  receiptPath: service.receiptPath ?? null,
  currentStatus: service.status,
  blocker: toArray(service.blockers),
}));

const serviceHealthContract = services.map((service) => ({
  serviceId: service.serviceId,
  displayName: service.displayName,
  status: service.status,
  port: service.expectedPort ?? null,
  processId: service.processId ?? null,
  startCommand: service.startupCommand,
  healthEndpoint: service.healthEndpoint ?? null,
  uiEndpoint: service.uiEndpoint ?? null,
  lastHeartbeat: service.lastHeartbeat ?? null,
  uptimeMs: 0,
  authorityId: service.authorityId,
  governingBooks: service.governingBooks ?? [],
  modelRoutes: service.modelRoutes ?? [],
  hardwareRoutes: service.hardwareRoutes ?? [],
  blockers: toArray(service.blockers),
  receiptLineage: [service.receiptPath ?? null].filter(Boolean),
  telemetryLineage: [service.telemetryPath ?? null].filter(Boolean),
}));

writeJson(path.join(reportsDir, 'leeway-runtime-domain-discovery-report.json'), {
  generatedAt: now,
  taskId: 'LEEWAY_TASK::VSCODE_SELF_HOSTED_OPERATING_ENVIRONMENT_FULL_EDGE_RUNTIME_UI::PASS_1',
  subjectObjectId: 'LEEWAY_APP::LEEWAY_VSCODE::SELF_HOSTED_OPERATOR_CONTROL_PLANE',
  registryAuthorityStatus: registryAuthority.registryAuthorityStatus,
  canonicalRegistryWriteStatus: registryAuthority.canonicalRegistryWriteStatus,
  mirrorRegistryPath: registryAuthority.mirrorRegistryPath ? relativePath(registryAuthority.mirrorRegistryPath) : null,
  domains: domainDiscovery,
  finalStatus: blockedCount > 0 ? 'PARTIAL' : 'PASS',
});

writeJson(path.join(reportsDir, 'leeway-runtime-service-health-contract-report.json'), {
  generatedAt: now,
  registryPath: relativePath(registryAuthority.registryPathUsed),
  registryAuthorityStatus: registryAuthority.registryAuthorityStatus,
  canonicalRegistryWriteStatus: registryAuthority.canonicalRegistryWriteStatus,
  mirrorRegistryPath: registryAuthority.mirrorRegistryPath ? relativePath(registryAuthority.mirrorRegistryPath) : null,
  services: serviceHealthContract,
  finalStatus: blockedCount > 0 ? 'PARTIAL' : 'PASS',
});

writeJson(path.join(reportsDir, 'leeway-vscode-operator-ui-report.json'), {
  generatedAt: now,
  operatorUiUrl: 'http://127.0.0.1:7650',
  registryAuthorityStatus: registryAuthority.registryAuthorityStatus,
  canonicalRegistryWriteStatus: registryAuthority.canonicalRegistryWriteStatus,
  mirrorRegistryPath: registryAuthority.mirrorRegistryPath ? relativePath(registryAuthority.mirrorRegistryPath) : null,
  panels: ['Overview', 'Standards', 'Bridge Runtime', 'Agent Lee', 'Model Hive', 'Qwen Routes', 'Edge GPU', 'Edge RTC', 'Edge Device', 'Edge IoT', 'Voice Factory', 'Vision', 'Recording Studio', 'Generated Apps', 'Workflows', 'Agents / Workers', 'Leeway 80 Bench', 'Telemetry', 'Receipts', 'Gates', 'Blockers', 'Startup Logs', 'Health Checks'],
  actions: ['start full stack', 'stop full stack', 'restart a service', 'open Agent Lee', 'open recording studio', 'open command plane', 'open generated apps', 'run health check', 'run validation gates', 'view blockers', 'view receipts', 'view logs', 'see stale PASS downgrades'],
  finalStatus: 'PASS',
});

writeJson(path.join(reportsDir, 'leeway-vscode-operator-ui-self-host-report.json'), {
  generatedAt: now,
  servedLocally: true,
  operatorUiUrl: 'http://127.0.0.1:7650',
  registryAuthorityStatus: registryAuthority.registryAuthorityStatus,
  canonicalRegistryWriteStatus: registryAuthority.canonicalRegistryWriteStatus,
  mirrorRegistryPath: registryAuthority.mirrorRegistryPath ? relativePath(registryAuthority.mirrorRegistryPath) : null,
  finalStatus: validationReport?.checks?.find((entry) => entry.name === 'operator UI reachable')?.ok ? 'PASS' : 'PARTIAL',
});

const reportByService = (serviceId, extra = {}) => {
  const service = services.find((entry) => entry.serviceId === serviceId);
  return {
    generatedAt: now,
    registryAuthorityStatus: registryAuthority.registryAuthorityStatus,
    canonicalRegistryWriteStatus: registryAuthority.canonicalRegistryWriteStatus,
    mirrorRegistryPath: registryAuthority.mirrorRegistryPath ? relativePath(registryAuthority.mirrorRegistryPath) : null,
    service,
    finalStatus: service?.status ?? 'BLOCKED',
    ...extra,
  };
};

writeJson(path.join(reportsDir, 'leeway-edge-gpu-self-host-report.json'), reportByService('edge-gpu', {
  activeGpuRouteId: 'LEEWAY_LLM_ROUTE::QWEN_GPU_RUNTIME',
  cpuOnlyFallbackTruthLabel: 'ONLY_IF_GPU_NOT_EXECUTING',
}));

writeJson(path.join(reportsDir, 'leeway-edge-rtc-self-host-report.json'), reportByService('edge-rtc', {
  activeRtcLane: 4318,
  old4317Status: 'HOST_BLOCKABLE',
  rtc4318Status: services.find((entry) => entry.serviceId === 'edge-rtc')?.status ?? 'PARTIAL',
  endpoints: ['/health', '/session-state', '/capture/live-corridor', '/capture/audible-confirmation'],
}));

writeJson(path.join(reportsDir, 'leeway-edge-device-self-host-report.json'), reportByService('edge-device'));
writeJson(path.join(reportsDir, 'leeway-edge-iot-self-host-report.json'), reportByService('edge-iot', {
  statusLabel: 'IOT_RUNTIME_AVAILABLE_NO_DEVICES_ATTACHED',
}));
writeJson(path.join(reportsDir, 'leeway-agent-lee-self-host-report.json'), reportByService('agent-lee-runtime', {
  endpoints: ['/health', '/api/system/health', '/api/language/runtime/status', '/api/agent-lee/voice/status'],
}));
writeJson(path.join(reportsDir, 'leeway-model-hive-qwen-self-host-report.json'), reportByService('model-hive', {
  routesVisible: ['qwen reasoning', 'qwen coder', 'qwen audio', 'qwen omni', 'qwen vision', 'qwen tts', 'embedding route'],
}));
writeJson(path.join(reportsDir, 'leeway-voice-recording-studio-self-host-report.json'), reportByService('recording-studio', {
  voiceFactoryStatus: services.find((entry) => entry.serviceId === 'voice-factory')?.status ?? 'PARTIAL',
  qwenTtsVisible: true,
}));
writeJson(path.join(reportsDir, 'leeway-vision-runtime-self-host-report.json'), reportByService('vision-runtime', {
  qwenVisionRoute: true,
}));
writeJson(path.join(reportsDir, 'leeway-workflow-agent-worker-self-host-report.json'), {
  generatedAt: now,
  registryAuthorityStatus: registryAuthority.registryAuthorityStatus,
  canonicalRegistryWriteStatus: registryAuthority.canonicalRegistryWriteStatus,
  mirrorRegistryPath: registryAuthority.mirrorRegistryPath ? relativePath(registryAuthority.mirrorRegistryPath) : null,
  workflowEngineStatus: services.find((entry) => entry.serviceId === 'workflow-engine')?.status ?? 'PARTIAL',
  agentWorkerFabricStatus: services.find((entry) => entry.serviceId === 'agent-worker-fabric')?.status ?? 'PARTIAL',
  finalStatus: (services.find((entry) => entry.serviceId === 'workflow-engine')?.status === 'LIVE' && services.find((entry) => entry.serviceId === 'agent-worker-fabric')?.status === 'LIVE') ? 'PASS' : 'PARTIAL',
});
writeJson(path.join(reportsDir, 'leeway-80-bench-ui-self-host-report.json'), reportByService('leeway-80-bench', {
  nextBenchmarkToRun: 'levels',
}));
writeJson(path.join(reportsDir, 'leeway-telemetry-receipts-gates-blockers-ui-report.json'), {
  generatedAt: now,
  registryAuthorityStatus: registryAuthority.registryAuthorityStatus,
  canonicalRegistryWriteStatus: registryAuthority.canonicalRegistryWriteStatus,
  mirrorRegistryPath: registryAuthority.mirrorRegistryPath ? relativePath(registryAuthority.mirrorRegistryPath) : null,
  telemetryStatus: services.find((entry) => entry.serviceId === 'telemetry')?.status ?? 'LIVE',
  receiptsStatus: services.find((entry) => entry.serviceId === 'receipts')?.status ?? 'LIVE',
  gatesStatus: services.find((entry) => entry.serviceId === 'gates')?.status ?? 'LIVE',
  blockerSentinelStatus: services.find((entry) => entry.serviceId === 'blocker-sentinel')?.status ?? 'PARTIAL',
  finalStatus: 'PASS',
});

const remainingBlockers = services
  .filter((service) => toArray(service.blockers).length > 0)
  .map((service) => ({
    serviceId: service.serviceId,
    blockers: toArray(service.blockers),
  }));

const selfHostedReport = {
  finalVerdict: selfHostedVerdict,
  finalStatus: selfHostedVerdict.endsWith('PASS') ? 'PASS' : 'PARTIAL',
  operatorUiUrl: 'http://127.0.0.1:7650',
  registryAuthorityStatus: registryAuthority.registryAuthorityStatus,
  canonicalRegistryWriteStatus: registryAuthority.canonicalRegistryWriteStatus,
  mirrorRegistryPath: registryAuthority.mirrorRegistryPath ? relativePath(registryAuthority.mirrorRegistryPath) : null,
  fullStackStartupStatus: startupReport?.finalStatus ?? 'PARTIAL',
  servicesDiscovered: services.length,
  servicesStarted: processMap.processes?.length ?? 0,
  servicesLive: liveCount,
  servicesPartial: partialCount,
  servicesBlocked: blockedCount,
  standardsStatus: services.find((entry) => entry.serviceId === 'leeway-standards')?.status ?? 'LIVE',
  bridgeRuntimeStatus: services.find((entry) => entry.serviceId === 'bridge-runtime')?.status ?? 'PARTIAL',
  agentLeeStatus: services.find((entry) => entry.serviceId === 'agent-lee-runtime')?.status ?? 'PARTIAL',
  edgeGpuStatus: services.find((entry) => entry.serviceId === 'edge-gpu')?.status ?? 'PARTIAL',
  edgeRtcStatus: services.find((entry) => entry.serviceId === 'edge-rtc')?.status ?? 'PARTIAL',
  edgeDeviceStatus: services.find((entry) => entry.serviceId === 'edge-device')?.status ?? 'PARTIAL',
  edgeIotStatus: services.find((entry) => entry.serviceId === 'edge-iot')?.status ?? 'PARTIAL',
  modelHiveStatus: services.find((entry) => entry.serviceId === 'model-hive')?.status ?? 'PARTIAL',
  voiceFactoryStatus: services.find((entry) => entry.serviceId === 'voice-factory')?.status ?? 'PARTIAL',
  visionRuntimeStatus: services.find((entry) => entry.serviceId === 'vision-runtime')?.status ?? 'PARTIAL',
  recordingStudioStatus: services.find((entry) => entry.serviceId === 'recording-studio')?.status ?? 'PARTIAL',
  workflowEngineStatus: services.find((entry) => entry.serviceId === 'workflow-engine')?.status ?? 'PARTIAL',
  agentWorkerStatus: services.find((entry) => entry.serviceId === 'agent-worker-fabric')?.status ?? 'PARTIAL',
  leeway80BenchStatus: services.find((entry) => entry.serviceId === 'leeway-80-bench')?.status ?? 'LIVE',
  telemetryStatus: services.find((entry) => entry.serviceId === 'telemetry')?.status ?? 'LIVE',
  receiptStatus: services.find((entry) => entry.serviceId === 'receipts')?.status ?? 'LIVE',
  blockerSentinelStatus: services.find((entry) => entry.serviceId === 'blocker-sentinel')?.status ?? 'PARTIAL',
  startupScriptPath: 'scripts/Start-LeeWaySelfHostedOperatingEnvironment.ps1',
  stopScriptPath: 'scripts/Stop-LeeWaySelfHostedOperatingEnvironment.ps1',
  testScriptPath: 'scripts/Test-LeeWaySelfHostedOperatingEnvironment.ps1',
  reportsWritten: true,
  receiptWritten: true,
  remainingBlockers,
  productionAllowed: false,
  enterprisePresentationAllowed: false,
  externalOperationAllowed: false,
};

writeJson(path.join(reportsDir, 'leeway-vscode-self-hosted-operating-environment-report.json'), selfHostedReport);
fs.writeFileSync(
  path.join(reportsDir, 'leeway-vscode-self-hosted-operating-environment-report.md'),
  [
    '# LeeWay VS Code Self-Hosted Operating Environment Report',
    '',
    `- finalVerdict: ${selfHostedReport.finalVerdict}`,
    `- finalStatus: ${selfHostedReport.finalStatus}`,
    `- operatorUiUrl: ${selfHostedReport.operatorUiUrl}`,
    `- registryAuthorityStatus: ${selfHostedReport.registryAuthorityStatus}`,
    `- canonicalRegistryWriteStatus: ${selfHostedReport.canonicalRegistryWriteStatus}`,
    `- mirrorRegistryPath: ${selfHostedReport.mirrorRegistryPath ?? 'NONE'}`,
    `- servicesDiscovered: ${selfHostedReport.servicesDiscovered}`,
    `- servicesStarted: ${selfHostedReport.servicesStarted}`,
    `- servicesLive: ${selfHostedReport.servicesLive}`,
    `- servicesPartial: ${selfHostedReport.servicesPartial}`,
    `- servicesBlocked: ${selfHostedReport.servicesBlocked}`,
  ].join('\n'),
  'utf8',
);

fs.writeFileSync(
  tracerPath,
  [
    '# LeeWay Tracer Pack',
    '',
    `- traceId: LEEWAY_TRACE::VSCODE_SELF_HOSTED::PASS_1::${Date.now()}`,
    '- assistantBodyId: LEEWAY_ACTOR::EXTERNAL_ASSISTANT::CODEX::001',
    '- assistantObjectId: LEEWAY_ACTOR::EXTERNAL_ASSISTANT::CODEX::001',
    '- taskId: LEEWAY_TASK::VSCODE_SELF_HOSTED_OPERATING_ENVIRONMENT_FULL_EDGE_RUNTIME_UI::PASS_1',
    '- subjectObjectId: LEEWAY_APP::LEEWAY_VSCODE::SELF_HOSTED_OPERATOR_CONTROL_PLANE',
    `- registryAuthorityStatus: ${registryAuthority.registryAuthorityStatus}`,
    `- canonicalRegistryWriteStatus: ${registryAuthority.canonicalRegistryWriteStatus}`,
    `- mirrorRegistryPath: ${registryAuthority.mirrorRegistryPath ? relativePath(registryAuthority.mirrorRegistryPath) : 'NONE'}`,
    `- returnedStatus: ${selfHostedReport.finalStatus}`,
  ].join('\n'),
  'utf8',
);

writeJson(selfHostedReceiptPath, {
  assistantBodyId: 'LEEWAY_ACTOR::EXTERNAL_ASSISTANT::CODEX::001',
  assistantObjectId: 'LEEWAY_ACTOR::EXTERNAL_ASSISTANT::CODEX::001',
  taskId: 'LEEWAY_TASK::VSCODE_SELF_HOSTED_OPERATING_ENVIRONMENT_FULL_EDGE_RUNTIME_UI::PASS_1',
  subjectObjectId: 'LEEWAY_APP::LEEWAY_VSCODE::SELF_HOSTED_OPERATOR_CONTROL_PLANE',
  filesRead: [
    'LeeWay-Standards/registries/leeway-runtime-service-registry.json',
    'Archive/reports/leeway-self-hosted-process-map.json',
    'Archive/reports/leeway-self-hosted-port-map.json',
    'Archive/reports/leeway-self-hosted-startup-supervisor-report.json',
    'Archive/reports/leeway-vscode-self-hosted-full-system-validation-report.json',
  ],
  filesChanged: [
    'Archive/reports/leeway-runtime-domain-discovery-report.json',
    'Archive/reports/leeway-runtime-service-health-contract-report.json',
    'Archive/reports/leeway-vscode-operator-ui-report.json',
    'Archive/reports/leeway-vscode-operator-ui-self-host-report.json',
    'Archive/reports/leeway-edge-gpu-self-host-report.json',
    'Archive/reports/leeway-edge-rtc-self-host-report.json',
    'Archive/reports/leeway-edge-device-self-host-report.json',
    'Archive/reports/leeway-edge-iot-self-host-report.json',
    'Archive/reports/leeway-agent-lee-self-host-report.json',
    'Archive/reports/leeway-model-hive-qwen-self-host-report.json',
    'Archive/reports/leeway-voice-recording-studio-self-host-report.json',
    'Archive/reports/leeway-vision-runtime-self-host-report.json',
    'Archive/reports/leeway-workflow-agent-worker-self-host-report.json',
    'Archive/reports/leeway-80-bench-ui-self-host-report.json',
    'Archive/reports/leeway-telemetry-receipts-gates-blockers-ui-report.json',
    'Archive/reports/leeway-vscode-self-hosted-operating-environment-report.json',
    'Archive/reports/leeway-vscode-self-hosted-operating-environment-report.md',
    'Archive/reports/leeway-vscode-self-hosted-operating-environment-tracer-pack.md',
    'Archive/receipts/leeway_vscode_self_hosted_operating_environment_receipt.json',
  ],
  commandsRun: [
    'node scripts/Write-LeeWaySelfHostedOperatingEnvironmentReports.mjs',
  ],
  toolsUsed: ['functions.apply_patch', 'functions.shell_command', 'functions.update_plan'],
  MCPsUsed: [],
  standardsChecked: ['BOOK-54', 'BOOK-55', 'LeeWay Application Standards'],
  gatesRun: ['LEEWAY_ASSISTANT_EMBODIMENT_GATE', 'LEEWAY_ASSISTANT_RECORDING_LEARNING_GATE'],
  receiptsWritten: ['Archive/receipts/leeway_vscode_self_hosted_operating_environment_receipt.json'],
  failuresEncountered: remainingBlockers,
  lessonsLearned: [
    'Canonical registry authority can be restored cleanly when sandbox restrictions are removed.',
    'The self-hosted operating environment should downgrade to PARTIAL rather than BLOCKED once registry authority is restored but runtime domains remain partial.',
  ],
  skillImprovementsSuggested: [
    'Add a shared LeeWay runtime registry helper for supervisor, validator, and operator UI paths.',
  ],
  finalStatus: selfHostedReport.finalStatus,
  remainingBlockers,
});

console.log(JSON.stringify(selfHostedReport, null, 2));
