// Single source of truth for rhythm, easing and color.
// Never hard-code a duration or ease anywhere else — derive it from here.

export const BPM = 80;
export const BEAT = 60 / BPM;        // 0.75s
export const BAR = BEAT * 4;         // 3.0s

export const DUR = {
  in: BEAT,                          // 0.75s   every entrance
  out: BEAT * 0.75,                  // 0.5625s every exit
  move: BEAT * 2,                    // 1.5s    camera moves, morphs, layout shifts
  hold: BEAT * 2,                    // minimum time anything rests fully visible
  press: BEAT / 8,                   // cursor press-down
  release: BEAT / 4,                 // cursor release
  glide: BEAT * 3,                   // slow camera pull-back under a hold
  hop: BEAT,                         // cursor hop between neighbouring controls in one panel
  nudge: BEAT / 2,                   // cursor nudge inside one control (menu item, calendar day)
  track: BEAT * 1.5,                 // short camera track after a settle (S6 → S7 landing)
  breath: BAR * 2,                   // one full breath cycle
};

export const STAGGER = BEAT / 8;     // 0.09375s between siblings

export const EASE = {
  in: "expo.out",                    // entrances
  move: "power3.inOut",              // camera + morphs
  out: "power2.in",                  // exits
  // Ambient only (breath, bob, drift). Not for choreographed motion.
  breath: "sine.inOut",
  drift: "none",
};

// Film length in bars: storyboard 21 + 2 (kinetic sentence) + 2 (S4: every activation is a real click)
// + 2 (S4: the 16-type grid lives for two bars) + 1 (S5: drags + CSS typing) + 1 (S6: a click per theme)
// + 1 (S9: full hold, then a breath-only bar).
export const BARS = 30;
export const FILM = BARS * BAR;

// First bar of each scene (1-based). Scenes time themselves relative to these,
// so inserting bars upstream shifts everything downstream automatically.
export const SCENE = { s1: 1, s2: 2, words: 4, s3: 6, s4: 8, s5: 16, s6: 20, s7: 24, s8: 26, s9: 28 };

/**
 * Musical time → seconds.
 * `bar` is 1-based (matches the storyboard: bar 1 starts at 0:00).
 * `beat` is a 0-based offset within the bar (fractions allowed):
 *   at(1)      → 0.00  (downbeat of bar 1)
 *   at(1, 2)   → 1.50  (musical "beat 3" of bar 1)
 *   at(2, 0.5) → 3.375 (the "and" after beat 1 of bar 2)
 */
export const at = (bar, beat = 0) => (bar - 1) * BAR + beat * BEAT;

/** Scene-relative clock: `b(0)` is the scene's first downbeat, `b(1, 2)` beat 3 of its 2nd bar. */
export const sceneAt = (startBar) => (n, beat = 0) => at(startBar + n, beat);

// Ambient motion amplitudes (px / scale), all cycled on DUR.breath.
export const AMBIENT = {
  breathScale: 0.012,                // camera root 1.000 → 1.012 → 1.000
  drift: 6,                          // camera root ±6px
  bob: 4,                            // floating cards ±4px
  chipLoopBars: 16,                  // S3 chip bar: one full scroll loop every 16 bars
};

export const STAGE = { w: 1920, h: 1080 };

export const COLOR = {
  bg0: "#FFFFFF",
  bg1: "#F6F0FF",
  bg2: "#F1E9FF",
  gradA: "#F197FE",
  gradB: "#8838E0",
  gradC: "#5F12D4",
  ink: "#07004F",
  ink2: "#1B1F3B",
  ink3: "#1F2937",
  muted: "#6B7280",
  muted2: "#9CA3AF",
  accent: "#6366F1",
  accent2: "#9B4AE6",
  cursor: "#0259FE",
  line: "#E5E7EB",
  swatches: ["#EF4444", "#F59E0B", "#EC4899", "#10B981", "#3B82F6", "#8B5CF6"],
};
