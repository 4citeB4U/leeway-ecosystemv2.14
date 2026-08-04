$ErrorActionPreference='Stop'
if(-not (Test-Path 'tmp')){ New-Item -ItemType Directory -Path 'tmp' | Out-Null }
function ProbeRoot {
    try {
        $r = Invoke-WebRequest -Uri 'http://127.0.0.1:9007/' -TimeoutSec 5 -ErrorAction Stop
        Write-Output '---ROOT---'
        Write-Output ('STATUS:' + $r.StatusCode)
        Write-Output 'HEADERS:'
        $r.Headers | ConvertTo-Json -Depth 2
        $b = $r.Content
        if($null -eq $b){ $b='(no body)'}
        if($b.Length -gt 4000){ $b = $b.Substring(0,4000) + '... [truncated]' }
        Write-Output 'BODY_SNIPPET:'
        Write-Output $b
    } catch {
        Write-Output '---ROOT_ERROR---'
        Write-Output $_.Exception.Message
    }
}

function TryPost($path) {
    $url = 'http://127.0.0.1:9007' + $path
    $out = Join-Path (Get-Location) 'tmp/tts_response.bin'
    try {
        $json = @{ text = 'test' } | ConvertTo-Json
        $resp = Invoke-WebRequest -Uri $url -Method Post -Body $json -ContentType 'application/json' -TimeoutSec 10 -ErrorAction Stop -OutFile $out
        Write-Output ("---POST {0}---" -f $path)
        Write-Output ("STATUS:{0}" -f $resp.StatusCode)
        Write-Output 'HEADERS:'
        $resp.Headers | ConvertTo-Json -Depth 3
        $ct = $null
        if($resp.Headers.ContainsKey('Content-Type')){ $ct = $resp.Headers['Content-Type'] } elseif($resp.Headers.ContainsKey('content-type')){ $ct = $resp.Headers['content-type'] }
        Write-Output ("CONTENT_TYPE:{0}" -f ($ct -ne $null ? $ct : '(unknown)'))
        $fullSize = (Get-Item $out).Length
        Write-Output ("SAVED_FILE:{0} SIZE_BYTES:{1}" -f $out, $fullSize)
        if($ct -and ($ct -match 'audio')) {
            $bytes = [System.IO.File]::ReadAllBytes($out)
            if($bytes.Length -gt 8192){ $take = $bytes[0..8191] } else { $take = $bytes }
            $wavOut = Join-Path (Get-Location) 'tmp/tts_test.wav'
            [System.IO.File]::WriteAllBytes($wavOut, $take)
            Write-Output ("SAVED_FIRST_8KB:{0} SIZE_BYTES:{1}" -f $wavOut, (Get-Item $wavOut).Length)
        } else {
            Write-Output 'NOT_AN_AUDIO_RESPONSE_OR_CONTENTTYPE_MISSING'
        }
        if($ct -and ($ct -match 'application/json|text')) {
            try {
                $txt = Get-Content -Raw -Path $out -ErrorAction Stop
                if($txt.Length -gt 2000){ $txt = $txt.Substring(0,2000) + '... [truncated]' }
                Write-Output 'RESPONSE_BODY_SNIPPET:'
                Write-Output $txt
            } catch {}
        }
    } catch {
        Write-Output '---POST_ERROR---'
        Write-Output $_.Exception.Message
    }
}

ProbeRoot
TryPost '/speak'
TryPost '/tts'
