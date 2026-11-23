import type { Metadata } from "next";
import ptPT from "@/i18n/messages/pt-PT.json";
import { PianoRollView } from "@/modules/analyse";

export const metadata: Metadata = { title: ptPT.modules.analyse.rollTitle };

export default function Page() {
  return <PianoRollView />;
}
