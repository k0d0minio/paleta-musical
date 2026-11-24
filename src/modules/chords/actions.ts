"use client";

import type { NavParams } from "@/nav";
import type { ModuleId } from "@/state";
import { useAppStore } from "@/state";
import type { ChordRef } from "@/theory";

/** F180: appends the chord (root position) to the shared timeline. */
export function addToTimeline(chord: ChordRef): void {
  useAppStore
    .getState()
    .timelineActions.append([{ chord: { ...chord, inversion: 0 } }]);
}

/**
 * F181: appends the chord (root position) to the builder line, then opens
 * Progressões → Construtor through goTo (U07 fixed).
 */
export function addToBuilder(
  chord: ChordRef,
  goTo: (id: ModuleId, params?: NavParams) => void,
): void {
  useAppStore
    .getState()
    .builderLineActions.append([{ chord: { ...chord, inversion: 0 } }]);
  goTo("progressions", { tab: "builder" });
}
