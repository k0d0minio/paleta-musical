"use client";

import { useEffect, useSyncExternalStore } from "react";
import { audioEngine, type AudioStatus } from "./engine";

const SERVER_STATUS: AudioStatus = { state: "locked", playing: false };

export function useAudioStatus(): AudioStatus {
  return useSyncExternalStore(
    audioEngine.subscribe,
    audioEngine.getStatus,
    () => SERVER_STATUS,
  );
}

const GESTURES = [
  "pointerdown",
  "pointerup",
  "touchend",
  "keydown",
  "click",
] as const;

/**
 * F001–F003: the first pointer or key gesture anywhere unlocks audio. There is
 * no blocking start screen. The listeners stay until the context runs.
 */
export function useAudioUnlock(): void {
  useEffect(() => {
    const onGesture = () => {
      if (audioEngine.getStatus().state !== "running") audioEngine.unlock();
    };
    for (const type of GESTURES)
      window.addEventListener(type, onGesture, {
        capture: true,
        passive: true,
      });
    return () => {
      for (const type of GESTURES)
        window.removeEventListener(type, onGesture, { capture: true });
    };
  }, []);
}
