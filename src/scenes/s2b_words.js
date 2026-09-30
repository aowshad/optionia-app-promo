// Kinetic sentence — bars 4–5, between the logo and the hook.
// "Product options for every store." is laid out as ONE line on the canvas; the camera
// tracks right→left across it in two stops, so the two screens read as one sentence.
//   Screen 1: "Product options" (large, bold) slides in from the right, letters flipping up.
//   Screen 2: "for every store." follows at once; the tail of "options" stays in frame.
// Handoff: the final period turns violet and becomes the "+" orb (picked up by S3).
import { SCENE, sceneAt, DUR, EASE, STAGGER } from "../tokens.js";
import { h, place } from "../components/basics.js";
import { freeze, baselineOf, splitKerned } from "../components/kinetic.js";
import { sfx } from "../clock.js";

const b = sceneAt(SCENE.words);
const TILT = 72;                                   // backward tilt (deg) each letter flips up from

export function build(ctx) {
  const { tl, world, camera, shared } = ctx;

  const line = h("div", "kline", `<span class="kp kp1">Product options</span><span class="kp kp2">for every store.</span>`);
  world.append(line);
  const [p1, p2] = line.querySelectorAll(".kp");
  const base = baselineOf(line);                   // shared baseline (flex, align-items: baseline)
  const [box1, box2] = freeze(p1, p2);
  const g1 = splitKerned(p1), g2 = splitKerned(p2);

  // Place the line so screen 1 is centred one canvas-width right of the logo,
  // with the text optically centred on y = 540 (baseline ≈ half a cap-height below).
  const X1 = shared.lockup.cx + 2100, Y = 540;
  const left = X1 - (box1.x + box1.w / 2);
  const top = Y + 0.35 * parseFloat(getComputedStyle(p1).fontSize) - base;
  place(line, left, top);
  const X2 = left + box2.x + box2.w / 2;

  // ── Camera: two glides that read as one right→left track ──
  camera.moveTo(b(0), { x: X1, y: Y, scale: 1 });
  camera.moveTo(b(0, 3), { x: X2, y: Y, scale: 1 });

  // ── Letters flip up from a backward tilt, hinged at the baseline, drifting in from the right ──
  const flip = (glyphs, t0, fontPx, part) => {
    const els = glyphs.map((g) => g.el);
    tl.fromTo(els,
      { opacity: 0, rotationX: TILT, x: fontPx * 0.35, transformPerspective: fontPx * 4, transformOrigin: `50% ${(base - part.y) / part.h * 100}%` },
      { opacity: 1, rotationX: 0, x: 0, duration: DUR.in, ease: EASE.in, stagger: STAGGER / 2, immediateRender: true },
      t0);
    glyphs.forEach((g, i) => sfx(t0 + i * STAGGER / 2, "letter", { i, soft: true }));
  };
  const fs1 = parseFloat(getComputedStyle(p1).fontSize);
  const fs2 = parseFloat(getComputedStyle(p2).fontSize);
  flip(g1, b(0, 1), fs1, box1);
  flip(g2, b(1, 0), fs2, box2);                    // follows as soon as the camera starts carrying us on

  // ── Handoff: the period warms to violet, then hands itself to S3 as the orb ──
  const dot = g2[g2.length - 1];
  tl.fromTo(dot.el, { color: "#07004F" }, { color: "#8838E0", duration: DUR.in, ease: EASE.in, immediateRender: false }, b(1, 3));
  tl.to(dot.el, { opacity: 0, duration: DUR.out, ease: EASE.out }, b(2, 0));
  shared.launch = {
    t: b(2, 0),
    x: left + box2.x + dot.x + dot.w / 2,
    y: top + base - fs2 * 0.075,
    d: fs2 * 0.17,
  };

  return b(2, 0);
}
