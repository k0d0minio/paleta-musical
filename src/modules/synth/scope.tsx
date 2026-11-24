"use client";

import { useTranslations } from "next-intl";
import {
  type CSSProperties,
  useEffect,
  useRef,
  useSyncExternalStore,
} from "react";
import { SCOPE_FRAME, synth, useAudioStatus } from "@/audio";
import { cn } from "@/ui/cn";

/** S029: the trigger is searched in the first 1024 samples; 900 samples show. */
const TRIGGER_SEARCH = 1024;
const SHOWN = 900;
/** The display gain follows the level, so that a quiet sound still shows its shape. */
const MAX_GAIN = 8;

/** The display gain for a window peak: the wave fills about 90 % of the height. */
export function displayGain(peak: number): number {
  return Math.min(MAX_GAIN, 0.9 / Math.max(peak, 0.9 / MAX_GAIN));
}

/** The first rising zero crossing in the search window, or 0. */
export function findTrigger(
  samples: Float32Array,
  search = TRIGGER_SEARCH,
): number {
  const end = Math.min(search, samples.length - 1);
  for (let i = 1; i < end; i++) {
    if ((samples[i - 1] ?? 0) < 0 && (samples[i] ?? 0) >= 0) return i;
  }
  return 0;
}

const hasAnalyser = () => synth.analyser !== null;

/**
 * The oscilloscope (S029–S031): the output waveform, still on a rising zero
 * crossing, sharp on high-density screens, in the colour of the lowest
 * sounding note (F276). Before the audio starts it shows the idle text (S030).
 */
export function Scope({ colourPc }: { colourPc: number | null }) {
  const t = useTranslations("modules.synth");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const status = useAudioStatus();
  const ready = useSyncExternalStore(synth.subscribe, hasAnalyser, () => false);
  const live = ready && status.state === "running";

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || !live) return;
    const data = new Float32Array(SCOPE_FRAME);

    // S031: the backing store follows the size and the pixel ratio.
    const resize = () => {
      const ratio = window.devicePixelRatio || 1;
      canvas.width = Math.max(1, Math.round(canvas.clientWidth * ratio));
      canvas.height = Math.max(1, Math.round(canvas.clientHeight * ratio));
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);

    let frame = 0;
    let gain = 1;
    const draw = () => {
      frame = requestAnimationFrame(draw);
      const analyser = synth.analyser;
      if (!analyser) return;
      analyser.getFloatTimeDomainData(data);
      const { width, height } = canvas;
      const style = getComputedStyle(canvas);
      const ratio = window.devicePixelRatio || 1;
      ctx.clearRect(0, 0, width, height);
      ctx.lineWidth = ratio;
      ctx.strokeStyle = style.getPropertyValue("--scope-grid");
      ctx.beginPath();
      ctx.moveTo(0, height / 2);
      ctx.lineTo(width, height / 2);
      ctx.stroke();

      const start = findTrigger(data);
      let peak = 0;
      for (let i = 0; i < SHOWN; i++)
        peak = Math.max(peak, Math.abs(data[start + i] ?? 0));
      gain += (displayGain(peak) - gain) * 0.15;
      ctx.lineWidth = 2 * ratio;
      ctx.lineJoin = "round";
      ctx.strokeStyle = style.getPropertyValue("--scope-line");
      ctx.beginPath();
      for (let i = 0; i < SHOWN; i++) {
        const x = (i / (SHOWN - 1)) * width;
        const v = data[start + i] ?? 0;
        const y = height / 2 - v * gain * (height / 2);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    };
    draw();
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    };
  }, [live]);

  return (
    <div
      className="relative h-28 overflow-hidden rounded-xl bg-surface-sunken sm:h-36"
      style={
        {
          "--scope-grid": "var(--border)",
          "--scope-line":
            colourPc === null ? "var(--fg)" : `var(--note-${colourPc})`,
        } as CSSProperties
      }
    >
      <canvas
        ref={canvasRef}
        role="img"
        aria-label={t("scopeLabel")}
        className="block size-full"
      />
      <p
        className={cn(
          "absolute inset-0 grid place-items-center px-4 text-center text-sm text-fg-muted transition-opacity duration-(--duration-base)",
          live && "pointer-events-none opacity-0",
        )}
        aria-hidden={live}
      >
        {t("scopeIdle")}
      </p>
    </div>
  );
}
