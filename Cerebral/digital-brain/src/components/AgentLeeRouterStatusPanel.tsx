export default function AgentLeeRouterStatusPanel() {
  return (
    <main className='min-h-screen bg-slate-950 p-6 text-slate-100'>
      <section className='mx-auto max-w-6xl space-y-6'>
        <div className='rounded-3xl border border-cyan-700/50 bg-slate-900/70 p-6 shadow-2xl'>
          <div className='text-sm font-semibold uppercase tracking-[0.3em] text-cyan-300'>Agent Lee Device Layer</div>
          <h1 className='mt-3 text-3xl font-black text-white'>Router Read-Only Status</h1>
          <p className='mt-3 max-w-4xl text-sm leading-6 text-slate-300'>
            Locked GET-only router readiness. This page cannot log into the router, use credentials, open the admin page, scan the network, scan ports, read router config, mutate router config, reboot router, deploy a bridge, or perform physical action.
          </p>
        </div>
        <div className='grid grid-cols-1 gap-4 md:grid-cols-3'>
          <div className='rounded-xl border border-slate-700 bg-slate-900/70 px-3 py-2'><div className='text-xs text-slate-400'>Target</div><div className='text-sm font-semibold text-cyan-200'>SAX2V1S Home Router</div></div>
          <div className='rounded-xl border border-slate-700 bg-slate-900/70 px-3 py-2'><div className='text-xs text-slate-400'>Authority</div><div className='text-sm font-semibold text-emerald-300'>LOCKED_READ_ONLY_DRAFT_NO_EXECUTE</div></div>
          <div className='rounded-xl border border-slate-700 bg-slate-900/70 px-3 py-2'><div className='text-xs text-slate-400'>Mutation Routes</div><div className='text-sm font-semibold text-emerald-300'>Blocked</div></div>
        </div>
        <section className='rounded-3xl border border-slate-700 bg-slate-900/70 p-5'>
          <h2 className='text-xl font-bold text-cyan-200'>Hard Blocks</h2>
          <ul className='mt-4 space-y-2 text-sm text-slate-300'>
            <li>Router login authority remains false.</li>
            <li>Credential-use authority remains false.</li>
            <li>Admin-page authority remains false.</li>
            <li>Network and port scan authority remain false.</li>
            <li>Config read/write and reboot authority remain false.</li>
            <li>Bridge deploy and physical action authority remain false.</li>
          </ul>
        </section>
      </section>
    </main>
  );
}