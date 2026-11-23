"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { buttonVariants } from "@/ui/components/button";

export default function NotFound() {
  const t = useTranslations("errors");
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-3 py-16 text-center">
      <h1 className="text-2xl font-semibold">{t("notFoundTitle")}</h1>
      <p className="text-fg-muted">{t("notFoundBody")}</p>
      <Link href="/palette" className={buttonVariants({ variant: "primary" })}>
        {t("home")}
      </Link>
    </div>
  );
}
