import { toPitchClass, type Note } from "@/theory";
import { BaseSource } from "../base-source";

/**
 * The computer keyboard as a piano: A W S E D F T G Y H U J K O L P = C … D#
 * one octave up (16 semitones, SR5 of the synth spec). Z and X step the
 * octave down and up. Physical key codes, so the layout
 * of the keyboard does not matter.
 */
export const KEY_OFFSETS: Readonly<Record<string, number>> = {
  KeyA: 0,
  KeyW: 1,
  KeyS: 2,
  KeyE: 3,
  KeyD: 4,
  KeyF: 5,
  KeyT: 6,
  KeyG: 7,
  KeyY: 8,
  KeyH: 9,
  KeyU: 10,
  KeyJ: 11,
  KeyK: 12,
  KeyO: 13,
  KeyL: 14,
  KeyP: 15,
};

export interface KeyboardSourceOptions {
  getOctave(): number;
  stepOctave(delta: number): void;
  target?: Window;
}

const BLOCKING =
  'input, textarea, select, [contenteditable=""], [contenteditable="true"], [role="dialog"], [role="menu"], [role="listbox"], [role="slider"]';

/**
 * A control that uses no letter keys (the rotary control: arrows, Page, Home,
 * End) marks itself with this attribute: the note keys still play while it
 * has the focus.
 */
export const NOTE_KEYS_PASS_ATTRIBUTE = "data-note-keys-pass";

export function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  if (target.hasAttribute(NOTE_KEYS_PASS_ATTRIBUTE)) return false;
  return target.closest(BLOCKING) !== null;
}

export class KeyboardSource extends BaseSource {
  #held = new Map<string, Note>();
  #target: Window | null = null;

  constructor(private readonly options: KeyboardSourceOptions) {
    super("keyboard", "keyboard");
  }

  start(): void {
    if (this.#target) return;
    this.#target = this.options.target ?? window;
    this.#target.addEventListener("keydown", this.#onKeyDown);
    this.#target.addEventListener("keyup", this.#onKeyUp);
    this.#target.addEventListener("blur", this.#releaseAll);
  }

  stop(): void {
    this.#releaseAll();
    this.#target?.removeEventListener("keydown", this.#onKeyDown);
    this.#target?.removeEventListener("keyup", this.#onKeyUp);
    this.#target?.removeEventListener("blur", this.#releaseAll);
    this.#target = null;
  }

  #onKeyDown = (event: KeyboardEvent) => {
    if (event.repeat || event.ctrlKey || event.metaKey || event.altKey) return;
    if (isTypingTarget(event.target)) return;
    if (event.code === "KeyZ" || event.code === "KeyX") {
      this.options.stepOctave(event.code === "KeyZ" ? -1 : 1);
      event.preventDefault();
      return;
    }
    const offset = KEY_OFFSETS[event.code];
    if (offset === undefined || this.#held.has(event.code)) return;
    const octave = this.options.getOctave() + Math.floor(offset / 12);
    const note: Note = { pc: toPitchClass(offset), octave };
    this.#held.set(event.code, note);
    event.preventDefault();
    this.emitNoteOn(note);
  };

  #onKeyUp = (event: KeyboardEvent) => {
    const note = this.#held.get(event.code);
    if (!note) return;
    this.#held.delete(event.code);
    this.emitNoteOff(note);
  };

  #releaseAll = () => {
    for (const note of this.#held.values()) this.emitNoteOff(note);
    this.#held.clear();
  };
}
