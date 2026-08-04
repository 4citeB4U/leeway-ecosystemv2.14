[CmdletBinding()]
param()

Set-StrictMode -Version Latest

. (Join-Path $PSScriptRoot "AgentLeeRuntimeCommon.ps1")

function Get-LeeWayProofLevelIndex {
  param([string]$Level)
  switch ($Level) {
    "PROOF_LEVEL_MISSING" { return -1 }
    "PROOF_LEVEL_0_DOCUMENT" { return 0 }
    "PROOF_LEVEL_1_STATIC_VALIDATION" { return 1 }
    "PROOF_LEVEL_2_COMMAND_VALIDATION" { return 2 }
    "PROOF_LEVEL_3_RUNTIME_ENDPOINT" { return 3 }
    "PROOF_LEVEL_4_FUNCTIONAL_RUNTIME" { return 4 }
    "PROOF_LEVEL_5_END_TO_END_PROOF" { return 5 }
    default { return -1 }
  }
}

function Get-LeeWayProofLevelName {
  param([int]$Index)
  switch ($Index) {
    -1 { return "PROOF_LEVEL_MISSING" }
    0 { return "PROOF_LEVEL_0_DOCUMENT" }
    1 { return "PROOF_LEVEL_1_STATIC_VALIDATION" }
    2 { return "PROOF_LEVEL_2_COMMAND_VALIDATION" }
    3 { return "PROOF_LEVEL_3_RUNTIME_ENDPOINT" }
    4 { return "PROOF_LEVEL_4_FUNCTIONAL_RUNTIME" }
    5 { return "PROOF_LEVEL_5_END_TO_END_PROOF" }
    default { return "PROOF_LEVEL_MISSING" }
  }
}

function Test-LeeWayPathExists {
  param([string]$Root, [string]$Path)
  if ([string]::IsNullOrWhiteSpace($Path)) { return $false }
  $candidate = if ([System.IO.Path]::IsPathRooted($Path)) { $Path } else { Join-Path $Root $Path }
  return (Test-Path -LiteralPath $candidate)
}

function Resolve-LeeWayProofPath {
  param([string]$Root, [string]$Path)
  if ([string]::IsNullOrWhiteSpace($Path)) { return $null }
  $candidate = if ([System.IO.Path]::IsPathRooted($Path)) { $Path } else { Join-Path $Root $Path }
  if (Test-Path -LiteralPath $candidate) {
    return (Resolve-Path -LiteralPath $candidate).Path
  }
  return $candidate
}

function Get-LeeWayLaneCategory {
  param($Lane)
  $name = [string]$Lane.laneName
  if ($name -match "Owner identity") { return "ownerIdentity" }
  if ($name -match "Owner|operator|audience") { return "ownerBoundary" }
  if ($name -match "Voice kernel|clone voice|Natural conversation|RTC|Hearing") { return "voice" }
  if ($name -match "Always listening|mic|listener") { return "hearing" }
  if ($name -match "Vision kernel") { return "visionKernel" }
  if ($name -match "Camera to Qwen") { return "cameraToQwen" }
  if ($name -match "camera|Screen|Visual AI|Room vision") { return "camera" }
  if ($name -match "Qwen|Model|Ollama|Hot-swap|Enhancement") { return "model" }
  if ($name -match "Discovery") { return "discovery" }
  if ($name -match "Desktop|Mouse|Keyboard|Autonomous|Windows service") { return "desktop" }
  if ($name -match "Printer") { return "printer" }
  if ($name -match "Room|Crowd|Teaching|Attendee|Human tracking") { return "room" }
  if ($name -match "Generated|Employment|Content|SVG|Presentation|Application") { return "generatedApplication" }
  if ($name -match "Production readiness gate|Live operating environment") { return "productionGate" }
  return "governance"
}

