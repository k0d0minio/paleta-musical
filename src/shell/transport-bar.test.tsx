import { fireEvent, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { audioEngine } from "@/audio";
import { resetAllData, useAppStore } from "@/state";
import { renderWithProviders } from "../../tests/unit/render";
import { TransportBar } from "./transport-bar";

beforeEach(async () => {
  await resetAllData();
});
afterEach(() => vi.restoreAllMocks());

describe("TransportBar", () => {
  it("offers nothing for the last chord before one exists (F022)", () => {
    renderWithProviders(<TransportBar />);
    expect(screen.getByText("Ainda sem acorde")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Tocar o último acorde" })).toBeNull();
  });

  it("shows the last chord and replays it as F023 says", () => {
    const playChord = vi.spyOn(audioEngine, "playChord").mockImplementation(() => {});
    // A minor, first note A: the others go within the octave above it.
    useAppStore.getState().setLastChord([9, 0, 4], { root: 9, type: "minor", inversion: 0 });
    useAppStore.getState().setOctave(3);
    renderWithProviders(<TransportBar />);
    expect(screen.getByTestId("last-chord").textContent).toContain("A · C · E");
    fireEvent.click(screen.getByRole("button", { name: "Tocar o último acorde" }));
    expect(playChord).toHaveBeenCalledWith(
      [
        { pc: 9, octave: 3 },
        { pc: 0, octave: 4 },
        { pc: 4, octave: 4 },
      ],
      { markSeconds: 1.5 },
    );
  });

  it("adds the last chord to the timeline", () => {
    useAppStore.getState().setLastChord([7, 11, 2], { root: 7, type: "major", inversion: 0 });
    renderWithProviders(<TransportBar />);
    fireEvent.click(screen.getByRole("button", { name: "Juntar à linha do tempo" }));
    expect(useAppStore.getState().timeline.items.map((i) => i.chord.root)).toEqual([7]);
  });

  it("clamps the octave stepper to 2–6", () => {
    renderWithProviders(<TransportBar />);
    const up = screen.getByRole("button", { name: "Aumentar Oitava" });
    for (let i = 0; i < 5; i++) fireEvent.click(up);
    expect(useAppStore.getState().global.octave).toBe(6);
    expect((up as HTMLButtonElement).disabled).toBe(true);
  });

  it("stop-all stops the engine", () => {
    const stopAll = vi.spyOn(audioEngine, "stopAll");
    renderWithProviders(<TransportBar />);
    fireEvent.click(screen.getByRole("button", { name: "Parar tudo" }));
    expect(stopAll).toHaveBeenCalledOnce();
  });
});
