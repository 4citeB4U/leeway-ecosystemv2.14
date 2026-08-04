import AgentLeeDeviceLayerIndexPanel from '@/components/AgentLeeDeviceLayerIndexPanel';

export const dynamic = 'force-dynamic';

export default function DeviceLayerIndexPage() {
  return (
    <>
      <AgentLeeDeviceLayerIndexPanel />

        <a
          data-leeway-risk-matrix-link="true"
          href="/risk-matrix"
          className="inline-flex items-center justify-center rounded-xl border border-rose-400/50 bg-rose-950/30 px-4 py-3 text-sm font-black text-rose-100 shadow-lg shadow-rose-950/20 transition hover:bg-rose-900/40"
        >
          Risk Matrix
        </a>
    </>
  );
}