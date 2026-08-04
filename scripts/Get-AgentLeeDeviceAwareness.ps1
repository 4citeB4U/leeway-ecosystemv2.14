[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

. (Join-Path $PSScriptRoot "AgentLeeRuntimeCommon.ps1")

$Root = Get-LeewayWorkspaceRoot
$ReportPath = Join-Path $Root "Archive\reports\agent-lee-real-world-device-awareness-report.json"
$Latest = Read-LeewayJson -Path $ReportPath -Fallback $null

if (-not $Latest) {
  Write-Host "No device awareness report found at $ReportPath" -ForegroundColor Yellow
  return
}

Write-Host "Agent Lee Device Awareness" -ForegroundColor Cyan
Write-Host "Generated: $($Latest.generatedAt)"
Write-Host "Verdict: $($Latest.verdict)"
Write-Host "Audio inputs: $(@($Latest.audioInputs).Count)"
Write-Host "Audio outputs: $(@($Latest.audioOutputs).Count)"
Write-Host "Default mic: $($Latest.defaultAudioInput)"
Write-Host "Default speaker: $($Latest.defaultAudioOutput)"
Write-Host "Cameras: $(@($Latest.cameras).Count)"
Write-Host "Printers: $(@($Latest.printers).Count)"
Write-Host "Default printer: $($Latest.defaultPrinter.name)"
Write-Host "USB devices: $(@($Latest.usbDevices).Count)"
Write-Host "Bluetooth status: $($Latest.bluetoothRadioStatus)"
Write-Host "Bluetooth devices: $(@($Latest.bluetoothDevices).Count)"
Write-Host "Network devices: $(@($Latest.networkDevices).Count)"
Write-Host "Mobile devices: $(@($Latest.mobileDevices).Count)"
Write-Host "Owner devices: $(@($Latest.ownerRegisteredDevices).Count)"
Write-Host "Blockers:"
@($Latest.deviceDiscoveryBlockers) | ForEach-Object { Write-Host " - $_" }
Write-Host "Receipt: $((Join-Path $Root 'Archive\receipts\agent_lee_real_world_device_awareness_receipt.json'))"

