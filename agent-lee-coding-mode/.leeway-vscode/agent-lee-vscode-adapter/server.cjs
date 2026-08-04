const http = require("http");

const PORT = Number(process.env.PORT || process.env.AGENT_LEE_ADAPTER_PORT || 8787);
const AGENT_LEE_8080_URL = process.env.AGENT_LEE_ROUTER_URL || "http://127.0.0.1:8080";
const RUNTIME_FABRIC_URL = process.env.RUNTIME_FABRIC_URL || "http://127.0.0.1:4001";
const VOICE_KERNEL_URL = process.env.AGENT_LEE_VOICE_KERNEL_URL || "http://127.0.0.1:8092";

function corsHeaders(extra = {}) {
  return {
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET,POST,OPTIONS",
    "access-control-allow-headers": "content-type,authorization,x-adapter-port",
    ...extra
  };
}

function sendJson(res, status, obj) {
  const body = JSON.stringify(obj, null, 2);
  res.writeHead(status, corsHeaders({ "content-type": "application/json; charset=utf-8" }));
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.setEncoding("utf8");
    req.on("data", chunk => raw += chunk);
    req.on("end", () => {
      try {
        raw = raw.replace(/^\uFEFF/, "");
        if (!raw.trim()) return resolve({});
        resolve(JSON.parse(raw));
      } catch (err) {
        reject(err);
      }
    });
    req.on("error", reject);
  });
}

function extractUserMessage(body) {
  if (typeof body.message === "string") return body.message;
  if (typeof body.input === "string") return body.input;
  if (typeof body.prompt === "string") return body.prompt;

  if (Array.isArray(body.messages)) {
    const reversed = [...body.messages].reverse();
    const user = reversed.find(m => m && m.role === "user");
    if (user && typeof user.content === "string") return user.content;
    if (user && Array.isArray(user.content)) {
      return user.content.map(part => part.text || "").join("\n").trim();
    }
  }

  return "Reply with exactly: AGENT LEE ADAPTER READY";
}

async function postJson(url, payload, timeoutMs = 90000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    const text = await res.text();
    let json = null;
    try {
      json = JSON.parse(text.replace(/^\uFEFF/, ""));
    } catch {}

    return { ok: res.ok, status: res.status, text, json };
  } finally {
    clearTimeout(timer);
  }
}

function filenameFromAudioPath(audioPath) {
  if (!audioPath || typeof audioPath !== "string") return "";
  const clean = audioPath.split("?")[0].split("#")[0];
  return clean.split("/").filter(Boolean).pop() || "";
}

function openAiResponse(content, route, status = 200) {
  return {
    id: "chatcmpl-agent-lee-adapter-" + Date.now(),
    object: "chat.completion",
    created: Math.floor(Date.now() / 1000),
    model: "agent-lee",
    route,
    choices: [
      {
        index: 0,
        message: { role: "assistant", content },
        finish_reason: "stop"
      }
    ],
    adapter: {
      name: "agent-lee-vscode-turbo-adapter",
      port: PORT,
      status,
      router8080: AGENT_LEE_8080_URL,
      runtimeFabric: RUNTIME_FABRIC_URL,
      voiceKernel: VOICE_KERNEL_URL
    }
  };
}

