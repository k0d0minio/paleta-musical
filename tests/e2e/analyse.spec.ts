import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import {
  A_MINOR,
  C_MAJOR,
  encodeWav,
  heldChord,
  progression,
  render,
  type ToneEvent,
} from "../fixtures/audio";

/** Synthetic WAV files, rendered in the test (no third-party recordings). */
function wav(name: string, events: ToneEvent[], sampleRate = 44100) {
  return {
    name,
    mimeType: "audio/wav",
    buffer: Buffer.from(encodeWav(render(events, { sampleRate }), sampleRate)),
  };
}

function trackErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  return errors;
}

async function open(page: Page) {
  await page.goto("/analyse");
  await expect(
    page.getByRole("heading", { level: 1, name: "Analisar" }),
  ).toBeVisible();
  // The stored data has loaded once the transport bar shows the octave.
  await expect(
    page.getByRole("group", { name: "Oitava" }).locator("output"),
  ).toHaveText(/\d/);
}

const input = (page: Page) => page.getByTestId("audio-file-input").first();
const results = (page: Page) => page.getByTestId("analysis-results");
const scales = (page: Page) =>
  page.getByRole("region", { name: "Escalas mais prováveis" });
const chords = (page: Page) =>
  page.getByRole("region", { name: "Acordes detetados" });

test("F209: the file picker opens and a short wav gives results; they stay after a reload", async ({
  page,
}) => {
  const errors = trackErrors(page);
  await open(page);
  await expect(
    page.getByText("Os resultados aparecem depois de carregares"),
  ).toBeVisible();
  const chooser = page.waitForEvent("filechooser");
  await input(page).click();
  await (await chooser).setFiles(wav("c-major.wav", C_MAJOR));

  await expect(results(page)).toBeVisible({ timeout: 30_000 });
  const first = scales(page).getByRole("listitem").first();
  await expect(first).toContainText("C Maior");
  await expect(first).toContainText("Mais provável");
  await expect(first).toContainText("100 %");
  await expect(page.getByTestId("file-name")).toHaveText("c-major.wav");

  // F214 + reload: the result and the file come back.
  await page.waitForTimeout(500);
  await page.reload();
  await expect(results(page)).toBeVisible({ timeout: 15_000 });
  await expect(scales(page).getByRole("listitem").first()).toContainText(
    "C Maior",
  );
  await expect(
    page.getByRole("img", { name: "Forma de onda de c-major.wav" }),
  ).toBeVisible({ timeout: 15_000 });
  expect(errors).toEqual([]);
});

test("an A minor file at 48 kHz gives A Menor Natural first (U23); no confidence above 100 % (U24)", async ({
  page,
}) => {
  await open(page);
  await input(page).setInputFiles(wav("a-minor.wav", A_MINOR, 48000));
  await expect(results(page)).toBeVisible({ timeout: 30_000 });
  await expect(scales(page).getByRole("listitem").first()).toContainText(
    "A Menor Natural",
  );
  const values = await scales(page)
    .getByText(/Confiança \d+ %/)
    .allTextContents();
  expect(values.length).toBeGreaterThan(1);
  for (const v of values)
    expect(Number(/(\d+)/.exec(v)?.[1])).toBeLessThanOrEqual(100);
});

test("a second file works after a failed decode (U34), with a clear message", async ({
  page,
}) => {
  await open(page);
  await input(page).setInputFiles({
    name: "broken.mp3",
    mimeType: "audio/mpeg",
    buffer: Buffer.from("this is not audio at all"),
  });
  const alert = page.getByRole("alert");
  await expect(alert).toContainText("Erro:", { timeout: 15_000 });
  await expect(alert).toContainText("Tenta um ficheiro mp3 ou wav mais curto.");
  await input(page).setInputFiles(wav("c-major.wav", C_MAJOR));
  await expect(results(page)).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole("alert")).toBeHidden();
});

