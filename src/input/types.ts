import type { Note } from "@/theory";

export type InputKind = "pointer" | "keyboard" | "device";

export interface NoteOnEvent {
  readonly sourceId: string;
  readonly note: Note;
  /** 1–127. */
  readonly velocity: number;
}

export interface NoteOffEvent {
  readonly sourceId: string;
  readonly note: Note;
}

export interface InputEvents {
  noteOn: (event: NoteOnEvent) => void;
  noteOff: (event: NoteOffEvent) => void;
}

/**
 * One source of notes: the pointer, the computer keyboard, and later a device.
 * Modules never use a source: they subscribe to the input registry.
 */
export interface InputSource {
  readonly id: string;
  readonly kind: InputKind;
  start(): void;
  stop(): void;
  on<E extends keyof InputEvents>(event: E, listener: InputEvents[E]): () => void;
}
