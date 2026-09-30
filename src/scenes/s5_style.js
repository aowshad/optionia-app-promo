// S5 · Make it yours — 4 bars from SCENE.s5.
// The live grid collapses into one option set (right); the Option styling panel slides in (left),
// joined by a dashed connector with a travelling dot. The cursor drags Border radius 4 → 24
// (swatches go square → round live), drags Border thickness 1 → 3, picks title colour #14433D;
// then the Custom CSS editor rises and types — on the closing brace the preview flashes and applies.
import { SCENE, sceneAt, BEAT, DUR, EASE, STAGGER } from "../tokens.js";
import { h, place, makeLayer } from "../components/basics.js";
import { createOptionSet, THEMES, tokenTrack } from "../components/optionset.js";
import { createStylePanel, setSlider, createCodeEditor, typeRich, CSS_TOKENS, POP_COLORS } from "../components/stylepanel.js";
import { enter, splitWords, reveal } from "../motion.js";
import { driver, ease, sfx, track } from "../clock.js";
import * as W from "../components/options.js";

const b = sceneAt(SCENE.s5);
const B = (n) => b(0) + n * BEAT;
const RADIUS = { from: 4, to: 24, max: 32 }, THICK = { from: 1, to: 3, max: 5 };
const TITLE_HEX = "#14433D";

