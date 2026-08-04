import fs from "fs";
import http from "http";
import { request as httpRequest } from "http";

const INTERVAL_MS = Number(process.env.HYBRID_INTERVAL_MS || "30000");
const ADVISOR_EVERY_CYCLES = Number(process.env.ADVISOR_EVERY_CYCLES || "4");
const PREFERRED_QWEN = process.env.PREFERRED_QWEN_MODEL || "qwen2.5-coder:7b";
const STATE_DIR = "/state";

fs.mkdirSync(STATE_DIR, { recursive: true });

let latestState = {
  status: "STARTING",
  updatedAt: new Date().toISOString()
};

let cycle = 0;

function writeJson(path, obj) {
  fs.writeFileSync(path, JSON.stringify(obj, null, 2), "utf8");
}

function appendJsonl(path, obj) {
  fs.appendFileSync(path, JSON.stringify(obj) + "\n", "utf8");
}

async function getJson(url, timeoutMs = 8000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, { signal: controller.signal });
    const text = await res.text();

    let parsed = null;
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = { text: text.slice(0, 2000) };
    }

    return {
      ready: res.ok,
      statusCode: res.status,
      status: res.ok ? "READY" : "CHECK_REQUIRED",
      response: parsed
    };
  } catch (err) {
    return {
      ready: false,
      status: "BLOCKED",
      error: String(err.message || err)
    };
  } finally {
    clearTimeout(timer);
  }
}

async function postJson(url, body, timeoutMs = 90000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal
    });

    const text = await res.text();

    let parsed = null;
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = { text: text.slice(0, 2000) };
    }

    return {
      ready: res.ok,
      statusCode: res.status,
      status: res.ok ? "READY" : "CHECK_REQUIRED",
      response: parsed
    };
  } catch (err) {
    return {
      ready: false,
      status: "BLOCKED",
      error: String(err.message || err)
    };
  } finally {
    clearTimeout(timer);
  }
}

function dockerApi(path) {
  return new Promise((resolve) => {
    const req = httpRequest(
      {
        socketPath: "/var/run/docker.sock",
        path,
        method: "GET"
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => data += chunk);
        res.on("end", () => {
          try {
            resolve({
              ready: res.statusCode >= 200 && res.statusCode < 300,
              statusCode: res.statusCode,
              data: JSON.parse(data)
            });
          } catch {
            resolve({
              ready: false,
              statusCode: res.statusCode,
              data
            });
          }
        });
      }
    );

    req.on("error", (err) => {
      resolve({
        ready: false,
        error: String(err.message || err)
      });
    });

    req.end();
  });
}

async function dockerContainers() {
  const res = await dockerApi("/containers/json?all=1");

  if (!res.ready || !Array.isArray(res.data)) {
    return {
      ready: false,
      status: "DOCKER_SOCKET_CHECK_REQUIRED",
      containers: [],
      error: res.error || res.data
    };
  }

  return {
    ready: true,
    status: "DOCKER_SOCKET_READY",
    containers: res.data.map((c) => ({
      id: c.Id,
      shortId: String(c.Id || "").slice(0, 12),
      names: c.Names,
      image: c.Image,
      state: c.State,
      statusText: c.Status,
      ports: c.Ports,
      labels: c.Labels || {}
    }))
  };
}

function findContainer(inventory, names) {
  const lowered = names.map(x => x.toLowerCase());

  return inventory.containers.find((c) => {
    const joined = [
      ...(c.names || []),
      c.image || "",
      c.labels?.["com.docker.compose.service"] || ""
    ].join(" ").toLowerCase();

    return lowered.some(n => joined.includes(n));
  });
}

async function qwenAdvisorProof(models) {
  const preferred =
    models.includes(PREFERRED_QWEN)
      ? PREFERRED_QWEN
      : models.find(m => m.includes("qwen2.5-coder"))
        || models.find(m => m.includes("qwen3"))
        || models.find(m => m.includes("qwen"));

  if (!preferred) {
    return {
      advisorStatus: "QWEN_MODEL_CHECK_REQUIRED",
      model: "",
      proof: null
    };
  }

  const proof = await postJson("http://ollama:11434/api/generate", {
    model: preferred,
    prompt: "Return only this exact JSON: {\"advisorStatus\":\"READY\",\"role\":\"ADVISORY_PROCESSOR_NOT_CONTROLLER\"}",
    stream: false,
    keep_alive: "10m",
    options: {
      temperature: 0,
      num_predict: 64
    }
  });

  return {
    advisorStatus: proof.ready ? "LLM_ADVISOR_READY" : "LLM_ADVISOR_BLOCKED",
    model: preferred,
    proof
  };
}

