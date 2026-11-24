import { proxy, transfer, wrap } from "comlink";
import { detectNotes, mixToMono, type DetectResult } from "../lib/detect";
import type { DetectWorkerApi } from "./detect.worker";

/** The part of an AudioBuffer the detector reads. */
export interface AudioLike {
  readonly numberOfChannels: number;
  readonly sampleRate: number;
  getChannelData(channel: number): Float32Array;
}

/**
 * Runs R19 on the decoded file in a Web Worker (comlink), with progress
 * 5–95 %. Without worker support it runs on the main thread.
 */
export async function runDetection(
  buffer: AudioLike,
  onProgress: (percent: number) => void,
): Promise<DetectResult> {
  const channels = Array.from({ length: buffer.numberOfChannels }, (_, i) =>
    buffer.getChannelData(i),
  );
  const mono = mixToMono(channels);
  if (typeof Worker !== "function") {
    return detectNotes(mono, buffer.sampleRate, onProgress);
  }
  const worker = new Worker(new URL("./detect.worker.ts", import.meta.url), {
    type: "module",
  });
  try {
    const api = wrap<DetectWorkerApi>(worker);
    return await api.detect(
      transfer(mono, [mono.buffer as ArrayBuffer]),
      buffer.sampleRate,
      proxy(onProgress),
    );
  } finally {
    worker.terminate();
  }
}
