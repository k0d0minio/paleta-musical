/** The global shortcuts. Display keys use "mod" for Ctrl (Windows, Linux) or ⌘ (macOS). */
export const GLOBAL_SHORTCUTS = [
  { keys: ["mod", "K"], labelKey: "commandPalette" },
  { keys: ["?"], labelKey: "help" },
  { keys: ["Esc"], labelKey: "stopAll" },
  { keys: ["mod", "Z"], labelKey: "undo" },
  { keys: ["mod", "Shift", "Z"], labelKey: "redo" },
] as const;

export function isMac(): boolean {
  return typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.userAgent);
}

export function displayKey(key: string): string {
  if (key === "mod") return isMac() ? "⌘" : "Ctrl";
  return key.length === 1 ? key.toUpperCase() : key;
}
