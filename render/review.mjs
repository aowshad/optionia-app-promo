// Full-film review: one still per beat, tiled into sheets of 30 (dist/review/pN.png).
//   node render/review.mjs
import { spawnSync } from "node:child_process";
import { BEAT, BARS } from "../src/tokens.js";

const beats = BARS * 4, per = 30;
for (let p = 0; p * per < beats; p++) {
  const times = [];
  for (let i = p * per; i < Math.min(beats, (p + 1) * per); i++) times.push(((i + 0.5) * BEAT).toFixed(3));
  const r = spawnSync("node", ["render/stills.mjs", ...times, "--cols", "6", "--out", `dist/review/p${p}`], { stdio: "inherit" });
  if (r.status) process.exit(r.status);
}
