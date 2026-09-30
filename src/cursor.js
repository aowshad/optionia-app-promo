// The blue cursor — the "hand" of the film.
// Positions are world coordinates; it is drawn in the screen-space overlay so it
// stays a constant, crisp size however far the camera zooms.
// Travel is always a bezier arc over DUR.move, never a straight line.
import { BEAT, DUR, EASE } from "./tokens.js";
import { track, driver, sfx } from "./clock.js";

const SVG = `
<svg width="44" height="44" viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <filter id="cur-sh" x="-40%" y="-40%" width="180%" height="180%">
      <feDropShadow dx="0" dy="3" stdDeviation="3" flood-color="#07004F" flood-opacity=".28"/>
    </filter>
  </defs>
  <path filter="url(#cur-sh)" d="M4.5 3.2 L37.2 15.6 C39 16.3 38.9 18.8 37.1 19.4 L23.6 23.6 L19.4 37.1 C18.8 38.9 16.3 39 15.6 37.2 L3.2 4.5 C2.7 3.4 3.4 2.7 4.5 3.2 Z"
        fill="#0259FE" stroke="#fff" stroke-width="2.4" stroke-linejoin="round"/>
</svg>`;

// Quadratic bezier with the control point pushed perpendicular to the chord.
// Other numeric keys (size, opacity…) interpolate linearly alongside.
export function arcInterp(bend) {
  return (a, b, k) => {
    const out = {};
    for (const key in b) out[key] = typeof a[key] === "number" ? a[key] + (b[key] - a[key]) * k : b[key];
    const dx = b.x - a.x, dy = b.y - a.y;
    const cx = (a.x + b.x) / 2 - dy * bend;
    const cy = (a.y + b.y) / 2 + dx * bend;
    const u = 1 - k;
    out.x = u * u * a.x + 2 * u * k * cx + k * k * b.x;
    out.y = u * u * a.y + 2 * u * k * cy + k * k * b.y;
    return out;
  };
}

export function createCursor(overlay, camera, { x = 0, y = 0 } = {}) {
  const el = document.createElement("div");
  el.className = "cursor";
  el.innerHTML = SVG;
  const ripple = document.createElement("div");
  ripple.className = "cursor-ripple";
  overlay.append(ripple, el);

  const pos = track({ x, y });
  const press = track({ s: 1 });
  const vis = track({ o: 0 });
  const rip = track({ r: 0, o: 0, x: 0, y: 0 });
  let last = { x, y };

  const cursor = {
    get pos() { return last; },

    /** Place the cursor (usually off-frame) and make it visible. */
    show(t0, at = last) {
      if (at !== last) { pos.set(t0, at); last = at; }
      vis.to(t0, { o: 1 }, { dur: DUR.in, ease: EASE.in });
      return cursor;
    },
    hide(t0) {
      vis.to(t0, { o: 0 }, { dur: DUR.out, ease: EASE.out });
      return cursor;
    },

    /** Arc from the current position to `to` over DUR.move. */
    moveTo(t0, to, { bend = 0.22, dur = DUR.move } = {}) {
      pos.to(t0, { x: to.x, y: to.y }, { dur, ease: EASE.move, interp: arcInterp(bend) });
      sfx(t0, "cursor-move", { dur });
      last = { x: to.x, y: to.y };
      return cursor;
    },

    /** Press dip 1 → 0.94 → 1, with a soft ripple at the tip. */
    click(t, { sound = "click" } = {}) {
      cursor.down(t, { sound });
      cursor.up(t);
      return cursor;
    },

    /** Press and hold (for drags). The dip lands on `t`. */
    down(t, { sound = "click" } = {}) {
      press.to(t - DUR.press, { s: 0.94 }, { dur: DUR.press, ease: EASE.out });
      rip.set(t, { r: 0, o: 0.5, x: last.x, y: last.y });
      rip.to(t, { r: 26, o: 0 }, { dur: DUR.in, ease: EASE.in });
      sfx(t, sound);
      return cursor;
    },
    up(t) {
      press.to(t, { s: 1 }, { dur: DUR.release, ease: EASE.in });
      return cursor;
    },

    /** Drag while pressed: a near-straight glide (a hair of arc) that the dragged control follows. */
    dragTo(t0, to, { dur = DUR.move } = {}) {
      pos.to(t0, { x: to.x, y: to.y }, { dur, ease: EASE.move, interp: arcInterp(0.015) });
      sfx(t0, "drag", { dur });
      last = { x: to.x, y: to.y };
      return cursor;
    },

    /**
     * Rule 7: travel, arrive, rest ½ beat, click. Travel is DUR.move across the canvas,
     * DUR.hop between controls in one panel, DUR.nudge inside one control.
     * Returns the arrival time (when hover states should begin).
     */
    clickAt(tClick, to, { dur = DUR.move, ...opts } = {}) {
      cursor.moveTo(tClick - BEAT / 2 - dur, to, { dur, ...opts });
      cursor.click(tClick, opts);
      return tClick - BEAT / 2;
    },
  };

  driver((t) => {
    const p = pos.at(t);
    const sp = camera.project(p.x, p.y, t);
    const s = press.at(t).s;
    el.style.opacity = vis.at(t).o;
    el.style.transform = `translate(${sp.x - 4}px, ${sp.y - 4}px) scale(${s})`;
    const r = rip.at(t);
    const rp = camera.project(r.x, r.y, t);
    // Sized (not scaled) so it is re-rasterised crisply every frame.
    ripple.style.opacity = r.o;
    ripple.style.width = ripple.style.height = `${r.r * 2}px`;
    ripple.style.transform = `translate(${rp.x - r.r}px, ${rp.y - r.r}px)`;
  });

  return cursor;
}
