// Voice-over mix: places the lines from vo/script.json on their events, ducks the score under them
// and remuxes the film with the new audio. The picture is not re-rendered.
//   node render/audio.mjs --stems     (once: dist/audio/music_pre.wav + sfx_pre.wav)
//   node render/mix-vo.mjs --plan     timing report only
//   node render/mix-vo.mjs            → dist/audio/{mix_vo,vo_only,music_only,sfx_only}.wav,
//                                       dist/optionia-promo_vo.mp4, dist/optionia-promo_vo.srt
// VO chain: HPF 80 Hz → 2:1 compression → de-ess → 48 kHz. Music ducks 7 dB and SFX 2 dB under speech
// (150 ms attack with matching look-ahead, 400 ms release). Final: −14 LUFS, true peak ≤ −1 dBTP.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { BEAT, BARS, BAR } from "../src/tokens.js";

const SR = 48000;
const FILM = BARS * BAR;
const N = Math.ceil((FILM + 0.5) * SR);
const TOL = BEAT / 4;          // ±¼ beat for segment placement
const MARGIN = 0.5;            // a line must end this long before its next event
const GAP = 0.12;              // minimum silence between two segments of one line
const DUCK = { music: -7, sfx: -2, attack: 0.15, release: 0.4 };
const script = JSON.parse(readFileSync("vo/script.json", "utf8"));

/* ── Timing plan ─────────────────────────────────────────────────────────── */
function words(meta) {
  const out = [];
  const re = /\S+/g;
  let m;
  while ((m = re.exec(meta.chars))) {
    const a = m.index, b = m.index + m[0].length - 1;
    out.push({ w: m[0], a, b, t0: meta.starts[a], t1: meta.ends[b] });
  }
  return out;
}

function plan() {
  const parts = [];
  const problems = [];
  for (const line of script.lines) {
    const meta = JSON.parse(readFileSync(`assets/audio/vo/${line.id}.json`, "utf8"));
    const W = words(meta);
    const find = (w, from = 0) => {
      const i = W.findIndex((x, k) => k >= from && x.w === w);
      if (i < 0) throw new Error(`line ${line.id}: word "${w}" not found`);
      return i;
    };
    const segs = line.segments ?? [{ from: W[0].w, at: line.at }];
    let cursor = 0;
    const idx = segs.map((s) => (cursor = find(s.from, cursor)));
    segs.forEach((s, k) => {
      const i0 = idx[k];
      const i1 = k + 1 < segs.length ? idx[k + 1] - 1 : W.length - 1;
      const cutIn = i0 === 0 ? 0 : (W[i0 - 1].t1 + W[i0].t0) / 2;
      const cutOut = i1 === W.length - 1 ? meta.duration : (W[i1].t1 + W[i1 + 1].t0) / 2;
      const anchor = W[find(s.anchor ?? s.from, i0)];
      const place = s.at - (anchor.t0 - cutIn);          // film time of the cut-in point
      parts.push({
        line: line.id, k, text: W.slice(i0, i1 + 1).map((x) => x.w).join(" "),
        file: `assets/audio/vo/${line.id}.mp3`, cutIn, cutOut, place, at: s.at, shift: 0,
        speechStart: place + (W[i0].t0 - cutIn), speechEnd: place + (W[i1].t1 - cutIn),
        words: W.slice(i0, i1 + 1).map((x) => ({ w: x.w, t0: place + x.t0 - cutIn, t1: place + x.t1 - cutIn })),
        until: k + 1 < segs.length ? null : line.until, event: s.event, speed: meta.speed,
      });
    });
  }
  // Resolve overlaps between consecutive segments of the same line within ±¼ beat.
  for (let i = 1; i < parts.length; i++) {
    const p = parts[i - 1], q = parts[i];
    if (p.line !== q.line) continue;
    const over = p.speechEnd + GAP - q.speechStart;
    if (over <= 0) continue;
    const pBack = Math.min(over / 2, TOL), qFwd = Math.min(over - pBack, TOL);
    const shift = (x, d) => { x.place += d; x.speechStart += d; x.speechEnd += d; x.shift += d; x.words.forEach((w) => { w.t0 += d; w.t1 += d; }); };
    shift(p, -pBack); shift(q, qFwd);
    if (p.speechEnd + GAP > q.speechStart + 1e-6) problems.push({ line: p.line, why: `segments ${p.k}/${q.k} still overlap by ${(p.speechEnd + GAP - q.speechStart).toFixed(2)}s` });
  }
  for (const p of parts) if (p.until !== null && p.speechEnd > p.until - MARGIN) problems.push({ line: p.line, why: `ends ${p.speechEnd.toFixed(2)}s, needs ≤ ${(p.until - MARGIN).toFixed(2)}s` });
  return { parts, problems };
}

