import { act, fireEvent, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { audioEngine } from "@/audio";
import { inputRegistry } from "@/input";
import { KeyboardSource } from "@/input/sources/keyboard";
import { pointerSource } from "@/input/sources/pointer";
import { resetAllData, useAppStore } from "@/state";
import { paletteParamsPatch, parseNotesParam } from "./params";
import { getPaletteState, parsePaletteState, setPalette } from "./state";
import { isTense, tensionLevel } from "./tension";
import { renderModule } from "./testing";
import { PaletteView } from "./view";

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
  vi.useRealTimers();
});

const key = (code: string) => {
  fireEvent.keyDown(window, { code });
  fireEvent.keyUp(window, { code });
};

describe("Paleta state (F006, R2)", () => {
  it("opens in Escala, tonic C, Maior, tension 30 %", () => {
    expect(parsePaletteState({})).toMatchObject({
      mode: "scale",
      tonic: 0,
      scale: "major",
      chordType: "major",
      tension: 0.3,
    });
    renderModule(<PaletteView />);
    expect(screen.getByRole("radio", { name: "Escala" })).toHaveProperty(
      "ariaChecked",
      "true",
    );
    expect(screen.getByText("Colorido")).toBeTruthy();
    expect(screen.getByText("· 30 %")).toBeTruthy();
    expect(screen.getByRole("heading", { name: /C Maior/ })).toBeTruthy();
  });

  it("falls back per key on bad stored data", () => {
    expect(
      parsePaletteState({ mode: "nope", tonic: 3, tension: 7 }),
    ).toMatchObject({ mode: "scale", tonic: 3, tension: 0.3 });
  });
});

describe("tension (F037, F038, F043)", () => {
  it("gives the F037 status thresholds", () => {
    expect(tensionLevel(0)).toBe("consonant");
    expect(tensionLevel(0.19)).toBe("consonant");
    expect(tensionLevel(0.2)).toBe("colourful");
    expect(tensionLevel(0.44)).toBe("colourful");
    expect(tensionLevel(0.45)).toBe("moderate");
    expect(tensionLevel(0.69)).toBe("moderate");
    expect(tensionLevel(0.7)).toBe("high");
    expect(isTense(0.45)).toBe(false);
    expect(isTense(0.46)).toBe(true);
  });

  it("updates live from the keyboard and marks tension notes after 80 ms", () => {
    vi.useFakeTimers();
    act(() => setPalette({ tension: 0.45 }));
    renderModule(<PaletteView />);
    expect(screen.queryByText(/Notas de tensão/)).toBeNull();
    const thumb = screen.getByRole("slider", { name: "Tensão" });
    act(() => {
      thumb.focus();
      fireEvent.keyDown(thumb, { key: "ArrowRight" });
    });
    // Live: the status and the tension list follow at once (F035, F043).
    expect(screen.getByText("Tensão moderada")).toBeTruthy();
    expect(screen.getByText(/Notas de tensão/)).toBeTruthy();
    // The palette marks follow 80 ms after the last change (F038).
    const cSharp = () =>
      document.querySelector(
        'main [data-pc="1"], [role="toolbar"] [data-pc="1"]',
      );
    expect(cSharp()?.getAttribute("data-tension")).toBeNull();
    act(() => vi.advanceTimersByTime(80));
    expect(cSharp()?.getAttribute("data-tension")).toBe("true");
  });
});

describe("Escala (F039–F045)", () => {
  it("lists the degrees and plays the scale upward 280 ms apart", () => {
    const schedule = vi.mocked(audioEngine.schedule);
    act(() => setPalette({ tonic: 2 }));
    renderModule(<PaletteView />);
    expect(
      screen.getByRole("list", { name: "Notas por grau" }).children,
    ).toHaveLength(7);
    fireEvent.click(screen.getByRole("button", { name: "Tocar a escala" }));
    const events = schedule.mock.calls[0]?.[0] ?? [];
    expect(events.map((e) => e.at)).toEqual([
      0, 0.28, 0.56, 0.84, 1.12, 1.4, 1.68,
    ]);
    const midi = events.map((e) => {
      const n = e.notes[0];
      return n ? (n.octave + 1) * 12 + n.pc : 0;
    });
    expect(midi).toEqual([...midi].sort((a, b) => a - b));
  });

  it("plays a diatonic chord and sets it as the last chord (F045)", () => {
    renderModule(<PaletteView />);
    fireEvent.click(screen.getByRole("button", { name: /Tocar ii: Dm/ }));
    expect(audioEngine.playChord).toHaveBeenCalled();
    expect(useAppStore.getState().global.lastChord).toEqual({
      pcs: [2, 5, 9],
      chord: { root: 2, type: "minor", inversion: 0 },
    });
  });

  it("opens Harmonia through goTo (F041)", () => {
    const { goTo } = renderModule(<PaletteView />);
    fireEvent.click(screen.getByRole("button", { name: "Abrir na Harmonia" }));
    expect(goTo).toHaveBeenCalledWith("harmony");
  });
});