async function scan() {
  cycle += 1;
  const now = new Date().toISOString();

  const docker = await dockerContainers();

  const endpoints = {
    agentLeeHealth: await getJson("http://agent-lee:8080/health"),
    agentLeeRoot: await getJson("http://agent-lee:8080"),
    runtimeFabricHealth: await getJson("http://runtime-fabric:4001/health"),
    runtimeFabricRoot: await getJson("http://runtime-fabric:4001"),
    runtimeFabricAux8111: await getJson("http://runtime-fabric:8111"),
    ollamaRoot: await getJson("http://ollama:11434"),
    ollamaTags: await getJson("http://ollama:11434/api/tags"),
    voiceKernel: await getJson("http://host.docker.internal:8092/health"),
    visionKernel: await getJson("http://host.docker.internal:8093/health"),
    creationKernelHealth: await getJson("http://host.docker.internal:8094/health"),
    creationKernelStatus: await getJson("http://host.docker.internal:8094/status"),
    seafile: await getJson("http://host.docker.internal:8082")
  };

  const qwenModels = [];
  try {
    for (const model of endpoints.ollamaTags.response.models || []) {
      if (model.name && String(model.name).includes("qwen")) {
        qwenModels.push(String(model.name));
      }
    }
  } catch {}

  let advisor = {
    advisorStatus: "SKIPPED_THIS_CYCLE",
    model: "",
    proof: null
  };

  if (cycle % ADVISOR_EVERY_CYCLES === 0) {
    advisor = await qwenAdvisorProof(qwenModels);
  }

  const containers = {
    agentLee: findContainer(docker, ["agent_lee_code_mode", "agent-lee"]),
    runtimeFabric: findContainer(docker, ["leeway_runtime_fabric", "runtime-fabric"]),
    ollama: findContainer(docker, ["leeway_ollama", "ollama"]),
    voiceKernel: findContainer(docker, ["agent-lee-voice-kernel"]),
    visionKernel: findContainer(docker, ["agent-lee-vision-kernel"]),
    creationKernel: findContainer(docker, ["agent-lee-creation-kernel"]),
    seafile: findContainer(docker, ["leeway-seafile"]),
    seafileDb: findContainer(docker, ["leeway-seafile-db"]),
    seafileCache: findContainer(docker, ["leeway-seafile-cache"]),
    hybridFabric: findContainer(docker, ["leeway_hybrid_fabric", "hybrid-fabric"])
  };

  const checks = {
    dockerSocketReady: docker.ready,

    agentLeeContainerRunning: containers.agentLee?.state === "running",
    runtimeFabricContainerRunning: containers.runtimeFabric?.state === "running",
    ollamaContainerRunning: containers.ollama?.state === "running",
    hybridFabricContainerRunning: containers.hybridFabric?.state === "running",

    voiceKernelContainerRunning: containers.voiceKernel?.state === "running",
    visionKernelContainerRunning: containers.visionKernel?.state === "running",
    creationKernelContainerRunning: containers.creationKernel?.state === "running",
    seafileContainerRunning: containers.seafile?.state === "running",
    seafileDbContainerRunning: containers.seafileDb?.state === "running",
    seafileCacheContainerRunning: containers.seafileCache?.state === "running",

    agentLeeEndpointReady: endpoints.agentLeeHealth.ready || endpoints.agentLeeRoot.ready,
    runtimeFabricEndpointReady: endpoints.runtimeFabricHealth.ready || endpoints.runtimeFabricRoot.ready,
    ollamaEndpointReady: endpoints.ollamaTags.ready || endpoints.ollamaRoot.ready,
    voiceKernelEndpointReady: endpoints.voiceKernel.ready,
    visionKernelEndpointReady: endpoints.visionKernel.ready,
    creationKernelEndpointReady: endpoints.creationKernelHealth.ready,
    seafileEndpointReady: endpoints.seafile.ready,

    qwenModelAvailable: qwenModels.length > 0
  };

  const blockingCore = [];
  for (const key of [
    "dockerSocketReady",
    "agentLeeContainerRunning",
    "runtimeFabricContainerRunning",
    "ollamaContainerRunning",
    "hybridFabricContainerRunning",
    "agentLeeEndpointReady",
    "runtimeFabricEndpointReady",
    "ollamaEndpointReady",
    "qwenModelAvailable"
  ]) {
    if (!checks[key]) {
      blockingCore.push(key);
    }
  }

  const supportCheckRequired = [];
  for (const key of [
    "voiceKernelContainerRunning",
    "visionKernelContainerRunning",
    "creationKernelContainerRunning",
    "seafileContainerRunning",
    "seafileDbContainerRunning",
    "seafileCacheContainerRunning",
    "voiceKernelEndpointReady",
    "visionKernelEndpointReady",
    "creationKernelEndpointReady",
    "seafileEndpointReady"
  ]) {
    if (!checks[key]) {
      supportCheckRequired.push(key);
    }
  }

  let status = "HYBRID_FABRIC_DOCKER_CHECK_REQUIRED";

  if (blockingCore.length === 0 && supportCheckRequired.length === 0) {
    status = "HYBRID_FABRIC_DOCKER_LIVE_READY";
  } else if (blockingCore.length === 0) {
    status = "HYBRID_FABRIC_DOCKER_CORE_READY_SUPPORT_CHECK_REQUIRED";
  }

  latestState = {
    schema: "agent-lee-docker-native-hybrid-fabric-state-v18-2",
    updatedAt: now,
    authority: "Docker Native Hybrid Fabric",
    status,
    cycle,
    topology: {
      ecosystem: "leeway-ecosystemv214",
      network: "leeway-ecosystemv214_leeway-net",
      actualContainers: {
        agentLee: "agent_lee_code_mode",
        runtimeFabric: "leeway_runtime_fabric",
        ollama: "leeway_ollama",
        hybridFabric: "leeway_hybrid_fabric",
        voiceKernel: "agent-lee-voice-kernel",
        visionKernel: "agent-lee-vision-kernel",
        creationKernel: "agent-lee-creation-kernel",
        seafile: "leeway-seafile",
        seafileDb: "leeway-seafile-db",
        seafileCache: "leeway-seafile-cache"
      }
    },
    containers,
    dockerInventory: docker,
    endpoints,
    qwen: {
      role: "ADVISORY_PROCESSOR_NOT_CONTROLLER",
      availableModels: qwenModels,
      preferredModel: PREFERRED_QWEN,
      advisorStatus: advisor.advisorStatus,
      advisorModel: advisor.model,
      advisorProof: advisor.proof
    },
    checks,
    blockingCore,
    supportCheckRequired,
    worker: {
      container: "leeway_hybrid_fabric",
      process: "node worker.mjs",
      runningInsideDocker: true,
      storage: "Docker named volume leeway_hybrid_fabric_state",
      intervalMs: INTERVAL_MS,
      advisorEveryCycles: ADVISOR_EVERY_CYCLES
    },
    guardrails: [
      "No Docker restart from worker loop",
      "No Docker stop from worker loop",
      "No Docker remove from worker loop",
      "No Docker prune from worker loop",
      "No model retraining",
      "No unknown MCP autostart",
      "Qwen advisor does not execute actions"
    ],
    truth: "V18.2 is no-bind Docker-native. It avoids host path bind mounts and exposes state through HTTP."
  };

  writeJson("/state/AGENT_LEE_DOCKER_HYBRID_FABRIC_STATE.json", latestState);
  writeJson("/state/AGENT_LEE_HYBRID_AUTONOMIC_FABRIC_STATE.json", latestState);
  writeJson("/state/AGENT_LEE_CONTAINER_TOPOLOGY.json", latestState);
  writeJson("/state/latest-qwen-advisor-proof.json", latestState.qwen);
  appendJsonl("/state/docker-hybrid-fabric-events.jsonl", latestState);

  console.log(`[${new Date().toLocaleTimeString()}] Docker Hybrid V18.2 | status=${status} | agent=${checks.agentLeeEndpointReady} | runtime=${checks.runtimeFabricEndpointReady} | ollama=${checks.ollamaEndpointReady} | qwen=${checks.qwenModelAvailable} | voice=${checks.voiceKernelEndpointReady} | vision=${checks.visionKernelEndpointReady} | creation=${checks.creationKernelEndpointReady} | seafile=${checks.seafileEndpointReady} | advisor=${advisor.advisorStatus}`);
}

const server = http.createServer((req, res) => {
  if (req.url === "/health") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({
      status: "READY",
      service: "leeway_hybrid_fabric",
      state: latestState.status,
      updatedAt: latestState.updatedAt
    }));
    return;
  }

  if (req.url === "/state") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify(latestState, null, 2));
    return;
  }

  res.writeHead(404, { "content-type": "application/json" });
  res.end(JSON.stringify({ status: "NOT_FOUND" }));
});

server.listen(8777, "0.0.0.0", () => {
  console.log("Leeway Docker Hybrid Fabric V18.2 listening on 0.0.0.0:8777");
});

await scan();
setInterval(scan, INTERVAL_MS);