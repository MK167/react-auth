import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [react(), tsconfigPaths()],

  build: {
    rollupOptions: {
      output: {
        /**
         * Split heavy vendor packages into separate cacheable chunks.
         *
         * Strategy:
         * - firebase   → isolated: only downloaded when the login page is visited.
         * - react core → stable, changes rarely; browsers cache it across deploys.
         * - icons      → tree-shaken per page, keeps page chunks small.
         * - everything else → single shared vendor chunk.
         */
        manualChunks(id) {
          if (!id.includes("node_modules")) return;

          if (id.includes("node_modules/firebase")) return "vendor-firebase";

          if (
            id.includes("node_modules/react/") ||
            id.includes("node_modules/react-dom/") ||
            id.includes("node_modules/react-router") ||
            id.includes("node_modules/scheduler/")
          ) return "vendor-react";

          if (id.includes("node_modules/lucide-react")) return "vendor-icons";

          return "vendor";
        },
      },
    },
  },
});
