// The virtual camera over the infinite canvas.
// State {x, y, z}: world point at screen centre, and zoom as log2(scale) so
// zooms feel perceptually even. Evaluated analytically from a track.
import { DUR, EASE, STAGE } from "./tokens.js";
import { track, driver, sfx } from "./clock.js";

export function createCamera(worldEl, { x = STAGE.w / 2, y = STAGE.h / 2, scale = 1 } = {}) {
  const tr = track({ x, y, z: Math.log2(scale) });
  let now = { x, y, z: Math.log2(scale), s: scale };

  const cam = {
    track: tr,
    get state() { return now; },

    /** Glide to a world point / zoom. Starts at `t0` (seconds). */
    moveTo(t0, { x, y, scale }, { dur = DUR.move, ease = EASE.move, whoosh = true } = {}) {
      const v = {};
      if (x !== undefined) v.x = x;
      if (y !== undefined) v.y = y;
      if (scale !== undefined) v.z = Math.log2(scale);
      tr.to(t0, v, { dur, ease });
      if (whoosh && dur > 0) sfx(t0, "whoosh", { dur });
      return cam;
    },

    /** Frame a world rect {x, y, w, h} with padding (fraction of stage). */
    frame(t0, rect, { pad = 0.12, ...opts } = {}) {
      const s = Math.min(STAGE.w * (1 - pad * 2) / rect.w, STAGE.h * (1 - pad * 2) / rect.h);
      return cam.moveTo(t0, { x: rect.x + rect.w / 2, y: rect.y + rect.h / 2, scale: s }, opts);
    },

    set(t0, values) { return cam.moveTo(t0, values, { dur: 0, whoosh: false }); },

    at(t) {
      const v = tr.at(t);
      return { x: v.x, y: v.y, z: v.z, s: 2 ** v.z };
    },

    /** World → screen (stage px) at time t (defaults to the last rendered time). */
    project(wx, wy, t) {
      const c = t === undefined ? now : cam.at(t);
      return { x: (wx - c.x) * c.s + STAGE.w / 2, y: (wy - c.y) * c.s + STAGE.h / 2, s: c.s };
    },
  };

  driver((t) => {
    now = cam.at(t);
    worldEl.style.transform =
      `translate(${STAGE.w / 2}px, ${STAGE.h / 2}px) scale(${now.s}) translate(${-now.x}px, ${-now.y}px)`;
  });

  return cam;
}
