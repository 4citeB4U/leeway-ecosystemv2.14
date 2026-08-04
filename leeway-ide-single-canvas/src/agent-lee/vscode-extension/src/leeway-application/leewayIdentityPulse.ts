/*
LEEWAY_HEADER - DO NOT REMOVE

REGION: CORE
TAG: CORE.GOVERNANCE.APPLICATION.IDENTITY_PULSE
PURPOSE: Canonical LeeWay Identity Pulse taxonomy, strict surfaces, and registry settings for origin, trust, lineage, and authority attestation.
DISCOVERY_PIPELINE: Voice -> Intent -> Location -> Vertical -> Ranking -> Render
*/

export type LeeWayOriginStatus =
  | "LEEWAY_BORN"
  | "LEEWAY_DERIVED"
  | "HUMAN_IMPORTED"
  | "AGENT_IMPORTED"
  | "LLM_IMPORTED"
  | "TOOL_GENERATED"
  | "DOWNLOADED"
  | "UPLOADED"
  | "RESTORED"
  | "QUARANTINED"
  | "UNKNOWN_ORIGIN";

export type LeeWayPulseTrustStatus = "GOVERNED" | "UNTRUSTED" | "QUARANTINED" | "AUDIT_REQUIRED";
export type LeeWayPulseVerificationStatus = "VERIFIED" | "AUDIT_ONLY" | "PENDING_REVIEW" | "QUARANTINED";

export interface LeeWayIdentityPulseControlDefinition {
  domId: string;
  leewayId: string;
  label: string;
  strict: boolean;
}

export interface LeeWayIdentityPulseExtraFileDefinition {
  path: string;
  objectId: string;
  classification: string;
  originStatus: LeeWayOriginStatus;
  authority: string;
  allowedUse: string[];
  graphNodeId?: string;
  strict: boolean;
}

export const LEEWAY_IDENTITY_PULSE_VERSION = "2026-05-16.identity-pulse-pass-1";
export const LEEWAY_IDENTITY_PULSE_MODE = "PASS1_AUDIT_WITH_STRICT_CORE";
export const LEEWAY_IDENTITY_PULSE_REGISTRY_PATH = "agent-lee/governance/identity/leeway-identity-pulse.json";

export const LEEWAY_IDENTITY_PULSE_ORIGIN_STATUSES: LeeWayOriginStatus[] = [
  "LEEWAY_BORN",
  "LEEWAY_DERIVED",
  "HUMAN_IMPORTED",
  "AGENT_IMPORTED",
  "LLM_IMPORTED",
  "TOOL_GENERATED",
  "DOWNLOADED",
  "UPLOADED",
  "RESTORED",
  "QUARANTINED",
  "UNKNOWN_ORIGIN"
];

