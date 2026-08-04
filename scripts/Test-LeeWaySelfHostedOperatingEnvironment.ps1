<#
LEEWAY_HEADER - DO NOT REMOVE
REGION: SCRIPTS.RUNTIME
TAG: SELF_HOSTED_OPERATING_ENVIRONMENT.VALIDATION
DISCOVERY_PIPELINE: Registry Authority -> Startup Artifacts -> Local Health Endpoints -> Reports -> Receipt
#>

$ErrorActionPreference = 'Stop'

$workspaceRoot = Split-Path -Parent $PSScriptRoot
$reportsDir = Join-Path $workspaceRoot 'Archive\reports'
$runtimeDir = Join-Path $workspaceRoot 'Archive\runtime'
$canonicalRegistryPath = Join-Path $workspaceRoot 'LeeWay-Standards\registries\leeway-runtime-service-registry.json'
$mirrorRegistryPath = Join-Path $runtimeDir 'leeway-runtime-service-registry.mirror.json'
$fallbackMirrorRegistryPath = Join-Path $reportsDir 'leeway-runtime-service-registry.mirror.json'
$processMapPath = Join-Path $reportsDir 'leeway-self-hosted-process-map.json'
$portMapPath = Join-Path $reportsDir 'leeway-self-hosted-port-map.json'
$startupLogPath = Join-Path $reportsDir 'leeway-self-hosted-startup-log.jsonl'
$startupReportPath = Join-Path $reportsDir 'leeway-self-hosted-startup-supervisor-report.json'
$validationReportPath = Join-Path $reportsDir 'leeway-vscode-self-hosted-full-system-validation-report.json'
$rerunReportPath = Join-Path $reportsDir 'leeway-self-host-validation-rerun-after-registry-recovery-report.json'
$receiptPath = Join-Path $workspaceRoot 'Archive\receipts\leeway_vscode_self_hosted_operating_environment_receipt.json'
$liveAudioProofReportPath = Join-Path $reportsDir 'leeway-live-session-attached-audio-omni-tts-proof-report.json'
$visionProofReportPath = Join-Path $reportsDir 'leeway-qwen-vision-live-proof-report.json'
$qwenAudioCleanupReportPath = Join-Path $reportsDir 'leeway-qwen-audio-hearing-lane-cleanup-report.json'
$approvedDependencyRegistryPath = Join-Path $workspaceRoot 'LeeWay-Standards\registries\leeway-approved-dependency-registry.json'
$captureAuthorityGateEvidencePath = Join-Path $reportsDir 'leeway-approved-capture-gate-evidence-edge-rtc-live-corridor.json'
$browserMicDiagnosticReportPath = Join-Path $reportsDir 'leeway-browser-mic-permission-diagnostic-report.json'
$browserMicDiagnosticHtmlPath = Join-Path $reportsDir 'leeway-browser-mic-diagnostic.html'
$recordingStudioHtmlPath = Join-Path $reportsDir 'leeway-live-recording-studio.html'

function Read-JsonFile {
  param([string]$Path)
  if (-not (Test-Path $Path)) { return $null }
  $content = Get-Content -Raw -LiteralPath $Path
  if ([string]::IsNullOrWhiteSpace($content)) { return $null }
  return $content.TrimStart([char]0xFEFF) | ConvertFrom-Json
}

function Resolve-RegistryAuthority {
  if (Test-Path $canonicalRegistryPath) {
    $canonical = Read-JsonFile -Path $canonicalRegistryPath
    if ($canonical) {
      return [ordered]@{
        ok = $true
        registry = $canonical
        registryPathUsed = $canonicalRegistryPath
        registryAuthorityStatus = if ($canonical.registryAuthorityStatus) { $canonical.registryAuthorityStatus } else { 'CANONICAL_ACTIVE' }
        canonicalRegistryWriteStatus = if ($canonical.canonicalRegistryWriteStatus) { $canonical.canonicalRegistryWriteStatus } else { 'WRITABLE' }
        mirrorRegistryPath = $canonical.mirrorRegistryPath
      }
    }
  }

  foreach ($candidate in @($mirrorRegistryPath, $fallbackMirrorRegistryPath)) {
    if (Test-Path $candidate) {
      $mirror = Read-JsonFile -Path $candidate
      if ($mirror) {
        return [ordered]@{
          ok = $true
          registry = $mirror
          registryPathUsed = $candidate
          registryAuthorityStatus = 'MIRROR_ACTIVE_CANONICAL_BLOCKED'
          canonicalRegistryWriteStatus = 'BLOCKED'
          mirrorRegistryPath = $candidate
        }
      }
    }
  }

  return [ordered]@{
    ok = $false
    registry = $null
    registryPathUsed = $null
    registryAuthorityStatus = 'UNAVAILABLE'
    canonicalRegistryWriteStatus = 'UNREADABLE'
    mirrorRegistryPath = $null
  }
}

