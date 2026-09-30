// S2 · Logo — bars 2–3.
// The violet swatch grows into the app icon (veil fades, gradient shows), the glyph
// draws on (stroke → fill), the wordmark rises letter by letter. No tagline: the
// lockup holds dead centre while the camera glides back slowly.
import { at, DUR, EASE, STAGGER } from "../tokens.js";
import { place, pixelTiles } from "../components/basics.js";
import { createWordmark, MARK, WORDMARK } from "../components/logo.js";
import { SW } from "./s1_cold_open.js";
import { sfx } from "../clock.js";

export function build(ctx) {
  const { tl, world, camera, sel, assets, shared } = ctx;
  const { M, mark, ring } = shared;

  // Lockup geometry (Figma "Logo"): icon, 28px gap, wordmark at native size.
  const icon = { x: M.x - MARK.size / 2, y: M.y - MARK.size / 2 };
  const wm = createWordmark(assets.wordmark, "#07004F");
  place(wm.el, icon.x + MARK.size + WORDMARK.gap, icon.y + WORDMARK.dy);
  const lockW = MARK.size + WORDMARK.gap + WORDMARK.w;
  const lockCx = icon.x + lockW / 2;

  world.append(wm.el);

  const tiles = place(pixelTiles({ cols: 8, rows: 5, size: 40, gap: 10 }), 1560, 760);
  world.prepend(tiles);

  // ── Bar 2: swatch → icon ──
  const t = at(2, 0);
  tl.to(ring, { opacity: 0, duration: DUR.out, ease: EASE.out }, t);
  tl.fromTo(mark.el, { scale: SW / MARK.size }, { scale: 1, duration: DUR.move, ease: EASE.move, immediateRender: false }, t);
  tl.fromTo(mark.veil, { opacity: 1 }, { opacity: 0, duration: DUR.move, ease: EASE.move }, t);
  camera.moveTo(t, { x: M.x, y: M.y, scale: 1.7 });
  sfx(t, "bloom");

  // Glyph: stroke draws on, then fills; the corner piece settles in last.
  tl.fromTo(mark.glyph, { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: DUR.move, ease: EASE.move, stagger: STAGGER }, at(2, 1));
  tl.fromTo(mark.glyph, { fillOpacity: 0 }, { fillOpacity: 1, duration: DUR.in, ease: EASE.in }, at(2, 3));
  tl.fromTo(mark.corner, { opacity: 0, scale: 0.5, transformOrigin: "0% 0%" }, { opacity: 1, scale: 1, duration: DUR.in, ease: EASE.in }, at(2, 3));
  sfx(at(2, 3), "pop", { note: 2 });
  tl.fromTo(tiles, { opacity: 0 }, { opacity: 1, duration: DUR.move, ease: EASE.in }, at(2, 2));

  // Frame the lockup before the letters rise, then pull back slowly through the hold.
  camera.moveTo(at(2, 3), { x: lockCx, y: M.y, scale: 1.42 });
  camera.moveTo(at(3, 1), { scale: 1.3 }, { dur: DUR.glide, whoosh: false });

  // ── Bar 3: wordmark per letter ──
  tl.fromTo(wm.letters, { y: WORDMARK.h + 16 }, { y: 0, duration: DUR.in, ease: EASE.in, stagger: STAGGER }, at(3, 0));
  wm.letters.forEach((_, i) => sfx(at(3, 0) + i * STAGGER, "letter", { i }));

  // Selection frame wraps the finished lockup for the hold, then lets go as we leave.
  sel.snap(at(3, 2), { x: icon.x, y: icon.y, w: lockW, h: MARK.size });
  sel.hide(at(4, 0));

  Object.assign(shared, { lockup: { x: icon.x, y: icon.y, w: lockW, h: MARK.size, cx: lockCx } });
  return at(4, 0);
}
