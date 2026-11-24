import { describe, expect, it } from "vitest";
import {
  RHYTHM_IDS,
  beatsToSeconds,
  frequency,
  renderRhythm,
  type Note,
  type RhythmId,
} from "@/theory";
import { R15 } from "../r15";
import { scheduleVoice } from "../voice";
import { toPatternEvents } from "./player";

const RATE = 44_100;
const BPM = 120;
const C: Note[] = [
  { pc: 0, octave: 5 },
  { pc: 4, octave: 5 },
  { pc: 7, octave: 5 },
];
const F: Note[] = [
  { pc: 5, octave: 5 },
  { pc: 9, octave: 5 },
  { pc: 0, octave: 6 },
];

/** R9 event times in beats for two triads, by hand (strum: 40 ms = 0.08 beat at 120 BPM). */
const R9_BEATS: Record<RhythmId, number[]> = {
  simples: [0, 1],
  loop: [0, 1],
  half: [0, 2],
  arpejo: [0, 0.5, 1, 1.5, 2, 2.5],
  "arpejo-down": [0, 0.5, 1, 1.5, 2, 2.5],
  "arpejo-ud": [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5],
  swing: [0, 0.67, 1, 1.67],
  ballad: [0, 0.4, 2, 2.4],
  funk: [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5],
  strum: [
    0, 0.08, 0.16, 1, 1.08, 1.16, 2, 2.08, 2.16, 3, 3.08, 3.16, 4, 4.08, 4.16,
    5, 5.08, 5.16, 6, 6.08, 6.16, 7, 7.08, 7.16,
  ],
  bossa: [0, 0.4, 1, 1.5, 2, 2.4, 3, 3.5],
  waltz: [0, 1, 2, 3, 4, 5],
};

/**
 * Renders the audio pattern of a rhythm offline with the R15 voice. Each
 * event goes to its own channel, so its onset is the first non-silent sample.
 */
async function renderOnsets(id: RhythmId): Promise<number[]> {
  const { events, totalBeats } = renderRhythm(id, [C, F], { bpm: BPM });
  const pattern = toPatternEvents(events, BPM);
  const length = Math.ceil(RATE * (beatsToSeconds(totalBeats, BPM) + 2));
  const ctx = new OfflineAudioContext(pattern.length, length, RATE);
  const merger = ctx.createChannelMerger(pattern.length);
  merger.connect(ctx.destination);
  pattern.forEach((event, channel) => {
    const input = ctx.createGain();
    input.connect(merger, 0, channel);
    const base = event.notes.length > 1 ? R15.chord : R15.note;
    for (const note of event.notes) {
      scheduleVoice(ctx, input, frequency(note), event.at, {
        ...base,
        ...event.options,
      });
    }
  });
  const buffer = await ctx.startRendering();
  const onsets: number[] = [];
  for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
    const data = buffer.getChannelData(ch);
    const index = data.findIndex((x) => Math.abs(x) > 1e-5);
    onsets.push(index / RATE);
  }
  return [...new Set(onsets.map((t) => Math.round(t * 1000) / 1000))].sort(
    (a, b) => a - b,
  );
}

describe("R9 rhythms (offline render)", () => {
  it.each(RHYTHM_IDS.map((id) => [id]))(
    "%s sounds at the R9 times within 5 ms",
    async (id) => {
      const onsets = await renderOnsets(id);
      const expected = [
        ...new Set(R9_BEATS[id].map((b) => beatsToSeconds(b, BPM))),
      ];
      expect(onsets).toHaveLength(expected.length);
      onsets.forEach((t, i) =>
        expect(Math.abs(t - (expected[i] ?? -1))).toBeLessThan(0.005),
      );
    },
  );
});
