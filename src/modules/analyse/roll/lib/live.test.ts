import { describe, expect, it } from "vitest";
import { LiveAnalysis, R20 } from "./live";
import { frequencyOfMidi } from "./salience";

const SR = 48_000;
const FPS = 60;

/** An analyser dB frame with one partial per entry. */
function dbFrame(partials: { hz: number; amp: number }[]): Float32Array {
  const db = new Float32Array(R20.fftSize / 2).fill(-200);
  const binWidth = SR / R20.fftSize;
  for (const p of partials)
    db[Math.round(p.hz / binWidth)] = 20 * Math.log10(p.amp);
  return db;
}

function sineWave(hz: number, amp: number, t: number): Float32Array {
  const wave = new Float32Array(2048);
  for (let i = 0; i < wave.length; i++)
    wave[i] = amp * Math.sin(2 * Math.PI * hz * (t + i / SR));
  return wave;
}

/** Feeds `seconds` of frames at 60 fps; the tone sounds from `on` to `off`. */
function run(
  analysis: LiveAnalysis,
  midi: number,
  on: number,
  off: number,
  seconds: number,
) {
  const hz = frequencyOfMidi(midi);
  const frames = Math.round(seconds * FPS);
  for (let i = 0; i < frames; i++) {
    const t = i / FPS;
    const sounding = t >= on && t < off;
    analysis.push({
      t,
      db: dbFrame(sounding ? [{ hz, amp: 0.2 }] : []),
      wave: sounding ? sineWave(hz, 0.3, t) : new Float32Array(2048),
    });
  }
  analysis.finish(frames / FPS);
}

describe("U20: live microphone notes have real lengths", () => {
  it("polyphonic (R20): one note as long as the tone, not 0.15 s", () => {
    const live = new LiveAnalysis("poly", SR);
    run(live, 69, 0.5, 1.3, 2);
    const notes = live.notes();
    expect(notes).toHaveLength(1);
    expect(notes[0]?.midi).toBe(69);
    expect(notes[0]?.start).toBeCloseTo(0.5, 1);
    expect(notes[0]?.duration).toBeCloseTo(0.8, 1);
    expect(notes[0]?.velocity).toBe(127);
  });

  it("monophonic (pitchy): one note as long as the tone", () => {
    const live = new LiveAnalysis("mono", SR);
    run(live, 64, 0.2, 0.9, 1.5);
    const notes = live.notes();
    expect(notes).toHaveLength(1);
    expect(notes[0]?.midi).toBe(64);
    expect(notes[0]?.duration).toBeCloseTo(0.7, 1);
  });

  it("a tone that is still sounding at stop ends at the stop time", () => {
    const live = new LiveAnalysis("poly", SR);
    run(live, 60, 0.1, 99, 1);
    expect(live.notes()[0]?.duration).toBeCloseTo(0.9, 1);
  });

  it("the heatmap keeps the real frame times (60 frames/s, not 24)", () => {
    const live = new LiveAnalysis("poly", SR);
    run(live, 69, 0, 1, 1);
    expect(live.heatmap.count).toBe(60);
    expect(live.heatmap.times[30]).toBeCloseTo(0.5, 9);
    expect(live.heatmap.frameSeconds).toBeCloseTo(1 / 60, 9);
  });

  it("a new capture starts with no notes and no heatmap", () => {
    const first = new LiveAnalysis("poly", SR);
    run(first, 69, 0, 1, 1);
    const second = new LiveAnalysis("poly", SR);
    expect(second.notes()).toEqual([]);
    expect(second.heatmap.count).toBe(0);
  });

  it("F244: notes louder than 50 % are reported for the palette", () => {
    const live = new LiveAnalysis("poly", SR);
    const hz = frequencyOfMidi(67);
    const result = live.push({
      t: 0,
      db: dbFrame([{ hz, amp: 0.2 }]),
      wave: new Float32Array(0),
    });
    expect(result.loud).toEqual([7]);
  });
});
