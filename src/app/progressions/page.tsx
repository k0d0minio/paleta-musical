import type { Metadata } from "next";
import ptPT from "@/i18n/messages/pt-PT.json";
import { ProgressionsView } from "@/modules/progressions";

export const metadata: Metadata = { title: ptPT.modules.progressions.title };

export default function Page() {
  return <ProgressionsView />;
}
