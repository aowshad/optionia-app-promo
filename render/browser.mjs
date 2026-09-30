// Shared headless-Chromium setup for render + determinism checks.
import { chromium } from "playwright";
import { startServer } from "./server.mjs";

export async function openFilm({ width = 1920, height = 1080 } = {}) {
  const { server, port } = await startServer(0);
  const browser = await chromium.launch({
    args: ["--force-color-profile=srgb", "--font-render-hinting=none", "--disable-lcd-text", "--hide-scrollbars",
      ...(process.env.CHROME_ARGS ? process.env.CHROME_ARGS.split(" ") : [])],
  });
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  await page.goto(`http://127.0.0.1:${port}/index.html?render`, { waitUntil: "load" });
  await page.evaluate(() => window.__ready);
  if (errors.length) throw new Error("Page errors:\n" + errors.join("\n"));
  const info = await page.evaluate(() => ({ duration: window.__duration, fontsOk: window.__fontsOk, events: window.__events }));
  if (!info.fontsOk) throw new Error("Fonts not loaded — refusing to render with fallbacks.");

  const seek = (t) => page.evaluate((t) => window.__seek(t), t);
  const shot = (type = "png") => page.screenshot({ type, quality: type === "jpeg" ? 92 : undefined, caret: "hide" });
  const close = async () => { await browser.close(); server.close(); };
  return { page, info, seek, shot, close };
}
