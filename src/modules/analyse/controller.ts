"use client";

import { create } from "zustand";
import { AbortError, type AnalysisStep } from "@/analysis";
import { audioEngine } from "@/audio";
import { hasCapability, isIOS } from "@/platform";
import { getDecodedFile, setDecodedFile } from "./decoded-file";
import { analysisLimitSeconds, decodeBytes, defaultDecoders } from "./decode";
import {
  deleteFileBytes,
  loadFileBytes,
  saveFileBytes,
  saveLastAnalysis,
  type FileMeta,
  type Region,
} from "./persist";
import { startAnalysis, type AnalysisJob } from "./run";

/** F211, F212: what the module is doing now. */
export type Phase =
  | { kind: "idle" }
  | { kind: "reading"; name: string }
  | { kind: "decoding"; name: string }
  | { kind: "analysing"; step: AnalysisStep; progress: number }
  | { kind: "cancelled" }
  | { kind: "error"; reason: "read" | "decode" | "analysis"; message: string };

interface AnalyseRuntime {
  phase: Phase;
  /** The file in memory (decoded), or the stored file meta after a reload. */
  file: FileMeta | null;
  /** A blob URL of the file bytes, for waveform playback. */
  fileUrl: string | null;
  /** The region the user selected (seconds), or null for the whole file. */
  region: Region | null;
  /** The last run had no Web Worker and ran on the page. */
  mainThread: boolean;
  /** After a reload: the stored file is being decoded again, or it is missing. */
  restore: "none" | "pending" | "missing";
}

export const useAnalyseRuntime = create<AnalyseRuntime>(() => ({
  phase: { kind: "idle" },
  file: null,
  fileUrl: null,
  region: null,
  mainThread: false,
  restore: "none",
}));

const set = useAnalyseRuntime.setState;
let job: AnalysisJob | null = null;
/** Increments on each new load, so a stale decode does not overwrite a newer file. */
let generation = 0;

/** Weight of each step in the one progress bar. */
const STEP_SPAN: Record<AnalysisStep, [number, number]> = {
  chroma: [0, 0.45],
  scales: [0.45, 0.5],
  chords: [0.5, 0.55],
  sections: [0.55, 1],
};

function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  if (error && typeof error === "object" && "name" in error)
    return String((error as { name: unknown }).name);
  return String(error);
}

function setFileUrl(bytes: ArrayBuffer | null, type: string): void {
  const previous = useAnalyseRuntime.getState().fileUrl;
  if (previous) URL.revokeObjectURL(previous);
  set({
    fileUrl: bytes ? URL.createObjectURL(new Blob([bytes], { type })) : null,
  });
}

function metaOf(
  name: string,
  sizeBytes: number,
  buffer: AudioBuffer,
): FileMeta {
  return {
    name,
    sizeBytes,
    duration: buffer.duration,
    sampleRate: buffer.sampleRate,
  };
}

/** Stops the running analysis (F211 cancel; also on leaving the module). */
export function cancelAnalysis(): void {
  if (!job) return;
  job.cancel();
  job = null;
}

/** F207, F208: read, decode, publish the decoded file, keep the bytes, then analyse the whole file. */
export async function loadFile(file: File): Promise<void> {
  cancelAnalysis();
  const mine = ++generation;
  set({ phase: { kind: "reading", name: file.name }, region: null });
  let bytes: ArrayBuffer;
  try {
    bytes = await file.arrayBuffer();
  } catch (error) {
    if (mine === generation)
      set({
        phase: { kind: "error", reason: "read", message: errorMessage(error) },
      });
    return;
  }
  if (mine !== generation) return;
  set({ phase: { kind: "decoding", name: file.name } });
  let buffer: AudioBuffer;
  try {
    buffer = await decodeBytes(bytes, defaultDecoders(audioEngine.context));
  } catch (error) {
    if (mine === generation)
      set({
        phase: {
          kind: "error",
          reason: "decode",
          message: errorMessage(error),
        },
      });
    return;
  }
  if (mine !== generation) return;
  setDecodedFile({ name: file.name, sizeBytes: file.size, buffer });
  setFileUrl(bytes, file.type);
  set({ file: metaOf(file.name, file.size, buffer), restore: "none" });
  void saveFileBytes({ name: file.name, type: file.type, bytes });
  await analyse(null);
}

