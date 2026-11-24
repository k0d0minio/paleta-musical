import { audioEngine } from "@/audio";
import { useAppStore } from "@/state";
import {
  CADENCE_MARK_SECONDS,
  CADENCE_SPACING_SECONDS,
  chordPitchClasses,
  isPitchClass,
  voiceChord,
  type ChordRef,
  type PitchClass,
  type RomanChord,
} from "@/theory";

/** F193, F195: a chosen key plays its triad, marked for 1.2 s. */
export const KEY_MARK_SECONDS = 1.2;
/** F196, F197: key-information and neighbour chords are marked for 1.5 s. */
export const CHORD_MARK_SECONDS = 1.5;

export function harmonyTonic(): PitchClass {
  const tonic = useAppStore.getState().modules.harmony.tonic;
  return isPitchClass(tonic) ? tonic : 0;
}

export function setHarmonyTonic(tonic: PitchClass): void {
  useAppStore.getState().setModuleState("harmony", { tonic });
}

function octave(): number {
  return useAppStore.getState().global.octave;
}

export function playChord(
  chord: ChordRef,
  markSeconds: number,
  setLast: boolean,
): void {
  audioEngine.playChord(voiceChord(chord, octave()), { markSeconds });
  if (setLast)
    useAppStore
      .getState()
      .setLastChord(chordPitchClasses(chord.root, chord.type), chord);
}

let cadenceTimers: ReturnType<typeof setTimeout>[] = [];

export function cancelCadence(): void {
  for (const timer of cadenceTimers) clearTimeout(timer);
  cadenceTimers = [];
}

/**
 * F200: the chords 1.3 s apart on the Transport, each marked for 1.1 s; each
 * chord updates the last chord when it starts.
 */
export function playCadence(chords: readonly RomanChord[]): void {
  cancelCadence();
  const o = octave();
  void audioEngine.schedule(
    chords.map((c, i) => ({
      at: i * CADENCE_SPACING_SECONDS,
      notes: voiceChord(c.chord, o),
      kind: "chord" as const,
      options: { markSeconds: CADENCE_MARK_SECONDS },
    })),
  );
  cadenceTimers = chords.map((c, i) =>
    setTimeout(
      () =>
        useAppStore
          .getState()
          .setLastChord(chordPitchClasses(c.chord.root, c.chord.type), c.chord),
      i * CADENCE_SPACING_SECONDS * 1000,
    ),
  );
}
