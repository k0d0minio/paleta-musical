import { act, fireEvent, screen, within } from "@testing-library/react";
import { Midi } from "@tonejs/midi";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as audio from "@/audio";
import * as platform from "@/platform";
import { resetAllData, useAppStore } from "@/state";
import type { ChordRef, ChordTypeId } from "@/theory";
import { renderWithProviders } from "../../../tests/unit/render";
import { BuilderTab, builderResults } from "./builder-tab";
import { ChordList } from "./chord-list";
import {
  decodeProgression,
  encodeProgression,
  progressionFromHash,
  shareUrl,
} from "./share";
import { setProgressions } from "./state";
import { StylesTab } from "./styles-tab";
import { Timeline } from "./timeline";

const s = () => useAppStore.getState();
const chord = (root: number, type: ChordTypeId = "major", inversion = 0) =>
  ({ root, type, inversion }) as ChordRef;

beforeEach(async () => {
  await resetAllData();
  vi.spyOn(audio.audioEngine, "playChord").mockImplementation(() => {});
  vi.spyOn(audio.audioEngine, "playNote").mockImplementation(() => {});
});
afterEach(() => {
  audio.stopRhythm();
  vi.restoreAllMocks();
});

describe("Estilos", () => {
  it("lists the progressions of the style (R6) with the R7 chords", () => {
    renderWithProviders(<StylesTab />);
    const cards = screen.getAllByTestId("style-card");
    expect(cards).toHaveLength(10);
    expect(
      within(cards[0] as HTMLElement).getByRole("heading").textContent,
    ).toBe("I–V–vi–IV");
  });

  it("U08: adding a progression stores valid chord types, the tension flag and the chosen inversions", () => {
    setProgressions({ style: "trap" });
    renderWithProviders(<StylesTab />);
    const card = screen.getAllByTestId("style-card")[0] as HTMLElement;
    fireEvent.click(
      within(card).getByRole("button", { name: /^Adicionar i–bVII–bVI–bVII/ }),
    );
    const items = s().timeline.items;
    expect(items.map((i) => [i.chord.root, i.chord.type, i.tension])).toEqual([
      [0, "minor", false],
      [10, "major", true],
      [8, "major", true],
      [10, "major", true],
    ]);
  });

  it("U06: the bulk inversion changes the style chords (names update), not the timeline or the builder line", () => {
    s().timelineActions.append([{ chord: chord(0) }]);
    renderWithProviders(<StylesTab />);
    fireEvent.click(screen.getByRole("radio", { name: "1.ª inversão" }));
    const card = screen.getAllByTestId("style-card")[0] as HTMLElement;
    expect(within(card).getAllByRole("listitem")[0]?.textContent).toContain(
      "C/E",
    );
    fireEvent.click(within(card).getByRole("button", { name: /^Adicionar/ }));
    expect(s().timeline.items[0]?.chord.inversion).toBe(0);
    expect(
      s()
        .timeline.items.slice(1)
        .map((i) => i.chord.inversion),
    ).toEqual([1, 1, 1, 1]);
  });

  it("U35: a non-heptatonic scale uses the parent scale and says so", () => {
    setProgressions({ scale: "chromatic", style: "jazz" });
    renderWithProviders(<StylesTab />);
    expect(screen.getByTestId("parent-scale").textContent).toContain("Maior");
    const card = screen.getAllByTestId("style-card")[0] as HTMLElement;
    expect(card.textContent).toContain("Dm");
    expect(card.textContent).not.toContain("C♯");
  });

  it("F085: choosing a chord plays it and sets the last chord", () => {
    renderWithProviders(<StylesTab />);
    const card = screen.getAllByTestId("style-card")[0] as HTMLElement;
    fireEvent.click(
      within(card)
        .getAllByRole("listitem")[1]
        ?.querySelector("button") as HTMLElement,
    );
    expect(s().global.lastChord?.chord).toEqual(chord(7));
    expect(audio.audioEngine.playChord).toHaveBeenCalled();
  });
});

