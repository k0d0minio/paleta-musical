"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import { useAppStore } from "@/state";
import {
  isChordTypeId,
  isPitchClass,
  isScaleId,
  type PitchClass,
} from "@/theory";
import { PALETTE_MODES, setPalette, type PaletteState } from "./state";

type Params = Pick<URLSearchParams, "get">;

/** Parses "0,4,7" into distinct pitch classes; invalid entries are skipped. */
export function parseNotesParam(value: string | null): PitchClass[] {
  if (!value) return [];
  const out: PitchClass[] = [];
  for (const part of value.split(",")) {
    const n = Number(part.trim());
    if (part.trim() !== "" && isPitchClass(n) && !out.includes(n)) out.push(n);
  }
  return out;
}

/**
 * The link params of the Paleta (contracts of JAM-547): `mode`, `tonic`,
 * `scale`, `chord`, `notes`. Unknown or invalid values are ignored.
 */
export function paletteParamsPatch(params: Params): Partial<PaletteState> {
  const patch: Partial<PaletteState> = {};
  const mode = params.get("mode");
  if (mode && (PALETTE_MODES as readonly string[]).includes(mode))
    patch.mode = mode as PaletteState["mode"];
  const tonicParam = params.get("tonic");
  const tonic = tonicParam ? Number(tonicParam) : Number.NaN;
  if (isPitchClass(tonic)) patch.tonic = tonic;
  const scale = params.get("scale");
  if (isScaleId(scale)) patch.scale = scale;
  const chord = params.get("chord");
  if (isChordTypeId(chord)) patch.chordType = chord;
  const notes = params.get("notes");
  if (notes !== null) {
    const list = parseNotesParam(notes);
    if (patch.mode === "detect") patch.detectNotes = list;
    else {
      patch.freeNotes = list;
      patch.mode ??= "free";
    }
  }
  return patch;
}

/**
 * Applies the link params once per link, after the stored data has loaded
 * (so the stored state does not overwrite them). Wrap it in <Suspense>.
 */
export function useApplyLinkParams(apply: (params: Params) => void): void {
  const params = useSearchParams();
  const hydrated = useAppStore((s) => s.session.hydrated);
  const applied = useRef<string | null>(null);
  const key = params.toString();
  const applyRef = useRef(apply);
  useEffect(() => {
    applyRef.current = apply;
  });
  useEffect(() => {
    if (!key) {
      applied.current = null;
      return;
    }
    if (!hydrated || applied.current === key) return;
    applied.current = key;
    applyRef.current(params);
  }, [hydrated, key, params]);
}

export function PaletteParams() {
  useApplyLinkParams((params) => setPalette(paletteParamsPatch(params)));
  return null;
}
