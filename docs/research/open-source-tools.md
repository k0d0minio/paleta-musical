# Paleta Musical — open-source libraries and tools

Research date: 2026-11-23. Work item: w-20261123-057.
Scope: libraries that can replace hand-written code of the original (`docs/features.md`) or add features, with a focus on external hardware.
Method: npm registry metadata (version, publish date, licence, peer dependencies), GitHub API (stars, last push, archived), bundlephobia (min+gzip size), project READMEs and docs, caniuse. Sizes are min+gzip from bundlephobia unless marked "unpacked" (npm tarball size, a worst case) or "est." (estimate). Nothing was installed.

Licence key: **OK** = permissive (MIT, BSD, ISC, Apache-2.0, 0BSD). **COPYLEFT** = GPL / LGPL / AGPL: not for this commercial client project without legal review. **CHECK** = permissive code but a note, data or sample licence needs a decision.

---

## 1. Recommended stack (add first)

| # | Library | Why |
|---|---|---|
| 1 | **tonal** (`tonal` 6.9.0 or the `@tonaljs/*` packages) | Replaces the hand-written note, scale, chord, key, Roman-numeral and chord-detection code (R3–R7, R10, R14). Typed, MIT, released 2026-11-22. Fixes the class of bugs U01, U08, U09, U12, U32, U33, U35 by giving real chord symbols and real octaves. |
| 2 | **Tone.js** (`tone` 15.1.22 stable) | Replaces the triangle synth and the `setTimeout` step chains with a sample-accurate Transport (rhythms R9, Infinito R13, roll playback). Fixes the stop/resume bugs U02, U13, U17, U18, U31, U37, U39 by design. `Tone.start()` is the audio unlock of F001–F004. |
| 3 | **smplr** (`smplr` 1.2.0) | Realistic sampled piano (Splendid Grand, public domain), electric piano, mallets (VCSL, CC0) and GM soundfonts, with a sample cache. Keeps the triangle synth as an option. MIT, 25 kB. |
| 4 | **WEBMIDI.js** (`webmidi` 3.3.1) | The hardware feature: device list, hot-plug events, note in/out, MIDI clock and start/stop, MIDI thru. Apache-2.0, 14 kB, active. |
| 5 | **@tonejs/midi** (2.0.28) | Read and write Standard MIDI Files. Replaces the buggy exporter (U19, U32, R21, F263–F267) and adds MIDI import into the roll and timeline. MIT, 9 kB. |
| 6 | **pitchy** (4.1.0) | McLeod pitch method with a clarity value for the live microphone (R20, F241–F245, U20). MIT, tiny. |
| 7 | **zustand** (5.1.0) + `persist`, with **idb-keyval** (6.3.0) for large blobs | State store with persistence (F275 "nothing persisted") and shared state across tabs (F016, F018, F019, F214). Both permissive, < 2 kB. |
| 8 | **next-intl** (4.16.0) | PT-PT / EN messages without locale routing; peer range includes Next 16 and React 19. Settles the PT-PT/PT-BR mix (U26, F274). MIT, 13 kB. |

Tooling to add with the stack (no runtime cost): **Vitest 5 + @vitest/browser + Playwright** (real AudioContext / OfflineAudioContext in a browser), **standardized-audio-context-mock** (unit tests of audio graphs), **web-midi-test** (virtual MIDI ports in tests), **@serwist/turbopack** (PWA / offline, Turbopack is the Next 16 default).

Second wave (when the features are scheduled): **wavesurfer.js** (waveform and regions in Analisar), **VexFlow** (staff view of a scale/chord), **svguitar** (guitar chord diagrams), **spessasynth_lib** (full GM soundfont synth and MIDI player), **@spotify/basic-pitch** (polyphonic audio-to-MIDI for the roll, heavy), **Comlink** (move the R16/R17 analysis to a Web Worker), **@atlaskit/pragmatic-drag-and-drop** or **@dnd-kit/react** (touch reordering, U29).

General Next.js 16 / React 19 rules for every audio or MIDI library:
- Put them only in `"use client"` components, and load them with `await import(...)` inside the first user-gesture handler or a `useEffect`. Never import them in a Server Component or at module top level of a shared file: several touch `window`, `AudioContext` or `navigator` on import or first use.
- Create or resume the one `AudioContext` only in a click/touch handler (Tone: `await Tone.start()`), then pass the same context to smplr, spessasynth and the analysers (`Tone.getContext().rawContext`).
- Call `WebMidi.enable()` from a button ("Ligar teclado MIDI"), not on page load: the browser shows a permission prompt, and Firefox shows a site-permission add-on prompt.
- Web MIDI, microphone and service workers need a secure context (HTTPS; `localhost` is allowed in development).

---

## 2. Hardware and MIDI possibilities

### 2.1 Browser support (caniuse, 2026-11)

