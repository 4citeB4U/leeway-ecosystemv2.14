/*
LEEWAY_HEADER - DO NOT REMOVE

REGION: CORE
TAG: CORE.AGENT_LEE.SUPERVISOR.STATE_LOGGER
DISCOVERY_PIPELINE: Voice -> Intent -> Location -> Vertical -> Ranking -> Render
*/

import * as fs from "fs";

export function logEvent(event: string, data: any) {
  const path = process.env.USERPROFILE + "\\.leeway-vscode\\logs\\daily\\state-machine.jsonl";
  const entry = {
    timestamp: new Date().toISOString(),
    event,
    data
  };
  fs.appendFileSync(path, JSON.stringify(entry) + "\n");
}

