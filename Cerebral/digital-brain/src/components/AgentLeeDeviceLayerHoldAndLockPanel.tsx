export default function AgentLeeDeviceLayerHoldAndLockPanel() {
  return (
    <main className='min-h-screen bg-slate-950 p-6 text-slate-100'>
      <section className='mx-auto max-w-6xl space-y-6'>
        <div className='rounded-3xl border border-amber-600/50 bg-slate-900/70 p-6 shadow-2xl'>
          <div className='text-sm font-semibold uppercase tracking-[0.3em] text-amber-300'>Agent Lee Phase 45</div>
          <h1 className='mt-3 text-3xl font-black text-white'>Device Layer Hold And Lock</h1>
          <p className='mt-3 max-w-4xl text-sm leading-6 text-slate-300'>
            Locked GET-only hold state across completed Device Layer lanes. This page cannot execute, control devices, onboard devices, print, command the phone, perform router actions, scan, deploy bridges, unlock authority, or perform physical action.
          </p>
        </div>
        <div className='grid grid-cols-1 gap-4 md:grid-cols-3'>
          <div className='rounded-xl border border-slate-700 bg-slate-900/70 px-4 py-3'><div className='text-xs text-slate-400'>Held lanes</div><div className='text-2xl font-black text-amber-200'>6</div></div>
          <div className='rounded-xl border border-slate-700 bg-slate-900/70 px-4 py-3'><div className='text-xs text-slate-400'>Hard stop rules</div><div className='text-2xl font-black text-amber-200'>10</div></div>
          <div className='rounded-xl border border-slate-700 bg-slate-900/70 px-4 py-3'><div className='text-xs text-slate-400'>Authority</div><div className='text-2xl font-black text-amber-200'>Locked</div></div>
        </div>
        <section className='rounded-3xl border border-slate-700 bg-slate-900/70 p-5'>
          <h2 className='text-xl font-bold text-amber-200'>Hold Rules</h2>
          <ul className='mt-4 space-y-2 text-sm text-slate-300'>
            <li>Stop before execution, device-control, or onboarding.</li>
            <li>Stop before printer, phone, router, bridge, protocol translator, or scan actions.</li>
            <li>Stop before authority unlock or physical action.</li>
            <li>Require a new explicit human approval contract before any future non-read-only lane.</li>
          </ul>
        </section>
      </section>
    </main>
  );
}