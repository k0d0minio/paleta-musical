import type { ModuleDefinition, ModuleId, NavParams } from "./types";

export const MODULE_ROUTES: Readonly<Record<ModuleId, string>> = {
  palette: "/palette",
  progressions: "/progressions",
  endless: "/endless",
  chords: "/chords",
  harmony: "/harmony",
  analyse: "/analyse",
};

/** Sub-views that have their own route. */
export const VIEW_ROUTES: Readonly<Record<string, string>> = {
  "analyse/roll": "/analyse/roll",
};

export function moduleFromPath(pathname: string): ModuleId | null {
  const segment = pathname.split("/")[1] ?? "";
  const entry = Object.entries(MODULE_ROUTES).find(
    ([, route]) => route === `/${segment}`,
  );
  return (entry?.[0] as ModuleId | undefined) ?? null;
}

export function hrefFor(id: ModuleId, params: NavParams = {}): string {
  const { view, ...query } = params;
  const base = (view && VIEW_ROUTES[`${id}/${view}`]) || MODULE_ROUTES[id];
  const search = new URLSearchParams(query).toString();
  return search ? `${base}?${search}` : base;
}

export interface NavigatorDeps {
  readonly modules: readonly ModuleDefinition[];
  push(href: string): void;
  stopAll(): void;
  getCurrent(): ModuleId | null;
  setCurrent(id: ModuleId): void;
}

export interface Navigator {
  /** Every module switch and every cross-module link goes through here (fixes U07). */
  goTo(id: ModuleId, params?: NavParams): void;
  /** Runs the same switch logic when the URL changed without goTo (back, forward, typed URL). */
  syncFromRoute(id: ModuleId | null, params?: NavParams): void;
}

export function createNavigator(deps: NavigatorDeps): Navigator {
  const find = (id: ModuleId | null) => deps.modules.find((m) => m.id === id);

  /** The switch logic: stop playback, leave hook, current-module mark, enter hook. */
  function switchModule(to: ModuleId, params: NavParams): void {
    const from = deps.getCurrent();
    if (from === to) return;
    deps.stopAll();
    if (from) find(from)?.onLeave?.({ to });
    deps.setCurrent(to);
    find(to)?.onEnter?.({ from, params });
  }

  return {
    goTo(id, params = {}) {
      switchModule(id, params);
      deps.push(hrefFor(id, params));
    },
    syncFromRoute(id, params = {}) {
      if (id) switchModule(id, params);
    },
  };
}
