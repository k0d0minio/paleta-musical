import { AudioWaveformIcon } from "lucide-react";
import type { ModuleDefinition } from "@/nav";

export const analyseModule: ModuleDefinition = {
  id: "analyse",
  route: "/analyse",
  icon: AudioWaveformIcon,
  messageKey: "modules.analyse",
  shortcuts: [],
};
