/*
LEEWAY_HEADER - DO NOT REMOVE

REGION: VOICE_RUNTIME
TAG: CORE.AGENT_LEE.LEEWAY_AGENT_VOICE_RUNTIME.BROWSER_FALLBACK
PURPOSE: LeeWay Agent Voice Browser Fallback engine. Uses Web SpeechRecognition API when available.
         Fallback-only. Local browser mic. No cloud API dependency.
DISCOVERY_PIPELINE: Voice -> Intent -> Location -> Vertical -> Ranking -> Render
*/

export const browserSpeechRecognitionProviderClientScript = String.raw`
function createLeewayBrowserVoiceFallback(){
  var RecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition;
  if(!RecognitionCtor) return null;

  var dispatcher = createLeeWayVoiceEventBus();
  var recognition = new RecognitionCtor();
  var state = {
    connected:false,
    shouldRun:false,
    listening:false,
    status:"idle",
    lastError:""
  };

  recognition.lang = "en-US";
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.maxAlternatives = 1;

  recognition.onstart = function(){
    state.connected = true;
    state.listening = true;
    state.shouldRun = true;
    state.status = "listening";
    window.agentLeeMicListening = true;
    window.agentLeeMicShouldRun = true;
    dispatcher.emit("LAVR_SESSION_CONNECTED", { provider:"leeway-agent-voice-browser-fallback" });
    dispatcher.emit("LAVR_SESSION_STARTED", { provider:"leeway-agent-voice-browser-fallback" });
    var micBtn=document.getElementById("micBtn");
    if(micBtn) micBtn.style.opacity = "1";
    setAttachmentMeta("Browser speech is available. This is a fallback input path, not full LeeWay Voice authority.", true);
  };

  recognition.onresult = function(event){
    var interimText = "";
    var finalText = "";
    for(var i=event.resultIndex;i<event.results.length;i++){
      var result = event.results[i];
      if(!result || !result[0]) continue;
      var phrase = String(result[0].transcript || "").trim();
      if(!phrase) continue;
      if(result.isFinal && phrase){
        finalText += (finalText ? " " : "") + phrase;
      } else {
        interimText += (interimText ? " " : "") + phrase;
      }
    }

    var snapshot = String((finalText + " " + interimText).trim());
    if(!snapshot) return;

    var gate = null;

    if(!window.agentLeeRealtimeUserSpeaking){
      window.agentLeeRealtimeUserSpeaking = true;
      state.status = "user_speaking";
      if(typeof beginLavrUtterance === "function"){
        gate = beginLavrUtterance("speech_started");
      }
      dispatcher.emit("LAVR_USER_SPEECH_STARTED", {
        lavrTurnId:(gate && gate.turnId) || window.agentLeeLavrTurnId || "",
        lavrUtteranceId:(gate && gate.utteranceId) || window.agentLeeLavrUtteranceId || ""
      });
      dispatcher.emit("LAVR_SPEECH_STARTED", {
        lavrTurnId:(gate && gate.turnId) || window.agentLeeLavrTurnId || "",
        lavrUtteranceId:(gate && gate.utteranceId) || window.agentLeeLavrUtteranceId || ""
      });
      if(window.agentLeeAgentTurnActive || window.agentLeeRealtimeAssistantSpeaking){
        var interruptId = typeof requestLavrInterrupt === "function"
          ? requestLavrInterrupt("user_barge_in")
          : "";
        dispatcher.emit("LAVR_INTERRUPT_REQUESTED", {
          reason:"user_barge_in",
          lavrInterruptId:interruptId || window.agentLeeLavrInterruptId || "",
          lavrTurnId:window.agentLeeLavrTurnId || "",
          lavrUtteranceId:window.agentLeeLavrUtteranceId || ""
        });
      }
    }

    window.agentLeeRealtimeInterim = snapshot;
    if(interimText && typeof updateLavrPartialText === "function"){
      gate = updateLavrPartialText(interimText) || gate;
      dispatcher.emit("LAVR_SPEECH_PARTIAL", {
        lavrTurnId:(gate && gate.turnId) || window.agentLeeLavrTurnId || "",
        lavrUtteranceId:(gate && gate.utteranceId) || window.agentLeeLavrUtteranceId || "",
        transcript:String(interimText || "")
      });
    }

    if(finalText){
      var finalUpdate = typeof updateLavrFinalText === "function"
        ? updateLavrFinalText(finalText)
        : { gate:gate, accepted:true, duplicate:false };
      gate = (finalUpdate && finalUpdate.gate) || gate;
      if(finalUpdate && finalUpdate.accepted){
        dispatcher.emit("LAVR_SPEECH_FINAL", {
          lavrTurnId:(gate && gate.turnId) || window.agentLeeLavrTurnId || "",
          lavrUtteranceId:(gate && gate.utteranceId) || window.agentLeeLavrUtteranceId || "",
          transcript:String(finalText || "")
        });
      }
      if(!finalUpdate || finalUpdate.accepted !== true){
        finalText = "";
      }
    }

    dispatcher.emit("LAVR_USER_AUDIO_DELTA", {
      transcript:snapshot,
      lavrTurnId:(gate && gate.turnId) || window.agentLeeLavrTurnId || "",
      lavrUtteranceId:(gate && gate.utteranceId) || window.agentLeeLavrUtteranceId || ""
    });
    var commitSource = finalText ? "speech_final" : "speech_partial";
    var commitDelay = finalText ? 160 : 420;
    if(finalText === "" && gate && gate.hasFinal){
      // Duplicate final or post-final interim noise should not delay an already scheduled final commit.
      return;
    }
    if(typeof queueLeewayVoiceTurnCommitForSource === "function"){
      queueLeewayVoiceTurnCommitForSource(commitDelay, commitSource);
    } else {
      queueLeewayVoiceTurnCommit(commitDelay);
    }
  };

  recognition.onend = function(){
    state.listening = false;
    window.agentLeeMicListening = false;
    if(state.shouldRun){
      state.status = window.agentLeeAgentTurnActive ? "assistant_speaking" : "listening";
      setTimeout(function(){
        if(!state.shouldRun) return;
        try { recognition.start(); } catch {}
      }, window.agentLeeAgentTurnActive ? 280 : 160);
      return;
    }

    state.connected = false;
    state.status = "closed";
    var micBtn=document.getElementById("micBtn");
    if(micBtn) micBtn.style.opacity = "0.6";
    if(window.agentLeeRealtimeUserSpeaking){
      window.agentLeeRealtimeUserSpeaking = false;
      dispatcher.emit("LAVR_USER_SPEECH_STOPPED", { reason:"stream_ended" });
    }
    dispatcher.emit("LAVR_SESSION_CLOSED", { reason:"stream_ended" });
    dispatcher.emit("LAVR_SESSION_DISCONNECTED", { reason:"stream_ended" });
      setAttachmentMeta("Browser speech fallback is paused. Typed input remains available.", true);
  };

  recognition.onerror = function(event){
    if(event && event.error === "not-allowed"){
      state.shouldRun = false;
      state.connected = false;
      state.status = "error";
      state.lastError = "Microphone permission denied.";
      window.agentLeeMicShouldRun = false;
      setAttachmentMeta("Microphone permission is required before LeeWay Voice can listen.", true);
      dispatcher.emit("LAVR_ERROR", { message:state.lastError });
      return;
    }
    if(event && event.error === "no-speech") return;
    state.status = "error";
    state.lastError = String((event && event.error) || "speech recognition error");
    dispatcher.emit("LAVR_ERROR", { message:state.lastError });
  };

  return {
    id:"leeway-agent-voice-browser-fallback",
    connect:function(){
      state.status = "connecting";
      state.shouldRun = true;
      window.agentLeeMicShouldRun = true;
      try { recognition.start(); } catch {}
    },
    disconnect:function(reason){
      state.shouldRun = false;
      window.agentLeeMicShouldRun = false;
      state.status = "closed";
      if(typeof cancelLeewayVoiceTurn === "function"){
        cancelLeewayVoiceTurn(reason || "manual_stop");
      }
      if(window.agentLeeRealtimeCommitTimer){
        clearTimeout(window.agentLeeRealtimeCommitTimer);
        window.agentLeeRealtimeCommitTimer = null;
      }
      if(state.listening){
        try { recognition.stop(); } catch {}
      }
      dispatcher.emit("LAVR_SESSION_CLOSED", { reason:reason || "manual_stop" });
      dispatcher.emit("LAVR_SESSION_DISCONNECTED", { reason:reason || "manual_stop" });
    },
    startListening:function(){
      state.shouldRun = true;
      state.status = "listening";
    },
    stopListening:function(){
      state.shouldRun = false;
      state.status = "connected";
    },
    sendAudioFrame:function(){},
    sendUserText:function(text){
      dispatcher.emit("LAVR_TURN_COMMITTED", { transcript:String(text || ""), source:"text" });
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
    on:function(type, handler){ return dispatcher.on(type, handler); },
    getState:function(){
      return {
        status:state.status,
        connected:state.connected,
        listening:state.listening,
        providerKind:"leeway-agent-voice-browser-fallback",
        shouldRun:state.shouldRun,
        lastError:state.lastError || ""
      };
    }
  };
}
`;
