import { fileURLToPath, URL } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const repoRoot = fileURLToPath(new URL("../../..", import.meta.url));

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    dedupe: ["react", "react-dom"],
    alias: {
      "@boundcoder/agent-core": fileURLToPath(
        new URL("../../packages/agent-core/src/index.ts", import.meta.url),
      ),
      "@boundcoder/shared": fileURLToPath(
        new URL("../../packages/shared/src/index.ts", import.meta.url),
      ),
    },
  },
  server: {
    fs: {
      allow: [repoRoot],
    },
  },
  optimizeDeps: {
    exclude: ["@boundcoder/agent-core", "@boundcoder/shared"],
  },
});