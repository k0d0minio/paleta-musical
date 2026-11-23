"use client";

import { useStore } from "zustand";
import { useAppStore, type AppState } from "./store";

export function useSettings() {
  return useAppStore((s) => s.global.settings);
}

export function useOctave() {
  return useAppStore((s) => s.global.octave);
}

/** Undo/redo state of the chord lists. */
export function useUndoRedo() {
  const temporal = useAppStore.temporal;
  const canUndo = useStore(temporal, (t) => t.pastStates.length > 0);
  const canRedo = useStore(temporal, (t) => t.futureStates.length > 0);
  return {
    canUndo,
    canRedo,
    undo: () => temporal.getState().undo(),
    redo: () => temporal.getState().redo(),
  };
}

export type { AppState };
