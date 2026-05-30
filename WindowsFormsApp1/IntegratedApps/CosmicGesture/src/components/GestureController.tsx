import { useEffect } from "react";
import type { GestureDebugState, GestureEvent } from "../types";
import { useHandGestures } from "../hooks/useHandGestures";

interface GestureControllerProps {
  enabled: boolean;
  onGesture: (event: GestureEvent) => void;
  onDebug: (debug: GestureDebugState) => void;
}

export function GestureController({ enabled, onGesture, onDebug }: GestureControllerProps) {
  const { videoRef, debug } = useHandGestures({ enabled, onGesture });

  useEffect(() => {
    onDebug(debug);
  }, [debug, onDebug]);

  return <video ref={videoRef} className="camera-feed" autoPlay muted playsInline />;
}
