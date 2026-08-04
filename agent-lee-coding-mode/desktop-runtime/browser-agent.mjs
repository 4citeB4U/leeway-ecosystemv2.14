import { chromium } from "playwright";
import fs from "fs";
import path from "path";
import { spawn, spawnSync } from "child_process";

const payloadPath = process.argv[2];

function out(obj) {
  console.log(JSON.stringify(obj, null, 2));
}

if (!payloadPath) {
  out({ ok: false, tool: "browser.visible.search", stage: "startup", error: "Missing payload path." });
  process.exit(0);
}

const payload = JSON.parse(fs.readFileSync(payloadPath, "utf8"));

const query = String(payload.query || "").trim();
const monitorIndex = Number.isFinite(Number(payload.monitorIndex)) ? Number(payload.monitorIndex) : 1;
const runRoot = String(payload.runRoot || path.join(process.cwd(), "runs", `web-search-${Date.now()}`));

const narrate = payload.narrate !== false;
const slowMode = payload.slowMode !== false;
const openScreenshot = payload.openScreenshot === true;
const speechVoice = String(payload.voice || "en-US-AndrewNeural");

const fallbackMonitors = [
  { index: 0, x: 0, y: 0, width: 1080, height: 1920 },
  { index: 1, x: 1080, y: 0, width: 1707, height: 1067 },
  { index: 2, x: 3640, y: 0, width: 1920, height: 1080 }
];

function getMonitor() {
  if (payload.monitorBounds && Number.isFinite(Number(payload.monitorBounds.x))) {
    return {
      x: Number(payload.monitorBounds.x),
      y: Number(payload.monitorBounds.y),
      width: Number(payload.monitorBounds.width),
      height: Number(payload.monitorBounds.height)
    };
  }

  return fallbackMonitors.find((m) => m.index === monitorIndex) || fallbackMonitors[1];
}

fs.mkdirSync(runRoot, { recursive: true });

const speechDir = path.join(runRoot, "speech");
fs.mkdirSync(speechDir, { recursive: true });

const result = {
  ok: false,
  tool: "browser.visible.search",
  stage: "start",
  query,
  monitorIndex,
  runRoot,
  monitor: null,
  screenshot: null,
  openedScreenshot: false,
  previewPath: null,
  previewOpenAttempted: false,
  previewOpenSkippedReason: null,
  url: null,
  title: null,
  narration: [],
  error: ""
};

function escapePsSingleQuoted(s) {
  return String(s).replaceAll("'", "''");
}

