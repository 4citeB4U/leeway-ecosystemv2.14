/*
LEEWAY HEADER - DO NOT REMOVE

REGION: CORE
TAG: CORE.EDIT_BUFFER.DIFF_PROVIDER.MAIN
DISCOVERY_PIPELINE: Voice -> Intent -> Location -> Vertical -> Ranking -> Render
*/

import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import * as vscode from "vscode";
import { editBufferStore } from "./editBuffer.store";

const DIFF_DIR = path.join(os.tmpdir(), "agent-lee-edit-buffer");
fs.mkdirSync(DIFF_DIR, { recursive: true });

function previewPathFor(packageId: string, fileId: string, originalPath: string) {
  return path.join(DIFF_DIR, `${packageId}-${fileId}-${path.basename(originalPath)}.preview`);
}

export async function openAgentLeeDiff(packageId: string, fileId: string) {
  const fileEdit = editBufferStore.getFileEdit(packageId, fileId);
  if (!fileEdit) {
    throw new Error(`Unknown file edit: ${packageId}/${fileId}`);
  }

  const previewPath = previewPathFor(packageId, fileId, fileEdit.uri.fsPath);
  fs.writeFileSync(previewPath, fileEdit.proposedText, "utf8");

  await vscode.commands.executeCommand(
    "vscode.diff",
    fileEdit.uri,
    vscode.Uri.file(previewPath),
    `Agent Lee Pending Edit: ${fileEdit.path}`,
    { preview: true }
  );
}
