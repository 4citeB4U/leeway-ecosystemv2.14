$ErrorActionPreference = "Stop"

$Root = "D:\Leeway-Ecosystem v2.1.4"
$ServiceRoot = Join-Path $Root "Cerebral\services\agent-lee-image-to-3d-pattern-lane"
$Requirements = Join-Path $ServiceRoot "requirements.txt"
$MainPy = Join-Path $ServiceRoot "app\main.py"
$ImageName = "agent-lee-image-to-3d-pattern-lane:local"
$ContainerName = "agent-lee-image-to-3d-pattern-lane"
$Artifacts = Join-Path $Root "Archive\agent-lee-artifacts\image-to-3d-lane"
$Proof = Join-Path $Root "Archive\proofs\image-to-3d-lane"
$Stamp = Get-Date -Format "yyyyMMdd-HHmmss"

New-Item -ItemType Directory -Force -Path $Proof | Out-Null

if (-not (Test-Path $Requirements)) {
  throw "requirements.txt not found: $Requirements"
}

if (-not (Test-Path $MainPy)) {
  throw "main.py not found: $MainPy"
}

$Req = Get-Content $Requirements -Raw

if ($Req -notmatch "(?m)^trimesh\s*$") {
  Add-Content -Path $Requirements -Value "trimesh"
}

$Text = Get-Content $MainPy -Raw

if ($Text -notmatch "(?m)^import trimesh$") {
  $Text = $Text.Replace("import requests`n", "import requests`nimport trimesh`n")
}

# Add GLB conversion helper.
if ($Text -notmatch "def create_glb_from_obj") {
  $Helper = @'

def create_glb_from_obj(job_dir: Path) -> Path:
    obj_path = job_dir / "model.obj"
    glb_path = job_dir / "model.glb"

    if not obj_path.exists():
        raise FileNotFoundError(f"OBJ not found for GLB export: {obj_path}")

    loaded = trimesh.load(str(obj_path), force="scene")

    if hasattr(loaded, "export"):
        loaded.export(str(glb_path))
    else:
        raise RuntimeError("Trimesh could not load OBJ as exportable scene.")

    return glb_path

'@

  $Text = $Text.Replace("def create_simple_glb_placeholder", $Helper + "`ndef create_simple_glb_placeholder")
}

# Replace placeholder note creation in successful conversion with real GLB attempt.
$Old = @'
        obj_path, mtl_path = create_relief_obj(texture_path, height_path, job_dir, depth_strength, grid_size)
        note_path = create_simple_glb_placeholder(job_dir)

        receipt.update({
            "ok": True,
            "verdict": "IMAGE_TO_3D_PATTERN_OBJECT_CREATED",
            "input_image": str(input_image),
            "texture": str(texture_path),
            "height_map": str(height_path),
            "obj": str(obj_path),
            "mtl": str(mtl_path),
            "glb_note": str(note_path),
            "artifact_urls": {
                "obj": f"/artifacts/{job_id}/model.obj",
                "mtl": f"/artifacts/{job_id}/model.mtl",
                "texture": f"/artifacts/{job_id}/texture.png",
                "height": f"/artifacts/{job_id}/height.png",
                "input": f"/artifacts/{job_id}/input.png",
                "receipt": f"/artifacts/{job_id}/receipt.json",
            },
'@

$New = @'
        obj_path, mtl_path = create_relief_obj(texture_path, height_path, job_dir, depth_strength, grid_size)

        glb_path = None
        glb_error = None

        try:
            glb_path = create_glb_from_obj(job_dir)
        except Exception as glb_ex:
            glb_error = str(glb_ex)
            create_simple_glb_placeholder(job_dir)

        artifact_urls = {
            "obj": f"/artifacts/{job_id}/model.obj",
            "mtl": f"/artifacts/{job_id}/model.mtl",
            "texture": f"/artifacts/{job_id}/texture.png",
            "height": f"/artifacts/{job_id}/height.png",
            "input": f"/artifacts/{job_id}/input.png",
            "receipt": f"/artifacts/{job_id}/receipt.json",
        }

        if glb_path is not None and glb_path.exists():
            artifact_urls["glb"] = f"/artifacts/{job_id}/model.glb"

        receipt.update({
            "ok": True,
            "verdict": "IMAGE_TO_3D_PATTERN_OBJECT_CREATED_WITH_GLB" if glb_path else "IMAGE_TO_3D_PATTERN_OBJECT_CREATED_GLB_DEFERRED",
            "input_image": str(input_image),
            "texture": str(texture_path),
            "height_map": str(height_path),
            "obj": str(obj_path),
            "mtl": str(mtl_path),
            "glb": str(glb_path) if glb_path else None,
            "glb_error": glb_error,
            "artifact_urls": artifact_urls,
'@

if ($Text -notmatch "IMAGE_TO_3D_PATTERN_OBJECT_CREATED_WITH_GLB") {
  $Text = $Text.Replace($Old, $New)
}

$Text = $Text.Replace(
  '"version": "1.0.0-pattern-relief-object"',
  '"version": "1.1.0-pattern-relief-object-glb"'
)

# Add GLB media type if not already present.
if ($Text -notmatch 'suffix == ".glb"') {
  $Text = $Text.Replace(
    'elif suffix == ".txt":
        media = "text/plain"',
    'elif suffix == ".txt":
        media = "text/plain"
    elif suffix == ".glb":
        media = "model/gltf-binary"'
  )
}

Set-Content -Path $MainPy -Value $Text -Encoding UTF8

docker build -t $ImageName $ServiceRoot

$Existing = docker ps -a --format "{{.Names}}" | Where-Object { $_ -eq $ContainerName }

if ($Existing) {
  docker rm -f $ContainerName | Out-Null
}

docker run -d `
  --init `
  --name $ContainerName `
  --network leeway-ecosystemv214_leeway-net `
  -p "8101:8101" `
  --mount "type=bind,source=$Artifacts,target=/artifacts" `
  -e "AGENT_LEE_ARTIFACT_ROOT=/artifacts" `
  $ImageName | Out-Null

Start-Sleep -Seconds 6

$Status = Invoke-RestMethod -Method Get -Uri "http://127.0.0.1:8101/status" -TimeoutSec 30

$Receipt = @{
  verdict = "AGENT_LEE_IMAGE_TO_3D_PATTERN_GLB_PATCHED"
  no_conversion_performed = $true
  adds = @(
    "trimesh dependency",
    "model.glb export attempt",
    "model/gltf-binary artifact serving",
    "receipt glb URL when successful"
  )
  artifact_root = $Artifacts
  container = $ContainerName
  image = $ImageName
  status = $Status
  created_at = (Get-Date).ToString("o")
}

$ReceiptPath = Join-Path $Proof "AGENT_LEE_IMAGE_TO_3D_PATTERN_GLB_PATCH_$Stamp.receipt.json"
$Receipt | ConvertTo-Json -Depth 100 | Set-Content -Path $ReceiptPath -Encoding UTF8

notepad $ReceiptPath

Write-Host ""
Write-Host "GLB patch applied to image-to-3D pattern lane." -ForegroundColor Green
Write-Host "Status: http://127.0.0.1:8101/status" -ForegroundColor Cyan