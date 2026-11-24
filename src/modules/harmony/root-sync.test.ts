import { beforeEach, describe, expect, it } from "vitest";
import { audioEngine } from "@/audio";
import { createNavigator, type ModuleId } from "@/nav";
import { MODULES } from "@/shell/modules";
import { resetAllData, useAppStore } from "@/state";

const s = () => useAppStore.getState();

/** The app's navigator with the real module registry and the real stop-all. */
function navigator(start: ModuleId | null = null) {
  let current = start;
  return createNavigator({
    modules: MODULES,
    push: () => undefined,
    stopAll: () => audioEngine.stopAll(),
    getCurrent: () => current,
    setCurrent: (id) => {
      current = id;
    },
  });
}

beforeEach(async () => {
  await resetAllData();
});

describe("root sync with module switches (F018, F019)", () => {
  it("takes the Harmonia tonic from Paleta, Progressões and Infinito", () => {
    const nav = navigator("palette");
    s().setModuleState("palette", { tonic: 7 });
    nav.goTo("harmony");
    expect(s().modules.harmony.tonic).toBe(7);

    nav.goTo("progressions");
    s().setModuleState("progressions", { key: 2 });
    nav.goTo("harmony");
    expect(s().modules.harmony.tonic).toBe(2);

    nav.goTo("endless");
    s().setModuleState("endless", { key: 9 });
    nav.goTo("harmony");
    expect(s().modules.harmony.tonic).toBe(9);
  });

  it("does not sync from Acordes, Analisar or a first load", () => {
    s().setModuleState("harmony", { tonic: 4 });
    s().setModuleState("palette", { tonic: 7 });
    const nav = navigator(null);
    nav.syncFromRoute("harmony");
    expect(s().modules.harmony.tonic).toBe(4);
    nav.goTo("chords");
    nav.goTo("harmony");
    expect(s().modules.harmony.tonic).toBe(4);
    nav.goTo("analyse");
    nav.goTo("harmony");
    expect(s().modules.harmony.tonic).toBe(4);
  });

  it("leaving Harmonia sets the Progressões key and the Infinito key to its tonic", () => {
    const nav = navigator("harmony");
    s().setModuleState("harmony", { tonic: 10 });
    nav.goTo("chords");
    expect(s().modules.progressions.key).toBe(10);
    expect(s().modules.endless.key).toBe(10);
    // The Paleta tonic does not change.
    expect(s().modules.palette.tonic).toBe(0);
  });

  it("a cross-module link (F041, F202) runs the same sync", () => {
    const nav = navigator("palette");
    s().setModuleState("palette", { tonic: 3 });
    nav.goTo("harmony", {});
    expect(s().modules.harmony.tonic).toBe(3);
    nav.goTo("progressions", { tab: "styles" });
    expect(s().modules.progressions.key).toBe(3);
    expect(s().modules.endless.key).toBe(3);
  });
});
