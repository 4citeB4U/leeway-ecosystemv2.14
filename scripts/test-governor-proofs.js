import fs from 'node:fs';
import path from 'node:path';

const BASE_URL = 'http://127.0.0.1:7600';

async function runTests() {
  const proofs = [];

  console.log('Starting positive and negative proof tests...');

  // Helper for POST requests
  async function post(route, body) {
    const res = await fetch(`${BASE_URL}${route}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    return await res.json();
  }

  // Helper for GET requests
  async function get(route) {
    const res = await fetch(`${BASE_URL}${route}`);
    return await res.json();
  }

  // --- POSITIVE PROOFS ---

  // 1. GET /api/leeway/governor/status returns full LeeWay structure.
  console.log('Running Positive Proof 1...');
  const p1 = await get('/api/leeway/governor/status');
  proofs.push({
    testName: 'Positive Proof 1: Governor Status returns full structure',
    passed: p1.leewayRouteId === 'LEEWAY_ROUTE::API::LEEWAY_GOVERNOR::STATUS' && p1.allowed === true,
    leewayRouteId: p1.leewayRouteId,
    leewayGovernorId: p1.leewayGovernorId,
    leewayGateId: p1.leewayGateId,
    leewayDecisionId: p1.leewayDecisionId,
    leewayReceiptId: p1.leewayReceiptId,
    leewayTelemetryId: p1.leewayTelemetryId,
    truthLabel: p1.truthLabel,
    details: p1
  });

  // 2. Shield Governor low-risk scratch write returns ALLOW.
  console.log('Running Positive Proof 2...');
  const p2 = await post('/api/leeway/governor/shield-governor/review', {
    leewayActionType: 'WRITE_FILE',
    leewayActionScope: 'scratch/test-write.txt',
    leewayRiskLevel: 'low',
    leewayAuthorityId: 'LEEWAY_AUTHORITY::CREATOR_DELEGATED::LEONARD_LEE::ANTI_PLAN_LOOP_LEEWAY_GOVERNOR_EXECUTION'
  });
  proofs.push({
    testName: 'Positive Proof 2: Shield Governor low-risk scratch write allowed',
    passed: p2.leewayDecision === 'LEEWAY_GOVERNOR_DECISION::ALLOW' && p2.allowed === true,
    leewayRouteId: p2.leewayRouteId,
    leewayGovernorId: p2.leewayGovernorId,
    leewayGateId: p2.leewayGateId,
    leewayDecisionId: p2.leewayDecisionId,
    leewayReceiptId: p2.leewayReceiptId,
    leewayTelemetryId: p2.leewayTelemetryId,
    truthLabel: p2.truthLabel,
    details: p2
  });

  // 3. Attestation Marshal valid authority returns ALLOW.
  console.log('Running Positive Proof 3...');
  const p3 = await post('/api/leeway/governor/attestation-marshal/verify', {
    leewayActionType: 'VERIFY_AUTHORITY',
    leewayRiskLevel: 'medium',
    leewayAuthorityId: 'LEEWAY_AUTHORITY::CREATOR_DELEGATED::LEONARD_LEE::ANTI_PLAN_LOOP_LEEWAY_GOVERNOR_EXECUTION'
  });
  proofs.push({
    testName: 'Positive Proof 3: Attestation Marshal valid authority allowed',
    passed: p3.leewayDecision === 'LEEWAY_GOVERNOR_DECISION::ALLOW' && p3.allowed === true,
    leewayRouteId: p3.leewayRouteId,
    leewayGovernorId: p3.leewayGovernorId,
    leewayGateId: p3.leewayGateId,
    leewayDecisionId: p3.leewayDecisionId,
    leewayReceiptId: p3.leewayReceiptId,
    leewayTelemetryId: p3.leewayTelemetryId,
    truthLabel: p3.truthLabel,
    details: p3
  });

  // 4. Memory Warden low-risk non-memory action returns ALLOW.
  console.log('Running Positive Proof 4...');
  const p4 = await post('/api/leeway/governor/memory-warden/review', {
    leewayActionType: 'WRITE_FILE',
    leewayActionScope: 'scratch/non-memory.txt',
    leewayRiskLevel: 'low',
    leewayAuthorityId: 'LEEWAY_AUTHORITY::CREATOR_DELEGATED::LEONARD_LEE::ANTI_PLAN_LOOP_LEEWAY_GOVERNOR_EXECUTION'
  });
  proofs.push({
    testName: 'Positive Proof 4: Memory Warden low-risk non-memory write allowed',
    passed: p4.leewayDecision === 'LEEWAY_GOVERNOR_DECISION::ALLOW' && p4.allowed === true,
    leewayRouteId: p4.leewayRouteId,
    leewayGovernorId: p4.leewayGovernorId,
    leewayGateId: p4.leewayGateId,
    leewayDecisionId: p4.leewayDecisionId,
    leewayReceiptId: p4.leewayReceiptId,
    leewayTelemetryId: p4.leewayTelemetryId,
    truthLabel: p4.truthLabel,
    details: p4
  });

  // 5. Threat Sentinel safe command returns ALLOW.
  console.log('Running Positive Proof 5...');
  const p5 = await post('/api/leeway/governor/threat-sentinel/scan', {
    leewayActionType: 'RUN_COMMAND',
    command: 'npm run lint',
    leewayRiskLevel: 'low',
    leewayAuthorityId: 'LEEWAY_AUTHORITY::CREATOR_DELEGATED::LEONARD_LEE::ANTI_PLAN_LOOP_LEEWAY_GOVERNOR_EXECUTION'
  });
  proofs.push({
    testName: 'Positive Proof 5: Threat Sentinel safe command allowed',
    passed: p5.leewayDecision === 'LEEWAY_GOVERNOR_DECISION::ALLOW' && p5.allowed === true,
    leewayRouteId: p5.leewayRouteId,
    leewayGovernorId: p5.leewayGovernorId,
    leewayGateId: p5.leewayGateId,
    leewayDecisionId: p5.leewayDecisionId,
    leewayReceiptId: p5.leewayReceiptId,
    leewayTelemetryId: p5.leewayTelemetryId,
    truthLabel: p5.truthLabel,
    details: p5
  });

  // 6. POST /api/leeway/agent-lee/tasks/intake returns LEEWAY_AGENT_LEE_TASK_INTAKE_ACCEPTED.
  console.log('Running Positive Proof 6...');
  const p6 = await post('/api/leeway/agent-lee/tasks/intake', {
    leewayDispatchId: 'LEEWAY_DISPATCH::TASK_INTAKE_PROOF',
    leewayAuthorityId: 'LEEWAY_AUTHORITY::CREATOR_DELEGATED::LEONARD_LEE::ANTI_PLAN_LOOP_LEEWAY_GOVERNOR_EXECUTION',
    leewaySubjectObjectId: 'LEEWAY_AGENT::AGENT_LEE',
    leewaySelectedAppId: 'LEEWAY_APP::ADMINISTRATIVE_COCKPIT',
    leewayAgentId: 'agent-lee',
    leewayTask: 'Perform emergency workspace diagnostics and status check.',
    leewayWorkflowId: 'LEEWAY_WORKFLOW::PROOFS',
    leewayRiskLevel: 'low',
    leewayGovernorDecision: 'LEEWAY_GOVERNOR_DECISION::ALLOW',
    leewayReceiptRequired: true,
    leewayTelemetryRequired: true
  });
  proofs.push({
    testName: 'Positive Proof 6: Task Intake accepted',
    passed: p6.dispatchStatus === 'LEEWAY_AGENT_LEE_TASK_INTAKE_ACCEPTED' && p6.accepted === true,
    leewayRouteId: p6.leewayRouteId,
    leewayGovernorId: 'LEEWAY_AGENT::AGENT_LEE',
    leewayGateId: 'LEEWAY_GATE::AGENT_LEE::TASK_INTAKE',
    leewayDecisionId: null,
    leewayReceiptId: p6.leewayReceiptId,
    leewayTelemetryId: p6.leewayTelemetryId,
    truthLabel: p6.truthLabel,
    details: p6
  });

  // --- NEGATIVE PROOFS ---

  // 1. path traversal denied.
  console.log('Running Negative Proof 1...');
  const n1 = await post('/api/leeway/governor/shield-governor/review', {
    leewayActionType: 'WRITE_FILE',
    leewayActionScope: '../../outside-workspace.txt',
    leewayRiskLevel: 'medium',
    leewayAuthorityId: 'LEEWAY_AUTHORITY::CREATOR_DELEGATED::LEONARD_LEE::ANTI_PLAN_LOOP_LEEWAY_GOVERNOR_EXECUTION'
  });
  proofs.push({
    testName: 'Negative Proof 1: Shield Governor denies path traversal',
    passed: n1.leewayDecision === 'LEEWAY_GOVERNOR_DECISION::DENY' && n1.allowed === false && n1.leewayBlockers.includes('PATH_TRAVERSAL_DETECTED'),
    leewayRouteId: n1.leewayRouteId,
    leewayGovernorId: n1.leewayGovernorId,
    leewayGateId: n1.leewayGateId,
    leewayDecisionId: n1.leewayDecisionId,
    leewayReceiptId: n1.leewayReceiptId,
    leewayTelemetryId: n1.leewayTelemetryId,
    truthLabel: n1.truthLabel,
    details: n1
  });

  // 2. critical destructive action denied.
  console.log('Running Negative Proof 2...');
  const n2 = await post('/api/leeway/governor/shield-governor/review', {
    leewayActionType: 'DESTRUCTIVE',
    leewayActionScope: 'src/server.ts',
    leewayRiskLevel: 'critical',
    leewayAuthorityId: 'LEEWAY_AUTHORITY::CREATOR_DELEGATED::LEONARD_LEE::ANTI_PLAN_LOOP_LEEWAY_GOVERNOR_EXECUTION'
  });
  proofs.push({
    testName: 'Negative Proof 2: Shield Governor denies destructive action',
    passed: n2.leewayDecision === 'LEEWAY_GOVERNOR_DECISION::DENY' && n2.allowed === false && n2.leewayBlockers.includes('CRITICAL_RISK_BLOCKED'),
    leewayRouteId: n2.leewayRouteId,
    leewayGovernorId: n2.leewayGovernorId,
    leewayGateId: n2.leewayGateId,
    leewayDecisionId: n2.leewayDecisionId,
    leewayReceiptId: n2.leewayReceiptId,
    leewayTelemetryId: n2.leewayTelemetryId,
    truthLabel: n2.truthLabel,
    details: n2
  });

  // 3. suspicious command denied.
  console.log('Running Negative Proof 3...');
  const n3 = await post('/api/leeway/governor/threat-sentinel/scan', {
    leewayActionType: 'RUN_COMMAND',
    command: 'rm -rf /',
    leewayRiskLevel: 'high',
    leewayAuthorityId: 'LEEWAY_AUTHORITY::CREATOR_DELEGATED::LEONARD_LEE::ANTI_PLAN_LOOP_LEEWAY_GOVERNOR_EXECUTION'
  });
  proofs.push({
    testName: 'Negative Proof 3: Threat Sentinel denies suspicious command',
    passed: n3.leewayDecision === 'LEEWAY_GOVERNOR_DECISION::DENY' && n3.allowed === false && n3.leewayBlockers.includes('SUSPICIOUS_SHELL_COMMAND'),
    leewayRouteId: n3.leewayRouteId,
    leewayGovernorId: n3.leewayGovernorId,
    leewayGateId: n3.leewayGateId,
    leewayDecisionId: n3.leewayDecisionId,
    leewayReceiptId: n3.leewayReceiptId,
    leewayTelemetryId: n3.leewayTelemetryId,
    truthLabel: n3.truthLabel,
    details: n3
  });

  // 4. missing leewayAuthorityId denied.
  console.log('Running Negative Proof 4...');
  const n4 = await post('/api/leeway/governor/attestation-marshal/verify', {
    leewayActionType: 'VERIFY_AUTHORITY',
    leewayRiskLevel: 'medium',
    leewayAuthorityId: ''
  });
  proofs.push({
    testName: 'Negative Proof 4: Attestation Marshal denies missing authority ID',
    passed: n4.leewayDecision === 'LEEWAY_GOVERNOR_DECISION::DENY' && n4.allowed === false && n4.leewayBlockers.includes('MISSING_LEEWAY_AUTHORITY_ID'),
    leewayRouteId: n4.leewayRouteId,
    leewayGovernorId: n4.leewayGovernorId,
    leewayGateId: n4.leewayGateId,
    leewayDecisionId: n4.leewayDecisionId,
    leewayReceiptId: n4.leewayReceiptId,
    leewayTelemetryId: n4.leewayTelemetryId,
    truthLabel: n4.truthLabel,
    details: n4
  });

  // 5. external network action denied unless explicitly approved.
  console.log('Running Negative Proof 5...');
  const n5 = await post('/api/leeway/governor/shield-governor/review', {
    leewayActionType: 'EXTERNAL_NETWORK',
    leewayActionScope: 'internet',
    command: 'curl http://malicious-site.com',
    leewayRiskLevel: 'high',
    leewayAuthorityId: 'LEEWAY_AUTHORITY::CREATOR_DELEGATED::LEONARD_LEE::ANTI_PLAN_LOOP_LEEWAY_GOVERNOR_EXECUTION'
  });
  proofs.push({
    testName: 'Negative Proof 5: Shield Governor denies unapproved external network action',
    passed: n5.leewayDecision === 'LEEWAY_GOVERNOR_DECISION::DENY' && n5.allowed === false && n5.leewayBlockers.includes('NETWORK_UNAPPROVED'),
    leewayRouteId: n5.leewayRouteId,
    leewayGovernorId: n5.leewayGovernorId,
    leewayGateId: n5.leewayGateId,
    leewayDecisionId: n5.leewayDecisionId,
    leewayReceiptId: n5.leewayReceiptId,
    leewayTelemetryId: n5.leewayTelemetryId,
    truthLabel: n5.truthLabel,
    details: n5
  });

  console.log('Writing proof report...');
  const reportPath = path.resolve('Archive/reports/leeway-governor-positive-negative-proof-report.json');
  const allPassed = proofs.every(p => p.passed);
  
  const reportPayload = {
    leewayReportId: 'LEEWAY_REPORT::GOVERNOR_POSITIVE_NEGATIVE_PROOFS',
    leewayAuthorityId: 'LEEWAY_AUTHORITY::CREATOR_DELEGATED::LEONARD_LEE::ANTI_PLAN_LOOP_LEEWAY_GOVERNOR_EXECUTION',
    status: allPassed ? 'PROOFS_ALL_PASS' : 'PROOFS_DEGRADED',
    totalTests: proofs.length,
    passedCount: proofs.filter(p => p.passed).length,
    failedCount: proofs.filter(p => !p.passed).length,
    proofs: proofs
  };

  fs.writeFileSync(reportPath, JSON.stringify(reportPayload, null, 2), 'utf8');
  console.log(`Proofs completed! Report written to: ${reportPath}`);
  console.log(`Result: ${allPassed ? 'ALL PASS' : 'SOME FAILED'}`);
}

runTests().catch(console.error);
