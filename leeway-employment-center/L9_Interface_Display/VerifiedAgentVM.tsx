/*
FILE: L9_Interface_Display\VerifiedAgentVM.tsx
PURPOSE: Interface-layer re-export for the governed verified VM provider.
TAG: UI.COMPONENT.VERIFIED_AGENT_VM.MAIN
REGION: 🔵 UI
GOVERNED_BY: LeeWay Standards
OWNED_BY: Agent Lee / LeeWay Runtime
DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render
IMPORTS: ../L10_Orchestrator_Kernel/VerifiedAgentVM
EXPORTS: AgentVMProvider, VerifiedVM
STATUS: ACTIVE
*/

export { AgentVMProvider, VerifiedVM } from '../L10_Orchestrator_Kernel/VerifiedAgentVM';
