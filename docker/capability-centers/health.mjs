// REGION: LeeWay health verification
// TAG: LEEWAY-CAPABILITY-CENTERS-HEALTH-V1
// WHO: Agent Lee; WHAT: four registry endpoint checks; WHY: detect partial startup.
// WHERE: container; WHEN: health probe; HOW: HTTP; ROLE: verifier; LICENSE: MIT.
const keys = ["agent-center", "mcp-agent-center", "worker-center", "mcp-center"];
for (const [i, key] of keys.entries()) {
  const r = await fetch("http://127.0.0.1:" + (8860 + i) + "/health", {signal: AbortSignal.timeout(1500)});
  const body = await r.json();
  if (!r.ok || body.centerId !== "leeway-" + key || !(body.itemCount > 0)) process.exit(1);
}
