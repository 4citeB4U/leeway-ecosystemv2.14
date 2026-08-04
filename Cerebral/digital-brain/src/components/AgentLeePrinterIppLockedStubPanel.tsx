export default function AgentLeePrinterIppLockedStubPanel() {
  return (
    <main className='min-h-screen bg-slate-950 p-6 text-slate-100'>
      <section className='mx-auto max-w-6xl space-y-6'>
        <div className='rounded-3xl border border-cyan-700/50 bg-slate-900/70 p-6 shadow-2xl'>
          <div className='text-sm font-semibold uppercase tracking-[0.3em] text-cyan-300'>Agent Lee Device Layer</div>
          <h1 className='mt-3 text-3xl font-black text-white'>Printer IPP Locked Stub</h1>
          <p className='mt-3 max-w-4xl text-sm leading-6 text-slate-300'>
            Locked GET-only printer translator status. This page cannot print, submit IPP requests, mutate queues, unlock the translator, or create physical action lanes.
          </p>
        </div>
        <div className='grid grid-cols-1 gap-4 md:grid-cols-3'>
          <div className='rounded-xl border border-slate-700 bg-slate-900/70 px-3 py-2'><div className='text-xs text-slate-400'>Locked</div><div className='text-sm font-semibold text-emerald-300'>true</div></div>
          <div className='rounded-xl border border-slate-700 bg-slate-900/70 px-3 py-2'><div className='text-xs text-slate-400'>No Print Job</div><div className='text-sm font-semibold text-emerald-300'>true</div></div>
          <div className='rounded-xl border border-slate-700 bg-slate-900/70 px-3 py-2'><div className='text-xs text-slate-400'>No IPP Request</div><div className='text-sm font-semibold text-emerald-300'>true</div></div>
        </div>
        <section className='rounded-3xl border border-slate-700 bg-slate-900/70 p-5'>
          <h2 className='text-xl font-bold text-cyan-200'>Hard Blocks</h2>
          <ul className='mt-4 space-y-2 text-sm text-slate-300'>
            <li>POST routes are blocked.</li>
            <li>Printer action authority remains false.</li>
            <li>IPP request authority remains false.</li>
            <li>Queue mutation authority remains false.</li>
            <li>Physical action authority remains false.</li>
          </ul>
        </section>
      </section>
    </main>
  );
}