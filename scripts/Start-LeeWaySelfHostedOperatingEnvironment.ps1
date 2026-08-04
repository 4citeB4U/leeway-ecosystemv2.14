<#
LEEWAY_HEADER - DO NOT REMOVE
REGION: SCRIPTS.RUNTIME
TAG: SELF_HOSTED_OPERATING_ENVIRONMENT.STARTUP_SUPERVISOR
DISCOVERY_PIPELINE: Standards -> Runtime Service Registry -> Dependency Order -> Startup -> Health -> Reports -> Receipt
#>

$ErrorActionPreference = 'Stop'

$workspaceRoot = Split-Path -Parent $PSScriptRoot
$reportsDir = Join-Path $workspaceRoot 'Archive\reports'
$receiptsDir = Join-Path $workspaceRoot 'Archive\receipts'
$runtimeDir = Join-Path $workspaceRoot 'Archive\runtime'
$logsDir = Join-Path $workspaceRoot 'Archive\logs\self-hosted-operating-environment'
$canonicalRegistryPath = Join-Path $workspaceRoot 'LeeWay-Standards\registries\leeway-runtime-service-registry.json'
$mirrorRegistryPath = Join-Path $runtimeDir 'leeway-runtime-service-registry.mirror.json'
$fallbackMirrorRegistryPath = Join-Path $reportsDir 'leeway-runtime-service-registry.mirror.json'
$processMapPath = Join-Path $reportsDir 'leeway-self-hosted-process-map.json'
$portMapPath = Join-Path $reportsDir 'leeway-self-hosted-port-map.json'
$startupReportPath = Join-Path $reportsDir 'leeway-self-hosted-startup-supervisor-report.json'
$startupLogPath = Join-Path $reportsDir 'leeway-self-hosted-startup-log.jsonl'
$blockerReportPath = Join-Path $reportsDir 'leeway-self-hosted-blocker-report.json'

New-Item -ItemType Directory -Force -Path $reportsDir, $receiptsDir, $runtimeDir, $logsDir | Out-Null

function Read-JsonFile {
  param([string]$Path)
  if (-not (Test-Path $Path)) { return $null }
  $content = Get-Content -Raw -LiteralPath $Path
  if ([string]::IsNullOrWhiteSpace($content)) { return $null }
  return $content.TrimStart([char]0xFEFF) | ConvertFrom-Json
}

function Write-JsonAtomic {
  param([string]$Path, [object]$Payload)
  $directory = Split-Path -Parent $Path
  if ($directory) { New-Item -ItemType Directory -Force -Path $directory | Out-Null }
  $tempPath = Join-Path $directory ('.' + [System.IO.Path]::GetRandomFileName() + '.tmp')
  $Payload | ConvertTo-Json -Depth 100 | Set-Content -Encoding UTF8 -LiteralPath $tempPath
  Move-Item -LiteralPath $tempPath -Destination $Path -Force
}

function Append-Jsonl {
  param([string]$Path, [object]$Payload)
  ($Payload | ConvertTo-Json -Depth 100 -Compress) + "`n" | Add-Content -Encoding UTF8 -LiteralPath $Path
}

function Convert-ArgumentListToString {
  param([object[]]$Arguments)
  if (-not $Arguments -or $Arguments.Count -eq 0) { return '' }
  return (($Arguments | ForEach-Object {
    $stringValue = [string]$_
    if ($stringValue -match '\s') { '"' + $stringValue.Replace('"', '\"') + '"' } else { $stringValue }
  }) -join ' ')
}

function Get-ArrayValue {
  param($Value)
  if ($null -eq $Value) { return @() }
  if ($Value -is [string]) {
    if ([string]::IsNullOrWhiteSpace($Value)) { return @() }
    return @($Value)
  }
  if ($Value -is [System.Collections.IEnumerable]) {
    return @($Value | Where-Object { $null -ne $_ -and -not [string]::IsNullOrWhiteSpace([string]$_) })
  }
  return @($Value)
}

function Get-HealthBlockers {
  param($Payload)

  if ($null -eq $Payload) { return @() }
  if ($Payload.PSObject.Properties['blockers']) {
    return Get-ArrayValue -Value $Payload.blockers
  }
  if ($Payload.PSObject.Properties['blocker']) {
    return Get-ArrayValue -Value $Payload.blocker
  }
  return @()
}

