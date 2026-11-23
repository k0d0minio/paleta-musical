import { InfinityIcon } from "lucide-react";
import type { ModuleDefinition } from "@/nav";

export const endlessModule: ModuleDefinition = {
  id: "endless",
  route: "/endless",
  icon: InfinityIcon,
  messageKey: "modules.endless",
  shortcuts: [],
};
