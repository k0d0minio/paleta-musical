"use client";

import { ArrowLeftIcon, GridIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useGoTo } from "@/nav";
import { Button } from "@/ui/components/button";
import { EmptyState, ModulePage } from "@/ui/module-page";

/** Empty state of the piano roll (/analyse/roll). Ticket 6 fills it. */
export function PianoRollView() {
  const t = useTranslations("modules.analyse");
  const goTo = useGoTo();
  return (
    <ModulePage
      title={t("rollTitle")}
      actions={
        <Button variant="ghost" onClick={() => goTo("analyse")}>
          <ArrowLeftIcon aria-hidden />
          {t("backToAnalysis")}
        </Button>
      }
    >
      <EmptyState
        icon={GridIcon}
        title={t("rollEmptyTitle")}
        body={t("rollEmptyBody")}
      />
    </ModulePage>
  );
}
