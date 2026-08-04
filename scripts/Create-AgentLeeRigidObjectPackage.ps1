$ErrorActionPreference = "Stop"

$Root = "D:\Leeway-Ecosystem v2.1.4"
$ObjectRoot = Join-Path $Root "Archive\agent-lee-artifacts\image-to-3d-lane"
$Proof = Join-Path $Root "Archive\proofs\image-to-3d-lane"
$Stamp = Get-Date -Format "yyyyMMdd-HHmmss"

New-Item -ItemType Directory -Force -Path $Proof | Out-Null

# Pick latest real 3D job folder with model.obj and texture.png.
$Job = Get-ChildItem $ObjectRoot -Directory |
  Where-Object {
    (Test-Path (Join-Path $_.FullName "model.obj")) -and
    (Test-Path (Join-Path $_.FullName "texture.png"))
  } |
  Sort-Object LastWriteTime -Descending |
  Select-Object -First 1

if (-not $Job) {
  throw "No 3D object job found with model.obj and texture.png under $ObjectRoot"
}

$JobId = $Job.Name
$Folder = $Job.FullName

$Index = Join-Path $Folder "index.html"
$Manifest = Join-Path $Folder "manifest.webmanifest"
$ServiceWorker = Join-Path $Folder "service-worker.js"
$ObjectJson = Join-Path $Folder "object.json"
$Zip = Join-Path $Folder "agent_lee_rigid_object_package.zip"

$LocalObjectUrl = "http://127.0.0.1:8101/artifacts/$JobId/index.html"
$LocalPackageUrl = "http://127.0.0.1:8101/artifacts/$JobId/agent_lee_rigid_object_package.zip"

$ObjectMeta = @{
  schema = "agentlee.rigidObject.v1"
  object_id = $JobId
  title = "Agent Lee Red Dragon Warrior"
  object_type = "rigid_interactive_3d_object"
  character_id = "agent_lee_red_dragon_warrior_v1"
  runtime_standard = "AgentLeeTrueObjectWidgetHost-compatible"
  controls = @{
    drag = "left mouse / touch drag moves object"
    zoom = "mouse wheel / pinch / buttons"
    rotate = "shift-drag or right-drag freestyle rotation"
    menu = "right click / long press opens object controls"
    reset = "reset returns position, scale, rotation"
    install = "PWA install when browser supports it"
  }
  assets = @{
    model = "model.obj"
    material = "model.mtl"
    texture = "texture.png"
    height = "height.png"
    source = "input.png"
    receipt = "receipt.json"
  }
  links = @{
    open_object = $LocalObjectUrl
    download_package = $LocalPackageUrl
  }
  created_at = (Get-Date).ToString("o")
}

$ObjectMeta | ConvertTo-Json -Depth 50 | Set-Content -Path $ObjectJson -Encoding UTF8

@"
{
  "name": "Agent Lee 3D Object - Red Dragon Warrior",
  "short_name": "Agent Lee Object",
  "start_url": "./index.html",
  "scope": "./",
  "display": "standalone",
  "background_color": "#080808",
  "theme_color": "#111111",
  "description": "Installable Agent Lee rigid 3D object package.",
  "icons": [
    {
      "src": "./texture.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any"
    }
  ]
}
"@ | Set-Content -Path $Manifest -Encoding UTF8

@"
const CACHE_NAME = "agent-lee-rigid-object-$JobId";
const ASSETS = [
  "./index.html",
  "./manifest.webmanifest",
  "./object.json",
  "./model.obj",
  "./model.mtl",
  "./texture.png",
  "./height.png",
  "./input.png",
  "./receipt.json"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS).catch(() => null))
  );
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", event => {
  event.respondWith(
    caches.match(event.request).then(match => {
      return match || fetch(event.request);
    })
  );
});
"@ | Set-Content -Path $ServiceWorker -Encoding UTF8