/** Runs the pipeline on the decoded file, or on a region of it. */
export async function analyse(region: Region | null): Promise<void> {
  const decoded = getDecodedFile();
  const meta = useAnalyseRuntime.getState().file;
  if (!decoded || !meta) return;
  cancelAnalysis();
  const { buffer } = decoded;
  const limit = analysisLimitSeconds({
    ios: isIOS(),
    deviceMemory: (navigator as Navigator & { deviceMemory?: number })
      .deviceMemory,
  });
  const start = region ? Math.max(0, region.start) : 0;
  const wanted = region
    ? Math.min(buffer.duration, region.end)
    : buffer.duration;
  const end = Math.min(wanted, start + limit);
  const from = Math.floor(start * buffer.sampleRate);
  const to = Math.max(from, Math.floor(end * buffer.sampleRate));
  const channels = Array.from({ length: buffer.numberOfChannels }, (_, c) =>
    buffer.getChannelData(c).slice(from, to),
  );

  set({
    region,
    phase: { kind: "analysing", step: "chroma", progress: 0 },
  });
  const current = startAnalysis(
    channels,
    buffer.sampleRate,
    (step, fraction) => {
      if (job !== current) return;
      const [a, b] = STEP_SPAN[step];
      set({
        phase: { kind: "analysing", step, progress: a + (b - a) * fraction },
      });
    },
    { workers: hasCapability("webWorkers") },
  );
  job = current;
  set({ mainThread: current.where === "main" });
  try {
    const result = await current.promise;
    if (job !== current) return;
    job = null;
    saveLastAnalysis({
      file: meta,
      range: { start, end },
      isRegion: region !== null,
      truncated: wanted - start > limit,
      result,
    });
    set({ phase: { kind: "idle" } });
  } catch (error) {
    if (job === current) job = null;
    if (error instanceof AbortError) {
      if (useAnalyseRuntime.getState().phase.kind === "analysing")
        set({ phase: { kind: "cancelled" } });
      return;
    }
    set({
      phase: {
        kind: "error",
        reason: "analysis",
        message: errorMessage(error),
      },
    });
  }
}

/** The user cancels: the worker stops and the status says so. */
export function cancelByUser(): void {
  if (!job) return;
  cancelAnalysis();
  set({ phase: { kind: "cancelled" } });
}

/** F215: discard the result and the file. */
export function discard(): void {
  cancelAnalysis();
  generation += 1;
  setDecodedFile(null);
  setFileUrl(null, "");
  set({ phase: { kind: "idle" }, file: null, region: null, restore: "none" });
  saveLastAnalysis(null);
  void deleteFileBytes();
}

export function setRegion(region: Region | null): void {
  set({ region });
}

/**
 * After a reload: the result is in the store, the decoded file is not. Decode
 * the stored bytes again (no user gesture needed) so the waveform and the
 * piano roll have the file.
 */
export async function restoreFile(meta: FileMeta): Promise<void> {
  if (getDecodedFile() || useAnalyseRuntime.getState().restore === "pending")
    return;
  const mine = ++generation;
  set({ restore: "pending", file: meta });
  const stored = await loadFileBytes();
  if (mine !== generation) return;
  if (!stored) {
    set({ restore: "missing" });
    return;
  }
  try {
    const buffer = await decodeBytes(
      stored.bytes,
      defaultDecoders(audioEngine.context),
    );
    if (mine !== generation) return;
    setDecodedFile({
      name: stored.name,
      sizeBytes: stored.bytes.byteLength,
      buffer,
    });
    setFileUrl(stored.bytes, stored.type);
    set({
      restore: "none",
      file: metaOf(stored.name, stored.bytes.byteLength, buffer),
    });
  } catch {
    if (mine === generation) set({ restore: "missing" });
  }
}
