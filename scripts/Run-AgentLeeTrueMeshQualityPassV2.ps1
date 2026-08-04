$ErrorActionPreference = "Stop"

$Root = "D:\Leeway-Ecosystem v2.1.4"

$SourceImage = Join-Path $Root "Archive\agent-lee-artifacts\image-to-3d-lane\sources\agent_lee_red_dragon_warrior_reference_v1.png"

$SourceDir = Join-Path $Root "Archive\agent-lee-artifacts\true-character-3d-lane\sources"
$WorkRoot = Join-Path $Root "Archive\agent-lee-artifacts\true-character-3d-lane\quality-pass-v2"
$Proof = Join-Path $Root "Archive\proofs\true-character-3d-lane"

$Stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$WorkDir = Join-Path $WorkRoot $Stamp

New-Item -ItemType Directory -Force -Path $SourceDir | Out-Null
New-Item -ItemType Directory -Force -Path $WorkDir | Out-Null
New-Item -ItemType Directory -Force -Path $Proof | Out-Null

if (-not (Test-Path $SourceImage)) {
  throw "Source image not found: $SourceImage"
}

$PreprocessPy = Join-Path $WorkDir "make_mesh_ready_source_v2.py"

@'
import json
import math
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageEnhance


src_path = Path(sys.argv[1])
work_dir = Path(sys.argv[2])
work_dir.mkdir(parents=True, exist_ok=True)

canvas_size = 1024

src = Image.open(src_path).convert("RGBA")

# Center source on square canvas.
src.thumbnail((canvas_size, canvas_size), Image.LANCZOS)
canvas = Image.new("RGBA", (canvas_size, canvas_size), (0, 0, 0, 0))
ox = (canvas_size - src.width) // 2
oy = (canvas_size - src.height) // 2
canvas.alpha_composite(src, (ox, oy))

img = canvas.convert("RGBA")
arr = np.array(img).astype(np.uint8)

r = arr[:, :, 0].astype(np.int16)
g = arr[:, :, 1].astype(np.int16)
b = arr[:, :, 2].astype(np.int16)
a = arr[:, :, 3].astype(np.int16)

luma = (0.2126 * r + 0.7152 * g + 0.0722 * b).astype(np.float32)


def polygon_mask(points):
    mask_img = Image.new("L", (canvas_size, canvas_size), 0)
    pts = [(int(x * canvas_size), int(y * canvas_size)) for x, y in points]
    ImageDraw.Draw(mask_img).polygon(pts, fill=255)
    return np.array(mask_img) > 0


def ellipse_mask(box):
    mask_img = Image.new("L", (canvas_size, canvas_size), 0)
    x0, y0, x1, y1 = box
    ImageDraw.Draw(mask_img).ellipse(
        [
            int(x0 * canvas_size),
            int(y0 * canvas_size),
            int(x1 * canvas_size),
            int(y1 * canvas_size),
        ],
        fill=255,
    )
    return np.array(mask_img) > 0


def thick_line_mask(p0, p1, thickness):
    mask_img = Image.new("L", (canvas_size, canvas_size), 0)
    draw = ImageDraw.Draw(mask_img)
    draw.line(
        [
            (int(p0[0] * canvas_size), int(p0[1] * canvas_size)),
            (int(p1[0] * canvas_size), int(p1[1] * canvas_size)),
        ],
        fill=255,
        width=int(thickness * canvas_size),
    )
    return np.array(mask_img) > 0


# Region map built for the supplied Agent Lee red dragon warrior reference.
# This keeps the body, wings, horns, tail, sword, legs, and feet while rejecting arch/castle.
left_wing_zone = polygon_mask([
    (0.04, 0.25), (0.18, 0.16), (0.34, 0.22), (0.45, 0.39),
    (0.42, 0.57), (0.28, 0.61), (0.10, 0.48)
])

right_wing_zone = polygon_mask([
    (0.55, 0.21), (0.82, 0.15), (0.95, 0.31), (0.93, 0.52),
    (0.75, 0.62), (0.58, 0.55), (0.50, 0.39)
])

body_zone = polygon_mask([
    (0.38, 0.22), (0.55, 0.20), (0.67, 0.34), (0.68, 0.59),
    (0.61, 0.82), (0.49, 0.91), (0.35, 0.84), (0.30, 0.60),
    (0.30, 0.39)
])

