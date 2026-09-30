// S3 · Hook — 2 bars from SCENE.s3 (Figma "Creative" as motion).
// The sentence's period becomes the glowing orb; the camera follows it right. Words enter
// around the orb, the chip capsule rises and keeps scrolling, six product tiles deal in.
// Handoff (next downbeat): the orb pulses once and the hoodie tile lifts out.
import { SCENE, sceneAt, BAR, BEAT, DUR, EASE } from "../tokens.js";
import { h, place, pixelTiles, worldRect } from "../components/basics.js";
import { createOrb } from "../components/orb.js";
import { createChipBar, driveChipScroll, productTile } from "../components/chips.js";
import { reveal, bob, enter } from "../motion.js";
import { sfx } from "../clock.js";

export const C3 = { x: 7400, y: 540 };            // scene centre on the canvas
const b = sceneAt(SCENE.s3);
const PRODUCTS = ["tshirt", "necklace", "hoodie", "mug", "tote", "cap"];
const HERO = 2;                                   // hoodie
const FAN = [-6, 4, -4, 5, -5, 4];                // degrees
const LIFT = [14, -4, 10, -6, 12, -2];            // y offsets (px)
const TILE = 236, STEP = 212, HERO_LIFT = 48, HERO_SCALE = 1.08;
const bobPhase = (i) => i * 0.19;

const words = (s) => s.split(" ").map((w) => `<span class="mask"><span class="word">${w}</span></span>`).join(" ");

export function build(ctx) {
  const { tl, world, camera, shared } = ctx;
  const { launch } = shared;
  const ox = C3.x - 960, oy = C3.y - 540;         // scene-local → world
  const scene = place(h("div", "scene"), ox, oy);
  world.append(scene);

  const tex = place(pixelTiles({ cols: 9, rows: 6, size: 44, gap: 10, corner: "br" }), 1400, 560);
  scene.append(tex);

  // Headline: "Add More [+] Options / Sell More Products".
  const head = place(h("div", "headline s3-head", `
    <div class="line l1">${words("Add More")} <span class="slot"></span> ${words("Options")}</div>
    <div class="line l2">${words("Sell More Products")}</div>`), 0, 318, 1920);
  scene.append(head);
  const w1 = [...head.querySelectorAll(".l1 .word")], w2 = [...head.querySelectorAll(".l2 .word")];
  const slot = worldRect(head.querySelector(".slot"), world);

  // Chip capsule + neck down to the orb.
  const bar = createChipBar({ width: 1180 });
  place(bar.el, 960 - 590, 150);
  scene.append(bar.el);
  const barBottom = oy + 150 + 96;
  const orbD = slot.w;
  const neckH = slot.cy - orbD / 2 - barBottom + 8;
  place(bar.neck, slot.cx - ox - 60, 150 + 96 - 3, 120, neckH);
  bar.neck.querySelector("svg").setAttribute("height", neckH);
  bar.neck.querySelector("svg").setAttribute("preserveAspectRatio", "none");
  scene.insertBefore(bar.neck, bar.el);
  driveChipScroll(bar);

  // Product tiles, fanned and overlapping (later tiles on top).
  const x0 = 960 - (STEP * (PRODUCTS.length - 1) + TILE) / 2;
  const tiles = PRODUCTS.map((p, i) => {
    const t = productTile(`assets/products/${p}.png`, TILE);
    place(t.wrap, x0 + i * STEP, 640);
    scene.append(t.wrap);
    bob(t.wrap, bobPhase(i));
    return t;
  });

  // The orb lives in the world so it can travel between scenes.
  const orb = createOrb(world);

  // ── Bar 1: the period launches as the orb and the camera follows it right ──
  const t = b(0, 0);
  orb.set(t, { x: launch.x, y: launch.y, d: launch.d, o: 0 });
  orb.fly(t, { x: slot.cx, y: slot.cy, d: orbD, o: 1 }, { bend: -0.05 });
  camera.moveTo(t, { x: C3.x, y: C3.y - 30, scale: 1 });
  sfx(t, "orb-launch");
  tl.fromTo(tex, { opacity: 0 }, { opacity: 1, duration: DUR.move, ease: EASE.in }, b(0, 2));

  reveal(tl, w1, b(0, 2));
  reveal(tl, w2, b(0, 3));

  // ── Bar 2: capsule rises, tiles deal in (BEAT/3 apart → ≤3 in motion) ──
  enter(tl, [bar.neck, bar.el], b(1, 0), { stagger: 0 });
  tiles.forEach(({ tile }, i) => {
    const cx = x0 + i * STEP + TILE / 2;
    const ti = b(1, 1) + i * (BEAT / 3);
    tl.fromTo(tile,
      { opacity: 0, x: (960 - cx) * 0.35, y: 130, rotation: 0, scale: 0.98, filter: "blur(8px)" },
      { opacity: 1, x: 0, y: LIFT[i], rotation: FAN[i], scale: 1, filter: "blur(0px)", duration: DUR.in, ease: EASE.in, immediateRender: true },
      ti);
    tl.set(tile, { filter: "none" }, ti + DUR.in);
    sfx(ti, "deal", { i });
  });
  camera.moveTo(b(1, 0), { scale: 1.035 }, { dur: BAR, whoosh: false });

  // ── Handoff: heartbeat on the downbeat of bar 6, hoodie lifts out of the row ──
  const tH = b(2, 0);
  orb.pulse(tH);
  const hero = tiles[HERO];
  tl.set(hero.wrap, { zIndex: 5 }, tH);
  tl.fromTo(hero.tile, { y: LIFT[HERO], rotation: FAN[HERO], scale: 1 },
    { y: LIFT[HERO] - HERO_LIFT, rotation: 0, scale: HERO_SCALE, duration: DUR.move, ease: EASE.move, immediateRender: false }, tH);

  // Hand S4 the lifted hoodie's world geometry (settled at tH + DUR.move) for the shared-element dive.
  const hoodie = {
    cx: ox + x0 + HERO * STEP + TILE / 2,
    cy: oy + 640 + TILE / 2 + LIFT[HERO] - HERO_LIFT,
    size: TILE * HERO_SCALE, radius: 44 * HERO_SCALE, rim: 9 * HERO_SCALE,
    settled: tH + DUR.move, wrap: hero.wrap, bobPhase: bobPhase(HERO),
  };
  Object.assign(shared, { orb, hoodie, s3: { scene, tiles, head, bar } });
  return tH + DUR.move;
}
