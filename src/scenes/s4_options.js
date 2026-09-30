// S4 · Every option — 8 bars from SCENE.s4 (the centrepiece).
//
// Dive: the camera zooms into the lifted hoodie tile; that tile *becomes* the product image
// (the S4 layer is built at scale k so its image tile sits exactly on the S3 tile).
// Build: each control appears as the cursor heads for it, hovers, and activates only on the
// cursor's click (13 clicks; hops of DUR.hop, a click every 1.5 beats).
// Burst: the last six types arrive as floating cards. Pull-back: the composition recedes as the
// whole 4×4 grid arrives at once, then lives for two bars of overlapping micro-interactions.
import { SCENE, sceneAt, BEAT, BAR, DUR, EASE } from "../tokens.js";
import { h, place, worldRect } from "../components/basics.js";
import { ICONS } from "../components/chips.js";
import * as W from "../components/options.js";
import { enter, bobAt } from "../motion.js";
import { GRID, buildGrid, liveGrid } from "./s4_grid.js";
import { sfx } from "../clock.js";

const b = sceneAt(SCENE.s4);
const B = (n) => b(0) + n * BEAT;                  // beat n of the scene (0-based, fractions ok)

const TILE = { x: 120, y: 212, s: 580 };           // product image tile (local px)
const COL_A = 824, COL_B = 1336, COL_Y = 252;
// Right-sized copies: large downscales pick history-dependent decode sizes in Chrome.
const ART = "assets/art/artwork_160.png", ART_PRINT = "assets/art/artwork_320.png";
const SUNSET = "hue-rotate(-60deg) saturate(1.3)";
const TINT = "hue-rotate(-105deg) saturate(0.9)";  // lavender → mint when green is picked
const SWATCHES = ["#8B5CF6", "#EC4899", "#3B82F6", "#10B981", "#F59E0B", "#EF4444"];
const PICK = 3;                                     // green

