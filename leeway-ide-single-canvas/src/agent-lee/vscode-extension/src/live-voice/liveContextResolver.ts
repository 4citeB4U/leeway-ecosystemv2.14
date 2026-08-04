/*
LEEWAY HEADER — DO NOT REMOVE

REGION: 🟢 CORE
TAG: CORE.LIVEVOICE.CONTEXT.RESOLVER

5WH:
WHAT = Agent Lee live voice context resolver
WHY = Resolve pronouns and anaphora in spoken commands ("this", "that one", "the last repair", "what failed") into concrete VS Code objects and actionable summaries
WHO = Agent Lee Live Voice Runtime
WHERE = src/live-voice/liveContextResolver.ts
WHEN = 2026
HOW = Reads from voiceCommandContext and editBufferStore; returns ResolvedContext used by the conversation controller

AGENTS:
PRIME
VOICE
SHIELD
AUDIT

LICENSE:
MIT
*/

import * as vscode from "vscode";
import { voiceCommandContext } from "./liveVoiceCommandContext";
import { editBufferStore } from "../edit-buffer/editBuffer.store";

export interface ResolvedContext {
  /** The URI being referred to, if determinable */
  uri: vscode.Uri | null;
  /** Short label for speech ("the active file", "EditBuffer.store.ts", etc.) */
  label: string;
  /** The edit package in focus, if any */
  packageId: string | null;
  /** The file edit in focus, if any */
  fileEditId: string | null;
  /** The hunk in focus, if any */
  hunkId: string | null;
  /** Spoken summary of whatever "this" refers to */
  spokenSummary: string;
  /** Whether the context could be resolved to something concrete */
  resolved: boolean;
}

/** Pronoun / anaphora patterns that need contextual resolution */
const THIS_RE = /\b(this|that|this one|that one|it|the current|the active)\b/i;
const LAST_REPAIR_RE = /\b(last repair|repair package|the repair|last fix)\b/i;
const LAST_VERIFICATION_RE = /\b(last (verification|compile|verify|check)|what failed|errors|failures)\b/i;
const LAST_SPEECH_RE = /\b(what you (just )?said|go back|repeat that|say that again)\b/i;
const ACTIVE_FILE_RE = /\b(active file|current file|this file|open file)\b/i;
const ACTIVE_HUNK_RE = /\b(active hunk|current hunk|this hunk|that hunk|this change)\b/i;
const ACTIVE_PACKAGE_RE = /\b(active package|current package|pending package|edit package)\b/i;
const DONT_TOUCH_RE = /\b(don['']?t (touch|change|edit|modify)|leave|skip|exclude|block)\b/i;

export interface ContextResolverResult {
  context: ResolvedContext;
  /** Whether the phrase contains a block-file intent */
  blockFileIntent: boolean;
  /** Whether the phrase asks to explain/describe context */
  explainIntent: boolean;
  /** Whether the phrase asks what failed */
  whatFailedIntent: boolean;
  /** Whether the phrase asks Agent Lee to repeat */
  repeatIntent: boolean;
}

