// The live Optionia option set, styled entirely by CSS custom properties (--os-*).
// One data structure, one token set per theme: S5 edits tokens with the styling panel,
// S6 swaps whole token sets. Numbers and colours interpolate; the only non-interpolable
// token (uppercase labels) crossfades via --os-up (0 → 1).
import { h } from "./basics.js";
import { track, driver } from "../clock.js";

const ART = "assets/art/artwork_160.png";
export const BASE_PRICE = 48.5;
export const ADDONS = [["Gift wrap this item", 5], ["Heavyweight fabric", 8], ["Add a personal note", 5]];

/** Theme tokens. Units: px for radii/borders; em for tracking; multipliers for gap/fs. */
export const THEMES = [
  { name: "Default", bg: "#FFFFFF", r: 20, inr: 8, swr: 8, bw: 1, border: "#E5E7EB", fill: "#FFFFFF", ring: "#6366F1", glow: "rgba(167,139,250,0)",
    title: "#1F2937", text: "#1F2937", muted: "#6B7280", tw: 600, ls: 0, up: 0, btn: "#111827", btnfg: "#FFFFFF", btnr: 8,
    gap: 1, fs: 1, sh: 0.18, addon: "#EEF2FF", addonfg: "#3730A3", css: 0 },
  { name: "Classic", bg: "#FFFFFF", r: 0, inr: 0, swr: 0, bw: 1.5, border: "#1C1917", fill: "#FFFFFF", ring: "#1C1917", glow: "rgba(167,139,250,0)",
    title: "#1C1917", text: "#1C1917", muted: "#57534E", tw: 700, ls: -0.02, up: 0, btn: "#000000", btnfg: "#FFFFFF", btnr: 0,
    gap: 1, fs: 1, sh: 0.1, addon: "#F5F5F4", addonfg: "#1C1917", css: 0 },
  { name: "Modern", bg: "#FFFFFF", r: 28, inr: 14, swr: 14, bw: 0, border: "#EDE9FE", fill: "#F3F0FF", ring: "#8B5CF6", glow: "rgba(167,139,250,0)",
    title: "#2E1065", text: "#2E1065", muted: "#7C6FA0", tw: 600, ls: -0.01, up: 0, btn: "#7C3AED", btnfg: "#FFFFFF", btnr: 14,
    gap: 1, fs: 1, sh: 0.2, addon: "#F3E8FF", addonfg: "#6D28D9", css: 0 },
  { name: "Elegant", bg: "#FFFCFA", r: 6, inr: 2, swr: 24, bw: 0.75, border: "#CDBBCB", fill: "#FFFDFB", ring: "#6B2D5C", glow: "rgba(167,139,250,0)",
    title: "#3B1F35", text: "#3B1F35", muted: "#8C7A88", tw: 500, ls: 0.14, up: 1, btn: "#4A2140", btnfg: "#FFFFFF", btnr: 2,
    gap: 1.18, fs: 0.94, sh: 0.12, addon: "#F7F0F4", addonfg: "#6B2D5C", css: 0 },
  { name: "Compact", bg: "#FFFFFF", r: 10, inr: 6, swr: 6, bw: 1, border: "#D4D4D8", fill: "#FFFFFF", ring: "#2563EB", glow: "rgba(167,139,250,0)",
    title: "#18181B", text: "#18181B", muted: "#71717A", tw: 600, ls: 0, up: 0, btn: "#18181B", btnfg: "#FFFFFF", btnr: 6,
    gap: 0.62, fs: 0.9, sh: 0.14, addon: "#EFF6FF", addonfg: "#1D4ED8", css: 0 },
  { name: "Bold", bg: "#FFFFFF", r: 4, inr: 4, swr: 4, bw: 2.5, border: "#000000", fill: "#FFFFFF", ring: "#000000", glow: "rgba(167,139,250,0)",
    title: "#000000", text: "#000000", muted: "#404040", tw: 700, ls: -0.01, up: 0, btn: "#000000", btnfg: "#FFFFFF", btnr: 4,
    gap: 1, fs: 1.02, sh: 0.1, addon: "#FDE047", addonfg: "#000000", css: 0 },
  { name: "Soft", bg: "#FFFFFF", r: 36, inr: 999, swr: 999, bw: 0, border: "#EDE9FE", fill: "#F4EEFF", ring: "#C4B5FD", glow: "rgba(196,181,253,0.55)",
    title: "#4C1D95", text: "#4C1D95", muted: "#8B7FB0", tw: 600, ls: 0, up: 0, btn: "#8B5CF6", btnfg: "#FFFFFF", btnr: 999,
    gap: 1.08, fs: 1, sh: 0.34, addon: "#EDE9FE", addonfg: "#5B21B6", css: 0 },
  { name: "Natural", bg: "#FBF7EE", r: 18, inr: 10, swr: 12, bw: 1, border: "#D9CFB8", fill: "#FFFDF7", ring: "#2F5D3A", glow: "rgba(167,139,250,0)",
    title: "#243B2A", text: "#243B2A", muted: "#7A7461", tw: 600, ls: 0, up: 0, btn: "#2F5D3A", btnfg: "#FFFFFF", btnr: 10,
    gap: 1, fs: 1, sh: 0.14, addon: "#EEF3E6", addonfg: "#2F5D3A", css: 0 },
  { name: "Playful", bg: "#FFFFFF", r: 30, inr: 18, swr: 999, bw: 2, border: "#FBCFE8", fill: "#FFF7FB", ring: "#EC4899", glow: "rgba(236,72,153,0.25)",
    title: "#1F2937", text: "#1F2937", muted: "#9D5C7E", tw: 700, ls: -0.01, up: 0, btn: "#F97316", btnfg: "#FFFFFF", btnr: 18,
    gap: 1.02, fs: 1, sh: 0.2, addon: "#FFEDD5", addonfg: "#C2410C", css: 0 },
  { name: "Studio", bg: "#0F0F14", r: 20, inr: 10, swr: 10, bw: 1, border: "#2C2C38", fill: "#17171F", ring: "#A78BFA", glow: "rgba(167,139,250,0.75)",
    title: "#F5F5F7", text: "#E5E5EA", muted: "#8E8E9A", tw: 600, ls: 0, up: 0, btn: "#F5F5F7", btnfg: "#0F0F14", btnr: 10,
    gap: 1, fs: 1, sh: 0.5, addon: "#1E1B2E", addonfg: "#C4B5FD", css: 0 },
];

