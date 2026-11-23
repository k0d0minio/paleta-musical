import { act, fireEvent, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { audioEngine } from "@/audio";
import { inputRegistry } from "@/input";
import { KeyboardSource } from "@/input/sources/keyboard";
import { pointerSource } from "@/input/sources/pointer";
import { resetAllData, useAppStore } from "@/state";
import { renderWithProviders } from "../../../tests/unit/render";
import { PaletteView } from "./view";

let detach: (() => void)[] = [];

beforeEach(async () => {
  await resetAllData();
  const keyboard = new KeyboardSource({
    getOctave: () => useAppStore.getState().global.octave,
    stepOctave: (d) => useAppStore.getState().stepOctave(d),
  });
  detach = [
    inputRegistry.register(pointerSource),
    inputRegistry.register(keyboard),
  ];
});
afterEach(() => {
  detach.forEach((d) => d());
  vi.restoreAllMocks();
});

describe("Palette vertical slice", () => {
  it("plays a tapped note in the global octave; the octave changes the next sound only (F020, F021, F031)", () => {
    const playNote = vi
      .spyOn(audioEngine, "playNote")
      .mockImplementation(() => {});
    const stopAll = vi.spyOn(audioEngine, "stopAll");
    renderWithProviders(<PaletteView />);
    const c = screen.getByRole("button", { name: /^C Dó$/ });
    fireEvent.click(c, { detail: 0 });
    expect(playNote).toHaveBeenLastCalledWith(
      { pc: 0, octave: 4 },
      { markSeconds: 0.7 },
    );
    act(() => useAppStore.getState().stepOctave(1));
    expect(stopAll).not.toHaveBeenCalled();
    expect(playNote).toHaveBeenCalledTimes(1);
    fireEvent.click(c, { detail: 0 });
    expect(playNote).toHaveBeenLastCalledWith(
      { pc: 0, octave: 5 },
      { markSeconds: 0.7 },
    );
  });

  it("plays from the QWERTY keyboard through the same input path", () => {
    const playNote = vi
      .spyOn(audioEngine, "playNote")
      .mockImplementation(() => {});
    renderWithProviders(<PaletteView />);
    fireEvent.keyDown(window, { code: "KeyH" });
    expect(playNote).toHaveBeenCalledWith(
      { pc: 9, octave: 4 },
      { markSeconds: 0.7 },
    );
  });

  it("stops listening when the module is not shown (F013)", () => {
    const playNote = vi
      .spyOn(audioEngine, "playNote")
      .mockImplementation(() => {});
    const view = renderWithProviders(<PaletteView />);
    view.unmount();
    fireEvent.keyDown(window, { code: "KeyA" });
    expect(playNote).not.toHaveBeenCalled();
  });
});
