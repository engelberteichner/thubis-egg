// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, nitro (build-only using cloudflare as a default target),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  tanstackStart: {
    // Teilt dem Router mit, dass er in einer SPA-Umgebung unter dem GitHub-Subordner läuft
    base: '/thubis-egg/',
    server: { entry: "server" },
    // Aktiviert den offiziellen Single-Page-Application-Modus für statisches Hosting
    spaMode: true
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
