# Test-AgentLeeOwnerIdentity.ps1
# Validates the owner identity contract, manifest, schema, and prompt-builder wiring.

param(
    [switch]$NoExitOnFail,
    [switch]$VerboseRaw
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$WorkspaceRoot = Split-Path -Parent $ScriptDir
$ReportsRoot = Join-Path $WorkspaceRoot "Archive\reports"
$ReceiptsRoot = Join-Path $WorkspaceRoot "Archive\receipts"

New-Item -ItemType Directory -Force -Path $ReportsRoot | Out-Null
New-Item -ItemType Directory -Force -Path $ReceiptsRoot | Out-Null

$StartedAt = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
$Timestamp = Get-Date -Format "yyyyMMdd-HHmmss"

$OwnerManifestPath = Join-Path $WorkspaceRoot "agent-lee-coding-mode\runtime\identity\owner\owner-identity.manifest.json"
$OwnerContractPath = Join-Path $WorkspaceRoot "agent-lee-coding-mode\contracts\agent-lee-owner-identity-contract.md"
$OwnerAuthPolicyPath = Join-Path $WorkspaceRoot "agent-lee-coding-mode\contracts\agent-lee-owner-authentication-policy.md"
$OwnerSchemaPath = Join-Path $WorkspaceRoot "agent-lee-coding-mode\contracts\agent-lee-owner-biometric-enrollment.schema.json"
$PromptBuilderPath = Join-Path $WorkspaceRoot "Leeway Runtime Fabric\standards\persona\src\prompt-builder.ts"
$ReportPath = Join-Path $ReportsRoot "agent-lee-owner-identity-report.json"
$ReceiptPath = Join-Path $ReceiptsRoot "agent_lee_owner_identity_receipt.json"

function Write-JsonFile {
    param(
        [Parameter(Mandatory = $true)]$Value,
        [Parameter(Mandatory = $true)][string]$Path
    )
    $json = $Value | ConvertTo-Json -Depth 20
    [System.IO.File]::WriteAllText($Path, $json, [System.Text.UTF8Encoding]::new($false))
}

function Read-JsonFile {
    param([Parameter(Mandatory = $true)][string]$Path)
    return Get-Content -LiteralPath $Path -Raw | ConvertFrom-Json
}

function Test-FileExists {
    param([Parameter(Mandatory = $true)][string]$Path)
    return Test-Path -LiteralPath $Path
}

function Get-Text {
    param([Parameter(Mandatory = $true)][string]$Path)
    return [System.IO.File]::ReadAllText($Path)
}

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host " Agent Lee Owner Identity Validation" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host " Started: $StartedAt"
Write-Host ""

$manifestExists = Test-FileExists $OwnerManifestPath
$schemaExists = Test-FileExists $OwnerSchemaPath
$contractExists = Test-FileExists $OwnerContractPath
$policyExists = Test-FileExists $OwnerAuthPolicyPath

$manifestJsonValid = $false
$manifest = $null
if ($manifestExists) {
    $manifest = Read-JsonFile $OwnerManifestPath
    $manifestJsonValid = $true
}

$schemaJsonValid = $false
$schema = $null
if ($schemaExists) {
    $schema = Read-JsonFile $OwnerSchemaPath
    $schemaJsonValid = $true
}

$promptBuilderText = if (Test-FileExists $PromptBuilderPath) { Get-Text $PromptBuilderPath } else { "" }
$promptBuilderOwnerManifestReference = $promptBuilderText -match [regex]::Escape("agent-lee-coding-mode/runtime/identity/owner/owner-identity.manifest.json")

$ownerId = if ($manifestJsonValid) { $manifest.ownerId } else { $null }
$ownerName = if ($manifestJsonValid) { $manifest.ownerName } else { $null }
$creatorRootAuthority = if ($manifestJsonValid) { [bool]$manifest.creatorRootAuthority } else { $false }
$vscodeAuthorityRole = $null
if ($manifestJsonValid) {
    try {
        $vscodeAuthorityRole = $manifest.vscodeAuthorityRole
    } catch {
        $vscodeAuthorityRole = $null
    }
}

$manifestText = if ($manifestExists) { Get-Text $OwnerManifestPath } else { "" }
$sensitivePatterns = @(
    '"licenseNumber"',
    '"license"',
    '"homeAddress"',
    '"address"',
    '"dateOfBirth"',
    '"dob"',
    '"governmentId"',
    '"passport"',
    '"ssn"',
    '"socialSecurity"',
    '"driverLicense"'
)
$sensitiveIdDataProtected = $true
foreach ($pattern in $sensitivePatterns) {
    if ($manifestText -match $pattern) {
        $sensitiveIdDataProtected = $false
        break
    }
}

if ($manifestText -match '(?i)\b\d{3}-\d{2}-\d{4}\b') {
    $sensitiveIdDataProtected = $false
}
if ($manifestText -match '(?i)\b(home address|date of birth|driver license|government id)\b') {
    $sensitiveIdDataProtected = $false
}

$noFakeBiometricPass = $false
$faceEnrollmentStatus = $null
$voiceEnrollmentStatus = $null
$passphraseFallbackStatus = $null
$rootAuthorityStatus = "BLOCKED"
$adminOverrideBlockedStatus = "BLOCKED"
$blockers = @()
$truthLabels = New-Object System.Collections.Generic.List[string]

if ($manifestJsonValid) {
    $faceEnrollmentStatus = $manifest.faceEnrollment.status
    $voiceEnrollmentStatus = $manifest.voiceEnrollment.status
    $passphraseFallbackStatus = $manifest.passphraseFallback.status
    if ($creatorRootAuthority) {
        $rootAuthorityStatus = "READY"
    }
    if ($contractExists -and ($manifestText -match 'creatorRootAuthority\s*:\s*true' -or $manifestText -match 'Creator of Agent Lee')) {
        $adminOverrideBlockedStatus = "READY"
    }
    $noFakeBiometricPass = @(
        "OWNER_FACE_ENROLLED",
        "OWNER_VOICE_ENROLLED",
        "OWNER_FACE_AND_VOICE_ENROLLED",
        "OWNER_AUTHENTICATED",
        "OWNER_AUTHENTICATION_PARTIAL"
    ) -notcontains $faceEnrollmentStatus -and
    @(
        "OWNER_FACE_ENROLLED",
        "OWNER_VOICE_ENROLLED",
        "OWNER_FACE_AND_VOICE_ENROLLED",
        "OWNER_AUTHENTICATED",
        "OWNER_AUTHENTICATION_PARTIAL"
    ) -notcontains $voiceEnrollmentStatus
}

$contractText = if ($contractExists) { Get-Text $OwnerContractPath } else { "" }
$contractHasCreatorRootAuthority = $contractText -match 'creator-root authority'
$contractHasAdminOverrideBlock = $contractText -match 'Admin operators cannot override creator-root authority'
$contractHasStandardsApproval = $contractText -match 'Leeway standards changes require Leonard approval'
$contractHasTruthfulRecognition = $contractText -match 'Owner identity is local-first and receipt-backed' -or $contractText -match 'No biometric recognition may be claimed without local proof and approval'
$contractHasNoFakeBiometric = $contractText -match 'must not fake face recognition' -and $contractText -match 'must not fake voice recognition'
$contractHasSensitiveProtection = $contractText -match 'Sensitive identity data must be protected'

$policyText = if ($policyExists) { Get-Text $OwnerAuthPolicyPath } else { "" }
$policyHasFace = $policyText -match 'Face, if a camera and supported model are available'
$policyHasVoice = $policyText -match 'Voice, if a microphone and supported model are available'
$policyHasPassphrase = $policyText -match 'Passphrase fallback, if explicitly enabled'
$policyHasPartial = $policyText -match 'OWNER_AUTHENTICATION_PARTIAL'
$policyHasBlockedStates = $policyText -match 'OWNER_AUTHENTICATION_BLOCKED_CAMERA_UNAVAILABLE' -and $policyText -match 'OWNER_AUTHENTICATION_BLOCKED_MIC_UNAVAILABLE' -and $policyText -match 'OWNER_AUTHENTICATION_BLOCKED_MODEL_UNAVAILABLE'
$policyHasRootAuthority = $policyText -match 'Root authority covers standards changes, identity changes, and high-risk actions'

if ($manifestExists -and $manifestJsonValid) {
    if ($ownerId -eq "LEONARD_J_LEE") { $truthLabels.Add("OWNER_IDENTITY_MANIFEST_READY") }
    if ($ownerName -eq "Leonard J Lee") { $truthLabels.Add("LEONARD_J_LEE_OWNER_PROFILE_READY") }
    if ($creatorRootAuthority) { $truthLabels.Add("CREATOR_ROOT_AUTHORITY_READY") }
    if ($vscodeAuthorityRole -eq "none") { $truthLabels.Add("VS_CODE_HAS_NO_AUTHORITY_ROLE") }
    if ($sensitiveIdDataProtected) { $truthLabels.Add("SENSITIVE_ID_DATA_PROTECTED") }
    if ($noFakeBiometricPass) { $truthLabels.Add("NO_FAKE_BIOMETRIC_PASS") }
}

if ($contractExists -and $contractHasCreatorRootAuthority -and $contractHasAdminOverrideBlock -and $contractHasStandardsApproval -and $contractHasTruthfulRecognition -and $contractHasNoFakeBiometric -and $contractHasSensitiveProtection) {
    $truthLabels.Add("OWNER_IDENTITY_CONTRACT_READY")
    $truthLabels.Add("ADMIN_CANNOT_OVERRIDE_CREATOR_ROOT")
}

if ($policyExists -and $policyHasFace -and $policyHasVoice -and $policyHasPassphrase -and $policyHasPartial -and $policyHasBlockedStates -and $policyHasRootAuthority) {
    $truthLabels.Add("OWNER_PASSPHRASE_FALLBACK_READY")
}

$truthLabels = @($truthLabels | Select-Object -Unique)

if (-not $manifestExists) { $blockers += "Owner identity manifest missing." }
if (-not $manifestJsonValid) { $blockers += "Owner identity manifest JSON invalid." }
if (-not $schemaExists) { $blockers += "Owner biometric schema missing." }
if (-not $schemaJsonValid) { $blockers += "Owner biometric schema JSON invalid." }
if (-not $contractExists) { $blockers += "Owner identity contract missing." }
if (-not $policyExists) { $blockers += "Owner authentication policy missing." }
if (-not $promptBuilderOwnerManifestReference) { $blockers += "Prompt builder does not reference the owner manifest path." }
if (-not $sensitiveIdDataProtected) { $blockers += "Potential sensitive identity field or raw ID pattern detected in owner manifest." }
if (-not $noFakeBiometricPass) { $blockers += "Owner manifest claims a biometric-ready status that is not validated here." }
if (-not $contractExists -or -not $contractHasCreatorRootAuthority -or -not $contractHasAdminOverrideBlock -or -not $contractHasStandardsApproval -or -not $contractHasTruthfulRecognition -or -not $contractHasNoFakeBiometric -or -not $contractHasSensitiveProtection) {
    $blockers += "Owner contract is missing one or more required authority, truthfulness, or protection statements."
}
if (-not $policyExists -or -not $policyHasFace -or -not $policyHasVoice -or -not $policyHasPassphrase -or -not $policyHasPartial -or -not $policyHasBlockedStates -or -not $policyHasRootAuthority) {
    $blockers += "Owner authentication policy is missing one or more required authentication or root-authority statements."
}

$verdict = "OWNER_IDENTITY_CONTRACT_AND_MANIFEST_READY"
if ($blockers.Count -gt 0) {
    $verdict = if ($manifestExists -and $manifestJsonValid -and $schemaExists -and $schemaJsonValid -and $contractExists -and $policyExists) {
        "OWNER_IDENTITY_PARTIAL_BLOCKERS_REMAIN"
    } else {
        "OWNER_IDENTITY_BLOCKED"
    }
}

Write-Host " Manifest exists: $manifestExists"
Write-Host " Manifest JSON valid: $manifestJsonValid"
Write-Host " Schema exists: $schemaExists"
Write-Host " Schema JSON valid: $schemaJsonValid"
Write-Host " Contract exists: $contractExists"
Write-Host " Policy exists: $policyExists"
Write-Host " Prompt builder reference: $promptBuilderOwnerManifestReference"
Write-Host " Verifier verdict: $verdict"
Write-Host ""

$report = [ordered]@{
    ownerIdentityManifestExists = $manifestExists
    ownerIdentityManifestJsonValid = $manifestJsonValid
    ownerId = $ownerId
    ownerName = $ownerName
    creatorRootAuthority = $creatorRootAuthority
    vscodeAuthorityRole = $vscodeAuthorityRole
    ownerContractExists = $contractExists
    ownerAuthenticationPolicyExists = $policyExists
    ownerBiometricSchemaExists = $schemaExists
    promptBuilderOwnerManifestReference = $promptBuilderOwnerManifestReference
    sensitiveIdDataProtected = $sensitiveIdDataProtected
    noFakeBiometricPass = $noFakeBiometricPass
    faceEnrollmentStatus = $faceEnrollmentStatus
    voiceEnrollmentStatus = $voiceEnrollmentStatus
    passphraseFallbackStatus = $passphraseFallbackStatus
    rootAuthorityStatus = $rootAuthorityStatus
    adminOverrideBlockedStatus = $adminOverrideBlockedStatus
    blockers = @($blockers)
    truthLabels = @($truthLabels)
    verdict = $verdict
}

$receipt = [ordered]@{
    schema = "leeway.agent-lee.owner-identity.receipt.v1"
    status = if ($blockers.Count -eq 0) { "PASS" } else { "PARTIAL" }
    startedAt = $StartedAt
    endedAt = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
    controlSurface = "direct-powershell"
    adapterPort = 8787
    routerPort = 8080
    runtimeFabric = $false
    notCodex = $false
    notDirectPowerShell = $false
    notDirectBrowserOnly = $true
    agentIdentity = @{
        agentId = "agent-lee"
        agentMode = "code-mode"
        role = "supreme-agent-lead"
        canonicalFingerprint = "leeway.agent-lee.code-mode.canonical.supreme-agent-lead.v1"
    }
    reportPath = $ReportPath
    receiptPath = $ReceiptPath
    blockers = @($blockers)
    truthLabels = @($truthLabels)
    verification = @{
        manifestExists = $manifestExists
        manifestJsonValid = $manifestJsonValid
        schemaExists = $schemaExists
        schemaJsonValid = $schemaJsonValid
        contractExists = $contractExists
        policyExists = $policyExists
        promptBuilderOwnerManifestReference = $promptBuilderOwnerManifestReference
    }
}

Write-JsonFile -Value $report -Path $ReportPath
Write-JsonFile -Value $receipt -Path $ReceiptPath

Write-Host " Report written: $ReportPath"
Write-Host " Receipt written: $ReceiptPath"
Write-Host ""
Write-Host "Truth labels:"
if ($truthLabels.Count -gt 0) {
    $truthLabels | ForEach-Object { Write-Host " - $_" }
} else {
    Write-Host " - none"
}

Write-Host ""
if ($blockers.Count -gt 0) {
    Write-Host "Blockers:" -ForegroundColor Yellow
    $blockers | ForEach-Object { Write-Host " - $_" -ForegroundColor Yellow }
}

if (-not $NoExitOnFail -and $verdict -ne "OWNER_IDENTITY_CONTRACT_AND_MANIFEST_READY") {
    exit 1
}

exit 0
