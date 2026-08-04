export const AGENT_LEE_APPLICATION_CONTROL_NODE_ID = "agent-lee-application-control";

export type AgentLeeApplicationIntent = {
  command:
    | "agentLee.ide.openStudio"
    | "agentLee.ide.openPalette"
    | "agentLee.ide.openLiveWallet"
    | "agentLee.ide.openContentStudio"
    | "agentLee.ide.openTerminalConsole"
    | "agentLee.ide.openSettings"
    | "agentLee.ide.addNode"
    | "agentLee.ide.addNodeGroup"
    | "agentLee.ide.placeWalletItem"
    | "agentLee.ide.connectSequential"
    | "agentLee.ide.expandAllNodes"
    | "agentLee.ide.collapseAllNodes"
    | "agentLee.ide.createCommandPlan";
  studioId?: string;
  nodeType?: string;
  groupId?: string;
  prompt?: string;
};

export type AgentLeeApplicationClassification = {
  handled: boolean;
  summary: string;
  intents: AgentLeeApplicationIntent[];
};

const STUDIO_COMMANDS: Record<string, AgentLeeApplicationIntent> = {
  openstudio: { command: "agentLee.ide.openStudio", studioId: "code" },
  openpalette: { command: "agentLee.ide.openPalette", studioId: "code" },
  openwallet: { command: "agentLee.ide.openLiveWallet" },
  opencontent: { command: "agentLee.ide.openContentStudio" },
  openterminal: { command: "agentLee.ide.openTerminalConsole" },
  opensettings: { command: "agentLee.ide.openSettings" },
  addnode: { command: "agentLee.ide.addNode" },
  addgroup: { command: "agentLee.ide.addNodeGroup" },
  placewallet: { command: "agentLee.ide.placeWalletItem" },
  connect: { command: "agentLee.ide.connectSequential" },
  expand: { command: "agentLee.ide.expandAllNodes" },
  collapse: { command: "agentLee.ide.collapseAllNodes" },
  plan: { command: "agentLee.ide.createCommandPlan" },
};

function normalizePrompt(prompt: string) {
  return prompt.toLowerCase().trim();
}

export function classifyAgentLeeApplicationIntent(prompt: string): AgentLeeApplicationClassification {
  const normalized = normalizePrompt(prompt);

  if (!normalized) {
    return { handled: false, summary: "No Agent Lee application intent was provided.", intents: [] };
  }

  const keywords = [
    "open studio",
    "open palette",
    "open wallet",
    "open content",
    "open terminal",
    "open settings",
    "add node",
    "add group",
    "place wallet",
    "connect",
    "expand",
    "collapse",
    "plan",
  ];

  const matched = keywords.find((keyword) => normalized.includes(keyword));

  if (!matched) {
    return { handled: false, summary: "No supported Agent Lee application intent matched the request.", intents: [] };
  }

  const intent = (() => {
    if (normalized.includes("open studio")) return STUDIO_COMMANDS.openstudio;
    if (normalized.includes("open palette")) return STUDIO_COMMANDS.openpalette;
    if (normalized.includes("open wallet")) return STUDIO_COMMANDS.openwallet;
    if (normalized.includes("open content")) return STUDIO_COMMANDS.opencontent;
    if (normalized.includes("open terminal")) return STUDIO_COMMANDS.openterminal;
    if (normalized.includes("open settings")) return STUDIO_COMMANDS.opensettings;
    if (normalized.includes("add node")) return { ...STUDIO_COMMANDS.addnode, nodeType: "code.editor" };
    if (normalized.includes("add group")) return STUDIO_COMMANDS.addgroup;
    if (normalized.includes("place wallet")) return STUDIO_COMMANDS.placewallet;
    if (normalized.includes("connect")) return STUDIO_COMMANDS.connect;
    if (normalized.includes("expand")) return STUDIO_COMMANDS.expand;
    if (normalized.includes("collapse")) return STUDIO_COMMANDS.collapse;
    return { ...STUDIO_COMMANDS.plan, prompt };
  })();

  return {
    handled: true,
    summary: `Classified Agent Lee application intent: ${matched}`,
    intents: [intent],
  };
}
