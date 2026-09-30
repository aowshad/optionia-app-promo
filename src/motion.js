// Shared motion recipes. Scenes compose these; they never invent their own.
import { BEAT, DUR, EASE, STAGGER, AMBIENT, BAR } from "./tokens.js";
import { driver } from "./clock.js";

const gsap = window.gsap;
const TAU = Math.PI * 2;

/**
 * The one entrance: opacity 0→1, y 24→0, blur 8→0, scale 0.98→1.
 * Returns the time the last element finishes.
 */
export function enter(tl, targets, t0, { stagger = STAGGER, dur = DUR.in } = {}) {
  const els = gsap.utils.toArray(targets);
  tl.fromTo(els,
    { opacity: 0, y: 24, scale: 0.98, filter: "blur(8px)" },
    { opacity: 1, y: 0, scale: 1, filter: "blur(0px)", duration: dur, ease: EASE.in, stagger, immediateRender: true },
    t0);
  // Drop the (expensive) zero-blur filter once settled.
  tl.set(els, { filter: "none" }, t0 + dur + stagger * (els.length - 1));
  return t0 + dur + stagger * (els.length - 1);
}

/** The one exit: shorter than the entrance, falls back and softens. */
export function exit(tl, targets, t0, { stagger = STAGGER / 2 } = {}) {
  const els = gsap.utils.toArray(targets);
  tl.fromTo(els,
    { opacity: 1, y: 0, filter: "blur(0px)" },
    { opacity: 0, y: -12, filter: "blur(6px)", duration: DUR.out, ease: EASE.out, stagger, immediateRender: false },
    t0);
  return t0 + DUR.out + stagger * (els.length - 1);
}

/** Split a headline into masked words (never letters). Returns the inner word spans. */
export function splitWords(el) {
  const words = el.textContent.trim().split(/\s+/);
  el.innerHTML = words.map((w) => `<span class="mask"><span class="word">${w}</span></span>`).join(" ");
  return [...el.querySelectorAll(".word")];
}

/** Mask reveal (y 100% → 0) with STAGGER per word/line. */
export function reveal(tl, words, t0, { stagger = STAGGER } = {}) {
  const els = gsap.utils.toArray(words);
  tl.fromTo(els, { yPercent: 105 }, { yPercent: 0, duration: DUR.in, ease: EASE.in, stagger, immediateRender: true }, t0);
  return t0 + DUR.in + stagger * (els.length - 1);
}

export function unreveal(tl, words, t0, { stagger = STAGGER / 2 } = {}) {
  const els = gsap.utils.toArray(words);
  tl.fromTo(els, { yPercent: 0 }, { yPercent: -105, duration: DUR.out, ease: EASE.out, stagger, immediateRender: false }, t0);
  return t0 + DUR.out + stagger * (els.length - 1);
}

/* ── Ambient: nothing is ever perfectly still ─────────────────────────────── */

const bobbers = [];
/**
 * Float an element ±4px on a 2-bar sine, phase-offset per element.
 * Uses the independent CSS `translate` property so it composes with GSAP transforms.
 */
export function bob(el, phase = bobbers.length * 0.37, amp = AMBIENT.bob) {
  bobbers.push({ el, phase, amp });
}

/** The bob offset (px) an element with `phase` has at time t — for seamless handoffs. */
export function bobAt(t, phase, amp = AMBIENT.bob) {
  return amp * Math.sin((t / DUR.breath) * TAU + phase * TAU);
}

export function installAmbient({ root, glowA, glowB }) {
  driver((t) => {
    const p = (t / DUR.breath) * TAU;
    // Breath: 1.000 → 1.012 → 1.000 over 2 bars, sine in/out.
    const s = 1 + AMBIENT.breathScale * (1 - Math.cos(p)) / 2;
    // Drift: slow Lissajous, ±6px, periods on the bar grid.
    const dx = AMBIENT.drift * Math.sin((t / (BAR * 7)) * TAU);
    const dy = AMBIENT.drift * Math.sin((t / (BAR * 5)) * TAU + 1.1);
    root.style.transform = `translate(${dx}px, ${dy}px) scale(${s})`;

    for (const b of bobbers) b.el.style.translate = `0 ${b.amp * Math.sin(p + b.phase * TAU)}px`;

    // Background glows drift with the breath, in opposite corners.
    glowA.style.transform = `translate(${-40 * Math.cos(p) + dx * 4}px, ${30 * Math.sin(p)}px) scale(${1 + 0.06 * Math.sin(p)})`;
    glowB.style.transform = `translate(${36 * Math.sin(p)}px, ${-28 * Math.cos(p) + dy * 4}px) scale(${1 + 0.05 * Math.cos(p)})`;
  });
}

/** Faint Figma-board dot grid, locked to the camera so glides read as travel. */
export function installGrid(gridEl, camera) {
  const GAP = 32;
  driver((t) => {
    const c = camera.at(t);
    const g = GAP * c.s;
    const o = camera.project(0, 0, t);
    gridEl.style.backgroundSize = `${g}px ${g}px`;
    gridEl.style.backgroundPosition = `${o.x % g}px ${o.y % g}px`;
    // Fade the grid when zoomed far out so it never turns to noise.
    gridEl.style.opacity = Math.min(1, Math.max(0, (c.s - 0.25) / 0.5));
  });
}

export { BEAT };
