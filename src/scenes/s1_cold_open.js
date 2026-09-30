// S1 · Cold open — bar 1.
// Extreme close-up on five tiny swatches. The cursor arcs in, clicks violet on beat 3,
// a selection ring draws around it. The violet swatch *is* the logo mark, scaled down
// under a violet veil, so the S2 handoff is the same element growing up.
import { at, BAR, BEAT, DUR, EASE } from "../tokens.js";
import { h, place } from "../components/basics.js";
import { createMark, MARK } from "../components/logo.js";
import { enter, exit } from "../motion.js";
import { sfx } from "../clock.js";

export const M = { x: 960, y: 540 };            // world anchor shared by S1 + S2
export const SW = 28, GAP = 14;                  // swatch size / gap (world px)
const COLORS = ["#EC4899", "#F59E0B", "#8B5CF6", "#10B981", "#3B82F6"];
const HERO = 2;                                   // violet, centre
const ZOOM = 3.2;

export function build(ctx) {
  const { tl, world, camera, cursor, assets, shared } = ctx;
  const scene = place(h("div", "scene"), 0, 0);
  world.append(scene);

  // Opening camera: extreme close-up, with a barely-there push through the bar.
  camera.set(-1, { x: M.x, y: M.y, scale: ZOOM });
  camera.moveTo(at(1, 0), { scale: ZOOM * 1.06 }, { dur: BAR, whoosh: false });

  const s0 = SW / MARK.size;
  const mark = createMark(assets.icon, COLORS[HERO]);
  const markWrap = place(h("div", "", "", { transformOrigin: "50% 50%" }), M.x - MARK.size / 2, M.y - MARK.size / 2, MARK.size, MARK.size);
  markWrap.append(mark.el);
  window.gsap.set(mark.el, { scale: s0, transformOrigin: "50% 50%" });

  const items = COLORS.map((c, i) => {
    if (i === HERO) return markWrap;
    const x = M.x + (i - HERO) * (SW + GAP) - SW / 2;
    return place(h("div", "s1-swatch", "", { background: c }), x, M.y - SW / 2, SW, SW);
  });
  scene.append(...items);

  // Selection ring around the hero swatch (stroke-dashoffset draw).
  const R = SW + 10;
  const ring = place(h("div", "s1-ring", `
    <svg width="${R}" height="${R}" viewBox="0 0 ${R} ${R}" overflow="visible">
      <rect x="0.6" y="0.6" width="${R - 1.2}" height="${R - 1.2}" rx="${(SW / 2) * 0.475 + 5}" fill="none"
            stroke="#6366F1" stroke-width="1.2" pathLength="1" style="stroke-dasharray:1 1;stroke-dashoffset:1"/>
    </svg>`), M.x - R / 2, M.y - R / 2, R, R);
  scene.append(ring);
  const ringRect = ring.querySelector("rect");

  // ── Choreography ──
  // Swatches enter left→right; BEAT/4 apart keeps ≤3 visibly in motion.
  enter(tl, items, at(1, 0), { stagger: BEAT / 4 });

  const start = { x: M.x + 1100 / ZOOM, y: M.y + 720 / ZOOM };
  cursor.show(-BAR, start);
  const tClick = at(1, 2);
  cursor.clickAt(tClick, { x: M.x + 4, y: M.y + 5 }, { bend: 0.18 });
  tl.fromTo(mark.el, { scale: s0 }, { scale: s0 * 0.9, duration: DUR.press, ease: EASE.out, immediateRender: false }, tClick - DUR.press);
  tl.fromTo(mark.el, { scale: s0 * 0.9 }, { scale: s0, duration: DUR.release, ease: EASE.in, immediateRender: false }, tClick);
  tl.fromTo(ringRect, { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: DUR.in, ease: EASE.in }, tClick);
  sfx(tClick, "pop", { note: 0 });

  // Clear the stage for the handoff: cursor drifts off, the other swatches fall away (inner first).
  cursor.moveTo(at(1, 3), { x: M.x + 300 / ZOOM, y: M.y + 420 / ZOOM }, { bend: -0.2 });
  cursor.hide(at(1, 3) + BEAT / 2);
  exit(tl, [items[1], items[3], items[0], items[4]], at(1, 3));

  Object.assign(shared, { M, mark, markWrap, ring });
  return at(2, 0);
}
