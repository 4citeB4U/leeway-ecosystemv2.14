[CmdletBinding()]
param()

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$ScriptRoot = $PSScriptRoot
$RepoRoot = Resolve-Path (Join-Path $ScriptRoot "..\..")
$ReceiptDir = Join-Path $RepoRoot "Archive\receipts"
$Stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$ReceiptPath = Join-Path $ReceiptDir "agent-lee-canonical-voice-law-proof-$Stamp.json"

New-Item -ItemType Directory -Force -Path $ReceiptDir | Out-Null

$Checks = New-Object System.Collections.Generic.List[object]
$FailedCases = New-Object System.Collections.Generic.List[object]
$SampleResponses = [ordered]@{}
$FilesChanged = @(
  "agent-lee-coding-mode/config/agent-lee-canonical-voice-law.md",
  "agent-lee-coding-mode/runtime/agent-lee-speech-style-policy.json",
  "agent-lee-coding-mode/runtime/agent-lee-language-policy.json",
  "agent-lee-coding-mode/router/server-brainfix.mjs",
  "Leeway Runtime Fabric/server/index.cjs",
  "Leeway Runtime Fabric/server/agent-lee-chat-proxy.mjs",
  ".leeway-vscode/agent-lee-vscode-adapter/server.cjs",
  ".leeway-vscode/extensions/leeway-agent-lee-chat/extension.js",
  "agent-lee-coding-mode/desktop-runtime/voice-loop.ps1",
  "agent-lee-coding-mode/voice-full-v6/agent-lee-full-v6.ps1",
  "agent-lee-coding-mode/tools/official-agent-lee-vscode-chat-embodiment-prompts.md",
  "agent-lee-coding-mode/tools/validate-agent-lee-canonical-voice-law.ps1",
  "agent-lee-coding-mode/agent-lee-identity.md",
  "agent-lee-coding-mode/voice-full-v7-clean/agent-lee-identity.md"
)
$RoutesPatched = @(
  "8787/v1/chat/completions",
  "8080/v1/chat/completions",
  "4001/agent-lee/chat",
  "8091/runtime/speak",
  "VS Code extension chat participant"
)
$PromptsPatched = @(
  "Who are you, and what do you do in the Leeway stack?",
  "Can you connect yourself to another IDE like Antigravity if the developer asks?"
)

function Add-Failure {
  param(
    [string]$CaseId,
    [string]$Message,
    $Details = $null
  )

  $FailedCases.Add([ordered]@{
    caseId = $CaseId
    message = $Message
    details = $Details
  })
}

function Add-Check {
  param(
    [string]$CaseId,
    [bool]$Passed,
    [string]$Message,
    $Details = $null
  )

  $Checks.Add([ordered]@{
    caseId = $CaseId
    passed = $Passed
    message = $Message
    details = $Details
  })
  if (-not $Passed) {
    Add-Failure -CaseId $CaseId -Message $Message -Details $Details
  }
}

function Read-TextFile {
  param([string]$Path)
  if (-not (Test-Path -LiteralPath $Path)) { return "" }
  return Get-Content -LiteralPath $Path -Raw
}

function Test-TextContainsAny {
  param(
    [string]$Text,
    [string[]]$Needles
  )
  foreach ($needle in $Needles) {
    if ($Text -like "*$needle*") { return $true }
  }
  return $false
}

function Test-TextContainsAll {
  param(
    [string]$Text,
    [string[]]$Needles
  )

  foreach ($needle in $Needles) {
    if ($Text -notlike "*$needle*") { return $false }
  }
  return $true
}

function Assert-FileReference {
  param(
    [string]$CaseId,
    [string]$Path,
    [string[]]$Needles
  )

  $text = Read-TextFile -Path $Path
  $passed = [bool]$text -and (Test-TextContainsAny -Text $text -Needles $Needles)
  Add-Check -CaseId $CaseId -Passed $passed -Message ("File reference check for " + $Path) -Details @{
    path = $Path
    found = $passed
    needles = $Needles
  }
  return $text
}

function Extract-AssistantText {
  param($Response)

  if ($null -eq $Response) { return "" }
  if ($Response -is [string]) { return $Response.Trim() }
  if ($Response.PSObject.Properties.Name -contains "choices") {
    $choice = $Response.choices | Select-Object -First 1
    if ($choice -and $choice.message -and $choice.message.PSObject.Properties.Name -contains "content") {
      return [string]$choice.message.content
    }
  }
  if ($Response.PSObject.Properties.Name -contains "response") { return [string]$Response.response }
  if ($Response.PSObject.Properties.Name -contains "text") { return [string]$Response.text }
  if ($Response.PSObject.Properties.Name -contains "raw") { return [string]$Response.raw }
  return ($Response | ConvertTo-Json -Depth 20)
}

function Invoke-JsonPost {
  param(
    [string]$Url,
    $Body,
    [int]$TimeoutSec = 60
  )

  try {
    return Invoke-RestMethod -Uri $Url -Method Post -ContentType "application/json" -Body ($Body | ConvertTo-Json -Depth 20) -TimeoutSec $TimeoutSec
  } catch {
    return [ordered]@{
      ok = $false
      error = $_.Exception.Message
      raw = if ($_.ErrorDetails -and $_.ErrorDetails.Message) { $_.ErrorDetails.Message } else { "" }
    }
  }
}

