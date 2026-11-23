import type { ComponentType } from "react";
import type { ModuleId } from "@/state";

export type { ModuleId };

export type NavParams = Readonly<Record<string, string>>;

export interface ModuleLifecycle {
  /** Runs after the switch, with the module the user came from. */
  onEnter?(context: { from: ModuleId | null; params: NavParams }): void;
  /** Runs before the switch, with the module the user goes to. */
  onLeave?(context: { to: ModuleId }): void;
}

export interface Shortcut {
  /** react-hotkeys-hook key string, e.g. "space" or "mod+enter". */
  readonly keys: string;
  /** Message key of the description (in the module namespace). */
  readonly labelKey: string;
}

/**
 * A module declares itself here. The navigation, the command palette and the
 * shortcut help come from these definitions.
 */
export interface ModuleDefinition extends ModuleLifecycle {
  readonly id: ModuleId;
  readonly route: string;
  readonly icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  /** Message namespace: `modules.<id>`. */
  readonly messageKey: string;
  readonly shortcuts: readonly Shortcut[];
}
