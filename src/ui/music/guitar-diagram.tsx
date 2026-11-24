"use client";

import { useEffect, useRef, useState } from "react";
import {
  GUITAR_TUNING,
  toPitchClass,
  type GuitarVoicing,
  type PitchClass,
} from "@/theory";
import { cn } from "../cn";

function cssVar(name: string): string {
  return getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
}

/**
 * A guitar chord diagram (svguitar, MIT, loaded when the view mounts). Each
 * finger dot has the colour of its note (F276) and the note letter.
 */
export function GuitarDiagram({
  voicing,
  letter,
  label,
  className,
}: {
  voicing: GuitarVoicing;
  /** The letter name of a pitch class (spelling setting). */
  letter: (pc: PitchClass) => string;
  /** Accessible description, e.g. the frets low to high. */
  label: string;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);
  const signature = JSON.stringify(voicing);
  const letterRef = useRef(letter);
  useEffect(() => {
    letterRef.current = letter;
  });

  useEffect(() => {
    let cancelled = false;
    const el = ref.current;
    if (!el) return;
    void (async () => {
      try {
        const { SVGuitarChord } = await import("svguitar");
        if (cancelled) return;
        el.replaceChildren();
        const fg = cssVar("--fg") || "#000";
        const position = voicing.position;
        const relative = voicing.frets.map((f) =>
          f === null || f === 0 ? f : f - position + 1,
        );
        const shown = Math.max(
          4,
          ...relative.filter((f): f is number => f !== null),
        );
        const fingers = voicing.frets.map((f, i) => {
          const string = 6 - i;
          const rel = relative[i];
          if (f === null || rel === null || rel === undefined)
            return [string, "x"] as [number, "x"];
          if (f === 0) return [string, 0] as [number, 0];
          const pc = toPitchClass((GUITAR_TUNING[i] ?? 0) + f);
          return [
            string,
            rel,
            {
              text: letterRef.current(pc),
              color: cssVar(`--note-${pc}`) || fg,
              textColor: cssVar("--note-on") || "#000",
            },
          ] as [
            number,
            number,
            { text: string; color: string; textColor: string },
          ];
        });
        new SVGuitarChord(el)
          .configure({
            strings: 6,
            frets: shown,
            position,
            color: fg,
            backgroundColor: "none",
            fingerSize: 0.75,
            fingerTextSize: 18,
            fretLabelFontSize: 30,
            fixedDiagramPosition: true,
          })
          .chord({ fingers, barres: [] })
          .draw();
        const svg = el.querySelector("svg");
        svg?.setAttribute("aria-hidden", "true");
        svg?.setAttribute("focusable", "false");
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();
    return () => {
      cancelled = true;
    };
    // `signature` holds the voicing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature]);

  return (
    <figure
      role="img"
      aria-label={label}
      className={cn("w-full max-w-44", failed && "hidden", className)}
    >
      <div ref={ref} />
    </figure>
  );
}
