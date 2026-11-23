import { defaultData, type PersistedData } from "./defaults";

/** The current schema version of the persisted data. Increase it with each schema change. */
export const SCHEMA_VERSION = 1;

type Migration = (data: Record<string, unknown>) => Record<string, unknown>;

/**
 * `MIGRATIONS[n]` moves data from version n to version n + 1.
 * Version 0 was a flat shape: `{ octave, settings }` (kept as an example and a test case).
 */
const MIGRATIONS: Record<number, Migration> = {
  0: (data) => {
    const base = defaultData();
    return {
      ...base,
      global: {
        ...base.global,
        octave: data.octave ?? base.global.octave,
        settings: {
          ...base.global.settings,
          ...(data.settings as object | undefined),
        },
      },
    };
  },
};

/** Runs every migration from `fromVersion` to the current version. */
export function migrate(
  persisted: unknown,
  fromVersion: number,
): PersistedData {
  let data = (persisted ?? {}) as Record<string, unknown>;
  for (let v = fromVersion; v < SCHEMA_VERSION; v++) {
    const step = MIGRATIONS[v];
    if (step) data = step(data);
  }
  return data as unknown as PersistedData;
}
