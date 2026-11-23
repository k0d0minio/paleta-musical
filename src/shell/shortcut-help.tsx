"use client";

import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/ui/components/dialog";
import { Kbd } from "@/ui/components/kbd";
import { MODULES } from "./modules";
import { GLOBAL_SHORTCUTS, displayKey } from "./shortcuts";
import { useShellUi } from "./ui-store";
import { useCurrentModule } from "./use-current-module";

function Row({ keys, label }: { keys: readonly string[]; label: string }) {
  return (
    <li className="flex min-h-11 items-center justify-between gap-4 border-b border-border py-2 last:border-b-0">
      <span className="text-sm">{label}</span>
      <span className="flex shrink-0 gap-1">
        {keys.map((k) => (
          <Kbd key={k}>{displayKey(k)}</Kbd>
        ))}
      </span>
    </li>
  );
}

/** The shortcut help sheet (?): global shortcuts and those of the current module. */
export function ShortcutHelp() {
  const t = useTranslations();
  const open = useShellUi((s) => s.helpOpen);
  const setUi = useShellUi((s) => s.set);
  const current = useCurrentModule();
  const currentModule = MODULES.find((m) => m.id === current);

  return (
    <Dialog open={open} onOpenChange={(o) => setUi({ helpOpen: o })}>
      <DialogContent closeLabel={t("settings.close")}>
        <DialogHeader>
          <DialogTitle>{t("shortcuts.title")}</DialogTitle>
        </DialogHeader>
        <section className="flex flex-col gap-1">
          <h3 className="text-xs font-semibold tracking-wide text-fg-subtle uppercase">
            {t("shortcuts.global")}
          </h3>
          <ul>
            {GLOBAL_SHORTCUTS.map((s) => (
              <Row
                key={s.labelKey}
                keys={s.keys}
                label={t(`shortcuts.${s.labelKey}`)}
              />
            ))}
          </ul>
        </section>
        {currentModule && (
          <section className="flex flex-col gap-1">
            <h3 className="text-xs font-semibold tracking-wide text-fg-subtle uppercase">
              {t("shortcuts.module")} ·{" "}
              {t(
                `${currentModule.messageKey}.title` as "modules.palette.title",
              )}
            </h3>
            {currentModule.shortcuts.length === 0 ? (
              <p className="py-2 text-sm text-fg-muted">
                {t("shortcuts.none")}
              </p>
            ) : (
              <ul>
                {currentModule.shortcuts.map((s) => (
                  <Row
                    key={s.labelKey}
                    keys={s.keys.split(" ")}
                    label={t(
                      `${currentModule.messageKey}.${s.labelKey}` as "modules.palette.shortcutPlay",
                    )}
                  />
                ))}
              </ul>
            )}
          </section>
        )}
      </DialogContent>
    </Dialog>
  );
}
