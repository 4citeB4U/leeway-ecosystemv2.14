/*
FILE: leeway-agents\src\core\VoiceService.ts
PURPOSE: LeeWay governed asset for leeway-employment-center.
TAG: AI.ORCHESTRATION.V_OI_CE_SE_RV_IC_E.MAIN
REGION: 🧠 AI
GOVERNED_BY: LeeWay Standards
OWNED_BY: Agent Lee / LeeWay Runtime
DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render
IMPORTS: Inferred by verification scanner
EXPORTS: Inferred by verification scanner
STATUS: ACTIVE
*/
export const VoiceService = {
  speak: async ({ text }: { text: string }) => {
    console.log('VoiceService speaking:', text);
    const utterance = new SpeechSynthesisUtterance(text);
    window.speechSynthesis.speak(utterance);
  }
};

