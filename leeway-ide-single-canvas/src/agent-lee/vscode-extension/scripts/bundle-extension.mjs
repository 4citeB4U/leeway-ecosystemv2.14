/*
LEEWAY_HEADER - DO NOT REMOVE

REGION: CORE
TAG: CORE.RUNTIME.EXTENSION.BUNDLE_SCRIPT
PURPOSE: Bundles the Agent Lee VS Code extension through esbuild with stable Windows-safe path resolution.
DISCOVERY_PIPELINE: Voice -> Intent -> Location -> Vertical -> Ranking -> Render
*/

import path from "path";
import { fileURLToPath } from "url";
import { build } from "esbuild";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..");

await build({
  entryPoints: [path.join(root, "src", "extension.ts")],
  bundle: true,
  platform: "node",
  target: "node20",
  external: ["vscode", "axe-core", "jsdom", "pixelmatch", "playwright-core", "pngjs"],
  outfile: path.join(root, "dist", "extension.js"),
  sourcemap: true
});
