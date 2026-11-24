import type { ParamId, SynthSound, Waveform } from "./params";

export const PRESET_IDS = ["lead", "bass", "pad", "pizzicato"] as const;
export type PresetId = (typeof PRESET_IDS)[number];

/** The keys a preset sets: every parameter except the volume (S020). */
export type PresetParamId = Exclude<ParamId, "vol">;

export interface Preset {
  readonly id: PresetId;
  readonly wave1: Waveform;
  readonly wave2: Waveform;
  readonly params: Readonly<Record<PresetParamId, number>>;
}

/** SR2: the four starting sounds. */
export const PRESETS: Readonly<Record<PresetId, Preset>> = {
  lead: {
    id: "lead",
    wave1: "square",
    wave2: "sawtooth",
    params: {
      mix: 0.5,
      det: 10,
      cut: 5000,
      res: 8,
      a: 0.01,
      d: 0.2,
      s: 0.8,
      r: 0.25,
      dt: 0.3,
      fb: 0.3,
      dm: 0.2,
    },
  },
  bass: {
    id: "bass",
    wave1: "sawtooth",
    wave2: "square",
    params: {
      mix: 0.3,
      det: 5,
      cut: 500,
      res: 6,
      a: 0.005,
      d: 0.25,
      s: 0.3,
      r: 0.15,
      dt: 0.25,
      fb: 0.2,
      dm: 0.1,
    },
  },
  pad: {
    id: "pad",
    wave1: "sawtooth",
    wave2: "sawtooth",
    params: {
      mix: 0.5,
      det: 14,
      cut: 1800,
      res: 1.5,
      a: 0.9,
      d: 0.8,
      s: 0.7,
      r: 1.6,
      dt: 0.45,
      fb: 0.5,
      dm: 0.4,
    },
  },
  pizzicato: {
    id: "pizzicato",
    wave1: "triangle",
    wave2: "square",
    params: {
      mix: 0.25,
      det: 3,
      cut: 3500,
      res: 4,
      a: 0.005,
      d: 0.35,
      s: 0,
      r: 0.3,
      dt: 0.22,
      fb: 0.4,
      dm: 0.3,
    },
  },
};

/** S020: a preset sets both waveforms and every parameter it names; the volume stays. */
export function applyPreset(sound: SynthSound, preset: Preset): SynthSound {
  return {
    wave1: preset.wave1,
    wave2: preset.wave2,
    params: { ...sound.params, ...preset.params },
  };
}

/** True when the sound has the values of the preset (the volume is not compared). */
export function matchesPreset(sound: SynthSound, preset: Preset): boolean {
  return (
    sound.wave1 === preset.wave1 &&
    sound.wave2 === preset.wave2 &&
    (Object.keys(preset.params) as PresetParamId[]).every(
      (id) => Math.abs(sound.params[id] - preset.params[id]) < 1e-9,
    )
  );
}
