import type { Note } from "@/theory";
import type { InputEvents, InputKind, InputSource } from "./types";

/** Event plumbing shared by every source. */
export abstract class BaseSource implements InputSource {
  #listeners: { [E in keyof InputEvents]: Set<InputEvents[E]> } = {
    noteOn: new Set(),
    noteOff: new Set(),
  };

  constructor(
    readonly id: string,
    readonly kind: InputKind,
  ) {}

  abstract start(): void;
  abstract stop(): void;

  on<E extends keyof InputEvents>(
    event: E,
    listener: InputEvents[E],
  ): () => void {
    const set = this.#listeners[event] as Set<InputEvents[E]>;
    set.add(listener);
    return () => set.delete(listener);
  }

  protected emitNoteOn(note: Note, velocity = 100): void {
    for (const l of this.#listeners.noteOn)
      l({ sourceId: this.id, note, velocity });
  }

  protected emitNoteOff(note: Note): void {
    for (const l of this.#listeners.noteOff) l({ sourceId: this.id, note });
  }
}
