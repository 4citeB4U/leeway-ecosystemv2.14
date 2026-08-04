import * as fs from "fs";
import * as path from "path";
import { describeFileError, writeJsonWithRetries } from "./file-ops";

const ROOT = path.join(process.env.USERPROFILE || "", ".leeway-vscode");
const CHAT_ROOT = path.join(ROOT, "memory", "chats");
const CONVERSATIONS_DIR = path.join(CHAT_ROOT, "conversations");
const INDEX_FILE = path.join(CHAT_ROOT, "index.json");
const MIGRATION_FILE = path.join(CHAT_ROOT, "migration-state.json");

export type ChatMessage = {
  role: "user" | "agent";
  text: string;
  timestamp: string;
};

export type ConversationMeta = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  workspaceRoot: string;
  active: boolean;
  recoveredFromLegacy?: boolean;
  source?: string;
};

type ConversationIndex = {
  activeConversationId: string;
  conversations: ConversationMeta[];
};

function ensureDirs() {
  try {
    fs.mkdirSync(CHAT_ROOT, { recursive: true });
    fs.mkdirSync(CONVERSATIONS_DIR, { recursive: true });
  } catch (err) {
    console.warn(`[Agent Lee] Failed to create directories:`, err);
  }
}

function readJson<T>(file: string, fallback: T): T {
  try {
    if (!fs.existsSync(file)) return fallback;
    return JSON.parse(fs.readFileSync(file, "utf8")) as T;
  } catch {
    return fallback;
  }
}

function writeJson(file: string, value: unknown) {
  try {
    writeJsonWithRetries(file, value);
  } catch (error) {
    console.warn(`[Agent Lee] Conversation persistence failed for ${path.basename(file)}: ${describeFileError(error)}`);
  }
}

function slug(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40) || "conversation";
}

function conversationFile(id: string) {
  return path.join(CONVERSATIONS_DIR, `${id}.json`);
}

function defaultTitle(workspaceRoot: string) {
  const base = workspaceRoot ? path.basename(workspaceRoot) : "Agent Lee Chat";
  return `${base} conversation`;
}

