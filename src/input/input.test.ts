import { afterEach, describe, expect, it, vi } from "vitest";
import { InputRegistry } from "./registry";
import { KeyboardSource } from "./sources/keyboard";
import { PointerSource } from "./sources/pointer";
import type { NoteOnEvent } from "./types";

function press(
  code: string,
  init: KeyboardEventInit = {},
  target: EventTarget = window,
) {
  target.dispatchEvent(
    new KeyboardEvent("keydown", { code, bubbles: true, ...init }),
  );
}
function release(code: string) {
  window.dispatchEvent(new KeyboardEvent("keyup", { code, bubbles: true }));
}

describe("input registry", () => {
  let detach: (() => void)[] = [];
  afterEach(() => {
    detach.forEach((d) => d());
    detach = [];
    document.body.innerHTML = "";
  });

  function setup() {
    const registry = new InputRegistry();
    let octave = 4;
    const keyboard = new KeyboardSource({
      getOctave: () => octave,
      stepOctave: (d) => (octave += d),
    });
    const pointer = new PointerSource();
    detach.push(registry.register(keyboard), registry.register(pointer));
    const on = vi.fn<(e: NoteOnEvent) => void>();
    const off = vi.fn();
    registry.subscribe({ noteOn: on, noteOff: off });
    return { pointer, on, off, getOctave: () => octave };
  }

  it("delivers keyboard and pointer notes through the same interface", () => {
    const { pointer, on } = setup();
    press("KeyA");
    pointer.press({ pc: 9, octave: 4 });
    expect(on.mock.calls.map(([e]) => [e.sourceId, e.note])).toEqual([
      ["keyboard", { pc: 0, octave: 4 }],
      ["pointer", { pc: 9, octave: 4 }],
    ]);
  });

  it("maps the QWERTY row to one octave and Z/X to octave steps", () => {
    const { on, getOctave } = setup();
    press("KeyX");
    expect(getOctave()).toBe(5);
    press("KeyW");
    press("KeyK");
    press("KeyZ");
    press("KeyZ");
    expect(getOctave()).toBe(3);
    expect(on.mock.calls.map(([e]) => e.note)).toEqual([
      { pc: 1, octave: 5 },
      { pc: 0, octave: 6 },
    ]);
  });

  it("sends note-off on key up and ignores repeats and modifiers", () => {
    const { on, off } = setup();
    press("KeyD");
    press("KeyD", { repeat: true });
    press("KeyS", { ctrlKey: true });
    release("KeyD");
    expect(on).toHaveBeenCalledTimes(1);
    expect(off).toHaveBeenCalledWith({
      sourceId: "keyboard",
      note: { pc: 4, octave: 4 },
    });
  });

  it("ignores keys typed into a text field", () => {
    const { on } = setup();
    const input = document.createElement("input");
    document.body.append(input);
    press("KeyA", {}, input);
    expect(on).not.toHaveBeenCalled();
  });
});
