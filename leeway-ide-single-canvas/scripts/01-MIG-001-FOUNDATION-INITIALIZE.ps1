param(
  [string]$EvidenceRoot = "./evidence/MIG-001"
)

$ErrorActionPreference = 'Stop'

function Write-JsonFile {
  param(
    [string]$Path,
    [object]$Value
  )

  $parent = Split-Path -Parent $Path
  if ($parent) {
    New-Item -ItemType Directory -Force -Path $parent | Out-Null
  }

  $content = $Value | ConvertTo-Json -Depth 8
  [System.IO.File]::WriteAllText($Path, $content)
}

$timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$sessionRoot = Join-Path $EvidenceRoot $timestamp
$receiptPath = Join-Path $sessionRoot 'receipt.json'
$environmentPath = Join-Path $sessionRoot 'environment.json'
$transcriptPath = Join-Path $sessionRoot 'transcript.log'
$migrationPath = Join-Path $sessionRoot 'migration.json'
$validationPath = Join-Path $sessionRoot 'validation.json'

$errors = New-Object System.Collections.Generic.List[string]

function Add-Error {
  param([string]$Message)
  $script:errors.Add($Message)
}

function Invoke-Check {
  param(
    [string]$Label,
    [bool]$Condition,
    [string]$FailureMessage
  )

  if (-not $Condition) {
    Add-Error "$Label failed: $FailureMessage"
  }
}

$projectRoot = (Resolve-Path '.').Path
$repoRoot = $projectRoot

New-Item -ItemType Directory -Force -Path $sessionRoot | Out-Null

$transcriptLines = New-Object System.Collections.Generic.List[string]
function Add-Transcript {
  param([string]$Message)
  $timestampStr = Get-Date -Format 'yyyy-MM-ddTHH:mm:ssK'
  $line = "[$timestampStr] $Message"
  $script:transcriptLines.Add($line)
  Add-Content -Path $transcriptPath -Value $line
}

Add-Transcript "Starting MIG-001 foundation initialization"
Add-Transcript "Project root: $projectRoot"

# STEP 1 - Verify environment
$psVersion = $PSVersionTable.PSVersion.ToString()
$nodeVersion = $null
$npmVersion = $null
$gitVersion = $null
$dockerVersion = $null
$ollamaVersion = $null

$nodeCommand = Get-Command node -ErrorAction SilentlyContinue
$npmCommand = Get-Command npm -ErrorAction SilentlyContinue
$gitCommand = Get-Command git -ErrorAction SilentlyContinue
$dockerCommand = Get-Command docker -ErrorAction SilentlyContinue
$ollamaCommand = Get-Command ollama -ErrorAction SilentlyContinue

if ($nodeCommand) {
  $nodeVersion = & node --version 2>$null
}
if ($npmCommand) {
  $npmVersion = & npm --version 2>$null
}
if ($gitCommand) {
  $gitVersion = & git --version 2>$null
}
if ($dockerCommand) {
  $dockerVersion = & docker --version 2>$null
}
if ($ollamaCommand) {
  $ollamaVersion = & ollama --version 2>$null
}

$gitRepo = $false
if ($gitCommand) {
  try {
    $gitRepo = (& git rev-parse --is-inside-work-tree 2>$null) -eq 'true'
  } catch {
    $gitRepo = $false
  }
}

$powerShellOk = $psVersion -match '^(7|8)\.'
Invoke-Check -Label 'PowerShell version' -Condition $powerShellOk -FailureMessage 'PowerShell 7+ is required'
Invoke-Check -Label 'Working directory' -Condition ([System.IO.Directory]::Exists($projectRoot)) -FailureMessage 'Project root does not exist'
Invoke-Check -Label 'Git repository' -Condition $gitRepo -FailureMessage 'Current directory is not a Git repository'
Invoke-Check -Label 'Node.js' -Condition (-not [string]::IsNullOrWhiteSpace($nodeVersion)) -FailureMessage 'node is not available'
Invoke-Check -Label 'npm' -Condition (-not [string]::IsNullOrWhiteSpace($npmVersion)) -FailureMessage 'npm is not available'
Invoke-Check -Label 'Docker availability' -Condition (-not [string]::IsNullOrWhiteSpace($dockerVersion)) -FailureMessage 'docker is not available'

if ($ollamaCommand) {
  Add-Transcript "Ollama detected: $ollamaVersion"
}

