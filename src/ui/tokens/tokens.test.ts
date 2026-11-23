import { readFileSync } from "node:fs";
import { resolve as resolvePath } from "node:path";
import { describe, expect, it } from "vitest";
import { contrastRatio, oklabDistance } from "./color";

const css = readFileSync(resolvePath(process.cwd(), "src/app/globals.css"), "utf8");

/** The custom properties of the first rule block that starts with `selector`. */
function block(selector: string): Record<string, string> {
  const start = css.indexOf(`${selector} {`);
  const body = css.slice(start, css.indexOf("\n}", start));
  return Object.fromEntries([...body.matchAll(/(--[\w-]+):\s*([^;]+);/g)].map((m) => [m[1], m[2]?.trim() ?? ""]));
}

const light = block(":root,\n.light");
const dark = { ...light, ...block(".dark") };

function resolve(vars: Record<string, string>, name: string): string {
  let value = vars[name] ?? "";
  for (let i = 0; i < 5 && value.startsWith("var("); i++) value = vars[value.slice(4, -1)] ?? "";
  return value;
}

describe.each([
  ["light", light],
  ["dark", dark],
] as const)("%s theme tokens", (_name, vars) => {
  const notes = Array.from({ length: 12 }, (_, i) => resolve(vars, `--note-${i}`));

  it("defines the 12 note colours and their on-colour", () => {
    for (const n of notes) expect(n).toMatch(/^#[0-9a-f]{6}$/i);
    expect(resolve(vars, "--note-on")).toMatch(/^#/);
  });

  it("keeps each note colour at 3:1 or more against the surfaces", () => {
    for (const surface of ["--bg", "--surface"]) {
      for (const n of notes) expect(contrastRatio(n, resolve(vars, surface))).toBeGreaterThanOrEqual(3);
    }
  });

  it("keeps note names readable on the note colour (4.5:1)", () => {
    for (const n of notes) expect(contrastRatio(n, resolve(vars, "--note-on"))).toBeGreaterThanOrEqual(4.5);
  });

  it("keeps the 12 note colours distinct from each other and from the tension colour", () => {
    const tension = resolve(vars, "--tension");
    for (let a = 0; a < 12; a++) {
      expect(oklabDistance(notes[a] ?? "", tension)).toBeGreaterThan(0.1);
      for (let b = a + 1; b < 12; b++) expect(oklabDistance(notes[a] ?? "", notes[b] ?? "")).toBeGreaterThan(0.05);
    }
  });

  it("keeps body text at AA contrast", () => {
    expect(contrastRatio(resolve(vars, "--fg"), resolve(vars, "--bg"))).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(resolve(vars, "--fg-muted"), resolve(vars, "--surface"))).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(resolve(vars, "--fg-subtle"), resolve(vars, "--surface"))).toBeGreaterThanOrEqual(4.5);
  });
});