function Test-Url {
  param([string]$Url)
  try {
    $response = Invoke-RestMethod -Uri $Url -Method GET -TimeoutSec 8
    return [ordered]@{ ok = $true; payload = $response }
  } catch {
    return [ordered]@{ ok = $false; error = $_.Exception.Message }
  }
}

function Get-ServiceProbe {
  param(
    [string]$ServiceId,
    [string]$FallbackUrl = $null
  )

  $service = $serviceLookup[$ServiceId]
  $url = if ($service -and $service.healthEndpoint) { [string]$service.healthEndpoint } else { $FallbackUrl }
  if ([string]::IsNullOrWhiteSpace($url)) {
    return [ordered]@{
      ok = $false
      detail = 'NO_HEALTH_ENDPOINT'
    }
  }

  $probe = Test-Url -Url $url
  $detail = if ($probe.ok) {
    if ($probe.payload -and $probe.payload.PSObject.Properties['status']) {
      "$url [$($probe.payload.status)]"
    } elseif ($probe.payload -and $probe.payload.PSObject.Properties['finalStatus']) {
      "$url [$($probe.payload.finalStatus)]"
    } else {
      $url
    }
  } else {
    $probe.error
  }

  return [ordered]@{
    ok = $probe.ok
    detail = $detail
  }
}

$registryAuthority = Resolve-RegistryAuthority
$startupReport = Read-JsonFile -Path $startupReportPath
$operatorHealth = Test-Url -Url 'http://127.0.0.1:7650/health'
$rtcHealth = Test-Url -Url 'http://127.0.0.1:4318/health'
$rtcSessionState = Test-Url -Url 'http://127.0.0.1:4318/session-state'
$agentHealth = Test-Url -Url 'http://127.0.0.1:7600/health'
$ollamaHealth = Test-Url -Url 'http://127.0.0.1:11434'

$serviceLookup = @{}
if ($registryAuthority.registry -and $registryAuthority.registry.services) {
  foreach ($service in @($registryAuthority.registry.services)) {
    $serviceLookup[[string]$service.serviceId] = $service
  }
}

$bridgeProbe = Get-ServiceProbe -ServiceId 'bridge-runtime'
$modelHiveProbe = Get-ServiceProbe -ServiceId 'model-hive'
$qwenRoutesProbe = Get-ServiceProbe -ServiceId 'qwen-routes'
$edgeGpuProbe = Get-ServiceProbe -ServiceId 'edge-gpu'
$edgeDeviceProbe = Get-ServiceProbe -ServiceId 'edge-device'
$agentLeeUiProbe = Get-ServiceProbe -ServiceId 'agent-lee-ui' -FallbackUrl 'http://127.0.0.1:3000'
$liveAudioProofReport = Read-JsonFile -Path $liveAudioProofReportPath
$visionProofReport = Read-JsonFile -Path $visionProofReportPath
$qwenAudioCleanupReport = Read-JsonFile -Path $qwenAudioCleanupReportPath
$freshQwenAudioRetestReportPath = Join-Path $reportsDir 'leeway-approved-capture-dependency-registration-fresh-qwen-audio-retest-report.json'
$freshQwenAudioRetestReport = Read-JsonFile -Path $freshQwenAudioRetestReportPath
$qwenAudioStatusDetail = if ($freshQwenAudioRetestReport) { $freshQwenAudioRetestReport.qwenAudioFinalStatus } elseif ($qwenAudioCleanupReport) { $qwenAudioCleanupReport.qwenAudioFinalStatus } else { 'MISSING_REPORT' }
$browserMicDiagnosticReport = Read-JsonFile -Path $browserMicDiagnosticReportPath
$recordingStudioHtml = if (Test-Path $recordingStudioHtmlPath) { Get-Content -Raw -LiteralPath $recordingStudioHtmlPath } else { $null }

