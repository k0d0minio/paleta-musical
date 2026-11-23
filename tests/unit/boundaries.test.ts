import { ESLint } from "eslint";
import { describe, expect, it } from "vitest";

/** Proves the architecture lint rules (eslint-plugin-boundaries) catch the forbidden imports. */
const eslint = new ESLint({ cwd: process.cwd() });

async function boundaryErrors(filePath: string, code: string): Promise<string[]> {
  const [result] = await eslint.lintText(code, { filePath });
  return (result?.messages ?? []).filter((m) => m.ruleId?.startsWith("boundaries/")).map((m) => m.message);
}

describe("architecture boundaries", () => {
  it("fails when src/theory imports React", async () => {
    const errors = await boundaryErrors("src/theory/probe.ts", 'import { useState } from "react";\nexport const x = useState;\n');
    expect(errors.join("\n")).toMatch(/pure TypeScript/);
  });

  it("fails when src/theory imports src/audio", async () => {
    const errors = await boundaryErrors("src/theory/probe.ts", 'import { audioEngine } from "@/audio";\nexport const x = audioEngine;\n');
    expect(errors).not.toHaveLength(0);
  });

  it("fails when src/midi imports Tone.js", async () => {
    const errors = await boundaryErrors("src/midi/probe.ts", 'import * as Tone from "tone";\nexport const x = Tone;\n');
    expect(errors).not.toHaveLength(0);
  });

  it("fails when a module imports an input source directly", async () => {
    const errors = await boundaryErrors(
      "src/modules/chords/probe.ts",
      'import { pointerSource } from "@/input/sources/pointer";\nexport const x = pointerSource;\n',
    );
    expect(errors).not.toHaveLength(0);
  });

  it("fails when a module imports another module's internal file", async () => {
    const errors = await boundaryErrors(
      "src/modules/chords/probe.ts",
      'import { PaletteView } from "@/modules/palette/view";\nexport const x = PaletteView;\n',
    );
    expect(errors.join("\n")).toMatch(/index\.ts/);
  });

  it("fails when a lower layer imports a route", async () => {
    const errors = await boundaryErrors("src/state/probe.ts", 'import Page from "@/app/palette/page";\nexport const x = Page;\n');
    expect(errors).not.toHaveLength(0);
  });

  it("allows the sanctioned imports", async () => {
    expect(await boundaryErrors("src/theory/probe.ts", 'import { Note } from "tonal";\nexport const x = Note;\n')).toEqual([]);
    expect(
      await boundaryErrors(
        "src/modules/chords/probe.ts",
        'import { useInputNotes } from "@/input";\nimport { paletteModule } from "@/modules/palette";\nexport const x = [useInputNotes, paletteModule];\n',
      ),
    ).toEqual([]);
  });
});
