# Paleta Musical — clean-room feature list

Source: `paleta-musical-v12.html` (4743 lines, read in full, lines 1–4743).

## 1. Summary

Paleta Musical is a single-page music-theory web app in Portuguese, for beat makers and hobby musicians who want to hear and explore notes, scales, chords and chord progressions without reading notation. It synthesises all sound in the browser (triangle-wave synth), with no samples.
It has six modules: **Paleta** (the 12 notes, with scale / chord / free / detect modes), **Progressões** (genre progression library + chord builder + a shared timeline with rhythm playback and MIDI export), **Infinito** (endless random chord generator), **Acordes** (chord detector from selected notes), **Harmonia** (circle of fifths) and **Analisar** (audio-file key/scale/chord analysis plus a piano-roll note editor with microphone capture and MIDI export).
A global octave setting and a persistent "last chord" are available in every module. Nothing is persisted between sessions.

This list describes function only: what the app does, not how it looks or where things are. It has no design or layout information. Module, mode, scale, chord-type, style and rhythm names (Paleta, Escala, Maior, Trap, Simples…) are the current Portuguese names; here they are identifiers, not label text. A quoted Portuguese string is content that the user must get (an instruction, a status or an error message), with its English gloss.

Terms used below:
- **Note palette**: the set of the 12 notes (C to B) that the user can play and select.
- **Chord-notes display**: a list of the notes of a chord, in which sounding notes can be marked.
- **Marked as sounding**: the app indicates which notes sound now, for the given time (F011).
- **Tension**: a note outside the scale, or a chromatic/borrowed chord; the app keeps tension items distinct from the others.

Counts: 254 features (F001–F276, 22 ids deleted), 20 reference tables (R1–R21, R8 deleted), 36 open questions (U01–U40, 4 ids deleted). Ids are stable; a gap in the numbering is a deleted entry.

## 2. Features

