// Rasterise assets/art/artwork.svg → artwork.png (transparent), with the film's fonts.
//   node render/make-artwork.mjs
import { chromium } from "playwright";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const svg = readFileSync("assets/art/artwork.svg", "utf8");
const font = (f) => `data:font/woff2;base64,${readFileSync(resolve("assets/fonts", f)).toString("base64")}`;
const html = `<!doctype html><style>
  @font-face { font-family: "Instrument Sans"; src: url(${font("InstrumentSans-Variable.woff2")}); font-weight: 400 700; }
  html, body { margin: 0; background: transparent; }
</style>${svg}`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1000, height: 1000 } });
await page.setContent(html);
await page.evaluate(() => document.fonts.ready);
writeFileSync("assets/art/artwork.png", await page.screenshot({ omitBackground: true }));
// Right-sized copies for small placements (thumbnails 160, hoodie print 320).
for (const s of [160, 320]) {
  await page.setViewportSize({ width: s, height: s });
  await page.evaluate((s) => { const svg = document.querySelector("svg"); svg.setAttribute("width", s); svg.setAttribute("height", s); }, s);
  writeFileSync(`assets/art/artwork_${s}.png`, await page.screenshot({ omitBackground: true }));
}
await browser.close();
console.log("assets/art/artwork{,_160,_320}.png");
