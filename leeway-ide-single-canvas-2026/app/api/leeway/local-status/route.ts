import { NextResponse } from 'next/server';

const RUNTIME_FABRIC_URL = process.env.LEEWAY_RUNTIME_FABRIC_URL || 'http://127.0.0.1:4001';

async function probe(label: string, url: string) {
  try {
    const response = await fetch(url, { method: 'GET' });
    const data = await response.json().catch(() => ({}));
    return { label, ok: response.ok, status: response.status, data };
  } catch (error: any) {
    return { label, ok: false, status: 0, data: { error: error?.message || String(error) } };
  }
}

async function probeCanonicalAgentLee(runtimeFabricUrl: string) {
  try {
    const identityResponse = await fetch(`${runtimeFabricUrl}/agent-lee/identity`, { method: 'GET' });
    const identity = await identityResponse.json().catch(() => ({}));
    const universeResponse = await fetch(`${runtimeFabricUrl}/agent-lee/universe`, { method: 'GET' });
    const universe = await universeResponse.json().catch(() => ({}));

    const fingerprint = identity?.identityFingerprint || identity?.canonicalCodeMode?.identityFingerprint || identity?.canonicalAgentLee?.identityFingerprint || identity?.canonicalProof?.expectedIdentityFingerprint || null;
    const agentMode = identity?.agent_mode || identity?.agentMode || null;
    const role = identity?.role || null;
    const instanceContract = identity?.instance_contract || identity?.instanceContract || null;
    const canonical = Boolean(identity?.canonical ?? identity?.canonicalCodeMode?.canonical ?? identity?.canonicalProof?.canonical ?? false);
    const fingerprintMatches = fingerprint === 'leeway.agent-lee.code-mode.canonical.supreme-agent-lead.v1';
    const universeVisible = Boolean(
      universe?.manifest?.statefulResearchHarness?.activeCopy &&
      universe?.manifest?.searchPaths?.skills?.some((entry: any) => String(entry?.absolute || entry).includes('stateful-research-harness')) &&
      universe?.manifest?.searchPaths?.capabilities?.some((entry: any) => String(entry?.absolute || entry).includes('capability-registry'))
    );

    return {
      ok: identityResponse.ok && universeResponse.ok && canonical && fingerprintMatches &&
          agentMode === 'code-mode' && role === 'supreme-agent-lead' &&
          instanceContract === 'canonical-agent-lee-code-mode' && universeVisible,
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
  const agentLeeProof = await probeCanonicalAgentLee(process.env.LEEWAY_RUNTIME_FABRIC_URL || 'http://127.0.0.1:4001');
  
  const [fabric, router, desktop, ollama, cerebralDaemon, deviceLocal, terminalStatus, wslStatus] = await Promise.all([
    probe('Runtime Fabric 4001', `${process.env.LEEWAY_RUNTIME_FABRIC_URL || 'http://127.0.0.1:4001'}/runtime/health`),
    probe('Router 8080', 'http://127.0.0.1:8080/health'),
    probe('Desktop 8091', 'http://127.0.0.1:8091/runtime/status'),
    probe('Ollama 11434', 'http://127.0.0.1:11434/api/tags'),
    probe('CerebralDaemon 8765', 'http://127.0.0.1:8765/api/health'),
    probe('Local Device Fabric', `${process.env.LEEWAY_RUNTIME_FABRIC_URL || 'http://127.0.0.1:4001'}/device/local/status`),
    probe('Local Terminal Fabric', `${process.env.LEEWAY_RUNTIME_FABRIC_URL || 'http://127.0.0.1:4001'}/terminal/status`),
    probe('Ubuntu WSL', `${process.env.LEEWAY_RUNTIME_FABRIC_URL || 'http://127.0.0.1:4001'}/device/wsl/status`),
  ]);

  const agentLeeOk = agentLeeProof.ok;
  const routerValue = typeof router.data?.router === 'string'
    ? router.data.router
    : router.ok ? 'online' : 'offline';

  const terminalStatusValue = typeof terminalStatus.data?.terminalFabric === 'string'
    ? `Local Terminal Fabric: ${String(terminalStatus.data.terminalFabric).toLowerCase() === 'online' ? 'Online' : String(terminalStatus.data.terminalFabric)}`
    : terminalStatus.ok ? 'Local Terminal Fabric: Online' : 'Local Terminal Fabric: Offline';

  const powerShellValue = typeof deviceLocal.data?.powershell?.available === 'boolean'
    ? (deviceLocal.data.powershell.available ? 'available' : 'missing')
    : 'unknown';
  const powerShell7Value = typeof deviceLocal.data?.powershell7?.available === 'boolean'
    ? (deviceLocal.data.powershell7.available ? 'available' : 'unavailable')
    : 'unknown';
  const ubuntuStatus = wslStatus.data?.ubuntu || deviceLocal.data?.wsl?.ubuntu || {};
  const wslUbuntuValue = typeof ubuntuStatus?.installed === 'boolean'
    ? (ubuntuStatus.installed ? (ubuntuStatus.running ? 'running / healthy' : 'installed / stopped') : 'unavailable')
    : 'unknown';
  const wslReceiptPath = wslStatus.data?.receiptPath || null;

  const overallOk = Boolean(agentLeeProof.ok && fabric.ok && router.ok && desktop.ok && ollama.ok && cerebralDaemon.ok);

  return Response.json({
    ok: overallOk,
    status: agentLeeProof.ok ? 'CANONICAL_AGENT_LEE_ONLINE' : 'DEGRADED_NON_CANONICAL_AGENT_LEE',
    canonicalAgentLee: agentLeeProof,
    services: [
      { label: 'Agent Lee', value: agentLeeOk ? 'canonical' : 'degraded', ok: agentLeeOk, fingerprint: agentLeeProof.fingerprint, matchesFingerprint: agentLeeProof.fingerprintMatches },
      { label: 'Runtime Fabric 4001', value: fabric.ok ? 'online' : 'offline', ok: fabric.ok },
      { label: 'Router 8080', value: routerValue, ok: router.ok },
      { label: 'Desktop 8091', value: desktop.ok ? 'online' : 'offline', ok: desktop.ok },
      { label: 'Ollama 11434', value: ollama.ok ? 'online' : 'offline', ok: ollama.ok },
      { label: 'CerebralDaemon 8765', value: cerebralDaemon.ok ? 'online' : 'offline', ok: cerebralDaemon.ok },
      { label: 'Local Device Fabric', value: deviceLocal.ok ? 'online' : 'offline', ok: deviceLocal.ok },
      { label: 'Local Terminal Fabric', value: terminalStatusValue, ok: terminalStatus.ok },
      { label: 'Windows PowerShell', value: powerShellValue, ok: Boolean(deviceLocal.data?.powershell?.available) },
      { label: 'PowerShell 7', value: powerShell7Value, ok: Boolean(deviceLocal.data?.powershell7?.available) },
      { label: 'Ubuntu WSL', value: wslUbuntuValue, ok: Boolean(ubuntuStatus?.installed), running: Boolean(ubuntuStatus?.running), receiptPath: wslReceiptPath },
    ],
    raw: { agentLeeProof, fabric, router, desktop, ollama, cerebralDaemon, deviceLocal, terminalStatus, wslStatus },
  });
}