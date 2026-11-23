"use client";

import { PianoIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { EmptyState, ModulePage } from "@/ui/module-page";

/** Empty state. The module ticket fills it. */
export function ChordsView() {
  const t = useTranslations("modules.chords");
  return (
    <ModulePage title={t("title")} description={t("description")}>
      <EmptyState icon={PianoIcon} title={t("emptyTitle")} body={t("emptyBody")} />
    </ModulePage>
  );
}
