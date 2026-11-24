import { ListMusicIcon } from "lucide-react";
import type { ModuleDefinition } from "@/nav";

export const progressionsModule: ModuleDefinition = {
  id: "progressions",
  route: "/progressions",
  icon: ListMusicIcon,
  messageKey: "modules.progressions",
  shortcuts: [
    { keys: "space", labelKey: "shortcutPlay" },
    { keys: "delete", labelKey: "shortcutRemove" },
    { keys: "alt+up alt+down", labelKey: "shortcutMove" },
  ],
};
