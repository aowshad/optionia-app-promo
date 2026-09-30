// Proves seek is deterministic: the same time renders the same pixels,
// across separate browser sessions AND regardless of seek order.
//   node render/check-determinism.mjs [--fps 60] [--from 0] [--to 6]
import { createHash } from "node:crypto";
import { openFilm } from "./browser.mjs";

const argv = process.argv.slice(2);
const opt = (k, d) => { const i = argv.indexOf(`--${k}`); return i >= 0 ? +argv[i + 1] : d; };
const fps = opt("fps", 60), width = opt("width", 960);
const sha = (b) => createHash("sha256").update(b).digest("hex").slice(0, 16);

async function pass(order, label) {
  const film = await openFilm({ width, height: Math.round(width * 9 / 16) });
  const to = Math.min(opt("to", film.info.duration), film.info.duration), from = opt("from", 0);
  const frames = [...Array(Math.ceil(to * fps)).keys()].filter((f) => f >= Math.floor(from * fps));
  const seq = order === "shuffled" ? shuffle(frames) : frames;
  const hashes = new Map();
  for (const f of seq) { await film.seek(f / fps); hashes.set(f, sha(await film.shot())); }
  await film.close();
  console.log(`  ${label}: ${hashes.size} frames (${order})`);
  return hashes;
}

// Deterministic shuffle (seeded LCG) so the check itself is reproducible.
function shuffle(a) {
  a = [...a]; let s = 1234567;
  for (let i = a.length - 1; i > 0; i--) { s = (s * 1103515245 + 12345) % 2 ** 31; const j = s % (i + 1); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

console.log("Determinism check:");
const A = await pass("sequential", "session A");
const B = await pass("sequential", "session B");
const C = await pass("shuffled", "session C");
let ab = 0, ac = 0;
for (const [f, h] of A) { if (B.get(f) !== h) ab++; if (C.get(f) !== h) ac++; }
const unique = new Set(A.values()).size;
const list = (M) => [...A].filter(([f, h]) => M.get(f) !== h).map(([f]) => +(f / fps).toFixed(2));
const ranges = (ts) => ts.reduce((r, t) => { const l = r.at(-1); if (l && t - l[1] <= 2 / fps + 1e-6) l[1] = t; else r.push([t, t]); return r; }, []).map(([a, b]) => a === b ? `${a}` : `${a}–${b}`).join(", ");
console.log(`  A vs B (fresh session):   ${ab === 0 ? "IDENTICAL" : ab + " frames differ"}`);
if (ab) console.log(`    at ${ranges(list(B))}`);
console.log(`  A vs C (shuffled seeks):  ${ac === 0 ? "IDENTICAL" : ac + " frames differ"}`);
if (ac) console.log(`    at ${ranges(list(C))}`);
console.log(`  distinct frames in A: ${unique}/${A.size} (static frames are expected only where nothing moves)`);
process.exit(ab || ac ? 1 : 0);
