import { Mic, MicOff, Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type MicState = "idle" | "requesting" | "recording";

function makeSessionId() {
  return `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
}

export default function PTTButton() {
  const [micState, setMicState] = useState<MicState>("idle");
  // Single busy ref — blocks all re-entrant calls while async work is in-flight
  const busyRef = useRef(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const sessionRef = useRef<string | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      _hardStop();
    };
  }, []);

  /** Immediately kill mic + MediaRecorder without sending stop event */
  function _hardStop() {
    try { mediaRecorderRef.current?.stop(); } catch { /* ignore */ }
    try { streamRef.current?.getTracks().forEach((t) => t.stop()); } catch { /* ignore */ }
    mediaRecorderRef.current = null;
    streamRef.current = null;
    sessionRef.current = null;
    busyRef.current = false;
  }

  const startRecording = async () => {
    if (busyRef.current) return; // debounce — ignore clicks while async work is running
    busyRef.current = true;
    setMicState("requesting");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, sampleRate: 16000 },
      });
      streamRef.current = stream;

      // Pick a mime type the browser actually supports
      const mime = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus"]
        .find((m) => MediaRecorder.isTypeSupported(m)) ?? "";

      const mr = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      mediaRecorderRef.current = mr;
      const session = makeSessionId();
      sessionRef.current = session;

      // Notify server: start
      await fetch(`/api/ptt?session=${encodeURIComponent(session)}`, {
        method: "POST",
        headers: { "X-PTT-Event": "start" },
        body: JSON.stringify({ app: "AgentLeeUI" }),
      }).catch(() => {/* non-fatal */});

      mr.ondataavailable = async (ev) => {
        if (!ev.data || ev.data.size === 0) return;
        const sid = sessionRef.current;
        if (!sid) return;
        try {
          const ab = await ev.data.arrayBuffer();
          await fetch(`/api/ptt?session=${encodeURIComponent(sid)}`, {
            method: "POST",
            headers: { "X-PTT-Event": "chunk", "Content-Type": "application/octet-stream" },
            body: new Blob([ab]),
          });
        } catch { /* swallow network errors */ }
      };

      mr.onstop = async () => {
        const sid = sessionRef.current;
        if (sid) {
          await fetch(`/api/ptt?session=${encodeURIComponent(sid)}`, {
            method: "POST",
            headers: { "X-PTT-Event": "stop" },
          }).catch(() => {/* non-fatal */});
        }
        try { streamRef.current?.getTracks().forEach((t) => t.stop()); } catch { /* ignore */ }
        streamRef.current = null;
        sessionRef.current = null;
        mediaRecorderRef.current = null;
        busyRef.current = false;
        setMicState("idle");
      };

      mr.start(400); // emit chunks every 400 ms
      busyRef.current = false; // unlock — user can now click to stop
      setMicState("recording");
    } catch (e) {
      console.error("PTT start failed:", e);
      _hardStop();
      setMicState("idle");
    }
  };

  const stopRecording = () => {
    if (busyRef.current) return; // still starting up — ignore
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      busyRef.current = true; // lock until onstop fires
      mediaRecorderRef.current.stop();
    }
  };

  /** Single click toggles between idle↔recording */
  const handleClick = () => {
    if (micState === "requesting") return; // mid-handshake — ignore
    if (micState === "recording") {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const label =
    micState === "requesting" ? "Requesting mic…" :
    micState === "recording"  ? "Click to stop recording" :
                                "Click to talk";

  return (
    <button
      onClick={handleClick}
      disabled={micState === "requesting"}
      className={[
        "p-3 border border-white/10 rounded-xl text-white transition-all select-none",
        micState === "recording"
          ? "bg-red-600 ring-2 ring-red-400 animate-pulse cursor-pointer"
          : micState === "requesting"
          ? "bg-white/10 cursor-wait"
          : "bg-red-600/50 hover:bg-red-600/80 cursor-pointer",
      ].join(" ")}
      aria-pressed={micState === "recording"}
      title={label}
      aria-label={label}
    >
      {micState === "requesting" ? (
        <Loader2 className="w-5 h-5 animate-spin" />
      ) : micState === "recording" ? (
        <Mic className="w-5 h-5" />
      ) : (
        <MicOff className="w-5 h-5 opacity-60" />
      )}
    </button>
  );
}
