/*
LEEWAY_HEADER - DO NOT REMOVE

REGION: UTIL
TAG: CORE.SAFETY.ROLLBACK
DISCOVERY_PIPELINE: Voice -> Intent -> Location -> Vertical -> Ranking -> Render
*/

import * as fs from "fs";

export function rollback(file: string, backup: string) {
  fs.copyFileSync(backup, file);
  return "Rollback complete";
}

