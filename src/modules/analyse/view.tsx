"use client";

import { AudioWaveformIcon, GridIcon } from "lucide-react";
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
