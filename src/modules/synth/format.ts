import type { ParamSpec } from "@/audio";

/** The message key of a unit: `modules.synth.units.<unit>`, with the number as `{value}`. */
export type UnitKey = "percent" | "cents" | "hz" | "khz" | "ms" | "s" | "q";

export interface FormattedValue {
  readonly unit: UnitKey;
  /** The number, formatted for the locale. */
  readonly number: string;
}

function number(
  locale: string,
  value: number,
  digits: number,
  signed = false,
): string {
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
    useGrouping: false,
    signDisplay: signed ? "exceptZero" : "auto",
  }).format(value);
}

/**
 * S014: the value of a control in its unit. % as a whole number; cents with
 * a + sign when positive; Hz below 1000 and kHz with one decimal above; ms
 * below 1 s and seconds with 2 decimals above; resonance with one decimal.
 */
export function formatParamValue(
  spec: ParamSpec,
  value: number,
  locale: string,
): FormattedValue {
  switch (spec.unit) {
    case "percent":
      return { unit: "percent", number: number(locale, value * 100, 0) };
    case "cents":
      return { unit: "cents", number: number(locale, value, 0, true) };
    case "hertz":
      return Math.round(value) >= 1000
        ? { unit: "khz", number: number(locale, value / 1000, 1) }
        : { unit: "hz", number: number(locale, value, 0) };
    case "seconds":
      return Math.round(value * 1000) >= 1000
        ? { unit: "s", number: number(locale, value, 2) }
        : { unit: "ms", number: number(locale, value * 1000, 0) };
    case "q":
      return { unit: "q", number: number(locale, value, 1) };
  }
}
