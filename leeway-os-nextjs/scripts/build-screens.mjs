/**
 * MIG-008B Phase 4 — Stitch screen export -> Next.js screen data generator.
 * Reads each code.html under the locked source root, extracts head parts
 * (tailwind CDN, config, styles, fonts), body markup and inline scripts,
 * and emits src/lib/screens-data.ts.
 * The locked source is NEVER modified.
 *
 * RUNTIME COMPAT SHIMS (documented, minimal, never alter locked source):
 * Inline scripts that never executed in the Stitch preview threw in a real
 * browser. Each shim is a byte-level, behavior-preserving fix listed below.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const SOURCE_ROOT = "D:\\Leeway-Ecosystem v2.1.4\\leeway_os_mobile_desktop\\stitch_leeway_os_mobile_desktop";
const OUT = decodeURIComponent(new URL("../src/lib/screens-data.ts", import.meta.url).pathname).replace(/^\/([A-Za-z]:)/, "$1");

const RUNTIME_SHIMS = {
  leeway_home_1: [
    {
      reason: "null-safe: .bg-yellow-500 element may be absent when the inline script runs",
      find: "document.querySelector('.bg-yellow-500').addEventListener('click', () => {",
      replace: "document.querySelector('.bg-yellow-500')?.addEventListener('click', () => {"
    }
  ],
  quick_settings: [
    {
      reason: "invalid CSS selector :contains() is jQuery-only; replaced with equivalent find()",
      find: "document.querySelector('button .material-symbols-outlined:contains(\"close\")')?.parentElement.addEventListener('click', () => {",
      replace: "[...document.querySelectorAll('button .material-symbols-outlined')].find((b) => (b.textContent || '').trim() === 'close')?.parentElement?.addEventListener('click', () => {"
    }
  ]
};

const CONCEPT_PLACEHOLDER_SLUGS = [
  "agent_lee_interaction_space",
  "leeway_home_command_center",
  "leeway_os_mobile_desktop",
  "leeway_agent_os_1",
  "leeway_agent_os_2",
  "leeway_agent_os_mobile",
  "github_import_flow_specification"
];

function slugify(name) {
  return name.replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_-]/g, "");
}

function extractHead(html) {
  const m = html.match(/<head[^>]*>([\s\S]*?)<\/head>/i);
  return m ? m[1] : "";
}

function extractTitle(head) {
  const m = head.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return m ? m[1].trim() : "";
}

function extractBody(html) {
  const m = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  return m ? m[1] : "";
}

function splitScripts(body) {
  const scripts = [];
  const clean = body.replace(/<script\b[^>]*>([\s\S]*?)<\/script>|<script\b[^>]*\/?>/gi, (full, inner) => {
    const srcMatch = full.match(/<script\b[^>]*src=["']([^"']+)["']/i);
    scripts.push({ kind: "inline", code: inner || "" });
    if (srcMatch) scripts[scripts.length - 1] = { kind: "external", src: srcMatch[1] };
    return "";
  });
  return { bodyHtml: clean, scripts };
}

function splitHead(head) {
  const styles = [];
  const links = [];
  const headScripts = [];
  const clean = head
    .replace(/<title[^>]*>[\s\S]*?<\/title>/i, "")
    .replace(/<meta[^>]*\/?>/gi, "")
    .replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gi, (full, inner) => { styles.push(inner); return ""; })
    .replace(/<link\b[^>]*\/?>/gi, (full) => { links.push(full.replace(/^<link\b/i, "").replace(/\/?>$/, "")); return ""; })
    .replace(/<script\b[^>]*>([\s\S]*?)<\/script>|<script\b[^>]*\/?>/gi, (full, inner) => {
      const srcMatch = full.match(/<script\b[^>]*src=["']([^"']+)["']/i);
      if (srcMatch) headScripts.push({ kind: "external", src: srcMatch[1] });
      else headScripts.push({ kind: "inline", code: inner || "" });
      return "";
    });
  if (clean.trim()) styles.unshift(clean);
  return { styles, links, headScripts };
}

const screens = [];
const screenDirs = fs.readdirSync(SOURCE_ROOT, { withFileTypes: true }).filter((d) => d.isDirectory());
const appliedShims = [];

function applyShims(slug, text) {
  const shims = RUNTIME_SHIMS[slug];
  if (!shims) return text;
  for (const shim of shims) {
    if (text.includes(shim.find)) {
      text = text.replace(shim.find, shim.replace);
      appliedShims.push({ slug, reason: shim.reason, shimmed: true });
    } else {
      appliedShims.push({ slug, reason: shim.reason, shimmed: false, note: "pattern not found in extracted source" });
    }
  }
  return text;
}

for (const dir of screenDirs) {
  const htmlPath = path.join(SOURCE_ROOT, dir.name, "code.html");
  if (!fs.existsSync(htmlPath)) continue;
  const html = fs.readFileSync(htmlPath, "utf8");
  const head = extractHead(html);
  const { styles, links, headScripts } = splitHead(head);
  const { bodyHtml, scripts } = splitScripts(extractBody(html));
  const slug = slugify(dir.name);
  screens.push({
    slug,
    title: extractTitle(head) || dir.name,
    sourceDir: dir.name,
    sourceHash: sha256(html),
    styles: styles.map((s) => applyShims(slug, s)),
    links,
    headScripts: headScripts.map((s) => (s.kind === "inline" ? { kind: "inline", code: applyShims(slug, s.code) } : s)),
    bodyHtml: applyShims(slug, bodyHtml),
    scripts: scripts.map((s) => (s.kind === "inline" ? { kind: "inline", code: applyShims(slug, s.code) } : s))
  });
}

const existingSlugs = new Set(screens.map((s) => s.slug));
for (const slug of CONCEPT_PLACEHOLDER_SLUGS) {
  if (existingSlugs.has(slug)) continue;
  screens.push({
    slug,
    title: "LeeWay OS — Concept Screen",
    sourceDir: "(concept-only)",
    sourceHash: "CONCEPT_SCREENSHOT_ONLY_NO_CODE_HTML",
    styles: [],
    links: [],
    headScripts: [],
    bodyHtml:
      '<div style="display:flex;align-items:center;justify-content:center;min-height:100vh;background:#0b1220;color:#e2e8f0;font-family:Inter,system-ui,sans-serif;padding:32px;"><div style="max-width:560px;border:1px solid #334155;border-radius:16px;padding:32px;background:#111a2e;"><div style="font-size:13px;letter-spacing:0.08em;text-transform:uppercase;color:#38bdf8;margin-bottom:10px;">Concept Screen — Not Yet Implemented</div><h1 style="font-size:22px;margin:0 0 10px;">' +
      slug.replace(/_/g, " ") +
      '</h1><p style="font-size:14px;line-height:1.6;color:#94a3b8;margin:0;">This Stitch screen exists in the locked export as a screenshot/DESIGN only — there is no <code>code.html</code> source to mount. The route is preserved so the OS has no dead links; implementation of this screen remains open work.</p></div></div>',
    scripts: []
  });
}

function sha256(s) {
  return crypto.createHash("sha256").update(s).digest("hex").toUpperCase();
}

screens.sort((a, b) => a.slug.localeCompare(b.slug));

const lines = [];
lines.push("// GENERATED by scripts/build-screens.mjs — do not edit by hand.");
lines.push("// Source: leeway_os_mobile_desktop/stitch_leeway_os_mobile_desktop (CANONICAL_FACE_OF_LEEWAY_OPERATING_SYSTEM)");
lines.push("export type ScreenScript = { kind: \"inline\"; code: string } | { kind: \"external\"; src: string };");
lines.push("export type ScreenData = { slug: string; title: string; sourceDir: string; sourceHash: string; styles: string[]; links: string[]; headScripts: ScreenScript[]; bodyHtml: string; scripts: ScreenScript[] };");
lines.push("export const SCREENS: ScreenData[] = [");
for (const s of screens) {
  lines.push(`  { slug: ${JSON.stringify(s.slug)}, title: ${JSON.stringify(s.title)}, sourceDir: ${JSON.stringify(s.sourceDir)}, sourceHash: ${JSON.stringify(s.sourceHash)},`);
  lines.push(`    styles: ${JSON.stringify(s.styles)}, links: ${JSON.stringify(s.links)}, headScripts: ${JSON.stringify(s.headScripts)},`);
  lines.push(`    bodyHtml: ${JSON.stringify(s.bodyHtml)}, scripts: ${JSON.stringify(s.scripts)} },`);
}
lines.push("];");
lines.push("export const SCREEN_MAP: Record<string, ScreenData> = Object.fromEntries(SCREENS.map((s) => [s.slug, s]));");
lines.push("export const SCREEN_NAMES = SCREENS.map((s) => s.slug);");

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, lines.join("\n"), "utf8");
fs.writeFileSync(path.join(path.dirname(OUT), "../../scripts/runtime-shims-applied.json"), JSON.stringify({ appliedShims, generatedAt: new Date().toISOString() }, null, 2), "utf8");
console.log("generated", screens.length, "screens ->", OUT);
for (const s of screens) console.log(" ", s.slug, "|", s.title, "| html=" + s.bodyHtml.length + "b | scripts=" + s.scripts.length);
console.log("shims:", appliedShims.map((a) => a.slug + (a.shimmed ? " SHIMMED" : " (not found)")).join(", ") || "none");
