import { PianoIcon } from "lucide-react";
import type { ModuleDefinition } from "@/nav";

export const chordsModule: ModuleDefinition = {
  id: "chords",
  route: "/chords",
  icon: PianoIcon,
  messageKey: "modules.chords",
  shortcuts: [],
};
