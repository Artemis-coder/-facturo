import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icons/favicon-16.png", "icons/favicon-32.png", "icons/apple-touch-icon.png"],
      manifest: {
        name: "Ma Bouate — Gestion commerciale & facturation",
        short_name: "Ma Bouate",
        description: "Devis, factures, clients et paiements — gestion commerciale pensée pour la Côte d'Ivoire et l'UEMOA.",
        lang: "fr",
        start_url: "/",
        scope: "/",
        display: "standalone",
        theme_color: "#16213A",
        background_color: "#16213A",
        icons: [
          { src: "icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
          { src: "icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
          { src: "icons/icon-maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
          { src: "icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        // Précache uniquement les fichiers de l'application (JS/CSS/HTML/icônes).
        // Les appels à l'API Supabase ne sont jamais mis en cache : ils passent
        // toujours par le réseau, pour ne jamais servir de données périmées.
        globPatterns: ["**/*.{js,css,html,png,svg,ico,webmanifest}"],
      },
    }),
  ],
  server: { port: 5173 },
});
