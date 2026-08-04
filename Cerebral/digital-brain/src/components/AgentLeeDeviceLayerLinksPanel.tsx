const links = [
  { title: 'Device Readiness', href: '/device-readiness', label: 'Readiness and safety state' },
  { title: 'Printer IPP Locked Stub', href: '/printer-ipp-locked-stub', label: 'Locked printer stub. No printing.' },
  { title: 'Phone Satellite', href: '/phone-satellite', label: 'Draft-only phone satellite. No phone action.' },
  { title: 'Router Status', href: '/router-status', label: 'Read-only router status. No router action.' },
  { title: 'Device Layer Index', href: '/device-layer-index', label: 'Completed Device Layer index.' },
  { title: 'Device Layer Master Status', href: '/device-layer-master-status', label: 'Master status across completed lanes.' },
  { title: 'Device Layer Hold And Lock', href: '/device-layer-hold-and-lock', label: 'Hold rules and locked lane state.' }
];

export default function AgentLeeDeviceLayerLinksPanel() {
  return (
    <main className='min-h-screen bg-slate-950 p-6 text-slate-100'>
      <section className='mx-auto max-w-6xl space-y-6'>
        <div className='rounded-3xl border border-cyan-500/40 bg-slate-900/80 p-6 shadow-2xl'>
          <div className='text-sm font-semibold uppercase tracking-[0.3em] text-cyan-300'>Agent Lee Device Layer</div>
          <h1 className='mt-3 text-3xl font-black text-white'>Device Layer Links</h1>
          <p className='mt-3 max-w-4xl text-sm leading-6 text-slate-300'>
            GET-only navigation for completed locked Device Layer pages. This page grants no approval, unlocks no authority, executes nothing, controls no device, starts no onboarding, performs no printer, phone, router, scan, or physical action.
          </p>
        </div>

        <div className='grid grid-cols-1 gap-4 md:grid-cols-3'>
          <div className='rounded-xl border border-slate-700 bg-slate-900/70 px-4 py-3'><div className='text-xs text-slate-400'>Links</div><div className='text-2xl font-black text-cyan-200'>7</div></div>
          <div className='rounded-xl border border-slate-700 bg-slate-900/70 px-4 py-3'><div className='text-xs text-slate-400'>Authority</div><div className='text-2xl font-black text-cyan-200'>None</div></div>
          <div className='rounded-xl border border-slate-700 bg-slate-900/70 px-4 py-3'><div className='text-xs text-slate-400'>Mode</div><div className='text-2xl font-black text-cyan-200'>GET-only</div></div>
        </div>

        <section className='grid grid-cols-1 gap-4 md:grid-cols-2'>
          {links.map((link) => (
            <a key={link.href} href={link.href} className='rounded-2xl border border-slate-700 bg-slate-900/70 p-5 transition hover:border-cyan-400'>
              <div className='text-lg font-bold text-white'>{link.title}</div>
              <div className='mt-2 text-sm text-slate-300'>{link.label}</div>
              <div className='mt-4 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300'>Open read-only page</div>
            </a>
          ))}
        </section>

        <section className='rounded-3xl border border-amber-600/40 bg-slate-900/70 p-5'>
          <h2 className='text-xl font-bold text-amber-200'>No-Action Safety</h2>
          <p className='mt-3 text-sm leading-6 text-slate-300'>
            This links panel is navigation-only. It does not approve, unlock, execute, control devices, onboard assets, print, control phone, perform router actions, scan, deploy bridges, deploy protocol translators, or perform physical action.
          </p>
        </section>
      </section>
    </main>
  );
}