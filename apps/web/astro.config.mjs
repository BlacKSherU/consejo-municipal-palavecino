import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import tailwind from "@astrojs/tailwind";

const apiTarget = process.env.API_PROXY_TARGET || "http://127.0.0.1:8787";

export default defineConfig({
  integrations: [tailwind(), react()],
  vite: {
    // Monorepo + Vite: evita dos instancias de "astro" en SSR (fallo sequence is not a function).
    resolve: {
      dedupe: ["astro"],
    },
    server: {
      proxy: {
        "/api": {
          target: apiTarget,
          changeOrigin: true,
        },
      },
    },
  },
});
