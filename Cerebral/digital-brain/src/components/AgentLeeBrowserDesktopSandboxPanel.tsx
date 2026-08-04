import { browserDesktopSandboxRequiredPermitFields, browserDesktopSandboxSafetyRules, browserDesktopSandboxState, browserDesktopSandboxSurfaces } from "../lib/browserDesktopSandboxContract";
type PanelProps = { title?: string; mode?: "summary" | "contract" | "hold" | "proof"; };
export default function AgentLeeBrowserDesktopSandboxPanel({ title = "Browser/Desktop Sandbox", mode = "summary" }: PanelProps) {
  const stateRows = [
    ["GET-only", browserDesktopSandboxState.getOnly],
    ["Sandbox only", browserDesktopSandboxState.sandboxOnly],
    ["Approval granted", browserDesktopSandboxState.approvalGranted],
    ["Authority unlocked", browserDesktopSandboxState.authorityUnlocked],
    ["Browser open performed", browserDesktopSandboxState.browserOpenPerformed],
    ["Browser navigation performed", browserDesktopSandboxState.browserNavigationPerformed],
    ["Browser click performed", browserDesktopSandboxState.browserClickPerformed],
    ["Typing performed", browserDesktopSandboxState.typingPerformed],
    ["Mouse control performed", browserDesktopSandboxState.mouseControlPerformed],
    ["Keyboard control performed", browserDesktopSandboxState.keyboardControlPerformed],
    ["Desktop control performed", browserDesktopSandboxState.desktopControlPerformed],
    ["Sandbox action performed", browserDesktopSandboxState.sandboxActionPerformed],
    ["Real action performed", browserDesktopSandboxState.realActionPerformed],
  ];
  return (
    <main style={{ minHeight: "100vh", padding: "32px", background: "#05070d", color: "#f8fafc", fontFamily: "Arial, sans-serif" }}>
      <section style={{ maxWidth: "1180px", margin: "0 auto" }}>
        <p style={{ color: "#38bdf8", letterSpacing: "0.14em", textTransform: "uppercase", fontSize: "12px" }}>LeeWay Phase 82 / GET-only / no real action</p>
        <h1 style={{ fontSize: "40px", lineHeight: 1.05, margin: 0 }}>{title}</h1>
        <p style={{ color: "#cbd5e1", fontSize: "18px", maxWidth: "880px" }}>This surface displays Browser/Desktop Sandbox contract state only. It does not open a browser, navigate, click, type, move the mouse, use keyboard input, control windows, run sandbox actions, or perform real action.</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "16px", marginTop: "24px" }}>
          {stateRows.map(([label, value]) => <div key={String(label)} style={{ border: "1px solid #1e293b", borderRadius: "16px", padding: "18px", background: "#0f172a" }}><div style={{ color: "#94a3b8", fontSize: "13px" }}>{label}</div><div style={{ color: value ? "#fbbf24" : "#22c55e", fontSize: "22px", fontWeight: 700 }}>{String(value)}</div></div>)}
        </div>
        <section style={{ marginTop: "28px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "18px" }}>
          {browserDesktopSandboxSurfaces.map((surface) => <article key={surface.id} style={{ border: "1px solid #334155", borderRadius: "18px", padding: "20px", background: "#0b1120" }}><h2>{surface.label}</h2><p style={{ color: "#cbd5e1" }}>{surface.scope}</p><h3 style={{ color: "#f87171" }}>Blocked now</h3><ul>{surface.blockedNow.map((item) => <li key={item}>{item}</li>)}</ul></article>)}
        </section>
        <section style={{ marginTop: "28px", border: "1px solid #334155", borderRadius: "18px", padding: "20px", background: "#0b1120" }}>
          <h2>Required future permit fields</h2><div>{browserDesktopSandboxRequiredPermitFields.map((field) => <span key={field} style={{ display: "inline-block", margin: "6px", padding: "8px 10px", borderRadius: "10px", background: "#111827" }}>{field}</span>)}</div>
        </section>
        <section style={{ marginTop: "28px", border: "1px solid #334155", borderRadius: "18px", padding: "20px", background: "#0b1120" }}>
          <h2>Safety rules</h2><ol>{browserDesktopSandboxSafetyRules.map((rule) => <li key={rule}>{rule}</li>)}</ol>
        </section>
        <footer style={{ marginTop: "28px", color: "#94a3b8" }}>Mode: {mode}. Verdict: {browserDesktopSandboxState.verdict}.</footer>
      </section>
    </main>
  );
}
