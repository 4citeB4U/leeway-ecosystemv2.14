$ErrorActionPreference = "Continue"

$result = [ordered]@{
  ok = $false
  tool = "onecore.voice.speak.datareader"
  voices = @()
  selected = $null
  wavPath = $null
  played = $false
  error = ""
}

try {
  Add-Type -AssemblyName System.Runtime.WindowsRuntime

  $null = [Windows.Media.SpeechSynthesis.SpeechSynthesizer, Windows.Media.SpeechSynthesis, ContentType = WindowsRuntime]
  $null = [Windows.Media.SpeechSynthesis.SpeechSynthesisStream, Windows.Media.SpeechSynthesis, ContentType = WindowsRuntime]
  $null = [Windows.Storage.Streams.DataReader, Windows.Storage.Streams, ContentType = WindowsRuntime]

  $voices = [Windows.Media.SpeechSynthesis.SpeechSynthesizer]::AllVoices

  $result.voices = $voices | ForEach-Object {
    [ordered]@{
      DisplayName = $_.DisplayName
      Id = $_.Id
      Language = $_.Language
      Gender = $_.Gender.ToString()
      Description = $_.Description
    }
  }

  $preferred = $voices |
    Where-Object { $_.DisplayName -match "Mark" } |
    Select-Object -First 1

  if (-not $preferred) {
    $preferred = $voices | Select-Object -First 1
  }

  if (-not $preferred) {
    throw "No WinRT voices found."
  }

  $synth = [Windows.Media.SpeechSynthesis.SpeechSynthesizer]::new()
  $synth.Voice = $preferred

  $text = "Yo, this is Agent Lee testing Microsoft Mark through the OneCore bridge."

  $operation = $synth.SynthesizeTextToStreamAsync($text)

  $asTaskGeneric = [System.WindowsRuntimeSystemExtensions].GetMethods() |
    Where-Object {
      $_.Name -eq "AsTask" -and
      $_.IsGenericMethodDefinition -and
      $_.GetParameters().Count -eq 1
    } |
    Select-Object -First 1

  if (-not $asTaskGeneric) {
    throw "Could not find generic AsTask method."
  }

  $speechStreamType = [Windows.Media.SpeechSynthesis.SpeechSynthesisStream, Windows.Media.SpeechSynthesis, ContentType = WindowsRuntime]
  $asTask = $asTaskGeneric.MakeGenericMethod($speechStreamType)

  $task = $asTask.Invoke($null, @($operation))
  $task.Wait()
  $stream = $task.Result

  $size = [uint32]$stream.Size
  $reader = [Windows.Storage.Streams.DataReader]::new($stream)

  $loadOp = $reader.LoadAsync($size)
  $uintType = [uint32]
  $asTaskUint = $asTaskGeneric.MakeGenericMethod($uintType)
  $loadTask = $asTaskUint.Invoke($null, @($loadOp))
  $loadTask.Wait()

  $bytes = New-Object byte[] $size
  $reader.ReadBytes($bytes)
  $reader.DetachStream() | Out-Null
  $reader.Dispose()

  $wavPath = Join-Path (Get-Location) "agent-lee-onecore-mark-test.wav"
  [System.IO.File]::WriteAllBytes($wavPath, $bytes)

  $player = New-Object System.Media.SoundPlayer $wavPath
  $player.PlaySync()

  $result.ok = $true
  $result.selected = [ordered]@{
    DisplayName = $preferred.DisplayName
    Id = $preferred.Id
    Language = $preferred.Language
    Gender = $preferred.Gender.ToString()
    Description = $preferred.Description
  }
  $result.wavPath = $wavPath
  $result.played = $true
}
catch {
  $result.error = $_.Exception.ToString()
}

$result | ConvertTo-Json -Depth 10
