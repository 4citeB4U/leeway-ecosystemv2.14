<#
LEEWAY_HEADER - DO NOT REMOVE

REGION: CORE
TAG: CORE.AGENT_LEE.GITHUB.INVOKE_AGENTLEEGITHUB
DISCOVERY_PIPELINE: Voice -> Intent -> Location -> Vertical -> Ranking -> Render
#>

param(
  [Parameter(Mandatory=$true)]
  [string]$RepoPath,

  [Parameter(Mandatory=$true)]
  [ValidateSet("status","safe-branch","commit","push-pr","pull","verify")]
  [string]$Action,

  [string]$Message = "Agent Lee governed update",
  [string]$Branch = ""
)

$ErrorActionPreference = "Stop"

$Root = "$HOME\.leeway-vscode"
$LogDir = "$Root\logs\github"
$ReportDir = "$Root\reports\github"
$MemoryDb = "$Root\memory\db\agent-lee-memory.jsonl"

New-Item -ItemType Directory -Force -Path $LogDir,$ReportDir,(Split-Path $MemoryDb) | Out-Null

function Log-GitHub {
  param([string]$Type,[string]$Msg,[object]$Data = @{})

  $entry = [PSCustomObject]@{
    timestamp = (Get-Date -Format "o")
    type = $Type
    agent = "agent-lee-github"
    repo = $RepoPath
    message = $Msg
    data = $Data
  }

  $line = $entry | ConvertTo-Json -Compress -Depth 8
  Add-Content "$LogDir\github-$(Get-Date -Format yyyy-MM-dd).jsonl" $line
  Add-Content $MemoryDb $line
}

if (!(Test-Path $RepoPath)) {
  throw "Repo path does not exist: $RepoPath"
}

Set-Location $RepoPath

if (!(Test-Path ".git")) {
  throw "This folder is not a Git repository: $RepoPath"
}

$status = git status --short
$currentBranch = git branch --show-current
$remote = git remote -v | Out-String

switch ($Action) {

  "status" {
    git status
    git remote -v
    Log-GitHub "status" "Git status checked" @{ branch = $currentBranch; status = $status }
  }

  "pull" {
    git fetch --all --prune
    git pull
    Log-GitHub "pull" "Fetched and pulled latest repo state" @{ branch = $currentBranch }
  }

  "safe-branch" {
    if ([string]::IsNullOrWhiteSpace($Branch)) {
      $safeDate = Get-Date -Format "yyyyMMdd-HHmmss"
      $Branch = "agent-lee/leeway-update-$safeDate"
    }

    git fetch --all --prune
    git checkout -b $Branch
    Log-GitHub "branch" "Created safe working branch" @{ branch = $Branch }
  }

  "verify" {
    $commands = @()

    if (Test-Path "package.json") {
      $pkg = Get-Content "package.json" -Raw | ConvertFrom-Json
      if ($pkg.scripts.build) { $commands += "npm run build" }
      if ($pkg.scripts.test) { $commands += "npm test" }
      if ($pkg.scripts.lint) { $commands += "npm run lint" }
      if ($pkg.scripts.typecheck) { $commands += "npm run typecheck" }
    }

    $results = @()

    foreach ($cmd in $commands) {
      Write-Host "[VERIFY] $cmd" -ForegroundColor Cyan
      $out = cmd /c $cmd 2>&1 | Out-String
      $code = $LASTEXITCODE
      $results += [PSCustomObject]@{ command = $cmd; exitCode = $code; output = $out }

      if ($code -ne 0) {
        Log-GitHub "verify-fail" "Verification failed" @{ command = $cmd; output = $out }
        throw "Verification failed: $cmd"
      }
    }

    if ($commands.Count -eq 0) {
      Log-GitHub "verify-warn" "No package verification scripts found" @{}
      Write-Host "[WARN] No package scripts found for build/test/lint/typecheck." -ForegroundColor Yellow
    } else {
      Log-GitHub "verify-pass" "Verification passed" @{ commands = $commands }
      Write-Host "[PASS] Verification passed." -ForegroundColor Green
    }
  }

  "commit" {
    $forbidden = git status --porcelain | Select-String -Pattern "\.env|id_rsa|\.pem|\.key|secret|token|credentials" -CaseSensitive:$false

    if ($forbidden) {
      Log-GitHub "security-block" "Potential secret file detected" @{ matches = "$forbidden" }
      throw "Potential secret/credential file detected. Commit blocked."
    }

    git status
    git add -A
    git commit -m "$Message"
    $commit = git rev-parse HEAD
    Log-GitHub "commit" "Committed verified changes" @{ branch = $currentBranch; commit = $commit; message = $Message }
  }

  "push-pr" {
    $branch = git branch --show-current

    if ($branch -eq "main" -or $branch -eq "master") {
      throw "Direct push from main/master blocked. Create a safe branch first."
    }

    git push -u origin $branch

    $prTitle = $Message
    $prBody = @"
Agent Lee governed pull request.

## Safety
- Branch-based change
- No direct main/master push
- Verification expected before merge
- Review required

## Test
Run project build/test/lint/typecheck where available.
"@

    $pr = gh pr create --title "$prTitle" --body "$prBody" 2>&1 | Out-String
    Log-GitHub "pull-request" "PR created" @{ branch = $branch; output = $pr }

    Write-Host $pr
  }
}