describe("chord lists", () => {
  function renderTimeline() {
    s().timelineActions.append([
      { chord: chord(0) },
      { chord: chord(7) },
      { chord: chord(9, "minor") },
    ]);
    return renderWithProviders(<Timeline />);
  }
  const names = () => s().timeline.items.map((i) => i.chord.root);

  it("U04: removes by button and by the Delete key", () => {
    renderTimeline();
    fireEvent.click(screen.getByRole("button", { name: "Remover G" }));
    expect(names()).toEqual([0, 9]);
    fireEvent.keyDown(screen.getByRole("button", { name: "1: C" }), {
      key: "Delete",
    });
    expect(names()).toEqual([9]);
  });

  it("U29: moves with buttons and with Alt+arrows (no mouse needed)", () => {
    renderTimeline();
    fireEvent.keyDown(screen.getByRole("button", { name: "1: C" }), {
      key: "ArrowRight",
      altKey: true,
    });
    expect(names()).toEqual([7, 0, 9]);
    const later = screen.getAllByRole("button", {
      name: "Mover para a frente",
    });
    expect((later.at(-1) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(
      screen.getAllByRole("button", {
        name: "Mover para trás",
      })[2] as HTMLElement,
    );
    expect(names()).toEqual([7, 9, 0]);
  });

  it("has a drag handle for mouse, touch and keyboard reorder on every chord", () => {
    renderTimeline();
    for (const name of ["C", "G", "Am"]) {
      const handle = screen.getByRole("button", { name: `Arrastar ${name}` });
      expect(handle.getAttribute("aria-roledescription")).toBe("sortable");
    }
  });

  it("undo and redo cover add, move, remove, edit and clear", () => {
    const a = s().timelineActions;
    const undo = () => useAppStore.temporal.getState().undo();
    const redo = () => useAppStore.temporal.getState().redo();
    a.append([{ chord: chord(0) }, { chord: chord(5) }]);
    a.move(0, 1);
    const first = s().timeline.items[0]?.id ?? "";
    a.replace(first, chord(2, "minor"));
    a.remove(first);
    a.clear();
    expect(names()).toEqual([]);
    undo();
    expect(names()).toEqual([0]);
    undo();
    expect(names()).toEqual([2, 0]);
    undo();
    expect(names()).toEqual([5, 0]);
    undo();
    expect(names()).toEqual([0, 5]);
    undo();
    expect(names()).toEqual([]);
    redo();
    redo();
    expect(names()).toEqual([5, 0]);
  });

  it("the chord editor replaces the chord and closes (Esc closes without change)", () => {
    renderTimeline();
    fireEvent.click(screen.getByRole("button", { name: "Editar G" }));
    const dialog = screen.getByRole("dialog");
    fireEvent.click(
      within(dialog)
        .getByRole("button", { name: /Fundamental/ })
        .closest("ul")
        ?.querySelectorAll("button")[1] as HTMLElement,
    );
    expect(s().timeline.items[1]?.chord).toEqual(chord(7, "major", 1));
    expect(screen.queryByRole("dialog")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Editar G/B" }));
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(s().timeline.items[1]?.chord).toEqual(chord(7, "major", 1));
  });

  it("ChordList marks the entry that plays (U03)", () => {
    vi.spyOn(audio, "useRhythmPlayer").mockReturnValue({
      source: "timeline",
      chordIndex: 1,
      paused: false,
    });
    s().timelineActions.append([{ chord: chord(0) }, { chord: chord(7) }]);
    renderWithProviders(
      <ChordList
        items={s().timeline.items}
        actions={s().timelineActions}
        source="timeline"
        label="x"
        onEdit={() => {}}
      />,
    );
    expect(
      screen.getByRole("button", { name: "2: G" }).getAttribute("aria-current"),
    ).toBe("true");
    expect(
      screen.getByRole("button", { name: "1: C" }).getAttribute("aria-current"),
    ).toBeNull();
  });
});

describe("Construtor", () => {
  it("F105: up to 6 exact; partial matches fill up to 3", () => {
    expect(builderResults([0, 4, 7])).toMatchObject({ exact: true });
    expect(builderResults([0, 4, 7]).results).toHaveLength(3);
    expect(builderResults([0, 4]).results).toHaveLength(3);
    expect(builderResults([0, 1, 2]).results).toHaveLength(0);
  });

  it("U01: choosing a suggestion adds a typed chord and sets the Lista root and type", () => {
    s().builderLineActions.append([{ chord: chord(0) }]);
    renderWithProviders(<BuilderTab />);
    const first = within(screen.getByTestId("suggestions")).getAllByRole(
      "button",
    )[0] as HTMLElement;
    fireEvent.click(first);
    expect(s().builderLine.items[1]?.chord).toEqual(chord(5));
    expect(s().modules.progressions).toMatchObject({
      builderTonic: 5,
      builderType: "major",
    });
  });

  it("U37/U38: the builder has its own rhythm and BPM; its MIDI export and playback use them", async () => {
    const share = vi
      .spyOn(platform, "shareOrDownload")
      .mockResolvedValue("downloaded");
    const schedule = vi
      .spyOn(audio.audioEngine, "schedule")
      .mockResolvedValue(() => {});
    setProgressions({
      rhythm: "simples",
      bpm: 90,
      builderRhythm: "waltz",
      builderBpm: 150,
    });
    s().builderLineActions.append([{ chord: chord(0) }, { chord: chord(7) }]);
    renderWithProviders(<BuilderTab />);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Descarregar MIDI" }));
    });
    const [data, fileName] = share.mock.calls[0] ?? [];
    expect(fileName).toBe("progressao-waltz-paleta.mid");
    const midi = new Midi(data as Uint8Array);
    expect(midi.header.tempos[0]?.bpm).toBeCloseTo(150, 2);
    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", { name: "Tocar A tua progressão" }),
      );
    });
    // Waltz: the second chord starts at 3 beats = 1.2 s at 150 BPM.
    const events = schedule.mock.calls[0]?.[0] ?? [];
    expect([...new Set(events.map((e) => +e.at.toFixed(3)))]).toContain(1.2);
    expect(audio.getRhythmPlayerState().source).toBe("builder");
  });
});

