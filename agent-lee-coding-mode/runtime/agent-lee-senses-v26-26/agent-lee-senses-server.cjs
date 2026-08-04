const http = require("http");
const fs = require("fs");
const path = require("path");

const ROOT = process.env.LEEWAY_ROOT;
const UI_PATH = process.env.AGENT_LEE_SENSES_UI;
const STATE_PATH = process.env.AGENT_LEE_SENSES_STATE;
const PROOF_DIR = process.env.AGENT_LEE_SENSES_PROOF;

function now() { return new Date().toISOString(); }

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function writeJson(file, obj) {
  ensureDir(path.dirname(file));
  fs.writeFileSync(file, JSON.stringify(obj, null, 2), "utf8");
}

function appendJsonl(file, obj) {
  ensureDir(path.dirname(file));
  fs.appendFileSync(file, JSON.stringify(obj) + "\n", "utf8");
}

function send(res, code, obj) {
  const body = JSON.stringify(obj, null, 2);
  res.writeHead(code, {
    "content-type": "application/json",
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET,POST,OPTIONS",
    "access-control-allow-headers": "content-type"
  });
  res.end(body);
}

async function readBody(req) {
  return await new Promise((resolve) => {
    let data = "";
    req.on("data", chunk => data += chunk);
    req.on("end", () => {
      try { resolve(data ? JSON.parse(data) : {}); }
      catch { resolve({ raw: data }); }
    });
  });
}

async function tryVisionRoute(imageDataUrl, prompt) {
  const base64 = String(imageDataUrl || "").replace(/^data:image\/\w+;base64,/, "");

  const candidates = [
    {
      id: "vision-8093-analyze",
      url: "http://127.0.0.1:8093/analyze",
      body: { image: base64, prompt }
    },
    {
      id: "vision-8093-vision-analyze",
      url: "http://127.0.0.1:8093/vision/analyze",
      body: { image: base64, prompt }
    },
    {
      id: "vision-8093-camera",
      url: "http://127.0.0.1:8093/analyze-camera-feed",
      body: { imageData: imageDataUrl, prompt }
    },
    {
      id: "vision-5000-analyze",
      url: "http://127.0.0.1:5000/analyze",
      body: { image: base64, prompt }
    }
  ];

  const attempts = [];

  for (const c of candidates) {
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 25000);

      const r = await fetch(c.url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(c.body),
        signal: ctrl.signal
      });

      clearTimeout(timer);

      const text = await r.text();
      let json = null;
      try { json = JSON.parse(text); } catch {}

      attempts.push({ id: c.id, url: c.url, http: r.status, ok: r.ok, textPreview: text.slice(0, 500) });

      if (r.ok) {
        const answer =
          json?.answer ||
          json?.description ||
          json?.text ||
          json?.result ||
          json?.analysis ||
          text;

        if (answer) {
          return {
            status: "VISION_READY",
            route: c.id,
            url: c.url,
            answer: typeof answer === "string" ? answer : JSON.stringify(answer),
            attempts
          };
        }
      }
    } catch (err) {
      attempts.push({ id: c.id, url: c.url, ok: false, error: err.message });
    }
  }

  return {
    status: "VISION_ROUTE_CHECK_REQUIRED",
    message: "Camera frame was saved, but no local vision analysis route accepted it.",
    attempts
  };
}

const server = http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET,POST,OPTIONS",
      "access-control-allow-headers": "content-type"
    });
    return res.end();
  }

  if (req.method === "GET" && (req.url === "/" || req.url === "/index.html")) {
    const html = fs.readFileSync(UI_PATH, "utf8");
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    return res.end(html);
  }

  if (req.method === "GET" && req.url === "/health") {
    return send(res, 200, {
      status: "READY",
      service: "agent-lee-senses-v26-26",
      proofDir: PROOF_DIR,
      statePath: STATE_PATH
    });
  }

  if (req.method === "POST" && req.url === "/event") {
    const body = await readBody(req);
    const event = { at: now(), ...body };
    appendJsonl(path.join(PROOF_DIR, "events.jsonl"), event);
    writeJson(STATE_PATH, { status: "EVENT_RECEIVED", updatedAt: now(), lastEvent: event });
    return send(res, 200, { status: "EVENT_LOGGED", event });
  }

  if (req.method === "POST" && req.url === "/vision/analyze-frame") {
    const body = await readBody(req);
    const imageDataUrl = body.imageDataUrl || "";
    const prompt = body.prompt || "Describe the visible scene carefully.";

    const frameName = "camera-frame-" + Date.now() + ".jpg";
    const framePath = path.join(PROOF_DIR, "frames", frameName);

    try {
      const base64 = imageDataUrl.replace(/^data:image\/\w+;base64,/, "");
      fs.writeFileSync(framePath, Buffer.from(base64, "base64"));
    } catch (err) {
      return send(res, 500, { status: "FRAME_SAVE_FAILED", error: err.message });
    }

    const vision = await tryVisionRoute(imageDataUrl, prompt);

    const result = {
      ...vision,
      framePath,
      prompt,
      recordedAt: now()
    };

    writeJson(path.join(PROOF_DIR, "vision", "latest-vision-result.json"), result);
    writeJson(STATE_PATH, { status: result.status, updatedAt: now(), latestVision: result });

    return send(res, 200, result);
  }

  return send(res, 404, { status: "NOT_FOUND", url: req.url });
});

server.listen(8794, "127.0.0.1", () => {
  const state = {
    status: "READY",
    service: "agent-lee-senses-v26-26",
    url: "http://127.0.0.1:8794",
    proofDir: PROOF_DIR,
    statePath: STATE_PATH,
    startedAt: now()
  };
  writeJson(STATE_PATH, state);
  console.log(JSON.stringify(state));
});