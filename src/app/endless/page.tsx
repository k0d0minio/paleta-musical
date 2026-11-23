import type { Metadata } from "next";
import ptPT from "@/i18n/messages/pt-PT.json";
import { EndlessView } from "@/modules/endless";

export const metadata: Metadata = { title: ptPT.modules.endless.title };

export default function Page() {
  return <EndlessView />;
}
