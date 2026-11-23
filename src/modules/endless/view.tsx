"use client";

import { InfinityIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { EmptyState, ModulePage } from "@/ui/module-page";

/** Empty state. The module ticket fills it. */
export function EndlessView() {
  const t = useTranslations("modules.endless");
  return (
    <ModulePage title={t("title")} description={t("description")}>
      <EmptyState icon={InfinityIcon} title={t("emptyTitle")} body={t("emptyBody")} />
    </ModulePage>
  );
}
