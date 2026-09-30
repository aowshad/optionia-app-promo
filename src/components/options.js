// Optionia storefront option widgets as live DOM (reference: Figma "All options / Default",
// Featured Banner "Custom Products Option"). Factories only build DOM and return handles;
// scenes choreograph them. Time-driven bits (typing, caret, rolling digits) are drivers.
import { BEAT, DUR, EASE } from "../tokens.js";
import { driver, track, sfx } from "../clock.js";
import { h } from "./basics.js";
import { ICONS } from "./chips.js";

const CHEV = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>`;
const CHEV_UP = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m6 15 6-6 6 6"/></svg>`;
const CHEV_DN = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>`;
const CAL = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="5" width="17" height="15.5" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4"/></svg>`;
const TICK = `<svg viewBox="0 0 20 20" width="20" height="20"><path d="M5 10.4 8.4 13.6 15 6.8" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" pathLength="1" style="stroke-dasharray:1 1;stroke-dashoffset:1"/></svg>`;

/** Label (+ required star + help icon) and helper line around a body. */
function field({ label, required = true, help, q = true, body, cls = "" }) {
  return h("div", `of ${cls}`, `
    <div class="of-label">${label}${required ? "<b>*</b>" : ""}${q ? `<span class="q">?</span>` : ""}</div>
    ${help ? `<div class="of-help">${help}</div>` : ""}
    <div class="of-body">${body}</div>`);
}

/* ── Time-driven primitives ─────────────────────────────────────────────── */

/**
 * Type `text` into `valEl` starting at t0, one char every `dt`. Pure function of time.
 * Emits a key-tap SFX per character. Optionally updates a "n/max" counter and hides a placeholder.
 */
export function typer({ valEl, text, t0, dt, count, max, ph }) {
  const n = text.length;
  for (let i = 0; i < n; i++) if (text[i] !== "\n") sfx(t0 + i * dt, "key", { i });
  let last = -1;
  driver((t) => {
    const k = Math.max(0, Math.min(n, Math.floor((t - t0) / dt) + 1));
    if (k === last) return;
    last = k;
    valEl.textContent = text.slice(0, k);
    if (count) count.textContent = `${text.slice(0, k).replace(/\n/g, "").length}/${max}`;
    if (ph) ph.style.opacity = k > 0 ? 0 : 1;
  });
  return t0 + n * dt;
}

/** A text caret: solid while typing, blinking on the half-beat grid while idle, hidden outside [on, off). */
export function caret(el, { on, off, typingEnd }) {
  driver((t) => {
    let o = 0;
    if (t >= on && t < off) o = t < typingEnd ? 1 : (Math.floor((t - typingEnd) / (BEAT / 2)) % 2 === 0 ? 1 : 0);
    el.style.opacity = o;
  });
}

/** Text that changes at given times: [[t, text], …] — a pure function of time (scrub-safe). */
export function textAt(el, steps) {
  const initial = el.textContent;
  driver((t) => {
    let s = initial;
    for (const [t0, txt] of steps) if (t >= t0) s = txt;
    if (el.textContent !== s) el.textContent = s;
  });
}

/** Rolling digits: `strip` is a column of digits; value track drives translateY. */
export function roller(stripEl, lineH, initial = 0) {
  const tr = track({ v: initial });
  driver((t) => { stripEl.style.transform = `translateY(${-tr.at(t).v * lineH}px)`; });
  return {
    to(t0, v, { dur = DUR.in } = {}) { tr.to(t0, { v }, { dur, ease: EASE.in }); },
  };
}

/* ── Widgets ────────────────────────────────────────────────────────────── */

export function textInput({ label, help, placeholder, max = 20 }) {
  const el = field({ label, help, body: `
    <div class="of-input of-text"><span class="ph">${placeholder}</span><span class="val"></span><i class="caret"></i><span class="cnt">0/${max}</span></div>` });
  const q = (s) => el.querySelector(s);
  return { el, box: q(".of-input"), val: q(".val"), ph: q(".ph"), cnt: q(".cnt"), caret: q(".caret"), max };
}

export function textArea({ label, help, placeholder, max = 100 }) {
  const el = field({ label, help, body: `
    <div class="of-input of-area"><span class="ph">${placeholder}</span><span class="val"></span><i class="caret"></i><span class="cnt">0/${max}</span></div>` });
  const q = (s) => el.querySelector(s);
  return { el, box: q(".of-input"), val: q(".val"), ph: q(".ph"), cnt: q(".cnt"), caret: q(".caret"), max };
}

export function numberInput({ label, help, from = 1, to = 9 }) {
  const digits = Array.from({ length: to - from + 1 }, (_, i) => `<span>${from + i}</span>`).join("");
  const el = field({ label, help, body: `
    <div class="of-input of-num"><span class="digits"><span class="strip">${digits}</span></span>
      <div class="step"><i class="up">${CHEV_UP}</i><i class="dn">${CHEV_DN}</i></div></div>` });
  const q = (s) => el.querySelector(s);
  return { el, box: q(".of-input"), up: q(".up"), strip: q(".strip"), from };
}

export function dropdown({ label, help, options, value = 0 }) {
  const el = field({ label, help, cls: "of-dd", body: `
    <div class="of-input of-select"><span class="val">${options[value]}</span><span class="chev">${CHEV}</span></div>
    <div class="menu"><i class="hl"></i>${options.map((o) => `<div class="mi">${o}</div>`).join("")}</div>` });
  const q = (s) => el.querySelector(s);
  return { el, box: q(".of-input"), val: q(".val"), chev: q(".chev"), menu: q(".menu"), hl: q(".hl"), items: [...el.querySelectorAll(".mi")] };
}

