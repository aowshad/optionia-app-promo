// Grab stills at given times and tile them into a contact sheet.
//   node render/stills.mjs 0.5 3.2 9.8 …   [--out dist/stills] [--cols 4]
import { mkdirSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import ffmpegPath from "ffmpeg-static";
import { openFilm } from "./browser.mjs";

const argv = process.argv.slice(2);
const opt = (k, d) => { const i = argv.indexOf(`--${k}`); return i >= 0 ? argv.splice(i, 2)[1] : d; };
const out = opt("out", "dist/stills");
const cols = +opt("cols", 4);
const times = argv.map(Number).filter((n) => !Number.isNaN(n));
mkdirSync(out, { recursive: true });

const film = await openFilm({ width: 1920, height: 1080 });
const files = [];
for (const t of times) {
  await film.seek(t);
  const f = `${out}/t${t.toFixed(2).padStart(6, "0")}.png`;
  writeFileSync(f, await film.shot());
  files.push(f);
}
await film.close();

// Contact sheet: 480×270 cells with the timestamp burned in.
const rows = Math.ceil(files.length / cols);
const inputs = files.flatMap((f) => ["-i", f]);
const cells = files.map((_, i) =>
  `[${i}]scale=480:270,drawbox=x=0:y=0:w=86:h=26:color=black@0.55:t=fill,drawtext=text='${times[i].toFixed(2)}s':x=8:y=6:fontsize=16:fontcolor=white[c${i}]`);
const pad = Array.from({ length: rows * cols - files.length }, (_, i) => `color=c=0x0d0a1f:s=480x270:d=1[p${i}]`);
const all = [...files.map((_, i) => `[c${i}]`), ...pad.map((_, i) => `[p${i}]`)].join("");
const layout = Array.from({ length: rows * cols }, (_, i) => `${(i % cols) * 480}_${Math.floor(i / cols) * 270}`).join("|");
const graph = [...cells, ...pad, `${all}xstack=inputs=${rows * cols}:layout=${layout}`].join(";");
const r = spawnSync(ffmpegPath, ["-y", "-loglevel", "error", ...inputs, "-filter_complex", graph, "-frames:v", "1", `${out}/sheet.png`]);
if (r.status !== 0) console.error(r.stderr.toString());
console.log(`${files.length} stills → ${out}/ (sheet.png)`);
