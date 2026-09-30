// The glowing "+" orb — the film's heartbeat.
// Geometry lives on a time track {x, y, d, o}; sized (not scaled) every frame so it stays crisp.
import { BEAT, DUR, EASE } from "../tokens.js";
import { track, driver, sfx } from "../clock.js";
import { arcInterp } from "../cursor.js";
import { h } from "./basics.js";

export function createOrb(world, { x = 0, y = 0, d = 0 } = {}) {
  const el = h("div", "orb", `<div class="orb-core"><i class="orb-h"></i><i class="orb-v"></i></div>`);
  const ring = h("div", "orb-ring");
  world.append(ring, el);

  const tr = track({ x, y, d, o: 0 });
  const pulseTr = track({ k: 0 });
  const ringKeys = [];

  const orb = {
    track: tr,
    set(t, v) { tr.set(t, v); return orb; },
    /** Fly along an arc, resizing on the way (DUR.move). */
    fly(t0, to, { bend = -0.18, dur = DUR.move } = {}) {
      tr.to(t0, to, { dur, ease: EASE.move, interp: arcInterp(bend) });
      return orb;
    },
    to(t0, v, opts) { tr.to(t0, v, opts); return orb; },
    /** One heartbeat: quick swell, slow settle, and a glow ring that expands out. */
    pulse(t) {
      pulseTr.set(t, { k: 0 });
      pulseTr.to(t, { k: 1 }, { dur: BEAT / 4, ease: EASE.in });
      pulseTr.to(t + BEAT / 4, { k: 0 }, { dur: DUR.in, ease: EASE.move });
      ringKeys.push({ t0: t, t1: t + DUR.move });
      sfx(t, "pulse");
      return orb;
    },
  };

  const expo = window.gsap.parseEase(EASE.in);

  driver((t) => {
    const v = tr.at(t);
    const k = pulseTr.at(t).k;
    // Heartbeat glow: breathes on the global 2-bar cycle, swells on a pulse.
    const breath = 0.5 - 0.5 * Math.cos((t / DUR.breath) * Math.PI * 2);
    const d = v.d * (1 + 0.12 * k);
    el.style.opacity = v.o;
    el.style.width = el.style.height = `${d}px`;
    el.style.transform = `translate(${v.x - d / 2}px, ${v.y - d / 2}px)`;
    el.style.setProperty("--glow", (0.75 + 0.25 * breath + 0.5 * k).toFixed(4));
    el.style.borderWidth = `${Math.max(1, d * 0.035)}px`;

    let rp = 0;
    for (const r of ringKeys) if (t >= r.t0 && t < r.t1) rp = expo((t - r.t0) / (r.t1 - r.t0));
    const rd = v.d * (1 + 1.4 * rp);
    ring.style.opacity = rp > 0 ? (0.55 * (1 - rp)).toFixed(4) : 0;
    ring.style.width = ring.style.height = `${rd}px`;
    ring.style.transform = `translate(${v.x - rd / 2}px, ${v.y - rd / 2}px)`;
  });

  return orb;
}
