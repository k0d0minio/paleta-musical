"use client";

import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  GripVerticalIcon,
  Layers2Icon,
  PencilIcon,
  Trash2Icon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { ContextMenu as ContextMenuPrimitive } from "radix-ui";
import { useId, type KeyboardEvent, type ReactNode } from "react";
import { useRhythmPlayer } from "@/audio";
import type { ListActions, ProgressionItem } from "@/state";
import {
  getChordType,
  inversionCount,
  letterName,
  voiceChord,
  type ChordRef,
} from "@/theory";
import { cn } from "@/ui/cn";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/ui/components/dropdown-menu";
import { ChordLabel, chordText } from "./chord-label";
import { playChordRef } from "./play";

/** Moves the focus to the chord button of an item after a list change. */
function focusItem(listId: string, itemId: string | undefined) {
  if (!itemId) return;
  requestAnimationFrame(() => {
    document
      .querySelector<HTMLElement>(
        `[data-list="${listId}"] [data-item-id="${itemId}"] [data-chord-button]`,
      )
      ?.focus();
  });
}

/** Up to 4 inversions (F086, F118); each lists its notes. */
export function inversionOptions(chord: ChordRef) {
  const count = Math.min(4, inversionCount(getChordType(chord.type).intervals));
  return Array.from({ length: count }, (_, k) => {
    const inverted = { ...chord, inversion: k };
    return {
      inversion: k,
      chord: inverted,
      notes: voiceChord(inverted, 4)
        .map((n) => letterName(n.pc))
        .join(" · "),
    };
  });
}

export function useInversionLabel() {
  const t = useTranslations("modules.progressions.inversions");
  return (k: number) =>
    k <= 3 ? t(String(k) as "0" | "1" | "2" | "3") : t("n", { n: k });
}

interface ItemProps {
  item: ProgressionItem;
  index: number;
  count: number;
  listId: string;
  playing: boolean;
  actions: ListActions;
  onEdit: (item: ProgressionItem) => void;
  withInversions: boolean;
}

function MenuItem({
  onSelect,
  children,
  disabled,
}: {
  onSelect: () => void;
  children: ReactNode;
  disabled?: boolean;
}) {
  return (
    <ContextMenuPrimitive.Item
      disabled={disabled}
      onSelect={onSelect}
      className="flex min-h-11 cursor-default items-center gap-2 rounded-md px-3 text-sm outline-none select-none data-[disabled]:opacity-40 data-[highlighted]:bg-surface-2"
    >
      {children}
    </ContextMenuPrimitive.Item>
  );
}

