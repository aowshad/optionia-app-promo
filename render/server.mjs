// Tiny static server for preview (npm run dev) and for the renderer.
import http from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const TYPES = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".mjs": "text/javascript",
  ".css": "text/css", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg",
  ".woff2": "font/woff2", ".json": "application/json", ".wav": "audio/wav", ".mp3": "audio/mpeg", ".m4a": "audio/mp4",
  ".mp4": "video/mp4",
};

export function startServer(port = 0) {
  const server = http.createServer(async (req, res) => {
    try {
      let p = decodeURIComponent(new URL(req.url, "http://x").pathname);
      if (p.endsWith("/")) p += "index.html";
      const file = normalize(join(ROOT, p));
      if (!file.startsWith(ROOT)) throw new Error("forbidden");
      await stat(file);
      res.writeHead(200, { "content-type": TYPES[extname(file)] || "application/octet-stream", "cache-control": "no-store" });
      res.end(await readFile(file));
    } catch {
      res.writeHead(404).end("not found");
    }
  });
  return new Promise((ok) => server.listen(port, "127.0.0.1", () => ok({ server, port: server.address().port })));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const port = +(process.env.PORT || 5178);
  const { port: p } = await startServer(port);
  console.log(`Optionia promo preview → http://localhost:${p}/index.html?play`);
  console.log(`Scrub: drag the bar · space = play/pause · ←/→ = one beat`);
}
