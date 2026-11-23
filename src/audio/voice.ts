import { R15, type VoiceShape } from "./r15";

export interface Voice {
  /** Fades the voice out fast and stops it. */
  release(at?: number): void;
  readonly ended: Promise<void>;
}

/**
 * One synth voice with the R15 envelope: gain rises linearly from 0 to the
 * volume during `attack`, then decays exponentially to 0.001 at the end of
 * `duration` (F007, F008). Pure Web Audio, so an OfflineAudioContext can render it.
 */
export function scheduleVoice(
  ctx: BaseAudioContext,
  destination: AudioNode,
  frequency: number,
  when: number,
  shape: VoiceShape,
  type: OscillatorType = R15.oscillator,
): Voice {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(frequency, when);
  gain.gain.setValueAtTime(0, when);
  gain.gain.linearRampToValueAtTime(shape.volume, when + shape.attack);
  gain.gain.exponentialRampToValueAtTime(R15.floor, when + shape.duration);
  osc.connect(gain);
  gain.connect(destination);
  osc.start(when);
  osc.stop(when + shape.duration + 0.02);

  const ended = new Promise<void>((resolve) => {
    osc.onended = () => {
      osc.disconnect();
      gain.disconnect();
      resolve();
    };
  });

  return {
    ended,
    release(at = ctx.currentTime) {
      try {
        gain.gain.cancelScheduledValues(at);
        gain.gain.setTargetAtTime(0, at, 0.015);
        osc.stop(at + 0.08);
      } catch {
        // The voice already stopped.
      }
    },
  };
}
