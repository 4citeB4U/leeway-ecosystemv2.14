import * as fs from "fs";
import * as path from "path";

const IGNORE = ["node_modules",".git","dist","out","build",".next",".vite","coverage"];

export function walkFiles(root: string, out: string[] = []) {
  if (!fs.existsSync(root)) return out;
  for (const item of fs.readdirSync(root)) {
    const full = path.join(root, item);
    if (IGNORE.includes(item)) continue;
    const stat = fs.statSync(full);
    if (stat.isDirectory()) walkFiles(full, out);
    else if (/\.(ts|tsx|js|jsx|html|css|json|md|mjs|cjs|py|ps1)$/i.test(full)) out.push(full);
  }
  return out;
}

export function indexWorkspace(root: string) {
  const files = walkFiles(root);
  return files.slice(0, 300).map(file => {
    const text = fs.readFileSync(file, "utf8");
    const functions = [...text.matchAll(/function\s+([a-zA-Z0-9_]+)/g)].map(m => m[1]);
    const classes = [...text.matchAll(/class\s+([a-zA-Z0-9_]+)/g)].map(m => m[1]);
    const imports = [...text.matchAll(/import\s+.*?from\s+["'](.+?)["']/g)].map(m => m[1]);
    return { file, functions, classes, imports };
  });
}

export function readCodebaseContext(root: string, maxFiles = 35, maxChars = 2200) {
  return walkFiles(root)
    .slice(0, maxFiles)
    .map(file => `FILE: ${file}\n${fs.readFileSync(file, "utf8").slice(0, maxChars)}`)
    .join("\n\n");
}
/*
LEEWAY_HEADER - DO NOT REMOVE

TAG: CORE.CODE.AST.MAIN
REGION: 🟢 CORE
PURPOSE: AST parsing and code structure support for Agent Lee file intelligence.
DISCOVERY_PIPELINE:
  Voice → Intent → Location → Vertical → Ranking → Render
*/