function SortableChord({
  item,
  index,
  count,
  listId,
  playing,
  actions,
  onEdit,
  withInversions,
}: ItemProps) {
  const t = useTranslations("modules.progressions");
  const inversionLabel = useInversionLabel();
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });
  const name = chordText(item.chord);

  const move = (delta: number) => {
    const to = index + delta;
    if (to < 0 || to >= count) return;
    actions.move(index, to);
    focusItem(listId, item.id);
  };
  const remove = (focusNext: boolean) => {
    actions.remove(item.id);
    if (focusNext) {
      const items = document.querySelectorAll<HTMLElement>(
        `[data-list="${listId}"] [data-item-id]`,
      );
      const next = items[index + 1] ?? items[index - 1];
      focusItem(listId, next?.dataset.itemId);
    }
  };
  const setInversion = (k: number) => {
    const chord = { ...item.chord, inversion: k };
    actions.replace(item.id, chord);
    playChordRef(chord, 1.6);
  };

  // F121/F140 by keyboard: Alt+arrows move; Delete removes (U04).
  const onKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    if (e.key === "Delete" || e.key === "Backspace") {
      e.preventDefault();
      remove(true);
    } else if (e.altKey && (e.key === "ArrowUp" || e.key === "ArrowLeft")) {
      e.preventDefault();
      move(-1);
    } else if (e.altKey && (e.key === "ArrowDown" || e.key === "ArrowRight")) {
      e.preventDefault();
      move(1);
    }
  };

  const iconButton =
    "grid size-9 place-items-center rounded-md text-fg-muted hover:bg-surface-2 hover:text-fg disabled:opacity-30";

  return (
    <li
      ref={setNodeRef}
      data-item-id={item.id}
      data-playing={playing || undefined}
      data-testid="chord-item"
      style={{
        transform: CSS.Translate.toString(transform),
        transition,
      }}
      className={cn(
        "relative flex w-full flex-col gap-1 rounded-xl border border-border bg-surface p-2 shadow-1 sm:w-44",
        item.tension && "border-dashed border-tension",
        playing && "ring-2 ring-accent",
        isDragging && "z-10 opacity-80 shadow-3",
      )}
    >
      {item.tension && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-0 rounded-xl hatch"
        />
      )}
      <ContextMenuPrimitive.Root>
        <ContextMenuPrimitive.Trigger asChild>
          <div className="relative flex items-center gap-1">
            <button
              type="button"
              ref={setActivatorNodeRef}
              {...attributes}
              {...listeners}
              aria-label={t("list.drag", { chord: name })}
              className="grid size-9 shrink-0 cursor-grab touch-none place-items-center rounded-md text-fg-subtle hover:bg-surface-2 active:cursor-grabbing"
            >
              <GripVerticalIcon className="size-4" aria-hidden />
            </button>
            <span className="w-6 shrink-0 text-xs font-semibold text-fg-muted tabular">
              {t("list.position", { n: index + 1 })}
            </span>
            <button
              type="button"
              data-chord-button
              onClick={() => playChordRef(item.chord)}
              onKeyDown={onKeyDown}
              aria-label={t("list.itemLabel", { n: index + 1, chord: name })}
              aria-current={playing || undefined}
              className="flex min-h-11 min-w-0 flex-1 items-center rounded-md px-2 text-left text-base hover:bg-surface-2"
            >
              <ChordLabel chord={item.chord} tension={item.tension} />
              {playing && <span className="sr-only">({t("playing")})</span>}
            </button>
          </div>
        </ContextMenuPrimitive.Trigger>
        <ContextMenuPrimitive.Portal>
          <ContextMenuPrimitive.Content
            aria-label={t("list.menu", { chord: name })}
            className="z-(--z-overlay) min-w-44 rounded-lg border border-border bg-surface p-1 shadow-3"
          >
            <MenuItem onSelect={() => onEdit(item)}>
              <PencilIcon className="size-4" aria-hidden />
              {t("list.edit")}
            </MenuItem>
            {withInversions &&
              inversionOptions(item.chord).map((o) => (
                <MenuItem
                  key={o.inversion}
                  onSelect={() => setInversion(o.inversion)}
                >
                  <Layers2Icon className="size-4" aria-hidden />
                  {inversionLabel(o.inversion)}
                </MenuItem>
              ))}
            <MenuItem onSelect={() => move(-1)} disabled={index === 0}>
              <ChevronLeftIcon className="size-4" aria-hidden />
              {t("list.moveEarlier")}
            </MenuItem>
            <MenuItem onSelect={() => move(1)} disabled={index === count - 1}>
              <ChevronRightIcon className="size-4" aria-hidden />
              {t("list.moveLater")}
            </MenuItem>
            <MenuItem onSelect={() => remove(false)}>
              <Trash2Icon className="size-4" aria-hidden />
              {t("list.remove")}
            </MenuItem>
          </ContextMenuPrimitive.Content>
        </ContextMenuPrimitive.Portal>
      </ContextMenuPrimitive.Root>
      <div className="relative flex items-center justify-between">
        <button
          type="button"
          className={iconButton}
          aria-label={t("list.editChord", { chord: name })}
          onClick={() => onEdit(item)}
        >
          <PencilIcon className="size-4" aria-hidden />
        </button>
        {withInversions && (
          <DropdownMenu>
            <DropdownMenuTrigger
              className={iconButton}
              aria-label={t("chooseInversion", { chord: name })}
            >
              <Layers2Icon className="size-4" aria-hidden />
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {inversionOptions(item.chord).map((o) => (
                <DropdownMenuItem
                  key={o.inversion}
                  onSelect={() => setInversion(o.inversion)}
                  aria-current={o.inversion === item.chord.inversion}
                  className={cn(
                    "flex flex-col items-start gap-0 py-1",
                    o.inversion === item.chord.inversion && "font-semibold",
                  )}
                >
                  <span>{inversionLabel(o.inversion)}</span>
                  <span className="text-xs text-fg-muted">{o.notes}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        <button
          type="button"
          className={iconButton}
          aria-label={t("list.moveEarlier")}
          disabled={index === 0}
          onClick={() => move(-1)}
        >
          <ChevronLeftIcon className="size-4" aria-hidden />
        </button>
        <button
          type="button"
          className={iconButton}
          aria-label={t("list.moveLater")}
          disabled={index === count - 1}
          onClick={() => move(1)}
        >
          <ChevronRightIcon className="size-4" aria-hidden />
        </button>
        <button
          type="button"
          className={iconButton}
          aria-label={t("list.removeChord", { chord: name })}
          onClick={() => remove(true)}
        >
          <Trash2Icon className="size-4" aria-hidden />
        </button>
      </div>
    </li>
  );
}

/**
 * A sortable chord list: the builder line and the timeline (F118–F123,
 * F137–F142). Reorder by mouse, touch (U29) or keyboard on the handle;
 * edit, move and remove by button, by the chord menu (right-click or
 * long-press) and by keys (Delete, Alt+arrows).
 */
export function ChordList({
  items,
  actions,
  source,
  label,
  onEdit,
  withInversions = false,
}: {
  items: readonly ProgressionItem[];
  actions: ListActions;
  /** Rhythm player source of this list. */
  source: string;
  label: string;
  onEdit: (item: ProgressionItem) => void;
  withInversions?: boolean;
}) {
  const t = useTranslations("modules.progressions.list");
  const player = useRhythmPlayer();
  const listId = useId().replace(/:/g, "");
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 150, tolerance: 6 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );
  const nameOf = (id: string | number | undefined) => {
    const item = items.find((i) => i.id === id);
    return item ? chordText(item.chord) : "";
  };
  const position = (id: string | number | undefined) =>
    items.findIndex((i) => i.id === id) + 1;
  const announcements: Announcements = {
    onDragStart: ({ active }) =>
      t("dndPickUp", { chord: nameOf(active.id), n: position(active.id) }),
    onDragOver: ({ active, over }) =>
      over
        ? t("dndOver", { chord: nameOf(active.id), n: position(over.id) })
        : undefined,
    onDragEnd: ({ active, over }) =>
      over
        ? t("dndDrop", { chord: nameOf(active.id), n: position(over.id) })
        : t("dndCancel"),
    onDragCancel: () => t("dndCancel"),
  };

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const from = items.findIndex((i) => i.id === active.id);
    const to = items.findIndex((i) => i.id === over.id);
    if (from >= 0 && to >= 0) actions.move(from, to);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={onDragEnd}
      accessibility={{
        announcements,
        screenReaderInstructions: { draggable: t("dndInstructions") },
      }}
    >
      <SortableContext
        items={items.map((i) => i.id)}
        strategy={rectSortingStrategy}
      >
        <ol
          aria-label={label}
          data-list={listId}
          data-testid={`${source}-list`}
          className="flex flex-wrap gap-2"
        >
          {items.map((item, index) => (
            <SortableChord
              key={item.id}
              item={item}
              index={index}
              count={items.length}
              listId={listId}
              playing={player.source === source && player.chordIndex === index}
              actions={actions}
              onEdit={onEdit}
              withInversions={withInversions}
            />
          ))}
        </ol>
      </SortableContext>
    </DndContext>
  );
}
