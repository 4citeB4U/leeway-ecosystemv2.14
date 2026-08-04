$Root = "D:\Leeway-Ecosystem v2.1.4"
$OperatorRoot = "D:\Leeway-Ecosystem v2.1.4\agent-lee-coding-mode\runtime\agent-lee-visible-operator-v26-23b"
$StatePath = "D:\Leeway-Ecosystem v2.1.4\agent-lee-coding-mode\runtime\agent-lee-visible-operator-v26-23b\state\agent-lee-visible-operator-state.json"
$TranscriptPath = "D:\Leeway-Ecosystem v2.1.4\Archive\proofs\agent-lee-v26-23b-visible-operator-20260628-123816\agent-lee-visible-operator-transcript.txt"
$ErrorPath = "D:\Leeway-Ecosystem v2.1.4\Archive\proofs\agent-lee-v26-23b-visible-operator-20260628-123816\agent-lee-visible-operator-error.txt"
$ProofDir = "D:\Leeway-Ecosystem v2.1.4\Archive\proofs\agent-lee-v26-23b-visible-operator-20260628-123816"
$OperatorPath = "D:\Leeway-Ecosystem v2.1.4\agent-lee-coding-mode\runtime\agent-lee-visible-operator-v26-23b\Start-AgentLeeVisibleOperatorV26_23B.ps1"

powershell.exe -STA -NoProfile -ExecutionPolicy Bypass -File "$OperatorPath" -Root "$Root" -OperatorRoot "$OperatorRoot" -StatePath "$StatePath" -TranscriptPath "$TranscriptPath" -ErrorPath "$ErrorPath" -ProofDir "$ProofDir"