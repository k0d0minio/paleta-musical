import { PaletteIcon } from "lucide-react";
import type { ModuleDefinition } from "@/nav";

export const paletteModule: ModuleDefinition = {
  id: "palette",
  route: "/palette",
  icon: PaletteIcon,
  messageKey: "modules.palette",
  shortcuts: [
    { keys: "a w s e d f t g y h u j k", labelKey: "shortcutPlay" },
    { keys: "z x", labelKey: "shortcutOctave" },
  ],
};
