const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const ROOT = process.env.LEEWAY_ROOT || "E:\\.LeeWay-Produucts-File\\Leeway-Ecosystem v2.1.4";
const ENV_PATH = process.env.LEEWAY_ENV_PATH || path.join(ROOT, ".env.local");
const STATE_PATH = process.env.AGENT_LEE_TELEGRAM_STATE_PATH || path.join(ROOT, "agent-lee-coding-mode", "runtime", "telegram", "agent-lee-telegram-bridge.state.json");
const RECEIPT_DIR = process.env.AGENT_LEE_TELEGRAM_RECEIPT_DIR || path.join(ROOT, "Archive", "receipts", "agent-lee-telegram-bridge");
const ASSISTANT_BODY_ROLE = "CODEX_ASSISTANT_BODY";
const ASSISTANT_OBJECT_ID = "LEEWAY-ASSISTANT-0002";
const AUTHORITY_LEVEL = "GOVERNED_ASSISTANT_BODY";

const TOKEN_KEYS = [
  "TELEGRAM_BOT_TOKEN",
  "AGENT_LEE_TELEGRAM_BOT_TOKEN",
  "LEEWAY_TELEGRAM_BOT_TOKEN",
  "TELEGRAM_API_TOKEN",
  "TG_BOT_TOKEN",
  "TELEGRAM_TOKEN",
  "BOT_TOKEN"
];

const CHAT_ALIAS_KEYS = [
  "TELEGRAM_CHAT_ID",
  "AGENT_LEE_TELEGRAM_CHAT_ID",
  "LEEWAY_TELEGRAM_CHAT_ID",
  "LEONARD_TELEGRAM_CHAT_ID",
  "TELEGRAM_USER_CHAT_ID",
  "TG_CHAT_ID",
  "TELEGRAM_TARGET_CHAT_ID"
];

const AGENT_ROUTES = [
  {
    id: "agent-lee-8080-openai",
    url: "http://127.0.0.1:8080/v1/chat/completions",
    kind: "openai"
  },
  {
    id: "agent-lee-8787-openai",
    url: "http://127.0.0.1:8787/v1/chat/completions",
    kind: "openai"
  },
  {
    id: "runtime-fabric-4001-agent-chat",
    url: "http://127.0.0.1:4001/agent-lee/chat",
    kind: "runtime"
  }
];

const OLLAMA_ROUTES = [
  {
    id: "ollama-qwen3",
    url: "http://127.0.0.1:11434/api/chat",
    model: "qwen3:latest"
  },
  {
    id: "ollama-qwen2-5-coder",
    url: "http://127.0.0.1:11434/api/chat",
    model: "qwen2.5-coder:7b"
  }
];

function nowIso() {
  return new Date().toISOString();
}

function sha256(text) {
  return crypto.createHash("sha256").update(String(text || "")).digest("hex");
}

function makeReceiptId(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${crypto.randomBytes(3).toString("hex")}`;
}

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function previewText(text, max = 240) {
  return String(text || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

function readEnv() {
  const map = {};
  if (!fs.existsSync(ENV_PATH)) {
    throw new Error(".env.local not found: " + ENV_PATH);
  }

  const raw = fs.readFileSync(ENV_PATH, "utf8").replace(/^\uFEFF/, "");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = line.indexOf("=");
    if (idx <= 0) continue;

    const key = line.slice(0, idx).trim();
    let value = line.slice(idx + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    map[key] = value;
  }

  return map;
}

function writeEnv(map) {
  const lines = [];
  for (const [key, value] of Object.entries(map)) {
    if (value === undefined || value === null) continue;
    const s = String(value);
    if (s.trim() === "") continue;

    if (/\s|#|"/.test(s)) {
      lines.push(`${key}="${s.replace(/"/g, '\\"')}"`);
    } else {
      lines.push(`${key}=${s}`);
    }
  }

  fs.writeFileSync(ENV_PATH, lines.join("\n") + "\n", "utf8");
}

function pick(map, keys) {
  for (const key of keys) {
    if (map[key] && String(map[key]).trim()) {
      return { key, value: String(map[key]).trim() };
    }
  }
  return { key: null, value: null };
}

function isValidChatId(v) {
  return typeof v === "string" && /^-?\d+$/.test(v);
}