const server = http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    res.writeHead(204, corsHeaders());
    return res.end();
  }

  const url = new URL(req.url, `http://${req.headers.host || "127.0.0.1"}`);

  if (req.method === "GET" && url.pathname === "/health") {
    return sendJson(res, 200, {
      ok: true,
      adapter: "agent-lee-vscode-turbo-adapter",
      port: PORT,
      route: "runtime-fabric-fallback",
      router8080: AGENT_LEE_8080_URL,
      runtimeFabric: RUNTIME_FABRIC_URL,
      voiceKernel: VOICE_KERNEL_URL,
      clonedVoiceProxy: {
        tts: `http://127.0.0.1:${PORT}/voice/tts`,
        audio: `http://127.0.0.1:${PORT}/voice/audio/{filename}`
      }
    });
  }

  if (req.method === "GET" && url.pathname === "/v1/models") {
    return sendJson(res, 200, {
      object: "list",
      data: [{ id: "agent-lee", object: "model", owned_by: "leeway" }]
    });
  }

  if (req.method === "POST" && (url.pathname === "/v1/chat/completions" || url.pathname === "/chat")) {
    try {
      const body = await readBody(req);
      const message = extractUserMessage(body);

      const runtime = await postJson(`${RUNTIME_FABRIC_URL}/agent-lee/chat`, {
        agentId: "agent-lee",
        message,
        input: message,
        prompt: message,
        stream: false
      });

      let content = "";
      if (runtime.ok && runtime.json) {
        content = runtime.json.response || runtime.json.message || runtime.json.text || JSON.stringify(runtime.json);
      } else {
        content = `Agent Lee adapter is online, but Runtime Fabric returned HTTP ${runtime.status}.`;
      }

      if (url.pathname === "/chat") {
        return sendJson(res, 200, {
          ok: true,
          response: content,
          route: "runtime-4001-agent-lee-chat",
          adapter: "agent-lee-vscode-turbo-adapter"
        });
      }

      return sendJson(res, 200, openAiResponse(content, "runtime-4001-agent-lee-chat", runtime.status));
    } catch (err) {
      return sendJson(res, 500, {
        ok: false,
        error: err && err.message ? err.message : String(err),
        adapter: "agent-lee-vscode-turbo-adapter"
      });
    }
  }

  if (req.method === "POST" && url.pathname === "/voice/tts") {
    try {
      const body = await readBody(req);
      const text = body.text || body.message || body.input || body.prompt || "Agent Lee cloned voice proxy ready.";

      const tts = await postJson(`${VOICE_KERNEL_URL}/tts`, {
        text,
        voice: body.voice || "agent-lee",
        language: body.language || "en",
        speed: typeof body.speed === "number" ? body.speed : 1.0
      }, 180000);

      if (!tts.ok || !tts.json) {
        return sendJson(res, 502, {
          ok: false,
          error: "Voice kernel TTS failed",
          status: tts.status,
          body: tts.text
        });
      }

      const filename = filenameFromAudioPath(tts.json.audio_path);
      return sendJson(res, 200, {
        ok: true,
        status: tts.json.status || "success",
        text: tts.json.text || text,
        voice: tts.json.voice || "agent-lee",
        duration: tts.json.duration || null,
        timestamp: tts.json.timestamp || new Date().toISOString(),
        update_package_loaded: Boolean(tts.json.update_package_loaded),
        audio_path: tts.json.audio_path,
        audio_filename: filename,
        audio_url: `http://127.0.0.1:${PORT}/voice/audio/${encodeURIComponent(filename)}`,
        upstream_audio_url: `${VOICE_KERNEL_URL}/audio/${encodeURIComponent(filename)}`
      });
    } catch (err) {
      return sendJson(res, 500, {
        ok: false,
        error: err && err.message ? err.message : String(err),
        route: "/voice/tts"
      });
    }
  }

  if (req.method === "GET" && url.pathname.startsWith("/voice/audio/")) {
    const filename = decodeURIComponent(url.pathname.replace("/voice/audio/", ""));
    if (!filename || filename.includes("..") || filename.includes("/") || filename.includes("\\")) {
      return sendJson(res, 400, { ok: false, error: "Invalid audio filename" });
    }

    try {
      const upstream = await fetch(`${VOICE_KERNEL_URL}/audio/${encodeURIComponent(filename)}`);
      const arrayBuffer = await upstream.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      if (!upstream.ok) {
        res.writeHead(upstream.status, corsHeaders({ "content-type": "application/json; charset=utf-8" }));
        return res.end(JSON.stringify({
          ok: false,
          error: "Upstream audio fetch failed",
          status: upstream.status,
          bytes: buffer.length,
          filename
        }, null, 2));
      }

      res.writeHead(200, corsHeaders({
        "content-type": upstream.headers.get("content-type") || "audio/wav",
        "content-length": String(buffer.length),
        "cache-control": "no-store"
      }));
      return res.end(buffer);
    } catch (err) {
      return sendJson(res, 500, {
        ok: false,
        error: err && err.message ? err.message : String(err),
        route: "/voice/audio/{filename}"
      });
    }
  }

  return sendJson(res, 404, {
    ok: false,
    error: "Not found",
    adapter: "agent-lee-vscode-turbo-adapter",
    path: url.pathname
  });
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`Agent Lee VS Code Turbo Adapter listening on 127.0.0.1:${PORT}`);
  console.log(`Runtime Fabric fallback: ${RUNTIME_FABRIC_URL}/agent-lee/chat`);
  console.log(`Voice Kernel proxy: ${VOICE_KERNEL_URL}/tts`);
});