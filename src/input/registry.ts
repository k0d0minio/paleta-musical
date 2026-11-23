import type { InputEvents, InputSource, NoteOffEvent, NoteOnEvent } from "./types";

export interface InputHandlers {
  noteOn?: (event: NoteOnEvent) => void;
  noteOff?: (event: NoteOffEvent) => void;
}

/**
 * The input registry: sources register here, modules subscribe here. A new
 * source (a device, in a later ticket) needs no module change.
 */
export class InputRegistry {
  #sources = new Map<string, { source: InputSource; detach: () => void }>();
  #handlers = new Set<InputHandlers>();

  register(source: InputSource): () => void {
    this.#sources.get(source.id)?.detach();
    const offOn = source.on("noteOn", (e) => this.#dispatch("noteOn", e));
    const offOff = source.on("noteOff", (e) => this.#dispatch("noteOff", e));
    source.start();
    const detach = () => {
      offOn();
      offOff();
      source.stop();
      this.#sources.delete(source.id);
    };
    this.#sources.set(source.id, { source, detach });
    return detach;
  }

  subscribe(handlers: InputHandlers): () => void {
    this.#handlers.add(handlers);
    return () => this.#handlers.delete(handlers);
  }

  sources(): InputSource[] {
    return [...this.#sources.values()].map((s) => s.source);
  }

  #dispatch<E extends keyof InputEvents>(event: E, payload: Parameters<InputEvents[E]>[0]): void {
    for (const h of this.#handlers) {
      const fn = h[event] as ((p: typeof payload) => void) | undefined;
      fn?.(payload);
    }
  }
}

export const inputRegistry = new InputRegistry();
