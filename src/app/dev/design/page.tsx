import type { Metadata } from "next";
import ptPT from "@/i18n/messages/pt-PT.json";
import { DesignPage } from "@/shell/design-page";

export const metadata: Metadata = {
  title: ptPT.dev.title,
  robots: { index: false, follow: false },
};

/** Not linked in the navigation. */
export default function Page() {
  return <DesignPage />;
}
