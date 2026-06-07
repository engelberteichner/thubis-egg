import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { tsConfigPaths } from "vite-tsconfig-paths";
import { tailwindcss } from "@tailwindcss/vite";
import { react } from "@vitejs/plugin-react";

export default defineConfig({
  // Definiert den korrekten GitHub Pages Unterordner-Pfad
  base: '/thubis-egg/',
  plugins: [
    // Aktiviert den Single-Page-Application Modus für TanStack
    tanstackStart({
      spa: {
        enabled: true,
      }
    }),
    react(),
    tailwindcss(),
    tsConfigPaths()
  ],
  // Zwingt den Bundler, die statischen Dateien im Standardordner 'dist' abzulegen
  build: {
    outDir: 'dist'
  }
});
