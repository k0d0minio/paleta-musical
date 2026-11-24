import { useAppStore, type ModuleId } from "@/state";
import type { PitchClass } from "@/theory";

/**
 * F018: entering Harmonia takes the tonic from the module the user came from:
 * the Paleta tonic, the Progressões key or the Infinito key. From Acordes,
 * Analisar or a first load there is no sync.
 */
export function syncRootOnEnter(from: ModuleId | null): void {
  const { modules, setModuleState } = useAppStore.getState();
  let tonic: PitchClass | undefined;
  if (from === "palette") tonic = modules.palette.tonic;
  else if (from === "progressions") tonic = modules.progressions.key;
  else if (from === "endless") tonic = modules.endless.key;
  if (tonic !== undefined) setModuleState("harmony", { tonic });
}

/** F019: leaving Harmonia sets the Progressões key and the Infinito key to its tonic. */
export function syncRootOnLeave(): void {
  const { modules, setModuleState } = useAppStore.getState();
  const { tonic } = modules.harmony;
  setModuleState("progressions", { key: tonic });
  setModuleState("endless", { key: tonic });
}
