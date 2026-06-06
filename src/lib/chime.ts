let ctx: AudioContext | null = null;
let audioEl: HTMLAudioElement | null = null;
let audioUrl: string | null = null;
let silentEl: HTMLAudioElement | null = null;
let silentUrl: string | null = null;
type WakeLockSentinelLike = { release: () => Promise<void> };
let wakeLock: WakeLockSentinelLike | null = null;

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

/** Build a short cheerful chime as a WAV blob URL (works as a fallback for iOS PWA). */
function buildChimeWavUrl(): string | null {
  if (typeof window === "undefined") return null;
  const sampleRate = 44100;
  const melody = [880, 1175, 1568, 1319, 1760];
  const noteDur = 0.18;
  const gap = 0.04;
  const loops = 2;
  const totalDur = loops * (melody.length * (noteDur + gap) + 0.2);
  const totalSamples = Math.ceil(totalDur * sampleRate);

  const samples = new Float32Array(totalSamples);
  for (let l = 0; l < loops; l++) {
    melody.forEach((freq, i) => {
      const start = Math.floor(
        (l * (melody.length * (noteDur + gap) + 0.2) + i * (noteDur + gap)) * sampleRate,
      );
      const len = Math.floor(noteDur * sampleRate);
      for (let s = 0; s < len; s++) {
        const t = s / sampleRate;
        // triangle-ish wave with quick attack and exp decay
        const env = Math.min(1, t / 0.01) * Math.exp(-t * 6);
        const v = ((2 / Math.PI) * Math.asin(Math.sin(2 * Math.PI * freq * t))) * 0.6 * env;
        const idx = start + s;
        if (idx < samples.length) samples[idx] += v;
      }
    });
  }

  // encode WAV (16-bit PCM mono)
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  const writeStr = (off: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i));
  };
  writeStr(0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, "data");
  view.setUint32(40, samples.length * 2, true);
  let off = 44;
  for (let i = 0; i < samples.length; i++) {
    const clamped = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(off, clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff, true);
    off += 2;
  }

  const blob = new Blob([buffer], { type: "audio/wav" });
  return URL.createObjectURL(blob);
}

/** Prime audio on a user gesture so chimes play later on iOS / PWAs. */
export function primeAudio() {
  const c = getCtx();
  if (c && c.state === "suspended") c.resume().catch(() => {});

  if (typeof window !== "undefined" && !audioEl) {
    try {
      audioUrl = buildChimeWavUrl();
      if (audioUrl) {
        audioEl = new Audio(audioUrl);
        audioEl.preload = "auto";
        audioEl.volume = 1;
        // Silent play+pause to unlock on iOS
        const p = audioEl.play();
        if (p && typeof p.then === "function") {
          p.then(() => {
            audioEl!.pause();
            audioEl!.currentTime = 0;
          }).catch(() => {});
        }
      }
    } catch {
      /* ignore */
    }
  }
}

function playWebAudioChime() {
  const c = getCtx();
  if (!c) return false;
  if (c.state === "suspended") c.resume().catch(() => {});
  const now = c.currentTime;
  const melody = [880, 1175, 1568, 1319, 1760];
  const loops = 2;
  for (let l = 0; l < loops; l++) {
    melody.forEach((freq, i) => {
      const t = now + l * (melody.length * 0.18 + 0.25) + i * 0.18;
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = "triangle";
      o.frequency.value = freq;
      o.connect(g);
      g.connect(c.destination);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.4, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.55);
      o.start(t);
      o.stop(t + 0.6);
    });
  }
  return true;
}

export function playChime() {
  // Try HTMLAudio first (works better in iOS PWAs once unlocked)
  if (audioEl) {
    try {
      audioEl.currentTime = 0;
      const p = audioEl.play();
      if (p && typeof p.catch === "function") p.catch(() => playWebAudioChime());
    } catch {
      playWebAudioChime();
    }
  } else {
    playWebAudioChime();
  }

  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    navigator.vibrate?.([200, 100, 200, 100, 400]);
  }
}
