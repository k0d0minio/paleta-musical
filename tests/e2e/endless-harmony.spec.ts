import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

/** Collects uncaught page errors; every test asserts there are none. */
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
}

const nav = (page: Page) => page.getByRole("navigation", { name: "Módulos" });
const status = (page: Page) =>
  page.getByRole("status", { name: "Estado do gerador" });
const majorKey = (page: Page, label: string) =>
  page.getByRole("button", { name: label, exact: true });

async function press(
  page: Page,
  isMobile: boolean,
  target: ReturnType<Page["locator"]>,
) {
  if (isMobile) await target.tap();
  else await target.click();
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

test("Infinito plays after a tap, lists chords and stops on a module switch (U13)", async ({
  page,
  isMobile,
}) => {
  const errors = trackErrors(page);
  await ready(page, "/endless");
  await expect(status(page)).toHaveText("Parado");
  await expect(
    page.getByText("— inicia o gerador para ver as notas —"),
  ).toBeVisible();

  await press(page, isMobile, page.getByRole("button", { name: "Iniciar" }));
  await expect(status(page)).toHaveText("A gerar");
  // The current chord is marked and its notes sound.
  await expect(page.locator("button[data-current]")).toHaveCount(1);
  await expect(
    page.locator('main [data-sounding="true"]').first(),
  ).toBeVisible();
  await expect
    .poll(() => page.locator("main ol button").count())
    .toBeGreaterThan(2);

  // A module switch stops the generator; the list stays (F166).
  await press(
    page,
    isMobile,
    nav(page).getByRole("link", { name: "Harmonia", exact: true }),
  );
  await expect(page).toHaveURL(/\/harmony$/);
  await press(
    page,
    isMobile,
    nav(page).getByRole("link", { name: "Infinito", exact: true }),
  );
  await expect(status(page)).toHaveText("Parado");
  await expect(page.locator("button[data-current]")).toHaveCount(0);
  await expect(page.locator("main ol button").first()).toBeVisible();
  expect(errors).toEqual([]);
});

test("Infinito: a minor style fixes the scale (U11) and sets its BPM (F157)", async ({
  page,
}) => {
  await ready(page, "/endless");
  const scale = page.getByLabel("Escala");
  await page.getByRole("radio", { name: "Jazz" }).click();
  await expect(scale).toBeEnabled();
  await expect(page.getByLabel("BPM")).toHaveValue("110");
  await page.getByRole("radio", { name: "Dark" }).click();
  await expect(scale).toBeDisabled();
  await expect(scale).toHaveValue("naturalMinor");
  await expect(
    page.getByText("Dark usa sempre a escala Menor Natural."),
  ).toBeVisible();
  await expect(page.getByLabel("BPM")).toHaveValue("120");
});

test("Harmonia plays and selects a key after a tap", async ({
  page,
  isMobile,
}) => {
  const errors = trackErrors(page);
  await ready(page, "/harmony");
  await press(page, isMobile, majorKey(page, "G Maior, dominante (V)"));
  await expect(majorKey(page, "G Maior, tónica ativa (I)")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(page.getByTestId("key-signature")).toContainText("1 sustenido");
  // A cadence plays and updates the last chord.
  await press(
    page,
    isMobile,
    page.getByRole("button", { name: "Tocar a cadência Perfeita" }),
  );
  // V (D) then, 1.3 s later, I (G) (F200).
  await expect(page.getByTestId("last-chord")).toContainText("D");
  await expect(page.getByTestId("last-chord")).toContainText("G");
  expect(errors).toEqual([]);
});

test("axe finds no serious or critical issue on Infinito and Harmonia", async ({
  page,
}) => {
  await ready(page, "/endless");
  expect(await seriousIssues(page)).toEqual([]);
  await ready(page, "/harmony");
  expect(await seriousIssues(page)).toEqual([]);
});

test.describe("desktop only", () => {
  test.skip(({ isMobile }) => isMobile, "keyboard flows are desktop flows");

  test("the circle works with the keyboard only", async ({ page }) => {
    await ready(page, "/harmony");
    await majorKey(page, "C Maior, tónica ativa (I)").focus();
    await page.keyboard.press("ArrowRight");
    await expect(majorKey(page, "G Maior, dominante (V)")).toBeFocused();
    // Focus shows what hover shows (F192, F205).
    await expect(page.getByText("G · Sol Maior")).toBeVisible();
    await page.keyboard.press("ArrowLeft");
    await page.keyboard.press("ArrowLeft");
    await expect(majorKey(page, "F Maior, subdominante (IV)")).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(majorKey(page, "F Maior, tónica ativa (I)")).toBeFocused();
    await expect(page.getByTestId("key-signature")).toContainText("1 bemol");
    // Shift+Enter plays the relative minor and sets the last chord (F195).
    await page.keyboard.press("Shift+Enter");
    await expect(majorKey(page, "F Maior, tónica ativa (I)")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(page.getByTestId("last-chord")).toContainText("Dm");
  });

  test("Space starts and stops the generator", async ({ page }) => {
    await ready(page, "/endless");
    await page.locator("main h1").click();
    await page.keyboard.press(" ");
    await expect(status(page)).toHaveText("A gerar");
    await page.keyboard.press("Escape");
    await expect(status(page)).toHaveText("Parado");
  });
});