export const LEEWAY_IDENTITY_PULSE_STRICT_CONTROLS: LeeWayIdentityPulseControlDefinition[] = [
  { domId: "historyBtn", leewayId: "LEEWAY_OBJECT::CONTROL::HISTORY_BUTTON", label: "History", strict: true },
  { domId: "newChatBtn", leewayId: "LEEWAY_OBJECT::CONTROL::NEW_CHAT_BUTTON", label: "New Chat", strict: true },
  { domId: "settingsBtn", leewayId: "LEEWAY_OBJECT::CONTROL::SETTINGS_BUTTON", label: "Settings", strict: true },
  { domId: "topStandardsBtn", leewayId: "LEEWAY_OBJECT::CONTROL::TOP_STANDARDS_BUTTON", label: "Top Standards", strict: true },
  { domId: "closeHistoryBtn", leewayId: "LEEWAY_OBJECT::CONTROL::CLOSE_HISTORY_BUTTON", label: "Close History", strict: true },
  { domId: "attachFilesBtn", leewayId: "LEEWAY_OBJECT::CONTROL::ATTACH_FILES_BUTTON", label: "Attach Files", strict: true },
  { domId: "micBtn", leewayId: "LEEWAY_OBJECT::CONTROL::MIC_BUTTON", label: "Mic", strict: true },
  { domId: "voiceToggleBtn", leewayId: "LEEWAY_OBJECT::CONTROL::VOICE_TOGGLE_BUTTON", label: "Voice Toggle", strict: true },
  { domId: "voiceEnabledBtn", leewayId: "LEEWAY_APP::UI::VOICE_CONTROL::VOICE_ENABLED", label: "Voice Enabled", strict: true },
  { domId: "voiceMuteBtn", leewayId: "LEEWAY_APP::UI::VOICE_CONTROL::MUTE_TOGGLE", label: "Mute Toggle", strict: true },
  { domId: "voiceStopBtn", leewayId: "LEEWAY_APP::UI::VOICE_CONTROL::STOP_SPEAKING", label: "Stop Speaking", strict: true },
  { domId: "voiceTestBtn", leewayId: "LEEWAY_APP::UI::VOICE_CONTROL::TEST_VOICE", label: "Test Voice", strict: true },
  { domId: "voiceAutoSpeakToggle", leewayId: "LEEWAY_APP::UI::VOICE_CONTROL::AUTO_SPEAK_RESPONSES", label: "Auto Speak Responses", strict: true },
  { domId: "voiceRate", leewayId: "LEEWAY_APP::UI::VOICE_CONTROL::SPEECH_RATE", label: "Speech Rate", strict: true },
  { domId: "voiceVolume", leewayId: "LEEWAY_APP::UI::VOICE_CONTROL::SPEECH_VOLUME", label: "Speech Volume", strict: true },
  { domId: "sendBtn", leewayId: "LEEWAY_OBJECT::CONTROL::SEND_BUTTON", label: "Send", strict: true }
];

export const LEEWAY_IDENTITY_PULSE_STRICT_STATE_KEYS = [
  "agentEnvironment",
  "agentConfigs",
  "appLanguage",
  "approval",
  "autoRunStagedPlans",
  "autoUpdateEnabled",
  "preferRightSideSurface",
  "browserShowCursor",
  "browserSlowMoMs",
  "browserVisualMode",
  "codeReviewBehavior",
  "customAgents",
  "customMcpServers",
  "customWorkers",
  "enabledAgents",
  "enabledMcpServers",
  "enabledPlugins",
  "enabledWorkers",
  "followupBehavior",
  "inferenceSpeed",
  "leewayVoiceRuntimeKind",
  "mcpServerConfigs",
  "onboardingComplete",
  "primaryModel",
  "requireCtrlEnter",
  "voice",
  "voiceAutoSpeak",
  "voiceCurrentStatus",
  "voiceEnabled",
  "voiceInterruptOnUserSpeech",
  "voiceLastError",
  "voiceMuted",
  "voicePitch",
  "voiceRate",
  "voiceStyle",
  "voiceTone",
  "voiceVolume",
  "web",
  "workMode",
  "workerConfigs"
] as const;

export const LEEWAY_IDENTITY_PULSE_STRICT_COMMANDS = [
  "agentLeeUiReady",
  "leewayVoiceMuteToggled",
  "leewayVoiceSettingsChanged",
  "leewayVoiceStopRequested",
  "leewayVoiceTestRequested",
  "newConversation",
  "pickAttachments",
  "sendMessage",
  "setState"
] as const;

