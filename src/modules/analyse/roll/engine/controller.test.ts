import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { audioEngine } from "@/audio";
import type * as PlatformModule from "@/platform";
import { defaultData, useAppStore } from "@/state";
import { setDecodedFile } from "../../decoded-file";
import { frequencyOfMidi } from "../lib/salience";
import { drawNote } from "../lib/edit";
import { getRollDoc, setRollDoc } from "../state";
import type { CaptureDeps } from "./capture";
import {
  analyseFile,
  exportMidi,
  registerStopAll,
  startMic,
  stopEverything,
  stopMic,
} from "./controller";
import { initialSession, session, useRollSession } from "./session";

vi.mock("@/platform", async (original) => ({
  ...(await original<typeof PlatformModule>()),
  shareOrDownload: vi.fn(async () => "downloaded"),
}));

const SR = 22_050;

/** An AudioBuffer generated in code: four tones, 0.5 s apart. */
function fakeBuffer() {
  const length = SR * 2.4;
  const data = new Float32Array(length);
  [60, 64, 67, 72].forEach((midi, i) => {
    const f = frequencyOfMidi(midi);
    const from = Math.round((0.1 + i * 0.5) * SR);
    for (let k = 0; k < 0.4 * SR; k++)
      data[from + k] = 0.4 * Math.sin((2 * Math.PI * f * k) / SR);
  });
  return {
    numberOfChannels: 1,
    sampleRate: SR,
    length,
    duration: length / SR,
    getChannelData: () => data,
  } as unknown as AudioBuffer;
}

/** A fake microphone: a stream, an audio context and a manual frame clock. */
function fakeMic() {
  const track = { stop: vi.fn() };
  const frames: (() => void)[] = [];
  let time = 0;
  const ctx = {
    sampleRate: 48_000,
    state: "running" as AudioContextState,
    get currentTime() {
      return time;
    },
    resume: vi.fn(async () => undefined),
    close: vi.fn(async () => {
      ctx.state = "closed";
    }),
    createMediaStreamSource: () => ({ connect: vi.fn(), disconnect: vi.fn() }),
    createAnalyser: () => ({
      fftSize: 2048,
      smoothingTimeConstant: 0.8,
      frequencyBinCount: 2048,
      connect: vi.fn(),
      disconnect: vi.fn(),
      getFloatFrequencyData: (out: Float32Array) => {
        out.fill(-200);
        // A4 (440 Hz) sounds from 0.2 s to 0.8 s.
        if (time >= 0.2 && time < 0.8)
          out[Math.round(440 / (48_000 / 4096))] = -14;
      },
      getFloatTimeDomainData: (out: Float32Array) => out.fill(0),
    }),
  };
  const deps: CaptureDeps = {
    getUserMedia: vi.fn(
      async () => ({ getTracks: () => [track] }) as unknown as MediaStream,
    ),
    createContext: () => ctx as unknown as AudioContext,
    requestFrame: (cb) => frames.push(cb),
    cancelFrame: vi.fn(),
  };
  const advance = (seconds: number) => {
    const end = time + seconds;
    while (time < end) {
      time += 1 / 60;
      frames.shift()?.();
    }
  };
  return { deps, track, ctx, advance };
}

beforeEach(() => {
  useAppStore.getState().replaceData(defaultData());
  useAppStore.temporal.getState().clear();
  useRollSession.setState(initialSession());
  setDecodedFile(null);
});
afterEach(() => vi.useRealTimers());

