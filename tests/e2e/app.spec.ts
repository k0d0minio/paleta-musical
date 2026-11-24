import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const MODULES = [
  { path: "/palette", name: "Paleta" },
  { path: "/progressions", name: "Progressões" },
  { path: "/endless", name: "Infinito" },
  { path: "/chords", name: "Acordes" },
  { path: "/harmony", name: "Harmonia" },
  { path: "/analyse", name: "Analisar" },
];

/** Collects uncaught page errors; every test asserts there are none. */
function trackErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  return errors;
}

async function ready(page: Page, path = "/palette") {
  await page.goto(path);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  // The stored data has loaded once the transport bar shows the octave.
  await expect(
    page.getByRole("group", { name: "Oitava" }).locator("output"),
  ).toHaveText(/\d/);
}

const nav = (page: Page) => page.getByRole("navigation", { name: "Módulos" });
const chip = (page: Page, pc: number) =>
  page.locator(`main [data-pc="${pc}"]`).first();

test("/ opens the Paleta module", async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto("/");
  await expect(page).toHaveURL(/\/palette$/);
  await expect(
    nav(page).getByRole("link", { name: "Paleta", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  expect(errors).toEqual([]);
});

test("the design tokens are applied (note colours and the app font)", async ({
  page,
}) => {
  await ready(page);
  const tokens = await page.evaluate(() => {
    const root = getComputedStyle(document.documentElement);
    const c = document.querySelector('main [data-pc="0"]');
    return {
      note0: root.getPropertyValue("--note-0").trim(),
      chipBackground: c ? getComputedStyle(c).backgroundColor : "",
      font: getComputedStyle(document.body).fontFamily,
    };
  });
  expect(tokens.note0).toMatch(/^#[0-9a-f]{6}$/i);
  expect(tokens.chipBackground).not.toBe("rgba(0, 0, 0, 0)");
  expect(tokens.font).toContain("Geist");
});

test("every module route exists and the navigation marks the current module", async ({
  page,
}) => {
  const errors = trackErrors(page);
  await ready(page);
  for (const m of MODULES) {
    await nav(page).getByRole("link", { name: m.name, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`${m.path}$`));
    await expect(
      page.getByRole("heading", { level: 1, name: m.name, exact: true }),
    ).toBeVisible();
    await expect(
      nav(page).getByRole("link", { name: m.name, exact: true }),
    ).toHaveAttribute("aria-current", "page");
  }
  await page.goto("/analyse/roll");
  await expect(
    page.getByRole("heading", { level: 1, name: "Piano roll" }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test("the slice plays a note after a tap and marks it as sounding", async ({
  page,
  browserName,
  isMobile,
}) => {
  const errors = trackErrors(page);
  await ready(page);
  await expect(
    page.getByText("Toca em qualquer lado para ativar o som"),
  ).toBeVisible();
  if (isMobile) await chip(page, 0).tap();
  else await chip(page, 0).click();
  await expect(chip(page, 0)).toHaveAttribute("data-sounding", "true");
  await expect(chip(page, 0)).toHaveAttribute("data-sounding", "false", {
    timeout: 3000,
  });
  if (browserName === "chromium") {
    // Audio is running: the unlock banner is gone.
    await expect(
      page.getByText("Toca em qualquer lado para ativar o som"),
    ).toBeHidden();
  }
  expect(errors).toEqual([]);
});

test("the octave is clamped and stays after a reload", async ({ page }) => {
  await ready(page);
  const octave = page.getByRole("group", { name: "Oitava" });
  await expect(octave.locator("output")).toHaveText("4");
  await octave.getByRole("button", { name: "Aumentar Oitava" }).click();
  await expect(octave.locator("output")).toHaveText("5");
  await page.waitForTimeout(300);
  await page.reload();
  await expect(
    page.getByRole("group", { name: "Oitava" }).locator("output"),
  ).toHaveText("5");
});

test("PT-PT and EN switch at run time and the lang attribute follows", async ({
  page,
}) => {
  await ready(page);
  await expect(page.locator("html")).toHaveAttribute("lang", "pt-PT");
  await page.getByRole("button", { name: "Definições" }).first().click();
  await page.getByRole("radio", { name: "English" }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("heading", { level: 1, name: "Palette" }),
  ).toBeVisible();
  await page.waitForTimeout(300);
  await page.reload();
  await expect(
    page.getByRole("heading", { level: 1, name: "Palette" }),
  ).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
});

test("axe finds no serious or critical issue on the slice", async ({
  page,
}) => {
  await ready(page);
  const scan = async () => {
    // Scan the settled page, not a banner in the middle of its exit animation.
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
  };
  expect(await scan()).toEqual([]);
  await page.getByRole("button", { name: "Definições" }).first().click();
  await expect(page.getByRole("dialog")).toBeVisible();
  expect(await scan()).toEqual([]);
});

test.describe("desktop only", () => {
  test.skip(
    ({ isMobile }) => isMobile,
    "keyboard and file download flows are desktop flows",
  );

  test("every control works with the keyboard only", async ({ page }) => {
    await ready(page);
    await page.keyboard.press("Tab");
    await expect(
      page.getByRole("link", { name: "Saltar para o conteúdo" }),
    ).toBeFocused();
    await chip(page, 0).focus();
    await page.keyboard.press("Enter");
    await expect(chip(page, 0)).toHaveAttribute("data-sounding", "true");
    await page.keyboard.press("ArrowRight");
    await expect(chip(page, 1)).toBeFocused();
    await page.keyboard.press(" ");
    await expect(chip(page, 1)).toHaveAttribute("data-sounding", "true");

    // QWERTY input: H = A.
    await page.locator("main").focus();
    await page.keyboard.press("h");
    await expect(chip(page, 9)).toHaveAttribute("data-sounding", "true");

    // Shortcut help and command palette.
    await page.keyboard.press("?");
    await expect(
      page.getByRole("dialog", { name: "Atalhos de teclado" }),
    ).toBeVisible();
    await page.keyboard.press("Escape");
    await page.keyboard.press("ControlOrMeta+k");
    await page
      .getByPlaceholder("Procura um módulo, uma escala ou um acorde…")
      .fill("Harmonia");
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/harmony$/);
    await expect(
      page
        .getByRole("navigation", { name: "Módulos" })
        .getByRole("link", { name: "Harmonia", exact: true }),
    ).toHaveAttribute("aria-current", "page");
  });

  test("reduced motion removes the glow animation", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await ready(page);
    await chip(page, 2).click();
    await expect(chip(page, 2)).toHaveAttribute("data-sounding", "true");
    expect(
      await chip(page, 2).evaluate((el) => getComputedStyle(el).animationName),
    ).toBe("none");
  });

  test("the glow animates without reduced motion", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await ready(page);
    await chip(page, 2).click();
    expect(
      await chip(page, 2).evaluate((el) => getComputedStyle(el).animationName),
    ).toBe("note-glow");
  });

  test("backup, restore and reset", async ({ page }, testInfo) => {
    await ready(page);
    const octave = page.getByRole("group", { name: "Oitava" });
    await octave.getByRole("button", { name: "Diminuir Oitava" }).click();
    await expect(octave.locator("output")).toHaveText("3");

    await page.getByRole("button", { name: "Definições" }).first().click();
    const download = page.waitForEvent("download");
    await page
      .getByRole("button", { name: "Guardar cópia de segurança" })
      .click();
    const file = testInfo.outputPath("backup.json");
    await (await download).saveAs(file);

    await page.getByRole("button", { name: "Apagar todos os dados" }).click();
    await page.getByRole("button", { name: "Apagar tudo" }).click();
    await expect(octave.locator("output")).toHaveText("4");

    await page.locator('input[type="file"]').setInputFiles(file);
    await expect(page.getByText("Dados repostos")).toBeVisible();
    await expect(octave.locator("output")).toHaveText("3");
  });
});
