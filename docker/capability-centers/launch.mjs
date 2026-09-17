// REGION: LeeWay capability-center consolidation
// TAG: LEEWAY-CAPABILITY-CENTERS-V1
// WHO: Agent Lee / Leonard Lee. WHAT: Host four existing registries in one process.
// WHY: Remove duplicate runtimes. WHERE: Container. WHEN: startup. HOW: isolated ES modules.
// ROLE: Registry display and dispatch acknowledgement only. LICENSE: MIT.
const centers = [
  ["agent-center", "Leeway Agent Center", 8860],
  ["mcp-agent-center", "Leeway MCP Agent Center", 8861],
  ["worker-center", "Leeway Worker Center", 8862],
  ["mcp-center", "Leeway MCP Center", 8863]
];
for (const [key, title, port] of centers) {
  process.env.CENTER_ID = "leeway-" + key;
  process.env.CENTER_TYPE = title;
  process.env.PORT = String(port);
  process.env.REGISTRY_PATH = new URL("./registries/" + key + ".json", import.meta.url).pathname;
  await import("./server.mjs?center=" + key);
}
