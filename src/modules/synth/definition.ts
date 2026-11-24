import { AudioWaveformIcon } from "lucide-react";
import { synth } from "@/audio";
import type { ModuleDefinition } from "@/nav";

export const synthModule: ModuleDefinition = {
  id: "synth",
  route: "/synth",
  icon: AudioWaveformIcon,
  messageKey: "modules.synth",
  shortcuts: [
    { keys: "A W S E D F T G Y H U J K O L P", labelKey: "shortcutPlay" },
    { keys: "Z X", labelKey: "shortcutOctave" },
    { keys: "↑ ↓ PgUp PgDn Home End", labelKey: "shortcutKnob" },
  ],
  onLeave: () => synth.releaseAll(),
};
