# LEEWAY_HEADER - DO NOT REMOVE
#
# ID: LEEWAY_APP::AGENT_LEE::APPLICATION_DISCOVERY::DISCOVER_AGENT_LEE_WINDOWS_APPS
# CLASSIFICATION: DISCOVERY
# OWNER: LeeWay Local Runtime Stabilization
# PURPOSE: Refresh the canonical Agent Lee application registry and inventory from live Windows discovery sources.

[CmdletBinding()]
param(
  [switch]$CheckOnly
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Resolve-WorkspaceRoot {
  Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
}

function Read-JsonFile {
  param([Parameter(Mandatory = $true)][string]$Path)
  if (-not (Test-Path -LiteralPath $Path)) { return $null }
  try { return (Get-Content -LiteralPath $Path -Raw) | ConvertFrom-Json } catch { return $null }
}

function Write-JsonFile {
  param(
    [Parameter(Mandatory = $true)][string]$Path,
    [Parameter(Mandatory = $true)]$Payload
  )
  $parent = Split-Path -Parent $Path
  if ($parent -and -not (Test-Path -LiteralPath $parent)) {
    New-Item -ItemType Directory -Force -Path $parent | Out-Null
  }
  ($Payload | ConvertTo-Json -Depth 20) | Set-Content -LiteralPath $Path -Encoding UTF8
}

function Get-ObjectPropertyValue {
  param(
    [AllowNull()]$Object,
    [Parameter(Mandatory = $true)][string]$Name,
    [object]$Default = $null
  )

  if ($null -eq $Object) { return $Default }
  $prop = $Object.PSObject.Properties[$Name]
  if ($null -eq $prop) { return $Default }
  return $prop.Value
}

function New-ShortcutResolver {
  $shell = New-Object -ComObject WScript.Shell
  return {
    param([string]$ShortcutPath)
    if (-not (Test-Path -LiteralPath $ShortcutPath)) { return $null }
    try {
      $shortcut = $shell.CreateShortcut($ShortcutPath)
      return [ordered]@{
        path = $ShortcutPath
        targetPath = $shortcut.TargetPath
        arguments = $shortcut.Arguments
        workingDirectory = $shortcut.WorkingDirectory
        description = $shortcut.Description
      }
    } catch {
      return [ordered]@{
        path = $ShortcutPath
        error = $_.Exception.Message
      }
    }
  }
}

function Get-StartAppIndex {
  $index = @{}
  try {
    foreach ($entry in Get-StartApps) {
      $name = [string]$entry.Name
      $appId = [string]$entry.AppID
      if ([string]::IsNullOrWhiteSpace($name) -or [string]::IsNullOrWhiteSpace($appId)) { continue }
      $key = $name.ToLowerInvariant()
      if (-not $index.ContainsKey($key)) {
        $index[$key] = New-Object System.Collections.Generic.List[string]
      }
      [void]$index[$key].Add($appId)
    }
  } catch {
    $index = @{}
  }
  return $index
}

function Get-StartAppPresence {
  param(
    [Parameter(Mandatory = $true)]$Record,
    [Parameter(Mandatory = $true)]$Index
  )

  $nameKey = [string]$Record.displayName
  $appIdKey = [string](Get-ObjectPropertyValue -Object $Record -Name 'startAppId' -Default '')
  $present = $false
  $matchedAppIds = @()

  if ($Record.launchMethod -eq 'shell-appid' -and $appIdKey) {
    foreach ($pair in $Index.GetEnumerator()) {
      foreach ($candidate in $pair.Value) {
        if ($candidate -eq $appIdKey) {
          $present = $true
          $matchedAppIds += $candidate
        }
      }
    }
  }

  if ($Record.launchMethod -eq 'path' -and $Record.executablePath) {
    $present = Test-Path -LiteralPath $Record.executablePath
  }

  if ($Record.launchMethod -eq 'uri') {
    $present = $true
  }

  return [ordered]@{
    present = [bool]$present
    matchedAppIds = @($matchedAppIds | Select-Object -Unique)
    displayName = $nameKey
    startAppId = $appIdKey
  }
}

$WorkspaceRoot = Resolve-WorkspaceRoot
$RuntimeDir = Join-Path $WorkspaceRoot 'agent-lee-coding-mode\runtime'
$ReceiptDir = Join-Path $WorkspaceRoot 'Archive\receipts'
$RegistryPath = Join-Path $RuntimeDir 'agent-lee-application-registry.json'
$InventoryPath = Join-Path $RuntimeDir 'agent-lee-application-inventory.json'
New-Item -ItemType Directory -Force -Path $ReceiptDir | Out-Null
New-Item -ItemType Directory -Force -Path $RuntimeDir | Out-Null

$Registry = Read-JsonFile -Path $RegistryPath
if (-not $Registry -or -not $Registry.apps) {
  throw "Registry seed not found at $RegistryPath"
}

$StartAppIndex = Get-StartAppIndex
$ResolveShortcut = New-ShortcutResolver
$ShortcutRoots = @(
  Join-Path $env:ProgramData 'Microsoft\Windows\Start Menu\Programs'
  Join-Path $env:AppData 'Microsoft\Windows\Start Menu\Programs'
)

$ShortcutInventory = @()
foreach ($root in $ShortcutRoots) {
  if (-not (Test-Path -LiteralPath $root)) { continue }
  Get-ChildItem -LiteralPath $root -Recurse -Filter *.lnk -ErrorAction SilentlyContinue | ForEach-Object {
    $resolved = & $ResolveShortcut $_.FullName
    if ($resolved) {
      $ShortcutInventory += $resolved
    }
  }
}

$ObservedApps = @()
$PresentCount = 0
$MissingCount = 0

foreach ($record in $Registry.apps) {
  $presence = Get-StartAppPresence -Record $record -Index $StartAppIndex
  $availability = if ($presence.present) { 'present' } else { 'missing' }
  if ($presence.present) { $PresentCount += 1 } else { $MissingCount += 1 }

  $ObservedApps += [ordered]@{
    appId = $record.appId
    displayName = $record.displayName
    launchMethod = $record.launchMethod
    category = $record.category
    safeToAutoOpen = [bool]$record.safeToAutoOpen
    requiresConfirmation = [bool]$record.requiresConfirmation
    supportsFileOpen = [bool]$record.supportsFileOpen
    startAppId = Get-ObjectPropertyValue -Object $record -Name 'startAppId' -Default $null
    executablePath = Get-ObjectPropertyValue -Object $record -Name 'executablePath' -Default $null
    uri = Get-ObjectPropertyValue -Object $record -Name 'uri' -Default $null
    status = $availability
    matchedAppIds = $presence.matchedAppIds
    lastDiscoveredAt = (Get-Date).ToString('o')
  }
}

$Registry.generatedAt = (Get-Date).ToString('o')
$Registry.summary = [ordered]@{
  totalApps = @($Registry.apps).Count
  safeToAutoOpen = @($Registry.apps | Where-Object { $_.safeToAutoOpen }).Count
  requiresConfirmation = @($Registry.apps | Where-Object { $_.requiresConfirmation }).Count
  shellAppIdBacked = @($Registry.apps | Where-Object { $_.launchMethod -eq 'shell-appid' }).Count
  fileOpenCapable = @($Registry.apps | Where-Object { $_.supportsFileOpen }).Count
}

Write-JsonFile -Path $RegistryPath -Payload $Registry

$Inventory = [ordered]@{
  inventoryId = 'LEEWAY_AGENT_LEE_APPLICATION_INVENTORY'
  version = '1.0.0'
  agentId = 'agent-lee'
  scannedAt = (Get-Date).ToString('o')
  workspaceRoot = $WorkspaceRoot
  registryPath = 'agent-lee-coding-mode/runtime/agent-lee-application-registry.json'
  startAppCount = @($StartAppIndex.Keys).Count
  shortcutCount = $ShortcutInventory.Count
  presentCount = $PresentCount
  missingCount = $MissingCount
  observedApps = $ObservedApps
  shortcutInventory = $ShortcutInventory
  discoverySources = @('Get-StartApps', 'Start Menu shortcut resolution', 'Known local executable paths')
  previewOpenAttempted = $false
  previewOpenSkippedReason = 'Discovery is headless and does not open UI.'
  previewPath = $null
}

Write-JsonFile -Path $InventoryPath -Payload $Inventory

$Receipt = [ordered]@{
  receiptType = 'agent-lee-application-discovery'
  workspaceRoot = $WorkspaceRoot
  registryPath = 'agent-lee-coding-mode/runtime/agent-lee-application-registry.json'
  inventoryPath = 'agent-lee-coding-mode/runtime/agent-lee-application-inventory.json'
  discoverySources = $Inventory.discoverySources
  presentCount = $PresentCount
  missingCount = $MissingCount
  shortcutCount = $ShortcutInventory.Count
  previewOpenAttempted = $false
  previewOpenSkippedReason = 'Discovery is headless and does not open UI.'
  previewPath = $null
  filesChanged = @(
    'agent-lee-coding-mode/runtime/agent-lee-application-registry.json',
    'agent-lee-coding-mode/runtime/agent-lee-application-inventory.json'
  )
  finalStatus = if ($MissingCount -lt 1) { 'VSCODE_AGENT_LEE_CHAT_PARTICIPANT_READY' } else { 'PARTIAL_WITH_BLOCKERS' }
}

$ReceiptPath = Join-Path $ReceiptDir "agent-lee-application-discovery-$((Get-Date).ToString('yyyyMMdd-HHmmss')).json"
Write-JsonFile -Path $ReceiptPath -Payload $Receipt

Write-Host "Registry: $RegistryPath" -ForegroundColor DarkGray
Write-Host "Inventory: $InventoryPath" -ForegroundColor DarkGray
Write-Host "Receipt: $ReceiptPath" -ForegroundColor DarkGray
Write-Host ($Receipt | ConvertTo-Json -Depth 8)

if ($CheckOnly) {
  exit 0
}

if ($MissingCount -gt 0) {
  Write-Host 'Agent Lee application discovery completed with blockers.' -ForegroundColor Yellow
} else {
  Write-Host 'Agent Lee application discovery completed.' -ForegroundColor Green
}
