import { NextRequest, NextResponse } from 'next/server';

const CANONICAL_AGENT_LEE_FINGERPRINT = 'leeway.agent-lee.code-mode.canonical.supreme-agent-lead.v1';

function readIdentityFingerprint(payload: any): string | null {
  return (
    payload?.identityFingerprint ||
    payload?.canonicalCodeMode?.identityFingerprint ||
    payload?.canonicalAgentLee?.identityFingerprint ||
    payload?.canonicalProof?.expectedIdentityFingerprint ||
    null
  );
}

function readCanonicalField(payload: any, snakeKey: string, camelKey: string) {
  return payload?.[snakeKey] ?? payload?.[camelKey] ?? null;
}

function universeVisibleToRuntimeFabric(payload: any): boolean {
  const manifest = payload?.manifest || payload?.universe || payload?.coreMap?.universe?.manifest || null;
  const harness = manifest?.statefulResearchHarness || payload?.coreMap?.statefulResearchHarnessCopies || null;
  const skills = manifest?.searchPaths?.skills || payload?.coreMap?.activeSkillSearchPaths || [];
  const capabilities = manifest?.searchPaths?.capabilities || payload?.coreMap?.activeCapabilitySearchPaths || [];
  return Boolean(
    harness?.activeCopy &&
    skills.some((entry: any) => String(entry?.absolute || entry).includes('stateful-research-harness')) &&
    capabilities.some((entry: any) => String(entry?.absolute || entry).includes('capability-registry'))
  );
}

async function probeCanonicalAgentLee(runtimeFabricUrl: string) {
  try {
    const identityResponse = await fetch(`${runtimeFabricUrl}/agent-lee/identity`, { method: 'GET' });
    const identity = await identityResponse.json().catch(() => ({}));
    const universeResponse = await fetch(`${runtimeFabricUrl}/agent-lee/universe`, { method: 'GET' });
    const universe = await universeResponse.json().catch(() => ({}));

    const fingerprint = readIdentityFingerprint(identity);
    const agentMode = readCanonicalField(identity, 'agent_mode', 'agentMode');
    const role = readCanonicalField(identity, 'role', 'role');
    const instanceContract = readCanonicalField(identity, 'instance_contract', 'instanceContract');
    const canonical = Boolean(identity?.canonical ?? identity?.canonicalCodeMode?.canonical ?? identity?.canonicalProof?.canonical ?? false);
    const fingerprintMatches = fingerprint === 'leeway.agent-lee.code-mode.canonical.supreme-agent-lead.v1';
    const universeVisible = universeVisibleToRuntimeFabric(universe);
    const ok = Boolean(
      identityResponse.ok &&
      universeResponse.ok &&
      canonical &&
      fingerprintMatches &&
      agentMode === 'code-mode' &&
      role === 'supreme-agent-lead' &&
      instanceContract === 'canonical-agent-lee-code-mode' &&
      universeVisible
    );

    return {
      ok,
      status: ok ? 'CANONICAL_AGENT_LEE_CONFIRMED' : 'NON_CANONICAL_AGENT_LEE_DETECTED',
      expectedFingerprint: 'leeway.agent-lee.code-mode.canonical.supreme-agent-lead.v1',
      fingerprint,
      fingerprintMatches,
      canonical,
      agentMode,
      role,
      instanceContract,
      universeVisible,
      identityStatus: identityResponse.status,
      universeStatus: universeResponse.status,
      identity,
      universe,
    };
  } catch (error: any) {
    return {
      ok: false,
      status: 'NON_CANONICAL_AGENT_LEE_UNREACHABLE',
      expectedFingerprint: 'leeway.agent-lee.code-mode.canonical.supreme-agent-lead.v1',
      fingerprint: null,
      fingerprintMatches: false,
      canonical: false,
      agentMode: null,
      role: null,
      instanceContract: null,
      universeVisible: false,
      identityStatus: 0,
      universeStatus: 0,
      identity: { error: error?.message || String(error) },
      universe: { error: error?.message || String(error) },
    };
  }
}

export async function GET() {
  const runtimeFabricUrl = process.env.LEEWAY_RUNTIME_FABRIC_URL || 'http://127.0.0.1:4001';

  const [runtimeHealth, canonicalProbe] = await Promise.all([
    (async () => {
      try {
        const response = await fetch(`${process.env.LEEWAY_RUNTIME_FABRIC_URL || 'http://127.0.0.1:4001'}/runtime/health`, { method: 'GET' });
        const data = await response.json().catch(() => ({}));
        return { ok: response.ok, status: response.status, data };
      } catch (error: any) {
        return { ok: false, status: 0, data: { error: error?.message || String(error) } };
      }
    })(),
    probeCanonicalAgentLee(process.env.LEEWAY_RUNTIME_FABRIC_URL || 'http://127.0.0.1:4001'),
  ]);

  if (!runtimeHealth.ok) {
    return NextResponse.json({
      ok: false,
      status: 'DEGRADED_RUNTIME_FABRIC_OFFLINE',
      runtimeFabricReachable: false,
      runtimeFabricStatus: runtimeHealth.status,
      agentLeeCanonical: false,
      expectedFingerprint: 'leeway.agent-lee.code-mode.canonical.supreme-agent-lead.v1',
      identityFingerprint: null,
      agentMode: null,
      role: null,
      instanceContract: null,
      runtimeFabricHealth: runtimeHealth.data,
      canonicalAgentLee: canonicalProbe,
    }, { status: 503 });
  }

  const agentLeeCanonical = Boolean(canonicalProbe.ok);
  return NextResponse.json({
    ok: agentLeeCanonical,
    status: agentLeeCanonical ? 'CANONICAL_RUNTIME_FABRIC_CONFIRMED' : 'DEGRADED_NON_CANONICAL_AGENT_LEE',
    runtimeFabricReachable: true,
    runtimeFabricStatus: runtimeHealth.status,
    runtimeFabricHealth: runtimeHealth.data,
    agentLeeCanonical,
    expectedFingerprint: 'leeway.agent-lee.code-mode.canonical.supreme-agent-lead.v1',
    identityFingerprint: canonicalProbe.fingerprint || runtimeHealth.data?.identityFingerprint || null,
    agentMode: canonicalProbe.agentMode,
    role: canonicalProbe.role,
    instanceContract: canonicalProbe.instanceContract,
    canonicalAgentLee: canonicalProbe,
  });
}