const { parts, problems } = plan();
console.log("line seg  starts    ends  anchor  shift  text");
for (const p of parts) console.log(`  ${p.line}  ${p.k}  ${p.speechStart.toFixed(2).padStart(6)}  ${p.speechEnd.toFixed(2).padStart(6)}  ${p.at.toFixed(2).padStart(6)}  ${(p.shift >= 0 ? "+" : "") + p.shift.toFixed(2)}  ${p.text}`);
if (problems.length) {
  console.log("\nTiming problems (regenerate these lines at 1.05):");
  for (const x of problems) console.log(`  line ${x.line}: ${x.why}`);
  process.exitCode = 2;
}
if (process.argv.includes("--plan")) process.exit();
if (problems.length) process.exit(2);

/* ── Audio ───────────────────────────────────────────────────────────────── */
const ff = (args) => {
  const r = spawnSync("ffmpeg", ["-hide_banner", "-loglevel", "error", ...args], { maxBuffer: 1 << 30 });
  if (r.status !== 0) throw new Error(r.stderr.toString());
  return r.stdout;
};
const f32 = (buf) => new Float32Array(buf.buffer, buf.byteOffset, buf.byteLength / 4);
function readStereo(path) {
  const x = f32(ff(["-i", path, "-f", "f32le", "-ac", "2", "-ar", String(SR), "-"]));
  const L = new Float32Array(N), R = new Float32Array(N);
  for (let i = 0; i < Math.min(N, x.length / 2); i++) { L[i] = x[2 * i]; R[i] = x[2 * i + 1]; }
  return { L, R };
}

// Voice: each part cut, faded and run through the chain, then placed at its film time.
const vo = new Float32Array(N);
for (const p of parts) {
  const len = p.cutOut - p.cutIn;
  const chain = [
    `atrim=start=${p.cutIn.toFixed(4)}:end=${p.cutOut.toFixed(4)}`, "asetpts=N/SR/TB",
    "aresample=48000:filter_size=64:phase_shift=10:cutoff=0.97",
    "highpass=f=80:poles=2",
    "acompressor=threshold=0.1:ratio=2:attack=8:release=160:knee=4:makeup=1.6",
    "deesser=i=0.45:m=0.5:f=0.5:s=o",
    `afade=t=in:d=0.012`, `afade=t=out:st=${Math.max(0, len - 0.03).toFixed(4)}:d=0.03`,
  ].join(",");
  const x = f32(ff(["-i", p.file, "-af", chain, "-f", "f32le", "-ac", "1", "-ar", String(SR), "-"]));
  const i0 = Math.round(p.place * SR);
  for (let i = 0; i < x.length; i++) if (i0 + i >= 0 && i0 + i < N) vo[i0 + i] += x[i];
}

// Loudness (BS.1770, gated) — same method as render/audio.mjs.
function lufs(L, R) {
  const kw = (inp) => {
    const st = [
      { b: [1.53512485958697, -2.69169618940638, 1.19839281085285], a: [-1.69065929318241, 0.73248077421585] },
      { b: [1, -2, 1], a: [-1.99004745483398, 0.99007225036621] },
    ];
    let x = inp;
    for (const { b, a } of st) {
      const o = new Float32Array(x.length); let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
      for (let i = 0; i < x.length; i++) { const y = b[0] * x[i] + b[1] * x1 + b[2] * x2 - a[0] * y1 - a[1] * y2; x2 = x1; x1 = x[i]; y2 = y1; y1 = y; o[i] = y; }
      x = o;
    }
    return x;
  };
  const A = kw(L), B = kw(R), blk = Math.round(0.4 * SR), hop = Math.round(0.1 * SR), z = [];
  for (let s = 0; s + blk <= N; s += hop) { let m = 0; for (let i = s; i < s + blk; i++) m += A[i] * A[i] + B[i] * B[i]; z.push(m / blk); }
  const ld = (m) => -0.691 + 10 * Math.log10(m);
  const abs = z.filter((m) => ld(m) > -70);
  const rel = ld(abs.reduce((a, b) => a + b, 0) / abs.length) - 10;
  const g = abs.filter((m) => ld(m) > rel);
  return ld(g.reduce((a, b) => a + b, 0) / g.length);
}
const db = (x) => 10 ** (x / 20);

