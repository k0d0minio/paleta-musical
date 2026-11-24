import { describe, expect, it } from "vitest";
import { CHORD_TYPE_IDS, chordPitchClasses } from "./chords";
import { guitarVoicing, hasGuitarVoicing, voicingPitchClasses } from "./guitar";
import { PITCH_CLASSES } from "./pitch";

describe("guitar voicings (app table)", () => {
  it("sounds only chord notes, with the root in the bass, on every root", () => {
    for (const type of CHORD_TYPE_IDS) {
      if (!hasGuitarVoicing(type)) continue;
      for (const root of PITCH_CLASSES) {
        const voicing = guitarVoicing(root, type);
        expect(voicing).not.toBeNull();
        if (!voicing) continue;
        const pcs = voicingPitchClasses(voicing);
        const chord = chordPitchClasses(root, type);
        for (const pc of pcs) expect(chord).toContain(pc);
        expect(pcs[0]).toBe(root);
        expect(new Set(pcs).size).toBeGreaterThanOrEqual(
          Math.min(3, chord.length),
        );
        for (const f of voicing.frets)
          if (f !== null) {
            expect(f).toBeGreaterThanOrEqual(0);
            expect(f).toBeLessThanOrEqual(16);
          }
      }
    }
  });

  it("gives the open shapes at the nut", () => {
    expect(guitarVoicing(4, "major")).toEqual({
      frets: [0, 2, 2, 1, 0, 0],
      position: 1,
    });
    expect(guitarVoicing(9, "minor")).toEqual({
      frets: [null, 0, 2, 2, 1, 0],
      position: 1,
    });
  });

  it("moves a barre shape up the neck", () => {
    const f = guitarVoicing(5, "major");
    expect(f?.frets).toEqual([1, 3, 3, 2, 1, 1]);
    expect(f?.position).toBe(1);
    const cSharpMinor = guitarVoicing(1, "minor");
    expect(cSharpMinor?.frets).toEqual([null, 4, 6, 6, 5, 4]);
    expect(cSharpMinor?.position).toBe(4);
  });
});