describe("Acorde (F046–F055)", () => {
  it("offers inversions, opens Acordes with the notes, and altered versions on the type only when tense (U10)", () => {
    act(() => setPalette({ mode: "chord", chordType: "minor", tension: 0.3 }));
    const { goTo } = renderModule(<PaletteView />);
    expect(screen.getByText("Posição fundamental")).toBeTruthy();
    expect(screen.getByText("2.ª inversão")).toBeTruthy();
    expect(screen.queryByText("Versões alteradas")).toBeNull();
    act(() => setPalette({ tension: 0.8 }));
    const altered = screen.getByRole("list", { name: "Versões alteradas" });
    const items = within(altered).getAllByRole("button");
    expect(items.map((b) => b.textContent)).toEqual([
      "Cm(♭9)C · D♯ · G · C♯",
      "Cm(♯11)C · D♯ · G · F♯",
      "Cm(♭13)C · D♯ · G · G♯",
    ]);
    fireEvent.click(items[0] as HTMLElement);
    const notes = vi.mocked(audioEngine.playChord).mock.calls.at(-1)?.[0];
    expect(notes?.map((n) => (n.octave + 1) * 12 + n.pc)).toEqual([
      60, 63, 67, 73,
    ]);
    fireEvent.click(screen.getByRole("button", { name: "Abrir em Acordes" }));
    expect(goTo).toHaveBeenCalledWith("chords", { notes: "0,3,7" });
  });
});

describe("Livre and Detetar (F056–F067)", () => {
  it("toggles notes from the QWERTY keyboard, lists 3 scales, and Esc clears", () => {
    act(() => setPalette({ mode: "free" }));
    renderModule(<PaletteView />);
    key("KeyA");
    key("KeyD");
    key("KeyG");
    expect(getPaletteState().freeNotes).toEqual([0, 4, 7]);
    expect(screen.getByText("C Pentatónica Maior")).toBeTruthy();
    key("KeyD");
    expect(getPaletteState().freeNotes).toEqual([0, 7]);
    fireEvent.keyDown(document.body, { key: "Escape", code: "Escape" });
    fireEvent.keyUp(document.body, { key: "Escape", code: "Escape" });
    expect(getPaletteState().freeNotes).toEqual([]);
  });

  it("detects scales: instruction, compatible (max 8), partial with ≥ 3 notes", () => {
    act(() => setPalette({ mode: "detect" }));
    renderModule(<PaletteView />);
    expect(
      screen.getByText("Clica nas notas para detetar a escala"),
    ).toBeTruthy();
    expect(
      screen.getByText("Seleciona 2 ou mais notas na paleta"),
    ).toBeTruthy();
    act(() => setPalette({ detectNotes: [0, 1, 4, 7] }));
    expect(screen.getByText(/Escalas compatíveis \(\d\)/)).toBeTruthy();
    const partial = screen.getByRole("list", { name: /Escalas parciais/ });
    expect(within(partial).getAllByRole("listitem").length).toBeLessThanOrEqual(
      6,
    );
    expect(within(partial).getAllByText("(3/4)").length).toBeGreaterThan(0);
  });
});

describe("link params (contracts of JAM-547)", () => {
  it("parses mode, tonic, scale, chord and notes", () => {
    const p = (s: string) => paletteParamsPatch(new URLSearchParams(s));
    expect(p("mode=scale&scale=dorian&tonic=2")).toEqual({
      mode: "scale",
      scale: "dorian",
      tonic: 2,
    });
    expect(p("mode=chord&chord=min7&tonic=9")).toEqual({
      mode: "chord",
      chordType: "min7",
      tonic: 9,
    });
    expect(p("mode=free&notes=0,4,7")).toEqual({
      mode: "free",
      freeNotes: [0, 4, 7],
    });
    expect(p("notes=2,2,x,13,5")).toEqual({ mode: "free", freeNotes: [2, 5] });
    expect(p("mode=detect&notes=1,3")).toEqual({
      mode: "detect",
      detectNotes: [1, 3],
    });
    expect(p("tonic=&scale=nope")).toEqual({});
    expect(parseNotesParam("")).toEqual([]);
  });

  it("applies the params once the stored data has loaded", () => {
    search.value = "mode=free&notes=0,4,7";
    renderModule(<PaletteView />);
    expect(getPaletteState().mode).toBe("scale");
    act(() =>
      useAppStore.setState((s) => ({
        session: { ...s.session, hydrated: true },
      })),
    );
    expect(getPaletteState()).toMatchObject({
      mode: "free",
      freeNotes: [0, 4, 7],
    });
  });
});
