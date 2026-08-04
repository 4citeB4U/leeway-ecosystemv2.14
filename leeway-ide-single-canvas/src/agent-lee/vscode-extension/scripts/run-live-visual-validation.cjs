/*
LEEWAY_HEADER - DO NOT REMOVE
REGION: CORE
TAG: CORE.RUNTIME.EXTENSION.LIVE_VISUAL_VALIDATION.RUNNER
PURPOSE: Connects to a live VS Code window over CDP, validates Agent Lee branding surfaces, and writes truthful runtime evidence.
DISCOVERY_PIPELINE: Voice -> Intent -> Location -> Vertical -> Ranking -> Render
*/

const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright-core");
const { PNG } = require("pngjs");

const evidencePath = process.env.LEEWAY_LIVE_VISUAL_EVIDENCE_PATH;
const screenshotsDir = process.env.LEEWAY_LIVE_VISUAL_SCREENSHOTS_DIR;
const cdpPort = Number(process.env.LEEWAY_LIVE_VISUAL_CDP_PORT || "0");
const extensionDir = process.env.LEEWAY_LIVE_VISUAL_EXTENSION_DIR;
const installedCheckPath =
  process.env.LEEWAY_LIVE_VISUAL_INSTALLED_CHECK_PATH ||
  path.join(extensionDir, "test-evidence", "leeway-installed-extension-check-result.json");

if (!evidencePath || !screenshotsDir || !cdpPort || !extensionDir) {
  throw new Error("Missing required live validation environment variables.");
}

fs.mkdirSync(path.dirname(evidencePath), { recursive: true });
fs.mkdirSync(screenshotsDir, { recursive: true });

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function readJsonSafe(targetPath) {
  if (!fs.existsSync(targetPath)) {
    return null;
  }
  const content = fs.readFileSync(targetPath, "utf8").replace(/^\uFEFF/, "");
  return JSON.parse(content);
}

async function connectWithRetries(endpointUrl, maxAttempts) {
  let lastError = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await chromium.connectOverCDP(endpointUrl);
    } catch (error) {
      lastError = error;
      await sleep(1000);
    }
  }
  throw lastError || new Error(`Unable to connect to ${endpointUrl}.`);
}

function parseStatusLabel(statusLabel) {
  const updateChannelMatch = statusLabel.match(/Update channel:\s*([A-Z0-9_]+)/i);
  const runtimeStatusMatch = statusLabel.match(/Installed runtime status:\s*([A-Za-z0-9_-]+)/i);
  return {
    runtimeSourceMode: updateChannelMatch ? updateChannelMatch[1] : "UNKNOWN",
    installedRuntimeStatus: runtimeStatusMatch ? runtimeStatusMatch[1] : "unknown"
  };
}

async function findShellPage(browser, maxAttempts) {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    for (const context of browser.contexts()) {
      for (const page of context.pages()) {
        try {
          const title = await page.title();
          if (title && /Visual Studio Code/i.test(title)) {
            return page;
          }
        } catch {
          // Keep polling while VS Code is booting.
        }
      }
    }
    await sleep(1000);
  }
  throw new Error("Could not locate the live VS Code shell page.");
}

async function firstVisibleLocator(page, selectors) {
  for (const selector of selectors) {
    const locator = page.locator(selector).first();
    try {
      if (await locator.isVisible({ timeout: 1500 })) {
        return locator;
      }
    } catch {
      // Try the next selector.
    }
  }
  return null;
}

async function analyzePng(targetPath) {
  const png = PNG.sync.read(fs.readFileSync(targetPath));
  let nonTransparentPixels = 0;
  const colors = new Set();

  for (let offset = 0; offset < png.data.length; offset += 4) {
    const r = png.data[offset];
    const g = png.data[offset + 1];
    const b = png.data[offset + 2];
    const a = png.data[offset + 3];
    if (a > 16) {
      nonTransparentPixels += 1;
      colors.add(`${r},${g},${b},${a}`);
    }
  }

  const totalPixels = png.width * png.height;
  return {
    width: png.width,
    height: png.height,
    totalPixels,
    nonTransparentPixels,
    nonTransparentRatio: totalPixels > 0 ? nonTransparentPixels / totalPixels : 0,
    distinctColorCount: colors.size
  };
}

