"use client";

import { ListMusicIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { EmptyState, ModulePage } from "@/ui/module-page";

/** Empty state. The module ticket fills it. */
export function ProgressionsView() {
  const t = useTranslations("modules.progressions");
  return (
    <ModulePage title={t("title")} description={t("description")}>
      <EmptyState
        icon={ListMusicIcon}
        title={t("emptyTitle")}
        body={t("emptyBody")}
      />
    </ModulePage>
  );
}