describe("share links", () => {
  const data = {
    key: 2,
    scale: "dorian" as const,
    rhythm: "bossa" as const,
    bpm: 120,
    chords: [
      { chord: chord(2, "min7"), tension: false },
      { chord: chord(7, "dom9", 2), tension: true },
    ],
  };

  it("round-trips key, chords, rhythm and BPM through the URL hash", () => {
    expect(decodeProgression(encodeProgression(data))).toEqual(data);
    const url = new URL(shareUrl("https://x.test", data));
    expect(url.searchParams.get("tab")).toBe("builder");
    expect(progressionFromHash(url.hash)).toEqual(data);
  });

  it("rejects a damaged link", () => {
    expect(progressionFromHash("#p=abc")).toBeNull();
    expect(progressionFromHash("#other=1")).toBeUndefined();
  });
});

describe("library", () => {
  it("a saved progression survives a reload; rename, duplicate and delete", async () => {
    const lib = await import("./library");
    const data = {
      key: 0,
      scale: "major" as const,
      rhythm: "simples" as const,
      bpm: 90,
      chords: [{ chord: chord(0), tension: false }],
    };
    const saved = await lib.saveProgression("Verso", data);
    await lib.renameProgression(saved.id, "Refrão");
    await lib.duplicateProgression(saved.id, "Refrão (cópia)");
    vi.resetModules();
    const fresh = await import("./library");
    const { items } = await fresh.loadLibrary();
    expect(items.map((i) => i.name)).toEqual(["Refrão", "Refrão (cópia)"]);
    expect(items[0]?.data).toEqual(data);
    await fresh.deleteProgression(items[0]?.id ?? "");
    expect((await fresh.loadLibrary()).items.map((i) => i.name)).toEqual([
      "Refrão (cópia)",
    ]);
    await fresh.deleteProgression(items[1]?.id ?? "");
  });
});