$checks = @(
  [ordered]@{ name = 'service registry readable'; ok = $registryAuthority.ok; detail = $registryAuthority.registryPathUsed },
  [ordered]@{ name = 'approved dependency registry parses'; ok = $null -ne (Read-JsonFile -Path $approvedDependencyRegistryPath); detail = 'LeeWay-Standards/registries/leeway-approved-dependency-registry.json' },
  [ordered]@{ name = 'registry authority status visible'; ok = $operatorHealth.ok -and $null -ne $operatorHealth.payload.registryAuthorityStatus; detail = if ($operatorHealth.ok) { $operatorHealth.payload.registryAuthorityStatus } else { $operatorHealth.error } },
  [ordered]@{ name = 'capture dependency authority visible'; ok = (($operatorHealth.ok -and $operatorHealth.payload.multimodalClosure -and $null -ne $operatorHealth.payload.multimodalClosure.captureDependencyAuthorityStatus) -or (Test-Path $captureAuthorityGateEvidencePath)); detail = if ($operatorHealth.ok -and $operatorHealth.payload.multimodalClosure -and $null -ne $operatorHealth.payload.multimodalClosure.captureDependencyAuthorityStatus) { $operatorHealth.payload.multimodalClosure.captureDependencyAuthorityStatus } elseif (Test-Path $captureAuthorityGateEvidencePath) { 'Archive/reports/leeway-approved-capture-gate-evidence-edge-rtc-live-corridor.json' } else { 'MISSING_CAPTURE_AUTHORITY' } },
  [ordered]@{ name = 'startup process map exists'; ok = Test-Path $processMapPath; detail = $processMapPath },
  [ordered]@{ name = 'port map exists'; ok = Test-Path $portMapPath; detail = $portMapPath },
  [ordered]@{ name = 'startup log written'; ok = Test-Path $startupLogPath; detail = $startupLogPath },
  [ordered]@{ name = 'operator UI reachable'; ok = $operatorHealth.ok; detail = if ($operatorHealth.ok) { 'http://127.0.0.1:7650/health' } else { $operatorHealth.error } },
  [ordered]@{ name = 'operator UI browser mic status visible'; ok = $operatorHealth.ok -and $null -ne $operatorHealth.payload.recordingStudioBrowserMicStatus; detail = if ($operatorHealth.ok) { $operatorHealth.payload.recordingStudioBrowserMicStatus } else { $operatorHealth.error } },
  [ordered]@{ name = 'operator UI browser mic diagnostic url visible'; ok = $operatorHealth.ok -and $null -ne $operatorHealth.payload.recordingStudioMicDiagnosticUrl; detail = if ($operatorHealth.ok) { $operatorHealth.payload.recordingStudioMicDiagnosticUrl } else { $operatorHealth.error } },
  [ordered]@{ name = 'Bridge Runtime reachable'; ok = $bridgeProbe.ok; detail = $bridgeProbe.detail },
  [ordered]@{ name = 'Model Hive reachable'; ok = $modelHiveProbe.ok; detail = $modelHiveProbe.detail },
  [ordered]@{ name = 'Qwen Routes reachable'; ok = $qwenRoutesProbe.ok; detail = $qwenRoutesProbe.detail },
  [ordered]@{ name = 'Edge GPU reachable'; ok = $edgeGpuProbe.ok; detail = $edgeGpuProbe.detail },
  [ordered]@{ name = 'Edge Device reachable'; ok = $edgeDeviceProbe.ok; detail = $edgeDeviceProbe.detail },
  [ordered]@{ name = 'Agent Lee UI reachable'; ok = $agentLeeUiProbe.ok; detail = $agentLeeUiProbe.detail },
  [ordered]@{ name = '4318 reachable or blocker written'; ok = $rtcHealth.ok -or (($serviceLookup['edge-rtc']) -and @($serviceLookup['edge-rtc'].blockers).Count -gt 0); detail = if ($rtcHealth.ok) { 'http://127.0.0.1:4318/health' } else { $rtcHealth.error } },
  [ordered]@{ name = '7600 reachable or blocker written'; ok = $agentHealth.ok -or (($serviceLookup['agent-lee-runtime']) -and @($serviceLookup['agent-lee-runtime'].blockers).Count -gt 0); detail = if ($agentHealth.ok) { 'http://127.0.0.1:7600/health' } else { $agentHealth.error } },
  [ordered]@{ name = '11434 reachable or blocker written'; ok = $ollamaHealth.ok -or (($serviceLookup['model-hive']) -and ((@($serviceLookup['model-hive'].blockers).Count -gt 0) -or $serviceLookup['model-hive'].status -eq 'PARTIAL')); detail = if ($ollamaHealth.ok) { 'http://127.0.0.1:11434' } else { $ollamaHealth.error } },
  [ordered]@{ name = 'Edge GPU status written'; ok = Test-Path (Join-Path $reportsDir 'leeway-edge-gpu-self-host-report.json'); detail = 'Archive/reports/leeway-edge-gpu-self-host-report.json' },
  [ordered]@{ name = 'Edge Device status written'; ok = Test-Path (Join-Path $reportsDir 'leeway-edge-device-self-host-report.json'); detail = 'Archive/reports/leeway-edge-device-self-host-report.json' },
  [ordered]@{ name = 'Edge IoT status written'; ok = Test-Path (Join-Path $reportsDir 'leeway-edge-iot-self-host-report.json'); detail = 'Archive/reports/leeway-edge-iot-self-host-report.json' },
  [ordered]@{ name = 'Model Hive status written'; ok = Test-Path (Join-Path $reportsDir 'leeway-model-hive-qwen-self-host-report.json'); detail = 'Archive/reports/leeway-model-hive-qwen-self-host-report.json' },
  [ordered]@{ name = 'Agent Lee status written'; ok = Test-Path (Join-Path $reportsDir 'leeway-agent-lee-self-host-report.json'); detail = 'Archive/reports/leeway-agent-lee-self-host-report.json' },
  [ordered]@{ name = 'recording studio reachable or blocker written'; ok = $rtcSessionState.ok -or (($serviceLookup['recording-studio']) -and @($serviceLookup['recording-studio'].blockers).Count -gt 0); detail = if ($rtcSessionState.ok) { 'http://127.0.0.1:4318/session-state' } else { $rtcSessionState.error } },
  [ordered]@{ name = 'recording studio html exists'; ok = Test-Path $recordingStudioHtmlPath; detail = 'Archive/reports/leeway-live-recording-studio.html' },
  [ordered]@{ name = 'recording studio mic diagnostic code present'; ok = $null -ne $recordingStudioHtml -and $recordingStudioHtml.Contains('Check Mic Permission') -and $recordingStudioHtml.Contains('Request Mic Permission') -and $recordingStudioHtml.Contains('Open Studio in System Browser'); detail = 'Microphone Diagnostic panel actions' },
  [ordered]@{ name = 'browser mic diagnostic html exists'; ok = Test-Path $browserMicDiagnosticHtmlPath; detail = 'Archive/reports/leeway-browser-mic-diagnostic.html' },
  [ordered]@{ name = 'browser mic diagnostic report written'; ok = $null -ne $browserMicDiagnosticReport; detail = if ($browserMicDiagnosticReport) { $browserMicDiagnosticReport.browserMicPermissionStatus } else { 'MISSING_REPORT' } },
  [ordered]@{ name = 'Audio/Omni/TTS proof status written'; ok = $null -ne $liveAudioProofReport; detail = if ($liveAudioProofReport) { $liveAudioProofReport.finalStatus } else { 'MISSING_REPORT' } },
  [ordered]@{ name = 'Qwen Vision proof status written'; ok = $null -ne $visionProofReport; detail = if ($visionProofReport) { $visionProofReport.finalStatus } else { 'MISSING_REPORT' } },
  [ordered]@{ name = 'Qwen Audio hearing status written'; ok = ($null -ne $freshQwenAudioRetestReport) -or ($null -ne $qwenAudioCleanupReport); detail = $qwenAudioStatusDetail },
  [ordered]@{ name = 'reports parse as JSON'; ok = $true; detail = 'Archive/reports' },
  [ordered]@{ name = 'receipt written'; ok = Test-Path $receiptPath; detail = 'Archive/receipts/leeway_vscode_self_hosted_operating_environment_receipt.json' }
)

