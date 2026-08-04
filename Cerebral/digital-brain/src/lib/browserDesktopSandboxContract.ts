export const browserDesktopSandboxState = {
  verdict: "LEEWAY_BROWSER_DESKTOP_SANDBOX_GET_ONLY_UI_464J_LOCKED_NO_REAL_ACTION",
  phase: 82,
  getOnly: true,
  sandboxOnly: true,
  approvalGranted: false,
  authorityUnlocked: false,
  browserRuntimeStarted: false,
  desktopRuntimeStarted: false,
  browserOpenPerformed: false,
  browserNavigationPerformed: false,
  browserClickPerformed: false,
  typingPerformed: false,
  mouseControlPerformed: false,
  keyboardControlPerformed: false,
  windowControlPerformed: false,
  desktopControlPerformed: false,
  sandboxActionPerformed: false,
  realActionPerformed: false,
};
export const browserDesktopSandboxSafetyRules = [
  "UI is GET-only.",
  "POST execute route returns 423.",
  "No browser runtime start.",
  "No desktop runtime start.",
  "No browser open.",
  "No navigation.",
  "No click.",
  "No typing.",
  "No mouse control.",
  "No keyboard control.",
  "No window control.",
  "No desktop control.",
  "No sandbox action.",
  "No real action.",
  "No approval grant.",
  "No authority unlock.",
  "Proof chain required before any later sandbox execution.",
];
export const browserDesktopSandboxSurfaces = [
  { id: "BROWSER_SANDBOX_SURFACE", label: "Browser Sandbox Surface", scope: "Local sandbox page only after future approval.", blockedNow: ["open browser", "navigate", "click", "type", "submit", "download", "upload", "send message", "purchase"] },
  { id: "DESKTOP_SANDBOX_SURFACE", label: "Desktop Sandbox Surface", scope: "Local fake/sandbox window only after future approval.", blockedNow: ["move mouse", "click", "type", "hotkey", "open app", "close app", "move window", "change setting", "run command"] },
];
export const browserDesktopSandboxRequiredPermitFields = [
  "sandbox_surface_id", "target_sandbox_only", "exact_action", "expected_visible_result", "forbidden_boundaries",
  "human_approval_phrase", "one_time_scope", "preflight_safety_check", "proof_after_action", "lockback_after_action",
];
export function getBrowserDesktopSandboxSummary() {
  return {
    ...browserDesktopSandboxState,
    safetyRules: browserDesktopSandboxSafetyRules,
    surfaces: browserDesktopSandboxSurfaces,
    requiredPermitFields: browserDesktopSandboxRequiredPermitFields,
    next: "465-browser-desktop-sandbox-browser-proof-get-only-no-real-action.ps1",
  };
}
