export default function AgentLeeDeviceLayerIndexPanel() {
  return (
    <main className='min-h-screen bg-slate-950 p-6 text-slate-100'>
      <section className='mx-auto max-w-6xl space-y-6'>
        <div className='rounded-3xl border border-emerald-700/50 bg-slate-900/70 p-6 shadow-2xl'>
          <div className='text-sm font-semibold uppercase tracking-[0.3em] text-emerald-300'>Agent Lee Device Layer</div>
          <h1 className='mt-3 text-3xl font-black text-white'>Completed Device Lanes Index</h1>
          <p className='mt-3 max-w-4xl text-sm leading-6 text-slate-300'>
            Locked GET-only index for completed device lanes. This page cannot execute device actions, control devices, onboard devices, print, command the phone, log into the router, scan the network, deploy bridges, or perform physical action.
          </p>
        </div>
        <div className='grid grid-cols-1 gap-4 md:grid-cols-4'>
          <div className='rounded-xl border border-slate-700 bg-slate-900/70 px-3 py-2'><div className='text-xs text-slate-400'>Readiness</div><div className='text-sm font-semibold text-emerald-200'>/device-readiness</div></div>
          <div className='rounded-xl border border-slate-700 bg-slate-900/70 px-3 py-2'><div className='text-xs text-slate-400'>Printer</div><div className='text-sm font-semibold text-emerald-200'>/printer-ipp-locked-stub</div></div>
          <div className='rounded-xl border border-slate-700 bg-slate-900/70 px-3 py-2'><div className='text-xs text-slate-400'>Phone</div><div className='text-sm font-semibold text-emerald-200'>/phone-satellite</div></div>
          <div className='rounded-xl border border-slate-700 bg-slate-900/70 px-3 py-2'><div className='text-xs text-slate-400'>Router</div><div className='text-sm font-semibold text-emerald-200'>/router-status</div></div>
        </div>
        <section className='rounded-3xl border border-slate-700 bg-slate-900/70 p-5'>
          <h2 className='text-xl font-bold text-emerald-200'>Global Hard Blocks</h2>
          <ul className='mt-4 space-y-2 text-sm text-slate-300'>
            <li>Execution authority remains false.</li>
            <li>Device-control and onboarding authority remain false.</li>
            <li>Printer action and queue mutation authority remain false.</li>
            <li>Phone, ADB, and Bluetooth pairing authority remain false.</li>
            <li>Router login, credential use, network scan, and config mutation authority remain false.</li>
            <li>Bridge deploy, protocol translator, and physical action authority remain false.</li>
          </ul>
        </section>
      </section>
    </main>
  );
}