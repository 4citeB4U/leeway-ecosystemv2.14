"use client";

import { useMemo, useState } from "react";
import LiveEvidence from "@/components/live-evidence";
import LiveAgent from "@/components/live-agent";
import LiveRuntime from "@/components/live-runtime";

export type AppScreenProps = {
  slug: string;
  title: string;
  agentOnline: boolean;
  runtimeOnline: boolean;
  openWindow: (slug: string) => void;
};

export default function AppScreen(props: AppScreenProps) {
  const Screen = screenComponents[props.slug] ?? DefaultScreen;
  return <Screen {...props} />;
}

const screenComponents: Record<string, React.FC<AppScreenProps>> = {
  leeway_home_1: HomeScreen,
  agent_lee_interaction: AgentLeeScreen,
  leeway_files: FilesScreen,
  workspaces: WorkspacesScreen,
  communications: CommunicationsScreen,
  leeway_marketplace_1: MarketplaceScreen,
  device_center: DeviceCenterScreen,
  evidence_center: EvidenceCenterScreen,
  control_center: ControlCenterScreen,
  appearance_settings: AppearanceSettingsScreen,
  privacy_setup: PrivacySetupScreen,
  hardware_setup: HardwareSetupScreen,
  permission_approval: PermissionApprovalScreen,
  security_setup: SecuritySetupScreen,
  github_import_tool: GitHubImportScreen,
  adaptation_plan: AdaptationPlanScreen,
  build_progress: BuildProgressScreen,
  guided_tutorial: GuidedTutorialScreen,
  app_launcher_1: AppLauncherScreen,
  leeway_os_unified_shell: UnifiedShellScreen,
  notification_center: NotificationCenterScreen
};

export const NATIVE_SCREEN_SLUGS = new Set(Object.keys(screenComponents));

function HeaderCard({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-slate-950/70 p-5 shadow-xl shadow-black/20 backdrop-blur-xl">
      <p className="text-xs uppercase tracking-[0.35em] text-sky-300/80">{title}</p>
      <p className="mt-3 text-3xl font-semibold text-white">{subtitle}</p>
    </div>
  );
}

