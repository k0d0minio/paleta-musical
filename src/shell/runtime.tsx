"use client";

import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { audioEngine, isInstrumentId, useAudioStatus, useAudioUnlock } from "@/audio";
import { inputRegistry } from "@/input";
import { KeyboardSource } from "@/input/sources/keyboard";
import { pointerSource } from "@/input/sources/pointer";
import { moduleFromPath, useNavigator } from "@/nav";
import { hasCapability, isIOS } from "@/platform";
import { hydrateStore, requestPersistentStorage, useAppStore, useSettings } from "@/state";
import { toast } from "@/ui/components/toaster";
import { useShellUi } from "./ui-store";

function dialogOpen(): boolean {
  return document.querySelector('[role="dialog"], [role="alertdialog"]') !== null;
}

/** The side effects of the app: hydration, audio, input sources, theme, motion, route sync and global shortcuts. */
export function AppRuntime() {
  const settings = useSettings();
  const hydrated = useAppStore((s) => s.session.hydrated);
  const recovered = useAppStore((s) => s.session.recoveredFromBadData);
  const { setTheme } = useTheme();
  const pathname = usePathname();
  const navigator = useNavigator();
  const status = useAudioStatus();
  const tAudio = useTranslations("audio");
  const tStorage = useTranslations("storage");
  const iosHintShown = useRef(false);

  // Stored data loads on the client only (no hydration mismatch).
  useEffect(() => {
    void hydrateStore().then(() => requestPersistentStorage());
  }, []);

  useAudioUnlock();

  // Input sources: pointer (on-screen notes) and the computer keyboard.
  useEffect(() => {
    const keyboard = new KeyboardSource({
      getOctave: () => useAppStore.getState().global.octave,
      stepOctave: (delta) => useAppStore.getState().stepOctave(delta),
    });
    const offKeyboard = inputRegistry.register(keyboard);
    const offPointer = inputRegistry.register(pointerSource);
    return () => {
      offKeyboard();
      offPointer();
    };
  }, []);

  // Settings → engine, theme and motion.
  useEffect(() => audioEngine.setVolume(settings.volume), [settings.volume]);
  useEffect(() => {
    if (isInstrumentId(settings.instrument)) audioEngine.setInstrument(settings.instrument);
  }, [settings.instrument]);
  useEffect(() => {
    if (hydrated) setTheme(settings.theme);
  }, [hydrated, settings.theme, setTheme]);
  useEffect(() => {
    document.documentElement.dataset.motion = settings.motion;
  }, [settings.motion]);

  // Bad stored data: the app fell back to defaults; say so (no error is silent).
  useEffect(() => {
    if (recovered) toast.warning(tStorage("recovered"));
  }, [recovered, tStorage]);

  // iOS without the audio-session API: a one-time hint about the silent switch.
  useEffect(() => {
    if (status.state === "running" && !iosHintShown.current && isIOS() && !hasCapability("audioSession")) {
      iosHintShown.current = true;
      toast.info(tAudio("silentSwitch"));
    }
  }, [status.state, tAudio]);

  // Back, forward and typed URLs run the same switch logic as goTo (U07).
  useEffect(() => {
    navigator.syncFromRoute(moduleFromPath(pathname));
  }, [pathname, navigator]);

  // Global shortcuts.
  const ui = useShellUi();
  useHotkeys("mod+k", () => ui.set({ commandOpen: !ui.commandOpen }), { preventDefault: true, enableOnFormTags: true });
  useHotkeys("?", () => ui.set({ helpOpen: true }), { useKey: true });
  useHotkeys("escape", () => {
    if (!dialogOpen()) audioEngine.stopAll();
  });
  useHotkeys("mod+z", () => useAppStore.temporal.getState().undo(), { preventDefault: true });
  useHotkeys("mod+shift+z", () => useAppStore.temporal.getState().redo(), { preventDefault: true });

  return null;
}