export function resolveContext(transcript: string): ContextResolverResult {
  const snap = voiceCommandContext.get();
  const activePackage = editBufferStore.getActivePackage();

  const blockFileIntent = DONT_TOUCH_RE.test(transcript);
  const explainIntent = /\b(explain|walk me through|what is|describe|tell me about)\b/i.test(transcript);
  const whatFailedIntent = LAST_VERIFICATION_RE.test(transcript);
  const repeatIntent = LAST_SPEECH_RE.test(transcript);

  // Resolve "what failed" / verification context
  if (whatFailedIntent) {
    const summary = snap.lastVerificationSummary;
    return {
      context: {
        uri: null,
        label: "last verification result",
        packageId: snap.activePackageId,
        fileEditId: null,
        hunkId: null,
        spokenSummary: summary
          ? `Here is what happened last time: ${summary}`
          : "I do not have a recent verification result yet.",
        resolved: !!summary,
      },
      blockFileIntent: false,
      explainIntent: false,
      whatFailedIntent: true,
      repeatIntent: false,
    };
  }

  // Resolve "what you just said" / repeat intent
  if (repeatIntent) {
    const last = snap.lastAgentSpeech;
    return {
      context: {
        uri: null,
        label: "last spoken message",
        packageId: null,
        fileEditId: null,
        hunkId: null,
        spokenSummary: last ? last : "I do not have a recent message to repeat.",
        resolved: !!last,
      },
      blockFileIntent: false,
      explainIntent: false,
      whatFailedIntent: false,
      repeatIntent: true,
    };
  }

  // Resolve "last repair" context
  if (LAST_REPAIR_RE.test(transcript)) {
    const repairId = snap.lastRepairPackageId;
    const repairPkg = repairId ? editBufferStore.getPackage(repairId) : undefined;
    return {
      context: {
        uri: null,
        label: repairPkg ? repairPkg.title : "last repair package",
        packageId: repairId,
        fileEditId: null,
        hunkId: null,
        spokenSummary: repairPkg
          ? `The last repair package is "${repairPkg.title}" with ${repairPkg.files.length} file${repairPkg.files.length !== 1 ? "s" : ""}.`
          : "I do not have a recent repair package.",
        resolved: !!repairPkg,
      },
      blockFileIntent,
      explainIntent,
      whatFailedIntent: false,
      repeatIntent: false,
    };
  }

  // Resolve active hunk
  if (ACTIVE_HUNK_RE.test(transcript) || (THIS_RE.test(transcript) && snap.activeHunkId)) {
    const hunkId = snap.activeHunkId;
    const pkgId = snap.activePackageId;
    const fileId = snap.activeFileEditId;
    const hunk =
      pkgId && fileId && hunkId
        ? editBufferStore.findHunk(pkgId, fileId, hunkId)
        : undefined;
    return {
      context: {
        uri: snap.activeEditorUri,
        label: hunk ? `hunk: ${hunk.title}` : "active hunk",
        packageId: pkgId,
        fileEditId: fileId,
        hunkId,
        spokenSummary: hunk
          ? `The active hunk is "${hunk.title}" — ${hunk.reason}. Risk is ${hunk.risk}.`
          : "I do not have an active hunk in focus.",
        resolved: !!hunk,
      },
      blockFileIntent,
      explainIntent,
      whatFailedIntent: false,
      repeatIntent: false,
    };
  }

  // Resolve active package
  if (ACTIVE_PACKAGE_RE.test(transcript)) {
    const pkg = activePackage;
    return {
      context: {
        uri: null,
        label: pkg ? pkg.title : "active package",
        packageId: pkg?.id ?? null,
        fileEditId: null,
        hunkId: null,
        spokenSummary: pkg
          ? `The active edit package is "${pkg.title}" with ${pkg.files.length} file${pkg.files.length !== 1 ? "s" : ""} and status ${pkg.status}.`
          : "There is no active edit package right now.",
        resolved: !!pkg,
      },
      blockFileIntent,
      explainIntent,
      whatFailedIntent: false,
      repeatIntent: false,
    };
  }

  // Resolve active file
  if (ACTIVE_FILE_RE.test(transcript) || THIS_RE.test(transcript)) {
    const uri = snap.activeEditorUri;
    const fileName = uri ? vscode.workspace.asRelativePath(uri) : null;
    return {
      context: {
        uri,
        label: fileName ?? "active file",
        packageId: snap.activePackageId,
        fileEditId: snap.activeFileEditId,
        hunkId: null,
        spokenSummary: fileName
          ? `The active file is ${fileName}.`
          : "There is no active file open right now.",
        resolved: !!uri,
      },
      blockFileIntent,
      explainIntent,
      whatFailedIntent: false,
      repeatIntent: false,
    };
  }

  // Fallback: no context determinable
  return {
    context: {
      uri: snap.activeEditorUri,
      label: "current context",
      packageId: snap.activePackageId,
      fileEditId: snap.activeFileEditId,
      hunkId: snap.activeHunkId,
      spokenSummary: "I am not sure what you are referring to. Can you be more specific?",
      resolved: false,
    },
    blockFileIntent,
    explainIntent,
    whatFailedIntent: false,
    repeatIntent: false,
  };
}

/**
 * Extract a file path mentioned in a "don't touch X" phrase.
 * Returns the extracted path segment or null if none found.
 */
export function extractBlockedFilePath(transcript: string): string | null {
  // Match patterns like "don't touch package.json" or "exclude src/foo.ts"
  const match = /\b(?:don['']?t (?:touch|change|edit|modify)|leave|skip|exclude|block)\s+([^\s,.]+)/i.exec(
    transcript
  );
  return match ? match[1] : null;
}

/*
DISCOVERY_PIPELINE:
Voice → Intent → Location → Vertical → Ranking → Render
*/
