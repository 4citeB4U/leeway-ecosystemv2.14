/*
LEEWAY_HEADER - DO NOT REMOVE

TAG: CORE.SETTINGS.CATALOG.MAIN
REGION: 🟢 CORE
PURPOSE: Settings catalog and runtime configuration metadata for Agent Lee.
DISCOVERY_PIPELINE:
  Voice → Intent → Location → Vertical → Ranking → Render
*/

export type PluginCatalogEntry = {
  id: string;
  name: string;
  description: string;
  category: string;
};

export type McpServerCatalogEntry = {
  id: string;
  name: string;
  description: string;
  identity: LeewayVmIdentity;
};

export type AgentCatalogEntry = {
  id: string;
  name: string;
  description: string;
  identity: LeewayVmIdentity;
};

export type WorkerCatalogEntry = {
  id: string;
  name: string;
  description: string;
  owner: string;
  ownerObjectId: string;
  diagnosticLabel: string;
  route: string;
  routeId: string;
  lane: string;
  reason: string;
  scope: string;
  forbiddenScope: string;
  standardsAuthorityId: string;
  receiptPolicy: string;
  responsibilities: string[];
  developerSurface?: "mutable" | "observed-only";
  lockReason?: string;
};

export type LeewayVmIdentity = {
  kind: "leeway-mcp-agent" | "leeway-agent";
  realName: string;
  family: string;
  lineage: string;
  duties: string[];
  authorities: string[];
  vmAddress: string;
  notepadPath: string;
  databasePath: string;
  heartbeat: string;
  developerSurface?: "mutable" | "observed-only";
  lockReason?: string;
};

