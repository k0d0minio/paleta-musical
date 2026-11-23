"use client";

import { KeyboardIcon, SettingsIcon, SquareIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { Dialog as DialogPrimitive } from "radix-ui";
import { audioEngine } from "@/audio";
import { useGoTo } from "@/nav";
import { CHORD_TYPES, SCALES } from "@/theory";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/ui/components/command";
import { MODULES } from "./modules";
import { useShellUi } from "./ui-store";

/** Ctrl+K / Cmd+K: go to a module, a scale or a chord, or run an action. */
export function CommandPalette() {
  const t = useTranslations();
  const open = useShellUi((s) => s.commandOpen);
  const setUi = useShellUi((s) => s.set);
  const goTo = useGoTo();

  const run = (fn: () => void) => {
    setUi({ commandOpen: false });
    fn();
  };

  return (
    <DialogPrimitive.Root
      open={open}
      onOpenChange={(o) => setUi({ commandOpen: o })}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-(--z-overlay) bg-neutral-950/40 backdrop-blur-[2px]" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className="fixed top-[12dvh] left-1/2 z-(--z-modal) w-[min(36rem,calc(100vw-2rem))] -translate-x-1/2 overflow-hidden rounded-xl border border-border bg-surface shadow-3"
        >
          <DialogPrimitive.Title className="sr-only">
            {t("app.commandPalette")}
          </DialogPrimitive.Title>
          <Command label={t("app.commandPalette")}>
            <CommandInput placeholder={t("command.placeholder")} />
            <CommandList>
              <CommandEmpty>{t("command.empty")}</CommandEmpty>
              <CommandGroup heading={t("command.modules")}>
                {MODULES.map((m) => {
                  const Icon = m.icon;
                  const name = t(
                    `${m.messageKey}.title` as "modules.palette.title",
                  );
                  return (
                    <CommandItem
                      key={m.id}
                      value={`module ${name}`}
                      onSelect={() => run(() => goTo(m.id))}
                    >
                      <Icon className="size-4 text-fg-muted" aria-hidden />
                      {t("command.goTo", { name })}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
              <CommandGroup heading={t("command.scales")}>
                {SCALES.map((s) => (
                  <CommandItem
                    key={s.id}
                    value={`scale ${t(`scales.${s.id}`)}`}
                    onSelect={() =>
                      run(() => goTo("palette", { mode: "scale", scale: s.id }))
                    }
                  >
                    {t(`scales.${s.id}`)}
                  </CommandItem>
                ))}
              </CommandGroup>
              <CommandGroup heading={t("command.chords")}>
                {CHORD_TYPES.map((c) => (
                  <CommandItem
                    key={c.id}
                    value={`chord ${t(`chordTypes.${c.id}`)} ${c.symbol}`}
                    onSelect={() =>
                      run(() => goTo("palette", { mode: "chord", chord: c.id }))
                    }
                  >
                    <span className="w-14 font-semibold">C{c.symbol}</span>
                    {t(`chordTypes.${c.id}`)}
                  </CommandItem>
                ))}
              </CommandGroup>
              <CommandGroup heading={t("command.actions")}>
                <CommandItem
                  value="action settings"
                  onSelect={() => run(() => setUi({ settingsOpen: true }))}
                >
                  <SettingsIcon className="size-4 text-fg-muted" aria-hidden />
                  {t("command.openSettings")}
                </CommandItem>
                <CommandItem
                  value="action shortcuts"
                  onSelect={() => run(() => setUi({ helpOpen: true }))}
                >
                  <KeyboardIcon className="size-4 text-fg-muted" aria-hidden />
                  {t("command.showShortcuts")}
                </CommandItem>
                <CommandItem
                  value="action stop"
                  onSelect={() => run(() => audioEngine.stopAll())}
                >
                  <SquareIcon className="size-4 text-fg-muted" aria-hidden />
                  {t("command.stopAll")}
                </CommandItem>
              </CommandGroup>
            </CommandList>
          </Command>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