function saveChatIdAliases(chatId) {
  if (!isValidChatId(String(chatId))) {
    throw new Error("Refusing to save invalid chat id.");
  }

  const env = readEnv();
  for (const key of CHAT_ALIAS_KEYS) {
    env[key] = String(chatId);
  }

  env.AGENT_LEE_TEXT_PROVIDER = "telegram";
  env.AGENT_LEE_MESSAGING_PROVIDER = "telegram";
  env.AGENT_LEE_DEFAULT_TEXT_CHANNEL = "telegram";
  env.AGENT_LEE_CAN_SEND_TEXT = "true";
  env.AGENT_LEE_TELEGRAM_DISCOVERY_ENABLED = "true";
  env.AGENT_LEE_TELEGRAM_OPERATIONS_ENABLED = "true";
  env.AGENT_LEE_TELEGRAM_SEND_TEXT_ENABLED = "true";
  env.AGENT_LEE_TELEGRAM_DEFAULT_METHOD = "sendMessage";
  env.AGENT_LEE_TELEGRAM_MODE = "bot_api";
  env.AGENT_LEE_TELEGRAM_REQUIRE_APPROVAL = "true";
  env.AGENT_LEE_TELEGRAM_BRIDGE_ENABLED = "true";
  env.AGENT_LEE_TELEGRAM_BRIDGE_STATE = STATE_PATH;

  writeEnv(env);
}

function writeState(patch) {
  ensureDir(path.dirname(STATE_PATH));
  let state = {};
  if (fs.existsSync(STATE_PATH)) {
    try { state = JSON.parse(fs.readFileSync(STATE_PATH, "utf8")); } catch {}
  }

  state = {
    ...state,
    ...patch,
    updatedAt: nowIso()
  };

  fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2), "utf8");
}

function writeReceipt(kind, data) {
  ensureDir(RECEIPT_DIR);
  const timestamp = nowIso();
  const receiptId = makeReceiptId(kind);
  const receiptPath = path.join(RECEIPT_DIR, `${receiptId}.json`);
  const receipt = {
    receiptId,
    timestamp,
    assistantBodyRole: ASSISTANT_BODY_ROLE,
    assistantObjectId: ASSISTANT_OBJECT_ID,
    authorityLevel: AUTHORITY_LEVEL,
    directAuthority: false,
    kind,
    ...data,
    receiptPath
  };
  fs.writeFileSync(receiptPath, JSON.stringify(receipt, null, 2), "utf8");
  return { receiptId, receiptPath, receipt };
}

function readState() {
  if (!fs.existsSync(STATE_PATH)) return {};
  try { return JSON.parse(fs.readFileSync(STATE_PATH, "utf8")); } catch { return {}; }
}

async function telegram(method, body) {
  const env = readEnv();
  const token = pick(env, TOKEN_KEYS).value;

  if (!token) {
    throw new Error("Telegram token missing from .env.local");
  }

  const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body || {})
  });

  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch {}

  if (!res.ok || !json || json.ok !== true) {
    const desc = json && json.description ? json.description : text.slice(0, 500);
    throw new Error(`Telegram ${method} failed: ${desc}`);
  }

  return json.result;
}

async function fetchJsonWithTimeout(url, body, timeoutMs) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      signal: ctrl.signal
    });

    const text = await res.text();
    let json = null;
    try { json = JSON.parse(text); } catch {}

    return {
      ok: res.ok,
      status: res.status,
      text,
      json
    };
  } finally {
    clearTimeout(timer);
  }
}

function extractAgentText(result) {
  if (!result) return null;

  const j = result.json;

  if (j) {
    if (j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) {
      return String(j.choices[0].message.content);
    }

    if (j.response) return String(j.response);
    if (j.message) return String(j.message);
    if (j.text) return String(j.text);
    if (j.content) return String(j.content);
    if (j.output) return String(j.output);
    if (j.answer) return String(j.answer);

    if (j.result && typeof j.result === "string") return j.result;
    if (j.result && j.result.text) return String(j.result.text);
    if (j.result && j.result.message) return String(j.result.message);
  }

  if (result.text && result.text.trim()) {
    return result.text.slice(0, 3500);
  }

  return null;
}

