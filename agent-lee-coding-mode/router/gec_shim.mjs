import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROUTER_DIR = path.dirname(fileURLToPath(import.meta.url));
const AGENT_LEE_ROOT = path.resolve(ROUTER_DIR, "..");
// prefer workspace-level Archive (parent of agent-lee-coding-mode), fallback to agent root Archive
const DEFAULT_MANIFEST = path.join(AGENT_LEE_ROOT, "..", "Archive", "receipts", "gec_compiled_manifest.json");

let manifestCache = null;

function loadManifest(manifestPath) {
  const candidates = [];
  if (manifestPath) candidates.push(manifestPath);
  candidates.push(DEFAULT_MANIFEST);
  candidates.push(path.join(AGENT_LEE_ROOT, "Archive", "receipts", "gec_compiled_manifest.json"));

  for (const p of candidates) {
    try {
      if (!p || !fs.existsSync(p)) continue;
      const raw = fs.readFileSync(p, "utf8");
      manifestCache = JSON.parse(raw);
      return manifestCache;
    } catch (e) {
      // try next candidate
      continue;
    }
  }

  return {};
}

function evaluateAction(action, manifestPath) {
  const manifest = manifestCache || loadManifest(manifestPath);
  const pathStr = String(action.path || "");
  const normalizedPath = pathStr.replace(/\\/g, "/").toLowerCase();
  let allowed = true;
  const hits = [];
  let modifiedAction = { ...action };

  for (const [name, meta] of Object.entries(manifest || {})) {
    const enforcement = meta.enforcement;
    const scope = (meta.scope || "").toString();

    if (enforcement === "BLOCK_WRITE") {
      if (scope === "ALL_RECEIPTS") {
        if (normalizedPath.includes("/receipts/")) {
          hits.push({ rule: name, effect: "would_block" });
          allowed = false;
        }
      } else {
        if (normalizedPath.includes(scope.toLowerCase())) {
          hits.push({ rule: name, effect: "would_block" });
          allowed = false;
        }
      }
    }

    if (enforcement === "RECLASSIFY_OR_BLOCK") {
      if (scope === "RECEIPTS_AND_REPORTS") {
        if (normalizedPath.includes("/runtime/")) {
          const suggested = normalizedPath.replace("/runtime/", "/archive/");
          hits.push({ rule: name, effect: "would_reclassify", suggested });
          modifiedAction = { ...modifiedAction, path: suggested };
        }
      } else if (scope && normalizedPath.includes(scope.toLowerCase())) {
        const suggested = normalizedPath.replace("/runtime/", "/archive/");
        hits.push({ rule: name, effect: "would_reclassify", suggested });
        modifiedAction = { ...modifiedAction, path: suggested };
      }
    }

    if (enforcement === "AUTO_NORMALIZE") {
      if (modifiedAction.content && typeof modifiedAction.content === "object") {
        const ts = modifiedAction.content.timestamp;
        try {
          const d = ts ? new Date(ts) : null;
          if (!d || isNaN(d.getTime())) {
            const now = new Date().toISOString();
            modifiedAction = { ...modifiedAction, content: { ...modifiedAction.content, timestamp: now } };
            hits.push({ rule: name, effect: "would_normalize", suggested: now });
          }
        } catch (e) {
          const now = new Date().toISOString();
          modifiedAction = { ...modifiedAction, content: { ...modifiedAction.content, timestamp: now } };
          hits.push({ rule: name, effect: "would_normalize", suggested: now });
        }
      }
    }
  }

  return { allowed, policy_hits: hits, simulated_action: modifiedAction };
}

export { evaluateAction, loadManifest, DEFAULT_MANIFEST };
