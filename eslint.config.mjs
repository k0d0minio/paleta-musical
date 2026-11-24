import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import boundaries from "eslint-plugin-boundaries";
import tseslint from "typescript-eslint";

/**
 * Architecture layers (src/<layer>). Rules:
 * - theory, midi and analysis are pure: no React, no DOM libraries, no audio.
 * - A module imports another module only through its public index.ts.
 * - No module imports an input source directly: modules use the input registry.
 * - Routes (app) import modules; nothing imports app.
 */
const ELEMENTS = [
  { type: "app", pattern: "src/app" },
  { type: "shell", pattern: "src/shell" },
  { type: "module", pattern: "src/modules/*", capture: ["moduleName"] },
  { type: "nav", pattern: "src/nav" },
  { type: "ui", pattern: "src/ui" },
  { type: "theory", pattern: "src/theory" },
  { type: "midi", pattern: "src/midi" },
  { type: "analysis", pattern: "src/analysis" },
  { type: "audio", pattern: "src/audio" },
  { type: "input-source", pattern: "src/input/sources" },
  { type: "input", pattern: "src/input" },
  { type: "state", pattern: "src/state" },
  { type: "platform", pattern: "src/platform" },
  { type: "i18n", pattern: "src/i18n" },
];

/** Who may import whom. A layer may always import its own files. */
const ALLOWED = {
  theory: [],
  midi: ["theory"],
  analysis: ["theory"],
  platform: [],
  audio: ["theory", "platform"],
  input: ["input-source", "theory", "platform"],
  "input-source": ["input", "theory"],
  state: ["theory", "platform"],
  i18n: ["state"],
  nav: ["state"],
  ui: ["theory", "audio", "state", "i18n", "platform", "input", "input-source"],
  // No "input-source": modules use the input registry, never a source.
  module: [
    "module",
    "ui",
    "theory",
    "midi",
    "analysis",
    "audio",
    "state",
    "i18n",
    "platform",
    "input",
    "nav",
  ],
  shell: [
    "module",
    "nav",
    "ui",
    "theory",
    "midi",
    "audio",
    "input",
    "input-source",
    "state",
    "platform",
    "i18n",
  ],
  app: ["shell", "module", "ui", "i18n", "state", "platform"],
};

const PURE = ["theory", "midi", "analysis"];
const PURE_FORBIDDEN = [
  "react",
  "react-dom",
  "next",
  "tone",
  "smplr",
  "next-intl",
  "zustand",
  "radix-ui",
  "motion",
  "idb-keyval",
];
const el = (type) => ({ element: { type } });

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["src/**/*.{ts,tsx}"],
    extends: [tseslint.configs.strict],
    rules: {
      "@typescript-eslint/no-non-null-assertion": "error",
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { fixStyle: "inline-type-imports" },
      ],
    },
  },
  {
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/**/*.test.{ts,tsx}"],
    plugins: { boundaries },
    settings: {
      "boundaries/elements": ELEMENTS,
      "boundaries/include": ["src/**/*"],
      "import/resolver": { typescript: { alwaysTryTypes: true } },
    },
    rules: {
      "boundaries/dependencies": [
        "error",
        {
          default: "disallow",
          checkAllOrigins: true,
          message:
            "{{from.element.type}} must not import this dependency (see the layer rules in eslint.config.mjs)",
          policies: [
            // Libraries and Node built-ins: allowed, except in the pure layers (below).
            { allow: { to: { module: { origin: ["external", "core"] } } } },
            // Local layers.
            ...Object.entries(ALLOWED).map(([from, to]) => ({
              from: el(from),
              allow: { to: { element: { types: [from, ...to] } } },
            })),
            // A module imports another module only through its index.ts.
            {
              disallow: {
                to: {
                  element: { type: "module" },
                  file: { path: "**/src/modules/*/!(index).{ts,tsx}" },
                },
              },
              message: "Import another module only through its index.ts",
            },
            // theory and midi are pure TypeScript.
            {
              from: { element: { types: PURE } },
              disallow: { to: { module: { source: PURE_FORBIDDEN } } },
              message:
                "theory, midi and analysis are pure TypeScript: no React, no DOM and no audio libraries",
            },
          ],
        },
      ],
    },
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "playwright-report/**",
    "test-results/**",
  ]),
]);