async function executeCommand(page, commandLabel) {
  await page.keyboard.press("Control+Shift+P");
  const input = page.locator(".quick-input-widget input").last();
  await input.waitFor({ state: "visible", timeout: 15000 });
  await input.fill("");
  await input.type(commandLabel, { delay: 15 });
  await page.waitForTimeout(500);
  await page.keyboard.press("Enter");
  await page.waitForTimeout(1800);
}

async function waitForFrame(page, predicate, timeoutMs) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const match = page.frames().find(predicate);
    if (match) {
      return match;
    }
    await page.waitForTimeout(500);
  }
  return null;
}

async function dismissWelcomeOverlay(page) {
  const overlay = page.locator('[aria-label="Welcome to Visual Studio Code"]').first();
  try {
    if (await overlay.isVisible({ timeout: 3000 })) {
      for (let attempt = 0; attempt < 3; attempt += 1) {
        await page.keyboard.press("Escape");
        await page.waitForTimeout(600);
        if (!(await overlay.isVisible().catch(() => false))) {
          return;
        }
      }
    }
  } catch {
    // No overlay was present.
  }
}

async function collectImageInfo(frame, altText) {
  const locator = frame.locator(`img[alt="${altText}"]`).first();
  try {
    await locator.waitFor({ state: "visible", timeout: 15000 });
    const info = await locator.evaluate((element) => ({
      src: element.getAttribute("src") || "",
      naturalWidth: element.naturalWidth || 0,
      naturalHeight: element.naturalHeight || 0,
      clientWidth: element.clientWidth || 0,
      clientHeight: element.clientHeight || 0,
      complete: !!element.complete
    }));
    return {
      alt: altText,
      visible: true,
      src: info.src,
      naturalWidth: info.naturalWidth,
      naturalHeight: info.naturalHeight,
      clientWidth: info.clientWidth,
      clientHeight: info.clientHeight,
      complete: info.complete
    };
  } catch {
    return {
      alt: altText,
      visible: false,
      src: "",
      naturalWidth: 0,
      naturalHeight: 0,
      clientWidth: 0,
      clientHeight: 0,
      complete: false
    };
  }
}

async function findFrameContainingImageAlt(page, altText, timeoutMs) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    for (const frame of page.frames()) {
      try {
        const locator = frame.locator(`img[alt="${altText}"]`).first();
        if (await locator.isVisible({ timeout: 500 })) {
          return frame;
        }
      } catch {
        // Keep scanning.
      }
    }
    await page.waitForTimeout(500);
  }
  return null;
}

async function findAgentLeeChatFrame(page, timeoutMs) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const directMatch = page.frames().find((frame) => {
      const url = frame.url();
      return url.includes("extensionId=leeway.agent-lee-leeway-coding-system") &&
        (url.includes("purpose=webviewView") || url.includes("purpose=webviewPanel") || url.includes("agentLeeRuntimePanel"));
    });
    if (directMatch) {
      return directMatch;
    }
    const avatarMatch = await findFrameContainingImageAlt(page, "Agent Lee chat avatar", 800);
    if (avatarMatch) {
      return avatarMatch;
    }
    await page.waitForTimeout(500);
  }
  return null;
}