head_horns_zone = polygon_mask([
    (0.34, 0.10), (0.55, 0.08), (0.63, 0.25), (0.56, 0.36),
    (0.40, 0.35), (0.30, 0.24)
])

left_leg_zone = polygon_mask([
    (0.36, 0.60), (0.49, 0.60), (0.48, 0.95), (0.31, 0.95), (0.29, 0.78)
])

right_leg_zone = polygon_mask([
    (0.52, 0.58), (0.68, 0.61), (0.74, 0.94), (0.56, 0.95), (0.47, 0.76)
])

tail_zone = polygon_mask([
    (0.57, 0.50), (0.73, 0.55), (0.93, 0.66), (0.91, 0.78),
    (0.71, 0.72), (0.54, 0.62)
])

sword_zone = thick_line_mask((0.02, 0.78), (0.38, 0.58), 0.022)
sword_guard_zone = ellipse_mask((0.33, 0.55, 0.45, 0.65))

character_region = (
    left_wing_zone |
    right_wing_zone |
    body_zone |
    head_horns_zone |
    left_leg_zone |
    right_leg_zone |
    tail_zone |
    sword_zone |
    sword_guard_zone
)

# Feature rules.
red_wing = (r > 60) & (r > g + 15) & (r > b + 15)
dark_character = (luma < 132) & (a > 0)
armor_blue = (b > 50) & (b >= r - 10) & (luma < 165)
warm_armor = (r > 65) & (g < 120) & (b < 115)
sword_dark = (luma < 170) & sword_zone

wing_keep = (left_wing_zone | right_wing_zone) & (red_wing | dark_character | warm_armor)
body_keep = (body_zone | head_horns_zone | left_leg_zone | right_leg_zone | tail_zone) & (dark_character | armor_blue | warm_armor)
sword_keep = sword_dark | sword_guard_zone

mask = wing_keep | body_keep | sword_keep

# Repair continuity while preserving silhouette.
mask_img = Image.fromarray((mask.astype(np.uint8) * 255), "L")
mask_img = mask_img.filter(ImageFilter.MaxFilter(9))
mask_img = mask_img.filter(ImageFilter.MinFilter(5))
mask_img = mask_img.filter(ImageFilter.GaussianBlur(1.4))

mask_arr = np.array(mask_img).astype(np.float32) / 255.0
mask_arr = np.where(mask_arr > 0.18, mask_arr, 0.0)

# Apply alpha.
cutout_arr = arr.copy()
cutout_arr[:, :, 3] = np.clip(mask_arr * 255, 0, 255).astype(np.uint8)
cutout = Image.fromarray(cutout_arr, "RGBA")

# Crop alpha bounds and re-pad to square.
alpha = cutout.getchannel("A")
bbox = alpha.getbbox()
if bbox:
    cutout = cutout.crop(bbox)

# Sharpen/enhance texture.
rgb = cutout.convert("RGB")
rgb = ImageEnhance.Sharpness(rgb).enhance(1.8)
rgb = ImageEnhance.Contrast(rgb).enhance(1.22)
rgb = ImageEnhance.Color(rgb).enhance(1.18)

alpha = cutout.getchannel("A")
cutout = Image.merge("RGBA", (*rgb.split(), alpha))

# Fit to square with padding.
cutout.thumbnail((900, 900), Image.LANCZOS)

transparent = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
x = (1024 - cutout.width) // 2
y = (1024 - cutout.height) // 2
transparent.alpha_composite(cutout, (x, y))

gray = Image.new("RGB", (1024, 1024), (128, 128, 128))
gray.paste(transparent.convert("RGB"), mask=transparent.getchannel("A"))

white = Image.new("RGB", (1024, 1024), (238, 238, 238))
white.paste(transparent.convert("RGB"), mask=transparent.getchannel("A"))

# Preview.
preview = Image.new("RGB", (1024, 1024), (40, 40, 40))
preview.paste(transparent.convert("RGB"), mask=transparent.getchannel("A"))

transparent_path = work_dir / "agent_lee_mesh_ready_transparent_v2.png"
gray_path = work_dir / "agent_lee_mesh_ready_gray_v2.png"
white_path = work_dir / "agent_lee_mesh_ready_white_v2.png"
preview_path = work_dir / "agent_lee_mesh_ready_preview_v2.png"
mask_path = work_dir / "agent_lee_mesh_ready_mask_v2.png"

