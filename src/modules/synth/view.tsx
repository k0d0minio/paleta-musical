"use client";

import { SaveIcon, XIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import {
  useEffect,
  useId,
  useState,
  useSyncExternalStore,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  PARAM_GROUPS,
  PARAMS,
  PRESET_IDS,
  PRESETS,
  WAVEFORMS,
  applyPreset,
  fromPosition,
  matchesPreset,
  synth,
  toPosition,
  type ParamGroup,
  type ParamId,
  type Waveform,
} from "@/audio";
import { useInputNotes } from "@/input";
import { useAppStore, useOctave } from "@/state";
import { fromMidi, letterName, toMidi, toPitchClass } from "@/theory";
import { cn } from "@/ui/cn";
import { Button } from "@/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/ui/components/dialog";
import { Kbd } from "@/ui/components/kbd";
import { Knob } from "@/ui/components/knob";
import { toast } from "@/ui/components/toaster";
import { SegmentedControl } from "@/ui/components/toggle-group";
import { ModulePage } from "@/ui/module-page";
import { PlayableKeyboard } from "@/ui/music";
import { formatParamValue } from "./format";
import { Scope } from "./scope";
import {
  SOUND_NAME_MAX,
  USER_SOUNDS_MAX,
  applyUserSound,
  getSynthState,
  matchesUserSound,
  removeUserSound,
  restoreUserSound,
  saveUserSound,
  selectSynth,
  setParam,
  setSound,
  setWave,
  useSynthState,
  type UserSound,
} from "./state";

/** S021: 25 keys, two octaves and one note, from a C. */
const KEY_COUNT = 25;

/** The store drives the synth: the sound applies at once, also before the audio starts (S012). */
function useWireSynth(): void {
  useEffect(() => {
    synth.setSound(getSynthState().sound);
    return useAppStore.subscribe((state) => {
      const next = selectSynth(state).sound;
      if (next !== synth.sound) synth.setSound(next);
    });
  }, []);
}

function useHeld() {
  return useSyncExternalStore(synth.subscribe, synth.getHeld, synth.getHeld);
}

export function SynthView() {
  const t = useTranslations("modules.synth");
  useWireSynth();
  const held = useHeld();

  // Every input source plays the synth: the on-screen keys and the computer keyboard (S024–S027).
  useInputNotes({
    noteOn: ({ note }) => void synth.noteOn(toMidi(note)),
    noteOff: ({ note }) => synth.noteOff(toMidi(note)),
  });

  const lowest = held.size > 0 ? Math.min(...held) : null;

  return (
    <ModulePage title={t("title")} description={t("description")}>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,20rem)]">
        <Card title={t("scopeTitle")}>
          <Scope colourPc={lowest === null ? null : toPitchClass(lowest)} />
        </Card>
        <Sounds />
      </div>
      <Controls />
      <Keyboard held={held} />
    </ModulePage>
  );
}

