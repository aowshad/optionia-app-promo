// Boot: wait for fonts + images, build the film, expose the deterministic seek API.
import { BAR, BEAT, STAGE } from "./tokens.js";
import { buildFilm } from "./timeline.js";

const params = new URLSearchParams(location.search);
const MODE = params.has("render") ? "render" : "play";
document.body.classList.add(MODE);

const stage = document.getElementById("stage");
function fit() {
  const hud = MODE === "play" ? 56 : 0;
  const s = MODE === "render"
    ? innerWidth / STAGE.w
    : Math.min(innerWidth / STAGE.w, (innerHeight - hud) / STAGE.h);
  const x = MODE === "render" ? 0 : (innerWidth - STAGE.w * s) / 2;
  const y = MODE === "render" ? 0 : (innerHeight - hud - STAGE.h * s) / 2;
  stage.style.transform = `translate(${x}px, ${y}px) scale(${s})`;
}
addEventListener("resize", fit);
fit();

// Fonts must be in before the build: scenes measure laid-out text.
async function loadFonts() {
  await document.fonts.load('600 100px "Instrument Sans"');
  await document.fonts.load('400 16px "Inter"');
  await document.fonts.load('600 16px "Inter"');
  await document.fonts.ready;
}

// Logo files are used as-is; scenes restructure them for the build-on.
// (The standalone dist build inlines them as window.__INLINE_SVGS, since file:// can't fetch.)
async function loadSvgs() {
  if (window.__INLINE_SVGS) return window.__INLINE_SVGS;
  const get = (u) => fetch(u).then((r) => r.text());
  const [icon, wordmark] = await Promise.all([get("assets/logo/Icon.svg"), get("assets/logo/Text.svg")]);
  return { icon, wordmark };
}

async function decodeImages() {
  const imgs = [...document.images];
  await Promise.all(imgs.map((img) => (img.complete ? img.decode().catch(() => {}) : new Promise((r) => {
    img.onload = () => img.decode().then(r, r);
    img.onerror = r;
  }))));
}

window.__ready = (async () => {
  await loadFonts();
  const assets = await loadSvgs();
  const film = buildFilm(assets);
  await decodeImages();
  film.seek(0);

  window.__duration = film.duration;
  window.__tl = film.tl;
  window.__events = film.events;
  window.__seek = (t) => {
    film.seek(Math.max(0, Math.min(t, film.duration)));
    if (MODE === "render") {
      // Drop every raster tile so the frame is painted from scratch: Chrome otherwise
      // re-rasters only dirty regions, making AA/dither depend on the previous frame.
      stage.style.display = "none";
      void stage.offsetHeight;
      stage.style.display = "";
    }
  };
  window.__fontsOk = document.fonts.check('600 100px "Instrument Sans"') && document.fonts.check('400 16px "Inter"');

  if (MODE === "play") hud(film);
  return true;
})();

function hud(film) {
  const scrub = document.getElementById("scrub");
  const btn = document.getElementById("play");
  const tc = document.getElementById("tc");
  scrub.max = film.duration;
  let t = +(params.get("t") || 0), playing = params.has("play") && params.get("play") !== "0", last = 0;

  // Soundtrack: while playing, the audio clock drives the picture so the two can't drift.
  const audio = new Audio(window.__AUDIO_URL || "assets/audio/soundtrack.m4a");
  audio.preload = "auto";
  let audioOk = false;
  const syncAudio = () => {
    if (!playing) { audio.pause(); return; }
    audio.currentTime = t;
    audio.play().then(() => (audioOk = true), () => (audioOk = false));
  };

  const show = () => {
    film.seek(t);
    scrub.value = t;
    const bar = Math.floor(t / BAR) + 1, beat = Math.floor((t % BAR) / BEAT) + 1;
    tc.textContent = `${t.toFixed(2)}s / ${film.duration.toFixed(0)}s · bar ${bar}.${beat}`;
    btn.textContent = playing ? "❚❚" : "▶";
  };
  const loop = (now) => {
    if (playing) {
      t = audioOk && !audio.paused ? audio.currentTime : t + Math.min(0.1, (now - last) / 1000);
      if (t >= film.duration) { t = 0; syncAudio(); }
      show();
    }
    last = now;
    requestAnimationFrame(loop);
  };
  const toggle = () => { playing = !playing; syncAudio(); show(); };
  btn.onclick = toggle;
  scrub.oninput = () => { t = +scrub.value; if (playing) syncAudio(); show(); };
  addEventListener("keydown", (e) => {
    if (e.code === "Space") { e.preventDefault(); toggle(); }
    if (e.code === "ArrowRight") { t = Math.min(film.duration, t + BEAT); if (playing) syncAudio(); show(); }
    if (e.code === "ArrowLeft") { t = Math.max(0, t - BEAT); if (playing) syncAudio(); show(); }
  });
  if (playing) syncAudio();
  show();
  requestAnimationFrame((n) => { last = n; loop(n); });
}
