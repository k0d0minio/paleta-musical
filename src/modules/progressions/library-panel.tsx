"use client";

import {
  CopyIcon,
  FolderOpenIcon,
  Link2Icon,
  PencilIcon,
  SaveIcon,
  Trash2Icon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, type FormEvent } from "react";
import { useAppStore } from "@/state";
import { toPitchClass } from "@/theory";
import { Button } from "@/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/ui/components/dialog";
import { toast } from "@/ui/components/toaster";
import {
  deleteProgression,
  duplicateProgression,
  renameProgression,
  saveProgression,
  useLibrary,
  type SavedProgression,
} from "./library";
import { shareUrl, type ProgressionData } from "./share";
import { parseProgressionsState, setProgressions } from "./state";
import { ChordLabel } from "./chord-label";

/** The builder line as progression data (key, scale, builder rhythm and BPM). */
export function currentBuilderData(): ProgressionData {
  const st = useAppStore.getState();
  const s = parseProgressionsState(st.modules.progressions);
  return {
    key: s.key,
    scale: s.scale,
    rhythm: s.builderRhythm,
    bpm: s.builderBpm,
    chords: st.builderLine.items.map((i) => ({
      chord: i.chord,
      tension: i.tension,
    })),
  };
}

/** Replaces the builder line with a progression (undo restores the old line). */
export function loadIntoBuilder(data: ProgressionData): void {
  const actions = useAppStore.getState().builderLineActions;
  actions.clear();
  actions.append(
    data.chords.map((c) => ({ chord: c.chord, tension: c.tension })),
  );
  setProgressions({
    key: toPitchClass(data.key),
    scale: data.scale,
    builderRhythm: data.rhythm,
    builderBpm: data.bpm,
  });
}

function NameDialog({
  open,
  title,
  initial,
  onSubmit,
  onClose,
}: {
  open: boolean;
  title: string;
  initial: string;
  onSubmit: (name: string) => void;
  onClose: () => void;
}) {
  const t = useTranslations("modules.progressions");
  const [name, setName] = useState(initial);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const value = name.trim();
    if (value) onSubmit(value.slice(0, 120));
  };
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent closeLabel={t("editor.close")}>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-xs font-medium text-fg-muted">
              {t("library.name")}
            </span>
            <input
              autoFocus
              value={name}
              maxLength={120}
              onChange={(e) => setName(e.target.value)}
              className="h-11 rounded-md border border-border bg-surface px-3"
            />
          </label>
          <DialogFooter>
            <Button variant="ghost" onClick={onClose}>
              {t("builder.cancel")}
            </Button>
            <Button type="submit" variant="primary">
              {t("builder.save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Saves the builder line in the library. */
export function SaveButton() {
  const t = useTranslations("modules.progressions");
  const { items } = useLibrary();
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <SaveIcon aria-hidden />
        {t("builder.save")}
      </Button>
      {open && (
        <NameDialog
          open
          title={t("library.saveTitle")}
          initial={t("library.defaultName", { n: items.length + 1 })}
          onClose={() => setOpen(false)}
          onSubmit={(name) => {
            void saveProgression(name, currentBuilderData()).then(() =>
              toast.success(t("library.saved")),
            );
            setOpen(false);
          }}
        />
      )}
    </>
  );
}

/** Copies a share link of the builder line (key, chords, rhythm, BPM in the hash). */
export function ShareButton() {
  const t = useTranslations("modules.progressions");
  const [link, setLink] = useState<string | null>(null);
  const share = async () => {
    const url = shareUrl(window.location.origin, currentBuilderData());
    try {
      await navigator.clipboard.writeText(url);
      toast.success(t("builder.linkCopied"));
    } catch {
      setLink(url);
    }
  };
  return (
    <>
      <Button size="sm" onClick={() => void share()}>
        <Link2Icon aria-hidden />
        {t("builder.share")}
      </Button>
      <Dialog open={link !== null} onOpenChange={(o) => !o && setLink(null)}>
        <DialogContent closeLabel={t("editor.close")}>
          <DialogHeader>
            <DialogTitle>{t("builder.linkReady")}</DialogTitle>
          </DialogHeader>
          <input
            readOnly
            value={link ?? ""}
            aria-label={t("builder.linkReady")}
            onFocus={(e) => e.currentTarget.select()}
            className="h-11 rounded-md border border-border bg-surface px-3 text-sm"
          />
        </DialogContent>
      </Dialog>
    </>
  );
}

/** The local library of saved progressions: open, rename, duplicate, delete. */
export function Library() {
  const t = useTranslations("modules.progressions");
  const { items, available, ready } = useLibrary();
  const [renaming, setRenaming] = useState<SavedProgression | null>(null);
  return (
    <section
      aria-labelledby="library-title"
      className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4"
      data-testid="library"
    >
      <h2 id="library-title" className="text-lg font-semibold">
        {t("library.title")}
      </h2>
      {!available && (
        <p className="text-sm text-fg-muted">{t("library.unavailable")}</p>
      )}
      {ready && items.length === 0 ? (
        <p className="text-sm text-fg-muted">{t("library.empty")}</p>
      ) : (
        <ul className="flex flex-col divide-y divide-border">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex flex-wrap items-center gap-2 py-2"
            >
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="truncate font-medium">{item.name}</span>
                <span className="flex flex-wrap gap-x-2 text-xs text-fg-muted">
                  {t("library.chords", { count: item.data.chords.length })}
                  <span className="flex flex-wrap gap-x-1.5">
                    {item.data.chords.slice(0, 8).map((c, i) => (
                      <ChordLabel key={i} chord={c.chord} className="text-xs" />
                    ))}
                  </span>
                </span>
              </div>
              <Button
                size="sm"
                aria-label={t("library.loadItem", { name: item.name })}
                onClick={() => {
                  loadIntoBuilder(item.data);
                  toast.success(t("library.loaded"));
                }}
              >
                <FolderOpenIcon aria-hidden />
                {t("library.load")}
              </Button>
              <Button
                size="icon-sm"
                variant="ghost"
                aria-label={t("library.renameItem", { name: item.name })}
                onClick={() => setRenaming(item)}
              >
                <PencilIcon aria-hidden />
              </Button>
              <Button
                size="icon-sm"
                variant="ghost"
                aria-label={t("library.duplicateItem", { name: item.name })}
                onClick={() =>
                  void duplicateProgression(
                    item.id,
                    t("library.copyName", { name: item.name }),
                  )
                }
              >
                <CopyIcon aria-hidden />
              </Button>
              <Button
                size="icon-sm"
                variant="ghost"
                aria-label={t("library.deleteItem", { name: item.name })}
                onClick={() =>
                  void deleteProgression(item.id).then(() =>
                    toast.success(t("library.deleted")),
                  )
                }
              >
                <Trash2Icon aria-hidden />
              </Button>
            </li>
          ))}
        </ul>
      )}
      {renaming && (
        <NameDialog
          open
          title={t("library.rename")}
          initial={renaming.name}
          onClose={() => setRenaming(null)}
          onSubmit={(name) => {
            void renameProgression(renaming.id, name);
            setRenaming(null);
          }}
        />
      )}
    </section>
  );
}