| API | Chrome / Edge (desktop) | Chrome Android | Firefox | Safari macOS | iOS / iPadOS (all browsers) |
|---|---|---|---|---|---|
| Web MIDI | Yes (Chrome 43+, Edge 79+), permission prompt | Yes | Yes since 108; a "site permission add-on" prompt appears, only when a MIDI device is connected | **No** (WebKit bug 107250 still open). Third-party extension "Web MIDI for Safari" (Safari 18.4+) adds it | **No** |
| Web Bluetooth (for BLE-MIDI direct) | Yes | Yes | No (Mozilla position: harmful) | No | No (a third-party extension, iOSWebBLE, polyfills it) |
| Web Serial | Yes (89+) | Yes (157) | Yes since 151 | No | No |
| WebUSB | Yes (61+) | Yes | No | No | No |
| `AudioContext.setSinkId` (choose output device) | Yes (110+) | Yes | No | No | No |
| `getUserMedia` with `deviceId` (choose input / audio interface) | Yes | Yes | Yes | Yes | Yes |

Global usage with Web MIDI: about 81 % (caniuse). The gap is almost entirely Safari and iOS.

### 2.2 What we can build in the browser (Chromium, Firefox)

| Capability | How | Library | Feature link |
|---|---|---|---|
| Device picker with hot-plug | `WebMidi.inputs/outputs`, events `connected`, `disconnected`, `portschanged` | WEBMIDI.js | new; settings panel |
| Play the app from a MIDI keyboard | `noteon`/`noteoff` → flash palette notes (F011, F012), select notes in Livre/Detetar (F056–F067), detect the held chord on Acordes (F169–F182, R10 via tonal `Chord.detect`) | WEBMIDI.js + tonal | new input path for existing features |
| Record from a MIDI keyboard into the piano roll | timestamped note events → roll notes with real velocity and length; exact, unlike mic capture | WEBMIDI.js | F226–F264, replaces the weak mic path of U20 for keyboard players |
| Send progressions to hardware or a DAW | `output.playNote()` with scheduled times, channel choice, program change; Tone.js Transport drives both audio and MIDI out | WEBMIDI.js + Tone.js | F070–F096, F131–F144, F154–F168 |
| MIDI clock in (follow a DAW / drum machine) | input events `clock` (24 PPQN), `start`, `stop`, `continue`, `songposition` → derive BPM and start/stop the Transport | WEBMIDI.js (custom tempo follower: no library does the smoothing) | BPM of R9, F228 |
| MIDI clock out (be the master) | send 0xF8 at 24 PPQN from the Transport, plus start/stop | WEBMIDI.js + Tone.js | same |
| MIDI thru | `input.addForwarder(output)` with filters | WEBMIDI.js | new |
| Sustain pedal, mod wheel, pitch bend | `controlchange` (CC64), `pitchbend` events; map CC64 to longer release | WEBMIDI.js | F007/F008 sound engine |
| MPE controllers (Roli, Linnstrument, Osmose) | Per-channel pitch bend / pressure / CC74 are ordinary MIDI 1.0 messages; WEBMIDI.js exposes them per channel but has **no MPE zone helper**. JZZ lists MPE support. A small own MPE zone parser is enough for "show and play the notes" | WEBMIDI.js or JZZ | new, optional |
| MIDI 2.0 | **Not in Web MIDI** (browsers deliver MIDI 1.0 byte streams). JZZ can build UMP packets between JZZ nodes only | — | not feasible now |
| BLE-MIDI keyboards | Best path: pair in the OS (macOS Audio MIDI Setup, Android, ChromeOS); the device then appears as a normal Web MIDI port, no extra code. Direct path: Web Bluetooth + BLE-MIDI parser (`web-ble-midi`, MIT, 2 stars, last release 2025-06) — Chromium only, user must click "connect" each session | WEBMIDI.js (OS pairing) | new |
| Audio interfaces | Input: `enumerateDevices()` + `getUserMedia({audio:{deviceId, echoCancellation:false, noiseSuppression:false, autoGainControl:false}})` works everywhere (the original already turns the three filters off, F241). Output: `AudioContext.setSinkId()` Chromium only. Use `latencyHint: "interactive"` | none needed | F241–F245, new output picker |
| Computer keyboard as a piano (QWERTY → notes) | own 30-line hook, or `jzz-input-kbd` (MIT) | own code | fallback on iOS |
| Web Serial / WebUSB devices | Only useful for DIY controllers (Arduino) that are not USB-MIDI class devices; USB-MIDI keyboards already appear in Web MIDI. Chromium only (Serial also in Firefox 151+) | none | low priority |
| Ableton Link | **No browser implementation.** Needs a native helper (the Link SDK in Node, e.g. `@ktamas77/abletonlink` MIT wrapper, or Deep Symmetry Carabiner, GPL-2.0) relaying over WebSocket. The Link SDK itself is **GPLv2+ or a proprietary licence from Ableton** (link-devs@ableton.com). For a client-only web app, use MIDI clock instead | — | not recommended |

### 2.3 Safari and iOS workarounds

