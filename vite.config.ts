import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
export default defineConfig({
  base: process.env.VITE_BASE_PATH || "/",
  plugins: [
    react(),
    VitePWA({
      registerType: "prompt",
      manifestFilename: "manifest.webmanifest",
      manifest: {
        name: "Spelling Quest",
        short_name: "Spelling Quest",
        description: "Your English spelling adventure",
        theme_color: "#102c29",
        background_color: "#0e2225",
        display: "standalone",
        icons: [
          {
            src: "icon.svg",
            sizes: "any",
            type: "image/svg+xml",
            purpose: "any",
          },
          { src: "icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png" },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,webmanifest}"],
        globIgnores: ["**/vosk-*.js"],
        runtimeCaching: [
          {
            urlPattern: /\/assets\/vosk-.*\.js$/,
            handler: "CacheFirst",
            options: {
              cacheName: "optional-vosk-engine",
              expiration: { maxEntries: 2 },
            },
          },
        ],
        cleanupOutdatedCaches: true,
      },
    }),
  ],
});