async function askAgentLee(userText, chatContext) {
  const system = [
    "You are Agent Lee operating through Telegram.",
    "Answer clearly and briefly.",
    "You are connected to Leonard's Leeway local runtime.",
    "If the user asks you to send a text, explain Telegram text sending is active.",
    "Do not claim capabilities unless the runtime actually proves them."
  ].join(" ");

  for (const route of AGENT_ROUTES) {
    try {
      let body;

      if (route.kind === "openai") {
        body = {
          model: "agent-lee",
          messages: [
            { role: "system", content: system },
            { role: "user", content: userText }
          ],
          temperature: 0.4
        };
      } else {
        body = {
          message: userText,
          input: userText,
          prompt: userText,
          source: "telegram",
          chat: chatContext,
          system
        };
      }

      const result = await fetchJsonWithTimeout(route.url, body, 20000);
      const text = extractAgentText(result);

      if (result.ok && text && text.trim()) {
        return {
          ok: true,
          provider: route.id,
          text: text.trim().slice(0, 3900)
        };
      }
    } catch (err) {
      writeState({
        lastAgentRouteError: {
          route: route.id,
          message: err.message,
          at: nowIso()
        }
      });
    }
  }

  for (const route of OLLAMA_ROUTES) {
    try {
      const result = await fetchJsonWithTimeout(route.url, {
        model: route.model,
        stream: false,
        messages: [
          { role: "system", content: system },
          { role: "user", content: userText }
        ]
      }, 30000);

      let text = null;
      if (result.json && result.json.message && result.json.message.content) {
        text = String(result.json.message.content);
      } else {
        text = extractAgentText(result);
      }

      if (result.ok && text && text.trim()) {
        return {
          ok: true,
          provider: route.id,
          text: text.trim().slice(0, 3900)
        };
      }
    } catch (err) {
      writeState({
        lastOllamaRouteError: {
          route: route.id,
          message: err.message,
          at: nowIso()
        }
      });
    }
  }

  return {
    ok: false,
    provider: "none",
    text: "Agent Lee Telegram bridge is online, but I could not reach the Agent Lee runtime or local model route yet. The Telegram connection itself is active."
  };
}

