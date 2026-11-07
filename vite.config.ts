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
        theme_color: "#171a31",
        background_color: "#12152b",
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
        globPatterns: ["**/*.{js,css,html,svg,png,webp,webmanifest}"],
        globIgnores: ["**/worlds/fairy-realms.webp"],
        cleanupOutdatedCaches: true,
      },
    }),
  ],
});
