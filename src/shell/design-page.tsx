"use client";

import { BellIcon, ChevronDownIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { audioEngine, markSounding } from "@/audio";
import { useAppStore } from "@/state";
import {
  PITCH_CLASSES,
  chordPitchClasses,
  voiceChord,
  type ChordRef,
} from "@/theory";
import { cn } from "@/ui/cn";
import { Button } from "@/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/ui/components/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/ui/components/dropdown-menu";
import { Kbd } from "@/ui/components/kbd";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/ui/components/popover";
import { Slider } from "@/ui/components/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/ui/components/tabs";
import { toast } from "@/ui/components/toaster";
import { SegmentedControl } from "@/ui/components/toggle-group";
import { Tooltip } from "@/ui/components/tooltip";
import { contrastRatio } from "@/ui/tokens/color";
import {
  BpmField,
  ChordName,
  NoteChip,
  NoteName,
  PianoKeys,
  Stepper,
  TransportButton,
} from "@/ui/music";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
      {children}
    </section>
  );
}

const SEMANTIC = [
  "bg",
  "surface",
  "surface-2",
  "border",
  "fg",
  "fg-muted",
  "accent",
  "focus",
  "success",
  "warning",
  "danger",
  "tension",
];

function ThemePanel({ theme }: { theme: "light" | "dark" }) {
  const t = useTranslations("dev");
  const ref = useRef<HTMLDivElement>(null);
  const [ratios, setRatios] = useState<string[]>([]);
  useEffect(() => {
    if (!ref.current) return;
    const style = getComputedStyle(ref.current);
    const surface = style.getPropertyValue("--surface");
    setRatios(
      PITCH_CLASSES.map((pc) =>
        contrastRatio(style.getPropertyValue(`--note-${pc}`), surface).toFixed(
          2,
        ),
      ),
    );
  }, []);
  return (
    <div
      ref={ref}
      className={cn(
        theme,
        "flex flex-col gap-4 rounded-2xl border border-border bg-surface p-4 text-fg",
      )}
    >
      <h3 className="font-semibold">{t(theme)}</h3>
      <div className="flex flex-wrap gap-2">
        {SEMANTIC.map((name) => (
          <div key={name} className="flex w-24 flex-col gap-1 text-xs">
            <span
              className="h-10 rounded-md border border-border"
              style={{ background: `var(--${name})` }}
            />
            <code className="text-fg-muted">--{name}</code>
          </div>
        ))}
      </div>
      <p className="text-sm text-fg-muted">{t("contrast")}</p>
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
        {PITCH_CLASSES.map((pc) => (
          <div key={pc} className="flex flex-col items-center gap-1">
            <NoteChip pc={pc} />
            <code className="text-xs text-fg-muted tabular">
              --note-{pc} · {ratios[pc] ?? "…"}:1
            </code>
          </div>
        ))}
      </div>
    </div>
  );
}

const SAMPLE_CHORDS: ChordRef[] = [
  { root: 0, type: "maj7", inversion: 0 },
  { root: 9, type: "min7", inversion: 0 },
  { root: 2, type: "dom9", inversion: 0 },
  { root: 7, type: "dom7sus4", inversion: 0 },
];