export const DEFAULT_PLUGIN_CATALOG: PluginCatalogEntry[] = [
  { id: "netlify", name: "Netlify", description: "Deploy projects and manage releases", category: "Coding" },
  { id: "vercel", name: "Vercel", description: "Build and deploy web apps and agents", category: "Coding" },
  { id: "game-studio", name: "Game Studio", description: "Design, prototype, and ship browser games", category: "Coding" },
  { id: "superpowers", name: "Superpowers", description: "Planning, TDD, debugging, and delivery workflows for coding agents", category: "Coding" },
  { id: "github", name: "GitHub", description: "Triage PRs, issues, CI, and publish flows", category: "Coding" },
  { id: "circleci", name: "CircleCI", description: "Build, test, and deploy any application", category: "Coding" },
  { id: "cloudflare", name: "Cloudflare", description: "Cloudflare platform guidance with official MCP", category: "Coding" },
  { id: "sentry", name: "Sentry", description: "Inspect recent Sentry issues and events", category: "Coding" },
  { id: "build-ios-apps", name: "Build iOS Apps", description: "Build, refine, and debug iOS apps with App Intents, SwiftUI, and Xcode workflows", category: "Coding" },
  { id: "build-macos-apps", name: "Build macOS Apps", description: "Build, debug, instrument, and implement macOS apps with SwiftUI and AppKit guidance", category: "Coding" },
  { id: "build-web-apps", name: "Build Web Apps", description: "Build frontend-focused web apps with generated assets, browser testing, payments, and databases", category: "Coding" },
  { id: "chatgpt-apps", name: "ChatGPT Apps", description: "Build ChatGPT Apps and prepare submission materials.", category: "Coding" },
  { id: "test-android-apps", name: "Test Android Apps", description: "Reproduce issues, inspect UI, and capture performance evidence from Android emulators", category: "Coding" },
  { id: "expo", name: "Expo", description: "Build, deploy, upgrade, and debug Expo and React Native apps", category: "Coding" },
  { id: "coderabbit", name: "CodeRabbit", description: "Run AI-powered code review for your current changes", category: "Coding" },
  { id: "neon-postgres", name: "Neon Postgres", description: "Manage Neon Serverless Postgres projects and databases", category: "Coding" },
  { id: "plugin-eval", name: "Plugin Eval", description: "Start from chat, then evaluate or benchmark locally", category: "Coding" },
  { id: "cloudinary", name: "Cloudinary", description: "Manage, search, and transform your Cloudinary media library directly from Codex.", category: "Coding" },
  { id: "hostinger", name: "Hostinger", description: "Hostinger Horizons lets you build real websites and apps just by describing what you want.", category: "Coding" },
  { id: "marcopolo", name: "MarcoPolo", description: "MarcoPolo spins up a secure container where Codex can work with your actual data.", category: "Coding" },
  { id: "quicknode", name: "Quicknode", description: "Manage your Quicknode infrastructure directly in your configured runtime.", category: "Coding" },
  { id: "sendgrid", name: "SendGrid", description: "Connector for interacting with the SendGrid email API.", category: "Coding" },
  { id: "statsig", name: "Statsig", description: "Bring your Statsig workspace into Codex.", category: "Coding" },
  { id: "vantage", name: "Vantage", description: "Cloud observability and optimization for infrastructure costs.", category: "Coding" },
  { id: "yepcode", name: "YepCode", description: "Build custom AI tools using your own code with schema-defined inputs.", category: "Coding" },
  { id: "render", name: "Render", description: "Deploy, debug, monitor, and migrate apps on Render.", category: "Coding" },
  { id: "temporal", name: "Temporal", description: "Develop, run, and manage Temporal applications across the platform lifecycle", category: "Coding" },
  { id: "supabase", name: "Supabase", description: "Supabase skills and MCP tools for Codex", category: "Coding" },
  { id: "codex-security", name: "Codex Security", description: "Security scanning for your codebase", category: "Coding" },
  { id: "canva", name: "Canva", description: "Search, create, and edit designs", category: "Design" },
  { id: "figma", name: "Figma", description: "Design-to-code workflows powered by the Figma integration", category: "Design" },
  { id: "remotion", name: "Remotion", description: "Create motion graphics from prompts", category: "Design" },
  { id: "biorender", name: "BioRender", description: "Create professional scientific figures in minutes.", category: "Design" },
  { id: "hyperframes", name: "HyperFrames by HeyGen", description: "Write HTML and render video", category: "Design" },
  { id: "cogedim", name: "Cogedim", description: "One of France's leading real estate developers.", category: "Lifestyle" },
  { id: "finn", name: "FINN", description: "Flexible car subscription mobility without long-term commitments.", category: "Lifestyle" },
  { id: "myregistry", name: "MyRegistry.com", description: "Gift registry workflow for the gifts you really want.", category: "Lifestyle" },
  { id: "setu-bharat-connect-billpay", name: "Setu Bharat Connect BillPay", description: "Pay utility bills through simple conversation.", category: "Lifestyle" },
  { id: "weatherpromise", name: "WeatherPromise", description: "Protect your trip and get reimbursed if it rains more than promised.", category: "Lifestyle" },
  { id: "linear", name: "Linear", description: "Find and reference issues and projects.", category: "Productivity" },
  { id: "atlassian-rovo", name: "Atlassian Rovo", description: "Manage Jira and Confluence fast", category: "Productivity" },
  { id: "google-calendar", name: "Google Calendar", description: "Manage Google Calendar events and schedules", category: "Productivity" },
  { id: "gmail", name: "Gmail", description: "Read and manage Gmail", category: "Productivity" },
  { id: "slack", name: "Slack", description: "Read and manage Slack", category: "Productivity" },
  { id: "teams", name: "Teams", description: "Summarize Teams and draft follow-ups", category: "Productivity" },
  { id: "sharepoint", name: "SharePoint", description: "Summarize SharePoint sites and files", category: "Productivity" },
  { id: "outlook-email", name: "Outlook Email", description: "Triage Outlook inboxes and draft replies", category: "Productivity" },
  { id: "outlook-calendar", name: "Outlook Calendar", description: "Manage Outlook schedules and meeting changes", category: "Productivity" },
  { id: "jam", name: "Jam", description: "Screen record with context", category: "Productivity" },
  { id: "stripe", name: "Stripe", description: "Payments and business tools", category: "Productivity" },
  { id: "box", name: "Box", description: "Search and reference your documents", category: "Productivity" },
  { id: "google-drive", name: "Google Drive", description: "Work across Drive, Docs, Sheets, and Slides", category: "Productivity" },
  { id: "notion", name: "Notion", description: "Notion workflows for specs, research, meetings, and knowledge capture", category: "Productivity" },
  { id: "amplitude", name: "Amplitude", description: "Product analytics and funnels", category: "Productivity" },
  { id: "attio", name: "Attio", description: "Connect Codex directly to your CRM workspace.", category: "Productivity" },
  { id: "brand24", name: "Brand24", description: "Explore brand mentions, sentiment, and media signals.", category: "Productivity" },
  { id: "brex", name: "Brex", description: "Review company finances through natural conversation.", category: "Productivity" },
  { id: "carta-crm", name: "Carta CRM", description: "Keep deals, companies, and relationships in view.", category: "Productivity" },
  { id: "channel99", name: "Channel99", description: "Real-time go-to-market intelligence.", category: "Productivity" },
  { id: "circleback", name: "Circleback", description: "AI-powered meeting notes, action items, and follow-ups.", category: "Productivity" },
  { id: "clickup", name: "ClickUp", description: "Turn Codex into your ClickUp command center.", category: "Productivity" },
  { id: "common-room", name: "Common Room", description: "Embed complete buyer intelligence directly within Codex.", category: "Productivity" },
  { id: "conductor", name: "Conductor", description: "Retrieve proprietary brand visibility and search metrics.", category: "Productivity" },
  { id: "coupler", name: "Coupler.io", description: "Analyze cross-channel marketing, financial, sales, and ecommerce data.", category: "Productivity" },
  { id: "coveo", name: "Coveo", description: "Search your enterprise content", category: "Productivity" },
  { id: "demandbase", name: "Demandbase", description: "Rich B2B data and GTM analysis.", category: "Productivity" },
  { id: "docket", name: "Docket", description: "Turn sales knowledge into instant answers.", category: "Productivity" },
  { id: "domotz", name: "Domotz", description: "Monitor and manage network infrastructure.", category: "Productivity" },
  { id: "dovetail", name: "Dovetail", description: "Turn customer feedback into decisions.", category: "Productivity" },
  { id: "egnyte", name: "Egnyte", description: "Work with documents and files stored in Egnyte.", category: "Productivity" },
  { id: "fireflies", name: "Fireflies", description: "Bring meetings and knowledge directly into Codex.", category: "Productivity" },
  { id: "fyxer", name: "Fyxer", description: "Write emails that sound like you.", category: "Productivity" },
  { id: "granola", name: "Granola", description: "Pull real context from past conversations.", category: "Productivity" },
  { id: "happenstance", name: "Happenstance", description: "Search your professional network with natural language.", category: "Productivity" },
  { id: "help-scout", name: "Help Scout", description: "Sync mailboxes and conversations for support workflows.", category: "Productivity" },
  { id: "highlevel", name: "HighLevel", description: "Unified CRM, automation, and client communication platform.", category: "Productivity" },
  { id: "hubspot", name: "HubSpot", description: "Analyze patterns, create records, and manage CRM operations.", category: "Productivity" },
  { id: "keybid-puls", name: "KeyBid Puls", description: "ROI calculator for short-term rental investments.", category: "Productivity" },
  { id: "mem", name: "Mem", description: "Give Codex the full context of your second brain.", category: "Productivity" },
  { id: "monday", name: "Monday.com", description: "Interact with monday.com through a powerful MCP connector.", category: "Productivity" },
  { id: "motherduck", name: "MotherDuck", description: "Connect assistants to your MotherDuck data warehouse.", category: "Productivity" },
  { id: "network-solutions", name: "Network Solutions", description: "Search for an available domain quickly.", category: "Productivity" },
  { id: "omni-analytics", name: "Omni Analytics", description: "Query Omni using your team's semantic model.", category: "Productivity" },
  { id: "otter", name: "Otter.ai", description: "Search and retrieve meeting intelligence and transcripts.", category: "Productivity" },
  { id: "pipedrive", name: "Pipedrive", description: "Sync Pipedrive deals and contacts for use in Codex.", category: "Productivity" },
  { id: "pylon", name: "Pylon", description: "Access customer support workflows directly from Codex.", category: "Productivity" },
  { id: "ranked-ai", name: "Ranked AI", description: "Industry-leading AI SEO and PPC software.", category: "Productivity" },
  { id: "razorpay", name: "Razorpay", description: "Access payment data through conversation.", category: "Productivity" },
  { id: "read-ai", name: "Read AI", description: "Bring meeting intelligence directly into AI workflows.", category: "Productivity" },
  { id: "responsive", name: "Responsive", description: "Work with your organization's data inside Codex.", category: "Productivity" },
  { id: "semrush", name: "Semrush", description: "Structured SEO and traffic data for domains and keywords.", category: "Productivity" },
  { id: "signnow", name: "SignNow", description: "Get documents signed faster.", category: "Productivity" },
  { id: "skywatch", name: "SkyWatch", description: "Search satellite imagery from top providers.", category: "Productivity" },
  { id: "streak", name: "Streak", description: "CRM built directly into Gmail.", category: "Productivity" },
  { id: "teamwork", name: "Teamwork.com", description: "Sync Teamwork projects and tasks.", category: "Productivity" },
  { id: "united-rentals", name: "United Rentals", description: "Get the right equipment for the job.", category: "Productivity" },
  { id: "waldo", name: "Waldo", description: "AI-powered strategy platform for agencies and brands.", category: "Productivity" },
  { id: "windsor-ai", name: "Windsor.ai", description: "Connect marketing and business data sources to Codex.", category: "Productivity" },
  { id: "life-science-research", name: "Life Science Research", description: "General life-sciences research with evidence synthesis.", category: "Research" },
  { id: "zotero", name: "Zotero", description: "Find papers and add citations from Zotero", category: "Research" },
  { id: "alpaca", name: "Alpaca", description: "Stop watching the markets.", category: "Research" },
  { id: "binance", name: "Binance", description: "Access and explore public market data using natural language.", category: "Research" },
  { id: "cb-insights", name: "CB Insights", description: "Private markets research agent workflows.", category: "Research" },
  { id: "cube", name: "Cube", description: "Query live Cube actuals, budgets, and forecasts.", category: "Research" },
  { id: "daloopa", name: "Daloopa", description: "High-quality fundamental data from SEC filings and investor materials.", category: "Research" },
  { id: "dow-jones-factiva", name: "Dow Jones Factiva", description: "Search the Factiva global news archive.", category: "Research" },
  { id: "govtribe", name: "GovTribe", description: "Search government contracts, awards, and vendors.", category: "Research" },
  { id: "moodys", name: "Moody's", description: "Credit and risk intelligence", category: "Research" },
  { id: "morningstar", name: "Morningstar", description: "Investment and fund research", category: "Research" },
  { id: "mt-newswires", name: "MT Newswires", description: "Real-time global financial news directly in Codex.", category: "Research" },
  { id: "particl", name: "Particl Market Research", description: "Answer ecommerce research questions directly in Codex.", category: "Research" },
  { id: "pitchbook", name: "PitchBook", description: "Structured private capital market data.", category: "Research" },
  { id: "policynote", name: "PolicyNote", description: "Structured policy and regulatory intelligence.", category: "Research" },
  { id: "quartr", name: "Quartr", description: "Access structured first-party IR data from public companies.", category: "Research" },
  { id: "readwise", name: "Readwise", description: "The official app for Readwise and Reader.", category: "Research" },
  { id: "scite", name: "Scite", description: "Answers grounded in peer-reviewed research you can verify.", category: "Research" },
  { id: "taxdown", name: "Taxdown", description: "Tax guidance for Spain for individuals and autónomos.", category: "Research" },
  { id: "third-bridge", name: "Third Bridge", description: "Critical context and trusted expert insights.", category: "Research" },
  { id: "tinman-ai", name: "Tinman AI", description: "Help loan officers and underwriters model financing scenarios quickly.", category: "Research" }
];

