/**
 * Capability detection. Every check is safe on the server (returns false) and
 * never throws. A feature that needs a capability shows a notice in its place
 * when the browser cannot run it (`<Requires>`).
 */
export const CAPABILITIES = [
  "webAudio",
  "audioWorklet",
  "offlineAudio",
  "getUserMedia",
  "webWorkers",
  "indexedDB",
  "storagePersist",
  "shareFiles",
  "finePointer",
  "audioSession",
  "webGL",
] as const;

export type Capability = (typeof CAPABILITIES)[number];

interface AudioSessionLike {
  type: string;
}

export function getAudioSession(): AudioSessionLike | undefined {
  if (typeof navigator === "undefined") return undefined;
  return (navigator as Navigator & { audioSession?: AudioSessionLike }).audioSession;
}

function safe(check: () => boolean): boolean {
  try {
    return check();
  } catch {
    return false;
  }
}

const CHECKS: Record<Capability, () => boolean> = {
  webAudio: () => typeof window !== "undefined" && typeof window.AudioContext === "function",
  audioWorklet: () =>
    typeof window !== "undefined" &&
    typeof window.AudioContext === "function" &&
    "audioWorklet" in window.AudioContext.prototype,
  offlineAudio: () => typeof window !== "undefined" && typeof window.OfflineAudioContext === "function",
  getUserMedia: () => typeof navigator !== "undefined" && !!navigator.mediaDevices?.getUserMedia,
  webWorkers: () => typeof Worker === "function",
  indexedDB: () => typeof indexedDB !== "undefined" && indexedDB !== null,
  storagePersist: () => typeof navigator !== "undefined" && typeof navigator.storage?.persist === "function",
  shareFiles: () => {
    if (typeof navigator === "undefined" || typeof navigator.canShare !== "function") return false;
    const probe = new File([""], "probe.mid", { type: "audio/midi" });
    return navigator.canShare({ files: [probe] });
  },
  finePointer: () => typeof window !== "undefined" && window.matchMedia("(hover: hover) and (pointer: fine)").matches,
  audioSession: () => getAudioSession() !== undefined,
  webGL: () => {
    if (typeof document === "undefined") return false;
    const canvas = document.createElement("canvas");
    return !!(canvas.getContext("webgl2") ?? canvas.getContext("webgl"));
  },
};

export function hasCapability(capability: Capability): boolean {
  return safe(CHECKS[capability]);
}

export function detectCapabilities(): Record<Capability, boolean> {
  return Object.fromEntries(CAPABILITIES.map((c) => [c, hasCapability(c)])) as Record<Capability, boolean>;
}

/** iOS and iPadOS (all their browsers are WebKit). */
export function isIOS(): boolean {
  return safe(() => {
    if (typeof navigator === "undefined") return false;
    const ua = navigator.userAgent;
    return /iPad|iPhone|iPod/.test(ua) || (ua.includes("Macintosh") && navigator.maxTouchPoints > 1);
  });
}

/**
 * iOS 17+: the "playback" audio session plays sound even when the silent
 * switch is on. Returns false when the API does not exist.
 */
export function configureAudioSession(): boolean {
  return safe(() => {
    const session = getAudioSession();
    if (!session) return false;
    session.type = "playback";
    return true;
  });
}