/** /dev/design: every token and component on one page. Not linked in the navigation. */
export function DesignPage() {
  const t = useTranslations("dev");
  const tc = useTranslations("transport");
  const octave = useAppStore((s) => s.global.octave);
  const setLastChord = useAppStore((s) => s.setLastChord);
  const [bpm, setBpm] = useState(90);
  const [step, setStep] = useState(4);
  const [playing, setPlaying] = useState(false);
  const [choice, setChoice] = useState<"a" | "b" | "c">("a");

  const playChord = (chord: ChordRef) => {
    audioEngine.playChord(voiceChord(chord, octave));
    setLastChord(chordPitchClasses(chord.root, chord.type), chord);
  };

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-12 pb-16">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="text-fg-muted">{t("intro")}</p>
      </header>

      <Section title={t("colours")}>
        <div className="grid gap-4 lg:grid-cols-2">
          <ThemePanel theme="light" />
          <ThemePanel theme="dark" />
        </div>
      </Section>

      <Section title={t("typography")}>
        <div className="flex flex-col gap-2">
          {(
            [
              "text-3xl",
              "text-2xl",
              "text-xl",
              "text-lg",
              "text-base",
              "text-sm",
              "text-xs",
            ] as const
          ).map((size) => (
            <p key={size} className={cn(size, "flex items-baseline gap-4")}>
              <code className="w-20 shrink-0 text-xs text-fg-subtle">
                {size}
              </code>
              {t("sample")}
            </p>
          ))}
          <p className="text-2xl font-semibold tabular">120 · 128 · 090 BPM</p>
        </div>
      </Section>

      <Section title={t("spacing")}>
        <div className="flex flex-col gap-1">
          {[1, 2, 3, 4, 6, 8, 12, 16].map((n) => (
            <div key={n} className="flex items-center gap-3 text-xs">
              <code className="w-10 text-fg-subtle">{n * 4}px</code>
              <span
                className="h-3 rounded-sm bg-fg"
                style={{ width: `calc(var(--spacing) * ${n})` }}
              />
            </div>
          ))}
        </div>
      </Section>

      <div className="grid gap-8 md:grid-cols-3">
        <Section title={t("radius")}>
          <div className="flex flex-wrap gap-3">
            {["sm", "md", "lg", "xl", "2xl"].map((r) => (
              <div key={r} className="flex flex-col items-center gap-1 text-xs">
                <span
                  className="size-14 border border-border-strong bg-surface-2"
                  style={{ borderRadius: `var(--radius-${r})` }}
                />
                <code className="text-fg-subtle">{r}</code>
              </div>
            ))}
          </div>
        </Section>
        <Section title={t("elevation")}>
          <div className="flex gap-4">
            {[1, 2, 3].map((e) => (
              <div
                key={e}
                className="grid size-16 place-items-center rounded-lg bg-surface text-xs"
                style={{ boxShadow: `var(--shadow-${e})` }}
              >
                {e}
              </div>
            ))}
          </div>
        </Section>
        <Section title={t("motion")}>
          <ul className="text-xs text-fg-muted">
            <li>
              <code>--duration-fast</code> 120ms · <code>--duration-base</code>{" "}
              200ms · <code>--duration-slow</code> 320ms
            </li>
            <li>
              <code>--ease-out</code> · <code>--ease-in-out</code> ·{" "}
              <code>--ease-spring</code>
            </li>
          </ul>
          <Button size="sm" onClick={() => markSounding([0, 4, 7], 0.7)}>
            data-sounding (0.7 s)
          </Button>
        </Section>
      </div>

      <Section title={t("components")}>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="primary">{t("semantic.accent")}</Button>
          <Button>{t("toggle")}</Button>
          <Button variant="subtle">{t("toggle")}</Button>
          <Button variant="ghost">{t("toggle")}</Button>
          <Button variant="danger">{t("semantic.danger")}</Button>
          <Tooltip content={t("tooltip")}>
            <Button size="icon" aria-label={t("tooltip")}>
              <BellIcon aria-hidden />
            </Button>
          </Tooltip>
          <Dialog>
            <DialogTrigger asChild>
              <Button>{t("openDialog")}</Button>
            </DialogTrigger>
            <DialogContent closeLabel={t("title")}>
              <DialogHeader>
                <DialogTitle>{t("openDialog")}</DialogTitle>
                <DialogDescription>{t("dialogBody")}</DialogDescription>
              </DialogHeader>
            </DialogContent>
          </Dialog>
          <Popover>
            <PopoverTrigger asChild>
              <Button>{t("popover")}</Button>
            </PopoverTrigger>
            <PopoverContent>{t("popoverBody")}</PopoverContent>
          </Popover>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button>
                {t("menu")}
                <ChevronDownIcon aria-hidden />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {[1, 2, 3].map((n) => (
                <DropdownMenuItem key={n}>
                  {t("menuItem", { n })}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button onClick={() => toast(t("toast"))}>{t("showToast")}</Button>
          <span className="flex gap-1">
            <Kbd>Ctrl</Kbd>
            <Kbd>K</Kbd>
          </span>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Tabs defaultValue="1" className="flex flex-col gap-3">
            <TabsList className="self-start">
              <TabsTrigger value="1">{t("tabOne")}</TabsTrigger>
              <TabsTrigger value="2">{t("tabTwo")}</TabsTrigger>
            </TabsList>
            <TabsContent value="1" className="text-sm text-fg-muted">
              {t("tabBody", { n: 1 })}
            </TabsContent>
            <TabsContent value="2" className="text-sm text-fg-muted">
              {t("tabBody", { n: 2 })}
            </TabsContent>
          </Tabs>
          <div className="flex flex-col gap-3">
            <SegmentedControl
              aria-label={t("toggle")}
              value={choice}
              onValueChange={setChoice}
              options={[
                { value: "a", label: "A" },
                { value: "b", label: "B" },
                { value: "c", label: "C" },
              ]}
            />
            <Slider aria-label={tc("volume")} defaultValue={[60]} max={100} />
          </div>
        </div>
        <div className="flex flex-wrap gap-2 text-sm">
          {(["success", "warning", "danger", "tension"] as const).map(
            (tone) => (
              <span
                key={tone}
                className={cn(
                  "rounded-md px-3 py-1.5 font-medium",
                  tone === "tension" && "hatch",
                )}
                style={{
                  background: `var(--${tone}-soft)`,
                  color: `var(--${tone})`,
                }}
              >
                {t(`semantic.${tone}`)}
              </span>
            ),
          )}
        </div>
      </Section>

      <Section title={t("music")}>
        <div className="flex flex-wrap items-end gap-3">
          <NoteChip pc={0} selected size="sm" />
          <NoteChip pc={4} size="sm" />
          <NoteChip pc={6} tension size="sm" />
          <NoteChip pc={10} dimmed size="sm" />
          <span className="flex flex-col gap-1 text-sm">
            <NoteName pc={1} style="letter" />
            <NoteName pc={1} style="solfege" />
            <NoteName pc={1} style="both" spelling="flats" />
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {SAMPLE_CHORDS.map((c) => (
            <Button key={`${c.root}-${c.type}`} onClick={() => playChord(c)}>
              <ChordName chord={c} />
            </Button>
          ))}
        </div>
        <PianoKeys />
        <div className="flex flex-wrap items-center gap-6">
          <Stepper
            label={tc("octave")}
            value={step}
            min={2}
            max={6}
            onChange={setStep}
          />
          <BpmField value={bpm} onChange={setBpm} />
          <TransportButton
            playing={playing}
            onToggle={() => setPlaying((p) => !p)}
          />
        </div>
      </Section>
    </div>
  );
}