There is no native Web MIDI or Web Bluetooth in WebKit, so every iOS browser (all are WebKit) lacks it. Options, best first:
1. **Graceful degradation** (always do this): feature-detect `navigator.requestMIDIAccess`; on iOS show the on-screen keyboard, the QWERTY keyboard and the microphone path, and a short note "Teclados MIDI: usa Chrome ou Edge no computador ou Android".
2. **MIDIWeb Browser** (iOS/iPadOS 17.6+, macOS 14.6+, by 5of12 LLP, v2.1, free with in-app purchases): a WebKit browser that injects Web MIDI, with Bluetooth MIDI setup and SysEx. The client can recommend it to iPad users; the app needs no code change if we only use standard Web MIDI. Test before promising it. The older **Web MIDI Browser** (Takashi Mizuhiki) is free but last updated 2016-03-23: do not rely on it.
3. **macOS Safari**: the third-party "Web MIDI for Safari" extension (per caniuse, Safari 18.4+, CoreMIDI-backed). User-installed; not something we control.
4. **Native wrapper** (largest effort): ship the same Next.js static export inside Capacitor with a CoreMIDI bridge plugin. Existing plugins are small or stale (`@eugabrielsilva/capacitor-midi-device`, a Cordova Web MIDI shim last pushed 2024-05); expect to write a Swift plugin, plus App Store work. Only if iPad + MIDI is a key business need.

Conclusion for the client: MIDI keyboard in/out, clock sync and BLE keyboards are realistic in Chrome, Edge, Firefox and Android at low cost (WEBMIDI.js, ~14 kB). iPad/iPhone users get MIDI only through a third-party browser app or a future native wrapper.

---

## 3. Candidates per category

Columns: licence · latest version (date) and maintenance signal · size · React 19 / Next.js notes · what it replaces or adds · feature ids · risks.

### 3.1 Music theory

| Candidate | Licence | Latest / maintenance | Size | React / Next notes | Replaces / adds | Features | Risks |
|---|---|---|---|---|---|---|---|
| **tonal** — https://github.com/tonaljs/tonal | MIT (OK) | 6.9.0 (2026-11-22); 4.3k stars, pushed 2026-11-23 | 19 kB (all modules); import single `@tonaljs/*` packages to cut it | Pure functions, no DOM: safe in Server and Client Components, and in workers | Note/Interval/Scale/Chord/Key/Mode/Progression/RomanNumeral/ChordType/ScaleType/Chord.detect/PCSet/Voicing/VoiceLeading/Midi | R3, R4, R5, R6, R7, R10, R14; F032–F067, F070–F092, F097–F130, F169–F182, F183–F205; fixes U01, U08, U09, U12, U32, U33, U35 | Its names and ordering differ from the client's tables: keep the app's own PT names and menu order (R3, R4) as data mapped to tonal symbols; keep R10's ordering rule if the client wants identical results. R11/R12/R13 suggestion tables stay app data. |
| **music21j** — https://github.com/cuthbertLab/music21j | BSD-3-Clause (OK) | 0.24.0 (2026-09-29); 183 stars, active | 11 MB unpacked; heavy | Client-only; brings its own rendering (VexFlow) and MIDI | Full musicology toolkit (streams, analysis) | R10, R17 | Far too big for a toy app; API is Python-shaped. Not recommended. |
| **teoria** — https://github.com/saebekassebil/teoria | MIT | 2.5.0 (2017-07-02); unmaintained | small | — | Same area as tonal | — | Dead. Rejected. |

### 3.2 Audio engine, scheduling, synthesis, effects

| Candidate | Licence | Latest / maintenance | Size | React / Next notes | Replaces / adds | Features | Risks |
|---|---|---|---|---|---|---|---|
| **Tone.js** — https://github.com/Tonejs/Tone.js | MIT (OK) | stable `tone` 15.1.22 (2025-04-27); `tone@next` 15.5.73 (2026-11-20) built from `dev` on each green build; 14.9k stars, pushed 2026-11-20 | 83 kB (includes standardized-audio-context) | `"use client"`; dynamic import; `await Tone.start()` in a gesture handler; one shared context | PolySynth(Synth{oscillator: triangle}) with envelopes = R15; Transport + Part/Sequence/Loop with swing = R9 rhythms, Infinito R13; Sampler; effects (reverb, chorus, compressor, limiter); Meter/FFT/Waveform analysers; Offline rendering (export WAV) | F001–F013, F023, F093–F096, F131–F144, F154–F168, F233–F235; fixes U02, U13, U17, U18, U31, U37, U39 | Stable tag is 19 months old while `next` moves; pin 15.1.x and test `next` before moving. Transport is a global singleton: wrap it in one audio service, not per component. |
| **standardized-audio-context** — https://github.com/chrisguttandin/standardized-audio-context | MIT (OK) | 25.3.77 (2024-08-31); repo pushed 2026-09-01 | 27 kB | Comes with Tone.js | Cross-browser Web Audio (Safari quirks) if we skip Tone.js | F001–F004 | Only useful alone if Tone.js is not taken. Package itself not released since 2024. |
| **Elementary Audio** (`@elemaudio/web-renderer`) — https://github.com/elemaudio/elementary | MIT | `latest` 4.0.3 (2024-12-21), `next` 4.0.8 (2025-10-22); pushed 2026-01-19 | WASM, ~1 MB unpacked | Client-only; AudioWorklet | Declarative DSP graph | — | Overkill for chord playback; slower release cadence. Not recommended. |

