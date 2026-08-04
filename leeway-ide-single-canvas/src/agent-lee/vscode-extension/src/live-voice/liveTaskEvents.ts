/*
LEEWAY_HEADER - DO NOT REMOVE

REGION: CORE
TAG: CORE.LIVEVOICE.EVENTBUS.MAIN
DISCOVERY_PIPELINE: Voice -> Intent -> Location -> Vertical -> Ranking -> Render
*/

import * as vscode from "vscode";
import type { AgentLeeLiveEvent, AgentLeeLiveEventType } from "./liveVoice.types";

class AgentLeeLiveTaskEventBus {
  private readonly onEventEmitter = new vscode.EventEmitter<AgentLeeLiveEvent>();
  readonly onEvent = this.onEventEmitter.event;

  emit(
    type: AgentLeeLiveEventType,
    message: string,
    options: {
      severity?: AgentLeeLiveEvent["severity"];
      speak?: boolean;
      data?: Record<string, unknown>;
    } = {}
  ): void {
    this.onEventEmitter.fire({
      id: `lee_evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      type,
      message,
      severity: options.severity ?? "info",
      speak: options.speak ?? true,
      data: options.data,
      timestamp: new Date().toISOString()
    });
  }
}

export const agentLeeLiveTaskEvents = new AgentLeeLiveTaskEventBus();
