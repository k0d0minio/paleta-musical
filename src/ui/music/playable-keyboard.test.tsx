import { fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { inputRegistry } from "@/input";
import { pointerSource } from "@/input/sources/pointer";
import { toMidi } from "@/theory";
import { renderWithProviders } from "../../../tests/unit/render";
import { PlayableKeyboard, keyboardLayout } from "./playable-keyboard";

describe("keyboardLayout (S021)", () => {
  it("lays out 25 keys from C: 15 white and 10 black", () => {
    const keys = keyboardLayout(48, 25);
    expect(keys).toHaveLength(25);
    expect(keys.filter((k) => !k.black)).toHaveLength(15);
    expect(keys[0]).toEqual({ midi: 48, pc: 0, black: false, whiteIndex: 0 });
    expect(keys[1]).toEqual({ midi: 49, pc: 1, black: true, whiteIndex: 0 });
    expect(keys[24]).toEqual({ midi: 72, pc: 0, black: false, whiteIndex: 14 });
  });
});

describe("PlayableKeyboard", () => {
  let off: (() => void)[] = [];
  afterEach(() => {
    off.forEach((f) => f());
    off = [];
  });

  function setup(held = new Set<number>()) {
    off.push(inputRegistry.register(pointerSource));
    const on = vi.fn<(midi: number) => void>();
    const offFn = vi.fn<(midi: number) => void>();
    off.push(
      inputRegistry.subscribe({
        noteOn: (e) => on(toMidi(e.note)),
        noteOff: (e) => offFn(toMidi(e.note)),
      }),
    );
    const view = renderWithProviders(
      <PlayableKeyboard
        firstMidi={60}
        count={25}
        held={held}
        label="Teclado"
      />,
    );
    const key = (midi: number) =>
      view.container.querySelector<HTMLElement>(`[data-midi="${midi}"]`) ??
      document.body;
    return { on, off: offFn, key, view };
  }

  it("plays one note per finger and releases each finger on its own (S024, S025)", () => {
    const { on, off: offFn, key } = setup();
    fireEvent.pointerDown(key(60), { pointerId: 1, pointerType: "touch" });
    fireEvent.pointerDown(key(64), { pointerId: 2, pointerType: "touch" });
    expect(on.mock.calls.flat()).toEqual([60, 64]);
    fireEvent.pointerUp(window, { pointerId: 1 });
    expect(offFn.mock.calls.flat()).toEqual([60]);
    fireEvent.pointerUp(window, { pointerId: 2 });
    expect(offFn.mock.calls.flat()).toEqual([60, 64]);
  });

  it("releases the held notes when the first key changes (S023)", () => {
    const { off: offFn, key, view } = setup();
    fireEvent.pointerDown(key(62), { pointerId: 3, pointerType: "mouse" });
    view.rerender(
      <PlayableKeyboard
        firstMidi={72}
        count={25}
        held={new Set()}
        label="Teclado"
      />,
    );
    expect(offFn.mock.calls.flat()).toEqual([62]);
  });

  it("plays with Enter while the key is down", () => {
    const { on, off: offFn, key } = setup();
    fireEvent.keyDown(key(67), { key: "Enter" });
    fireEvent.keyDown(key(67), { key: "Enter", repeat: true });
    fireEvent.keyUp(key(67), { key: "Enter" });
    expect(on.mock.calls.flat()).toEqual([67]);
    expect(offFn.mock.calls.flat()).toEqual([67]);
  });

  it("marks held keys and names every key", () => {
    setup(new Set([61]));
    const group = screen.getByRole("group", { name: "Teclado" });
    expect(group.querySelectorAll("button")).toHaveLength(25);
    expect(
      group.querySelector('[data-midi="61"]')?.getAttribute("aria-pressed"),
    ).toBe("true");
    expect(
      group.querySelector('[data-midi="60"]')?.getAttribute("aria-label"),
    ).toMatch(/Oitava 4/);
  });
});
