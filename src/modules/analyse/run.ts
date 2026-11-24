import * as Comlink from "comlink";
import {
  AbortError,
  analyseSignal,
  mixToMono,
  type AnalysisResult,
  type AnalysisStep,
} from "@/analysis";
import type { AnalysisWorkerApi } from "./analysis.worker";

export interface AnalysisJob {
  readonly promise: Promise<AnalysisResult>;
  /** Stops the job: terminates the worker (or aborts the main-thread run). The promise rejects with an AbortError. */
  cancel(): void;
  /** "worker" or "main" (no Web Workers: the analysis runs on the page in chunks). */
  readonly where: "worker" | "main";
}

export type ProgressListener = (step: AnalysisStep, fraction: number) => void;

function createWorker(): Worker {
  return new Worker(new URL("./analysis.worker.ts", import.meta.url), {
    type: "module",
    name: "analysis",
  });
}

/** Runs the pipeline in a Web Worker. The channel buffers are transferred (not copied). */
function inWorker(
  channels: Float32Array[],
  sampleRate: number,
  onProgress: ProgressListener,
  factory: () => Worker,
): AnalysisJob {
  const worker = factory();
  const api = Comlink.wrap<AnalysisWorkerApi>(worker);
  let rejectCancel: (reason: unknown) => void = () => undefined;
  const cancelled = new Promise<never>((_, reject) => {
    rejectCancel = reject;
  });
  let done = false;
  const finish = () => {
    if (done) return;
    done = true;
    api[Comlink.releaseProxy]();
    worker.terminate();
  };
  const failed = new Promise<never>((_, reject) => {
    worker.addEventListener("error", (event) => {
      reject(new Error(event.message || "Analysis worker error"));
    });
  });
  const run = api.analyse(
    Comlink.transfer(
      channels,
      channels.map((c) => c.buffer as ArrayBuffer),
    ),
    sampleRate,
    Comlink.proxy(onProgress),
  );
  const promise = Promise.race([run, cancelled, failed]).finally(finish);
  return {
    promise,
    where: "worker",
    cancel() {
      if (done) return;
      rejectCancel(new AbortError());
      finish();
    },
  };
}

/** The fallback without Web Workers: the same pipeline on the main thread, yielding to the page between frames. */
function onMainThread(
  channels: Float32Array[],
  sampleRate: number,
  onProgress: ProgressListener,
): AnalysisJob {
  const signal = { aborted: false };
  const promise = (async () => {
    // Let the status render before the first frame.
    await new Promise((r) => setTimeout(r, 0));
    return analyseSignal(mixToMono(channels), sampleRate, {
      onProgress,
      signal,
      yieldControl: () => new Promise((r) => setTimeout(r, 0)),
    });
  })();
  return {
    promise,
    where: "main",
    cancel() {
      signal.aborted = true;
    },
  };
}

/** Starts an analysis: in a Web Worker when the browser has them, else on the main thread in chunks. */
export function startAnalysis(
  channels: Float32Array[],
  sampleRate: number,
  onProgress: ProgressListener,
  options: { workers: boolean; createWorker?: () => Worker } = {
    workers: typeof Worker === "function",
  },
): AnalysisJob {
  if (options.workers) {
    try {
      return inWorker(
        channels,
        sampleRate,
        onProgress,
        options.createWorker ?? createWorker,
      );
    } catch {
      // A worker that cannot start (CSP, old browser): run on the page.
    }
  }
  return onMainThread(channels, sampleRate, onProgress);
}
