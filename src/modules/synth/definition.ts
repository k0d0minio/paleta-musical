import { KeyboardMusicIcon } from "lucide-react";
import type { ModuleDefinition } from "@/nav";

/** A module switch runs stop-all, which also silences the synth (src/audio/synth/index.ts). */
export const synthModule: ModuleDefinition = {
  id: "synth",
  route: "/synth",
  icon: KeyboardMusicIcon,
  messageKey: "modules.synth",
  shortcuts: [
    { keys: "a w s e d f t g y h u j k o l p", labelKey: "shortcutPlay" },
    { keys: "z x", labelKey: "shortcutOctave" },
    { keys: "↑ ↓ PageUp PageDown Home End", labelKey: "shortcutKnob" },
  ],
};
