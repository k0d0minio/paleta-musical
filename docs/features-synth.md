# Sintetizador (synth) — clean-room feature list

Source: the client's `Sintetizador.html` (237 lines), read in full on 2026-11-24. Function only: no layout, colours, fonts or widget looks (J, 2026-11-23: the new design comes from the app's design system). Ids S001–S034, reference data SR1–SR5, open questions SU1–SU6.

## 1. Summary

A small playable subtractive synthesiser: two oscillators mixed together, a low-pass filter, an ADSR amplitude envelope, an echo (delay) effect and an output volume. It has four starting sounds (presets), a live waveform display (oscilloscope) and a 25-key on-screen keyboard that can also be played from the computer keyboard. It is polyphonic. Nothing is saved between visits.

## 2. Features

- S001 [audio] Two oscillators sound for each note, at the same pitch. Each oscillator has its own waveform: sine, square, sawtooth or triangle (Seno, Quadrada, Serra, Triângulo). Default: oscillator 1 sawtooth, oscillator 2 square.
- S002 [audio] Changing a waveform changes it at once, also for the notes that sound now.
- S003 [audio] "Mistura" (mix) of the oscillators: 0 = only oscillator 1, 1 = only oscillator 2; oscillator 1 gain = 1 − mix, oscillator 2 gain = mix.
- S004 [audio] "Afinação" (detune) of oscillator 2 against oscillator 1, in cents, −50 to +50. It applies also to the notes that sound now.
- S005 [audio] Low-pass filter on the sum of all voices: "Corte" (cutoff frequency) and "Ressonância" (resonance, Q).
- S006 [audio] Amplitude envelope per note: "Ataque" (attack), "Decaimento" (decay), "Sustentação" (sustain level), "Libertação" (release). Timing in SR3.
- S007 [audio] Echo after the filter: "Tempo" (delay time), "Repetição" (feedback, the level of each repeat), "Mistura" (wet level of the echo). The dry signal always passes at full level.
- S008 [audio] "Volume" (output level). The gain is volume² (a perceptual curve).
- S009 [audio] A compressor (limiter) on the final mix prevents clipping when many notes sound.
- S010 [audio] Polyphony: each key is one voice; any number of keys can sound together. Pressing a key that sounds already does nothing.
- S011 [audio] Parameter changes are smoothed (no clicks): about 20 ms for the filter, feedback, wet and volume; about 50 ms for the delay time.
- S012 [audio] The audio starts at the first played note (browser gesture rule). Before it, the parameters can be changed and are applied when the audio starts.
- S013 [control] Each continuous parameter (SR1) is a rotary control with a value from 0 to 100 % of its range. Linear or exponential mapping per parameter (SR1): exponential = min × (max/min)^n.
- S014 [control] The value of each control shows in its unit: %, cents (with a + sign when positive), Hz / kHz (one decimal above 1000 Hz), ms below 1 s and seconds with 2 decimals above, resonance with one decimal.
- S015 [input] Drag up to raise and down to lower a control: 0.6 % of the range per pixel; with Shift, 0.15 % per pixel (fine).
- S016 [input] Mouse wheel on a control: 2.5 % per step; with Shift, 0.5 %.
- S017 [input] Keyboard on a focused control: arrow up/right +2 %, arrow down/left −2 %, Page Up +10 %, Page Down −10 %, Home = minimum, End = maximum.
- S018 [input] Double-click on a control resets it to its default (SR1).
- S019 [a11y] Each control is focusable and is a slider for assistive technology, with its name, its position (0–100) and its value text in its unit.
- S020 [preset] Four starting sounds: "Líder" (lead), "Baixo" (bass), "Pad", "Pizzicato" (SR2). Choosing one sets both waveforms and every parameter it names. It does not change the volume.
- S021 [keyboard] An on-screen keyboard of 25 keys (two octaves and one note), from a C. Default first note: C3 (MIDI 48).
- S022 [keyboard] Octave down / octave up, one octave per step. The first note stays between C1 (MIDI 24) and C5 (MIDI 72). The current octave shows as "Oitava N" (N = MIDI of the first note / 12 − 1).
- S023 [keyboard] An octave change first releases every note held with the pointer.
- S024 [keyboard] Pressing a key with the pointer (mouse or touch) plays its note and marks it as held. Releasing the pointer anywhere releases every note held with the pointer.
- S025 [keyboard] Multi-touch: more than one key can be pressed at the same time on a touch screen.
- S026 [keyboard] Computer keyboard as a piano: the keys A W S E D F T G Y H U J K O L P play 16 semitones from the first note of the keyboard (A = first note, W = +1, S = +2, …, P = +15). Key down plays, key up releases. Auto-repeat is ignored; keys with Ctrl, Cmd or Alt are ignored.
- S027 [keyboard] Z = octave down, X = octave up.
- S028 [keyboard] A key that sounds is marked as sounding on the on-screen keyboard, also when it is played from the computer keyboard.
- S029 [scope] A live oscilloscope shows the waveform of the output. It is triggered on a rising zero crossing (searched in the first 1024 samples), so that the wave stands still. It shows 900 samples of a 2048-sample analyser frame.
- S030 [scope] Before the audio starts, the oscilloscope shows the text "Toca numa tecla para ligar o som" (Play a key to turn the sound on).
- S031 [scope] The oscilloscope is sharp on high-density screens and follows its size when the window is resized.
- S032 [text] An instruction text: "Arrasta um botão para cima ou para baixo. Toca nas teclas ou usa o teclado do computador." (Drag a knob up or down. Play the keys or use the computer keyboard.)
- S033 [text] A help text names the gestures of the controls (wheel or arrows adjust, Shift gives precision, double-click resets) and the computer keys.
- S034 [mobile] Touch: dragging a control or playing the keyboard does not scroll or zoom the page, and does not select text.