function Card({
  title,
  actions,
  children,
  className,
}: {
  title: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const id = useId();
  return (
    <section
      aria-labelledby={id}
      className={cn(
        "flex min-w-0 flex-col gap-4 rounded-2xl border border-border bg-surface p-4 shadow-1 sm:p-5",
        className,
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id={id} className="text-sm font-medium text-fg-muted">
          {title}
        </h2>
        {actions}
      </div>
      {children}
    </section>
  );
}

function ParamKnob({ id }: { id: ParamId }) {
  const t = useTranslations("modules.synth");
  const locale = useLocale();
  const { sound } = useSynthState();
  const spec = PARAMS[id];
  const value = sound.params[id];
  const formatted = formatParamValue(spec, value, locale);
  return (
    <Knob
      label={t(`params.${id}`)}
      accessibleLabel={t(`paramsLong.${id}`)}
      value={toPosition(spec, value)}
      defaultValue={toPosition(spec, spec.default)}
      onValueChange={(n) => setParam(id, fromPosition(spec, n))}
      valueText={t(`units.${formatted.unit}`, { value: formatted.number })}
    />
  );
}

/** Large screens, six columns: oscillator, filter and output; then envelope and echo. */
const GROUP_ORDER: readonly ParamGroup[] = [
  "osc",
  "filter",
  "out",
  "env",
  "echo",
];
const GROUP_LAYOUT: Record<ParamGroup, string> = {
  osc: "md:col-span-2 lg:col-span-3",
  filter: "lg:col-span-2",
  out: "lg:col-span-1",
  env: "md:col-span-2 lg:col-span-3",
  echo: "md:col-span-2 lg:col-span-3",
};

const GROUPS = Object.fromEntries(PARAM_GROUPS.map((g) => [g.id, g])) as Record<
  ParamGroup,
  (typeof PARAM_GROUPS)[number]
>;

/** S013–S019: the parameters, by group (SR1), and the two waveforms (S001). */
function Controls() {
  const t = useTranslations("modules.synth");
  const { sound } = useSynthState();
  const waves = WAVEFORMS.map((w) => ({ value: w, label: t(`waves.${w}`) }));
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
      {GROUP_ORDER.map((id) => GROUPS[id]).map((group) => (
        <Card
          key={group.id}
          title={t(`groups.${group.id}`)}
          className={GROUP_LAYOUT[group.id]}
        >
          {group.id === "osc" && (
            <div className="grid gap-3">
              {([1, 2] as const).map((osc) => (
                <WaveChoice
                  key={osc}
                  osc={osc}
                  value={osc === 1 ? sound.wave1 : sound.wave2}
                  options={waves}
                />
              ))}
            </div>
          )}
          <div className="flex flex-wrap justify-around gap-x-2 gap-y-4">
            {group.params.map((id) => (
              <ParamKnob key={id} id={id} />
            ))}
          </div>
        </Card>
      ))}
    </div>
  );
}

function WaveChoice({
  osc,
  value,
  options,
}: {
  osc: 1 | 2;
  value: Waveform;
  options: readonly { value: Waveform; label: string }[];
}) {
  const t = useTranslations("modules.synth");
  const id = useId();
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <span id={id} className="text-xs font-medium text-fg-muted">
        {t("waveLabel", { n: osc })}
      </span>
      <SegmentedControl
        aria-labelledby={id}
        value={value}
        onValueChange={(w) => setWave(osc, w)}
        options={options}
        className="flex-nowrap [&>button]:min-w-0 [&>button]:px-1.5 [&>button]:text-xs"
      />
    </div>
  );
}

/** S020: the four presets, and the user's own sounds (SU6). */
function Sounds() {
  const t = useTranslations("modules.synth");
  const { sound, sounds } = useSynthState();
  const [saving, setSaving] = useState(false);

  const remove = (entry: UserSound) => {
    const index = sounds.findIndex((s) => s.id === entry.id);
    removeUserSound(entry.id);
    toast(t("removed", { name: entry.name }), {
      action: {
        label: t("undo"),
        onClick: () => restoreUserSound(entry, index),
      },
    });
  };

  return (
    <Card
      title={t("soundsTitle")}
      actions={
        <Button
          size="sm"
          variant="ghost"
          onClick={() =>
            sounds.length >= USER_SOUNDS_MAX
              ? toast.warning(t("full", { max: USER_SOUNDS_MAX }))
              : setSaving(true)
          }
        >
          <SaveIcon aria-hidden />
          {t("save")}
        </Button>
      }
    >
      <div
        role="group"
        aria-label={t("presetsLabel")}
        className="grid grid-cols-2 gap-2"
      >
        {PRESET_IDS.map((id) => {
          const preset = PRESETS[id];
          const active = matchesPreset(sound, preset);
          return (
            <Button
              key={id}
              variant={active ? "primary" : "secondary"}
              aria-pressed={active}
              onClick={() =>
                setSound(applyPreset(getSynthState().sound, preset))
              }
            >
              {t(`presets.${id}`)}
            </Button>
          );
        })}
      </div>
      <div className="flex flex-col gap-2">
        <h3 className="text-xs font-medium text-fg-muted">
          {t("userSoundsLabel")}
        </h3>
        {sounds.length === 0 ? (
          <p className="text-sm text-fg-subtle">{t("noUserSounds")}</p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {sounds.map((entry) => {
              const active = matchesUserSound(sound, entry);
              return (
                <li key={entry.id} className="flex items-center gap-1">
                  <Button
                    variant={active ? "primary" : "subtle"}
                    aria-pressed={active}
                    onClick={() => applyUserSound(entry)}
                    className="min-w-0 flex-1 justify-start"
                  >
                    <span className="truncate">{entry.name}</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={t("remove", { name: entry.name })}
                    onClick={() => remove(entry)}
                  >
                    <XIcon aria-hidden />
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      {saving && (
        <SaveDialog
          initial={t("defaultName", { n: sounds.length + 1 })}
          onClose={() => setSaving(false)}
        />
      )}
    </Card>
  );
}

function SaveDialog({
  initial,
  onClose,
}: {
  initial: string;
  onClose: () => void;
}) {
  const t = useTranslations("modules.synth");
  const [name, setName] = useState(initial);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const value = name.trim();
    if (!value) return;
    if (saveUserSound(value)) toast.success(t("saved", { name: value }));
    else toast.warning(t("full", { max: USER_SOUNDS_MAX }));
    onClose();
  };
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent closeLabel={t("close")}>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>{t("saveTitle")}</DialogTitle>
          </DialogHeader>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-xs font-medium text-fg-muted">
              {t("nameLabel")}
            </span>
            <input
              autoFocus
              value={name}
              maxLength={SOUND_NAME_MAX}
              onChange={(e) => setName(e.target.value)}
              className="h-11 rounded-md border border-border bg-surface px-3"
            />
          </label>
          <DialogFooter>
            <Button variant="ghost" onClick={onClose}>
              {t("cancel")}
            </Button>
            <Button type="submit" variant="primary" disabled={!name.trim()}>
              {t("save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** S021–S028, S032, S033: the keyboard, its range, the instruction and the help. */
function Keyboard({ held }: { held: ReadonlySet<number> }) {
  const t = useTranslations("modules.synth");
  const octave = useOctave();
  // S021, S022: the first key is the C of the app's octave (Z / X and the transport bar change it).
  const first = toMidi({ pc: 0, octave });
  const last = first + KEY_COUNT - 1;
  const lastNote = fromMidi(last);
  const from = `${letterName(0)}${octave}`;
  const to = `${letterName(lastNote.pc)}${lastNote.octave}`;
  return (
    <Card
      title={t("keyboardTitle")}
      actions={
        <span className="text-sm font-medium text-fg tabular">
          {t("range", { from, to })}
        </span>
      }
    >
      <p className="text-sm text-fg-muted">{t("instructions")}</p>
      <PlayableKeyboard
        firstMidi={first}
        count={KEY_COUNT}
        held={held}
        label={t("keyboardLabel", { from, to })}
      />
      <details className="group text-sm">
        <summary className="inline-flex min-h-11 cursor-pointer items-center font-medium text-fg-muted hover:text-fg">
          {t("helpTitle")}
        </summary>
        <ul className="mt-1 flex list-disc flex-col gap-1.5 pl-5 text-fg-muted">
          <li>{t("help.adjust")}</li>
          <li>{t("help.fine")}</li>
          <li>{t("help.reset")}</li>
          <li>
            {t.rich("help.keys", {
              keys: (chunks) => <Kbd>{chunks}</Kbd>,
            })}
          </li>
          <li>
            {t.rich("help.octave", {
              z: (chunks) => <Kbd>{chunks}</Kbd>,
              x: (chunks) => <Kbd>{chunks}</Kbd>,
            })}
          </li>
        </ul>
      </details>
    </Card>
  );
}
