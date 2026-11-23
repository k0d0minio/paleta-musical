import { afterEach, describe, expect, it, vi } from "vitest";
import {
  CAPABILITIES,
  detectCapabilities,
  hasCapability,
  configureAudioSession,
} from "./capabilities";
import { shareOrDownload } from "./share";

afterEach(() => vi.unstubAllGlobals());

describe("capabilities", () => {
  it("detects every capability without throwing", () => {
    const caps = detectCapabilities();
    expect(Object.keys(caps)).toEqual([...CAPABILITIES]);
    expect(hasCapability("webAudio")).toBe(false);
    expect(hasCapability("indexedDB")).toBe(true);
  });

  it("sets the iOS audio session to playback when the API exists", () => {
    expect(configureAudioSession()).toBe(false);
    const session = { type: "auto" };
    vi.stubGlobal("navigator", { ...navigator, audioSession: session });
    expect(configureAudioSession()).toBe(true);
    expect(session.type).toBe("playback");
  });
});

describe("shareOrDownload", () => {
  it("uses the share sheet when files can be shared", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { ...navigator, canShare: () => true, share });
    await expect(shareOrDownload("x", "a.mid", "audio/midi")).resolves.toBe(
      "shared",
    );
    expect(share).toHaveBeenCalledOnce();
  });

  it("downloads with an anchor otherwise", async () => {
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => {});
    URL.createObjectURL = vi.fn(() => "blob:x");
    URL.revokeObjectURL = vi.fn();
    await expect(shareOrDownload("x", "a.mid", "audio/midi")).resolves.toBe(
      "downloaded",
    );
    expect(click).toHaveBeenCalledOnce();
  });
});
