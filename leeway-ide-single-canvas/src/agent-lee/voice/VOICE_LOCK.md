<!--
LEEWAY_HEADER - DO NOT REMOVE
REGION: 🟢 CORE
TAG: CORE.VOICE.LOCK.MAIN
DISCOVERY_PIPELINE:
  Voice → Intent → Location → Vertical → Ranking → Render
PURPOSE: Locked voice selection and playback tuning record for Agent Lee local speech runtime.
-->

## Agent Lee Voice Lock

Agent Lee's locked default voice route is `leeway.voice.primary.clone.live`.

This route is the current law for Agent Lee live speech in the LeeWay app unless an explicit governed re-audition replaces it.

### Locked Runtime

- Runtime config: [voice-runtime.json](/abs/c:/Users/Leona/.leeway-vscode/agent-lee/voice/voice-runtime.json)
- Live route manifest: [leeway-live-voice-manifest.json](/abs/c:/Users/Leona/.leeway-vscode/agent-lee/voice/leeway-live-voice-manifest.json)
- Primary speech pipeline: [Speak-AgentLeeCloned.ps1](/abs/c:/Users/Leona/.leeway-vscode/agent-lee/voice/Speak-AgentLeeCloned.ps1)
- Compact fallback route: `leeway.voice.compact.clone.live`
- Branded fallback route: `leeway.voice.branded.live`
- Emergency route: `leeway.voice.text.emergency`

### Locked Tuning

- `selectedVoiceId`: `agent-lee-default`
- `selectedVoiceLabel`: `Agent Lee Default Voice`
- `selectedSpeakerId`: default route lane
- `cloneSpeedRatio`: `0.85`
- `playbackRateRatio`: `1.0`

### Reference Audition

The accepted runtime target is the LeeWay-owned default reference identity packaged with Agent Lee.

### Rule

If Agent Lee voice playback is rebuilt, migrated, or repaired later, preserve the LeeWay route order unless the user explicitly approves a governed change:

1. `leeway.voice.primary.clone.live`
2. `leeway.voice.compact.clone.live`
3. `leeway.voice.branded.live`
4. `leeway.voice.text.emergency`

No foreign or non-LeeWay voice runtime is allowed in the normal Agent Lee speech ladder.
