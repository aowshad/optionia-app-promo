# Optionia — promo film

A ~90-second, 1920×1080, 60 fps product film for Optionia, built as one deterministic GSAP
timeline on an infinite canvas and rendered frame-by-frame to MP4.

- **Live preview (plays in the browser, with sound):** https://aowshad.github.io/optionia-app-promo/
- **Final video:** [Releases → v1.0](https://github.com/aowshad/optionia-app-promo/releases/tag/v1.0) — `optionia-promo.mp4` (with sound) and `optionia-promo_silent.mp4`

To render it yourself: `npm install`, `npm run audio`, then `npm run render`.

## Commands

| | |
|---|---|
| `npm run dev` | Preview server → `http://localhost:5178/index.html?play` (space = play/pause, ←/→ = one beat, drag to scrub; soundtrack plays in sync) |
| `npm run audio` | Procedural score + SFX from the timeline's event list → `dist/mix.wav` (+ `assets/audio/soundtrack.m4a` for the web preview) |
| `npm run render` | Final 60 fps 1080p → `dist/optionia-promo.mp4` (+ `_silent.mp4`) |
| `npm run render:draft` | 30 fps 960×540 → `dist/draft.mp4` |
| `npm run build:html` | Standalone preview → `dist/optionia-promo.html` (opens from disk; assets in `dist/assets/`) |
| `npm run stills 12.5 40 …` | Stills at given times + contact sheet → `dist/stills/` |
| `npm run review` | One still per beat for the whole film → `dist/review/p*/sheet.png` |
| `npm run audit` | Fails if two tweens animate the same property of the same element at the same time |
| `npm run check:determinism` | Renders every frame in 3 sessions (sequential ×2, shuffled) and compares pixels |

Render options: `--fps N --width N --from S --to S --out path --silent`.

## Voice-over version (v1.1)

Same picture, with a narrated mix. Lines, timings and the voice live in `vo/script.json`; the generated
lines (and their word timings) are committed in `assets/audio/vo/`, so re-mixing needs no API key.

| | |
|---|---|
| `npm run vo` | Generate missing lines with ElevenLabs (`ELEVENLABS_API_KEY` in the environment or `.env.local`, never committed). `node render/voiceover.mjs gen 04 --speed 1.05` regenerates one line faster; `… stt 02` transcribes a line to check pronunciation |
| `npm run stems` | Music and SFX stems before the final limiter → `dist/audio/music_pre.wav`, `sfx_pre.wav` |
| `npm run mix:vo` | Places every line on its event (`--plan` prints the timing report), ducks the score and remuxes → `dist/optionia-promo_vo.mp4`, `.srt`, stems in `dist/audio/` |
| `npm run captions:vo` | Burned-in captions → `dist/optionia-promo_vo_captioned.mp4` |

- Voice: Matilda, `eleven_v3`, one seed and one set of settings for every line (v3 has no request stitching).
  Lines that would end within 0.5 s of their next event are sped up 1.05× with ffmpeg `atempo` (v3 ignores `speed`).
- Line 04 is cut at word boundaries and each phrase lands on its option's `build` event (±¼ beat).
- VO chain: high-pass 80 Hz → 2:1 compression → de-ess → 48 kHz. Music ducks 7 dB and SFX 2 dB under speech
  (150 ms attack with matching look-ahead, 400 ms release). Final mix −14 LUFS, true peak ≤ −1 dBTP.

## How it's built

- `src/tokens.js` — the single source of truth: BPM 80, `DUR`, `EASE`, `STAGGER`, `SCENE` start bars,
  colours. Change `BPM` and every duration re-derives.
- `src/timeline.js` builds the paused master timeline from `src/scenes/*` in film order; each scene
  times itself from its `SCENE` bar, so inserting bars upstream shifts everything after it.
- **Everything is a function of timeline time.** Camera, cursor, selection frame, orb, option-set
  theme tokens, typing, carets and counters are analytic tracks (`src/clock.js`) evaluated by
  drivers after every seek; GSAP handles element tweens. No rAF/Date-driven animation.
- One writer per property: e.g. the S5/S6 option set's `--os-*` tokens come only from its token
  track (sliders, colour picker and all ten themes key it). `npm run audit` guards this.
- Render mode drops every raster tile per frame (Chrome otherwise re-rasters only dirty regions),
  GSAP runs with `force3D: false`, and small placements use right-sized images — together these
  make any frame pixel-identical regardless of seek order.

## Assets

`assets/logo`, `assets/products` (+ `sm/` 256px copies for small placements), `assets/badges` are
the supplied files. `assets/art/artwork.svg` is the generated customer print (`node
render/make-artwork.mjs` rasterises it). Fonts are vendored in `assets/fonts`.