@"
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Agent Lee Rigid Object</title>
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
  <link rel="manifest" href="./manifest.webmanifest" />
  <style>
    :root {
      --bg: #050505;
      --panel: rgba(14, 14, 14, 0.92);
      --line: rgba(255,255,255,0.14);
      --blue: #8fd3ff;
      --gold: #ffe08a;
    }

    html, body {
      margin: 0;
      width: 100%;
      height: 100%;
      overflow: hidden;
      background: radial-gradient(circle at center, #1c1c1c, #050505 65%);
      color: white;
      font-family: Arial, sans-serif;
      touch-action: none;
      user-select: none;
    }

    #stage {
      position: fixed;
      inset: 0;
      overflow: hidden;
    }

    #object-shell {
      position: absolute;
      left: calc(50vw - 190px);
      top: calc(50vh - 240px);
      width: 380px;
      height: 520px;
      transform-origin: center center;
      cursor: grab;
      filter: drop-shadow(0 28px 42px rgba(0,0,0,0.65));
    }

    #object-shell.dragging {
      cursor: grabbing;
    }

    #object-rigid-card {
      position: absolute;
      inset: 0;
      border-radius: 28px;
      background: linear-gradient(145deg, rgba(30,30,30,0.95), rgba(5,5,5,0.82));
      border: 1px solid rgba(255,255,255,0.18);
      box-shadow:
        inset 0 0 40px rgba(255,255,255,0.04),
        0 0 34px rgba(255,60,20,0.18);
      transform-style: preserve-3d;
      overflow: hidden;
    }

    #object-texture {
      position: absolute;
      left: 50%;
      top: 50%;
      width: 88%;
      max-height: 94%;
      transform: translate(-50%, -50%) translateZ(32px);
      object-fit: contain;
      pointer-events: none;
      border-radius: 22px;
      filter:
        contrast(1.04)
        saturate(1.08)
        drop-shadow(0 18px 24px rgba(0,0,0,0.55));
    }

    #height-shadow {
      position: absolute;
      inset: 8%;
      background-image: url("./height.png");
      background-size: contain;
      background-repeat: no-repeat;
      background-position: center;
      opacity: 0.34;
      filter: blur(2px);
      transform: translateZ(10px);
      pointer-events: none;
      mix-blend-mode: screen;
    }

    #top-label {
      position: fixed;
      left: 14px;
      top: 12px;
      padding: 10px 14px;
      border-radius: 12px;
      background: var(--panel);
      border: 1px solid var(--line);
      backdrop-filter: blur(10px);
      z-index: 20;
      max-width: min(720px, calc(100vw - 28px));
    }

    #top-label b {
      color: var(--gold);
    }

    #hint {
      font-size: 13px;
      opacity: 0.82;
      margin-top: 4px;
    }

    #menu {
      position: fixed;
      display: none;
      z-index: 40;
      width: 230px;
      padding: 10px;
      border-radius: 14px;
      background: rgba(8,8,8,0.96);
      border: 1px solid rgba(255,255,255,0.20);
      box-shadow: 0 24px 54px rgba(0,0,0,0.65);
    }

    #menu button,
    #dock button,
    #dock a {
      width: 100%;
      margin: 5px 0;
      padding: 10px 11px;
      border-radius: 10px;
      border: 1px solid rgba(255,255,255,0.16);
      background: #171717;
      color: white;
      text-align: left;
      text-decoration: none;
      font-size: 14px;
      cursor: pointer;
      box-sizing: border-box;
    }

    #menu button:hover,
    #dock button:hover,
    #dock a:hover {
      border-color: var(--blue);
      color: var(--blue);
    }

    #dock {
      position: fixed;
      right: 14px;
      bottom: 14px;
      width: 260px;
      z-index: 25;
      padding: 12px;
      border-radius: 16px;
      background: var(--panel);
      border: 1px solid var(--line);
      backdrop-filter: blur(10px);
    }

    #dock-title {
      font-weight: 700;
      margin: 0 0 7px 0;
      color: var(--gold);
    }

    #toast {
      position: fixed;
      left: 50%;
      bottom: 18px;
      transform: translateX(-50%);
      background: rgba(0,0,0,0.86);
      border: 1px solid rgba(255,255,255,0.18);
      border-radius: 999px;
      padding: 10px 16px;
      display: none;
      z-index: 60;
    }

    @media (max-width: 760px) {
      #object-shell {
        width: 310px;
        height: 440px;
        left: calc(50vw - 155px);
        top: calc(50vh - 220px);
      }

      #dock {
        width: calc(100vw - 28px);
        right: 14px;
        left: 14px;
        bottom: 10px;
      }

      #top-label {
        font-size: 13px;
      }
    }
  </style>