export const LEEWAY_IDENTITY_PULSE_EXTRA_FILES: LeeWayIdentityPulseExtraFileDefinition[] = [
  {
    path: "agent-lee/governance/law/leeway-identity-pulse-law.md",
    objectId: "LEEWAY_OBJECT::FILE::IDENTITY_PULSE_LAW",
    classification: "GOVERNANCE_LAW",
    originStatus: "LEEWAY_BORN",
    authority: "LEEWAY_GOVERNANCE",
    allowedUse: ["law", "verification"],
    graphNodeId: "LEEWAY_APP::GOVERNANCE::IDENTITY_PULSE::ROOT",
    strict: true
  },
  {
    path: ".codex/skills/leeway-application-standards/SKILL.md",
    objectId: "LEEWAY_OBJECT::FILE::IDENTITY_PULSE_SKILL_OVERLAY",
    classification: "GOVERNANCE_SKILL",
    originStatus: "LEEWAY_DERIVED",
    authority: "LEEWAY_GOVERNANCE",
    allowedUse: ["skill", "instruction"],
    graphNodeId: "LEEWAY_APP::GOVERNANCE::IDENTITY_PULSE::ORIGIN_CLASSIFIER",
    strict: true
  },
  {
    path: ".codex/skills/leeway-application-standards/references/leeway-identity-pulse-law.md",
    objectId: "LEEWAY_OBJECT::FILE::IDENTITY_PULSE_SKILL_REFERENCE",
    classification: "GOVERNANCE_REFERENCE",
    originStatus: "LEEWAY_DERIVED",
    authority: "LEEWAY_GOVERNANCE",
    allowedUse: ["reference", "instruction"],
    graphNodeId: "LEEWAY_APP::GOVERNANCE::IDENTITY_PULSE::LEEWAY_BORN_WATERMARK",
    strict: true
  },
  {
    path: "agent-lee/vscode-extension/README.md",
    objectId: "LEEWAY_OBJECT::FILE::VSCODE_EXTENSION_README",
    classification: "DOC_ACTIVE",
    originStatus: "LEEWAY_BORN",
    authority: "LEEWAY_DOCS",
    allowedUse: ["documentation", "package"],
    graphNodeId: "LEEWAY_APP::DOCS::README::ROOT",
    strict: true
  },
  {
    path: "agent-lee/vscode-extension/media/leeway-standards-button.png",
    objectId: "LEEWAY_OBJECT::FILE::README_LEEWAY_STANDARDS_BUTTON",
    classification: "DOC_ASSET",
    originStatus: "LEEWAY_BORN",
    authority: "LEEWAY_DOCS",
    allowedUse: ["documentation", "ui_branding", "package"],
    graphNodeId: "LEEWAY_APP::DOCS::README_ASSETS::MEDIA",
    strict: true
  },
  {
    path: "agent-lee/vscode-extension/media/leeway-standards-logo.png",
    objectId: "LEEWAY_OBJECT::FILE::README_LEEWAY_STANDARDS_LOGO",
    classification: "DOC_ASSET",
    originStatus: "LEEWAY_BORN",
    authority: "LEEWAY_DOCS",
    allowedUse: ["documentation", "ui_branding", "package"],
    graphNodeId: "LEEWAY_APP::DOCS::README_ASSETS::MEDIA",
    strict: true
  },
  {
    path: "agent-lee/vscode-extension/media/readme-header.png",
    objectId: "LEEWAY_OBJECT::FILE::README_HEADER_IMAGE",
    classification: "DOC_ASSET",
    originStatus: "LEEWAY_BORN",
    authority: "LEEWAY_DOCS",
    allowedUse: ["documentation", "package"],
    graphNodeId: "LEEWAY_APP::DOCS::README_ASSETS::MEDIA",
    strict: true
  },
  {
    path: "agent-lee/vscode-extension/media/readme-system-flow.png",
    objectId: "LEEWAY_OBJECT::FILE::README_SYSTEM_FLOW_IMAGE",
    classification: "DOC_ASSET",
    originStatus: "LEEWAY_BORN",
    authority: "LEEWAY_DOCS",
    allowedUse: ["documentation", "package"],
    graphNodeId: "LEEWAY_APP::DOCS::README_ASSETS::MEDIA",
    strict: true
  },
  {
    path: "agent-lee/vscode-extension/media/leeway-logo.svg",
    objectId: "LEEWAY_OBJECT::FILE::README_LEEWAY_LOGO",
    classification: "DOC_ASSET",
    originStatus: "LEEWAY_BORN",
    authority: "LEEWAY_DOCS",
    allowedUse: ["documentation", "ui_branding", "package"],
    graphNodeId: "LEEWAY_APP::DOCS::README_ASSETS::MEDIA",
    strict: true
  },
  {
    path: "agent-lee/vscode-extension/media/agent-lee-activitybar-icon.svg",
    objectId: "LEEWAY_OBJECT::FILE::ACTIVITYBAR_ICON",
    classification: "DOC_ASSET",
    originStatus: "LEEWAY_BORN",
    authority: "LEEWAY_DOCS",
    allowedUse: ["documentation", "ui_branding", "package"],
    graphNodeId: "LEEWAY_APP::UI::ASSET::ACTIVITYBAR_ICON",
    strict: true
  },
  {
    path: "agent-lee/vscode-extension/media/leeway-activity.svg",
    objectId: "LEEWAY_OBJECT::FILE::ACTIVITYBAR_ICON_DERIVATIVE",
    classification: "DOC_ASSET",
    originStatus: "LEEWAY_DERIVED",
    authority: "LEEWAY_DOCS",
    allowedUse: ["ui_branding", "package"],
    graphNodeId: "LEEWAY_APP::UI::ASSET::ACTIVITYBAR_ICON",
    strict: true
  },
  {
    path: "agent-lee/vscode-extension/media/agent-lee-chat-avatar.svg",
    objectId: "LEEWAY_OBJECT::FILE::CHAT_AVATAR_ASSET",
    classification: "DOC_ASSET",
    originStatus: "LEEWAY_DERIVED",
    authority: "LEEWAY_DOCS",
    allowedUse: ["ui_branding", "package"],
    graphNodeId: "LEEWAY_APP::UI::ASSET::CHAT_AVATAR",
    strict: true
  },
  {
    path: "agent-lee/governance/law/leeway-extension-runtime-truth-law.md",
    objectId: "LEEWAY_OBJECT::FILE::LAW_0020_EXTENSION_RUNTIME_TRUTH",
    classification: "GOVERNANCE_LAW",
    originStatus: "LEEWAY_BORN",
    authority: "LEEWAY_GOVERNANCE",
    allowedUse: ["law", "runtime_truth", "verification"],
    graphNodeId: "LEEWAY_APP::GOVERNANCE::IDENTITY_PULSE::ROOT",
    strict: true
  },
  {
    path: "agent-lee/voice/leeway-live-voice-manifest.json",
    objectId: "LEEWAY_OBJECT::FILE::LIVE_VOICE_ROUTE_MANIFEST",
    classification: "ACTIVE_RUNTIME_CONFIG",
    originStatus: "LEEWAY_BORN",
    authority: "LEEWAY_VOICE",
    allowedUse: ["voice_runtime", "route_selection", "verification"],
    graphNodeId: "LEEWAY_APP::VOICE::ROUTE_MANAGER::ROOT",
    strict: true
  },
  {
    path: "agent-lee/vscode-extension/src/core/leeway-live-voice-route-manager.ts",
    objectId: "LEEWAY_OBJECT::FILE::LIVE_VOICE_ROUTE_MANAGER",
    classification: "ACTIVE_RUNTIME",
    originStatus: "LEEWAY_BORN",
    authority: "LEEWAY_VOICE",
    allowedUse: ["voice_runtime", "route_selection", "verification"],
    graphNodeId: "LEEWAY_APP::VOICE::ROUTE_MANAGER::ROOT",
    strict: true
  },
  {
    path: "agent-lee/vscode-extension/scripts/Invoke-LeeWayApplicationIntegrityGate.ps1",
    objectId: "LEEWAY_OBJECT::FILE::LIVE_VOICE_ROUTE_HARNESS",
    classification: "TEST_HARNESS",
    originStatus: "LEEWAY_BORN",
    authority: "LEEWAY_GOVERNANCE",
    allowedUse: ["verification", "runtime_truth"],
    graphNodeId: "LEEWAY_APP::VOICE::RUNTIME_TRUTH::LIVE_STREAM",
    strict: true
  }
];
