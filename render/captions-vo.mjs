// Captioned copy of the voice-over film: each cue from dist/audio/vo_cues.json is drawn once as a
// transparent pill (Inter, same as the film) and overlaid with ffmpeg; picture and audio come from
// dist/optionia-promo_vo.mp4.  → dist/optionia-promo_vo_captioned.mp4
import { readFileSync, mkdirSync, rmSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { chromium } from "playwright";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

const cues = JSON.parse(readFileSync("dist/audio/vo_cues.json", "utf8"));
const END_CARD = 83.0;          // from here the footer sits at the bottom, so captions move up
const Y = (c) => (c.t0 >= END_CARD ? 880 : 1010);   // pill centre (px)
const FADE = 0.15;
const DIR = "dist/captions";
rmSync(DIR, { recursive: true, force: true });
mkdirSync(DIR, { recursive: true });

const font = pathToFileURL(resolve("assets/fonts/Inter-Variable.woff2")).href;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 400 }, deviceScaleFactor: 1 });
await page.setContent(`<!doctype html><html><head><style>
  @font-face { font-family: "Inter"; src: url("${font}") format("woff2"); font-weight: 100 900; }
  html, body { margin: 0; background: transparent; }
  #wrap { padding: 30px 40px 40px; display: inline-block; }
  #pill { font: 500 30px/1.35 "Inter", sans-serif; color: #2E1065; letter-spacing: -0.1px;
    background: rgba(255,255,255,0.9); border: 1px solid rgba(136,56,224,0.16); border-radius: 999px;
    padding: 12px 28px; max-width: 1400px; text-align: center;
    box-shadow: 0 12px 30px -14px rgba(95,18,212,0.38), 0 1px 2px rgba(46,16,101,0.06); }
</style></head><body><div id="wrap"><div id="pill"></div></div></body></html>`);
await page.evaluate(() => document.fonts.ready);

const inputs = [], filters = [];
let last = "0:v";
for (const [i, c] of cues.entries()) {
  await page.$eval("#pill", (el, t) => { el.textContent = t; }, c.text);
  const wrap = page.locator("#wrap");
  const box = await wrap.boundingBox();
  const file = `${DIR}/${String(i).padStart(2, "0")}.png`;
  await wrap.screenshot({ path: file, omitBackground: true });
  const w = Math.round(box.width), h = Math.round(box.height);
  const x = Math.round((1920 - w) / 2), y = Math.round(Y(c) - (30 + (h - 70) / 2)); // pill centre on Y (wrap padding 30 top / 40 bottom)
  inputs.push("-loop", "1", "-framerate", "60", "-t", (c.t1 + 0.2).toFixed(3), "-i", file);
  const s = `${i + 1}:v`;
  filters.push(
    `[${s}]format=rgba,fade=t=in:st=${c.t0.toFixed(3)}:d=${FADE}:alpha=1,fade=t=out:st=${(c.t1 - FADE).toFixed(3)}:d=${FADE}:alpha=1[c${i}]`,
    `[${last}][c${i}]overlay=x=${x}:y=${y}:enable='between(t,${c.t0.toFixed(3)},${c.t1.toFixed(3)})':eof_action=pass[v${i}]`,
  );
  last = `v${i}`;
}
await browser.close();

const r = spawnSync("ffmpeg", [
  "-hide_banner", "-loglevel", "error", "-y",
  "-i", "dist/optionia-promo_vo.mp4", ...inputs,
  "-filter_complex", filters.join(";"),
  "-map", `[${last}]`, "-map", "0:a",
  "-c:v", "libx264", "-preset", "slow", "-crf", "14", "-pix_fmt", "yuv420p", "-r", "60",
  "-c:a", "copy", "-movflags", "+faststart", "-t", "90",
  "dist/optionia-promo_vo_captioned.mp4",
], { stdio: ["ignore", "inherit", "inherit"] });
if (r.status !== 0) process.exit(r.status);
console.log(`dist/optionia-promo_vo_captioned.mp4 (${cues.length} captions)`);