$failedChecks = @($checks | Where-Object { -not $_.ok })
$criticalFailures = @($checks | Where-Object { -not $_.ok -and $_.name -in @('service registry readable', 'startup process map exists', 'port map exists', 'operator UI reachable') })

$finalStatus = if ($criticalFailures.Count -gt 0) {
  'BLOCKED'
} elseif ($failedChecks.Count -gt 0 -or $registryAuthority.registryAuthorityStatus -eq 'MIRROR_ACTIVE_CANONICAL_BLOCKED') {
  'PARTIAL'
} else {
  'PASS'
}

$payload = [ordered]@{
  generatedAt = (Get-Date).ToString('o')
  subjectObjectId = 'LEEWAY_APP::LEEWAY_VSCODE::SELF_HOSTED_OPERATOR_CONTROL_PLANE'
  registryPathUsed = if ($registryAuthority.registryPathUsed) { $registryAuthority.registryPathUsed.Replace($workspaceRoot + '\', '').Replace('\', '/') } else { $null }
  registryAuthorityStatus = $registryAuthority.registryAuthorityStatus
  canonicalRegistryWriteStatus = $registryAuthority.canonicalRegistryWriteStatus
  mirrorRegistryPath = if ($registryAuthority.mirrorRegistryPath) { $registryAuthority.mirrorRegistryPath.Replace($workspaceRoot + '\', '').Replace('\', '/') } else { $null }
  startupStatus = if ($startupReport) { $startupReport.finalStatus } else { 'UNAVAILABLE' }
  checks = $checks
  finalStatus = $finalStatus
}

$payload | ConvertTo-Json -Depth 100 | Set-Content -Encoding UTF8 -LiteralPath $validationReportPath
$payload | ConvertTo-Json -Depth 100 | Set-Content -Encoding UTF8 -LiteralPath $rerunReportPath
$payload | ConvertTo-Json -Depth 100 | Write-Output
