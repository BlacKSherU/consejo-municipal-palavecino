import { defineConfig } from "astro/config";
import tailwind from "@astrojs/tailwind";

const apiTarget = process.env.API_PROXY_TARGET || "http://127.0.0.1:8787";

export default defineConfig({
  integrations: [tailwind()],
  vite: {
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
