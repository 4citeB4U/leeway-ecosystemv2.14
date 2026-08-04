/*
LEEWAY_HEADER - DO NOT REMOVE

REGION: CORE
TAG: CORE.LIVEVOICE.COMMANDS.MAIN
DISCOVERY_PIPELINE: Voice -> Intent -> Location -> Vertical -> Ranking -> Render
*/

import * as vscode from "vscode";
import { AgentLeeLiveConversationController } from "./liveConversation.controller";
import { AgentLeeLiveProcessNarrator } from "./liveProcessNarrator";
import { agentLeeLiveTaskEvents } from "./liveTaskEvents";
import { AgentLeeTranscriptBridge } from "./liveTranscriptBridge";
import { voiceSessionStore } from "./liveVoiceSession.store";
import { summarizeTodaySession } from "./liveTranscript.receipts";
import { voiceCommandContext } from "./liveVoiceCommandContext";
import { registerAgentLeeVoiceRuntimeServices } from "../performance/runtimeServices";

export function registerAgentLeeLiveVoiceCommands(
  context: vscode.ExtensionContext,
  speak: (text: string) => void | Promise<void>
): void {
  const narrator = new AgentLeeLiveProcessNarrator(speak);
  const controller = new AgentLeeLiveConversationController(speak);
  const transcriptBridge = new AgentLeeTranscriptBridge({
    host: "127.0.0.1",
    port: 7671,
  });

  registerAgentLeeVoiceRuntimeServices(context, {
    transcriptBridge,
    narrator,
  });

  // Keep voiceCommandContext.activeEditorUri in sync
  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor((editor) => {
      voiceCommandContext.setActiveEditor(
        editor?.document.uri ?? null,
        editor?.document.languageId ?? null
      );
    })
  );
  // Seed with whatever is already open
  const initialEditor = vscode.window.activeTextEditor;
  if (initialEditor) {
    voiceCommandContext.setActiveEditor(
      initialEditor.document.uri,
      initialEditor.document.languageId
    );
  }

  context.subscriptions.push(
    agentLeeLiveTaskEvents.onEvent((event) => {
      void narrator.narrate(event).catch((error) => {
        console.error("[AGENT_LEE_LIVE_VOICE_ERROR]", error);
      });
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "agentLee.liveVoice.handleTranscript",
      async (text: string) => {
        const handled = await vscode.commands.executeCommand<boolean>("agentLee.voiceBridge.handleTranscript", {
          type: "VOICE_TRANSCRIPT",
          transcriptId: "",
          text,
          isFinal: true,
          timestamp: new Date().toISOString(),
          source: "local-transcript"
        });
        if (!handled) {
          await controller.handleTranscript(text);
        }
      }
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "agentLee.liveVoice.speakStatus",
      async (text: string) => {
        await speak(text);
      }
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "agentLee.liveVoice.startTranscriptBridge",
      async () => {
        const alreadyRunning = await transcriptBridge.start();
        return {
          alreadyRunning,
          started: !alreadyRunning,
          url: transcriptBridge.getUrl()
        };
      }
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "agentLee.liveVoice.stopTranscriptBridge",
      async () => {
        await transcriptBridge.stop();
        return {
          stopped: true,
          url: transcriptBridge.getUrl()
        };
      }
    )
  );

  context.subscriptions.push({
    dispose() {
      transcriptBridge.stop().catch(() => {});
    },
  });

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "agentLee.liveVoice.emitEvent",
      async (
        type: Parameters<typeof agentLeeLiveTaskEvents.emit>[0],
        message: string,
        options?: Parameters<typeof agentLeeLiveTaskEvents.emit>[2]
      ) => {
        agentLeeLiveTaskEvents.emit(type, message, options);
      }
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "agentLee.liveVoice.stopSpeaking",
      async () => {
        voiceSessionStore.setPhase("idle");
        await speak("Stopping.");
      }
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "agentLee.liveVoice.pauseTask",
      () => {
        voiceSessionStore.setPhase("paused");
        agentLeeLiveTaskEvents.emit(
          "task.finished",
          "Task paused. Say resume or continue when you are ready.",
          { severity: "warning", speak: true }
        );
      }
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "agentLee.liveVoice.resumeTask",
      () => {
        voiceSessionStore.setPhase("listening");
        agentLeeLiveTaskEvents.emit(
          "task.started",
          "Resuming. Go ahead.",
          { severity: "info", speak: true }
        );
      }
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "agentLee.liveVoice.currentStatus",
      async () => {
        const summary = voiceSessionStore.summarize();
        await speak(summary);
      }
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "agentLee.liveVoice.reopenActiveDiff",
      async () => {
        await vscode.commands
          .executeCommand("agentLee.editBuffer.openActiveDiff")
          .then(
            undefined,
            () => speak("No active diff is available right now.")
          );
      }
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "agentLee.liveVoice.sessionSummary",
      async () => {
        const summary = summarizeTodaySession();
        await speak(summary);
      }
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "agentLee.liveVoice.blockFile",
      async (filePath: string) => {
        voiceCommandContext.blockFile(filePath);
        agentLeeLiveTaskEvents.emit(
          "task.finished",
          `Got it. I will not touch ${filePath} in this session.`,
          { severity: "warning", speak: true }
        );
      }
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "agentLee.liveVoice.unblockFile",
      async (filePath: string) => {
        voiceCommandContext.unblockFile(filePath);
        agentLeeLiveTaskEvents.emit(
          "task.started",
          `${filePath} is no longer blocked.`,
          { severity: "info", speak: true }
        );
      }
    )
  );

  context.subscriptions.push({
    dispose() {
      voiceSessionStore.dispose();
      voiceCommandContext.dispose();
    },
  });
}
