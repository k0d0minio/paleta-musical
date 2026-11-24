import { readFile } from "node:fs/promises";
import AxeBuilder from "@axe-core/playwright";
import { Midi } from "@tonejs/midi";
import { expect, test, type Page } from "@playwright/test";

/** JAM-552: the piano roll (/analyse/roll). */

function trackErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  return errors;
}

async function openRoll(page: Page) {
  await page.goto("/analyse/roll");
  await expect(
    page.getByRole("heading", { level: 1, name: "Piano roll" }),
  ).toBeVisible();
  // The stored data has loaded once the transport bar shows the octave.
  await expect(
    page.getByRole("group", { name: "Oitava" }).locator("output"),
  ).toHaveText(/\d/);
}

const canvas = (page: Page) => page.getByTestId("piano-roll-canvas");
const count = (page: Page) => page.getByTestId("roll-count");
const announcer = (page: Page) => page.getByTestId("roll-announcer");

/** Page coordinates of (time, pitch) on the roll, with the initial 0–10 s window. */
async function point(page: Page, t: number, midi: number) {
  await canvas(page).scrollIntoViewIfNeeded();
  const box = await canvas(page).boundingBox();
  if (!box) throw new Error("no canvas");
  const keys = box.width < 500 ? 40 : 52;
  const ruler = 22;
  const row = (box.height - ruler) / 61;
  return {
    x: box.x + keys + (t / 10) * (box.width - keys),
    y: box.y + ruler + (96 - midi + 0.5) * row,
  };
}

/** A pointer gesture: real mouse on desktop, touch pointer events on the phone. */
async function gesture(
  page: Page,
  isMobile: boolean,
  from: { x: number; y: number },
  to = from,
) {
  if (!isMobile) {
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    await page.mouse.move(to.x, to.y, { steps: 5 });
    await page.mouse.up();
    return;
  }
  await canvas(page).evaluate(
    (el, { from, to }) => {
      const fire = (type: string, x: number, y: number) =>
        el.dispatchEvent(
          new PointerEvent(type, {
            bubbles: true,
            cancelable: true,
            pointerId: 7,
            pointerType: "touch",
            isPrimary: true,
            clientX: x,
            clientY: y,
            button: 0,
            buttons: type === "pointerup" ? 0 : 1,
          }),
        );
      fire("pointerdown", from.x, from.y);
      for (let i = 1; i <= 5; i++) {
        fire(
          "pointermove",
          from.x + ((to.x - from.x) * i) / 5,
          from.y + ((to.y - from.y) * i) / 5,
        );
      }
      fire("pointerup", to.x, to.y);
    },
    { from, to },
  );
}

async function drawOne(page: Page, isMobile: boolean, t = 1, midi = 60) {
  await canvas(page).focus();
  await page.keyboard.press("2");
  await gesture(page, isMobile, await point(page, t, midi));
  await page.keyboard.press("1");
}

test("the roll loads; draw, select, move and delete with the keyboard, undo", async ({
  page,
  isMobile,
}) => {
  const errors = trackErrors(page);
  await openRoll(page);
  await expect(count(page)).toHaveText("0 notas");
  await drawOne(page, isMobile);
  await expect(count(page)).toHaveText("1 nota");

  await canvas(page).focus();
  await page.keyboard.press("]");
  await expect(announcer(page)).toHaveText(/^C4, início 1\.\d\d s/);
  await page.keyboard.press("ArrowUp");
  await expect(announcer(page)).toHaveText(/^C♯4/);
  await page.keyboard.press("Delete");
  await expect(count(page)).toHaveText("0 notas");
  await page.getByRole("button", { name: "Desfazer" }).click();
  await expect(count(page)).toHaveText("1 nota");
  expect(errors).toEqual([]);
});

test("touch-style draw and drag move a note in time (F252, F255, F260)", async ({
  page,
  isMobile,
}) => {
  const errors = trackErrors(page);
  await openRoll(page);
  await drawOne(page, isMobile, 1, 64);
  await gesture(
    page,
    isMobile,
    await point(page, 1.1, 64),
    await point(page, 3.1, 64),
  );
  await canvas(page).focus();
  await page.keyboard.press("Escape");
  await page.keyboard.press("]");
  await expect(announcer(page)).toHaveText(/^E4, início 3\.\d\d s/);
  expect(errors).toEqual([]);
});

test("roll notes stay after a reload", async ({ page, isMobile }) => {
  await openRoll(page);
  await drawOne(page, isMobile, 2, 67);
  await expect(count(page)).toHaveText("1 nota");
  await page.waitForTimeout(400);
  await page.reload();
  await expect(count(page)).toHaveText("1 nota");
});

