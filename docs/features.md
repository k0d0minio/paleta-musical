# Paleta Musical — clean-room feature list

Source: `paleta-musical-v12.html` (4743 lines, read in full, lines 1–4743).

## 1. Summary

Paleta Musical is a single-page, dark-themed music-theory toy in Portuguese, for beat makers and hobby musicians who want to hear and explore notes, scales, chords and chord progressions without reading notation. It synthesises all sound in the browser (triangle-wave synth), with no samples.
It has six top tabs: **Paleta** (12-note palette with scale / chord / free / detect modes), **Progressões** (genre progression library + chord builder + a shared "timeline" with rhythm playback and MIDI export), **Infinito** (endless random chord generator), **Acordes** (chord detector from selected notes), **Harmonia** (circle-of-fifths wheel) and **Analisar** (audio-file key/scale/chord analysis plus a piano-roll note editor with microphone capture and MIDI export).
A global octave control and a persistent "last chord" bar sit under the navigation. Nothing is persisted between sessions.

## 2. Features

- F001 [audio] Start-up: On page load a full-screen overlay covers the app (above everything else) with a 🎹 icon, the title "Paleta Musical", the text "O iOS exige um toque para ativar o áudio. Toca no botão para começar." (iOS needs a tap to enable audio. Tap the button to start.), a button "▶ Toca aqui para ativar o som" (Tap here to enable sound) and a footer "mp3 · escalas · acordes · piano roll".
- F002 [audio] Start-up: A click or touch-end anywhere on the overlay (not only on the button) creates/resumes the audio context, plays a 1-sample silent buffer to unlock audio, and hides the overlay permanently for the session.
- F003 [audio] Start-up: Until audio is unlocked, the first touchstart or mousedown anywhere on the page also unlocks audio (the overlay stays visible until it is itself tapped).
- F004 [audio] Start-up: Every sound request resumes a suspended audio context before scheduling sound; if resume fails, the sound is still attempted (errors are silent).
- F005 [audio] Start-up: The overlay button grows to 104 % and its glow intensifies on mouse hover.
- F006 [ui] Start-up: After the overlay closes, the app opens on the Paleta tab, in "Escala" mode, tonic C, scale "Maior", tension spectrum at 30 %, octave 4.
- F007 [audio] Sound engine: A single note is a triangle oscillator at f = 440 × 2^((pitchClass − 9 + (octave − 4) × 12) / 12) Hz, with gain rising linearly from 0 to the volume in 10 ms, then decaying exponentially to 0.001 at the end of its duration (default duration 1.4 s, volume 0.32).
- F008 [audio] Sound engine: A chord plays all its intervals simultaneously from the root in the current octave (intervals above 12 sound above the octave), each voice a triangle oscillator with a 15 ms linear attack then exponential decay (default duration 1.8 s, volume 0.18 per voice).
- F009 [audio] Sound engine: Single-note playback always uses the pitch class in the chosen octave (C-based octave), so a scale that does not start on C wraps down after B instead of ascending (see U33).
- F010 [audio] Sound engine: Chord voicing: a chord is played as its stored interval list ascending from its stored root/bass note; inversions are stored as re-normalised interval lists starting from the bass note.
- F011 [visual] Sound engine: "Flash": when a note sounds, the matching palette button on the Paleta page (if visible) turns solid in that note's colour, white text, scales to 109 % with a double glow, then reverts to its normal state after the flash duration.
- F012 [visual] Sound engine: "Flash" also lights the matching pill in a visible "chord notes" display (scale 115 % plus glow in its own colour) for the same duration.
- F013 [ui] Sound engine: Flash has no visible effect on pages that do not show the Paleta grid or a chord-notes display.
- F014 [nav] Global: A sticky top bar shows six tabs: "🎹 Paleta", "🎸 Progressões", "∞ Infinito", "🔎 Acordes", "🎡 Harmonia", "🎵 Analisar"; the active tab has lilac text and an indigo bottom border; inactive tabs lighten on hover.
- F015 [layout] Global: The tab row scrolls horizontally when it does not fit; the bar wraps so the octave control can drop below on narrow screens.
- F016 [nav] Global: Clicking a tab stops any progression playback (Estilos/timeline), switches page and re-renders it from state; page state (selections, lines, timeline) is kept in memory across tab switches.
- F017 [nav] Global: Clicking a tab does NOT stop the Infinito generator; it keeps playing in the background (see U13).
- F018 [state] Global: Root sync: entering Harmonia from Paleta sets the wheel tonic to the Paleta tonic; from Progressões to the Progressões key; from Infinito to the Infinito key; from Acordes or Analisar no sync.
- F019 [state] Global: Root sync: leaving Harmonia (via a tab) sets both the Progressões key and the Infinito key to the wheel tonic.
- F020 [input] Global: Octave control at the right of the bar: label "8ª", "−" button, current value (default 4), "+" button; buttons are 40×40 px.
- F021 [input] Global: The octave is clamped to 2–6; it applies to all subsequent sound and to progression MIDI export; changing it updates only the number (no re-render).
- F022 [ui] Global: Persistent chord bar under the navigation, hidden until a "last chord" exists; it shows the label "último acorde" (last chord), one coloured pill per note (sharp name), a "▶" button and a "+ Linha" button (tooltip "Adicionar à linha partilhada", add to shared line).
- F023 [audio] Global: Chord-bar "▶" replays the last chord: the first note is the root, the others are placed within the octave above it (0–11 semitones), played in the current octave and flashed for 1.5 s.
- F024 [state] Global: Chord-bar "+ Linha" appends the last chord to the shared timeline as a chord named "<first note>?" with type "?" and its pitch-class intervals sorted ascending (see U09).
- F025 [state] Global: The "last chord" is set by every action that updates a chord-notes display (listed per page below); it persists across tabs and the bar stays visible on every page.
- F026 [visual] Paleta: Title "Notas & Acordes" in Playfair Display with a lilac→indigo→sky gradient text fill.
- F027 [ui] Paleta: Mode pills, centred: "🎼 Escala", "🎸 Acorde", "🎹 Livre", "🔍 Detetar"; the active one has an indigo border and tinted background.
- F028 [ui] Paleta: A "Tônica" (tonic) select lists the 12 notes as "<PT name> (<letter>)", e.g. "Dó (C)"; it is hidden in Detetar mode.
- F029 [ui] Paleta: Palette: 12 square buttons in a 6-column grid (2 rows), C to B, each showing the sharp name (large) and the Portuguese name (small, e.g. "Dó#").
- F030 [visual] Paleta: A highlighted palette note has a 2 px border in its note colour, a 22 % tint of that colour, white text and a soft glow; a non-highlighted note is near-transparent with dim violet text.
- F031 [audio] Paleta: Clicking any palette note plays it in the current octave and flashes it for 0.7 s, in every mode.
- F032 [ui] Paleta/Escala: Escala mode shows the Tônica select and an "Escala" select listing all 19 scales (reference table R3).
- F033 [visual] Paleta/Escala: Notes of the selected scale on the selected tonic are highlighted.
- F034 [ui] Paleta/Escala: Tension spectrum bar (Escala and Acorde modes): label "Espectro de tensão — dentro da escala ◄──► cromático", a 6-segment bar (green, sky, indigo, yellow, orange, red), a white round thumb at the current value, and a status text under it.
- F035 [input] Paleta/Escala: Pressing or dragging (mouse or touch) on the spectrum bar sets the value 0–1 from the horizontal position; the thumb and segments update live while dragging.
- F036 [visual] Paleta/Escala: Spectrum segment i (1–6) is fully opaque when i/6 ≤ value, else 18 % opacity.
- F037 [ui] Paleta/Escala: Spectrum status text: < 20 % "🟢 Consonante"; < 45 % "🔵 Colorido"; < 70 % "🟡 Tensão moderada"; otherwise "🔴 Alta tensão".
- F038 [visual] Paleta/Escala: In Escala mode, when the spectrum is above 45 %, notes outside the scale get a red-tinted border, faint red background and pink text ("tension notes"); palette recolouring is applied 80 ms after the last drag movement.
- F039 [ui] Paleta/Escala: Scale panel header "<tonic> <scale> — <n> notas" with buttons "▶ Tocar escala" and "🎡 Ver na Roda".
- F040 [audio] Paleta/Escala: "▶ Tocar escala" plays the scale notes one by one, 280 ms apart, each flashed 0.6 s.
- F041 [nav] Paleta/Escala: "🎡 Ver na Roda" opens the Harmonia page with the wheel tonic set to the Paleta tonic (see U07).
- F042 [ui] Paleta/Escala: The scale panel lists the scale notes as numbered coloured pills, "1. Dó", "2. Ré", ….
- F043 [ui] Paleta/Escala: When the spectrum is above 45 %, a section "Notas de tensão (fora da escala)" lists every note outside the scale as red pills (Portuguese names); it appears/disappears live while dragging.
- F044 [ui] Paleta/Escala: For the 8 modal scales that have chord qualities (R5) and exactly 7 notes, a section "Acordes diatônicos" shows 7 chord buttons labelled note + suffix ("" major, "m" minor, "°" dim, "+" aug).
- F045 [audio] Paleta/Escala: A diatonic chord button plays that triad, flashes its notes 1.8 s and sets it as the last chord (chord bar).
- F046 [ui] Paleta/Acorde: Acorde mode shows the Tônica select and a "Tipo" select listing all 24 chord types (R4), each labelled "<tonic><type>", e.g. "CMaj7".
- F047 [visual] Paleta/Acorde: The notes of the selected chord are highlighted on the palette; out-of-chord notes never get the tension colouring in this mode.
- F048 [ui] Paleta/Acorde: Chord panel header "<tonic><type> — <n> notas" with "▶ Tocar" and "🔎 Detetar Acorde".
- F049 [audio] Paleta/Acorde: "▶ Tocar" plays the chord and flashes its notes 1.8 s (it does not update the chord bar).
- F050 [nav] Paleta/Acorde: "🔎 Detetar Acorde" opens the Acordes page with the chord's notes preselected (see U07).
- F051 [ui] Paleta/Acorde: The chord panel shows a chord-notes display: one pill per chord note with sharp name and Portuguese name.
- F052 [ui] Paleta/Acorde: Section "Inversões" with one button per chord note: "Fundamental", "1ª inversão", "2ª inversão", …
- F053 [audio] Paleta/Acorde: An inversion button rotates the interval list (moved notes +12), plays it from the new bass note and flashes the notes 1.8 s.
- F054 [ui] Paleta/Acorde: Section "Versões alteradas (tensão)", visible only when the spectrum is above 45 % (toggles live while dragging), with four red buttons "<tonic><type>(b9)", "(#11)", "(b13)", "(alt)".
- F055 [audio] Paleta/Acorde: Each altered button plays a fixed interval set from the tonic: b9 = 0,4,7,10,13; #11 = 0,4,7,10,18; b13 = 0,4,7,10,20; alt = 0,4,6,10,13, flashed 1.8 s (see U10).
- F056 [input] Paleta/Livre: In Livre (free) mode, clicking a palette note toggles it in/out of a selection (order of selection kept) and highlights selected notes.
- F057 [ui] Paleta/Livre: When at least one note is selected, a panel shows "Selecionadas: Dó · Mi · …" with "▶ Tocar" and "✕".
- F058 [audio] Paleta/Livre: Livre "▶ Tocar" plays the selected notes in selection order, 300 ms apart, each flashed 0.6 s.
- F059 [input] Paleta/Livre: Livre "✕" clears the selection.
- F060 [ui] Paleta/Livre: The Livre panel shows "Escalas: <root> <scale>, …" with the first 3 scales that contain all selected notes (fewest notes first), or "Nenhuma escala comum" (no common scale).
- F061 [input] Paleta/Detetar: In Detetar (detect) mode, clicking a palette note toggles it in/out of the detection set and highlights it.
- F062 [ui] Paleta/Detetar: Detect panel header: "Clica nas notas para detetar a escala" when empty, else "Notas: Dó · Mi · …" plus a "✕ Limpar" button that clears the set.
- F063 [ui] Paleta/Detetar: With no notes, the panel shows the hint "Seleciona 2 ou mais notas na paleta".
- F064 [ui] Paleta/Detetar: With ≥ 1 note, a section "✅ Escalas compatíveis (<n>)" lists up to 8 scales (all 19 × 12 roots) that contain every selected note, sorted by fewest scale notes; each row shows "<root> <scale>", its notes "C · D · E …" and a "▶" button.
- F065 [audio] Paleta/Detetar: A compatible-scale "▶" plays that scale's notes 260 ms apart, flashed 0.6 s.
- F066 [ui] Paleta/Detetar: With ≥ 3 notes, a section "〜 Escalas parciais" shows up to 6 pills "<root> <scale> (<matched>/<total>)" for scales that contain at least 70 % (rounded up) but not all selected notes.
- F067 [error] Paleta/Detetar: If no scale matches at all, the panel shows "Nenhuma escala encontrada" in red.
- F068 [visual] Progressões: Title "Progressões" with a pink→magenta→violet gradient.
- F069 [ui] Progressões: Sub-tab pills "📚 Estilos" (default) and "🔨 Construtor".
- F070 [ui] Progressões/Estilos: Hint line: "Clica nos acordes para ouvir · ✏ para editar · Botão direito na linha para remover" (see U04).
- F071 [ui] Progressões/Estilos: Selects "Tom" (key; 12 notes as "Dó (C)") and "Escala" (19 scales); defaults C and "Maior".
- F072 [ui] Progressões/Estilos: Genre pills for the 12 styles of R6 (default "Pop"); the active pill uses that style's border/background/text colours (R8).
- F073 [state] Progressões/Estilos: Changing key, scale or style resets all per-chord inversion choices on the style cards.
- F074 [ui] Progressões/Estilos: Card "Notas do acorde seleccionado" with a chord-notes display; placeholder "— toca um acorde para ver as notas —".
- F075 [ui] Progressões/Estilos: Rhythm card titled "🥁 Ritmo — 12 estilos" with a grid of 12 rhythm buttons (icon, label, description; R9); default "Simples"; the active one is indigo-highlighted.
- F076 [input] Progressões/Estilos: Estilos BPM slider 40–220 (default 90) with the numeric value shown at the right; it updates the value live without re-render.
- F077 [input] Progressões/Estilos: When rhythm "Swing" is active, a slider "Feel swing" 50–75 % (step 1, default 67 %) sets the long-beat share of the swing pair.
- F078 [input] Progressões/Estilos: When rhythm "Rasguejo" is active, a slider "Velocidade strum" 10–120 ms (step 5, default 40 ms) sets the delay between strummed strings.
- F079 [input] Progressões/Estilos: When rhythm "Loop" is active, a slider "Repetições" 1–8 (default ×1) sets how many times the progression repeats.
- F080 [ui] Progressões/Estilos: When an arpeggio rhythm is active, a slider "Velocidade notas" 30–200 ms (initial = 60000/BPM/2) and the hint "Dica: ajusta o BPM para controlar a velocidade do arpejo" are shown (the slider has no effect; see U05).
- F081 [ui] Progressões/Estilos: Section "🔄 Inversões — aplica a todos os acordes da linha" with buttons "Fund.", "1ª inv", "2ª inv", "3ª inv" (see U06 for their actual effect on the timeline and builder line).
- F082 [ui] Progressões/Estilos: One card per progression of the selected style: name (e.g. "I–V–vi–IV"), description, "▶ Tocar" and "+ Linha" buttons, and a row of chord chips.
- F083 [state] Progressões/Estilos: Each Roman numeral is resolved against the selected key and scale (rules in R7); chips show "<note><q>" where q is "7" for 4-note chords, "m" for minor, "" otherwise, plus the Roman numeral below.
- F084 [visual] Progressões/Estilos: Chips for chromatic/borrowed chords (special numerals in R7) have a red border/background and pink name ("tension").
- F085 [audio] Progressões/Estilos: Clicking a chip plays its chord (with its chosen inversion), flashes it 1.8 s and sets it as the last chord.
- F086 [ui] Progressões/Estilos: Under each chip, inversion buttons "F", "1ª", "2ª", "3ª" (one per distinct pitch class, max 4); tooltip "<label> — <notes>"; the active inversion is highlighted.
- F087 [audio] Progressões/Estilos: An inversion button plays that inversion, flashes it 1.6 s, updates the last chord, and stores the inversion for that chip; "F" returns to root position; the chip shows the inversion label (e.g. "1ª") next to the name.
- F088 [audio] Progressões/Estilos: Card "▶ Tocar" plays the whole progression (with chosen inversions) using the Estilos rhythm, BPM and octave; the button changes to "⏹" (red) on the playing card.
- F089 [audio] Progressões/Estilos: Pressing "⏹" stops playback; playback also ends by itself after the last step, and the button returns to "▶ Tocar".
- F090 [visual] Progressões/Estilos: During card playback the chip currently sounding gets the "playing" style (indigo border, stronger tint, 107 % scale, glow); notes flash on chord-notes displays.
- F091 [state] Progressões/Estilos: Card "+ Linha" appends all chords of the progression (root position, ignoring chosen inversions) to the shared timeline (see U08).
- F092 [ui] Progressões/Estilos: The shared timeline (see "Shared timeline") is shown below the style cards.
- F093 [audio] Rhythm engine: Starting a playback first stops any current progression playback (see U39); an empty chord list does nothing.
- F094 [audio] Rhythm engine: Each rhythm schedules its steps with timers and checks before each step whether playback is still on; stopping silences further steps (already started notes ring out).
- F095 [audio] Rhythm engine: The exact per-rhythm timing, voicing and volumes are given in R9; every chord step flashes its notes and highlights the sounding chord.
- F096 [audio] Rhythm engine: When playback ends naturally, the page re-renders to show the idle play button.
- F097 [ui] Progressões/Construtor: Input-mode pills "📋 Lista" (default) and "🎹 Detetar"; switching mode clears the builder's detection notes.
- F098 [ui] Progressões/Construtor: Lista mode: selects "Tónica" (12 notes "Dó (C)") and "Tipo" (24 types labelled "<tonic><type>"); defaults C, "Maior".
- F099 [state] Progressões/Construtor: Lista mode button "+ Adicionar <tonic><type>" appends that chord (root position) to "A minha progressão" and refreshes suggestions.
- F100 [audio] Progressões/Construtor: Lista mode "▶" previews the selected chord (flash 1.6 s) without adding it.
- F101 [ui] Progressões/Construtor: Detetar mode card "🎹 Clica nas notas para detetar o acorde" with a mini 6-column palette of 12 note buttons (sharp names), selected ones highlighted in their colour.
- F102 [input] Progressões/Construtor: Clicking a mini-palette note toggles it; adding a note also plays it (removing is silent).
- F103 [ui] Progressões/Construtor: When notes are selected, a row "Notas:" shows clickable pills (click removes that note) and a "✕" that clears all.
- F104 [ui] Progressões/Construtor: With fewer than 2 notes the card shows "Seleciona pelo menos 2 notas".
- F105 [ui] Progressões/Construtor: With ≥ 2 notes, detected chords are listed (chord detection rules in R10): up to 6 exact matches; if fewer than 3 exact, partial matches fill up to 3 cards in total; heading "✅ Acordes detetados:" if any exact, else "〜 Possíveis:".
- F106 [error] Progressões/Construtor: If no chord matches, the card shows "Nenhum acorde reconhecido" in red.
- F107 [ui] Progressões/Construtor: Each result card shows the root (in its colour) and type, a "▶" preview button (tooltip "Ouvir sem adicionar"), the chord's notes as small pills (selected notes brighter), and a full-width "+ Preparar" (stage) button.
- F108 [audio] Progressões/Construtor: Result "▶" plays the chord, flashes it 1.6 s and sets it as the last chord, without adding it.
- F109 [state] Progressões/Construtor: "+ Preparar" stages the chord (plays it and sets it as the last chord); that card's button becomes "✅ Confirmar +" and a banner "A preparar: <root><type>" appears above the line with "✅ Adicionar" and "✕ Cancelar".
- F110 [state] Progressões/Construtor: "✅ Confirmar +" or banner "✅ Adicionar" appends the staged chord to the line, clears the detection notes and the staging, and plays the chord.
- F111 [state] Progressões/Construtor: Banner "✕ Cancelar" clears the staging only.
- F112 [ui] Progressões/Construtor: Card "🎵 A minha progressão" shows the builder line; when empty it shows "Clica num acorde para começar" in italics.
- F113 [ui] Progressões/Construtor: When the line is not empty, header buttons: "▶ Tocar", "→ Linha", "⬇ MIDI", "🗑".
- F114 [audio] Progressões/Construtor: Builder "▶ Tocar" plays each chord in order, 1.7 s apart, flashing 1.6 s and updating the last chord (no rhythm, no stop; see U39).
- F115 [state] Progressões/Construtor: Builder "→ Linha" appends the whole builder line to the shared timeline.
- F116 [midi] Progressões/Construtor: Builder "⬇ MIDI" downloads a MIDI file of the builder line using the Estilos rhythm and BPM (see "MIDI export (progressions)" and U40).
- F117 [state] Progressões/Construtor: Builder "🗑" clears the line.
- F118 [ui] Progressões/Construtor: Each line chord shows a drag handle "⠿", an orange round "✏" edit badge at its top-left, a card with the chord name and "<position> · <inversion label>", inline inversion buttons "F/1ª/2ª/3ª" (for chords with ≥ 2 distinct pitch classes), and a column of "←", "→", "✕" buttons.
- F119 [audio] Progressões/Construtor: Clicking a line chord plays it, flashes it 1.8 s and sets it as the last chord.
- F120 [state] Progressões/Construtor: Inline inversion buttons replace that chord with the chosen inversion of its original root-position chord (bass note and colour change, name unchanged, label "1ª"/"2ª"/"3ª" shown), and play it.
- F121 [state] Progressões/Construtor: "←" moves the chord one place earlier, "→" one place later; at the ends the button is shown at 25 % opacity and does nothing.
- F122 [state] Progressões/Construtor: "✕" removes the chord from the line.
- F123 [input] Progressões/Construtor: Line chords can be reordered by desktop drag-and-drop: the dragged row turns 40 % opaque, a 2 px indigo drop line shows the target position, and dropping moves the chord there.
- F124 [ui] Progressões/Construtor: Under a non-empty line: hint "⠿ arrasta · ← → move · ✕ elimina · ✏ edita · F/1ª/2ª/3ª = inversões".
- F125 [ui] Progressões/Construtor: Card "Notas do acorde" with a chord-notes display of the last chord.
- F126 [ui] Progressões/Construtor: Card "💡 Sugestões de próximo acorde" (empty line: "💡 Adiciona um acorde para ver sugestões" and "Adiciona um acorde à linha para ver sugestões inteligentes").
- F127 [ui] Progressões/Construtor: Up to 10 suggestion chips are shown, each with root, type, the reason text before any "(", and a 5-star rating (★ for round(strength) capped at 5, rest ☆); chip border/tint/text use the root's colour; hovering lifts the chip 2 px.
- F128 [state] Progressões/Construtor: Suggestions are computed from the last chord of the line with the rules of R11 (see U01 for the current defect).
- F129 [state] Progressões/Construtor: Clicking a suggestion plays it, flashes it 1.8 s, sets it as the last chord, appends it to the line, and sets the Lista selects to its root and type.
- F130 [ui] Progressões/Construtor: The shared timeline is shown below the builder.
- F131 [ui] Timeline: Card titled "📋 Linha partilhada", shown on both Progressões sub-tabs; when empty it shows "Clica em '+ Linha' para adicionar acordes" and no controls.
- F132 [state] Timeline: Chords reach the timeline from: style cards "+ Linha", builder "→ Linha", the chord-bar "+ Linha", Acordes "+ Linha", Harmonia "+ I–IV–V–I" / "+ ii–V–I"; chords append at the end; duplicates are allowed.
- F133 [ui] Timeline: When not empty: a "Ritmo" select (12 rhythms as "<icon> <label>", default "♩ Simples") and a "BPM" slider 40–220 (default 90) with value display, independent of the Estilos settings.
- F134 [audio] Timeline: Timeline "▶ Tocar" plays the timeline with the timeline rhythm/BPM and the current octave; the swing, strum-speed and repeat values come from the Estilos sliders (see U02, U03).
- F135 [midi] Timeline: Timeline "⬇ MIDI" downloads the timeline as MIDI with the timeline rhythm and BPM.
- F136 [state] Timeline: Timeline "🗑 Limpar" stops playback and empties the timeline.
- F137 [ui] Timeline: Each timeline row: drag handle "⠿" (tooltip "Arrastar para reordenar"), 1-based index, and a full-width chord pill with the name (pink if tension, else root colour) and buttons "✏" (tooltip "Editar acorde"), "←" ("Mover para trás"), "→" ("Mover para a frente"), "✕" ("Eliminar acorde").
- F138 [visual] Timeline: Tension chords in the timeline have a red border/background.
- F139 [audio] Timeline: Clicking a timeline pill plays the chord, flashes it 1.8 s and sets it as the last chord.
- F140 [state] Timeline: Timeline "←"/"→" move the chord one place; they are disabled (25 % opacity) on the first/last item.
- F141 [state] Timeline: Timeline "✕" removes the chord.
- F142 [input] Timeline: Timeline rows reorder by desktop drag-and-drop with the same 40 % opacity and indigo drop-line feedback as the builder.
- F143 [ui] Timeline: The timeline "✏" badge is invisible until the pill is hovered (see U29).
- F144 [ui] Timeline: Hint under the timeline: "⠿ arrasta · ← → move · ✕ elimina · ✏ edita · clica para ouvir".
- F145 [ui] Edit modal: "✏" opens a centred modal over a 75 % black, 4 px blurred backdrop: title "✏️ Editar / Substituir Acorde" and a "✕" close button; max width 380 px, 90 vw, max height 85 vh with vertical scroll.
- F146 [ui] Edit modal: Modal shows "Acorde actual" and the chord name in the root colour.
- F147 [ui] Edit modal: Section "✏️ Alterar este acorde": a root select (12 notes) and a type select (24 types), preselected to the chord, and a button "✅ Aplicar alteração".
- F148 [state] Edit modal: "✅ Aplicar alteração" replaces the chord with root-position <root><type> (name "<root><type>"), closes the modal and plays it (flash 1.8 s).
- F149 [ui] Edit modal: Section "🔃 Inversões — clica para ouvir e aplicar": up to 4 buttons "Fundamental", "1ª Inversão", "2ª Inversão", "3ª Inversão", each showing its notes "E · G · C"; the one matching the current voicing is highlighted.
- F150 [state] Edit modal: An inversion button replaces the chord with that inversion of its current voicing (bass note becomes the root), closes the modal and plays it.
- F151 [ui] Edit modal: Section "🔄 Substituições sugeridas — clica para substituir": a 2-column grid of up to 12 substitution cards (root+type, reason; rules in R12); cards lift on hover.
- F152 [state] Edit modal: Clicking a substitution replaces the chord with it (root position), closes the modal and plays it.
- F153 [input] Edit modal: The modal closes on "✕" or on a click on the backdrop outside the dialog; there is no keyboard shortcut.
- F154 [visual] Infinito: Title "Gerador Infinito" with a mint→blue→purple gradient; subtitle "Progressões geradas em tempo real · clica em qualquer acorde".
- F155 [ui] Infinito: Selects "Tom" (default C) and "Escala" (all 19 scales; default "Menor Natural").
- F156 [ui] Infinito: Style pills for the 9 generator styles of R13 (default "Trap"), coloured per R8.
- F157 [state] Infinito: Choosing a style also sets the BPM to that style's base BPM.
- F158 [input] Infinito: BPM slider 40–220 (default 140) with live value; a new BPM applies from the next chord.
- F159 [ui] Infinito: Full-width big button "▶ Iniciar" (style-coloured) / "⏹ Parar" (red while running).
- F160 [audio] Infinito: Start clears the display, pre-generates 16 random chords and plays the first chord after 50 ms; then one chord every beat (minor styles) or every 2 beats (other styles); each chord lasts 82 % of its slot and its notes flash for 75 % of the slot.
- F161 [state] Infinito: The queue is refilled with 8 new chords whenever fewer than 4 remain.
- F162 [state] Infinito: Changing key, scale or style while running discards the queue and plays a newly generated chord immediately.
- F163 [ui] Infinito: Display card labelled "▶ A tocar" (running) or "Pressiona Iniciar" (idle) shows the last 8 generated chords; the newest is the current one (112 % scale, strong tint, white text, glow); a "⚡" follows the name of chords with an added 7th.
- F164 [audio] Infinito: Clicking any displayed chord plays it and flashes it 1.8 s (does not change the chord bar).
- F165 [ui] Infinito: Card "NOTAS DO ACORDE ACTUAL" shows the current chord's notes as pills "<letter> <PT name>"; placeholder "— inicia o gerador para ver as notas —".
- F166 [state] Infinito: "⏹ Parar" stops the generator; the last chords stay displayed without a current highlight.
- F167 [ui] Infinito: Info card: style name in its colour, its description (R13), and "Tensão: <t>% · BPM base: <bpm> · Modo menor|Modo misto".
- F168 [state] Infinito: Random chord rule (R13): pick a scale degree by the style's weights; minor styles force the "Menor Natural" scale; chord quality and added 7th as described in R13; the chord name is "<root>" + "°" (dim) / "m" (minor) / "7" (major with 7th) / "" (major).
- F169 [visual] Acordes: Title "Detetor de Acordes" with a mint→green→yellow gradient; subtitle "Selecciona notas e descobre todos os acordes possíveis".
- F170 [ui] Acordes: Label "Selecciona as notas" over a 6-column grid of 12 square note buttons (sharp + Portuguese names); selected notes are highlighted in their colour at 104 % scale.
- F171 [input] Acordes: Clicking a note plays it and toggles it in the selection.
- F172 [ui] Acordes: Selected notes are listed as pills "<letter> <PT name>" (tooltip "clica para remover"); clicking a pill removes it; with none selected the row shows "Selecciona 2 ou mais notas acima".
- F173 [audio] Acordes: "▶ Ouvir" plays the selected notes one by one, 260 ms apart.
- F174 [input] Acordes: "✕ Limpar" clears the selection.
- F175 [ui] Acordes: With fewer than 2 notes, a centred card shows 🎵 and "Selecciona pelo menos 2 notas para descobrir os acordes possíveis".
- F176 [ui] Acordes: With ≥ 2 notes, section "ACORDES EXACTOS (<n>)" lists every exact match as a card in an auto-fill grid (min 150 px columns).
- F177 [ui] Acordes: Section "INTERPRETAÇÕES POSSÍVEIS (<n>)" lists up to 16 partial matches as cards at 70 % opacity (n is capped at 16).
- F178 [ui] Acordes: A result card shows the root (colour) and type, a "▶" button, the chord notes as pills (selected notes brighter), and buttons "+ Linha" and "+ Construtor"; cards lift on hover.
- F179 [audio] Acordes: Card "▶" plays the chord and flashes it 1.8 s; clicking the card body does the same and also sets it as the last chord.
- F180 [state] Acordes: Card "+ Linha" appends the chord (root position, name "<root><type>") to the shared timeline and stays on the page.
- F181 [nav] Acordes: Card "+ Construtor" appends the chord to the builder line and opens Progressões → Construtor (see U07).
- F182 [error] Acordes: If no chord matches, a card shows "Nenhum acorde reconhecido para esta combinação" (red) and "Experimenta adicionar ou remover notas".
- F183 [visual] Harmonia: Title "Roda da Harmonia" with a yellow→amber→pink gradient.
- F184 [ui] Harmonia: Instruction banner "Como usar a roda" with 5 lines (outer ring = 12 major keys in fifths; inner ring = relative minors; click a sector to choose the tonic; hover to see chord and notes; arrows show harmonic relations) and a "✕" that hides it until the page re-renders.
- F185 [layout] Harmonia: Wheel (max 340 px wide, centred) and info panel (min 220 px) sit side by side and wrap to a stacked layout on narrow screens.
- F186 [visual] Harmonia: SVG wheel (viewBox 340×340): dark background disc, outer ring of 12 major-key sectors in circle-of-fifths order starting with C at the top, clockwise; inner ring with each key's relative minor; centre disc with the tonic.
- F187 [visual] Harmonia: Outer sector fill: tonic 80 % of its note colour plus a glowing outline; dominant (next clockwise) amber 25 %; subdominant (previous) green 20 %; others 14 % of their note colour; the tonic label is larger and white.
- F188 [visual] Harmonia: Inner sectors show "<minor>m" labels; only the sector under the tonic is highlighted (45 %); others 10 %.
- F189 [visual] Harmonia: Three curved arrows inside the inner ring: amber from dominant to tonic, green from subdominant to tonic, indigo from tonic to its relative minor position, each with an arrowhead.
- F190 [visual] Harmonia: Centre disc outlined in the tonic colour shows the tonic name (large) and the word "tónica" (see U15).
- F191 [ui] Harmonia: Legend below the wheel: amber "V (dominante)", green "IV (subdominante)", indigo "vi (relativa m.)".
- F192 [input] Harmonia: Hovering an outer sector lightens it to 40 % and shows a tooltip following the mouse: "<key> Maior", its role ("🎯 Tónica activa", "⚡ Dominante (V)", "🌿 Subdominante (IV)" or "Tonal"), the triad notes as coloured chips, and "Clica para selecionar"; the tooltip stays inside the window horizontally.
- F193 [audio] Harmonia: Clicking an outer sector plays its major triad (flash 1.2 s) and makes it the tonic (whole page updates).
- F194 [input] Harmonia: Hovering an inner sector shows a tooltip "<minor>m", "Relativa menor de <key>", its triad chips and "Clica para ouvir".
- F195 [audio] Harmonia: Clicking an inner sector plays the minor triad (flash 1.2 s) and sets it as the last chord, without changing the tonic.
- F196 [ui] Harmonia: Key card: tonic name, "Maior", "Relativa: <minor>m · <n> #|♭" (key signature count from R14) and a "▶ Tríade" button that plays the tonic triad (flash 1.5 s, sets last chord).
- F197 [ui] Harmonia: Section "Acordes vizinhos na roda": three cards IV (subdominant, "sub-dominante"), V (dominant, "dominante → tensão"), vi (relative minor, "relativa menor"); each plays its triad (flash 1.5 s) and sets the last chord; hover lifts.
- F198 [ui] Harmonia: Section "Acordes da escala de <tonic> maior": 7 chips with Roman numeral (I ii iii IV V vi vii°), note name and quality mark (M, m, °); click plays the triad and sets the last chord; hint "Clica em cada acorde para ouvir".
- F199 [ui] Harmonia: Section "Cadências — ouves a diferença?": four rows "V → I" ("Perfeita (tensão→repouso)"), "IV → I" ("Plagal (suave, 'amém')"), "ii → V → I" ("Jazz / clássica"), "I → vi → IV → V" ("Pop (a mais usada!)"), each with a "▶" button.
- F200 [audio] Harmonia: A cadence "▶" plays its chords 1.3 s apart (flash 1.1 s, each updating the last chord); ii is a minor triad on tonic+2, V in "ii → V → I" is a dominant 7th, all others are triads.
- F201 [ui] Harmonia: Section "Enviar para progressões →" with "📚 Ver estilos em <tonic>", "+ I–IV–V–I", "+ ii–V–I".
- F202 [nav] Harmonia: "📚 Ver estilos em <tonic>" sets the Progressões and Infinito keys to the tonic and opens Progressões → Estilos.
- F203 [state] Harmonia: "+ I–IV–V–I" appends four major triads (I, IV, V, I; names "<note>Maior") to the timeline and opens Progressões → Estilos.
- F204 [state] Harmonia: "+ ii–V–I" appends ii minor ("<note>Menor"), V dominant 7th ("<note>Dom7", tension) and I major to the timeline and opens Progressões → Estilos.
- F205 [mobile] Harmonia: Wheel tooltips need a mouse; on touch, a tap still plays and selects.
- F206 [visual] Analisar: Title "Analisar Áudio" with a green gradient; subtitle "Carrega um ficheiro mp3 ou wav para detetar notas, escala e acordes".
- F207 [input] Analisar: Upload zone (dashed border card) with 🎵, "Clica para escolher ficheiro" and "mp3 · wav · m4a · ogg"; a click anywhere on the zone opens the file picker (accepts audio/* and .mp3 .wav .ogg .m4a .aac .flac).
- F208 [input] Analisar: Dragging a file over the zone turns its border green and tint stronger; leaving reverts; dropping a file starts the analysis.
- F209 [input] Analisar: A separate full-width button "📂 Escolher ficheiro de áudio" also opens the file picker (iOS fallback).
- F210 [ui] Analisar: Before any analysis, the results area shows "Os resultados aparecem aqui após carregar um ficheiro.".
- F211 [ui] Analisar: During analysis the results area shows ⏳, a status line (first "A descodificar <file name>…", then "A extrair chroma com HPS…", then "A calcular escalas com Krumhansl-Schmuckler…") and "<size> KB · análise harmónica multi-frame".
- F212 [error] Analisar: A file read error shows "❌ Erro ao ler o ficheiro."; a decode/analysis error shows "❌ Erro: <message>" and "Tenta um ficheiro mp3 ou wav mais curto.".
- F213 [analysis] Analisar: The file is decoded with the Web Audio decoder and analysed into a 12-bin chroma (pipeline in R16), note strengths (0–1 relative to the strongest), ranked scales (R17) and chord candidates (R18).
- F214 [state] Analisar: The last analysis result is kept in memory; returning to the Analisar tab shows it again.
- F215 [ui] Analisar: Result banner: file name, "<duration rounded> s · <sample rate> kHz" and a button "📁 Outro ficheiro" (tooltip "Carregar outro ficheiro") that discards the result and shows the empty upload page.
- F216 [ui] Analisar: Card "🎼 Notas detetadas (por energia)": the 8 strongest pitch classes as rows with name, a bar in the note colour whose width is the strength %, the % value, and a "♪" button.
- F217 [audio] Analisar: "♪" plays that note (1.2 s) and flashes it 1 s.
- F218 [nav] Analisar: If any note has strength > 20 %, buttons "🔎 Detetar acorde com estas <n> notas" (opens Acordes with those notes) and "🎹 Ver na Paleta" (opens Paleta in Livre mode with those notes selected) are shown.
- F219 [ui] Analisar: Card "🎵 Escalas mais prováveis": the top 5 scales, each with "<root> <scale>" (first row larger, stronger border), its notes "C · D · …", a confidence % (first = 100 %, others = max(20, round(score/first score × 100))), a "▶" and a "Usar" button.
- F220 [ui] Analisar: On the first scale row only, a line "⚡ tensão: <note>(<pct>%) …" lists up to 3 detected notes outside that scale with strength > 8 %, strongest first.
- F221 [audio] Analisar: Scale "▶" plays the scale notes 280 ms apart, flash 0.6 s.
- F222 [nav] Analisar: "Usar" sets the Paleta tonic and scale, the Progressões key and scale, and the Harmonia tonic to that result, then opens the Paleta tab.
- F223 [ui] Analisar: If chord candidates exist, card "🎸 Acordes detetados" shows up to 6 chips (root, type, coverage %), the first more prominent, and the hint "Clica num acorde para ouvir".
- F224 [audio] Analisar: Clicking a detected-chord chip plays it (flash 1.8 s) and sets it as the last chord.
- F225 [ui] Analisar: A full-width button "🎹 Capturar MIDI em Tempo Real" is always shown under the results; it replaces the results area with the piano-roll editor.
- F226 [ui] Piano roll: Header "🎹 Piano Roll" with subtitle "Deteção de notas com onset detection · editor completo · exportar MIDI" and a "← Voltar" button that stops the microphone and returns to the analysis results (see U17).
- F227 [ui] Piano roll: Toolbar tools: "↖ Selecionar" (default), "✏ Desenhar", "✕ Apagar"; the active tool is tinted indigo/green/red respectively.
- F228 [input] Piano roll: Toolbar BPM: "−" and "+" change the roll BPM by 5 within 40–300 (default 120), shown as "♩=<bpm>"; the grid redraws.
- F229 [state] Piano roll: "🗑 Sel." deletes all selected notes.
- F230 [state] Piano roll: "⌛ Quantizar" snaps every note start to a grid of one sixteenth note (60/BPM/4 s) and its end to the grid with a minimum length of half a grid step.
- F231 [input] Piano roll: "🌡 Freq" toggles the frequency heatmap (default on; button amber when on, grey when off).
- F232 [input] Piano roll: Play-mode toggle "🔊 Áudio" (default) / "🎹 Piano".
- F233 [audio] Piano roll: "▶ Tocar" in Áudio mode plays the original decoded file from the start; in Piano mode it plays the roll notes with the triangle synth (pitch from MIDI number, volume velocity/127 × 0.38, length × 1.1, each flashed up to 0.8 s); the button becomes "⏹ Parar" (red).
- F234 [audio] Piano roll: "⏹ Parar" stops playback; playback also stops at the end of the duration (piano mode: duration + 200 ms).
- F235 [visual] Piano roll: During playback a dashed amber playhead line moves across the roll; when it passes 90 % of the visible window, the view scrolls so the playhead is at 10 %.
- F236 [error] Piano roll: Playing with no decoded audio shows "⚠ Sem áudio — analisa primeiro um ficheiro."; piano mode with no notes shows "⚠ Sem notas — analisa primeiro um ficheiro.".
- F237 [ui] Piano roll: Source card "Fonte:" with "🔍 Analisar Ficheiro" and "🎙 Microfone ao vivo", a status line (initially "Clica em '🔍 Analisar Ficheiro' para detetar notas com timing, ou usa o microfone.") and a thin green progress bar.
- F238 [analysis] Piano roll: "🔍 Analisar Ficheiro" runs note-event detection on the decoded file (R19), disables both source buttons while running, shows "🔍 A analisar ficheiro com onset detection…" then "🔍 A processar… <pct>%" with the progress bar filling from 5 % to 95 %.
- F239 [state] Piano roll: When file analysis finishes: notes replace the roll content, BPM is set to the estimate, duration to the file length, the view to the first 20 s (or less), the status to "✅ <n> notas detetadas · BPM estimado: <bpm>", and the progress bar fills to 100 % then resets after 1.5 s.
- F240 [error] Piano roll: File analysis errors show "❌ Erro na análise: <message>"; with no decoded audio: "⚠ Buffer de áudio não disponível. Carrega o ficheiro novamente.".
- F241 [mic] Piano roll: "🎙 Microfone ao vivo" asks for microphone access (echo cancellation, noise suppression and auto gain off); the status shows "A pedir acesso ao microfone…".
- F242 [error] Piano roll: Microphone refusal shows "❌ Microfone negado: <message>".
- F243 [mic] Piano roll: While capturing: the button becomes "⏹ Parar" (red), status "🔴 A capturar via microfone… toca o teu instrumento!", a live spectrum canvas labelled "ESPECTRO AO VIVO" appears above the roll (amber-to-green filled curve of 0–5 kHz, dB scale −140…0), and the view starts at 0–30 s.
- F244 [mic] Piano roll: Each animation frame, live pitch salience (R20) adds heatmap data and creates 0.15 s notes for pitches above threshold; notes louder than 50 % also flash on the Paleta palette; the view scrolls to keep the present 3 s from the right edge.
- F245 [mic] Piano roll: "⏹ Parar" stops the microphone, hides the spectrum, restores the button, shows "⏹ Captura parada. <n> notas capturadas." and fits the view to 0…(last note end + 1 s).
- F246 [visual] Piano roll: Roll canvas (internal 560×260 px, full width) shows MIDI 36–96 as horizontal rows: black-key rows darker, C rows slightly tinted; a 28 px piano-key column on the left with darker black keys, highlighted C keys labelled "C2"…"C7", and small labels on E, G, A, B.
- F247 [visual] Piano roll: Beat grid lines at every beat of the roll BPM; every 4th beat (bar) is stronger and numbered 1, 2, 3… at the top.
- F248 [visual] Piano roll: Heatmap (when on): each analysis frame is a vertical strip; each pitch cell is drawn in its pitch-class colour with alpha = (value/max)^0.55 × 0.72 (values under 4 % skipped), plus a soft glow from neighbouring semitones.
- F249 [visual] Piano roll: Notes are rounded rectangles in their pitch-class colour, opacity 0.55 + 0.40 × velocity/127, with a light top stripe, a coloured border, and the note letter when wide enough; selected notes have a white border, glow and a white resize handle at the right end.
- F250 [visual] Piano roll: A horizontal scrollbar under the roll shows the visible window as a thumb (min 20 px).
- F251 [audio] Piano roll: Clicking/tapping the piano-key column plays that pitch for 0.6 s.
- F252 [input] Piano roll: Select tool: click a note to select it (Shift-click adds to the selection); drag the note body to move it in time (not before 0) and pitch; holding Shift while dragging keeps the pitch.
- F253 [input] Piano roll: Select tool: pressing within the last 6 px of a note's right end and dragging resizes it (minimum 0.05 s).
- F254 [input] Piano roll: Select tool: pressing on empty space clears the selection and drags (pans) the view in time, within 0…duration.
- F255 [input] Piano roll: Draw tool: pressing creates a note at that pitch and time, half a beat long, velocity 90, selects it and plays it (0.3 s); dragging extends its end (minimum 0.05 s).
- F256 [input] Piano roll: Erase tool: clicking a note deletes it.
- F257 [input] Piano roll: Mouse wheel over the roll zooms in/out around the cursor time (×0.88 / ×1.12 per notch), minimum window 0.3 s, page does not scroll.
- F258 [input] Piano roll: Zoom bar "ZOOM:" with "＋" (window ×0.65 around centre, minimum 0.5 s), "－" (window ÷0.65, clamped to 0…duration) and "Fit" (whole duration).
- F259 [input] Piano roll: Dragging the scrollbar (mouse) scrolls the visible window across the duration.
- F260 [mobile] Piano roll: The roll supports touch: touchstart acts as press, touchmove drags/resizes/draws/pans (page scrolling is prevented only during those actions), touchend releases.
- F261 [ui] Piano roll: Card "🎼 Notas detetadas" with a count "<n> notas" and one chip per pitch class "<letter> ×<count>" sorted by count; clicking a chip selects all notes of that pitch class; empty state "Nenhuma nota ainda. Analisa o ficheiro ou usa o microfone.".
- F262 [nav] Piano roll: "🎨 Ver na Paleta" opens Paleta in Livre mode with the roll's distinct pitch classes selected (only if there are notes).
- F263 [midi] Piano roll: "⬇ Exportar MIDI" downloads "paleta-musical.mid" with the roll notes at their real times (R21) and shows "✅ MIDI exportado! <n> notas · <bpm> BPM"; with no notes it shows "Nenhuma nota para exportar.".
- F264 [state] Piano roll: "🗑 Limpar tudo" removes all notes and resets the view to 0…duration.
- F265 [midi] Progression MIDI: Progression MIDI is a format-0, single-track file, 480 ticks per quarter note, with tempo from the chosen BPM, a 4/4 time signature and the track name "Paleta Musical".
- F266 [midi] Progression MIDI: The notes follow the chosen rhythm pattern (R9, MIDI columns); note numbers are 12 × octave + pitch class (octave = the global octave, shifted −1 for bass notes), clamped to 0–127 (see U32).
- F267 [midi] Progression MIDI: The file downloads as "progressao-<rhythm key>-paleta.mid" (e.g. "progressao-simples-paleta.mid").
- F268 [layout] General: Each page is a single centred column, max 720 px wide, 16 px top and 12 px side padding; content wraps with flexbox / auto-fill grids; there are no CSS media queries.
- F269 [mobile] General: All buttons use touch-action "manipulation" (no double-tap zoom delay); octave buttons are 40×40 px.
- F270 [mobile] General: Page titles scale with viewport width (clamp 20–30 px).
- F271 [mobile] General: The file input is an invisible full-size overlay on the upload zone (not display:none) so iOS opens the picker on tap.
- F272 [visual] General: Custom thin (4 px) dark scrollbars; selects have a custom chevron and dark styling.
- F273 [a11y] General: The document language is "pt"; controls are native buttons, selects and range inputs; several buttons have tooltips (title) as listed above; there are no ARIA labels and no keyboard shortcuts.
- F274 [i18n] General: All UI text is Portuguese (mixed PT-PT and PT-BR spellings; see U26); note names show both letter (C, C#…) and Portuguese solfège (Dó, Dó#…); sharps only, no flats.
- F275 [state] General: No data is persisted: no localStorage, cookies or server; reloading the page resets everything.

## 3. Reference data

### R1 Notes, Portuguese names and note colours
| Pitch class | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Name | C | C# | D | D# | E | F | F# | G | G# | A | A# | B |
| PT | Dó | Dó# | Ré | Ré# | Mi | Fá | Fá# | Sol | Sol# | Lá | Lá# | Si |
| Colour | #FF6B6B | #FF8E53 | #FFC947 | #A8E063 | #56CCF2 | #2F80ED | #9B51E0 | #EB5757 | #F2994A | #27AE60 | #1ABC9C | #8B5CF6 |

### R2 Defaults (initial state)
| Item | Default |
|---|---|
| Tab / Paleta mode | Paleta / Escala |
| Paleta tonic, scale, chord type | C, Maior, Maior |
| Spectrum | 0.30 |
| Global octave | 4 (range 2–6) |
| Estilos key, scale, style, rhythm, BPM | C, Maior, Pop, simples, 90 |
| Timeline rhythm, BPM | simples, 90 |
| Swing feel, strum speed, loop repeats | 0.67, 40 ms, 1 |
| Progressões sub-tab, builder input mode | estilos, lista |
| Builder tonic, type | C, Maior |
| Infinito key, scale, style, BPM | C, Menor Natural, Trap, 140 |
| Harmonia tonic | C |
| Piano roll BPM, tool, heatmap, play mode | 120, select, on, Áudio |
| Piano roll duration / visible window before any analysis | 10 s / 0–10 s |

### R3 Scales (semitones from tonic, in menu order)
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

### R4 Chord types (semitones from root, in menu order)
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

### R5 Diatonic chord qualities per scale degree (Paleta "Acordes diatônicos")
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

### R8 Style colours (border, background, text)
| Style | Border | Background | Text |
|---|---|---|---|
| Trap, Dark, Latin | #EF4444 | rgba(239,68,68,0.18) | #FCA5A5 |
| Hip Hop, Flamenco, Soul, R&B / Soul | #F59E0B | rgba(245,158,11,0.18) | #FDE68A |
| Pop, Épico | #EC4899 | rgba(236,72,153,0.18) | #F9A8D4 |
| Jazz | #10B981 | rgba(16,185,129,0.18) | #6EE7B7 |
| Blues, Relaxante | #3B82F6 | rgba(59,130,246,0.18) | #93C5FD |
| Clássico, Dramático | #8B5CF6 | rgba(139,92,246,0.18) | #C4B5FD |
| Cinematográfico | #6366F1 | rgba(99,102,241,0.18) | #A5B4FC |
| Aleatório, Metal | #6B7280 | rgba(107,114,128,0.18) | #D1D5DB |
| House / EDM | #06B6D4 | rgba(6,182,212,0.18) | #67E8F9 |

### R9 Rhythms (beat = 60/BPM s; "upper" = chord without its root; volumes per voice)
| Key | Label (icon) | Description | Audio playback | MIDI (vel; dur in beats) |
|---|---|---|---|---|
| simples | Simples (♩) | Um acorde por beat | 1 chord per beat, dur 0.85 beat, vol 0.18 | chord each beat, vel 90, dur 0.85 |
| arpejo | Arpejo ↑ (🎼) | Notas uma a uma ascendente | 1 note per ½ beat in interval order, dur 0.55 beat, vol 0.26 | same, vel 78, dur 0.45 |
| arpejo-down | Arpejo ↓ (🎼) | Notas uma a uma descendente | as arpejo, reversed | as arpejo, reversed |
| arpejo-ud | Arpejo ↑↓ (〰) | Arpejo sobe e desce | up then down per chord (top note repeated), ½ beat each, dur 0.5 beat, vol 0.24 | up+down, vel 75, dur 0.45 |
| swing | Swing (🎷) | Ternário jazz | per chord (1 beat): full chord at 0 (dur 1.5 beat, vol 0.18); upper notes one octave lower at swing×beat (dur 0.7×(1−swing) beat, vol 0.10) | swing fixed 0.67: chord vel 88 dur 0.95×0.67; ghost vel 45 |
| ballad | Balada (🌙) | Lento com sustain | chord slot = 2 × 60/(0.55×BPM) s; bass root octave −1 (vol 0.33, dur 0.9 slot); upper notes +160 ms (vol 0.18, dur 0.8 slot) | 2 beats per chord; bass vel 85 dur 1.7; upper at 0.4 beat vel 70 dur 1.5 |
| funk | Funk (🎸) | Sincopado e agressivo | hits at 0, ½, 1, 1½ beat; next chord at 2 beats; hit 1 dur 0.4 beat, others 0.2; vol 0.22 (hits 1, 3) / 0.10 (2, 4) | same; vel 88/45/88/45 |
| strum | Rasguejo (🎵) | Strumming guitarra | 4 strokes per chord, 1 per beat, directions up-up-down-up (ascending, ascending, descending, ascending), strings offset by strum speed, vol 0.20, dur 0.9 beat | strings 0.04 beat apart; vel 85 for first, then max(55, 85 − 8×i); dur 0.85 |
| bossa | Bossa Nova (🌴) | Síncopa bossa nova | per chord (2 beats): bass oct −1 at 0 (dur 1.8, vol 0.30); upper at 0.4 (dur 0.6, vol 0.14); bass at 1 (dur 0.8, vol 0.25); upper at 1.5 | bass vel 82 dur 1.7; upper vel 65 dur 0.55; bass vel 75 dur 0.75; upper vel 62 |
| waltz | Valsa (💃) | 3/4 — forte leve leve | per chord (3 beats): bass oct −1 (dur 1.2, vol 0.32); upper on beats 2 and 3 (dur 0.6, vol 0.12) | bass vel 85 dur 1.1; upper vel 60, 55 dur 0.6 |
| half | Half-Time (🥁) | Batida espaçada (2 em 4) | 1 chord per 2 beats, dur 1.8 beats | vel 90 dur 1.8 |
| loop | Loop (↺) | Repete N vezes | 1 chord per 1.1 beat, dur 0.94 beat, whole progression repeated N times | 1 chord per beat ×N, vel 90 dur 0.85 |

Flash durations: simples/loop 0.75 slot, arpeggios 0.75–0.8 note slot, swing 0.9 long part, ballad 0.7 slot, funk 0.9 hit, strum 0.8 beat, bossa 1.8 beat, waltz 1.1 beat, half 0.8 slot.

### R10 Chord detection from notes (Acordes page and builder Detetar)
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

### R12 Substitutions (edit modal), in insertion order with strength
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
Chord rule: scale = "Menor Natural" if Minor, else the selected scale; degree index d (0-based) is drawn with the first min(scale size, 8) weights. "Forced minor" = Minor style and random < 0.8. Minor triad if forced minor or d ∈ {1, 2, 5}; diminished if not forced minor and d = 6; else major. With probability "tension", add interval 10 and mark ⚡. Chord slot = 1 beat (Minor styles) or 2 beats.

### R14 Harmonia data
- Circle order (clockwise from top): C G D A E B F# C# G# D# A# F.
- Relative minors: C→A, G→E, D→B, A→F#, E→C#, B→G#, F#→D#, C#→A#, G#→F, D#→C, A#→G, F→D.
- Key signature shown (count and sign): C 0 #, G 1 #, D 2 #, A 3 #, E 4 #, B 5 #, F# 6 #, C# 7 #, G# 4 ♭, D# 3 ♭, A# 2 ♭, F 1 ♭.
- Wheel geometry (viewBox 340): centre 170,170; background radius 165; outer ring 105–155; inner ring 75–105; arrows at radius 65; centre disc radius 48; sectors 30° wide, first sector centred at the top.
- Arrow colours: dominant #F59E0B, subdominant #34D399, relative #818CF8.
- Cadences: V→I (both triads); IV→I; ii (minor, tonic +2) → V7 (dom7) → I; I → vi (minor) → IV → V.

### R15 Synth and timing constants
| Item | Value |
|---|---|
| Oscillator | triangle |
| Note default | 1.4 s, volume 0.32, attack 10 ms |
| Chord default | 1.8 s, volume 0.18 per voice, attack 15 ms |
| Decay | exponential to 0.001 at end |
| Scale playback spacing | 280 ms (Paleta, Analisar), 260 ms (Detetar list, Acordes "Ouvir"), 300 ms (Livre) |
| Builder line playback | 1.7 s per chord |
| Cadence playback | 1.3 s per chord |
| Spectrum segment colours | #27AE60 #56CCF2 #818CF8 #FFC947 #FF8E53 #EF4444 |
| Tension threshold | spectrum > 0.45 |

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
| Palette flash | value > 0.5, 200 ms |
| Initial duration / view | 30 s / 0–30 s |

### R21 Piano-roll MIDI export
Format 0, one track, 480 ticks per quarter note, tempo from roll BPM, program change 0 (Acoustic Grand Piano), track name "Paleta Musical"; tick = round(seconds × BPM/60 × 480); velocity clamped 1–127; file "paleta-musical.mid".

### R22 Page title gradients (135°)
| Page title | Colours |
|---|---|
| Notas & Acordes | #C4B5FD #818CF8 #38BDF8 |
| Progressões | #F9A8D4 #EC4899 #8B5CF6 |
| Gerador Infinito | #6EE7B7 #3B82F6 #9333EA |
| Detetor de Acordes | #6EE7B7 #34D399 #FCD34D |
| Roda da Harmonia | #FCD34D #F59E0B #EC4899 |
| Analisar Áudio | #34D399 #059669 #10B981 |

## 4. Visual identity

- Very dark night-blue/violet background: --bg #080810, --bg2 #0D0B1A (nav), --bg3 #13102A (selects); borders --border #1E1A38, --border2 #2D2A4A.
- Accents: --acc #818CF8 (indigo), --acc2 #C4B5FD (lilac, active text), --acc3 #6366F1; text --text #E8E0FF; muted --muted #4A4670, --muted2 #6B5FBB; placeholder italics #3D3660.
- Semantic colours: tension/stop red #EF4444 / pink #FCA5A5; edit badge and staging amber #F59E0B; MIDI/analysis green #34D399 / #6EE7B7; Acorde-mode sky #38BDF8; detect yellow #FCD34D.
- Each of the 12 notes has a fixed bright colour (R1) used everywhere: palette, pills, chord names, wheel sectors, roll notes, heatmap.
- Fonts: JetBrains Mono (300/400/600) for all UI text; Playfair Display (400/700, italic 400) for page titles, which use 3-colour gradient text (R22).
- Shapes: rounded cards (14 px radius, 2.5 % white fill, thin border), pill buttons (20 px radius), square palette tiles (11 px radius); soft coloured glows on active items; short 0.1–0.3 s transitions; small hover lifts (−1/−2 px).
- Overall look: compact, dark, neon-on-navy "synth app" style with emoji icons in labels.

## 5. External dependencies

- Google Fonts stylesheet: `https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=JetBrains+Mono:wght@300;400;600&display=swap` (CSS @import).
- No JavaScript libraries, no CDN scripts, no server API.
- Browser APIs: Web Audio API (AudioContext / webkitAudioContext, OscillatorNode, GainNode, AudioBufferSourceNode, decodeAudioData, OfflineAudioContext, AnalyserNode, MediaStreamAudioSourceNode); MediaDevices.getUserMedia (microphone); FileReader; HTML5 drag-and-drop (DataTransfer) for files and list reordering; Blob + URL.createObjectURL + anchor download (MIDI files); Canvas 2D (piano roll, live spectrum; uses roundRect when available); inline SVG (wheel); requestAnimationFrame; performance.now.
- Not used: Web MIDI API, localStorage/IndexedDB, service worker, network fetch.

## 6. Unclear or dead code (questions for the client)

- U01 (L802–827) Next-chord suggestions read `rule.type`, but the rules table uses the key `t`: every suggestion becomes a major triad with type "undefined" (shown as text), suggestions with the same root collapse into one, and clicking one sets the builder type to undefined ("+ Adicionar Cundefined"). Intended behaviour is clearly the typed table in R11.
- U02 (L1232–1234 with L698–699) Timeline "▶ Tocar" sets a flag that `playProgression` immediately clears, so the timeline button never turns into "⏹ Parar" and the timeline cannot be stopped from its own button.
- U03 (L702–711, L1271) Timeline chords are not marked as playable chips; during timeline playback the "playing" highlight lands on the Estilos card chips (by global index, or on the last-played card) instead of on the timeline rows.
- U04 (L1992) The Estilos hint says "Botão direito na linha para remover" (right-click to remove), but no right-click handler exists.
- U05 (L2056–2058) The "Velocidade notas" slider does nothing; it only changes its own label.
- U06 (L2061–2088) The bulk inversion buttons ("aplica a todos os acordes da linha") change the shared timeline and the builder line, not the style cards. On the builder line the root is not moved, so the chord is transposed (C major "1ª inv" becomes C–D#–G#). On the timeline "3ª inv" on a triad moves the root up a fifth without changing intervals; repeated presses compound; chord names are not updated.
- U07 (L1616, 1645, 2341, 2747–2759, 3514, 3549–3552, 3597, 4121) In-page navigation buttons change the page without the tab logic: the nav highlight stays on the previous tab, progression playback is not stopped, and root sync is skipped.
- U08 (L2119) "+ Linha" from a style card stores type "m" or "7" (not valid chord-type keys) and ignores the inversions chosen on the card; the edit modal then cannot preselect the type.
- U09 (L1084–1090) The chord-bar "+ Linha" adds a chord named "<first note>?" with type "?", also not a valid type. Should it detect and name the chord?
- U10 (L1656) "Versões alteradas" always play dominant-7th-based sets, whatever the selected chord type, but are labelled with that type (e.g. "CMenor(b9)").
- U11 (L2211, L870) The Infinito scale filter (≥ 5 notes) excludes nothing; minor styles (Trap, Hip Hop, Dark) ignore the selected scale.
- U12 (L880) Infinito names minor or diminished chords that got a 7th without "7"; only the ⚡ shows it.
- U13 (L984–985, L866) Tab changes stop progression playback but not the Infinito generator, which keeps sounding on other tabs.
- U14 (L2461–2462, L960–962, L4437–4492) Resource leaks: a new wheel tooltip element is added to the page on every Harmonia render and never removed; spectrum and piano-roll window listeners are added on every render/open and never removed.
- U15 (L2617–2627) The word "tónica" is drawn twice in the wheel centre (one at x+12 px, one below), overlapping.
- U16 Dead code / unused state: `playStrum` (L421), `freqToNoteInfo` and `refinePeak` (L2778–2793), first `tonalGravity` (L3313–3322, redeclared at L3327), `allNoteSets` (L3356), `_legacySeedRoll` (L4736), `origShow`, `rlx/rly` (L2568–2569, L2767), `CHORD_LIB` alias (L782), `beatsPerChord` parameter of `writeMidi` (L1510), state fields `hwSelected`, `hwArrowMode`, `_editTarget`, `activeNotes`, `builderLastChord` (written, never read), CSS `.pulse`, `.hw-sep`, class `prog-playing-container` (no style).
- U17 (L3800–3806, L3913) Piano-roll "← Voltar" tries to stop global playback variables that are never set; file/piano playback continues after Back. Leaving the Analisar tab also does not stop the microphone loop or playback.
- U18 (L3916–3921, L3955, L3972) Stopping clears the playhead, so the "resume from playhead" logic never applies: playback always restarts at 0.
- U19 (L4699, L4709) Roll MIDI export writes the track-name length as 12 but the text "Paleta Musical" has 14 bytes, which makes a malformed MIDI file; note-offs are sorted after note-ons at the same tick.
- U20 (L4613–4629, L4548) Live mic notes: sustain updates a separate object, so every captured note stays 0.15 s long; the live heatmap assumes 24 frames/s although it records one frame per animation frame (~60/s); live heatmap data is never reset between captures; file-analysis notes are not cleared when capture starts; the mic audio context is never closed.
- U21 (L4135–4149) Piano-roll row mapping is off by one row: MIDI 36 is drawn below the canvas and the top row is empty; hit-testing rounds to the nearest row edge, so clicks can hit the adjacent pitch.
- U22 (L3863) Quantize comment says eighth note ("colcheia"), but the grid is a sixteenth (beat/4). Which one is intended?
- U23 (L2842–2844, L2980) The offline FFT context is capped at 44.1 kHz while bin frequencies are computed with the file's rate; for 48 kHz files the pitch mapping may be shifted (≈ 1.5 semitones). Needs verification.
- U24 (L3563) Scale confidence is relative to the first row; after the tie-break re-ordering, other rows can show more than 100 %.
- U25 (L3489) Status "A extrair chroma com HPS…" names HPS, which the pipeline does not use (cosmetic).
- U26 Language mix: "Tônica" (L1584) vs "Tónica" (L1737); "Harmônica", "Pentatônica", "diatônicos" (PT-BR) vs "diatónico", "Selecciona"/"Seleciona", "detectar"/"detetar". Which variant (PT-PT or PT-BR)?
- U27 (L124) The overlay text says iOS needs a tap, but the overlay is shown on every platform.
- U28 (L3815–3820) Tool-button tooltips are put in the style object, so no tooltip appears.
- U29 (L106–107, L1261–1266, L1901) The timeline "✏" badge is visible only on mouse hover (invisible on touch); list reordering uses HTML5 drag-and-drop, which does not work on touch screens, although the handles set touch-action:none.
- U30 (L1136–1149 vs L1001–1030) Two inversion models: the modal inverts the current voicing (and handles extended chords with intervals > 12 oddly), while the inline F/1ª/2ª/3ª buttons invert the original root-position pitch classes.
- U31 (L479–694 vs L1356–1508) Audio and MIDI rhythms differ: ballad audio slot ≈ 3.6 beats vs MIDI 2 beats; loop audio 1.1 beat vs MIDI 1 beat; swing and strum sliders do not affect MIDI. Simples, half and loop end ("playing" state off) when the last chord starts, not when it ends.
- U32 (L1361–1362) Progression MIDI note = 12 × octave + pitch class, so the default octave 4 exports C as MIDI 48 (C3) while audio plays C4; all chord tones fold into one octave, so 9ths/11ths/13ths and inversion register are lost.
- U33 (L1615 and all scale/note sequences) Notes are played as pitch classes in one fixed octave, so scales starting above C wrap downward. Intended?
- U34 (L3480–3487) The decode fallback re-uses the file buffer after a failed decode (it may already be detached).
- U35 (L752–768) Estilos with a non-heptatonic scale (pentatonic, blues, Cromática, Bebop) maps Roman degrees onto that scale's steps (e.g. "ii" in Cromática = C#).
- U36 (L1943–1950) Builder "←/→" at the ends are only faded, not disabled (timeline uses real disabled buttons).
- U37 (L1857–1859) Builder "▶ Tocar" ignores rhythm and BPM (fixed 1.7 s per chord) and cannot be stopped.
- U38 (L1861) Builder "⬇ MIDI" uses the Estilos rhythm and BPM; the Construtor tab has no rhythm/BPM controls of its own.
- U39 (L697–719) `_progPlayTimer` is never assigned; starting a new progression while one plays can leave the old step chain running (both play together), because the stop flag is set back to "playing" at once.
- U40 (L4066–4067) The roll canvas has a fixed 560×260 internal size stretched to the page width (blurry on high-DPI and wide screens).
