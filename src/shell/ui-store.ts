import { create } from "zustand";

/** Open state of the shell overlays. Not persisted. */
interface ShellUi {
  settingsOpen: boolean;
  helpOpen: boolean;
  commandOpen: boolean;
  set(patch: Partial<Omit<ShellUi, "set">>): void;
}

export const useShellUi = create<ShellUi>()((set) => ({
  settingsOpen: false,
  helpOpen: false,
  commandOpen: false,
  set: (patch) => set(patch),
}));
