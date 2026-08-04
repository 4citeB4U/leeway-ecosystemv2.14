/*
LEEWAY HEADER — DO NOT REMOVE

REGION: 🟢 CORE
TAG: CORE.LIVEVOICE.TRANSCRIPT.BRIDGE

5WH:
WHAT = Agent Lee local transcript bridge
WHY = Allows local STT/mic systems to send live transcripts into Agent Lee without WebView microphone capture
WHO = Agent Lee Live Voice Runtime
WHERE = src/live-voice/liveTranscriptBridge.ts
WHEN = 2026
HOW = Localhost-only HTTP bridge that dispatches transcripts into VS Code command routing

AGENTS:
PRIME
VOICE
SHIELD
AUDIT

LICENSE:
MIT
*/

import * as http from "http";
import * as vscode from "vscode";
import { agentLeeLiveTaskEvents } from "./liveTaskEvents";
import { performanceGovernor } from "../performance/performanceGovernor";
import { runtimeBudgetStore } from "../performance/runtimeBudget.store";
import {
  containsBlockedStatusPhrase,
  createVoiceEventId,
  type LeeWayVoiceBridgeMessage
} from "../core/voice/leewayVoiceTruth";

export interface TranscriptBridgeOptions {
  port?: number;
  host?: string;
  token?: string;
}

export class AgentLeeTranscriptBridge {
  private server: http.Server | null = null;
  private readonly host: string;
  private readonly port: number;
  private readonly token?: string;

  constructor(options: TranscriptBridgeOptions = {}) {
    this.host = options.host ?? "127.0.0.1";
    this.port = options.port ?? 7671;
    this.token = options.token;
  }

  start(): Promise<boolean> {
    if (this.server) {
      return Promise.resolve(true);
    }

    this.server = http.createServer(async (req, res) => {
      try {
        await this.handleRequest(req, res);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: false, error: message }));
      }
    });

    return new Promise((resolve, reject) => {
      this.server!.once("error", reject);
      this.server!.listen(this.port, this.host, () => {
        agentLeeLiveTaskEvents.emit(
          "task.started",
          `Local transcript bridge is listening on ${this.host}:${this.port}.`,
          { severity: "success", speak: false }
        );
        resolve(false);
      });
    });
  }

  stop(): Promise<void> {
    if (!this.server) {
      return Promise.resolve();
    }

    const activeServer = this.server;
    this.server = null;

    return new Promise((resolve) => {
      activeServer.close(() => {
        agentLeeLiveTaskEvents.emit(
          "task.finished",
          "Local transcript bridge stopped.",
          { severity: "info", speak: false }
        );
        resolve();
      });
    });
  }

  isRunning(): boolean {
    return !!this.server;
  }

  getUrl(): string {
    return `http://${this.host}:${this.port}/transcript`;
  }

  private async handleRequest(
    req: http.IncomingMessage,
    res: http.ServerResponse
  ): Promise<void> {
    if (req.method === "GET" && req.url === "/health") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          ok: true,
          service: "agent-lee-transcript-bridge",
          running: true,
        })
      );
      return;
    }

    if (req.method === "GET" && req.url === "/performance/status") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          ok: true,
          profile: performanceGovernor.getProfile(),
          overrides: performanceGovernor.getOverrides(),
          budget: performanceGovernor.getBudget(),
          snapshot: performanceGovernor.getSnapshot(),
        })
      );
      return;
    }

    if (req.method !== "POST" || req.url !== "/transcript") {
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: false, error: "Not found" }));
      return;
    }

    if (this.token) {
      const auth = req.headers.authorization ?? "";
      const expected = `Bearer ${this.token}`;
      if (auth !== expected) {
        res.writeHead(401, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: false, error: "Unauthorized" }));
        return;
      }
    }

    const body = await readJsonBody(req);
    const parsed = parseBridgeMessage(body);
    const budget = runtimeBudgetStore.getBudget();

    if (parsed.type === "VOICE_STATUS") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true, accepted: false, classifiedAs: "VOICE_STATUS", status: parsed.status }));
      return;
    }

    if (parsed.type === "VOICE_ERROR") {
      await vscode.commands.executeCommand("agentLee.voiceBridge.handleRuntimeStatus", parsed);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true, accepted: false, classifiedAs: "VOICE_ERROR", errorId: parsed.errorId }));
      return;
    }

    const text = String(parsed.text || "").trim();
    if (!text) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: false, error: "Missing transcript text." }));
      return;
    }

    if (text.length > budget.maxTranscriptChars) {
      res.writeHead(413, { "Content-Type": "application/json" });
      res.end(JSON.stringify({
        ok: false,
        error: `Transcript too large for ${budget.profile} profile.`
      }));
      return;
    }

    const handled = await vscode.commands.executeCommand<boolean>(
      "agentLee.voiceBridge.handleTranscript",
      parsed
    );
    if (!handled) {
      await vscode.commands.executeCommand(
        "agentLee.liveVoice.handleTranscript",
        text
      );
    }

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true, accepted: true, classifiedAs: "VOICE_TRANSCRIPT", transcriptId: parsed.transcriptId, text }));
  }
}

function parseBridgeMessage(body: Record<string, unknown>): LeeWayVoiceBridgeMessage {
  const timestamp = String(body.timestamp || new Date().toISOString());
  const rawType = String(body.type || "").toUpperCase();
  const text = String(body.text || body.message || "").trim();

  if (rawType === "STATUS" || rawType === "VOICE_STATUS" || containsBlockedStatusPhrase(text)) {
    return {
      type: "VOICE_STATUS",
      status: String(body.status || "LOCAL_TRANSCRIPT_AVAILABLE") as any,
      message: text || "Local transcript bridge is available.",
      timestamp,
      source: "local-bridge"
    };
  }

  if (rawType === "ERROR" || rawType === "VOICE_ERROR") {
    return {
      type: "VOICE_ERROR",
      errorId: String(body.errorId || createVoiceEventId("voice-error")),
      message: text || "Local transcript bridge error.",
      timestamp,
      source: String(body.source || "local-bridge")
    };
  }

  return {
    type: "VOICE_TRANSCRIPT",
    transcriptId: String(body.transcriptId || createVoiceEventId("voice-transcript")),
    text,
    confidence: typeof body.confidence === "number" ? body.confidence : undefined,
    isFinal: body.isFinal === undefined ? true : Boolean(body.isFinal),
    timestamp,
    source: "local-transcript"
  };
}

function readJsonBody(
  req: http.IncomingMessage
): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    let raw = "";

    req.on("data", (chunk: Buffer) => {
      raw += chunk.toString();
      if (raw.length > 1024 * 1024) {
        reject(new Error("Transcript payload too large."));
        req.destroy();
      }
    });

    req.on("end", () => {
      try {
        resolve(raw ? (JSON.parse(raw) as Record<string, unknown>) : {});
      } catch {
        reject(new Error("Invalid JSON body."));
      }
    });

    req.on("error", reject);
  });
}

/*
DISCOVERY_PIPELINE:
Voice → Intent → Location → Vertical → Ranking → Render
*/
