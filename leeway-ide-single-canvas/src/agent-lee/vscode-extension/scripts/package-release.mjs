/*
LEEWAY_HEADER - DO NOT REMOVE

REGION: CORE
TAG: CORE.RUNTIME.EXTENSION.RELEASE_PACKAGE
PURPOSE: Packages the extension to a deterministic versioned VSIX filename derived from package.json.
DISCOVERY_PIPELINE: Voice -> Intent -> Location -> Vertical -> Ranking -> Render
*/

import path from "path";
import { fileURLToPath } from "url";
import { spawnSync } from "child_process";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..");
const packageJson = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const outputName = process.argv[2] || `${packageJson.name}-${packageJson.version}.vsix`;

const command = `npx.cmd @vscode/vsce package --no-rewrite-relative-links -o "${outputName}"`;
const result = spawnSync(command, [], {
  cwd: root,
  stdio: "inherit",
  shell: true
});

if (typeof result.status === "number" && result.status !== 0) {
  process.exit(result.status);
}

if (result.error) {
  throw result.error;
}
