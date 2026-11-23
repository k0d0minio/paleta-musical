import { act, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { clearSounding, markSounding } from "@/audio";
import { PITCH_CLASSES, type PitchClass } from "@/theory";
import { renderWithProviders } from "../../../tests/unit/render";
import { NoteChip } from "./note-chip";

afterEach(() => {
  clearSounding();
  vi.useRealTimers();
});

describe("NoteChip and the sounding bus", () => {
  it("marks only the sounding note and re-renders no other note (F011)", () => {
    vi.useFakeTimers();
    const renders = new Map<PitchClass, number>();
    const count = (pc: PitchClass) =>
      renders.set(pc, (renders.get(pc) ?? 0) + 1);
    renderWithProviders(
      <div>
        {PITCH_CLASSES.map((pc) => (
          <NoteChip key={pc} pc={pc} onRender={count} />
        ))}
      </div>,
    );
    const before = new Map(renders);

    act(() => markSounding([4], 0.7));
    const e = document.querySelector('[data-pc="4"]');
    expect(e?.getAttribute("data-sounding")).toBe("true");
    for (const pc of PITCH_CLASSES) {
      expect(renders.get(pc)).toBe((before.get(pc) ?? 0) + (pc === 4 ? 1 : 0));
    }

    act(() => vi.advanceTimersByTime(700));
    expect(e?.getAttribute("data-sounding")).toBe("false");
    for (const pc of PITCH_CLASSES) {
      expect(renders.get(pc)).toBe((before.get(pc) ?? 0) + (pc === 4 ? 2 : 0));
    }
  });

  it("always shows the note name, not only the colour", () => {
    renderWithProviders(<NoteChip pc={1} />);
    expect(screen.getByRole("button", { name: /C♯ Dó♯/ })).toBeTruthy();
    expect(screen.getByText("C♯")).toBeTruthy();
    expect(screen.getByText("Dó♯")).toBeTruthy();
  });

  it("names a tension note in words too", () => {
    renderWithProviders(<NoteChip pc={6} tension />);
    expect(screen.getByRole("button", { name: /nota de tensão/ })).toBeTruthy();
  });
});
