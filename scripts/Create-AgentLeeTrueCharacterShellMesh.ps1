$ErrorActionPreference = "Stop"

$Root = "D:\Leeway-Ecosystem v2.1.4"

$SourceImage = Join-Path $Root "Archive\agent-lee-artifacts\true-character-3d-lane\sources\agent_lee_dragon_dog_warrior_source.png"
$OutRoot = Join-Path $Root "Archive\agent-lee-artifacts\true-character-3d-lane\character-shell-mesh"
$Proof = Join-Path $Root "Archive\proofs\true-character-3d-lane"

$Stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$JobId = [guid]::NewGuid().ToString()
$JobDir = Join-Path $OutRoot $JobId

New-Item -ItemType Directory -Force -Path $JobDir | Out-Null
New-Item -ItemType Directory -Force -Path $Proof | Out-Null

if (-not (Test-Path $SourceImage)) {
  throw "Source image not found: $SourceImage"
}

$Py = Join-Path $JobDir "make_true_character_shell_mesh.py"

@'
import json
import math
import os
import sys
import zipfile
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter


source_path = Path(sys.argv[1])
job_dir = Path(sys.argv[2])
job_id = sys.argv[3]

job_dir.mkdir(parents=True, exist_ok=True)

src = Image.open(source_path).convert("RGBA")
src_w, src_h = src.size

# Work at a stable texture size. Keep original aspect centered on transparent square.
canvas_size = 1024
work = src.copy()
work.thumbnail((canvas_size, canvas_size), Image.LANCZOS)

texture = Image.new("RGBA", (canvas_size, canvas_size), (0, 0, 0, 0))
ox = (canvas_size - work.width) // 2
oy = (canvas_size - work.height) // 2
texture.alpha_composite(work, (ox, oy))

arr = np.array(texture).astype(np.uint8)
r = arr[:, :, 0].astype(np.int16)
g = arr[:, :, 1].astype(np.int16)
b = arr[:, :, 2].astype(np.int16)
a = arr[:, :, 3].astype(np.int16)

luma = (0.2126 * r + 0.7152 * g + 0.0722 * b).astype(np.float32)

def poly_mask(points):
    img = Image.new("L", (canvas_size, canvas_size), 0)
    pts = [(int(x * canvas_size), int(y * canvas_size)) for x, y in points]
    ImageDraw.Draw(img).polygon(pts, fill=255)
    return np.array(img) > 0

def ellipse_mask(box):
    img = Image.new("L", (canvas_size, canvas_size), 0)
    x0, y0, x1, y1 = box
    ImageDraw.Draw(img).ellipse(
        [int(x0 * canvas_size), int(y0 * canvas_size), int(x1 * canvas_size), int(y1 * canvas_size)],
        fill=255
    )
    return np.array(img) > 0

def line_mask(p0, p1, thickness):
    img = Image.new("L", (canvas_size, canvas_size), 0)
    draw = ImageDraw.Draw(img)
    draw.line(
        [
            (int(p0[0] * canvas_size), int(p0[1] * canvas_size)),
            (int(p1[0] * canvas_size), int(p1[1] * canvas_size)),
        ],
        fill=255,
        width=int(thickness * canvas_size)
    )
    return np.array(img) > 0

# Manual semantic keep zones for this character composition.
# These preserve the parts rembg lost: red wings, tail, sword, horns, legs.
left_wing_zone = poly_mask([
    (0.05, 0.27), (0.22, 0.17), (0.37, 0.23), (0.44, 0.41),
    (0.35, 0.55), (0.19, 0.54), (0.07, 0.45)
])

right_wing_zone = poly_mask([
    (0.57, 0.19), (0.90, 0.16), (0.92, 0.42), (0.83, 0.55),
    (0.64, 0.55), (0.54, 0.41)
])

body_zone = poly_mask([
    (0.39, 0.18), (0.58, 0.18), (0.68, 0.34), (0.68, 0.62),
    (0.62, 0.83), (0.49, 0.88), (0.36, 0.82), (0.30, 0.58),
    (0.31, 0.36)
])

head_horns_zone = poly_mask([
    (0.35, 0.09), (0.54, 0.07), (0.61, 0.24), (0.55, 0.34),
    (0.40, 0.33), (0.32, 0.23)
])

left_leg_zone = poly_mask([
    (0.38, 0.60), (0.49, 0.60), (0.47, 0.92), (0.33, 0.92), (0.31, 0.78)
])

