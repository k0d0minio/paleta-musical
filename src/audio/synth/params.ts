/**
 * The synth parameters (SR1 of docs/features-synth.md): range, default and
 * curve. A control holds a position n from 0 to 1; `fromPosition` maps it
 * to the value in the parameter's unit and `toPosition` maps it back (S013).
 */

export const WAVEFORMS = ["sine", "square", "sawtooth", "triangle"] as const;
export type Waveform = (typeof WAVEFORMS)[number];

export const PARAM_IDS = [
  "mix",
  "det",
  "cut",
  "res",
  "a",
  "d",
  "s",
  "r",
  "dt",
  "fb",
  "dm",
  "vol",
] as const;
export type ParamId = (typeof PARAM_IDS)[number];

export type ParamGroup = "osc" | "filter" | "env" | "echo" | "out";
/** How the value shows (S014). */
export type ParamUnit = "percent" | "cents" | "hertz" | "q" | "seconds";

export interface ParamSpec {
  readonly id: ParamId;
  readonly group: ParamGroup;
  readonly min: number;
  readonly max: number;
  readonly default: number;
  readonly curve: "lin" | "exp";
  readonly unit: ParamUnit;
}

export const PARAMS: Readonly<Record<ParamId, ParamSpec>> = {
  mix: p("mix", "osc", 0, 1, 0.5, "lin", "percent"),
  det: p("det", "osc", -50, 50, 8, "lin", "cents"),
  cut: p("cut", "filter", 80, 12000, 2200, "exp", "hertz"),
  res: p("res", "filter", 0.5, 18, 3, "lin", "q"),
  a: p("a", "env", 0.005, 2, 0.02, "exp", "seconds"),
  d: p("d", "env", 0.03, 2, 0.3, "exp", "seconds"),
  s: p("s", "env", 0, 1, 0.6, "lin", "percent"),
  r: p("r", "env", 0.03, 3, 0.4, "exp", "seconds"),
  dt: p("dt", "echo", 0.05, 0.8, 0.3, "lin", "seconds"),
  fb: p("fb", "echo", 0, 0.85, 0.35, "lin", "percent"),
  dm: p("dm", "echo", 0, 1, 0.25, "lin", "percent"),
  vol: p("vol", "out", 0, 1, 0.6, "lin", "percent"),
};

function p(
  id: ParamId,
  group: ParamGroup,
  min: number,
  max: number,
  def: number,
  curve: "lin" | "exp",
  unit: ParamUnit,
): ParamSpec {
  return { id, group, min, max, default: def, curve, unit };
}

export const PARAM_GROUPS: readonly {
  readonly id: ParamGroup;
  readonly params: readonly ParamId[];
}[] = [
  { id: "osc", params: ["mix", "det"] },
  { id: "filter", params: ["cut", "res"] },
  { id: "env", params: ["a", "d", "s", "r"] },
  { id: "echo", params: ["dt", "fb", "dm"] },
  { id: "out", params: ["vol"] },
];

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

/** S013: position (0–1) → value. Exponential = min × (max/min)^n. */
export function fromPosition(spec: ParamSpec, n: number): number {
  const x = clamp01(n);
  return spec.curve === "exp"
    ? spec.min * (spec.max / spec.min) ** x
    : spec.min + (spec.max - spec.min) * x;
}

/** The inverse of `fromPosition`. */
export function toPosition(spec: ParamSpec, value: number): number {
  const v = clampValue(spec, value);
  return spec.curve === "exp"
    ? Math.log(v / spec.min) / Math.log(spec.max / spec.min)
    : (v - spec.min) / (spec.max - spec.min);
}

export function clampValue(spec: ParamSpec, value: number): number {
  if (!Number.isFinite(value)) return spec.default;
  return Math.min(spec.max, Math.max(spec.min, value));
}

export type SynthParams = Readonly<Record<ParamId, number>>;

export interface SynthSound {
  readonly wave1: Waveform;
  readonly wave2: Waveform;
  readonly params: SynthParams;
}

export function defaultParams(): Record<ParamId, number> {
  return Object.fromEntries(
    PARAM_IDS.map((id) => [id, PARAMS[id].default]),
  ) as Record<ParamId, number>;
}

/** S001: oscillator 1 sawtooth, oscillator 2 square, every SR1 default. */
export function defaultSound(): SynthSound {
  return { wave1: "sawtooth", wave2: "square", params: defaultParams() };
}

export function isWaveform(value: unknown): value is Waveform {
  return (
    typeof value === "string" &&
    (WAVEFORMS as readonly string[]).includes(value)
  );
}

/** S003: oscillator gains for a mix value. */
export function mixGains(mix: number): readonly [number, number] {
  const m = Math.min(1, Math.max(0, mix));
  return [1 - m, m];
}

/** S008: the output gain is volume² (a perceptual curve). */
export function volumeGain(volume: number): number {
  const v = Math.min(1, Math.max(0, volume));
  return v * v;
}
