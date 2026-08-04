param(
  [string]$EvidenceRoot = "./evidence/phase-001"
)

$ErrorActionPreference = 'Stop'

Write-Host "[MIG-001] Host Foundation"
Write-Host "ADR: ADR-0001, ADR-0002"
Write-Host "Objective: establish migration governance and evidence paths"

New-Item -ItemType Directory -Force -Path $EvidenceRoot | Out-Null
New-Item -ItemType File -Force -Path (Join-Path $EvidenceRoot 'README.txt') -Value "Migration evidence for MIG-001`n" | Out-Null

Write-Host "[MIG-001] Completed"
Write-Host "Evidence written to $EvidenceRoot"