function Get-LeeWayRequiredProofLevel {
  param($Lane)
  $category = Get-LeeWayLaneCategory -Lane $Lane
  switch ($category) {
    "ownerIdentity" { return "PROOF_LEVEL_3_RUNTIME_ENDPOINT" }
    "ownerBoundary" { return "PROOF_LEVEL_3_RUNTIME_ENDPOINT" }
    "voice" { return "PROOF_LEVEL_4_FUNCTIONAL_RUNTIME" }
    "hearing" { return "PROOF_LEVEL_4_FUNCTIONAL_RUNTIME" }
    "visionKernel" { return "PROOF_LEVEL_3_RUNTIME_ENDPOINT" }
    "camera" { return "PROOF_LEVEL_4_FUNCTIONAL_RUNTIME" }
    "cameraToQwen" { return "PROOF_LEVEL_5_END_TO_END_PROOF" }
    "model" { return "PROOF_LEVEL_4_FUNCTIONAL_RUNTIME" }
    "discovery" { return "PROOF_LEVEL_4_FUNCTIONAL_RUNTIME" }
    "desktop" { return "PROOF_LEVEL_3_RUNTIME_ENDPOINT" }
    "printer" { return "PROOF_LEVEL_3_RUNTIME_ENDPOINT" }
    "room" { return "PROOF_LEVEL_3_RUNTIME_ENDPOINT" }
    "generatedApplication" { return "PROOF_LEVEL_5_END_TO_END_PROOF" }
    "productionGate" { return "PROOF_LEVEL_5_END_TO_END_PROOF" }
    default { return "PROOF_LEVEL_3_RUNTIME_ENDPOINT" }
  }
}

function Get-LeeWayReportVerdict {
  param([string]$Path)
  $json = Read-LeewayJson -Path $Path -Fallback $null
  if (-not $json) { return $null }
  if ($json.PSObject.Properties.Name -contains "verdict") { return [string]$json.verdict }
  if ($json.PSObject.Properties.Name -contains "result") { return [string]$json.result }
  return $null
}

function Test-LeeWayJsonFileValid {
  param([string]$Path)
  if (-not (Test-Path -LiteralPath $Path)) { return $false }
  if ($Path -notmatch "\.json$") { return $true }
  try {
    $null = Get-Content -Raw -LiteralPath $Path | ConvertFrom-Json -ErrorAction Stop
    return $true
  } catch {
    return $false
  }
}

