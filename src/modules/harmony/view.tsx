"use client";

import {
  InfoIcon,
  ListMusicIcon,
  ListPlusIcon,
  PlayIcon,
  XIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useId, useState, type CSSProperties } from "react";
import { audioEngine } from "@/audio";
import { useGoTo } from "@/nav";
import { useAppStore } from "@/state";
import {
  CADENCE_IDS,
  cadence,
  chordPitchClasses,
  isPitchClass,
  keyRole,
  keySignature,
  majorDiatonicTriads,
  minorDiatonicTriads,
  neighbourChords,
  oneFourFiveOne,
  relativeMajor,
  relativeMinor,
  twoFiveOne,
  type ChordRef,
  type PitchClass,
  type RomanChord,
} from "@/theory";
import { Button } from "@/ui/components/button";
import { toast } from "@/ui/components/toaster";
import { cn } from "@/ui/cn";
import { ModulePage } from "@/ui/module-page";
import { CircleOfFifths, type Inspected } from "./circle";
import { useKeyNames } from "./names";
import {
  CHORD_MARK_SECONDS,
  KEY_MARK_SECONDS,
  cancelCadence,
  playCadence,
  playChord,
  setHarmonyTonic,
} from "./sound";

const triad = (root: PitchClass, type: "major" | "minor"): ChordRef => ({
  root,
  type,
  inversion: 0,
});

function useTonic(): PitchClass {
  return useAppStore((s) => {
    const tonic = s.modules.harmony.tonic;
    return isPitchClass(tonic) ? tonic : 0;
  });
}

export function HarmonyView() {
  const t = useTranslations("modules.harmony");
  const tonic = useTonic();
  const names = useKeyNames();
  const [inspected, setInspected] = useState<Inspected>(null);
  // F184: hidden until the module is shown again (component state).
  const [helpOpen, setHelpOpen] = useState(true);

  useEffect(() => {
    const off = audioEngine.onStopAll(cancelCadence);
    return () => {
      off();
      cancelCadence();
    };
  }, []);

  // F193: a major key plays its triad and becomes the tonic.
  const chooseMajor = (pc: PitchClass) => {
    playChord(triad(pc, "major"), KEY_MARK_SECONDS, false);
    setHarmonyTonic(pc);
  };
  // F195: a relative minor plays its triad and sets the last chord; the tonic stays.
  const chooseMinor = (pc: PitchClass) =>
    playChord(triad(pc, "minor"), KEY_MARK_SECONDS, true);

  return (
    <ModulePage title={t("title")} description={t("description")}>
      {helpOpen && (
        <aside className="flex items-start gap-3 rounded-2xl border border-border bg-accent-soft p-4 text-sm">
          <InfoIcon className="mt-0.5 size-5 shrink-0" aria-hidden />
          <div className="flex flex-col gap-1">
            <h2 className="font-semibold">{t("helpTitle")}</h2>
            <p>{t("helpBody")}</p>
          </div>
          <Button
            size="icon-sm"
            variant="ghost"
            className="ml-auto"
            aria-label={t("hideHelp")}
            onClick={() => setHelpOpen(false)}
          >
            <XIcon aria-hidden />
          </Button>
        </aside>
      )}

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,20rem)]">
        <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4 shadow-1">
          <CircleOfFifths
            tonic={tonic}
            onChooseMajor={chooseMajor}
            onChooseMinor={chooseMinor}
            onInspect={setInspected}
          />
          <Relations />
        </div>
        <div className="flex flex-col gap-4">
          <InspectPanel inspected={inspected} tonic={tonic} />
          <KeyInfo tonic={tonic} onPlayMinor={chooseMinor} />
        </div>
      </div>

      <ChordSection
        title={t("neighboursTitle")}
        chords={neighbourChords(tonic)}
        keyTonic={tonic}
        caption={(c) => t(`neighbours.${c.roman as "IV" | "V" | "vi"}`)}
      />
      <ChordSection
        title={t("diatonicTitle", { key: names.majorLetter(tonic) })}
        chords={majorDiatonicTriads(tonic)}
        keyTonic={tonic}
        columns="grid-cols-4 sm:grid-cols-7"
      />
      <ChordSection
        title={t("diatonicMinorTitle", {
          key: names.minorLetter(relativeMinor(tonic)),
        })}
        chords={minorDiatonicTriads(relativeMinor(tonic))}
        keyTonic={tonic}
        columns="grid-cols-4 sm:grid-cols-7"
      />
      <Cadences tonic={tonic} />
      <ToProgressions tonic={tonic} />
    </ModulePage>
  );
}