// Speech (centre, gated so only where it talks) sits at −12 LUFS against a −14 LUFS score that
// ducks to about −21 under it: roughly 9 dB of clear space for the voice.
const voL = lufs(vo, vo);
const voG = db(-12 - voL);
for (let i = 0; i < N; i++) vo[i] *= voG;

// Sidechain: 0..1 "speech present" key with look-ahead, then attack/release smoothing.
const key = new Float32Array(N);
{
  const win = Math.round(0.02 * SR), look = Math.round(DUCK.attack * SR);
  let acc = 0;
  const thr = db(-45) ** 2 * win;
  const on = new Uint8Array(N);
  for (let i = 0; i < N; i++) {
    acc += vo[i] * vo[i];
    if (i >= win) acc -= vo[i - win] * vo[i - win];
    if (acc > thr) on[Math.max(0, i - win)] = 1;
  }
  // Hold through short gaps between words (< 250 ms), so the bed doesn't pump.
  const hold = Math.round(0.25 * SR);
  for (let i = 0, last = -1e9; i < N; i++) { if (on[i]) { if (i - last < hold) for (let k = last + 1; k < i; k++) on[k] = 1; last = i; } }
  const a = Math.exp(-1 / (DUCK.attack * SR / 4)), r = Math.exp(-1 / (DUCK.release * SR / 4));
  let g = 0;
  for (let i = 0; i < N; i++) {
    const target = on[Math.min(N - 1, i + look)] ? 1 : 0; // look-ahead: the duck lands as speech starts
    g = target > g ? target + (g - target) * a : target + (g - target) * r;
    key[i] = g;
  }
}

const music = readStereo("dist/audio/music_pre.wav");
const sfx = readStereo("dist/audio/sfx_pre.wav");
for (let i = 0; i < N; i++) {
  const gm = db(DUCK.music * key[i]), gs = db(DUCK.sfx * key[i]);
  music.L[i] *= gm; music.R[i] *= gm; sfx.L[i] *= gs; sfx.R[i] *= gs;
}

const mix = { L: new Float32Array(N), R: new Float32Array(N) };
for (let i = 0; i < N; i++) { mix.L[i] = music.L[i] + sfx.L[i] + vo[i]; mix.R[i] = music.R[i] + sfx.R[i] + vo[i]; }

// Final level: −14 LUFS, then a look-ahead limiter; tighten until true peak ≤ −1 dBTP.
function limit(bus, ceilingDb) {
  const c = db(ceilingDb), look = Math.round(0.005 * SR), rel = Math.exp(-1 / (0.08 * SR));
  const need = new Float32Array(N);
  for (let i = 0; i < N; i++) { const p = Math.max(Math.abs(bus.L[i]), Math.abs(bus.R[i])); need[i] = p > c ? c / p : 1; }
  const gains = new Float32Array(N);
  for (let i = N - 1; i >= 0; i--) { let m = need[i]; for (let k = 1; k < look && i + k < N; k += 8) m = Math.min(m, need[i + k]); gains[i] = m; }
  let g = 1;
  for (let i = 0; i < N; i++) { g = gains[i] < g ? gains[i] : g * rel + gains[i] * (1 - rel); bus.L[i] *= g; bus.R[i] *= g; }
}
function wav(path, ch, bits) {
  const n = N, bps = bits / 8, chans = ch.length, data = Buffer.alloc(44 + n * bps * chans);
  data.write("RIFF", 0); data.writeUInt32LE(36 + n * bps * chans, 4); data.write("WAVEfmt ", 8); data.writeUInt32LE(16, 16);
  data.writeUInt16LE(bits === 32 ? 3 : 1, 20); data.writeUInt16LE(chans, 22); data.writeUInt32LE(SR, 24); data.writeUInt32LE(SR * bps * chans, 28);
  data.writeUInt16LE(bps * chans, 32); data.writeUInt16LE(bits, 34); data.write("data", 36); data.writeUInt32LE(n * bps * chans, 40);
  let o = 44;
  for (let i = 0; i < n; i++) for (const c of ch) {
    if (bits === 32) data.writeFloatLE(c[i], o);
    else data.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(c[i] * 32767))), o);
    o += bps;
  }
  writeFileSync(path, data);
}
function measure(path) {
  const out = spawnSync("ffmpeg", ["-hide_banner", "-nostats", "-i", path, "-af", "ebur128=peak=true", "-f", "null", "-"]).stderr.toString();
  const s = out.slice(out.lastIndexOf("Summary"));
  return { I: Number(s.match(/I:\s+(-?[\d.]+)/)[1]), LRA: Number(s.match(/LRA:\s+(-?[\d.]+)/)[1]), TP: Number(s.match(/Peak:\s+(-?[\d.]+)/)[1]) };
}

