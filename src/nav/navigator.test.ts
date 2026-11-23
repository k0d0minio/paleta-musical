import { describe, expect, it, vi } from "vitest";
import { createNavigator, hrefFor, moduleFromPath } from "./navigator";
import type { ModuleDefinition, ModuleId } from "./types";

function setup(start: ModuleId | null = "palette") {
  const calls: string[] = [];
  let current = start;
  const def = (id: ModuleId): ModuleDefinition => ({
    id,
    route: `/${id}`,
    icon: () => null,
    messageKey: `modules.${id}`,
    shortcuts: [],
    onEnter: vi.fn(({ from }) => calls.push(`enter:${id}<-${from}`)),
    onLeave: vi.fn(({ to }) => calls.push(`leave:${id}->${to}`)),
  });
  const modules = (["palette", "progressions", "endless", "chords", "harmony", "analyse"] as const).map(def);
  const push = vi.fn((href: string) => calls.push(`push:${href}`));
  const stopAll = vi.fn(() => calls.push("stopAll"));
  const navigator = createNavigator({
    modules,
    push,
    stopAll,
    getCurrent: () => current,
    setCurrent: (id) => {
      current = id;
      calls.push(`current:${id}`);
    },
  });
  return { navigator, calls, stopAll, push, getCurrent: () => current };
}

describe("goTo (U07)", () => {
  it("stops playback, runs the hooks and moves the current-module mark on every switch", () => {
    const { navigator, calls, getCurrent } = setup("palette");
    navigator.goTo("harmony", { tonic: "2" });
    expect(calls).toEqual([
      "stopAll",
      "leave:palette->harmony",
      "current:harmony",
      "enter:harmony<-palette",
      "push:/harmony?tonic=2",
    ]);
    expect(getCurrent()).toBe("harmony");
  });

  it("runs the same logic for a cross-module link from any module", () => {
    const { navigator, stopAll, calls } = setup("chords");
    navigator.goTo("progressions", { tab: "builder" });
    expect(stopAll).toHaveBeenCalledOnce();
    expect(calls).toContain("leave:chords->progressions");
    expect(calls).toContain("enter:progressions<-chords");
  });

  it("runs the switch logic for back/forward navigation too", () => {
    const { navigator, stopAll, push } = setup("palette");
    navigator.syncFromRoute("endless");
    expect(stopAll).toHaveBeenCalledOnce();
    expect(push).not.toHaveBeenCalled();
  });

  it("does not stop playback inside the same module", () => {
    const { navigator, stopAll, push } = setup("analyse");
    navigator.goTo("analyse", { view: "roll" });
    expect(stopAll).not.toHaveBeenCalled();
    expect(push).toHaveBeenCalledWith("/analyse/roll");
  });
});

describe("routes", () => {
  it("maps paths to modules", () => {
    expect(moduleFromPath("/analyse/roll")).toBe("analyse");
    expect(moduleFromPath("/palette")).toBe("palette");
    expect(moduleFromPath("/dev/design")).toBeNull();
    expect(hrefFor("palette")).toBe("/palette");
  });
});
