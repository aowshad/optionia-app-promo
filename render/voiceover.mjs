// Voice-over lines from vo/script.json → assets/audio/vo/<id>.mp3 + <id>.json (character timings).
//   node render/voiceover.mjs gen [id …] [--force] [--speed 1.05]   generate missing (or the given) lines
//   node render/voiceover.mjs stt <id>                              transcribe a line (pronunciation check)
// Reads ELEVENLABS_API_KEY from the environment or .env.local (never committed, never printed).
// eleven_v3 has no request stitching, so every line uses the same voice, settings and seed instead.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { spawnSync } from "node:child_process";

const env = existsSync(".env.local") ? readFileSync(".env.local", "utf8") : "";
const KEY = process.env.ELEVENLABS_API_KEY || env.match(/^ELEVENLABS_API_KEY=(.+)$/m)?.[1]?.trim();
if (!KEY) throw new Error("Set ELEVENLABS_API_KEY (environment or .env.local)");
const API = "https://api.elevenlabs.io/v1";
const OUT = "assets/audio/vo";
const script = JSON.parse(readFileSync("vo/script.json", "utf8"));
const { voice } = script;

const duration = (f) => Number(spawnSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f]).stdout.toString().trim());

// eleven_v3 accepts voice_settings.speed but does not apply it, so speed-ups are done here with
// ffmpeg atempo (pitch preserved) and the character timings are scaled to match.
function tempo(mp3, speed) {
  const tmp = mp3.replace(/\.mp3$/, ".raw.mp3");
  spawnSync("mv", [mp3, tmp]);
  const r = spawnSync("ffmpeg", ["-y", "-loglevel", "error", "-i", tmp, "-af", `atempo=${speed}`, "-c:a", "libmp3lame", "-b:a", "160k", mp3]);
  if (r.status !== 0) throw new Error(r.stderr.toString());
  spawnSync("rm", [tmp]);
}

async function generate(line, speed) {
  const res = await fetch(`${API}/text-to-speech/${voice.id}/with-timestamps?output_format=mp3_44100_128`, {
    method: "POST",
    headers: { "xi-api-key": KEY, "content-type": "application/json" },
    body: JSON.stringify({
      text: line.say ?? line.text,
      model_id: voice.model,
      seed: voice.seed,
      voice_settings: { ...voice.settings },
    }),
  });
  if (!res.ok) throw new Error(`ElevenLabs ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const r = await res.json();
  const mp3 = `${OUT}/${line.id}.mp3`;
  writeFileSync(mp3, Buffer.from(r.audio_base64, "base64"));
  if (speed !== 1) tempo(mp3, speed);
  const a = r.alignment;
  const sc = (t) => t / speed;
  writeFileSync(
    `${OUT}/${line.id}.json`,
    JSON.stringify({
      id: line.id,
      text: line.say ?? line.text,
      speed,
      model: voice.model,
      voice: voice.name,
      requestId: res.headers.get("request-id"),
      duration: duration(mp3),
      chars: a.characters.join(""),
      starts: a.character_start_times_seconds.map(sc),
      ends: a.character_end_times_seconds.map(sc),
    }),
  );
  return duration(mp3);
}

const [cmd, ...rest] = process.argv.slice(2);
const force = rest.includes("--force");
const si = rest.indexOf("--speed");
const speed = si >= 0 ? Number(rest[si + 1]) : voice.settings.speed;
const ids = rest.filter((a, i) => !a.startsWith("--") && rest[i - 1] !== "--speed");
mkdirSync(OUT, { recursive: true });

if (cmd === "gen") {
  for (const line of script.lines) {
    if (ids.length && !ids.includes(line.id)) continue;
    if (!ids.length && !force && existsSync(`${OUT}/${line.id}.json`)) continue;
    const d = await generate(line, speed);
    console.log(`  ${line.id}  ${d.toFixed(2)}s  speed ${speed}  "${line.say ?? line.text}"`);
  }
} else if (cmd === "stt") {
  const file = `${OUT}/${ids[0]}.mp3`;
  const form = new FormData();
  form.append("model_id", "scribe_v1");
  form.append("file", new Blob([readFileSync(file)], { type: "audio/mpeg" }), `${ids[0]}.mp3`);
  const res = await fetch(`${API}/speech-to-text`, { method: "POST", headers: { "xi-api-key": KEY }, body: form });
  if (!res.ok) throw new Error(`ElevenLabs ${res.status}: ${(await res.text()).slice(0, 300)}`);
  console.log(`  ${ids[0]} heard as: "${(await res.json()).text}"`);
} else {
  console.log("usage: gen [id …] [--force] [--speed n] | stt <id>");
}
