import { describe, expect, it } from "vitest";
import {
  PARAM_IDS,
  PARAMS,
  defaultSound,
  fromPosition,
  mixGains,
  toPosition,
  volumeGain,
} from "./params";
import { PRESETS, PRESET_IDS, applyPreset, matchesPreset } from "./presets";

describe("synth parameter mapping (S013, SR1)", () => {
  it("maps a linear parameter from its minimum to its maximum", () => {
    expect(fromPosition(PARAMS.det, 0)).toBe(-50);
    expect(fromPosition(PARAMS.det, 0.5)).toBe(0);
    expect(fromPosition(PARAMS.det, 1)).toBe(50);
    expect(fromPosition(PARAMS.fb, 1)).toBeCloseTo(0.85);
  });

  it("maps an exponential parameter as min × (max/min)^n", () => {
    expect(fromPosition(PARAMS.cut, 0)).toBeCloseTo(80);
    expect(fromPosition(PARAMS.cut, 1)).toBeCloseTo(12000);
    expect(fromPosition(PARAMS.cut, 0.5)).toBeCloseTo(
      80 * Math.sqrt(12000 / 80),
    );
    expect(fromPosition(PARAMS.a, 0.5)).toBeCloseTo(0.005 * Math.sqrt(400));
  });

  it("clamps the position to 0–1", () => {
    expect(fromPosition(PARAMS.vol, -1)).toBe(0);
    expect(fromPosition(PARAMS.vol, 2)).toBe(1);
    expect(toPosition(PARAMS.cut, 99999)).toBe(1);
    expect(toPosition(PARAMS.cut, Number.NaN)).toBeCloseTo(
      toPosition(PARAMS.cut, 2200),
    );
  });

  it("toPosition is the inverse of fromPosition for every parameter", () => {
    for (const id of PARAM_IDS) {
      for (const n of [0, 0.13, 0.5, 0.77, 1]) {
        expect(toPosition(PARAMS[id], fromPosition(PARAMS[id], n))).toBeCloseTo(
          n,
          9,
        );
      }
    }
  });

  it("has the SR1 ranges, defaults and curves", () => {
    expect(
      PARAM_IDS.map((id) => {
        const p = PARAMS[id];
        return [id, p.min, p.max, p.default, p.curve];
      }),
    ).toEqual([
      ["mix", 0, 1, 0.5, "lin"],
      ["det", -50, 50, 8, "lin"],
      ["cut", 80, 12000, 2200, "exp"],
      ["res", 0.5, 18, 3, "lin"],
      ["a", 0.005, 2, 0.02, "exp"],
      ["d", 0.03, 2, 0.3, "exp"],
      ["s", 0, 1, 0.6, "lin"],
      ["r", 0.03, 3, 0.4, "exp"],
      ["dt", 0.05, 0.8, 0.3, "lin"],
      ["fb", 0, 0.85, 0.35, "lin"],
      ["dm", 0, 1, 0.25, "lin"],
      ["vol", 0, 1, 0.6, "lin"],
    ]);
  });

  it("mixes the oscillators as 1 − mix and mix (S003)", () => {
    expect(mixGains(0)).toEqual([1, 0]);
    expect(mixGains(1)).toEqual([0, 1]);
    expect(mixGains(0.25)).toEqual([0.75, 0.25]);
  });

  it("uses volume² as the output gain (S008)", () => {
    expect(volumeGain(0.6)).toBeCloseTo(0.36);
    expect(volumeGain(1)).toBe(1);
    expect(volumeGain(0)).toBe(0);
  });

  it("starts with sawtooth and square (S001)", () => {
    const sound = defaultSound();
    expect([sound.wave1, sound.wave2]).toEqual(["sawtooth", "square"]);
  });
});

describe("synth presets (S020, SR2)", () => {
  it("sets both waveforms and every SR2 value, and keeps the volume", () => {
    const start = defaultSound();
    const custom = { ...start, params: { ...start.params, vol: 0.9 } };
    const lead = applyPreset(custom, PRESETS.lead);
    expect([lead.wave1, lead.wave2]).toEqual(["square", "sawtooth"]);
    expect(lead.params).toEqual({
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
      vol: 0.9,
    });
  });

  it("has the four SR2 sounds, each within its SR1 ranges", () => {
    expect(PRESET_IDS).toEqual(["lead", "bass", "pad", "pizzicato"]);
    for (const id of PRESET_IDS) {
      for (const [param, value] of Object.entries(PRESETS[id].params)) {
        const spec = PARAMS[param as keyof typeof PARAMS];
        expect(value).toBeGreaterThanOrEqual(spec.min);
        expect(value).toBeLessThanOrEqual(spec.max);
      }
    }
    expect(PRESETS.pad.params.a).toBe(0.9);
    expect(PRESETS.pizzicato.params.s).toBe(0);
    expect(PRESETS.bass.params.cut).toBe(500);
  });

  it("knows when the sound has the values of a preset", () => {
    const pad = applyPreset(defaultSound(), PRESETS.pad);
    expect(matchesPreset(pad, PRESETS.pad)).toBe(true);
    expect(matchesPreset(pad, PRESETS.lead)).toBe(false);
    expect(
      matchesPreset(
        { ...pad, params: { ...pad.params, vol: 0.1 } },
        PRESETS.pad,
      ),
    ).toBe(true);
    expect(
      matchesPreset(
        { ...pad, params: { ...pad.params, cut: 1801 } },
        PRESETS.pad,
      ),
    ).toBe(false);
  });
});
