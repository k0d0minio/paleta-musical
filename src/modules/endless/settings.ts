import { z } from "zod";
import { useAppStore, type AppState } from "@/state";
import {
  ENDLESS_BPM_MAX,
  ENDLESS_BPM_MIN,
  ENDLESS_DEFAULTS,
  isEndlessStyleId,
  isPitchClass,
  isScaleId,
  type EndlessStyleId,
  type PitchClass,
  type ScaleId,
} from "@/theory";

/** The Endless slice: shared keys (key, scale) and the module's own keys. */
export interface EndlessSettings {
  readonly key: PitchClass;
  readonly scale: ScaleId;
  readonly style: EndlessStyleId;
  readonly bpm: number;
  /** Empty: a new seed is drawn on the next start. */
  readonly seed: string;
  readonly smooth: boolean;
}

/** The store keeps module slices loose; the module validates its own keys. */
const schema = z.object({
  key: z.custom<PitchClass>(isPitchClass).catch(ENDLESS_DEFAULTS.key),
  scale: z.custom<ScaleId>(isScaleId).catch(ENDLESS_DEFAULTS.scale),
  style: z
    .custom<EndlessStyleId>(isEndlessStyleId)
    .catch(ENDLESS_DEFAULTS.style),
  bpm: z
    .number()
    .int()
    .min(ENDLESS_BPM_MIN)
    .max(ENDLESS_BPM_MAX)
    .catch(ENDLESS_DEFAULTS.bpm),
  seed: z.string().max(64).catch(""),
  smooth: z.boolean().catch(false),
});

const cache = new WeakMap<object, EndlessSettings>();

export function selectEndless(
  state: Pick<AppState, "modules">,
): EndlessSettings {
  const slice = state.modules.endless;
  let parsed = cache.get(slice);
  if (!parsed) {
    parsed = schema.parse(slice);
    cache.set(slice, parsed);
  }
  return parsed;
}

export function getEndlessSettings(): EndlessSettings {
  return selectEndless(useAppStore.getState());
}

export function setEndless(patch: Partial<EndlessSettings>): void {
  useAppStore.getState().setModuleState("endless", patch);
}

export function useEndlessSettings(): EndlessSettings {
  return useAppStore(selectEndless);
}
