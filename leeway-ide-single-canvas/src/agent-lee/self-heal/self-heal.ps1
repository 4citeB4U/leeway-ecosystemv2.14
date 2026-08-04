<#
LEEWAY_HEADER - DO NOT REMOVE

REGION: CORE
TAG: CORE.AGENT_LEE.SELF_HEAL.SELF_HEAL
DISCOVERY_PIPELINE: Voice -> Intent -> Location -> Vertical -> Ranking -> Render
#>

param(
  [int]$MaxAttempts = 3
)

$Root = "$HOME\.leeway-vscode"
$ExtRoot = "$Root\agent-lee\vscode-extension"
$Verify = "$Root\scripts\run-full-test.ps1"
$Workspace = "$Root\workspace\repairs"
$Receipts = "$Root\memory\receipts"
$Logs = "$Root\logs\daily"
$Branch = "agent-lee/self-heal-" + (Get-Date -Format "yyyyMMdd-HHmmss")

New-Item -ItemType Directory -Force -Path $Workspace,$Receipts,$Logs | Out-Null

function Write-Receipt($type, $data) {
  $entry = @{
    ts = (Get-Date -Format "o")
    type = $type
    data = $data
  } | ConvertTo-Json -Compress
  Add-Content "$Receipts\self-heal.jsonl" $entry
}

function Run-Verify {
  try {
    $out = & $Verify 2>&1 | Out-String
    if ($out -match "Grade:\s+GOLD") { return @{ ok = $true; out = $out } }
    return @{ ok = $false; out = $out }
  } catch {
    return @{ ok = $false; out = $_.Exception.Message }
  }
}

function New-RepairBranch {
  Push-Location $ExtRoot
  git rev-parse --is-inside-work-tree | Out-Null 2>$null
  if ($LASTEXITCODE -ne 0) {
    git init | Out-Null
    git add . | Out-Null
    git commit -m "init" | Out-Null
  }
  git checkout -b $Branch | Out-Null
  Pop-Location
}

function Apply-Patch($patchText) {
  # patchText is a JSON with { "files": [ { "path": "...", "content": "..." } ] }
  $obj = $patchText | ConvertFrom-Json
  foreach ($f in $obj.files) {
    $full = Join-Path $ExtRoot $f.path
    New-Item -ItemType Directory -Force -Path (Split-Path $full) | Out-Null
    $f.content | Set-Content $full -Encoding UTF8
  }
}

function Call-Model($prompt, $model="qwen2.5-coder:7b") {
  $body = @{
    model = $model
    stream = $false
    prompt = @"
You are Agent Lee Prime.

Rules:
- Output ONLY valid JSON with schema:
{ "files": [ { "path": "relative/path.ts", "content": "FULL FILE CONTENT" } ] }
- Minimal patches. Do not touch unrelated files.
- Respect LeeWay: keep law-engine, scheduler, logger intact.
- If unsure, return empty patch: { "files": [] }

Task:
$prompt
"@
  } | ConvertTo-Json -Depth 6

  $res = Invoke-RestMethod -Uri "http://localhost:11434/api/generate" -Method Post -ContentType "application/json" -Body $body
  return $res.response
}

# ---- START ----
Add-Content "$Logs\self-heal.log" "[START] $(Get-Date)"

$result = Run-Verify
if ($result.ok) {
  Add-Content "$Logs\self-heal.log" "[OK] Already GOLD"
  Write-Receipt "noop" "already-gold"
  exit 0
}

New-RepairBranch
Write-Receipt "branch" $Branch

$attempt = 0
while ($attempt -lt $MaxAttempts) {
  $attempt++

  $prompt = @"
System is NOT GOLD. Analyze and fix minimal issues.
Common targets:
- extension.ts missing/wrong checkGoldStatus
- law-engine.ts wording
- scheduler limits
- broken imports/compile
Return JSON patch only.
"@

  $patch = Call-Model $prompt

  if ($patch -match '"files"\s*:\s*\[\s*\]') {
    Add-Content "$Logs\self-heal.log" "[WARN] Empty patch"
    Write-Receipt "empty-patch" $attempt
    break
  }

  try {
    Apply-Patch $patch
    Write-Receipt "patch-applied" $attempt

    Push-Location $ExtRoot
    npm run compile | Out-Null
    git add . | Out-Null
    git commit -m "self-heal attempt $attempt" | Out-Null
    Pop-Location

    $vr = Run-Verify
    if ($vr.ok) {
      Add-Content "$Logs\self-heal.log" "[SUCCESS] GOLD restored"
      Write-Receipt "success" $attempt
      exit 0
    } else {
      Add-Content "$Logs\self-heal.log" "[RETRY] attempt $attempt failed"
      Write-Receipt "retry" $attempt
    }
  } catch {
    Add-Content "$Logs\self-heal.log" "[ERROR] $($_.Exception.Message)"
    Write-Receipt "error" $($_.Exception.Message)
  }
}

Add-Content "$Logs\self-heal.log" "[FAIL] Could not restore GOLD"
Write-Receipt "fail" $MaxAttempts
exit 1

