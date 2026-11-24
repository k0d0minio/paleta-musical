"use client";

import { useEffect, useRef, useState } from "react";
import type { Note } from "@/theory";
import { cn } from "../cn";

export interface StaffNote {
  readonly note: Note;
  /** The letter name with its accidental, e.g. "B♭" or "F♯". */
  readonly letter: string;
}

/** A VexFlow key ("bb/4") for a spelled note; C♭ and B♯ cross the octave line. */
export function vexKey({ note, letter }: StaffNote): {
  key: string;
  accidental: string | null;
} {
  const step = letter.charAt(0).toLowerCase();
  const accidental = letter
    .slice(1)
    .replace(/𝄪/g, "##")
    .replace(/𝄫/g, "bb")
    .replace(/♯/g, "#")
    .replace(/♭/g, "b");
  let octave = note.octave;
  if (step === "c" && accidental.startsWith("b") && note.pc >= 10) octave += 1;
  if (step === "b" && accidental.startsWith("#") && note.pc <= 1) octave -= 1;
  return {
    key: `${step}${accidental}/${octave}`,
    accidental: accidental || null,
  };
}

function cssVar(name: string): string {
  return getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
}

type Status = "loading" | "ready" | "error";

/**
 * A staff view of notes (VexFlow, MIT). VexFlow loads only when this view
 * mounts, so the first page load stays small (iOS). Each note head has its
 * note colour (F276). `chord`: the notes stack as one chord; else they are a
 * sequence of quarter notes.
 */
export function StaffView({
  notes,
  chord = false,
  label,
  loadingLabel,
  errorLabel,
  className,
}: {
  notes: readonly StaffNote[];
  chord?: boolean;
  /** Accessible description of the staff. */
  label: string;
  loadingLabel: string;
  errorLabel: string;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<Status>("loading");
  const signature = JSON.stringify([notes, chord]);

  useEffect(() => {
    let cancelled = false;
    const el = ref.current;
    if (!el) return;
    void (async () => {
      try {
        const VF = await import("vexflow/bravura");
        await VF.VexFlow.loadFonts("Bravura", "Academico");
        if (cancelled) return;
        const { Renderer, Stave, StaveNote, Voice, Formatter, Accidental } = VF;
        el.replaceChildren();
        const width = Math.max(260, el.clientWidth || 320);
        const height = 150;
        const renderer = new Renderer(el, Renderer.Backends.SVG);
        renderer.resize(width, height);
        const ctx = renderer.getContext();
        const fg = cssVar("--fg") || "#000";
        ctx.setFillStyle(fg);
        ctx.setStrokeStyle(fg);
        const avg =
          notes.reduce((sum, n) => sum + n.note.octave, 0) /
          Math.max(1, notes.length);
        const clef = avg < 4 ? "bass" : "treble";
        const stave = new Stave(0, 20, width - 1);
        stave.addClef(clef);
        stave.setStyle({ strokeStyle: fg, fillStyle: fg });
        stave.setContext(ctx).draw();

        const keys = notes.map(vexKey);
        const colour = (n: StaffNote) => cssVar(`--note-${n.note.pc}`) || fg;
        const staveNotes = chord
          ? [
              (() => {
                const sn = new StaveNote({
                  keys: keys.map((k) => k.key),
                  duration: "w",
                  clef,
                });
                keys.forEach((k, i) => {
                  if (k.accidental)
                    sn.addModifier(new Accidental(k.accidental), i);
                  const n = notes[i];
                  if (n)
                    sn.setKeyStyle(i, {
                      fillStyle: colour(n),
                      strokeStyle: colour(n),
                    });
                });
                return sn;
              })(),
            ]
          : keys.map((k, i) => {
              const sn = new StaveNote({ keys: [k.key], duration: "q", clef });
              if (k.accidental) sn.addModifier(new Accidental(k.accidental), 0);
              const n = notes[i];
              if (n) {
                const c = colour(n);
                sn.setStyle({ fillStyle: c, strokeStyle: c });
              }
              return sn;
            });
        if (staveNotes.length === 0) {
          setStatus("ready");
          return;
        }
        const voice = new Voice({
          numBeats: chord ? 4 : staveNotes.length,
          beatValue: 4,
        });
        voice.setStrict(false);
        voice.addTickables(staveNotes);
        new Formatter()
          .joinVoices([voice])
          .format([voice], width - stave.getNoteStartX() - 20);
        voice.draw(ctx, stave);
        const svg = el.querySelector("svg");
        svg?.setAttribute("aria-hidden", "true");
        svg?.setAttribute("focusable", "false");
        setStatus("ready");
      } catch {
        if (!cancelled) setStatus("error");
      }
    })();
    return () => {
      cancelled = true;
    };
    // `signature` holds the notes and the chord flag.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature]);

  return (
    <figure
      role="img"
      aria-label={label}
      aria-busy={status === "loading"}
      className={cn(
        "relative min-h-[150px] w-full overflow-x-auto rounded-lg border border-border bg-surface px-2",
        className,
      )}
    >
      <div ref={ref} className="min-w-[260px]" />
      {status !== "ready" && (
        <p className="absolute inset-0 grid place-items-center text-sm text-fg-muted">
          {status === "loading" ? loadingLabel : errorLabel}
        </p>
      )}
    </figure>
  );
}