function deriveTitleFromText(text: string) {
  const cleaned = text
    .replace(/\s+/g, " ")
    .replace(/[`*_#>\[\]\(\)]+/g, "")
    .trim();

  if (!cleaned) return "";
  return cleaned.slice(0, 72);
}

function newConversationId(workspaceRoot: string) {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  return `${slug(path.basename(workspaceRoot || "agent-lee"))}-${stamp}`;
}

function loadIndex(): ConversationIndex {
  ensureDirs();
  return readJson<ConversationIndex>(INDEX_FILE, {
    activeConversationId: "",
    conversations: []
  });
}

function saveIndex(index: ConversationIndex) {
  ensureDirs();
  writeJson(INDEX_FILE, index);
}

function upsertConversation(index: ConversationIndex, meta: ConversationMeta) {
  const rest = index.conversations.filter((item) => item.id !== meta.id);
  index.conversations = [meta, ...rest]
    .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
    .slice(0, 200);
}

function setActive(index: ConversationIndex, id: string) {
  index.activeConversationId = id;
  index.conversations = index.conversations.map((item) => ({
    ...item,
    active: item.id === id
  }));
}

export function createConversation(workspaceRoot: string, title?: string) {
  const now = new Date().toISOString();
  const id = newConversationId(workspaceRoot);
  const meta: ConversationMeta = {
    id,
    title: title || defaultTitle(workspaceRoot),
    createdAt: now,
    updatedAt: now,
    workspaceRoot,
    active: true
  };

  writeJson(conversationFile(id), [] satisfies ChatMessage[]);

  const index = loadIndex();
  setActive(index, id);
  upsertConversation(index, meta);
  saveIndex(index);
  return meta;
}

export function getOrCreateActiveConversation(workspaceRoot: string) {
  migrateLegacyChats(workspaceRoot);
  const index = loadIndex();
  const active = index.conversations.find((item) => item.id === index.activeConversationId);
  const sameWorkspace = index.conversations.find((item) => item.workspaceRoot === workspaceRoot);

  if (active && (!workspaceRoot || active.workspaceRoot === workspaceRoot)) return active;

  if (sameWorkspace) {
    setActive(index, sameWorkspace.id);
    saveIndex(index);
    return { ...sameWorkspace, active: true };
  }

  return createConversation(workspaceRoot);
}

export function listConversations() {
  migrateLegacyChats("");
  const index = loadIndex();
  return index.conversations
    .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
    .slice(0, 50);
}

export function loadConversation(id: string): ChatMessage[] {
  return readJson<ChatMessage[]>(conversationFile(id), []);
}

export function setActiveConversation(id: string) {
  const index = loadIndex();
  if (!index.conversations.some((item) => item.id === id)) return;
  setActive(index, id);
  saveIndex(index);
}

export function appendConversationMessage(
  workspaceRoot: string,
  message: ChatMessage,
  options?: { conversationId?: string; titleHint?: string }
) {
  const index = loadIndex();
  let meta =
    (options?.conversationId && index.conversations.find((item) => item.id === options.conversationId)) ||
    index.conversations.find((item) => item.id === index.activeConversationId) ||
    index.conversations.find((item) => item.workspaceRoot === workspaceRoot);

  if (!meta) {
    meta = createConversation(workspaceRoot, options?.titleHint);
  }

  const messages = loadConversation(meta.id);
  messages.push(message);
  writeJson(conversationFile(meta.id), messages);

  const updatedMeta: ConversationMeta = {
    ...meta,
    title:
      message.role === "user" && message.text.trim()
        ? deriveTitleFromText(message.text) || meta.title || options?.titleHint || defaultTitle(workspaceRoot)
        : meta.title || options?.titleHint || defaultTitle(workspaceRoot),
    updatedAt: message.timestamp,
    workspaceRoot,
    active: true
  };

  setActive(index, meta.id);
  upsertConversation(index, updatedMeta);
  saveIndex(index);
  return updatedMeta;
}

export function startNewConversation(workspaceRoot: string) {
  return createConversation(workspaceRoot);
}

export function migrateLegacyChats(workspaceRoot: string) {
  try {
    ensureDirs();
    const migration = readJson<{ mergedLegacy: boolean }>(MIGRATION_FILE, { mergedLegacy: false });
    if (migration.mergedLegacy) return;

    if (!fs.existsSync(CHAT_ROOT)) return;

    const legacyFiles = fs.readdirSync(CHAT_ROOT)
      .filter((file) => file.endsWith(".json"))
      .filter((file) => file !== path.basename(INDEX_FILE))
      .map((file) => path.join(CHAT_ROOT, file))
      .filter((file) => !file.startsWith(CONVERSATIONS_DIR));

    if (!legacyFiles.length) {
      writeJson(MIGRATION_FILE, { mergedLegacy: true });
      return;
    }

    const recoveredMessages = legacyFiles
      .sort((a, b) => fs.statSync(a).mtimeMs - fs.statSync(b).mtimeMs)
      .flatMap((file) => readJson<ChatMessage[]>(file, []));

    if (!recoveredMessages.length) {
      writeJson(MIGRATION_FILE, { mergedLegacy: true });
      return;
    }

    const firstTime = recoveredMessages[0]?.timestamp || new Date().toISOString();
    const lastTime = recoveredMessages[recoveredMessages.length - 1]?.timestamp || firstTime;
    const id = `recovered-legacy-${new Date(firstTime).toISOString().replace(/[:.]/g, "-")}`;
    const meta: ConversationMeta = {
      id,
      title: "Recovered legacy conversation",
      createdAt: firstTime,
      updatedAt: lastTime,
      workspaceRoot,
      active: true,
      recoveredFromLegacy: true,
      source: "legacy-chat-files"
    };

    writeJson(conversationFile(id), recoveredMessages);
    const index = loadIndex();
    setActive(index, id);
    upsertConversation(index, meta);
    saveIndex(index);
    writeJson(MIGRATION_FILE, {
      mergedLegacy: true,
      recoveredConversationId: id,
      legacyFiles: legacyFiles.map((file) => path.basename(file))
    });
  } catch (err) {
    console.warn("[Agent Lee] migrateLegacyChats failed:", err);
  }
}
/*
LEEWAY_HEADER - DO NOT REMOVE

TAG: DATA.LOCAL.CONVERSATION.STORE
REGION: 💾 DATA
PURPOSE: Local conversation storage for Agent Lee memory and chat continuity.
DISCOVERY_PIPELINE:
  Voice → Intent → Location → Vertical → Ranking → Render
*/
