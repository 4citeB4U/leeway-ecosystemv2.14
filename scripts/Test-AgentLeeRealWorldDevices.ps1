[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

. (Join-Path $PSScriptRoot "AgentLeeRuntimeCommon.ps1")

$Root = Get-LeewayWorkspaceRoot
$ReportsRoot = Join-Path $Root "Archive\reports"
$ReceiptsRoot = Join-Path $Root "Archive\receipts"
New-LeewayDirectory -Path $ReportsRoot | Out-Null
New-LeewayDirectory -Path $ReceiptsRoot | Out-Null

$Stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$GeneratedAt = (Get-Date).ToUniversalTime().ToString("o")
$ReportPath = Join-Path $ReportsRoot "agent-lee-real-world-device-awareness-report.json"
$ReceiptPath = Join-Path $ReceiptsRoot "agent_lee_real_world_device_awareness_receipt.json"
$OwnerManifestPath = Join-Path $Root "agent-lee-coding-mode\runtime\identity\owner\owner-devices.manifest.json"

function Get-ShortHash {
  param([string]$Text)
  if ([string]::IsNullOrWhiteSpace($Text)) { return $null }
  $sha = [System.Security.Cryptography.SHA256]::Create()
  try {
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($Text)
    $hash = $sha.ComputeHash($bytes)
    return (($hash | ForEach-Object { $_.ToString("x2") }) -join "").Substring(0, 16)
  } finally {
    $sha.Dispose()
  }
}

function Get-SafePnpDevices {
  param([Parameter(Mandatory = $true)][string]$ClassName)
  if (-not (Get-Command Get-PnpDevice -ErrorAction SilentlyContinue)) { return @() }
  try {
    return @(Get-PnpDevice -Class $ClassName -ErrorAction SilentlyContinue | Select-Object FriendlyName, Status, Class, @{Name="instanceHash";Expression={ Get-ShortHash $_.InstanceId }})
  } catch {
    return @()
  }
}

function Get-DefaultPrinterObject {
  try {
    $printer = Get-CimInstance Win32_Printer -ErrorAction SilentlyContinue | Where-Object { $_.Default -eq $true } | Select-Object -First 1
    if ($printer) {
      return [ordered]@{
        name = $printer.Name
        driverName = $printer.DriverName
        portName = $printer.PortName
        printerStatus = $printer.PrinterStatus
      }
    }
  } catch {}
  return $null
}

$report = [ordered]@{
  generatedAt = $GeneratedAt
  computerName = $env:COMPUTERNAME
  windowsUser = $env:USERNAME
  audioInputs = @()
  audioOutputs = @()
  defaultAudioInput = $null
  defaultAudioOutput = $null
  cameras = @()
  printers = @()
  defaultPrinter = $null
  usbDevices = @()
  bluetoothRadioStatus = $null
  bluetoothDevices = @()
  localNetwork = $null
  networkDevices = @()
  mobileDevices = @()
  ownerRegisteredDevices = @()
  deviceDiscoveryBlockers = @()
  truthLabels = @()
  verdict = "AGENT_LEE_REAL_WORLD_DEVICE_AWARENESS_BLOCKED"
}

$audioEndpointDevices = Get-SafePnpDevices -ClassName "AudioEndpoint"
$report.audioInputs = @(
  $audioEndpointDevices | Where-Object { $_.FriendlyName -match 'Microphone|Mic|Input' } |
    Select-Object FriendlyName, Status, Class, instanceHash
)
$report.audioOutputs = @(
  $audioEndpointDevices | Where-Object { $_.FriendlyName -match 'Speaker|Headphone|Headset|Output|Audio' } |
    Select-Object FriendlyName, Status, Class, instanceHash
)
$audioInputCount = @($report.audioInputs).Count
$audioOutputCount = @($report.audioOutputs).Count
if ($audioInputCount) { $report.truthLabels += "AUDIO_INPUT_DISCOVERY_READY" } else { $report.deviceDiscoveryBlockers += "No audio inputs were discoverable." }
if ($audioOutputCount) { $report.truthLabels += "AUDIO_OUTPUT_DISCOVERY_READY" } else { $report.deviceDiscoveryBlockers += "No audio outputs were discoverable." }

try {
  $soundMapper = Get-ItemProperty -Path "HKCU:\Software\Microsoft\Multimedia\Sound Mapper" -ErrorAction SilentlyContinue
  $report.defaultAudioOutput = $soundMapper.Playback
  $report.defaultAudioInput = $soundMapper.Record
} catch {}
if (-not $report.defaultAudioOutput -and $audioOutputCount) { $report.defaultAudioOutput = $report.audioOutputs[0].FriendlyName }
if (-not $report.defaultAudioInput -and $audioInputCount) { $report.defaultAudioInput = $report.audioInputs[0].FriendlyName }
if ($report.defaultAudioOutput) { $report.truthLabels += "DEFAULT_SPEAKER_READY" }
if ($report.defaultAudioInput) { $report.truthLabels += "DEFAULT_MIC_READY" }

$report.cameras = @(
  (Get-SafePnpDevices -ClassName "Camera") +
  (Get-SafePnpDevices -ClassName "Image" | Where-Object { $_.FriendlyName -match 'Camera|Webcam' })
)
$cameraCount = @($report.cameras).Count
if ($cameraCount) { $report.truthLabels += "CAMERA_DEVICE_DISCOVERY_READY" } else { $report.truthLabels += "CAMERA_DEVICE_BLOCKED"; $report.deviceDiscoveryBlockers += "No camera device was discoverable." }

try {
  $printers = @(Get-Printer -ErrorAction SilentlyContinue | Select-Object Name, DriverName, PortName, PrinterStatus, Type, Shared)
  $report.printers = $printers
  $report.defaultPrinter = Get-DefaultPrinterObject
  $printerCount = @($printers).Count
  if ($printerCount) { $report.truthLabels += "PRINTER_DISCOVERY_READY" } else { $report.deviceDiscoveryBlockers += "No printers were discovered." }
  if ($report.defaultPrinter) { $report.truthLabels += "DEFAULT_PRINTER_READY" }
} catch {
  $report.deviceDiscoveryBlockers += "Printer discovery failed: $($_.Exception.Message)"
}

try {
  $report.usbDevices = @(Get-SafePnpDevices -ClassName "USB")
  $usbCount = @($report.usbDevices).Count
  if ($usbCount) { $report.truthLabels += "USB_DEVICE_DISCOVERY_READY" } else { $report.deviceDiscoveryBlockers += "No USB devices were discoverable." }
} catch {
  $report.deviceDiscoveryBlockers += "USB discovery failed: $($_.Exception.Message)"
}

try {
  $bluetooth = @(Get-SafePnpDevices -ClassName "Bluetooth")
  $report.bluetoothDevices = $bluetooth
  $bthService = Get-Service -Name "bthserv" -ErrorAction SilentlyContinue
  $report.bluetoothRadioStatus = if ($bthService) { $bthService.Status.ToString() } else { "Unavailable" }
  $bluetoothCount = @($bluetooth).Count
  if ($bluetoothCount) { $report.truthLabels += "BLUETOOTH_DISCOVERY_READY" } else { $report.deviceDiscoveryBlockers += "No Bluetooth devices were discoverable." }
} catch {
  $report.deviceDiscoveryBlockers += "Bluetooth discovery failed: $($_.Exception.Message)"
}

try {
  $net = Get-NetIPConfiguration -ErrorAction SilentlyContinue | Select-Object -First 1
  $neighbors = @(Get-NetNeighbor -ErrorAction SilentlyContinue | Select-Object IPAddress, State, InterfaceAlias, @{Name="linkHash";Expression={ Get-ShortHash $_.LinkLayerAddress }})
  $arp = @(arp -a 2>$null)
  $report.localNetwork = [ordered]@{
    localIp = $net.IPv4Address.IPAddress
    gateway = $net.IPv4DefaultGateway.NextHop
    subnet = $net.IPv4Address.PrefixLength
    arpLines = @($arp).Count
    neighborCount = @($neighbors).Count
  }
  $report.networkDevices = @($neighbors | Where-Object { $_.State -ne $null } | Select-Object IPAddress, State, InterfaceAlias, linkHash)
  $networkDeviceCount = @($report.networkDevices).Count
  if ($report.localNetwork.localIp -or $networkDeviceCount) { $report.truthLabels += "LOCAL_NETWORK_DISCOVERY_READY" }
  if ($networkDeviceCount) { $report.truthLabels += "NETWORK_DEVICE_DISCOVERY_READY" }
} catch {
  $report.deviceDiscoveryBlockers += "Local network discovery failed: $($_.Exception.Message)"
}

try {
  if (Get-Command adb -ErrorAction SilentlyContinue) {
    $adbOut = & adb devices 2>$null
    $adbLines = @($adbOut | Select-Object -Skip 1 | Where-Object { $_ -match '\S' })
    foreach ($line in $adbLines) {
      $parts = $line -split '\s+'
      if (@($parts).Count -ge 2) {
        $report.mobileDevices += [ordered]@{
          kind = "ANDROID_DEVICE"
          deviceIdHash = Get-ShortHash $parts[0]
          state = $parts[1]
        }
      }
    }
  }
} catch {
  $report.deviceDiscoveryBlockers += "ADB mobile discovery failed: $($_.Exception.Message)"
}
$mobileCount = @($report.mobileDevices).Count
if ($mobileCount) {
  $report.truthLabels += "MOBILE_DEVICE_VISIBLE"
} else {
  $report.truthLabels += "MOBILE_DEVICE_NOT_VISIBLE"
}

if (Test-Path -LiteralPath $OwnerManifestPath) {
  try {
    $ownerDevices = Read-LeewayJson -Path $OwnerManifestPath -Fallback @{}
    $report.ownerRegisteredDevices = @($ownerDevices.devices)
    $report.truthLabels += "OWNER_DEVICE_REGISTRY_READY"
  } catch {
    $report.deviceDiscoveryBlockers += "Owner device registry could not be read."
  }
}

$report.truthLabels += "NO_FAKE_DEVICE_DISCOVERY"
$report.truthLabels += "NO_FAKE_PHONE_IDENTIFICATION"
$report.truthLabels += "NO_FAKE_PRINTER_PASS"

$audioInputReady = [bool]($audioInputCount -gt 0)
$audioOutputReady = [bool]($audioOutputCount -gt 0)
$cameraReady = [bool]($cameraCount -gt 0)
$printerReady = [bool]($printerCount -gt 0)
$usbReady = [bool]($usbCount -gt 0)
$bluetoothReady = [bool]($bluetoothCount -gt 0)
$networkReady = [bool]($networkDeviceCount -gt 0)

$countProven = @(
  $audioInputReady,
  $audioOutputReady,
  $cameraReady,
  $printerReady,
  $usbReady,
  $bluetoothReady,
  $networkReady
) | Where-Object { $_ } | Measure-Object | Select-Object -ExpandProperty Count

if ([int]$countProven -ge 5) {
  $report.verdict = "AGENT_LEE_REAL_WORLD_DEVICE_AWARENESS_READY"
} elseif ([int]$countProven -ge 1) {
  $report.verdict = "AGENT_LEE_REAL_WORLD_DEVICE_AWARENESS_PARTIAL"
} else {
  $report.verdict = "AGENT_LEE_REAL_WORLD_DEVICE_AWARENESS_BLOCKED"
}

$report.truthLabels = @($report.truthLabels | Select-Object -Unique)
$report.deviceDiscoveryBlockers = @($report.deviceDiscoveryBlockers | Select-Object -Unique)

Write-LeewayJson -Path $ReportPath -Object $report | Out-Null
Write-LeewayJson -Path $ReceiptPath -Object $report | Out-Null

Write-Host "Verdict: $($report.verdict)" -ForegroundColor Cyan
Write-Host "Report: $ReportPath" -ForegroundColor Cyan
Write-Host "Receipt: $ReceiptPath" -ForegroundColor Cyan

return $report
