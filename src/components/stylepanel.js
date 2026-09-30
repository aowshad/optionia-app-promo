// S5 admin UI (Figma "Option styling"): Polaris-flavoured panel with sliders and colour
// fields, a colour popover, and a Custom CSS editor that types with live syntax colouring.
import { BEAT } from "../tokens.js";
import { driver, sfx } from "../clock.js";
import { h } from "./basics.js";

const LOCK = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="5" y="11" width="14" height="10" rx="2.5"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>`;
const RESET = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12a8 8 0 1 0 2.4-5.7"/><path d="M4 4v4.5h4.5"/></svg>`;

const slider = (label, v, max) => `
  <div class="sp-f"><label>${label}</label>
    <div class="sp-line"><div class="sp-in val">${v}</div>
      <div class="sp-track"><i class="rest"></i><i class="fill"></i><i class="thumb"></i><span class="tip">${v}</span></div>
      <span class="max">${max}</span></div></div>`;
const colorField = (label, hex, cls = "") => `
  <div class="sp-f ${cls}"><label>${label}</label><div class="sp-in col"><i class="swc" style="background:${hex}"></i><span class="hex">${hex}</span></div></div>`;

export const POP_COLORS = ["#1F2937", "#14433D", "#7C3AED", "#BE185D", "#0369A1", "#B45309", "#111827", "#6B7280"];

export function createStylePanel() {
  const el = h("div", "sp", `
    <div class="sp-bar"><i></i><i></i><i></i></div>
    <div class="sp-body">
      <div class="sp-h"><b>Option styling</b><span>${RESET} Reset</span></div>
      <div class="sp-row3">
        <div class="sp-f"><label>Swatch width</label><div class="sp-in">48</div></div>
        <div class="sp-f"><label>Swatch height</label><div class="sp-in">48</div></div>
        <div class="sp-f"><label>Ratio</label><div class="sp-lock">${LOCK}</div></div>
      </div>
      ${slider("Border radius", 4, 32)}
      ${slider("Border thickness", 1, 5)}
      <div class="sp-row2">${colorField("Default border color", "#E5E7EB")}${colorField("Selected border color", "#6366F1")}</div>
      <div class="sp-row2">${colorField("Title color", "#1F2937", "sp-title")}${colorField("Description color", "#6B7280")}</div>
      <div class="sp-pop">${POP_COLORS.map((c) => `<i style="background:${c}"></i>`).join("")}<div class="sp-pop-f"><span>Hex</span><b>#14433D</b></div></div>
    </div>`);
  const [radius, thick] = [...el.querySelectorAll(".sp-line")].map((line) => ({
    val: line.querySelector(".val"), track: line.querySelector(".sp-track"), fill: line.querySelector(".fill"),
    thumb: line.querySelector(".thumb"), tip: line.querySelector(".tip"),
  }));
  const title = el.querySelector(".sp-title");
  return {
    el, radius, thick,
    title: { box: title.querySelector(".sp-in"), chip: title.querySelector(".swc"), hex: title.querySelector(".hex") },
    pop: el.querySelector(".sp-pop"), popChips: [...el.querySelectorAll(".sp-pop i")],
  };
}

/** Place a slider's fill/thumb/tip for value v in [0, max] (called from tween onUpdate). */
export function setSlider(s, v, max, trackW) {
  const x = (v / max) * trackW;
  s.fill.style.width = `${x}px`;
  s.thumb.style.transform = `translateX(${x}px)`;
  s.tip.style.transform = `translateX(${x}px)`;
  const n = String(Math.round(v));
  if (s.val.textContent !== n) { s.val.textContent = n; s.tip.textContent = n; }
}

/* ── Custom CSS editor ──────────────────────────────────────────────────── */

export const CSS_TOKENS = [
  [".optionia-swatch", "sel"], [" {\n", "p"],
  ["  border-radius", "prop"], [": ", "p"], ["999px", "num"], [";\n", "p"],
  ["  box-shadow", "prop"], [": ", "p"], ["0 0 0 3px ", "num"], ["#8838E0", "hex"], [";\n", "p"],
  ["}", "p"],
];

export function createCodeEditor() {
  const el = h("div", "ce", `
    <div class="ce-bar"><i></i><i></i><i></i><b>Custom CSS</b><span>Applies to this option set</span></div>
    <div class="ce-body"><div class="ln">1<br>2<br>3<br>4</div><pre class="code"></pre></div>`);
  return { el, code: el.querySelector(".code") };
}

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");

/**
 * Type syntax-coloured tokens into `codeEl`: one char per `dt` from t0, caret solid while typing,
 * blinking on the half-beat afterwards until `off`. Returns the time the last char lands.
 */
export function typeRich(codeEl, tokens, t0, dt, off) {
  const full = tokens.map(([s]) => s).join("");
  const n = full.length;
  for (let i = 0; i < n; i++) if (full[i] !== "\n" && full[i] !== " ") sfx(t0 + i * dt, "key", { i });
  const end = t0 + n * dt;
  let last = "";
  driver((t) => {
    const k = Math.max(0, Math.min(n, Math.floor((t - t0) / dt) + 1));
    let left = k, html = "";
    for (const [s, cls] of tokens) {
      if (left <= 0) break;
      const part = s.slice(0, left);
      left -= part.length;
      html += cls === "hex" ? `<span class="hex"><i style="background:${part.length === s.length ? s : "transparent"}"></i>${esc(part)}</span>` : `<span class="${cls}">${esc(part)}</span>`;
    }
    const on = t >= t0 - BEAT / 2 && t < off;
    const blink = t < end ? 1 : (Math.floor((t - end) / (BEAT / 2)) % 2 === 0 ? 1 : 0);
    html += `<i class="caret" style="opacity:${on ? blink : 0}"></i>`;
    if (html !== last) { codeEl.innerHTML = html; last = html; }
  });
  return end;
}
