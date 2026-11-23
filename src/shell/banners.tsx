"use client";

import { AlertTriangleIcon, DatabaseIcon, Volume2Icon } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { audioEngine, useAudioStatus } from "@/audio";
import { useIsClient } from "@/platform";
import { useAppStore } from "@/state";
import { cn } from "@/ui/cn";

function Banner({ tone, icon, children, id }: { tone: "neutral" | "danger" | "warning"; icon: ReactNode; children: ReactNode; id: string }) {
  return (
    <motion.div
      key={id}
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: "auto", opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="overflow-hidden"
    >
      <div
        className={cn(
          "flex min-h-12 items-center gap-3 px-4 py-2 text-sm",
          tone === "neutral" && "bg-surface-2 text-fg",
          tone === "danger" && "bg-danger-soft text-fg",
          tone === "warning" && "bg-warning-soft text-fg",
        )}
      >
        {icon}
        {children}
      </div>
    </motion.div>
  );
}

/** Status banners: audio unlock or failure (U27, neutral words on all platforms) and memory-only storage. */
export function Banners() {
  const t = useTranslations();
  const status = useAudioStatus();
  const storage = useAppStore((s) => s.session.storage);
  const isClient = useIsClient();
  if (!isClient) return null;

  return (
    <div role="status" aria-live="polite" className="z-(--z-banner)">
      <AnimatePresence initial={false}>
        {(status.state === "locked" || status.state === "suspended") && (
          <Banner id="unlock" tone="neutral" icon={<Volume2Icon className="size-4 shrink-0" aria-hidden />}>
            <span className="flex-1">{t("audio.enable")}</span>
            <button
              type="button"
              onClick={() => audioEngine.unlock()}
              className="min-h-11 rounded-md px-3 font-medium underline-offset-4 hover:underline"
            >
              {t("audio.enableButton")}
            </button>
          </Banner>
        )}
        {status.state === "error" && (
          <Banner id="error" tone="danger" icon={<AlertTriangleIcon className="size-4 shrink-0 text-danger" aria-hidden />}>
            <span className="flex-1">{t("audio.failed")}</span>
            <button
              type="button"
              onClick={() => audioEngine.retry()}
              className="min-h-11 rounded-md px-3 font-medium underline underline-offset-4"
            >
              {t("audio.retry")}
            </button>
          </Banner>
        )}
        {status.state === "unavailable" && (
          <Banner id="unavailable" tone="warning" icon={<AlertTriangleIcon className="size-4 shrink-0 text-warning" aria-hidden />}>
            <span className="flex-1">{t("audio.unavailable")}</span>
          </Banner>
        )}
        {storage === "memory" && (
          <Banner id="storage" tone="warning" icon={<DatabaseIcon className="size-4 shrink-0 text-warning" aria-hidden />}>
            <span className="flex-1">{t("storage.memoryOnly")}</span>
          </Banner>
        )}
      </AnimatePresence>
    </div>
  );
}