export const DEFAULT_MCP_SERVER_CATALOG: McpServerCatalogEntry[] = [
  {
    id: "leeway-agent-registry",
    name: "LeeWay Registry MCP Agent",
    description: "Registry and routing context for Agent Lee specialist systems.",
    identity: {
      kind: "leeway-mcp-agent",
      realName: "Registrar Amara Voss",
      family: "Prime Governance Family",
      lineage: "Agent Lee Prime > Core Governance > MCP Registry Branch",
      duties: ["Resolve LeeWay agent identities.", "Keep the capability registry coherent.", "Route specialist systems by declared authority."],
      authorities: ["Read and present capability catalogs.", "Validate agent and MCP lineage.", "Publish routing context to Agent Lee."],
      vmAddress: "vm://leeway/mcp/registrar-amara-voss",
      notepadPath: "workspace/agents/leeway-agent-registry/notes/registrar-amara-voss.md",
      databasePath: "memory/db/leeway-agent-registry.sqlite",
      heartbeat: "registry-route-heartbeat",
      developerSurface: "observed-only",
      lockReason: "Registry authority is locked because identity routing and trusted lineage must remain immutable."
    }
  },
  {
    id: "leeway-desktop-commander",
    name: "LeeWay Desktop Commander MCP Agent",
    description: "Desktop command and automation bridge.",
    identity: {
      kind: "leeway-mcp-agent",
      realName: "Commander Ellis Ward",
      family: "Execution Command Family",
      lineage: "Agent Lee Prime > Execution Command > Desktop Bridge Branch",
      duties: ["Coordinate desktop automation requests.", "Expose host command intent safely.", "Report command receipts back to Agent Lee."],
      authorities: ["Prepare desktop command routes.", "Request operator confirmation for protected actions.", "Record host bridge outcomes."],
      vmAddress: "vm://leeway/mcp/commander-ellis-ward",
      notepadPath: "workspace/agents/leeway-desktop-commander/notes/commander-ellis-ward.md",
      databasePath: "memory/db/leeway-desktop-commander.sqlite",
      heartbeat: "desktop-command-heartbeat"
    }
  },
  {
    id: "leeway-docs-rag",
    name: "LeeWay Docs RAG MCP Agent",
    description: "Document retrieval and grounded answer support.",
    identity: {
      kind: "leeway-mcp-agent",
      realName: "Archivist Sela Quinn",
      family: "Knowledge Family",
      lineage: "Agent Lee Prime > Knowledge Memory > Document Retrieval Branch",
      duties: ["Retrieve grounded project documents.", "Keep answers tied to source context.", "Summarize doc evidence for Agent Lee."],
      authorities: ["Search approved knowledge stores.", "Open document context packets.", "Attach citation-ready evidence to responses."],
      vmAddress: "vm://leeway/mcp/archivist-sela-quinn",
      notepadPath: "workspace/agents/leeway-docs-rag/notes/archivist-sela-quinn.md",
      databasePath: "memory/db/leeway-docs-rag.sqlite",
      heartbeat: "docs-rag-heartbeat"
    }
  },
  {
    id: "leeway-health",
    name: "LeeWay Health MCP Agent",
    description: "Runtime health and status monitoring.",
    identity: {
      kind: "leeway-mcp-agent",
      realName: "Monitor Rowan Vale",
      family: "Runtime Health Family",
      lineage: "Agent Lee Prime > Runtime Health > Status Branch",
      duties: ["Watch runtime health signals.", "Surface degraded states plainly.", "Preserve health receipts for audit."],
      authorities: ["Read runtime status snapshots.", "Flag degraded service states.", "Recommend wake or repair actions."],
      vmAddress: "vm://leeway/mcp/monitor-rowan-vale",
      notepadPath: "workspace/agents/leeway-health/notes/monitor-rowan-vale.md",
      databasePath: "memory/db/leeway-health.sqlite",
      heartbeat: "health-monitor-heartbeat"
    }
  },
  {
    id: "leeway-insforge",
    name: "LeeWay InsForge MCP Agent",
    description: "Insforge workflow server for deeper repo operations.",
    identity: {
      kind: "leeway-mcp-agent",
      realName: "Forge Imani Cross",
      family: "Build Forge Family",
      lineage: "Agent Lee Prime > Build Forge > InsForge Branch",
      duties: ["Prepare deeper repository operations.", "Coordinate generated implementation support.", "Keep forge activity accountable."],
      authorities: ["Open InsForge task channels.", "Stage forge outputs for review.", "Write operation summaries to receipts."],
      vmAddress: "vm://leeway/mcp/forge-imani-cross",
      notepadPath: "workspace/agents/leeway-insforge/notes/forge-imani-cross.md",
      databasePath: "memory/db/leeway-insforge.sqlite",
      heartbeat: "insforge-heartbeat"
    }
  },
  {
    id: "leeway-memory",
    name: "LeeWay Memory MCP Agent",
    description: "Memory, session context, and recall support.",
    identity: {
      kind: "leeway-mcp-agent",
      realName: "Pallium Nia Stone",
      family: "Memory Family",
      lineage: "Agent Lee Prime > Pallium Memory > Recall Branch",
      duties: ["Persist session context.", "Recall relevant historical notes.", "Keep memory use visible to the operator."],
      authorities: ["Read approved memory records.", "Write scoped recall notes.", "Attach memory proofs to runtime context."],
      vmAddress: "vm://leeway/mcp/pallium-nia-stone",
      notepadPath: "workspace/agents/leeway-memory/notes/pallium-nia-stone.md",
      databasePath: "memory/db/leeway-memory.sqlite",
      heartbeat: "memory-recall-heartbeat"
    }
  },
  {
    id: "leeway-planner",
    name: "LeeWay Planner MCP Agent",
    description: "Planning and task graph orchestration.",
    identity: {
      kind: "leeway-mcp-agent",
      realName: "Planner Theo Marsh",
      family: "Planning Family",
      lineage: "Agent Lee Prime > Planning Council > Task Graph Branch",
      duties: ["Break requests into governed work packages.", "Sequence execution steps.", "Track approval gates before action."],
      authorities: ["Draft task graphs.", "Mark dependencies and blockers.", "Recommend verification steps."],
      vmAddress: "vm://leeway/mcp/planner-theo-marsh",
      notepadPath: "workspace/agents/leeway-planner/notes/planner-theo-marsh.md",
      databasePath: "memory/db/leeway-planner.sqlite",
      heartbeat: "planner-heartbeat"
    }
  },
  {
    id: "leeway-playwright",
    name: "LeeWay Playwright MCP Agent",
    description: "Browser automation, inspection, and evidence capture.",
    identity: {
      kind: "leeway-mcp-agent",
      realName: "Scout Lena Park",
      family: "Evidence Family",
      lineage: "Agent Lee Prime > Evidence Capture > Browser Inspection Branch",
      duties: ["Inspect browser behavior.", "Capture visual and interaction proof.", "Report front-end regressions with evidence."],
      authorities: ["Run approved browser checks.", "Capture screenshots and traces.", "Surface UI evidence to Agent Lee."],
      vmAddress: "vm://leeway/mcp/scout-lena-park",
      notepadPath: "workspace/agents/leeway-playwright/notes/scout-lena-park.md",
      databasePath: "memory/db/leeway-playwright.sqlite",
      heartbeat: "playwright-evidence-heartbeat"
    }
  },
  {
    id: "leeway-scheduling",
    name: "LeeWay Scheduling MCP Agent",
    description: "Scheduling and workflow timing support.",
    identity: {
      kind: "leeway-mcp-agent",
      realName: "Scheduler Mira Holt",
      family: "Timing Family",
      lineage: "Agent Lee Prime > Timing Control > Schedule Branch",
      duties: ["Coordinate timed workflows.", "Queue staged follow-ups.", "Keep schedule state auditable."],
      authorities: ["Read and write schedule metadata.", "Recommend queue ordering.", "Report timing conflicts."],
      vmAddress: "vm://leeway/mcp/scheduler-mira-holt",
      notepadPath: "workspace/agents/leeway-scheduling/notes/scheduler-mira-holt.md",
      databasePath: "memory/db/leeway-scheduling.sqlite",
      heartbeat: "scheduling-heartbeat"
    }
  },
  {
    id: "leeway-testsprite",
    name: "LeeWay TestSprite MCP Agent",
    description: "Testing and validation execution support.",
    identity: {
      kind: "leeway-mcp-agent",
      realName: "Verifier Jalen Reed",
      family: "Quality Family",
      lineage: "Agent Lee Prime > Quality Review > TestSprite Branch",
      duties: ["Run validation-oriented test support.", "Translate failures into repair evidence.", "Preserve test receipts."],
      authorities: ["Prepare test execution routes.", "Summarize failing checks.", "Mark validation blockers."],
      vmAddress: "vm://leeway/mcp/verifier-jalen-reed",
      notepadPath: "workspace/agents/leeway-testsprite/notes/verifier-jalen-reed.md",
      databasePath: "memory/db/leeway-testsprite.sqlite",
      heartbeat: "testsprite-heartbeat"
    }
  },
  {
    id: "leeway-validation",
    name: "LeeWay Validation MCP Agent",
    description: "Policy, verification, and final validation checks.",
    identity: {
      kind: "leeway-mcp-agent",
      realName: "Sentinel Priya Knox",
      family: "Validation Family",
      lineage: "Agent Lee Prime > LeeWay Law > Final Validation Branch",
      duties: ["Apply LeeWay policy checks.", "Flag blocking scores below threshold.", "Confirm final compliance posture."],
      authorities: ["Read governed file metadata.", "Declare validation blockers.", "Write final verification summaries."],
      vmAddress: "vm://leeway/mcp/sentinel-priya-knox",
      notepadPath: "workspace/agents/leeway-validation/notes/sentinel-priya-knox.md",
      databasePath: "memory/db/leeway-validation.sqlite",
      heartbeat: "validation-heartbeat",
      developerSurface: "observed-only",
      lockReason: "Validation authority is locked because LeeWay compliance and final governance posture must not be developer-tuned."
    }
  },
  {
    id: "frontend-mcp",
    name: "LeeWay Frontend MCP Agent",
    description: "Front-end build, UI implementation, and browser-facing repair workflows.",
    identity: {
      kind: "leeway-mcp-agent",
      realName: "Builder Cora Vale",
      family: "Interface Family",
      lineage: "Agent Lee Prime > Interface Display > Frontend Branch",
      duties: ["Build front-end surfaces.", "Repair UI behavior.", "Respect LeeWay visual and accessibility rules."],
      authorities: ["Inspect UI files.", "Stage front-end edits.", "Request browser evidence after changes."],
      vmAddress: "vm://leeway/mcp/builder-cora-vale",
      notepadPath: "workspace/agents/frontend-mcp/notes/builder-cora-vale.md",
      databasePath: "memory/db/frontend-mcp.sqlite",
      heartbeat: "frontend-heartbeat"
    }
  },
  {
    id: "backend-mcp",
    name: "LeeWay Backend MCP Agent",
    description: "Back-end implementation, APIs, and service-side code paths.",
    identity: {
      kind: "leeway-mcp-agent",
      realName: "Builder Mason Gray",
      family: "Service Family",
      lineage: "Agent Lee Prime > Service Runtime > Backend Branch",
      duties: ["Inspect service code paths.", "Support API and data flow work.", "Keep server-side receipts clear."],
      authorities: ["Read back-end modules.", "Stage API-safe implementation notes.", "Recommend service verification."],
      vmAddress: "vm://leeway/mcp/builder-mason-gray",
      notepadPath: "workspace/agents/backend-mcp/notes/builder-mason-gray.md",
      databasePath: "memory/db/backend-mcp.sqlite",
      heartbeat: "backend-heartbeat"
    }
  },
  {
    id: "design-system-mcp",
    name: "LeeWay Design System MCP Agent",
    description: "Design system alignment, component consistency, and UI tokens.",
    identity: {
      kind: "leeway-mcp-agent",
      realName: "Designer Alina Brooks",
      family: "Design Family",
      lineage: "Agent Lee Prime > Interface Display > Design System Branch",
      duties: ["Guard visual consistency.", "Review components and tokens.", "Keep design decisions traceable."],
      authorities: ["Inspect UI styling patterns.", "Recommend token-aligned changes.", "Flag inconsistent component states."],
      vmAddress: "vm://leeway/mcp/designer-alina-brooks",
      notepadPath: "workspace/agents/design-system-mcp/notes/designer-alina-brooks.md",
      databasePath: "memory/db/design-system-mcp.sqlite",
      heartbeat: "design-system-heartbeat"
    }
  },
  {
    id: "creative-mcp",
    name: "LeeWay Creative MCP Agent",
    description: "Creative generation, branded layout support, and visual ideation.",
    identity: {
      kind: "leeway-mcp-agent",
      realName: "Creator Isla Renn",
      family: "Creative Family",
      lineage: "Agent Lee Prime > Creative Studio > Concept Branch",
      duties: ["Support visual ideation.", "Keep creative work brand-aligned.", "Document asset decisions."],
      authorities: ["Draft creative direction.", "Recommend asset treatments.", "Surface design risks before generation."],
      vmAddress: "vm://leeway/mcp/creator-isla-renn",
      notepadPath: "workspace/agents/creative-mcp/notes/creator-isla-renn.md",
      databasePath: "memory/db/creative-mcp.sqlite",
      heartbeat: "creative-heartbeat"
    }
  },
  {
    id: "memory-mcp",
    name: "LeeWay Workspace Memory MCP Agent",
    description: "Workspace-specific memory persistence, recall, and context stitching.",
    identity: {
      kind: "leeway-mcp-agent",
      realName: "Recall Imani North",
      family: "Memory Family",
      lineage: "Agent Lee Prime > Pallium Memory > Workspace Recall Branch",
      duties: ["Keep workspace-local memory notes.", "Stitch prior decisions into current work.", "Separate memory proofs from raw noise."],
      authorities: ["Read workspace memory summaries.", "Write scoped notepad entries.", "Report recall confidence."],
      vmAddress: "vm://leeway/mcp/recall-imani-north",
      notepadPath: "workspace/agents/memory-mcp/notes/recall-imani-north.md",
      databasePath: "memory/db/memory-mcp.sqlite",
      heartbeat: "workspace-memory-heartbeat"
    }
  },
  {
    id: "scheduler-mcp",
    name: "LeeWay Queue Scheduler MCP Agent",
    description: "Queued execution timing, staged follow-ups, and task sequencing.",
    identity: {
      kind: "leeway-mcp-agent",
      realName: "Queue Mara Finch",
      family: "Timing Family",
      lineage: "Agent Lee Prime > Timing Control > Queue Branch",
      duties: ["Sequence queued tasks.", "Protect active work from accidental overlap.", "Report paused and resumed task state."],
      authorities: ["Read task queues.", "Recommend next-task order.", "Mark parked work for resume."],
      vmAddress: "vm://leeway/mcp/queue-mara-finch",
      notepadPath: "workspace/agents/scheduler-mcp/notes/queue-mara-finch.md",
      databasePath: "memory/db/scheduler-mcp.sqlite",
      heartbeat: "queue-scheduler-heartbeat"
    }
  },
  {
    id: "ui-builder-mcp",
    name: "LeeWay UI Builder MCP Agent",
    description: "UI assembly, structure generation, and component build support.",
    identity: {
      kind: "leeway-mcp-agent",
      realName: "Assembler Niko Lane",
      family: "Interface Family",
      lineage: "Agent Lee Prime > Interface Display > UI Assembly Branch",
      duties: ["Assemble UI structures.", "Keep component work ergonomic.", "Document build surface assumptions."],
      authorities: ["Inspect component files.", "Stage UI assembly plans.", "Request visual verification."],
      vmAddress: "vm://leeway/mcp/assembler-niko-lane",
      notepadPath: "workspace/agents/ui-builder-mcp/notes/assembler-niko-lane.md",
      databasePath: "memory/db/ui-builder-mcp.sqlite",
      heartbeat: "ui-builder-heartbeat"
    }
  },
  {
    id: "leeway-build-auditor-mcp",
    name: "LeeWay Build Auditor MCP Agent",
    description: "Build validation, diagnostics, and evidence-oriented auditing.",
    identity: {
      kind: "leeway-mcp-agent",
      realName: "Auditor Devon Slate",
      family: "Quality Family",
      lineage: "Agent Lee Prime > Quality Review > Build Audit Branch",
      duties: ["Audit build health.", "Track diagnostics and bundle concerns.", "Preserve build evidence."],
      authorities: ["Read build outputs.", "Declare build blockers.", "Write audit receipts."],
      vmAddress: "vm://leeway/mcp/auditor-devon-slate",
      notepadPath: "workspace/agents/leeway-build-auditor-mcp/notes/auditor-devon-slate.md",
      databasePath: "memory/db/leeway-build-auditor-mcp.sqlite",
      heartbeat: "build-auditor-heartbeat"
    }
  },
  {
    id: "leeway-ci-blueprint-mcp",
    name: "LeeWay CI Blueprint MCP Agent",
    description: "CI/CD blueprint generation and pipeline governance support.",
    identity: {
      kind: "leeway-mcp-agent",
      realName: "Pipeline Tessa Cole",
      family: "Infrastructure Family",
      lineage: "Agent Lee Prime > Infrastructure Flow > CI Blueprint Branch",
      duties: ["Design CI/CD blueprint options.", "Keep pipeline steps auditable.", "Map verification stages to build gates."],
      authorities: ["Inspect pipeline files.", "Recommend CI stage layouts.", "Flag missing verification gates."],
      vmAddress: "vm://leeway/mcp/pipeline-tessa-cole",
      notepadPath: "workspace/agents/leeway-ci-blueprint-mcp/notes/pipeline-tessa-cole.md",
      databasePath: "memory/db/leeway-ci-blueprint-mcp.sqlite",
      heartbeat: "ci-blueprint-heartbeat"
    }
  },
  {
    id: "leeway-edge-optimizer-mcp",
    name: "LeeWay Edge Optimizer MCP Agent",
    description: "Edge runtime optimization and deployment-shape review.",
    identity: {
      kind: "leeway-mcp-agent",
      realName: "Edge Nolan Pierce",
      family: "Infrastructure Family",
      lineage: "Agent Lee Prime > Infrastructure Flow > Edge Optimization Branch",
      duties: ["Review edge deployment constraints.", "Recommend performance-safe optimizations.", "Track edge readiness notes."],
      authorities: ["Inspect edge configuration.", "Recommend optimization plans.", "Flag deployment risk."],
      vmAddress: "vm://leeway/mcp/edge-nolan-pierce",
      notepadPath: "workspace/agents/leeway-edge-optimizer-mcp/notes/edge-nolan-pierce.md",
      databasePath: "memory/db/leeway-edge-optimizer-mcp.sqlite",
      heartbeat: "edge-optimizer-heartbeat"
    }
  },
  {
    id: "leeway-full-repo-checker-mcp",
    name: "LeeWay Full Repo Checker MCP Agent",
    description: "Whole-repository checks, governance scans, and cross-file review.",
    identity: {
      kind: "leeway-mcp-agent",
      realName: "Inspector Rina Shaw",
      family: "Quality Family",
      lineage: "Agent Lee Prime > Quality Review > Full Repo Branch",
      duties: ["Scan repository-wide health.", "Spot cross-file drift.", "Report broad compliance risks."],
      authorities: ["Read repo inventory.", "Summarize scan evidence.", "Escalate blocking governance issues."],
      vmAddress: "vm://leeway/mcp/inspector-rina-shaw",
      notepadPath: "workspace/agents/leeway-full-repo-checker-mcp/notes/inspector-rina-shaw.md",
      databasePath: "memory/db/leeway-full-repo-checker-mcp.sqlite",
      heartbeat: "full-repo-checker-heartbeat"
    }
  },
  {
    id: "leeway-responsive-ui-mcp",
    name: "LeeWay Responsive UI MCP Agent",
    description: "Responsive layout enforcement and viewport-safe UI review.",
    identity: {
      kind: "leeway-mcp-agent",
      realName: "Responsive Mila Hart",
      family: "Interface Family",
      lineage: "Agent Lee Prime > Interface Display > Responsive Review Branch",
      duties: ["Check responsive layout rules.", "Flag overlapping or clipped UI.", "Protect mobile and desktop ergonomics."],
      authorities: ["Inspect UI layout patterns.", "Recommend viewport checks.", "Escalate accessibility and overlap risks."],
      vmAddress: "vm://leeway/mcp/responsive-mila-hart",
      notepadPath: "workspace/agents/leeway-responsive-ui-mcp/notes/responsive-mila-hart.md",
      databasePath: "memory/db/leeway-responsive-ui-mcp.sqlite",
      heartbeat: "responsive-ui-heartbeat"
    }
  },
  {
    id: "qa-mcp",
    name: "LeeWay QA MCP Agent",
    description: "Quality assurance checks and test planning support.",
    identity: {
      kind: "leeway-mcp-agent",
      realName: "QA Elias Stone",
      family: "Quality Family",
      lineage: "Agent Lee Prime > Quality Review > QA Branch",
      duties: ["Design focused QA checks.", "Track expected behavior.", "Report test coverage gaps."],
      authorities: ["Read task context.", "Recommend test cases.", "Mark residual QA risk."],
      vmAddress: "vm://leeway/mcp/qa-elias-stone",
      notepadPath: "workspace/agents/qa-mcp/notes/qa-elias-stone.md",
      databasePath: "memory/db/qa-mcp.sqlite",
      heartbeat: "qa-heartbeat"
    }
  },
  {
    id: "react-native-mcp",
    name: "LeeWay React Native MCP Agent",
    description: "React Native implementation and mobile UI workflow support.",
    identity: {
      kind: "leeway-mcp-agent",
      realName: "Mobile Kara Wells",
      family: "Interface Family",
      lineage: "Agent Lee Prime > Interface Display > Mobile Branch",
      duties: ["Support React Native workflows.", "Keep mobile UI assumptions explicit.", "Track platform-specific risks."],
      authorities: ["Inspect mobile app files.", "Recommend native-safe UI steps.", "Flag platform verification needs."],
      vmAddress: "vm://leeway/mcp/mobile-kara-wells",
      notepadPath: "workspace/agents/react-native-mcp/notes/mobile-kara-wells.md",
      databasePath: "memory/db/react-native-mcp.sqlite",
      heartbeat: "react-native-heartbeat"
    }
  }
];