function Resolve-HealthStatus {
  param(
    [hashtable]$Health,
    [string]$DefaultStatus = 'LIVE'
  )

  if (-not $Health.ok) {
    return [ordered]@{
      status = 'BLOCKED'
      blockers = @($Health.error)
    }
  }

  $payload = $Health.payload
  $rawStatus = $null
  foreach ($propertyName in @('status', 'finalStatus', 'currentStatus')) {
    if ($payload -and $payload.PSObject.Properties[$propertyName] -and $payload.$propertyName) {
      $rawStatus = [string]$payload.$propertyName
      break
    }
  }

  $statusToken = if ($null -ne $rawStatus -and -not [string]::IsNullOrWhiteSpace([string]$rawStatus)) { [string]$rawStatus } else { $DefaultStatus }
  $status = switch ($statusToken.ToUpperInvariant()) {
    { $_ -in @('PASS', 'LIVE', 'ACTIVE', 'OK') } { 'LIVE'; break }
    { $_ -in @('PARTIAL', 'WARN', 'WARNING') } { 'PARTIAL'; break }
    { $_ -in @('BLOCKED', 'FAIL', 'FAILED', 'ERROR') } { 'BLOCKED'; break }
    default { $DefaultStatus }
  }

  return [ordered]@{
    status = $status
    blockers = @(Get-HealthBlockers -Payload $payload)
  }
}

function Test-PortFree {
  param([int]$Port)
  if (-not $Port) { return $true }
  try {
    $listener = [System.Net.Sockets.TcpListener]::new([Net.IPAddress]::Parse('127.0.0.1'), $Port)
    $listener.Start()
    $listener.Stop()
    return $true
  } catch {
    return $false
  }
}

function Get-PortOwningProcessId {
  param([int]$Port)
  if (-not $Port) { return $null }
  try {
    $listener = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction Stop | Select-Object -First 1
    if ($listener) { return $listener.OwningProcess }
  } catch {
  }
  return $null
}

function Test-HealthEndpoint {
  param([string]$Url)
  if ([string]::IsNullOrWhiteSpace($Url)) {
    return [ordered]@{ ok = $false; error = 'NO_HEALTH_ENDPOINT' }
  }
  try {
    $response = Invoke-RestMethod -Uri $Url -Method GET -TimeoutSec 8
    return [ordered]@{ ok = $true; payload = $response }
  } catch {
    return [ordered]@{ ok = $false; error = $_.Exception.Message }
  }
}

