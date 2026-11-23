import type { Metadata } from "next";
import ptPT from "@/i18n/messages/pt-PT.json";
import { ChordsView } from "@/modules/chords";

export const metadata: Metadata = { title: ptPT.modules.chords.title };

export default function Page() {
  return <ChordsView />;
}
