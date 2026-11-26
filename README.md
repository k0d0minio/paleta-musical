# Paleta Musical

A music-theory web app: hear and explore notes, scales, chords and progressions.
Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, pnpm.

- Functional spec: [`docs/features.md`](docs/features.md) (clean room: the spec is the only source).
- Library research: [`docs/research/open-source-tools.md`](docs/research/open-source-tools.md).

## Commands

| Command               | What it does                                                          |
| --------------------- | --------------------------------------------------------------------- |
| `pnpm dev`            | Dev server                                                            |
| `pnpm build`          | Production build                                                      |
| `pnpm format:check`   | Prettier (with the Tailwind class order)                              |
| `pnpm lint`           | ESLint, typescript-eslint strict and the architecture boundaries      |
| `pnpm typecheck`      | `next typegen` and `tsc --noEmit`                                     |
| `pnpm test`           | Vitest unit tests (jsdom)                                             |
| `pnpm test:browser`   | Vitest browser tests in Chromium (offline audio render)               |
| `pnpm test:e2e`       | Playwright against the build: Chromium desktop and WebKit iPhone, axe |
| `pnpm licenses:check` | Fails on GPL, LGPL, AGPL or SSPL in production dependencies           |

CI (`.github/workflows/ci.yml` and `app.yml`) runs all of them on each push and pull request. CI is the source of truth.
`/dev/design` shows the design tokens and components (not linked in the navigation).

## Architecture

```
src/
  app/        routes only (thin): one route per module, /analyse/roll, /dev/design
  shell/      app shell: providers, navigation rail and tab bar, transport bar,
              settings, shortcut help, command palette, module registry
  modules/    one folder per module; other code imports a module only through its index.ts
  nav/        goTo(): the one switch logic for every module switch and link (U07)
  theory/     pure TypeScript music theory on tonal: R1 names, R3 scales, R4 chords,
              one voicing and inversion model, "realize" to real notes (U33)
  midi/       pure Standard MIDI File model, writeSmf (format 0, 480 PPQ), readSmf
  audio/      the audio engine singleton (R15 synth voice, master gain and limiter,
              Tone.js Transport on demand) and the sounding-note bus
  input/      InputSource interface and registry; sources/: pointer and QWERTY keyboard
  state/      zustand store: global slice, timeline, builder line, module slices;
              persist to IndexedDB with version, migrate and zod validation; undo/redo
  platform/   capability detection, iOS audio session, share or download
  i18n/       next-intl without routing: messages/pt-PT.json (default) and en.json
  ui/         design system: tokens in app/globals.css, Radix-based components, music primitives
```

Layer rules (enforced by `eslint-plugin-boundaries`, proved by `tests/unit/boundaries.test.ts`):

- `theory` and `midi` are pure: no React, no DOM libraries, no audio.
- A module imports another module only through its `index.ts`.
- Modules never import an input source: they subscribe to the input registry.
- Nothing imports `app`.

Design rules:

- Colour belongs to the notes (F276). The chrome is neutral ink; the 12 note colours (`--note-0` … `--note-11`)
  keep 3:1 against the surfaces in both themes, and a note always shows its name too.
- No UI string in code: every text is in the message files.
- Every animation follows the reduced-motion setting.