transparent.save(transparent_path)
gray.save(gray_path, quality=95)
white.save(white_path, quality=95)
preview.save(preview_path, quality=95)
Image.fromarray(np.clip(mask_arr * 255, 0, 255).astype(np.uint8), "L").save(mask_path)

receipt = {
    "ok": True,
    "verdict": "AGENT_LEE_MESH_READY_SOURCE_V2_CREATED",
    "source": str(src_path),
    "outputs": {
        "transparent": str(transparent_path),
        "gray": str(gray_path),
        "white": str(white_path),
        "preview": str(preview_path),
        "mask": str(mask_path),
    },
    "intent": "preserve wings sword horns tail armor body while removing castle background before TripoSR",
    "note": "This is a source-quality improvement pass. It does not guarantee final statue quality, but it gives TripoSR a cleaner object-focused input."
}

(work_dir / "mesh_ready_source_v2_receipt.json").write_text(json.dumps(receipt, indent=2), encoding="utf-8")
print(json.dumps(receipt, indent=2))
'@ | Set-Content -Path $PreprocessPy -Encoding UTF8

python -m pip install --quiet pillow numpy

$PreprocessJson = python $PreprocessPy $SourceImage $WorkDir
$PreprocessJson | Out-Host

$GraySource = Join-Path $WorkDir "agent_lee_mesh_ready_gray_v2.png"
$TransparentSource = Join-Path $WorkDir "agent_lee_mesh_ready_transparent_v2.png"
$PreviewSource = Join-Path $WorkDir "agent_lee_mesh_ready_preview_v2.png"

$GrayTarget = Join-Path $SourceDir "agent_lee_mesh_ready_gray_v2.png"
$TransparentTarget = Join-Path $SourceDir "agent_lee_mesh_ready_transparent_v2.png"

Copy-Item -Force $GraySource $GrayTarget
Copy-Item -Force $TransparentSource $TransparentTarget

Start-Process $PreviewSource

Write-Host ""
Write-Host "Mesh-ready source created." -ForegroundColor Green
Write-Host "Preview: $PreviewSource" -ForegroundColor Cyan
Write-Host "Gray source for TripoSR: $GrayTarget" -ForegroundColor Cyan
Write-Host "Transparent source: $TransparentTarget" -ForegroundColor Cyan

# Run the true mesh lane again using the cleaner source.
$Body = @{
  image_path = "/artifacts/sources/agent_lee_mesh_ready_gray_v2.png"
  character_id = "agent_lee_dragon_dog_warrior_quality_v2"
  output_format = "obj"
} | ConvertTo-Json -Depth 20

Write-Host ""
Write-Host "Running TripoSR CPU fallback on improved source. This may take a few minutes..." -ForegroundColor Cyan

$Start = Get-Date

