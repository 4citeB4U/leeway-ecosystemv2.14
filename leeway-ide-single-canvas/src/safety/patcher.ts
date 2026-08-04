/*
LEEWAY_HEADER - DO NOT REMOVE

REGION: UTIL
TAG: CORE.SAFETY.PATCHER
DISCOVERY_PIPELINE: Voice -> Intent -> Location -> Vertical -> Ranking -> Render
*/

import * as fs from "fs";

export function createPatch(file: string, content: string) {
  const patchPath = process.env.USERPROFILE + "\\.leeway-vscode\\patches\\" + Date.now() + ".patch";

  const patch = {
    file,
    action: "add-header",
    preview: content.substring(0,200)
  };

  fs.writeFileSync(patchPath, JSON.stringify(patch, null, 2));
  return patchPath;
}

