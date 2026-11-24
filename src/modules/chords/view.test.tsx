import { act, fireEvent, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { audioEngine } from "@/audio";
import { inputRegistry } from "@/input";
import { KeyboardSource } from "@/input/sources/keyboard";
import { pointerSource } from "@/input/sources/pointer";
import { resetAllData, useAppStore } from "@/state";
import { renderModule } from "../palette/testing";
import { getChordsState, setChordNotes } from "./state";
import { ChordsView } from "./view";

const search = vi.hoisted(() => ({ value: "" }));
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(search.value),
}));

let detach: (() => void)[] = [];

beforeEach(async () => {
  search.value = "";
  await resetAllData();
  const keyboard = new KeyboardSource({
    getOctave: () => useAppStore.getState().global.octave,
    stepOctave: (d) => useAppStore.getState().stepOctave(d),
  });
  detach = [
    inputRegistry.register(pointerSource),
    inputRegistry.register(keyboard),
  ];
  vi.spyOn(audioEngine, "playNote").mockImplementation(() => {});
  vi.spyOn(audioEngine, "playChord").mockImplementation(() => {});
  vi.spyOn(audioEngine, "schedule").mockResolvedValue(() => {});
});
afterEach(() => {
  detach.forEach((d) => d());
  vi.restoreAllMocks();
});

/** The "choose" button of a result, by its chord symbol. */
const result = (symbol: string) =>
  document.querySelector<HTMLElement>(`button[data-chord="${symbol}"]`);
const chip = (pc: number) =>
  document.querySelector<HTMLElement>(`[role="toolbar"] [data-pc="${pc}"]`);

describe("Acordes (F170–F182)", () => {
  it("plays and toggles a note from a tap (F171) and asks for 2 notes (F175)", () => {
    renderModule(<ChordsView />);
    expect(
      screen.getByText(
        "Seleciona pelo menos 2 notas para descobrir os acordes possíveis",
      ),
    ).toBeTruthy();
    fireEvent.click(chip(0) as HTMLElement, { detail: 0 });
    expect(audioEngine.playNote).toHaveBeenCalledWith(
      { pc: 0, octave: 4 },
      { markSeconds: 0.7 },
    );
    expect(getChordsState().notes).toEqual([0]);
    fireEvent.click(chip(0) as HTMLElement, { detail: 0 });
    expect(getChordsState().notes).toEqual([]);
  });

  it("lists every exact match and up to 16 partial matches in the R10 order, with the first note as the bass", () => {
    act(() => setChordNotes([0, 4, 7]));
    renderModule(<ChordsView />);
    const exact = screen.getByRole("list", { name: "1 acorde exato" });
    expect(within(exact).getAllByRole("listitem")).toHaveLength(1);
    expect(
      within(exact).getByRole("button", {
        name: /^C.*Maior.*tocar e guardar como último acorde$/,
      }),
    ).toBe(result("C"));
    const partial = screen.getByRole("list", {
      name: "Interpretações possíveis (13)",
    });
    const names = within(partial)
      .getAllByRole("button", { name: /tocar e guardar/ })
      .map((b) => b.dataset.chord);
    expect(names).toEqual([
      "Am7/C",
      "C7",
      "Cmaj7",
      "Cadd9",
      "C6",
      "Am9/C",
      "C9",
      "Cmaj9",
      "C7♭9",
      "Fmaj9/C",
      "Am11/C",
      "C13",
      "Dm11/C",
    ]);
  });

  it("caps the partial matches at 16", () => {
    act(() => setChordNotes([0, 4]));
    renderModule(<ChordsView />);
    const partial = screen.getByRole("list", {
      name: "Interpretações possíveis (16)",
    });
    expect(within(partial).getAllByRole("listitem")).toHaveLength(16);
  });

  it("names a slash chord from the first note (E G C → C/E)", () => {
    act(() => setChordNotes([4, 7, 0]));
    renderModule(<ChordsView />);
    expect(result("C/E")?.textContent).toContain("1.ª inversão");
    expect(screen.getByText(/Outros nomes: C\/E/)).toBeTruthy();
  });

  it("says when no chord matches (F182)", () => {
    act(() => setChordNotes([0, 1, 2]));
    renderModule(<ChordsView />);
    expect(
      screen.getByText("Nenhum acorde reconhecido para esta combinação"),
    ).toBeTruthy();
    expect(
      screen.getByText("Experimenta adicionar ou remover notas"),
    ).toBeTruthy();
  });

  it("choosing a result plays it and sets the last chord (F179)", () => {
    act(() => setChordNotes([0, 4, 7]));
    renderModule(<ChordsView />);
    fireEvent.click(result("C") as HTMLElement);
    expect(audioEngine.playChord).toHaveBeenCalledWith(
      [
        { pc: 0, octave: 4 },
        { pc: 4, octave: 4 },
        { pc: 7, octave: 4 },
      ],
      { markSeconds: 1.8 },
    );
    expect(useAppStore.getState().global.lastChord).toEqual({
      pcs: [0, 4, 7],
      chord: { root: 0, type: "major", inversion: 0 },
    });
  });

  it("adds to the timeline (F180) and to the builder, then opens Progressões → Construtor (F181)", () => {
    act(() => setChordNotes([4, 7, 0]));
    const { goTo } = renderModule(<ChordsView />);
    fireEvent.click(
      screen.getByRole("button", { name: "Juntar C/E à linha do tempo" }),
    );
    expect(useAppStore.getState().timeline.items.map((i) => i.chord)).toEqual([
      { root: 0, type: "major", inversion: 0 },
    ]);
    expect(goTo).not.toHaveBeenCalled();
    fireEvent.click(
      screen.getByRole("button", { name: "Juntar Am7/E ao construtor" }),
    );
    expect(
      useAppStore.getState().builderLine.items.map((i) => i.chord),
    ).toEqual([{ root: 9, type: "min7", inversion: 0 }]);
    expect(useAppStore.getState().builderLine.items[0]?.tension).toBe(false);
    expect(goTo).toHaveBeenCalledWith("progressions", { tab: "builder" });
  });

  it("removes one note from the list, clears, and Esc clears (F172, F174)", () => {
    act(() => setChordNotes([0, 4, 7]));
    renderModule(<ChordsView />);
    fireEvent.click(screen.getByRole("button", { name: "Tirar E · Mi" }));
    expect(getChordsState().notes).toEqual([0, 7]);
    fireEvent.keyDown(document.body, { key: "Escape", code: "Escape" });
    expect(getChordsState().notes).toEqual([]);
  });

  it("preselects the notes of a link (F050, F218)", () => {
    search.value = "notes=0,3,7";
    renderModule(<ChordsView />);
    act(() =>
      useAppStore.setState((s) => ({
        session: { ...s.session, hydrated: true },
      })),
    );
    expect(getChordsState().notes).toEqual([0, 3, 7]);
    expect(result("Cm")).not.toBeNull();
  });
});
