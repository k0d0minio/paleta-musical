"use client";

import { Disc3Icon } from "lucide-react";
import { useTranslations } from "next-intl";
import { EmptyState, ModulePage } from "@/ui/module-page";

/** Empty state. The module ticket fills it. */
export function HarmonyView() {
  const t = useTranslations("modules.harmony");
  return (
    <ModulePage title={t("title")} description={t("description")}>
      <EmptyState icon={Disc3Icon} title={t("emptyTitle")} body={t("emptyBody")} />
    </ModulePage>
  );
}
