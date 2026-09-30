// S7 · Every click adds revenue — 2 bars from SCENE.s7.
// On the Studio card the camera landed on: the cursor ticks three priced add-ons; a price chip
// floats up from each and flies into the Total, which counts $48.50 → $66.50. The live preview
// line appears, then the cursor presses Add to cart (S8 turns that button into an order row).
import { SCENE, sceneAt, BEAT, DUR, EASE, STAGGER } from "../tokens.js";
import { h, place, worldRect } from "../components/basics.js";
import { BASE_PRICE } from "../components/optionset.js";
import { splitWords, reveal, enter } from "../motion.js";
import { track, driver, sfx } from "../clock.js";

/** Swap a label at time t (pure function of time — scrub-safe). */
function textAtSwap(el, a, b, t0) {
  driver((t) => { const s = t >= t0 ? b : a; if (el.textContent !== s) el.textContent = s; });
}

const b = sceneAt(SCENE.s7);
const B = (n) => b(0) + n * BEAT;
const CLICKS = [2, 3.5, 5];                       // beats: tick add-on 1, 2, 3
const BUY = 7;

export function build(ctx) {
  const { tl, camera, cursor, shared } = ctx;
  const { s5, s6, s4 } = shared;
  const { S, set, card } = s6;                   // S = ghost layer; the card lives in the S5 layer
  const L = s5.S.L, k = s4.k;
  // Local position (S5 layer) of anything inside the transformed Studio card.
  const inCard = (el) => {
    const r = worldRect(el, set.el);
    return { x: card.x + card.s * r.x, y: card.y + card.s * r.y, w: card.s * r.w, h: card.s * r.h,
      cx: card.x + card.s * r.cx, cy: card.y + card.s * r.cy };
  };
  const world = (p) => ({ ...L(p.x, p.y), w: p.w * k, h: p.h * k, cx: L(p.cx, p.cy).x, cy: L(p.cx, p.cy).y });

  // ── Headline to the left of the card ──
  const cardW = card.w * card.s, cardH = card.h * card.s;
  const localScale = 820 / cardH;                // card ≈ 820px tall on screen
  const fs = 104 / localScale;
  const head = h("div", "headline", `<div>Turn every click</div><div>into extra revenue.</div>`);
  head.style.cssText += `font-size:${fs}px;white-space:nowrap;`;
  s5.S.root.append(head);
  place(head, 0, 0);                              // absolute first, so it shrink-wraps before measuring
  const headW = head.offsetWidth;
  const gap = 90 / localScale;
  place(head, card.x - gap - headW, card.y + cardH / 2 - head.offsetHeight / 2 - 30 / localScale);
  const words = [...head.children].map((l) => splitWords(l));

  // Frame headline + card together.
  const cx = (card.x - gap - headW + card.x + cardW) / 2, cy = card.y + cardH / 2;
  camera.moveTo(B(0), { ...L(cx, cy), scale: localScale / k });
  tl.to(s6.ghosts.map((g) => g.wrap), { opacity: 0, duration: DUR.out, ease: EASE.out }, B(0));
  reveal(tl, words[0], B(0.5));
  reveal(tl, words[1], B(1));

  // Total counts up as each chip lands (pure function of time).
  const total = track({ v: BASE_PRICE });
  driver((t) => { set.total.textContent = `$${total.at(t).v.toFixed(2)}`; });

  const totalPt = inCard(set.total);             // local (S5 layer) — chips fly in local space
  let sum = BASE_PRICE;
  cursor.show(B(0), L(card.x + cardW + 220, card.y + cardH + 160));
  set.addons.forEach((a, i) => {
    const t = B(CLICKS[i]);
    const box = world(inCard(a.box));
    const arrive = cursor.clickAt(t, { x: box.cx + 4, y: box.cy + 5 }, { dur: i === 0 ? DUR.move : DUR.hop });
    tl.set(a.box, { attr: { "data-hover": 1 } }, arrive);
    tl.set(a.box, { attr: { "data-hover": 0 } }, t);
    tl.set(a.box, { attr: { "data-on": 1 } }, t);   // checked on the click; colours come from the theme tokens
    tl.fromTo(a.tick, { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: DUR.in, ease: EASE.in }, t);
    sfx(t, "pop", { note: 2 + i });

    // "+$x.00" chip: floats up from the price, then flies into the Total.
    const pr = inCard(a.price);
    const chip = h("div", "os-chip", `+$${a.value.toFixed(2)}`);
    s5.S.root.append(chip);                     // same layer as the card, so it scales with it
    const cw = 72, ch = 26;
    place(chip, pr.cx - cw / 2, pr.cy - ch / 2);
    chip.style.opacity = 0;
    const lift = -40;
    // One clear chain per click, finished before the next click:
    // tick → the price pops out of its own row → flies to the Total → the Total updates.
    const pop = t + STAGGER, fly = t + BEAT / 2, land = fly + DUR.out;
    tl.fromTo(chip, { opacity: 0, y: 0, scale: 0.8 }, { opacity: 1, y: lift, scale: 1, duration: BEAT / 4, ease: EASE.in }, pop);
    tl.fromTo(chip, { x: 0, y: lift, scale: 1, opacity: 1 },
      { x: totalPt.cx - pr.cx - 10, y: totalPt.cy - pr.cy, scale: 0.55, opacity: 0, duration: DUR.out, ease: EASE.move, immediateRender: false }, fly);
    sum += a.value;
    total.to(land, { v: sum }, { dur: DUR.out, ease: EASE.in });
    tl.fromTo(set.addon, { scale: 1 }, { scale: 1.02, duration: DUR.press, ease: EASE.out, immediateRender: false, transformOrigin: "50% 50%" }, land);
    tl.fromTo(set.addon, { scale: 1.02 }, { scale: 1, duration: DUR.release, ease: EASE.in, immediateRender: false }, land + DUR.press);
    sfx(land, "chime", { i });
  });
  sfx(B(CLICKS[2]) + BEAT / 2 + DUR.out, "sparkle");

  // Live preview line, then Add to cart.
  enter(tl, set.note, B(6));
  const btn = world(inCard(set.btn));
  const arriveBuy = cursor.clickAt(B(BUY), { x: btn.cx + btn.w * 0.12, y: btn.cy + 6 }, { dur: DUR.hop });
  tl.fromTo(set.btn, { scale: 1 }, { scale: 0.96, duration: DUR.press, ease: EASE.out, immediateRender: false }, B(BUY) - DUR.press);
  tl.fromTo(set.btn, { scale: 0.96 }, { scale: 1, duration: DUR.release, ease: EASE.in, immediateRender: false }, B(BUY));
  sfx(B(BUY), "add-to-cart");
  cursor.hide(B(BUY) + BEAT / 2);                    // lets go before S8 (never teleports while visible)
  // The button confirms the click (S8 then carries this button down into the orders table).
  // Fade the label element (never the button's colour — that belongs to the theme tokens).
  const lbl = set.btn.firstElementChild;
  tl.fromTo(lbl, { opacity: 1 }, { opacity: 0, duration: DUR.press, ease: EASE.out, immediateRender: false }, B(BUY));
  tl.fromTo(lbl, { opacity: 0 }, { opacity: 1, duration: DUR.out, ease: EASE.in, immediateRender: false }, B(BUY) + DUR.press);
  textAtSwap(lbl, lbl.textContent, "Added to cart ✓", B(BUY) + DUR.press);

  Object.assign(shared, { s7: { btn, head, words, arriveBuy, tBuy: B(BUY), camCentre: L(cx, cy), camScale: localScale / k } });
  return b(2);
}
