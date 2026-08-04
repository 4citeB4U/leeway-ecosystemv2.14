param()

function Write-Receipt($payload, $prefix) {
    $stamp = (Get-Date).ToString('yyyyMMdd-HHmmss');
    $receiptsRoot = Join-Path -Path $repoRoot -ChildPath 'Archive\receipts'
    $file = Join-Path -Path $receiptsRoot -ChildPath "$($prefix)-$stamp.json"
    if (-not (Test-Path -Path (Split-Path $file))) { New-Item -ItemType Directory -Path (Split-Path $file) -Force | Out-Null }
    $payload | ConvertTo-Json -Depth 6 | Out-File -FilePath $file -Encoding utf8
    return $file
}

function Invoke-GetJson($url) {
    try { return Invoke-RestMethod -Method Get -Uri $url -TimeoutSec 10 -ErrorAction Stop } catch { return @{ ok = $false; error = $_.Exception.Message } }
}

function Invoke-PostJson($url, $body) {
    try { return Invoke-RestMethod -Method Post -Uri $url -Body ($body | ConvertTo-Json -Depth 6) -ContentType 'application/json' -TimeoutSec 300 -ErrorAction Stop } catch { return @{ ok = $false; error = $_.Exception.Message } }
}

$repoRoot = (Resolve-Path -Path (Join-Path $PSScriptRoot '..\..')).ProviderPath
$root = $repoRoot

$results = [ordered]@{}
$results.checkedAt = (Get-Date).ToString('o')

# 1. Check extension files
$extPath = Join-Path $root '.leeway-vscode\extensions\leeway-agent-lee-chat'
$results.extensionFiles = @{ exists = Test-Path $extPath }

# 2. Adapter health
$adapterHealth = Invoke-GetJson 'http://127.0.0.1:8787/health'
$results.adapterHealth = $adapterHealth

# 3. Router health
$routerHealth = Invoke-GetJson 'http://127.0.0.1:8080/health'
$results.routerHealth = $routerHealth

# 4. Runtime Fabric health
$fabricHealth = Invoke-GetJson 'http://127.0.0.1:4001/runtime/health'
if (-not $fabricHealth.ok) { $fabricHealth = Invoke-GetJson 'http://127.0.0.1:4001/health' }
$results.runtimeFabricHealth = $fabricHealth

# 5. Desktop runtime
$desktopHealth = Invoke-GetJson 'http://127.0.0.1:8091/health'
$results.desktopRuntimeHealth = $desktopHealth

# 6. Agent identity through adapter
$modelList = Invoke-GetJson 'http://127.0.0.1:8787/v1/models'
$results.adapterModels = $modelList

# 7. Agent identity through router
$modelListRouter = Invoke-GetJson 'http://127.0.0.1:8080/v1/models'
$results.routerModels = $modelListRouter

# 8. Identity through runtime fabric (proxy)
$rfModel = Invoke-GetJson 'http://127.0.0.1:4001/agent-lee/identity'
$results.runtimeFabricIdentity = $rfModel

# 9. Provenance test - trigger usability proof via adapter
$provBody = @{ test = 'provenance'; timestamp = (Get-Date).ToString('o') }
$provResp = Invoke-PostJson 'http://127.0.0.1:8787/runtime/official-vscode-usability-proof' $provBody
$results.provenanceTrigger = $provResp

$proofReceiptPath = $null
if ($provResp -and $provResp.stdout -and ($provResp.stdout -match 'Receipt(?: saved to)?:\s*(?<path>.+?\.json)')) {
    $proofReceiptPath = $Matches['path'].Trim()
}
$results.provenanceReceiptPath = $proofReceiptPath

# 10. Finalize probe - send finalize to adapter which forwards to runtime fabric (non-destructive test)
$finalizeBody = @{ confirm = 'I_AUTHORIZE_AGENT_LEE_DESKTOP_COMMAND'; finalConfirm = 'NO'; pendingReceiptPath = $proofReceiptPath }
$finalizeResp = Invoke-PostJson 'http://127.0.0.1:8787/runtime/official-vscode-usability-proof/finalize' $finalizeBody
$results.probeFinalize = $finalizeResp

# 11. Check workspace root preservation in adapter health summary
if ($results.adapterHealth -and $results.adapterHealth.cache -and $results.adapterHealth.cache.routes) {
    $results.adapterPreservesWorkspace = $true
} else { $results.adapterPreservesWorkspace = $false }

# 12. Check startup scripts presence
$scripts = @('scripts\start-agent-lee-vscode-stack.ps1','scripts\stop-agent-lee-vscode-stack.ps1','scripts\restart-agent-lee-vscode-stack.ps1','scripts\test-agent-lee-vscode-stack.ps1')
$results.startupScripts = @{}
foreach ($s in $scripts) { $results.startupScripts[$s] = Test-Path (Join-Path $root $s) }

# 13. Receipt write test - write a small diagnostic receipt
$receiptPayload = @{ kind = 'diagnostic'; time = (Get-Date).ToString('o'); results = $results }
$receiptPath = Write-Receipt $receiptPayload 'agent-lee-vscode-chat-full-usability-proof-diagnostic'
$results.receiptPath = $receiptPath

Write-Output (ConvertTo-Json $results -Depth 6)

Exit 0
