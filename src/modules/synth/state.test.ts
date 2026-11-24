import { beforeEach, describe, expect, it } from "vitest";
import { PARAMS, PRESETS, applyPreset, defaultSound } from "@/audio";
import {
  STORAGE_KEY,
  defaultData,
  hydrateStore,
  migrate,
  safeStorage,
  useAppStore,
} from "@/state";
import {
  USER_SOUNDS_MAX,
  applyUserSound,
  getSynthState,
  matchesUserSound,
  removeUserSound,
  restoreUserSound,
  saveUserSound,
  setParam,
  setSound,
  setWave,
} from "./state";

const setSlice = (slice: unknown) =>
  useAppStore.setState((s) => ({
    modules: { ...s.modules, synth: slice as Record<string, unknown> },
  }));

beforeEach(() => {
  useAppStore.getState().replaceData(defaultData());
});

describe("Sintetizador slice (SU6)", () => {
  it("starts with the default sound and no user sounds", () => {
    expect(getSynthState()).toEqual({ sound: defaultSound(), sounds: [] });
  });

  it("sets a parameter within its range and a waveform", () => {
    setParam("cut", 50_000);
    setParam("det", -12);
    setWave(2, "sine");
    const { sound } = getSynthState();
    expect(sound.params.cut).toBe(PARAMS.cut.max);
    expect(sound.params.det).toBe(-12);
    expect(sound.wave2).toBe("sine");
  });

  it("repairs bad stored values key by key", () => {
    setSlice({
      sound: {
        wave1: "noise",
        wave2: "triangle",
        params: { cut: "x", res: 99 },
      },
      sounds: "bad",
    });
    const { sound, sounds } = getSynthState();
    expect(sound.wave1).toBe("sawtooth");
    expect(sound.wave2).toBe("triangle");
    expect(sound.params.cut).toBe(2200);
    expect(sound.params.res).toBe(18);
    expect(sounds).toEqual([]);
  });

  it("saves, applies, removes and restores a named sound", () => {
    setSound(applyPreset(defaultSound(), PRESETS.pad));
    expect(saveUserSound("  Pad lento  ")).toBe(true);
    const [entry] = getSynthState().sounds;
    expect(entry?.name).toBe("Pad lento");
    if (!entry) throw new Error("no sound");

    setSound(defaultSound());
    setParam("vol", 0.2);
    applyUserSound(entry);
    const { sound } = getSynthState();
    expect(matchesUserSound(sound, entry)).toBe(true);
    expect(sound.params.vol).toBe(0.2); // like a preset, the volume stays

    removeUserSound(entry.id);
    expect(getSynthState().sounds).toEqual([]);
    restoreUserSound(entry, 0);
    expect(getSynthState().sounds).toEqual([entry]);
  });

  it("keeps at most the limit of user sounds", () => {
    for (let i = 0; i < USER_SOUNDS_MAX; i++) saveUserSound(`S${i}`);
    expect(saveUserSound("one more")).toBe(false);
    expect(getSynthState().sounds).toHaveLength(USER_SOUNDS_MAX);
  });

  it("survives a reload", async () => {
    await hydrateStore();
    setParam("cut", 900);
    saveUserSound("Mine");
    await new Promise((r) => setTimeout(r, 20));
    const onDisk = await safeStorage.getItem(STORAGE_KEY);
    // A reload: fresh in-memory state, the same data on disk.
    useAppStore.setState(defaultData());
    expect(getSynthState().sound.params.cut).toBe(2200);
    await safeStorage.setItem(STORAGE_KEY, onDisk ?? "");
    await hydrateStore();
    expect(getSynthState().sound.params.cut).toBe(900);
    expect(getSynthState().sounds.map((s) => s.name)).toEqual(["Mine"]);
    await safeStorage.removeItem(STORAGE_KEY);
  });

  it("migrates version 2 data: adds the synth slice", () => {
    const v2 = defaultData() as unknown as { modules: Record<string, unknown> };
    delete v2.modules.synth;
    expect(migrate(v2, 2).modules.synth).toEqual({});
  });
});