### 3.3 Realistic instrument sounds

| Candidate | Licence | Latest / maintenance | Size | React / Next notes | Replaces / adds | Features | Risks |
|---|---|---|---|---|---|---|---|
| **smplr** — https://github.com/danigb/smplr | Code MIT (OK). Samples: Splendid Grand Piano = public domain (Akai, 2000); VCSL (Mallet, Versilian) = CC0; Soundfont instruments from midi-js-soundfonts: FluidR3_GM = CC BY 3.0 (attribution), **MusyngKite and FatBoy = CC BY-SA 3.0 (CHECK)**; Mellotron from archive.org (CHECK) | 1.2.0 (2026-11-06); 330 stars, pushed 2026-11-06, author = tonal author | 25 kB code + samples streamed on demand (piano several MB) | Takes our `AudioContext` (pass Tone's raw context); `"use client"`; load after the gesture | SplendidGrandPiano, ElectricPiano, Mallet, Soundfont (GM), DrumMachine, Sampler, Reverb, `CacheStorage` sample cache | F007, F008, F023, F217, F233 (piano mode), R15 (adds instrument choice) | Default samples load from smpldsnds.github.io (GitHub Pages, rate limits): self-host the chosen samples in `public/` or a CDN for production and PWA. Choose only PD/CC0/CC-BY sets; avoid CC BY-SA sets unless the client accepts share-alike on the samples. |
| **spessasynth_lib** — https://github.com/spessasus/spessasynth_lib | Apache-2.0 (OK). Soundfont is separate: e.g. GeneralUser GS 2.0.3 allows commercial use (author notes some sample origins are uncertain: CHECK) | 4.4.10 (2026-11-20); pushed 2026-11-22; small community (56 stars lib / 431 app), one main author | 265 kB + soundfont (SF3 several MB) | AudioWorklet module file must be copied to `public/` and added with `audioWorklet.addModule`; client-only | Full GM/GS/XG SoundFont (SF2/SF3/DLS) synth, MIDI sequencer, MIDI file read/write, Web MIDI output, offline render | F233, F263–F267 preview, new: GM instrument choice, play imported MIDI files | Large; bus factor one. Take it only if the client wants 128 GM instruments; smplr covers piano/EP/mallets. |
| **WebAudioFont** — https://github.com/surikov/webaudiofont | **GPL-3.0-or-later (COPYLEFT)** | 3.0.4 (2022-06-28) | 5.5 MB unpacked | — | GM instruments | — | GPL: rejected. |
| **soundfont-player** | MIT | 0.12.0 (2020-01-27) | — | — | Superseded by smplr (same author) | — | Rejected. |
| **@tonejs/piano** | MIT | 0.2.1 (2020-05-06) | — | Peer deps tone ^14 and webmidi ^2 | Salamander piano | — | Stale, old peers. Rejected. |
| **js-synthesizer** (FluidSynth in WASM) — https://github.com/jet2jet/js-synthesizer | BSD-3-Clause wrapper; **the FluidSynth WASM build it loads is LGPL-2.1 (COPYLEFT, CHECK)** | 1.13.0 (2026-04-20); 79 stars | 8 kB wrapper + multi-MB WASM | AudioWorklet; client-only | SoundFont synth | — | LGPL binary inside a web bundle needs legal review; spessasynth covers the same need under Apache-2.0. Rejected. |

### 3.4 Web MIDI input/output and hardware

