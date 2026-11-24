/**
 * R6: the style progressions of Estilos, in the app's own order. A progression
 * is a list of Roman numerals (resolved by R7, `roman.ts`). Its description is
 * in the messages (`modules.progressions.descriptions.<id>`).
 */
export const STYLE_IDS = [
  "trap",
  "hipHop",
  "pop",
  "jazz",
  "blues",
  "classical",
  "flamenco",
  "cinematic",
  "rnb",
  "house",
  "latin",
  "metal",
] as const;

export type StyleId = (typeof STYLE_IDS)[number];

export interface StyleProgression {
  readonly id: string;
  readonly style: StyleId;
  readonly numerals: readonly string[];
  /** Set when the name is not the numerals joined with "–" (message key). */
  readonly nameKey?: "twelveBar";
}

export const STYLE_PROGRESSIONS: readonly StyleProgression[] = [
  { id: "trap1", style: "trap", numerals: ["i", "bVII", "bVI", "bVII"] },
  { id: "trap2", style: "trap", numerals: ["i", "bVI", "bVII", "i"] },
  { id: "trap3", style: "trap", numerals: ["i", "iv", "bVII", "bVI"] },
  { id: "trap4", style: "trap", numerals: ["i", "bIII", "bVII", "iv"] },
  { id: "trap5", style: "trap", numerals: ["i", "i", "bVI", "bVII"] },
  { id: "trap6", style: "trap", numerals: ["i", "bVI", "i", "bVII"] },
  { id: "trap7", style: "trap", numerals: ["i", "bVII", "bVI", "V"] },
  { id: "trap8", style: "trap", numerals: ["i", "III", "bVII", "iv"] },
  { id: "trap9", style: "trap", numerals: ["bVI", "bVII", "i", "i"] },
  { id: "hipHop1", style: "hipHop", numerals: ["i", "bVI", "bIII", "bVII"] },
  { id: "hipHop2", style: "hipHop", numerals: ["ii", "V", "I", "vi"] },
  { id: "hipHop3", style: "hipHop", numerals: ["i", "bVII", "IV", "i"] },
  { id: "hipHop4", style: "hipHop", numerals: ["I", "IV", "vi", "V"] },
  { id: "hipHop5", style: "hipHop", numerals: ["i", "iv", "i", "V"] },
  { id: "hipHop6", style: "hipHop", numerals: ["I", "vi", "IV", "V"] },
  { id: "hipHop7", style: "hipHop", numerals: ["i", "III", "VI", "VII"] },
  { id: "hipHop8", style: "hipHop", numerals: ["I", "iii", "vi", "IV"] },
  { id: "hipHop9", style: "hipHop", numerals: ["i", "bVI", "bVII", "bVI"] },
  { id: "hipHop10", style: "hipHop", numerals: ["IV", "I", "V", "vi"] },
  { id: "pop1", style: "pop", numerals: ["I", "V", "vi", "IV"] },
  { id: "pop2", style: "pop", numerals: ["I", "IV", "V"] },
  { id: "pop3", style: "pop", numerals: ["vi", "IV", "I", "V"] },
  { id: "pop4", style: "pop", numerals: ["I", "iii", "IV", "V"] },
  { id: "pop5", style: "pop", numerals: ["I", "IV", "vi", "iii"] },
  { id: "pop6", style: "pop", numerals: ["I", "V", "IV", "V"] },
  { id: "pop7", style: "pop", numerals: ["vi", "V", "IV", "III"] },
  { id: "pop8", style: "pop", numerals: ["I", "bVII", "IV", "I"] },
  { id: "pop9", style: "pop", numerals: ["I", "ii", "IV", "V"] },
  { id: "pop10", style: "pop", numerals: ["vi", "IV", "V", "I"] },
  { id: "jazz1", style: "jazz", numerals: ["ii", "V", "I"] },
  { id: "jazz2", style: "jazz", numerals: ["I", "vi", "ii", "V"] },
  { id: "jazz3", style: "jazz", numerals: ["iii", "VI", "ii", "V"] },
  { id: "jazz4", style: "jazz", numerals: ["I", "IV", "iii", "VI", "ii", "V"] },
  { id: "jazz5", style: "jazz", numerals: ["i", "iv", "bVII", "III"] },
  { id: "jazz6", style: "jazz", numerals: ["II", "V", "I", "IV"] },
  { id: "jazz7", style: "jazz", numerals: ["iii", "bIII", "ii", "V"] },
  { id: "jazz8", style: "jazz", numerals: ["I", "VI", "II", "V"] },
  { id: "jazz9", style: "jazz", numerals: ["ii", "bII", "I"] },
  { id: "jazz10", style: "jazz", numerals: ["I", "bVII", "bVI", "V"] },
  {
    id: "blues1",
    style: "blues",
    numerals: ["I", "I", "I", "I", "IV", "IV", "I", "I", "V", "IV", "I", "V"],
    nameKey: "twelveBar",
  },
  { id: "blues2", style: "blues", numerals: ["I7", "IV7", "V7"] },
  { id: "blues3", style: "blues", numerals: ["i", "iv", "V7", "i"] },
  { id: "blues4", style: "blues", numerals: ["I", "IV", "I", "V", "IV", "I"] },
  { id: "blues5", style: "blues", numerals: ["I7", "IV7", "I7", "V7"] },
  { id: "blues6", style: "blues", numerals: ["i", "bVII", "IV", "i"] },
  { id: "classical1", style: "classical", numerals: ["I", "IV", "V", "I"] },
  { id: "classical2", style: "classical", numerals: ["I", "V", "IV", "V"] },
  { id: "classical3", style: "classical", numerals: ["vi", "IV", "V", "I"] },
  {
    id: "classical4",
    style: "classical",
    numerals: ["I", "V", "vi", "iii", "IV", "I", "IV", "V"],
  },
  { id: "classical5", style: "classical", numerals: ["i", "VII", "VI", "V"] },
  {
    id: "classical6",
    style: "classical",
    numerals: ["I", "ii", "iii", "IV", "V"],
  },
  { id: "classical7", style: "classical", numerals: ["I", "bVII", "VI", "V"] },
  { id: "flamenco1", style: "flamenco", numerals: ["i", "bVII", "bVI", "V"] },
  { id: "flamenco2", style: "flamenco", numerals: ["i", "iv", "V", "i"] },
  {
    id: "flamenco3",
    style: "flamenco",
    numerals: ["I", "bVII", "bVI", "bVII", "I"],
  },
  { id: "flamenco4", style: "flamenco", numerals: ["i", "bVII", "bVI", "i"] },
  { id: "flamenco5", style: "flamenco", numerals: ["IV", "III", "II", "I"] },
  {
    id: "cinematic1",
    style: "cinematic",
    numerals: ["I", "bVII", "bVI", "bVII"],
  },
  {
    id: "cinematic2",
    style: "cinematic",
    numerals: ["i", "bVI", "bIII", "bVII"],
  },
  { id: "cinematic3", style: "cinematic", numerals: ["I", "iii", "IV", "iv"] },
  {
    id: "cinematic4",
    style: "cinematic",
    numerals: ["i", "bVI", "III", "bVII"],
  },
  { id: "cinematic5", style: "cinematic", numerals: ["I", "ii", "bVII", "I"] },
  {
    id: "cinematic6",
    style: "cinematic",
    numerals: ["i", "bIII", "bVII", "bVI"],
  },
  {
    id: "cinematic7",
    style: "cinematic",
    numerals: ["I", "bVI", "bIII", "bVII"],
  },
  { id: "cinematic8", style: "cinematic", numerals: ["i", "v", "bVI", "bVII"] },
  { id: "rnb1", style: "rnb", numerals: ["i", "bVII", "bVI", "bVII"] },
  { id: "rnb2", style: "rnb", numerals: ["I", "iii", "vi", "IV"] },
  { id: "rnb3", style: "rnb", numerals: ["I", "IV", "iii", "vi"] },
  { id: "rnb4", style: "rnb", numerals: ["ii", "V", "I", "iii", "vi"] },
  { id: "rnb5", style: "rnb", numerals: ["I", "bVII", "IV", "i"] },
  { id: "rnb6", style: "rnb", numerals: ["vi", "IV", "I", "V"] },
  { id: "house1", style: "house", numerals: ["i", "bVI", "bVII", "i"] },
  { id: "house2", style: "house", numerals: ["I", "IV", "vi", "V"] },
  { id: "house3", style: "house", numerals: ["i", "bVII", "IV", "i"] },
  { id: "house4", style: "house", numerals: ["I", "V", "vi", "IV"] },
  { id: "house5", style: "house", numerals: ["vi", "bVII", "I", "bVII"] },
  { id: "house6", style: "house", numerals: ["i", "III", "bVII", "IV"] },
  { id: "latin1", style: "latin", numerals: ["i", "V", "i", "IV"] },
  { id: "latin2", style: "latin", numerals: ["I", "IV", "V", "I"] },
  { id: "latin3", style: "latin", numerals: ["ii", "V", "I"] },
  { id: "latin4", style: "latin", numerals: ["i", "bVI", "bVII", "i"] },
  { id: "latin5", style: "latin", numerals: ["I", "bVII", "IV", "I"] },
  { id: "latin6", style: "latin", numerals: ["vi", "IV", "I", "V"] },
  { id: "metal1", style: "metal", numerals: ["i", "bVI", "bVII", "i"] },
  { id: "metal2", style: "metal", numerals: ["i", "bVII", "bVI", "V"] },
  { id: "metal3", style: "metal", numerals: ["i", "iv", "bVI", "bVII"] },
  { id: "metal4", style: "metal", numerals: ["i", "bII", "i"] },
  { id: "metal5", style: "metal", numerals: ["i", "bIII", "bVII", "i"] },
  { id: "metal6", style: "metal", numerals: ["I", "bVI", "bIII", "bVII"] },
];

export function isStyleId(value: unknown): value is StyleId {
  return (
    typeof value === "string" &&
    (STYLE_IDS as readonly string[]).includes(value)
  );
}

export function progressionsOfStyle(style: StyleId): StyleProgression[] {
  return STYLE_PROGRESSIONS.filter((p) => p.style === style);
}

/** The name of a progression in notation, e.g. "I–V–vi–IV". */
export function progressionName(p: StyleProgression): string {
  return p.numerals.join("–");
}
