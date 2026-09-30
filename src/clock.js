// Time-driven state. Everything here is a pure function of timeline time `t`,
// so any frame can be rendered in any order and look identical.
import { DUR, EASE } from "./tokens.js";

const gsap = window.gsap;
const drivers = [];

/** Register fn(t) to run after every timeline render (breath, bob, camera, cursor…). */
export function driver(fn) {
  drivers.push(fn);
  return fn;
}

export function runDrivers(t) {
  for (const fn of drivers) fn(t);
}

const easeCache = new Map();
export function ease(name) {
  if (!easeCache.has(name)) easeCache.set(name, gsap.parseEase(name));
  return easeCache.get(name);
}

const lerp = (a, b, k) => a + (b - a) * k;

// Colours interpolate too ("#RRGGBB" / "rgb(a)(…)"), so whole theme token sets can be keyframed.
function parseColor(s) {
  if (typeof s !== "string") return null;
  if (/^#[0-9a-f]{6}$/i.test(s)) { const n = parseInt(s.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255, 1]; }
  const m = s.match(/^rgba?\(([^)]+)\)$/);
  if (m) { const p = m[1].split(",").map(Number); return [p[0], p[1], p[2], p[3] ?? 1]; }
  return null;
}
function lerpValue(a, b, k) {
  if (typeof a === "number" && typeof b === "number") return lerp(a, b, k);
  const ca = parseColor(a), cb = parseColor(b);
  if (ca && cb) {
    const c = ca.map((v, i) => lerp(v, cb[i], k));
    return `rgba(${Math.round(c[0])}, ${Math.round(c[1])}, ${Math.round(c[2])}, ${c[3].toFixed(3)})`;
  }
  return k < 1 ? a : b;
}

/**
 * A keyframed value track evaluated analytically at any time.
 * Keys must be added in chronological order. Each key tweens from the
 * track's value at `t0` to `to` over `dur` with `easeName`.
 * An optional `interp(from, to, k)` overrides per-key interpolation
 * (used for bezier cursor arcs and log-space zoom).
 */
export function track(initial) {
  const keys = [];
  const self = {
    initial: { ...initial },
    keys,
    to(t0, values, { dur = DUR.move, ease: easeName = EASE.move, interp } = {}) {
      const from = self.at(t0);
      const to = { ...from, ...values };
      keys.push({ t0, t1: t0 + dur, from, to, e: ease(easeName), interp });
      return self;
    },
    set(t0, values) {
      return self.to(t0, values, { dur: 0 });
    },
    at(t) {
      let v = self.initial;
      for (const k of keys) {
        if (t < k.t0) break;
        if (t >= k.t1) { v = k.to; continue; }
        const p = k.e((t - k.t0) / (k.t1 - k.t0));
        if (k.interp) { v = k.interp(k.from, k.to, p); continue; }
        const out = {};
        for (const key in k.to) out[key] = lerpValue(k.from[key], k.to[key], p);
        v = out;
      }
      return v;
    },
  };
  return self;
}

// SFX event list — every click/select/move emits {time, type, ...meta}.
const events = [];
export function sfx(time, type, meta = {}) {
  events.push({ time: +time.toFixed(6), type, ...meta });
}
export function getEvents() {
  return [...events].sort((a, b) => a.time - b.time);
}
