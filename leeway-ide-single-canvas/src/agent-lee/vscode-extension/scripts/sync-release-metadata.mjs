/*
LEEWAY_HEADER - DO NOT REMOVE

REGION: CORE
TAG: CORE.RUNTIME.EXTENSION.RELEASE_SYNC
PURPOSE: Keeps extension release metadata aligned so package.json and package-lock.json cannot drift during local packaging.
DISCOVERY_PIPELINE: Voice -> Intent -> Location -> Vertical -> Ranking -> Render
*/

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..");
const packageJsonPath = path.join(root, "package.json");
const packageLockPath = path.join(root, "package-lock.json");
const readmePath = path.join(root, "README.md");

const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
const packageLock = JSON.parse(fs.readFileSync(packageLockPath, "utf8"));
const readmeText = fs.readFileSync(readmePath, "utf8");
const targetVersion = String(packageJson.version || "").trim();

if (!targetVersion) {
  throw new Error("package.json is missing a version.");
}

let changed = false;
if (packageLock.version !== targetVersion) {
  packageLock.version = targetVersion;
  changed = true;
}

if (packageLock.packages && packageLock.packages[""] && packageLock.packages[""].version !== targetVersion) {
  packageLock.packages[""].version = targetVersion;
  changed = true;
}

const nextReadmeText = readmeText.replace(
  /Current packaged release in this workspace: `[^`]*`\./,
  `Current packaged release in this workspace: \`${targetVersion}\`.`
);
if (nextReadmeText !== readmeText) {
  fs.writeFileSync(readmePath, nextReadmeText, "utf8");
  changed = true;
}

if (changed) {
  fs.writeFileSync(packageLockPath, `${JSON.stringify(packageLock, null, 2)}\n`, "utf8");
  console.log(`Synchronized package-lock.json to ${targetVersion}.`);
} else {
  console.log(`Release metadata already synchronized at ${targetVersion}.`);
}