function Relations() {
  const t = useTranslations("modules.harmony");
  const items = [
    { key: "dominant", dash: undefined },
    { key: "subdominant", dash: "5 4" },
    { key: "relative", dash: "1.5 3" },
  ] as const;
  return (
    <div className="flex flex-col gap-1">
      <h3 className="text-xs font-medium text-fg-muted">
        {t("relations.title")}
      </h3>
      <ul className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
        {items.map((item) => (
          <li key={item.key} className="flex items-center gap-2">
            <svg width="28" height="8" aria-hidden className="shrink-0">
              <line
                x1="1"
                y1="4"
                x2="27"
                y2="4"
                strokeWidth="2"
                strokeLinecap="round"
                strokeDasharray={item.dash}
                className="stroke-fg"
              />
            </svg>
            {t(`relations.${item.key}`)}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Small note chips: colour and name, in the spelling of the key. */
function TriadNotes({
  root,
  type,
  keyTonic,
}: {
  root: PitchClass;
  type: "major" | "minor";
  keyTonic: PitchClass;
}) {
  const names = useKeyNames();
  return (
    <ul className="flex flex-wrap gap-1.5">
      {chordPitchClasses(root, type).map((pc) => (
        <li
          key={pc}
          data-pc={pc}
          style={{ "--note": `var(--note-${pc})` } as CSSProperties}
          className="rounded-md bg-(--note) px-2 py-1 text-sm font-semibold text-note-on"
        >
          {names.noteFull(pc, keyTonic)}
        </li>
      ))}
    </ul>
  );
}

/** F192, F194: what hover, focus or press-and-hold shows. */
function InspectPanel({
  inspected,
  tonic,
}: {
  inspected: Inspected;
  tonic: PitchClass;
}) {
  const t = useTranslations("modules.harmony");
  const names = useKeyNames();
  const titleId = useId();
  return (
    <section
      aria-labelledby={titleId}
      aria-live="polite"
      className="flex min-h-36 flex-col gap-2 rounded-2xl border border-border bg-surface p-4 shadow-1"
    >
      <h2 id={titleId} className="text-xs font-medium text-fg-muted">
        {t("inspectTitle")}
      </h2>
      {inspected === null ? (
        <p className="text-sm text-fg-muted">{t("inspectHint")}</p>
      ) : inspected.kind === "major" ? (
        <>
          <p className="text-lg font-semibold">
            {t("keyMajor", { key: names.majorFull(inspected.pc) })}
          </p>
          <p className="text-sm">
            <span className="text-fg-muted">{t("role")}: </span>
            {t(`roles.${keyRole(tonic, inspected.pc)}`)}
          </p>
          <p className="text-xs text-fg-muted">{t("triadNotes")}</p>
          <TriadNotes
            root={inspected.pc}
            type="major"
            keyTonic={inspected.pc}
          />
        </>
      ) : (
        <>
          <p className="text-lg font-semibold">
            {t("keyMinor", { key: names.minorLetter(inspected.pc) })}
          </p>
          <p className="text-sm">
            {t("relativeOf", {
              key: names.majorLetter(relativeMajor(inspected.pc)),
            })}
          </p>
          <p className="text-xs text-fg-muted">{t("triadNotes")}</p>
          <TriadNotes
            root={inspected.pc}
            type="minor"
            keyTonic={relativeMajor(inspected.pc)}
          />
        </>
      )}
    </section>
  );
}

/** F196: key information and the tonic triad. */
function KeyInfo({
  tonic,
  onPlayMinor,
}: {
  tonic: PitchClass;
  onPlayMinor: (pc: PitchClass) => void;
}) {
  const t = useTranslations("modules.harmony");
  const spelling = useAppStore((s) => s.global.settings.spelling);
  const names = useKeyNames();
  const sig = keySignature(tonic, spelling);
  const shown = names.majorLetter(tonic);
  const minor = relativeMinor(tonic);
  const titleId = useId();
  return (
    <section
      aria-labelledby={titleId}
      className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4 shadow-1"
    >
      <h2 id={titleId} className="text-xs font-medium text-fg-muted">
        {t("keyTitle")}
      </h2>
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-sm">
        <dt className="text-fg-muted">{t("tonic")}</dt>
        <dd className="flex items-center gap-2 font-semibold">
          <span
            aria-hidden
            className="size-3 rounded-full"
            style={{ background: `var(--note-${tonic})` }}
          />
          {names.majorFull(tonic)}
        </dd>
        <dt className="text-fg-muted">{t("major")}</dt>
        <dd>{t("keyMajor", { key: shown })}</dd>
        <dt className="text-fg-muted">{t("relativeMinor")}</dt>
        <dd className="flex items-center gap-2">
          <span
            aria-hidden
            className="size-3 rounded-full"
            style={{ background: `var(--note-${minor})` }}
          />
          {t("keyMinor", { key: names.minorLetter(minor) })}
        </dd>
        <dt className="text-fg-muted">{t("signature")}</dt>
        <dd data-testid="key-signature">
          {sig.accidental === "sharp"
            ? t("sharps", { count: sig.count })
            : t("flats", { count: sig.count })}
          {sig.count > 0 && (
            <span aria-hidden className="ml-1 font-semibold">
              {(sig.accidental === "sharp" ? "♯" : "♭").repeat(sig.count)}
            </span>
          )}
          {sig.keyName !== shown && (
            <span className="ml-1 text-fg-muted">
              {t("signatureOf", { key: sig.keyName })}
            </span>
          )}
        </dd>
      </dl>
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="primary"
          onClick={() =>
            playChord(triad(tonic, "major"), CHORD_MARK_SECONDS, true)
          }
        >
          <PlayIcon className="fill-current" aria-hidden />
          {t("playTonic")}
        </Button>
        <Button size="sm" onClick={() => onPlayMinor(minor)}>
          <PlayIcon aria-hidden />
          {t("keyMinor", { key: names.minorLetter(minor) })}
        </Button>
      </div>
    </section>
  );
}

const QUALITY: Partial<Record<ChordRef["type"], "major" | "minor" | "dim">> = {
  major: "major",
  minor: "minor",
  dim: "dim",
};

/** F197, F198: chord tiles; a tile plays the chord and sets the last chord. */
function ChordSection({
  title,
  chords,
  keyTonic,
  caption,
  columns = "grid-cols-3",
}: {
  title: string;
  chords: readonly RomanChord[];
  keyTonic: PitchClass;
  caption?: (chord: RomanChord) => string;
  columns?: string;
}) {
  const t = useTranslations("modules.harmony");
  const tTransport = useTranslations("transport");
  const names = useKeyNames();
  const titleId = useId();
  return (
    <section aria-labelledby={titleId} className="flex flex-col gap-3">
      <h2 id={titleId} className="text-base font-semibold">
        {title}
      </h2>
      <ul className={cn("grid gap-2", columns)}>
        {chords.map((c) => {
          const name = names.chord(c.chord, keyTonic);
          const quality = QUALITY[c.chord.type];
          return (
            <li key={`${c.roman}-${c.chord.root}`}>
              <button
                type="button"
                data-pc={c.chord.root}
                aria-label={`${tTransport("play")} ${c.roman}: ${name}${caption ? `, ${caption(c)}` : ""}`}
                onClick={() => playChord(c.chord, CHORD_MARK_SECONDS, true)}
                style={
                  { "--note": `var(--note-${c.chord.root})` } as CSSProperties
                }
                className="flex min-h-16 w-full flex-col items-center justify-center gap-0.5 rounded-xl bg-(--note) px-1 py-2 text-note-on shadow-1 transition-transform active:scale-95"
              >
                <span className="text-xs font-semibold">{c.roman}</span>
                <span className="text-lg leading-tight font-bold">{name}</span>
                {caption ? (
                  <span className="text-center text-[0.7rem] font-medium">
                    {caption(c)}
                  </span>
                ) : (
                  quality && (
                    <span className="text-[0.7rem] font-medium">
                      {t(`qualities.${quality}`)}
                    </span>
                  )
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** F199, F200: the four cadences. */
function Cadences({ tonic }: { tonic: PitchClass }) {
  const t = useTranslations("modules.harmony");
  const names = useKeyNames();
  const titleId = useId();
  return (
    <section aria-labelledby={titleId} className="flex flex-col gap-3">
      <h2 id={titleId} className="text-base font-semibold">
        {t("cadencesTitle")}
      </h2>
      <ul className="grid gap-2 sm:grid-cols-2">
        {CADENCE_IDS.map((id) => {
          const chords = cadence(id, tonic);
          const name = t(`cadences.${id}.name`);
          return (
            <li
              key={id}
              className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-3 shadow-1"
            >
              <Button
                size="icon"
                variant="primary"
                className="rounded-full"
                aria-label={t("playCadence", { name })}
                onClick={() => playCadence(chords)}
              >
                <PlayIcon className="fill-current" aria-hidden />
              </Button>
              <div className="flex min-w-0 flex-col gap-1">
                <p className="text-sm">
                  <span className="font-semibold">{name}</span>{" "}
                  <span className="text-fg-muted">
                    ({t(`cadences.${id}.description`)})
                  </span>
                </p>
                <ol className="flex flex-wrap items-center gap-1 text-sm">
                  {chords.map((c, i) => (
                    <li key={i} className="flex items-center gap-1">
                      {i > 0 && (
                        <span aria-hidden className="text-fg-subtle">
                          →
                        </span>
                      )}
                      <span
                        className="rounded-md bg-(--note) px-1.5 font-semibold text-note-on"
                        style={
                          {
                            "--note": `var(--note-${c.chord.root})`,
                          } as CSSProperties
                        }
                      >
                        {c.roman} {names.chord(c.chord, tonic)}
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** F201–F204: send the tonic to Progressões. */
function ToProgressions({ tonic }: { tonic: PitchClass }) {
  const t = useTranslations("modules.harmony");
  const goTo = useGoTo();
  const names = useKeyNames();
  const titleId = useId();

  const openStyles = () => {
    // F202: the root sync of onLeave (F019) also sets both keys.
    const { setModuleState } = useAppStore.getState();
    setModuleState("progressions", { key: tonic });
    setModuleState("endless", { key: tonic });
    goTo("progressions", { tab: "styles" });
  };

  const add = (chords: readonly RomanChord[]) => {
    useAppStore
      .getState()
      .timelineActions.append(
        chords.map((c) => ({ chord: c.chord, tension: c.tension ?? false })),
      );
    toast(t("added", { count: chords.length }));
    openStyles();
  };

  return (
    <section
      aria-labelledby={titleId}
      className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4 shadow-1"
    >
      <h2 id={titleId} className="text-base font-semibold">
        {t("progressionsTitle")}
      </h2>
      <div className="flex flex-wrap gap-2">
        <Button onClick={openStyles}>
          <ListMusicIcon aria-hidden />
          {t("viewStyles", { key: names.majorLetter(tonic) })}
        </Button>
        <Button onClick={() => add(oneFourFiveOne(tonic))}>
          <ListPlusIcon aria-hidden />
          {t("addOneFourFiveOne")}
        </Button>
        <Button onClick={() => add(twoFiveOne(tonic))}>
          <ListPlusIcon aria-hidden />
          {t("addTwoFiveOne")}
        </Button>
      </div>
    </section>
  );
}
