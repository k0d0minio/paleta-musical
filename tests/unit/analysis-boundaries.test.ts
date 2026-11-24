import { ESLint } from "eslint";
import { describe, expect, it } from "vitest";

/** src/analysis (JAM-551) is a pure layer like theory and midi. */
const eslint = new ESLint({ cwd: process.cwd() });

async function boundaryErrors(
  filePath: string,
  code: string,
): Promise<string[]> {
  const [result] = await eslint.lintText(code, { filePath });
  return (result?.messages ?? [])
    .filter((m) => m.ruleId?.startsWith("boundaries/"))
    .map((m) => m.message);
}

describe("analysis layer boundaries", () => {
  it("fails when src/analysis imports React", async () => {
    const errors = await boundaryErrors(
      "src/analysis/probe.ts",
      'import { useState } from "react";\nexport const x = useState;\n',
    );
    expect(errors.join("\n")).toMatch(/pure TypeScript/);
  });

  it("fails when src/analysis imports src/audio", async () => {
    const errors = await boundaryErrors(
      "src/analysis/probe.ts",
      'import { audioEngine } from "@/audio";\nexport const x = audioEngine;\n',
    );
    expect(errors).not.toHaveLength(0);
  });

  it("allows theory in analysis and analysis in a module", async () => {
    expect(
      await boundaryErrors(
        "src/analysis/probe.ts",
        'import { SCALES } from "@/theory";\nexport const x = SCALES;\n',
      ),
    ).toEqual([]);
    expect(
      await boundaryErrors(
        "src/modules/analyse/probe.ts",
        'import { analyseSignal } from "@/analysis";\nexport const x = analyseSignal;\n',
      ),
    ).toEqual([]);
  });
});
