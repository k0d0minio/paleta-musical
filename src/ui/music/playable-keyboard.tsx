"use client";

import {
  useEffect,
  useRef,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import { pointerSource } from "@/input/sources/pointer";
import { fromMidi, toPitchClass, type PitchClass } from "@/theory";
import { cn } from "../cn";
import { rovingKeyDown } from "../roving";
import { useNoteNameText } from "./note-name";

const BLACK = new Set<PitchClass>([1, 3, 6, 8, 10]);

export interface KeyLayout {
  readonly midi: number;
  readonly pc: PitchClass;
  readonly black: boolean;
  /** White keys: the index among the white keys. Black keys: the white key on its left. */
  readonly whiteIndex: number;
}

/** The keys from `firstMidi`, `count` keys, with their place among the white keys. */
export function keyboardLayout(
  firstMidi: number,
  count: number,
): readonly KeyLayout[] {
  const keys: KeyLayout[] = [];
  let white = -1;
  for (let midi = firstMidi; midi < firstMidi + count; midi++) {
    const pc = toPitchClass(midi);
    const black = BLACK.has(pc);
    if (!black) white += 1;
    keys.push({ midi, pc, black, whiteIndex: Math.max(0, white) });
  }
  return keys;
}

export interface PlayableKeyboardProps {
  /** The MIDI note of the first key (a C for the usual look). */
  firstMidi: number;
  count: number;
  /** The MIDI notes that sound now: their keys fill with the note colour (F276). */
  held: ReadonlySet<number>;
  /** The accessible name of the keyboard. */
  label: string;
  className?: string;
}

/**
 * A playable keyboard of any number of keys. It plays through the pointer
 * input source: a key sounds while it is held (note on, note off), more than
 * one finger plays more than one key, and a key held with Enter or Space
 * sounds until the key goes up. The page does not scroll or zoom on it.
 */
export function PlayableKeyboard({
  firstMidi,
  count,
  held,
  label,
  className,
}: PlayableKeyboardProps) {
  const name = useNoteNameText();
  /** Notes held with a pointer, by pointer id. */
  const pointers = useRef(new Map<number, number>());
  /** Notes held with Enter or Space on a focused key. */
  const keys = useRef(new Set<number>());

  const release = (midi: number) => pointerSource.release(fromMidi(midi));

  // A pointer that goes up anywhere releases its note (S024); a lost window
  // focus and a new first note release every note (S023).
  useEffect(() => {
    const map = pointers.current;
    const keySet = keys.current;
    const releaseAll = () => {
      for (const midi of map.values()) release(midi);
      map.clear();
      for (const midi of keySet) release(midi);
      keySet.clear();
    };
    const onUp = (event: globalThis.PointerEvent) => {
      const midi = map.get(event.pointerId);
      if (midi === undefined) return;
      map.delete(event.pointerId);
      if (![...map.values()].includes(midi)) release(midi);
    };
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    window.addEventListener("blur", releaseAll);
    return () => {
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      window.removeEventListener("blur", releaseAll);
      releaseAll();
    };
  }, [firstMidi]);

  const onPointerDown = (
    event: PointerEvent<HTMLButtonElement>,
    midi: number,
  ) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    event.preventDefault(); // no focus steal, no text selection, no scroll
    // A held key does not follow the pointer to the next key (no glissando, SU3).
    const sounding = [...pointers.current.values()].includes(midi);
    pointers.current.set(event.pointerId, midi);
    if (!sounding) pointerSource.press(fromMidi(midi));
  };

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, midi: number) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    if (event.repeat || keys.current.has(midi)) return;
    keys.current.add(midi);
    pointerSource.press(fromMidi(midi));
  };

  const keyRelease = (midi: number) => {
    if (keys.current.delete(midi)) release(midi);
  };

  const onKeyUp = (event: KeyboardEvent<HTMLButtonElement>, midi: number) => {
    if (event.key === "Enter" || event.key === " ") keyRelease(midi);
  };

  const layout = keyboardLayout(firstMidi, count);
  const whiteCount = layout.filter((k) => !k.black).length;
  return (
    <div
      role="group"
      aria-label={label}
      onKeyDown={(e) => rovingKeyDown(e)}
      onContextMenu={(e) => e.preventDefault()}
      style={{ "--white": whiteCount } as CSSProperties}
      className={cn(
        "relative flex h-40 w-full touch-none gap-px select-none [-webkit-touch-callout:none] sm:h-48",
        className,
      )}
    >
      {layout.map((key, i) => {
        const note = fromMidi(key.midi);
        const on = held.has(key.midi);
        const text = name(key.pc);
        return (
          <button
            key={key.midi}
            type="button"
            data-roving
            data-midi={key.midi}
            data-held={on || undefined}
            tabIndex={i === 0 ? 0 : -1}
            aria-label={name(key.pc, note.octave)}
            aria-pressed={on}
            onPointerDown={(e) => onPointerDown(e, key.midi)}
            onKeyDown={(e) => onKeyDown(e, key.midi)}
            onKeyUp={(e) => onKeyUp(e, key.midi)}
            onBlur={() => keyRelease(key.midi)}
            style={
              {
                "--note": `var(--note-${key.pc})`,
                ...(key.black
                  ? {
                      left: `calc((${key.whiteIndex} + 1) * (100% / var(--white)) - (100% / var(--white)) * 0.32)`,
                    }
                  : {}),
              } as CSSProperties
            }
            className={cn(
              "flex flex-col items-center justify-end gap-1 pb-2 font-semibold outline-offset-[-2px] transition-colors duration-(--duration-fast)",
              key.black
                ? "absolute top-0 z-10 h-[60%] w-[calc(100%/var(--white)*0.64)] rounded-b-md bg-neutral-900 text-[0.6rem] text-neutral-100 shadow-2 dark:bg-neutral-950"
                : "relative h-full min-w-0 flex-1 rounded-b-lg border border-border bg-surface text-[0.65rem] text-fg-muted sm:text-xs",
              "data-held:bg-(--note) data-held:text-note-on",
            )}
          >
            <span
              aria-hidden
              className={cn(
                "max-w-full truncate px-px leading-none",
                key.black && "hidden sm:block",
              )}
            >
              {text}
              {key.pc === 0 && !key.black && (
                <sub className="ml-px text-[0.8em] tabular">{note.octave}</sub>
              )}
            </span>
            <span
              aria-hidden
              className={cn(
                "h-1 w-3/5 rounded-full bg-(--note)",
                on && "bg-note-on/40",
              )}
            />
          </button>
        );
      })}
    </div>
  );
}
