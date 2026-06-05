import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  MapPin, Plus, Play, Pause, RotateCcw, X, Clock, Bookmark, Trash2, Check,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import {
  Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger,
} from "@/components/ui/drawer";
import { EggCharacter } from "@/components/egg/EggCharacter";
import { useLocalStorage } from "@/lib/use-local-storage";
import { playChime, primeAudio } from "@/lib/chime";
import {
  calcCookSeconds, donenessLabel, donenessVariant, formatMMSS, type Size,
} from "@/lib/egg-timer";

const Pencil = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4Z" />
  </svg>
);

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Egg Timer — perfectly timed eggs" },
      { name: "description", content: "Cook soft, medium or hard eggs with timers adjusted for your egg size and local air pressure." },
      { name: "theme-color", content: "#f7f2e7" },
      { property: "og:title", content: "Egg Timer" },
      { property: "og:description", content: "Perfectly timed eggs, adjusted for your altitude." },
    ],
    links: [
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/icon-192.png" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,700&family=Nunito:wght@400;600;700&display=swap" },
    ],
  }),
  component: EggApp,
});

const SIZES: Size[] = ["S", "M", "L", "XL"];

interface Timer {
  id: string;
  doneness: number;
  size: Size;
  totalSeconds: number;
  endsAt: number;        // epoch ms
  pausedRemaining: number | null; // null = running
  done: boolean;
  dismissedFinish?: boolean;
}

interface Preset {
  id: string;
  name: string;
  doneness: number;
  size: Size;
  /** Optional override — if set, uses this exact time and ignores pressure adjustment. */
  fixedSeconds?: number;
}

interface HistoryEntry {
  id: string;
  at: number;
  doneness: number;
  size: Size;
  totalSeconds: number;
}

interface LocInfo {
  pressureHpa: number;
  altitudeM: number | null;
  label: string;        // e.g. "Sea level" or "320 m altitude"
  source: "default" | "gps" | "manual";
}

function approxPressureFromAltitude(altM: number): number {
  // barometric formula approximation
  return Math.round(1013.25 * Math.pow(1 - (0.0065 * altM) / 288.15, 5.255));
}

const THUBIS_ID = "p-thubis";
const DEFAULT_PRESETS: Preset[] = [
  { id: THUBIS_ID,  name: "Thubis egg",    doneness: 0.35, size: "M", fixedSeconds: 300 },
  { id: "p-soft",   name: "Classic soft",  doneness: 0.15, size: "M" },
  { id: "p-med",    name: "Jammy medium",  doneness: 0.5,  size: "M" },
  { id: "p-hard",   name: "Lunchbox hard", doneness: 0.95, size: "L" },
];

