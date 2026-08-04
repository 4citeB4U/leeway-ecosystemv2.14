import { NextRequest, NextResponse } from "next/server";
import { getBrowserDesktopSandboxSummary } from "../../../../lib/browserDesktopSandboxContract";
function getAction(params: { path?: string[] }) {
  const parts = params.path || [];
  return parts[0] || "summary";
}
export async function GET(request: NextRequest, context: { params: Promise<{ path?: string[] }> }) {
  
  const params = await context.params
const action = getAction(context.params);
  const summary = getBrowserDesktopSandboxSummary();
  if (action === "contract") { return NextResponse.json({ ok: true, action, contractOnly: true, sandboxOnly: true, requiredPermitFields: summary.requiredPermitFields, surfaces: summary.surfaces, safetyRules: summary.safetyRules }); }
  if (action === "safety") { return NextResponse.json({ ok: true, action, noBrowserOpen: true, noNavigation: true, noClick: true, noTyping: true, noMouse: true, noKeyboard: true, noDesktopControl: true, noSandboxAction: true, noRealAction: true, approvalGranted: false, authorityUnlocked: false, safetyRules: summary.safetyRules }); }
  if (action === "proof-chain") { return NextResponse.json({ ok: true, action, phase: 82, proofChain: ["460 hands readiness", "461F simulation-first permit ladder", "462G sandbox action contract", "463F sandbox UI contract reconciliation", "464J GET-only UI apply"], locked: true, realActionPerformed: false }); }
  if (action === "recommendations") { return NextResponse.json({ ok: true, action, recommendations: ["Keep UI GET-only until browser proof completes.", "POST execute must remain blocked with 423.", "Do not start browser or desktop runtime from UI.", "Use single-use approval before any future sandbox action."] }); }
  return NextResponse.json({ ok: true, action, url: request.url, data: summary });
}
export async function POST() {
  return NextResponse.json({ ok: false, locked: true, status: 423, message: "Browser/Desktop Sandbox execute is locked. No POST execution is allowed in 464J.", approvalGranted: false, authorityUnlocked: false, sandboxActionPerformed: false, realActionPerformed: false }, { status: 423 });
}