$Result = Invoke-RestMethod `
  -Method Post `
  -Uri "http://127.0.0.1:8103/mesh/from-path" `
  -Body $Body `
  -ContentType "application/json" `
  -TimeoutSec 7200

$Elapsed = (Get-Date) - $Start

$Result | ConvertTo-Json -Depth 100 | Out-Host
Write-Host "Elapsed seconds: $([math]::Round($Elapsed.TotalSeconds, 1))"

if ($Result.ok -ne $true) {
  Write-Host ""
  Write-Host "Mesh generation failed. Result above contains the failure." -ForegroundColor Red
  exit 1
}

$JobId = $Result.job_id
$JobDir = Join-Path $Root "Archive\agent-lee-artifacts\true-character-3d-lane\true-mesh\$JobId"

$MeshObj = Join-Path $JobDir "mesh.obj"
$ModelObj = Join-Path $JobDir "model.obj"
$ModelGlb = Join-Path $JobDir "model.glb"
$UprightGlb = Join-Path $JobDir "model_upright.glb"

if ((Test-Path $MeshObj) -and -not (Test-Path $ModelObj)) {
  Copy-Item -Force $MeshObj $ModelObj
}

# Post-process orientation in the container using trimesh.
$ContainerPy = @"
from pathlib import Path
import math
import trimesh
import trimesh.transformations as tf

job = Path('/artifacts/true-mesh/$JobId')
src = job / 'model.glb'
out = job / 'model_upright.glb'

scene = trimesh.load(str(src), force='scene')

# Rotate 180 degrees around Z to fix upside-down screen orientation.
rot_z = tf.rotation_matrix(math.pi, [0, 0, 1])
scene.apply_transform(rot_z)

scene.export(str(out))
print('upright_exported', out, out.exists(), out.stat().st_size if out.exists() else 0)
"@

docker exec agent-lee-true-character-mesh-lane python -c $ContainerPy

$RuntimeViewer = Join-Path $JobDir "agent-lee-object-runtime-v2.html"

@"
<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Agent Lee 3D Object Runtime V2</title>

  <script type="importmap">
  {
    "imports": {
      "three": "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js",
      "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/"
    }
  }
  </script>

  <style>
    html, body {
      margin: 0;
      width: 100%;
      height: 100%;
      overflow: hidden;
      background: #050505;
      color: white;
      font-family: Arial, sans-serif;
      user-select: none;
    }
    canvas { display: block; }
    #hud {
      position: fixed;
      top: 12px;
      left: 12px;
      z-index: 20;
      background: rgba(0,0,0,.78);
      border: 1px solid #333;
      border-radius: 12px;
      padding: 12px 14px;
      width: 460px;
      box-shadow: 0 0 30px rgba(0,0,0,.5);
    }
    #status {
      color: #ffe08a;
      margin-top: 8px;
      font-size: 14px;
    }
    button {
      background: #1b1b1b;
      color: #fff;
      border: 1px solid #444;
      border-radius: 8px;
      padding: 6px 8px;
      margin: 4px 4px 0 0;
      cursor: pointer;
    }
    button:hover { background: #303030; }
    a {
      color: #8fd3ff;
      margin-right: 10px;
      display: inline-block;
      margin-top: 8px;
    }
    #menu {
      position: fixed;
      z-index: 30;
      display: none;
      background: #101010;
      border: 1px solid #444;
      border-radius: 10px;
      box-shadow: 0 10px 40px rgba(0,0,0,.65);
      padding: 6px;
      min-width: 230px;
    }
    #menu button {
      display: block;
      width: 100%;
      text-align: left;
      margin: 0;
      border-radius: 6px;
      border: 0;
      background: transparent;
      padding: 9px 10px;
    }
    #menu button:hover { background: #242424; }
  </style>
</head>

<body>
  <div id="hud">
    <b>Agent Lee 3D Object Runtime V2</b><br/>
    Job ID: <code>$JobId</code><br/>
    Improved source pass. Drag rotate | wheel zoom | right-click menu

    <div>
      <button id="spinBtn">Spin On/Off</button>
      <button id="resetBtn">Reset</button>
      <button id="fitBtn">Fit Object</button>
      <button id="zoomInBtn">Zoom In</button>
      <button id="zoomOutBtn">Zoom Out</button>
      <button id="brightUpBtn">Light +</button>
      <button id="brightDownBtn">Light -</button>
      <button id="wireBtn">Wireframe</button>
      <button id="gridBtn">Grid</button>
      <button id="bgBtn">Background</button>
    </div>

    <div>
      <button id="rotXBtn">Rotate X 90</button>
      <button id="rotYBtn">Rotate Y 90</button>
      <button id="rotZBtn">Rotate Z 90</button>
      <button id="flipBtn">Flip 180</button>
    </div>

    <div>
      <a href="./model_upright.glb" download>Download Upright GLB</a>
      <a href="./model.glb" download>Original GLB</a>
      <a href="./model.obj" download>OBJ</a>
      <a href="./mesh.obj" download>mesh.obj</a>
    </div>

    <div id="status">Loading model_upright.glb...</div>
  </div>

  <div id="menu">
    <button data-action="spin">Toggle Freestyle Spin</button>
    <button data-action="reset">Reset View</button>
    <button data-action="fit">Fit Object</button>
    <button data-action="zoomIn">Zoom In</button>
    <button data-action="zoomOut">Zoom Out</button>
    <button data-action="brightUp">Increase Light</button>
    <button data-action="brightDown">Decrease Light</button>
    <button data-action="wire">Toggle Wireframe</button>
    <button data-action="grid">Toggle Grid</button>
    <button data-action="bg">Toggle Background</button>
    <button data-action="flip">Flip 180</button>
    <button data-action="screenshot">Save Screenshot</button>
  </div>

  <script type="module">
    import * as THREE from "three";
    import { OrbitControls } from "three/addons/controls/OrbitControls.js";
    import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

    const status = document.getElementById("status");
    const menu = document.getElementById("menu");

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x2b2b2b);

    const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.001, 10000);
    camera.position.set(0, 0.8, 4);

    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.enablePan = true;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 1.2;

    const hemi = new THREE.HemisphereLight(0xffffff, 0x222222, 2.8);
    scene.add(hemi);

    const key = new THREE.DirectionalLight(0xffffff, 4.0);
    key.position.set(4, 6, 5);
    scene.add(key);

    const fill = new THREE.DirectionalLight(0xff3344, 2.0);
    fill.position.set(-4, 2, 4);
    scene.add(fill);

    const blue = new THREE.DirectionalLight(0x6688ff, 1.4);
    blue.position.set(3, 2, -4);
    scene.add(blue);

    const grid = new THREE.GridHelper(6, 24, 0x333333, 0x171717);
    grid.position.y = -1.2;
    scene.add(grid);

    let model = null;
    let wire = false;
    let bgDark = false;
    let lightPower = 1.0;

    function fitObject() {
      if (!model) return;

      const box = new THREE.Box3().setFromObject(model);
      const size = new THREE.Vector3();
      const center = new THREE.Vector3();

      box.getSize(size);
      box.getCenter(center);

      model.position.sub(center);

      const maxDim = Math.max(size.x, size.y, size.z);
      if (maxDim > 0) {
        model.scale.setScalar(2.8 / maxDim);
      }

      controls.target.set(0, 0, 0);
      camera.position.set(0, 0.8, 4);
      controls.update();
    }

    function resetView() {
      camera.position.set(0, 0.8, 4);
      controls.target.set(0, 0, 0);
      controls.update();
    }

    function zoom(factor) {
      camera.position.multiplyScalar(factor);
      controls.update();
    }

    function updateLight() {
      hemi.intensity = 2.8 * lightPower;
      key.intensity = 4.0 * lightPower;
      fill.intensity = 2.0 * lightPower;
      blue.intensity = 1.4 * lightPower;
    }

    function toggleWire() {
      wire = !wire;
      if (!model) return;
      model.traverse((obj) => {
        if (obj.isMesh && obj.material) {
          obj.material.wireframe = wire;
          obj.material.needsUpdate = true;
        }
      });
    }

    function toggleGrid() { grid.visible = !grid.visible; }

    function toggleBackground() {
      bgDark = !bgDark;
      scene.background = new THREE.Color(bgDark ? 0x050505 : 0x2b2b2b);
    }

    function screenshot() {
      const link = document.createElement("a");
      link.download = "agent_lee_quality_v2_screenshot.png";
      link.href = renderer.domElement.toDataURL("image/png");
      link.click();
    }

    const loader = new GLTFLoader();

    loader.load(
      "./model_upright.glb",
      (gltf) => {
        model = gltf.scene;
        scene.add(model);

        let meshCount = 0;

        model.traverse((obj) => {
          if (obj.isMesh) {
            meshCount++;
            if (!obj.material) {
              obj.material = new THREE.MeshStandardMaterial({ color: 0x999999 });
            }
            obj.material.side = THREE.DoubleSide;
          }
        });

        fitObject();
        status.textContent = "Loaded. Mesh count: " + meshCount + ". Right-click for object controls.";
      },
      (xhr) => {
        if (xhr.total) {
          status.textContent = "Loading model_upright.glb... " + Math.round((xhr.loaded / xhr.total) * 100) + "%";
        } else {
          status.textContent = "Loading model_upright.glb... " + xhr.loaded + " bytes";
        }
      },
      (err) => {
        console.error(err);
        status.textContent = "FAILED loading model_upright.glb. Press F12 and check Console.";
      }
    );

    document.getElementById("spinBtn").onclick = () => controls.autoRotate = !controls.autoRotate;
    document.getElementById("resetBtn").onclick = resetView;
    document.getElementById("fitBtn").onclick = fitObject;
    document.getElementById("zoomInBtn").onclick = () => zoom(0.82);
    document.getElementById("zoomOutBtn").onclick = () => zoom(1.18);
    document.getElementById("brightUpBtn").onclick = () => { lightPower *= 1.25; updateLight(); };
    document.getElementById("brightDownBtn").onclick = () => { lightPower *= 0.80; updateLight(); };
    document.getElementById("wireBtn").onclick = toggleWire;
    document.getElementById("gridBtn").onclick = toggleGrid;
    document.getElementById("bgBtn").onclick = toggleBackground;

    document.getElementById("rotXBtn").onclick = () => { if(model) model.rotation.x += Math.PI / 2; };
    document.getElementById("rotYBtn").onclick = () => { if(model) model.rotation.y += Math.PI / 2; };
    document.getElementById("rotZBtn").onclick = () => { if(model) model.rotation.z += Math.PI / 2; };
    document.getElementById("flipBtn").onclick = () => { if(model) model.rotation.z += Math.PI; };

    window.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      menu.style.left = e.clientX + "px";
      menu.style.top = e.clientY + "px";
      menu.style.display = "block";
    });

    window.addEventListener("click", () => { menu.style.display = "none"; });

    menu.addEventListener("click", (e) => {
      e.stopPropagation();
      const action = e.target.getAttribute("data-action");

      if (action === "spin") controls.autoRotate = !controls.autoRotate;
      if (action === "reset") resetView();
      if (action === "fit") fitObject();
      if (action === "zoomIn") zoom(0.82);
      if (action === "zoomOut") zoom(1.18);
      if (action === "brightUp") { lightPower *= 1.25; updateLight(); }
      if (action === "brightDown") { lightPower *= 0.80; updateLight(); }
      if (action === "wire") toggleWire();
      if (action === "grid") toggleGrid();
      if (action === "bg") toggleBackground();
      if (action === "flip") { if(model) model.rotation.z += Math.PI; }
      if (action === "screenshot") screenshot();

      menu.style.display = "none";
    });

    window.addEventListener("keydown", (e) => {
      const k = e.key.toLowerCase();
      if (k === "r") resetView();
      if (k === "s") controls.autoRotate = !controls.autoRotate;
      if (k === "w") toggleWire();
      if (k === "g") toggleGrid();
      if (k === "f") { if(model) model.rotation.z += Math.PI; }
      if (k === "+") { lightPower *= 1.25; updateLight(); }
      if (k === "-") { lightPower *= 0.80; updateLight(); }
    });

    function animate() {
      requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    }

    animate();

    window.addEventListener("resize", () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    });
  </script>
</body>
</html>
"@ | Set-Content -Path $RuntimeViewer -Encoding UTF8

$FinalReceipt = @{
  verdict = "AGENT_LEE_TRUE_MESH_QUALITY_PASS_V2_COMPLETED"
  source_image = $SourceImage
  mesh_ready_gray = $GrayTarget
  mesh_ready_transparent = $TransparentTarget
  preview = $PreviewSource
  job_id = $JobId
  job_dir = $JobDir
  model_glb = $ModelGlb
  model_upright_glb = $UprightGlb
  runtime_viewer = $RuntimeViewer
  note = "Quality pass attempts to preserve wings/sword/body before TripoSR, rotates output upright, and creates improved runtime viewer."
  created_at = (Get-Date).ToString("o")
}

$ReceiptPath = Join-Path $Proof ("AGENT_LEE_TRUE_MESH_QUALITY_PASS_V2_COMPLETED_" + (Get-Date -Format "yyyyMMdd-HHmmss") + ".receipt.json")
$FinalReceipt | ConvertTo-Json -Depth 80 | Set-Content -Path $ReceiptPath -Encoding UTF8

Write-Host ""
Write-Host "Quality pass v2 complete." -ForegroundColor Green
Write-Host "Job: $JobId" -ForegroundColor Cyan
Write-Host "Viewer: $RuntimeViewer" -ForegroundColor Cyan
Write-Host "Upright GLB: $UprightGlb" -ForegroundColor Cyan
Write-Host "Receipt: $ReceiptPath" -ForegroundColor Cyan

explorer $JobDir

Start-Process powershell -ArgumentList "-NoProfile -ExecutionPolicy Bypass -Command `"cd '$JobDir'; python -m http.server 8124`""
Start-Sleep -Seconds 2
Start-Process "http://127.0.0.1:8124/agent-lee-object-runtime-v2.html"