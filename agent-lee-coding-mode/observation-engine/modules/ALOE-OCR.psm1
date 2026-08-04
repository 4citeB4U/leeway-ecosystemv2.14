# ALOE-OCR.psm1
# Agent Lee Observation Engine - OCR Module
# Purpose: Extract text from images using Windows OCR

function Extract-ALOE-Text {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory=$true)]
        [string]$ImagePath
    )
    
    $result = @{
        success = $false
        text = ""
        lines = @()
        timestamp = (Get-Date -Format "o")
        error = $null
    }
    
    try {
        # Load Windows.Media.Ocr
        Add-Type -AssemblyName System.Runtime.WindowsRuntime
        $null = [Windows.Storage.StorageFile,Windows.Storage,ContentType=WindowsRuntime]
        $null = [Windows.Media.Ocr.OcrEngine,Windows.Foundation,ContentType=WindowsRuntime]
        
        # Get OCR engine for English
        $ocrEngine = [Windows.Media.Ocr.OcrEngine]::TryCreateFromLanguage(
            [Windows.Globalization.Language]::new("en-US")
        )
        
        if (-not $ocrEngine) {
            throw "OCR engine not available"
        }
        
        # Load image
        $imagePath = Resolve-Path $ImagePath
        $storageFile = [System.Threading.Tasks.Task]::Run({
            [Windows.Storage.StorageFile]::GetFileFromPathAsync($imagePath)
        }).GetAwaiter().GetResult()
        
        # Perform OCR
        $ocrResult = [System.Threading.Tasks.Task]::Run({
            $ocrEngine.RecognizeAsync($storageFile)
        }).GetAwaiter().GetResult()
        
        # Extract text
        $result.text = $ocrResult.Text
        $result.lines = $ocrResult.Lines | ForEach-Object { $_.Text }
        $result.success = $true
        
        Write-Verbose "Extracted $($result.lines.Count) lines of text"
        
    } catch {
        $result.error = $_.Exception.Message
        Write-Error "OCR failed: $($_.Exception.Message)"
    }
    
    return $result
}

Export-ModuleMember -Function Extract-ALOE-Text