</head>
<body>
  <div id="stage">
    <div id="object-shell" aria-label="Agent Lee rigid object">
      <div id="object-rigid-card">
        <div id="height-shadow"></div>
        <img id="object-texture" src="./texture.png" alt="Agent Lee object texture" />
      </div>
    </div>
  </div>

  <div id="top-label">
    <div><b>Agent Lee Rigid Object</b> — Red Dragon Warrior</div>
    <div id="hint">Move | wheel zoom | shift-drag rotate | right-click controls</div>
  </div>

  <div id="menu">
    <button id="m-rotate">Freestyle Rotation</button>
    <button id="m-zoom-in">Zoom In</button>
    <button id="m-zoom-out">Zoom Out</button>
    <button id="m-reset">Reset Object</button>
    <button id="m-fullscreen">Fullscreen</button>
    <button id="m-install">Install Object</button>
    <a href="./agent_lee_rigid_object_package.zip" download>Download Package</a>
  </div>

  <div id="dock">
    <div id="dock-title">Object Controls</div>
    <button id="b-reset">Reset</button>
    <button id="b-spin">Pause/Resume Spin</button>
    <button id="b-zoom-in">Zoom In</button>
    <button id="b-zoom-out">Zoom Out</button>
    <button id="b-install">Install PWA</button>
    <a href="./agent_lee_rigid_object_package.zip" download>Download Full Object Package</a>
    <a href="./model.obj" download>Download OBJ</a>
  </div>

  <div id="toast"></div>

<script>
(() => {
  const shell = document.getElementById("object-shell");
  const card = document.getElementById("object-rigid-card");
  const menu = document.getElementById("menu");
  const toast = document.getElementById("toast");

  let x = window.innerWidth / 2 - 190;
  let y = window.innerHeight / 2 - 240;
  let scale = 1;
  let rotX = -8;
  let rotY = 18;
  let rotZ = 0;
  let dragging = false;
  let rotateMode = false;
  let spinning = true;
  let lastX = 0;
  let lastY = 0;
  let deferredInstall = null;

  function clamp() {
    scale = Math.max(0.3, Math.min(4.5, scale));
  }

  function apply() {
    shell.style.left = x + "px";
    shell.style.top = y + "px";
    shell.style.transform = "scale(" + scale + ")";
    card.style.transform =
      "perspective(900px) rotateX(" + rotX + "deg) rotateY(" + rotY + "deg) rotateZ(" + rotZ + "deg)";
  }

  function showToast(msg) {
    toast.textContent = msg;
    toast.style.display = "block";
    clearTimeout(showToast.t);
    showToast.t = setTimeout(() => toast.style.display = "none", 1800);
  }

  function hideMenu() {
    menu.style.display = "none";
  }

  function openMenu(px, py) {
    menu.style.left = Math.min(px, window.innerWidth - 250) + "px";
    menu.style.top = Math.min(py, window.innerHeight - 320) + "px";
    menu.style.display = "block";
  }

  function reset() {
    x = window.innerWidth / 2 - shell.offsetWidth / 2;
    y = window.innerHeight / 2 - shell.offsetHeight / 2;
    scale = 1;
    rotX = -8;
    rotY = 18;
    rotZ = 0;
    rotateMode = false;
    spinning = true;
    apply();
    showToast("Object reset");
  }

  shell.addEventListener("pointerdown", e => {
    hideMenu();
    dragging = true;
    shell.classList.add("dragging");
    lastX = e.clientX;
    lastY = e.clientY;
    shell.setPointerCapture(e.pointerId);
  });

  shell.addEventListener("pointermove", e => {
    if (!dragging) return;

    const dx = e.clientX - lastX;
    const dy = e.clientY - lastY;
    lastX = e.clientX;
    lastY = e.clientY;

    if (rotateMode || e.shiftKey || e.buttons === 2) {
      rotY += dx * 0.7;
      rotX -= dy * 0.5;
    } else {
      x += dx;
      y += dy;
    }

    apply();
  });

  shell.addEventListener("pointerup", e => {
    dragging = false;
    shell.classList.remove("dragging");
    try { shell.releasePointerCapture(e.pointerId); } catch {}
  });

  window.addEventListener("wheel", e => {
    e.preventDefault();
    scale += e.deltaY < 0 ? 0.08 : -0.08;
    clamp();
    apply();
  }, { passive: false });

  window.addEventListener("contextmenu", e => {
    e.preventDefault();
    openMenu(e.clientX, e.clientY);
  });

  window.addEventListener("click", e => {
    if (!menu.contains(e.target)) hideMenu();
  });

  document.getElementById("m-rotate").onclick = () => {
    rotateMode = !rotateMode;
    showToast(rotateMode ? "Freestyle rotation ON" : "Freestyle rotation OFF");
    hideMenu();
  };

  document.getElementById("m-zoom-in").onclick = () => {
    scale += 0.15; clamp(); apply(); hideMenu();
  };

  document.getElementById("m-zoom-out").onclick = () => {
    scale -= 0.15; clamp(); apply(); hideMenu();
  };

  document.getElementById("m-reset").onclick = () => {
    reset(); hideMenu();
  };

  document.getElementById("m-fullscreen").onclick = () => {
    document.documentElement.requestFullscreen?.();
    hideMenu();
  };

  document.getElementById("b-reset").onclick = reset;
  document.getElementById("b-spin").onclick = () => {
    spinning = !spinning;
    showToast(spinning ? "Spin resumed" : "Spin paused");
  };
  document.getElementById("b-zoom-in").onclick = () => {
    scale += 0.15; clamp(); apply();
  };
  document.getElementById("b-zoom-out").onclick = () => {
    scale -= 0.15; clamp(); apply();
  };

  window.addEventListener("beforeinstallprompt", e => {
    e.preventDefault();
    deferredInstall = e;
  });

  async function installPwa() {
    if (!deferredInstall) {
      showToast("Use browser menu: Install app / Add to home screen");
      return;
    }
    deferredInstall.prompt();
    await deferredInstall.userChoice;
    deferredInstall = null;
  }

  document.getElementById("b-install").onclick = installPwa;
  document.getElementById("m-install").onclick = () => {
    installPwa();
    hideMenu();
  };

  let lastTime = performance.now();
  function tick(now) {
    const dt = now - lastTime;
    lastTime = now;

    if (spinning && !dragging && !rotateMode) {
      rotY += dt * 0.012;
      apply();
    }

    requestAnimationFrame(tick);
  }

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./service-worker.js").catch(() => {});
  }

  apply();
  requestAnimationFrame(tick);
})();
</script>
</body>
</html>
"@ | Set-Content -Path $Index -Encoding UTF8