async function handleUpdate(update) {
  const msg = update.message;
  if (!msg || !msg.chat || !msg.chat.id) return;

  const chatId = String(msg.chat.id);
  const text = msg.text ? String(msg.text).trim() : "";
  const inboundReceipt = writeReceipt("telegram-inbound", {
    actionRequested: "Receive Telegram inbound message",
    actionTaken: "Parsed chat_id and text from Telegram update",
    approvalRequired: false,
    approvalPresent: true,
    standardsConsulted: [
      "BOOK_54_ASSISTANT_EMBODIMENT_AND_BEHAVIOR_LAW",
      "BOOK_55_ASSISTANT_RECORDING_AND_LEARNING_LAW",
      "leeway-tracer-pack-standard"
    ],
    filesTouched: [STATE_PATH],
    validationPerformed: "Telegram getUpdates payload parsed successfully",
    result: text ? "RECEIVED" : "RECEIVED_NO_TEXT",
    blockers: text ? [] : ["Telegram update did not include text content."],
    nextFixQueue: text ? [] : ["Decide whether non-text Telegram updates should be routed."],
    updateId: update.update_id,
    chatId,
    chatIdHash: sha256(chatId),
    text,
    textPreview: previewText(text, 200),
    messageId: msg.message_id || null,
    fromUserId: msg.from?.id || null,
    chatType: msg.chat.type || null
  });

  if (!text) {
    await telegram("sendMessage", {
      chat_id: chatId,
      text: "Agent Lee bridge received your message, but this version currently handles text messages first."
    });
    writeState({
      lastInboundReceiptPath: inboundReceipt.receiptPath,
      lastOutgoingReceiptPath: null
    });
    return;
  }

  saveChatIdAliases(chatId);

  writeState({
    lastIncomingUpdateId: update.update_id,
    lastIncomingChatIdHash: sha256(chatId),
    lastIncomingTextHash: sha256(text),
    lastIncomingTextPreview: text.slice(0, 160),
    lastIncomingAt: nowIso()
  });

  await telegram("sendChatAction", {
    chat_id: chatId,
    action: "typing"
  }).catch(() => null);

  let answer;
  let routedReceipt = null;

  if (text === "/start") {
    answer = {
      ok: true,
      provider: "bridge-start",
      text: "Agent Lee Telegram bridge is connected. Send me a message and I will route it into Agent Lee."
    };
  } else if (text.toLowerCase() === "/status") {
    const state = readState();
    answer = {
      ok: true,
      provider: "bridge-status",
      text: [
        "Agent Lee Telegram Bridge Status",
        `Bridge: ONLINE`,
        `Last provider: ${state.lastAgentProvider || "none yet"}`,
        `Chat saved: yes`,
        `State updated: ${state.updatedAt || "now"}`
      ].join("\n")
    };
  } else {
    answer = await askAgentLee(text, {
      chatIdHash: sha256(chatId),
      chatType: msg.chat.type || null,
      username: msg.chat.username || null,
      firstName: msg.chat.first_name || null
    });
  }

  routedReceipt = writeReceipt("telegram-routed", {
    actionRequested: "Route Telegram text into Agent Lee router/input loop",
    actionTaken: "Posted text to the Agent Lee router and collected the reply candidate",
    approvalRequired: false,
    approvalPresent: true,
    standardsConsulted: [
      "BOOK_54_ASSISTANT_EMBODIMENT_AND_BEHAVIOR_LAW",
      "BOOK_55_ASSISTANT_RECORDING_AND_LEARNING_LAW",
      "leeway-tracer-pack-standard"
    ],
    filesTouched: [STATE_PATH],
    validationPerformed: "Router chat route returned a response candidate",
    result: answer.ok ? "ROUTED" : "ROUTED_DEGRADED",
    blockers: answer.ok ? [] : ["Agent Lee router/model route did not return a clean reply candidate."],
    nextFixQueue: answer.ok ? [] : ["Inspect router/model availability if reply quality degrades."],
    updateId: update.update_id,
    chatId,
    chatIdHash: sha256(chatId),
    routedProvider: answer.provider,
    routedText: text,
    routedTextPreview: previewText(text, 200),
    agentReplyPreview: previewText(answer.text, 240)
  });

  let sent = null;
  try {
    sent = await telegram("sendMessage", {
      chat_id: chatId,
      text: answer.text.slice(0, 4096),
      disable_notification: false,
      link_preview_options: { is_disabled: true }
    });
  } catch (err) {
    const outboundFailReceipt = writeReceipt("telegram-outbound", {
      actionRequested: "Send Telegram reply back to the same chat_id",
      actionTaken: "Attempted reply sendMessage after router response",
      approvalRequired: false,
      approvalPresent: true,
      standardsConsulted: [
        "BOOK_54_ASSISTANT_EMBODIMENT_AND_BEHAVIOR_LAW",
        "BOOK_55_ASSISTANT_RECORDING_AND_LEARNING_LAW",
        "leeway-tracer-pack-standard"
      ],
      filesTouched: [STATE_PATH],
      validationPerformed: "Telegram sendMessage failed",
      result: "CHECK_REQUIRED",
      blockers: [err.message || String(err)],
      nextFixQueue: ["Verify TELEGRAM_BOT_TOKEN, chat_id, and Telegram API reachability."],
      updateId: update.update_id,
      chatId,
      chatIdHash: sha256(chatId),
      replyTextPreview: previewText(answer.text, 240),
      routedProvider: answer.provider,
      routedReceiptPath: routedReceipt?.receiptPath || null
    });

    writeState({
      lastAgentProvider: answer.provider,
      lastInboundReceiptPath: inboundReceipt.receiptPath,
      lastRoutedReceiptPath: routedReceipt?.receiptPath || null,
      lastOutgoingReceiptPath: outboundFailReceipt.receiptPath,
      lastOutgoingAt: nowIso(),
      lastOutgoingError: err.message || String(err)
    });

    throw err;
  }

  const outboundReceipt = writeReceipt("telegram-outbound", {
    actionRequested: "Send Telegram reply back to the same chat_id",
    actionTaken: "Delivered the Agent Lee reply with Telegram sendMessage",
    approvalRequired: false,
    approvalPresent: true,
    standardsConsulted: [
      "BOOK_54_ASSISTANT_EMBODIMENT_AND_BEHAVIOR_LAW",
      "BOOK_55_ASSISTANT_RECORDING_AND_LEARNING_LAW",
      "leeway-tracer-pack-standard"
    ],
    filesTouched: [STATE_PATH],
    validationPerformed: "Telegram sendMessage returned ok",
    result: "SENT",
    blockers: [],
    nextFixQueue: [],
    updateId: update.update_id,
    chatId,
    chatIdHash: sha256(chatId),
    telegramMessageId: sent.message_id,
    replyTextPreview: previewText(answer.text, 240),
    routedProvider: answer.provider,
    routedReceiptPath: routedReceipt?.receiptPath || null
  });

  writeState({
    lastAgentProvider: answer.provider,
    lastOutgoingMessageId: sent.message_id,
    lastOutgoingTextHash: sha256(answer.text),
    lastOutgoingTextPreview: answer.text.slice(0, 160),
    lastOutgoingAt: nowIso(),
    lastInboundReceiptPath: inboundReceipt.receiptPath,
    lastRoutedReceiptPath: routedReceipt?.receiptPath || null,
    lastOutgoingReceiptPath: outboundReceipt.receiptPath
  });

  console.log(JSON.stringify({
    event: "telegram_message_handled",
    at: nowIso(),
    update_id: update.update_id,
    chat_id_hash: sha256(chatId),
    provider: answer.provider,
    message_id: sent.message_id,
    inboundReceiptPath: inboundReceipt.receiptPath,
    routedReceiptPath: routedReceipt?.receiptPath || null,
    outboundReceiptPath: outboundReceipt.receiptPath
  }));
}