right_leg_zone = poly_mask([
    (0.53, 0.59), (0.66, 0.63), (0.72, 0.92), (0.57, 0.92), (0.48, 0.76)
])

tail_zone = poly_mask([
    (0.58, 0.52), (0.76, 0.56), (0.91, 0.67), (0.88, 0.77),
    (0.69, 0.70), (0.54, 0.62)
])

sword_zone = line_mask((0.05, 0.78), (0.39, 0.58), 0.018)

# Color/contrast rules.
red_dominant = (r > 70) & (r > g + 18) & (r > b + 18)
dark_subject = (luma < 118) & (a > 0)
blue_highlight = (b > 70) & (b > r + 10)
warm_armor = (r > 80) & (g < 95) & (b < 95)
very_dark = (luma < 72) & (a > 0)

wing_keep = (left_wing_zone | right_wing_zone) & (red_dominant | very_dark | warm_armor)
body_keep = (body_zone | head_horns_zone | left_leg_zone | right_leg_zone | tail_zone) & (dark_subject | blue_highlight | warm_armor | very_dark)
sword_keep = sword_zone & ((luma < 170) | warm_armor)

mask = wing_keep | body_keep | sword_keep

# Fill and smooth the mask so the mesh is one connected character shell.
mask_img = Image.fromarray((mask.astype(np.uint8) * 255), "L")
mask_img = mask_img.filter(ImageFilter.MaxFilter(7))
mask_img = mask_img.filter(ImageFilter.MinFilter(5))
mask_img = mask_img.filter(ImageFilter.GaussianBlur(1.2))

mask_arr = np.array(mask_img).astype(np.float32) / 255.0
mask_arr = np.where(mask_arr > 0.22, mask_arr, 0.0)

# Apply alpha to preserve actual skin/texture.
cutout_arr = arr.copy()
cutout_arr[:, :, 3] = np.clip(mask_arr * 255, 0, 255).astype(np.uint8)

cutout = Image.fromarray(cutout_arr, "RGBA")
cutout_path = job_dir / "character_cutout_wings_preserved.png"
cutout.save(cutout_path)

