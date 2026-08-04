$ErrorActionPreference = "Continue"

$result = [ordered]@{
  ok = $false
  tool = "onecore.voice.speak.fixed"
  voices = @()
  selected = $null
  wavPath = $null
  played = $false
  error = ""
}

try {
  Add-Type -AssemblyName System.Runtime.WindowsRuntime

  $null = [Windows.Media.SpeechSynthesis.SpeechSynthesizer, Windows.Media.SpeechSynthesis, ContentType = WindowsRuntime]
  $null = [Windows.Media.SpeechSynthesis.VoiceInformation, Windows.Media.SpeechSynthesis, ContentType = WindowsRuntime]
  $null = [Windows.Storage.Streams.Buffer, Windows.Storage.Streams, ContentType = WindowsRuntime]

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
    Where-Object {
      $_.DisplayName -match "Mark|David|Zira|Andrew|Ava|Guy|Aria|Natural"
    } |
    Select-Object -First 1

  if (-not $preferred) {
    $preferred = $voices | Select-Object -First 1
  }

  if (-not $preferred) {
    throw "No WinRT voices found."
  }

  $synth = [Windows.Media.SpeechSynthesis.SpeechSynthesizer]::new()
  $synth.Voice = $preferred

  $text = "Yo, this is Agent Lee testing the fixed OneCore voice bridge."

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

  $wavPath = Join-Path (Get-Location) "agent-lee-onecore-fixed-test.wav"

  $input = $stream.AsStreamForRead()
  $output = [System.IO.File]::Create($wavPath)
  $input.CopyTo($output)
  $output.Close()
  $input.Close()

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
