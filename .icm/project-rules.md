# Project rules

- Stack: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, pnpm, Node from `.nvmrc`.
  Next.js 16 has breaking changes: read the guide in `node_modules/next/dist/docs/` before
  you write code (`AGENTS.md`).
- Specs: `docs/features.md` and `docs/features-*.md`. Clean room: the spec is the only source.
- Architecture: see the README. `eslint-plugin-boundaries` enforces the layer rules and
  `tests/unit/boundaries.test.ts` proves them:
  - `theory` and `midi` are pure: no React, no DOM libraries, no audio.
  - A module imports another module only through its `index.ts`.
  - Modules do not import an input source: they subscribe to the input registry.
  - Nothing imports `app`.
- Design: colour belongs to the notes. Each note also shows its name. No UI string in code:
  each text is in `src/i18n/messages/pt-PT.json` (default) and `en.json`. Each animation
  obeys the reduced-motion setting.
- CI: the workflow `ci` (blueprint) runs lint, typecheck (`next typegen && tsc --noEmit`)
  and the unit tests (Vitest, jsdom). The workflow `app` (repo-owned) runs the Prettier
  check, the licence check, the Vitest browser tests and the build with Playwright e2e.
- Licences: no GPL, LGPL, AGPL or SSPL in the production dependencies.
- Commits: conventional prefix with the ticket key, for example `feat(JAM-557): ...`.
