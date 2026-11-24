import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Locator, type Page } from "@playwright/test";

/** Collects uncaught page errors; every test asserts there are none. */
function trackErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  return errors;
}

async function ready(page: Page, path = "/synth") {
  await page.goto(path);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  // The stored data has loaded once the transport bar shows the octave.
  await expect(
    page.getByRole("group", { name: "Oitava" }).locator("output"),
  ).toHaveText(/\d/);
}

const nav = (page: Page) => page.getByRole("navigation", { name: "Módulos" });
const key = (page: Page, midi: number) =>
  page.locator(`main [data-midi="${midi}"]`);
const held = (page: Page) => page.locator("main [data-held]");
const knob = (page: Page, name: string) =>
  page.getByRole("slider", { name, exact: true });

async function press(locator: Locator, isMobile: boolean) {
  if (isMobile) await locator.tap();
  else await locator.click();
}

/** Holds keys with touch pointers (more than one finger), then lifts them. */
async function touchHold(page: Page, midis: readonly number[]) {
  for (const [i, midi] of midis.entries()) {
    await key(page, midi).dispatchEvent("pointerdown", {
      pointerId: 100 + i,
      pointerType: "touch",
      isPrimary: i === 0,
      button: 0,
      bubbles: true,
    });
  }
}

async function touchLift(page: Page, count: number) {
  await page.evaluate((n) => {
    for (let i = 0; i < n; i++)
      window.dispatchEvent(
        new PointerEvent("pointerup", { pointerId: 100 + i, bubbles: true }),
      );
  }, count);
}

test("Sintetizador is in the navigation and plays chords from the keys and the computer keyboard", async ({
  page,
  isMobile,
  browserName,
}) => {
  const errors = trackErrors(page);
  await ready(page, "/palette");
  await nav(page)
    .getByRole("link", { name: "Sintetizador", exact: true })
    .click();
  await expect(page).toHaveURL(/\/synth$/);
  await expect(
    page.getByRole("heading", { level: 1, name: "Sintetizador" }),
  ).toBeVisible();
  // S030: the oscilloscope waits for the first note.
  await expect(
    page.getByText("Toca numa tecla para ligar o som"),
  ).toBeVisible();
  // S021: 25 keys from C4 (the app's octave).
  await expect(page.getByText("C4 – C6")).toBeVisible();
  await expect(
    page.getByRole("group", { name: "Teclado de C4 a C6" }).getByRole("button"),
  ).toHaveCount(25);

  // S025: more than one finger, more than one note.
  await touchHold(page, [60, 64, 67]);
  await expect(held(page)).toHaveCount(3);
  await touchLift(page, 3);
  await expect(held(page)).toHaveCount(0);

  if (!isMobile) {
    // S026: A D G hold C E G; key up releases.
    await page.getByRole("heading", { level: 1, name: "Sintetizador" }).click();
    await page.keyboard.down("a");
    await page.keyboard.down("d");
    await page.keyboard.down("g");
    await expect(held(page)).toHaveCount(3);
    await expect(key(page, 64)).toHaveAttribute("data-held", "true");
    // P = 15 semitones from the first key.
    await page.keyboard.down("p");
    await expect(key(page, 75)).toHaveAttribute("data-held", "true");
    for (const k of ["a", "d", "g", "p"]) await page.keyboard.up(k);
    await expect(held(page)).toHaveCount(0);
    // S027: X steps the octave up.
    await page.keyboard.press("x");
    await expect(page.getByText("C5 – C7")).toBeVisible();
    await page.keyboard.press("z");
    await expect(page.getByText("C4 – C6")).toBeVisible();
  } else {
    await key(page, 62).tap();
  }

  if (browserName === "chromium") {
    // The audio runs: the oscilloscope shows the wave instead of the idle text.
    await expect(
      page.getByText("Toca numa tecla para ligar o som"),
    ).toBeHidden();
  }
  expect(errors).toEqual([]);
});

