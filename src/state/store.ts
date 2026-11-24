import { temporal } from "zundo";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { clampOctave, type ChordRef, type PitchClass } from "@/theory";
import { defaultData, type ModuleSlices, type PersistedData } from "./defaults";
import { SCHEMA_VERSION, migrate } from "./migrations";
import { backupSchema, persistedSchema } from "./schema";
import { blobStorage, createSafeStorage } from "./storage";
import type {
  LastChord,
  ModuleId,
  ProgressionItem,
  Settings,
  StorageStatus,
} from "./types";

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
  /** Merges a patch into one module slice. */
  setModuleState<K extends ModuleId>(
    id: K,
    patch: Partial<ModuleSlices[K]>,
  ): void;
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

/**
 * Module keys in the undo history, by module (each key holds one value that
 * an edit replaces, not mutates). zundo restores a history entry with a plain
 * `set`, so these keys travel as `moduleHistory` and `temporalWithModules`
 * merges them back into their module slice; other module keys stay as they are.
 */
export const UNDO_MODULE_KEYS = {
  analyse: ["roll"],
} as const satisfies Partial<Record<ModuleId, readonly string[]>>;

type ModuleHistory = Partial<Record<ModuleId, Record<string, unknown>>>;

function pickModuleHistory(modules: ModuleSlices): ModuleHistory {
  const out: ModuleHistory = {};
  for (const [id, keys] of Object.entries(UNDO_MODULE_KEYS)) {
    const slice: Record<string, unknown> = modules[id as ModuleId];
    out[id as ModuleId] = Object.fromEntries(keys.map((k) => [k, slice[k]]));
  }
  return out;
}

function sameModuleHistory(a: ModuleHistory, b: ModuleHistory): boolean {
  return Object.entries(UNDO_MODULE_KEYS).every(([id, keys]) =>
    keys.every((k) => a[id as ModuleId]?.[k] === b[id as ModuleId]?.[k]),
  );
}

type AnySet = (partial: unknown, replace?: boolean) => void;
type AnyCreator = (set: AnySet, get: () => AppState, api: unknown) => unknown;

/** zundo's `temporal`, plus: a `moduleHistory` that undo/redo sets is merged into `modules`. */
const temporalWithModules = ((...args: Parameters<typeof temporal>) => {
  const inner = temporal(...args) as unknown as AnyCreator;
  const outer: AnyCreator = (set, get, api) =>
    inner(
      (partial, replace) => {
        if (
          typeof partial !== "object" ||
          partial === null ||
          !("moduleHistory" in partial)
        )
          return set(partial, replace);
        const { moduleHistory, ...rest } = partial as {
          moduleHistory: ModuleHistory;
        };
        const modules: Record<string, unknown> = { ...get().modules };
        for (const [id, values] of Object.entries(moduleHistory)) {
          modules[id] = { ...(modules[id] as object), ...values };
        }
        set({ ...rest, modules }, replace);
      },
      get,
      api,
    );
  return outer;
}) as unknown as typeof temporal;

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
    temporalWithModules(
      (set, get) => {
        const listActions = (key: ListKey): ListActions => {
          const update = (
            fn: (items: ProgressionItem[]) => ProgressionItem[],
          ) =>
            set(
              (s) =>
                ({
                  [key]: { items: fn([...s[key].items]) },
                }) as Partial<AppState>,
            );
          return {
            append: (chords) =>
              update((items) => [
                ...items,
                ...chords.map((c) => ({
                  id: newId(),
                  chord: c.chord,
                  tension: c.tension ?? false,
                })),
              ]),
            move: (from, to) =>
              update((items) => {
                if (
                  from < 0 ||
                  from >= items.length ||
                  to < 0 ||
                  to >= items.length
                )
                  return items;
                const [item] = items.splice(from, 1);
                if (item) items.splice(to, 0, item);
                return items;
              }),
            remove: (id) => update((items) => items.filter((i) => i.id !== id)),
            replace: (id, chord) =>
              update((items) =>
                items.map((i) => (i.id === id ? { ...i, chord } : i)),
              ),
            clear: () => update(() => []),
          };
        };

        return {
          ...defaultData(),
          session: {
            currentModule: null,
            storage: "pending",
            recoveredFromBadData: false,
            hydrated: false,
          },
          setOctave: (octave) =>
            set((s) => ({
              global: { ...s.global, octave: clampOctave(octave) },
            })),
          stepOctave: (delta) => get().setOctave(get().global.octave + delta),
          setLastChord: (pcs, chord = null) =>
            set((s) => ({
              global: {
                ...s.global,
                lastChord: { pcs: [...pcs], chord } satisfies LastChord,
              },
            })),
          updateSettings: (patch) =>
            set((s) => ({
              global: {
                ...s.global,
                settings: { ...s.global.settings, ...patch },
              },
            })),
          setCurrentModule: (id) =>
            set((s) => ({ session: { ...s.session, currentModule: id } })),
          setModuleState: (id, patch) =>
            set((s) => ({
              modules: { ...s.modules, [id]: { ...s.modules[id], ...patch } },
            })),
          timelineActions: listActions("timeline"),
          builderLineActions: listActions("builderLine"),
          replaceData: (data) => set(() => ({ ...pickData(data) })),
        };
      },
      {
        // Undo/redo covers the chord lists and the module keys of UNDO_MODULE_KEYS
        // (JAM-552: the piano roll, modules.analyse.roll).
        partialize: (s) => ({
          timeline: s.timeline,
          builderLine: s.builderLine,
          moduleHistory: pickModuleHistory(s.modules),
        }),
        equality: (a, b) =>
          a.timeline === b.timeline &&
          a.builderLine === b.builderLine &&
          sameModuleHistory(a.moduleHistory, b.moduleHistory),
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
          return {
            ...current,
            session: { ...current.session, recoveredFromBadData: true },
          };
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

export type RestoreResult =
  { ok: true } | { ok: false; reason: "format" | "version" | "data" };

/** Restores a backup: checks the file, runs the migrations, validates, then replaces all data. */
export function restoreBackup(json: unknown): RestoreResult {
  const envelope = backupSchema.safeParse(json);
  if (!envelope.success) return { ok: false, reason: "format" };
  if (envelope.data.version > SCHEMA_VERSION)
    return { ok: false, reason: "version" };
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
