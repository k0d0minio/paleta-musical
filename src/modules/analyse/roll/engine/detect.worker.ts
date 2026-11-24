import { expose, transfer } from "comlink";
import { detectNotes } from "../lib/detect";

/** R19 detection off the main thread (F238). */
const api = {
  detect(
    samples: Float32Array,
    sampleRate: number,
    onProgress: (percent: number) => void,
  ) {
    const result = detectNotes(samples, sampleRate, (p) => void onProgress(p));
    return transfer(result, [
      result.heatmap.times.buffer as ArrayBuffer,
      result.heatmap.values.buffer as ArrayBuffer,
    ]);
  },
};

export type DetectWorkerApi = typeof api;

expose(api);
