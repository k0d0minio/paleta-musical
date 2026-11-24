"use client";

import { useAppStore } from "@/state";
import { lastNoteEnd } from "./lib/edit";
import {
  parseDoc,
  parseSettings,
  type RollDoc,
  type RollSettings,
} from "./lib/model";

/**
 * The roll in the persisted store (IndexedDB, survives a reload):
 * - `modules.analyse.roll`: notes, BPM, duration. In the undo history
 *   (`UNDO_MODULE_KEYS` in `src/state/store.ts`): each write is one undo step.
 * - `modules.analyse.rollSettings`: tool, heatmap, play mode, grid, mic mode.
 * The store keeps module slices loose; these readers validate with zod.
 */
const docCache = new WeakMap<object, RollDoc>();
const settingsCache = new WeakMap<object, RollSettings>();
const EMPTY = {};

function readDoc(raw: unknown): RollDoc {
  const key = typeof raw === "object" && raw !== null ? raw : EMPTY;
  let doc = docCache.get(key);
  if (!doc) {
    doc = parseDoc(raw);
    docCache.set(key, doc);
  }
  return doc;
}

function readSettings(raw: unknown): RollSettings {
  const key = typeof raw === "object" && raw !== null ? raw : EMPTY;
  let settings = settingsCache.get(key);
  if (!settings) {
    settings = parseSettings(raw);
    settingsCache.set(key, settings);
  }
  return settings;
}

export function getRollDoc(): RollDoc {
  return readDoc(useAppStore.getState().modules.analyse.roll);
}

export function useRollDoc(): RollDoc {
  return readDoc(useAppStore((s) => s.modules.analyse.roll));
}

/** One write = one undo step. The duration grows to hold every note. */
export function setRollDoc(
  update: Partial<RollDoc> | ((doc: RollDoc) => Partial<RollDoc>),
): void {
  const current = getRollDoc();
  const patch = typeof update === "function" ? update(current) : update;
  const next: RollDoc = { ...current, ...patch };
  const doc: RollDoc = {
    ...next,
    duration: Math.max(next.duration, lastNoteEnd(next.notes)),
  };
  docCache.set(doc, doc);
  useAppStore.getState().setModuleState("analyse", { roll: doc });
}

export function getRollSettings(): RollSettings {
  return readSettings(useAppStore.getState().modules.analyse.rollSettings);
}

export function useRollSettings(): RollSettings {
  return readSettings(useAppStore((s) => s.modules.analyse.rollSettings));
}

export function setRollSettings(patch: Partial<RollSettings>): void {
  const settings = { ...getRollSettings(), ...patch };
  settingsCache.set(settings, settings);
  useAppStore.getState().setModuleState("analyse", { rollSettings: settings });
}
