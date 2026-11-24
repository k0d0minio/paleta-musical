import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Locator, type Page } from "@playwright/test";

/** JAM-548: the Paleta (four modes) and the Acordes module. */

function trackErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  return errors;
}

async function ready(page: Page, path: string) {
  await page.goto(path);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(
    page.getByRole("group", { name: "Oitava" }).locator("output"),
  ).toHaveText(/\d/);
  // The stored data has loaded (a choice made before would be replaced).
  await expect(
    page.locator('[role="toolbar"][data-hydrated="true"]:visible'),
  ).toHaveCount(1);
}

/** A note of the palette (the 12-note toolbar), visible only (hidden pages stay in the DOM). */
const note = (page: Page, pc: number) =>
  page
    .getByRole("toolbar", { name: "As 12 notas" })
    .locator(`[data-pc="${pc}"]:visible`)
    .first();

async function press(locator: Locator, isMobile: boolean) {
  if (isMobile) await locator.tap();
  else await locator.click();
}

async function chooseMode(page: Page, mode: string, isMobile: boolean) {
  const radio = page.getByRole("radio", { name: mode, exact: true });
  await press(radio, isMobile);
  await expect(radio).toHaveAttribute("aria-checked", "true");
}

async function seriousIssues(page: Page): Promise<string[]> {
  await page.waitForFunction(() =>
    document
      .getAnimations()
      .every(
        (a) =>
          a.playState !== "running" ||
          a.effect?.getTiming().iterations === Infinity,
      ),
  );
  const results = await new AxeBuilder({ page }).analyze();
  return results.violations
    .filter((v) => v.impact === "serious" || v.impact === "critical")
    .map(
      (v) =>
        `${v.id}: ${v.nodes.map((n) => `${n.target.join(" ")} ${n.any[0]?.message ?? ""}`).join(", ")}`,
    );
}

const MODES = ["Escala", "Acorde", "Livre", "Detetar"] as const;

test("each Paleta mode loads and plays after a tap, with no error", async ({
  page,
  isMobile,
}) => {
  const errors = trackErrors(page);
  await ready(page, "/palette");
  for (const mode of MODES) {
    await chooseMode(page, mode, isMobile);
    await press(note(page, 7), isMobile);
    await expect(note(page, 7)).toHaveAttribute("data-sounding", "true");
    if (mode === "Escala")
      await press(
        page.getByRole("button", { name: "Tocar a escala" }),
        isMobile,
      );
    if (mode === "Acorde")
      await press(
        page.getByRole("button", { name: "Tocar o acorde" }),
        isMobile,
      );
    if (mode === "Livre") {
      await expect(note(page, 7)).toHaveAttribute("aria-pressed", "true");
      await press(
        page.getByRole("button", { name: "Tocar as notas" }),
        isMobile,
      );
    }
    if (mode === "Detetar")
      await expect(page.getByText(/Escalas compatíveis/)).toBeVisible();
  }
  expect(errors).toEqual([]);
});

test("the staff view loads on demand and draws the scale", async ({
  page,
  isMobile,
}) => {
  const errors = trackErrors(page);
  await ready(page, "/palette");
  await chooseMode(page, "Escala", isMobile);
  const staff = page.getByRole("img", { name: /^Pauta:/ });
  await expect(staff).toHaveCount(0);
  await press(page.getByRole("button", { name: "Pauta" }), isMobile);
  await expect(staff).toBeVisible();
  await expect(staff.locator("svg")).toBeVisible({ timeout: 15_000 });
  await press(page.getByRole("button", { name: "Pauta" }), isMobile);
  expect(errors).toEqual([]);
});

test("Acordes detects C major from a tap on C, E, G and adds it to the builder", async ({
  page,
  isMobile,
}) => {
  const errors = trackErrors(page);
  await ready(page, "/chords");
  for (const pc of [0, 4, 7]) await press(note(page, pc), isMobile);
  await expect(page.getByText("1 acorde exato")).toBeVisible();
  await press(
    page.getByRole("button", { name: "Juntar C à linha do tempo" }),
    isMobile,
  );
  await press(
    page.getByRole("button", { name: "Juntar C ao construtor" }),
    isMobile,
  );
  await expect(page).toHaveURL(/\/progressions\?tab=builder$/);
  await expect(
    page
      .getByRole("navigation", { name: "Módulos" })
      .getByRole("link", { name: "Progressões", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  expect(errors).toEqual([]);
});

test("axe finds no serious or critical issue on the Paleta modes and Acordes", async ({
  page,
}) => {
  // Five full scans: more time than the default.
  test.setTimeout(90_000);
  await ready(page, "/palette");
  for (const mode of MODES) {
    await chooseMode(page, mode, false);
    if (mode === "Livre" || mode === "Detetar")
      for (const pc of [0, 4, 7]) await note(page, pc).click();
    if (mode === "Acorde") {
      // Tension above 45 %: the altered versions show.
      const thumb = page.getByRole("slider", { name: "Tensão" });
      await thumb.focus();
      await page.keyboard.press("End");
      await expect(page.getByText("Versões alteradas")).toBeVisible();
    }
    expect(await seriousIssues(page), mode).toEqual([]);
  }
  await ready(page, "/chords?notes=4,7,0");
  await expect(page.getByText("1 acorde exato")).toBeVisible();
  expect(await seriousIssues(page)).toEqual([]);
});

test.describe("desktop only", () => {
  test.skip(({ isMobile }) => isMobile, "keyboard flows are desktop flows");

  test("the Paleta works with the keyboard only", async ({ page }) => {
    await ready(page, "/palette");
    // Mode: arrows in the segmented control (Escala is the default).
    const scale = page.getByRole("radio", { name: "Escala", exact: true });
    const chord = page.getByRole("radio", { name: "Acorde", exact: true });
    // Radix roving focus can miss an arrow sent at once after a scripted focus.
    await expect(async () => {
      await scale.focus();
      await page.keyboard.press("ArrowRight");
      await expect(chord).toBeFocused({ timeout: 500 });
    }).toPass();
    await page.keyboard.press("Enter");
    await expect(chord).toHaveAttribute("aria-checked", "true");

    // Tension: the slider moves with the arrows, the status follows live.
    const thumb = page.getByRole("slider", { name: "Tensão" });
    await thumb.focus();
    for (let i = 0; i < 20; i++) await page.keyboard.press("ArrowRight");
    await expect(page.getByText("Tensão moderada")).toBeVisible();

    // Tonic: arrows choose in the radio group.
    await page.getByRole("radio", { name: "C · Dó" }).focus();
    await page.keyboard.press("ArrowRight");
    await expect(page.getByRole("radio", { name: "C♯ · Dó♯" })).toHaveAttribute(
      "aria-checked",
      "true",
    );

    // Notes: arrows move the focus, Enter plays.
    await note(page, 0).focus();
    await page.keyboard.press("ArrowRight");
    await expect(note(page, 1)).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(note(page, 1)).toHaveAttribute("data-sounding", "true");

    // Livre: the QWERTY keys select, Esc clears.
    await chooseMode(page, "Livre", false);
    await page.locator("main").focus();
    await page.keyboard.press("a");
    await page.keyboard.press("d");
    await expect(note(page, 0)).toHaveAttribute("aria-pressed", "true");
    await expect(note(page, 4)).toHaveAttribute("aria-pressed", "true");
    await page.keyboard.press("Escape");
    await expect(note(page, 0)).toHaveAttribute("aria-pressed", "false");
  });
});
