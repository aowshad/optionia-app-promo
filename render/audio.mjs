// Procedural score + sample-accurate SFX → dist/mix.wav (48 kHz, 16-bit stereo).
//   node render/audio.mjs            (reads the timeline's event list from the film itself)
//
// Music: warm filtered pad Fmaj9 → Dm9 → B♭maj7 → Cadd9 (one chord / 2 bars), sub pulse on beats
// 1 & 3, off-beat shaker from S3, lifts into S4 and S6, a resolve on the end card.
// SFX: every {time, type} the timeline emits is rendered at its exact sample.
// Mix: music normalised to −14 LUFS (BS.1770 K-weighted, gated), SFX to −23 LUFS (9 dB under),
// then a gentle look-ahead limiter (true peak < −1 dBTP).
import { writeFileSync, mkdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import ffmpegPath from "ffmpeg-static";
import { BPM, BEAT, BAR, BARS, SCENE, at } from "../src/tokens.js";
import { openFilm } from "./browser.mjs";

const SR = 48000;
const FILM = BARS * BAR;
const N = Math.ceil((FILM + 0.5) * SR);
const TAU = Math.PI * 2;
const mtof = (m) => 440 * 2 ** ((m - 69) / 12);

// Deterministic PRNG so every render of the mix is identical.
function rng(seed) { return () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

class Bus { constructor() { this.L = new Float32Array(N); this.R = new Float32Array(N); } }
function add(bus, buf, t, gain = 1, pan = 0) {
  const i0 = Math.round(t * SR), gl = gain * Math.cos((pan + 1) * Math.PI / 4), gr = gain * Math.sin((pan + 1) * Math.PI / 4);
  for (let i = 0; i < buf.length; i++) { const j = i0 + i; if (j < 0 || j >= N) continue; bus.L[j] += buf[i] * gl; bus.R[j] += buf[i] * gr; }
}

/* ── DSP helpers ─────────────────────────────────────────────────────────── */
function biquad(type, f, q = 0.707, gainDb = 0) {
  const w = TAU * f / SR, c = Math.cos(w), s = Math.sin(w), al = s / (2 * q), A = 10 ** (gainDb / 40);
  let b0, b1, b2, a0, a1, a2;
  if (type === "lp") { b0 = (1 - c) / 2; b1 = 1 - c; b2 = b0; a0 = 1 + al; a1 = -2 * c; a2 = 1 - al; }
  else if (type === "hp") { b0 = (1 + c) / 2; b1 = -(1 + c); b2 = b0; a0 = 1 + al; a1 = -2 * c; a2 = 1 - al; }
  else if (type === "bp") { b0 = al; b1 = 0; b2 = -al; a0 = 1 + al; a1 = -2 * c; a2 = 1 - al; }
  else { b0 = 1 + al * A; b1 = -2 * c; b2 = 1 - al * A; a0 = 1 + al / A; a1 = -2 * c; a2 = 1 - al / A; }  // peak
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  return (x) => { const y = (b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2) / a0; x2 = x1; x1 = x; y2 = y1; y1 = y; return y; };
}
/** Band-pass whose centre can move while it runs (state is kept, so sweeps don't click). */
function sweepBP(q = 1) {
  let b0, b2, a1, a2, x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  const set = (f) => { const w = TAU * f / SR, c = Math.cos(w), al = Math.sin(w) / (2 * q), a0 = 1 + al; b0 = al / a0; b2 = -al / a0; a1 = -2 * c / a0; a2 = (1 - al) / a0; };
  set(500);
  return { set, run: (x) => { const y = b0 * x + b2 * x2 - a1 * y1 - a2 * y2; x2 = x1; x1 = x; y2 = y1; y1 = y; return y; } };
}
const env = (t, a, d) => (t < a ? t / a : Math.exp(-(t - a) / d));
function noiseBuf(n, r) { const b = new Float32Array(n); for (let i = 0; i < n; i++) b[i] = r() * 2 - 1; return b; }

/* ── SFX voices (mono buffers) ───────────────────────────────────────────── */
const R = rng(7);
const S = {
  click() { // soft "tick": filtered noise + a tiny high blip, ~30 ms
    const n = Math.round(0.035 * SR), b = noiseBuf(n, R), bp = biquad("bp", 3200, 1.4), o = new Float32Array(n);
    for (let i = 0; i < n; i++) { const t = i / SR; o[i] = bp(b[i]) * env(t, 0.001, 0.008) * 1.6 + Math.sin(TAU * 2400 * t) * env(t, 0.0005, 0.006) * 0.25; }
    return o;
  },
  pop(note = 0) { // pitched soft pop, rising across a sequence
    const n = Math.round(0.16 * SR), o = new Float32Array(n), f0 = mtof(76 + note * 2);
    let ph = 0;
    for (let i = 0; i < n; i++) { const t = i / SR, f = f0 * (1 + 0.35 * Math.exp(-t / 0.012)); ph += TAU * f / SR; o[i] = (Math.sin(ph) + 0.18 * Math.sin(2 * ph)) * env(t, 0.002, 0.045); }
    return o;
  },
  key(i = 0) { // quiet key tap
    const n = Math.round(0.02 * SR), b = noiseBuf(n, R), bp = biquad("bp", 2600 + (i % 5) * 260, 2), o = new Float32Array(n);
    for (let k = 0; k < n; k++) o[k] = bp(b[k]) * env(k / SR, 0.0005, 0.004) * 1.4;
    return o;
  },
  whoosh(dur = BEAT * 2) { // airy filtered-noise sweep
    const n = Math.round(dur * SR), b = noiseBuf(n, R), o = new Float32Array(n), bp = sweepBP(0.9);
    for (let i = 0; i < n; i++) {
      const p = i / n;
      if (i % 32 === 0) bp.set(350 + 2600 * Math.sin(Math.PI * p) ** 2);
      o[i] = bp.run(b[i]) * Math.sin(Math.PI * p) ** 2;
    }
    return o;
  },
  tick() { // short high sine
    const n = Math.round(0.04 * SR), o = new Float32Array(n);
    for (let i = 0; i < n; i++) { const t = i / SR; o[i] = Math.sin(TAU * 1760 * t) * env(t, 0.001, 0.009); }
    return o;
  },
  thud() { // soft card "deal"
    const n = Math.round(0.12 * SR), o = new Float32Array(n), b = noiseBuf(n, R), lp = biquad("lp", 900);
    for (let i = 0; i < n; i++) { const t = i / SR; o[i] = (Math.sin(TAU * 170 * t) * 0.8 + lp(b[i]) * 0.5) * env(t, 0.002, 0.03); }
    return o;
  },
  chime(i = 0) { // small bell (inharmonic partials)
    const n = Math.round(0.9 * SR), o = new Float32Array(n), f = mtof([84, 88, 91, 96][i % 4]);
    for (let k = 0; k < n; k++) { const t = k / SR; o[k] = (Math.sin(TAU * f * t) + 0.4 * Math.sin(TAU * f * 2.76 * t) * Math.exp(-t / 0.08) + 0.2 * Math.sin(TAU * f * 5.4 * t) * Math.exp(-t / 0.04)) * env(t, 0.002, 0.22); }
    return o;
  },
  sparkle() { // soft "cha-ching": quick rising chime arpeggio + shimmer
    const n = Math.round(1.2 * SR), o = new Float32Array(n);
    [0, 0.06, 0.12, 0.2].forEach((d, j) => { const c = S.chime(j); for (let k = 0; k < c.length && k + d * SR < n; k++) o[Math.round(k + d * SR)] += c[k] * 0.6; });
    const b = noiseBuf(n, R), hp = biquad("hp", 8000);
    for (let k = 0; k < n; k++) o[k] += hp(b[k]) * env(k / SR, 0.01, 0.18) * 0.25;
    return o;
  },
  bloom() { // warm low swell (logo resolve)
    const n = Math.round(2.6 * SR), o = new Float32Array(n), notes = [41, 53, 57, 60, 64];
    for (let k = 0; k < n; k++) { const t = k / SR, e = Math.min(1, t / 0.5) * Math.exp(-Math.max(0, t - 0.5) / 0.9); let v = 0; for (const m of notes) v += Math.sin(TAU * mtof(m) * t) / notes.length; o[k] = v * e; }
    const lp = biquad("lp", 1400); for (let k = 0; k < n; k++) o[k] = lp(o[k]);
    return o;
  },
  pulse() { // orb heartbeat
    const n = Math.round(0.7 * SR), o = new Float32Array(n);
    let ph = 0;
    for (let k = 0; k < n; k++) { const t = k / SR; ph += TAU * (62 + 30 * Math.exp(-t / 0.05)) / SR; o[k] = Math.sin(ph) * env(t, 0.004, 0.22); }
    return o;
  },
  drop() { // file lands in the tray
    const n = Math.round(0.2 * SR), o = new Float32Array(n);
    let ph = 0;
    for (let k = 0; k < n; k++) { const t = k / SR; ph += TAU * (720 - 380 * Math.min(1, t / 0.08)) / SR; o[k] = Math.sin(ph) * env(t, 0.002, 0.05); }
    return o;
  },
};

// Event type → [voice, gain, pan]. Unlisted types are silent by design (e.g. cursor travel).
function voice(e) {
  const p = ((e.time * 0.37) % 1) * 0.5 - 0.25;           // gentle deterministic stereo spread
  switch (e.type) {
    case "click": case "add-to-cart": return [S.click(), 0.55, p];
    case "pop": case "theme": return [S.pop(e.note ?? e.i ?? 0), 0.42, p];
    case "key": return [S.key(e.i ?? 0), 0.16, p];
    case "letter": return [S.key((e.i ?? 0) + 2), e.soft ? 0.08 : 0.12, p];
    case "whoosh": return [S.whoosh(e.dur), 0.2, 0];
    case "orb-launch": case "collapse": case "spread": case "fan": return [S.whoosh(BEAT * 2), 0.24, 0];
    case "drag": return [S.whoosh(e.dur ?? BEAT * 2), 0.07, p];
    case "tick": case "expand": return [S.tick(), 0.22, p];
    case "open": return [S.whoosh(BEAT / 3), 0.18, p];
    case "deal": case "build": return [S.thud(), 0.32, p];
    case "chime": return [S.chime(e.i ?? 0), 0.3, p];
    case "sparkle": return [S.sparkle(), 0.34, 0];
    case "done": case "apply": return [S.chime(2), 0.26, p];
    case "bloom": return [S.bloom(), 0.5, 0];
    case "pulse": return [S.pulse(), 0.7, 0];
    case "drop": return [S.drop(), 0.36, p];
    default: return null;
  }
}

/* ── Music ───────────────────────────────────────────────────────────────── */
const CHORDS = {
  F: { pad: [53, 57, 60, 64, 67], root: 41 }, Dm: { pad: [50, 53, 57, 60, 64], root: 38 },
  Bb: { pad: [46, 50, 53, 57, 62], root: 34 }, C: { pad: [48, 52, 55, 62, 67], root: 36 },
};
const slots = Array.from({ length: Math.ceil(BARS / 2) }, (_, i) => ["F", "Dm", "Bb", "C"][i % 4]);
slots[slots.length - 2] = "C"; slots[slots.length - 1] = "F";       // resolve on the end card

const inRange = (bar, a, b) => bar >= a && bar < b;
const lift = (bar) => (inRange(bar, SCENE.s4, SCENE.s5) || inRange(bar, SCENE.s6, SCENE.s7) ? 1 : 0);

function renderMusic() {
  const bus = new Bus();
  const r = rng(11);
  // Pad: additive, band-limited, chorus-detuned; cutoff breathes with the lifts.
  const table = new Float32Array(4096); for (let i = 0; i < 4096; i++) table[i] = Math.sin(TAU * i / 4096);
  const sine = (ph) => table[((ph % 1) * 4096) | 0];
  slots.forEach((name, si) => {
    const t0 = si * 2 * BAR, dur = 2 * BAR, fade = 1.4, last = si === slots.length - 1;
    const len = Math.round((dur + fade + (last ? 2 : 0)) * SR), s0 = Math.round((t0 - fade / 2) * SR);
    const voices = CHORDS[name].pad.flatMap((m, vi) => [-4, 4].map((c) => ({ f: mtof(m) * 2 ** (c / 1200), pan: ((vi % 2) ? 0.35 : -0.35) * (c > 0 ? 1 : 0.6), ph: r() })));
    for (let k = 0; k < len; k++) {
      const j = s0 + k; if (j < 0 || j >= N) continue;
      const t = j / SR, lt = k / SR, bar = Math.floor(t / BAR) + 1;
      const endFade = last ? Math.max(0, Math.min(1, (FILM - t) / BAR)) : 1;
      const e = Math.min(1, lt / fade) * Math.min(1, (len / SR - lt) / fade) * endFade;
      const fc = (bar >= SCENE.s9 ? 700 : 950) + 850 * lift(bar) + 120 * Math.sin(TAU * t / (BAR * 2));
      let L = 0, Rr = 0;
      for (const v of voices) {
        const ph = v.ph + v.f * t;
        let s = 0;
        for (let hN = 1; hN <= 6; hN++) { const w = 1 / (hN ** 1.4) / (1 + (hN * v.f / fc) ** 2); s += sine(ph * hN) * w; }
        L += s * (1 - v.pan) * 0.5; Rr += s * (1 + v.pan) * 0.5;
      }
      bus.L[j] += L * e * 0.06; bus.R[j] += Rr * e * 0.06;
    }
  });
  // Sub pulse on beats 1 & 3 from bar 2; shaker on the off-beats from S3 until the end card.
  const sub = (f) => { const n = Math.round(0.6 * SR), o = new Float32Array(n); let ph = 0; for (let k = 0; k < n; k++) { const t = k / SR; ph += TAU * f * (1 + 0.25 * Math.exp(-t / 0.03)) / SR; o[k] = Math.sin(ph) * env(t, 0.006, 0.28); } return o; };
  const shaker = () => { const n = Math.round(0.05 * SR), b = noiseBuf(n, r), hp = biquad("hp", 6500), o = new Float32Array(n); for (let k = 0; k < n; k++) o[k] = hp(b[k]) * env(k / SR, 0.004, 0.012); return o; };
  for (let bar = 2; bar <= BARS; bar++) {
    const chord = CHORDS[slots[Math.floor((bar - 1) / 2)]];
    const endGain = bar >= BARS ? 0.5 : 1;
    for (const beat of [0, 2]) add(bus, sub(mtof(chord.root)), at(bar, beat), (bar >= SCENE.s9 ? 0.14 : 0.2) * endGain);
    if (bar >= SCENE.s3 && bar < SCENE.s9) for (let beat = 0; beat < 4; beat++) add(bus, shaker(), at(bar, beat + 0.5), (beat % 2 ? 0.07 : 0.05) * (1 + 0.5 * lift(bar)), beat % 2 ? 0.3 : -0.3);
  }
  // Lifts: a riser into S4 and S6, and a soft 8th-note pluck line while they play.
  const riser = (dur) => { const n = Math.round(dur * SR), b = noiseBuf(n, r), o = new Float32Array(n), bp = sweepBP(1.2); for (let k = 0; k < n; k++) { const p = k / n; if (k % 32 === 0) bp.set(300 + 5000 * p * p); o[k] = bp.run(b[k]) * p * p; } return o; };
  const pluck = (f) => { const n = Math.round(0.5 * SR), o = new Float32Array(n); for (let k = 0; k < n; k++) { const t = k / SR; o[k] = (Math.sin(TAU * f * t) + 0.3 * Math.sin(TAU * 2 * f * t)) * env(t, 0.003, 0.12); } return o; };
  for (const s of [SCENE.s4, SCENE.s6]) add(bus, riser(BAR), at(s - 1), 0.12);
  for (let bar = 1; bar <= BARS; bar++) {
    if (!lift(bar)) continue;
    const pad = CHORDS[slots[Math.floor((bar - 1) / 2)]].pad;
    for (let e8 = 0; e8 < 8; e8++) add(bus, pluck(mtof(pad[(e8 * 3) % pad.length] + 12)), at(bar, e8 / 2), 0.05, e8 % 2 ? 0.4 : -0.4);
  }
  return bus;
}

/* ── Reverb (Schroeder-style) for a bus ──────────────────────────────────── */
function reverb(bus, wet = 0.18) {
  const combs = [1557, 1617, 1491, 1422], aps = [225, 556];
  for (const ch of ["L", "R"]) {
    const x = bus[ch], y = new Float32Array(N), spread = ch === "R" ? 23 : 0;
    for (const d0 of combs) {
      const d = d0 + spread, buf = new Float32Array(d); let idx = 0, lp = 0;
      for (let i = 0; i < N; i++) { const out = buf[idx]; lp = out * 0.8 + lp * 0.2; buf[idx] = x[i] + lp * 0.84; idx = (idx + 1) % d; y[i] += out * 0.25; }
    }
    for (const d0 of aps) {
      const d = d0 + spread, buf = new Float32Array(d); let idx = 0;
      for (let i = 0; i < N; i++) { const bo = buf[idx], v = y[i]; buf[idx] = v + bo * 0.5; y[i] = bo - v * 0.5; idx = (idx + 1) % d; }
    }
    for (let i = 0; i < N; i++) x[i] = x[i] * (1 - wet) + y[i] * wet * 1.6;
  }
}

/* ── Loudness (ITU-R BS.1770, K-weighted, gated) ─────────────────────────── */
function lufs(bus) {
  const kw = (x) => {
    const s1 = { b: [1.53512485958697, -2.69169618940638, 1.19839281085285], a: [-1.69065929318241, 0.73248077421585] };
    const s2 = { b: [1, -2, 1], a: [-1.99004745483398, 0.99007225036621] };
    const run = (inp, { b, a }) => { const o = new Float32Array(inp.length); let x1 = 0, x2 = 0, y1 = 0, y2 = 0; for (let i = 0; i < inp.length; i++) { const y = b[0] * inp[i] + b[1] * x1 + b[2] * x2 - a[0] * y1 - a[1] * y2; x2 = x1; x1 = inp[i]; y2 = y1; y1 = y; o[i] = y; } return o; };
    return run(run(x, s1), s2);
  };
  const L = kw(bus.L), Rr = kw(bus.R), blk = Math.round(0.4 * SR), hop = Math.round(0.1 * SR), z = [];
  for (let s = 0; s + blk <= N; s += hop) { let m = 0; for (let i = s; i < s + blk; i++) m += L[i] * L[i] + Rr[i] * Rr[i]; z.push(m / blk); }
  const ld = (m) => -0.691 + 10 * Math.log10(m);
  const abs = z.filter((m) => ld(m) > -70);
  if (!abs.length) return -Infinity;
  const rel = ld(abs.reduce((a, b) => a + b, 0) / abs.length) - 10;
  const g = abs.filter((m) => ld(m) > rel);
  return ld(g.reduce((a, b) => a + b, 0) / g.length);
}
const gainBus = (bus, db) => { const g = 10 ** (db / 20); for (let i = 0; i < N; i++) { bus.L[i] *= g; bus.R[i] *= g; } };

function limit(bus, ceilingDb = -1) {
  const c = 10 ** (ceilingDb / 20), look = Math.round(0.005 * SR), rel = Math.exp(-1 / (0.08 * SR));
  const need = new Float32Array(N);
  for (let i = 0; i < N; i++) { const p = Math.max(Math.abs(bus.L[i]), Math.abs(bus.R[i])); need[i] = p > c ? c / p : 1; }
  // Look-ahead minimum, then smooth release.
  let g = 1; const gains = new Float32Array(N);
  for (let i = N - 1; i >= 0; i--) { let m = need[i]; for (let k = 1; k < look && i + k < N; k += 8) m = Math.min(m, need[i + k]); gains[i] = m; }
  for (let i = 0; i < N; i++) { g = gains[i] < g ? gains[i] : g * rel + gains[i] * (1 - rel); bus.L[i] *= g; bus.R[i] *= g; }
}

function writeWav(path, bus) {
  const n = N, data = Buffer.alloc(44 + n * 4);
  data.write("RIFF", 0); data.writeUInt32LE(36 + n * 4, 4); data.write("WAVEfmt ", 8); data.writeUInt32LE(16, 16);
  data.writeUInt16LE(1, 20); data.writeUInt16LE(2, 22); data.writeUInt32LE(SR, 24); data.writeUInt32LE(SR * 4, 28);
  data.writeUInt16LE(4, 32); data.writeUInt16LE(16, 34); data.write("data", 36); data.writeUInt32LE(n * 4, 40);
  for (let i = 0; i < n; i++) {
    data.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(bus.L[i] * 32767))), 44 + i * 4);
    data.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(bus.R[i] * 32767))), 46 + i * 4);
  }
  writeFileSync(path, data);
}

