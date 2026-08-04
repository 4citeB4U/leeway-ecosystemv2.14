/*
LEEWAY_HEADER - DO NOT REMOVE

REGION: UTIL
TAG: CORE.SAFETY.SCANNER
DISCOVERY_PIPELINE: Voice -> Intent -> Location -> Vertical -> Ranking -> Render
*/

import * as fs from "fs";
import * as path from "path";

export function scanCodebase(dir: string, out: any[] = []) {
  const blocked = ["node_modules",".git","dist","build"];

  for (const item of fs.readdirSync(dir)) {
    const full = path.join(dir, item);
    const stat = fs.statSync(full);

    if (stat.isDirectory()) {
      if (!blocked.includes(item)) scanCodebase(full, out);
    } else {
      out.push({
        file: full,
        size: stat.size,
        critical: full.includes("core") || full.includes("engine")
      });
    }
  }

  return out;
}