## 3. Reference data

### SR1 Parameters
| Id | Name (PT) | Group | Min | Max | Default | Curve | Unit |
|---|---|---|---|---|---|---|---|
| mix | Mistura | Oscilador | 0 | 1 | 0.5 | lin | % |
| det | Afinação | Oscilador | −50 | 50 | 8 | lin | cents |
| cut | Corte | Filtro | 80 | 12000 | 2200 | exp | Hz |
| res | Ressonância | Filtro | 0.5 | 18 | 3 | lin | Q |
| a | Ataque | Envolvente | 0.005 | 2 | 0.02 | exp | s |
| d | Decaimento | Envolvente | 0.03 | 2 | 0.3 | exp | s |
| s | Sustentação | Envolvente | 0 | 1 | 0.6 | lin | % |
| r | Libertação | Envolvente | 0.03 | 3 | 0.4 | exp | s |
| dt | Tempo | Eco | 0.05 | 0.8 | 0.3 | lin | s |
| fb | Repetição | Eco | 0 | 0.85 | 0.35 | lin | % |
| dm | Mistura | Eco | 0 | 1 | 0.25 | lin | % |
| vol | Volume | Saída | 0 | 1 | 0.6 | lin | % (gain = v²) |

Groups: Oscilador (oscillator: the two waveforms, mix, detune), Filtro (filter), Envolvente (envelope), Eco (echo), Saída (output).

### SR2 Presets
| Preset | Wave 1 | Wave 2 | mix | det | cut | res | a | d | s | r | dt | fb | dm |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Líder | square | sawtooth | 0.5 | 10 | 5000 | 8 | 0.01 | 0.2 | 0.8 | 0.25 | 0.3 | 0.3 | 0.2 |
| Baixo | sawtooth | square | 0.3 | 5 | 500 | 6 | 0.005 | 0.25 | 0.3 | 0.15 | 0.25 | 0.2 | 0.1 |
| Pad | sawtooth | sawtooth | 0.5 | 14 | 1800 | 1.5 | 0.9 | 0.8 | 0.7 | 1.6 | 0.45 | 0.5 | 0.4 |
| Pizzicato | triangle | square | 0.25 | 3 | 3500 | 4 | 0.005 | 0.35 | 0 | 0.3 | 0.22 | 0.4 | 0.3 |

### SR3 Envelope timing (per note)
- Start at 0, linear ramp to the peak 0.3 in the attack time.
- Then an exponential approach to 0.3 × sustain, time constant = decay / 3.
- Release: from the current level, exponential approach to 0, time constant = release / 4. The voice stops at release × 1.6 + 0.05 s.
- Pitch: f = 440 × 2^((midi − 69) / 12).

### SR4 Signal path
Voices (osc 1 × (1 − mix) + osc 2 × mix, × envelope) → sum → low-pass filter (cutoff, Q) → volume → dry to the mix; and volume → delay (time) → feedback loop (gain fb) → wet gain (dm) → mix. Mix → compressor → analyser (oscilloscope) → output. Maximum delay time: 1 s.

### SR5 Computer-keyboard map
A W S E D F T G Y H U J K O L P = semitones 0 to 15 from the first note of the on-screen keyboard. Z = octave down, X = octave up.

## 4. External dependencies

Web Audio (oscillators, biquad filter, delay, compressor, analyser), Canvas 2D (oscilloscope), Pointer Events.

## 5. Open questions (for the client)

- SU1 The help text lists 13 keys (A to K), but the code also maps O, L and P (16 keys, to +15 semitones). Which is intended?
- SU2 The computer keyboard listens on the whole page. In the app, it must not play notes while the user types in a text field (search, command palette).
- SU3 Dragging the pointer from one key to the next does not play the next key (no glissando). Keep it, or allow a slide?
- SU4 Mix and detune changes jump on the held notes (no smoothing): small clicks are possible.
- SU5 There is no velocity: every note has the same level.
- SU6 Nothing is saved: the sound settings reset on reload. In the app, should the user's own sound be saved, and can it be named?