function SectionCard({ title, description, children }: { title: string; description: string; children?: React.ReactNode }) {
  return (
    <section className="rounded-3xl border border-white/10 bg-slate-950/70 p-5 shadow-lg shadow-black/10 backdrop-blur-xl">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white">{title}</h2>
          <p className="text-sm text-slate-400">{description}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function ActionButton({ label, onClick, active = false }: { label: string; onClick: () => void; active?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-3xl border px-4 py-3 text-sm font-semibold transition ${active ? "border-sky-400 bg-sky-500/10 text-white" : "border-white/10 bg-white/5 text-slate-200 hover:border-sky-300/30 hover:bg-white/10"}`}
    >
      {label}
    </button>
  );
}

function HomeScreen({ openWindow, agentOnline, runtimeOnline }: AppScreenProps) {
  return (
    <div className="space-y-6 p-4 md:p-6">
      <HeaderCard title="LeeWay Home" subtitle="Your digital command center" />
      <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          <SectionCard title="System Briefing" description="A consolidated view of your runtime, intelligence, and active workflows.">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-3xl border border-white/10 bg-slate-950/60 p-4 text-sm text-slate-200">
                <p className="text-slate-400">Agent Lee</p>
                <p className={`mt-3 text-lg font-semibold ${agentOnline ? "text-emerald-300" : "text-amber-300"}`}>
                  {agentOnline ? "Connected" : "Disconnected"}
                </p>
              </div>
              <div className="rounded-3xl border border-white/10 bg-slate-950/60 p-4 text-sm text-slate-200">
                <p className="text-slate-400">Runtime</p>
                <p className={`mt-3 text-lg font-semibold ${runtimeOnline ? "text-emerald-300" : "text-amber-300"}`}>
                  {runtimeOnline ? "Online" : "Offline"}
                </p>
              </div>
              <div className="rounded-3xl border border-white/10 bg-slate-950/60 p-4 text-sm text-slate-200">
                <p className="text-slate-400">Active Apps</p>
                <p className="mt-3 text-lg font-semibold text-white">Launch any tool from the Start menu.</p>
              </div>
            </div>
          </SectionCard>
          <SectionCard title="Quick Actions" description="Jump to the most important apps and setup tasks.">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <ActionButton label="Open Agent Lee" onClick={() => openWindow("agent_lee_interaction")} />
              <ActionButton label="Open Evidence" onClick={() => openWindow("evidence_center")} />
              <ActionButton label="Open Files" onClick={() => openWindow("leeway_files")} />
              <ActionButton label="Open Control Center" onClick={() => openWindow("control_center")} />
              <ActionButton label="Open Marketplace" onClick={() => openWindow("leeway_marketplace_1")} />
              <ActionButton label="Open Device Center" onClick={() => openWindow("device_center")} />
            </div>
          </SectionCard>
        </div>
        <div className="space-y-4">
          <SectionCard title="Workflow" description="Complete first-run setup and unlock the full LeeWay experience.">
            <div className="space-y-3 text-sm text-slate-300">
              {[
                { label: "Set your appearance", slug: "appearance_settings" },
                { label: "Configure hardware & privacy", slug: "hardware_setup" },
                { label: "Authorize permissions", slug: "permission_approval" },
                { label: "Secure the system", slug: "security_setup" }
              ].map((item) => (
                <button
                  key={item.slug}
                  type="button"
                  onClick={() => openWindow(item.slug)}
                  className="flex w-full items-center justify-between rounded-3xl border border-white/10 bg-white/5 px-4 py-3 text-left text-sm text-slate-200 transition hover:border-sky-300/30 hover:bg-white/10"
                >
                  <span>{item.label}</span>
                  <span className="text-slate-400">Open</span>
                </button>
              ))}
            </div>
          </SectionCard>
          <SectionCard title="Recent Signals" description="A snapshot of your recent runtime activity.">
            <div className="space-y-3 text-sm text-slate-200">
              <div className="rounded-3xl border border-white/10 bg-slate-950/50 p-4">
                <p className="text-slate-400">Latest note</p>
                <p className="mt-2 text-white">Agent Lee status check completed. Runtime is available for evidence collection.</p>
              </div>
              <div className="rounded-3xl border border-white/10 bg-slate-950/50 p-4">
                <p className="text-slate-400">Pending approval</p>
                <p className="mt-2 text-white">No system approval requests outstanding.</p>
              </div>
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}

function AgentLeeScreen({ agentOnline, runtimeOnline }: AppScreenProps) {
  return (
    <div className="space-y-6 p-4 md:p-6">
      <HeaderCard title="Agent Lee" subtitle="Your intelligent system operator" />
      <div className="grid gap-4 xl:grid-cols-[420px_1fr]">
        <div className="space-y-4">
          <SectionCard title="Status" description="Agent Lee’s runtime health and communication state.">
            <div className="space-y-3 text-sm text-slate-200">
              <div className="rounded-3xl border border-white/10 bg-slate-950/70 p-4">
                <p className="text-slate-400">Connection</p>
                <p className={`mt-2 text-xl font-semibold ${agentOnline ? "text-emerald-300" : "text-amber-300"}`}>{agentOnline ? "Online" : "Offline"}</p>
              </div>
              <div className="rounded-3xl border border-white/10 bg-slate-950/70 p-4">
                <p className="text-slate-400">Runtime</p>
                <p className={`mt-2 text-xl font-semibold ${runtimeOnline ? "text-emerald-300" : "text-amber-300"}`}>{runtimeOnline ? "Ready" : "Disconnected"}</p>
              </div>
            </div>
          </SectionCard>
          <SectionCard title="Live interaction" description="Send a request to Agent Lee and watch the proof gate flow.">
            <LiveAgent />
          </SectionCard>
        </div>
        <div className="space-y-4">
          <SectionCard title="Conversation preview" description="Agent Lee can be asked to summarize status, inspect evidence, or prepare a plan.">
            <div className="rounded-3xl border border-white/10 bg-slate-950/70 p-4 text-sm text-slate-300">
              <p className="text-slate-400">Quick prompt</p>
              <p className="mt-3 text-white">"Summarize the current system readiness and evidence state in one sentence."</p>
              <div className="mt-4 rounded-3xl bg-slate-900/80 p-4 text-sm text-slate-200">
                <p className="text-slate-400">Agent Lee is waiting for the next request.</p>
              </div>
            </div>
          </SectionCard>
          <SectionCard title="Evidence panel" description="Recent receipts and audit entries from the runtime.">
            <LiveEvidence />
          </SectionCard>
        </div>
      </div>
    </div>
  );
}

function FilesScreen(): JSX.Element {
  const [selected, setSelected] = useState("Projects");
  const folders = ["Projects", "Design", "Logs", "Archives"];
  const files = [
    { name: "lee-system-plan.md", type: "Markdown", updated: "Today" },
    { name: "runtime-audit.json", type: "JSON", updated: "Yesterday" },
    { name: "agent-lee-notes.txt", type: "Text", updated: "2 days ago" },
    { name: "design-walls.png", type: "Image", updated: "Aug 1" }
  ];
  return (
    <div className="space-y-6 p-4 md:p-6">
      <HeaderCard title="Files" subtitle="Browse your LeeWay documents and system artifacts" />
      <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
        <div className="space-y-4">
          <SectionCard title="Folders" description="Explore your workspace structure.">
            <div className="space-y-2">
              {folders.map((folder) => (
                <button
                  key={folder}
                  type="button"
                  onClick={() => setSelected(folder)}
                  className={`flex w-full items-center justify-between rounded-3xl border px-4 py-3 text-left transition ${selected === folder ? "border-sky-400 bg-sky-500/10 text-white" : "border-white/10 bg-white/5 text-slate-200 hover:border-slate-300/20 hover:bg-white/10"}`}
                >
                  <span>{folder}</span>
                  <span className="text-slate-400">{folder === "Projects" ? "12" : folder === "Design" ? "8" : folder === "Logs" ? "22" : "16"}</span>
                </button>
              ))}
            </div>
          </SectionCard>
        </div>
        <div className="space-y-4">
          <SectionCard title="Explorer" description={`Showing ${selected} content.`}>
            <div className="space-y-3">
              {files.map((file) => (
                <div key={file.name} className="rounded-3xl border border-white/10 bg-slate-950/70 p-4 text-sm text-slate-200">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-semibold text-white">{file.name}</p>
                      <p className="text-slate-400">{file.type}</p>
                    </div>
                    <span className="text-slate-400">{file.updated}</span>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}

function WorkspacesScreen({ openWindow }: AppScreenProps) {
  const workspaces = [
    { title: "Core OS Workspace", description: "LeeWay system foundations and runtime integrations.", tag: "System" },
    { title: "Agent Research", description: "Agent Lee prompt loops, audits, and task plans.", tag: "Agent" },
    { title: "Design Studio", description: "Desktop and mobile UI design for LeeWay OS.", tag: "Design" }
  ];
  return (
    <div className="space-y-6 p-4 md:p-6">
      <HeaderCard title="Workspaces" subtitle="Organize your operating environment" />
      <div className="grid gap-4 lg:grid-cols-3">
        {workspaces.map((workspace) => (
          <div key={workspace.title} className="rounded-3xl border border-white/10 bg-slate-950/70 p-5 text-slate-200 shadow-lg shadow-black/10">
            <div className="mb-4 flex items-center justify-between gap-3">
              <span className="text-slate-400 text-sm uppercase tracking-[0.25em]">{workspace.tag}</span>
              <span className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-400">Active</span>
            </div>
            <h2 className="text-xl font-semibold text-white">{workspace.title}</h2>
            <p className="mt-3 text-sm leading-6 text-slate-400">{workspace.description}</p>
            <button onClick={() => openWindow("agent_lee_interaction")} className="mt-5 rounded-3xl border border-white/10 bg-white/5 px-4 py-3 font-semibold text-white transition hover:border-sky-300/30 hover:bg-white/10">
              Inspect with Agent Lee
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function CommunicationsScreen(): JSX.Element {
  const messages = [
    { sender: "LeeWay", text: "System monitoring active. No alerts detected.", time: "9:41 AM" },
    { sender: "Agent Lee", text: "Ready to assist with initialization tasks.", time: "9:42 AM" },
    { sender: "System", text: "New runtime receipt generated.", time: "9:43 AM" }
  ];
  return (
    <div className="space-y-6 p-4 md:p-6">
      <HeaderCard title="Communications" subtitle="Inbox and system messages" />
      <SectionCard title="Recent messages" description="System notifications and agent conversations.">
        <div className="space-y-3">
          {messages.map((message) => (
            <div key={`${message.sender}-${message.time}`} className="rounded-3xl border border-white/10 bg-slate-950/70 p-4 text-slate-200">
              <div className="flex items-center justify-between gap-3">
                <p className="font-semibold text-white">{message.sender}</p>
                <span className="text-xs text-slate-500">{message.time}</span>
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-300">{message.text}</p>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}

function MarketplaceScreen(): JSX.Element {
  const tiles = [
    { title: "Runtime Inspector", detail: "View service health, model pods, and kernel proof status." },
    { title: "Workspace Automations", detail: "Install LeeWay workflows and productivity agents." },
    { title: "Secure Bridge", detail: "Deploy secure device sync and evidence sharing." }
  ];
  return (
    <div className="space-y-6 p-4 md:p-6">
      <HeaderCard title="Marketplace" subtitle="Install and manage LeeWay capabilities" />
      <div className="grid gap-4 lg:grid-cols-3">
        {tiles.map((tile) => (
          <div key={tile.title} className="rounded-3xl border border-white/10 bg-slate-950/70 p-5 text-slate-200 shadow-xl shadow-black/10">
            <h2 className="text-xl font-semibold text-white">{tile.title}</h2>
            <p className="mt-3 text-sm text-slate-400">{tile.detail}</p>
            <button className="mt-5 rounded-3xl border border-white/10 bg-white/5 px-4 py-3 font-semibold text-white transition hover:border-sky-300/30 hover:bg-white/10">
              Explore
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function DeviceCenterScreen(): JSX.Element {
  const devices = [
    { title: "This PC", detail: "Online and synchronized." },
    { title: "Mobile Companion", detail: "Not connected." },
    { title: "Workspace Hub", detail: "Ready for sync." }
  ];
  return (
    <div className="space-y-6 p-4 md:p-6">
      <HeaderCard title="Device Center" subtitle="Sync your world across devices" />
      <SectionCard title="Device status" description="Manage connected endpoints and sync settings.">
        <div className="space-y-3">
          {devices.map((device) => (
            <div key={device.title} className="rounded-3xl border border-white/10 bg-slate-950/70 p-4 text-slate-200">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-semibold text-white">{device.title}</p>
                  <p className="text-sm text-slate-400">{device.detail}</p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${device.detail.includes("Online") ? "bg-emerald-500/15 text-emerald-300" : "bg-amber-500/15 text-amber-300"}`}>
                  {device.detail.includes("Online") ? "Online" : device.detail.includes("Connected") ? "Connected" : "Offline"}
                </span>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}

function EvidenceCenterScreen(): JSX.Element {
  return (
    <div className="space-y-6 p-4 md:p-6">
      <HeaderCard title="Evidence Center" subtitle="Audit receipts, proofs, and runtime history" />
      <SectionCard title="Live receipts" description="Streaming evidence from the kernel." >
        <LiveEvidence />
      </SectionCard>
    </div>
  );
}

function ControlCenterScreen(): JSX.Element {
  return (
    <div className="space-y-6 p-4 md:p-6">
      <HeaderCard title="Control Center" subtitle="Runtime tools, diagnostics, and system controls" />
      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard title="Runtime health" description="Inspect the current backend and model appliance.">
          <LiveRuntime />
        </SectionCard>
        <SectionCard title="Quick toggles" description="Enable or disable core shell features.">
          <div className="grid gap-3">
            {[
              { label: "Notifications", enabled: true },
              { label: "Agent Suggestions", enabled: true },
              { label: "Auto-sync devices", enabled: false },
              { label: "Dark mode", enabled: true }
            ].map((setting) => (
              <div key={setting.label} className="flex items-center justify-between rounded-3xl border border-white/10 bg-slate-950/70 p-4">
                <div>
                  <p className="font-semibold text-white">{setting.label}</p>
                  <p className="text-sm text-slate-400">{setting.enabled ? "Enabled" : "Disabled"}</p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${setting.enabled ? "bg-emerald-500/15 text-emerald-300" : "bg-white/10 text-slate-300"}`}>
                  {setting.enabled ? "ON" : "OFF"}
                </span>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}

function AppearanceSettingsScreen(): JSX.Element {
  const themes = ["Dark", "Light", "Ocean", "Aurora"];
  return (
    <div className="space-y-6 p-4 md:p-6">
      <HeaderCard title="Appearance" subtitle="Customize the LeeWay desktop look and feel" />
      <SectionCard title="Theme options" description="Select a visual style for your shell.">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {themes.map((theme) => (
            <button key={theme} type="button" className="rounded-3xl border border-white/10 bg-white/5 p-5 text-left text-white transition hover:border-sky-300/30 hover:bg-white/10">
              <p className="font-semibold">{theme}</p>
              <p className="mt-2 text-sm text-slate-400">Preview {theme.toLowerCase()} mode.</p>
            </button>
          ))}
        </div>
      </SectionCard>
      <SectionCard title="Wallpaper" description="Choose a hero image for the desktop." >
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="rounded-3xl overflow-hidden border border-white/10 bg-slate-950/70">
              <div className="h-28 bg-cover bg-center" style={{ backgroundImage: `url(https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=60&sat=-30&exp=${index + 1})` }}></div>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}

function PrivacySetupScreen(): JSX.Element {
  return (
    <div className="space-y-6 p-4 md:p-6">
      <HeaderCard title="Privacy Setup" subtitle="Control which data and device features LeeWay may access" />
      <SectionCard title="Privacy options" description="Manage camera, microphone, and workspace access.">
        <div className="grid gap-3">
          {[
            { label: "Camera permissions", status: "Review required" },
            { label: "Microphone access", status: "Enabled" },
            { label: "Location services", status: "Disabled" }
          ].map((setting) => (
            <div key={setting.label} className="rounded-3xl border border-white/10 bg-slate-950/70 p-4 text-slate-200">
              <div className="flex items-center justify-between gap-3">
                <p className="font-semibold text-white">{setting.label}</p>
                <span className="text-slate-400">{setting.status}</span>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}

function HardwareSetupScreen(): JSX.Element {
  return (
    <div className="space-y-6 p-4 md:p-6">
      <HeaderCard title="Hardware & Privacy" subtitle="Configure device integration and hardware trust" />
      <SectionCard title="Calibration" description="Verify your microphone, camera, and storage access.">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-3xl border border-white/10 bg-slate-950/70 p-4 text-slate-200">
            <p className="text-slate-400">Microphone</p>
            <p className="mt-2 text-lg font-semibold text-white">Ready</p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-slate-950/70 p-4 text-slate-200">
            <p className="text-slate-400">Camera</p>
            <p className="mt-2 text-lg font-semibold text-white">Pending review</p>
          </div>
        </div>
      </SectionCard>
      <SectionCard title="Device trust" description="Ensure the runtime can safely manage connected hardware.">
        <div className="rounded-3xl border border-white/10 bg-slate-950/70 p-4 text-slate-200">
          <p className="text-slate-400">LeeWay can now observe your runtime and local devices through the trusted bridge. Approve access when you are ready.</p>
        </div>
      </SectionCard>
    </div>
  );
}

function PermissionApprovalScreen(): JSX.Element {
  return (
    <div className="space-y-6 p-4 md:p-6">
      <HeaderCard title="Permissions" subtitle="Approve agent and runtime operations" />
      <SectionCard title="Pending approvals" description="Review system-level requests.">
        <div className="space-y-3 text-sm text-slate-200">
          <div className="rounded-3xl border border-white/10 bg-slate-950/70 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-white">Agent Lee needs file access</p>
                <p className="text-slate-400">Approve this request to allow the OS to inspect project files.</p>
              </div>
              <button className="rounded-3xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white transition hover:border-sky-300/30 hover:bg-white/10">Approve</button>
            </div>
          </div>
          <div className="rounded-3xl border border-white/10 bg-slate-950/70 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-white">Runtime needs network access</p>
                <p className="text-slate-400">Grant or deny outbound access for the agent runtime.</p>
              </div>
              <button className="rounded-3xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white transition hover:border-sky-300/30 hover:bg-white/10">Review</button>
            </div>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}

function SecuritySetupScreen(): JSX.Element {
  return (
    <div className="space-y-6 p-4 md:p-6">
      <HeaderCard title="Security" subtitle="Protect LeeWay OS and your approvals" />
      <SectionCard title="System defenses" description="Monitor attachment integrity and runtime proofs.">
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-3xl border border-white/10 bg-slate-950/70 p-4 text-slate-200">
            <p className="text-slate-400">Secure boot</p>
            <p className="mt-2 text-lg font-semibold text-white">Enabled</p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-slate-950/70 p-4 text-slate-200">
            <p className="text-slate-400">Audit chain</p>
            <p className="mt-2 text-lg font-semibold text-white">Tracking receipts</p>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}

function GitHubImportScreen(): JSX.Element {
  return (
    <div className="space-y-6 p-4 md:p-6">
      <HeaderCard title="GitHub Import" subtitle="Bring external repos into your LeeWay workspace" />
      <SectionCard title="Import flow" description="Specify a repository and import target.">
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-3xl border border-white/10 bg-slate-950/70 p-5 text-slate-200">
            <label className="text-sm text-slate-400">Repository URL</label>
            <input className="mt-3 w-full rounded-3xl border border-white/10 bg-slate-900/80 px-4 py-3 text-sm text-white outline-none focus:border-sky-400/50" defaultValue="https://github.com/leeway/example" />
          </div>
          <div className="rounded-3xl border border-white/10 bg-slate-950/70 p-5 text-slate-200">
            <label className="text-sm text-slate-400">Import target</label>
            <input className="mt-3 w-full rounded-3xl border border-white/10 bg-slate-900/80 px-4 py-3 text-sm text-white outline-none focus:border-sky-400/50" defaultValue="leeway-repo" />
          </div>
        </div>
        <button className="mt-4 rounded-3xl border border-white/10 bg-white/5 px-5 py-3 font-semibold text-white transition hover:border-sky-300/30 hover:bg-white/10">Begin import</button>
      </SectionCard>
    </div>
  );
}

function AdaptationPlanScreen(): JSX.Element {
  return (
    <div className="space-y-6 p-4 md:p-6">
      <HeaderCard title="Adaptation Plan" subtitle="Your strategy for going live with LeeWay OS" />
      <SectionCard title="Plan summary" description="A grounded adaptation plan for the current environment.">
        <div className="rounded-3xl border border-white/10 bg-slate-950/70 p-5 text-slate-200">
          <p className="leading-7">
            LeeWay OS is configured to preserve the supplied design identity, integrate Agent Lee into runtime workflows, and keep all actions proof-backed. The next steps are to finalize permission approvals, connect device sync, and verify evidence receipts after each major action.
          </p>
        </div>
      </SectionCard>
    </div>
  );
}

function BuildProgressScreen(): JSX.Element {
  return (
    <div className="space-y-6 p-4 md:p-6">
      <HeaderCard title="Build Progress" subtitle="Monitor LeeWay compilation and delivery status" />
      <SectionCard title="Pipeline" description="Track the current system build and verification progress.">
        <div className="space-y-4 text-slate-200">
          {[
            "Collecting assets",
            "Rendering UI shell",
            "Wiring runtime proofs",
            "Finalizing Windows-style desktop integration"
          ].map((step, index) => (
            <div key={step} className="rounded-3xl border border-white/10 bg-slate-950/70 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="font-semibold text-white">{step}</p>
                <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs text-emerald-300">Done</span>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}

function GuidedTutorialScreen(): JSX.Element {
  return (
    <div className="space-y-6 p-4 md:p-6">
      <HeaderCard title="Guided Tutorial" subtitle="Learn the LeeWay OS workflow" />
      <SectionCard title="Steps" description="Follow these guided actions to get started.">
        <div className="space-y-3 text-slate-200">
          {[
            "Open the Home panel and review system status.",
            "Launch Agent Lee and submit a request.",
            "Inspect the Evidence Center receipts.",
            "Adjust appearance and privacy settings."
          ].map((step) => (
            <div key={step} className="rounded-3xl border border-white/10 bg-slate-950/70 p-4 text-sm">
              <p>{step}</p>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}

function AppLauncherScreen({ openWindow }: AppScreenProps): JSX.Element {
  const apps = [
    { label: "LeeWay Home", slug: "leeway_home_1" },
    { label: "Agent Lee", slug: "agent_lee_interaction" },
    { label: "Evidence", slug: "evidence_center" },
    { label: "Files", slug: "leeway_files" },
    { label: "Control Center", slug: "control_center" },
    { label: "Marketplace", slug: "leeway_marketplace_1" }
  ];
  return (
    <div className="space-y-6 p-4 md:p-6">
      <HeaderCard title="App Launcher" subtitle="Search the LeeWay application library" />
      <div className="grid gap-3 md:grid-cols-2">
        {apps.map((app) => (
          <button key={app.slug} onClick={() => openWindow(app.slug)} className="rounded-3xl border border-white/10 bg-white/5 p-5 text-left text-slate-200 transition hover:border-sky-300/30 hover:bg-white/10">
            <p className="font-semibold text-white">{app.label}</p>
            <p className="mt-2 text-sm text-slate-400">Open the application in a LeeWay window.</p>
          </button>
        ))}
      </div>
    </div>
  );
}

function UnifiedShellScreen({ openWindow, runtimeOnline }: AppScreenProps): JSX.Element {
  return (
    <div className="space-y-6 p-4 md:p-6">
      <HeaderCard title="Unified Shell" subtitle="LeeWay OS synthesized into a single desktop experience" />
      <SectionCard title="Overview" description="See how the desktop, launcher, and runtime combine.">
        <div className="rounded-3xl border border-white/10 bg-slate-950/70 p-5 text-slate-200">
          <p className="leading-7">This shell brings the supplied LeeWay design references into a cohesive desktop: taskbar, wallpaper, Start menu, notifications, quick settings, and live windows backed by runtime connectivity.</p>
        </div>
      </SectionCard>
      <SectionCard title="Live integrations" description="The following systems are connected to the shell.">
        <div className="grid gap-3 md:grid-cols-3">
          {[
            { name: "Agent Lee", active: runtimeOnline },
            { name: "Evidence", active: true },
            { name: "Files", active: true }
          ].map((item) => (
            <div key={item.name} className={`rounded-3xl border p-4 ${item.active ? "border-emerald-500/20 bg-emerald-500/5" : "border-white/10 bg-white/5"}`}>
              <p className="font-semibold text-white">{item.name}</p>
              <p className="mt-2 text-sm text-slate-400">{item.active ? "Connected" : "Not connected"}</p>
            </div>
          ))}
        </div>
      </SectionCard>
      <ActionButton label="Open Agent Lee" onClick={() => openWindow("agent_lee_interaction")} />
    </div>
  );
}

function NotificationCenterScreen(): JSX.Element {
  const notifications = [
    { title: "Runtime receipt created", description: "A new evidence receipt is available.", time: "Just now" },
    { title: "Agent Lee suggestion", description: "Review the new adaptation plan.", time: "2m ago" }
  ];
  return (
    <div className="space-y-6 p-4 md:p-6">
      <HeaderCard title="Notifications" subtitle="Your LeeWay system alerts" />
      <SectionCard title="Recent alerts" description="Important system notifications.">
        <div className="space-y-3">
          {notifications.map((notification) => (
            <div key={`${notification.title}-${notification.time}`} className="rounded-3xl border border-white/10 bg-slate-950/70 p-4 text-slate-200">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-white">{notification.title}</p>
                  <p className="mt-2 text-sm text-slate-400">{notification.description}</p>
                </div>
                <span className="text-xs text-slate-500">{notification.time}</span>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}

function DefaultScreen({ title, slug }: AppScreenProps): JSX.Element {
  return (
    <div className="space-y-6 p-4 md:p-6">
      <HeaderCard title={title} subtitle="Design reference integration" />
      <SectionCard title="Work in progress" description="This screen is being rebuilt from the LeeWay design source.">
        <div className="rounded-3xl border border-white/10 bg-slate-950/70 p-5 text-slate-200">
          <p className="leading-7">The screen for <span className="font-semibold text-white">{slug}</span> is not yet a dedicated React experience. It will be rebuilt as a first-class LeeWay app module shortly.</p>
        </div>
      </SectionCard>
    </div>
  );
}