/* ── Build ───────────────────────────────────────────────────────────────── */
const film = await openFilm({ width: 960, height: 540 });
const events = film.info.events;
await film.close();
console.log(`${events.length} timeline events, ${BPM} BPM, ${FILM}s`);

const music = renderMusic();
reverb(music, 0.22);
const fx = new Bus();
let used = 0;
for (const e of events) { const v = voice(e); if (!v) continue; add(fx, v[0], e.time, v[1], v[2]); used++; }
reverb(fx, 0.12);

const mL = lufs(music), fL = lufs(fx);
gainBus(music, -14 - mL);
gainBus(fx, -23 - fL);                             // SFX sit 9 dB under the music
const mix = new Bus();
for (let i = 0; i < N; i++) { mix.L[i] = music.L[i] + fx.L[i]; mix.R[i] = music.R[i] + fx.R[i]; }
limit(mix, -1.5);                                  // sample ceiling low enough that true peak stays < −1 dBTP
mkdirSync("dist", { recursive: true });
writeWav("dist/mix.wav", mix);
// Compact copy for the web preview (and GitHub Pages).
mkdirSync("assets/audio", { recursive: true });
spawnSync(ffmpegPath, ["-y", "-loglevel", "error", "-i", "dist/mix.wav", "-c:a", "aac", "-b:a", "192k", "assets/audio/soundtrack.m4a"]);
console.log(`music ${mL.toFixed(1)} → -14.0 LUFS · sfx ${fL.toFixed(1)} → -23.0 LUFS (${used} sounds) · mix ${lufs(mix).toFixed(1)} LUFS → dist/mix.wav`);
