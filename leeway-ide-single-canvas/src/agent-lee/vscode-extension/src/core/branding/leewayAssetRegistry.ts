/*
LEEWAY_HEADER - DO NOT REMOVE

REGION: CORE
TAG: CORE.RUNTIME.EXTENSION.ASSET_REGISTRY
PURPOSE: Canonical LeeWay asset registry for package, installed, live-render, README, sidebar, and status-bar branding surfaces.
DISCOVERY_PIPELINE: Voice -> Intent -> Location -> Vertical -> Ranking -> Render
*/

import * as path from "path";
import * as vscode from "vscode";

export type LeeWayAssetId =
  | "LEEWAY_ASSET::PACKAGE_ICON"
  | "LEEWAY_ASSET::ACTIVITY_BAR_ICON"
  | "LEEWAY_ASSET::CHAT_HEADER_AVATAR"
  | "LEEWAY_ASSET::README_PRIMARY_LOGO"
  | "LEEWAY_ASSET::README_HEADER_IMAGE"
  | "LEEWAY_ASSET::README_SYSTEM_FLOW"
  | "LEEWAY_ASSET::SIDEBAR_TOP_RIGHT_BUTTON"
  | "LEEWAY_ASSET::SIDEBAR_BOTTOM_BUTTON"
  | "LEEWAY_ASSET::LEEWAY_STANDARDS_BUTTON"
  | "LEEWAY_ASSET::STATUS_BAR_MARK";

export type LeeWayAssetDefinition = {
  id: LeeWayAssetId;
  expectedFile: string;
  sourcePath: string;
  packagePath: string;
  installedPath: string;
  liveRenderTarget: string;
  ownerAgent: "AGENT_LEE";
  purpose: string;
  dimensions: string;
  format: "svg" | "png";
  fallbackBehavior: string;
  evidenceRequirement: string;
};

const ASSET_BASE = "media";