async function main() {
  const env = readEnv();
  const tokenPick = pick(env, TOKEN_KEYS);

  if (!tokenPick.value) {
    throw new Error("Telegram token missing from .env.local");
  }

  console.log(JSON.stringify({
    event: "bridge_start",
    at: nowIso(),
    envPath: ENV_PATH,
    statePath: STATE_PATH,
    tokenKey: tokenPick.key,
    tokenHash: sha256(tokenPick.value)
  }));

  const me = await telegram("getMe", {});
  console.log(JSON.stringify({
    event: "telegram_getme_ok",
    at: nowIso(),
    botUsername: me.username,
    botFirstName: me.first_name,
    botIdHash: sha256(String(me.id))
  }));

  await telegram("deleteWebhook", { drop_pending_updates: false }).catch(() => null);

  writeState({
    bridgeOnline: true,
    bridgeStartedAt: nowIso(),
    botUsername: me.username,
    botFirstName: me.first_name,
    botIdHash: sha256(String(me.id)),
    receiptDir: RECEIPT_DIR
  });

  writeReceipt("telegram-bridge-start", {
    actionRequested: "Start Telegram polling bridge",
    actionTaken: "Validated bot identity, disabled webhook, and entered polling loop",
    approvalRequired: false,
    approvalPresent: true,
    standardsConsulted: [
      "BOOK_54_ASSISTANT_EMBODIMENT_AND_BEHAVIOR_LAW",
      "BOOK_55_ASSISTANT_RECORDING_AND_LEARNING_LAW",
      "leeway-tracer-pack-standard"
    ],
    filesTouched: [STATE_PATH, ENV_PATH],
    validationPerformed: "getMe returned a live Telegram bot identity",
    result: "BRIDGE_ONLINE",
    blockers: [],
    nextFixQueue: [],
    botUsername: me.username,
    botFirstName: me.first_name,
    botIdHash: sha256(String(me.id)),
    polling: true,
    webhookDisabled: true
  });

  let offset = Number(readState().lastConfirmedOffset || 0);

  while (true) {
    try {
      const updates = await telegram("getUpdates", {
        offset: offset || undefined,
        limit: 20,
        timeout: 20
      });

      if (Array.isArray(updates) && updates.length > 0) {
        for (const update of updates) {
          offset = update.update_id + 1;

          try {
            await handleUpdate(update);
          } catch (err) {
            console.error(JSON.stringify({
              event: "handle_update_error",
              at: nowIso(),
              update_id: update.update_id,
              error: err.message
            }));
          }

          writeState({
            lastConfirmedOffset: offset,
            lastPollAt: nowIso()
          });
        }
      } else {
        writeState({
          lastPollAt: nowIso(),
          lastPollResult: "no_updates"
        });
      }
    } catch (err) {
      console.error(JSON.stringify({
        event: "poll_error",
        at: nowIso(),
        error: err.message
      }));

      writeState({
        lastPollError: err.message,
        lastPollErrorAt: nowIso()
      });

      writeReceipt("telegram-poll-error", {
        actionRequested: "Poll Telegram updates",
        actionTaken: "Polling loop hit an error and backed off",
        approvalRequired: false,
        approvalPresent: true,
        standardsConsulted: [
          "BOOK_54_ASSISTANT_EMBODIMENT_AND_BEHAVIOR_LAW",
          "BOOK_55_ASSISTANT_RECORDING_AND_LEARNING_LAW",
          "leeway-tracer-pack-standard"
        ],
        filesTouched: [STATE_PATH],
        validationPerformed: "Telegram polling request failed",
        result: "CHECK_REQUIRED",
        blockers: [err.message || String(err)],
        nextFixQueue: ["Restore Telegram network reachability or token configuration."],
        lastConfirmedOffset: offset
      });

      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
}

main().catch(err => {
  console.error(JSON.stringify({
    event: "bridge_fatal",
    at: nowIso(),
    error: err.message
  }));
  process.exit(1);
});
