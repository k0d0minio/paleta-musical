import { create } from "zustand";
import type { View } from "../lib/geometry";
import type { Heatmap } from "../lib/heatmap";
import type { RawNote } from "../lib/model";
import { STOPPED, type Loop, type TransportState } from "../lib/transport";
import type { Capture } from "./capture";

/** A status line: a message key of `modules.analyse.roll.status` and its values. */
export interface Status {
  readonly key:
    | "initial"
    | "analysing"
    | "processing"
    | "detected"
    | "analysisError"
    | "noBuffer"
    | "micRequest"
    | "micDenied"
    | "capturing"
    | "captureStopped"
    | "imported"
    | "importError";
  readonly values?: Readonly<Record<string, string | number>>;
  readonly error?: boolean;
}

/**
 * The roll session: runtime state that is not persisted and not in the undo
 * history (heatmap, capture, transport, view, selection, clipboard).
 */
export interface RollSession {
  status: Status;
  /** 0–100 while a job runs, else null. */
  progress: number | null;
  busy: "analysing" | "requesting" | "capturing" | null;
  heatmap: Heatmap | null;
  capture: Capture | null;
  transport: TransportState;
  loop: Loop | null;
  /** The visible window; null = not set yet (fit to the duration). */
  view: View | null;
  selection: ReadonlySet<string>;
  clipboard: readonly RawNote[];
  /** Increments when the stored notes change under the canvas (redraw). */
  revision: number;
}

export const initialSession = (): RollSession => ({
  status: { key: "initial" },
  progress: null,
  busy: null,
  heatmap: null,
  capture: null,
  transport: STOPPED,
  loop: null,
  view: null,
  selection: new Set(),
  clipboard: [],
  revision: 0,
});

export const useRollSession = create<RollSession>()(() => initialSession());

export const session = {
  get: () => useRollSession.getState(),
  set: (patch: Partial<RollSession>) => useRollSession.setState(patch),
};
