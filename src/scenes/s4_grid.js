// S4 finale — the 16-type grid as a *live* interface.
// The whole grid enters as one piece, then every card runs its own small state change on
// uneven 16th-note offsets, so several are always in motion with different timings.
// The cards themselves stay still — only their controls move. Everything settles by beat 5.5,
// leaving a short hold so the 16 types can be read before S5.
import { BEAT, BAR, DUR, EASE } from "../tokens.js";
import { h, place } from "../components/basics.js";
import { ICONS } from "../components/chips.js";
import * as W from "../components/options.js";
import { sfx } from "../clock.js";

const ART = "assets/art/artwork_160.png";
export const GRID = { cw: 520, ch: 270, gap: 36, cols: 4 };
const TITLES = [
  ["text", "Text"], ["textarea", "Text area"], ["number", "Number"], ["dropdown", "Dropdown"],
  ["radio", "Radio button"], ["checkbox", "Checkbox"], ["color", "Color swatch"], ["image", "Image swatch"],
  ["date", "Date picker"], ["upload", "File upload"], ["multicolor", "Multi-color swatch"], ["multiimage", "Multi-image swatch"],
  ["heading", "Heading"], ["paragraph", "Paragraph"], ["divider", "Divider"], ["html", "HTML"],
];

/** Build the grid (hidden) inside `root` at local (x, y). */
export function buildGrid(root, x, y) {
  const gsap = window.gsap;
  const w = GRID.cols * GRID.cw + (GRID.cols - 1) * GRID.gap;
  const hh = 4 * GRID.ch + 3 * GRID.gap;
  const el = place(h("div", "s4-grid"), x, y, w, hh);
  el.style.opacity = 0;
  root.append(el);

  const cards = TITLES.map(([icon, title], i) => {
    const cx = (i % 4) * (GRID.cw + GRID.gap), cy = Math.floor(i / 4) * (GRID.ch + GRID.gap);
    const c = place(h("div", "s4-cell", `<div class="cbg glass"></div><div class="ct"><i>${ICONS[icon]}</i>${title}</div>`), cx, cy, GRID.cw, GRID.ch);
    el.append(c);
    return { el: c, bg: c.querySelector(".cbg") };
  });

  const w_ = {
    text: W.textInput({ label: "Name on the tag", help: "Up to 20 characters", placeholder: "Enter a name", max: 20 }),
    area: W.textArea({ label: "Gift message", help: "Printed on the gift note", placeholder: "Write a short note", max: 100 }),
    num: W.numberInput({ label: "Quantity", help: "Order up to 9", from: 1, to: 9 }),
    dd: W.dropdown({ label: "Size", help: "Unisex fit", options: ["Small", "Medium", "Large"], value: 1 }),
    rad: W.radio({ label: "Fabric weight", help: "Heavier is warmer", options: [["Light", ""], ["Medium", "+$5.00"], ["Heavy", "+$8.00"]] }),
    chk: W.checkbox({ label: "Gift options", help: "Add a finishing touch", options: [["Gift wrap this item", "+$5.00"], ["Add a personal note", "+$2.00"]] }),
    col: W.colorSwatch({ label: "Color", help: "Garment-dyed to order", colors: ["#8B5CF6", "#EC4899", "#3B82F6", "#10B981", "#F59E0B", "#EF4444"] }),
    img: W.imageSwatch({ label: "Print style", help: "Choose a finish for your artwork", items: [
      [ART, "none", "Color"], [ART, "grayscale(1) contrast(1.15)", "Mono"], [ART, "hue-rotate(150deg)", "Mint"], [ART, "hue-rotate(-60deg) saturate(1.3)", "Sunset"]] }),
    date: W.datePicker({ label: "Delivery date", help: "We'll time it to arrive by then" }),
    up: W.upload({ label: "Upload your artwork", help: "Printed on the chest, up to 12 in", file: "logo-final.png", size: "1.8 MB", thumb: ART }),
    mc: W.multiColor(["#EC4899", "#F59E0B", "#10B981", "#3B82F6", "#8B5CF6"], [0, 3]),
    mi: W.multiImage(["assets/products/sm/tote.png", "assets/products/sm/mug.png", "assets/products/sm/cap.png"], [0, 2]),
    head: W.headingBlock("Make it yours", "Made for you"),
    para: W.paragraphBlock("Every piece is printed to order in our studio and [[ships in 3 days]]."),
    div: W.dividerBlock("Add-ons", "Extras"),
    html: W.htmlBlock(),
  };
  const order = ["text", "area", "num", "dd", "rad", "chk", "col", "img", "date", "up", "mc", "mi", "head", "para", "div", "html"];
  order.forEach((key, i) => {
    const node = w_[key].el || w_[key];
    const wrap = h("div", "cw");
    wrap.append(node);
    cards[i].el.append(wrap);
    // Centre each widget in the card body (below the title).
    const bodyH = GRID.ch - 90;
    wrap.style.top = `${70 + Math.max(0, (bodyH - wrap.offsetHeight) / 2)}px`;
    if (w_[key].el === undefined) wrap.style.left = `${(GRID.cw - wrap.offsetWidth) / 2}px`;   // minis centred
  });

  // Resting states the micro-interactions move away from.
  const g = w_;
  g.up.drop.style.opacity = 1;
  [...g.up.drop.children].forEach((c) => (c.style.opacity = 0));
  g.up.file.style.opacity = 1;
  g.date.ph.style.opacity = 0;
  g.date.val.innerHTML = `Oct <span class="dd-roll"><span><b>24</b><b>25</b><b>26</b></span></span>, 2026`;
  const rowStep = g.rad.rows[1].offsetTop - g.rad.rows[0].offsetTop;
  gsap.set(g.rad.dot, { y: rowStep });
  gsap.set(g.rad.circles[1], { borderColor: "#6366F1" });
  const swStep = g.col.sw[1].offsetLeft - g.col.sw[0].offsetLeft;
  gsap.set(g.col.ring, { x: swStep * 3 });
  gsap.set(g.dd.hl, { y: 38 });
  const thumbs = g.img.el.querySelector(".of-thumbs");
  const ring = h("i", "thring");
  thumbs.prepend(ring);
  const th0 = g.img.thumbs[0], thStep = g.img.thumbs[1].offsetLeft - th0.offsetLeft;
  Object.assign(ring.style, { width: `${th0.offsetWidth + 8}px`, height: `${th0.offsetHeight + 8}px` });
  gsap.set(ring, { x: thStep * 3 });

  return { el, cards, g, w, h: hh, rowStep, swStep, thStep, ring };
}

