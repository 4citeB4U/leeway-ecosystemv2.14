/*
LEEWAY_HEADER - DO NOT REMOVE

REGION: VOICE_RUNTIME
TAG: CORE.AGENT_LEE.LEEWAY_AGENT_VOICE_RUNTIME.LOCAL
PURPOSE: LeeWay Agent Voice Local Runtime engine. Bridges transcripts through the local 127.0.0.1:7671 endpoint.
         Sovereign and local-only. No cloud API dependency.
DISCOVERY_PIPELINE: Voice -> Intent -> Location -> Vertical -> Ranking -> Render
*/

export const stubRealtimeVoiceProviderClientScript = String.raw`
function createLeewayLocalVoiceRuntime(){
  var dispatcher = createLeeWayVoiceEventBus();
  var state = {
    status:"idle",
    connected:false,
    listening:false,
    providerKind:"leeway-agent-voice-local",
    lastError:""
  };
  var healthTimer = null;

  function clearHealthMonitor(){
    if(healthTimer){
      clearInterval(healthTimer);
      healthTimer = null;
    }
  }

  function startHealthMonitor(){
    clearHealthMonitor();
    healthTimer = setInterval(function(){
      fetch("http://127.0.0.1:7671/health", { method:"GET" })
        .then(function(response){
          if(!response || !response.ok){
            state.lastError = "Transcript bridge health check failed.";
            dispatcher.emit("error", { message:state.lastError });
            return;
          }
          if(state.status === "error"){
            state.status = state.connected ? "listening" : "idle";
            state.lastError = "";
          }
        })
        .catch(function(){
          state.status = "error";
          state.lastError = "Transcript bridge is unreachable at 127.0.0.1:7671.";
          dispatcher.emit("error", { message:state.lastError });
        });
    }, 2000);
  }

  return {
    id:"leeway-agent-voice-local",
    connect:function(){
      if(state.connected && state.listening && window.agentLeeMicShouldRun){
        return;
      }
      clearHealthMonitor();
      resetLeewayVoiceTurnState();
      state.status = "connecting";
      vscode.postMessage({command:"leewayStartTranscriptBridge"});
      state.connected = true;
      state.listening = true;
      state.status = "listening";
      state.lastError = "";
      window.agentLeeMicShouldRun = true;
      dispatcher.emit("LAVR_SESSION_CONNECTED", { provider:"leeway-agent-voice-local" });
      dispatcher.emit("LAVR_SESSION_STARTED", { provider:"leeway-agent-voice-local" });
      setAttachmentMeta("Local transcript bridge is available as a fallback. Voice input will be labeled and governed.", true);
      startHealthMonitor();
    },
    disconnect:function(reason){
      clearHealthMonitor();
      state.connected = false;
      state.listening = false;
      state.status = "closed";
      window.agentLeeMicShouldRun = false;
      if(typeof cancelLeewayVoiceTurn === "function"){
        cancelLeewayVoiceTurn(reason || "manual_stop");
      }
      dispatcher.emit("LAVR_SESSION_DISCONNECTED", { reason:reason || "manual_stop" });
      dispatcher.emit("LAVR_SESSION_CLOSED", { reason:reason || "manual_stop" });
    },
    startListening:function(){
      state.listening = true;
      state.status = "listening";
    },
    stopListening:function(){
      state.listening = false;
      state.status = "connected";
    },
    sendAudioFrame:function(){},
    sendUserText:function(text){
      var transcript = String(text || "").trim();
      if(!transcript) return;
      var gate = typeof beginLavrUtterance === "function"
        ? beginLavrUtterance("text_input")
        : null;
      if(typeof updateLavrFinalText === "function"){
        updateLavrFinalText(transcript);
      } else {
        window.agentLeeRealtimeTurnBuffer = transcript;
      }
      dispatcher.emit("LAVR_SPEECH_FINAL", {
        lavrTurnId:(gate && gate.turnId) || window.agentLeeLavrTurnId || "",
        lavrUtteranceId:(gate && gate.utteranceId) || window.agentLeeLavrUtteranceId || "",
        transcript:transcript
      });
      if(typeof queueLeewayVoiceTurnCommitForSource === "function"){
        queueLeewayVoiceTurnCommitForSource(120, "text_input");
      } else {
        dispatcher.emit("LAVR_TURN_COMMITTED", { transcript:transcript, source:"text" });
        vscode.postMessage({command:"leewayVoiceTurnCommit", text:transcript});
      }
    },
    cancelResponse:function(reason){
      state.status = "interrupted";
      dispatcher.emit("LAVR_INTERRUPT_REQUESTED", { reason:reason || "provider_cancel" });
    },
    sendToolResult:function(callId, result){
      dispatcher.emit("LAVR_TOOL_COMPLETED", { callId:callId, result:result });
    },
    sendToolError:function(callId, error){
      dispatcher.emit("LAVR_ERROR", { message:error, callId:callId });
    },
    getState:function(){ return Object.assign({}, state); },
    on:function(type, handler){ return dispatcher.on(type, handler); }
  };
}
`;