if (Test-Path $Zip) {
  Remove-Item $Zip -Force
}

$PackageFiles = @(
  "index.html",
  "manifest.webmanifest",
  "service-worker.js",
  "object.json",
  "model.obj",
  "model.mtl",
  "texture.png",
  "height.png",
  "input.png",
  "receipt.json"
) | ForEach-Object { Join-Path $Folder $_ } | Where-Object { Test-Path $_ }

Compress-Archive -Force -Path $PackageFiles -DestinationPath $Zip

$LockReceipt = @{
  verdict = "AGENT_LEE_RIGID_OBJECT_PACKAGE_CREATED"
  object_standard = "AgentLeeTrueObjectWidgetHost-compatible rigid object"
  job_id = $JobId
  folder = $Folder
  open_object = $LocalObjectUrl
  download_package = $LocalPackageUrl
  controls = @(
    "drag to move",
    "mouse wheel zoom",
    "shift-drag rotate",
    "right-click context menu",
    "freestyle rotation",
    "zoom in/out",
    "reset",
    "install PWA",
    "download full package"
  )
  source_alignment = "Recovered from AgentLeeTrueObjectWidgetHost behavior: context menu, freestyle rotation, zoom, move, wheel zoom, shift-drag rotate."
  created_at = (Get-Date).ToString("o")
}

$ReceiptPath = Join-Path $Proof "AGENT_LEE_RIGID_OBJECT_PACKAGE_$Stamp.receipt.json"
$LockReceipt | ConvertTo-Json -Depth 80 | Set-Content -Path $ReceiptPath -Encoding UTF8

Write-Host ""
Write-Host "Agent Lee rigid object package created." -ForegroundColor Green
Write-Host "Open object: $LocalObjectUrl" -ForegroundColor Cyan
Write-Host "Download package: $LocalPackageUrl" -ForegroundColor Cyan
Write-Host "Local folder: $Folder" -ForegroundColor Cyan
Write-Host "Receipt: $ReceiptPath" -ForegroundColor Cyan

Start-Process $LocalObjectUrl
Start-Process $LocalPackageUrl