test("MIDI export (F263, R21) starts and the file parses", async ({
  page,
  isMobile,
  browserName,
}) => {
  const errors = trackErrors(page);
  await openRoll(page);
  await drawOne(page, isMobile, 1, 60);
  const exportButton = page.getByRole("button", { name: "Exportar MIDI" });
  if (browserName === "chromium") {
    const download = page.waitForEvent("download");
    await exportButton.click();
    const file = await download;
    expect(file.suggestedFilename()).toBe("paleta-musical.mid");
    const midi = new Midi(await readFile(await file.path()));
    expect(midi.tracks[0]?.name).toBe("Paleta Musical");
    expect(midi.tracks[0]?.notes.map((n) => n.midi)).toEqual([60]);
    expect(midi.tracks[0]?.notes[0]?.velocity).toBeCloseTo(90 / 127, 3);
  } else {
    await exportButton.click();
  }
  await expect(
    page.getByText("MIDI exportado! 1 notas · 120 BPM"),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

/** A fake microphone: a 440 Hz tone from 0.4 s to 1.2 s (U20: a real length). */
async function fakeMicrophone(page: Page) {
  await page.addInitScript(() => {
    const w = window as unknown as { __micStops: number };
    w.__micStops = 0;
    navigator.mediaDevices.getUserMedia = async () => {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      osc.frequency.value = 440;
      const gain = ctx.createGain();
      const t = ctx.currentTime;
      gain.gain.setValueAtTime(0, t);
      gain.gain.setValueAtTime(0.5, t + 0.4);
      gain.gain.setValueAtTime(0, t + 1.2);
      const dest = ctx.createMediaStreamDestination();
      osc.connect(gain).connect(dest);
      osc.start();
      for (const track of dest.stream.getTracks()) {
        const stop = track.stop.bind(track);
        track.stop = () => {
          w.__micStops += 1;
          stop();
        };
      }
      return dest.stream;
    };
  });
}

test("a microphone capture of a test tone creates a note with its real length (U20)", async ({
  page,
  browserName,
}) => {
  test.skip(browserName !== "chromium", "fake media stream: Chromium only");
  const errors = trackErrors(page);
  await fakeMicrophone(page);
  await openRoll(page);
  await page.getByRole("button", { name: "Capturar do microfone" }).click();
  await expect(page.getByTestId("roll-status")).toHaveText(
    "A capturar via microfone… toca o teu instrumento!",
  );
  await page.waitForTimeout(2000);
  await page.getByRole("button", { name: "Parar captura" }).click();
  await expect(page.getByTestId("roll-status")).toHaveText(
    /^Captura parada\. [1-9]\d* notas capturadas\.$/,
  );
  expect(
    await page.evaluate(
      () => (window as unknown as { __micStops: number }).__micStops,
    ),
  ).toBe(1);
  await canvas(page).focus();
  await page.keyboard.press("]");
  const text = (await announcer(page).textContent()) ?? "";
  const match = /^A4, início [\d.]+ s, duração ([\d.]+) s/.exec(text);
  expect(match, text).not.toBeNull();
  const length = Number(match?.[1]);
  expect(length).toBeGreaterThan(0.5);
  expect(length).toBeLessThan(1.1);
  expect(errors).toEqual([]);
});

test("leaving the module stops the microphone (U17)", async ({
  page,
  browserName,
}) => {
  test.skip(browserName !== "chromium", "fake media stream: Chromium only");
  await fakeMicrophone(page);
  await openRoll(page);
  await page.getByRole("button", { name: "Capturar do microfone" }).click();
  await expect(page.getByTestId("roll-status")).toHaveText(/A capturar/);
  await page
    .getByRole("navigation", { name: "Módulos" })
    .getByRole("link", { name: "Paleta", exact: true })
    .click();
  await expect(page).toHaveURL(/\/palette$/);
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as unknown as { __micStops: number }).__micStops,
      ),
    )
    .toBe(1);
});

test("axe finds no serious or critical issue on the roll controls", async ({
  page,
  isMobile,
}) => {
  await openRoll(page);
  await drawOne(page, isMobile, 1, 60);
  await canvas(page).focus();
  await page.keyboard.press("]");
  await page.waitForFunction(() =>
    document
      .getAnimations()
      .every(
        (a) =>
          a.playState !== "running" ||
          a.effect?.getTiming().iterations === Infinity,
      ),
  );
  const results = await new AxeBuilder({ page }).include("main").analyze();
  const serious = results.violations
    .filter((v) => v.impact === "serious" || v.impact === "critical")
    .map(
      (v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`,
    );
  expect(serious).toEqual([]);
});