function New-MirrorRegistryPayload {
  param(
    [object]$CanonicalPayload,
    [string]$MirrorPath,
    [string]$MirrorReason
  )
  return [ordered]@{
    registryId = 'LEEWAY_REGISTRY_MIRROR::RUNTIME_SERVICE_REGISTRY::WRITABLE_AUTHORITY_PROXY'
    canonicalRegistryId = 'LEEWAY_REGISTRY::RUNTIME_SERVICE_REGISTRY'
    canonicalPath = 'LeeWay-Standards/registries/leeway-runtime-service-registry.json'
    mirrorPath = $MirrorPath.Replace($workspaceRoot + '\', '').Replace('\', '/')
    mirrorReason = $MirrorReason
    canonicalWriteStatus = 'BLOCKED'
    authorityId = 'LEEWAY_AUTHORITY::CREATOR_DELEGATED::LEONARD_LEE::VSCODE_OPERATING_ENVIRONMENT'
    allowedUse = 'SELF_HOST_VALIDATION_UNBLOCKING_ONLY'
    promotionLimit = 'PARTIAL_UNTIL_CANONICAL_WRITE_RESTORED'
    createdAt = if ($CanonicalPayload.createdAt) { $CanonicalPayload.createdAt } else { (Get-Date).ToString('o') }
    updatedAt = (Get-Date).ToString('o')
    registryAuthorityStatus = 'MIRROR_ACTIVE_CANONICAL_BLOCKED'
    status = 'ACTIVE'
    services = @($CanonicalPayload.services)
  }
}

function Save-RegistryWithAuthority {
  param([object]$Payload)
  $Payload.updatedAt = (Get-Date).ToString('o')
  $Payload.canonicalPath = 'LeeWay-Standards/registries/leeway-runtime-service-registry.json'

  try {
    $Payload.registryId = 'LEEWAY_REGISTRY::RUNTIME_SERVICE_REGISTRY'
    $Payload.registryAuthorityStatus = 'CANONICAL_ACTIVE'
    $Payload.canonicalRegistryWriteStatus = 'WRITABLE'
    $Payload.mirrorRegistryPath = $null
    $Payload.mirrorReason = $null
    $Payload.allowedUse = $null
    $Payload.promotionLimit = $null
    Write-JsonAtomic -Path $canonicalRegistryPath -Payload $Payload
    return [ordered]@{
      registryPathUsed = $canonicalRegistryPath
      registryAuthorityStatus = 'CANONICAL_ACTIVE'
      canonicalRegistryWriteStatus = 'WRITABLE'
      mirrorRegistryPath = $null
      mirrorUsed = $false
      writeError = $null
    }
  } catch {
    $writeError = $_.Exception.Message
    foreach ($candidate in @($mirrorRegistryPath, $fallbackMirrorRegistryPath)) {
      try {
        $mirrorPayload = New-MirrorRegistryPayload -CanonicalPayload $Payload -MirrorPath $candidate -MirrorReason $writeError
        Write-JsonAtomic -Path $candidate -Payload $mirrorPayload
        return [ordered]@{
          registryPathUsed = $candidate
          registryAuthorityStatus = 'MIRROR_ACTIVE_CANONICAL_BLOCKED'
          canonicalRegistryWriteStatus = 'BLOCKED'
          mirrorRegistryPath = $candidate
          mirrorUsed = $true
          writeError = $writeError
        }
      } catch {
      }
    }
    throw
  }
}

function Load-RegistryWithAuthority {
  if (Test-Path $canonicalRegistryPath) {
    $canonical = Read-JsonFile -Path $canonicalRegistryPath
    if ($canonical) {
      return [ordered]@{
        payload = $canonical
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
          payload = $mirror
          registryPathUsed = $candidate
          registryAuthorityStatus = 'MIRROR_ACTIVE_CANONICAL_BLOCKED'
          canonicalRegistryWriteStatus = 'BLOCKED'
          mirrorRegistryPath = $candidate
        }
      }
    }
  }

  throw "No runtime service registry was readable from canonical or governed mirror paths."
}

