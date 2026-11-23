"use client";

import { InfoIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { useCapability, useIsClient, type Capability } from "@/platform";

/** Shows the children only when the browser has the capability; else a short notice in their place. */
export function Requires({
  capability,
  children,
}: {
  capability: Capability;
  children: ReactNode;
}) {
  const has = useCapability(capability);
  const isClient = useIsClient();
  const t = useTranslations("capability");
  if (!isClient) return null;
  if (has) return children;
  return (
    <p
      role="note"
      className="flex items-center gap-2 rounded-lg border border-border bg-surface-2 p-3 text-sm text-fg-muted"
    >
      <InfoIcon className="size-4 shrink-0" aria-hidden />
      {t("missing", { name: t(`names.${capability}`) })}
    </p>
  );
}
