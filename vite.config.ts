// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, nitro (build-only using cloudflare as a default target),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  tanstackStart: {
    base: '/thubis-egg/',
    server: { entry: "server" },
    // Schaltet den SPA-Modus korrekt ein
    spa: {
      enabled: true,
    }
  },
  vite: {
    nitro: {
      preset: 'github-pages',
      prerender: {
        crawlLinks: true,
        routes: ['/']
      }
    }
  }
});
