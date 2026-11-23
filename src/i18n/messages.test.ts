import { describe, expect, it } from "vitest";
import { SCALE_IDS, CHORD_TYPE_IDS } from "@/theory";
import en from "./messages/en.json";
import ptPT from "./messages/pt-PT.json";

function keys(obj: unknown, prefix = ""): string[] {
  if (typeof obj !== "object" || obj === null) return [prefix];
  return Object.entries(obj).flatMap(([k, v]) =>
    keys(v, prefix ? `${prefix}.${k}` : k),
  );
}

describe("messages", () => {
  it("PT-PT and EN have the same keys", () => {
    expect(keys(en).sort()).toEqual(keys(ptPT).sort());
  });

  it("has a name for every scale and chord type", () => {
    for (const id of SCALE_IDS) expect(ptPT.scales[id]).toBeTruthy();
    for (const id of CHORD_TYPE_IDS) expect(ptPT.chordTypes[id]).toBeTruthy();
  });

  it("uses one PT-PT spelling (U26)", () => {
    const text = JSON.stringify(ptPT);
    for (const ptBR of [
      "Harmônica",
      "Pentatônica",
      "Selecciona",
      "detectar",
      "Tônica",
      "diatônico",
      "ônibus",
      "você",
    ]) {
      expect(text).not.toContain(ptBR);
    }
    expect(text).toContain("Harmónica");
    expect(text).toContain("Pentatónica");
  });
});
