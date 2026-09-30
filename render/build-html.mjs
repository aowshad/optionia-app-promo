// Standalone preview: dist/optionia-promo.html opens straight from disk (file://).
// The film is bundled into one inline script; fonts, logo SVGs and CSS are inlined; images and
// the soundtrack sit beside it in dist/assets/.   node render/build-html.mjs
import { build } from "esbuild";
import { readFileSync, writeFileSync, mkdirSync, cpSync, existsSync } from "node:fs";

mkdirSync("dist/assets/audio", { recursive: true });
const js = (await build({ entryPoints: ["src/main.js"], bundle: true, format: "iife", minify: true, write: false, target: "es2020" })).outputFiles[0].text;
const b64 = (f) => readFileSync(f).toString("base64");
const css = readFileSync("src/styles.css", "utf8")
  .replace('url("../assets/fonts/InstrumentSans-Variable.woff2")', `url(data:font/woff2;base64,${b64("assets/fonts/InstrumentSans-Variable.woff2")})`)
  .replace('url("../assets/fonts/Inter-Variable.woff2")', `url(data:font/woff2;base64,${b64("assets/fonts/Inter-Variable.woff2")})`);
const svgs = { icon: readFileSync("assets/logo/Icon.svg", "utf8"), wordmark: readFileSync("assets/logo/Text.svg", "utf8") };

for (const d of ["products", "art", "badges", "audio"]) if (existsSync(`assets/${d}`)) cpSync(`assets/${d}`, `dist/assets/${d}`, { recursive: true });

const esc = (s) => s.replace(/<\/script/gi, "<\\/script");
const page = readFileSync("index.html", "utf8")
  .replace('<link rel="stylesheet" href="src/styles.css" />', `<style>${css}</style>`)
  .replace('<script src="src/vendor/gsap.min.js"></script>', `<script>${esc(readFileSync("src/vendor/gsap.min.js", "utf8"))}</script>`)
  .replace('<script type="module" src="src/main.js"></script>',
    `<script>window.__INLINE_SVGS=${esc(JSON.stringify(svgs))};window.__AUDIO_URL="assets/audio/soundtrack.m4a";</script>\n  <script>${esc(js)}</script>`);
writeFileSync("dist/optionia-promo.html", page);
console.log(`dist/optionia-promo.html (${(page.length / 1024).toFixed(0)} KB) + dist/assets/`);
