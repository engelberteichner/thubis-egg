let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const Ctor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
  }
  return ctx;
}

/** Prime the audio context on a user gesture so chimes play later on iOS. */
export function primeAudio() {
  const c = getCtx();
  if (!c) return;
  if (c.state === "suspended") c.resume().catch(() => {});
}

export function playChime() {
  const c = getCtx();
  if (!c) return;
  if (c.state === "suspended") c.resume().catch(() => {});

  const now = c.currentTime;
  // Cheerful little 5-note melody, played twice.
  const melody = [880, 1175, 1568, 1319, 1760];
  const loops = 2;

  for (let l = 0; l < loops; l++) {
    melody.forEach((freq, i) => {
      const t = now + l * (melody.length * 0.16 + 0.25) + i * 0.16;

      const o = c.createOscillator();
      const g = c.createGain();
      o.type = "triangle";
      o.frequency.value = freq;
      o.connect(g);
      g.connect(c.destination);

      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.35, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.5);

      o.start(t);
      o.stop(t + 0.55);
    });
  }

  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    navigator.vibrate?.([180, 90, 180, 90, 360]);
  }
}
