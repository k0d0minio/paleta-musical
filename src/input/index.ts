/** Public API of the input layer. Sources are not exported: modules use the registry only. */
export type {
  InputKind,
  InputSource,
  NoteOffEvent,
  NoteOnEvent,
} from "./types";
export { InputRegistry, inputRegistry, type InputHandlers } from "./registry";
export { useInputNotes } from "./react";