/**
 * A keyframeable token track for one option set, applied every frame by a driver —
 * the single writer of that set's --os-* variables (sliders, pickers and themes all key it).
 */
export function tokenTrack(el, initial) {
  const { name, ...tokens } = initial;
  const tr = track(tokens);
  driver((t) => {
    const v = tr.at(t);
    for (const k in v) el.style.setProperty(`--os-${k}`, v[k]);
  });
  return tr;
}

/** Theme → { "--os-*": value } for gsap.set / tweens. */
export function themeVars(t) {
  const v = {};
  for (const [k, val] of Object.entries(t)) if (k !== "name") v[`--os-${k}`] = val;
  return v;
}

const lbl = (text) => `<div class="os-lbl"><span class="n">${text}</span><span class="u">${text.toUpperCase()}</span></div>`;

export function createOptionSet({ theme = THEMES[0], selColor = 3, selThumb = 3 } = {}) {
  const colors = ["#8B5CF6", "#EC4899", "#3B82F6", "#10B981", "#F59E0B", "#EF4444"];
  const thumbs = [["none", "Color"], ["grayscale(1) contrast(1.15)", "Mono"], ["hue-rotate(150deg)", "Mint"], ["hue-rotate(-60deg) saturate(1.3)", "Sunset"]];
  const el = h("div", "os", `
    <div class="os-flash"></div>
    <div class="os-cap">Optionia Product Option</div>
    <div class="os-head"><div class="os-title">Everyday Hoodie</div><div class="os-price">$48.50</div></div>
    <div class="os-f">${lbl("Color")}<div class="os-sws">${colors.map((c, i) => `<i class="os-sw${i === selColor ? " sel" : ""}" style="background:${c}"></i>`).join("")}</div></div>
    <div class="os-f">${lbl("Print style")}<div class="os-ths">${thumbs.map(([f, n], i) => `<div class="os-th${i === selThumb ? " sel" : ""}"><img src="${ART}" style="filter:${f}" alt=""><span>${n}</span></div>`).join("")}</div></div>
    <div class="os-f">${lbl("Size")}<div class="os-in"><span>Medium</span><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="m6 9 6 6 6-6"/></svg></div></div>
    <div class="os-f">${lbl("Add-ons")}<div class="os-cks">${ADDONS.map(([n, p]) => `
      <div class="os-ck"><i class="os-cb"><svg viewBox="0 0 20 20" width="20" height="20"><path d="M5 10.4 8.4 13.6 15 6.8" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" pathLength="1"/></svg></i><span>${n}</span><em>(+$${p.toFixed(2)})</em></div>`).join("")}</div></div>
    <div class="os-add"><span>Total</span><b>$48.50</b></div>
    <div class="os-btn"><span>Add to cart</span></div>
    <div class="os-note">Your selections will add an additional charge of <b>$18.00</b>.</div>`);
  window.gsap.set(el, themeVars(theme));
  const q = (s) => el.querySelector(s);
  return { el, flash: q(".os-flash"), title: q(".os-title"), swatches: [...el.querySelectorAll(".os-sw")], thumbs: [...el.querySelectorAll(".os-th")],
    addon: q(".os-add"), total: q(".os-add b"), btn: q(".os-btn"), note: q(".os-note"),
    addons: [...el.querySelectorAll(".os-ck")].map((row, i) => ({ row, box: row.querySelector(".os-cb"), tick: row.querySelector("path"), price: row.querySelector("em"), value: ADDONS[i][1] })) };
}
