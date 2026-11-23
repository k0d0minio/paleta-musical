"use client";

import { useEffect, useRef } from "react";
import { inputRegistry, type InputHandlers } from "./registry";

/** Subscribes a component to the notes of every input source while it is mounted (and visible). */
export function useInputNotes(handlers: InputHandlers): void {
  const ref = useRef(handlers);
  useEffect(() => {
    ref.current = handlers;
  });
  useEffect(
    () =>
      inputRegistry.subscribe({
        noteOn: (e) => ref.current.noteOn?.(e),
        noteOff: (e) => ref.current.noteOff?.(e),
      }),
    [],
  );
}
