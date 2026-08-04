# ============================================================
# AgentLee3DGameAssetHelpersV13.ps1
#
# Official helper for Agent Lee 3D Game Asset Lane.
#
# Dot source:
# . "D:\Leeway-Ecosystem v2.1.4\scripts\AgentLee3DGameAssetHelpersV13.ps1"
# ============================================================

$script:AgentLeeRoot = "D:\Leeway-Ecosystem v2.1.4"
$script:AgentLee3DKernelUrl = "http://127.0.0.1:8095"

function Test-AgentLee3DKernelReady {
    try {
        $h = Invoke-RestMethod -Uri "$script:AgentLee3DKernelUrl/health" -TimeoutSec 15
        if ($h.status -eq "READY" -or $h.kernel -eq "agent-lee-3d-kernel") {
            return $true
        }
    } catch {}
    return $false
}

function Invoke-AgentLee3DReconstruction {
    param(
        [string]$SourceImagePath = "",
        [string]$Prompt = "",
        [string]$TargetProfile = "game_engine_general",
        [int]$TargetPolyCount = 50000
    )

    if (-not (Test-AgentLee3DKernelReady)) {
        throw "Agent Lee 3D Kernel 8095 is not responding."
    }

    $body = [ordered]@{
        input_image = $SourceImagePath
        prompt = $Prompt
        output_name = "agent-lee-asset-" + (Get-Date -Format "yyyyMMdd-HHmmss") + ".glb"
        export_format = "glb"
        target_profile = $TargetProfile
        target_poly_count = $TargetPolyCount
        remesh = $true
    }

    $res = Invoke-RestMethod -Uri "$script:AgentLee3DKernelUrl/reconstruct" -Method POST -ContentType "application/json" -Body ($body | ConvertTo-Json -Depth 40) -TimeoutSec 600

    if ($res.status -ne "READY") {
        throw ("3D reconstruction not READY: " + ($res | ConvertTo-Json -Depth 40))
    }

    return $res
}

function Test-AgentLeeGameAsset {
    param(
        [Parameter(Mandatory=$true)]
        [string]$AssetPath,

        [string]$TargetProfile = "game_engine_general"
    )

    if (-not (Test-AgentLee3DKernelReady)) {
        throw "Agent Lee 3D Kernel 8095 is not responding."
    }

    $body = [ordered]@{
        asset_path = $AssetPath
        target_profile = $TargetProfile
    }

    return Invoke-RestMethod -Uri "$script:AgentLee3DKernelUrl/validate-game-asset" -Method POST -ContentType "application/json" -Body ($body | ConvertTo-Json -Depth 20) -TimeoutSec 120
}
