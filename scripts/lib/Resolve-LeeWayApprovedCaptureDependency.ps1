<#
LEEWAY HEADER
TAG: GOVERNANCE.APPROVED_CAPTURE_GATE
REGION: SCRIPTS.LIB
DISCOVERY_PIPELINE: Approved Dependency Registry -> Capture Authority Decision -> Canonical Invocation Or Blocked Evidence
LEEWAY_ID: LEEWAY_APP::GOVERNANCE::APPROVED_CAPTURE_GATE::RESOLVER
CLASSIFICATION: GOVERNANCE_GATE
OWNER: LeeWay Standards
#>

param(
  [string]$WorkspaceRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path,
  [string]$ConsumerId = "LEEWAY_CONSUMER::APPROVED_CAPTURE_GATE",
  [string]$GateEvidencePath = "",
  [string]$AssistantBodyId = "LEEWAY_ACTOR::ASSISTANT_BODY::CODEX::APPROVED_CAPTURE_GATE",
  [string]$AssistantObjectId = "LEEWAY_ACTOR::EXTERNAL_ASSISTANT::CODEX_GPT5::WORKSPACE_SUBORDINATE",
  [string]$TaskId = ("LEEWAY_TASK::APPROVED_CAPTURE_GATE::" + (Get-Date -Format "yyyyMMddTHHmmss")),
  [string]$SubjectObjectId = "LEEWAY_GATE::APPROVED_LIVE_AUDIO_CAPTURE_DEPENDENCY",
  [ValidateSet("AUTO", "CAPTURE_CHAIN", "RUNTIME_CAPABILITY", "EXECUTABLE")]
  [string]$PreferredInvocationKind = "AUTO",
  [switch]$AsJson
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Read-JsonFile {
  param(
    [string]$Path,
    $Fallback = $null
  )

  if (-not (Test-Path -LiteralPath $Path)) {
    return $Fallback
  }

  try {
    return (Get-Content -LiteralPath $Path -Raw -Encoding UTF8 | ConvertFrom-Json)
  } catch {
    return $Fallback
  }
}

function Get-SafePropertyValue {
  param(
    $Object,
    [string]$PropertyName,
    $Default = $null
  )

  if ($null -eq $Object) {
    return $Default
  }

  $property = $Object.PSObject.Properties[$PropertyName]
  if ($null -eq $property) {
    return $Default
  }

  return $property.Value
}

function Get-RelativePath {
  param(
    [string]$BasePath,
    [string]$TargetPath
  )

  $base = [System.IO.Path]::GetFullPath($BasePath).TrimEnd("\") + "\"
  $target = [System.IO.Path]::GetFullPath($TargetPath)
  if ($target.StartsWith($base, [System.StringComparison]::OrdinalIgnoreCase)) {
    return $target.Substring($base.Length).Replace("\", "/")
  }

  return $target.Replace("\", "/")
}

function Write-JsonFile {
  param(
    [string]$Path,
    $Payload
  )

  $parent = Split-Path -Parent $Path
  if ($parent) {
    New-Item -ItemType Directory -Force -Path $parent | Out-Null
  }

  $Payload | ConvertTo-Json -Depth 100 | Set-Content -LiteralPath $Path -Encoding UTF8
}

function Find-ObjectByPropertyValue {
  param(
    [object[]]$Items,
    [string]$PropertyName,
    [string]$ExpectedValue
  )

  foreach ($item in @($Items)) {
    if ([string](Get-SafePropertyValue -Object $item -PropertyName $PropertyName -Default "") -eq $ExpectedValue) {
      return $item
    }
  }

  return $null
}

$workspaceRoot = (Resolve-Path $WorkspaceRoot).Path
$runtimeRegistryPath = Join-Path $workspaceRoot "LeeWay-Standards\registries\leeway-approved-runtime-dependency-registry.json"
$approvedDependencyRegistryPath = Join-Path $workspaceRoot "LeeWay-Standards\registries\leeway-approved-dependency-registry.json"
$bannedFallbackRegistryPath = Join-Path $workspaceRoot "LeeWay-Standards\registries\leeway-banned-runtime-fallbacks.json"
$sessionStatePath = Join-Path $workspaceRoot "Archive\reports\leeway-real-time-embodied-session-state.json"
$helperRelativePath = Get-RelativePath -BasePath $workspaceRoot -TargetPath $PSCommandPath
$stamp = Get-Date -Format "yyyyMMddTHHmmss"

if ([string]::IsNullOrWhiteSpace($GateEvidencePath)) {
  $safeConsumer = ($ConsumerId -replace "[^A-Za-z0-9]+", "-").Trim("-").ToLowerInvariant()
  if ([string]::IsNullOrWhiteSpace($safeConsumer)) {
    $safeConsumer = "approved-capture-gate"
  }
  $GateEvidencePath = Join-Path $workspaceRoot ("Archive\reports\leeway-approved-capture-gate-evidence-{0}-{1}.json" -f $safeConsumer, $stamp)
} elseif (-not [System.IO.Path]::IsPathRooted($GateEvidencePath)) {
  $GateEvidencePath = Join-Path $workspaceRoot $GateEvidencePath
}

$runtimeRegistry = Read-JsonFile -Path $runtimeRegistryPath -Fallback ([ordered]@{})
$approvedDependencyRegistry = Read-JsonFile -Path $approvedDependencyRegistryPath -Fallback ([ordered]@{})
$bannedFallbackRegistry = Read-JsonFile -Path $bannedFallbackRegistryPath -Fallback ([ordered]@{})
$sessionState = Read-JsonFile -Path $sessionStatePath -Fallback ([ordered]@{})

$decision = Get-SafePropertyValue -Object $runtimeRegistry -PropertyName "currentAudioCaptureDecision" -Default $null
$approvedDependencies = @(Get-SafePropertyValue -Object $runtimeRegistry -PropertyName "approvedDependencies" -Default @())
$approvedRuntimeCapabilities = @(Get-SafePropertyValue -Object $runtimeRegistry -PropertyName "approvedRuntimeCapabilities" -Default @())
$missingRegistrations = @(Get-SafePropertyValue -Object $runtimeRegistry -PropertyName "missingRequiredRegistrations" -Default @())
$approvedCaptureDependencies = @(Get-SafePropertyValue -Object $approvedDependencyRegistry -PropertyName "approvedCaptureDependencies" -Default @())
$bannedFallbacks = @(Get-SafePropertyValue -Object $bannedFallbackRegistry -PropertyName "bannedFallbacks" -Default @())

$requiredCaptureDependencyIds = @(
  "LEEWAY_CAPTURE_API::BROWSER_GET_USER_MEDIA",
  "LEEWAY_CAPTURE_API::BROWSER_ENUMERATE_DEVICES",
  "LEEWAY_CAPTURE_API::WEB_AUDIO_PCM_CAPTURE",
  "LEEWAY_CAPTURE_ENCODER::LEEWAY_JS_WAV_PCM16_MONO_16KHZ",
  "LEEWAY_CAPTURE_ROUTE::EDGE_RTC_LIVE_CORRIDOR_4318",
  "LEEWAY_CAPTURE_ROUTE::EDGE_RTC_AUDIBLE_CONFIRMATION_4318",
  "LEEWAY_CAPTURE_ARTIFACT_STORE::ARCHIVE_REPORTS_CURRENT_PASS_AUDIO",
  "LEEWAY_MODEL_AUDIO_RUNTIME::QWEN_GPU_CANONICAL_PYTHON",
  "LEEWAY_MODEL_AUDIO_PACKAGE::TORCH",
  "LEEWAY_MODEL_AUDIO_PACKAGE::SOUNDFILE",
  "LEEWAY_MODEL_AUDIO_PACKAGE::LIBROSA",
  "LEEWAY_MODEL_AUDIO_PACKAGE::TRANSFORMERS",
  "LEEWAY_MODEL_AUDIO_PACKAGE::QWEN_OMNI_UTILS"
)

$captureDependencyApprovalsUsed = [System.Collections.Generic.List[object]]::new()
$missingCaptureDependencyIds = [System.Collections.Generic.List[string]]::new()
$bannedConflictDependencies = [System.Collections.Generic.List[string]]::new()

foreach ($dependencyId in $requiredCaptureDependencyIds) {
  $entry = Find-ObjectByPropertyValue -Items $approvedCaptureDependencies -PropertyName "dependencyId" -ExpectedValue $dependencyId
  $approvalStatus = [string](Get-SafePropertyValue -Object $entry -PropertyName "approvalStatus" -Default "")
  $bannedConflict = [bool](Get-SafePropertyValue -Object $entry -PropertyName "bannedConflict" -Default $false)

  if ($null -ne $entry -and $approvalStatus -eq "APPROVED_CAPTURE_DEPENDENCY") {
    $captureDependencyApprovalsUsed.Add([ordered]@{
      dependencyId = $dependencyId
      name = [string](Get-SafePropertyValue -Object $entry -PropertyName "name" -Default $dependencyId)
      type = [string](Get-SafePropertyValue -Object $entry -PropertyName "type" -Default "")
      approvedFor = @(Get-SafePropertyValue -Object $entry -PropertyName "approvedFor" -Default @())
      allowedRuntime = [string](Get-SafePropertyValue -Object $entry -PropertyName "allowedRuntime" -Default "")
      approvalStatus = $approvalStatus
      proofRequired = [string](Get-SafePropertyValue -Object $entry -PropertyName "proofRequired" -Default "")
      notes = [string](Get-SafePropertyValue -Object $entry -PropertyName "notes" -Default "")
    })
  } else {
    $missingCaptureDependencyIds.Add($dependencyId)
  }

  if ($bannedConflict) {
    $bannedConflictDependencies.Add($dependencyId)
  }
}

$approvedExecutable = $null
foreach ($dependency in $approvedDependencies) {
  $dependencyId = [string](Get-SafePropertyValue -Object $dependency -PropertyName "dependencyId" -Default "")
  $dependencyType = [string](Get-SafePropertyValue -Object $dependency -PropertyName "dependencyType" -Default "")
  $approvalStatus = [string](Get-SafePropertyValue -Object $dependency -PropertyName "approvalStatus" -Default "")
  $executableName = [string](Get-SafePropertyValue -Object $dependency -PropertyName "executableName" -Default "")
  if (
    $dependencyId -eq "LEEWAY_CAPTURE_EXECUTABLE::LIVE_AUDIO_CAPTURE" -and
    $dependencyType -eq "executable" -and
    $approvalStatus -eq "APPROVED" -and
    -not [string]::IsNullOrWhiteSpace($executableName)
  ) {
    $approvedExecutable = $dependency
    break
  }
}

$approvedRuntimeCapability = $null
foreach ($capability in $approvedRuntimeCapabilities) {
  $capabilityId = [string](Get-SafePropertyValue -Object $capability -PropertyName "capabilityId" -Default "")
  $approvalStatus = [string](Get-SafePropertyValue -Object $capability -PropertyName "approvalStatus" -Default "")
  if (
    $capabilityId -eq "LEEWAY_RUNTIME_CAPABILITY::EDGE_RTC_NATIVE_CAPTURE" -and
    $approvalStatus -eq "APPROVED"
  ) {
    $approvedRuntimeCapability = $capability
    break
  }
}

$missingRegistration = @(
  $missingRegistrations |
    Where-Object {
      [string](Get-SafePropertyValue -Object $_ -PropertyName "dependencyId" -Default "") -eq "LEEWAY_CAPTURE_EXECUTABLE::LIVE_AUDIO_CAPTURE"
    }
) | Select-Object -First 1

$defaultApprovalStatus = [string](Get-SafePropertyValue -Object $decision -PropertyName "approvalStatus" -Default "BLOCKED_APPROVED_CAPTURE_DEPENDENCY_MISSING")
$defaultDecisionOption = [string](Get-SafePropertyValue -Object $decision -PropertyName "decisionOption" -Default "C")
$defaultDecisionLabel = [string](Get-SafePropertyValue -Object $decision -PropertyName "decisionLabel" -Default "CAPTURE_DEPENDENCY_BLOCKED")
$defaultReason = [string](Get-SafePropertyValue -Object $missingRegistration -PropertyName "registrationRequirement" -Default "Approved live audio capture dependency is not registered.")
$fallbackEvidence = [ordered]@{
  allowed = $true
  evidenceKind = "EDGE_RTC_SESSION_STATE_EVIDENCE"
  serviceId = "LEEWAY_SERVICE::EDGE_RTC"
  sourceReportPath = Get-RelativePath -BasePath $workspaceRoot -TargetPath $sessionStatePath
  sourceAudioDevice = [string](Get-SafePropertyValue -Object $sessionState -PropertyName "audioInputDevice" -Default "")
  permittedUses = @(
    "current live session-state continuity evidence",
    "governed route inspection for current live session truth"
  )
  prohibitedUses = @(
    "fresh live microphone capture",
    "fresh hearing calibration retest",
    "detached voice proof",
    "unregistered executable fallback"
  )
}

$missingDependencyId = if ($missingCaptureDependencyIds.Count -gt 0) { $missingCaptureDependencyIds[0] } else { [string](Get-SafePropertyValue -Object $decision -PropertyName "dependencyId" -Default "LEEWAY_CAPTURE_EXECUTABLE::LIVE_AUDIO_CAPTURE") }
$missingDependencyReason = if ($missingCaptureDependencyIds.Count -gt 0) {
  "Approved capture dependency missing: $missingDependencyId"
} else {
  $defaultReason
}
$missingDependencyBlocker = if ($missingCaptureDependencyIds.Count -gt 0) {
  "Fresh live hearing calibration retest remains blocked until capture dependency $missingDependencyId is approved in LeeWay Standards."
} else {
  [string](Get-SafePropertyValue -Object $missingRegistration -PropertyName "blockerIfMissing" -Default "Fresh hearing calibration retest remains blocked until an approved capture authority exists.")
}

$result = [ordered]@{
  gateId = "LEEWAY_APPROVED_DEPENDENCY_GATE"
  consumerId = $ConsumerId
  preferredInvocationKind = $PreferredInvocationKind
  helperPath = $helperRelativePath
  decisionId = [string](Get-SafePropertyValue -Object $decision -PropertyName "decisionId" -Default "")
  decisionOption = $defaultDecisionOption
  decisionLabel = $defaultDecisionLabel
  dependencyId = $missingDependencyId
  owningRuntime = [string](Get-SafePropertyValue -Object $decision -PropertyName "owningRuntime" -Default "LEEWAY_SERVICE::EDGE_RTC")
  approvalStatus = $defaultApprovalStatus
  isApproved = $false
  invocationKind = $null
  executableName = $null
  canonicalInvocation = $null
  canonicalPathPolicy = [string](Get-SafePropertyValue -Object $decision -PropertyName "canonicalPathPolicy" -Default "NO_UNREGISTERED_OR_MACHINE_SPECIFIC_EXECUTABLE_ALLOWED")
  version = [string](Get-SafePropertyValue -Object $decision -PropertyName "version" -Default "")
  reason = $missingDependencyReason
  registrationRequirement = if ($missingCaptureDependencyIds.Count -gt 0) { $missingDependencyReason } else { [string](Get-SafePropertyValue -Object $missingRegistration -PropertyName "registrationRequirement" -Default $missingDependencyReason) }
  portabilityStatus = [string](Get-SafePropertyValue -Object $decision -PropertyName "portabilityStatus" -Default "UNRESOLVED_PENDING_REGISTERED_EXECUTABLE")
  machineProfileRequirement = [string](Get-SafePropertyValue -Object $decision -PropertyName "machineProfileRequirement" -Default "NOT_APPLICABLE_UNTIL_EXECUTABLE_REGISTRATION")
  dependencyGateFunction = [string](Get-SafePropertyValue -Object $decision -PropertyName "dependencyGateFunction" -Default $helperRelativePath)
  replacementPolicy = [string](Get-SafePropertyValue -Object $decision -PropertyName "replacementPolicy" -Default "")
  blockerIfMissing = $missingDependencyBlocker
  receiptRequired = [bool](Get-SafePropertyValue -Object $decision -PropertyName "receiptRequired" -Default $true)
  directBinaryGuessingForbidden = $true
  unregisteredFallbackForbidden = $true
  fallbackEvidence = $fallbackEvidence
  gateEvidencePath = Get-RelativePath -BasePath $workspaceRoot -TargetPath $GateEvidencePath
  approvedDependencyRegistryPath = Get-RelativePath -BasePath $workspaceRoot -TargetPath $approvedDependencyRegistryPath
  runtimeDependencyRegistryPath = Get-RelativePath -BasePath $workspaceRoot -TargetPath $runtimeRegistryPath
  bannedFallbackRegistryPath = Get-RelativePath -BasePath $workspaceRoot -TargetPath $bannedFallbackRegistryPath
  requiredDependencyIds = @($requiredCaptureDependencyIds)
  dependencyApprovalsUsed = @($captureDependencyApprovalsUsed)
  missingDependencies = @($missingCaptureDependencyIds)
  primaryMissingDependencyId = $missingDependencyId
  bannedFallbacksPreserved = ($bannedConflictDependencies.Count -eq 0)
  bannedFallbacks = @($bannedFallbacks)
  bannedConflictDependencies = @($bannedConflictDependencies)
}

$captureChainApproved = $missingCaptureDependencyIds.Count -eq 0 -and $bannedConflictDependencies.Count -eq 0 -and $captureDependencyApprovalsUsed.Count -gt 0
$allowCaptureChain = $PreferredInvocationKind -in @("AUTO", "CAPTURE_CHAIN")
$allowRuntimeCapability = $PreferredInvocationKind -in @("AUTO", "RUNTIME_CAPABILITY")
$allowExecutable = $PreferredInvocationKind -in @("AUTO", "EXECUTABLE")

if ($allowCaptureChain -and $captureChainApproved) {
  $canonicalInvocation = [ordered]@{
    invocationKind = "CAPTURE_CHAIN"
    captureChainId = "LEEWAY_CAPTURE_CHAIN::APPROVED_BROWSER_TO_EDGE_RTC_TO_QWEN_AUDIO"
    capabilityId = "LEEWAY_RUNTIME_CAPABILITY::EDGE_RTC_NATIVE_CAPTURE"
    serviceId = "LEEWAY_SERVICE::EDGE_RTC"
    routeId = "LEEWAY_RTC_ROUTE::EDGE_RTC::REAL_TIME_AUDIO_CORRIDOR"
    confirmationRouteId = "LEEWAY_RTC_ROUTE::EDGE_RTC::AUDIBLE_CONFIRMATION"
    captureMode = "APPROVED_BROWSER_CAPTURE_TO_EDGE_RTC"
    canonicalPathPolicy = "NO_EXTERNAL_EXECUTABLE"
    dependenciesUsed = @($captureDependencyApprovalsUsed)
    approvedRegistryPath = Get-RelativePath -BasePath $workspaceRoot -TargetPath $approvedDependencyRegistryPath
    bannedFallbackRegistryPath = Get-RelativePath -BasePath $workspaceRoot -TargetPath $bannedFallbackRegistryPath
  }

  $result.decisionOption = "A"
  $result.decisionLabel = "APPROVED_CAPTURE_CHAIN"
  $result.dependencyId = "LEEWAY_CAPTURE_CHAIN::APPROVED_BROWSER_TO_EDGE_RTC_TO_QWEN_AUDIO"
  $result.approvalStatus = "APPROVED_CAPTURE_CHAIN"
  $result.isApproved = $true
  $result.invocationKind = "CAPTURE_CHAIN"
  $result.canonicalInvocation = $canonicalInvocation
  $result.reason = ""
  $result.registrationRequirement = ""
  $result.blockerIfMissing = ""
  $result.primaryMissingDependencyId = $null
  $result.missingDependencies = @()
}
elseif ($allowRuntimeCapability -and $approvedRuntimeCapability) {
  $canonicalInvocation = [ordered]@{
    invocationKind = "RUNTIME_CAPABILITY"
    capabilityId = [string](Get-SafePropertyValue -Object $approvedRuntimeCapability -PropertyName "capabilityId" -Default "LEEWAY_RUNTIME_CAPABILITY::EDGE_RTC_NATIVE_CAPTURE")
    serviceId = [string](Get-SafePropertyValue -Object $approvedRuntimeCapability -PropertyName "serviceId" -Default "LEEWAY_SERVICE::EDGE_RTC")
    routeId = [string](Get-SafePropertyValue -Object $approvedRuntimeCapability -PropertyName "routeId" -Default "LEEWAY_RTC_ROUTE::EDGE_RTC::REAL_TIME_AUDIO_CORRIDOR")
    captureMode = [string](Get-SafePropertyValue -Object $approvedRuntimeCapability -PropertyName "captureMode" -Default "EDGE_RTC_NATIVE_CAPTURE")
    canonicalPathPolicy = "NO_EXTERNAL_EXECUTABLE"
    dependenciesUsed = @($captureDependencyApprovalsUsed)
  }

  $result.approvalStatus = "APPROVED_RUNTIME_CAPABILITY"
  $result.isApproved = $true
  $result.invocationKind = "RUNTIME_CAPABILITY"
  $result.canonicalInvocation = $canonicalInvocation
  $result.reason = ""
  $result.registrationRequirement = ""
  $result.blockerIfMissing = ""
}
elseif ($allowExecutable -and $approvedExecutable) {
  $dependencyCanonicalPathPolicy = [string](Get-SafePropertyValue -Object $approvedExecutable -PropertyName "canonicalPathPolicy" -Default "")
  $dependencyVersion = [string](Get-SafePropertyValue -Object $approvedExecutable -PropertyName "version" -Default "")
  $executableName = [string](Get-SafePropertyValue -Object $approvedExecutable -PropertyName "executableName" -Default "")

  $canonicalInvocation = [ordered]@{
    invocationKind = "EXECUTABLE"
    executableName = $executableName
    canonicalPathPolicy = $(if (-not [string]::IsNullOrWhiteSpace($dependencyCanonicalPathPolicy)) { $dependencyCanonicalPathPolicy } else { $result.canonicalPathPolicy })
    version = $dependencyVersion
    owningRuntime = [string](Get-SafePropertyValue -Object $approvedExecutable -PropertyName "owningRuntime" -Default "LEEWAY_SERVICE::EDGE_RTC")
    allowedUse = @(Get-SafePropertyValue -Object $approvedExecutable -PropertyName "allowedUse" -Default @())
    forbiddenUse = @(Get-SafePropertyValue -Object $approvedExecutable -PropertyName "forbiddenUse" -Default @())
    dependenciesUsed = @($captureDependencyApprovalsUsed)
  }

  $result.approvalStatus = "APPROVED_EXECUTABLE"
  $result.isApproved = $true
  $result.invocationKind = "EXECUTABLE"
  $result.executableName = $executableName
  $result.canonicalInvocation = $canonicalInvocation
  $result.canonicalPathPolicy = $canonicalInvocation.canonicalPathPolicy
  $result.version = $dependencyVersion
  $result.reason = ""
  $result.registrationRequirement = ""
  $result.blockerIfMissing = ""
}

if (-not $result.isApproved -and $PreferredInvocationKind -ne "AUTO") {
  switch ($PreferredInvocationKind) {
    "CAPTURE_CHAIN" {
      $result.reason = "Preferred capture-chain authority is not currently approved."
      $result.registrationRequirement = "Approve the governed browser-to-Edge-RTC capture chain before selecting CAPTURE_CHAIN."
      $result.blockerIfMissing = "Fresh capture remains blocked because the preferred governed browser capture chain is not approved or not runtime-usable."
      break
    }
    "RUNTIME_CAPABILITY" {
      $result.reason = "Preferred runtime-capability authority is not currently approved."
      $result.registrationRequirement = "Execution-prove and register the Edge RTC native capture capability before selecting RUNTIME_CAPABILITY."
      $result.blockerIfMissing = "Fresh capture remains blocked because the preferred Edge RTC runtime capture capability is not approved."
      break
    }
    "EXECUTABLE" {
      $result.reason = "Preferred executable capture authority is not currently approved."
      $result.registrationRequirement = "Register a Standards-approved local capture executable before selecting EXECUTABLE."
      $result.blockerIfMissing = "Fresh capture remains blocked because the preferred local executable capture lane is not approved."
      break
    }
  }
}

$failuresEncountered = [System.Collections.Generic.List[string]]::new()
$remainingBlockers = [System.Collections.Generic.List[string]]::new()
$lessonsLearned = [System.Collections.Generic.List[string]]::new()
$skillImprovementsSuggested = [System.Collections.Generic.List[string]]::new()

if ($result.isApproved) {
  $lessonsLearned.Add("Approved capture authority can be returned as canonical invocation data without exposing any binary guessing path.")
  $lessonsLearned.Add("The governed browser-to-Edge-RTC capture chain is acceptable when every local dependency is Standards-approved and banned fallbacks remain blocked.")
} else {
  $failuresEncountered.Add($result.reason)
  $remainingBlockers.Add($result.blockerIfMissing)
  $lessonsLearned.Add("When no approved capture authority exists, the gate must preserve session-state evidence use while refusing fresh live capture.")
  $skillImprovementsSuggested.Add("Keep the approved capture dependency registry aligned with the actual live recording studio implementation so fresh retests do not depend on guessed executables.")
}

$gateEvidence = [ordered]@{
  reportId = "LEEWAY_REPORT::APPROVED_LIVE_AUDIO_CAPTURE_GATE"
  generatedAt = (Get-Date).ToString("o")
  assistantBodyId = $AssistantBodyId
  assistantObjectId = $AssistantObjectId
  taskId = $TaskId
  subjectObjectId = $SubjectObjectId
  filesRead = @(
    (Get-RelativePath -BasePath $workspaceRoot -TargetPath $runtimeRegistryPath),
    (Get-RelativePath -BasePath $workspaceRoot -TargetPath $approvedDependencyRegistryPath),
    (Get-RelativePath -BasePath $workspaceRoot -TargetPath $bannedFallbackRegistryPath),
    (Get-RelativePath -BasePath $workspaceRoot -TargetPath $sessionStatePath),
    $helperRelativePath
  )
  filesChanged = @(
    (Get-RelativePath -BasePath $workspaceRoot -TargetPath $GateEvidencePath)
  )
  commandsRun = @(
    "Resolve-LeeWayApprovedCaptureDependency.ps1"
  )
  toolsUsed = @(
    "scripts/lib/Resolve-LeeWayApprovedCaptureDependency.ps1"
  )
  MCPsUsed = @()
  standardsChecked = @(
    "000-URGENT-LEEWAY-ASSISTANT-LAW/READ-FIRST.md",
    "BOOK-06-LEEWAY-RTC-AUTHORITY-LAW",
    "BOOK-26-STARTUP-DEPENDENCY-GRAPH-LAW",
    "BOOK-54-ASSISTANT-EMBODIMENT-AND-BEHAVIOR-LAW",
    "BOOK-55-ASSISTANT-RECORDING-AND-LEARNING-LAW",
    "BOOK-62-LIVE-MULTIMODAL-RTC-LAW",
    "BOOK-70-EXECUTABLE-SUBSTANCE-VALIDATION-LAW",
    "BOOK-71-TRUTH-PRESERVATION-UNDER-FAILURE-LAW",
    "BOOK-75-ENVIRONMENT-EXCEPTION-GOVERNANCE-LAW",
    "LEEWAY_LOCAL_SENSE_LOOP_AUTHORITY_LAW"
  )
  gatesRun = @(
    [ordered]@{
      gate = "LEEWAY_APPROVED_DEPENDENCY_GATE"
      status = $result.approvalStatus
    }
  )
  receiptsWritten = @()
  failuresEncountered = @($failuresEncountered)
  lessonsLearned = @($lessonsLearned)
  skillImprovementsSuggested = @($skillImprovementsSuggested)
  finalStatus = $result.approvalStatus
  remainingBlockers = @($remainingBlockers)
  runtimeTruthWins = $true
  gateDecision = $result
}

Write-JsonFile -Path $GateEvidencePath -Payload $gateEvidence

if ($AsJson) {
  $result | ConvertTo-Json -Depth 100
} else {
  [pscustomobject]$result
}
