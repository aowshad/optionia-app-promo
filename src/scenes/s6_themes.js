// S6 · One-click themes — 4 bars from SCENE.s6.
// The styled set moves to centre and nine themed copies fan out behind it (a peek at the
// themes), then fold away. The cursor clicks one theme pill per beat; the one option set
// morphs its tokens each time (numbers + colours interpolate, labels crossfade case).
// Final bar: all ten spread into a perspective row; the camera tracks to the Studio column's
// Add-ons total bar, where S7 begins.
import { SCENE, sceneAt, BEAT, DUR, EASE, STAGGER } from "../tokens.js";
import { h, place, makeLayer } from "../components/basics.js";
import { createOptionSet, THEMES } from "../components/optionset.js";
import { splitWords, reveal, unreveal } from "../motion.js";
import { sfx } from "../clock.js";

const b = sceneAt(SCENE.s6);
const B = (n) => b(0) + n * BEAT;
const CARD_SCALE = 0.8, CARD_TOP = 300;
const ROW = { scale: 0.62, step: 470, tilt: -18, depth: 36 };

export function build(ctx) {
  const { tl, world, camera, cursor, sel, shared } = ctx;
  const gsap = window.gsap;
  const { s4, s5 } = shared;
  const set = s5.set;
  const S5 = s5.S;
  // Ghost copies live in a layer *under* the S5 layer so they sit behind the main set.
  const S = makeLayer(world, s4.P, s4.k);
  world.insertBefore(S.root, S5.root);
  const { root, L, R } = S;

  // ── Headline + theme pills ──
  const head = place(h("div", "headline", "Or pick a theme. One click."), 0, 64, 1920);
  head.style.cssText += "font-size:92px;text-align:center;";
  S5.root.append(head);
  const words = splitWords(head);
  const pillBar = h("div", "pills", THEMES.map((t) => `<div class="pill"><i class="on"></i><span>${t.name}</span></div>`).join(""));
  S5.root.append(pillBar);
  place(pillBar, Math.round(960 - pillBar.offsetWidth / 2), 188);
  const pills = [...pillBar.querySelectorAll(".pill")].map((p) => ({ el: p, on: p.querySelector(".on"), label: p.querySelector("span") }));
  gsap.set(pillBar, { opacity: 0 });

  // ── Where the main set goes: centred, scaled; transform-origin top-left keeps the maths simple ──
  const W0 = set.el.offsetWidth, H0 = set.el.offsetHeight;
  const from = { x: set.el.offsetLeft, y: set.el.offsetTop };
  const centre = { x: 960 - (W0 * CARD_SCALE) / 2, y: CARD_TOP };
  // Pivot moves to the top-left at S6's start (scale is still 1 then, so nothing shifts).
  tl.set(set.el, { transformOrigin: "0% 0%" }, B(0));

  // Nine themed copies (Default … Playful) stacked exactly behind it. Each sits in a wrapper:
  // the wrapper fans (pivot below the card), the card inside spreads (pivot top-left).
  const ghosts = THEMES.slice(0, 9).map((t) => {
    const g = createOptionSet({ theme: t });
    const wrap = place(h("div"), centre.x, centre.y, W0 * CARD_SCALE, H0 * CARD_SCALE);
    wrap.append(g.el);
    root.append(wrap);
    place(g.el, 0, 0);
    gsap.set(g.el, { transformOrigin: "0% 0%", scale: CARD_SCALE });
    gsap.set(wrap, { opacity: 0, transformOrigin: "50% 130%" });
    return { ...g, wrap };
  });

  /* ═══ Beat 0–4: S5 clears, the set centres, nine copies fan out and fold away ═══ */
  unreveal(tl, s5.words.flat(), B(0));
  tl.to([s5.panel.el, s5.editor.el, s5.link], { opacity: 0, x: -80, duration: DUR.out, ease: EASE.out }, B(0));
  tl.to(set.el, { x: centre.x - from.x, y: centre.y - from.y, scale: CARD_SCALE, duration: DUR.move, ease: EASE.move }, B(0));
  sfx(B(0), "whoosh", { dur: DUR.move });

  const FAN = ghosts.map((_, i) => (i - 4) * 4.2);
  ghosts.forEach((g, i) => {
    tl.fromTo(g.wrap, { opacity: 0, rotation: 0, x: 0 },
      { opacity: 1, rotation: FAN[i], x: (i - 4) * 26, duration: DUR.in, ease: EASE.in, immediateRender: false }, B(2) + Math.abs(i - 4) * (STAGGER / 2));
    tl.to(g.wrap, { opacity: 0, rotation: 0, x: 0, duration: DUR.in, ease: EASE.move }, B(3.25));
  });
  sfx(B(2), "fan");

  reveal(tl, words, B(1));
  tl.fromTo(pillBar, { opacity: 0, y: 20, filter: "blur(8px)" }, { opacity: 1, y: 0, filter: "blur(0px)", duration: DUR.in, ease: EASE.in }, B(1));
  tl.set(pillBar, { filter: "none" }, B(1) + DUR.in);

  /* ═══ Beat 3–12: one click per beat — the set morphs through all ten themes ═══ */
  cursor.show(B(0.5), L(2080, 1160));
  THEMES.forEach((theme, i) => {
    const t = B(3 + i);
    const p = pills[i];
    const r = R(p.el);
    // A hand, not a machine: each click lands at a slightly different spot on the pill, and the
    // little arc between pills alternates and varies (fixed pseudo-random values — deterministic).
    const jx = [0.58, 0.46, 0.64, 0.52, 0.6, 0.44, 0.56, 0.66, 0.5, 0.6][i];
    const jy = [3, 6, 2, 7, 4, 1, 6, 3, 5, 2][i];
    const bend = (i % 2 ? -1 : 1) * [0.34, 0.22, 0.3, 0.18, 0.28, 0.24, 0.32, 0.2, 0.26, 0.3][i];
    const arrive = cursor.clickAt(t, { x: r.x + r.w * jx, y: r.cy + jy * s4.k }, { dur: i === 0 ? DUR.move : DUR.nudge, bend: i === 0 ? 0.22 : bend });
    tl.set(p.el, { attr: { "data-hover": 1 } }, arrive);
    tl.set(p.el, { attr: { "data-hover": 0 } }, t);
    // A real tab switch: on the click the new tab is active and the old one inactive — instantly,
    // so only one tab is ever lit. The content (the option set) is what transitions smoothly.
    tl.set(p.on, { opacity: 1 }, t);
    tl.set(p.label, { color: "#FFFFFF" }, t);
    if (i > 0) {
      tl.set(pills[i - 1].on, { opacity: 0 }, t);
      tl.set(pills[i - 1].label, { color: "#1B1F3B" }, t);
    }
    sel.snap(t, r, { dur: DUR.in });
    // The morph: every token (numbers and colours) interpolates in one beat.
    const { name, ...tokens } = theme;
    // The tab switches on the click; the preview answers a sixteenth later and morphs smoothly.
    s5.tokens.to(t + STAGGER, tokens, { dur: DUR.in - STAGGER, ease: EASE.move });
    sfx(t, "theme", { i, note: i });
  });
  cursor.hide(B(12.5));
  sel.hide(B(12.5));

  /* ═══ Final bar: ten columns spread into a perspective row; camera tracks to Studio ═══ */
  const tS = B(12.5);
  const cols = [...ghosts.map((g) => g.el), set.el];
  ghosts.forEach((g, i) => tl.fromTo(g.wrap, { opacity: 0 }, { opacity: 1, duration: DUR.in, ease: EASE.in, immediateRender: false }, tS + (9 - i) * (STAGGER / 2)));
  const rowCx = 960, rowY = CARD_TOP + 40;
  const colX = (i) => rowCx + (i - 4.5) * ROW.step - (W0 * ROW.scale) / 2;
  cols.forEach((el, i) => {
    const isMain = i === 9;
    const base = isMain ? from : centre;          // layout position of the element
    const vars = { x: colX(i) - base.x, y: rowY - base.y, scale: ROW.scale,
      rotationY: ROW.tilt, z: -i * ROW.depth, transformPerspective: 2400, duration: DUR.move, ease: EASE.move };
    if (isMain) tl.to(el, vars, tS);
    else tl.fromTo(el, { x: 0, y: 0, scale: CARD_SCALE, rotationY: 0, z: 0 }, { ...vars, immediateRender: false }, tS + (9 - i) * (STAGGER / 2));
  });
  tl.to([...words, pillBar], { opacity: 0, duration: DUR.out, ease: EASE.out }, tS);
  sfx(tS, "spread");

  // Camera: pull back over the whole row, then track right and land on Studio's Add-ons bar.
  const rowW = 9 * ROW.step + W0 * ROW.scale;
  // Close enough that the row runs off both edges, so the track reads as travel along it.
  camera.moveTo(tS, { ...L(rowCx - ROW.step, rowY + (H0 * ROW.scale) / 2), scale: (1920 * 1.35 / rowW) / s4.k });
  const addY = set.addon.offsetTop + set.addon.offsetHeight / 2;
  const addX = set.addon.offsetLeft + set.addon.offsetWidth / 2;
  const landing = L(colX(9) + addX * ROW.scale, rowY + addY * ROW.scale);
  camera.moveTo(B(14.5), { ...landing, scale: 1000 / (W0 * ROW.scale) / s4.k }, { dur: DUR.track });   // Studio ≈ 1000px wide
  // Studio turns to face the camera as we arrive.
  tl.to(set.el, { rotationY: 0, z: 0, duration: DUR.track, ease: EASE.move }, B(14.5));

  // Studio's visual top-left (local) and scale once it has turned to face the camera.
  Object.assign(shared, { s6: { S, set, cols, ghosts, landing, card: { x: colX(9), y: rowY, s: ROW.scale, w: W0, h: H0 } } });
  return b(4);
}
