import { Disc3Icon } from "lucide-react";
import type { ModuleDefinition } from "@/nav";
import { syncRootOnEnter, syncRootOnLeave } from "./root-sync";

export const harmonyModule: ModuleDefinition = {
  id: "harmony",
  route: "/harmony",
  icon: Disc3Icon,
  messageKey: "modules.harmony",
  shortcuts: [
    { keys: "← → ↑ ↓", labelKey: "shortcutMove" },
    { keys: "Enter", labelKey: "shortcutChoose" },
    { keys: "Shift Enter", labelKey: "shortcutMinor" },
  ],
  // Root sync (F018, F019): every switch and link goes through goTo (U07).
  onEnter: ({ from }) => syncRootOnEnter(from),
  onLeave: () => syncRootOnLeave(),
};
