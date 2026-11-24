import type { Metadata } from "next";
import ptPT from "@/i18n/messages/pt-PT.json";
import { SynthView } from "@/modules/synth";

export const metadata: Metadata = { title: ptPT.modules.synth.title };

export default function Page() {
  return <SynthView />;
}