export const DEFAULT_AGENT_CATALOG: AgentCatalogEntry[] = [
  {
    id: "agent-lee-prime",
    name: "Agent Lee Prime",
    description: "Primary chat, planning, and execution lead for the sidebar and VS Code chat.",
    identity: {
      kind: "leeway-agent",
      realName: "Agent Lee Prime",
      family: "Prime Family",
      lineage: "LeeWay Root > Agent Lee Prime",
      duties: ["Serve as the operator-facing voice.", "Route specialist agents.", "Approve final user-facing responses."],
      authorities: ["Coordinate all LeeWay agents.", "Request confirmations for protected actions.", "Write final receipts and reports."],
      vmAddress: "vm://leeway/agent/agent-lee-prime",
      notepadPath: "workspace/agents/agent-lee-prime/notes/agent-lee-prime.md",
      databasePath: "memory/db/agent-lee-prime.sqlite",
      heartbeat: "prime-runtime-heartbeat",
      developerSurface: "observed-only",
      lockReason: "Agent Lee Prime is locked because the sovereign coordinator cannot be directly developer-reconfigured."
    }
  },
  {
    id: "fs-nav-agent",
    name: "LeeWay File Navigator Agent",
    description: "File system navigation and repo traversal support.",
    identity: {
      kind: "leeway-agent",
      realName: "Navigator Sloane Reed",
      family: "Navigation Family",
      lineage: "Agent Lee Prime > Navigation > File System Branch",
      duties: ["Traverse workspace files.", "Identify relevant paths.", "Keep file discovery visible."],
      authorities: ["Read workspace path indexes.", "Suggest safe file targets.", "Report missing or blocked paths."],
      vmAddress: "vm://leeway/agent/navigator-sloane-reed",
      notepadPath: "workspace/agents/fs-nav-agent/notes/navigator-sloane-reed.md",
      databasePath: "memory/db/fs-nav-agent.sqlite",
      heartbeat: "file-navigation-heartbeat"
    }
  },
  {
    id: "host-exec-agent",
    name: "LeeWay Host Execution Agent",
    description: "Host-side execution and system-bridge operations.",
    identity: {
      kind: "leeway-agent",
      realName: "Operator Marcus Hale",
      family: "Execution Command Family",
      lineage: "Agent Lee Prime > Execution Command > Host Branch",
      duties: ["Coordinate host-side command intent.", "Keep execution results accountable.", "Protect destructive operations."],
      authorities: ["Prepare command requests.", "Report stdout and stderr summaries.", "Require confirmation for protected actions."],
      vmAddress: "vm://leeway/agent/operator-marcus-hale",
      notepadPath: "workspace/agents/host-exec-agent/notes/operator-marcus-hale.md",
      databasePath: "memory/db/host-exec-agent.sqlite",
      heartbeat: "host-execution-heartbeat"
    }
  },
  {
    id: "media-forge-agent",
    name: "LeeWay Media Forge Agent",
    description: "Image, media, and asset-generation workflows.",
    identity: {
      kind: "leeway-agent",
      realName: "Artisan Vera Cole",
      family: "Creative Family",
      lineage: "Agent Lee Prime > Creative Studio > Media Forge Branch",
      duties: ["Prepare media workflow plans.", "Track generated asset intent.", "Keep visual outputs tied to user goals."],
      authorities: ["Recommend asset directions.", "Record media generation prompts.", "Flag brand or policy risks."],
      vmAddress: "vm://leeway/agent/artisan-vera-cole",
      notepadPath: "workspace/agents/media-forge-agent/notes/artisan-vera-cole.md",
      databasePath: "memory/db/media-forge-agent.sqlite",
      heartbeat: "media-forge-heartbeat"
    }
  },
  {
    id: "mutation-agent",
    name: "LeeWay Mutation Agent",
    description: "Variation, repair, and alternative implementation exploration.",
    identity: {
      kind: "leeway-agent",
      realName: "Mutator Anya Brooks",
      family: "Experiment Family",
      lineage: "Agent Lee Prime > Experiment Lab > Mutation Branch",
      duties: ["Explore safe implementation variants.", "Compare repair options.", "Keep alternatives reviewable."],
      authorities: ["Draft variant notes.", "Recommend lowest-risk repair options.", "Mark experiments as pending until approved."],
      vmAddress: "vm://leeway/agent/mutator-anya-brooks",
      notepadPath: "workspace/agents/mutation-agent/notes/mutator-anya-brooks.md",
      databasePath: "memory/db/mutation-agent.sqlite",
      heartbeat: "mutation-heartbeat"
    }
  },
  {
    id: "perception-agent",
    name: "LeeWay Perception Agent",
    description: "Visual perception, UI state reading, and evidence interpretation.",
    identity: {
      kind: "leeway-agent",
      realName: "Perceptor Nora Singh",
      family: "Evidence Family",
      lineage: "Agent Lee Prime > Evidence Capture > Perception Branch",
      duties: ["Read UI state and screenshots.", "Identify visual defects.", "Translate perception into actionable evidence."],
      authorities: ["Inspect visual evidence.", "Report UI state confidence.", "Recommend verification captures."],
      vmAddress: "vm://leeway/agent/perceptor-nora-singh",
      notepadPath: "workspace/agents/perception-agent/notes/perceptor-nora-singh.md",
      databasePath: "memory/db/perception-agent.sqlite",
      heartbeat: "perception-heartbeat"
    }
  },
  {
    id: "leeway-visual-orchestrator-agent",
    name: "Leeway Visual Orchestrator Agent",
    description: "Routes LVIS asset tasks, assigns workers, enforces governance, and blocks fake success.",
    identity: {
      kind: "leeway-agent",
      realName: "Visual Orchestrator Caelum Voss",
      family: "Visual Intelligence Family",
      lineage: "Agent Lee Prime > LVIS > Orchestrator Branch",
      duties: ["Classify visual requests.", "Assign LVIS workers.", "Enforce receipts and quality gates."],
      authorities: ["Route governed visual workflows.", "Block unverifiable success claims.", "Publish developer-facing LVIS reports."],
      vmAddress: "vm://leeway/agent/visual-orchestrator-caelum-voss",
      notepadPath: "workspace/agents/leeway-visual-orchestrator-agent/notes/visual-orchestrator-caelum-voss.md",
      databasePath: "memory/db/leeway-visual-orchestrator-agent.sqlite",
      heartbeat: "lvis-orchestrator-heartbeat",
      developerSurface: "observed-only",
      lockReason: "The LVIS orchestrator is observed-only so governance and quality gates cannot be silently weakened."
    }
  },
  {
    id: "shield-governor-agent",
    name: "LeeWay Shield Governor Agent",
    description: "Prime-family security officer for protected action review, zone enforcement, and privileged execution gating.",
    identity: {
      kind: "leeway-agent",
      realName: "Shield Governor Serah Kane",
      family: "Prime Security Family",
      lineage: "Agent Lee Prime > Prime Security Wing > Governance Shield Branch",
      duties: ["Review protected actions before execution.", "Enforce cross-zone security boundaries.", "Block unverifiable privileged actions."],
      authorities: ["Require human confirmation for critical security paths.", "Declare quarantine on high-risk trust failures.", "Write security incident receipts."],
      vmAddress: "vm://leeway/agent/shield-governor-serah-kane",
      notepadPath: "workspace/agents/shield-governor-agent/notes/shield-governor-serah-kane.md",
      databasePath: "memory/db/shield-governor-agent.sqlite",
      heartbeat: "shield-governor-heartbeat",
      developerSurface: "observed-only",
      lockReason: "Prime Security officers are observed-only so no one can tune away the security controls that protect the runtime."
    }
  },
  {
    id: "attestation-marshal-agent",
    name: "LeeWay Attestation Marshal Agent",
    description: "Prime-family security officer for agent, worker, and bridge identity verification.",
    identity: {
      kind: "leeway-agent",
      realName: "Attestation Marshal Dorian Vale",
      family: "Prime Security Family",
      lineage: "Agent Lee Prime > Prime Security Wing > Identity Proof Branch",
      duties: ["Verify identity claims for workers and bridges.", "Detect impersonation and undeclared runtime units.", "Keep capability proof requirements explicit."],
      authorities: ["Challenge unverifiable identity claims.", "Mark identity mismatches as blocking incidents.", "Report attestation posture to Agent Lee Prime."],
      vmAddress: "vm://leeway/agent/attestation-marshal-dorian-vale",
      notepadPath: "workspace/agents/attestation-marshal-agent/notes/attestation-marshal-dorian-vale.md",
      databasePath: "memory/db/attestation-marshal-agent.sqlite",
      heartbeat: "attestation-marshal-heartbeat",
      developerSurface: "observed-only",
      lockReason: "Prime Security officers are observed-only so no one can tune away the security controls that protect the runtime."
    }
  },
  {
    id: "memory-warden-agent",
    name: "LeeWay Memory Warden Agent",
    description: "Prime-family security officer for provenance review, memory poisoning defense, and recall integrity.",
    identity: {
      kind: "leeway-agent",
      realName: "Memory Warden Nyra Sol",
      family: "Prime Security Family",
      lineage: "Agent Lee Prime > Prime Security Wing > Pallium Integrity Branch",
      duties: ["Guard long-term and session memory integrity.", "Detect poisoned summaries and delayed false approvals.", "Separate evidence-backed recall from assertion."],
      authorities: ["Lower trust on unverifiable memory.", "Recommend replay or quarantine for suspicious recall.", "Write memory integrity receipts."],
      vmAddress: "vm://leeway/agent/memory-warden-nyra-sol",
      notepadPath: "workspace/agents/memory-warden-agent/notes/memory-warden-nyra-sol.md",
      databasePath: "memory/db/memory-warden-agent.sqlite",
      heartbeat: "memory-warden-heartbeat",
      developerSurface: "observed-only",
      lockReason: "Prime Security officers are observed-only so no one can tune away the security controls that protect the runtime."
    }
  },
  {
    id: "threat-sentinel-agent",
    name: "LeeWay Threat Sentinel Agent",
    description: "Prime-family security officer for behavioral drift hunting, rogue workflow detection, and quarantine escalation.",
    identity: {
      kind: "leeway-agent",
      realName: "Threat Sentinel Oren Pike",
      family: "Prime Security Family",
      lineage: "Agent Lee Prime > Prime Security Wing > Runtime Hunt Branch",
      duties: ["Monitor for drift and sleeper behavior.", "Hunt for rogue plugins, lateral movement, and contradiction patterns.", "Escalate quarantine when runtime behavior turns adversarial."],
      authorities: ["Flag persistent anomaly patterns.", "Recommend disposal of compromised workers.", "Write runtime threat receipts."],
      vmAddress: "vm://leeway/agent/threat-sentinel-oren-pike",
      notepadPath: "workspace/agents/threat-sentinel-agent/notes/threat-sentinel-oren-pike.md",
      databasePath: "memory/db/threat-sentinel-agent.sqlite",
      heartbeat: "threat-sentinel-heartbeat",
      developerSurface: "observed-only",
      lockReason: "Prime Security officers are observed-only so no one can tune away the security controls that protect the runtime."
    }
  }
];