function Count-SlangHits {
  param([string]$Text)
  $patterns = @(
    "\byo\b",
    "\bbaby\b",
    "\byou dig\b",
    "\bvibe\b",
    "\bvibing\b",
    "\bon point\b",
    "\bcheck the receipts\b"
  )

  $count = 0
  foreach ($pattern in $patterns) {
    $count += ([regex]::Matches($Text, $pattern, [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)).Count
  }
  return $count
}

function Test-CanonicalResponse {
  param(
    [string]$CaseId,
    [string]$Text,
    [string[]]$RequiredNeedles,
    [string[]]$ForbiddenNeedles = @()
  )

  $required = Test-TextContainsAll -Text $Text -Needles $RequiredNeedles
  $forbidden = Test-TextContainsAny -Text $Text -Needles $ForbiddenNeedles
  $slangCount = Count-SlangHits -Text $Text
  $noFakeReceiptLock = -not ($Text -match '(?i)\b(status\s*=\s*PASS|failedCases\s*=\s*\[\]|lockEligible\s*=\s*true|lock is complete|fully working)\b')
  $noForcedRhyme = -not ($Text -match '(?i)\b(yo yo|spit a verse|forced rhyme|fake rap)\b')
  $passed = $required -and -not $forbidden -and $slangCount -le 3 -and $noFakeReceiptLock -and $noForcedRhyme

  Add-Check -CaseId $CaseId -Passed $passed -Message ("Canonical style check for " + $CaseId) -Details @{
    required = $RequiredNeedles
    slangCount = $slangCount
    noFakeReceiptLock = $noFakeReceiptLock
    noForcedRhyme = $noForcedRhyme
    response = $Text
  }
}

function Invoke-ChatProbe {
  param(
    [string]$CaseId,
    [string]$Url,
    $Body,
    [string]$ResponsePath = "choices.0.message.content",
    [int]$TimeoutSec = 60
  )

  $response = Invoke-JsonPost -Url $Url -Body $Body -TimeoutSec $TimeoutSec
  $text = Extract-AssistantText -Response $response
  if ([string]::IsNullOrWhiteSpace($text)) {
    Add-Failure -CaseId $CaseId -Message "No assistant text returned." -Details $response
  } else {
    $SampleResponses[$CaseId] = $text
  }
  return [ordered]@{
    raw = $response
    text = $text
  }
}

$LawPath = Join-Path $RepoRoot "agent-lee-coding-mode\config\agent-lee-canonical-voice-law.md"
$LawText = Read-TextFile -Path $LawPath
$LawExists = Test-Path -LiteralPath $LawPath
Add-Check -CaseId "voice-law-file-exists" -Passed $LawExists -Message "Canonical voice-law file exists" -Details @{ path = $LawPath }

$AdapterText = Assert-FileReference -CaseId "adapter-file-reference" -Path (Join-Path $RepoRoot ".leeway-vscode\agent-lee-vscode-adapter\server.cjs") -Needles @("agent-lee-canonical-voice-law.md", "CANONICAL_VOICE_LAW_TEXT", "buildBackendMessages")
$RouterText = Assert-FileReference -CaseId "router-file-reference" -Path (Join-Path $RepoRoot "agent-lee-coding-mode\router\server-brainfix.mjs") -Needles @("agent-lee-canonical-voice-law.md", "CANONICAL_VOICE_LAW_TEXT", "buildCanonicalVoiceLawResponse")
$RuntimeText = Assert-FileReference -CaseId "runtime-file-reference" -Path (Join-Path $RepoRoot "Leeway Runtime Fabric\server\index.cjs") -Needles @("agent-lee-canonical-voice-law.md", "AGENT_LEE_VOICE_LAW_TEXT", "identitySystemPrompt")
$ExtensionText = Assert-FileReference -CaseId "extension-file-reference" -Path (Join-Path $RepoRoot ".leeway-vscode\extensions\leeway-agent-lee-chat\extension.js") -Needles @("agent-lee-canonical-voice-law.md", "AGENT_LEE_VOICE_LAW_TEXT", "buildSystemPrompt")

$FallbackTextClean = -not (Test-TextContainsAny -Text $AdapterText -Needles @("Agent Lee returned an empty response", "Agent Lee online.", "Say only: Agent Lee online", "downstream model backend did not respond")) -and -not (Test-TextContainsAny -Text $RouterText -Needles @("Agent Lee online.", "standing by unless ending a session")) -and -not (Test-TextContainsAny -Text $ExtensionText -Needles @("Agent Lee returned an empty response", "Who are you and what is your lineage"))
Add-Check -CaseId "fallback-text-clean" -Passed $FallbackTextClean -Message "Fallback text avoids generic assistant phrasing" -Details @{
  adapter = $AdapterText
  router = $RouterText
  extension = $ExtensionText
}

$IdentityTextClean = -not (Test-TextContainsAny -Text $RuntimeText -Needles @("Who are you and what is your lineage")) -and -not (Test-TextContainsAny -Text $ExtensionText -Needles @("Who are you and what is your lineage"))
Add-Check -CaseId "identity-text-clean" -Passed $IdentityTextClean -Message "Identity prompt text avoids generic lineage phrasing" -Details @{
  runtime = $RuntimeText
  extension = $ExtensionText
}

$AdapterBodyWho = @{
  model = "agent-lee-code-mode"
  temperature = 0.2
  max_tokens = 180
  messages = @(
    @{ role = "user"; content = "Who are you, and what do you do in the Leeway stack?" }
  )
}
$AdapterBodyIDE = @{
  model = "agent-lee-code-mode"
  temperature = 0.2
  max_tokens = 220
  messages = @(
    @{ role = "user"; content = "Can you connect yourself to another IDE like Antigravity if the developer asks?" }
  )
}
$RouterBodyBlocker = @{
  model = "agent-lee"
  temperature = 0.2
  max_tokens = 220
  messages = @(
    @{ role = "user"; content = "What is blocking you right now, and how do you handle it on the official path?" }
  )
}
$RuntimeBodyWho = @{
  input = "Who are you, and what do you do in the Leeway stack?"
  mode = "chat"
  speak = $false
}

$AdapterWho = Invoke-ChatProbe -CaseId "adapter-who" -Url "http://127.0.0.1:8787/v1/chat/completions" -Body $AdapterBodyWho
$AdapterIDE = Invoke-ChatProbe -CaseId "adapter-ide" -Url "http://127.0.0.1:8787/v1/chat/completions" -Body $AdapterBodyIDE
$RouterWho = Invoke-ChatProbe -CaseId "router-who" -Url "http://127.0.0.1:8080/v1/chat/completions" -Body $AdapterBodyWho
$RouterBlocker = Invoke-ChatProbe -CaseId "router-blocker" -Url "http://127.0.0.1:8080/v1/chat/completions" -Body $RouterBodyBlocker
$RuntimeWho = Invoke-ChatProbe -CaseId "runtime-who" -Url "http://127.0.0.1:4001/agent-lee/chat" -Body $RuntimeBodyWho

Test-CanonicalResponse -CaseId "adapter-who-style" -Text $AdapterWho.text -RequiredNeedles @("sentinel", "Runtime Fabric", "receipts", "approval gates", "official path")
Test-CanonicalResponse -CaseId "adapter-ide-style" -Text $AdapterIDE.text -RequiredNeedles @("inspect", "adapter", "provenance", "approval", "receipt") -ForbiddenNeedles @("I can connect", "success")
Test-CanonicalResponse -CaseId "router-who-style" -Text $RouterWho.text -RequiredNeedles @("sentinel", "Runtime Fabric", "receipts", "official path")
Test-CanonicalResponse -CaseId "router-blocker-style" -Text $RouterBlocker.text -RequiredNeedles @("blocked", "receipt", "route", "official path")
Test-CanonicalResponse -CaseId "runtime-who-style" -Text $RuntimeWho.text -RequiredNeedles @("sentinel", "Runtime Fabric", "receipts", "approval gates", "official path")

$VoiceLawActiveInTurbo = $LawExists -and
  ($AdapterText -match 'agent-lee-canonical-voice-law.md') -and
  ($AdapterWho.text -match 'sentinel') -and
  ($AdapterWho.text -match 'Runtime Fabric') -and
  ($AdapterIDE.text -match 'provenance')

$ManualTestingRequired = $FailedCases.Count -gt 0 -or -not $VoiceLawActiveInTurbo

$Status = if ($FailedCases.Count -eq 0) { "PASS" } else { "FAIL" }

$ValidationOutput = [ordered]@{
  filesChecked = $FilesChanged
  routesPatched = $RoutesPatched
  promptsPatched = $PromptsPatched
  checks = @($Checks | ForEach-Object { $_ })
}

$Receipt = [ordered]@{
  schema = "leeway.agent-lee.canonical-voice-law-proof.v1"
  status = $Status
  failedCases = @($FailedCases | ForEach-Object { $_ })
  filesChanged = @($FilesChanged)
  routesPatched = @($RoutesPatched)
  promptsPatched = @($PromptsPatched)
  validationOutput = $ValidationOutput
  sampleResponses = $SampleResponses
  voiceLawActiveInVscodeAgentLeeTurbo = [bool]$VoiceLawActiveInTurbo
  manualTestingRequired = [bool]$ManualTestingRequired
  controlSurface = "codex_terminal"
  adapterPort = 8787
  routerPort = 8080
  runtimeFabric = $true
  official = $false
  startedAt = (Get-Date).ToString("o")
  endedAt = (Get-Date).ToString("o")
  receiptPath = $ReceiptPath
}

$Receipt | ConvertTo-Json -Depth 30 | Set-Content -LiteralPath $ReceiptPath -Encoding UTF8

Write-Host "Validation status: $Status"
Write-Host "Failed cases: $($FailedCases.Count)"
Write-Host "Receipt: $ReceiptPath"

if ($Status -ne "PASS") {
  exit 1
}