export function build(ctx) {
  const { tl, world, camera, cursor, sel, shared } = ctx;
  const { hoodie } = shared;
  const k = hoodie.size / TILE.s;                   // S4 layer scale so its tile == the S3 tile
  const P = { x: hoodie.cx - k * (TILE.x + TILE.s / 2), y: hoodie.cy - k * (TILE.y + TILE.s / 2) };
  const L = (x, y) => ({ x: P.x + k * x, y: P.y + k * y });
  const R = (el) => {
    const r = worldRect(el, root);
    return { x: P.x + k * r.x, y: P.y + k * r.y, w: k * r.w, h: k * r.h, cx: P.x + k * r.cx, cy: P.y + k * r.cy };
  };
  const local = (el) => worldRect(el, root);

  const root = place(h("div", "s4"), P.x, P.y);
  root.style.transform = `scale(${k})`;
  world.append(root);
  const add = (el, x, y, w, hh) => { root.append(place(el, x, y, w, hh)); return el; };

  // ── Grid geometry (the grid itself is built last so it sits above the receding composition) ──
  const gridW = GRID.cols * GRID.cw + (GRID.cols - 1) * GRID.gap;
  const gridH = 4 * GRID.ch + 3 * GRID.gap;
  const gridX = 960 - gridW / 2, gridY = 21;

  // ── Product card: glass back, image tile (the dive target), title + meta ──
  const cardBg = add(h("div", "glass"), 100, 192, 620, 790);
  cardBg.style.borderRadius = "28px";
  const tile = add(h("div", "s4-ptile", `
    <img class="hoodie" src="assets/products/hoodie.png" alt="">
    <img class="print" src="${ART_PRINT}" alt="">
    <i class="rim"></i>`), TILE.x, TILE.y, TILE.s, TILE.s);
  const hoodieImg = tile.querySelector(".hoodie"), printImg = tile.querySelector(".print"), rim = tile.querySelector(".rim");
  const ptitle = add(h("div", "s4-ptitle", "Everyday Hoodie"), 124, 818);
  const pmeta = add(h("div", "s4-pmeta", `<b>$48.50</b><span class="stars">★★★★★</span><span>4.9 (218)</span>`), 124, 868);

  // ── Option panel ──
  const panelBg = add(h("div", "glass glass--blur"), 780, 110, 1040, 880);
  panelBg.style.borderRadius = "28px";
  const panelH = add(h("div", "s4-panel-h", `<small>Optionia · Product options</small><div>Customize your hoodie</div>`), COL_A, 150);

  const text = W.textInput({ label: "Engraving text", help: "Printed on the chest pocket", placeholder: "Enter custom text", max: 20 });
  const area = W.textArea({ label: "Gift message", help: "Printed on the gift note", placeholder: "Write a short note", max: 100 });
  const num = W.numberInput({ label: "Quantity", help: "Order up to 9", from: 1, to: 9 });
  const dd = W.dropdown({ label: "Size", help: "Unisex fit", options: ["Small", "Medium", "Large", "X-Large"] });
  const rad = W.radio({ label: "Fabric weight", help: "Heavier is warmer", options: [["Light", ""], ["Medium", "+$5.00"], ["Heavy", "+$8.00"]] });
  const chk = W.checkbox({ label: "Gift options", help: "Add a finishing touch", options: [["Gift wrap this item", "+$5.00"]] });
  const col = W.colorSwatch({ label: "Color", help: "Garment-dyed to order", colors: SWATCHES });
  const img = W.imageSwatch({ label: "Print style", help: "Choose a finish for your artwork", items: [
    [ART, "none", "Color"], [ART, "grayscale(1) contrast(1.15)", "Mono"], [ART, "hue-rotate(150deg)", "Mint"], [ART, SUNSET, "Sunset"]] });
  const date = W.datePicker({ label: "Delivery date", help: "We'll time it to arrive by then" });
  const up = W.upload({ label: "Upload your artwork", help: "Printed on the chest, up to 12 in", thumb: ART });

  const colA = add(h("div", "", "", { display: "flex", flexDirection: "column", gap: "26px" }), COL_A, COL_Y);
  const colB = add(h("div", "", "", { display: "flex", flexDirection: "column", gap: "26px" }), COL_B, COL_Y);
  colA.append(text.el, area.el, num.el, dd.el, rad.el);
  colB.append(chk.el, col.el, img.el, date.el, up.el);
  // Popovers above later siblings.
  dd.el.style.zIndex = 3; date.el.style.zIndex = 3;

  // ── Counter "16 option types" (number roll) ──
  const counter = add(h("div", "s4-counter", `<div class="num"><div class="col">${Array.from({ length: 17 }, (_, i) => `<span>${i}</span>`).join("")}</div></div><div class="lbl">option types</div>`), 112, 70);
  const count = W.roller(counter.querySelector(".col"), 100);

  // ── Burst: six floating cards (Featured-Banner style: tab label + mini widget) ──
  const FLOATS = [
    ["Multi-color swatch", W.multiColor(["#EC4899", "#F59E0B", "#10B981", "#3B82F6", "#8B5CF6"], [0, 3]), 1540, 40, 3],
    ["Multi-image swatch", W.multiImage(["assets/products/sm/tote.png", "assets/products/sm/mug.png", "assets/products/sm/cap.png"], [0, 2]), 1570, 770, -3],
    ["Heading", W.headingBlock("Make it yours"), 40, 842, -2.5],
    ["Paragraph", W.paragraphBlock("Every piece is printed to order in our studio and ships in 3 days."), 560, 26, 2],
    ["Divider", W.dividerBlock(), 1180, 905, 2],
    ["HTML", W.htmlBlock(), 560, 690, -3],
  ].map(([title, body, x, y, rot]) => {
    const f = add(h("div", "s4-float", `<div class="fbg glass"></div><div class="ftab">${title}</div><div class="fct"></div>`), x, y);
    f.querySelector(".fct").append(body);
    return { el: f, rot, bg: f.querySelector(".fbg"), tab: f.querySelector(".ftab") };
  });

  // Initial states.
  window.gsap.set([cardBg, ptitle, pmeta, panelBg, panelH, counter, text.el, area.el, num.el, dd.el, rad.el, chk.el, col.el, img.el, date.el, up.el].concat(FLOATS.map((f) => f.el)), { opacity: 0 });
  window.gsap.set(tile, { opacity: 0 });

  /* ═══ Beat 0–4: pulse & lift (S3) → dive → the tile becomes the product image ═══ */
  camera.moveTo(B(1), { ...L(960, 540), scale: 1 / k });
  // Everything in S3 except the hoodie fades as we dive (the hoodie is handed over below).
  const s3rest = [...shared.s3.scene.children].filter((c) => c !== hoodie.wrap);
  tl.to(s3rest, { opacity: 0, duration: DUR.move, ease: EASE.move }, B(1));
  shared.orb.to(B(1), { o: 0 }, { dur: DUR.out, ease: EASE.out });

  // Swap at the moment the lift settles: identical geometry, so no visible cut.
  const tSwap = hoodie.settled;
  const bob0 = bobAt(tSwap, hoodie.bobPhase) / k;
  tl.set(hoodie.wrap, { opacity: 0 }, tSwap);
  tl.set(tile, { opacity: 1 }, tSwap);
  tl.fromTo(tile, { y: bob0, borderRadius: hoodie.radius / k }, { y: 0, borderRadius: 28, duration: DUR.move, ease: EASE.move, immediateRender: false }, tSwap);
  tl.fromTo(rim, { borderWidth: hoodie.rim / k }, { borderWidth: 0, duration: DUR.move, ease: EASE.move, immediateRender: false }, tSwap);
  const sh = (a) => `0 ${30 * 1.08 / k}px ${70 * 1.08 / k}px ${-24 * 1.08 / k}px rgba(95, 18, 212, ${a})`;
  tl.fromTo(tile, { boxShadow: sh(0.28) }, { boxShadow: sh(0), duration: DUR.move, ease: EASE.move, immediateRender: false }, tSwap);
  enter(tl, [cardBg, panelBg, panelH, ptitle, pmeta], B(2));

  /* ═══ Cursor-driven build ═══
     Every activation is caused by a click. Each control appears as the cursor heads for it,
     shows a hover state while the cursor rests (½ beat), and activates on the click — the
     target dips with the cursor's press. Hops between controls take DUR.hop (a click every
     1.5 beats); moves inside one control (menu item, calendar day) take DUR.nudge. */
  const C = {
    text: 4, area: 5.5, up1: 7, up2: 8, ddOpen: 9.5, ddPick: 10.5, radio: 12,
    check: 13.5, color: 15, image: 16.5, dateOpen: 18, datePick: 19, upload: 20.5,
  };
  const comps = [
    [text, C.text], [area, C.area], [num, C.up1], [dd, C.ddOpen], [rad, C.radio],
    [chk, C.check], [col, C.color], [img, C.image], [date, C.dateOpen], [up, C.upload],
  ].map(([c, click], i) => {
    const tIn = B(Math.ceil(click - 1.5));             // on the beat as the cursor sets off
    enter(tl, c.el, tIn);
    count.to(tIn, i + 1);
    sfx(tIn, "build", { i });
    return c;
  });
  enter(tl, counter, B(3));

  const setAttr = (el, name, on, off) => {
    tl.set(el, { attr: { [name]: 1 } }, on);
    if (off !== undefined) tl.set(el, { attr: { [name]: 0 } }, off);
  };
  const dip = (el, t) => {
    tl.fromTo(el, { scale: 1 }, { scale: 0.94, duration: DUR.press, ease: EASE.out, immediateRender: false }, t - DUR.press);
    tl.fromTo(el, { scale: 0.94 }, { scale: 1, duration: DUR.release, ease: EASE.in, immediateRender: false }, t);
  };
  /** Travel to `el` (at fx, fy of its box), hover it while resting, click at beat `beats`. */
  const tap = (beats, el, { dur = DUR.hop, fx = 0.5, fy = 0.5, hover = el, press = true } = {}) => {
    const t = B(beats), r = R(el);
    const arrive = cursor.clickAt(t, { x: r.x + r.w * fx, y: r.y + r.h * fy }, { dur });
    if (hover) setAttr(hover, "data-hover", arrive, t + BEAT / 4);
    if (press) dip(el, t);
    return t;
  };

  // The cursor glides in from off-frame for the first click, then hops control to control.
  cursor.show(B(1.5), L(2050, 1180));

  // 1 · Text — click focuses; "Custom engraving" types, 0/20 → 16/20.
  let t = tap(C.text, text.box, { dur: DUR.move, fx: 0.62, press: false });
  setAttr(text.box, "data-focus", t, B(C.area));
  const tText = W.typer({ valEl: text.val, text: "Custom engraving", t0: t + BEAT / 4, dt: BEAT / 16, count: text.cnt, max: 20, ph: text.ph });
  W.caret(text.caret, { on: t, off: B(C.area), typingEnd: tText });

  // 2 · Text area — click focuses; two lines type.
  t = tap(C.area, area.box, { fx: 0.62, fy: 0.45, press: false });
  setAttr(area.box, "data-focus", t, B(C.up1));
  const tArea = W.typer({ valEl: area.val, text: "Stay curious,\nSam!", t0: t + BEAT / 4, dt: BEAT / 16, count: area.cnt, max: 100, ph: area.ph });
  W.caret(area.caret, { on: t, off: B(C.up1), typingEnd: tArea });

  // 3 · Number — two taps on ▲: 1 → 2 → 3.
  const digits = W.roller(num.strip, 22);
  t = tap(C.up1, num.up, { fx: 0.55, fy: 0.6, hover: null });
  digits.to(t, 1);
  setAttr(num.up, "data-hover", t - BEAT / 2, B(C.up2) + BEAT / 4);   // hovered across both taps
  cursor.click(B(C.up2));
  dip(num.up, B(C.up2));
  digits.to(B(C.up2), 2);

  // 4 · Dropdown — click opens; the highlight follows the cursor down to "Medium"; click picks it.
  t = tap(C.ddOpen, dd.box, { fx: 0.7, press: false });
  setAttr(dd.box, "data-focus", t, B(C.ddPick));
  tl.fromTo(dd.menu, { opacity: 0, y: -8 }, { opacity: 1, y: 0, duration: DUR.in, ease: EASE.in }, t);
  tl.fromTo(dd.chev, { rotation: 0 }, { rotation: 180, duration: DUR.in, ease: EASE.move }, t);
  tl.fromTo(dd.hl, { y: 0 }, { y: 38, duration: DUR.nudge, ease: EASE.move }, t);   // moves with the cursor
  sfx(t, "open");
  t = tap(C.ddPick, dd.items[1], { dur: DUR.nudge, fx: 0.3, press: false, hover: null });
  tl.to(dd.menu, { opacity: 0, y: -4, duration: DUR.out, ease: EASE.out }, t);
  tl.to(dd.chev, { rotation: 0, duration: DUR.in, ease: EASE.move }, t);
  W.textAt(dd.val, [[t, "Medium"]]);
  sfx(t, "pop", { note: 1 });

  // 5 · Radio — click "Medium"; the dot slides there.
  t = tap(C.radio, rad.circles[1]);
  const rowStep = rad.rows[1].offsetTop - rad.rows[0].offsetTop;
  // Click-triggered state changes respond instantly (EASE.in) so activation reads as caused by the press.
  tl.fromTo(rad.dot, { y: 0 }, { y: rowStep, duration: DUR.in, ease: EASE.in }, t);
  tl.fromTo(rad.circles[0], { borderColor: "#6366F1" }, { borderColor: "#D1D5DB", duration: DUR.in, ease: EASE.in }, t);
  tl.fromTo(rad.circles[1], { borderColor: "#D1D5DB" }, { borderColor: "#6366F1", duration: DUR.in, ease: EASE.in }, t);
  sfx(t, "pop", { note: 2 });

  // 6 · Checkbox — click ticks "Gift wrap this item".
  t = tap(C.check, chk.boxes[0]);
  tl.fromTo(chk.boxes[0], { backgroundColor: "#FFFFFF", borderColor: "#D1D5DB" }, { backgroundColor: "#6366F1", borderColor: "#6366F1", duration: DUR.in, ease: EASE.in }, t);
  tl.fromTo(chk.ticks[0], { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: DUR.in, ease: EASE.in }, t);
  sfx(t, "pop", { note: 3 });

  // 7 · Colour — click green; the ring slides over and the hoodie's tint follows.
  t = tap(C.color, col.sw[PICK], { fx: 0.62, fy: 0.66 });
  const swStep = col.sw[1].offsetLeft - col.sw[0].offsetLeft;
  tl.fromTo(col.ring, { x: 0 }, { x: swStep * PICK, duration: DUR.in, ease: EASE.in }, t);
  tl.fromTo(hoodieImg, { filter: "hue-rotate(0deg) saturate(1)" }, { filter: TINT, duration: DUR.move, ease: EASE.move }, t);
  sfx(t, "pop", { note: 4 });

  // 8 · Image swatch — click "Sunset"; the selection frame snaps to it.
  const sunset = img.thumbs[3];
  t = tap(C.image, sunset, { fy: 0.42 });
  sel.snap(t, R(sunset), { dur: DUR.in });
  tl.fromTo(sunset, { borderColor: "#E5E7EB" }, { borderColor: "#6366F1", duration: DUR.in, ease: EASE.in }, t);
  tl.set(printImg, { filter: SUNSET }, t);
  sfx(t, "pop", { note: 5 });

  // 9 · Date — click opens the calendar; the cursor nudges to the 24th; click picks it.
  t = tap(C.dateOpen, date.box, { fx: 0.7, press: false });
  setAttr(date.box, "data-focus", t, B(C.datePick + 0.5));
  tl.fromTo(date.pop, { opacity: 0, y: 10, scale: 0.98 }, { opacity: 1, y: 0, scale: 1, duration: DUR.in, ease: EASE.in }, t);
  sfx(t, "open");
  const d24 = date.days[23];
  window.gsap.set(date.sel, { x: d24.offsetLeft + (d24.offsetWidth - 32) / 2, y: d24.offsetTop });
  t = tap(C.datePick, d24, { dur: DUR.nudge, fx: 0.8, fy: 0.82, press: false });   // tip beside the digits, not over them
  tl.fromTo(date.sel, { opacity: 0, scale: 0.5 }, { opacity: 1, scale: 1, duration: DUR.in, ease: EASE.in }, t);
  tl.fromTo(d24, { color: "#1F2937" }, { color: "#FFFFFF", duration: DUR.out, ease: EASE.in }, t);
  tl.to(date.pop, { opacity: 0, y: 6, duration: DUR.out, ease: EASE.out }, t + BEAT / 2);
  W.textAt(date.val, [[t + BEAT / 2, "Oct 24, 2026"]]);
  tl.set(date.ph, { opacity: 0 }, t + BEAT / 2);
  sfx(t, "pop", { note: 6 });

  // 10 · Upload — click "Upload Files"; artwork.png uploads, then lands on the hoodie.
  t = tap(C.upload, up.btn, { fx: 0.62, fy: 0.6 });
  tl.to(up.drop.children, { opacity: 0, duration: DUR.out, ease: EASE.out }, t);
  tl.fromTo(up.file, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: DUR.in, ease: EASE.in }, t);
  const prog = { p: 0 };
  tl.fromTo(prog, { p: 0 }, { p: 1, duration: DUR.in, ease: EASE.move, immediateRender: true,
    onUpdate: () => { up.fill.style.transform = `scaleX(${prog.p})`; up.pct.textContent = `${Math.round(prog.p * 100)}%`; } }, t + BEAT / 4);
  tl.fromTo(printImg, { opacity: 0, scale: 1.12 }, { opacity: 0.92, scale: 1, duration: DUR.in, ease: EASE.in }, t + BEAT * 1.25);
  sfx(t + BEAT * 1.25, "done");
  cursor.hide(t + BEAT);

  /* ═══ Burst: the final six, BEAT/4 apart ═══ */
  FLOATS.forEach((f, i) => {
    const tf = B(20) + i * (BEAT / 4);               // last settles at B(22.25), exactly as the composition recedes
    tl.fromTo(f.el, { opacity: 0, y: 24, scale: 0.98, rotation: f.rot, filter: "blur(8px)" },
      { opacity: 1, y: 0, scale: 1, rotation: f.rot, filter: "blur(0px)", duration: DUR.in, ease: EASE.in, immediateRender: true }, tf);
    tl.set(f.el, { filter: "none" }, tf + DUR.in);
    count.to(tf, 11 + i);
    sfx(tf, "deal", { i });
  });

  /* ═══ Pull back — the composition recedes and the whole grid arrives as one live interface ═══ */
  const grid = buildGrid(root, gridX, gridY);
  root.append(counter);                                   // heading stays above the grid
  const tP = B(22), tLive = B(24);
  const fitS = Math.min(1920 * 0.9 / gridW, 1080 * 0.92 / (gridH + 150));
  camera.moveTo(tP, { ...L(960, 540), scale: fitS / k });
  camera.moveTo(tLive, { scale: (fitS / k) * 1.012 }, { dur: BAR * 2, whoosh: false });  // slow push while it lives

  const composition = [cardBg, tile, ptitle, pmeta, panelBg, panelH, colA, colB, ...FLOATS.map((f) => f.el)];
  // Starts after the last float has settled — never two tweens on one property at once.
  tl.to(composition, { opacity: 0, scale: 0.96, duration: DUR.in, ease: EASE.out }, tP + BEAT / 4);
  const cR = local(counter);
  tl.to(counter, { x: gridX - cR.x, y: gridY - 130 - cR.y, duration: DUR.move, ease: EASE.move }, tP);
  const tEnd = liveGrid(tl, grid, tP + BEAT / 2, tLive);

  // The frame lets go of the thumb and grows around the whole grid.
  const g0 = L(gridX, gridY);
  sel.glide(tP, { x: g0.x, y: g0.y, w: gridW * k, h: gridH * k });

  Object.assign(shared, { s4: { root, k, P, L, R, counter, grid: { ...grid, x: gridX, y: gridY, w: gridW, h: gridH } } });
  return tEnd;
}