- F001 [audio] Start-up: On load, the app first asks the user to enable audio, with the instruction "O iOS exige um toque para ativar o áudio. Toca no botão para começar." (iOS needs a tap to enable audio. Tap the button to start.). The rest of the app cannot be used until this step is done.
- F002 [audio] Start-up: A click or touch-end anywhere on the start-up step creates/resumes the audio context, plays a 1-sample silent buffer to unlock audio, and ends the start-up step for the session.
- F003 [audio] Start-up: Until audio is unlocked, the first touchstart or mousedown anywhere in the app also unlocks audio (the start-up step stays until it is itself tapped).
- F004 [audio] Start-up: Every sound request resumes a suspended audio context before scheduling sound; if resume fails, the sound is still attempted (errors are silent).
- F006 [state] Start-up: After the start-up step, the app opens the Paleta module, in Escala mode, tonic C, scale "Maior", tension value 30 %, octave 4.
- F007 [audio] Sound engine: A single note is a triangle oscillator at f = 440 × 2^((pitchClass − 9 + (octave − 4) × 12) / 12) Hz, with gain rising linearly from 0 to the volume in 10 ms, then decaying exponentially to 0.001 at the end of its duration (default duration 1.4 s, volume 0.32).
- F008 [audio] Sound engine: A chord plays all its intervals simultaneously from the root in the current octave (intervals above 12 sound above the octave), each voice a triangle oscillator with a 15 ms linear attack then exponential decay (default duration 1.8 s, volume 0.18 per voice).
- F009 [audio] Sound engine: Single-note playback always uses the pitch class in the chosen octave (C-based octave), so a scale that does not start on C wraps down after B instead of ascending (see U33).
- F010 [audio] Sound engine: Chord voicing: a chord is played as its stored interval list ascending from its stored root/bass note; inversions are stored as re-normalised interval lists starting from the bass note.
- F011 [ui] Sound engine: Sounding-note mark: when a note sounds, the app marks that note as sounding in the note palette of the Paleta module (when it is shown) for the given duration, then removes the mark.
- F012 [ui] Sound engine: The sounding-note mark also applies to the matching note in a shown chord-notes display, for the same duration.
- F013 [ui] Sound engine: The sounding-note mark has no effect in a module that shows neither the Paleta note palette nor a chord-notes display.
- F014 [nav] Global: The app has six modules: Paleta, Progressões, Infinito, Acordes, Harmonia, Analisar. The user can switch to any module at any time; the current module is indicated.
- F016 [nav] Global: Switching module stops any progression playback (Estilos/timeline) and shows the new module from state; module state (selections, lines, timeline) is kept in memory across module switches.
- F017 [nav] Global: Switching module does NOT stop the Infinito generator; it keeps playing in the background (see U13).
- F018 [state] Global: Root sync: entering Harmonia from Paleta sets the Harmonia tonic to the Paleta tonic; from Progressões to the Progressões key; from Infinito to the Infinito key; from Acordes or Analisar no sync.
- F019 [state] Global: Root sync: leaving Harmonia (by a module switch) sets both the Progressões key and the Infinito key to the Harmonia tonic.
- F020 [input] Global: The user can step a global octave down or up by one at any time (default 4).
- F021 [input] Global: The octave is clamped to 2–6; it applies to all subsequent sound and to progression MIDI export; changing it changes nothing else in the current module.
- F022 [ui] Global: Last chord: once a "last chord" exists, it is available in every module: the app gives its notes (sharp names), and the user can replay it or add it to the shared timeline. Before a last chord exists, none of this is offered.
- F023 [audio] Global: Replaying the last chord: the first note is the root, the others are placed within the octave above it (0–11 semitones), played in the current octave and marked as sounding for 1.5 s.
- F024 [state] Global: Adding the last chord to the timeline appends it as a chord named "<first note>?" with type "?" and its pitch-class intervals sorted ascending (see U09).
- F025 [state] Global: The "last chord" is set by every action that updates a chord-notes display (listed per module below); it persists across module switches.
- F027 [ui] Paleta: The Paleta module has four modes: Escala (scale), Acorde (chord), Livre (free) and Detetar (detect). The user chooses one.
- F028 [ui] Paleta: In every mode except Detetar, the user chooses a tonic among the 12 notes.
- F029 [ui] Paleta: The note palette has the 12 notes, C to B; each note gives its sharp name and its Portuguese name (e.g. C# / Dó#).
- F031 [audio] Paleta: Choosing any palette note plays it in the current octave and marks it as sounding for 0.7 s, in every mode.
- F032 [ui] Paleta/Escala: In Escala mode, the user chooses a tonic and one of the 19 scales (reference table R3).
- F033 [ui] Paleta/Escala: The palette marks the notes of the selected scale on the selected tonic.
- F034 [ui] Paleta/Escala: Tension value (Escala and Acorde modes): the user sets a value between 0 (inside the scale) and 1 (chromatic); a status text gives the tension level (F037).
- F035 [input] Paleta/Escala: The user sets the tension value continuously (press and drag, with mouse or touch); the dependent content updates live while the value changes.
- F037 [ui] Paleta/Escala: Tension status text: below 20 % "Consonante" (consonant); below 45 % "Colorido" (colourful); below 70 % "Tensão moderada" (moderate tension); otherwise "Alta tensão" (high tension).
- F038 [ui] Paleta/Escala: In Escala mode, when the tension value is above 45 %, the palette marks the notes outside the scale as tension notes, distinct from the scale notes; this marking is applied 80 ms after the last change of the value.
- F039 [ui] Paleta/Escala: The scale panel gives the tonic, the scale and its number of notes. The user can play the scale or open it in the Harmonia module.
- F040 [audio] Paleta/Escala: Playing the scale plays the scale notes one by one, 280 ms apart, each marked as sounding for 0.6 s.
- F041 [nav] Paleta/Escala: Opening the scale in Harmonia opens the Harmonia module with its tonic set to the Paleta tonic (see U07).
- F042 [ui] Paleta/Escala: The scale panel lists the scale notes in order, numbered by degree: "1. Dó", "2. Ré", ….
- F043 [ui] Paleta/Escala: When the tension value is above 45 %, the scale panel also lists every note outside the scale as a tension note (Portuguese names); the list appears and disappears live while the value changes.
- F044 [ui] Paleta/Escala: For the 8 modal scales that have chord qualities (R5) and exactly 7 notes, the scale panel lists the 7 diatonic chords, named note + suffix ("" major, "m" minor, "°" dim, "+" aug).
- F045 [audio] Paleta/Escala: Choosing a diatonic chord plays that triad, marks its notes as sounding for 1.8 s and sets it as the last chord.
- F046 [ui] Paleta/Acorde: In Acorde mode, the user chooses a tonic and one of the 24 chord types (R4); each type is named "<tonic><type>", e.g. "CMaj7".
- F047 [ui] Paleta/Acorde: The palette marks the notes of the selected chord; in this mode, out-of-chord notes are never marked as tension notes.
- F048 [ui] Paleta/Acorde: The chord panel gives the chord name and its number of notes. The user can play the chord or open it in the Acordes module.
- F049 [audio] Paleta/Acorde: Playing the chord plays it and marks its notes as sounding for 1.8 s (it does not update the last chord).
- F050 [nav] Paleta/Acorde: Opening the chord in Acordes opens the Acordes module with the chord's notes preselected (see U07).
- F051 [ui] Paleta/Acorde: The chord panel has a chord-notes display: each chord note with its sharp name and Portuguese name.
- F052 [ui] Paleta/Acorde: The chord panel offers one inversion per chord note: root position, 1st inversion, 2nd inversion, ….
- F053 [audio] Paleta/Acorde: Choosing an inversion rotates the interval list (moved notes +12), plays it from the new bass note and marks the notes as sounding for 1.8 s.
- F054 [ui] Paleta/Acorde: When the tension value is above 45 % (updated live while the value changes), the chord panel offers four altered versions, named "<tonic><type>(b9)", "(#11)", "(b13)", "(alt)", marked as tension.
- F055 [audio] Paleta/Acorde: Each altered version plays a fixed interval set from the tonic: b9 = 0,4,7,10,13; #11 = 0,4,7,10,18; b13 = 0,4,7,10,20; alt = 0,4,6,10,13, marked as sounding for 1.8 s (see U10).
- F056 [input] Paleta/Livre: In Livre (free) mode, choosing a palette note toggles it in/out of a selection (order of selection kept); the palette marks the selected notes.
- F057 [ui] Paleta/Livre: When at least one note is selected, the app lists the selected notes (Portuguese names, in selection order). The user can play them or clear the selection.
- F058 [audio] Paleta/Livre: Playing the selection plays the selected notes in selection order, 300 ms apart, each marked as sounding for 0.6 s.
- F059 [input] Paleta/Livre: Clearing empties the selection.
- F060 [ui] Paleta/Livre: The app lists the first 3 scales that contain all selected notes (fewest notes first), as "<root> <scale>", or says "Nenhuma escala comum" (no common scale).
- F061 [input] Paleta/Detetar: In Detetar (detect) mode, choosing a palette note toggles it in/out of the detection set; the palette marks the notes of the set.
- F062 [ui] Paleta/Detetar: When the set is empty, the app gives the instruction "Clica nas notas para detetar a escala" (click the notes to detect the scale); otherwise it lists the notes of the set, and the user can clear the set.
- F063 [ui] Paleta/Detetar: With no notes, the app also gives the hint "Seleciona 2 ou mais notas na paleta" (select 2 or more notes on the palette).
- F064 [ui] Paleta/Detetar: With ≥ 1 note, the app lists the compatible scales, with their count: up to 8 scales (all 19 × 12 roots) that contain every selected note, sorted by fewest scale notes. Each gives "<root> <scale>" and its notes ("C · D · E …"), and the user can play it.
- F065 [audio] Paleta/Detetar: Playing a compatible scale plays its notes 260 ms apart, each marked as sounding for 0.6 s.
- F066 [ui] Paleta/Detetar: With ≥ 3 notes, the app also lists up to 6 partial scales, "<root> <scale> (<matched>/<total>)", that contain at least 70 % (rounded up) but not all of the selected notes.
- F067 [error] Paleta/Detetar: If no scale matches at all, the app shows "Nenhuma escala encontrada" (no scale found).
- F069 [ui] Progressões: The Progressões module has two sub-modules: Estilos (styles; default) and Construtor (builder). The user chooses one.
- F070 [ui] Progressões/Estilos: Estilos tells the user that choosing a chord plays it, that a chord can be edited, and that a right-click on the line removes a chord (see U04: that removal does not exist).
- F071 [ui] Progressões/Estilos: The user chooses a key (12 notes) and a scale (19 scales); defaults C and "Maior".
- F072 [ui] Progressões/Estilos: The user chooses one of the 12 styles of R6 (default "Pop").
- F073 [state] Progressões/Estilos: Changing key, scale or style resets all per-chord inversion choices of the listed progressions.
- F074 [ui] Progressões/Estilos: Estilos has a chord-notes display of the selected chord; before a chord is played it says "— toca um acorde para ver as notas —" (play a chord to see the notes).
- F075 [ui] Progressões/Estilos: The user chooses one of the 12 rhythms (R9; each has a name and a description); default "Simples".
- F076 [input] Progressões/Estilos: The user sets the Estilos BPM between 40 and 220 (default 90); the current value is shown, and changing it changes nothing else.
- F077 [input] Progressões/Estilos: When rhythm "Swing" is chosen, the user can set the swing feel between 50 % and 75 % (step 1, default 67 %): the long-beat share of the swing pair.
- F078 [input] Progressões/Estilos: When rhythm "Rasguejo" is chosen, the user can set the strum speed between 10 and 120 ms (step 5, default 40 ms): the delay between strummed strings.
- F079 [input] Progressões/Estilos: When rhythm "Loop" is chosen, the user can set the number of repetitions between 1 and 8 (default 1).
- F080 [ui] Progressões/Estilos: When an arpeggio rhythm is chosen, the user can set a note speed between 30 and 200 ms (initial = 60000/BPM/2), with the hint "Dica: ajusta o BPM para controlar a velocidade do arpejo" (tip: adjust the BPM to control the arpeggio speed). The setting has no effect (see U05).
- F081 [ui] Progressões/Estilos: Estilos offers a bulk inversion (root position, 1st, 2nd, 3rd inversion), meant to apply to all chords of the line (see U06 for its actual effect on the timeline and builder line).
- F082 [ui] Progressões/Estilos: Estilos lists every progression of the selected style: name (e.g. "I–V–vi–IV"), description and its chords. The user can play the progression or add it to the shared timeline.
- F083 [state] Progressões/Estilos: Each Roman numeral is resolved against the selected key and scale (rules in R7); each chord is named "<note><q>", where q is "7" for 4-note chords, "m" for minor, "" otherwise, together with its Roman numeral.
- F084 [ui] Progressões/Estilos: Chromatic/borrowed chords (special numerals in R7) are marked as tension chords.
- F085 [audio] Progressões/Estilos: Choosing a chord of a progression plays it (with its chosen inversion), marks it as sounding for 1.8 s and sets it as the last chord.
- F086 [ui] Progressões/Estilos: For each chord of a progression, the user can choose an inversion: root position, 1st, 2nd, 3rd (one per distinct pitch class, max 4). Each option gives its notes; the current inversion is indicated.
- F087 [audio] Progressões/Estilos: Choosing an inversion plays it, marks it as sounding for 1.6 s, updates the last chord and stores the inversion for that chord; root position resets it. The chord shows which inversion is chosen.
- F088 [audio] Progressões/Estilos: Playing a progression plays all its chords (with the chosen inversions) with the Estilos rhythm, BPM and octave. While it plays, the user can stop it.
- F089 [audio] Progressões/Estilos: Stopping ends the playback; playback also ends by itself after the last step, and the progression returns to its idle state.
- F090 [ui] Progressões/Estilos: During playback, the chord that sounds is indicated in its progression, and its notes are marked as sounding on chord-notes displays.
- F091 [state] Progressões/Estilos: Adding a progression to the timeline appends all its chords (root position, ignoring the chosen inversions) to the shared timeline (see U08).
- F092 [ui] Progressões/Estilos: Estilos also gives access to the shared timeline (see "Timeline").
- F093 [audio] Rhythm engine: Starting a playback first stops any current progression playback (see U39); an empty chord list does nothing.
- F094 [audio] Rhythm engine: Each rhythm schedules its steps with timers and checks before each step whether playback is still on; stopping silences further steps (notes already started ring out).
- F095 [audio] Rhythm engine: The exact per-rhythm timing, voicing and volumes are given in R9; every chord step marks its notes as sounding and indicates the chord that sounds.
- F096 [audio] Rhythm engine: When playback ends naturally, the module returns to its idle (not playing) state.
- F097 [ui] Progressões/Construtor: The builder has two input modes: Lista (list; default) and Detetar (detect); switching mode clears the builder's detection notes.
- F098 [ui] Progressões/Construtor: Lista mode: the user chooses a tonic (12 notes) and a chord type (24 types, named "<tonic><type>"); defaults C, "Maior".
- F099 [state] Progressões/Construtor: In Lista mode, the user can add the chosen chord (root position) to the builder line; the suggestions are then refreshed.
- F100 [audio] Progressões/Construtor: In Lista mode, the user can preview the chosen chord (marked as sounding for 1.6 s) without adding it.
- F101 [ui] Progressões/Construtor: Detetar mode: the user selects notes among the 12 notes (sharp names), with the instruction "Clica nas notas para detetar o acorde" (click the notes to detect the chord); selected notes are indicated.
- F102 [input] Progressões/Construtor: Choosing a note toggles it; adding a note also plays it (removing is silent).
- F103 [ui] Progressões/Construtor: When notes are selected, the app lists them; the user can remove one note from that list, or clear all.
- F104 [ui] Progressões/Construtor: With fewer than 2 notes, the app says "Seleciona pelo menos 2 notas" (select at least 2 notes).
- F105 [ui] Progressões/Construtor: With ≥ 2 notes, the detected chords are listed (chord detection rules in R10): up to 6 exact matches; if fewer than 3 are exact, partial matches fill up to 3 results in total. The app states whether the list has exact matches or only possible (partial) matches.
- F106 [error] Progressões/Construtor: If no chord matches, the app says "Nenhum acorde reconhecido" (no chord recognised).
- F107 [ui] Progressões/Construtor: Each result gives the root and type and the chord's notes (the selected notes distinguished). The user can preview it without adding it, or stage it for adding.
- F108 [audio] Progressões/Construtor: Previewing a result plays the chord, marks it as sounding for 1.6 s and sets it as the last chord, without adding it.
- F109 [state] Progressões/Construtor: Staging a chord plays it and sets it as the last chord; the app then shows "A preparar: <root><type>" (preparing: <root><type>), and the user can confirm (from the result or from the staging notice) or cancel.
- F110 [state] Progressões/Construtor: Confirming appends the staged chord to the line, clears the detection notes and the staging, and plays the chord.
- F111 [state] Progressões/Construtor: Cancelling clears the staging only.
- F112 [ui] Progressões/Construtor: The builder line holds the user's own progression; when it is empty the app says "Clica num acorde para começar" (click a chord to start).
- F113 [ui] Progressões/Construtor: When the line is not empty, the user can play it, send it to the shared timeline, download it as MIDI, or clear it.
- F114 [audio] Progressões/Construtor: Playing the builder line plays each chord in order, 1.7 s apart, marking it as sounding for 1.6 s and updating the last chord (no rhythm, no stop; see U37, U39).
- F115 [state] Progressões/Construtor: Sending the builder line appends the whole line to the shared timeline.
- F116 [midi] Progressões/Construtor: Downloading the builder line as MIDI uses the Estilos rhythm and BPM (see "Progression MIDI" and U38).
- F117 [state] Progressões/Construtor: Clearing empties the line.
- F118 [ui] Progressões/Construtor: Each line chord gives its name, its position and its inversion. The user can edit it (chord editor, F145), choose an inversion (root position, 1st, 2nd, 3rd; for chords with ≥ 2 distinct pitch classes), move it one place earlier or later, or remove it.
- F119 [audio] Progressões/Construtor: Choosing a line chord plays it, marks it as sounding for 1.8 s and sets it as the last chord.
- F120 [state] Progressões/Construtor: Choosing an inversion of a line chord replaces it with that inversion of its original root-position chord (bass note changes, name unchanged, inversion shown) and plays it.
- F121 [state] Progressões/Construtor: Moving earlier or later moves the chord one place; at the ends the move does nothing.
- F122 [state] Progressões/Construtor: Removing deletes the chord from the line.
- F123 [input] Progressões/Construtor: Line chords can be reordered by desktop drag-and-drop; the target position is indicated during the drag, and dropping moves the chord there.
- F125 [ui] Progressões/Construtor: The builder has a chord-notes display of the last chord.
- F126 [ui] Progressões/Construtor: The builder suggests next chords; with an empty line it says "Adiciona um acorde à linha para ver sugestões inteligentes" (add a chord to the line to see smart suggestions).
- F127 [ui] Progressões/Construtor: Up to 10 suggestions are given, each with root, type, the reason text before any "(", and a rating out of 5 (round(strength), capped at 5).
- F128 [state] Progressões/Construtor: Suggestions are computed from the last chord of the line with the rules of R11 (see U01 for the current defect).
- F129 [state] Progressões/Construtor: Choosing a suggestion plays it, marks it as sounding for 1.8 s, sets it as the last chord, appends it to the line, and sets the Lista root and type to it.
- F130 [ui] Progressões/Construtor: The builder also gives access to the shared timeline.
- F131 [ui] Timeline: The shared timeline is available in both sub-modules of Progressões; when it is empty, the app tells the user how to add chords to it and offers no other action.
- F132 [state] Timeline: Chords reach the timeline from: adding a style progression, sending the builder line, adding the last chord, adding an Acordes result, Harmonia "I–IV–V–I" / "ii–V–I"; chords append at the end; duplicates are allowed.
- F133 [ui] Timeline: When it is not empty, the user chooses a timeline rhythm (12 rhythms, default "Simples") and sets a timeline BPM between 40 and 220 (default 90), independent of the Estilos settings.
- F134 [audio] Timeline: Playing the timeline uses the timeline rhythm/BPM and the current octave; the swing, strum-speed and repeat values come from the Estilos settings (see U02, U03).
- F135 [midi] Timeline: The user can download the timeline as MIDI, with the timeline rhythm and BPM.
- F136 [state] Timeline: Clearing the timeline stops playback and empties it.
- F137 [ui] Timeline: Each timeline entry gives its 1-based position and the chord name. The user can edit the chord (chord editor), move it one place earlier or later, or remove it.
- F138 [ui] Timeline: Tension chords in the timeline are marked as tension.
- F139 [audio] Timeline: Choosing a timeline chord plays it, marks it as sounding for 1.8 s and sets it as the last chord.
- F140 [state] Timeline: Moving earlier/later moves the chord one place; it is not possible for the first/last item.
- F141 [state] Timeline: Removing deletes the chord from the timeline.
- F142 [input] Timeline: Timeline entries can be reordered by desktop drag-and-drop, as in the builder.
- F145 [ui] Chord editor: Editing a chord (builder line or timeline) opens the chord editor for that chord.
- F146 [ui] Chord editor: The editor gives the name of the current chord.
- F147 [ui] Chord editor: The user can choose a new root (12 notes) and type (24 types), preset to the chord, and apply the change.
- F148 [state] Chord editor: Applying replaces the chord with root-position <root><type> (name "<root><type>"), closes the editor and plays it (marked as sounding for 1.8 s).
- F149 [ui] Chord editor: The editor lists up to 4 inversions (root position, 1st, 2nd, 3rd), each with its notes (e.g. "E · G · C"); the one that matches the current voicing is indicated.
- F150 [state] Chord editor: Choosing an inversion replaces the chord with that inversion of its current voicing (the bass note becomes the root), closes the editor and plays it.
- F151 [ui] Chord editor: The editor lists up to 12 suggested substitutions, each with root + type and a reason (rules in R12).
- F152 [state] Chord editor: Choosing a substitution replaces the chord with it (root position), closes the editor and plays it.
- F153 [input] Chord editor: The user can close the editor without a change; there is no keyboard shortcut.
- F155 [ui] Infinito: The user chooses a key (default C) and a scale (all 19 scales; default "Menor Natural").
- F156 [ui] Infinito: The user chooses one of the 9 generator styles of R13 (default "Trap").
- F157 [state] Infinito: Choosing a style also sets the BPM to that style's base BPM.
- F158 [input] Infinito: The user sets the BPM between 40 and 220 (default 140); a new BPM applies from the next chord.
- F159 [ui] Infinito: The user starts and stops the generator.
- F160 [audio] Infinito: Starting clears the list of generated chords, pre-generates 16 random chords and plays the first chord after 50 ms; then one chord every beat (minor styles) or every 2 beats (other styles); each chord lasts 82 % of its slot, and its notes are marked as sounding for 75 % of the slot.
- F161 [state] Infinito: The queue is refilled with 8 new chords whenever fewer than 4 remain.
- F162 [state] Infinito: Changing key, scale or style while running discards the queue and plays a newly generated chord immediately.
- F163 [ui] Infinito: The app shows whether the generator runs. It lists the last 8 generated chords; the newest is the current one and is indicated; a chord with an added 7th carries a tension mark after its name (see U12).
- F164 [audio] Infinito: Choosing any listed chord plays it and marks it as sounding for 1.8 s (it does not change the last chord).
- F165 [ui] Infinito: The app gives the current chord's notes (letter and Portuguese name); before the first start it says "— inicia o gerador para ver as notas —" (start the generator to see the notes).
- F166 [state] Infinito: Stopping the generator keeps the last chords listed, with no current chord.
- F167 [ui] Infinito: The app gives information on the chosen style: name, description (R13), tension %, base BPM, and minor or mixed mode.
- F168 [state] Infinito: Random chord rule (R13): pick a scale degree by the style's weights; minor styles force the "Menor Natural" scale; chord quality and added 7th as described in R13; the chord name is "<root>" + "°" (dim) / "m" (minor) / "7" (major with 7th) / "" (major).
- F170 [ui] Acordes: The user selects notes among the 12 notes (sharp and Portuguese names); selected notes are indicated.
- F171 [input] Acordes: Choosing a note plays it and toggles it in the selection.
- F172 [ui] Acordes: The selected notes are listed (letter and Portuguese name); the user can remove a note from that list. With none selected, the app asks the user to select 2 or more notes.
- F173 [audio] Acordes: The user can play the selected notes one by one, 260 ms apart.
- F174 [input] Acordes: The user can clear the selection.
- F175 [ui] Acordes: With fewer than 2 notes, the app says "Selecciona pelo menos 2 notas para descobrir os acordes possíveis" (select at least 2 notes to discover the possible chords).
- F176 [ui] Acordes: With ≥ 2 notes, the app lists every exact match, with their count.
- F177 [ui] Acordes: The app also lists up to 16 partial matches ("possible interpretations"), with their count (capped at 16), distinct from the exact matches.
- F178 [ui] Acordes: Each result gives the root and type and the chord's notes (the selected notes distinguished). The user can play it, add it to the shared timeline, or add it to the builder.
- F179 [audio] Acordes: Playing a result plays the chord and marks it as sounding for 1.8 s; choosing the result itself does the same and also sets it as the last chord.
- F180 [state] Acordes: Adding a result to the timeline appends the chord (root position, name "<root><type>") to the shared timeline; the user stays in Acordes.
- F181 [nav] Acordes: Adding a result to the builder appends the chord to the builder line and opens Progressões → Construtor (see U07).
- F182 [error] Acordes: If no chord matches, the app says "Nenhum acorde reconhecido para esta combinação" (no chord recognised for this combination) and "Experimenta adicionar ou remover notas" (try adding or removing notes).
- F184 [ui] Harmonia: Harmonia gives a short help text on how to use the circle of fifths; the user can hide it until the module is shown again.
- F186 [ui] Harmonia: Harmonia presents the circle of fifths: the 12 major keys in circle-of-fifths order (R14) and, for each key, its relative minor. The current tonic is shown.
- F187 [ui] Harmonia: For the current tonic, the circle identifies its dominant (next key in the circle), its subdominant (previous key) and its relative minor.
- F189 [ui] Harmonia: The circle shows three harmonic relations: dominant → tonic, subdominant → tonic, tonic → relative minor.
- F192 [input] Harmonia: The user can inspect any major key without choosing it: the app gives "<key> Maior", its role relative to the tonic (active tonic, dominant (V), subdominant (IV) or other) and its triad notes.
- F193 [audio] Harmonia: Choosing a major key plays its major triad (marked as sounding for 1.2 s) and makes it the tonic (the whole module updates).
- F194 [input] Harmonia: The user can inspect any relative minor without choosing it: the app gives "<minor>m", the major key it is relative to, and its triad notes.
- F195 [audio] Harmonia: Choosing a relative minor plays the minor triad (marked as sounding for 1.2 s) and sets it as the last chord, without changing the tonic.
- F196 [ui] Harmonia: Key information: tonic name, major, relative minor "<minor>m" and key signature (count of sharps or flats, R14). The user can play the tonic triad (marked as sounding for 1.5 s, sets the last chord).
- F197 [ui] Harmonia: Neighbour chords: IV (subdominant), V (dominant, the tension chord), vi (relative minor). The user can play each triad (marked as sounding for 1.5 s, sets the last chord).
- F198 [ui] Harmonia: Scale chords of <tonic> major: the 7 diatonic chords with Roman numeral (I ii iii IV V vi vii°), note name and quality (M, m, °); choosing one plays its triad and sets the last chord.
- F199 [ui] Harmonia: Cadences: four cadences, each with its name and description, and the user can play each: V → I "Perfeita (tensão→repouso)" (perfect: tension → rest), IV → I "Plagal (suave, 'amém')" (plagal: soft, "amen"), ii → V → I "Jazz / clássica" (jazz / classical), I → vi → IV → V "Pop (a mais usada!)" (pop: the most used!).
- F200 [audio] Harmonia: Playing a cadence plays its chords 1.3 s apart (each marked as sounding for 1.1 s and updating the last chord); ii is a minor triad on tonic+2, V in "ii → V → I" is a dominant 7th, all others are triads.
- F201 [ui] Harmonia: Harmonia can send its tonic to Progressões: view the styles in the tonic, add I–IV–V–I, or add ii–V–I to the timeline.
- F202 [nav] Harmonia: Viewing the styles in the tonic sets the Progressões and Infinito keys to the tonic and opens Progressões → Estilos.
- F203 [state] Harmonia: Adding I–IV–V–I appends four major triads (I, IV, V, I; names "<note>Maior") to the timeline and opens Progressões → Estilos.
- F204 [state] Harmonia: Adding ii–V–I appends ii minor ("<note>Menor"), V dominant 7th ("<note>Dom7", tension) and I major to the timeline and opens Progressões → Estilos.
- F205 [mobile] Harmonia: Inspecting a key needs a mouse (hover); on touch, choosing a key still plays and selects it.
- F207 [input] Analisar: The user can choose an audio file to analyse; the file picker accepts audio/* and .mp3 .wav .ogg .m4a .aac .flac.
- F208 [input] Analisar: The user can also drop a file onto the app (drag-and-drop) to start the analysis; a file dragged over the drop target is indicated.
- F209 [mobile] Analisar: The file picker must also open on iOS. The current app has a fallback for this (iOS opens the picker only from a direct tap on a file input that is not hidden with display:none).
- F210 [ui] Analisar: Before any analysis, the app says that the results appear after a file is loaded.
- F211 [ui] Analisar: During analysis, the app gives the progress status: first "A descodificar <file name>…" (decoding <file name>…), then "A extrair chroma com HPS…" (extracting chroma with HPS…; see U25), then "A calcular escalas com Krumhansl-Schmuckler…" (calculating scales with Krumhansl-Schmuckler…), and "<size> KB · análise harmónica multi-frame" (<size> KB · multi-frame harmonic analysis).
- F212 [error] Analisar: A file read error shows "Erro ao ler o ficheiro." (error reading the file); a decode/analysis error shows "Erro: <message>" (error: <message>) and "Tenta um ficheiro mp3 ou wav mais curto." (try a shorter mp3 or wav file).
- F213 [analysis] Analisar: The file is decoded with the Web Audio decoder and analysed into a 12-bin chroma (pipeline in R16), note strengths (0–1 relative to the strongest), ranked scales (R17) and chord candidates (R18).
- F214 [state] Analisar: The last analysis result is kept in memory; returning to the Analisar module shows it again.
- F215 [ui] Analisar: Result summary: file name, duration (rounded, s) and sample rate (kHz). The user can discard the result and load another file.
- F216 [ui] Analisar: Detected notes (by energy): the 8 strongest pitch classes, each with its name and its strength %. The user can play each.
- F217 [audio] Analisar: Playing a detected note plays it (1.2 s) and marks it as sounding for 1 s.
- F218 [nav] Analisar: If any note has strength > 20 %, the user can open those <n> notes in Acordes (chord detection) or in the Paleta module, Livre mode, with those notes selected.
- F219 [ui] Analisar: Most likely scales: the top 5, each with "<root> <scale>", its notes ("C · D · …") and a confidence % (first = 100 %, others = max(20, round(score/first score × 100))); the first is the most likely. The user can play each scale or use it (F222).
- F220 [ui] Analisar: For the first scale only, the app gives up to 3 detected notes outside that scale with strength > 8 %, strongest first, with their %, as tension notes.
- F221 [audio] Analisar: Playing a scale plays its notes 280 ms apart, each marked as sounding for 0.6 s.
- F222 [nav] Analisar: Using a scale sets the Paleta tonic and scale, the Progressões key and scale, and the Harmonia tonic to that result, then opens the Paleta module.
- F223 [ui] Analisar: If chord candidates exist, the app lists up to 6 detected chords (root, type, coverage %); the first is the strongest candidate.
- F224 [audio] Analisar: Choosing a detected chord plays it (marked as sounding for 1.8 s) and sets it as the last chord.
- F225 [ui] Analisar: The user can always go from the analysis results to the piano-roll editor.
- F226 [ui] Piano roll: The user can return from the piano roll to the analysis results; this stops the microphone (see U17).
- F227 [ui] Piano roll: The piano roll has three tools: select (default), draw and erase. The user chooses one; the current tool is indicated.
- F228 [input] Piano roll: The user steps the roll BPM down or up by 5 within 40–300 (default 120); the beat grid follows the BPM.
- F229 [state] Piano roll: The user can delete all selected notes.
- F230 [state] Piano roll: The user can quantize: every note start snaps to a grid of one sixteenth note (60/BPM/4 s) and its end to the grid, with a minimum length of half a grid step.
- F231 [input] Piano roll: The user can show or hide the frequency heatmap (default shown).
- F232 [input] Piano roll: The user chooses the play mode: Áudio (default; the original file) or Piano (the roll notes).
- F233 [audio] Piano roll: Playing in Áudio mode plays the original decoded file from the start; in Piano mode it plays the roll notes with the triangle synth (pitch from MIDI number, volume velocity/127 × 0.38, length × 1.1, each marked as sounding for up to 0.8 s). While it plays, the user can stop it.
- F234 [audio] Piano roll: Stopping ends the playback; playback also stops at the end of the duration (piano mode: duration + 200 ms).
- F235 [ui] Piano roll: During playback, a playhead shows the current position; when it passes 90 % of the visible window, the view scrolls so that the playhead is at 10 %.
- F236 [error] Piano roll: Playing with no decoded audio shows "Sem áudio — analisa primeiro um ficheiro." (no audio — analyse a file first); piano mode with no notes shows "Sem notas — analisa primeiro um ficheiro." (no notes — analyse a file first).
- F237 [ui] Piano roll: Note source: the user can analyse the loaded file or capture from the live microphone. A status line and a progress value give the state; the initial status tells the user to analyse the file to detect notes with timing, or to use the microphone.
- F238 [analysis] Piano roll: Analysing the file runs note-event detection on the decoded file (R19); both source actions are disabled while it runs; the status shows "A analisar ficheiro com onset detection…" (analysing the file with onset detection…), then "A processar… <pct>%" (processing… <pct>%), with the progress going from 5 % to 95 %.
- F239 [state] Piano roll: When file analysis finishes: the notes replace the roll content, the BPM is set to the estimate, the duration to the file length, the view to the first 20 s (or less), the status to "<n> notas detetadas · BPM estimado: <bpm>" (<n> notes detected · estimated BPM: <bpm>), and the progress goes to 100 % then resets after 1.5 s.
- F240 [error] Piano roll: File analysis errors show "Erro na análise: <message>" (analysis error: <message>); with no decoded audio: "Buffer de áudio não disponível. Carrega o ficheiro novamente." (audio buffer not available. Load the file again.).
- F241 [mic] Piano roll: Live microphone capture asks for microphone access (echo cancellation, noise suppression and auto gain off); the status shows "A pedir acesso ao microfone…" (asking for microphone access…).
- F242 [error] Piano roll: A microphone refusal shows "Microfone negado: <message>" (microphone denied: <message>).
- F243 [mic] Piano roll: While capturing: the user can stop the capture; the status shows "A capturar via microfone… toca o teu instrumento!" (capturing via microphone… play your instrument!); a live spectrum of 0–5 kHz (dB scale −140…0) is shown; the view starts at 0–30 s.
- F244 [mic] Piano roll: On each animation frame, live pitch salience (R20) adds heatmap data and creates 0.15 s notes for pitches above the threshold; notes louder than 50 % are also marked as sounding on the Paleta note palette; the view scrolls to keep the present 3 s before the end of the visible window.
- F245 [mic] Piano roll: Stopping the capture stops the microphone, removes the live spectrum, shows "Captura parada. <n> notas capturadas." (capture stopped. <n> notes captured.) and fits the view to 0…(last note end + 1 s).
- F246 [ui] Piano roll: The roll shows notes against time and pitch, for MIDI 36–96; each pitch can be identified, and each C is named with its octave (C2…C7).
- F247 [ui] Piano roll: The roll shows the beats of the roll BPM; every 4th beat starts a bar, and bars are numbered 1, 2, 3….
- F248 [ui] Piano roll: When on, the heatmap shows, for each analysis frame, the energy of each pitch.
- F249 [ui] Piano roll: Each note shows its pitch (note letter), its start and length and its velocity; selected notes are indicated.
- F251 [audio] Piano roll: The user can play any pitch (0.6 s) from the pitch axis, by click or tap.
- F252 [input] Piano roll: Select tool: choosing a note selects it (Shift-click adds it to the selection); dragging the note moves it in time (not before 0) and pitch; holding Shift while dragging keeps the pitch.
- F253 [input] Piano roll: Select tool: pressing at the end of a note and dragging resizes it (minimum 0.05 s).
- F254 [input] Piano roll: Select tool: pressing on empty space clears the selection and drags (pans) the view in time, within 0…duration.
- F255 [input] Piano roll: Draw tool: pressing creates a note at that pitch and time, half a beat long, velocity 90, selects it and plays it (0.3 s); dragging extends its end (minimum 0.05 s).
- F256 [input] Piano roll: Erase tool: choosing a note deletes it.
- F257 [input] Piano roll: The mouse wheel over the roll zooms in/out around the cursor time (×0.88 / ×1.12 per notch), minimum window 0.3 s; the page does not scroll.
- F258 [input] Piano roll: The user can zoom in (window ×0.65 around the centre, minimum 0.5 s), zoom out (window ÷0.65, clamped to 0…duration) and fit (whole duration).
- F259 [input] Piano roll: The user can scroll the visible window across the duration, and can see which part of the duration is visible.
- F260 [mobile] Piano roll: The roll supports touch: touchstart acts as press, touchmove drags/resizes/draws/pans (page scrolling is prevented only during those actions), touchend releases.
- F261 [ui] Piano roll: Detected-notes summary: the number of notes and, per pitch class, its letter and count, sorted by count; choosing a pitch class selects all notes of that pitch class. With no notes: "Nenhuma nota ainda. Analisa o ficheiro ou usa o microfone." (no notes yet. Analyse the file or use the microphone.).
- F262 [nav] Piano roll: The user can open the roll's distinct pitch classes in the Paleta module, Livre mode, as the selection (only if there are notes).
- F263 [midi] Piano roll: MIDI export downloads "paleta-musical.mid" with the roll notes at their real times (R21) and shows "MIDI exportado! <n> notas · <bpm> BPM" (MIDI exported! <n> notes · <bpm> BPM); with no notes it shows "Nenhuma nota para exportar." (no notes to export.).
- F264 [state] Piano roll: The user can remove all notes; the view resets to 0…duration.
- F265 [midi] Progression MIDI: Progression MIDI is a format-0, single-track file, 480 ticks per quarter note, with tempo from the chosen BPM, a 4/4 time signature and the track name "Paleta Musical".
- F266 [midi] Progression MIDI: The notes follow the chosen rhythm pattern (R9, MIDI columns); note numbers are 12 × octave + pitch class (octave = the global octave, shifted −1 for bass notes), clamped to 0–127 (see U32).
- F267 [midi] Progression MIDI: The file downloads as "progressao-<rhythm key>-paleta.mid" (e.g. "progressao-simples-paleta.mid").
- F269 [mobile] General: Every control reacts to a tap at once (no double-tap-zoom delay).
- F273 [a11y] General: The document language is "pt"; there are no ARIA labels and no keyboard shortcuts.
- F274 [i18n] General: All text is Portuguese (mixed PT-PT and PT-BR spellings; see U26); notes are named by both letter (C, C#…) and Portuguese solfège (Dó, Dó#…); sharps only, no flats.
- F275 [state] General: No data is persisted: no localStorage, cookies or server; reloading resets everything.
- F276 [core] Global: Each of the 12 pitch classes has one fixed identity colour (R1), the same in every octave. Every place that shows a note or a chord root uses that colour, so that the user learns to connect a colour with a note: the note palette, chord names, the circle of fifths, piano-roll notes, the heatmap and the live analysis. (Client decision, 2026-11-23: colour-per-note is a feature. The values of R1 are the current values; the designer may tune them, but each note keeps one distinct colour.)

## 3. Reference data

### R1 Notes, Portuguese names and identity colours
| Pitch class | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Name | C | C# | D | D# | E | F | F# | G | G# | A | A# | B |
| PT | Dó | Dó# | Ré | Ré# | Mi | Fá | Fá# | Sol | Sol# | Lá | Lá# | Si |
| Colour | #FF6B6B | #FF8E53 | #FFC947 | #A8E063 | #56CCF2 | #2F80ED | #9B51E0 | #EB5757 | #F2994A | #27AE60 | #1ABC9C | #8B5CF6 |

### R2 Defaults (initial state)
| Item | Default |
|---|---|
| Module / Paleta mode | Paleta / Escala |
| Paleta tonic, scale, chord type | C, Maior, Maior |
| Tension value | 0.30 |
| Global octave | 4 (range 2–6) |
| Estilos key, scale, style, rhythm, BPM | C, Maior, Pop, simples, 90 |
| Timeline rhythm, BPM | simples, 90 |
| Swing feel, strum speed, loop repeats | 0.67, 40 ms, 1 |
| Progressões sub-module, builder input mode | estilos, lista |
| Builder tonic, type | C, Maior |
| Infinito key, scale, style, BPM | C, Menor Natural, Trap, 140 |
| Harmonia tonic | C |
| Piano roll BPM, tool, heatmap, play mode | 120, select, on, Áudio |
| Piano roll duration / visible window before any analysis | 10 s / 0–10 s |

### R3 Scales (semitones from tonic, in list order)
| Scale | Intervals |
|---|---|
| Maior | 0 2 4 5 7 9 11 |
| Menor Natural | 0 2 3 5 7 8 10 |
| Menor Harmônica | 0 2 3 5 7 8 11 |
| Menor Melódica | 0 2 3 5 7 9 11 |
| Pentatônica Maior | 0 2 4 7 9 |
| Pentatônica Menor | 0 3 5 7 10 |
| Blues | 0 3 5 6 7 10 |
| Blues Maior | 0 2 3 4 7 9 |
| Dórica | 0 2 3 5 7 9 10 |
| Frígia | 0 1 3 5 7 8 10 |
| Lídia | 0 2 4 6 7 9 11 |
| Mixolídia | 0 2 4 5 7 9 10 |
| Lócria | 0 1 3 5 6 8 10 |
| Frígia Dominante | 0 1 4 5 7 8 10 |
| Cromática | 0 1 2 3 4 5 6 7 8 9 10 11 |
| Árabe | 0 2 4 5 6 8 10 |
| Japonesa | 0 1 5 7 8 |
| Húngara Menor | 0 2 3 6 7 8 11 |
| Bebop Dominante | 0 2 4 5 7 9 10 11 |

### R4 Chord types (semitones from root, in list order)
| Type | Intervals | Type | Intervals |
|---|---|---|---|
| Maior | 0 4 7 | m6 | 0 3 7 9 |
| Menor | 0 3 7 | 9 | 0 4 7 10 14 |
| Dom7 | 0 4 7 10 | m9 | 0 3 7 10 14 |
| Maj7 | 0 4 7 11 | Maj9 | 0 4 7 11 14 |
| Min7 | 0 3 7 10 | 7sus4 | 0 5 7 10 |
| Dim | 0 3 6 | HalfDim | 0 3 6 10 |
| Dim7 | 0 3 6 9 | Aug7 | 0 4 8 10 |
| Aug | 0 4 8 | b9 | 0 4 7 10 13 |
| Sus2 | 0 2 7 | #11 | 0 4 6 10 18 |
| Sus4 | 0 5 7 | 13 | 0 4 7 10 14 21 |
| Add9 | 0 4 7 14 | m11 | 0 3 7 10 14 17 |
| mAdd9 | 0 3 7 14 | 6 | 0 4 7 9 |

### R5 Diatonic chord qualities per scale degree (Paleta diatonic chords)
| Scale | I | II | III | IV | V | VI | VII |
|---|---|---|---|---|---|---|---|
| Maior | Maior | Menor | Menor | Maior | Maior | Menor | Dim |
| Menor Natural | Menor | Dim | Maior | Menor | Menor | Maior | Maior |
| Menor Harmônica | Menor | Dim | Aug | Menor | Maior | Maior | Dim |
| Dórica | Menor | Menor | Maior | Maior | Menor | Dim | Maior |
| Frígia | Menor | Maior | Maior | Menor | Dim | Maior | Menor |
| Lídia | Maior | Maior | Menor | Dim | Maior | Menor | Menor |
| Mixolídia | Maior | Menor | Dim | Maior | Menor | Menor | Maior |
| Lócria | Dim | Maior | Menor | Menor | Maior | Maior | Menor |

### R6 Style progressions (Estilos). The Roman sequence is the name split on "–", except "12 compassos" = I I I I IV IV I I V IV I V.
| Style | Name | Description |
|---|---|---|
| Trap | i–bVII–bVI–bVII | Dark trap clássico |
| Trap | i–bVI–bVII–i | Loop agressivo |
| Trap | i–iv–bVII–bVI | Trap melódico |
| Trap | i–bIII–bVII–iv | Ominous trap |
| Trap | i–i–bVI–bVII | Heavy bass loop |
| Trap | i–bVI–i–bVII | Drill UK |
| Trap | i–bVII–bVI–V | Andaluz trap |
| Trap | i–III–bVII–iv | Rage beat |
| Trap | bVI–bVII–i–i | Dark loop reverse |
| Hip Hop | i–bVI–bIII–bVII | Soul sample clássico |
| Hip Hop | ii–V–I–vi | Boom bap jazz |
| Hip Hop | i–bVII–IV–i | Groove funky |
| Hip Hop | I–IV–vi–V | Hip hop positivo |
| Hip Hop | i–iv–i–V | Old school minor |
| Hip Hop | I–vi–IV–V | 50s feel |
| Hip Hop | i–III–VI–VII | Neo soul loop |
| Hip Hop | I–iii–vi–IV | Smooth hip hop |
| Hip Hop | i–bVI–bVII–bVI | Chill sample flip |
| Hip Hop | IV–I–V–vi | Gospel hip hop |
| Pop | I–V–vi–IV | A mais usada do mundo |
| Pop | I–IV–V | Rock clássico |
| Pop | vi–IV–I–V | Pop emotivo |
| Pop | I–iii–IV–V | Progressão ascendente |
| Pop | I–IV–vi–iii | Pop variante |
| Pop | I–V–IV–V | Cadência suspensa |
| Pop | vi–V–IV–III | Descida emocional |
| Pop | I–bVII–IV–I | Stadium rock |
| Pop | I–ii–IV–V | Suave ascendente |
| Pop | vi–IV–V–I | Resolução final |
| Jazz | ii–V–I | Cadência jazz fundamental |
| Jazz | I–vi–ii–V | Rhythm changes |
| Jazz | iii–VI–ii–V | Turnaround bebop |
| Jazz | I–IV–iii–VI–ii–V | Longa cadência |
| Jazz | i–iv–bVII–III | Minor jazz cycle |
| Jazz | II–V–I–IV | Bird blues |
| Jazz | iii–bIII–ii–V | Coltrane sub |
| Jazz | I–VI–II–V | All of Me changes |
| Jazz | ii–bII–I | Tritono substitution |
| Jazz | I–bVII–bVI–V | Andaluz jazz |
| Blues | 12 compassos | Blues clássico |
| Blues | I7–IV7–V7 | Blues simplificado |
| Blues | i–iv–V7–i | Blues menor |
| Blues | I–IV–I–V–IV–I | 6 compassos |
| Blues | I7–IV7–I7–V7 | Quick change |
| Blues | i–bVII–IV–i | Texas blues |
| Clássico | I–IV–V–I | Cadência perfeita |
| Clássico | I–V–IV–V | Cadência suspensa |
| Clássico | vi–IV–V–I | Relativa menor |
| Clássico | I–V–vi–iii–IV–I–IV–V | Canon de Pachelbel |
| Clássico | i–VII–VI–V | Descida clássica |
| Clássico | I–ii–iii–IV–V | Ascendente diatónico |
| Clássico | I–bVII–VI–V | Andaluz clássico |
| Flamenco | i–bVII–bVI–V | Cadência andaluza |
| Flamenco | i–iv–V–i | Frígio clássico |
| Flamenco | I–bVII–bVI–bVII–I | Tangos flamenco |
| Flamenco | i–bVII–bVI–i | Soleares |
| Flamenco | IV–III–II–I | Rasgueo descida |
| Cinematográfico | I–bVII–bVI–bVII | Epic trailer |
| Cinematográfico | i–bVI–bIII–bVII | Épico menor |
| Cinematográfico | I–iii–IV–iv | Tensão dramática |
| Cinematográfico | i–bVI–III–bVII | Aventura épica |
| Cinematográfico | I–ii–bVII–I | Hero's journey |
| Cinematográfico | i–bIII–bVII–bVI | Sombra e luz |
| Cinematográfico | I–bVI–bIII–bVII | Majestoso |
| Cinematográfico | i–v–bVI–bVII | Thriller intenso |
| R&B / Soul | i–bVII–bVI–bVII | Neo soul loop |
| R&B / Soul | I–iii–vi–IV | Smooth R&B |
| R&B / Soul | I–IV–iii–vi | Marvin Gaye feel |
| R&B / Soul | ii–V–I–iii–vi | Contemporary R&B |
| R&B / Soul | I–bVII–IV–i | Funky soul |
| R&B / Soul | vi–IV–I–V | Beyoncé feel |
| House / EDM | i–bVI–bVII–i | Progressive house |
| House / EDM | I–IV–vi–V | Pop EDM |
| House / EDM | i–bVII–IV–i | Dark techno |
| House / EDM | I–V–vi–IV | Festival anthem |
| House / EDM | vi–bVII–I–bVII | Trance loop |
| House / EDM | i–III–bVII–IV | Deep house |
| Latin | i–V–i–IV | Bossa nova |
| Latin | I–IV–V–I | Salsa clássica |
| Latin | ii–V–I | Samba jazz |
| Latin | i–bVI–bVII–i | Reggaeton |
| Latin | I–bVII–IV–I | Cumbia |
| Latin | vi–IV–I–V | Bachata |
| Metal | i–bVI–bVII–i | Power metal |
| Metal | i–bVII–bVI–V | Thrash riff |
| Metal | i–iv–bVI–bVII | Doom metal |
| Metal | i–bII–i | Tritono devilish |
| Metal | i–bIII–bVII–i | Death metal loop |
| Metal | I–bVI–bIII–bVII | Epic power metal |

### R7 Roman-numeral resolution (Estilos)
- Special numerals (fixed offset from the key tonic, always flagged "tension"): bVII +10 major; bVI +8 major; bIII +3 major; bII +1 major; #IV +6 major; VII +11 major; III +4 major; VI +9 major; II +2 major; I7 +0 dom7 (0 4 7 10); IV7 +5 dom7; V7 +7 dom7.
- Other numerals: degree I/i=1 … VII/vii=7 of the selected scale; root = scale step of that degree; uppercase = major triad (0 4 7), lowercase = minor triad (0 3 7); a "7" suffix makes it 0 4 7 10 (upper) or 0 3 7 10 (lower). If the degree does not exist in a short scale, the last scale step is used and no 7th is added. Not flagged as tension.

### R9 Rhythms (beat = 60/BPM s; "upper" = chord without its root; volumes per voice)
| Key | Name | Description | Audio playback | MIDI (vel; dur in beats) |
|---|---|---|---|---|
| simples | Simples | Um acorde por beat | 1 chord per beat, dur 0.85 beat, vol 0.18 | chord each beat, vel 90, dur 0.85 |
| arpejo | Arpejo ↑ | Notas uma a uma ascendente | 1 note per ½ beat in interval order, dur 0.55 beat, vol 0.26 | same, vel 78, dur 0.45 |
| arpejo-down | Arpejo ↓ | Notas uma a uma descendente | as arpejo, reversed | as arpejo, reversed |
| arpejo-ud | Arpejo ↑↓ | Arpejo sobe e desce | up then down per chord (top note repeated), ½ beat each, dur 0.5 beat, vol 0.24 | up+down, vel 75, dur 0.45 |
| swing | Swing | Ternário jazz | per chord (1 beat): full chord at 0 (dur 1.5 beat, vol 0.18); upper notes one octave lower at swing×beat (dur 0.7×(1−swing) beat, vol 0.10) | swing fixed 0.67: chord vel 88 dur 0.95×0.67; ghost vel 45 |
| ballad | Balada | Lento com sustain | chord slot = 2 × 60/(0.55×BPM) s; bass root octave −1 (vol 0.33, dur 0.9 slot); upper notes +160 ms (vol 0.18, dur 0.8 slot) | 2 beats per chord; bass vel 85 dur 1.7; upper at 0.4 beat vel 70 dur 1.5 |
| funk | Funk | Sincopado e agressivo | hits at 0, ½, 1, 1½ beat; next chord at 2 beats; hit 1 dur 0.4 beat, others 0.2; vol 0.22 (hits 1, 3) / 0.10 (2, 4) | same; vel 88/45/88/45 |
| strum | Rasguejo | Strumming guitarra | 4 strokes per chord, 1 per beat, directions up-up-down-up (ascending, ascending, descending, ascending), strings offset by strum speed, vol 0.20, dur 0.9 beat | strings 0.04 beat apart; vel 85 for first, then max(55, 85 − 8×i); dur 0.85 |
| bossa | Bossa Nova | Síncopa bossa nova | per chord (2 beats): bass oct −1 at 0 (dur 1.8, vol 0.30); upper at 0.4 (dur 0.6, vol 0.14); bass at 1 (dur 0.8, vol 0.25); upper at 1.5 | bass vel 82 dur 1.7; upper vel 65 dur 0.55; bass vel 75 dur 0.75; upper vel 62 |
| waltz | Valsa | 3/4 — forte leve leve | per chord (3 beats): bass oct −1 (dur 1.2, vol 0.32); upper on beats 2 and 3 (dur 0.6, vol 0.12) | bass vel 85 dur 1.1; upper vel 60, 55 dur 0.6 |
| half | Half-Time | Batida espaçada (2 em 4) | 1 chord per 2 beats, dur 1.8 beats | vel 90 dur 1.8 |
| loop | Loop | Repete N vezes | 1 chord per 1.1 beat, dur 0.94 beat, whole progression repeated N times | 1 chord per beat ×N, vel 90 dur 0.85 |

Sounding-note mark durations: simples/loop 0.75 slot, arpeggios 0.75–0.8 note slot, swing 0.9 long part, ballad 0.7 slot, funk 0.9 hit, strum 0.8 beat, bossa 1.8 beat, waltz 1.1 beat, half 0.8 slot.

### R10 Chord detection from notes (Acordes module and builder Detetar)
- Needs ≥ 2 notes. For every chord type (R4) and every root: all selected notes must be chord pitch classes. Exact = the chord's pitch classes equal the selection. Partial = not exact and the chord's interval count is larger than the number of selected notes.
- Order: exact before partial, then fewer intervals first, then root name alphabetically.

### R11 Next-chord suggestions (builder). Offset in semitones from the last chord's root; "s" = base strength.
| Last chord type | Suggestions (offset type "reason" s) |
|---|---|
| Maior (also any type not listed) | +5 Maior "IV (subdominante)" 5; +7 Maior "V (dominante)" 5; +9 Menor "vi (relativa menor)" 4; +5 Maj7 "IVMaj7 (jazz)" 3; +7 Dom7 "V7 (tensão)" 4; +2 Menor "ii (preparação)" 3; +4 Menor "iii" 2; 0 Sus4 "I Sus4" 2; +10 Maior "bVII (hip hop)" 3; +8 Maior "bVI (cinemat.)" 3; 0 Maj7 "IMaj7 (jazz)" 2 |
| Menor | +5 Menor "iv (sub. menor)" 5; +7 Maior "V (dominante)" 5; +3 Maior "bIII (relativa)" 4; +10 Maior "bVII (trap)" 4; +8 Maior "bVI (dark)" 4; 0 Min7 "i7 (jazz)" 3; +5 Min7 "iv7" 3; +2 Dim "iidim (tensão)" 2; +7 Dom7 "V7 (resolução)" 4; +3 Maj7 "bIIIMaj7" 2 |
| Dom7 | −7 Maior "I (resolução perfeita)" 6; −7 Menor "i menor" 5; +6 Dom7 "bII7 (tritono sub)" 3; −7 Maj7 "IMaj7 (jazz)" 4; +5 Maior "IV (engano)" 3 |
| Maj7 | +5 Maj7 "IVMaj7" 5; +2 Min7 "ii-7 (ii-V)" 5; +7 Dom7 "V7 (ii-V-I)" 5; +9 Min7 "vi-7" 3; 0 Maior "I (simplificar)" 2 |
| Min7 | +5 Dom7 "V7 (ii-V-I)" 6; 0 Menor "i simples" 2; +5 Maior "IV" 3; +3 Maj7 "bIIIMaj7" 3; +7 Menor "v menor" 2 |
| Dim | +1 Maior "bII (cromático)" 5; +1 Menor "bii menor" 4; −1 Menor "VII→i" 5; +3 Maior "bIII" 3 |
| Sus2 | 0 Maior "I (resolver)" 6; 0 Menor "i menor" 4; +5 Maior "IV" 3 |
| Sus4 | 0 Maior "I (resolver)" 6; 0 Menor "i menor" 4; +7 Maior "V" 3 |
| Aug | +5 Maior "IV" 4; 0 Maior "I" 3; +8 Maior "bVI" 2 |
| Dim7 | +1 Maior "bII" 5; −1 Menor "i (resolução)" 5; +3 Maior "bIII" 3 |
| Add9 | +5 Maior "IV" 5; +7 Maior "V" 4; +9 Menor "vi" 3 |
Bonuses when the line has ≥ 2 chords: if the last root is a fifth (+7) above the previous root, a suggestion at +5 from the last root gets +1; any suggestion at +5 or +7 from the last root gets +0.5. Then de-duplicate by root+type (first kept), sort by strength descending (stable), keep 10.

### R12 Substitutions (chord editor), in insertion order with strength
1. Root +6, Dom7, "Substituição tritono", 4. 2. If the 2nd interval is 3: root +3 Maior "Relativa maior", else root +9 Menor "Relativa menor", 4. 3. If no interval 10 or 11: same root Min7 (minor third) or Maj7, "Adicionar 7ª", 3. 4. Same root Sus4 "Suspensão (Sus4)", 3. 5. Same root Sus2 "Suspensão (Sus2)", 2. 6. Same root Maior "Modo paralelo maior" (if minor third) or Menor "Modo paralelo menor", 3. 7. Root −1 Dim "Substituto dim (vii°)", 2. 8. Same root Add9 "Colorir (Add9)", 2. 9. Every other chord type on the same root not yet listed, "Variante mesma tónica", 1.
The current chord (root+type) and duplicates are removed; stable sort by strength descending; keep 12.

### R13 Infinito styles
| Style | Degree weights (I…VIII) | Tension prob. | Base BPM | Minor | Description |
|---|---|---|---|---|---|
| Trap | 4 1 1 2 1 3 2 1 | 0.35 | 140 | yes | Acordes menores pesados · alta tensão |
| Hip Hop | 3 2 2 3 2 4 1 1 | 0.20 | 90 | yes | Soul samples · groove funky |
| Relaxante | 5 2 3 2 1 1 1 1 | 0.05 | 72 | no | Consonante · progressões suaves |
| Dramático | 3 3 2 3 2 2 1 1 | 0.25 | 90 | no | Tensão moderada · mistura maior/menor |
| Jazz | 2 4 4 2 3 3 1 1 | 0.15 | 110 | no | ii-V-I · acordes de sétima |
| Épico | 4 2 2 3 2 2 3 1 | 0.30 | 80 | no | Cinematográfico · lento |
| Dark | 5 1 2 3 1 2 4 1 | 0.45 | 120 | yes | Muito tenso · mode menor sombrio |
| Soul | 3 3 2 4 2 3 1 1 | 0.10 | 85 | no | R&B suave · caloroso |
| Aleatório | 1 1 1 1 1 1 1 1 | 0.40 | 100 | no | Tudo pode acontecer |
Chord rule: scale = "Menor Natural" if Minor, else the selected scale; degree index d (0-based) is drawn with the first min(scale size, 8) weights. "Forced minor" = Minor style and random < 0.8. Minor triad if forced minor or d ∈ {1, 2, 5}; diminished if not forced minor and d = 6; else major. With probability "tension", add interval 10 and give the chord the tension mark (F163). Chord slot = 1 beat (Minor styles) or 2 beats.

### R14 Harmonia data
- Circle-of-fifths order: C G D A E B F# C# G# D# A# F.
- Relative minors: C→A, G→E, D→B, A→F#, E→C#, B→G#, F#→D#, C#→A#, G#→F, D#→C, A#→G, F→D.
- Key signature shown (count and sign): C 0 #, G 1 #, D 2 #, A 3 #, E 4 #, B 5 #, F# 6 #, C# 7 #, G# 4 ♭, D# 3 ♭, A# 2 ♭, F 1 ♭.
- Cadences: V→I (both triads); IV→I; ii (minor, tonic +2) → V7 (dom7) → I; I → vi (minor) → IV → V.

### R15 Synth and timing constants
| Item | Value |
|---|---|
| Oscillator | triangle |
| Note default | 1.4 s, volume 0.32, attack 10 ms |
| Chord default | 1.8 s, volume 0.18 per voice, attack 15 ms |
| Decay | exponential to 0.001 at end |
| Scale playback spacing | 280 ms (Paleta, Analisar), 260 ms (Paleta Detetar compatible scales, Acordes play), 300 ms (Livre) |
| Builder line playback | 1.7 s per chord |
| Cadence playback | 1.3 s per chord |
| Tension threshold | tension value > 0.45 |

### R16 Chroma analysis (Analisar, scale detection)
| Step | Value |
|---|---|
| Channels | mono = (L + R)/2 |
| Pitch range | MIDI 36–95 |
| Frames | hop 0.20 s; count = min(50, max(6, floor(samples/hop))); evenly spaced; a frame is skipped if RMS of its first 4096 samples < 1e-4; stop when offset + 32768 ≥ length |
| Spectra | Hann window; magnitude spectrum (from dB, ≤ −140 dB = 0); FFT 32768 for MIDI < 72 (8 harmonics), FFT 8192 for MIDI ≥ 72 (5 harmonics) |
| Harmonic salience | Σ mag(h·f0)/√h, linear bin interpolation, stop above 0.47 × sample rate |
| Residual | pitches by salience descending subtract 0.6 × s/√h at harmonics 1–8 from the large spectrum (floor 0); MIDI < 72 final = 0.6 × original + 0.4 × residual salience |
| Octave weight | MIDI < 60: 0.25 + 0.75 × (MIDI − 36)/24; else 1 |
| Frame chroma | sum per pitch class, then cube root |
| Frame confidence | max(0.1, 1 − spectral flatness of the large spectrum 60–4000 Hz) |
| Aggregates | full (weight 1); start (pos < 0.35: (1 − pos/0.35)×2 + 1, else 0.1); end (pos > 0.65: ((pos − 0.65)/0.35)×2 + 1, else 0.1); each × confidence; L2-normalised |
| No usable frame | all three = 1/12 each |
| Note strengths | full chroma / its max, sorted descending |

### R17 Scale ranking (Analisar)
- Key profiles: KS major 6.35 2.23 3.48 2.33 4.38 4.09 2.52 5.19 2.39 3.66 2.29 2.88; KS minor 6.33 2.68 3.52 5.38 2.60 3.53 2.54 4.75 3.98 2.69 3.34 3.17; Temperley major 5 2 3.5 2 4.5 4 2 4.5 2 3.5 1.5 4; Temperley minor 5 2 3.5 4.5 2 4 2 4.5 3.5 2 1.5 4.
- Per root r (chroma rotated so r is index 0): KSmaj/KSmin/TPmaj/TPmin = Pearson correlation with the profiles. Tonic bonus major = 0.18 × (start[0] + end[0] + 0.5×start[7] + 0.5×end[7]); minor adds 0.3×(start[3] + end[3]). Salience(x) = 0.4 × (start[x] + end[x]) + 0.2 × full[x]; majΔ = sal(r) − sal(r+9); minΔ = sal(r) − sal(r+3); modal = 0.15 × (full[r+11] − full[r+10]).
- KS score: Maior = (KSmaj+TPmaj)/2 + bonusMaj + 0.30×majΔ + modal; Menor Natural = (KSmin+TPmin)/2 + bonusMin + 0.30×minΔ − modal; Menor Harmônica = minor base + 0.10 × full[r+11]; Menor Melódica = minor base + 0.07 × (full[r+11] + full[r+9]).
- Every scale except Cromática, every root: in-score = Σ over scale notes full[n] × weight (weights below; missing weight = 1); matched = scale notes with full > 0.10; out-notes = non-scale notes with full > 0.08, sorted descending, weighted 0.40, 0.70, then 1.0; score = in/Σweights − 0.65 × out/max(1, #out) + 0.12 × matched/size.
- For Maior and Menor Natural: score = 0.75 × (KS + 0.5)/1.3 + 0.25 × score; for Menor Harmônica / Melódica the weight is 0.60.
- Tie-break: candidates with score ≥ 97 % of the best are re-ordered by tonal gravity = 2×strength(root) + strength(root+5) + strength(root+7), × 0.75 if the root is the fifth of another candidate's root; among the winning root's scales, the one whose distinguishing notes are stronger wins; the winner moves to the top. Top 8 kept, 5 shown.
- Degree weights: Maior 0:2.5 2:1.0 4:1.8 5:1.1 7:2.0 9:1.0 11:1.4 · Menor Natural 0:2.5 2:1.0 3:1.8 5:1.1 7:2.0 8:0.9 10:1.3 · Menor Harmônica 0:2.5 2:1.0 3:1.8 5:1.1 7:2.0 8:0.9 11:1.6 · Menor Melódica 0:2.5 2:1.0 3:1.8 5:1.1 7:2.0 9:1.2 11:1.5 · Dórica 0:2.0 2:1.0 3:1.5 5:1.1 7:1.8 9:1.6 10:1.0 · Frígia 0:2.0 1:1.8 3:1.2 5:1.0 7:1.5 8:1.0 10:1.0 · Lídia 0:2.0 2:1.0 4:1.6 6:1.8 7:1.8 9:1.0 11:1.2 · Mixolídia 0:2.0 2:1.0 4:1.6 5:1.1 7:1.8 9:1.0 10:1.6 · Lócria 0:2.0 1:1.5 3:1.2 5:1.0 6:1.8 8:1.0 10:1.0 · Frígia Dominante 0:2.2 1:1.9 4:1.9 5:1.1 7:1.6 8:1.0 10:1.0 · Pentatônica Maior 0:2.5 2:1.3 4:1.8 7:2.0 9:1.3 · Pentatônica Menor 0:2.5 3:1.8 5:1.3 7:2.0 10:1.3 · Blues 0:2.5 3:1.6 5:1.3 6:1.8 7:1.8 10:1.3 · Blues Maior 0:2.5 2:1.3 3:1.5 4:1.5 7:2.0 9:1.2 · Húngara Menor 0:2.0 2:1.0 3:1.5 6:1.9 7:1.8 8:1.5 11:1.6 · Árabe 0:2.0 2:1.2 4:1.4 5:1.1 6:1.8 8:1.2 10:1.3 · Japonesa 0:2.5 1:2.0 5:1.5 7:2.0 8:1.8 · Bebop Dominante 0:2.0 2:1.0 4:1.5 5:1.0 7:1.8 9:1.0 10:1.5 11:1.3.

### R18 Chord candidates (Analisar)
Active notes = strength > 0.2 (need ≥ 2). For every root and chord type: matches = chord notes among active; coverage = matches / chord size; extra = active notes not in chord; keep if matches ≥ 2 and coverage ≥ 0.6; score = coverage × matches − 0.3 × extra; top 6 by score.

### R19 Piano-roll file note detection
| Item | Value |
|---|---|
| Window / hop | 4096 samples Hann / 0.046 s |
| Pitch range | MIDI 36–96 |
| Salience | Σ over harmonics 1–6 of single-bin DFT magnitude (bin = round(f/binwidth))/√h; kept if > 0.01; value = min(1, 3.5 × salience) |
| Onset / release | note starts when salience > 0.28, ends when < 0.12 or at the last frame; minimum 3 frames |
| Velocity | round(127 × peak salience) |
| BPM estimate | median of the first ≤ 29 inter-onset intervals; if 0.1–2.0 s → 60/IOI; clamp 60–200; default 120 (needs ≥ 4 onsets) |
| Progress | reported every 20 frames |

### R20 Live microphone detection
| Item | Value |
|---|---|
| Analyser | FFT 4096, smoothing 0.5 |
| Pitch range | MIDI 48–84 |
| Salience | Σ harmonics 1–5 of 10^(dB/20)/√h (bins above −120 dB); value = min(1, 5 × salience) |
| Note trigger | value > 0.25 and no recent note of that pitch (gap > 0.05 s); note length 0.15 s; velocity = round(127 × value) |
| Palette sounding-note mark | value > 0.5, 200 ms |
| Initial duration / view | 30 s / 0–30 s |

### R21 Piano-roll MIDI export
Format 0, one track, 480 ticks per quarter note, tempo from roll BPM, program change 0 (Acoustic Grand Piano), track name "Paleta Musical"; tick = round(seconds × BPM/60 × 480); velocity clamped 1–127; file "paleta-musical.mid".

## 4. External dependencies

- No JavaScript libraries, no CDN scripts, no server API.
- Browser APIs: Web Audio API (AudioContext / webkitAudioContext, OscillatorNode, GainNode, AudioBufferSourceNode, decodeAudioData, OfflineAudioContext, AnalyserNode, MediaStreamAudioSourceNode) for sound and analysis; MediaDevices.getUserMedia (microphone); FileReader (file read); HTML5 drag-and-drop (DataTransfer) for file drop and list reordering; Blob + URL.createObjectURL + anchor download (MIDI files); requestAnimationFrame and performance.now (live microphone detection loop and playback timing).
- Not used: Web MIDI API, localStorage/IndexedDB, service worker, network fetch.

## 5. Unclear or dead code (questions for the client)

- U01 (L802–827) Next-chord suggestions read `rule.type`, but the rules table uses the key `t`: every suggestion becomes a major triad with type "undefined", suggestions with the same root collapse into one, and choosing one sets the builder type to undefined. Intended behaviour is clearly the typed table in R11.
- U02 (L1232–1234 with L698–699) Playing the timeline sets a flag that `playProgression` immediately clears, so the timeline never enters its playing state and the user cannot stop timeline playback from the timeline.
- U03 (L702–711, L1271) Timeline chords are not registered as playable chords; during timeline playback the "sounding chord" indication lands on the Estilos progression chords (by global index, or on the last-played progression) instead of on the timeline entries.
- U04 (L1992) Estilos tells the user that a right-click on the line removes a chord, but no right-click handler exists.
- U05 (L2056–2058) The arpeggio note-speed setting does nothing; it only changes its own shown value.
- U06 (L2061–2088) The bulk inversion (meant to apply to all chords of the line) changes the shared timeline and the builder line, not the style progressions. On the builder line the root is not moved, so the chord is transposed (C major 1st inversion becomes C–D#–G#). On the timeline the 3rd inversion of a triad moves the root up a fifth without changing intervals; repeated use compounds; chord names are not updated.
- U07 (L1616, 1645, 2341, 2747–2759, 3514, 3549–3552, 3597, 4121) Cross-module links (e.g. open the scale in Harmonia) change the module without the module-switch logic: the current-module indication stays on the previous module, progression playback is not stopped, and root sync is skipped.
- U08 (L2119) Adding a style progression to the timeline stores type "m" or "7" (not valid chord-type keys) and ignores the inversions chosen for its chords; the chord editor then cannot preselect the type.
- U09 (L1084–1090) Adding the last chord to the timeline adds a chord named "<first note>?" with type "?", also not a valid type. Should it detect and name the chord?
- U10 (L1656) The altered versions always play dominant-7th-based sets, whatever the selected chord type, but are named with that type (e.g. "CMenor(b9)").
- U11 (L2211, L870) The Infinito scale filter (≥ 5 notes) excludes nothing; minor styles (Trap, Hip Hop, Dark) ignore the selected scale.
- U12 (L880) Infinito names minor or diminished chords that got a 7th without "7"; only the tension mark shows it.
- U13 (L984–985, L866) Module switches stop progression playback but not the Infinito generator, which keeps sounding in other modules.
- U14 (L2461–2462, L960–962, L4437–4492) Resource leaks: a new key-inspection element is added on every Harmonia render and never removed; tension-value and piano-roll window listeners are added on every render/open and never removed.
- U16 Dead code / unused state: `playStrum` (L421), `freqToNoteInfo` and `refinePeak` (L2778–2793), first `tonalGravity` (L3313–3322, redeclared at L3327), `allNoteSets` (L3356), `_legacySeedRoll` (L4736), `origShow`, `rlx/rly` (L2568–2569, L2767), `CHORD_LIB` alias (L782), `beatsPerChord` parameter of `writeMidi` (L1510), state fields `hwSelected`, `hwArrowMode`, `_editTarget`, `activeNotes`, `builderLastChord` (written, never read).
- U17 (L3800–3806, L3913) Returning from the piano roll to the results tries to stop global playback variables that are never set; file/piano playback continues after the return. Leaving the Analisar module also does not stop the microphone loop or playback.
- U18 (L3916–3921, L3955, L3972) Stopping clears the playhead, so the "resume from playhead" logic never applies: playback always restarts at 0.
- U19 (L4699, L4709) Roll MIDI export writes the track-name length as 12 but the text "Paleta Musical" has 14 bytes, which makes a malformed MIDI file; note-offs are sorted after note-ons at the same tick.
- U20 (L4613–4629, L4548) Live mic notes: sustain updates a separate object, so every captured note stays 0.15 s long; the live heatmap assumes 24 frames/s although it records one frame per animation frame (~60/s); live heatmap data is never reset between captures; file-analysis notes are not cleared when capture starts; the mic audio context is never closed.
- U21 (L4135–4149) Piano-roll pitch mapping is off by one: the lowest pitch (MIDI 36) cannot be shown or reached, and pointing at a pitch can hit the adjacent pitch.
- U22 (L3863) The quantize comment says eighth note ("colcheia"), but the grid is a sixteenth (beat/4). Which one is intended?
- U23 (L2842–2844, L2980) The offline FFT context is capped at 44.1 kHz while bin frequencies are computed with the file's rate; for 48 kHz files the pitch mapping may be shifted (≈ 1.5 semitones). Needs verification.
- U24 (L3563) Scale confidence is relative to the first scale; after the tie-break re-ordering, other scales can show more than 100 %.
- U25 (L3489) The status "A extrair chroma com HPS…" names HPS, which the pipeline does not use.
- U26 Language mix: "Tônica" (L1584) vs "Tónica" (L1737); "Harmônica", "Pentatônica", "diatônicos" (PT-BR) vs "diatónico", "Selecciona"/"Seleciona", "detectar"/"detetar". Which variant (PT-PT or PT-BR)?
- U27 (L124) The start-up instruction says iOS needs a tap, but the audio-unlock step happens on every platform.
- U29 (L106–107, L1261–1266, L1901) Editing a timeline chord is reachable only with a mouse (hover), not on touch; list reordering uses HTML5 drag-and-drop, which does not work on touch screens.
- U30 (L1136–1149 vs L1001–1030) Two inversion models: the chord editor inverts the current voicing (and handles extended chords with intervals > 12 oddly), while the per-chord inversion choice of the builder line inverts the original root-position pitch classes.
- U31 (L479–694 vs L1356–1508) Audio and MIDI rhythms differ: ballad audio slot ≈ 3.6 beats vs MIDI 2 beats; loop audio 1.1 beat vs MIDI 1 beat; swing and strum settings do not affect MIDI. Simples, half and loop end ("playing" state off) when the last chord starts, not when it ends.
- U32 (L1361–1362) Progression MIDI note = 12 × octave + pitch class, so the default octave 4 exports C as MIDI 48 (C3) while audio plays C4; all chord tones fold into one octave, so 9ths/11ths/13ths and inversion register are lost.
- U33 (L1615 and all scale/note sequences) Notes are played as pitch classes in one fixed octave, so scales starting above C wrap downward. Intended?
- U34 (L3480–3487) The decode fallback re-uses the file buffer after a failed decode (it may already be detached).
- U35 (L752–768) Estilos with a non-heptatonic scale (pentatonic, blues, Cromática, Bebop) maps Roman degrees onto that scale's steps (e.g. "ii" in Cromática = C#).
- U37 (L1857–1859) Playing the builder line ignores rhythm and BPM (fixed 1.7 s per chord) and cannot be stopped.
- U38 (L1861) The builder MIDI download uses the Estilos rhythm and BPM; the Construtor sub-module has no rhythm/BPM settings of its own.
- U39 (L697–719) `_progPlayTimer` is never assigned; starting a new progression while one plays can leave the old step chain running (both play together), because the stop flag is set back to "playing" at once.
