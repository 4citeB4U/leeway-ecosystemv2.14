import Link from 'next/link';

const ROUTER_URL = process.env.LEEWAY_ROUTER_URL || 'http://127.0.0.1:8080';

export default async function AppSurfacePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let app: any = null;
  let error: string | null = null;
  try {
    const response = await fetch(`${ROUTER_URL}/agent-lee/apps/${encodeURIComponent(id)}`, { cache: 'no-store', signal: AbortSignal.timeout(8000) });
    if (response.ok) {
      const data = await response.json();
      app = data?.app ?? null;
    } else {
      error = `router returned ${response.status}`;
    }
  } catch (e: any) {
    error = e?.message ?? String(e);
  }

  return (
    <div className="min-h-full flex flex-col bg-[#0d1117] text-[#c9d1d9] font-sans">
      <div className="flex items-center justify-between px-4 py-2 border-b border-[#30363d] bg-[#161b22]">
        <span className="text-[11px] font-bold text-white">{app?.displayName ?? id}</span>
        <span className="text-[9px] font-mono text-gray-500">LeeWay Application Surface · OS window content · same-origin BFF</span>
      </div>
      <div className="flex-1 p-6">
        <div className="max-w-xl mx-auto rounded-xl border border-[#30363d] bg-[#161b22]/60 p-5">
          <div className="text-[13px] font-bold text-white mb-1">{app?.displayName ?? 'Application surface'}</div>
          <div className="text-[10px] font-mono text-gray-500 mb-4">{app?.appId ?? id}</div>
          <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
            <div className="text-gray-500">category</div>
            <div className="text-gray-300">{app?.category ?? '-'}</div>
            <div className="text-gray-500">launch method</div>
            <div className="text-gray-300">{app?.launchMethod ?? '-'}</div>
            <div className="text-gray-500">safe to auto open</div>
            <div className="text-gray-300">{String(Boolean(app?.safeToAutoOpen))}</div>
            <div className="text-gray-500">requires confirmation</div>
            <div className="text-gray-300">{String(Boolean(app?.requiresConfirmation))}</div>
            <div className="text-gray-500">file open capable</div>
            <div className="text-gray-300">{String(Boolean(app?.supportsFileOpen))}</div>
            <div className="text-gray-500">file extensions</div>
            <div className="text-gray-300">{Array.isArray(app?.supportedFileExtensions) ? app.supportedFileExtensions.join(', ') : '-'}</div>
          </div>
          {app?.notes && <div className="mt-4 text-[10px] text-gray-500">{app.notes}</div>}
          {error && <div className="mt-4 text-[10px] font-mono text-amber-400">registry detail unavailable: {error}</div>}
        </div>
      </div>
      <div className="px-4 py-2 border-t border-[#30363d] bg-[#161b22] flex items-center justify-between">
        <span className="text-[9px] font-mono text-gray-600">Managed window via WindowManager · session state persists</span>
        <Link href="/" className="text-[9px] font-mono text-blue-400 hover:text-blue-300">Back to LeeWay IDE</Link>
      </div>
    </div>
  );
}