export const LEEWAY_ASSET_REGISTRY: Record<LeeWayAssetId, LeeWayAssetDefinition> = {
  "LEEWAY_ASSET::PACKAGE_ICON": {
    id: "LEEWAY_ASSET::PACKAGE_ICON",
    expectedFile: "leeway-standards-logo.png",
    sourcePath: `${ASSET_BASE}/leeway-standards-logo.png`,
    packagePath: `${ASSET_BASE}/leeway-standards-logo.png`,
    installedPath: `${ASSET_BASE}/leeway-standards-logo.png`,
    liveRenderTarget: "VS Code extension details package icon",
    ownerAgent: "AGENT_LEE",
    purpose: "Owner-facing extension package identity.",
    dimensions: "square raster icon",
    format: "png",
    fallbackBehavior: "Do not substitute the Activity Bar icon for the package icon.",
    evidenceRequirement: "Package metadata and installed extension check must agree."
  },
  "LEEWAY_ASSET::ACTIVITY_BAR_ICON": {
    id: "LEEWAY_ASSET::ACTIVITY_BAR_ICON",
    expectedFile: "leeway-activity.svg",
    sourcePath: `${ASSET_BASE}/leeway-activity.svg`,
    packagePath: `${ASSET_BASE}/leeway-activity.svg`,
    installedPath: `${ASSET_BASE}/leeway-activity.svg`,
    liveRenderTarget: "VS Code Activity Bar",
    ownerAgent: "AGENT_LEE",
    purpose: "Theme-safe Activity Bar surface identity.",
    dimensions: "24x24 monochrome viewBox icon",
    format: "svg",
    fallbackBehavior: "Must remain a currentColor-safe Activity Bar icon.",
    evidenceRequirement: "Asset check and live visual validation must agree."
  },
  "LEEWAY_ASSET::CHAT_HEADER_AVATAR": {
    id: "LEEWAY_ASSET::CHAT_HEADER_AVATAR",
    expectedFile: "agent-lee-chat-avatar.svg",
    sourcePath: `${ASSET_BASE}/agent-lee-chat-avatar.svg`,
    packagePath: `${ASSET_BASE}/agent-lee-chat-avatar.svg`,
    installedPath: `${ASSET_BASE}/agent-lee-chat-avatar.svg`,
    liveRenderTarget: "Chat header avatar and chat participant icon",
    ownerAgent: "AGENT_LEE",
    purpose: "Dedicated Agent Lee operator-facing avatar.",
    dimensions: "scalable square avatar",
    format: "svg",
    fallbackBehavior: "Do not substitute package or standards logo for the chat avatar.",
    evidenceRequirement: "Live runtime and installed asset checks must agree."
  },
  "LEEWAY_ASSET::README_PRIMARY_LOGO": {
    id: "LEEWAY_ASSET::README_PRIMARY_LOGO",
    expectedFile: "leeway-logo.svg",
    sourcePath: `${ASSET_BASE}/leeway-logo.svg`,
    packagePath: `${ASSET_BASE}/leeway-logo.svg`,
    installedPath: `${ASSET_BASE}/leeway-logo.svg`,
    liveRenderTarget: "README opening brand image",
    ownerAgent: "AGENT_LEE",
    purpose: "Primary LeeWay documentation logo.",
    dimensions: "scalable documentation logo",
    format: "svg",
    fallbackBehavior: "README starts with this logo before secondary imagery.",
    evidenceRequirement: "README source, package, installed, and live proof must agree."
  },
  "LEEWAY_ASSET::README_HEADER_IMAGE": {
    id: "LEEWAY_ASSET::README_HEADER_IMAGE",
    expectedFile: "readme-header.png",
    sourcePath: `${ASSET_BASE}/readme-header.png`,
    packagePath: `${ASSET_BASE}/readme-header.png`,
    installedPath: `${ASSET_BASE}/readme-header.png`,
    liveRenderTarget: "README feature header image",
    ownerAgent: "AGENT_LEE",
    purpose: "Primary README feature illustration.",
    dimensions: "responsive hero raster",
    format: "png",
    fallbackBehavior: "Must appear after explanation copy, not before the primary logo.",
    evidenceRequirement: "README proof must confirm presence and order."
  },
  "LEEWAY_ASSET::README_SYSTEM_FLOW": {
    id: "LEEWAY_ASSET::README_SYSTEM_FLOW",
    expectedFile: "readme-system-flow.png",
    sourcePath: `${ASSET_BASE}/readme-system-flow.png`,
    packagePath: `${ASSET_BASE}/readme-system-flow.png`,
    installedPath: `${ASSET_BASE}/readme-system-flow.png`,
    liveRenderTarget: "README system flow image",
    ownerAgent: "AGENT_LEE",
    purpose: "Documents the system flow visually.",
    dimensions: "responsive flow raster",
    format: "png",
    fallbackBehavior: "Must remain package-relative and render after the explanatory section.",
    evidenceRequirement: "README proof must confirm presence and order."
  },
  "LEEWAY_ASSET::SIDEBAR_TOP_RIGHT_BUTTON": {
    id: "LEEWAY_ASSET::SIDEBAR_TOP_RIGHT_BUTTON",
    expectedFile: "top-right-button-new.png",
    sourcePath: `${ASSET_BASE}/top-right-button-new.png`,
    packagePath: `${ASSET_BASE}/top-right-button-new.png`,
    installedPath: `${ASSET_BASE}/top-right-button-new.png`,
    liveRenderTarget: "Sidebar top-right brand button",
    ownerAgent: "AGENT_LEE",
    purpose: "Owner-facing sidebar brand action mark.",
    dimensions: "44x44 raster button target",
    format: "png",
    fallbackBehavior: "Must not be silently replaced by the bottom button or standards button.",
    evidenceRequirement: "Webview runtime and live visual proof must agree."
  },
  "LEEWAY_ASSET::SIDEBAR_BOTTOM_BUTTON": {
    id: "LEEWAY_ASSET::SIDEBAR_BOTTOM_BUTTON",
    expectedFile: "bottom-button-for-agent-lee.png",
    sourcePath: `${ASSET_BASE}/bottom-button-for-agent-lee.png`,
    packagePath: `${ASSET_BASE}/bottom-button-for-agent-lee.png`,
    installedPath: `${ASSET_BASE}/bottom-button-for-agent-lee.png`,
    liveRenderTarget: "Sidebar bottom Agent Lee button",
    ownerAgent: "AGENT_LEE",
    purpose: "Dedicated bottom owner-facing Agent Lee button.",
    dimensions: "44x44 raster button target",
    format: "png",
    fallbackBehavior: "Must remain distinct from top-right and standards buttons.",
    evidenceRequirement: "Webview runtime and live visual proof must agree."
  },
  "LEEWAY_ASSET::LEEWAY_STANDARDS_BUTTON": {
    id: "LEEWAY_ASSET::LEEWAY_STANDARDS_BUTTON",
    expectedFile: "leeway-standards-button.png",
    sourcePath: `${ASSET_BASE}/leeway-standards-button.png`,
    packagePath: `${ASSET_BASE}/leeway-standards-button.png`,
    installedPath: `${ASSET_BASE}/leeway-standards-button.png`,
    liveRenderTarget: "Sidebar standards button and command icon",
    ownerAgent: "AGENT_LEE",
    purpose: "Dedicated LeeWay standards brand action surface.",
    dimensions: "44x44 raster button target",
    format: "png",
    fallbackBehavior: "Must not be conflated with the package icon.",
    evidenceRequirement: "Asset check, manifest check, and live visual proof must agree."
  },
  "LEEWAY_ASSET::STATUS_BAR_MARK": {
    id: "LEEWAY_ASSET::STATUS_BAR_MARK",
    expectedFile: "leeway-standards-button.png",
    sourcePath: `${ASSET_BASE}/leeway-standards-button.png`,
    packagePath: `${ASSET_BASE}/leeway-standards-button.png`,
    installedPath: `${ASSET_BASE}/leeway-standards-button.png`,
    liveRenderTarget: "Status bar runtime mark",
    ownerAgent: "AGENT_LEE",
    purpose: "Status bar runtime-health-adjacent LeeWay mark reference.",
    dimensions: "status bar symbolic mark",
    format: "png",
    fallbackBehavior: "Status bar text remains authoritative even if the mark is not rendered separately.",
    evidenceRequirement: "Runtime attestation must identify the status bar surface truthfully."
  }
};

export function getLeewayAssetDefinition(id: LeeWayAssetId) {
  return LEEWAY_ASSET_REGISTRY[id];
}

export function getLeewayAssetRelativePath(id: LeeWayAssetId) {
  return getLeewayAssetDefinition(id).sourcePath;
}

export function getLeewayAssetFsPath(extensionRoot: string, id: LeeWayAssetId) {
  return path.join(extensionRoot, getLeewayAssetRelativePath(id));
}

export function resolveLeewayAssetWebviewUri(
  webview: vscode.Webview,
  extensionUri: vscode.Uri,
  id: LeeWayAssetId
) {
  const relative = getLeewayAssetRelativePath(id).split("/");
  return webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, ...relative));
}

export const LEEWAY_ASSET_IDS = Object.keys(LEEWAY_ASSET_REGISTRY) as LeeWayAssetId[];
