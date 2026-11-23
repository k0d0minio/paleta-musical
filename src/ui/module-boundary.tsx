"use client";

import { RotateCcwIcon, TriangleAlertIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { ErrorBoundary, type FallbackProps } from "react-error-boundary";
import { Button } from "./components/button";

export function ErrorPanel({ onRetry }: { onRetry?: () => void }) {
  const t = useTranslations("errors");
  return (
    <div
      role="alert"
      className="mx-auto flex max-w-md flex-col items-center gap-3 rounded-xl border border-border bg-surface p-8 text-center shadow-1"
    >
      <TriangleAlertIcon className="size-8 text-danger" aria-hidden />
      <h2 className="text-lg font-semibold">{t("title")}</h2>
      <p className="text-sm text-fg-muted">{t("body")}</p>
      {onRetry && (
        <Button variant="primary" onClick={onRetry}>
          <RotateCcwIcon aria-hidden />
          {t("retry")}
        </Button>
      )}
    </div>
  );
}

function Fallback({ resetErrorBoundary }: FallbackProps) {
  return <ErrorPanel onRetry={resetErrorBoundary} />;
}

/** One error boundary per module, with a retry. An error in one module never takes the shell down. */
export function ModuleBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary
      FallbackComponent={Fallback}
      onError={(error) => {
        console.error(error);
      }}
    >
      {children}
    </ErrorBoundary>
  );
}
