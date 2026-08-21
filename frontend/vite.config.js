import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import cesium from "vite-plugin-cesium";
import tailwindcss from '@tailwindcss/vite'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), cesium(), tailwindcss()],
  server: {
    host: true, // Automatically exposes Network IP (0.0.0.0)
    port: 5173,
    proxy: {
      "/wayback-tiles": {
        target: "https://wayback.maptiles.arcgis.com",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/wayback-tiles/, ""),
      },
    },
  },
});