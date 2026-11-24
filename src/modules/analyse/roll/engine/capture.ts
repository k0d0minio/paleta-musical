import { LiveAnalysis, R20 } from "../lib/live";
import type { MicMode } from "../lib/model";

export interface CaptureDeps {
  getUserMedia(constraints: MediaStreamConstraints): Promise<MediaStream>;
  createContext(): AudioContext;
  requestFrame(callback: () => void): number;
  cancelFrame(handle: number): void;
}

function browserDeps(): CaptureDeps {
  return {
    getUserMedia: (c) => navigator.mediaDevices.getUserMedia(c),
    createContext: () => new AudioContext({ latencyHint: "interactive" }),
    requestFrame: (cb) => requestAnimationFrame(cb),
    cancelFrame: (h) => cancelAnimationFrame(h),
  };
}

/** F241: no echo cancellation, no noise suppression, no auto gain. */
export const MIC_CONSTRAINTS: MediaStreamConstraints = {
  audio: {
    echoCancellation: false,
    noiseSuppression: false,
    autoGainControl: false,
  },
  video: false,
};

export interface Capture {
  readonly analysis: LiveAnalysis;
  /** The latest analyser frame in dB (F243 live spectrum). */
  readonly spectrum: Float32Array;
  readonly sampleRate: number;
  /** Seconds since the capture started (real audio clock). */
  now(): number;
  /** Stops the microphone, closes its stream and its audio context (U17, U20). Idempotent. */
  stop(): Promise<void>;
  readonly stopped: boolean;
}

/**
 * Starts a live microphone capture. Every animation frame feeds the R20
 * analysis with the real frame time (U20) and calls `onFrame`. A capture owns
 * its own AudioContext, so stopping it releases every audio resource.
 */
export async function startCapture(
  mode: MicMode,
  onFrame: (loud: readonly number[], t: number) => void,
  deps: CaptureDeps = browserDeps(),
): Promise<Capture> {
  const stream = await deps.getUserMedia(MIC_CONSTRAINTS);
  let ctx: AudioContext;
  try {
    ctx = deps.createContext();
  } catch (error) {
    for (const track of stream.getTracks()) track.stop();
    throw error;
  }
  const source = ctx.createMediaStreamSource(stream);
  const analyser = ctx.createAnalyser();
  analyser.fftSize = R20.fftSize;
  analyser.smoothingTimeConstant = R20.smoothing;
  source.connect(analyser);
  if (ctx.state !== "running") await ctx.resume().catch(() => undefined);

  const analysis = new LiveAnalysis(mode, ctx.sampleRate);
  const spectrum = new Float32Array(analyser.frequencyBinCount);
  const wave = new Float32Array(2048);
  const t0 = ctx.currentTime;
  let frame = 0;
  let stopped = false;
  let lastT = -1;

  const tick = () => {
    if (stopped) return;
    const t = ctx.currentTime - t0;
    // The audio clock moves in render quanta; skip a frame with no new audio.
    if (t > lastT) {
      lastT = t;
      analyser.getFloatFrequencyData(spectrum);
      analyser.getFloatTimeDomainData(wave);
      const { loud } = analysis.push({ t, db: spectrum, wave });
      onFrame(loud, t);
    }
    frame = deps.requestFrame(tick);
  };
  frame = deps.requestFrame(tick);

  return {
    analysis,
    spectrum,
    sampleRate: ctx.sampleRate,
    now: () => Math.max(0, ctx.currentTime - t0),
    get stopped() {
      return stopped;
    },
    async stop() {
      if (stopped) return;
      stopped = true;
      deps.cancelFrame(frame);
      analysis.finish(Math.max(lastT, ctx.currentTime - t0));
      for (const track of stream.getTracks()) track.stop();
      try {
        source.disconnect();
        analyser.disconnect();
      } catch {
        // Already disconnected.
      }
      if (ctx.state !== "closed") await ctx.close().catch(() => undefined);
    },
  };
}
