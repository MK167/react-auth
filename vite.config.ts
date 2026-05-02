import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';
import { resolve } from 'node:path';

export default defineConfig(({ mode }) => {
  const isProd = mode === 'production';

  /** `docker-mock` → SPA + nginx proxy to mock-server (see docker-compose.yml). */
  const prodEnvFile =
    process.env.VITE_BUILD_PROFILE === 'docker-mock'
      ? 'src/environments/environment.prod.docker.ts'
      : 'src/environments/environment.prod.ts';

  const base = isProd ? '/react-auth/' : '/';
  /**
   * Mock server URL — only used in development for the dev-server proxy.
   * Must match the `mockServerUrl` in environment.ts.
   */
  const mockServerUrl = 'http://localhost:3001';

  return {
    base,
    plugins: [react(), tsconfigPaths()],

    // ── Angular-style environment file replacement ─────────────────────────
    //
    // `vite dev`   → @/environments/environment → environment.ts   (dev values)
    // `vite build` → @/environments/environment → environment.prod.ts (prod values)
    //
    // This mirrors Angular's `fileReplacements` in angular.json.
    // The alias takes precedence over vite-tsconfig-paths for this specific path.
    resolve: {
      alias: {
        '@/environments/environment': resolve(
          process.cwd(),
          isProd ? prodEnvFile : 'src/environments/environment.ts',
        ),
      },
    },

    // ── Dev server proxy ──────────────────────────────────────────────────
    // Forwards /content/* and /api/v1/* to json-server so the browser's
    // Network tab shows real requests — the key debug signals:
    //   "be-default-ar"    → BACKEND mode (contentSource: 'backend')
    //   "default-ar"       → LOCAL mode  (contentSource: 'local')
    server: {
      proxy: {
        '/content': {
          target: mockServerUrl,
          changeOrigin: true,
        },
        // Always proxy /api/v1/* in development (apiSource: 'mock' in environment.ts)
        '/api/v1': {
          target: mockServerUrl,
          changeOrigin: true,
        },
      },
    },

    // ── Production build ─────────────────────────────────────────────────
    build: {
      chunkSizeWarningLimit: 600,

      rollupOptions: {
        output: {
          /**
           * Split heavy vendor packages into separate cacheable chunks.
           *
           * - firebase    → only downloaded when Login page is visited
           * - react core  → stable, long cache lifetime across deploys
           * - icons       → tree-shaken per page
           * - vendor-utils → Zustand, Axios, Zod, RHF — stable utility layer
           * - vendor      → everything else
           */
          manualChunks(id) {
            if (!id.includes('node_modules')) return;

            if (id.includes('node_modules/firebase')) return 'vendor-firebase';

            if (
              id.includes('node_modules/react/') ||
              id.includes('node_modules/react-dom/') ||
              id.includes('node_modules/react-router') ||
              id.includes('node_modules/scheduler/')
            ) return 'vendor-react';

            if (id.includes('node_modules/lucide-react')) return 'vendor-icons';

            if (
              id.includes('node_modules/zustand') ||
              id.includes('node_modules/axios') ||
              id.includes('node_modules/zod') ||
              id.includes('node_modules/@hookform') ||
              id.includes('node_modules/react-hook-form') ||
              id.includes('node_modules/js-cookie')
            ) return 'vendor-utils';

            return 'vendor';
          },
        },
      },
    },
  };
});
