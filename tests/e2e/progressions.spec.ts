import AxeBuilder from "@axe-core/playwright";
import { Midi } from "@tonejs/midi";
import { expect, test, type Page } from "@playwright/test";
import { compressToEncodedURIComponent } from "lz-string";

function trackErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  return errors;
}

async function open(page: Page, path = "/progressions") {
  await page.goto(path);
  await expect(
    page.getByRole("heading", { level: 1, name: "Progressões" }),
  ).toBeVisible();
  await expect(
    page.getByRole("group", { name: "Oitava" }).locator("output"),
  ).toHaveText(/\d/);
}

const press = async (page: Page, isMobile: boolean, name: string) => {
  const target = page.getByRole("button", { name, exact: true }).first();
  if (isMobile) await target.tap();
  else await target.click();
};

const timelineItems = (page: Page) =>
  page.getByTestId("timeline-list").getByTestId("chord-item");

async function seriousViolations(page: Page) {
  const results = await new AxeBuilder({ page }).analyze();
  return results.violations
    .filter((v) => v.impact === "serious" || v.impact === "critical")
    .map(
      (v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`,
    );
}

test("Estilos plays and stops a progression, adds it to the timeline, and the timeline stays after a reload", async ({
  page,
  isMobile,
}) => {
  const errors = trackErrors(page);
  await open(page);
  await press(page, isMobile, "Tocar I–V–vi–IV");
  await expect(
    page.getByRole("button", { name: "Parar I–V–vi–IV" }),
  ).toBeVisible();
  await press(page, isMobile, "Parar I–V–vi–IV");
  await expect(
    page.getByRole("button", { name: "Tocar I–V–vi–IV" }),
  ).toBeVisible();

  await press(page, isMobile, "Adicionar I–V–vi–IV à linha do tempo");
  await expect(timelineItems(page)).toHaveCount(4);
  await page.reload();
  await expect(timelineItems(page)).toHaveCount(4);
  expect(errors).toEqual([]);
});

test("the timeline plays with a playhead, stops, and ends by itself", async ({
  page,
  isMobile,
}) => {
  const errors = trackErrors(page);
  await open(page);
  await press(page, isMobile, "Adicionar I–IV–V à linha do tempo");
  await page.getByTestId("timeline-rhythm").selectOption("simples");
  await press(page, isMobile, "Tocar Linha do tempo");
  await expect(
    page.getByTestId("timeline-list").locator("[aria-current=true]"),
  ).toHaveCount(1);
  await press(page, isMobile, "Parar Linha do tempo");
  await expect(
    page.getByRole("button", { name: "Tocar Linha do tempo" }),
  ).toBeVisible();
  // Natural end: 3 chords at 90 BPM.
  await press(page, isMobile, "Tocar Linha do tempo");
  await expect(
    page.getByRole("button", { name: "Tocar Linha do tempo" }),
  ).toBeVisible({ timeout: 6000 });
  expect(errors).toEqual([]);
});

test("reorder, remove and undo on the timeline (buttons on touch)", async ({
  page,
  isMobile,
}) => {
  await open(page);
  await press(page, isMobile, "Adicionar I–IV–V à linha do tempo");
  await press(page, isMobile, "Mover para a frente");
  const labels = () =>
    page
      .getByTestId("timeline-list")
      .locator("[data-chord-button]")
      .evaluateAll((els) => els.map((e) => e.getAttribute("aria-label")));
  await expect.poll(labels).toEqual(["1: F", "2: C", "3: G"]);
  await press(page, isMobile, "Remover G");
  await expect.poll(labels).toEqual(["1: F", "2: C"]);
  await page
    .getByTestId("timeline")
    .getByRole("button", { name: "Desfazer" })
    .click();
  await expect.poll(labels).toEqual(["1: F", "2: C", "3: G"]);
});

test("MIDI export downloads a format-0 progression file", async ({
  page,
  isMobile,
}) => {
  await open(page);
  await press(page, isMobile, "Adicionar I–IV–V à linha do tempo");
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    press(page, isMobile, "Descarregar MIDI"),
  ]);
  expect(download.suggestedFilename()).toBe("progressao-simples-paleta.mid");
  const path = await download.path();
  const { readFileSync } = await import("node:fs");
  const midi = new Midi(readFileSync(path));
  expect(midi.header.ppq).toBe(480);
  expect(midi.tracks).toHaveLength(1);
  expect(midi.tracks[0]?.notes.slice(0, 3).map((n) => n.midi)).toEqual([
    60, 64, 67,
  ]);
});

test("a MIDI file with block chords imports into the timeline with named chords", async ({
  page,
}) => {
  await open(page);
  const midi = new Midi();
  const track = midi.addTrack();
  [
    [57, 60, 64],
    [53, 57, 60],
    [55, 59, 62, 65],
  ].forEach((notes, i) =>
    notes.forEach((n) => track.addNote({ midi: n, time: i, duration: 0.9 })),
  );
  await page.getByTestId("midi-import").setInputFiles({
    name: "chords.mid",
    mimeType: "audio/midi",
    buffer: Buffer.from(midi.toArray()),
  });
  await expect
    .poll(() =>
      page
        .getByTestId("timeline-list")
        .locator("[data-chord-button]")
        .evaluateAll((els) => els.map((e) => e.getAttribute("aria-label"))),
    )
    .toEqual(["1: Am", "2: F", "3: G7"]);
});

test("a share link opens the same progression in the builder after a confirmation", async ({
  page,
}) => {
  // The compact share format: key, scale, rhythm, BPM and [root, type, inversion, tension].
  const hash = compressToEncodedURIComponent(
    JSON.stringify({
      v: 1,
      k: 2,
      s: 0,
      r: 8,
      b: 120,
      c: [
        [2, 4, 0, 0],
        [7, 2, 1, 1],
        [0, 3, 0, 0],
      ],
    }),
  );
  // The confirmation dialog is modal: the rest of the page is hidden from the accessibility tree.
  await page.goto(`/progressions?tab=builder#p=${hash}`);
  await page.getByRole("button", { name: "Abrir no construtor" }).click();
  await expect(
    page.getByTestId("builder-list").locator("[data-chord-button]"),
  ).toHaveCount(3);
  await expect(page.getByTestId("builder-rhythm")).toHaveValue("bossa");
});

test("a saved progression survives a reload", async ({ page, isMobile }) => {
  await open(page, "/progressions?tab=builder");
  await press(page, isMobile, "Adicionar à linha");
  await press(page, isMobile, "Guardar");
  await page.getByRole("dialog").getByRole("textbox").fill("Verso");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Guardar" })
    .click();
  await page.reload();
  await expect(page.getByTestId("library").getByText("Verso")).toBeVisible();
});

test("axe finds no serious or critical issue in Progressões", async ({
  page,
  isMobile,
}) => {
  await open(page);
  await press(page, isMobile, "Adicionar I–V–vi–IV à linha do tempo");
  expect(await seriousViolations(page)).toEqual([]);
  await page.getByRole("tab", { name: "Construtor" }).click();
  await press(page, isMobile, "Adicionar à linha");
  expect(await seriousViolations(page)).toEqual([]);
  await press(page, isMobile, "Editar C");
  await expect(page.getByRole("dialog")).toBeVisible();
  expect(await seriousViolations(page)).toEqual([]);
});

test.describe("desktop only", () => {
  test.skip(({ isMobile }) => isMobile, "keyboard flows are desktop flows");

  test("keyboard only: reorder with the drag handle, move with Alt+arrows, remove with Delete, play with Space", async ({
    page,
  }) => {
    await open(page);
    await page
      .getByRole("button", { name: "Adicionar I–IV–V à linha do tempo" })
      .click();
    const labels = () =>
      page
        .getByTestId("timeline-list")
        .locator("[data-chord-button]")
        .evaluateAll((els) => els.map((e) => e.getAttribute("aria-label")));
    await page.getByRole("button", { name: "Arrastar C" }).focus();
    await page.keyboard.press("Space");
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("Space");
    await expect.poll(labels).toEqual(["1: F", "2: C", "3: G"]);
    await page.getByRole("button", { name: "3: G" }).focus();
    await page.keyboard.press("Alt+ArrowLeft");
    await expect.poll(labels).toEqual(["1: F", "2: G", "3: C"]);
    await page.keyboard.press("Delete");
    await expect.poll(labels).toEqual(["1: F", "2: C"]);
    await page.keyboard.press("Control+z");
    await expect.poll(labels).toEqual(["1: F", "2: G", "3: C"]);
    await page.locator("body").focus();
    await page.getByRole("heading", { level: 1 }).click();
    await page.keyboard.press("Space");
    await expect(
      page.getByRole("button", { name: "Parar Linha do tempo" }),
    ).toBeVisible();
    await page.keyboard.press("Space");
    await expect(
      page.getByRole("button", { name: "Tocar Linha do tempo" }),
    ).toBeVisible();
  });

  test("reorder by mouse drag-and-drop", async ({ page }) => {
    await open(page);
    await page
      .getByRole("button", { name: "Adicionar I–IV–V à linha do tempo" })
      .click();
    const handle = page.getByRole("button", { name: "Arrastar C" });
    const target = page.getByRole("button", { name: "3: G" });
    await handle.scrollIntoViewIfNeeded();
    const from = await handle.boundingBox();
    const to = await target.boundingBox();
    if (!from || !to) throw new Error("no layout");
    await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
    await page.mouse.down();
    // Pass the 4 px activation distance first, then move over the target.
    await page.mouse.move(
      from.x + from.width / 2 + 12,
      from.y + from.height / 2,
      {
        steps: 4,
      },
    );
    await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, {
      steps: 12,
    });
    await page.mouse.move(to.x + to.width / 2 + 2, to.y + to.height / 2, {
      steps: 2,
    });
    await page.mouse.up();
    await expect
      .poll(() =>
        page
          .getByTestId("timeline-list")
          .locator("[data-chord-button]")
          .evaluateAll((els) => els.map((e) => e.getAttribute("aria-label"))),
      )
      .toEqual(["1: F", "2: G", "3: C"]);
  });

  test("the chord menu opens with a right-click and removes the chord", async ({
    page,
  }) => {
    await open(page);
    await page
      .getByRole("button", { name: "Adicionar I–IV–V à linha do tempo" })
      .click();
    await page.getByRole("button", { name: "2: F" }).click({ button: "right" });
    await page.getByRole("menuitem", { name: "Remover" }).click();
    await expect(timelineItems(page)).toHaveCount(2);
  });
});
