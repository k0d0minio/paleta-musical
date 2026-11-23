"use client";

import { NextIntlClientProvider } from "next-intl";
import { useEffect, type ReactNode } from "react";
import { useAppStore } from "@/state";
import { MESSAGES, TIME_ZONE } from "./config";

/**
 * next-intl without i18n routing: the locale comes from the settings in the
 * store. The server renders PT-PT; after the stored settings load, the client
 * switches the locale and `<html lang>` follows (F274, U26).
 */
export function I18nProvider({ children }: { children: ReactNode }) {
  const locale = useAppStore((s) => s.global.settings.locale);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  return (
    <NextIntlClientProvider locale={locale} messages={MESSAGES[locale]} timeZone={TIME_ZONE}>
      {children}
    </NextIntlClientProvider>
  );
}