export function build(ctx) {
  const { tl, world, camera, cursor, sel, shared } = ctx;
  const gsap = window.gsap;
  const { s4 } = shared;
  const S = makeLayer(world, s4.P, s4.k);
  const { root, L, R, local } = S;

  // ── Layout (local 1920×1080) ──
  const head = place(h("div", "headline", `<div>Style every option</div><div>like your brand.</div>`), 120, 84);
  head.style.fontSize = "92px";
  root.append(head);
  const words = [...head.children].map((line) => splitWords(line));

  const panel = createStylePanel();
  root.append(place(panel.el, 120, 320));
  const start = { ...THEMES[0], swr: RADIUS.from, bw: THICK.from };
  const set = createOptionSet({ theme: start });
  root.append(set.el);
  // The one writer of this set's --os-* tokens (S5's controls and S6's themes all key it).
  const tokens = tokenTrack(set.el, start);
  place(set.el, 1080, Math.round(540 - set.el.offsetHeight / 2));
  const editor = createCodeEditor();
  root.append(place(editor.el, 150, 770));

  // Connector from the panel's radius row to the option set, with a dot travelling on the beat.
  const rowY = local(panel.radius.track).cy;
  const link = place(h("div", "s5-link", `<i></i><b></b>`), 840, rowY, 1080 - 840);
  root.insertBefore(link, panel.el);
  const dot = link.querySelector("b");
  const beatEase = ease(EASE.move);
  driver((t) => {
    const on = t >= B(2.5);
    const p = on ? beatEase(((t - B(2.5)) / BEAT) % 1) : 0;
    dot.style.opacity = on ? 1 : 0;
    dot.style.transform = `translateX(${p * (1080 - 840) - 4}px)`;
  });

  // Slider positions are pure functions of time too.
  const trackW = panel.radius.track.offsetWidth;
  const sliderTrack = (s, spec) => {
    const tr = track({ v: spec.from });
    driver((t) => setSlider(s, tr.at(t).v, spec.max, trackW));
    return tr;
  };
  const radiusV = sliderTrack(panel.radius, RADIUS), thickV = sliderTrack(panel.thick, THICK);
  gsap.set([panel.el, editor.el, set.el, link], { opacity: 0 });

  /* ═══ Beat 0–2: the grid collapses into the option set; panel slides in ═══ */
  const setR = local(set.el);
  const g = s4.grid;
  const maxD = Math.hypot(g.w, g.h);
  g.cards.forEach((c) => {
    const cx = g.x + c.el.offsetLeft + c.el.offsetWidth / 2, cy = g.y + c.el.offsetTop + c.el.offsetHeight / 2;
    const d = Math.hypot(cx - setR.cx, cy - setR.cy);
    tl.to(c.el, { x: setR.cx - cx, y: setR.cy - cy, scale: 0.22, opacity: 0, duration: DUR.move, ease: EASE.move },
      B(0) + (1 - d / maxD) * (BEAT / 2));          // far cards leave last: the grid folds inward
  });
  tl.fromTo(set.el, { opacity: 0, scale: 0.9 }, { opacity: 1, scale: 1, duration: DUR.move, ease: EASE.move }, B(0.5));
  tl.to(s4.counter, { opacity: 0, y: "-=24", duration: DUR.out, ease: EASE.out }, B(0));
  camera.moveTo(B(0), { ...L(960, 540), scale: 1 / s4.k });
  sel.glide(B(0), R(set.el));
  sel.hide(B(2.5));
  sfx(B(0), "collapse");

  reveal(tl, words[0], B(1));
  reveal(tl, words[1], B(2));
  enter(tl, panel.el, B(1));
  tl.fromTo(panel.el, { x: -60 }, { x: 0, duration: DUR.in, ease: EASE.in, immediateRender: false }, B(1));
  tl.fromTo(link, { opacity: 0, scaleX: 0, transformOrigin: "0% 50%" }, { opacity: 1, scaleX: 1, duration: DUR.in, ease: EASE.in }, B(2));

  const setAttr = (el, name, on, off) => {
    tl.set(el, { attr: { [name]: 1 } }, on);
    if (off !== undefined) tl.set(el, { attr: { [name]: 0 } }, off);
  };
  const thumbAt = (s, v, max) => { const r = R(s.track); return { x: r.x + (v / max) * r.w, y: r.cy }; };
  const tip = (s, on, off) => {
    tl.fromTo(s.tip, { opacity: 0, y: 6 }, { opacity: 1, y: 0, duration: DUR.out, ease: EASE.in }, on);
    tl.to(s.tip, { opacity: 0, y: 4, duration: DUR.out, ease: EASE.out }, off);
  };
  /** One slider drag: press at `down`, drag for DUR.move, release. The token follows the thumb. */
  const drag = (s, spec, down, valueTrack, token) => {
    setAttr(s.thumb, "data-active", down, down + DUR.move);
    tip(s, down, down + DUR.move);
    cursor.down(down);
    cursor.dragTo(down, thumbAt(s, spec.to, spec.max));
    cursor.up(down + DUR.move);
    valueTrack.to(down, { v: spec.to }, { dur: DUR.move, ease: EASE.move });
    tokens.to(down, { [token]: spec.to }, { dur: DUR.move, ease: EASE.move });
    sfx(down + DUR.move, "tick");
  };

  /* ═══ Beat 1.5–6: drag Border radius 4 → 24 — swatches go from squares to circles ═══ */
  cursor.show(B(1), L(-120, 1180));
  const r0 = thumbAt(panel.radius, RADIUS.from, RADIUS.max);
  const arrive1 = B(4) - BEAT / 2;
  cursor.moveTo(arrive1 - DUR.move, { x: r0.x + 3, y: r0.y + 4 });
  setAttr(panel.radius.thumb, "data-hover", arrive1, B(4));
  drag(panel.radius, RADIUS, B(4), radiusV, "swr");

  /* ═══ Beat 6–9.5: hop to Border thickness, drag 1 → 3 — borders thicken ═══ */
  const t0 = thumbAt(panel.thick, THICK.from, THICK.max);
  cursor.moveTo(B(6), { x: t0.x + 3, y: t0.y + 4 }, { dur: DUR.hop });
  setAttr(panel.thick.thumb, "data-hover", B(7), B(7.5));
  drag(panel.thick, THICK, B(7.5), thickV, "bw");

  /* ═══ Beat 9.5–12.5: Title colour → #14433D via the popover ═══ */
  const tBox = panel.title.box;
  const tOpen = B(11);
  const arrive3 = cursor.clickAt(tOpen, { x: R(tBox).x + R(tBox).w * 0.4, y: R(tBox).cy + 4 }, { dur: DUR.hop });
  setAttr(tBox, "data-hover", arrive3, tOpen);
  setAttr(tBox, "data-focus", tOpen, B(12.5));
  tl.fromTo(panel.pop, { opacity: 0, y: -8 }, { opacity: 1, y: 0, duration: DUR.in, ease: EASE.in }, tOpen);
  sfx(tOpen, "open");
  const chip = panel.popChips[POP_COLORS.indexOf(TITLE_HEX)];
  const tPick = B(12);
  const arrive4 = cursor.clickAt(tPick, { x: R(chip).cx + 4, y: R(chip).cy + 5 }, { dur: DUR.nudge });
  setAttr(chip, "data-hover", arrive4, tPick + BEAT / 4);
  tokens.to(tPick, { title: TITLE_HEX }, { dur: DUR.in, ease: EASE.in });
  tl.fromTo(panel.title.chip, { backgroundColor: THEMES[0].title }, { backgroundColor: TITLE_HEX, duration: DUR.in, ease: EASE.in }, tPick);
  W.textAt(panel.title.hex, [[tPick, TITLE_HEX]]);
  tl.to(panel.pop, { opacity: 0, y: -4, duration: DUR.out, ease: EASE.out }, B(12.5));
  sfx(tPick, "pop", { note: 3 });
  cursor.hide(B(12.5));

  /* ═══ Beat 12–16: Custom CSS rises and types; the closing brace applies it ═══ */
  enter(tl, editor.el, B(12));
  const tBrace = typeRich(editor.code, CSS_TOKENS, B(12.25), BEAT / 28, B(16));
  tl.fromTo(set.flash, { opacity: 0 }, { opacity: 0.7, duration: DUR.press, ease: EASE.out }, tBrace);
  tl.fromTo(set.flash, { opacity: 0.7 }, { opacity: 0, duration: DUR.in, ease: EASE.in, immediateRender: false }, tBrace + DUR.press);
  tokens.to(tBrace, { swr: 999, css: 1 }, { dur: DUR.in, ease: EASE.in });
  sfx(tBrace, "apply");

  // Hand the styled set and the S5 layer to S6.
  Object.assign(shared, { s5: { S, set, tokens, head, words, panel, editor, link } });
  return b(4);
}
