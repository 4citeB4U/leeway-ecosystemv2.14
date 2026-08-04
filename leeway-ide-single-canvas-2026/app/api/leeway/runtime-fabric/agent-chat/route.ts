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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const input = String(body?.input || body?.message || body?.prompt || '').trim();
    if (!input) {
      return NextResponse.json({
        ok: false,
        error: 'AGENT_LEE_CHAT_INPUT_REQUIRED',
        message: 'input field required',
      }, { status: 400 });
    }

    const runtimeFabricUrl = process.env.LEEWAY_RUNTIME_FABRIC_URL || 'http://127.0.0.1:4001';
    const routerUrl = process.env.LEEWAY_ROUTER_URL || 'http://127.0.0.1:8080';
    const canonicalProbe = await probeCanonicalAgentLee(runtimeFabricUrl);
    if (!canonicalProbe.ok) {
      return NextResponse.json({
        ok: false,
        error: 'NON_CANONICAL_AGENT_LEE_DETECTED',
        message: 'Runtime Fabric is reachable, but it is not proving the canonical Agent Lee fingerprint.',
        canonicalProbe,
      }, { status: 409 });
    }

    let response = await fetch(`${runtimeFabricUrl}/agent-lee/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Leeway-Surface': 'leeway-ide-single-canvas' },
      body: JSON.stringify({
        input,
        mode: body?.mode || 'chat',
        speak: Boolean(body?.speak),
      }),
    });

    let fallbackUsed = false;
    if (!response.ok) {
      const fabricErrorText = await response.text();
      const routerOfflineMarkers = /AGENT_LEE_ROUTER_8080_OFFLINE|router[\s_-]?offline|fetch failed/i.test(fabricErrorText);
      if (routerOfflineMarkers) {
        response = await fetch(`${routerUrl}/agent-lee/conversation/turn`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Leeway-Surface': 'leeway-ide-single-canvas' },
          body: JSON.stringify({ input, mode: body?.mode || 'chat', speak: Boolean(body?.speak) }),
          signal: AbortSignal.timeout(90000),
        });
        fallbackUsed = true;
      } else {
        return new NextResponse(fabricErrorText, {
          status: response.status,
          headers: { 'content-type': response.headers.get('content-type') || 'application/json' },
        });
      }
    }

    const text = await response.text();
    return new NextResponse(text, {
      status: response.status,
      headers: {
        'content-type': response.headers.get('content-type') || 'application/json',
        'x-leeway-chat-fallback': String(fallbackUsed),
      },
    });
  } catch (error: any) {
    return NextResponse.json({
      error: 'LEEWAY_RUNTIME_FABRIC_UNREACHABLE',
      text: 'Agent Lee is waiting on the Leeway Runtime Fabric bridge. Start the runtime fabric or set LEEWAY_RUNTIME_FABRIC_URL.',
      details: error?.message || 'Runtime fabric request failed',
    }, { status: 503 });
  }
}