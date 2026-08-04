$ErrorActionPreference = "Stop"

$Root = "D:\Leeway-Ecosystem v2.1.4"
$SourcePack = Join-Path $Root "Archive\agent-lee-artifacts\true-character-3d-lane\source-pack-v1"
$Proof = Join-Path $Root "Archive\proofs\true-character-3d-lane"
$Stamp = Get-Date -Format "yyyyMMdd-HHmmss"

New-Item -ItemType Directory -Force -Path $Proof | Out-Null

$AuditPy = Join-Path $SourcePack "audit_turnaround_contact_sheet.py"

@'
import json
import sys
import hashlib
from pathlib import Path
from PIL import Image, ImageDraw, ImageStat

source_pack = Path(sys.argv[1])
out_path = Path(sys.argv[2])

files = [
    "front_view_full_body_plain_background.png",
    "left_side_view_full_body_plain_background.png",
    "right_side_view_full_body_plain_background.png",
    "back_view_full_body_plain_background.png",
]

thumb_w, thumb_h = 384, 512
label_h = 56
sheet = Image.new("RGB", (thumb_w * 4, thumb_h + label_h), (30, 30, 30))
draw = ImageDraw.Draw(sheet)

report = {
    "verdict": "AGENT_LEE_TURNAROUND_SOURCE_VISUAL_AUDIT_REQUIRED",
    "source_pack": str(source_pack),
    "files": [],
    "warnings": []
}

hashes = []

for i, name in enumerate(files):
    p = source_pack / name
    x = i * thumb_w

    entry = {
        "name": name,
        "path": str(p),
        "exists": p.exists()
    }

    if not p.exists():
        draw.rectangle([x, 0, x + thumb_w, thumb_h + label_h], fill=(90, 20, 20))
        draw.text((x + 10, 20), f"MISSING\n{name}", fill=(255, 255, 255))
        report["warnings"].append(f"missing:{name}")
        report["files"].append(entry)
        continue

    data = p.read_bytes()
    sha = hashlib.sha256(data).hexdigest()
    hashes.append(sha)

    img = Image.open(p).convert("RGB")
    entry["size_bytes"] = len(data)
    entry["width"] = img.width
    entry["height"] = img.height
    entry["sha256"] = sha

    stat = ImageStat.Stat(img)
    entry["mean_rgb"] = [round(v, 2) for v in stat.mean]

    thumb = img.copy()
    thumb.thumbnail((thumb_w, thumb_h), Image.LANCZOS)

    bg = Image.new("RGB", (thumb_w, thumb_h), (52, 52, 52))
    ox = (thumb_w - thumb.width) // 2
    oy = (thumb_h - thumb.height) // 2
    bg.paste(thumb, (ox, oy))

    sheet.paste(bg, (x, 0))
    draw.rectangle([x, thumb_h, x + thumb_w, thumb_h + label_h], fill=(10, 10, 10))
    draw.text((x + 8, thumb_h + 8), name.replace("_plain_background.png", ""), fill=(255, 255, 255))

    report["files"].append(entry)

if len(set(hashes)) < len(hashes):
    report["warnings"].append("duplicate_or_identical_images_detected")

report["manual_acceptance_rules"] = [
    "front must be actual front view",
    "left must be actual left-side profile",
    "right must be actual right-side profile",
    "back must be actual back view",
    "plain background",
    "full body visible",
    "leathery dragon wings, not feathers",
    "tail visible",
    "sword visible or clearly included",
    "no castle/cinematic scene"
]

report["manual_rejection_rules"] = [
    "all four images look like front views",
    "side/back views are fake",
    "missing sword everywhere",
    "feather wings or feather tail",
    "cropped body",
    "poster/castle background"
]

sheet.save(out_path, quality=95)
report["contact_sheet"] = str(out_path)

print(json.dumps(report, indent=2))
'@ | Set-Content -Path $AuditPy -Encoding UTF8

python -m pip install --quiet pillow

$ContactSheet = Join-Path $SourcePack "turnaround_contact_sheet.png"
$AuditJson = python $AuditPy $SourcePack $ContactSheet

$AuditReceipt = Join-Path $Proof "AGENT_LEE_TURNAROUND_SOURCE_AUDIT_$Stamp.receipt.json"
$AuditJson | Set-Content -Path $AuditReceipt -Encoding UTF8

Write-Host ""
Write-Host "Turnaround contact sheet created." -ForegroundColor Green
Write-Host "Contact sheet: $ContactSheet" -ForegroundColor Cyan
Write-Host "Audit receipt: $AuditReceipt" -ForegroundColor Cyan

Start-Process $ContactSheet
notepad $AuditReceipt