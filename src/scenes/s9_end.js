// S9 · End card — 3 bars from SCENE.s9.
// The board recedes; the "+" orb returns to centre and resolves into the Optionia icon (S2 in
// reverse, shorter); the wordmark rises, then "Unlimited product options for every product.",
// the Shopify App Store badge and "Powered by ParseLab". A full hold, then a breath-only bar.
import { SCENE, sceneAt, BEAT, DUR, EASE, STAGGER } from "../tokens.js";
import { h, place, pixelTiles } from "../components/basics.js";
import { createMark, createWordmark, MARK, WORDMARK } from "../components/logo.js";
import { enter } from "../motion.js";
import { sfx } from "../clock.js";

const b = sceneAt(SCENE.s9);
const B = (n) => b(0) + n * BEAT;

export function build(ctx) {
  const { tl, world, camera, shared, assets } = ctx;
  const { board } = shared.s8;
  const orb = shared.orb;
  const C = { x: board.centre.x, y: board.centre.y + 50 };
  const scene = place(h("div", "scene"), C.x - 960, C.y - 540);
  world.append(scene);

  // Lockup geometry as in S2: icon, 28px gap, wordmark.
  const lockW = MARK.size + WORDMARK.gap + WORDMARK.w;
  const iconX = 960 - lockW / 2, iconY = 330;
  // The lockup starts shifted so the icon sits dead centre (where the orb resolves), then glides
  // left into the centred lockup as the wordmark rises — S2 in reverse.
  const lockup = place(h("div"), iconX, iconY, lockW, MARK.size);
  scene.append(lockup);
  const mark = createMark(assets.icon, "#8B5CF6");
  mark.veil.style.opacity = 0;
  mark.glyph.forEach((p) => { p.style.strokeDashoffset = "0"; p.style.fillOpacity = "1"; });
  lockup.append(place(mark.el, 0, 0));
  const wm = createWordmark(assets.wordmark, "#07004F");
  lockup.append(place(wm.el, MARK.size + WORDMARK.gap, WORDMARK.dy));
  const shift = lockW / 2 - MARK.size / 2;

  const line = place(h("div", "end-line", "Unlimited product options for every product."), 0, 580, 1920);
  const badge = place(h("img", "end-badge"), 960 - 186, 690, 372);
  badge.src = "assets/badges/badge-shopify-app-store-dark.svg";
  badge.alt = "Available on the Shopify App Store";
  const foot = place(h("div", "end-foot", `Powered by <b>ParseLab</b>`), 0, 960, 1920);
  const tiles = place(pixelTiles({ cols: 8, rows: 5, size: 44, gap: 10 }), 1440, 760);
  scene.prepend(tiles);
  scene.append(line, badge, foot);
  window.gsap.set([mark.el, line, badge, foot, tiles], { opacity: 0 });

  /* ═══ Beat 1: the board recedes; the orb returns to centre as the camera comes in ═══ */
  board.groups.forEach((g, i) => {
    tl.to(g, { opacity: 0, scale: 0.96, duration: DUR.in, ease: EASE.out, transformOrigin: "50% 50%" }, B(1) + (i % 4) * (STAGGER / 2));
  });
  const iconY0 = C.y - 540 + iconY + MARK.size / 2;
  orb.set(B(1), { x: C.x, y: iconY0, d: 24, o: 0 });
  orb.to(B(1), { d: 210, o: 1 }, { dur: DUR.move, ease: EASE.move });
  camera.moveTo(B(1), { x: C.x, y: C.y, scale: 1 });
  tl.set(lockup, { x: shift }, B(1));

  /* ═══ Beat 3: the orb resolves into the icon in place; beat 4: icon glides left as letters rise ═══ */
  orb.pulse(B(3));
  orb.to(B(3), { d: MARK.size, o: 0 }, { dur: DUR.in, ease: EASE.in });
  tl.fromTo(mark.el, { opacity: 0, scale: 1.2, borderRadius: MARK.size / 2 },
    { opacity: 1, scale: 1, borderRadius: MARK.radius, duration: DUR.in, ease: EASE.in }, B(3));
  sfx(B(3), "bloom");
  tl.fromTo(lockup, { x: shift }, { x: 0, duration: DUR.move, ease: EASE.move, immediateRender: false }, B(4));
  tl.fromTo(wm.letters, { y: WORDMARK.h + 16 }, { y: 0, duration: DUR.in, ease: EASE.in, stagger: STAGGER / 2 }, B(4.5));
  wm.letters.forEach((_, i) => sfx(B(4.5) + i * (STAGGER / 2), "letter", { i }));

  /* ═══ Line, badge, footer — then everything simply breathes ═══ */
  enter(tl, line, B(6));
  enter(tl, [badge, foot], B(7));                    // settles before beat 8: the last bar is breath only
  tl.fromTo(tiles, { opacity: 0 }, { opacity: 1, duration: DUR.move, ease: EASE.in }, B(6));
  // Beats 8–12: no new motion (breath only) so the film can loop.
  return b(3);
}
