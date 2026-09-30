// S3 option-type chip bar (Figma "Creative"): white capsule, lavender chips, arrow buttons,
// and a neck that connects it down to the orb. The chip track scrolls at constant speed.
import { AMBIENT, BAR } from "../tokens.js";
import { driver } from "../clock.js";
import { h } from "./basics.js";

const I = (d) => `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;

export const ICONS = {
  file: I(`<path d="M20 11.5 12.2 19.3a5 5 0 0 1-7.1-7.1l8-8a3.3 3.3 0 0 1 4.7 4.7l-8 8a1.7 1.7 0 0 1-2.4-2.4l7.3-7.3"/>`),
  text: I(`<path d="M4 17 8 6l4 11M5.4 13.5h5.2"/><path d="M14 10.5c.5-.9 1.4-1.4 2.6-1.4 1.8 0 2.9 1 2.9 2.8V17m0-3.2c-.7-.4-1.6-.6-2.5-.6-1.7 0-2.9.8-2.9 2 0 1.1.9 1.9 2.3 1.9 1.4 0 2.6-.8 3.1-2"/><path d="M4 20.5h16"/>`),
  image: I(`<rect x="3.5" y="3.5" width="17" height="17" rx="4"/><circle cx="9" cy="9.5" r="1.8"/><path d="m20.5 15.5-4.8-4.6L6 20.5"/>`),
  date: I(`<rect x="3.5" y="5" width="15" height="14.5" rx="3"/><path d="M3.5 9.5h15M7.5 3v4M14.5 3v4"/><circle cx="17.5" cy="17.5" r="3.6" fill="#F1E9FF"/><path d="M17.5 15.9v1.8l1.1.8"/>`),
  color: I(`<path d="M12 3.5c-4.7 0-8.5 3.6-8.5 8.2 0 4.1 3.2 7.8 7.2 7.8 1.3 0 1.9-.8 1.9-1.7 0-1.2-1-1.6-1-2.7 0-1 .8-1.8 1.9-1.8h2.3c2.7 0 4.7-2 4.7-4.6C20.5 6.4 16.7 3.5 12 3.5Z"/><circle cx="7.8" cy="11.2" r="1.1"/><circle cx="10.6" cy="7.4" r="1.1"/><circle cx="15.2" cy="7.6" r="1.1"/>`),
  dropdown: I(`<rect x="3.5" y="5.5" width="17" height="13" rx="3.5"/><path d="m9 11 3 3 3-3"/>`),
  checkbox: I(`<rect x="3.5" y="3.5" width="17" height="17" rx="4.5"/><path d="m8 12.2 2.8 2.8L16.3 9.3"/>`),
  radio: I(`<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="3.6" fill="currentColor" stroke="none"/>`),
  number: I(`<path d="M9.5 4 7.5 20M16.5 4l-2 16M4.5 9h15M3.5 15h15"/>`),
  textarea: I(`<rect x="3.5" y="4.5" width="17" height="15" rx="3.5"/><path d="M7.5 9h9M7.5 12.5h9M7.5 16h5"/>`),
  heading: I(`<path d="M6 5v14M18 5v14M6 12h12"/>`),
  paragraph: I(`<path d="M4 6h16M4 10.5h16M4 15h16M4 19.5h10"/>`),
  divider: I(`<path d="M3.5 12h17"/><path d="M8 7.5h8M8 16.5h8" opacity=".45"/>`),
  html: I(`<path d="m8.5 8-4 4 4 4M15.5 8l4 4-4 4M13.5 5.5l-3 13"/>`),
  multicolor: I(`<circle cx="8.5" cy="9" r="4.5"/><circle cx="15.5" cy="9" r="4.5"/><circle cx="12" cy="15.5" r="4.5"/>`),
  multiimage: I(`<rect x="7.5" y="3.5" width="13" height="13" rx="3"/><path d="M16.5 20.5H6a2.5 2.5 0 0 1-2.5-2.5V7.5"/><path d="m20.5 13-3.4-3.3-6.6 6.8"/>`),
  upload: I(`<path d="M12 15.5V4.5M7.5 9 12 4.5 16.5 9"/><path d="M4.5 14.5v3a2.5 2.5 0 0 0 2.5 2.5h10a2.5 2.5 0 0 0 2.5-2.5v-3"/>`),
  chevL: I(`<path d="m14.5 6-6 6 6 6"/>`),
  chevR: I(`<path d="m9.5 6 6 6-6 6"/>`),
};

const CHIPS = [
  ["file", "File attachment"], ["text", "Text"], ["image", "Image swatch"], ["date", "Date picker"],
  ["color", "Color swatch"], ["dropdown", "Dropdown"], ["checkbox", "Checkbox"], ["radio", "Radio button"],
  ["number", "Number"], ["textarea", "Text area"], ["heading", "Heading"],
];

/** Returns { el, neck } — `el` is the capsule, `neck` connects down to the orb at `neckX` (px from capsule left). */
export function createChipBar({ width = 1180 } = {}) {
  const el = h("div", "chipbar", "", { width: `${width}px` });
  const set = CHIPS.map(([i, label]) => `<div class="chip">${ICONS[i]}<span>${label}</span></div>`).join("");
  el.innerHTML = `
    <div class="chip-arrow">${ICONS.chevL}</div>
    <div class="chip-view"><div class="chip-track"><div class="chip-set">${set}</div><div class="chip-set">${set}</div></div></div>
    <div class="chip-arrow">${ICONS.chevR}</div>`;
  const neck = h("div", "chip-neck", `<svg width="120" height="56" viewBox="0 0 120 56"><path d="M0 0 H120 C 92 0 78 10 74 26 L 72 56 H 48 L 46 26 C 42 10 28 0 0 0 Z" fill="#fff"/></svg>`);
  return { el, neck, track: el.querySelector(".chip-track"), set: el.querySelector(".chip-set") };
}

/** Constant-speed scroll, a pure function of film time (one loop every chipLoopBars). */
export function driveChipScroll(bar) {
  const w = bar.set.offsetWidth;
  const period = BAR * AMBIENT.chipLoopBars;
  driver((t) => {
    const x = -(((t / period) % 1) * w);
    bar.track.style.transform = `translateX(${x}px)`;
  });
}

/** Product tile (Figma "Creative"): thick white border, lavender inner, product centred. */
export function productTile(src, size = 236) {
  const wrap = h("div", "bob");
  const tile = h("div", "ptile", `<img src="${src}" alt="" width="${Math.round(size * 0.82)}" height="${Math.round(size * 0.82)}">`,
    { width: `${size}px`, height: `${size}px` });
  wrap.append(tile);
  return { wrap, tile };
}