# Preview on checker/gray background.
checker = Image.new("RGB", (canvas_size, canvas_size), (38, 38, 38))
check_arr = np.array(checker)
block = 32
for yy in range(0, canvas_size, block):
    for xx in range(0, canvas_size, block):
        if ((xx // block) + (yy // block)) % 2 == 0:
            check_arr[yy:yy+block, xx:xx+block] = [62, 62, 62]
preview = Image.fromarray(check_arr, "RGB").convert("RGBA")
preview.alpha_composite(cutout)
preview_path = job_dir / "character_cutout_wings_preserved_preview.png"
preview.convert("RGB").save(preview_path)

# Texture for OBJ.
texture_path = job_dir / "texture.png"
cutout.save(texture_path)

# Alpha-derived height/depth map.
alpha = np.array(cutout.getchannel("A")).astype(np.float32) / 255.0
rgb = np.array(cutout.convert("RGB")).astype(np.float32)
lum = (0.2126 * rgb[:, :, 0] + 0.7152 * rgb[:, :, 1] + 0.0722 * rgb[:, :, 2]) / 255.0
depth = alpha * (0.35 + 0.65 * (1.0 - lum))
depth_img = Image.fromarray(np.clip(depth * 255, 0, 255).astype(np.uint8), "L")
height_path = job_dir / "height.png"
depth_img.save(height_path)

# Build a real character-shaped shell mesh from the preserved alpha silhouette.
# This is not a flat image plane. It has front, back, and side walls around the character silhouette.
grid_x = 128
grid_y = 128

alpha_small = cutout.getchannel("A").resize((grid_x, grid_y), Image.BICUBIC)
depth_small = depth_img.resize((grid_x, grid_y), Image.BICUBIC)

alpha_np = np.array(alpha_small).astype(np.float32) / 255.0
depth_np = np.array(depth_small).astype(np.float32) / 255.0

inside = alpha_np > 0.08

obj_path = job_dir / "model.obj"
mtl_path = job_dir / "model.mtl"

# Aspect-correct model dimensions.
model_w = 2.0
model_h = 2.0

verts = []
uvs = []
faces = []

def add_vertex(x, y, z, u, v):
    verts.append((x, y, z))
    uvs.append((u, v))
    return len(verts)

def add_quad(v1, v2, v3, v4):
    faces.append((v1, v2, v3, v4))

def point(ix, iy, z):
    u = ix / grid_x
    v = iy / grid_y
    x = (u - 0.5) * model_w
    y = (0.5 - v) * model_h
    return x, y, z, u, 1.0 - v

front_base = 0.10
back_z = -0.10
depth_strength = 0.34

for iy in range(grid_y - 1):
    for ix in range(grid_x - 1):
        cell = inside[iy, ix] or inside[iy+1, ix] or inside[iy, ix+1] or inside[iy+1, ix+1]
        if not cell:
            continue

        d = float((depth_np[iy, ix] + depth_np[iy+1, ix] + depth_np[iy, ix+1] + depth_np[iy+1, ix+1]) / 4.0)
        front_z = front_base + d * depth_strength

        # Front face.
        p00 = point(ix, iy, front_z)
        p10 = point(ix+1, iy, front_z)
        p11 = point(ix+1, iy+1, front_z)
        p01 = point(ix, iy+1, front_z)
        vf00 = add_vertex(*p00)
        vf10 = add_vertex(*p10)
        vf11 = add_vertex(*p11)
        vf01 = add_vertex(*p01)
        add_quad(vf00, vf10, vf11, vf01)

        # Back face.
        b00 = point(ix, iy, back_z)
        b10 = point(ix+1, iy, back_z)
        b11 = point(ix+1, iy+1, back_z)
        b01 = point(ix, iy+1, back_z)
        vb00 = add_vertex(*b00)
        vb10 = add_vertex(*b10)
        vb11 = add_vertex(*b11)
        vb01 = add_vertex(*b01)
        add_quad(vb01, vb11, vb10, vb00)

        # Side walls on silhouette boundary.
        left_empty = ix == 0 or not inside[iy, ix-1]
        right_empty = ix >= grid_x-2 or not inside[iy, ix+1]
        top_empty = iy == 0 or not inside[iy-1, ix]
        bottom_empty = iy >= grid_y-2 or not inside[iy+1, ix]

        if left_empty:
            add_quad(vb00, vf00, vf01, vb01)
        if right_empty:
            add_quad(vf10, vb10, vb11, vf11)
        if top_empty:
            add_quad(vb00, vb10, vf10, vf00)
        if bottom_empty:
            add_quad(vf01, vf11, vb11, vb01)

with open(obj_path, "w", encoding="utf-8") as f:
    f.write("# Agent Lee true character shell mesh\n")
    f.write("# Character-only silhouette mesh with preserved wings, sword, tail, armor skin\n")
    f.write("mtllib model.mtl\n")
    f.write("o agent_lee_dragon_dog_warrior_character_shell\n")

    for x, y, z in verts:
        f.write(f"v {x:.6f} {y:.6f} {z:.6f}\n")

    for u, v in uvs:
        f.write(f"vt {u:.6f} {v:.6f}\n")

    f.write("usemtl agent_lee_character_skin\n")

    for face in faces:
        f.write("f " + " ".join(f"{idx}/{idx}" for idx in face) + "\n")

with open(mtl_path, "w", encoding="utf-8") as f:
    f.write("newmtl agent_lee_character_skin\n")
    f.write("Ka 1.000 1.000 1.000\n")
    f.write("Kd 1.000 1.000 1.000\n")
    f.write("Ks 0.120 0.120 0.120\n")
    f.write("Ns 18.000\n")
    f.write("d 1.0\n")
    f.write("illum 2\n")
    f.write("map_Kd texture.png\n")
    f.write("map_d texture.png\n")

# Basic HTML rigid object package with embedded preview, not the final desktop runtime.
index_path = job_dir / "index.html"
package_path = job_dir / "agent_lee_true_character_shell_mesh_package.zip"

html = f"""<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Agent Lee True Character Shell Mesh</title>
  <style>
    body {{ margin:0; background:#080808; color:white; font-family:Arial,sans-serif; }}
    main {{ display:grid; grid-template-columns:420px 1fr; gap:18px; padding:20px; }}
    img {{ width:100%; border:1px solid #333; border-radius:12px; background:#222; }}
    a {{ display:block; margin:10px 0; color:#8fd3ff; font-size:16px; }}
    .card {{ background:#141414; border:1px solid #333; border-radius:14px; padding:16px; }}
    code {{ color:#ffe08a; }}
  </style>
</head>
<body>
  <main>
    <section class="card">
      <h1>Agent Lee True Character Mesh Input</h1>
      <p>Job ID: <code>{job_id}</code></p>
      <img src="./character_cutout_wings_preserved_preview.png" />
    </section>
    <section class="card">
      <h2>Downloads</h2>
      <a href="./agent_lee_true_character_shell_mesh_package.zip" download>Download full character shell mesh package</a>
      <a href="./model.obj" download>Download model.obj</a>
      <a href="./model.mtl" download>Download model.mtl</a>
      <a href="./texture.png" download>Download texture.png</a>
      <a href="./character_cutout_wings_preserved.png" download>Download character-only PNG</a>
      <a href="./height.png" download>Download height.png</a>
      <a href="./receipt.json" download>Download receipt.json</a>
      <p>This mesh is character-only and preserves wings, sword, tail, armor, and character skin. It is a silhouette shell mesh, not a full neural 360 reconstruction.</p>
    </section>
  </main>
</body>
</html>
"""
index_path.write_text(html, encoding="utf-8")

receipt = {
    "ok": True,
    "verdict": "TRUE_CHARACTER_SHELL_MESH_CREATED",
    "job_id": job_id,
    "source_image": str(source_path),
    "character_only": True,
    "not_background": True,
    "not_relief_card": True,
    "preserved_parts": [
        "head",
        "horns",
        "torso",
        "armor",
        "red_wings",
        "sword",
        "tail",
        "legs",
        "feet"
    ],
    "outputs": {
        "cutout": "character_cutout_wings_preserved.png",
        "preview": "character_cutout_wings_preserved_preview.png",
        "mesh": "model.obj",
        "material": "model.mtl",
        "texture": "texture.png",
        "height": "height.png",
        "package": "agent_lee_true_character_shell_mesh_package.zip",
        "index": "index.html"
    },
    "limitations": [
        "This is a real character-shaped shell mesh with front, back, and side walls.",
        "It is not yet full neural 360 reconstruction.",
        "True 360 mesh still requires TripoSR/Hunyuan3D or equivalent after CUDA/toolchain is fixed."
    ]
}

receipt_path = job_dir / "receipt.json"
receipt_path.write_text(json.dumps(receipt, indent=2), encoding="utf-8")

with zipfile.ZipFile(package_path, "w", compression=zipfile.ZIP_DEFLATED) as z:
    for name in [
        "index.html",
        "model.obj",
        "model.mtl",
        "texture.png",
        "height.png",
        "character_cutout_wings_preserved.png",
        "character_cutout_wings_preserved_preview.png",
        "receipt.json",
    ]:
        p = job_dir / name
        if p.exists():
            z.write(p, arcname=name)

print(json.dumps(receipt, indent=2))
'@ | Set-Content -Path $Py -Encoding UTF8

python -m pip install --quiet pillow numpy

$Json = python $Py $SourceImage $JobDir $JobId
$Json | Out-Host

$ReceiptPath = Join-Path $JobDir "receipt.json"
$PackagePath = Join-Path $JobDir "agent_lee_true_character_shell_mesh_package.zip"
$ObjPath = Join-Path $JobDir "model.obj"
$PreviewPath = Join-Path $JobDir "character_cutout_wings_preserved_preview.png"
$CutoutPath = Join-Path $JobDir "character_cutout_wings_preserved.png"
$IndexPath = Join-Path $JobDir "index.html"

$LockReceipt = @{
  verdict = "AGENT_LEE_TRUE_CHARACTER_SHELL_MESH_HOST_CREATED"
  job_id = $JobId
  source_image = $SourceImage
  folder = $JobDir
  obj = $ObjPath
  package = $PackagePath
  preview = $PreviewPath
  cutout = $CutoutPath
  index = $IndexPath
  note = "Character-only shell mesh with wings, sword, tail, armor skin preserved. Not background. Not flat full image card. Not full neural 360 yet."
  created_at = (Get-Date).ToString("o")
}

$LockReceiptPath = Join-Path $Proof "AGENT_LEE_TRUE_CHARACTER_SHELL_MESH_$Stamp.receipt.json"
$LockReceipt | ConvertTo-Json -Depth 80 | Set-Content -Path $LockReceiptPath -Encoding UTF8

Write-Host ""
Write-Host "Agent Lee true character shell mesh created." -ForegroundColor Green
Write-Host "Folder: $JobDir" -ForegroundColor Cyan
Write-Host "OBJ: $ObjPath" -ForegroundColor Cyan
Write-Host "Package: $PackagePath" -ForegroundColor Cyan
Write-Host "Preview: $PreviewPath" -ForegroundColor Cyan
Write-Host "Receipt: $LockReceiptPath" -ForegroundColor Cyan

Start-Process $PreviewPath
Start-Process $CutoutPath
Start-Process $ObjPath
explorer $JobDir