const preGain = db(-14 - lufs(mix.L, mix.R));
for (const b of [mix, music, sfx]) for (let i = 0; i < N; i++) { b.L[i] *= preGain; b.R[i] *= preGain; }
for (let i = 0; i < N; i++) vo[i] *= preGain;

mkdirSync("dist/audio", { recursive: true });
let ceiling = -1.5, m;
const base = { L: mix.L.slice(), R: mix.R.slice() };
for (;;) {
  mix.L.set(base.L); mix.R.set(base.R);
  limit(mix, ceiling);
  wav("dist/audio/mix_vo.wav", [mix.L, mix.R], 16);
  m = measure("dist/audio/mix_vo.wav");
  if (m.TP <= -1.0 || ceiling < -4) break;
  ceiling -= 0.3;
}
wav("dist/audio/vo_only.wav", [vo, vo], 32);
wav("dist/audio/music_only.wav", [music.L, music.R], 32);
wav("dist/audio/sfx_only.wav", [sfx.L, sfx.R], 32);
console.log(`\nmix_vo.wav: ${m.I.toFixed(1)} LUFS · true peak ${m.TP.toFixed(1)} dBTP · LRA ${m.LRA.toFixed(1)} LU (limiter ceiling ${ceiling.toFixed(1)} dBFS)`);

/* ── Video (remux, picture untouched) and captions ──────────────────────── */
ff(["-y", "-i", "dist/optionia-promo_silent.mp4", "-i", "dist/audio/mix_vo.wav", "-map", "0:v", "-map", "1:a",
  "-c:v", "copy", "-c:a", "aac", "-b:a", "320k", "-t", String(FILM), "-movflags", "+faststart", "dist/optionia-promo_vo.mp4"]);

// One caption cue per sentence (split at . ? !), timed from the placed words.
const cues = [];
for (const p of parts) {
  let cur = [];
  for (const w of p.words) {
    cur.push(w);
    if (/[.?!]$/.test(w.w)) { cues.push(cur); cur = []; }
  }
  if (cur.length) cues.push(cur);
}
const merged = [];
for (const c of cues) {
  const prev = merged[merged.length - 1];
  // Keep fragments of one sentence together when they are close (segments of one line).
  if (prev && !/[.?!]$/.test(prev[prev.length - 1].w) && c[0].t0 - prev[prev.length - 1].t1 < 1.5) prev.push(...c);
  else merged.push([...c]);
}
const fmt = (t) => {
  const ms = Math.max(0, Math.round(t * 1000));
  const h = Math.floor(ms / 3600000), mi = Math.floor(ms / 60000) % 60, s = Math.floor(ms / 1000) % 60, r = ms % 1000;
  return `${String(h).padStart(2, "0")}:${String(mi).padStart(2, "0")}:${String(s).padStart(2, "0")},${String(r).padStart(3, "0")}`;
};
const srt = merged.map((c, i) => {
  const next = merged[i + 1];
  const t0 = c[0].t0 - 0.1, t1 = Math.min(c[c.length - 1].t1 + 0.6, next ? next[0].t0 - 0.15 : FILM);
  return `${i + 1}\n${fmt(t0)} --> ${fmt(t1)}\n${c.map((w) => w.w).join(" ")}\n`;
}).join("\n");
writeFileSync("dist/optionia-promo_vo.srt", srt);
writeFileSync("dist/audio/vo_cues.json", JSON.stringify(merged.map((c, i) => {
  const next = merged[i + 1];
  return { t0: c[0].t0 - 0.1, t1: Math.min(c[c.length - 1].t1 + 0.6, next ? next[0].t0 - 0.15 : FILM), text: c.map((w) => w.w).join(" ") };
}), null, 1));
console.log(`dist/optionia-promo_vo.mp4 · dist/optionia-promo_vo.srt (${merged.length} cues) · stems in dist/audio/`);
