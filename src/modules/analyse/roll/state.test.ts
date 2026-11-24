import { beforeEach, describe, expect, it } from "vitest";
import { defaultData, useAppStore } from "@/state";
import {
  drawNote,
  moveNotes,
  quantize,
  removeNotes,
  resizeNotes,
} from "./lib/edit";
import {
  getRollDoc,
  getRollSettings,
  setRollDoc,
  setRollSettings,
} from "./state";

const undo = () => useAppStore.temporal.getState().undo();
const redo = () => useAppStore.temporal.getState().redo();
const ids = (...list: string[]) => new Set(list);

describe("roll edits in the undo history", () => {
  beforeEach(() => {
    useAppStore.getState().replaceData(defaultData());
    useAppStore.temporal.getState().clear();
  });

  it("undoes and redoes draw, move, resize, erase, quantize, delete and clear", () => {
    const a = drawNote(60, 1, 120);
    const steps: ((n: ReturnType<typeof getRollDoc>["notes"]) => typeof n)[] = [
      (n) => [...n, a],
      (n) => moveNotes(n, ids(a.id), 0.3, 2),
      (n) => resizeNotes(n, ids(a.id), 0.4),
      (n) => [...n, drawNote(64, 2, 120)],
      (n) => quantize(n, "1/16", 120),
      (n) => removeNotes(n, ids(a.id)),
      () => [],
    ];
    const history = [getRollDoc().notes];
    for (const step of steps) {
      setRollDoc((doc) => ({ notes: step(doc.notes) }));
      history.push(getRollDoc().notes);
    }
    for (let i = history.length - 2; i >= 0; i--) {
      undo();
      expect(getRollDoc().notes).toEqual(history[i]);
    }
    for (let i = 1; i < history.length; i++) {
      redo();
      expect(getRollDoc().notes).toEqual(history[i]);
    }
  });

  it("undo of a roll edit keeps the other module keys", () => {
    setRollDoc({ notes: [drawNote(60, 0, 120)] });
    useAppStore.getState().setModuleState("palette", { tonic: 5 });
    useAppStore.getState().setModuleState("analyse", { otherKey: 1 });
    undo();
    const s = useAppStore.getState();
    expect(getRollDoc().notes).toEqual([]);
    expect(s.modules.palette.tonic).toBe(5);
    expect(s.modules.analyse.otherKey).toBe(1);
  });

  it("settings changes are not in the history", () => {
    setRollSettings({ tool: "draw" });
    expect(useAppStore.temporal.getState().pastStates).toHaveLength(0);
    expect(getRollSettings().tool).toBe("draw");
  });

  it("the duration grows to hold every note; bad stored data gives defaults", () => {
    setRollDoc({ notes: [{ ...drawNote(60, 30, 120) }] });
    expect(getRollDoc().duration).toBeCloseTo(30.25, 9);
    useAppStore
      .getState()
      .setModuleState("analyse", { roll: { notes: "bad" } });
    expect(getRollDoc()).toEqual({ notes: [], bpm: 120, duration: 10 });
  });
});