async function main() {
  const installedCheck = readJsonSafe(installedCheckPath) || {};
  const packageJson = readJsonSafe(path.join(extensionDir, "package.json")) || {};
  const endpointUrl = `http://127.0.0.1:${cdpPort}`;
  const browser = await connectWithRetries(endpointUrl, 45);

  let result;

  try {
    const page = await findShellPage(browser, 45);
    await page.bringToFront();
    await page.waitForTimeout(3000);
    await dismissWelcomeOverlay(page);

    const statusBarLocator = await firstVisibleLocator(page, [
      '[aria-label*="Agent Lee runtime status"]',
      '[aria-label*="Agent Lee: Booting"]',
      '[aria-label*="Agent Lee: Ready"]',
      '[aria-label*="Agent Lee: Degraded"]',
      '[aria-label*="Agent Lee: Stale"]',
      '[aria-label*="Runtime Health:"]',
      '[aria-label*="installed=current"]',
      '[aria-label*="installed=stale"]'
    ]);
    if (!statusBarLocator) {
      throw new Error("Agent Lee status bar item was not visible in the live VS Code shell.");
    }

    const statusBarAriaLabel = (await statusBarLocator.getAttribute("aria-label")) || "";
    const statusSummary = parseStatusLabel(statusBarAriaLabel);

    const activityBarLocator = await firstVisibleLocator(page, [
      '.part.activitybar [aria-label="Agent Lee"]',
      '.part.activitybar [aria-label^="Agent Lee"]',
      '[role="tab"][aria-label="Agent Lee"]',
      '[role="tab"][aria-label^="Agent Lee"]'
    ]);
    if (!activityBarLocator) {
      throw new Error("The Agent Lee Activity Bar icon was not visible in the live VS Code shell.");
    }

    const activityBarScreenshotPath = path.join(screenshotsDir, "vscode-live-activitybar-icon.png");
    await activityBarLocator.screenshot({ path: activityBarScreenshotPath });
    const activityBarPngAnalysis = await analyzePng(activityBarScreenshotPath);
    const activityBarIconNotBlank =
      activityBarPngAnalysis.nonTransparentRatio > 0.05 && activityBarPngAnalysis.distinctColorCount > 1;

    await statusBarLocator.click();
    let chatFrame = await findAgentLeeChatFrame(page, 8000);
    if (!chatFrame) {
      await executeCommand(page, "Agent Lee: Open Right Surface");
      chatFrame = await findAgentLeeChatFrame(page, 8000);
    }
    if (!chatFrame) {
      await executeCommand(page, "Agent Lee: Open Sidebar");
      chatFrame = await findAgentLeeChatFrame(page, 12000);
    }
    if (!chatFrame) {
      const frameUrls = page.frames().map((frame) => frame.url());
      throw new Error(`The Agent Lee live chat surface did not appear after opening the installed UI. Frame URLs: ${frameUrls.join(" | ")}`);
    }
    const preferredSurfaceMode = chatFrame.url().includes("purpose=webviewView") ? "sidebar" : "right_panel";

    await page.screenshot({ path: path.join(screenshotsDir, "vscode-sidebar-open.png") });

    const sidebarText = await chatFrame.locator("body").innerText().catch(() => "");
    const sidebarImages = {
      chatAvatar: await collectImageInfo(chatFrame, "Agent Lee chat avatar"),
      logo: await collectImageInfo(chatFrame, "LeeWay logo"),
      topRight: await collectImageInfo(chatFrame, "LeeWay"),
      standardsButton: await collectImageInfo(chatFrame, "LeeWay Standards button"),
      standardsLogo: await collectImageInfo(chatFrame, "LeeWay Standards logo"),
      bottomButton: await collectImageInfo(chatFrame, "Bottom Button")
    };

    await executeCommand(page, "Agent Lee: Open Sidebar");
    const shellTextAfterCommand = await page.locator("body").innerText().catch(() => "");
    const openSidebarCommandWorked =
      !/command 'agentLee\.openSidebar' not found/i.test(shellTextAfterCommand) &&
      !!(await waitForFrame(
        page,
        (frame) =>
          frame.url().includes("extensionId=leeway.agent-lee-leeway-coding-system") &&
          frame.url().includes("purpose=webviewView"),
        10000
      ));

    await executeCommand(page, "Agent Lee: Open README");
    let readmeFrame = await waitForFrame(
      page,
      (frame) => frame.url().includes("markdown-language-features"),
      12000
    );
    if (!readmeFrame) {
      await executeCommand(page, "Markdown: Open Preview");
      readmeFrame = await waitForFrame(
        page,
        (frame) => frame.url().includes("markdown-language-features"),
        12000
      );
    }
    if (!readmeFrame) {
      await executeCommand(page, "Markdown: Open Preview to the Side");
      readmeFrame = await waitForFrame(
        page,
        (frame) => frame.url().includes("markdown-language-features"),
        12000
      );
    }
    if (!readmeFrame) {
      readmeFrame = await findFrameContainingImageAlt(page, "Agent Lee LeeWay Coding System", 12000);
    }
    const readmeFrameFound = !!readmeFrame;
    const readmeFrameUrls = page.frames().map((frame) => frame.url());
    if (readmeFrameFound) {
      await page.screenshot({ path: path.join(screenshotsDir, "vscode-readme-open.png") });
    }

    const readmeImages = readmeFrameFound ? {
      logo: await collectImageInfo(readmeFrame, "LeeWay Logo"),
      header: await collectImageInfo(readmeFrame, "Agent Lee LeeWay Coding System"),
      systemFlow: await collectImageInfo(readmeFrame, "Agent Lee System Flow"),
      standardsLogo: await collectImageInfo(readmeFrame, "LeeWay Standards Logo")
    } : {
      logo: { alt: "LeeWay Logo", visible: false, src: "", naturalWidth: 0, naturalHeight: 0, clientWidth: 0, clientHeight: 0, complete: false },
      header: { alt: "Agent Lee LeeWay Coding System", visible: false, src: "", naturalWidth: 0, naturalHeight: 0, clientWidth: 0, clientHeight: 0, complete: false },
      systemFlow: { alt: "Agent Lee System Flow", visible: false, src: "", naturalWidth: 0, naturalHeight: 0, clientWidth: 0, clientHeight: 0, complete: false },
      standardsLogo: { alt: "LeeWay Standards Logo", visible: false, src: "", naturalWidth: 0, naturalHeight: 0, clientWidth: 0, clientHeight: 0, complete: false }
    };
    const readmeImageOrder = readmeFrameFound ? await readmeFrame.evaluate(() => {
      return Array.from(document.querySelectorAll("img[alt]")).map((element) => element.getAttribute("alt") || "");
    }).catch(() => []) : [];
    const logoIndex = readmeImageOrder.indexOf("LeeWay Logo");
    const headerIndex = readmeImageOrder.indexOf("Agent Lee LeeWay Coding System");
    const systemFlowIndex = readmeImageOrder.indexOf("Agent Lee System Flow");
    const readmeOrderCorrect =
      logoIndex >= 0 &&
      headerIndex > logoIndex &&
      systemFlowIndex > headerIndex;

    const observedVersions = [
      sidebarImages.logo.src,
      sidebarImages.topRight.src,
      readmeImages.header.src,
      readmeImages.systemFlow.src
    ]
      .map((value) => {
        const match = String(value || "").match(/agent-lee-leeway-coding-system-(\d+\.\d+\.\d+)/i);
        return match ? match[1] : "";
      })
      .filter(Boolean);

    const observedInstalledVersion = observedVersions[0] || installedCheck.installedVersion || "";
    const staleRuntimeDetected = !!installedCheck.staleDetected;
    const runtimeHealthVisible = /Agent Lee runtime status:/i.test(statusBarAriaLabel);

    const fullyPassing =
      activityBarIconNotBlank &&
      openSidebarCommandWorked &&
      runtimeHealthVisible &&
      sidebarImages.chatAvatar.visible &&
      sidebarImages.topRight.visible &&
      sidebarImages.bottomButton.visible &&
      sidebarImages.standardsButton.visible &&
      readmeFrameFound &&
      readmeOrderCorrect &&
      readmeImages.header.visible &&
      readmeImages.systemFlow.visible &&
      !staleRuntimeDetected;
    const finalVerdict = fullyPassing
      ? "PASS"
      : activityBarIconNotBlank &&
        openSidebarCommandWorked &&
        runtimeHealthVisible &&
        sidebarImages.chatAvatar.visible
        ? "PARTIAL"
        : "FAIL";

    result = {
      timestamp: new Date().toISOString(),
      validationMode: "INSTALLED_EXTENSION",
      extensionVersion: observedInstalledVersion || packageJson.version || "",
      runtimeSourceMode: statusSummary.runtimeSourceMode,
      preferredSurfaceMode,
      activityBarIconVisible: true,
      activityBarIconNotBlank,
      sidebarOpened: true,
      openSidebarCommandWorked,
      statusBarVisible: true,
      chatAvatarVisible: sidebarImages.chatAvatar.visible && sidebarImages.chatAvatar.naturalWidth > 0,
      topRightButtonVisible: sidebarImages.topRight.visible && sidebarImages.topRight.naturalWidth > 0,
      bottomButtonVisible: sidebarImages.bottomButton.visible && sidebarImages.bottomButton.naturalWidth > 0,
      standardsButtonVisible:
        sidebarImages.standardsButton.visible && sidebarImages.standardsButton.naturalWidth > 0,
      readmePreviewAvailable: readmeFrameFound,
      readmeOrderCorrect,
      readmeHeaderVisible: readmeImages.header.visible && readmeImages.header.naturalWidth > 0,
      readmeSystemFlowVisible: readmeImages.systemFlow.visible && readmeImages.systemFlow.naturalWidth > 0,
      runtimeHealthVisible,
      staleRuntimeDetected,
      screenshots: [
        path.relative(extensionDir, activityBarScreenshotPath).replace(/\\/g, "/"),
        path.relative(extensionDir, path.join(screenshotsDir, "vscode-sidebar-open.png")).replace(/\\/g, "/"),
        path.relative(extensionDir, path.join(screenshotsDir, "vscode-readme-open.png")).replace(/\\/g, "/")
      ],
      manualObservationNotes: {
        statusBarAriaLabel,
        installedRuntimeStatus: statusSummary.installedRuntimeStatus,
        observedInstalledVersion,
        preferredSurfaceUrl: chatFrame.url(),
        sidebarTextSample: sidebarText.slice(0, 500),
        readmeFrameUrls,
        activityBarPngAnalysis,
        sidebarImages,
        readmeImages,
        readmeImageOrder
      },
      finalVerdict
    };
  } finally {
    await browser.close();
  }

  fs.writeFileSync(evidencePath, `${JSON.stringify(result, null, 2)}\n`, "utf8");
  console.log(`Live validation evidence written to ${evidencePath}`);
  if (result.finalVerdict !== "PASS") {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  const failureResult = {
    timestamp: new Date().toISOString(),
    validationMode: "INSTALLED_EXTENSION",
    extensionVersion: "",
    runtimeSourceMode: "UNKNOWN",
    activityBarIconVisible: false,
    activityBarIconNotBlank: false,
    sidebarOpened: false,
    openSidebarCommandWorked: false,
    statusBarVisible: false,
    chatAvatarVisible: false,
    topRightButtonVisible: false,
    bottomButtonVisible: false,
    standardsButtonVisible: false,
    readmePreviewAvailable: false,
    readmeOrderCorrect: false,
    readmeHeaderVisible: false,
    readmeSystemFlowVisible: false,
    runtimeHealthVisible: false,
    staleRuntimeDetected: true,
    screenshots: [],
    manualObservationNotes: {
      error: error instanceof Error ? error.message : String(error)
    },
    finalVerdict: "FAIL"
  };
  fs.writeFileSync(evidencePath, `${JSON.stringify(failureResult, null, 2)}\n`, "utf8");
  console.error(error);
  process.exit(1);
});