test.describe("desktop only", () => {
  test.skip(
    ({ isMobile }) => isMobile,
    "keyboard, long tasks and long files are desktop flows",
  );

  test("the UI stays responsive (no long task above 200 ms) and cancel stops the analysis", async ({
    page,
  }) => {
    await open(page);
    await page.evaluate(() => {
      const w = window as unknown as { __longTasks: number[] };
      w.__longTasks = [];
      new PerformanceObserver((list) => {
        for (const e of list.getEntries()) w.__longTasks.push(e.duration);
      }).observe({ type: "longtask" });
    });
    const long = progression(
      [
        [48, 60, 64, 67],
        [41, 53, 57, 60],
        [43, 55, 59, 62],
        [48, 60, 64, 67],
      ],
      1,
      10,
    );
    await input(page).setInputFiles(wav("long.wav", long, 22050));
    await expect(results(page)).toBeVisible({ timeout: 60_000 });
    const tasks = await page.evaluate(
      () => (window as unknown as { __longTasks: number[] }).__longTasks,
    );
    expect(Math.max(0, ...tasks)).toBeLessThan(200);

    // Cancel: a longer file, then stop the worker while it runs.
    await input(page).setInputFiles(
      wav("longer.wav", progression([[48, 60, 64, 67]], 1, 180), 22050),
    );
    const cancel = page.getByRole("button", { name: "Cancelar" });
    await expect(cancel).toBeVisible({ timeout: 30_000 });
    await cancel.click();
    await expect(page.getByText("Análise cancelada.")).toBeVisible();
    await expect(cancel).toBeHidden();
    await page.waitForTimeout(1000);
    await expect(page.getByText("Análise cancelada.")).toBeVisible();
  });

  test("a region analysis uses only the region, with the keyboard only; one strip entry per window", async ({
    page,
  }) => {
    await open(page);
    const events: ToneEvent[] = [
      ...heldChord(0, [0, 4, 7], 4),
      ...heldChord(9, [0, 3, 7], 4).map((e) => ({ ...e, start: 4 })),
    ];
    await input(page).setInputFiles(wav("two-chords.wav", events));
    await expect(results(page)).toBeVisible({ timeout: 30_000 });
    await expect(
      page.getByTestId("sections").getByRole("listitem"),
    ).toHaveCount(8);

    // Move the region start to 4 s with the keyboard (PageUp = 10 steps of 0.1 s).
    const start = page.getByRole("slider", { name: "Início da região" });
    await start.focus();
    for (let i = 0; i < 4; i++) await page.keyboard.press("PageUp");
    await expect(start).toHaveAttribute("aria-valuenow", "4");
    await page.keyboard.press("Tab"); // end thumb
    await page.keyboard.press("Tab"); // "Analisar a região"
    await expect(
      page.getByRole("button", { name: "Analisar a região" }),
    ).toBeFocused();
    await page.keyboard.press("Enter");

    await expect(
      page.getByText("Resultado da região 0:04.0 – 0:08.0"),
    ).toBeVisible({
      timeout: 30_000,
    });
    await expect(
      page.getByTestId("sections").getByRole("listitem"),
    ).toHaveCount(4);
    await expect(chords(page).getByRole("listitem").first()).toContainText(
      "Am",
    );

    // F224 with the keyboard: the first chord plays and becomes the last chord.
    await chords(page).getByRole("button").first().focus();
    await page.keyboard.press("Enter");
    await expect(page.getByText("Ainda sem acorde")).toBeHidden();
  });

  test("axe finds no serious or critical issue on the results", async ({
    page,
  }) => {
    await open(page);
    await input(page).setInputFiles(wav("c-major.wav", C_MAJOR));
    await expect(results(page)).toBeVisible({ timeout: 30_000 });
    await page.waitForFunction(() =>
      document
        .getAnimations()
        .every(
          (a) =>
            a.playState !== "running" ||
            a.effect?.getTiming().iterations === Infinity,
        ),
    );
    const scan = await new AxeBuilder({ page }).analyze();
    const bad = scan.violations
      .filter((v) => v.impact === "serious" || v.impact === "critical")
      .map(
        (v) =>
          `${v.id}: ${v.nodes.map((n) => `${n.target.join(" ")} ${n.any[0]?.message ?? ""}`).join(", ")}`,
      );
    expect(bad).toEqual([]);
  });
});