# STEP 2 - Verify governance
$requiredDirs = @('architecture', 'migration', 'scripts', 'evidence')
foreach ($dir in $requiredDirs) {
  Invoke-Check -Label "Governance directory $dir" -Condition (Test-Path (Join-Path $projectRoot $dir)) -FailureMessage "$dir directory is missing"
}

$requiredAdrFiles = @('ADR-0001.md','ADR-0002.md','ADR-0003.md','ADR-0004.md','ADR-0005.md','ADR-0006.md')
foreach ($file in $requiredAdrFiles) {
  $path = Join-Path $projectRoot (Join-Path 'architecture' $file)
  Invoke-Check -Label "ADR file $file" -Condition (Test-Path $path) -FailureMessage "$path is missing"
}

$mig001File = Join-Path $projectRoot (Join-Path 'migration' 'MIG-001-foundation.md')
Invoke-Check -Label 'MIG-001 specification' -Condition (Test-Path $mig001File) -FailureMessage 'MIG-001-foundation.md is missing'

# STEP 3 - Create execution session
# files already created by sessionRoot and transcript

# STEP 4 - Capture environment
$branch = $null
$commit = $null
if ($gitCommand) {
  try { $branch = (& git branch --show-current 2>$null) } catch { $branch = $null }
  try { $commit = (& git rev-parse HEAD 2>$null) } catch { $commit = $null }
}

$environment = [ordered]@{
  Timestamp = Get-Date -Format 'o'
  PowerShell = $psVersion
  Node = $nodeVersion
  npm = $npmVersion
  Git = $gitVersion
  Docker = $dockerVersion
  Ollama = $ollamaVersion
  OS = [System.Environment]::OSVersion.ToString()
  Architecture = [System.Runtime.InteropServices.RuntimeInformation]::OSArchitecture.ToString()
  ProjectRoot = $projectRoot
  GitBranch = $branch
  GitCommit = $commit
}

Write-JsonFile -Path $environmentPath -Value $environment
Add-Transcript "Captured environment payload"

# STEP 5 - Snapshot repository
$modifiedFiles = @()
$untrackedFiles = @()
if ($gitCommand) {
  try { $modifiedFiles = (& git status --porcelain) -split "`n" | Where-Object { $_ -and $_ -notmatch '^\?\? ' } } catch { $modifiedFiles = @() }
  try { $untrackedFiles = (& git status --porcelain) -split "`n" | Where-Object { $_ -and $_.StartsWith('?? ') } | ForEach-Object { $_.Substring(3) } } catch { $untrackedFiles = @() }
}

$migrationSnapshot = [ordered]@{
  Migration = 'MIG-001'
  Timestamp = Get-Date -Format 'o'
  Branch = $branch
  Head = $commit
  ModifiedFiles = $modifiedFiles
  UntrackedFiles = $untrackedFiles
}

Write-JsonFile -Path $migrationPath -Value $migrationSnapshot
Add-Transcript "Captured repository snapshot"

# STEP 6 - Validation
$validation = [ordered]@{
  ProjectRootExists = (Test-Path $projectRoot)
  PackageJsonExists = (Test-Path (Join-Path $projectRoot 'package.json'))
  ServerTsExists = (Test-Path (Join-Path $projectRoot 'server.ts'))
  SrcExists = (Test-Path (Join-Path $projectRoot 'src'))
}

Write-JsonFile -Path $validationPath -Value $validation
Add-Transcript "Completed validation checks"

# STEP 7 - Receipt
$receipt = [ordered]@{
  Migration = 'MIG-001'
  Status = if ($errors.Count -eq 0) { 'PASS' } else { 'FAIL' }
  Evidence = $sessionRoot
  Timestamp = Get-Date -Format 'o'
  PowerShell = $psVersion
  Node = $nodeVersion
  Git = $gitVersion
}

Write-JsonFile -Path $receiptPath -Value $receipt

if ($errors.Count -gt 0) {
  Add-Transcript "Foundation initialization failed"
  foreach ($errorMessage in $errors) {
    Add-Transcript "ERROR: $errorMessage"
  }
  throw "MIG-001 foundation initialization failed: $($errors -join '; ')"
}

Add-Transcript "Foundation initialization completed successfully"
Write-Host "[MIG-001] Foundation initialization completed"
Write-Host "Evidence: $sessionRoot"
