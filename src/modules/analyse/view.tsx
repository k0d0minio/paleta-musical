"use client";

import { ArrowLeftIcon, AudioWaveformIcon, GridIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useGoTo } from "@/nav";
import { Button } from "@/ui/components/button";
import { EmptyState, ModulePage } from "@/ui/module-page";

/** Empty state. Ticket 5 fills it. */
export function AnalyseView() {
  const t = useTranslations("modules.analyse");
  const goTo = useGoTo();
  return (
    <ModulePage title={t("title")} description={t("description")}>
      <EmptyState
        icon={AudioWaveformIcon}
        title={t("emptyTitle")}
        body={t("emptyBody")}
      >
        <Button onClick={() => goTo("analyse", { view: "roll" })}>
          <GridIcon aria-hidden />
          {t("openRoll")}
        </Button>
      </EmptyState>
    </ModulePage>
  );
}

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
