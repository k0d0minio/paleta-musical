/** Seconds as m:ss.s (e.g. 1:05.3). */
export function formatTime(seconds: number): string {
  const s = Math.max(0, seconds);
  const m = Math.floor(s / 60);
  const rest = s - m * 60;
  return `${m}:${rest.toFixed(1).padStart(4, "0")}`;
}

/** Bytes as whole kilobytes (F211). */
export function kilobytes(bytes: number): number {
  return Math.round(bytes / 1024);
}

/** A strength or coverage 0–1 as a whole percentage, at most 100. */
export function percent(value: number): number {
  return Math.min(100, Math.max(0, Math.round(value * 100)));
}
