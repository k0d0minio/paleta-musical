import { audioEngine } from "../engine";
import { Synth } from "./synth";

export * from "./params";
export * from "./presets";
export { ENVELOPE_PEAK, SCOPE_FRAME, Synth, type HeldNotes } from "./synth";

/** The app-wide synth (the Sintetizador module). Creating it touches no browser API. */
export const synth = new Synth({ output: () => audioEngine.moduleOutput() });

// Stop-all (Esc, the transport button, a module switch) silences the synth too.
audioEngine.onStopAll(() => synth.stopAll());
