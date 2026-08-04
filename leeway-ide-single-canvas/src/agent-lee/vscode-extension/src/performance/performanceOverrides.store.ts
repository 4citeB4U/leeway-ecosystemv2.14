/*
LEEWAY HEADER — DO NOT REMOVE

REGION: 💾 DATA
TAG: DATA.PERFORMANCE.OVERRIDES.STORE

5WH:
WHAT = Agent Lee runtime performance override store
WHY = Allows fine-grained feature control without switching the whole runtime profile
WHO = Agent Lee Runtime Performance Governor
WHERE = src/performance/performanceOverrides.store.ts
WHEN = 2026
HOW = Singleton override store merged over the active profile budget

AGENTS:
DOCTOR
PRIME
AUDIT

LICENSE:
MIT
*/

import * as vscode from "vscode";
import type {
  RuntimeBudget,
  RuntimeBudgetOverrideKey,
  RuntimeBudgetOverrides,
} from "./performance.types";

class PerformanceOverridesStore {
  private overrides: RuntimeBudgetOverrides = {};
  private readonly onDidChangeEmitter = new vscode.EventEmitter<RuntimeBudgetOverrides>();
  readonly onDidChange = this.onDidChangeEmitter.event;

  setOverride(key: RuntimeBudgetOverrideKey, value: boolean): RuntimeBudgetOverrides {
    this.overrides = {
      ...this.overrides,
      [key]: value,
    };
    this.onDidChangeEmitter.fire(this.overrides);
    return this.overrides;
  }

  clearOverrides(): void {
    this.overrides = {};
    this.onDidChangeEmitter.fire(this.overrides);
  }

  getOverrides(): RuntimeBudgetOverrides {
    return { ...this.overrides };
  }

  getEffectiveBudget(baseBudget: RuntimeBudget): RuntimeBudget {
    return {
      ...baseBudget,
      ...this.overrides,
    };
  }
}

export const performanceOverridesStore = new PerformanceOverridesStore();

/*
DISCOVERY_PIPELINE:
Voice → Intent → Location → Vertical → Ranking → Render
*/