function speak(text) {
  if (!narrate) return;

  const cleaned = String(text || "").trim();
  if (!cleaned) return;

  result.narration.push(cleaned);

  const stamp = Date.now();
  const mp3 = path.join(speechDir, `agent-lee-narration-${stamp}.mp3`);
  const playScript = path.join(speechDir, `agent-lee-play-${stamp}.ps1`);

  const py = spawnSync("py", ["-m", "edge_tts", "--voice", speechVoice, "--text", cleaned, "--write-media", mp3], {
    encoding: "utf8",
    windowsHide: true
  });

  if (py.status !== 0 || !fs.existsSync(mp3)) {
    const python = spawnSync("python", ["-m", "edge_tts", "--voice", speechVoice, "--text", cleaned, "--write-media", mp3], {
      encoding: "utf8",
      windowsHide: true
    });

    if (python.status !== 0 || !fs.existsSync(mp3)) {
      result.narration.push(`Narration generation failed: ${(python.stderr || py.stderr || "").slice(0, 300)}`);
      return;
    }
  }

  const ps = [
    "Add-Type -AssemblyName PresentationCore",
    "$player = New-Object System.Windows.Media.MediaPlayer",
    "$player.Volume = 1.0",
    `$player.Open([Uri]'${escapePsSingleQuoted(mp3)}')`,
    "Start-Sleep -Milliseconds 700",
    "try {",
    "  if ($player.NaturalDuration.HasTimeSpan) {",
    "    $duration = [Math]::Ceiling($player.NaturalDuration.TimeSpan.TotalSeconds) + 1",
    "  } else {",
    "    $duration = 5",
    "  }",
    "} catch {",
    "  $duration = 5",
    "}",
    "$player.Play()",
    "Start-Sleep -Seconds $duration",
    "$player.Stop()",
    "$player.Close()"
  ].join("\r\n");

  fs.writeFileSync(playScript, ps, "utf8");

  spawnSync("powershell.exe", [
    "-NoProfile",
    "-STA",
    "-ExecutionPolicy",
    "Bypass",
    "-WindowStyle",
    "Hidden",
    "-File",
    playScript
  ], {
    encoding: "utf8",
    windowsHide: true
  });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function installAgentCursor(page) {
  await page.addStyleTag({
    content: `
      #agentLeeCursor {
        position: fixed !important;
        left: 24px;
        top: 24px;
        width: 38px;
        height: 38px;
        z-index: 2147483647 !important;
        pointer-events: none !important;
        border-radius: 999px;
        background: rgba(255, 220, 0, 0.96);
        box-shadow: 0 0 35px rgba(255, 220, 0, 1), 0 0 70px rgba(0, 180, 255, 0.85);
        border: 4px solid white;
        transition: left 90ms linear, top 90ms linear, transform 160ms ease, background 160ms ease;
      }
      #agentLeeCursor::after {
        content: "Agent Lee";
        position: absolute;
        left: 46px;
        top: -8px;
        padding: 5px 9px;
        border-radius: 999px;
        background: rgba(0,0,0,0.78);
        color: white;
        font: 700 13px Segoe UI, Arial, sans-serif;
        white-space: nowrap;
      }
      #agentLeeStatus {
        position: fixed !important;
        left: 24px;
        bottom: 24px;
        z-index: 2147483647 !important;
        padding: 14px 18px;
        border-radius: 16px;
        background: rgba(0,0,0,0.82);
        color: white;
        font: 700 18px Segoe UI, Arial, sans-serif;
        max-width: 72vw;
        box-shadow: 0 0 30px rgba(0,0,0,0.6);
      }
    `
  });

  await page.evaluate(() => {
    if (!document.getElementById("agentLeeCursor")) {
      const cursor = document.createElement("div");
      cursor.id = "agentLeeCursor";
      document.body.appendChild(cursor);
    }

    if (!document.getElementById("agentLeeStatus")) {
      const status = document.createElement("div");
      status.id = "agentLeeStatus";
      status.textContent = "Agent Lee is ready.";
      document.body.appendChild(status);
    }
  });
}

async function setStatus(page, text) {
  const safe = String(text || "");
  await page.evaluate((value) => {
    const status = document.getElementById("agentLeeStatus");
    if (status) status.textContent = value;
  }, safe).catch(() => {});
}

async function moveAgentCursor(page, x, y, label = "") {
  await page.evaluate(({ x, y, label }) => {
    const cursor = document.getElementById("agentLeeCursor");
    const status = document.getElementById("agentLeeStatus");

    if (cursor) {
      cursor.style.left = `${x}px`;
      cursor.style.top = `${y}px`;
      cursor.style.transform = "scale(1.18)";
      setTimeout(() => { cursor.style.transform = "scale(1.0)"; }, 180);
    }

    if (status && label) {
      status.textContent = label;
    }
  }, { x, y, label }).catch(() => {});

  await page.mouse.move(x, y, { steps: slowMode ? 45 : 8 });
  if (slowMode) await sleep(650);
}

async function moveToLocator(page, locator, label) {
  const box = await locator.boundingBox();

  if (!box) {
    throw new Error(`Could not locate screen position for ${label}.`);
  }

  const x = Math.round(box.x + box.width / 2);
  const y = Math.round(box.y + box.height / 2);

  await setStatus(page, label);
  await moveAgentCursor(page, x, y, label);

  return { x, y, box };
}

let browser = null;

try {
  if (!query) {
    throw new Error("Missing search query.");
  }

  const m = getMonitor();
  result.monitor = m;

  result.stage = "launch-edge";
  speak("I am opening Microsoft Edge now.");

  browser = await chromium.launch({
    channel: "msedge",
    headless: false,
    args: [
      `--window-position=${m.x},${m.y}`,
      `--window-size=${m.width},${m.height}`,
      "--new-window"
    ]
  });

  const context = await browser.newContext({
    viewport: {
      width: Math.max(900, Math.floor(m.width * 0.92)),
      height: Math.max(650, Math.floor(m.height * 0.80))
    }
  });

  const page = await context.newPage();

  result.stage = "open-bing";
  speak("I am loading Bing so I can search the web.");

  await page.goto("https://www.bing.com", {
    waitUntil: "domcontentloaded",
    timeout: 60000
  });

  await installAgentCursor(page);
  await setStatus(page, "Bing loaded. Looking for the search box.");
  if (slowMode) await sleep(1200);

  result.stage = "find-search-box";
  speak("I am looking for the search box.");

  const searchBox = page.locator('textarea[name="q"], input[name="q"]').first();
  await searchBox.waitFor({ state: "visible", timeout: 30000 });

  result.stage = "move-to-search-box";
  speak("I found the search box. I am moving my cursor to it.");

  await moveToLocator(page, searchBox, "Moving to the search box.");
  await searchBox.click();

  result.stage = "type-query";
  speak(`I am typing this search query: ${query}`);

  await setStatus(page, `Typing: ${query}`);
  await searchBox.fill("");

  for (const char of query) {
    await searchBox.pressSequentially(char, { delay: slowMode ? 95 : 25 });
  }

  if (slowMode) await sleep(1100);

  result.stage = "submit-search";
  speak("I am pressing Enter to run the search.");

  await setStatus(page, "Submitting the search.");
  await searchBox.press("Enter");

  result.stage = "wait-results";
  speak("I am waiting for the search results to load.");

  await page.waitForLoadState("domcontentloaded", { timeout: 60000 });
  await page.waitForTimeout(slowMode ? 4500 : 1800);

  await installAgentCursor(page);
  await setStatus(page, "Search results loaded.");

  result.url = page.url();
  result.title = await page.title();

  result.stage = "show-results";
  speak("The search results are loaded. I am pausing so you can see the page.");

  await sleep(slowMode ? 3500 : 1000);

  result.stage = "screenshot";
  speak("I am capturing a screenshot as proof of what I did.");

  const screenshotDir = path.join(runRoot, "screenshots");
  fs.mkdirSync(screenshotDir, { recursive: true });

  const safeQuery = query.replace(/[^a-z0-9_-]+/gi, "_").slice(0, 60);
  const screenshotPath = path.join(screenshotDir, `agent-lee-search-${safeQuery}-${Date.now()}.png`);

  await page.screenshot({
    path: screenshotPath,
    fullPage: true
  });

  if (!fs.existsSync(screenshotPath)) {
    throw new Error("Screenshot file was not created.");
  }

  result.screenshot = screenshotPath;
  result.previewPath = screenshotPath;

  result.stage = "open-screenshot";
  result.previewOpenAttempted = openScreenshot;
  if (openScreenshot) {
    speak("I am opening the screenshot now.");

    const safePath = screenshotPath.replaceAll("'", "''");
    const safeDir = path.dirname(screenshotPath).replaceAll("'", "''");

    const openCommand = `
      $ErrorActionPreference = 'Stop';
      $shot = '${safePath}';
      $dir = '${safeDir}';
      if (-not (Test-Path -LiteralPath $shot)) {
        throw 'Screenshot does not exist: ' + $shot;
      }
      Start-Process explorer.exe -ArgumentList @('/select,', $shot);
      Start-Sleep -Milliseconds 700;
      Start-Process -FilePath 'mspaint.exe' -ArgumentList @($shot);
      Start-Sleep -Milliseconds 700;
      if (-not (Test-Path -LiteralPath $shot)) {
        throw 'Screenshot disappeared after open attempt: ' + $shot;
      }
      Write-Output 'OPENED_SCREENSHOT_OK';
    `;

    const openResult = spawnSync("powershell.exe", [
      "-NoProfile",
      "-ExecutionPolicy",
      "Bypass",
      "-Command",
      openCommand
    ], {
      encoding: "utf8",
      windowsHide: false
    });

    result.openScreenshotStdout = openResult.stdout || "";
    result.openScreenshotStderr = openResult.stderr || "";
    result.openScreenshotExitCode = openResult.status;

    if (openResult.status !== 0 || !(openResult.stdout || "").includes("OPENED_SCREENSHOT_OK")) {
      throw new Error(`Screenshot was captured but did not open. stdout=${openResult.stdout} stderr=${openResult.stderr}`);
    }

    result.openedScreenshot = true;
  } else {
    result.openScreenshotSkipped = true;
    result.openedScreenshot = false;
    result.previewOpenSkippedReason = "preview disabled";
  }

  result.stage = "complete";
  result.ok = true;

  speak("Web search complete. I opened the browser, moved my cursor, typed the query, searched the web, and captured proof.");

  if (browser) {
    await browser.close().catch(() => {});
    browser = null;
  }

  out(result);
}
catch (error) {
  result.error = error?.message || String(error);

  try {
    speak(`I failed at stage ${result.stage}. ${result.error}`);
  } catch {}

  if (browser) {
    await browser.close().catch(() => {});
    browser = null;
  }

  out(result);
}

