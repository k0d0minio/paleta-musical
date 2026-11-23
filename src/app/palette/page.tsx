import type { Metadata } from "next";
import ptPT from "@/i18n/messages/pt-PT.json";
import { PaletteView } from "@/modules/palette";

export const metadata: Metadata = { title: ptPT.modules.palette.title };

export default function Page() {
  return <PaletteView />;
}
