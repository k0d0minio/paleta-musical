import { Midi } from "@tonejs/midi";
import { describe, expect, it } from "vitest";
import {
  beatsToSeconds,
  renderRhythm,
  voiceChord,
  type ChordRef,
} from "@/theory";
import {
  progressionFileName,
  progressionSong,
  readSmf,
  songToChords,
  writeSmf,
} from ".";

const chords: ChordRef[] = [
  { root: 0, type: "major", inversion: 0 },
  { root: 2, type: "dom9", inversion: 0 },
];

describe("progression MIDI (F265–F267)", () => {
  const render = renderRhythm(
    "simples",
    chords.map((c) => voiceChord(c, 4)),
    { bpm: 100 },
  );
  const bytes = writeSmf(progressionSong(render.events, 100));
  const midi = new Midi(bytes);

  it("is format 0, one track, 480 PPQ, tempo and 4/4, track name", () => {
    expect(midi.header.ppq).toBe(480);
    expect(midi.tracks).toHaveLength(1);
    expect(midi.header.tempos[0]?.bpm).toBeCloseTo(100, 3);
    expect(midi.header.timeSignatures[0]?.timeSignature).toEqual([4, 4]);
    expect(midi.tracks[0]?.name).toBe("Paleta Musical");
  });

  it("U32: note numbers use the real octave (C4 = 60) and extensions keep their register", () => {
    const notes = midi.tracks[0]?.notes ?? [];
    expect(notes.filter((n) => n.ticks === 0).map((n) => n.midi)).toEqual([
      60, 64, 67,
    ]);
    // D9 in octave 4: D4 F♯4 A4 C5 E5 (the 9th stays above the octave).
    expect(
      notes
        .filter((n) => n.ticks === 480)
        .map((n) => n.midi)
        .sort(),
    ).toEqual([62, 66, 69, 72, 76]);
  });

  it("U31: note times match the audio pattern", () => {
    const fileTimes = [
      ...new Set((midi.tracks[0]?.notes ?? []).map((n) => +n.time.toFixed(4))),
    ];
    const audioTimes = [
      ...new Set(
        render.events.map((e) => +beatsToSeconds(e.beat, 100).toFixed(4)),
      ),
    ];
    expect(fileTimes).toEqual(audioTimes);
  });

  it("U31: swing and strum values apply to the MIDI file", () => {
    const swing = renderRhythm(
      "swing",
      [voiceChord(chords[0] as ChordRef, 4)],
      { swing: 0.55 },
    );
    const file = new Midi(writeSmf(progressionSong(swing.events, 90)));
    expect([...new Set(file.tracks[0]?.notes.map((n) => n.ticks))]).toEqual([
      0,
      Math.round(0.55 * 480),
    ]);
  });

  it("names the file progressao-<rhythm>-paleta.mid", () => {
    expect(progressionFileName("simples")).toBe(
      "progressao-simples-paleta.mid",
    );
  });

  it("imports block chords as named chords", () => {
    const back = songToChords(readSmf(bytes));
    expect(back.chords).toEqual([
      { root: 0, type: "major", inversion: 0 },
      { root: 2, type: "dom9", inversion: 0 },
    ]);
    const inverted = renderRhythm("simples", [
      voiceChord({ root: 0, type: "major", inversion: 1 }, 4),
    ]);
    expect(
      songToChords(readSmf(writeSmf(progressionSong(inverted.events, 90))))
        .chords,
    ).toEqual([{ root: 0, type: "major", inversion: 1 }]);
  });
});
