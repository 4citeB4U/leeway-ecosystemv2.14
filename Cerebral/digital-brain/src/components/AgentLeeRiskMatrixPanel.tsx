const families = [
  ['read_only_status', 'LOW', 'Allowed only as GET/read-only'],
  ['ui_navigation_patch', 'LOW_MEDIUM', 'GET-only UI with blocked mutations'],
  ['report_generation', 'LOW', 'Report-only artifact writes'],
  ['identity_review_state_save', 'MEDIUM', 'Requires future save-only contract'],
  ['single_use_real_alpha_action', 'HIGH', 'Requires explicit single-use approval'],
  ['printer_action', 'HIGH', 'Requires exact printer/action approval'],
  ['phone_action', 'HIGH', 'Requires exact phone/action approval'],
  ['router_action', 'CRITICAL', 'Requires strict router approval and rollback'],
  ['network_scan_or_port_scan', 'HIGH', 'Requires scoped approval'],
  ['bridge_or_protocol_translator_deploy', 'HIGH', 'Requires no-bridge-sprawl review'],
  ['authority_unlock', 'CRITICAL', 'Requires explicit single-use unlock contract'],
  ['physical_action_lane', 'CRITICAL', 'Requires explicit physical-action approval']
];

export default function AgentLeeRiskMatrixPanel() {
  return (
    <main className='min-h-screen bg-slate-950 p-6 text-slate-100'>
      <section className='mx-auto max-w-6xl space-y-6'>
        <div className='rounded-3xl border border-rose-500/40 bg-slate-900/80 p-6 shadow-2xl'>
          <div className='text-sm font-semibold uppercase tracking-[0.3em] text-rose-300'>Agent Lee Governance</div>
          <h1 className='mt-3 text-3xl font-black text-white'>Risk Matrix</h1>
          <p className='mt-3 max-w-4xl text-sm leading-6 text-slate-300'>
            GET-only governance view for action-family risk classes and single-use approval draft status. This page grants no approval, unlocks no authority, executes nothing, controls no device, starts no onboarding, performs no printer, phone, router, scan, bridge, protocol translator, or physical action.
          </p>
        </div>

        <div className='grid grid-cols-1 gap-4 md:grid-cols-4'>
          <div className='rounded-xl border border-slate-700 bg-slate-900/70 px-4 py-3'><div className='text-xs text-slate-400'>Action Families</div><div className='text-2xl font-black text-rose-200'>12</div></div>
          <div className='rounded-xl border border-slate-700 bg-slate-900/70 px-4 py-3'><div className='text-xs text-slate-400'>Critical</div><div className='text-2xl font-black text-rose-200'>3</div></div>
          <div className='rounded-xl border border-slate-700 bg-slate-900/70 px-4 py-3'><div className='text-xs text-slate-400'>Authority</div><div className='text-2xl font-black text-rose-200'>None</div></div>
          <div className='rounded-xl border border-slate-700 bg-slate-900/70 px-4 py-3'><div className='text-xs text-slate-400'>Mode</div><div className='text-2xl font-black text-rose-200'>GET-only</div></div>
        </div>

        <section className='rounded-3xl border border-slate-700 bg-slate-900/70 p-5'>
          <h2 className='text-xl font-bold text-white'>Action Families</h2>
          <div className='mt-4 grid grid-cols-1 gap-3'>
            {families.map(([name, level, rule]) => (
              <div key={name} className='rounded-xl border border-slate-800 bg-slate-950/70 p-4'>
                <div className='flex flex-col gap-2 md:flex-row md:items-center md:justify-between'>
                  <div className='font-bold text-white'>{name}</div>
                  <div className='text-sm font-black text-rose-200'>{level}</div>
                </div>
                <div className='mt-2 text-sm text-slate-300'>{rule}</div>
                <div className='mt-2 text-xs uppercase tracking-[0.2em] text-slate-500'>Approved now: false | Unlocked now: false</div>
              </div>
            ))}
          </div>
        </section>

        <section className='rounded-3xl border border-amber-600/40 bg-slate-900/70 p-5'>
          <h2 className='text-xl font-bold text-amber-200'>No-Action Safety</h2>
          <p className='mt-3 text-sm leading-6 text-slate-300'>
            Display only. No approval grant, no authority unlock, no execution, no device control, no onboarding, no printer action, no phone action, no router action, no scan, no bridge deploy, no protocol translator deploy, and no physical action.
          </p>
        </section>
      </section>
    </main>
  );
}