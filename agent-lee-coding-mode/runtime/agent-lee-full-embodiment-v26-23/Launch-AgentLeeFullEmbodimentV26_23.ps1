$Root = "D:\Leeway-Ecosystem v2.1.4"
$OperatorRoot = "D:\Leeway-Ecosystem v2.1.4\agent-lee-coding-mode\runtime\agent-lee-full-embodiment-v26-23"
$StatePath = "D:\Leeway-Ecosystem v2.1.4\agent-lee-coding-mode\runtime\agent-lee-full-embodiment-v26-23\state\agent-lee-full-embodiment-state.json"
$CommandLogPath = "D:\Leeway-Ecosystem v2.1.4\agent-lee-coding-mode\runtime\agent-lee-full-embodiment-v26-23\state\command-log.jsonl"
$ProofDir = "D:\Leeway-Ecosystem v2.1.4\Archive\proofs\agent-lee-v26-23-full-embodiment-20260628-123438"
$OperatorPath = "D:\Leeway-Ecosystem v2.1.4\agent-lee-coding-mode\runtime\agent-lee-full-embodiment-v26-23\Start-AgentLeeFullEmbodimentV26_23.ps1"

Start-Process powershell.exe -ArgumentList @(
    "-NoProfile",
    "-ExecutionPolicy", "Bypass",
    "-File", "$OperatorPath",
    "-Root", "$Root",
    "-OperatorRoot", "$OperatorRoot",
    "-StatePath", "$StatePath",
    "-CommandLogPath", "$CommandLogPath",
    "-ProofDir", "$ProofDir"
) -WindowStyle Normal