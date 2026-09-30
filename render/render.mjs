// Frame-by-frame capture → ffmpeg.
//   npm run render                 60fps 1920×1080 → dist/optionia-promo.mp4 (+ _silent)
//   npm run render:draft           30fps  960×540  → dist/draft.mp4
//   options: --fps N --width N --from S --to S --out path --silent
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import ffmpegPath from "ffmpeg-static";
import { openFilm } from "./browser.mjs";

const argv = process.argv.slice(2);
const flag = (k) => argv.includes(`--${k}`);
const opt = (k, d) => { const i = argv.indexOf(`--${k}`); return i >= 0 ? argv[i + 1] : d; };

const draft = flag("draft");
const fps = +opt("fps", draft ? 30 : 60);
const width = +opt("width", draft ? 960 : 1920);
const height = Math.round(width * 9 / 16);
const out = resolve(opt("out", draft ? "dist/draft.mp4" : "dist/optionia-promo.mp4"));
const mix = resolve("dist/mix.wav");
const withAudio = !flag("silent") && existsSync(mix);

mkdirSync("dist", { recursive: true });
const film = await openFilm({ width, height });
const from = +opt("from", 0);
const to = Math.min(+opt("to", film.info.duration), film.info.duration);
writeFileSync("dist/events.json", JSON.stringify(film.info.events, null, 2));

const frames = Math.ceil((to - from) * fps);
console.log(`Rendering ${frames} frames @ ${fps}fps ${width}×${height}, ${from}s → ${to}s → ${out}${withAudio ? " (+audio)" : ""}`);

const video = ["-c:v", "libx264", "-preset", draft ? "medium" : "slow", "-crf", draft ? "18" : "14", "-pix_fmt", "yuv420p", "-movflags", "+faststart"];
const audio = withAudio ? ["-ss", String(from), "-i", mix, "-c:a", "aac", "-b:a", "320k", "-shortest"] : [];
const ff = spawn(ffmpegPath, ["-y", "-loglevel", "error", "-f", "image2pipe", "-framerate", String(fps), "-i", "-", ...audio, ...video, out],
  { stdio: ["pipe", "inherit", "inherit"] });
const done = new Promise((ok, fail) => ff.on("close", (c) => (c === 0 ? ok() : fail(new Error(`ffmpeg exited ${c}`)))));

const started = Date.now();
for (let f = 0; f < frames; f++) {
  await film.seek(from + f / fps);
  const buf = await film.shot("png");
  if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once("drain", r));
  if (f % fps === 0 || f === frames - 1) {
    const el = (Date.now() - started) / 1000;
    process.stdout.write(`\r  frame ${f + 1}/${frames}  ${(el / (f + 1) * 1000).toFixed(0)}ms/frame  eta ${((frames - f - 1) * el / (f + 1)).toFixed(0)}s   `);
  }
}
ff.stdin.end();
await done;
await film.close();
console.log(`\nDone in ${((Date.now() - started) / 1000).toFixed(1)}s → ${out}`);

// Final render also produces the silent version.
if (!draft && withAudio && !opt("out")) {
  const silent = out.replace(/\.mp4$/, "_silent.mp4");
  await new Promise((ok, fail) => spawn(ffmpegPath, ["-y", "-loglevel", "error", "-i", out, "-an", "-c:v", "copy", silent], { stdio: "inherit" })
    .on("close", (c) => (c === 0 ? ok() : fail(new Error("ffmpeg silent copy failed")))));
  console.log(`Silent → ${silent}`);
}