function Get-LeeWayActualProofLevel {
  param(
    [string]$Root,
    $Lane,
    [string]$ProofSnapshotPath
  )

  $artifactPaths = @()
  foreach ($prop in @("currentFilesFound", "contractsFound", "manifestsFound", "runtimeCodeFound", "validationScriptsFound", "reportsFound", "receiptsFound")) {
    if ($Lane.PSObject.Properties.Name -contains $prop) {
      $artifactPaths += @($Lane.$prop | Where-Object { $_ })
    }
  }
  $artifactPaths = @($artifactPaths | Sort-Object -Unique)
  if ($artifactPaths.Count -eq 0) {
    return [ordered]@{
      level = "PROOF_LEVEL_MISSING"
      levelIndex = -1
      proofArtifacts = @()
      endpointProof = $null
      functionalProof = $null
      timedOut = $false
      skipped = $false
      details = "No artifacts found."
    }
  }

  $level = 0
  $details = @("Artifacts exist.")
  $invalidJson = @()
  foreach ($path in $artifactPaths) {
    if ($path -match "\.json$" -and -not (Test-LeeWayJsonFileValid -Path $path)) {
      $invalidJson += $path
    }
  }
  if ($invalidJson.Count -eq 0) {
    $level = [Math]::Max($level, 1)
    $details += "Static validation available."
  }

  $validationRan = $false
  $validationPass = $false
  $timedOut = $false
  if ($Lane.PSObject.Properties.Name -contains "validationCommandRan") { $validationRan = [bool]$Lane.validationCommandRan }
  if ($Lane.PSObject.Properties.Name -contains "validationResults") {
    foreach ($result in @($Lane.validationResults)) {
      if ($result.status -eq "PASS") { $validationPass = $true }
      if ($result.timedOut -eq $true -or $result.status -eq "TIMEOUT") { $timedOut = $true }
    }
  }
  if ($validationRan -or @($Lane.reportsFound).Count -gt 0 -or @($Lane.receiptsFound).Count -gt 0) {
    $level = [Math]::Max($level, 2)
    $details += "Command/report/receipt evidence exists."
  }

  $endpointProof = $null
  $functionalProof = $null
  foreach ($reportPath in @($Lane.reportsFound)) {
    $report = Read-LeewayJson -Path $reportPath -Fallback $null
    if (-not $report) { continue }
    $reportName = Split-Path -Leaf $reportPath
    if ($reportName -match "voice-kernel-health") {
      if ($report.health -and $report.health.ok -eq $true -and $report.portOpen -eq $true) {
        $endpointProof = [ordered]@{ report = $reportPath; route = $report.health.url; status = "RESPONDED"; rawBody = $report.health.rawBody }
        $level = [Math]::Max($level, 3)
      }
      if ($report.tts -and $report.tts.ok -eq $true) {
        $functionalProof = [ordered]@{ report = $reportPath; route = $report.tts.url; status = "AUDIO_GENERATED"; rawBody = $report.tts.rawBody }
        $level = [Math]::Max($level, 4)
      }
    } elseif ($reportName -match "vision-kernel-docker") {
      if ($report.containerFound -eq $true -and $report.routes -and $report.routes.health -and $report.routes.health.ok -eq $true) {
        $endpointProof = [ordered]@{ report = $reportPath; route = $report.routes.health.url; status = "RESPONDED"; rawBody = $report.routes.health.rawBody }
        $level = [Math]::Max($level, 3)
      }
      if ($report.routes -and $report.routes.model -and $report.routes.model.ok -eq $true) {
        $level = [Math]::Max($level, 3)
      }
    } elseif ($reportName -match "qwen3|qwen-coder|qwen-vision|model-router|model-family") {
      $verdict = Get-LeeWayReportVerdict -Path $reportPath
      $text = Get-Content -Raw -LiteralPath $reportPath
      if ($verdict -match "PASS|READY" -and $verdict -notmatch "PARTIAL|BLOCKED|FAIL|UNPROVEN" -and $text -match "responseText|rawResponse|outputReceived|models|selectedModel") {
        $functionalProof = [ordered]@{ report = $reportPath; status = "MODEL_RETURNED_OUTPUT"; verdict = $verdict }
        $level = [Math]::Max($level, 4)
      }
    } elseif ($reportName -match "owner-identity|live-embodiment-full-truth") {
      $text = Get-Content -Raw -LiteralPath $reportPath
      if ($text -match "Leonard J Lee|creator-root") {
        $endpointProof = [ordered]@{ report = $reportPath; status = "RUNTIME_IDENTITY_SURFACE_REPORTED" }
        $level = [Math]::Max($level, 3)
      }
    } elseif ($reportName -match "real-world-device-awareness") {
      $verdict = Get-LeeWayReportVerdict -Path $reportPath
      if ($verdict -match "READY|PASS" -and $verdict -notmatch "PARTIAL|BLOCKED|FAIL") {
        $functionalProof = [ordered]@{ report = $reportPath; status = "DEVICE_ENUMERATION_RETURNED" }
        $level = [Math]::Max($level, 4)
      }
    } elseif ($reportName -match "production-gate") {
      $verdict = Get-LeeWayReportVerdict -Path $reportPath
      if ($verdict) {
        $level = [Math]::Max($level, 2)
      }
    }
  }

  if ($validationPass) {
    $level = [Math]::Max($level, 2)
  }

  $snapshot = [ordered]@{
    laneId = $Lane.laneId
    laneName = $Lane.laneName
    artifactPaths = $artifactPaths
    endpointProof = $endpointProof
    functionalProof = $functionalProof
    validationCommandRan = $validationRan
    validationPass = $validationPass
    timedOut = $timedOut
    details = $details
  }
  Write-LeewayJson -Path $ProofSnapshotPath -Object $snapshot | Out-Null

  return [ordered]@{
    level = Get-LeeWayProofLevelName -Index $level
    levelIndex = $level
    proofArtifacts = @($artifactPaths + $ProofSnapshotPath)
    endpointProof = $endpointProof
    functionalProof = $functionalProof
    timedOut = $timedOut
    skipped = $false
    details = ($details -join " ")
  }
}

