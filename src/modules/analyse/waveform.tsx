"use client";

import { PauseIcon, PlayIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { Slider as SliderPrimitive } from "radix-ui";
import { useEffect, useMemo, useRef, useState } from "react";
import type WaveSurfer from "wavesurfer.js";
import type { Region as WsRegion } from "wavesurfer.js/dist/plugins/regions.js";
import { peaks } from "@/analysis";
import { Button } from "@/ui/components/button";
import { formatTime } from "./format";
import type { Region } from "./persist";

const PEAK_COUNT = 1600;

function cssVar(name: string, fallback: string): string {
  if (typeof document === "undefined") return fallback;
  const v = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
  return v || fallback;
}

/**
 * The waveform of the file (wavesurfer.js): play from a point, and a region
 * to analyse one part. The region also has a two-thumb slider, so it works
 * with the keyboard only. The peaks come from the decoded buffer, so
 * wavesurfer does not decode the file again.
 */
export function Waveform({
  name,
  url,
  buffer,
  selection,
  onSelection,
}: {
  name: string;
  url: string;
  buffer: AudioBuffer;
  selection: Region;
  onSelection: (region: Region) => void;
}) {
  const t = useTranslations("modules.analyse.analysis");
  const container = useRef<HTMLDivElement>(null);
  const ws = useRef<WaveSurfer | null>(null);
  const wsRegion = useRef<WsRegion | null>(null);
  const onSelectionRef = useRef(onSelection);
  const [playing, setPlaying] = useState(false);
  const duration = buffer.duration;

  useEffect(() => {
    onSelectionRef.current = onSelection;
  }, [onSelection]);

  const data = useMemo(
    () => [peaks(buffer.getChannelData(0), PEAK_COUNT)],
    [buffer],
  );

  useEffect(() => {
    const el = container.current;
    if (!el) return;
    let destroyed = false;
    let instance: WaveSurfer | null = null;
    void (async () => {
      const [{ default: WaveSurferCtor }, { default: RegionsPlugin }] =
        await Promise.all([
          import("wavesurfer.js"),
          import("wavesurfer.js/dist/plugins/regions.js"),
        ]);
      if (destroyed) return;
      const regions = RegionsPlugin.create();
      instance = WaveSurferCtor.create({
        container: el,
        url,
        peaks: data,
        duration,
        height: 96,
        normalize: true,
        barWidth: 2,
        barGap: 1,
        barRadius: 2,
        waveColor: cssVar("--fg-muted", "#888"),
        progressColor: cssVar("--accent", "#555"),
        cursorColor: cssVar("--fg", "#000"),
        cursorWidth: 2,
        dragToSeek: true,
        plugins: [regions],
      });
      ws.current = instance;
      instance.on("play", () => setPlaying(true));
      instance.on("pause", () => setPlaying(false));
      instance.on("finish", () => setPlaying(false));
      const region = regions.addRegion({
        start: 0,
        end: duration,
        color: "color-mix(in oklab, var(--accent) 18%, transparent)",
        drag: true,
        resize: true,
        minLength: 0.5,
      });
      wsRegion.current = region;
      region.on("update-end", () => {
        onSelectionRef.current({ start: region.start, end: region.end });
      });
    })();
    return () => {
      destroyed = true;
      instance?.destroy();
      ws.current = null;
      wsRegion.current = null;
    };
  }, [url, data, duration]);

  // Keep the wavesurfer region in step with the slider.
  useEffect(() => {
    const r = wsRegion.current;
    if (
      r &&
      (Math.abs(r.start - selection.start) > 0.01 ||
        Math.abs(r.end - selection.end) > 0.01)
    ) {
      r.setOptions({ start: selection.start, end: selection.end });
    }
  }, [selection]);

  const step = duration > 60 ? 0.5 : 0.1;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <Button
          size="icon"
          variant="primary"
          aria-label={playing ? t("pause") : t("play")}
          onClick={() => void ws.current?.playPause()}
        >
          {playing ? <PauseIcon aria-hidden /> : <PlayIcon aria-hidden />}
        </Button>
        <div
          ref={container}
          role="img"
          aria-label={t("waveformLabel", { name })}
          className="min-h-24 min-w-0 flex-1 overflow-hidden rounded-lg bg-surface-sunken"
        />
      </div>
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between text-sm text-fg-muted">
          <span id="region-label">{t("regionLabel")}</span>
          <output className="tabular">
            {t("regionValue", {
              start: formatTime(selection.start),
              end: formatTime(selection.end),
            })}
          </output>
        </div>
        <SliderPrimitive.Root
          aria-labelledby="region-label"
          min={0}
          max={duration}
          step={step}
          minStepsBetweenThumbs={1}
          value={[selection.start, selection.end]}
          onValueChange={([start = 0, end = duration]) =>
            onSelection({ start, end })
          }
          className="relative flex h-11 w-full touch-none items-center select-none"
        >
          <SliderPrimitive.Track className="relative h-1.5 grow overflow-hidden rounded-full bg-surface-2">
            <SliderPrimitive.Range className="absolute h-full bg-accent" />
          </SliderPrimitive.Track>
          {(["regionStart", "regionEnd"] as const).map((key, i) => (
            <SliderPrimitive.Thumb
              key={key}
              aria-label={t(key)}
              aria-valuetext={formatTime(
                i === 0 ? selection.start : selection.end,
              )}
              className="block size-5 rounded-full border-2 border-fg bg-surface shadow-2 transition-transform hover:scale-110"
            />
          ))}
        </SliderPrimitive.Root>
      </div>
    </div>
  );
}