export function radio({ label, help, options, value = 0 }) {
  const el = field({ label, help, body: `
    <div class="of-radio"><i class="dot"></i>${options.map(([n, p]) => `
      <div class="ro"><i class="rc"></i><span>${n}</span>${p ? `<em>(${p})</em>` : ""}</div>`).join("")}</div>` });
  return { el, list: el.querySelector(".of-radio"), dot: el.querySelector(".dot"), rows: [...el.querySelectorAll(".ro")], circles: [...el.querySelectorAll(".rc")], value };
}

export function checkbox({ label, help, options }) {
  const el = field({ label, help, body: `
    <div class="of-check">${options.map(([n, p]) => `
      <div class="co"><i class="cb">${TICK}</i><span>${n}</span>${p ? `<em>(${p})</em>` : ""}</div>`).join("")}</div>` });
  return { el, boxes: [...el.querySelectorAll(".cb")], ticks: [...el.querySelectorAll(".cb path")] };
}

export function colorSwatch({ label, help, colors, value = 0 }) {
  const el = field({ label, help, body: `
    <div class="of-swatches"><i class="ring"></i>${colors.map((c) => `<div class="sw" style="background:${c}"></div>`).join("")}</div>` });
  return { el, ring: el.querySelector(".ring"), sw: [...el.querySelectorAll(".sw")], value };
}

export function imageSwatch({ label, help, items }) {
  const el = field({ label, help, body: `
    <div class="of-thumbs">${items.map(([src, filter, name]) => `
      <div class="th"><img src="${src}" style="filter:${filter}" alt=""><span>${name}</span></div>`).join("")}</div>` });
  return { el, thumbs: [...el.querySelectorAll(".th")] };
}

export function datePicker({ label, help, placeholder = "Select a date", month = "October 2026", startDow = 3, days = 31 }) {
  const cells = Array.from({ length: startDow }, () => `<i></i>`)
    .concat(Array.from({ length: days }, (_, i) => `<i class="d">${i + 1}</i>`)).join("");
  const el = field({ label, help, cls: "of-date", body: `
    <div class="of-input of-datein"><span class="ph">${placeholder}</span><span class="val"></span><span class="cal">${CAL}</span></div>
    <div class="calpop"><div class="cal-h"><b>${month}</b><span>‹ ›</span></div>
      <div class="cal-w">${["S", "M", "T", "W", "T", "F", "S"].map((d) => `<i>${d}</i>`).join("")}</div>
      <div class="cal-g"><i class="cal-sel"></i>${cells}</div></div>` });
  const q = (s) => el.querySelector(s);
  return { el, box: q(".of-input"), val: q(".val"), ph: q(".ph"), pop: q(".calpop"), sel: q(".cal-sel"), days: [...el.querySelectorAll(".cal-g .d")] };
}

export function upload({ label, help, file = "artwork.png", size = "2.4 MB", thumb }) {
  const el = field({ label, help, body: `
    <div class="of-drop"><div class="btn2">${ICONS.upload}<span>Upload Files</span></div>
      <div class="fine">Supported files: jpg, png, pdf · up to 5 MB</div></div>
    <div class="of-file"><img src="${thumb}" alt=""><div class="meta"><b>${file}</b><span class="sz">${size}</span>
      <div class="bar"><i></i></div></div><span class="pct">0%</span></div>` });
  const q = (s) => el.querySelector(s);
  return { el, drop: q(".of-drop"), btn: q(".btn2"), file: q(".of-file"), fill: q(".bar i"), pct: q(".pct") };
}

/* ── The six "burst" types (compact bodies for floating cards) ─────────── */

// Multi-select rings are real elements (not classes) so selection can fade/scale in and out.
export function multiColor(colors, picked) {
  return h("div", "of-mini of-swatches multi", colors.map((c, i) =>
    `<div class="sw" style="background:${c}"><i class="mr" style="opacity:${picked.includes(i) ? 1 : 0}"></i></div>`).join(""));
}
export function multiImage(srcs, picked) {
  return h("div", "of-mini of-thumbs multi", srcs.map((s, i) =>
    `<div class="th"><img src="${s}" alt=""><i class="mr" style="opacity:${picked.includes(i) ? 1 : 0}"><b>✓</b></i></div>`).join(""));
}
/** Heading with an alternate line stacked below, for a masked word swap. */
export function headingBlock(text, alt = "") {
  return h("div", "of-mini of-heading", `<div class="hh"><span>${text}</span>${alt ? `<span>${alt}</span>` : ""}</div><div class="hs">Section heading</div>`);
}
/** Paragraph; wrap a phrase in [[…]] to make it highlightable. */
export function paragraphBlock(text) {
  return h("div", "of-mini of-para", text.replace(/\[\[(.+?)\]\]/, "<mark>$1</mark>"));
}
export function dividerBlock(label = "Add-ons", alt = "") {
  return h("div", "of-mini of-divider", `<i></i><span class="dl"><b>${label}</b>${alt ? `<b>${alt}</b>` : ""}</span><i></i>`);
}
export function htmlBlock() {
  return h("div", "of-mini of-html", `<div class="hd">HTML <span>&lt;/&gt;</span></div>
    <pre><b>1</b> <u>&lt;p</u> <s>class</s>=<q>"note"</q><u>&gt;</u>
<b>2</b>   Ships in 3 days ✦
<b>3</b>   <em class="typed"></em><i class="caret"></i>
<b>4</b> <u>&lt;/p&gt;</u></pre>`);
}
