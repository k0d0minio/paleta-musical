import { describe, expect, it } from "vitest";
import { PARAMS } from "@/audio";
import en from "@/i18n/messages/en.json";
import ptPT from "@/i18n/messages/pt-PT.json";
import { formatParamValue, type FormattedValue } from "./format";
import { displayGain, findTrigger } from "./scope";

/** The text a user sees: the unit template of the messages, with the number. */
function text(messages: typeof ptPT, { unit, number }: FormattedValue): string {
  return messages.modules.synth.units[unit].replace("{value}", number);
}

const pt = (id: keyof typeof PARAMS, value: number) =>
  text(ptPT, formatParamValue(PARAMS[id], value, "pt-PT"));
const english = (id: keyof typeof PARAMS, value: number) =>
  text(en, formatParamValue(PARAMS[id], value, "en"));

describe("synth value formats (S014)", () => {
  it("shows % as a whole number", () => {
    expect(pt("mix", 0.5)).toBe("50 %");
    expect(english("mix", 0.5)).toBe("50%");
    expect(pt("fb", 0.85)).toBe("85 %");
    expect(pt("s", 0.004)).toBe("0 %");
  });

  it("shows cents with a + sign when positive", () => {
    expect(pt("det", 8)).toBe("+8 cents");
    expect(pt("det", -12.4)).toBe("-12 cents");
    expect(pt("det", 0)).toBe("0 cents");
    expect(pt("det", -0.2)).toBe("0 cents");
  });

  it("shows Hz below 1000 and kHz with one decimal above", () => {
    expect(pt("cut", 80)).toBe("80 Hz");
    expect(pt("cut", 808.4)).toBe("808 Hz");
    expect(pt("cut", 2200)).toBe("2,2 kHz");
    expect(english("cut", 2200)).toBe("2.2 kHz");
    expect(pt("cut", 12000)).toBe("12,0 kHz");
    expect(pt("cut", 999.7)).toBe("1,0 kHz");
  });

  it("shows ms below 1 s and seconds with 2 decimals above", () => {
    expect(pt("a", 0.005)).toBe("5 ms");
    expect(pt("r", 0.4)).toBe("400 ms");
    expect(pt("r", 1.6)).toBe("1,60 s");
    expect(english("a", 2)).toBe("2.00 s");
    expect(pt("d", 0.9996)).toBe("1,00 s");
  });

  it("shows the resonance with one decimal", () => {
    expect(pt("res", 3)).toBe("3,0");
    expect(english("res", 17.96)).toBe("18.0");
  });
});

describe("oscilloscope (S029)", () => {
  it("finds the first rising zero crossing in the first 1024 samples", () => {
    const wave = Float32Array.from({ length: 2048 }, (_, i) =>
      Math.sin(((i - 100) / 200) * 2 * Math.PI + Math.PI),
    );
    const at = findTrigger(wave);
    expect(wave[at - 1]).toBeLessThan(0);
    expect(wave[at]).toBeGreaterThanOrEqual(0);
    expect(at).toBeLessThan(1024);
  });

  it("starts at 0 without a crossing (silence)", () => {
    expect(findTrigger(new Float32Array(2048))).toBe(0);
  });

  it("scales a quiet wave up, at most 8 times", () => {
    expect(displayGain(0.9)).toBeCloseTo(1);
    expect(displayGain(0.3)).toBeCloseTo(3);
    expect(displayGain(0)).toBe(8);
  });
});
