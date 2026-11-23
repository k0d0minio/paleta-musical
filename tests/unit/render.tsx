import { render, type RenderOptions } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type { ReactElement, ReactNode } from "react";
import ptPT from "@/i18n/messages/pt-PT.json";
import { TooltipProvider } from "@/ui/components/tooltip";

function Providers({ children }: { children: ReactNode }) {
  return (
    <NextIntlClientProvider locale="pt-PT" messages={ptPT} timeZone="Europe/Lisbon">
      <TooltipProvider>{children}</TooltipProvider>
    </NextIntlClientProvider>
  );
}

export function renderWithProviders(ui: ReactElement, options?: RenderOptions) {
  return render(ui, { wrapper: Providers, ...options });
}
