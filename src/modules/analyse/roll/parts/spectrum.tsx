"use client";

import { useEffect, useRef } from "react";
import { R20 } from "../lib/live";
import type { Capture } from "../engine/capture";
import { readColors } from "../canvas/draw";

/** F243: the live spectrum, 0–5 kHz on −140…0 dB, while capturing. */
export function LiveSpectrum({
  capture,
  label,
}: {
  capture: Capture;
  label: string;
}) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const colors = readColors(document.documentElement);
    let frame = 0;
    const draw = () => {
      const ctx = canvas.getContext("2d");
      const dpr = window.devicePixelRatio || 1;
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (canvas.width !== Math.round(w * dpr))
        canvas.width = Math.round(w * dpr);
      if (canvas.height !== Math.round(h * dpr))
        canvas.height = Math.round(h * dpr);
      if (ctx) {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, w, h);
        const binHz = capture.sampleRate / R20.fftSize;
        const bins = Math.min(
          capture.spectrum.length,
          Math.ceil(R20.spectrumMaxHz / binHz),
        );
        ctx.beginPath();
        ctx.moveTo(0, h);
        for (let k = 0; k < bins; k++) {
          const db = capture.spectrum[k] ?? R20.spectrumMinDb;
          const level = Math.min(
            1,
            Math.max(0, (db - R20.spectrumMinDb) / -R20.spectrumMinDb),
          );
          ctx.lineTo((k / bins) * w, h - level * h);
        }
        ctx.lineTo(w, h);
        ctx.closePath();
        ctx.fillStyle = colors.accent;
        ctx.globalAlpha = 0.35;
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.strokeStyle = colors.accent;
        ctx.stroke();
      }
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [capture]);

  return (
    <canvas
      ref={ref}
      role="img"
      aria-label={label}
      className="h-16 w-full rounded-lg bg-surface-sunken"
    />
  );
}
