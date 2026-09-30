// Master timeline: created paused, built from scene functions, seeked frame-by-frame.
import { BAR } from "./tokens.js";
import { runDrivers, getEvents } from "./clock.js";
import { createCamera } from "./camera.js";
import { createCursor } from "./cursor.js";
import { createSelection } from "./components/selection.js";
import { installAmbient, installGrid } from "./motion.js";

import * as s1 from "./scenes/s1_cold_open.js";
import * as s2 from "./scenes/s2_logo.js";
import * as words from "./scenes/s2b_words.js";
import * as s3 from "./scenes/s3_hook.js";
import * as s4 from "./scenes/s4_options.js";
import * as s5 from "./scenes/s5_style.js";
import * as s6 from "./scenes/s6_themes.js";
import * as s7 from "./scenes/s7_revenue.js";
import * as s8 from "./scenes/s8_orders.js";
import * as s9 from "./scenes/s9_end.js";

// Scenes in film order. Each exports build(ctx, startTime) → end time.
// Scenes hand shared elements to the next through ctx.shared.
const SCENES = [s1, s2, words, s3, s4, s5, s6, s7, s8, s9];

export function buildFilm(assets) {
  const gsap = window.gsap;
  const $ = (s) => document.querySelector(s);
  const world = $("#world"), overlay = $("#overlay");

  // 2D transforms only: 3D promotes elements to GPU layers whose raster scale depends
  // on seek history (non-deterministic pixels) and blurs text under camera zoom.
  gsap.config({ force3D: false });
  const tl = gsap.timeline({ paused: true });
  const camera = createCamera(world);
  installAmbient({ root: $("#root"), glowA: $("#bg .glow.a"), glowB: $("#bg .glow.b") });
  installGrid($("#grid"), camera);
  const cursor = createCursor(overlay, camera, { x: 2400, y: 1500 });
  const sel = createSelection(overlay, camera);

  const ctx = { tl, world, overlay, camera, cursor, sel, assets, shared: {} };
  let t = 0;
  for (const scene of SCENES) t = scene.build(ctx, t);

  // Duration is always a whole number of bars.
  const duration = Math.ceil(t / BAR - 1e-6) * BAR;
  tl.set({}, {}, duration);

  // Initialise every tween in order so any seek order gives the same frame.
  tl.progress(1, true).progress(0, true);

  const seek = (time) => {
    tl.seek(time, false);
    runDrivers(time);
  };
  seek(0);
  return { tl, duration, seek, events: getEvents() };
}
