"use client";

import { DownloadIcon, Trash2Icon, UploadIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useId, useRef, useState, type ReactNode } from "react";
import { INSTRUMENT_IDS } from "@/audio";
import { shareOrDownload } from "@/platform";
import {
  LOCALES,
  MOTION_SETTINGS,
  THEMES,
  createBackup,
  resetAllData,
  restoreBackup,
  useAppStore,
  useSettings,
} from "@/state";
import { Button } from "@/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/ui/components/dialog";
import { Slider } from "@/ui/components/slider";
import { toast } from "@/ui/components/toaster";
import { SegmentedControl } from "@/ui/components/toggle-group";
import { useShellUi } from "./ui-store";

function Field({
  label,
  children,
}: {
  label: string;
  children: (labelId: string) => ReactNode;
}) {
  const id = useId();
  return (
    <div className="flex flex-col gap-2">
      <span id={id} className="text-sm font-medium">
        {label}
      </span>
      {children(id)}
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4 border-t border-border pt-5 first:border-t-0 first:pt-0">
      <h3 className="text-xs font-semibold tracking-wide text-fg-subtle uppercase">
        {title}
      </h3>
      {children}
    </section>
  );
}

/** Settings: language, theme, note names, spelling, sound, motion, and the user's data. */
export function SettingsSheet() {
  const t = useTranslations("settings");
  const tInstr = useTranslations("instruments");
  const tStorage = useTranslations("storage");
  const tErrors = useTranslations("errors");
  const open = useShellUi((s) => s.settingsOpen);
  const setUi = useShellUi((s) => s.set);
  const settings = useSettings();
  const update = useAppStore((s) => s.updateSettings);
  const storage = useAppStore((s) => s.session.storage);
  const [confirmReset, setConfirmReset] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const backup = async () => {
    try {
      const date = new Date().toISOString().slice(0, 10);
      const result = await shareOrDownload(
        JSON.stringify(createBackup(), null, 2),
        `paleta-musical-${date}.json`,
        "application/json",
      );
      if (result !== "cancelled") toast.success(t("backupDone"));
    } catch {
      toast.error(tErrors("fileAction"));
    }
  };

  const restore = async (file: File | undefined) => {
    if (!file) return;
    try {
      const result = restoreBackup(JSON.parse(await file.text()));
      if (result.ok) toast.success(t("restoreDone"));
      else
        toast.error(
          result.reason === "version" ? t("restoreNewer") : t("restoreFailed"),
        );
    } catch {
      toast.error(t("restoreFailed"));
    } finally {
      if (fileInput.current) fileInput.current.value = "";
    }
  };

  const reset = async () => {
    setConfirmReset(false);
    await resetAllData();
    toast.success(t("resetDone"));
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => setUi({ settingsOpen: o })}>
        <DialogContent variant="sheet" closeLabel={t("close")}>
          <DialogHeader>
            <DialogTitle>{t("title")}</DialogTitle>
            <DialogDescription>{t("description")}</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-5">
            <Section title={t("language")}>
              <Field label={t("language")}>
                {(id) => (
                  <SegmentedControl
                    aria-labelledby={id}
                    value={settings.locale}
                    onValueChange={(locale) => update({ locale })}
                    options={LOCALES.map((l) => ({
                      value: l,
                      label: t(`languages.${l}`),
                    }))}
                  />
                )}
              </Field>
            </Section>
            <Section title={t("theme")}>
              <Field label={t("theme")}>
                {(id) => (
                  <SegmentedControl
                    aria-labelledby={id}
                    value={settings.theme}
                    onValueChange={(theme) => update({ theme })}
                    options={THEMES.map((v) => ({
                      value: v,
                      label: t(`themes.${v}`),
                    }))}
                  />
                )}
              </Field>
              <Field label={t("noteNames")}>
                {(id) => (
                  <SegmentedControl
                    aria-labelledby={id}
                    value={settings.noteNames}
                    onValueChange={(noteNames) => update({ noteNames })}
                    options={(["letter", "solfege", "both"] as const).map(
                      (v) => ({
                        value: v,
                        label: t(`noteNameStyles.${v}`),
                      }),
                    )}
                  />
                )}
              </Field>
              <Field label={t("spelling")}>
                {(id) => (
                  <SegmentedControl
                    aria-labelledby={id}
                    value={settings.spelling}
                    onValueChange={(spelling) => update({ spelling })}
                    options={(["sharps", "flats", "key"] as const).map((v) => ({
                      value: v,
                      label: t(`spellings.${v}`),
                    }))}
                  />
                )}
              </Field>
              <Field label={t("motion")}>
                {(id) => (
                  <SegmentedControl
                    aria-labelledby={id}
                    value={settings.motion}
                    onValueChange={(motion) => update({ motion })}
                    options={MOTION_SETTINGS.map((v) => ({
                      value: v,
                      label: t(`motions.${v}`),
                    }))}
                  />
                )}
              </Field>
            </Section>
            <Section title={t("sound")}>
              <Field label={t("instrument")}>
                {(id) => (
                  <SegmentedControl
                    aria-labelledby={id}
                    value={settings.instrument}
                    onValueChange={(instrument) => update({ instrument })}
                    options={INSTRUMENT_IDS.map((v) => ({
                      value: v,
                      label: tInstr(v),
                    }))}
                  />
                )}
              </Field>
              <Field label={t("volume")}>
                {() => (
                  <Slider
                    aria-label={t("volume")}
                    value={[Math.round(settings.volume * 100)]}
                    max={100}
                    step={1}
                    onValueChange={([v]) => update({ volume: (v ?? 80) / 100 })}
                  />
                )}
              </Field>
            </Section>
            <Section title={t("data")}>
              <p className="text-sm text-fg-muted">
                {storage === "memory"
                  ? tStorage("memory")
                  : tStorage("persistent")}{" "}
                {tStorage("safariNote")}
              </p>
              <div className="flex flex-col gap-2">
                <Button onClick={backup}>
                  <DownloadIcon aria-hidden />
                  {t("backup")}
                </Button>
                {/* A visible label over a file input that is not display:none, so the picker opens on iOS (F209). */}
                <label className="relative">
                  <input
                    ref={fileInput}
                    type="file"
                    accept="application/json,.json"
                    onChange={(e) => void restore(e.target.files?.[0])}
                    className="peer absolute inset-0 cursor-pointer opacity-0"
                  />
                  <span className="pointer-events-none inline-flex h-11 w-full items-center justify-center gap-2 rounded-md border border-border bg-surface text-sm font-medium shadow-1 peer-hover:bg-surface-2 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-focus">
                    <UploadIcon className="size-4" aria-hidden />
                    {t("restore")}
                  </span>
                </label>
                <Button
                  variant="ghost"
                  className="text-danger"
                  onClick={() => setConfirmReset(true)}
                >
                  <Trash2Icon aria-hidden />
                  {t("reset")}
                </Button>
              </div>
            </Section>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmReset} onOpenChange={setConfirmReset}>
        <DialogContent closeLabel={t("close")} role="alertdialog">
          <DialogHeader>
            <DialogTitle>{t("resetTitle")}</DialogTitle>
            <DialogDescription>{t("resetBody")}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setConfirmReset(false)}>
              {t("cancel")}
            </Button>
            <Button variant="danger" onClick={() => void reset()}>
              {t("resetConfirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