| Candidate | Licence | Latest / maintenance | Size | React / Next notes | Replaces / adds | Features | Risks |
|---|---|---|---|---|---|---|---|
| **WEBMIDI.js** (`webmidi`) — https://github.com/djipco/webmidi | Apache-2.0 (OK) | 3.3.1 (2026-09-15); 1.7k stars, pushed 2026-11-16, 7 open issues | 14 kB | `"use client"`; `await WebMidi.enable()` from a button; subscribe in `useEffect` and remove listeners on unmount; keep one singleton | Device lists, hot-plug (`connected`/`disconnected`/`portschanged`), noteon/off, CC, pitch bend, aftertouch, RPN/NRPN, sysex (opt-in), clock/start/stop/continue/songposition, `addForwarder` (thru), scheduled `playNote` | New hardware features (section 2); F011, F012, F056–F067, F169–F182, F226–F264, F093–F096 | No MPE helper. Its Jazz-Plugin path is legacy. Works in Node too (tests). |
| **JZZ** — https://github.com/jazz-soft/JZZ | MIT (OK) | 1.9.6 (2025-09-20); 597 stars, pushed 2026-02-01 | 25 kB | Client-only; module ecosystem (`jzz-midi-smf`, `jzz-input-kbd`, `jzz-gui-*`) | Web MIDI with a fallback layer (Jazz-Plugin / extensions), virtual ports, MIDI 2.0 UMP helpers, MPE listed, SMF read/write/playback | Same as above, plus F263–F267 via `jzz-midi-smf` | Older API style (chained calls); its "works on Safari" relies on user-installed plugin/extension, not on WebKit. Good second choice; its author's **web-midi-test** (MIT, 1.2.9, 2025-04) is the recommended MIDI mock for tests either way. |
| **web-ble-midi** — https://github.com/ryohey/web-ble-midi | MIT | 0.1.0 (2025-06-25); 2 stars | small (135 kB unpacked) | Client-only; Web Bluetooth needs a click each session | BLE-MIDI input without OS pairing | new | Chromium only; very young. Prefer OS pairing (BLE device shows as a Web MIDI port). Optional. |

### 3.5 MIDI file read/write

| Candidate | Licence | Latest / maintenance | Size | React / Next notes | Replaces / adds | Features | Risks |
|---|---|---|---|---|---|---|---|
| **@tonejs/midi** — https://github.com/Tonejs/Midi | MIT (OK) | 2.0.28 (2022-02-04); 1k stars; repo pushed 2023-07 | 9 kB | Pure data; safe anywhere (also in a worker) | Read and write SMF with a JSON model (tracks, notes in seconds and ticks, tempo, time signature, CC, track names) | R21, F263, F265–F267; fixes U19 (correct meta lengths), U32 (real MIDI note numbers); new: import a .mid into the roll and timeline | No release since 2022, but the format is stable; it is also a dependency of basic-pitch. Writes format 1 (multi-track); the client's format-0 spec (R21, F265) is a detail to confirm. |
| **midi-writer-js** — https://github.com/grimmdude/MidiWriterJS | MIT (OK) | 3.2.1 (2026-03-01); 611 stars, pushed 2026-06-16 | 5 kB | Pure data | Write-only, builder API (tracks, note events, tempo, time signature) | R21, F263, F265–F267, U19, U32 | No reader; take it if import is never needed. |
| **midifile-ts** — https://github.com/ryohey/midifile-ts | MIT (OK) | 1.5.2 (2025-05-16) | 4 kB | Pure data | Low-level SMF read/write with types (used by the Signal DAW) | same | Low-level: we would rebuild the note model. Fallback choice. |
| **midi-file** — https://github.com/carter-thaxton/midi-file | MIT | 1.2.4 (2023-03-15) | 3 kB | Pure data | Low-level read/write | same | Untyped, quiet. |

### 3.6 Pitch detection, audio analysis, key detection

| Candidate | Licence | Latest / maintenance | Size | React / Next notes | Replaces / adds | Features | Risks |
|---|---|---|---|---|---|---|---|
| **pitchy** — https://github.com/ianprime0509/pitchy | MIT on npm 4.1.0 (repo now 0BSD) (OK) | 4.1.0 (2024-01-04); repo pushed 2026-11-05 | est. < 5 kB (+ fft.js) | ESM-only; run on `AnalyserNode.getFloatTimeDomainData` frames or inside an AudioWorklet | Monophonic pitch + clarity (McLeod) | R20, F241–F245, F244 palette flash; fixes U20 (proper note on/off from a pitch track) | Monophonic only: a strummed chord gives one pitch. Combine with the chroma path for chords. |
| **@spotify/basic-pitch** — https://github.com/spotify/basic-pitch-ts | Apache-2.0 (OK) | 1.0.1 (2022-08-05); TS repo pushed 2023-05; Python repo active (6.1k stars) | 259 kB + TensorFlow.js 3 + model files | Client-only, lazy-load in a Web Worker; serve `model.json` + weights from `public/`; resamples to 22 050 Hz | Polyphonic audio-to-MIDI with onsets and pitch bends | R19, F238–F240 (file note detection into the roll); also feeds R18 chord candidates | Stale TS package, pins `@tensorflow/tfjs` ^3.2; heavy first load. Worth a spike because the hand-written R19 detector is weak; keep it behind a button. |
| **Meyda** — https://github.com/meyda/meyda | MIT (OK) | 5.6.3 (2024-04-21); v6 beta exists; pushed 2024-07; 71 open issues | 5 kB (npm deps include node-only tools) | Client-only; offline `Meyda.extract()` on Float32Array frames, or real-time analyser | chroma, rms, spectralFlatness, mfcc, loudness | R16 (chroma, RMS gate, flatness confidence), R20 live spectrum | Slowing maintenance. Its chroma is a simple STFT chroma: our R16 harmonic-salience chroma is more specific, so this is a helper, not a drop-in. |
| **pitch-detection** (audiojs) — https://github.com/audiojs/pitch-detection | MIT text plus a line "offered under the Krishnized License" (**CHECK**) | 1.0.0 (2026-04-16), single release | 58 kB unpacked | Pure TS on Float32Array; worker-safe | YIN/McLeod/pYIN/HPS/SWIPE pitch, NNLS chroma, chord templates with Viterbi smoothing, Krumhansl-Schmuckler key | R16, R17, R18, R20 | New and unproven; licence add-on needs a read. Watch list; compare its key results with R17 on test files. |
| **Comlink** — https://github.com/GoogleChromeLabs/comlink | Apache-2.0 (OK) | 4.4.2 (2024-11-07) | est. 1–2 kB | Workers via `new Worker(new URL('./x.worker.ts', import.meta.url))` | Run decoding-side analysis (R16, R17, R19) off the main thread | F211, F213, F238; helps U23 work | Small, stable, quiet. |

