/*
LEEWAY HEADER - DO NOT REMOVE

REGION: CORE
TAG: CORE.EDIT_BUFFER.STORE.MAIN
DISCOVERY_PIPELINE: Voice -> Intent -> Location -> Vertical -> Ranking -> Render
*/

import * as vscode from "vscode";
import type { AgentLeeEditHunk, AgentLeeEditPackage, AgentLeeFileEdit, AgentLeeEditStatus } from "./editBuffer.types";

export function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

class EditBufferStore {
  private readonly packages = new Map<string, AgentLeeEditPackage>();
  private activePackageId = "";
  private readonly onDidChangeEmitter = new vscode.EventEmitter<void>();
  readonly onDidChange = this.onDidChangeEmitter.event;

  private emitChange() {
    this.onDidChangeEmitter.fire();
  }

  createPackage(title: string, objective: string) {
    const stamp = new Date().toISOString();
    const pkg: AgentLeeEditPackage = {
      id: createId("pkg"),
      title,
      objective,
      status: "pending",
      files: [],
      createdAt: stamp,
      updatedAt: stamp
    };
    this.packages.set(pkg.id, pkg);
    this.activePackageId = pkg.id;
    this.emitChange();
    return pkg;
  }

  addFileEdit(packageId: string, fileEdit: AgentLeeFileEdit) {
    const pkg = this.packages.get(packageId);
    if (!pkg) throw new Error(`Unknown edit package: ${packageId}`);
    pkg.files.push(fileEdit);
    pkg.updatedAt = new Date().toISOString();
    this.activePackageId = packageId;
    this.emitChange();
    return pkg;
  }

  getPackage(packageId: string) {
    return this.packages.get(packageId);
  }

  getActivePackage() {
    return this.activePackageId ? this.packages.get(this.activePackageId) : undefined;
  }

  getFileEdit(packageId: string, fileId: string) {
    return this.packages.get(packageId)?.files.find((file) => file.id === fileId);
  }

  findFile(packageId: string, fileId: string) {
    return this.getFileEdit(packageId, fileId);
  }

  findHunk(packageId: string, fileId: string, hunkId: string) {
    return this.getFileEdit(packageId, fileId)?.hunks.find((hunk) => hunk.id === hunkId);
  }

  listPackages() {
    return this.allPackages();
  }

  allPackages() {
    return Array.from(this.packages.values());
  }

  updateHunkStatus(packageId: string, fileId: string, hunkId: string, status: AgentLeeEditStatus) {
    const pkg = this.getPackage(packageId);
    const file = this.getFileEdit(packageId, fileId);
    const hunk = this.findHunk(packageId, fileId, hunkId);
    if (!pkg || !file || !hunk) return;

    const stamp = new Date().toISOString();
    hunk.status = status;
    hunk.updatedAt = stamp;

    const allAccepted = file.hunks.every((item) => item.status === "accepted" || item.status === "applied");
    const allRejected = file.hunks.every((item) => item.status === "rejected");
    const anyFailed = file.hunks.some((item) => item.status === "failed");
    const hasPending = file.hunks.some((item) => item.status === "pending");
    file.status = anyFailed ? "failed" : allAccepted ? "accepted" : allRejected ? "rejected" : hasPending ? "pending" : file.status;
    file.updatedAt = stamp;
    pkg.updatedAt = stamp;
    this.activePackageId = packageId;
    this.emitChange();
  }

  updateFileStatus(packageId: string, fileId: string, status: AgentLeeEditStatus) {
    const pkg = this.getPackage(packageId);
    const file = this.getFileEdit(packageId, fileId);
    if (!pkg || !file) return;

    const stamp = new Date().toISOString();
    file.status = status;
    file.updatedAt = stamp;
    for (const hunk of file.hunks) {
      if (hunk.status === "pending" || status === "rejected" || status === "accepted") {
        hunk.status = status;
        hunk.updatedAt = stamp;
      }
    }
    pkg.updatedAt = stamp;
    this.activePackageId = packageId;
    this.emitChange();
  }

  acceptAll(packageId: string) {
    const pkg = this.getPackage(packageId);
    if (!pkg) return;
    const stamp = new Date().toISOString();
    for (const file of pkg.files) {
      file.status = "accepted";
      file.updatedAt = stamp;
      for (const hunk of file.hunks) {
        if (hunk.status === "pending") {
          hunk.status = "accepted";
          hunk.updatedAt = stamp;
        }
      }
    }
    pkg.status = "accepted";
    pkg.updatedAt = stamp;
    this.activePackageId = packageId;
    this.emitChange();
  }
}

export const editBufferStore = new EditBufferStore();
