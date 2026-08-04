# Run this periodically (Task Scheduler) to recompute GEC metrics from shadow logs.
$repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Definition
$shadow = Join-Path $repoRoot "agent-lee-coding-mode\Archive\receipts\gec_shadow_actions.jsonl"
$out = Join-Path $repoRoot "agent-lee-coding-mode\Archive\receipts\gec_metrics.json"

if (!(Test-Path $shadow)) {
  Write-Host "No shadow actions found at $shadow"
  exit 0
}

python scripts/compute_gec_metrics.py --in $shadow --out $out
if ($LASTEXITCODE -eq 0) { Write-Host "GEC metrics updated: $out" } else { Write-Host "Failed to compute metrics" }
