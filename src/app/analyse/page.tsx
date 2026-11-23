import type { Metadata } from "next";
import ptPT from "@/i18n/messages/pt-PT.json";
import { AnalyseView } from "@/modules/analyse";

export const metadata: Metadata = { title: ptPT.modules.analyse.title };

export default function Page() {
  return <AnalyseView />;
}
