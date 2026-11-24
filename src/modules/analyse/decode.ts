/** Something that decodes audio bytes: an AudioContext or an OfflineAudioContext. */
export interface Decoder {
  decodeAudioData(bytes: ArrayBuffer): Promise<AudioBuffer>;
}

/** Sample rate of the fallback decoder when the app has no AudioContext yet. */
export const FALLBACK_DECODE_RATE = 44100;

/**
 * The decoders to try, in order: the shared AudioContext of the engine (when
 * it exists), then an OfflineAudioContext, which decodes without a user
 * gesture (a dropped file, a reload).
 */
export function defaultDecoders(
  shared: AudioContext | null,
): (() => Decoder)[] {
  const out: (() => Decoder)[] = [];
  if (shared) out.push(() => shared);
  if (typeof OfflineAudioContext === "function") {
    out.push(
      () =>
        new OfflineAudioContext({
          numberOfChannels: 1,
          length: 1,
          sampleRate: FALLBACK_DECODE_RATE,
        }),
    );
  }
  return out;
}

/**
 * F213 decode. Each attempt gets its own copy of the file bytes, because
 * decodeAudioData detaches the buffer it gets: a failed first attempt must
 * not break the next one (U34). Throws the last error when every attempt fails.
 */
export async function decodeBytes(
  bytes: ArrayBuffer,
  decoders: readonly (() => Decoder)[],
): Promise<AudioBuffer> {
  let lastError: unknown = new Error("No audio decoder in this browser");
  for (const make of decoders) {
    try {
      return await make().decodeAudioData(bytes.slice(0));
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

/** The formats (of F207) that this browser says it can play. */
export function playableFormats(): string[] {
  if (typeof document === "undefined") return [];
  const probe = document.createElement("audio");
  const types: [string, string][] = [
    ["mp3", "audio/mpeg"],
    ["wav", "audio/wav"],
    ["ogg", "audio/ogg"],
    ["m4a", "audio/mp4"],
    ["aac", "audio/aac"],
    ["flac", "audio/flac"],
  ];
  return types
    .filter(([, mime]) => {
      try {
        return probe.canPlayType(mime) !== "";
      } catch {
        return false;
      }
    })
    .map(([ext]) => ext);
}

/** F207: what the file picker accepts. */
export const ACCEPT = "audio/*,.mp3,.wav,.ogg,.m4a,.aac,.flac";

/**
 * Low memory: on a device with ≤ 2 GB (navigator.deviceMemory) or on iOS
 * (no deviceMemory; WebKit kills tabs that use much memory), the analysis
 * reads the first 2 minutes only and says so. Elsewhere the cap is 20 minutes.
 */
export function analysisLimitSeconds(env: {
  deviceMemory?: number;
  ios: boolean;
}): number {
  const low =
    env.ios || (env.deviceMemory !== undefined && env.deviceMemory <= 2);
  return low ? 120 : 1200;
}
