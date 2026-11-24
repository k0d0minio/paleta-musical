import * as Comlink from "comlink";
import {
  analyseSignal,
  mixToMono,
  type AnalysisResult,
  type AnalysisStep,
} from "@/analysis";

/** The worker side of the analysis: no AudioContext here, only the channel data and its sample rate (U23). */
const api = {
  async analyse(
    channels: Float32Array[],
    sampleRate: number,
    onProgress: (step: AnalysisStep, fraction: number) => void,
  ): Promise<AnalysisResult> {
    let last = 0;
    return analyseSignal(mixToMono(channels), sampleRate, {
      // Throttle the progress messages to the main thread (~20 per second).
      onProgress: (step, fraction) => {
        const now = performance.now();
        if (fraction === 0 || fraction === 1 || now - last > 50) {
          last = now;
          onProgress(step, fraction);
        }
      },
    });
  },
};

export type AnalysisWorkerApi = typeof api;

Comlink.expose(api);