function EggApp() {
  // ---------- composer state ----------
  const [doneness, setDoneness] = useState(0.5);
  const [size, setSize] = useState<Size>("M");

  // ---------- persisted state ----------
  const [timers, setTimers] = useLocalStorage<Timer[]>("egg:timers", []);
  const [presets, setPresets] = useLocalStorage<Preset[]>("egg:presets", DEFAULT_PRESETS);
  const [history, setHistory] = useLocalStorage<HistoryEntry[]>("egg:history", []);
  const [loc, setLoc] = useLocalStorage<LocInfo>("egg:loc", {
    pressureHpa: 1013,
    altitudeM: null,
    label: "Sea level",
    source: "default",
  });

  // One-time migration: make sure the "Thubis egg" preset is present.
  useEffect(() => {
    setPresets((prev) =>
      prev.some((p) => p.id === THUBIS_ID)
        ? prev
        : [{ id: THUBIS_ID, name: "Thubis egg", doneness: 0.35, size: "M", fixedSeconds: 300 }, ...prev],
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------- ticking ----------
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, []);

  // detect finishes
  const chimedRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    let changed = false;
    const updated = timers.map((t) => {
      if (t.done || t.pausedRemaining != null) return t;
      if (now >= t.endsAt) {
        changed = true;
        if (!chimedRef.current.has(t.id)) {
          chimedRef.current.add(t.id);
          playChime();
          // log history
          setHistory((h) => [
            { id: `h-${t.id}`, at: Date.now(), doneness: t.doneness, size: t.size, totalSeconds: t.totalSeconds },
            ...h,
          ].slice(0, 50));
        }
        return { ...t, done: true };
      }
      return t;
    });
    if (changed) setTimers(updated);
  }, [now, timers, setTimers, setHistory]);

  // ---------- derived ----------
  const previewSeconds = useMemo(
    () => calcCookSeconds(doneness, size, loc.pressureHpa),
    [doneness, size, loc.pressureHpa],
  );

  function startTimer(d = doneness, s = size, fixedSeconds?: number) {
    primeAudio();
    const total = fixedSeconds ?? calcCookSeconds(d, s, loc.pressureHpa);
    const id = `t-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setTimers((prev) => [
      { id, doneness: d, size: s, totalSeconds: total, endsAt: Date.now() + total * 1000, pausedRemaining: null, done: false },
      ...prev,
    ]);
  }

  function togglePause(id: string) {
    setTimers((prev) =>
      prev.map((t) => {
        if (t.id !== id || t.done) return t;
        if (t.pausedRemaining != null) {
          return { ...t, endsAt: Date.now() + t.pausedRemaining * 1000, pausedRemaining: null };
        }
        const rem = Math.max(0, (t.endsAt - Date.now()) / 1000);
        return { ...t, pausedRemaining: rem };
      }),
    );
  }

  function resetTimer(id: string) {
    setTimers((prev) =>
      prev.map((t) =>
        t.id === id
          ? { ...t, endsAt: Date.now() + t.totalSeconds * 1000, pausedRemaining: null, done: false }
          : t,
      ),
    );
    chimedRef.current.delete(id);
  }

  function removeTimer(id: string) {
    setTimers((prev) => prev.filter((t) => t.id !== id));
    chimedRef.current.delete(id);
  }

  function clearFinished() {
    setTimers((prev) => prev.filter((t) => !t.done));
  }

  function saveCurrentAsPreset() {
    const variant = donenessLabel(doneness);
    const name = `${variant} · ${size}`;
    setPresets((p) => [
      ...p,
      { id: `p-${Date.now()}`, name, doneness, size },
    ]);
  }

  function deletePreset(id: string) {
    setPresets((p) => p.filter((x) => x.id !== id));
  }

  function renamePreset(id: string, name: string) {
    const trimmed = name.trim();
    if (!trimmed) return;
    setPresets((p) => p.map((x) => (x.id === id ? { ...x, name: trimmed } : x)));
  }

  // ---------- location ----------
  const [locating, setLocating] = useState(false);
  function useGPS() {
    if (!("geolocation" in navigator)) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const alt = pos.coords.altitude;
        if (alt != null && !Number.isNaN(alt)) {
          const pressure = approxPressureFromAltitude(alt);
          setLoc({
            pressureHpa: pressure,
            altitudeM: Math.round(alt),
            label: `${Math.round(alt)} m altitude`,
            source: "gps",
          });
        } else {
          // GPS returned no altitude; assume sea level but mark as GPS-confirmed location
          setLoc({
            pressureHpa: 1013,
            altitudeM: 0,
            label: "Location set · sea level",
            source: "gps",
          });
        }
        setLocating(false);
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }

  function setManualAltitude(m: number) {
    const pressure = approxPressureFromAltitude(m);
    setLoc({
      pressureHpa: pressure,
      altitudeM: m,
      label: `${m} m altitude`,
      source: "manual",
    });
  }

  const adj = previewSeconds - calcCookSeconds(doneness, size, 1013);

  return (
    <div className="min-h-screen bg-background pb-32">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur border-b border-border">
        <div className="mx-auto max-w-md px-5 py-4 flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold leading-tight">Egg Timer</h1>
            <LocationChip loc={loc} onPick={useGPS} onManual={setManualAltitude} locating={locating} />
          </div>
          <HistoryButton
            history={history}
            onClear={() => setHistory([])}
            onUse={(h) => { setDoneness(h.doneness); setSize(h.size); }}
            onPromote={(h) =>
              setPresets((p) => [
                ...p,
                { id: `p-${Date.now()}`, name: `${donenessLabel(h.doneness)} · ${h.size}`, doneness: h.doneness, size: h.size },
              ])
            }
            onDelete={(id) => setHistory((h) => h.filter((x) => x.id !== id))}
          />
        </div>
      </header>

      <main className="mx-auto max-w-md px-5 pt-4 space-y-6">
        {/* Active timers */}
        <AnimatePresence initial={false}>
          {timers.length > 0 && (
            <motion.section
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-3"
            >
              <div className="flex items-center justify-between px-1">
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  {timers.length} {timers.length === 1 ? "timer" : "timers"}
                </h2>
                {timers.some((t) => t.done) && (
                  <button
                    onClick={clearFinished}
                    className="text-xs font-semibold text-muted-foreground hover:text-foreground"
                  >
                    Clear finished
                  </button>
                )}
              </div>

              <div className="space-y-3">
                <AnimatePresence initial={false}>
                  {timers.map((t) => (
                    <TimerCard
                      key={t.id}
                      timer={t}
                      now={now}
                      onPause={() => togglePause(t.id)}
                      onReset={() => resetTimer(t.id)}
                      onRemove={() => removeTimer(t.id)}
                    />
                  ))}
                </AnimatePresence>
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        {/* Composer */}
        <section className="rounded-3xl bg-card border border-border shadow-[0_8px_30px_-12px_rgba(120,90,40,0.18)] p-5 space-y-5">
          <div className="flex flex-col items-center pt-1">
            <EggCharacter
              variant={donenessVariant(doneness)}
              size={size}
              pxSize={170}
            />
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-4xl font-bold font-[var(--font-display)] tabular-nums">
                {formatMMSS(previewSeconds)}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              {donenessLabel(doneness)} · Size {size}
              {adj > 0 && <span className="ml-1">· +{adj}s for altitude</span>}
            </p>
          </div>

          {/* Doneness slider */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-semibold text-muted-foreground">
              <span>Soft</span><span>Medium</span><span>Hard</span>
            </div>
            <Slider
              value={[doneness * 100]}
              onValueChange={(v) => setDoneness(v[0] / 100)}
              min={0} max={100} step={1}
              className="[&_[data-slot=slider-thumb]]:h-6 [&_[data-slot=slider-thumb]]:w-6"
            />
          </div>

          {/* Size segmented */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-semibold text-muted-foreground">
              <span>Egg size</span><span>{size}</span>
            </div>
            <div className="grid grid-cols-4 gap-2 rounded-2xl bg-muted/60 p-1">
              {SIZES.map((s) => (
                <button
                  key={s}
                  onClick={() => setSize(s)}
                  className={`py-2 rounded-xl text-sm font-bold transition ${
                    size === s
                      ? "bg-background shadow text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={() => startTimer()}
              className="flex-1 h-12 rounded-2xl text-base font-bold bg-primary text-primary-foreground hover:bg-primary/90 shadow"
            >
              <Plus className="size-5" /> Start cooking
            </Button>
            <Button
              variant="outline"
              onClick={saveCurrentAsPreset}
              className="h-12 rounded-2xl"
              title="Save as preset"
            >
              <Bookmark className="size-5" />
            </Button>
          </div>
        </section>

        {/* Presets */}
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider px-1">
            Presets
          </h2>
          <div className="flex flex-wrap gap-2">
            {presets.map((p) => (
              <PresetChip
                key={p.id}
                preset={p}
                pressureHpa={loc.pressureHpa}
                onLoad={() => { setDoneness(p.doneness); setSize(p.size); }}
                onStart={() => startTimer(p.doneness, p.size, p.fixedSeconds)}
                onDelete={() => deletePreset(p.id)}
                onRename={(name) => renamePreset(p.id, name)}
              />
            ))}
            {presets.length === 0 && (
              <p className="text-sm text-muted-foreground px-1">No presets yet — tap the bookmark to save one.</p>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

/* ---------------- Timer card ---------------- */

function TimerCard({
  timer, now, onPause, onReset, onRemove,
}: {
  timer: Timer;
  now: number;
  onPause: () => void;
  onReset: () => void;
  onRemove: () => void;
}) {
  const remaining =
    timer.done ? 0
      : timer.pausedRemaining != null
        ? timer.pausedRemaining
        : Math.max(0, (timer.endsAt - now) / 1000);

  const pct = 1 - remaining / timer.totalSeconds;
  const variant = donenessVariant(timer.doneness);

  // ring math
  const R = 42;
  const C = 2 * Math.PI * R;
  const offset = C * (1 - pct);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -10, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
      className={`relative rounded-3xl border p-4 flex items-center gap-4 shadow-[0_6px_20px_-12px_rgba(120,90,40,0.25)] ${
        timer.done
          ? "bg-primary/20 border-primary/40"
          : "bg-card border-border"
      }`}
    >
      <div className="relative w-[100px] h-[100px] shrink-0 flex items-center justify-center">
        <svg className="absolute inset-0 -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r={R} fill="none" stroke="var(--shell-deep)" strokeWidth="6" />
          <circle
            cx="50" cy="50" r={R} fill="none"
            stroke={timer.done ? "var(--sage)" : "var(--yolk)"}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={C}
            strokeDashoffset={offset}
            style={{ transition: "stroke-dashoffset 250ms linear" }}
          />
        </svg>
        <EggCharacter
          variant={variant}
          size={timer.size}
          cooking={!timer.done && timer.pausedRemaining == null}
          done={timer.done}
          pxSize={68}
        />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-bold text-lg">
            {donenessLabel(timer.doneness)} <span className="text-muted-foreground font-medium">· {timer.size}</span>
          </p>
          {timer.done && (
            <span className="text-xs font-bold uppercase tracking-wider text-primary-foreground bg-primary px-2 py-0.5 rounded-full">
              Ready!
            </span>
          )}
        </div>
        <p className="text-3xl font-bold tabular-nums leading-tight mt-1">
          {timer.done ? "Done" : formatMMSS(remaining)}
        </p>
        <div className="flex gap-1 mt-2">
          {!timer.done && (
            <Button size="sm" variant="ghost" onClick={onPause} className="h-8 px-2">
              {timer.pausedRemaining != null ? <Play className="size-4" /> : <Pause className="size-4" />}
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={onReset} className="h-8 px-2">
            <RotateCcw className="size-4" />
          </Button>
          <Button size="sm" variant="ghost" onClick={onRemove} className="h-8 px-2 ml-auto">
            {timer.done ? <Check className="size-4" /> : <X className="size-4" />}
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

/* ---------------- Preset chip ---------------- */

function PresetChip({
  preset, pressureHpa, onLoad, onStart, onDelete, onRename,
}: {
  preset: Preset;
  pressureHpa: number;
  onLoad: () => void;
  onStart: () => void;
  onDelete: () => void;
  onRename: (name: string) => void;
}) {
  const secs = preset.fixedSeconds ?? calcCookSeconds(preset.doneness, preset.size, pressureHpa);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(preset.name);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      setDraft(preset.name);
      requestAnimationFrame(() => inputRef.current?.select());
    }
  }, [editing, preset.name]);

  function commit() {
    onRename(draft);
    setEditing(false);
  }

  return (
    <div className="group relative flex items-stretch rounded-2xl bg-card border border-border overflow-hidden shadow-sm">
      {editing ? (
        <div className="px-2 py-1.5 flex items-center">
          <Input
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === "Enter") commit();
              if (e.key === "Escape") setEditing(false);
            }}
            className="h-7 text-sm font-bold w-32 px-2"
          />
        </div>
      ) : (
        <>
          <button
            onClick={onLoad}
            className="px-3 py-2 text-left hover:bg-muted/60"
          >
            <p className="text-sm font-bold leading-tight">{preset.name}</p>
            <p className="text-xs text-muted-foreground tabular-nums">{formatMMSS(secs)}</p>
          </button>
          <button
            onClick={() => setEditing(true)}
            className="px-2 text-muted-foreground hover:text-foreground hover:bg-muted/60"
            title="Rename"
          >
            <Pencil className="size-3.5" />
          </button>
        </>
      )}
      <button
        onClick={onStart}
        className="px-3 bg-primary/80 text-primary-foreground font-bold hover:bg-primary"
        title="Start now"
      >
        <Play className="size-4" />
      </button>
      <button
        onClick={onDelete}
        className="px-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
        title="Delete preset"
      >
        <Trash2 className="size-3.5" />
      </button>
    </div>
  );
}

/* ---------------- Location chip ---------------- */

function LocationChip({
  loc, onPick, onManual, locating,
}: {
  loc: LocInfo;
  onPick: () => void;
  onManual: (m: number) => void;
  locating: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [alt, setAlt] = useState(loc.altitudeM?.toString() ?? "0");

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <button className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mt-0.5">
          <MapPin className="size-3.5" />
          <span>{loc.label} · {loc.pressureHpa} hPa</span>
        </button>
      </DrawerTrigger>
      <DrawerContent className="bg-card">
        <DrawerHeader>
          <DrawerTitle>Local pressure</DrawerTitle>
        </DrawerHeader>
        <div className="px-5 pb-8 space-y-4">
          <p className="text-sm text-muted-foreground">
            Water boils cooler at altitude, so eggs need a little longer. We use your altitude to
            estimate the local air pressure.
          </p>
          <Button onClick={onPick} disabled={locating} className="w-full h-11 rounded-xl">
            <MapPin className="size-4" /> {locating ? "Locating…" : "Use my location"}
          </Button>
          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Or set altitude manually (m)
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                value={alt}
                onChange={(e) => setAlt(e.target.value)}
                className="flex-1 h-11 rounded-xl border border-input bg-background px-3 text-base"
                placeholder="0"
              />
              <Button
                variant="outline"
                onClick={() => { onManual(Number(alt) || 0); setOpen(false); }}
                className="h-11 rounded-xl"
              >
                Set
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Current: {loc.pressureHpa} hPa ({loc.source})
            </p>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

/* ---------------- History drawer ---------------- */

function HistoryButton({
  history, onClear, onUse, onPromote, onDelete,
}: {
  history: HistoryEntry[];
  onClear: () => void;
  onUse: (h: HistoryEntry) => void;
  onPromote: (h: HistoryEntry) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <Drawer>
      <DrawerTrigger asChild>
        <Button variant="outline" size="icon" className="rounded-2xl h-11 w-11 shrink-0">
          <Clock className="size-5" />
        </Button>
      </DrawerTrigger>
      <DrawerContent className="bg-card">
        <DrawerHeader className="flex flex-row items-center justify-between">
          <DrawerTitle>History</DrawerTitle>
          {history.length > 0 && (
            <button onClick={onClear} className="text-xs text-muted-foreground hover:text-destructive mr-4">
              Clear all
            </button>
          )}
        </DrawerHeader>
        <div className="max-h-[60vh] overflow-y-auto px-3 pb-8">
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Cooked eggs will appear here.
            </p>
          ) : (
            <ul className="space-y-2">
              {history.map((h) => (
                <li
                  key={h.id}
                  className="flex items-center gap-3 rounded-2xl bg-background border border-border px-3 py-2"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm">
                      {donenessLabel(h.doneness)} · {h.size}
                      <span className="text-muted-foreground font-normal"> · {formatMMSS(h.totalSeconds)}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(h.at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
                    </p>
                  </div>
                  <button
                    onClick={() => onUse(h)}
                    className="text-xs font-bold text-primary-foreground bg-primary rounded-lg px-2.5 py-1.5"
                  >
                    Use
                  </button>
                  <button
                    onClick={() => onPromote(h)}
                    className="text-muted-foreground hover:text-foreground"
                    title="Save as preset"
                  >
                    <Bookmark className="size-4" />
                  </button>
                  <button
                    onClick={() => onDelete(h.id)}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