Key detection: keep the client's own R16/R17 pipeline as pure TypeScript (it is specified in full and is the client's IP), move it to a worker, and add unit tests with known files. No permissive, mature JS key detector exists; essentia.js (AGPL) is the reference but cannot be shipped.

### 3.7 Visual music UI

| Candidate | Licence | Latest / maintenance | Size | React / Next notes | Replaces / adds | Features | Risks |
|---|---|---|---|---|---|---|---|
| **Own piano keyboard component** (Tailwind + pointer events) | — | — | ~0 | Client component | 12-note palette, octave keyboard, roll key column | F026–F067, F246, F251 | Recommended over the libraries below: the palette has a custom look (note colours R1, glows) that libraries do not match. |
| **wavesurfer.js** + **@wavesurfer/react** — https://github.com/katspaugh/wavesurfer.js | BSD-3-Clause (OK) | 8.1.0 (2026-11-12) and react 1.0.14 (2026-10-30, peer React ^18 \|\| ^19); 10.5k stars | 15 kB | `"use client"`; `useWavesurfer` hook | Waveform of the loaded file, regions (loop a section), timeline, minimap, spectrogram plugin, zoom | F206–F225, F233–F235 (Áudio mode), new: loop a region and analyse only that region | v8 is a new major: check plugin API changes against docs. |
| **VexFlow** — https://github.com/vexflow/vexflow | MIT (OK) | 5.9.0 (2026-11-22); pushed 2026-11-23 | bundlephobia failed; 30 MB unpacked (fonts) — load only on demand | Client-only; renders to SVG/canvas in a ref | Staff notation and guitar tab | new: show the scale/chord/progression on a staff (F032–F055, F131–F144) | Large with fonts; use dynamic import. |
| **abcjs** — https://github.com/paulrosen/abcjs | MIT (OK) | 6.7.3 (2026-11-18); 2.4k stars, 268 open issues | 148 kB | Client-only | ABC text → notation + its own synth + MIDI | same as VexFlow | Simpler API than VexFlow (text in, score out) but larger; its synth uses FluidR3 (CC BY 3.0) soundfonts. Alternative to VexFlow. |
| **OpenSheetMusicDisplay** — https://github.com/opensheetmusicdisplay/opensheetmusicdisplay | BSD-3-Clause (OK) | 3.0.0 (2026-11-21) | 384 kB | Client-only | MusicXML rendering | — | Overkill unless MusicXML import is wanted. |
| **svguitar** — https://github.com/omnibrain/svguitar | MIT (OK) | 2.11.0 (2026-11-14); 826 stars | 68 kB | Client-only, SVG into a ref | Guitar chord diagrams | new: "how to play this chord on guitar" for Progressões (F070–F130; the tabs already use a 🎸 icon) | Needs a voicing source (chord → fret positions): small own table or tonal + a fingering rule. |
| **fretboard.js** (`@moonwave99/fretboard.js`) — https://github.com/moonwave99/fretboard.js | ISC (OK) | 0.2.13 (2022-11-18); pushed 2023-03 | 15 kB | Client-only (d3) | Full fretboard with scale boxes | new: scale on a guitar neck | Stale; a simple own SVG fretboard is a day of work. Optional. |
| **Signal** (ryohey) — https://github.com/ryohey/signal | MIT | app, pushed 2026-11-23; 2.4k stars | — | — | Open-source web piano-roll DAW: reference design for our roll editor (selection, zoom, quantize, MIDI I/O) | F226–F264, U21, U40 | Not a library: read for patterns, do not vendor. |

### 3.8 Project-wide improvements