function Get-LeeWayCorrectedStatus {
  param(
    [string]$RequiredProofLevel,
    [string]$ActualProofLevel,
    [bool]$TimedOut,
    [bool]$Skipped,
    [string[]]$Blockers
  )

  if ($TimedOut) { return "TIMED_OUT" }
  if ($Skipped) { return "SKIPPED" }
  $required = Get-LeeWayProofLevelIndex -Level $RequiredProofLevel
  $actual = Get-LeeWayProofLevelIndex -Level $ActualProofLevel
  if ($actual -lt 0) { return "MISSING" }
  if ($actual -ge $required) { return "READY_PROVEN" }
  $blockerText = ($Blockers -join " ")
  if ($blockerText -match "approval|Creator-root|explicit capability") { return "BLOCKED_APPROVAL" }
  if ($blockerText -match "permission|consent|camera|mic|microphone") { return "BLOCKED_PERMISSION" }
  if ($blockerText -match "hardware|device") { return "BLOCKED_HARDWARE" }
  if ($blockerText -match "model|qwen|ollama") { return "BLOCKED_MODEL" }
  if ($actual -eq 0) { return "DOCUMENT_ONLY" }
  if ($actual -eq 1) { return "STATIC_ONLY" }
  if ($actual -eq 2 -and $required -ge 4) { return "FUNCTIONAL_PROOF_MISSING" }
  if ($actual -eq 2) { return "COMMAND_ONLY" }
  if ($actual -eq 3 -and $required -ge 4) { return "RUNTIME_ENDPOINT_ONLY" }
  if ($actual -eq 4 -and $required -eq 5) { return "END_TO_END_PROOF_MISSING" }
  return "PARTIALLY_PROVEN"
}

function Get-LeeWayProofStatus {
  param([string]$CorrectedStatus)
  switch ($CorrectedStatus) {
    "READY_PROVEN" { return "PROVEN" }
    "DOCUMENT_ONLY" { return "DOCUMENT_ONLY" }
    "STATIC_ONLY" { return "STATIC_ONLY" }
    "COMMAND_ONLY" { return "COMMAND_ONLY" }
    "RUNTIME_ENDPOINT_ONLY" { return "RUNTIME_ENDPOINT_ONLY" }
    "FUNCTIONAL_PROOF_MISSING" { return "FUNCTIONAL_PROOF_MISSING" }
    "END_TO_END_PROOF_MISSING" { return "END_TO_END_PROOF_MISSING" }
    "TIMED_OUT" { return "TIMED_OUT" }
    "SKIPPED" { return "SKIPPED" }
    "MISSING" { return "MISSING" }
    default {
      if ($CorrectedStatus -match "^BLOCKED_") { return $CorrectedStatus }
      return "PARTIALLY_PROVEN"
    }
  }
}

function Get-LeeWayMasterLanes {
  param([string]$Root)
  $path = Join-Path $Root "Archive\reports\leeway-master-total-ecosystem-completion-report.json"
  $report = Read-LeewayJson -Path $path -Fallback $null
  if (-not $report -or -not $report.lanes) { return @() }
  return @($report.lanes)
}
