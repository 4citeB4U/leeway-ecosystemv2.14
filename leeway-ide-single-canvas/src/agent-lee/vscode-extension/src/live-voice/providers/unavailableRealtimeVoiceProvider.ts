/*
LEEWAY_HEADER - DO NOT REMOVE

REGION: VOICE_RUNTIME
TAG: CORE.AGENT_LEE.LEEWAY_AGENT_VOICE_RUNTIME.UNAVAILABLE
PURPOSE: LeeWay Agent Voice graceful-degradation engine. Returned when no valid runtime is available.
DISCOVERY_PIPELINE: Voice -> Intent -> Location -> Vertical -> Ranking -> Render
*/

export const unavailableRealtimeVoiceProviderClientScript = String.raw`
function createLeewayUnavailableVoiceRuntime(kind){
  var dispatcher = createLeeWayVoiceEventBus();
  var state = {
    status:"idle",
    connected:false,
    listening:false,
    providerKind:kind,
    lastError:""
  };
  return {
    id:kind,
    connect:function(){
      state.status = "error";
      state.lastError = kind + " provider is not implemented yet.";
      dispatcher.emit("LAVR_ERROR", { message:state.lastError });
    },
    disconnect:function(reason){
      state.connected = false;
      state.listening = false;
      state.status = "closed";
      dispatcher.emit("LAVR_SESSION_DISCONNECTED", { reason:reason || "manual_stop" });
    },
    sendAudioFrame:function(){},
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