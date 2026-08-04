/*
LEEWAY_HEADER - DO NOT REMOVE

REGION: CORE
TAG: CORE.AGENT_LEE.SUPERVISOR.STATE_MACHINE
DISCOVERY_PIPELINE: Voice -> Intent -> Location -> Vertical -> Ranking -> Render
*/

import * as fs from "fs";

const ROOT = process.env.USERPROFILE + "\\.leeway-vscode";
const STATE_PATH = ROOT + "\\memory\\project-state.json";

function loadState() {
  return JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));
}

function saveState(state: any) {
  state.lastUpdated = new Date().toISOString();
  fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2));
}

export async function runStateMachine(task: string, planner: any, executor: any, verifier: any, rca: any) {

  let state = loadState();
  state.currentTask = task;

  const plan = planner.createPlan(task);

  for (let step of plan) {

    const result = await executor.executeStep(step, state);

    const check = verifier.verify(result);

    if (!check.pass) {
      const failure = rca.analyzeFailure(result);
      state.failedTasks.push({
        step,
        error: failure
      });

      saveState(state);
      return `FAILED at step ${step.step}: ${failure.cause}`;
    }

    step.status = "complete";
  }

  state.completedTasks.push(task);
  saveState(state);

  return "SUCCESS: Task completed with verification.";
}

