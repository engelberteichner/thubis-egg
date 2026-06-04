# Egg Cooking Timer 🥚

A mobile-first web app (installable to iPhone home screen via Add to Home Screen) that calculates optimal egg-cooking timers based on doneness, egg size, and your local atmospheric pressure / altitude from GPS — with support for running several timers at once.

> Note: A true native App Store iPhone app needs Xcode/Capacitor and is a separate step. This is a polished mobile web app with a PWA manifest so it installs with an app icon and runs full-screen, feeling native.

## Screens

Single-page mobile layout:

1. **Header** — title + location chip (e.g. "Berlin · 998 hPa · +12s")
2. **Active timers stack** — each running/paused timer is its own card with its animated egg, ring progress, MM:SS, pause/reset. New timers stack on top; finished timers celebrate and can be dismissed.
3. **"New egg" composer** (bottom sheet / inline card):
   - Animated egg character that morphs live with the sliders
   - Doneness slider — Soft ↔ Medium ↔ Hard (continuous)
   - Size slider — S / M / L / XL (snaps)
   - Calculated time preview (MM:SS)
   - **Start** button → adds a new timer card to the stack
   - Quick **Presets row** — saved presets as one-tap chips ("My usual", etc.) + "Save current"
4. **History drawer** — past cooks (date, doneness, size, duration). Tap to re-run; swipe to delete; "Save as preset".
5. **Finish alert per timer** — chime + vibration + happy egg celebration; each card identifies itself ("Medium L is ready!").

## Multiple simultaneous timers

- Unlimited concurrent timers, each independent (own doneness, size, start time, state)
- Each card shows its own animated egg + progress ring so you can tell them apart at a glance
- Optional short label per timer ("Anna's egg") — auto-suggested from doneness+size
- Finished timers stay pinned at the top with a "Done!" badge until dismissed
- Notifications fire per-timer; if multiple finish close together, chimes queue politely
- Background-safe: timers are stored with absolute end-timestamps so closing/reopening the tab or locking the phone preserves correct remaining time
- "Stop all" / "Clear finished" actions in the header

## Animated eggs (SVG + Framer Motion)

Three happy-faced egg characters that cross-fade based on doneness:
- **Soft** — pale, glossy, slight jiggle/squish loop
- **Medium** — warmer cream, calm bobbing
- **Hard** — toasted cream, confident little hop
- Cooking loop while running; sparkle + closed-eye smile on finish

## Calculation

Base (medium egg, sea level): Soft 4:00 · Medium 6:30 · Hard 9:30 (continuous interpolation)
- Size: S −45s, M 0, L +45s, XL +90s
- Altitude/pressure: +~10s per ~35 hPa drop from 1013

## GPS & pressure

- `navigator.geolocation` on first use (manual fallback)
- **Google Maps Platform connector** (I'll prompt you to link it):
  - Reverse geocoding → city name
  - Weather API → current pressure
- Denied/offline → default 1013 hPa, manual altitude entry

## Presets & history

- Stored in browser localStorage (no account, survives reloads + Home Screen install)
- Presets: name + doneness + size, pinned as chips
- History: auto-logged on each completed cook; tap to re-run; swipe to delete; promote to preset

## Design — Eggshell pastel theme

- Background: warm off-white eggshell (oklch ~0.97 0.012 85)
- Surfaces: soft cream cards with warm subtle shadow
- Primary accent: soft yolk-yellow (rings, primary buttons)
- Secondary accents: dusty peach + pale sage
- Friendly rounded display font (Fraunces / DM Serif Display) + Nunito/DM Sans body
- Generous rounding, gentle spring animations — calm, cute, breakfast-y
- Tokens in `src/styles.css` under `@theme` (oklch); light-mode only by default

## Tech

- TanStack Start route at `/` (replaces placeholder)
- Tailwind v4 tokens in `src/styles.css`
- Framer Motion for eggs and timer-card transitions
- Web Audio API chime + `navigator.vibrate`
- PWA manifest + apple-touch-icon for Add to Home Screen
- Google Maps connector for geocoding + weather (server function via gateway)
- localStorage for active timers, presets, history

## Out of scope (ask if wanted)

- Cloud sync across devices (needs accounts)
- Push notifications when the tab is fully closed (needs service worker + permissions)
- Native iOS via Capacitor / App Store submission
