import { NextRequest, NextResponse } from 'next/server';

const ROUTER_URL = process.env.LEEWAY_ROUTER_URL || 'http://127.0.0.1:8080';

function mapRegistryApp(app: any) {
  return {
    applicationId: app?.appId,
    applicationName: app?.displayName,
    aliases: Array.isArray(app?.aliases) ? app.aliases : [],
    category: app?.category ?? 'general',
    launchMethod: app?.launchMethod ?? 'path',
    executablePath: app?.executablePath ?? null,
    uri: app?.uri ?? null,
    safeToAutoOpen: Boolean(app?.safeToAutoOpen),
    requiresConfirmation: Boolean(app?.requiresConfirmation),
    supportsFileOpen: Boolean(app?.supportsFileOpen),
    supportedFileExtensions: Array.isArray(app?.supportedFileExtensions) ? app.supportedFileExtensions : [],
    notes: app?.notes ?? null,
    health: null,
    lifecycleState: 'registered',
    endpoints: {
      health: `${ROUTER_URL}/agent-lee/apps/${encodeURIComponent(app?.appId)}`,
      root: app?.appId ? `/apps/${encodeURIComponent(app.appId)}` : null,
    },
  };
}

export async function GET() {
  try {
    const response = await fetch(`${ROUTER_URL}/agent-lee/apps`, { signal: AbortSignal.timeout(10000) });
    if (!response.ok) {
      return NextResponse.json(
        { ok: false, error: 'AGENT_LEE_APP_REGISTRY_UNAVAILABLE', http: response.status, source: ROUTER_URL },
        { status: 502 },
      );
    }
    const data = await response.json();
    const rawApps = Array.isArray(data?.apps) ? data.apps : Array.isArray(data) ? data : [];
    return NextResponse.json({
      ok: true,
      source: 'agent-lee-router-8080',
      registryId: data?.registryId,
      version: data?.version,
      appCount: rawApps.length,
      applications: rawApps.map(mapRegistryApp),
      summary: data?.summary ?? null,
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: 'AGENT_LEE_APP_REGISTRY_UNREACHABLE', details: error?.message ?? String(error), source: ROUTER_URL },
      { status: 503 },
    );
  }
}
