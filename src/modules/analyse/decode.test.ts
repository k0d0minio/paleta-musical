import { describe, expect, it } from "vitest";
import { AbortError } from "@/analysis";
import { C_MAJOR, render } from "../../../tests/fixtures/audio";
import { analysisLimitSeconds, decodeBytes, type Decoder } from "./decode";
import { chordsOverTime } from "./results";
import { startAnalysis } from "./run";

/** A decoder like decodeAudioData: it detaches (transfers) the buffer it gets. */
function detachingDecoder(fail: boolean): Decoder {
  return {
    async decodeAudioData(bytes) {
      structuredClone(bytes, { transfer: [bytes] });
      if (fail) throw new Error("EncodingError");
      return { duration: 1 } as AudioBuffer;
    },
  };
}

describe("decode (U34)", () => {
  it("gives each attempt its own copy of the bytes", async () => {
    const bytes = new Uint8Array([1, 2, 3, 4]).buffer;
    const seen: number[] = [];
    const record = (fail: boolean): Decoder => ({
      async decodeAudioData(b) {
        seen.push(b.byteLength);
        return detachingDecoder(fail).decodeAudioData(b);
      },
    });
    const buffer = await decodeBytes(bytes, [
      () => record(true),
      () => record(false),
    ]);
    expect(buffer.duration).toBe(1);
    // The second attempt got intact bytes, and the original is still intact.
    expect(seen).toEqual([4, 4]);
    expect(bytes.byteLength).toBe(4);
  });

  it("throws the last error when every attempt fails, and a later file still decodes", async () => {
    const bytes = new Uint8Array([1, 2]).buffer;
    await expect(
      decodeBytes(bytes, [() => detachingDecoder(true)]),
    ).rejects.toThrow("EncodingError");
    await expect(
      decodeBytes(bytes, [() => detachingDecoder(false)]),
    ).resolves.toBeDefined();
  });
});

describe("analysis limits", () => {
  it("analyses the first 2 minutes on a low-memory device or iOS", () => {
    expect(analysisLimitSeconds({ ios: true })).toBe(120);
    expect(analysisLimitSeconds({ ios: false, deviceMemory: 2 })).toBe(120);
    expect(analysisLimitSeconds({ ios: false, deviceMemory: 8 })).toBe(1200);
    expect(analysisLimitSeconds({ ios: false })).toBe(1200);
  });
});

describe("main-thread fallback (no Web Workers)", () => {
  it("runs the analysis in chunks and reports progress", async () => {
    const steps = new Set<string>();
    const job = startAnalysis(
      [render(C_MAJOR, { sampleRate: 22050 })],
      22050,
      (step) => steps.add(step),
      { workers: false },
    );
    expect(job.where).toBe("main");
    const result = await job.promise;
    expect(result.scales[0]).toMatchObject({ root: 0, scale: "major" });
    expect([...steps]).toEqual(["chroma", "scales", "chords", "sections"]);
  });

  it("stops on cancel", async () => {
    const job = startAnalysis(
      [render(C_MAJOR, { sampleRate: 22050 })],
      22050,
      () => undefined,
      { workers: false },
    );
    job.cancel();
    await expect(job.promise).rejects.toBeInstanceOf(AbortError);
  });
});

describe("chords over time", () => {
  it("merges equal neighbouring chords for the timeline", () => {
    const c = { root: 0, type: "major", coverage: 1, score: 3 } as const;
    const g = { root: 7, type: "major", coverage: 1, score: 3 } as const;
    const section = (chord: typeof c | typeof g | null) => ({
      start: 0,
      end: 1,
      scale: null,
      chord,
    });
    expect(
      chordsOverTime([
        section(c),
        section(c),
        section(null),
        section(g),
        section(c),
      ]),
    ).toEqual([c, g, c]);
  });
});
