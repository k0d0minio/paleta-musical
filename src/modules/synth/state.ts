"use client";

import { z } from "zod";
import {
  PARAM_IDS,
  PARAMS,
  clampValue,
  defaultSound,
  isWaveform,
  type ParamId,
  type SynthSound,
  type Waveform,
  synth,
} from "@/audio";
import { newId, useAppStore, type AppState } from "@/state";

/** The most user sounds the store keeps. */
export const USER_SOUNDS_MAX = 24;
export const SOUND_NAME_MAX = 60;

export interface UserSound extends SynthSound {
  readonly id: string;
  readonly name: string;
}

/** The Sintetizador slice: the current sound (SU6) and the user's own sounds. */
export interface SynthState {
  readonly sound: SynthSound;
  readonly sounds: readonly UserSound[];
}

const DEFAULT = defaultSound();

const waveform = (fallback: Waveform) =>
  z.custom<Waveform>(isWaveform).catch(fallback);

const params = z
  .record(z.string(), z.unknown())
  .catch({})
  .transform(
    (raw) =>
      Object.fromEntries(
        PARAM_IDS.map((id) => {
          const value = raw[id];
          return [
            id,
            typeof value === "number"
              ? clampValue(PARAMS[id], value)
              : PARAMS[id].default,
          ];
        }),
      ) as Record<ParamId, number>,
  );

const sound = z.object({
  wave1: waveform(DEFAULT.wave1),
  wave2: waveform(DEFAULT.wave2),
  params,
});

/** The store keeps module slices loose; the module validates its own keys. */
const schema = z.object({
  sound: sound.catch(DEFAULT),
  sounds: z
    .array(
      z
        .object({
          id: z.string().min(1).max(64),
          name: z.string().trim().min(1).max(SOUND_NAME_MAX),
        })
        .and(sound),
    )
    .max(USER_SOUNDS_MAX)
    .catch([]),
});

const cache = new WeakMap<object, SynthState>();

export function selectSynth(state: Pick<AppState, "modules">): SynthState {
  const slice = state.modules.synth;
  let parsed = cache.get(slice);
  if (!parsed) {
    parsed = schema.parse(slice);
    cache.set(slice, parsed);
  }
  return parsed;
}

export function getSynthState(): SynthState {
  return selectSynth(useAppStore.getState());
}

export function useSynthState(): SynthState {
  return useAppStore(selectSynth);
}

export function setSound(next: SynthSound): void {
  useAppStore.getState().setModuleState("synth", { sound: next });
}

export function setParam(id: ParamId, value: number): void {
  const current = getSynthState().sound;
  setSound({
    ...current,
    params: { ...current.params, [id]: clampValue(PARAMS[id], value) },
  });
}

export function setWave(osc: 1 | 2, wave: Waveform): void {
  const current = getSynthState().sound;
  setSound(
    osc === 1 ? { ...current, wave1: wave } : { ...current, wave2: wave },
  );
}

/** Saves the current sound under a name. Returns false when the list is full. */
export function saveUserSound(name: string): boolean {
  const { sound: current, sounds } = getSynthState();
  if (sounds.length >= USER_SOUNDS_MAX) return false;
  const entry: UserSound = {
    id: newId(),
    name: name.trim().slice(0, SOUND_NAME_MAX),
    ...current,
  };
  useAppStore
    .getState()
    .setModuleState("synth", { sounds: [...sounds, entry] });
  return true;
}

export function removeUserSound(id: string): void {
  const { sounds } = getSynthState();
  useAppStore
    .getState()
    .setModuleState("synth", { sounds: sounds.filter((s) => s.id !== id) });
}

/** Restores a removed sound at its place (undo of a remove). */
export function restoreUserSound(entry: UserSound, index: number): void {
  const { sounds } = getSynthState();
  if (sounds.some((s) => s.id === entry.id)) return;
  const next = [...sounds];
  next.splice(Math.min(index, next.length), 0, entry);
  useAppStore
    .getState()
    .setModuleState("synth", { sounds: next.slice(0, USER_SOUNDS_MAX) });
}

/** True when the sound has the waveforms and parameters of the entry (the volume is not compared). */
export function matchesUserSound(
  current: SynthSound,
  entry: SynthSound,
): boolean {
  return (
    current.wave1 === entry.wave1 &&
    current.wave2 === entry.wave2 &&
    PARAM_IDS.every(
      (id) =>
        id === "vol" || Math.abs(current.params[id] - entry.params[id]) < 1e-9,
    )
  );
}

/** A user sound sets both waveforms and every parameter, except the volume (as a preset, S020). */
export function applyUserSound(entry: UserSound): void {
  const current = getSynthState().sound;
  setSound({
    wave1: entry.wave1,
    wave2: entry.wave2,
    params: { ...entry.params, vol: current.params.vol },
  });
}

/**
 * The store drives the synth: the saved sound applies at once, before the
 * audio starts (S012) and for the "synth" instrument of the other modules.
 * The app runtime calls it once; it returns the unsubscribe.
 */
export function wireSynthSound(): () => void {
  synth.setSound(getSynthState().sound);
  return useAppStore.subscribe((state) => {
    const next = selectSynth(state).sound;
    if (next !== synth.sound) synth.setSound(next);
  });
}