| Candidate | Licence | Latest / maintenance | Size | React / Next notes | Replaces / adds | Features | Risks |
|---|---|---|---|---|---|---|---|
| **zustand** + `persist` — https://github.com/pmndrs/zustand | MIT (OK) | 5.1.0 (2026-11-06); 59k stars | < 1 kB | Client store; with SSR use `skipHydration` + `rehydrate()` in an effect (or render persisted UI only after hydration) to avoid hydration mismatch; `version` + `migrate` for schema changes; `partialize` to keep only settings, lines and timeline | Global state (tabs, octave, last chord, timeline, Analisar result) with persistence | F016, F018, F019, F021, F022–F025, F214, F275 | Keep audio objects out of the store (only data). |
| **idb-keyval** — https://github.com/jakearchibald/idb-keyval | Apache-2.0 (OK) | 6.3.0 (2026-07-08) | est. < 1 kB | Client-only | IndexedDB storage for large data (decoded file, roll notes) and as a custom `persist` storage | F214, F239, F264 | — |
| **Dexie** — https://github.com/dexie/Dexie.js | Apache-2.0 (OK) | 4.4.7 (2026-10-19) | 31 kB | Client-only | Queryable IndexedDB (a library of saved progressions/projects) | new | Only if the client wants a saved-songs library. |
| **next-intl** — https://github.com/amannn/next-intl | MIT (OK) | 4.16.0 (2026-11-23); 4.4k stars | 13 kB | Peer Next ^16, React ^19; use the "without i18n routing" setup (locale from a cookie/setting); Next 16 renamed middleware to `proxy.ts` | Messages pt-PT / en, ICU plurals, number formats | F274, U26, U27 texts, every UI string | Decide pt-PT vs pt-BR first (U26). |
| **Serwist** (`@serwist/turbopack` + `serwist`) — https://github.com/serwist/serwist | MIT (OK) | 9.5.15 (2026-11-17); 10.0 in preview | build-time + small SW | Use the Turbopack guide (Next 16 builds with Turbopack by default): `withSerwist`, a route handler that serves `sw.js`, `SerwistProvider` | Installable PWA, offline app shell, runtime cache of sample files (smplr / soundfont) | new: offline use; supports F001–F004 on mobile home-screen launch | v10 is coming (Next ≥ 15 only); precache of large samples must be explicit. `next-pwa` and `@ducanh2912/next-pwa` are stale (2022 / 2024). |
| **Vitest 5** + **@vitest/browser** + **Playwright** | MIT / Apache-2.0 (OK) | vitest 5.1.1 (2026-11-18); @playwright/test 1.65.1 (2026-11-13) | dev only | Browser mode runs tests in real Chromium/Firefox/WebKit, so `OfflineAudioContext` renders can be asserted (sample-level checks of synth envelopes R15, rhythm timing R9) | Test runner for theory, MIDI and audio | R9, R10, R15–R21 | Local runs follow the repo CI rules. |
| **standardized-audio-context-mock** — https://github.com/chrisguttandin/standardized-audio-context-mock | MIT (OK) | 10.0.1 (2026-06-20) | dev only | Node unit tests | Mock AudioContext to assert node graphs and scheduled times | F007–F013, R9 | Mocks behaviour, not sound: pair with browser-mode render tests. |
| **web-midi-test** — https://github.com/jazz-soft/web-midi-test | MIT (OK) | 1.2.9 (2025-04-03) | dev only | Pass as `requestMIDIAccessFunction` to WEBMIDI.js | Virtual MIDI inputs/outputs for tests (hot-plug, clock, notes) | section 2 features | — |
| **fake-indexeddb** | Apache-2.0 (OK) | 6.2.8 (2026-11-08) | dev only | Node tests | Test persistence code | F275 | — |
| **@atlaskit/pragmatic-drag-and-drop** — https://github.com/atlassian/pragmatic-drag-and-drop | Apache-2.0 (OK) | 4.0.0 (2026-09-24); 12.8k stars | small core | Framework-agnostic, works with React 19 | List reordering (timeline, builder line) | F131–F144, F097–F130; fixes U29 only with its touch-capable setup | Native HTML5 DnD underneath: check touch behaviour on iOS before choosing. |
| **@dnd-kit/react** — https://github.com/clauderic/dnd-kit | MIT (OK) | 0.5.3 (2026-10-31, pre-1.0); `@dnd-kit/core` 6.3.1 (2024-12) | 33 kB | Peer React ^18 \|\| ^19 | Pointer/touch-sensor sortable lists | same; fixes U29 (touch reordering) | New API still pre-1.0. Pick one of the two DnD libraries. |

---

## 4. Rejected candidates

