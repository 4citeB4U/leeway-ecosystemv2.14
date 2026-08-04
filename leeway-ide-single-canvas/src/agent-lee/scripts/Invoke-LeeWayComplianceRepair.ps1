param(
  [string]$RootDir = (Join-Path $PSScriptRoot "..\.."),
  [switch]$AllLocalFiles
)

$ErrorActionPreference = "Stop"

function Get-LeeWayRegion {
  param([string]$Path)

  if ($Path -match "(^|/)agent-lee/vscode-extension/src|(^|/)workspace/agents") { return "UI" }
  if ($Path -match "(^|/)agent-lee/(core|supervisor|verification)|orchestrator|law|scheduler") { return "CORE" }
  if ($Path -match "(^|/)agent-lee/(mcp)|mcp") { return "MCP" }
  if ($Path -match "(^|/)agent-lee/(voice|models)|memory|conversation|LLM|model") { return "AI" }
  if ($Path -match "(^|/)safety|scanner|backup|rollback|patcher") { return "UTIL" }
  if ($Path -match "registry|catalog|queue|package-lock|package.json|\.json$") { return "DATA" }
  return "CORE"
}

function Get-LeeWayTag {
  param([string]$Path)

  $normalized = $Path.Replace("\", "/")
  $withoutExtension = [System.IO.Path]::ChangeExtension($normalized, $null)
  $parts = $withoutExtension -split "/" |
    Where-Object { $_ } |
    ForEach-Object { ($_ -replace "[^A-Za-z0-9]+", "_").Trim("_").ToUpperInvariant() } |
    Where-Object { $_ }

  $tagParts = @("CORE") + $parts
  return ($tagParts -join ".")
}

function Get-LeeWayBlock {
  param(
    [string]$Path,
    [string]$Style
  )

  $region = Get-LeeWayRegion -Path $Path
  $tag = Get-LeeWayTag -Path $Path
  $pipeline = "Voice -> Intent -> Location -> Vertical -> Ranking -> Render"

  if ($Style -eq "Json") {
    return @"
  "leeway": {
    "LEEWAY_HEADER": "DO NOT REMOVE",
    "REGION": "$region",
    "TAG": "$tag",
    "DISCOVERY_PIPELINE": "$pipeline"
  },
"@
  }

  $body = @(
    "LEEWAY_HEADER - DO NOT REMOVE",
    "",
    "REGION: $region",
    "TAG: $tag",
    "DISCOVERY_PIPELINE: $pipeline"
  ) -join "`r`n"

  switch ($Style) {
    "PowerShell" { return "<#`r`n$body`r`n#>`r`n`r`n" }
    "Markdown" { return "<!--`r`n$body`r`n-->`r`n`r`n" }
    "Text" { return "/*`r`n$body`r`n*/`r`n`r`n" }
    default { return "/*`r`n$body`r`n*/`r`n`r`n" }
  }
}

function Test-LeeWayComplete {
  param([string]$Text)

  return (($Text -match "LEEWAY_HEADER" -or $Text -match "LEEWAY HEADER") -and
    $Text -match "REGION:" -and
    $Text -match "TAG:" -and
    $Text -match "DISCOVERY_PIPELINE")
}

function Get-Style {
  param([string]$Path)

  switch ([System.IO.Path]::GetExtension($Path).ToLowerInvariant()) {
    ".ps1" { return "PowerShell" }
    ".md" { return "Markdown" }
    ".json" { return "Json" }
    ".txt" { return "Text" }
    default { return "Code" }
  }
}

$root = (Resolve-Path $RootDir).Path
Push-Location $root
try {
  $extensions = @(".ts", ".js", ".ps1", ".json", ".md", ".txt")

  if ($AllLocalFiles) {
    $ignoredSegments = "\\(node_modules|\.git|\.venv|out|logs|memory|reports|backups|patches|sandbox)\\"
    $files = Get-ChildItem -Path $root -Recurse -File |
      Where-Object { $_.FullName -notmatch $ignoredSegments -and $extensions -contains $_.Extension } |
      ForEach-Object { Resolve-Path -Relative $_.FullName }
  } else {
    $files = & git ls-files |
      Where-Object { $extensions -contains [System.IO.Path]::GetExtension($_).ToLowerInvariant() }
  }

  $changed = @()

  foreach ($file in $files) {
    if (-not (Test-Path $file)) {
      continue
    }

    $text = Get-Content -LiteralPath $file -Raw
    if (Test-LeeWayComplete -Text $text) {
      continue
    }

    $style = Get-Style -Path $file

    if ($style -eq "Json") {
      if ($text -match '"leeway"\s*:') {
        continue
      }

      $trimmed = $text.TrimStart()
      if (-not $trimmed.StartsWith("{")) {
        continue
      }

      $block = Get-LeeWayBlock -Path $file -Style "Json"
      $prefixLength = $text.Length - $trimmed.Length
      $prefix = $text.Substring(0, $prefixLength)
      $afterOpen = $trimmed.Substring(1)
      $newText = $prefix + "{" + "`r`n" + $block + $afterOpen
    } else {
      $block = Get-LeeWayBlock -Path $file -Style $style
      if ($text.StartsWith("#!")) {
        $firstLineEnd = $text.IndexOf("`n")
        if ($firstLineEnd -ge 0) {
          $newText = $text.Substring(0, $firstLineEnd + 1) + $block + $text.Substring($firstLineEnd + 1)
        } else {
          $newText = $text + "`r`n" + $block
        }
      } else {
        $newText = $block + $text
      }
    }

    $encoding = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText((Resolve-Path $file).Path, $newText, $encoding)
    $changed += $file
  }

  [pscustomobject]@{
    root = $root
    changedCount = $changed.Count
    changedFiles = $changed
  }
}
finally {
  Pop-Location
}