describe("file analysis (F237–F240), no decoding in the roll", () => {
  it("F240: no decoded file → the buffer error", async () => {
    await analyseFile();
    expect(session.get().status).toMatchObject({
      key: "noBuffer",
      error: true,
    });
  });

  it("detects the notes of a generated AudioBuffer and replaces the roll", async () => {
    setRollDoc({ notes: [drawNote(40, 0, 120)] });
    setDecodedFile({ name: "test.wav", sizeBytes: 1, buffer: fakeBuffer() });
    const progress: number[] = [];
    const off = useRollSession.subscribe(
      (s) => s.progress !== null && progress.push(s.progress),
    );
    await analyseFile();
    off();
    const doc = getRollDoc();
    expect(doc.notes.map((n) => n.midi)).toEqual([60, 64, 67, 72]);
    // R19 BPM: 0.5 s apart, within the frame resolution.
    expect(Math.abs(doc.bpm - 120)).toBeLessThanOrEqual(5);
    expect(doc.duration).toBeCloseTo(2.4, 3);
    expect(progress[0]).toBe(5);
    expect(progress).toContain(100);
    expect(session.get().status).toMatchObject({
      key: "detected",
      values: { n: 4, bpm: doc.bpm },
    });
    expect(session.get().view).toEqual({ start: 0, end: 2.4 });
    expect(session.get().heatmap?.count).toBeGreaterThan(10);
  });
});

describe("U20 and U17: microphone capture", () => {
  it("captures notes with real lengths and closes its audio resources on stop", async () => {
    const mic = fakeMic();
    await startMic("poly", mic.deps);
    expect(session.get().busy).toBe("capturing");
    mic.advance(1.2);
    const n = await stopMic();
    expect(n).toBe(1);
    const [note] = getRollDoc().notes;
    expect(note?.midi).toBe(69);
    expect(note?.duration).toBeGreaterThan(0.5);
    expect(note?.duration).toBeLessThan(0.7);
    expect(mic.track.stop).toHaveBeenCalled();
    expect(mic.ctx.close).toHaveBeenCalled();
    expect(mic.deps.cancelFrame).toHaveBeenCalled();
    expect(session.get().status).toMatchObject({
      key: "captureStopped",
      values: { n: 1 },
    });
  });

  it("a new capture starts with no live data (U20) and is one undo step", async () => {
    setRollDoc({ notes: [drawNote(50, 0, 120)] });
    const mic = fakeMic();
    await startMic("poly", mic.deps);
    expect(session.get().heatmap?.count).toBe(0);
    mic.advance(1);
    await stopMic();
    expect(getRollDoc().notes.map((x) => x.midi)).toEqual([69]);
    useAppStore.temporal.getState().undo();
    expect(getRollDoc().notes.map((x) => x.midi)).toEqual([50]);
  });

  it("U17: stop-all (leaving the module, Esc) stops the microphone", async () => {
    const off = registerStopAll();
    const mic = fakeMic();
    await startMic("mono", mic.deps);
    audioEngine.stopAll();
    await vi.waitFor(() => expect(mic.ctx.close).toHaveBeenCalled());
    expect(mic.track.stop).toHaveBeenCalled();
    expect(session.get().capture).toBeNull();
    off();
  });

  it("U17: leaving during the permission prompt releases the microphone", async () => {
    const mic = fakeMic();
    let resolve: (s: MediaStream) => void = () => undefined;
    mic.deps.getUserMedia = () => new Promise((r) => (resolve = r));
    const started = startMic("poly", mic.deps);
    await stopEverything();
    resolve({ getTracks: () => [mic.track] } as unknown as MediaStream);
    await started;
    expect(mic.track.stop).toHaveBeenCalled();
    expect(session.get().capture).toBeNull();
  });

  it("F242: a refusal shows the denied status", async () => {
    const mic = fakeMic();
    mic.deps.getUserMedia = async () => {
      throw new DOMException("Permission denied", "NotAllowedError");
    };
    await startMic("poly", mic.deps);
    expect(session.get().status).toMatchObject({
      key: "micDenied",
      values: { message: "Permission denied" },
      error: true,
    });
  });
});

describe("F263: MIDI export", () => {
  it("with no notes, nothing is exported", async () => {
    expect(await exportMidi()).toEqual({ kind: "empty" });
  });
  it("exports the notes and reports the count and BPM", async () => {
    setRollDoc({
      notes: [drawNote(60, 0, 120), drawNote(64, 1, 120)],
      bpm: 95,
    });
    expect(await exportMidi()).toEqual({ kind: "downloaded", n: 2, bpm: 95 });
  });
});