function Start-ServiceProcess {
  param([object]$Service)

  $stdoutLog = Join-Path $logsDir ("{0}-stdout.log" -f $Service.serviceId)
  $stderrLog = Join-Path $logsDir ("{0}-stderr.log" -f $Service.serviceId)
  $workingDirectory = Join-Path $workspaceRoot ([string]$Service.workingDirectory)
  $result = [ordered]@{
    serviceId = $Service.serviceId
    displayName = $Service.displayName
    domain = $Service.domain
    port = $Service.expectedPort
    healthEndpoint = $Service.healthEndpoint
    processId = $null
    started = $false
    status = 'BLOCKED'
    blockers = @()
    stdoutLog = $stdoutLog
    stderrLog = $stderrLog
    authorityId = $Service.authorityId
    governingBooks = @($Service.governingBooks)
  }

  if (-not (Test-Path $workingDirectory)) {
    $result.blockers = @("Missing working directory: $workingDirectory")
    return $result
  }

  if ($Service.expectedPort -and -not (Test-PortFree -Port ([int]$Service.expectedPort))) {
    $ownerProcessId = Get-PortOwningProcessId -Port ([int]$Service.expectedPort)
    $health = Test-HealthEndpoint -Url $Service.healthEndpoint
    if ($health.ok) {
      $healthStatus = Resolve-HealthStatus -Health $health -DefaultStatus 'LIVE'
      $result.status = $healthStatus.status
      $result.processId = $ownerProcessId
      $result.blockers = @($healthStatus.blockers)
    } else {
      $result.status = 'BLOCKED'
      $result.processId = $ownerProcessId
      $result.blockers = @("Port conflict on $($Service.expectedPort)")
    }
    return $result
  }

  if (-not $Service.launchFile) {
    $result.blockers = @('No launch file registered for managed service.')
    return $result
  }

  if ($Service.launchEnvironment -and $Service.launchEnvironment.PSObject.Properties.Count -gt 0) {
    $assignments = @($Service.launchEnvironment.PSObject.Properties | ForEach-Object {
      '$env:' + $_.Name + ' = ''' + ([string]$_.Value).Replace("'", "''") + ''''
    }) -join '; '
    $command = $assignments + '; & ' + $Service.launchFile + ' ' + (Convert-ArgumentListToString -Arguments @($Service.launchArgs))
    $proc = Start-Process -FilePath 'powershell.exe' -ArgumentList @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', $command) -WorkingDirectory $workingDirectory -RedirectStandardOutput $stdoutLog -RedirectStandardError $stderrLog -PassThru -WindowStyle Hidden
  } else {
    $proc = Start-Process -FilePath $Service.launchFile -ArgumentList @($Service.launchArgs) -WorkingDirectory $workingDirectory -RedirectStandardOutput $stdoutLog -RedirectStandardError $stderrLog -PassThru -WindowStyle Hidden
  }

  $delay = if ($Service.startupDelaySeconds) { [int]$Service.startupDelaySeconds } else { 3 }
  Start-Sleep -Seconds $delay
  $health = Test-HealthEndpoint -Url $Service.healthEndpoint

  $result.processId = $proc.Id
  $result.started = $true
  if ($health.ok) {
    $healthStatus = Resolve-HealthStatus -Health $health -DefaultStatus 'LIVE'
    $result.status = $healthStatus.status
    $result.blockers = @($healthStatus.blockers)
  } else {
    $result.status = 'BLOCKED'
    $result.blockers = @($health.error)
  }
  return $result
}

function Resolve-ReferenceServiceStatus {
  param([object]$Service)

  if (-not $Service.healthEndpoint) {
    $pathsToCheck = @()
    if ($Service.workingDirectory) { $pathsToCheck += (Join-Path $workspaceRoot ([string]$Service.workingDirectory)) }
    if ($Service.telemetryPath) { $pathsToCheck += (Join-Path $workspaceRoot ([string]$Service.telemetryPath)) }
    if ($Service.receiptPath) { $pathsToCheck += (Join-Path $workspaceRoot ([string]$Service.receiptPath)) }
    $pathExists = ($pathsToCheck | Where-Object { Test-Path $_ }).Count -gt 0
    if ($pathExists) {
      return [ordered]@{
        status = 'LIVE'
        blockers = @()
        lastHeartbeat = (Get-Date).ToString('o')
      }
    }

    return [ordered]@{
      status = 'BLOCKED'
      blockers = @('PATH_NOT_FOUND')
      lastHeartbeat = $null
    }
  }

  $health = Test-HealthEndpoint -Url $Service.healthEndpoint
  if ($health.ok) {
    $healthStatus = Resolve-HealthStatus -Health $health -DefaultStatus 'LIVE'
    return [ordered]@{
      status = $healthStatus.status
      blockers = @($healthStatus.blockers)
      lastHeartbeat = (Get-Date).ToString('o')
    }
  }

  $pathsToCheck = @()
  if ($Service.workingDirectory) { $pathsToCheck += (Join-Path $workspaceRoot ([string]$Service.workingDirectory)) }
  if ($Service.telemetryPath) { $pathsToCheck += (Join-Path $workspaceRoot ([string]$Service.telemetryPath)) }
  if ($Service.receiptPath) { $pathsToCheck += (Join-Path $workspaceRoot ([string]$Service.receiptPath)) }
  $pathExists = ($pathsToCheck | Where-Object { Test-Path $_ }).Count -gt 0

  if ($pathExists) {
    return [ordered]@{
      status = 'PARTIAL'
      blockers = @($health.error)
      lastHeartbeat = $null
    }
  }

  return [ordered]@{
    status = 'BLOCKED'
    blockers = @($health.error)
    lastHeartbeat = $null
  }
}

function Set-ObjectProperty {
  param(
    [object]$Object,
    [string]$Name,
    $Value
  )
  if ($Object.PSObject.Properties[$Name]) {
    $Object.$Name = $Value
  } else {
    $Object | Add-Member -NotePropertyName $Name -NotePropertyValue $Value -Force
  }
}

$registryRecord = Load-RegistryWithAuthority
$registry = $registryRecord.payload
if (-not $registry.services) {
  throw 'Runtime service registry has no services array.'
}

$results = @()
foreach ($service in @($registry.services | Where-Object { [string]$_.serviceMode -eq 'managed' })) {
  $results += Start-ServiceProcess -Service $service
}

foreach ($service in @($registry.services | Where-Object { [string]$_.serviceMode -eq 'observed' })) {
  $health = Test-HealthEndpoint -Url $service.healthEndpoint
  $healthStatus = if ($health.ok) { Resolve-HealthStatus -Health $health -DefaultStatus 'LIVE' } else { $null }
  $results += [ordered]@{
    serviceId = $service.serviceId
    displayName = $service.displayName
    domain = $service.domain
    port = $service.expectedPort
    healthEndpoint = $service.healthEndpoint
    processId = Get-PortOwningProcessId -Port ([int]$service.expectedPort)
    started = $false
    status = if ($health.ok) { $healthStatus.status } else { 'PARTIAL' }
    blockers = if ($health.ok) { @($healthStatus.blockers) } else { @($health.error) }
    stdoutLog = $null
    stderrLog = $null
    authorityId = $service.authorityId
    governingBooks = @($service.governingBooks)
  }
}

$resultsById = @{}
foreach ($result in $results) { $resultsById[$result.serviceId] = $result }

foreach ($service in @($registry.services)) {
  $now = (Get-Date).ToString('o')
  if ($resultsById.ContainsKey([string]$service.serviceId)) {
    $runtime = $resultsById[[string]$service.serviceId]
    Set-ObjectProperty -Object $service -Name 'status' -Value $runtime.status
    Set-ObjectProperty -Object $service -Name 'blockers' -Value (@($runtime.blockers | Where-Object { $_ }))
    Set-ObjectProperty -Object $service -Name 'lastHeartbeat' -Value $(if ($runtime.status -in @('LIVE', 'PARTIAL')) { $now } else { $null })
    Set-ObjectProperty -Object $service -Name 'processId' -Value $runtime.processId
    Set-ObjectProperty -Object $service -Name 'stdoutLog' -Value $runtime.stdoutLog
    Set-ObjectProperty -Object $service -Name 'stderrLog' -Value $runtime.stderrLog
    continue
  }

  $referenceStatus = Resolve-ReferenceServiceStatus -Service $service
  Set-ObjectProperty -Object $service -Name 'status' -Value $referenceStatus.status
  Set-ObjectProperty -Object $service -Name 'blockers' -Value (@($referenceStatus.blockers | Where-Object { $_ }))
  Set-ObjectProperty -Object $service -Name 'lastHeartbeat' -Value $referenceStatus.lastHeartbeat
  Set-ObjectProperty -Object $service -Name 'processId' -Value $null
}

$authorityWrite = Save-RegistryWithAuthority -Payload $registry
$registry.registryAuthorityStatus = $authorityWrite.registryAuthorityStatus
$registry.canonicalRegistryWriteStatus = $authorityWrite.canonicalRegistryWriteStatus
$registry.mirrorRegistryPath = if ($authorityWrite.mirrorRegistryPath) { $authorityWrite.mirrorRegistryPath.Replace($workspaceRoot + '\', '').Replace('\', '/') } else { $null }

$processMap = [ordered]@{
  generatedAt = (Get-Date).ToString('o')
  subjectObjectId = 'LEEWAY_APP::VSCODE_SELF_HOSTED::RUNTIME::PROCESS_MAP'
  registryAuthorityStatus = $authorityWrite.registryAuthorityStatus
  canonicalRegistryWriteStatus = $authorityWrite.canonicalRegistryWriteStatus
  mirrorRegistryPath = $registry.mirrorRegistryPath
  processes = @($results | Where-Object { $_.processId } | ForEach-Object {
    [ordered]@{
      serviceId = $_.serviceId
      displayName = $_.displayName
      processId = $_.processId
      status = $_.status
      stdoutLog = $_.stdoutLog
      stderrLog = $_.stderrLog
    }
  })
}

$portMap = [ordered]@{
  generatedAt = (Get-Date).ToString('o')
  subjectObjectId = 'LEEWAY_APP::VSCODE_SELF_HOSTED::RUNTIME::PORT_MAP'
  registryAuthorityStatus = $authorityWrite.registryAuthorityStatus
  canonicalRegistryWriteStatus = $authorityWrite.canonicalRegistryWriteStatus
  mirrorRegistryPath = $registry.mirrorRegistryPath
  ports = @($registry.services | ForEach-Object {
    [ordered]@{
      serviceId = $_.serviceId
      displayName = $_.displayName
      port = $_.expectedPort
      healthEndpoint = $_.healthEndpoint
      status = $_.status
    }
  })
}

$blocked = @($registry.services | Where-Object { $_.status -eq 'BLOCKED' })
$partial = @($registry.services | Where-Object { $_.status -eq 'PARTIAL' })
$live = @($registry.services | Where-Object { $_.status -eq 'LIVE' })

$startupReport = [ordered]@{
  reportId = 'LEEWAY_REPORT::VSCODE_SELF_HOSTED::STARTUP_SUPERVISOR'
  subjectObjectId = 'LEEWAY_APP::LEEWAY_VSCODE::SELF_HOSTED_OPERATOR_CONTROL_PLANE'
  generatedAt = (Get-Date).ToString('o')
  startupScriptPath = 'scripts/Start-LeeWaySelfHostedOperatingEnvironment.ps1'
  stopScriptPath = 'scripts/Stop-LeeWaySelfHostedOperatingEnvironment.ps1'
  testScriptPath = 'scripts/Test-LeeWaySelfHostedOperatingEnvironment.ps1'
  registryPathUsed = $authorityWrite.registryPathUsed.Replace($workspaceRoot + '\', '').Replace('\', '/')
  registryAuthorityStatus = $authorityWrite.registryAuthorityStatus
  canonicalRegistryWriteStatus = $authorityWrite.canonicalRegistryWriteStatus
  mirrorRegistryPath = $registry.mirrorRegistryPath
  servicesRegistered = $registry.services.Count
  servicesLive = $live.Count
  servicesPartial = $partial.Count
  servicesBlocked = $blocked.Count
  statuses = @($registry.services)
  finalStatus = if ($authorityWrite.registryAuthorityStatus -eq 'CANONICAL_ACTIVE' -and $blocked.Count -eq 0 -and $partial.Count -eq 0) { 'PASS' } elseif ($authorityWrite.registryAuthorityStatus -in @('CANONICAL_ACTIVE', 'MIRROR_ACTIVE_CANONICAL_BLOCKED')) { 'PARTIAL' } else { 'BLOCKED' }
}

$blockerReport = [ordered]@{
  generatedAt = (Get-Date).ToString('o')
  subjectObjectId = 'LEEWAY_APP::LEEWAY_VSCODE::SELF_HOSTED_OPERATOR_CONTROL_PLANE'
  registryAuthorityStatus = $authorityWrite.registryAuthorityStatus
  canonicalRegistryWriteStatus = $authorityWrite.canonicalRegistryWriteStatus
  mirrorRegistryPath = $registry.mirrorRegistryPath
  blockers = @($registry.services | Where-Object { @($_.blockers).Count -gt 0 } | ForEach-Object {
    [ordered]@{
      serviceId = $_.serviceId
      displayName = $_.displayName
      status = $_.status
      blockers = @($_.blockers)
    }
  })
  finalStatus = if (($blocked.Count + $partial.Count) -eq 0) { 'PASS' } else { 'PARTIAL' }
}

Write-JsonAtomic -Path $processMapPath -Payload $processMap
Write-JsonAtomic -Path $portMapPath -Payload $portMap
Write-JsonAtomic -Path $startupReportPath -Payload $startupReport
Write-JsonAtomic -Path $blockerReportPath -Payload $blockerReport

foreach ($entry in $registry.services) {
  Append-Jsonl -Path $startupLogPath -Payload ([ordered]@{
    timestamp = (Get-Date).ToString('o')
    serviceId = $entry.serviceId
    displayName = $entry.displayName
    status = $entry.status
    blockers = @($entry.blockers)
    registryAuthorityStatus = $authorityWrite.registryAuthorityStatus
    canonicalRegistryWriteStatus = $authorityWrite.canonicalRegistryWriteStatus
  })
}

$reportWriterStatus = [ordered]@{ attempted = $true; ok = $false; error = $null }
try {
  Push-Location $workspaceRoot
  $reportWriterOutput = & node 'scripts/Write-LeeWaySelfHostedOperatingEnvironmentReports.mjs' 2>&1
  if ($LASTEXITCODE -eq 0) {
    $reportWriterStatus.ok = $true
  } else {
    $reportWriterStatus.error = ($reportWriterOutput | Out-String).Trim()
  }
} catch {
  $reportWriterStatus.error = $_.Exception.Message
} finally {
  Pop-Location
}

$startupReport.reportWriterStatus = $reportWriterStatus
Write-JsonAtomic -Path $startupReportPath -Payload $startupReport

$startupReport | ConvertTo-Json -Depth 100 | Write-Output
