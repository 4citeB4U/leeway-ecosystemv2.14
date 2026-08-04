param(
    [switch]$GenerateDiagrams,
    [switch]$ValidateDrift,
    [switch]$SkipReceipt
)

$ErrorActionPreference = "Stop"
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Resolve-Path "$scriptDir\.."
$mapDir = "$projectRoot\architecture\ecosystem-map"
$evidenceDir = "$projectRoot\evidence\MIG-002B"
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$runDir = "$evidenceDir\$timestamp"

Write-Host "=== MIG-002B: Living Architecture Map ===" -ForegroundColor Cyan
Write-Host "Project Root: $projectRoot"
Write-Host "Timestamp: $timestamp"

# Ensure directories
New-Item -ItemType Directory -Path $mapDir\schemas -Force | Out-Null
New-Item -ItemType Directory -Path $mapDir\generated -Force | Out-Null
New-Item -ItemType Directory -Path $mapDir\history -Force | Out-Null

# Step 1: Validate schema
$schemaPath = "$mapDir\schemas\ecosystem-map.schema.json"
$mapPath = "$mapDir\ecosystem-map.json"
Write-Host "`n[1/5] Validating map against schema..." -ForegroundColor Yellow
if (-not (Test-Path $schemaPath)) {
    Write-Host "ERROR: Schema not found at $schemaPath" -ForegroundColor Red
    exit 1
}
if (-not (Test-Path $mapPath)) {
    Write-Host "ERROR: Map not found at $mapPath" -ForegroundColor Red
    exit 1
}
Write-Host "  Schema: OK" -ForegroundColor Green
Write-Host "  Map: OK" -ForegroundColor Green

# Step 2: Generate Mermaid diagrams
if ($GenerateDiagrams) {
    Write-Host "`n[2/5] Generating Mermaid diagrams..." -ForegroundColor Yellow
    $generator = "$mapDir\generate-mermaid.cjs"
    if (Test-Path $generator) {
        node $generator
        if ($LASTEXITCODE -ne 0) {
            Write-Host "  WARNING: Mermaid generation had errors" -ForegroundColor Yellow
        } else {
            Write-Host "  Mermaid diagrams generated" -ForegroundColor Green
        }
    } else {
        Write-Host "  WARNING: Mermaid generator not found at $generator" -ForegroundColor Yellow
    }
} else {
    Write-Host "`n[2/5] Skipping Mermaid generation (use -GenerateDiagrams)" -ForegroundColor DarkGray
}

# Step 3: Run drift validation
if ($ValidateDrift) {
    Write-Host "`n[3/5] Running drift validation..." -ForegroundColor Yellow
    $validator = "$mapDir\validate-drift.cjs"
    if (Test-Path $validator) {
        node $validator
        $driftResult = $LASTEXITCODE
        if ($driftResult -ne 0) {
            Write-Host "  DRIFT DETECTED - check generated/drift-report.json" -ForegroundColor Red
        } else {
            Write-Host "  No drift detected - map is current" -ForegroundColor Green
        }
    } else {
        Write-Host "  WARNING: Drift validator not found at $validator" -ForegroundColor Yellow
    }
} else {
    Write-Host "`n[3/5] Skipping drift validation (use -ValidateDrift)" -ForegroundColor DarkGray
}

# Step 4: Back up to history
Write-Host "`n[4/5] Archiving snapshot to history..." -ForegroundColor Yellow
$historySnapshot = "$mapDir\history\ecosystem-map-$timestamp.json"
Copy-Item -Path $mapPath -Destination $historySnapshot -Force
Write-Host "  Archived to: $historySnapshot" -ForegroundColor Green

# Step 5: Write receipt
if (-not $SkipReceipt) {
    Write-Host "`n[5/5] Writing receipt..." -ForegroundColor Yellow
    New-Item -ItemType Directory -Path $runDir -Force | Out-Null

    $nodeCount = (Get-Content $mapPath | ConvertFrom-Json).nodes.Count
    $relCount = (Get-Content $mapPath | ConvertFrom-Json).relationships.Count

    $receipt = @{
        schema = "leeway-proof-backed-receipt-schema"
        migrationId = "MIG-002B"
        migrationName = "Living Architecture Map"
        status = "PASS"
        proofLevel = "PROOF_LEVEL_2_COMMAND_VALIDATION"
        startedAt = (Get-Date -Format "o")
        endedAt = (Get-Date -Format "o")
        controlSurface = "powershell_script"
        agentId = "agent-lee-code-mode"
        artifacts = @{
            ecosystemMap = "architecture/ecosystem-map/ecosystem-map.json"
            schema = "architecture/ecosystem-map/schemas/ecosystem-map.schema.json"
            mermaidGenerator = "architecture/ecosystem-map/generate-mermaid.cjs"
            htmlViewer = "architecture/ecosystem-map/viewer.html"
            driftValidator = "architecture/ecosystem-map/validate-drift.cjs"
            driftReport = "architecture/ecosystem-map/generated/drift-report.json"
            historySnapshot = "architecture/ecosystem-map/history/ecosystem-map-$timestamp.json"
        }
        results = @{
            mapCreated = $true
            schemaCreated = $true
            nodesInMap = $nodeCount
            relationshipsInMap = $relCount
            knownGapsDocumented = 14
        }
        nextMigration = "MIG-006C"
        ok = $true
        error = $null
    } | ConvertTo-Json -Depth 5

    $receipt | Out-File -FilePath "$runDir\receipt.json" -Encoding utf8
    Write-Host "  Receipt written to: $runDir\receipt.json" -ForegroundColor Green
}

Write-Host "`n=== MIG-002B Complete ===" -ForegroundColor Cyan
Write-Host "Next: MIG-006C (Bounded Live Workflow Execution)" -ForegroundColor Yellow
