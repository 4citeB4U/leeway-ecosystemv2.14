Set-StrictMode -Version Latest

function Get-LeewayWorkspaceRoot {
  if ($PSScriptRoot) {
    return (Split-Path -Parent $PSScriptRoot)
  }
  return (Get-Location).Path
}

function New-LeewayDirectory {
  param([Parameter(Mandatory = $true)][string]$Path)
  New-Item -ItemType Directory -Force -Path $Path | Out-Null
  return $Path
}

function Write-LeewayJson {
  param(
    [Parameter(Mandatory = $true)][string]$Path,
    [Parameter(Mandatory = $true)]$Object
  )

  New-LeewayDirectory -Path (Split-Path -Parent $Path) | Out-Null
  $json = $Object | ConvertTo-Json -Depth 32
  Set-Content -LiteralPath $Path -Value $json -Encoding UTF8
  return $Path
}

function Read-LeewayJson {
  param(
    [Parameter(Mandatory = $true)][string]$Path,
    $Fallback = $null
  )

  if (-not (Test-Path -LiteralPath $Path)) {
    return $Fallback
  }

  try {
    return (Get-Content -Raw -LiteralPath $Path | ConvertFrom-Json)
  } catch {
    return $Fallback
  }
}

function Invoke-LeewayHttp {
  param(
    [Parameter(Mandatory = $true)][string]$Url,
    [ValidateSet("GET", "POST")][string]$Method = "GET",
    $Body = $null,
    [int]$TimeoutSec = 10,
    [string]$ContentType = "application/json"
  )

  $started = Get-Date
  $result = [ordered]@{
    ok = $false
    url = $Url
    method = $Method
    statusCode = $null
    ms = $null
    rawBody = $null
    parsed = $null
    error = $null
  }

  try {
    if ($Method -eq "POST") {
      if ($null -eq $Body) {
        $response = Invoke-WebRequest -Uri $Url -Method Post -TimeoutSec $TimeoutSec -UseBasicParsing -ErrorAction Stop
      } elseif ($Body -is [string]) {
        $response = Invoke-WebRequest -Uri $Url -Method Post -Body $Body -ContentType $ContentType -TimeoutSec $TimeoutSec -UseBasicParsing -ErrorAction Stop
      } else {
        $response = Invoke-WebRequest -Uri $Url -Method Post -Body ($Body | ConvertTo-Json -Depth 32) -ContentType $ContentType -TimeoutSec $TimeoutSec -UseBasicParsing -ErrorAction Stop
      }
    } else {
      $response = Invoke-WebRequest -Uri $Url -Method Get -TimeoutSec $TimeoutSec -UseBasicParsing -ErrorAction Stop
    }

    $result.ok = $true
    $result.statusCode = [int]$response.StatusCode
    $result.rawBody = [string]$response.Content
    try {
      if (-not [string]::IsNullOrWhiteSpace($result.rawBody)) {
        $result.parsed = $result.rawBody | ConvertFrom-Json -ErrorAction Stop
      }
    } catch {
      $result.parsed = $null
    }
  } catch {
    $result.error = $_.Exception.Message
    if ($_.Exception.Response) {
      try { $result.statusCode = [int]$_.Exception.Response.StatusCode } catch {}
      try {
        $stream = $_.Exception.Response.GetResponseStream()
        if ($stream) {
          $reader = New-Object System.IO.StreamReader($stream)
          try { $result.rawBody = $reader.ReadToEnd() } finally { $reader.Close() }
        }
      } catch {}
    }
  }

  $result.ms = [int]((Get-Date) - $started).TotalMilliseconds
  return [pscustomobject]$result
}

function Get-LeewayLatestJsonFile {
  param([Parameter(Mandatory = $true)][string]$Path)

  if (-not (Test-Path -LiteralPath $Path)) {
    return $null
  }

  Get-ChildItem -LiteralPath $Path -Filter "*.json" -File -ErrorAction SilentlyContinue |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 1
}

