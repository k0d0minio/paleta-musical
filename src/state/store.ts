import { temporal } from "zundo";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { clampOctave, type ChordRef, type PitchClass } from "@/theory";
import { defaultData, type PersistedData } from "./defaults";
import { SCHEMA_VERSION, migrate } from "./migrations";
import { backupSchema, persistedSchema } from "./schema";
import { blobStorage, createSafeStorage } from "./storage";
import type { LastChord, ModuleId, ProgressionItem, Settings, StorageStatus } from "./types";

type ListKey = "timeline" | "builderLine";

export interface ListActions {
  append(chords: readonly { chord: ChordRef; tension?: boolean }[]): void;
  move(from: number, to: number): void;
  remove(id: string): void;
  replace(id: string, chord: ChordRef): void;
  clear(): void;
}

export interface AppState extends PersistedData {
  /** Not persisted. */
  session: {
    currentModule: ModuleId | null;
    storage: StorageStatus;
    /** True when the stored data was invalid and the app fell back to defaults. */
    recoveredFromBadData: boolean;
    hydrated: boolean;
  };
  setOctave(octave: number): void;
  stepOctave(delta: number): void;
  setLastChord(pcs: readonly PitchClass[], chord?: ChordRef | null): void;
  updateSettings(patch: Partial<Settings>): void;
  setCurrentModule(id: ModuleId | null): void;
  timelineActions: ListActions;
  builderLineActions: ListActions;
  /** Replaces all data (restore from backup). */
  replaceData(data: PersistedData): void;
}

export const STORAGE_KEY = "paleta-musical";

let idCounter = 0;
export function newId(): string {
  idCounter += 1;
  return `${Date.now().toString(36)}-${idCounter.toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export const safeStorage = createSafeStorage();

/** Picks the data that persists (and that a backup holds). */
export function pickData(state: PersistedData): PersistedData {
  return {
    global: state.global,
    timeline: state.timeline,
    builderLine: state.builderLine,
    modules: state.modules,
  };
}

export const useAppStore = create<AppState>()(
  persist(
    temporal(
      (set, get) => {
        const listActions = (key: ListKey): ListActions => {
          const update = (fn: (items: ProgressionItem[]) => ProgressionItem[]) =>
            set((s) => ({ [key]: { items: fn([...s[key].items]) } }) as Partial<AppState>);
          return {
            append: (chords) =>
              update((items) => [
                ...items,
                ...chords.map((c) => ({ id: newId(), chord: c.chord, tension: c.tension ?? false })),
              ]),
            move: (from, to) =>
              update((items) => {
                if (from < 0 || from >= items.length || to < 0 || to >= items.length) return items;
                const [item] = items.splice(from, 1);
                if (item) items.splice(to, 0, item);
                return items;
              }),
            remove: (id) => update((items) => items.filter((i) => i.id !== id)),
            replace: (id, chord) => update((items) => items.map((i) => (i.id === id ? { ...i, chord } : i))),
            clear: () => update(() => []),
          };
        };

        return {
          ...defaultData(),
          session: { currentModule: null, storage: "pending", recoveredFromBadData: false, hydrated: false },
          setOctave: (octave) => set((s) => ({ global: { ...s.global, octave: clampOctave(octave) } })),
          stepOctave: (delta) => get().setOctave(get().global.octave + delta),
          setLastChord: (pcs, chord = null) =>
            set((s) => ({ global: { ...s.global, lastChord: { pcs: [...pcs], chord } satisfies LastChord } })),
          updateSettings: (patch) =>
            set((s) => ({ global: { ...s.global, settings: { ...s.global.settings, ...patch } } })),
          setCurrentModule: (id) => set((s) => ({ session: { ...s.session, currentModule: id } })),
          timelineActions: listActions("timeline"),
          builderLineActions: listActions("builderLine"),
          replaceData: (data) => set(() => ({ ...pickData(data) })),
        };
      },
      {
        // Undo/redo covers the chord lists. Tickets 3 and 6 add their slices here.
        partialize: (s) => ({ timeline: s.timeline, builderLine: s.builderLine }),
        equality: (a, b) => a.timeline === b.timeline && a.builderLine === b.builderLine,
        limit: 100,
      },
    ),
    {
      name: STORAGE_KEY,
      version: SCHEMA_VERSION,
      storage: createJSONStorage(() => safeStorage),
      skipHydration: true,
      partialize: (s) => pickData(s),
      migrate: (persisted, version) => migrate(persisted, version),
      merge: (persisted, current) => {
        if (persisted === undefined || persisted === null) return current;
        const parsed = persistedSchema.safeParse(persisted);
        if (!parsed.success) {
          return { ...current, session: { ...current.session, recoveredFromBadData: true } };
        }
        return { ...current, ...(parsed.data as PersistedData) };
      },
      onRehydrateStorage: () => (state, error) => {
        void safeStorage.mode().then((mode) => {
          useAppStore.setState((s) => ({
            session: {
              ...s.session,
              storage: mode,
              hydrated: true,
              recoveredFromBadData: s.session.recoveredFromBadData || !!error,
            },
          }));
          useAppStore.temporal.getState().clear();
        });
        void state;
      },
    },
  ),
);

/** Loads the stored data. Call once on the client, in an effect (no hydration mismatch). */
export async function hydrateStore(): Promise<void> {
  const temporalState = useAppStore.temporal.getState();
  temporalState.pause();
  try {
    await useAppStore.persist.rehydrate();
  } finally {
    temporalState.resume();
    temporalState.clear();
  }
}

export interface BackupFile {
  app: "paleta-musical";
  version: number;
  exportedAt: string;
  data: PersistedData;
}

/** All user data as a JSON backup file. */
export function createBackup(now = new Date()): BackupFile {
  return {
    app: "paleta-musical",
    version: SCHEMA_VERSION,
    exportedAt: now.toISOString(),
    data: pickData(useAppStore.getState()),
  };
}

export type RestoreResult = { ok: true } | { ok: false; reason: "format" | "version" | "data" };

/** Restores a backup: checks the file, runs the migrations, validates, then replaces all data. */
export function restoreBackup(json: unknown): RestoreResult {
  const envelope = backupSchema.safeParse(json);
  if (!envelope.success) return { ok: false, reason: "format" };
  if (envelope.data.version > SCHEMA_VERSION) return { ok: false, reason: "version" };
  const migrated = migrate(envelope.data.data, envelope.data.version);
  const parsed = persistedSchema.safeParse(migrated);
  if (!parsed.success) return { ok: false, reason: "data" };
  useAppStore.getState().replaceData(parsed.data as PersistedData);
  return { ok: true };
}

/** Clears all data: the stored state, the large-data store and the undo history. */
export async function resetAllData(): Promise<void> {
  useAppStore.getState().replaceData(defaultData());
  useAppStore.temporal.getState().clear();
  await useAppStore.persist.clearStorage();
  try {
    await blobStorage.clear();
  } catch {
    // No large data stored.
  }
}