/**
 * Choreograph the grid: one soft whole-grid entrance at `tIn`, then overlapping
 * micro-interactions from `t0` (settled by beat 5.5), then a hold until beat 8.
 */
export function liveGrid(tl, grid, tIn, t0) {
  const { el, cards, g } = grid;
  const q = (beats) => t0 + beats * BEAT;           // 16th-note grid: quarter-beat steps
  const tt = BEAT / 4;

  // ── One entrance for the whole grid ──
  tl.fromTo(el, { opacity: 0, scale: 1.04, filter: "blur(10px)" },
    { opacity: 1, scale: 1, filter: "blur(0px)", duration: DUR.move, ease: EASE.move, immediateRender: true }, tIn);
  tl.set(el, { filter: "none" }, tIn + DUR.move);

  const focus = (box, a, b) => {
    tl.set(box, { attr: { "data-focus": 1 } }, q(a));
    tl.set(box, { attr: { "data-focus": 0 } }, q(b));
  };

  // 1 · Text — short typing burst.
  focus(g.text.box, 0.25, 3);
  const e1 = W.typer({ valEl: g.text.val, text: "Maya", t0: q(0.5), dt: BEAT / 4, count: g.text.cnt, max: 20, ph: g.text.ph });
  W.caret(g.text.caret, { on: q(0.25), off: q(3), typingEnd: e1 });

  // 2 · Text area — a few characters, as if mid-message.
  focus(g.area.box, 1.25, 5);
  const e2 = W.typer({ valEl: g.area.val, text: "Thanks for\neverything!", t0: q(1.5), dt: BEAT / 7, count: g.area.cnt, max: 100, ph: g.area.ph });
  W.caret(g.area.caret, { on: q(1.25), off: q(5), typingEnd: e2 });

  // 3 · Number — 1 → 2 → 3 → 4, rolling.
  const nr = W.roller(g.num.strip, 22);
  [[0.75, 1], [1.75, 2], [3.5, 3]].forEach(([b, v]) => { nr.to(q(b), v); sfx(q(b), "tick"); });

  // 4 · Dropdown — opens, highlight glides to "Large", closes with it.
  const dd = g.dd;
  tl.set(cards[3].el, { zIndex: 5 }, q(2));
  focus(dd.box, 2, 3.25);
  tl.fromTo(dd.menu, { opacity: 0, y: -8 }, { opacity: 1, y: 0, duration: DUR.in, ease: EASE.in }, q(2));
  tl.fromTo(dd.chev, { rotation: 0 }, { rotation: 180, duration: DUR.in, ease: EASE.move }, q(2));
  tl.fromTo(dd.hl, { y: 38 }, { y: 76, duration: BEAT / 2, ease: EASE.move }, q(2.5));
  tl.to(dd.menu, { opacity: 0, y: -4, duration: DUR.out, ease: EASE.out }, q(3.25));
  tl.to(dd.chev, { rotation: 0, duration: DUR.in, ease: EASE.move }, q(3.25));
  W.textAt(dd.val, [[q(3.25), "Large"]]);
  tl.set(cards[3].el, { zIndex: 0 }, q(3.25) + DUR.out);
  sfx(q(2), "open"); sfx(q(3.25), "pop", { note: 1 });

  // 5 · Radio — Medium → Heavy, later back to Light.
  const r = g.rad, rs = grid.rowStep;
  const radio = (b, from, to) => {
    tl.fromTo(r.dot, { y: rs * from }, { y: rs * to, duration: DUR.in, ease: EASE.move }, q(b));
    tl.fromTo(r.circles[from], { borderColor: "#6366F1" }, { borderColor: "#D1D5DB", duration: DUR.in, ease: EASE.move }, q(b));
    tl.fromTo(r.circles[to], { borderColor: "#D1D5DB" }, { borderColor: "#6366F1", duration: DUR.in, ease: EASE.move }, q(b));
    sfx(q(b), "pop", { note: to });
  };
  radio(1, 1, 2); radio(4.25, 2, 0);

  // 6 · Checkbox — two options tick in turn.
  [[0.5, 0], [3, 1]].forEach(([b, i]) => {
    tl.fromTo(g.chk.boxes[i], { backgroundColor: "#FFFFFF", borderColor: "#D1D5DB" }, { backgroundColor: "#6366F1", borderColor: "#6366F1", duration: DUR.in, ease: EASE.in }, q(b));
    tl.fromTo(g.chk.ticks[i], { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: DUR.in, ease: EASE.in }, q(b));
    sfx(q(b), "pop", { note: 3 + i });
  });

  // 7 · Colour — the ring travels green → blue → amber.
  [[0.5, 3, 2], [3.25, 2, 4]].forEach(([b, a, c]) => {
    tl.fromTo(g.col.ring, { x: grid.swStep * a }, { x: grid.swStep * c, duration: DUR.move, ease: EASE.move }, q(b));
    sfx(q(b), "pop", { note: c });
  });

  // 8 · Image swatch — selection frame slides Sunset → Mono → Mint.
  [[1.5, 3, 1], [3.5, 1, 2]].forEach(([b, a, c]) => {
    tl.fromTo(grid.ring, { x: grid.thStep * a }, { x: grid.thStep * c, duration: DUR.move, ease: EASE.move }, q(b));
    sfx(q(b), "pop", { note: c + 2 });
  });

  // 9 · Date — the day rolls 24 → 25 → 26.
  const dr = W.roller(g.date.val.querySelector(".dd-roll span"), 20);
  dr.to(q(2.75), 1); dr.to(q(4.5), 2);
  sfx(q(2.75), "tick"); sfx(q(4.5), "tick");

  // 10 · Upload — a fresh file uploads, 0 → 100 %.
  const prog = { p: 0 };
  tl.fromTo(prog, { p: 0 }, { p: 1, duration: BAR, ease: EASE.move, immediateRender: true,
    onUpdate: () => { g.up.fill.style.transform = `scaleX(${prog.p})`; g.up.pct.textContent = `${Math.round(prog.p * 100)}%`; } }, q(0.75));
  sfx(q(0.75) + BAR, "done");

  // 11 · Multi-colour — picks toggle on and off.
  const mr = [...g.mc.querySelectorAll(".mr")];
  const toggle = (ring, b, on) => {
    tl.fromTo(ring, { opacity: on ? 0 : 1, scale: on ? 1.3 : 1 }, { opacity: on ? 1 : 0, scale: on ? 1 : 0.85, duration: DUR.in, ease: EASE.in }, q(b));
    sfx(q(b), "pop", { note: 5 });
  };
  toggle(mr[2], 1.75, true); toggle(mr[0], 3.25, false); toggle(mr[4], 4.5, true);

  // 12 · Multi-image — selections change.
  const mi = [...g.mi.querySelectorAll(".mr")];
  toggle(mi[1], 2.25, true); toggle(mi[0], 4, false);

  // 13 · Heading — the words swap through a mask.
  const hs = g.head.querySelectorAll(".hh span");
  tl.fromTo(hs, { yPercent: 0 }, { yPercent: -100, duration: DUR.in, ease: EASE.move }, q(3));

  // 14 · Paragraph — a highlight sweeps across the key phrase.
  tl.fromTo(g.para.querySelector("mark"), { backgroundSize: "0% 80%" }, { backgroundSize: "100% 80%", duration: DUR.move, ease: EASE.move }, q(2.5));

  // 15 · Divider — the rule draws out, then the label swaps.
  tl.fromTo(g.div.querySelectorAll("i"), { scaleX: 0.3 }, { scaleX: 1, duration: DUR.move, ease: EASE.move, transformOrigin: (i) => (i === 0 ? "100% 50%" : "0% 50%") }, q(1.25));
  tl.fromTo(g.div.querySelectorAll(".dl b"), { yPercent: 0 }, { yPercent: -100, duration: DUR.in, ease: EASE.move }, q(4));

  // 16 · HTML — a new line types in.
  const e16 = W.typer({ valEl: g.html.querySelector(".typed"), text: "<b>Free returns</b>", t0: q(2.5), dt: BEAT / 8 });
  W.caret(g.html.querySelector(".caret"), { on: q(2.25), off: q(5.5), typingEnd: e16 });

  return q(8);
}