| Candidate | Reason |
|---|---|
| **essentia.js** (MTG) | **AGPL-3.0 (COPYLEFT)**: a web app that ships it must offer its whole source under AGPL. Also npm 0.1.3 is from 2021-06. Best key/chord analysis in JS, but not shippable here. |
| **pitchfinder** | **GPL-3.0 ("GNU v3" in package.json) (COPYLEFT)**. Use pitchy (MIT) instead. |
| **WebAudioFont** | **GPL-3.0-or-later (COPYLEFT)**; last release 2022. Use smplr or spessasynth_lib. |
| **aubiojs** | No licence field on npm; aubio itself is GPL (COPYLEFT); last release 2022. |
| **Verovio** | **LGPL-3.0 (COPYLEFT, weak)**; 28 MB WASM. VexFlow/abcjs cover notation under MIT. |
| **js-synthesizer / FluidSynth WASM** | LGPL FluidSynth binary inside the bundle (legal review needed); spessasynth_lib is Apache-2.0. |
| **Strudel** (`@strudel/*`) | **AGPL-3.0-or-later (COPYLEFT)**. |
| **Ableton Link** (SDK and Node wrappers, Carabiner) | No browser support; needs a native helper. SDK is **GPLv2+** or a proprietary Ableton licence; Carabiner is **GPL-2.0**. Use MIDI clock. |
| **@magenta/music** / **html-midi-player** | Magenta 1.23.1 is from 2021 (12 MB unpacked, TF.js); html-midi-player (BSD-2) depends on it. Too heavy for a MIDI preview; Tone.js + smplr do it. |
| **react-piano** | MIT but last release 2019, repo quiet since 2023, peer `react: *` untested on React 19, no audio. Own Tailwind component fits the design better. |
| **klavier** | Peer deps React ^18.2 only (React 19 peer conflict), 7 stars, last release 2024-05. |
| **webaudio-pianoroll** | Apache-2.0 but last release 2019-01; web component that does not fit the canvas roll spec (F246–F264). |
| **@tonejs/piano** | Last release 2020; peers Tone 14 and webmidi 2. |
| **soundfont-player** | Last release 2020; superseded by smplr (same author). |
| **teoria** | Last release 2017. tonal replaces it. |
| **music21j** | BSD but 11 MB and Python-shaped; tonal is enough. |
| **Elementary Audio** | Declarative DSP engine with WASM; more than the app needs; slower releases. |
| **web-audio-test-api** | Last release 2017. Use standardized-audio-context-mock and Vitest browser mode. |
| **next-pwa**, **@ducanh2912/next-pwa** | Last releases 2022-08 and 2024-09; webpack-based while Next 16 builds with Turbopack. Use Serwist. |
| **chord-recognition** (npm) | No licence field; last release 2023. |
| **Web MIDI Browser** (iOS app, 2016) | Unmaintained since 2016-03; recommend MIDIWeb Browser instead, after a test. |

---

## 5. Licence warnings (summary)

- **Do not ship**: essentia.js (AGPL-3.0), Strudel (AGPL-3.0), pitchfinder (GPL-3.0), WebAudioFont (GPL-3.0), aubio/aubiojs (GPL), Ableton Link SDK (GPLv2+ unless a proprietary licence is bought), Carabiner (GPL-2.0). LGPL items (Verovio, FluidSynth WASM) only after legal review.
- **Sample and soundfont licences are separate from code licences.** Safe: Splendid Grand Piano (public domain), VCSL (CC0), FluidR3_GM (CC BY 3.0: credit needed on an "about" page). Avoid or get client sign-off: MusyngKite and FatBoy (CC BY-SA 3.0), Mellotron archive samples (unclear). GeneralUser GS allows commercial use, with the author's own caveat on sample origins.
- **pitch-detection** (audiojs) has MIT text plus a "Krishnized License" line: read it before use.
- Self-host every sample set we use (licence notice kept next to the files) instead of loading from third-party GitHub Pages hosts.

## 6. Sources

- npm registry metadata for every package named above (https://registry.npmjs.org/<name>), read 2026-11-23.
- GitHub repository API for stars, last push and licence (https://api.github.com/repos/<owner>/<repo>), read 2026-11-23.
- Bundle sizes: https://bundlephobia.com/api/size?package=<name>.
- Browser support: https://caniuse.com/midi, https://caniuse.com/web-bluetooth, https://caniuse.com/web-serial, https://caniuse.com/webusb, https://caniuse.com/mdn-api_audiocontext_setsinkid; WebKit bug https://bugs.webkit.org/show_bug.cgi?id=107250; Mozilla intent to ship add-on-gated Web MIDI (https://groups.google.com/a/mozilla.org/g/dev-platform/c/15O04X2jE28); MDN https://developer.mozilla.org/en-US/docs/Web/API/Web_MIDI_API.
- WEBMIDI.js API: https://webmidijs.org/api/classes/WebMidi, https://webmidijs.org/api/classes/Input.
- JZZ: https://github.com/jazz-soft/JZZ and discussion https://github.com/jazz-soft/JZZ/discussions/54.
- iOS apps: https://apps.apple.com/us/app/id6757226617 (MIDIWeb Browser), https://apps.apple.com/us/app/id953846217 (Web MIDI Browser).
- Ableton Link licence: https://github.com/Ableton/link.
- Sample licences: https://github.com/gleitz/midi-js-soundfonts, https://github.com/sfzinstruments/SplendidGrandPiano, https://github.com/sgossner/VCSL, GeneralUser GS licence (https://github.com/mrbumpy409/GeneralUser-GS).
- Serwist Turbopack guide: https://serwist.pages.dev/docs/next/turbo. next-intl without routing: https://next-intl.dev/docs/getting-started/app-router/without-i18n-routing.
