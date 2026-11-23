import { beforeEach, describe, expect, it } from "vitest";
import { defaultData } from "./defaults";
import { SCHEMA_VERSION, migrate } from "./migrations";
import { STORAGE_KEY, createBackup, hydrateStore, resetAllData, restoreBackup, safeStorage, useAppStore } from "./store";

const s = () => useAppStore.getState();

async function writeRaw(state: unknown, version: number) {
  await safeStorage.setItem(STORAGE_KEY, JSON.stringify({ state, version }));
}

beforeEach(async () => {
  await resetAllData();
  useAppStore.setState((st) => ({ session: { ...st.session, recoveredFromBadData: false } }));
});

describe("global slice", () => {
  it("clamps the octave to 2–6, default 4 (F020, F021)", () => {
    expect(s().global.octave).toBe(4);
    s().stepOctave(5);
    expect(s().global.octave).toBe(6);
    s().setOctave(-3);
    expect(s().global.octave).toBe(2);
  });
});

describe("chord lists", () => {
  it("appends, moves, replaces and removes", () => {
    const a = s().timelineActions;
    a.append([
      { chord: { root: 0, type: "major", inversion: 0 } },
      { chord: { root: 7, type: "dom7", inversion: 0 }, tension: true },
    ]);
    a.move(1, 0);
    expect(s().timeline.items.map((i) => i.chord.root)).toEqual([7, 0]);
    const id = s().timeline.items[0]?.id ?? "";
    a.replace(id, { root: 5, type: "minor", inversion: 1 });
    expect(s().timeline.items[0]?.chord).toEqual({ root: 5, type: "minor", inversion: 1 });
    a.move(0, 9);
    expect(s().timeline.items).toHaveLength(2);
    a.remove(id);
    expect(s().timeline.items).toHaveLength(1);
    expect(s().builderLine.items).toHaveLength(0);
  });

  it("undoes and redoes list changes", () => {
    s().builderLineActions.append([{ chord: { root: 2, type: "minor", inversion: 0 } }]);
    s().builderLineActions.append([{ chord: { root: 7, type: "major", inversion: 0 } }]);
    useAppStore.temporal.getState().undo();
    expect(s().builderLine.items).toHaveLength(1);
    useAppStore.temporal.getState().redo();
    expect(s().builderLine.items).toHaveLength(2);
  });
});

describe("persistence", () => {
  it("keeps the octave and the settings after a reload", async () => {
    s().setOctave(5);
    s().updateSettings({ locale: "en", noteNames: "solfege" });
    await new Promise((r) => setTimeout(r, 20));
    const onDisk = await safeStorage.getItem(STORAGE_KEY);
    // Simulate a reload: fresh in-memory state, the same data on disk.
    useAppStore.setState(defaultData());
    await safeStorage.setItem(STORAGE_KEY, onDisk ?? "");
    await hydrateStore();
    expect(s().global.octave).toBe(5);
    expect(s().global.settings.locale).toBe("en");
    expect(s().session.storage).toBe("persistent");
  });

  it("runs migrate for an older schema version", async () => {
    await writeRaw({ octave: 3, settings: { locale: "en" } }, 0);
    await hydrateStore();
    expect(s().global.octave).toBe(3);
    expect(s().global.settings.locale).toBe("en");
    expect(s().global.settings.noteNames).toBe("both");
  });

  it("falls back to defaults on bad stored data, with no crash", async () => {
    await writeRaw({ global: { octave: "high" }, timeline: 3 }, SCHEMA_VERSION);
    await hydrateStore();
    expect(s().global.octave).toBe(4);
    expect(s().session.recoveredFromBadData).toBe(true);
  });

  it("falls back to defaults when the stored JSON is broken", async () => {
    await safeStorage.setItem(STORAGE_KEY, "{not json");
    await expect(hydrateStore()).resolves.toBeUndefined();
    expect(s().global.octave).toBe(4);
  });
});

describe("backup", () => {
  it("restores what it backed up", () => {
    s().setOctave(3);
    s().timelineActions.append([{ chord: { root: 9, type: "minor", inversion: 0 } }]);
    const file = JSON.parse(JSON.stringify(createBackup()));
    s().setOctave(6);
    s().timelineActions.clear();
    expect(restoreBackup(file)).toEqual({ ok: true });
    expect(s().global.octave).toBe(3);
    expect(s().timeline.items[0]?.chord.root).toBe(9);
  });

  it("rejects a file that is not a backup or that has bad data", () => {
    expect(restoreBackup({ hello: 1 })).toEqual({ ok: false, reason: "format" });
    expect(
      restoreBackup({ app: "paleta-musical", version: SCHEMA_VERSION + 1, exportedAt: "", data: {} }),
    ).toEqual({ ok: false, reason: "version" });
    expect(
      restoreBackup({ app: "paleta-musical", version: SCHEMA_VERSION, exportedAt: "", data: { global: 1 } }),
    ).toEqual({ ok: false, reason: "data" });
  });

  it("migrates an old backup", () => {
    expect(migrate({ octave: 2 }, 0).global.octave).toBe(2);
  });

  it("reset clears all data", async () => {
    s().setOctave(6);
    s().updateSettings({ locale: "en" });
    await resetAllData();
    expect(s().global.octave).toBe(4);
    expect(s().global.settings.locale).toBe("pt-PT");
    expect(await safeStorage.getItem(STORAGE_KEY)).toBeNull();
  });
});