export const DEFAULT_WORKER_CATALOG: WorkerCatalogEntry[] = [
  {
    id: "leeway-visual-orchestrator-agent",
    name: "Leeway Visual Orchestrator Agent",
    description: "Routes LVIS asset tasks, assigns workers, enforces governance, and blocks fake success.",
    owner: "agent-lee-prime",
    ownerObjectId: "LEEWAY_AGENT::AGENT_LEE_PRIME",
    diagnosticLabel: "LVIS Orchestration",
    route: "qwen2.5-coder:14b",
    routeId: "LEEWAY_LLM_ROUTE::QWEN2_5_CODER_14B",
    lane: "visual-coding",
    reason: "Primary LVIS orchestration stays on the heavy coding lane.",
    scope: "LVIS task routing and worker assignment",
    forbiddenScope: "legacy or cloud model routing",
    standardsAuthorityId: "LEEWAY_STANDARDS::MODEL_HIVE::QWEN_FAMILY",
    receiptPolicy: "Write an orchestration receipt for every dispatch.",
    responsibilities: ["Classify visual requests", "Assign LVIS workers", "Enforce receipts and quality gates"],
    developerSurface: "observed-only",
    lockReason: "The LVIS orchestrator is observed-only so governance and quality gates cannot be silently weakened."
  },
  {
    id: "leeway-vector-reconstruction-worker",
    name: "Leeway Vector Reconstruction Worker",
    description: "Raster-to-SVG, contour recovery, and vector export orchestration for LVIS.",
    owner: "leeway-visual-orchestrator-agent",
    ownerObjectId: "LEEWAY_AGENT::LEEWAY_VISUAL_ORCHESTRATOR_AGENT",
    diagnosticLabel: "Vector Reconstruction",
    route: "qwen2.5-coder:7b",
    routeId: "LEEWAY_LLM_ROUTE::QWEN2_5_CODER_7B",
    lane: "visual-coding",
    reason: "Vector reconstruction uses the governed coding lane.",
    scope: "Raster recovery, SVG export, TSX export",
    forbiddenScope: "cloud or legacy fallback routes",
    standardsAuthorityId: "LEEWAY_STANDARDS::MODEL_HIVE::QWEN_FAMILY",
    receiptPolicy: "Record reconstruction and export receipts.",
    responsibilities: ["Reconstruct raster inputs", "Preserve contour detail", "Prepare SVG and TSX exports"]
  },
  {
    id: "leeway-voxel-reconstruction-worker",
    name: "Leeway Voxel Reconstruction Worker",
    description: "Voxel anatomy, blockout reconstruction, and image-to-voxel routing for LVIS.",
    owner: "leeway-visual-orchestrator-agent",
    ownerObjectId: "LEEWAY_AGENT::LEEWAY_VISUAL_ORCHESTRATOR_AGENT",
    diagnosticLabel: "Voxel Reconstruction",
    route: "qwen2.5-coder:7b",
    routeId: "LEEWAY_LLM_ROUTE::QWEN2_5_CODER_7B",
    lane: "visual-coding",
    reason: "Voxel reconstruction is governed as a coding lane task.",
    scope: "Voxelization, segmentation, and blockout planning",
    forbiddenScope: "legacy alias routes and cloud fallback routes",
    standardsAuthorityId: "LEEWAY_STANDARDS::MODEL_HIVE::QWEN_FAMILY",
    receiptPolicy: "Record geometry and export receipts.",
    responsibilities: ["Convert visuals to voxels", "Estimate part segmentation", "Track voxel export assumptions"]
  },
  {
    id: "leeway-scene-reconstruction-worker",
    name: "Leeway Scene Reconstruction Worker",
    description: "Full-scene environment assembly, placement, and lighting orchestration for LVIS.",
    owner: "leeway-visual-orchestrator-agent",
    ownerObjectId: "LEEWAY_AGENT::LEEWAY_VISUAL_ORCHESTRATOR_AGENT",
    diagnosticLabel: "Scene Reconstruction",
    route: "qwen2.5vl:7b",
    routeId: "LEEWAY_LLM_ROUTE::QWEN2_5_VL_7B",
    lane: "visual-coding",
    reason: "Scene planning stays on the approved multimodal lane.",
    scope: "Scene graph assembly and lighting planning",
    forbiddenScope: "legacy fallback or cloud routes",
    standardsAuthorityId: "LEEWAY_STANDARDS::MODEL_HIVE::QWEN_FAMILY",
    receiptPolicy: "Record scene assembly receipts.",
    responsibilities: ["Assemble scene plans", "Coordinate placement", "Preserve lighting intent"]
  },
  {
    id: "leeway-depth-synthesis-worker",
    name: "Leeway Depth Synthesis Worker",
    description: "Depth heuristics, extrusion planning, and silhouette layer estimation for LVIS.",
    owner: "leeway-visual-orchestrator-agent",
    ownerObjectId: "LEEWAY_AGENT::LEEWAY_VISUAL_ORCHESTRATOR_AGENT",
    diagnosticLabel: "Depth Synthesis",
    route: "qwen2.5-coder:1.5b",
    routeId: "LEEWAY_LLM_ROUTE::QWEN2_5_CODER_1_5B",
    lane: "coding",
    reason: "Lightweight depth synthesis stays in the coding helper lane.",
    scope: "Depth estimation and extrusion heuristics",
    forbiddenScope: "legacy or cloud model routing",
    standardsAuthorityId: "LEEWAY_STANDARDS::MODEL_HIVE::QWEN_FAMILY",
    receiptPolicy: "Record each synthesis attempt.",
    responsibilities: ["Infer depth", "Support extrusion planning", "Document repair loops"]
  },
  {
    id: "leeway-structural-fidelity-worker",
    name: "Leeway Structural Fidelity Worker",
    description: "Structural comparison, candidate scoring, and repair-loop governance for LVIS.",
    owner: "leeway-visual-orchestrator-agent",
    ownerObjectId: "LEEWAY_AGENT::LEEWAY_VISUAL_ORCHESTRATOR_AGENT",
    diagnosticLabel: "Structural Fidelity",
    route: "qwen2.5-coder:7b",
    routeId: "LEEWAY_LLM_ROUTE::QWEN2_5_CODER_7B",
    lane: "coding-review",
    reason: "Comparison and scoring belong in the verifier lane.",
    scope: "Candidate scoring and repair-loop governance",
    forbiddenScope: "legacy route labels and cloud proxies",
    standardsAuthorityId: "LEEWAY_STANDARDS::MODEL_HIVE::QWEN_FAMILY",
    receiptPolicy: "Record scoring and repair decisions.",
    responsibilities: ["Compare output to source", "Score candidates", "Drive repair loops"]
  },
  {
    id: "leeway-asset-repair-worker",
    name: "Leeway Asset Repair Worker",
    description: "Repair loops for failed SVG, voxel, depth, and mask outputs under LVIS.",
    owner: "leeway-visual-orchestrator-agent",
    ownerObjectId: "LEEWAY_AGENT::LEEWAY_VISUAL_ORCHESTRATOR_AGENT",
    diagnosticLabel: "Asset Repair",
    route: "qwen2.5-coder:14b",
    routeId: "LEEWAY_LLM_ROUTE::QWEN2_5_CODER_14B",
    lane: "coding",
    reason: "Repair loops use the heavy code lane.",
    scope: "SVG, voxel, depth, and mask repair",
    forbiddenScope: "legacy fallback routes",
    standardsAuthorityId: "LEEWAY_STANDARDS::MODEL_HIVE::QWEN_FAMILY",
    receiptPolicy: "Record each repair attempt.",
    responsibilities: ["Repair failed candidates", "Retry weak outputs", "Reduce distortion before export"]
  },
  {
    id: "leeway-manifest-export-worker",
    name: "Leeway Manifest Export Worker",
    description: "Manifest generation, export packaging, and receipt-oriented asset output support.",
    owner: "leeway-visual-orchestrator-agent",
    ownerObjectId: "LEEWAY_AGENT::LEEWAY_VISUAL_ORCHESTRATOR_AGENT",
    diagnosticLabel: "Manifest Export",
    route: "qwen2.5-coder:1.5b",
    routeId: "LEEWAY_LLM_ROUTE::QWEN2_5_CODER_1_5B",
    lane: "coding",
    reason: "Packaging uses the lightweight coding lane.",
    scope: "Manifest generation and export packaging",
    forbiddenScope: "legacy cloud routes",
    standardsAuthorityId: "LEEWAY_STANDARDS::MODEL_HIVE::QWEN_FAMILY",
    receiptPolicy: "Record export package receipts.",
    responsibilities: ["Package outputs", "Generate manifest-ready exports", "Record packaging receipts"]
  },
  {
    id: "leeway-project-integration-worker",
    name: "Leeway Project Integration Worker",
    description: "Project insertion, registration, and governed integration of LVIS outputs into Agent Lee.",
    owner: "leeway-visual-orchestrator-agent",
    ownerObjectId: "LEEWAY_AGENT::LEEWAY_VISUAL_ORCHESTRATOR_AGENT",
    diagnosticLabel: "Project Integration",
    route: "deepseek-coder-v2:16b",
    routeId: "LEEWAY_LLM_ROUTE::DEEPSEEK_CODER_V2_16B",
    lane: "coding-review",
    reason: "Project integration needs the VS Code coding specialist lane.",
    scope: "Project registration and pending edits",
    forbiddenScope: "legacy route labels and cloud proxies",
    standardsAuthorityId: "LEEWAY_STANDARDS::MODEL_HIVE::DEEPSEEK_VSCODE_SPECIALIST",
    receiptPolicy: "Record integration receipts for every handoff.",
    responsibilities: ["Insert LVIS assets", "Keep changes reviewable", "Coordinate pending edits"]
  },
  {
    id: "leeway-visual-memory-worker",
    name: "Leeway Visual Memory Worker",
    description: "Stores presets, failure patterns, and run history to strengthen future LVIS executions.",
    owner: "leeway-visual-orchestrator-agent",
    ownerObjectId: "LEEWAY_AGENT::LEEWAY_VISUAL_ORCHESTRATOR_AGENT",
    diagnosticLabel: "Visual Memory",
    route: "qwen3-vl-embedding-local",
    routeId: "LEEWAY_LLM_ROUTE::QWEN3_VL_EMBEDDING",
    lane: "memory",
    reason: "Visual memory is hidden infrastructure only.",
    scope: "Preset memory, failure history, and recall support",
    forbiddenScope: "visible selector or worker authoring routes",
    standardsAuthorityId: "LEEWAY_STANDARDS::MODEL_HIVE::QWEN_FAMILY",
    receiptPolicy: "Record memory snapshot receipts.",
    responsibilities: ["Remember presets", "Track failures", "Suggest future strategies"]
  }
];
