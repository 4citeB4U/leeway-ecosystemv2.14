export default function AgentLeePhoneSatellitePanel() {
  return (
    <main className='min-h-screen bg-slate-950 p-6 text-slate-100'>
      <section className='mx-auto max-w-6xl space-y-6'>
        <div className='rounded-3xl border border-indigo-700/50 bg-slate-900/70 p-6 shadow-2xl'>
          <div className='text-sm font-semibold uppercase tracking-[0.3em] text-indigo-300'>Agent Lee Device Layer</div>
          <h1 className='mt-3 text-3xl font-black text-white'>Phone Satellite Readiness</h1>
          <p className='mt-3 max-w-4xl text-sm leading-6 text-slate-300'>
            Locked GET-only phone satellite readiness. This page cannot pair, connect, invoke ADB, install Tailscale, command the handset, transfer files, send SMS, start calls, access camera, or access microphone.
          </p>
        </div>
        <div className='grid grid-cols-1 gap-4 md:grid-cols-3'>
          <div className='rounded-xl border border-slate-700 bg-slate-900/70 px-3 py-2'><div className='text-xs text-slate-400'>Target</div><div className='text-sm font-semibold text-indigo-200'>Leonard Galaxy Z Fold6</div></div>
          <div className='rounded-xl border border-slate-700 bg-slate-900/70 px-3 py-2'><div className='text-xs text-slate-400'>Authority</div><div className='text-sm font-semibold text-emerald-300'>LOCKED_DRAFT_ONLY_NO_EXECUTE</div></div>
          <div className='rounded-xl border border-slate-700 bg-slate-900/70 px-3 py-2'><div className='text-xs text-slate-400'>Mutation Routes</div><div className='text-sm font-semibold text-emerald-300'>Blocked</div></div>
        </div>
        <section className='rounded-3xl border border-slate-700 bg-slate-900/70 p-5'>
          <h2 className='text-xl font-bold text-indigo-200'>Hard Blocks</h2>
          <ul className='mt-4 space-y-2 text-sm text-slate-300'>
            <li>ADB authority remains false.</li>
            <li>BT pairing authority remains false.</li>
            <li>Tailscale mutation authority remains false.</li>
            <li>Handset command authority remains false.</li>
            <li>File transfer, SMS, call, camera, and microphone authority remain false.</li>
            <li>Physical action authority remains false.</li>
          </ul>
        </section>
      </section>
    </main>
  );
}