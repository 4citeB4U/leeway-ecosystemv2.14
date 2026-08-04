$ErrorActionPreference = "Stop"
param([string]$OutputPath = "")
$Root = Split-Path -Parent (Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path))
$RepoRoot = Split-Path -Parent $Root
if (-not $OutputPath) { $OutputPath = Join-Path $RepoRoot "Archive\reports\agent-lee-qwen3-memory-retrieval-report.json" }
[ordered]@{
  contextBundlePath = $OutputPath
  standardsRead = @("BOOK-54-ASSISTANT-EMBODIMENT-AND-BEHAVIOR-LAW","BOOK-55-ASSISTANT-RECORDING-AND-LEARNING-LAW")
  relevantReceipts = @()
  activeBlockers = @()
  recentTruthLabels = @("LEEWAY_STANDARDS_READ")
  recommendedThinkingProfile = "STANDARDS_GOVERNED"
} | ConvertTo-Json -Depth 10
