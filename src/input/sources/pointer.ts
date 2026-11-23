import type { Note } from "@/theory";
import { BaseSource } from "../base-source";

/** Pointer and touch input: on-screen keys and note chips call `press` and `release`. */
export class PointerSource extends BaseSource {
  constructor() {
    super("pointer", "pointer");
  }

  start(): void {}

  stop(): void {}

  press(note: Note, velocity = 100): void {
    this.emitNoteOn(note, velocity);
  }

  release(note: Note): void {
    this.emitNoteOff(note);
  }
}

export const pointerSource = new PointerSource();