test("the rotary control works with the keyboard alone and resets to its default", async ({
  page,
  isMobile,
}) => {
  const errors = trackErrors(page);
  await ready(page);
  const cutoff = knob(page, "Corte do filtro");
  await expect(cutoff).toHaveAttribute("aria-valuetext", "2,2 kHz");
  await cutoff.focus();
  await page.keyboard.press("Home");
  await expect(cutoff).toHaveAttribute("aria-valuetext", "80 Hz");
  await expect(cutoff).toHaveAttribute("aria-valuenow", "0");
  await page.keyboard.press("End");
  await expect(cutoff).toHaveAttribute("aria-valuetext", "12,0 kHz");
  await page.keyboard.press("PageDown");
  await expect(cutoff).toHaveAttribute("aria-valuenow", "90");
  await page.keyboard.press("ArrowDown");
  await expect(cutoff).toHaveAttribute("aria-valuenow", "88");
  await page.keyboard.press("ArrowRight");
  await expect(cutoff).toHaveAttribute("aria-valuenow", "90");

  // S018: double-click (double tap on touch) resets to the SR1 default.
  if (isMobile) {
    await cutoff.tap();
    await cutoff.tap();
  } else {
    await cutoff.dblclick();
  }
  await expect(cutoff).toHaveAttribute("aria-valuetext", "2,2 kHz");

  const detune = knob(page, "Afinação do oscilador 2");
  await detune.focus();
  await page.keyboard.press("PageUp");
  await expect(detune).toHaveAttribute("aria-valuetext", "+18 cents");

  if (!isMobile) {
    // S015: drag up 50 px = +30 % of the range (from 68 %).
    const box = await detune.boundingBox();
    if (!box) throw new Error("no knob");
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2 - 50, {
      steps: 5,
    });
    await page.mouse.up();
    await expect(detune).toHaveAttribute("aria-valuenow", "98");
  }
  expect(errors).toEqual([]);
});

test("a preset sets its values, keeps the volume, and the sound survives a reload", async ({
  page,
  isMobile,
}) => {
  await ready(page);
  const volume = knob(page, "Volume do sintetizador");
  await volume.focus();
  await page.keyboard.press("PageUp");
  await expect(volume).toHaveAttribute("aria-valuetext", "70 %");

  const bass = page.getByRole("button", { name: "Baixo", exact: true });
  await press(bass, isMobile);
  await expect(bass).toHaveAttribute("aria-pressed", "true");
  await expect(knob(page, "Corte do filtro")).toHaveAttribute(
    "aria-valuetext",
    "500 Hz",
  );
  await expect(knob(page, "Ressonância do filtro")).toHaveAttribute(
    "aria-valuetext",
    "6,0",
  );
  await expect(knob(page, "Ataque")).toHaveAttribute("aria-valuetext", "5 ms");
  await expect(volume).toHaveAttribute("aria-valuetext", "70 %");
  const osc1 = page.getByRole("radiogroup", { name: "Oscilador 1" });
  await expect(osc1.getByRole("radio", { name: "Serra" })).toHaveAttribute(
    "aria-checked",
    "true",
  );

  await page.waitForTimeout(300);
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Baixo", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(knob(page, "Corte do filtro")).toHaveAttribute(
    "aria-valuetext",
    "500 Hz",
  );
  await expect(knob(page, "Volume do sintetizador")).toHaveAttribute(
    "aria-valuetext",
    "70 %",
  );
});

test("a sound saves with a name; the note keys do not play in its text field", async ({
  page,
  isMobile,
}) => {
  await ready(page);
  await press(page.getByRole("button", { name: "Guardar som" }), isMobile);
  const name = page.getByRole("textbox", { name: "Nome" });
  await expect(name).toBeFocused();
  await name.fill("");
  await name.pressSequentially("asdf");
  await expect(held(page)).toHaveCount(0);
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Guardar som" })
    .click();
  const mine = page.getByRole("button", { name: "asdf", exact: true });
  await expect(mine).toHaveAttribute("aria-pressed", "true");

  await page.waitForTimeout(300);
  await page.reload();
  await expect(
    page.getByRole("button", { name: "asdf", exact: true }),
  ).toBeVisible();
  await press(page.getByRole("button", { name: "Apagar asdf" }), isMobile);
  await expect(
    page.getByRole("button", { name: "asdf", exact: true }),
  ).toHaveCount(0);
});

test("axe finds no serious or critical issue on the Sintetizador", async ({
  page,
}) => {
  await ready(page);
  await knob(page, "Corte do filtro").focus();
  await page.getByText("Ajuda", { exact: true }).click();
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
  const serious = results.violations
    .filter((v) => v.impact === "serious" || v.impact === "critical")
    .map(
      (v) =>
        `${v.id}: ${v.nodes.map((n) => `${n.target.join(" ")} ${n.any[0]?.message ?? ""}`).join(", ")}`,
    );
  expect(serious).toEqual([]);
});
