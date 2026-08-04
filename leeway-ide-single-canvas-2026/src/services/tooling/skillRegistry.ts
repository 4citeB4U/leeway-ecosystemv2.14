export interface SkillRegistryEntry {
  id: string;
  name: string;
  source: string;
  purpose: string;
  enabled: boolean;
}

export function getSkillRegistrySnapshot(): SkillRegistryEntry[] {
  return [
    { id: "agent-browser", name: "agent-browser", source: "local", purpose: "Browser automation CLI", enabled: true },
    { id: "cognee", name: "cognee", source: "topoteretes/cognee", purpose: "Knowledge graph / persistent memory", enabled: true },
    { id: "cross-review", name: "cross-review", source: "local", purpose: "Multi-model code review", enabled: true },
    { id: "frontend-design", name: "frontend-design", source: "local", purpose: "HTML/UI mockup generation", enabled: true },
    { id: "graphify", name: "graphify", source: "safishamsi/graphify", purpose: "Codebase dependency graph", enabled: true },
    { id: "init", name: "init", source: "local", purpose: "Repo initialization / AGENTS.md", enabled: true },
    { id: "loop-library", name: "loop-library", source: "Forward-Future/loopy", purpose: "Loop library compatibility alias", enabled: true },
    { id: "loopy", name: "loopy", source: "Forward-Future/loopy", purpose: "Autonomous agent loops", enabled: true },
    { id: "microsoft-foundry", name: "microsoft-foundry", source: "local", purpose: "Azure AI Foundry deployment", enabled: true },
    { id: "plan", name: "plan", source: "local", purpose: "Task breakdown / planning", enabled: true },
    { id: "research", name: "research", source: "local", purpose: "Codebase exploration", enabled: true },
    { id: "skill-creator", name: "skill-creator", source: "local", purpose: "Create/edit/optimize skills", enabled: true },
    { id: "understand", name: "understand", source: "Egonex-AI/Understand-Anything", purpose: "Code comprehension", enabled: true },
    { id: "understand-chat", name: "understand-chat", source: "Egonex-AI", purpose: "Chat-based understanding", enabled: true },
    { id: "understand-dashboard", name: "understand-dashboard", source: "Egonex-AI", purpose: "Understanding dashboard", enabled: true },
    { id: "understand-diff", name: "understand-diff", source: "Egonex-AI", purpose: "Diff analysis", enabled: true },
    { id: "understand-domain", name: "understand-domain", source: "Egonex-AI", purpose: "Domain modeling", enabled: true },
    { id: "understand-explain", name: "understand-explain", source: "Egonex-AI", purpose: "Explanation generation", enabled: true },
    { id: "understand-figma", name: "understand-figma", source: "Egonex-AI", purpose: "Figma integration", enabled: true },
    { id: "understand-knowledge", name: "understand-knowledge", source: "Egonex-AI", purpose: "Knowledge extraction", enabled: true },
    { id: "understand-onboard", name: "understand-onboard", source: "Egonex-AI", purpose: "Onboarding assistance", enabled: true },
    { id: "novelist-recursive", name: "novelist-recursive", source: "agents-mcp", purpose: "Recursive long-form writing and outline expansion", enabled: true },
    { id: "character-consistency", name: "character-consistency", source: "agents-mcp", purpose: "Consistent visual identity for books and storyboards", enabled: true },
    { id: "scholar-storm", name: "scholar-storm", source: "agents-mcp", purpose: "Scholarly research synthesis and handbook drafting", enabled: true },
    { id: "context-expander", name: "context-expander", source: "agents-mcp", purpose: "Sliding-window memory for huge manuscripts", enabled: true },
    { id: "cinematic-video", name: "cinematic-video", source: "agents-mcp", purpose: "Image-to-video animation for illustrated books", enabled: true },
    { id: "universal-publisher", name: "universal-publisher", source: "agents-mcp", purpose: "EPUB/PDF/interactive reader packaging", enabled: true },
    { id: "markmap-mcp", name: "markmap-mcp", source: "agents-mcp", purpose: "Interactive 3D mind map navigation", enabled: true },
    { id: "zen-comprehensive-review", name: "zen-comprehensive-review", source: "local", purpose: "Multi-model code review", enabled: true },
    { id: "zen-review", name: "zen-review", source: "local", purpose: "Expert code review", enabled: true },
  ];
}
