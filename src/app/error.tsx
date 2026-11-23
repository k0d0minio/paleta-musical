"use client";

import { ErrorPanel } from "@/ui/module-boundary";

/** The root error page: an error that a module boundary did not catch. */
export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <ErrorPanel onRetry={reset} />;
}
