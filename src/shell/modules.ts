import { analyseModule } from "@/modules/analyse";
import { chordsModule } from "@/modules/chords";
import { endlessModule } from "@/modules/endless";
import { harmonyModule } from "@/modules/harmony";
import { paletteModule } from "@/modules/palette";
import { progressionsModule } from "@/modules/progressions";
import { synthModule } from "@/modules/synth";
import type { ModuleDefinition } from "@/nav";

/** The module registry: navigation, command palette and shortcut help come from here. */
export const MODULES: readonly ModuleDefinition[] = [
  paletteModule,
  progressionsModule,
  endlessModule,
  chordsModule,
  harmonyModule,
  analyseModule,
  synthModule,
];
