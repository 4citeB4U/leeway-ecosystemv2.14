/*
LEEWAY_HEADER - DO NOT REMOVE

REGION: VOICE_RUNTIME
TAG: CORE.AGENT_LEE.LEEWAY_AGENT_VOICE_RUNTIME.FACTORY
PURPOSE: LeeWay Agent Voice Runtime factory. Selects local runtime or browser fallback. Local-only — no cloud API.
DISCOVERY_PIPELINE: Voice -> Intent -> Location -> Vertical -> Ranking -> Render
*/

import { browserSpeechRecognitionProviderClientScript } from "./providers/browserSpeechRecognitionProvider";
import { stubRealtimeVoiceProviderClientScript } from "./providers/stubRealtimeVoiceProvider";
import { unavailableRealtimeVoiceProviderClientScript } from "./providers/unavailableRealtimeVoiceProvider";

const factoryClientScript = String.raw`
function createLeeWayVoiceRuntime(kind){
  switch(kind){
    case "leeway-agent-voice-browser-fallback":
    case "browser-speech-recognition":  // legacy — normalised to browser-fallback
      return createLeewayBrowserVoiceFallback();
    case "leeway-agent-voice-local":
    case "local-realtime":
    case "local-whisper": // legacy names — normalised to local
      return createLeewayLocalVoiceRuntime();
    default:
      return createLeewayLocalVoiceRuntime();
  }
}

function initLeeWayVoiceRuntime(){
  if(window.agentLeeVoiceProviderReady) return true;
  var kind = (window.agentLeeRuntimeState && window.agentLeeRuntimeState.leewayVoiceRuntimeKind) || window.agentLeeVoiceProviderKind || "leeway-agent-voice-local";
  var provider = createLeeWayVoiceRuntime(kind);
  if(!provider) return false;

  provider.on("LAVR_INTERRUPT_REQUESTED", function(){
    vscode.postMessage({command:"leewayVoiceInterruptRequested"});
  });

  window.agentLeeVoiceProvider = provider;
  window.agentLeeVoiceProviderKind = kind;
  window.agentLeeVoiceProviderReady = true;
  return true;
}
`;

export const voiceProviderFactoryClientScript = [
  unavailableRealtimeVoiceProviderClientScript,
  stubRealtimeVoiceProviderClientScript,
  browserSpeechRecognitionProviderClientScript,
  factoryClientScript,
].join("\n\n");