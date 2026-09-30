// Selection frame — 1px indigo bounding box with white square handles.
// Drawn in screen space (constant 1px line, crisp handles) around a world rect.
import { DUR, EASE } from "../tokens.js";
import { track, driver } from "../clock.js";

const HANDLES = ["nw", "n", "ne", "e", "se", "s", "sw", "w"];

export function createSelection(overlay, camera, { pad = 10 } = {}) {
  const el = document.createElement("div");
  el.className = "selection";
  el.innerHTML = HANDLES.map((h) => `<i class="h ${h}"></i>`).join("");
  overlay.append(el);

  const tr = track({ x: 0, y: 0, w: 0, h: 0, o: 0, k: 1 });
  let visible = false;

  const sel = {
    /** Snap around a world rect. Appears in place if hidden, otherwise glides. */
    snap(t0, r, { dur = DUR.in } = {}) {
      const rect = { x: r.x - pad, y: r.y - pad, w: r.w + pad * 2, h: r.h + pad * 2 };
      if (!visible) {
        tr.set(t0, { ...rect, o: 0, k: 1.06 });
        tr.to(t0, { o: 1, k: 1 }, { dur, ease: EASE.in });
        visible = true;
      } else {
        tr.to(t0, { ...rect }, { dur, ease: EASE.in });
      }
      return sel;
    },
    /** Glide with the camera-move tempo (for large re-framings). */
    glide(t0, r) { return sel.snap(t0, r, { dur: DUR.move }); },
    hide(t0) {
      tr.to(t0, { o: 0 }, { dur: DUR.out, ease: EASE.out });
      visible = false;
      return sel;
    },
  };

  driver((t) => {
    const v = tr.at(t);
    const cx = v.x + v.w / 2, cy = v.y + v.h / 2;
    const w = v.w * v.k, h = v.h * v.k;
    const a = camera.project(cx - w / 2, cy - h / 2, t);
    const b = camera.project(cx + w / 2, cy + h / 2, t);
    el.style.opacity = v.o;
    el.style.transform = `translate(${a.x}px, ${a.y}px)`;
    el.style.width = `${b.x - a.x}px`;
    el.style.height = `${b.y - a.y}px`;
  });

  return sel;
}
