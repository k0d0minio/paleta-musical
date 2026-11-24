import { PianoIcon } from "lucide-react";
import type { ModuleDefinition } from "@/nav";

export const chordsModule: ModuleDefinition = {
  id: "chords",
  route: "/chords",
  icon: PianoIcon,
  messageKey: "modules.chords",
  shortcuts: [
    { keys: "a w s e d f t g y h u j k o l p", labelKey: "shortcutPlay" },
    { keys: "Esc", labelKey: "shortcutClear" },
  ],
};
