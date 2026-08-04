/**
 * LEEWAY_HEADER - DO NOT REMOVE
 *
 * REGION: UI
 * TAG: UI.CAMERA.TRUTH_BOUND_FEED
 * PURPOSE: Render only real browser camera video or explicit permission/bridge-required camera state.
 * DISCOVERY_PIPELINE: Voice -> Intent -> Location -> Vertical -> Ranking -> Render
 *
 * 5WH:
 * WHAT = Truth-bound camera feed component
 * WHY = Prevent stock, synthetic, or fake camera/device status in the IDE
 * WHO = Leeway Innovations / Agent Lee Enablement
 * WHERE = leeway-ide-single-canvas/src/components/CameraFeed.tsx
 * WHEN = 2026-06-07
 * HOW = Browser getUserMedia only; no fallback media and no fake recognition overlays
 *
 * CHAIN: Standards -> Local Device Bridge -> Camera Permission -> Runtime Receipt
 * LICENSE: PROPRIETARY
 */

import React, { useEffect, useRef, useState } from "react";

interface CameraFeedProps {
  className?: string;
  showMesh?: boolean;
  meshMode?: string;
  scaleFeed?: boolean;
}

export function CameraFeed({ className = "", showMesh = true, meshMode = "Object Detection", scaleFeed = false }: CameraFeedProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hasWebcam, setHasWebcam] = useState(false);
  const [cameraStatus, setCameraStatus] = useState("BROWSER_CAMERA_PERMISSION_REQUIRED");

  useEffect(() => {
    let activeStream: MediaStream | null = null;

    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 1280, height: 720, facingMode: "user" },
        });
        activeStream = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setHasWebcam(true);
        setCameraStatus("NATIVE_BROWSER_CAMERA_STREAM_NO_RUNTIME_RECEIPT");
      } catch (error) {
        setHasWebcam(false);
        if (error instanceof DOMException && (error.name === "NotAllowedError" || error.name === "PermissionDeniedError")) {
          setCameraStatus("BROWSER_CAMERA_PERMISSION_DENIED");
        } else {
          setCameraStatus("LOCAL_DEVICE_BRIDGE_REQUIRED");
        }
      }
    }

    startCamera();

    return () => {
      activeStream?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  return (
    <div className={`relative flex h-full w-full items-center justify-center overflow-hidden bg-[#07090e] ${className}`}>
      {hasWebcam ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`h-full w-full object-cover ${scaleFeed ? "" : "scale-x-[-1]"}`}
        />
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center gap-2 p-4 text-center">
          <div className="rounded border border-amber-500/30 bg-amber-500/10 px-3 py-2 font-mono text-[10px] font-black uppercase tracking-widest text-amber-300">
            {cameraStatus}
          </div>
          <p className="max-w-sm text-[10px] leading-5 text-slate-500">
            Camera preview is not substituted with stock or synthetic media. Runtime-backed camera status requires the Local Device Bridge and a command receipt.
          </p>
        </div>
      )}

      {showMesh && hasWebcam && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
          <div className="rounded border border-emerald-500/40 bg-black/70 px-2 py-1 font-mono text-[8px] font-black uppercase tracking-widest text-emerald-300">
            {meshMode}: live stream only, recognition requires Runtime Fabric receipt
          </div>
        </div>
      )}

      <div className="absolute inset-x-1 bottom-1 z-10 flex items-center justify-between rounded border border-white/5 bg-[#07090e]/85 px-2 py-0.5 font-mono text-[7px] text-gray-500">
        <span>{cameraStatus}</span>
        <span>COMMAND_RECEIPT_REQUIRED</span>
      </div>
    </div>
  );
}

// Leeway Standards: truth-bound camera surface
