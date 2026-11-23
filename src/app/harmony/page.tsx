import type { Metadata } from "next";
import ptPT from "@/i18n/messages/pt-PT.json";
import { HarmonyView } from "@/modules/harmony";

export const metadata: Metadata = { title: ptPT.modules.harmony.title };

export default function Page() {
  return <HarmonyView />;
}
