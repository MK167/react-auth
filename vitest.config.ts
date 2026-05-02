/**
 * @fileoverview Vitest configuration — kept separate from vite.config.ts.
 *
 * ## Why a separate vitest.config.ts?
 *
 * vite.config.ts exports a *function* (`({ mode }) => config`) to support
 * the Angular-style environment file replacement. Vitest's `defineConfig`
 * from `vitest/config` can accept a function too, but mixing test-only
 * options (globals, environment, coverage) with build options in one file
 * makes both harder to reason about independently.
 *
 * A separate file also means `vite build` never loads Vitest internals,
 * keeping the production bundle toolchain clean.
 *
 * ## Key options explained
 *
 * - `globals: true`       → Injects describe/it/expect into every test file
 *                           so you don't need `import { it } from 'vitest'`
 *                           on every line — mirrors the Jest API.
 *
 * - `environment: 'jsdom'`→ Provides browser globals (localStorage, document,
 *                           navigator, crypto) that Zustand's persist middleware
 *                           and cookie utilities depend on.
 *
 * - `clearMocks: true`    → Resets mock call counts between tests automatically.
 *                           Prevents test A's mock calls from leaking into test B.
 *
 * - `restoreMocks: true`  → Restores `vi.spyOn` spies to their original
 *                           implementations between tests. Essential when spying
 *                           on navigator.connection or globalThis.crypto.
 *
 * - `coverage.provider`   → v8 uses Node's built-in V8 coverage, which is
 *                           faster than istanbul and requires no Babel transform.
 */

import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
import { playwright } from '@vitest/browser-playwright';
const dirname = typeof __dirname !== 'undefined' ? __dirname : path.dirname(fileURLToPath(import.meta.url));

// More info at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon

export default defineConfig({
  // Re-declare plugins so path aliases (@/...) resolve inside test files.
  plugins: [react(), tsconfigPaths()],
  // Mirror the environment alias from vite.config.ts so tests always import
  // the dev environment file (never the prod one).
  resolve: {
    alias: {
      "@/environments/environment": resolve(
        process.cwd(),
        "src/environments/environment.ts",
      ),
    },
  },
  test: {
    reporters: ['default', 'junit'],
    outputFile: {
      junit: './reports/junit.xml'
    },
    // Code coverage configuration (run with: npm run test:coverage).
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov", "html"],
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "src/**/*.test.{ts,tsx}",
        "src/__tests__/**",
        "src/main.tsx",
        "src/App.tsx",
        "src/**/*.types.ts",
        "src/vite-env.d.ts",
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 70,
        statements: 80,
      },
    },
    projects: [
      {
        extends: true,
        test: {
          // Make describe / it / expect / vi available globally — no per-file import.
          globals: true,
          // jsdom simulates a browser DOM: localStorage, document.cookie, navigator.
          environment: "jsdom",
          // Reset mock call history between every test automatically.
          clearMocks: true,
          // Restore spied-on functions to their real implementations between tests.
          restoreMocks: true,
          // Global setup that runs once before every test file.
          setupFiles: ["./src/__tests__/setup.ts"],
        },
      },
      {
        extends: true,
        plugins: [
          // The plugin will run tests for the stories defined in your Storybook config
          // See options at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon#storybooktest
          storybookTest({
            configDir: path.join(dirname, ".storybook"),
          }),
        ],
        test: {
          name: "storybook",
          browser: {
            enabled: true,
            headless: true,
            provider: playwright({}),
            instances: [
              {
                browser: "chromium",
              },
            ],
          },
        },
      },
    ],
  },
});